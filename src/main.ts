import { Notice, Plugin, TAbstractFile, TFile, WorkspaceLeaf, setIcon } from "obsidian";
import {
	YaDiskSyncSettings,
	DEFAULT_SETTINGS,
	SyncDirection,
	SyncState,
	PersistedSyncState,
	MIN_CONCURRENCY,
	MAX_CONCURRENCY,
	WAKE_LOCK_MIN_ITEMS,
	ApprovedDeletions,
	MassDeletion,
	SyncBlock,
} from "./types";
import { YandexDiskClient, describeError } from "./yandex-client";
import { FAILURE_STREAK_LIMIT, SyncEngine, SyncStats } from "./sync-engine";
import { SyncStateManager } from "./sync-state";
import { SyncProgress } from "./progress";
import { YaDiskSyncSettingTab } from "./settings";
import { LocalChangeKind, SyncQueue } from "./queue";
import { QUEUE_VIEW_ICON, QUEUE_VIEW_TYPE, QueueView } from "./queue-view";
import { setLanguage, t } from "./i18n";
import { registerSyncIcon } from "./icon";
import { renderRemaining } from "./remaining";
import { PauseModal, describeBlock, showPauseNotice } from "./pause-modal";
import { DELETE_GUARD_FLOOR } from "./safety";
import { debounce, matchesExcludePattern, normalizeRemotePath, resolveWithin } from "./utils";

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

/** Minimum gap between status bar redraws during a sync. */
const STATUS_BAR_INTERVAL_MS = 500;

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

/**
 * Looks for the vault's storage before a sync gives up on it. A drive that
 * blinks comes back within these; one that was pulled does not.
 */
const STORAGE_CHECK_ATTEMPTS = 3;
const STORAGE_CHECK_RETRY_MS = 1000;

/** How long one look may take: a read from a drive being pulled can hang rather than fail. */
const STORAGE_CHECK_TIMEOUT_MS = 5000;

/** While syncing is on hold, say so again at most this often. */
const PAUSE_REMINDER_MS = 10 * 60 * 1000;

/** What the user decided in the review, carried into the sync that acts on it. */
interface PauseDecision {
	approve?: ApprovedDeletions;
	restore?: ReadonlySet<string>;
}

interface SyncPause {
	block: SyncBlock;
	/** Direction of the sync that stopped, so acting on it runs the same kind. */
	direction?: SyncDirection;
	/** That sync had already transferred something when it stopped. */
	partial: boolean;
	/** Deletions allowed earlier in this review; they stay allowed. */
	approved?: ApprovedDeletions;
}

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
	private statusBarButtonEl: HTMLElement | null = null;
	private statusBarState: StatusBarState = "idle";
	private statusBarTimer: number | null = null;
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
	/** What the sync is doing and will do next, for the queue view. */
	readonly queue = new SyncQueue();

	/**
	 * Set while syncing is on hold because a sync found something it would
	 * not act on. Kept in memory only. What makes the hold safe is that the
	 * stored snapshots were not moved on, so the first sync after a restart
	 * finds the same problem — or, if it has gone, has no reason to stop.
	 */
	private pause: SyncPause | null = null;
	private pauseNotice: Notice | null = null;
	private pauseNoticeAt = 0;
	private pauseModal: PauseModal | null = null;

	/** A remote folder entered while a sync was running, applied once it ends. */
	private pendingRemotePath: string | null = null;

	/** The one error notice on screen; see showError. */
	private errorNotice: Notice | null = null;

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
		this.settings.deleteConfirmThreshold = clampThreshold(this.settings.deleteConfirmThreshold);
		// Also repairs a folder saved without its leading slash, which no
		// listing ever matched.
		this.settings.remotePath = normalizeRemotePath(this.settings.remotePath || DEFAULT_SETTINGS.remotePath);

		// The interval used to be expressed in minutes.
		const legacyMinutes = data?.settings?.autoSyncInterval;
		if (data?.settings?.autoSyncSeconds === undefined && typeof legacyMinutes === "number") {
			this.settings.autoSyncSeconds = Math.max(0, legacyMinutes) * 60;
		}
		delete (this.settings as { autoSyncInterval?: number }).autoSyncInterval;
		setLanguage(this.settings.language);

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
		// Saved with the snapshots it vouches for, so the first sync after a
		// restart can tell that nothing moved without walking the disk.
		this.lastRevision = this.stateManager.getState().revision ?? null;

		this.addSettingTab(new YaDiskSyncSettingTab(this.app, this));

		registerSyncIcon();
		this.registerView(QUEUE_VIEW_TYPE, (leaf) => new QueueView(leaf, this));
		// One button for both: what someone taps sync for is to see it go.
		this.addRibbonIcon(QUEUE_VIEW_ICON, t("ribbon.sync"), () => {
			void this.openQueueView();
			if (!this.syncInProgress) void this.runSync();
			// Asked for by hand: shown at once, whatever the progress setting.
			this.currentProgress?.reopen();
		});

		this.addCommand({
			id: "sync-now",
			name: t("command.syncNow"),
			callback: () => void this.runSync(),
		});

		this.addCommand({
			id: "sync-full",
			name: t("command.syncFull"),
			callback: () => this.runFullSync(),
		});

		this.addCommand({
			id: "push-all",
			name: t("command.pushAll"),
			callback: () => void this.runSync(SyncDirection.Push),
		});

		this.addCommand({
			id: "pull-all",
			name: t("command.pullAll"),
			callback: () => void this.runSync(SyncDirection.Pull),
		});

		this.addCommand({
			id: "abort-sync",
			name: t("command.abort"),
			callback: () => this.abortSync(),
		});

		this.addCommand({
			id: "show-sync-queue",
			name: t("command.showQueue"),
			callback: () => void this.openQueueView(),
		});

		this.addCommand({
			id: "show-sync-status",
			name: t("command.showStatus"),
			callback: () => this.showSyncStatus(),
		});

		// For a sync in the background: nothing opens, and the progress shows
		// only as the setting says. Quick when Yandex Disk's revision says
		// nothing changed there; the full sync, which walks the disk anyway,
		// lives in the settings. Added first, so it sits in front of the
		// status text.
		this.statusBarButtonEl = this.addStatusBarItem();
		this.statusBarButtonEl.addClass("mod-clickable", "yadisk-status-button");
		this.statusBarButtonEl.setAttr("aria-label", t("button.sync"));
		this.statusBarButtonEl.setAttr("data-tooltip-position", "top");
		setIcon(this.statusBarButtonEl, QUEUE_VIEW_ICON);
		this.registerDomEvent(this.statusBarButtonEl, "click", () => void this.runSync());

		this.statusBarEl = this.addStatusBarItem();
		this.statusBarEl.addClass("mod-clickable");
		this.registerDomEvent(this.statusBarEl, "click", () => void this.openQueueView());
		this.updateStatusBar("idle");
		this.register(this.queue.subscribe(() => this.scheduleStatusBar()));

		this.setupAutoSync();

		// iOS freezes the app while it is backgrounded, so an interval that was
		// due mid-suspension simply never fired. Catch up the moment the user
		// comes back rather than waiting out another full interval.
		this.registerDomEvent(document, "visibilitychange", () => {
			if (document.visibilityState !== "visible") return;
			if (this.settings.autoSyncSeconds <= 0) return;
			void this.autoSyncTick();
		});

		// Obsidian fills in its file list after plugins load, reporting every
		// existing file as created. A sync before it finishes would take the
		// files not listed yet for deleted.
		this.app.workspace.onLayoutReady(() => {
			this.registerEvent(this.app.vault.on("create", (file) => this.onFileChange(file, "created")));
			this.registerEvent(this.app.vault.on("modify", (file) => this.onFileChange(file, "modified")));
			this.registerEvent(this.app.vault.on("delete", (file) => this.onFileChange(file, "deleted")));
			this.registerEvent(
				this.app.vault.on("rename", (file, oldPath) => this.onFileChange(file, "renamed", oldPath)),
			);

			if (this.settings.syncOnStartup && this.settings.accessToken) {
				window.setTimeout(() => { void this.runSync(undefined, "auto"); }, 3000);
			}
		});
	}

	onunload(): void {
		if (this.autoSyncIntervalId !== null) {
			window.clearInterval(this.autoSyncIntervalId);
		}
		if (this.debouncedSyncTimer !== null) {
			window.clearTimeout(this.debouncedSyncTimer);
		}
		if (this.statusBarTimer !== null) {
			window.clearTimeout(this.statusBarTimer);
		}
		this.pauseNotice?.hide();
		this.pauseModal?.close();
		this.errorNotice?.hide();
	}

	/**
	 * Shows an error that stays until dismissed. A sync that fails fails
	 * again at every tick, so the new notice replaces the old one rather than
	 * stacking up, and a clean sync takes it away.
	 */
	private showError(text: string): void {
		this.errorNotice?.hide();
		this.errorNotice = new Notice(text, 0);
	}

	private clearError(): void {
		this.errorNotice?.hide();
		this.errorNotice = null;
	}

	private onFileChange(file: TAbstractFile, kind: LocalChangeKind, oldPath?: string): void {
		if (!this.settings.accessToken) return;
		if (matchesExcludePattern(file.path, this.settings.excludePatterns)) return;

		// Every file the sync writes fires the same event a user edit does.
		// Only our own writes are ignored — an edit made while a sync is
		// running is a real change and must still be picked up.
		if (this.consumeSelfWrite(file.path)) return;

		if (file instanceof TFile) this.queue.noteLocalChange(file.path, kind, oldPath);

		this.scheduleDebouncedSync();
	}

	private scheduleDebouncedSync(): void {
		this.pendingLocalChange = true;
		this.refreshQueue();

		if (this.debouncedSyncTimer !== null) {
			window.clearTimeout(this.debouncedSyncTimer);
		}
		this.debouncedSyncTimer = window.setTimeout(() => {
			this.debouncedSyncTimer = null;
			if (this.syncInProgress) {
				// Sent within the running sync where that is safe, rather than
				// behind everything it has left. Deletions and anything it
				// cannot take wait for the next run, which this keeps asking for.
				const sendable = [...this.queue.localChanges]
					.filter(([, kind]) => kind !== "deleted")
					.map(([path]) => path);
				this.currentEngine?.expedite(sendable);
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

	/**
	 * Points syncing at another remote folder. Takes effect between syncs,
	 * never during one: a run reads the folder once when it starts, and the
	 * client moving on mid-run would send the rest of its transfers elsewhere.
	 * Kept out of the settings until then, since every save hands the
	 * settings' folder to the client.
	 */
	applyRemotePath(value: string): void {
		const next = normalizeRemotePath(value.trim() || DEFAULT_SETTINGS.remotePath);
		if (this.syncInProgress) {
			this.pendingRemotePath = next;
			return;
		}
		if (next === normalizeRemotePath(this.settings.remotePath)) return;

		this.settings.remotePath = next;
		this.client.setRemotePath(next);
		// Whatever held syncing up concerned the old folder.
		if (this.pause) {
			this.leavePause();
			this.updateStatusBar("idle");
		}
		void this.saveSettings();
	}

	setupAutoSync(): void {
		if (this.autoSyncIntervalId !== null) {
			window.clearInterval(this.autoSyncIntervalId);
			this.autoSyncIntervalId = null;
		}

		this.queue.nextCheckAt = null;
		if (this.settings.autoSyncSeconds > 0 && this.settings.accessToken) {
			const ms = this.settings.autoSyncSeconds * 1000;
			this.queue.nextCheckAt = Date.now() + ms;
			this.autoSyncIntervalId = this.registerInterval(
				window.setInterval(() => {
					this.queue.nextCheckAt = Date.now() + ms;
					void this.autoSyncTick();
				}, ms),
			);
		}
		this.queue.notify();
	}

	/** Brings the queue's view of the plugin's own state up to date. */
	private refreshQueue(): void {
		this.queue.paused = this.pause !== null;
		this.queue.notify();
	}

	async openQueueView(): Promise<void> {
		const { workspace } = this.app;
		let leaf: WorkspaceLeaf | null = workspace.getLeavesOfType(QUEUE_VIEW_TYPE)[0] ?? null;
		if (!leaf) {
			leaf = workspace.getLeftLeaf(false);
			if (!leaf) return;
			await leaf.setViewState({ type: QUEUE_VIEW_TYPE, active: true });
		}
		await workspace.revealLeaf(leaf);
	}

	syncNow(): void {
		void this.runSync();
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
		// A sync on hold would only stop at the same place again; it goes on
		// from the review. Not even the revision is worth asking for.
		if (this.pause) {
			this.remindPause();
			return;
		}
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
	 *
	 * `trustRevision` is for a sync asked for by hand: it takes the counter at
	 * its word, which is what makes it quick. The full sync in the settings is
	 * there for when the counter seems to have missed something.
	 */
	private async probeRemote(trustRevision = false): Promise<"unchanged" | "changed" | "unknown"> {
		if (!this.revisionSupported || this.lastRevision === null) return "unknown";
		// Automatic syncs re-walk the tree periodically regardless, so the
		// snapshot cannot drift forever behind an undocumented counter.
		if (!trustRevision && Date.now() - this.lastFullScanAt >= FULL_SCAN_MAX_AGE_MS) return "changed";

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

	/**
	 * A sync that trusts nothing it saved: it walks all of Yandex Disk and
	 * reads every file in the vault again. For when a change made elsewhere
	 * has not arrived; slow on a large vault, so the indicator shows at once.
	 */
	runFullSync(): void {
		void this.runSync(undefined, "manual", false, undefined, true);
		this.currentProgress?.reopen();
	}

	private async runSync(
		directionOverride?: SyncDirection,
		trigger: "manual" | "auto" = "manual",
		remoteUnchangedHint?: boolean,
		decision?: PauseDecision,
		full = false,
	): Promise<void> {
		if (this.syncInProgress) {
			// Tapping sync during a sync means "show me what it is doing", so
			// bring the indicator back rather than just saying it is busy.
			if (trigger === "manual") this.showSyncStatus();
			return;
		}

		if (!this.settings.accessToken) {
			new Notice(t("notice.authorizeFirst"));
			return;
		}

		// Until the vault has loaded, Obsidian's file list is partial.
		if (!this.app.workspace.layoutReady) {
			if (trigger === "manual") new Notice(t("notice.vaultLoading"));
			return;
		}

		// On hold, only the user sets a sync going. It runs every check again,
		// and one that comes back clean lifts the hold.
		if (this.pause && trigger === "auto") {
			this.remindPause();
			return;
		}

		this.syncInProgress = true;
		this.updateStatusBar("syncing");

		const engine = new SyncEngine(this.app, this.client, this.stateManager, this.settings);
		this.currentEngine = engine;

		const progress = new SyncProgress(
			() => {
				engine.abort();
				progress.message(t("progress.cancelling"));
			},
			this.settings.progressDisplay,
			(text, lastFailure) => this.queue.setDetail(text, lastFailure),
		);
		progress.start();
		this.currentProgress = progress;

		// Cleared up front, not at the end: the scan about to run covers every
		// edit made so far, while anything typed from here on raises the flag
		// again and must be carried by the next run rather than swallowed.
		const hadPendingChanges = this.pendingLocalChange;
		this.pendingLocalChange = false;
		const carriedChanges = this.queue.takeLocalChanges();
		/** What this run was to carry is still waiting to be sent. */
		const keepWaiting = () => {
			this.pendingLocalChange = this.pendingLocalChange || hadPendingChanges;
			this.queue.restoreLocalChanges(carriedChanges);
		};
		this.queue.begin();
		this.refreshQueue();

		try {
			// A sync set off by a local edit should not pay for a walk of the
			// whole remote tree. One request settles whether that walk would
			// find anything; the caller may already know the answer.
			const remoteUnchanged =
				remoteUnchangedHint ?? (await this.probeRemote(trigger === "manual")) === "unchanged";

			const stats = await engine.run(directionOverride, {
				reporter: progress,
				queue: this.queue,
				checkpoint: () => this.saveSettings(),
				remoteUnchanged,
				onPlanReady: (total) => {
					if (total >= WAKE_LOCK_MIN_ITEMS) void this.acquireWakeLock();
				},
				onFileWritten: (path) => this.noteSelfWrite(path),
				checkStorage: () => this.vaultStorageAvailable(),
				approvedDeletions: decision?.approve,
				restorePaths: decision?.restore,
				rehashLocal: full,
			});

			if (stats.blocked) {
				// Nothing is saved: the storage may be gone, and a stop before
				// the first transfer changed nothing worth saving. What was
				// waiting to go up still is.
				keepWaiting();
				this.enterPause(
					{
						block: stats.blocked,
						direction: directionOverride,
						partial: stats.uploaded + stats.downloaded + stats.deleted > 0,
						approved: decision?.approve,
					},
					trigger === "manual",
				);
				return;
			}

			// Our own transfers move the revision; record where it landed, and
			// save it with the snapshots it vouches for, so the next sync — even
			// after a restart — does not read them back as a change. Only a run
			// that finished everything can vouch: an unfinished download is
			// rolled back to its old record, and that record, standing in for
			// the disk's listing, would never have it retried.
			const complete = !stats.aborted && stats.errors === 0 && stats.skipped === 0;
			if (complete && this.revisionSupported) {
				try {
					this.lastRevision = await this.client.getDiskRevision();
				} catch {
					this.lastRevision = null;
				}
			} else {
				this.lastRevision = null;
			}
			this.stateManager.setRevision(this.lastRevision);

			await this.saveSettings();
			if (this.pause) this.leavePause();
			if (!complete) {
				// Not everything got through; keep asking to be run again.
				keepWaiting();
			}
			this.reportResult(stats, trigger);

			this.lastFullSyncAt = Date.now();
			if (!remoteUnchanged && !stats.aborted) this.lastFullScanAt = Date.now();
		} catch (e) {
			console.error("[YaDisk Sync] Sync error:", e);
			this.showError(t("notice.syncError", { message: describeError(e) }));
			// A failed re-check leaves the hold in place, and that is the state
			// worth showing.
			this.updateStatusBar(this.pause ? "paused" : "error");
			keepWaiting();
		} finally {
			progress.close();
			this.currentProgress = null;
			this.releaseWakeLock();
			this.syncInProgress = false;
			this.currentEngine = null;
			this.queue.end();
			this.refreshQueue();

			if (this.pendingRemotePath !== null) {
				const next = this.pendingRemotePath;
				this.pendingRemotePath = null;
				this.applyRemotePath(next);
			}
		}
	}

	/**
	 * Whether the vault's own storage is still there to be read.
	 *
	 * The plugin's manifest lives inside the vault and the plugin never writes
	 * it, so it is on disk exactly while the vault is. Not so data.json: the
	 * plugin writes that itself, and a write can land in whatever is left at
	 * the vault's path once its drive is unmounted.
	 */
	private async vaultStorageAvailable(): Promise<boolean> {
		const dir = this.manifest.dir ?? `${this.app.vault.configDir}/plugins/${this.manifest.id}`;
		const marker = `${dir}/manifest.json`;

		for (let attempt = 1; attempt <= STORAGE_CHECK_ATTEMPTS; attempt++) {
			const found = await resolveWithin(this.app.vault.adapter.exists(marker), STORAGE_CHECK_TIMEOUT_MS);
			if (found === true) return true;
			// A hang is not a blink; asking again would only hang again.
			if (found === null) return false;
			if (attempt < STORAGE_CHECK_ATTEMPTS) await sleep(STORAGE_CHECK_RETRY_MS);
		}
		return false;
	}

	/** Puts syncing on hold and says so. */
	private enterPause(pause: SyncPause, openReview: boolean): void {
		this.pause = pause;
		this.refreshQueue();
		this.updateStatusBar("paused");
		this.announcePause();
		if (openReview) this.openPauseReview();
	}

	private leavePause(): void {
		this.pause = null;
		this.refreshQueue();
		this.pauseNotice?.hide();
		this.pauseNotice = null;
		this.pauseModal?.close();
		this.pauseModal = null;
	}

	private announcePause(): void {
		if (!this.pause) return;
		this.pauseNotice?.hide();
		this.pauseNotice = showPauseNotice(
			describeBlock(this.pause.block, this.pause.partial),
			() => this.openPauseReview(),
		);
		this.pauseNoticeAt = Date.now();
	}

	/**
	 * Brings the notice back now and then while on hold. A phone has no status
	 * bar, so once the notice is dismissed nothing else says that edits have
	 * stopped going anywhere.
	 */
	private remindPause(): void {
		if (Date.now() - this.pauseNoticeAt < PAUSE_REMINDER_MS) return;
		this.announcePause();
	}

	openPauseReview(): void {
		const pause = this.pause;
		if (!pause) return;

		const approved = pause.approved;
		const syncAgain = (decision?: PauseDecision) => {
			void this.runSync(pause.direction, "manual", undefined, decision);
		};

		this.pauseModal?.close();
		this.pauseModal = new PauseModal(
			this.app,
			pause.block,
			pause.partial,
			approved ? approved.local.size + approved.remote.size : 0,
			{
				recheck: () => syncAgain({ approve: approved }),
				startOver: () => {
					this.stateManager.resetState();
					syncAgain();
				},
				restore: (deletions) => syncAgain({ approve: approved, restore: pathsOf(deletions) }),
				approve: (deletions) => syncAgain({ approve: withApproved(approved, deletions) }),
			},
		);
		this.pauseModal.open();
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
		let counts = t("result.counts", { up: stats.uploaded, down: stats.downloaded, del: stats.deleted });
		// Worth naming: these are files changed here mid-sync, whose download
		// or deletion was held back rather than allowed to undo the change.
		if (stats.skipped > 0) counts += t("result.kept", { count: stats.skipped });

		if (stats.aborted) {
			new Notice(t("result.cancelled", { counts }));
			this.updateStatusBar("idle");
			return;
		}

		if (stats.gaveUp || stats.errors > 0) {
			const head = stats.gaveUp
				? t("result.gaveUp", { count: FAILURE_STREAK_LIMIT })
				: t("result.withErrors");
			const last = stats.lastError
				? ` ${t("progress.lastError", { path: stats.lastError.path, message: stats.lastError.message })}`
				: "";
			this.showError(`${head} ${counts}${t("result.errors", { count: stats.errors })}.${last}`);
			this.updateStatusBar("error");
			return;
		}

		this.clearError();
		this.updateStatusBar("idle");

		// A manual tap always gets an answer: on mobile there is no status bar,
		// so silence is indistinguishable from the sync never having run. An
		// automatic sync that went fine says nothing — it runs all day, and
		// announcing every successful one is just noise.
		if (trigger !== "manual") return;

		new Notice(moved > 0 ? t("result.complete", { counts }) : t("result.upToDate"));
	}

	/** Re-shows the progress indicator after it was dismissed, or the review when on hold. */
	private showSyncStatus(): void {
		if (this.currentProgress) {
			this.currentProgress.reopen();
		} else if (this.pause) {
			this.openPauseReview();
		} else {
			new Notice(t("notice.noSync"));
		}
	}

	abortSync(): void {
		if (this.currentEngine) {
			this.currentEngine.abort();
			new Notice(t("notice.stopping"));
		} else {
			new Notice(t("notice.noSync"));
		}
	}

	private updateStatusBar(status: StatusBarState): void {
		this.statusBarState = status;
		this.renderStatusBar();
	}

	/** Redraws at most every STATUS_BAR_INTERVAL_MS; the queue changes per file. */
	private scheduleStatusBar(): void {
		if (this.statusBarTimer !== null) return;
		this.statusBarTimer = window.setTimeout(() => {
			this.statusBarTimer = null;
			this.renderStatusBar();
		}, STATUS_BAR_INTERVAL_MS);
	}

	private renderStatusBar(): void {
		const el = this.statusBarEl;
		if (!el) return;
		el.empty();
		this.statusBarButtonEl?.toggleClass("is-syncing", this.statusBarState === "syncing");

		switch (this.statusBarState) {
			case "idle":
				el.setText(t("status.synced"));
				break;
			case "syncing":
				if (this.queue.stage === "transferring") {
					el.createSpan({
						text: t("status.progress", { done: this.queue.finishedCount(), total: this.queue.entries.length }),
					});
					if (this.settings.statusBarCounts) renderRemaining(el, this.queue);
				} else {
					el.setText(t("status.scanning"));
				}
				break;
			case "error":
				el.setText(t("status.error"));
				break;
			case "paused":
				el.setText(t("status.paused"));
				break;
		}
	}
}

type StatusBarState = "idle" | "syncing" | "error" | "paused";

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

function clampThreshold(value: number): number {
	if (!Number.isFinite(value) || value < DELETE_GUARD_FLOOR) return DEFAULT_SETTINGS.deleteConfirmThreshold;
	return Math.round(value);
}

function pathsOf(deletions: MassDeletion[]): Set<string> {
	const paths = new Set<string>();
	for (const deletion of deletions) {
		for (const path of deletion.paths) paths.add(path);
	}
	return paths;
}

/** Earlier approvals plus these deletions, each under the side it went missing from. */
function withApproved(earlier: ApprovedDeletions | undefined, deletions: MassDeletion[]): ApprovedDeletions {
	const local = new Set(earlier?.local);
	const remote = new Set(earlier?.remote);
	for (const deletion of deletions) {
		const target = deletion.side === "local" ? local : remote;
		for (const path of deletion.paths) target.add(path);
	}
	return { local, remote };
}
