import { Notice, Plugin, TAbstractFile } from "obsidian";
import { YaDiskSyncSettings, DEFAULT_SETTINGS, SyncDirection } from "./types";
import { YandexDiskClient } from "./yandex-client";
import { SyncEngine } from "./sync-engine";
import { SyncStateManager } from "./sync-state";
import { YaDiskSyncSettingTab } from "./settings";
import { matchesExcludePattern } from "./utils";

const DEBOUNCE_DELAY = 5000;

export default class YaDiskSyncPlugin extends Plugin {
	settings: YaDiskSyncSettings = DEFAULT_SETTINGS;
	client: YandexDiskClient = null!;
	stateManager: SyncStateManager = null!;
	private statusBarEl: HTMLElement | null = null;
	private autoSyncIntervalId: number | null = null;
	private syncInProgress = false;
	private currentEngine: SyncEngine | null = null;
	private debouncedSyncTimer: ReturnType<typeof setTimeout> | null = null;

	async onload(): Promise<void> {
		await this.loadSettings();

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

		const data = await this.loadData();
		if (data) {
			this.stateManager.loadFromData(data);
		}

		this.addSettingTab(new YaDiskSyncSettingTab(this.app, this));

		this.addRibbonIcon("refresh-cw", "Yandex Disk Sync", () => {
			void this.runSync();
		});

		this.addCommand({
			id: "sync-now",
			name: "Sync now",
			callback: () => void this.runSync(),
		});

		this.addCommand({
			id: "push-all",
			name: "Push all to Yandex Disk",
			callback: () => void this.runSync(SyncDirection.Push),
		});

		this.addCommand({
			id: "pull-all",
			name: "Pull all from Yandex Disk",
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
			setTimeout(() => void this.runSync(), 3000);
		}
	}

	onunload(): void {
		if (this.autoSyncIntervalId !== null) {
			window.clearInterval(this.autoSyncIntervalId);
		}
		if (this.debouncedSyncTimer !== null) {
			clearTimeout(this.debouncedSyncTimer);
		}
	}

	private onFileChange(file: TAbstractFile): void {
		if (!this.settings.accessToken) return;
		if (matchesExcludePattern(file.path, this.settings.excludePatterns)) return;

		if (this.debouncedSyncTimer !== null) {
			clearTimeout(this.debouncedSyncTimer);
		}
		this.debouncedSyncTimer = setTimeout(() => {
			this.debouncedSyncTimer = null;
			void this.runSync();
		}, DEBOUNCE_DELAY);
	}

	async loadSettings(): Promise<void> {
		const data = await this.loadData();
		this.settings = Object.assign({}, DEFAULT_SETTINGS, data?.settings || {});
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

	setupAutoSync(): void {
		if (this.autoSyncIntervalId !== null) {
			window.clearInterval(this.autoSyncIntervalId);
			this.autoSyncIntervalId = null;
		}

		if (this.settings.autoSyncInterval > 0 && this.settings.accessToken) {
			const ms = this.settings.autoSyncInterval * 60 * 1000;
			this.autoSyncIntervalId = this.registerInterval(
				window.setInterval(() => void this.runSync(), ms),
			);
		}
	}

	private async runSync(directionOverride?: SyncDirection): Promise<void> {
		if (this.syncInProgress) return;

		if (!this.settings.accessToken) {
			new Notice("YaDisk: authorize in plugin settings");
			return;
		}

		this.syncInProgress = true;
		this.updateStatusBar("syncing", 0, 0);

		const engine = new SyncEngine(this.app, this.client, this.stateManager, this.settings);
		this.currentEngine = engine;

		try {
			const stats = await engine.run(directionOverride, (current, total) => {
				this.updateStatusBar("syncing", current, total);
			});

			await this.saveSettings();

			if (stats.errors > 0) {
				new Notice(
					`YaDisk: done with errors. up:${stats.uploaded} down:${stats.downloaded} del:${stats.deleted} err:${stats.errors}`,
				);
				this.updateStatusBar("error");
			} else if (stats.uploaded + stats.downloaded + stats.deleted > 0) {
				new Notice(
					`YaDisk: up:${stats.uploaded} down:${stats.downloaded} del:${stats.deleted}`,
				);
				this.updateStatusBar("idle");
			} else {
				this.updateStatusBar("idle");
			}
		} catch (e) {
			console.error("[YaDisk Sync] Sync error:", e);
			new Notice(`YaDisk: ${e instanceof Error ? e.message : String(e)}`);
			this.updateStatusBar("error");
		} finally {
			this.syncInProgress = false;
			this.currentEngine = null;
		}
	}

	private abortSync(): void {
		if (this.currentEngine) {
			this.currentEngine.abort();
			new Notice("YaDisk: sync aborted");
			this.updateStatusBar("idle");
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
				this.statusBarEl.setText("YaDisk: ok");
				break;
			case "syncing":
				if (current !== undefined && total !== undefined && total > 0) {
					this.statusBarEl.setText(`YaDisk: ${current}/${total}`);
				} else {
					this.statusBarEl.setText("YaDisk: scanning...");
				}
				break;
			case "error":
				this.statusBarEl.setText("YaDisk: error");
				break;
		}
	}
}
