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
 * How long after a sync to keep ignoring vault events. Every downloaded file
 * fires a create/modify event, and without this the tail of a large sync
 * schedules another full scan of both sides.
 */
const POST_SYNC_QUIET_MS = 10000;

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
	settings?: Partial<YaDiskSyncSettings>;
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
	private debouncedSyncTimer: number | null = null;
	private lastSyncEndedAt = 0;
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
		if (data?.settings?.autoSyncSeconds === undefined && this.settings.autoSyncInterval > 0) {
			this.settings.autoSyncSeconds = this.settings.autoSyncInterval * 60;
		}

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
			activeWindow.setTimeout(() => { void this.runSync(undefined, "auto"); }, 3000);
		}
	}

	onunload(): void {
		if (this.autoSyncIntervalId !== null) {
			window.clearInterval(this.autoSyncIntervalId);
		}
		if (this.debouncedSyncTimer !== null) {
			activeWindow.clearTimeout(this.debouncedSyncTimer);
		}
	}

	private onFileChange(file: TAbstractFile): void {
		if (!this.settings.accessToken) return;
		if (this.isQuietPeriod()) return;
		if (matchesExcludePattern(file.path, this.settings.excludePatterns)) return;

		if (this.debouncedSyncTimer !== null) {
			activeWindow.clearTimeout(this.debouncedSyncTimer);
		}
		this.debouncedSyncTimer = activeWindow.setTimeout(() => {
			this.debouncedSyncTimer = null;
			// Re-checked here too: the vault watcher can deliver the tail of a
			// large sync's writes after the timer was already armed.
			if (this.isQuietPeriod()) return;
			void this.runSync(undefined, "auto");
		}, DEBOUNCE_DELAY);
	}

	private isQuietPeriod(): boolean {
		return this.syncInProgress || Date.now() - this.lastSyncEndedAt < POST_SYNC_QUIET_MS;
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
		if (this.autoTickInFlight || this.syncInProgress || this.isQuietPeriod()) return;

		this.autoTickInFlight = true;
		try {
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
			// Only a deliberate tap deserves an answer; an auto tick that lands
			// mid-sync should pass in silence.
			if (trigger === "manual") new Notice("Sync already in progress");
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
		});
		progress.open();

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
			});

			await this.saveSettings();
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
		} finally {
			progress.close();
			this.releaseWakeLock();
			this.syncInProgress = false;
			this.lastSyncEndedAt = Date.now();
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
		const counts = `up:${stats.uploaded} down:${stats.downloaded} del:${stats.deleted}`;

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

		if (moved > 0) {
			new Notice(`Sync complete. ${counts}`);
			return;
		}

		// A manual tap is reported even when nothing moved: on mobile there is no
		// status bar, so silence is indistinguishable from the sync never having
		// run. An automatic tick stays quiet — it fires all day.
		if (trigger === "manual") new Notice("Sync complete. Already up to date");
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
