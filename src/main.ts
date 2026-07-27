import { Notice, Plugin, TAbstractFile } from "obsidian";
import {
	YaDiskSyncSettings,
	DEFAULT_SETTINGS,
	SyncDirection,
	SyncState,
	PersistedSyncState,
	MIN_CONCURRENCY,
	MAX_CONCURRENCY,
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

		this.registerEvent(this.app.vault.on("create", (file) => this.onFileChange(file)));
		this.registerEvent(this.app.vault.on("modify", (file) => this.onFileChange(file)));
		this.registerEvent(this.app.vault.on("delete", (file) => this.onFileChange(file)));
		this.registerEvent(this.app.vault.on("rename", (file) => this.onFileChange(file)));

		if (this.settings.syncOnStartup && this.settings.accessToken) {
			activeWindow.setTimeout(() => { void this.runSync(); }, 3000);
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
			void this.runSync();
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

		if (this.settings.autoSyncInterval > 0 && this.settings.accessToken) {
			const ms = this.settings.autoSyncInterval * 60 * 1000;
			this.autoSyncIntervalId = this.registerInterval(
				window.setInterval(() => { void this.runSync(); }, ms),
			);
		}
	}

	private async runSync(directionOverride?: SyncDirection): Promise<void> {
		if (this.syncInProgress) {
			new Notice("Sync already in progress");
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
			const stats = await engine.run(directionOverride, {
				reporter: progress,
				checkpoint: () => this.saveSettings(),
			});

			await this.saveSettings();
			this.reportResult(stats);
		} catch (e) {
			console.error("[YaDisk Sync] Sync error:", e);
			new Notice(`Sync error: ${e instanceof Error ? e.message : String(e)}`);
			this.updateStatusBar("error");
		} finally {
			progress.close();
			this.syncInProgress = false;
			this.lastSyncEndedAt = Date.now();
			this.currentEngine = null;
		}
	}

	private reportResult(stats: SyncStats): void {
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

		// Reported even when nothing moved: on mobile there is no status bar, so
		// silence here is indistinguishable from the sync never having run.
		new Notice(moved > 0 ? `Sync complete. ${counts}` : "Sync complete. Already up to date");
		this.updateStatusBar("idle");
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

function clampConcurrency(value: number): number {
	if (!Number.isFinite(value)) return DEFAULT_SETTINGS.concurrency;
	return Math.min(MAX_CONCURRENCY, Math.max(MIN_CONCURRENCY, Math.round(value)));
}
