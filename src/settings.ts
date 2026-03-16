import { App, Notice, PluginSettingTab, Setting } from "obsidian";
import { SyncDirection, ConflictStrategy, DEFAULT_SETTINGS } from "./types";
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

		new Setting(containerEl).setName("Yandex Disk Sync").setHeading();

		const isAuthorized = !!this.plugin.settings.accessToken;

		if (!isAuthorized) {
			const authSetting = new Setting(containerEl)
				.setName("Sign in to Yandex")
				.setDesc("Click the button, authorize in the browser, and copy the code");

			authSetting.addButton((btn) =>
				btn.setButtonText("Sign in with Yandex").setCta().onClick(() => {
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
						btn.setDisabled(true);
						await this.plugin.client.exchangeCode(codeValue);
						new Notice("Authorization successful!");
						await this.plugin.saveSettings();
						this.display();
					} catch (e) {
						new Notice(`Error: ${e instanceof Error ? e.message : String(e)}`);
						btn.setButtonText("Confirm");
						btn.setDisabled(false);
					}
				}),
			);
		} else {
			new Setting(containerEl)
				.setName("Yandex account")
				.setDesc("Authorized")
				.addButton((btn) =>
					btn.setButtonText("Check connection").onClick(async () => {
						try {
							const info = await this.plugin.client.getDiskInfo();
							const login = info.user?.display_name || info.user?.login || "—";
							const freeGB = ((info.total_space - info.used_space) / (1024 * 1024 * 1024)).toFixed(2);
							new Notice(`${login} | Free: ${freeGB} GB`);
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

		new Setting(containerEl).setName("Sync settings").setHeading();

		new Setting(containerEl)
			.setName("Remote folder")
			.addText((text) =>
				text
					.setPlaceholder("/ObsidianVault")
					.setValue(this.plugin.settings.remotePath)
					.onChange(async (value) => {
						this.plugin.settings.remotePath = value.trim() || DEFAULT_SETTINGS.remotePath;
						await this.plugin.saveSettings();
						this.plugin.client.setRemotePath(this.plugin.settings.remotePath);
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
					.onChange(async (value) => {
						this.plugin.settings.syncDirection = value as SyncDirection;
						await this.plugin.saveSettings();
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
					.onChange(async (value) => {
						this.plugin.settings.conflictStrategy = value as ConflictStrategy;
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName("Auto-sync interval (minutes)")
			.setDesc("0 = disabled")
			.addText((text) =>
				text
					.setPlaceholder("0")
					.setValue(String(this.plugin.settings.autoSyncInterval))
					.onChange(async (value) => {
						const num = parseInt(value, 10);
						this.plugin.settings.autoSyncInterval = isNaN(num) ? 0 : Math.max(0, num);
						await this.plugin.saveSettings();
						this.plugin.setupAutoSync();
					}),
			);

		new Setting(containerEl)
			.setName("Sync on startup")
			.addToggle((toggle) =>
				toggle.setValue(this.plugin.settings.syncOnStartup).onChange(async (value) => {
					this.plugin.settings.syncOnStartup = value;
					await this.plugin.saveSettings();
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
					.onChange(async (value) => {
						this.plugin.settings.excludePatterns = value
							.split("\n")
							.map((s) => s.trim())
							.filter(Boolean);
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName("Max file size (MB)")
			.addText((text) =>
				text
					.setPlaceholder("50")
					.setValue(String(this.plugin.settings.maxFileSizeMB))
					.onChange(async (value) => {
						const num = parseInt(value, 10);
						this.plugin.settings.maxFileSizeMB = isNaN(num) ? 50 : Math.max(1, num);
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName("Reset sync state")
			.setDesc("Next sync will be a full comparison")
			.addButton((btn) =>
				btn
					.setButtonText("Reset")
					.setWarning()
					.onClick(async () => {
						this.plugin.stateManager.resetState();
						await this.plugin.saveSettings();
						btn.setButtonText("Done!");
						setTimeout(() => btn.setButtonText("Reset"), 2000);
					}),
			);
	}
}
