import { Notice, Plugin, TAbstractFile } from "obsidian";
import {
	YaDiskSyncSettings,
	DEFAULT_SETTINGS,
	SyncDirection,
	SyncState,
	PersistedSyncState,
	MIN_CONCURRENCY,
	MAX_CONCURRENCY,
	WAKE_LOCK_MIN_ITEMS,
} from "./types";
import { YandexDiskClient } from "./yandex-client";
import { SyncEngine, SyncStats } from "./sync-engine";
import { SyncStateManager } from "./sync-state";
import { SyncProgress } from "./progress";
import { YaDiskSyncSettingTab } from "./settings";
import { debounce, matchesExcludePattern } from "./utils";

const DEBOUNCE_DELAY = 5000;

/**
 * How long a path stays marked as written by the sync itself. The vault
 * watcher delivers the event slightly after the write; anything later than
 * this is treated as a genuine edit.
 */
const SELF_WRITE_TTL_MS = 30000;

/** Cap on tracked paths, above which expired entries are swept. */
const SELF_WRITE_MAX_TRACKED = 2000;

const SETTINGS_SAVE_DELAY = 400;

/**
 * Sync unconditionally at least this often, even if the disk revision says
 * nothing changed. Covers work left behind by a cancelled or failed run.
 */
const AUTO_FULL_SYNC_MS = 10 * 60 * 1000;

/**
 * Floor on the poll interval when the revision probe is unavailable. Without a
 * cheap change check every tick is a full scan of both sides, which on a large
 * vault must not run more than about once a minute.
 */
const NO_REVISION_MIN_INTERVAL_MS = 60 * 1000;

/**
 * Walk the remote side at least this often even when the revision says it is
 * untouched, so the stored snapshot cannot drift indefinitely.
 */
const FULL_SCAN_MAX_AGE_MS = 10 * 60 * 1000;

interface PluginData {
	/** `autoSyncInterval` is the pre-1.2 field: the interval in whole minutes. */
	settings?: Partial<YaDiskSyncSettings> & { autoSyncInterval?: number };
	state?: PersistedSyncState;
	/** Pre-1.2 snapshot layout, migrated on load. */
	syncState?: SyncState;
}

export default class YaDiskSyncPlugin extends Plugin {
	settings: YaDiskSyncSettings = DEFAULT_SETTINGS;
	client: YandexDiskClient = null!;
	stateManager: SyncStateManager = null!;
	private statusBarEl: HTMLElement | null = null;
	private autoSyncIntervalId: number | null = null;
	private syncInProgress = false;
	private currentEngine: SyncEngine | null = null;
	private currentProgress: SyncProgress | null = null;
	private debouncedSyncTimer: number | null = null;
	private selfWrittenPaths = new Map<string, number>();
	/** A local edit is waiting to go up. Cleared once a sync carries it. */
	private pendingLocalChange = false;
	private lastRevision: number | null = null;
	private revisionSupported = true;
	private lastFullSyncAt = 0;
	private lastFullScanAt = 0;
	private autoTickInFlight = false;
	private wakeLock: WakeLockLike | null = null;

	/**
	 * Settings live in the same file as the snapshots, which run to megabytes
	 * on a large vault. Writing on every keystroke in the settings tab would
	 * re-serialize all of it each time.
	 */
	private saveSettingsSoon = debounce(() => {
		void this.saveSettings();
	}, SETTINGS_SAVE_DELAY);

	async onload(): Promise<void> {
		// One read: both the settings and the snapshots come out of this.
		const data = (await this.loadData() as unknown) as PluginData | null;

		this.settings = Object.assign({}, DEFAULT_SETTINGS, data?.settings ?? {});
		this.settings.concurrency = clampConcurrency(this.settings.concurrency);

		// The interval used to be expressed in minutes.
		const legacyMinutes = data?.settings?.autoSyncInterval;
		if (data?.settings?.autoSyncSeconds === undefined && typeof legacyMinutes === "number") {
			this.settings.autoSyncSeconds = Math.max(0, legacyMinutes) * 60;
		}
		delete (this.settings as { autoSyncInterval?: number }).autoSyncInterval;

		this.client = new YandexDiskClient(
			this.settings.accessToken,
			this.settings.remotePath,
			this.settings.refreshToken,
			this.settings.tokenExpiresAt,
		);

		this.client.onTokenRefresh((accessToken, refreshToken, expiresAt) => {
			this.settings.accessToken = accessToken;
			this.settings.refreshToken = refreshToken;
			this.settings.tokenExpiresAt = expiresAt;
			void this.saveSettings();
		});

		this.stateManager = new SyncStateManager(this.app);
		if (data) {
			this.stateManager.loadFromData(data);
		}

		this.addSettingTab(new YaDiskSyncSettingTab(this.app, this));

		this.addRibbonIcon("refresh-cw", "Sync vault", () => {
			void this.runSync();
		});

		this.addCommand({
			id: "sync-now",
			name: "Sync now",
			callback: () => void this.runSync(),
		});

		this.addCommand({
			id: "push-all",
			name: "Push all",
			callback: () => void this.runSync(SyncDirection.Push),
		});

		this.addCommand({
			id: "pull-all",
			name: "Pull all",
			callback: () => void this.runSync(SyncDirection.Pull),
		});

		this.addCommand({
			id: "abort-sync",
			name: "Abort sync",
			callback: () => this.abortSync(),
		});

		this.addCommand({
			id: "show-sync-status",
			name: "Show sync status",
			callback: () => this.showSyncStatus(),
		});

		this.statusBarEl = this.addStatusBarItem();
		this.updateStatusBar("idle");

		this.setupAutoSync();

		// iOS freezes the app while it is backgrounded, so an interval that was
		// due mid-suspension simply never fired. Catch up the moment the user
		// comes back rather than waiting out another full interval.
		this.registerDomEvent(document, "visibilitychange", () => {
			if (document.visibilityState !== "visible") return;
			if (this.settings.autoSyncSeconds <= 0) return;
			void this.autoSyncTick();
		});

		this.registerEvent(this.app.vault.on("create", (file) => this.onFileChange(file)));
		this.registerEvent(this.app.vault.on("modify", (file) => this.onFileChange(file)));
		this.registerEvent(this.app.vault.on("delete", (file) => this.onFileChange(file)));
		this.registerEvent(this.app.vault.on("rename", (file) => this.onFileChange(file)));

		if (this.settings.syncOnStartup && this.settings.accessToken) {
			window.setTimeout(() => { void this.runSync(undefined, "auto"); }, 3000);
		}
	}

	onunload(): void {
		if (this.autoSyncIntervalId !== null) {
			window.clearInterval(this.autoSyncIntervalId);
		}
		if (this.debouncedSyncTimer !== null) {
			window.clearTimeout(this.debouncedSyncTimer);
		}
	}

	private onFileChange(file: TAbstractFile): void {
		if (!this.settings.accessToken) return;
		if (matchesExcludePattern(file.path, this.settings.excludePatterns)) return;

		// Every file the sync writes fires the same event a user edit does.
		// Only our own writes are ignored — an edit made while a sync is
		// running is a real change and must still be picked up.
		if (this.consumeSelfWrite(file.path)) return;

		this.scheduleDebouncedSync();
	}

	private scheduleDebouncedSync(): void {
		this.pendingLocalChange = true;

		if (this.debouncedSyncTimer !== null) {
			window.clearTimeout(this.debouncedSyncTimer);
		}
		this.debouncedSyncTimer = window.setTimeout(() => {
			this.debouncedSyncTimer = null;
			if (this.syncInProgress) {
				// Do not drop these edits: wait for the current run to end and
				// send them straight after.
				this.scheduleDebouncedSync();
				return;
			}
			void this.runSync(undefined, "auto");
		}, DEBOUNCE_DELAY);
	}

	/** True if this path was just written by the sync rather than the user. */
	private consumeSelfWrite(path: string): boolean {
		const at = this.selfWrittenPaths.get(path);
		if (at === undefined) return false;

		this.selfWrittenPaths.delete(path);
		// A stale entry means the vault event never arrived; treat a late edit
		// to the same path as the user's.
		return Date.now() - at < SELF_WRITE_TTL_MS;
	}

	private noteSelfWrite(path: string): void {
		const now = Date.now();
		this.selfWrittenPaths.set(path, now);

		if (this.selfWrittenPaths.size > SELF_WRITE_MAX_TRACKED) {
			for (const [key, at] of this.selfWrittenPaths) {
				if (now - at >= SELF_WRITE_TTL_MS) this.selfWrittenPaths.delete(key);
			}
		}
	}

	async saveSettings(): Promise<void> {
		const stateData = this.stateManager ? this.stateManager.getDataToSave() : {};
		await this.saveData({
			settings: this.settings,
			...stateData,
		});
		if (this.client) {
			this.client.setToken(this.settings.accessToken);
			this.client.setRemotePath(this.settings.remotePath);
			this.client.setRefreshToken(this.settings.refreshToken, this.settings.tokenExpiresAt);
		}
	}

	/** Debounced write, for settings-tab edits. */
	queueSaveSettings(): void {
		this.saveSettingsSoon();
	}

	setupAutoSync(): void {
		if (this.autoSyncIntervalId !== null) {
			window.clearInterval(this.autoSyncIntervalId);
			this.autoSyncIntervalId = null;
		}

		if (this.settings.autoSyncSeconds > 0 && this.settings.accessToken) {
			const ms = this.settings.autoSyncSeconds * 1000;
			this.autoSyncIntervalId = this.registerInterval(
				window.setInterval(() => { void this.autoSyncTick(); }, ms),
			);
		}
	}

	/**
	 * Decides whether the tick is worth a full sync.
	 *
	 * Polling every few seconds is only affordable because the disk revision
	 * answers "did anything change" in a single request; a full scan of a large
	 * vault costs hundreds and takes longer than the interval itself.
	 */
	private async autoSyncTick(): Promise<void> {
		if (!this.settings.accessToken) return;
		// No quiet period is needed after a sync: the revision probe below was
		// refreshed by that sync, so it will simply report nothing changed.
		if (this.autoTickInFlight || this.syncInProgress) return;

		this.autoTickInFlight = true;
		try {
			// The revision only ever reflects the remote side, so it can never
			// report an edit made here. Without this a local change that the
			// debounce missed would wait forever.
			if (this.pendingLocalChange) {
				await this.runSync(undefined, "auto");
				return;
			}

			const sinceFullSync = Date.now() - this.lastFullSyncAt;
			if (sinceFullSync >= AUTO_FULL_SYNC_MS) {
				await this.runSync(undefined, "auto");
				return;
			}

			const probe = await this.probeRemote();
			if (probe === "unchanged") return;

			// With no working probe every tick would be a full scan of both
			// sides, so fall back to a much slower cadence.
			if (probe === "unknown" && sinceFullSync < NO_REVISION_MIN_INTERVAL_MS) return;

			await this.runSync(undefined, "auto", false);
		} finally {
			this.autoTickInFlight = false;
		}
	}

	/**
	 * Asks the disk revision whether the stored remote snapshot is still
	 * accurate. "unknown" means the question could not be answered, which is
	 * never treated as "unchanged".
	 */
	private async probeRemote(): Promise<"unchanged" | "changed" | "unknown"> {
		if (!this.revisionSupported || this.lastRevision === null) return "unknown";
		// Re-walk the tree periodically regardless, so the snapshot cannot drift
		// forever behind an undocumented counter.
		if (Date.now() - this.lastFullScanAt >= FULL_SCAN_MAX_AGE_MS) return "changed";

		try {
			const revision = await this.client.getDiskRevision();
			if (revision === null) {
				this.revisionSupported = false;
				return "unknown";
			}
			return revision === this.lastRevision ? "unchanged" : "changed";
		} catch {
			return "unknown";
		}
	}

	private async runSync(
		directionOverride?: SyncDirection,
		trigger: "manual" | "auto" = "manual",
		remoteUnchangedHint?: boolean,
	): Promise<void> {
		if (this.syncInProgress) {
			// Tapping sync during a sync means "show me what it is doing", so
			// bring the indicator back rather than just saying it is busy.
			if (trigger === "manual") this.showSyncStatus();
			return;
		}

		if (!this.settings.accessToken) {
			new Notice("Authorize in plugin settings first");
			return;
		}

		this.syncInProgress = true;
		this.updateStatusBar("syncing", 0, 0);

		const engine = new SyncEngine(this.app, this.client, this.stateManager, this.settings);
		this.currentEngine = engine;

		const progress = new SyncProgress(() => {
			engine.abort();
			progress.message("Cancelling…");
		}, this.settings.progressDisplay);
		progress.start();
		this.currentProgress = progress;

		// Cleared up front, not at the end: the scan about to run covers every
		// edit made so far, while anything typed from here on raises the flag
		// again and must be carried by the next run rather than swallowed.
		const hadPendingChanges = this.pendingLocalChange;
		this.pendingLocalChange = false;

		try {
			// A sync set off by a local edit should not pay for a walk of the
			// whole remote tree. One request settles whether that walk would
			// find anything; the caller may already know the answer.
			const remoteUnchanged =
				remoteUnchangedHint ?? (await this.probeRemote()) === "unchanged";

			const stats = await engine.run(directionOverride, {
				reporter: progress,
				checkpoint: () => this.saveSettings(),
				remoteUnchanged,
				onPlanReady: (total) => {
					if (total >= WAKE_LOCK_MIN_ITEMS) void this.acquireWakeLock();
				},
				onFileWritten: (path) => this.noteSelfWrite(path),
			});

			await this.saveSettings();
			if (stats.aborted || stats.errors > 0 || stats.skipped > 0) {
				// Not everything got through; keep asking to be run again.
				this.pendingLocalChange = this.pendingLocalChange || hadPendingChanges;
			}
			this.reportResult(stats, trigger);

			this.lastFullSyncAt = Date.now();
			if (!remoteUnchanged && !stats.aborted) this.lastFullScanAt = Date.now();
			if (this.revisionSupported && !stats.aborted) {
				try {
					// Our own transfers move the revision; record where it landed
					// so the next tick does not read them back as a change.
					this.lastRevision = await this.client.getDiskRevision();
				} catch {
					// Not worth surfacing: the next tick just syncs.
				}
			}
		} catch (e) {
			console.error("[YaDisk Sync] Sync error:", e);
			new Notice(`Sync error: ${e instanceof Error ? e.message : String(e)}`);
			this.updateStatusBar("error");
			this.pendingLocalChange = this.pendingLocalChange || hadPendingChanges;
		} finally {
			progress.close();
			this.currentProgress = null;
			this.releaseWakeLock();
			this.syncInProgress = false;
			this.currentEngine = null;
		}
	}

	/**
	 * Keeps the screen awake for the duration of a long sync.
	 *
	 * iOS suspends the app when the screen locks, which freezes a transfer
	 * mid-run; on a first sync of thousands of files the auto-lock timer will
	 * otherwise fire long before the sync finishes. Best effort only — the API
	 * is absent on most desktop setups and may refuse.
	 */
	private async acquireWakeLock(): Promise<void> {
		if (!this.settings.keepScreenOn || this.wakeLock) return;

		const nav = navigator as Navigator & WakeLockNavigator;
		if (!nav.wakeLock) return;

		try {
			this.wakeLock = await nav.wakeLock.request("screen");
		} catch {
			// Refused, or the document was already hidden. Nothing to do.
		}
	}

	private releaseWakeLock(): void {
		const lock = this.wakeLock;
		this.wakeLock = null;
		if (lock) void lock.release().catch(() => undefined);
	}

	private reportResult(stats: SyncStats, trigger: "manual" | "auto"): void {
		const moved = stats.uploaded + stats.downloaded + stats.deleted;
		let counts = `up:${stats.uploaded} down:${stats.downloaded} del:${stats.deleted}`;
		// Worth naming: these are files edited mid-sync whose download was held
		// back rather than allowed to overwrite the edit.
		if (stats.skipped > 0) counts += ` kept:${stats.skipped}`;

		if (stats.aborted) {
			new Notice(`Sync cancelled. ${counts}`);
			this.updateStatusBar("idle");
			return;
		}

		if (stats.errors > 0) {
			new Notice(`Sync done with errors. ${counts} err:${stats.errors}`);
			this.updateStatusBar("error");
			return;
		}

		this.updateStatusBar("idle");

		// A manual tap always gets an answer: on mobile there is no status bar,
		// so silence is indistinguishable from the sync never having run. An
		// automatic sync that went fine says nothing — it runs all day, and
		// announcing every successful one is just noise.
		if (trigger !== "manual") return;

		new Notice(moved > 0 ? `Sync complete. ${counts}` : "Sync complete. Already up to date");
	}

	/** Re-shows the progress indicator after it was dismissed. */
	private showSyncStatus(): void {
		if (this.currentProgress) {
			this.currentProgress.reopen();
		} else {
			new Notice("No sync is running");
		}
	}

	private abortSync(): void {
		if (this.currentEngine) {
			this.currentEngine.abort();
			new Notice("Stopping sync…");
		} else {
			new Notice("No sync is running");
		}
	}

	private updateStatusBar(
		status: "idle" | "syncing" | "error",
		current?: number,
		total?: number,
	): void {
		if (!this.statusBarEl) return;

		switch (status) {
			case "idle":
				this.statusBarEl.setText("Synced");
				break;
			case "syncing":
				if (current !== undefined && total !== undefined && total > 0) {
					this.statusBarEl.setText(`Syncing ${current}/${total}`);
				} else {
					this.statusBarEl.setText("Scanning...");
				}
				break;
			case "error":
				this.statusBarEl.setText("Sync error");
				break;
		}
	}
}

interface WakeLockLike {
	release(): Promise<void>;
}

interface WakeLockNavigator {
	wakeLock?: { request(type: "screen"): Promise<WakeLockLike> };
}

function clampConcurrency(value: number): number {
	if (!Number.isFinite(value)) return DEFAULT_SETTINGS.concurrency;
	return Math.min(MAX_CONCURRENCY, Math.max(MIN_CONCURRENCY, Math.round(value)));
}
