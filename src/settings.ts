import { App, Notice, PluginSettingTab, Setting } from "obsidian";
import {
	SyncDirection,
	ConflictStrategy,
	DEFAULT_SETTINGS,
	MIN_CONCURRENCY,
	MAX_CONCURRENCY,
	ProgressDisplay,
} from "./types";
import type YaDiskSyncPlugin from "./main";

export class YaDiskSyncSettingTab extends PluginSettingTab {
	plugin: YaDiskSyncPlugin;

	constructor(app: App, plugin: YaDiskSyncPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();
		containerEl.addClass("yadisk-sync-settings");

		new Setting(containerEl).setName("Authorization").setHeading();

		const isAuthorized = !!this.plugin.settings.accessToken;

		if (!isAuthorized) {
			const authSetting = new Setting(containerEl)
				.setName("Sign in")
				.setDesc("Click the button, authorize in the browser, and copy the code");

			authSetting.addButton((btn) =>
				btn.setButtonText("Sign in").setCta().onClick(() => {
					const url = this.plugin.client.getAuthUrl();
					window.open(url);
				}),
			);

			const codeSetting = new Setting(containerEl)
				.setName("Authorization code")
				.setDesc("Paste the code you received after authorization");

			let codeValue = "";
			codeSetting.addText((text) =>
				text.setPlaceholder("Paste code here").onChange((value) => {
					codeValue = value.trim();
				}),
			);

			codeSetting.addButton((btn) =>
				btn.setButtonText("Confirm").onClick(async () => {
					if (!codeValue) {
						new Notice("Enter the authorization code");
						return;
					}
					try {
						btn.setButtonText("...");
						btn.buttonEl.disabled = true;
						await this.plugin.client.exchangeCode(codeValue);
						new Notice("Authorization successful");
						await this.plugin.saveSettings();
						this.display();
					} catch (e) {
						new Notice(`Error: ${e instanceof Error ? e.message : String(e)}`);
						btn.setButtonText("Confirm");
						btn.buttonEl.disabled = false;
					}
				}),
			);
		} else {
			new Setting(containerEl)
				.setName("Account")
				.setDesc("Authorized")
				.addButton((btn) =>
					btn.setButtonText("Check connection").onClick(async () => {
						try {
							const info = await this.plugin.client.getDiskInfo();
							const login = info.user?.display_name || info.user?.login || "—";
							const freeGB = ((info.total_space - info.used_space) / (1024 * 1024 * 1024)).toFixed(2);
							new Notice(`${login} — ${freeGB} GB free`);
						} catch (e) {
							new Notice(`Error: ${e instanceof Error ? e.message : String(e)}`);
						}
					}),
				)
				.addButton((btn) =>
					btn
						.setButtonText("Sign out")
						.setWarning()
						.onClick(async () => {
							this.plugin.settings.accessToken = "";
							this.plugin.settings.refreshToken = "";
							this.plugin.settings.tokenExpiresAt = 0;
							await this.plugin.saveSettings();
							this.display();
						}),
				);
		}

		new Setting(containerEl).setName("Synchronization").setHeading();

		new Setting(containerEl)
			.setName("Remote folder")
			.addText((text) =>
				text
					.setPlaceholder("/vault")
					.setValue(this.plugin.settings.remotePath)
					.onChange((value) => {
						this.plugin.settings.remotePath = value.trim() || DEFAULT_SETTINGS.remotePath;
						this.plugin.client.setRemotePath(this.plugin.settings.remotePath);
						this.plugin.queueSaveSettings();
					}),
			);

		new Setting(containerEl)
			.setName("Direction")
			.addDropdown((dd) =>
				dd
					.addOption(SyncDirection.Bidirectional, "Bidirectional")
					.addOption(SyncDirection.Push, "Push only")
					.addOption(SyncDirection.Pull, "Pull only")
					.setValue(this.plugin.settings.syncDirection)
					.onChange((value) => {
						this.plugin.settings.syncDirection = value as SyncDirection;
						this.plugin.queueSaveSettings();
					}),
			);

		new Setting(containerEl)
			.setName("Conflict strategy")
			.addDropdown((dd) =>
				dd
					.addOption(ConflictStrategy.NewerWins, "Newer wins")
					.addOption(ConflictStrategy.LocalWins, "Local wins")
					.addOption(ConflictStrategy.RemoteWins, "Remote wins")
					.addOption(ConflictStrategy.Ask, "Ask")
					.setValue(this.plugin.settings.conflictStrategy)
					.onChange((value) => {
						this.plugin.settings.conflictStrategy = value as ConflictStrategy;
						this.plugin.queueSaveSettings();
					}),
			);

		new Setting(containerEl)
			.setName("Auto-sync interval")
			.setDesc(
				"How often to check Yandex Disk for changes. The check itself is a single request, so short intervals are cheap — but a change found on a large vault still takes a full scan to apply. Edits you make here sync 5 seconds after you stop typing, regardless of this setting.",
			)
			.addDropdown((dd) => {
				const options: [number, string][] = [
					[0, "Off"],
					[10, "Every 10 seconds"],
					[30, "Every 30 seconds"],
					[60, "Every minute"],
					[300, "Every 5 minutes"],
					[900, "Every 15 minutes"],
					[1800, "Every 30 minutes"],
					[3600, "Every hour"],
				];
				const current = this.plugin.settings.autoSyncSeconds;
				if (current > 0 && !options.some(([seconds]) => seconds === current)) {
					// Carried over from the old minutes-based setting.
					options.push([current, `Every ${Math.round(current / 60)} minutes`]);
					options.sort((a, b) => a[0] - b[0]);
				}
				for (const [seconds, label] of options) {
					dd.addOption(String(seconds), label);
				}
				dd.setValue(String(this.plugin.settings.autoSyncSeconds)).onChange((value) => {
					this.plugin.settings.autoSyncSeconds = parseInt(value, 10) || 0;
					this.plugin.setupAutoSync();
					this.plugin.queueSaveSettings();
				});
			});

		new Setting(containerEl)
			.setName("Sync on startup")
			.addToggle((toggle) =>
				toggle.setValue(this.plugin.settings.syncOnStartup).onChange((value) => {
					this.plugin.settings.syncOnStartup = value;
					this.plugin.queueSaveSettings();
				}),
			);

		const configDir = this.app.vault.configDir;

		new Setting(containerEl)
			.setName("Exclude patterns")
			.setDesc("One pattern per line")
			.addTextArea((ta) =>
				ta
					.setPlaceholder(`${configDir}/workspace*.json\n.trash/**`)
					.setValue(this.plugin.settings.excludePatterns.join("\n"))
					.then((t) => {
						t.inputEl.rows = 5;
						t.inputEl.addClass("yadisk-textarea-wide");
					})
					.onChange((value) => {
						this.plugin.settings.excludePatterns = value
							.split("\n")
							.map((s) => s.trim())
							.filter(Boolean);
						this.plugin.queueSaveSettings();
					}),
			);

		new Setting(containerEl)
			.setName("Max file size (mb)")
			.addText((text) =>
				text
					.setPlaceholder("50")
					.setValue(String(this.plugin.settings.maxFileSizeMB))
					.onChange((value) => {
						const num = parseInt(value, 10);
						this.plugin.settings.maxFileSizeMB = isNaN(num) ? 50 : Math.max(1, num);
						this.plugin.queueSaveSettings();
					}),
			);

		new Setting(containerEl)
			.setName("Parallel transfers")
			.setDesc(
				"How many files to transfer at once. Higher is faster on large vaults; lower it if Yandex Disk starts rate-limiting.",
			)
			.addSlider((slider) =>
				slider
					.setLimits(MIN_CONCURRENCY, MAX_CONCURRENCY, 1)
					.setValue(this.plugin.settings.concurrency)
					.setDynamicTooltip()
					.onChange((value) => {
						this.plugin.settings.concurrency = value;
						this.plugin.queueSaveSettings();
					}),
			);

		new Setting(containerEl)
			.setName("Show sync progress")
			.setDesc(
				"Most syncs carry a single edited note and are over in seconds. By default the indicator appears only once a sync has been running for 20 seconds, so a long one still shows it is working. Tapping the sync icon, or the \"Show sync status\" command, brings it up at any time.",
			)
			.addDropdown((dd) =>
				dd
					.addOption(ProgressDisplay.Delayed, "Only for long syncs")
					.addOption(ProgressDisplay.Always, "Always")
					.addOption(ProgressDisplay.Never, "Never")
					.setValue(this.plugin.settings.progressDisplay)
					.onChange((value) => {
						this.plugin.settings.progressDisplay = value as ProgressDisplay;
						this.plugin.queueSaveSettings();
					}),
			);

		new Setting(containerEl)
			.setName("Keep screen on during long syncs")
			.setDesc(
				"On iOS a locked screen suspends Obsidian and freezes the sync. This holds the screen awake for syncs of 50 files or more; short syncs are unaffected.",
			)
			.addToggle((toggle) =>
				toggle.setValue(this.plugin.settings.keepScreenOn).onChange((value) => {
					this.plugin.settings.keepScreenOn = value;
					this.plugin.queueSaveSettings();
				}),
			);

		new Setting(containerEl)
			.setName("Reset sync state")
			.setDesc("Next sync will be a full comparison")
			.addButton((btn) =>
				btn
					.setButtonText("Reset")
					.setWarning()
					.onClick((evt) => {
						this.plugin.stateManager.resetState();
						void this.plugin.saveSettings();
						btn.setButtonText("Done!");
						window.setTimeout(() => { btn.setButtonText("Reset"); }, 2000);
					}),
			);
	}
}
