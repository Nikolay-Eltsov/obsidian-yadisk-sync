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

		containerEl.createEl("h2", { text: "Yandex Disk Sync" });

		// ── Authorization ──
		const isAuthorized = !!this.plugin.settings.accessToken;

		if (!isAuthorized) {
			const authSetting = new Setting(containerEl)
				.setName("Войти в Яндекс")
				.setDesc("Нажмите кнопку, авторизуйтесь в браузере и скопируйте код");

			authSetting.addButton((btn) =>
				btn.setButtonText("Войти через Яндекс").setCta().onClick(() => {
					const url = this.plugin.client.getAuthUrl();
					window.open(url);
				}),
			);

			const codeSetting = new Setting(containerEl)
				.setName("Код авторизации")
				.setDesc("Вставьте код, полученный после авторизации");

			let codeValue = "";
			codeSetting.addText((text) =>
				text.setPlaceholder("Вставьте код сюда").onChange((value) => {
					codeValue = value.trim();
				}),
			);

			codeSetting.addButton((btn) =>
				btn.setButtonText("Подтвердить").onClick(async () => {
					if (!codeValue) {
						new Notice("Введите код авторизации");
						return;
					}
					try {
						btn.setButtonText("...");
						btn.setDisabled(true);
						await this.plugin.client.exchangeCode(codeValue);
						new Notice("Авторизация успешна!");
						await this.plugin.saveSettings();
						this.display();
					} catch (e) {
						new Notice(`Ошибка: ${e instanceof Error ? e.message : String(e)}`);
						btn.setButtonText("Подтвердить");
						btn.setDisabled(false);
					}
				}),
			);
		} else {
			new Setting(containerEl)
				.setName("Аккаунт Яндекс")
				.setDesc("Авторизован")
				.addButton((btn) =>
					btn.setButtonText("Проверить").onClick(async () => {
						try {
							const info = await this.plugin.client.getDiskInfo();
							const login = info.user?.display_name || info.user?.login || "—";
							const freeGB = ((info.total_space - info.used_space) / (1024 * 1024 * 1024)).toFixed(2);
							new Notice(`${login} | Свободно: ${freeGB} ГБ`);
						} catch (e) {
							new Notice(`Ошибка: ${e instanceof Error ? e.message : String(e)}`);
						}
					}),
				)
				.addButton((btn) =>
					btn
						.setButtonText("Выйти")
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

		// ── Sync Settings ──
		containerEl.createEl("h3", { text: "Синхронизация" });

		new Setting(containerEl)
			.setName("Папка на Яндекс Диске")
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
			.setName("Направление")
			.addDropdown((dd) =>
				dd
					.addOption(SyncDirection.Bidirectional, "Двусторонняя")
					.addOption(SyncDirection.Push, "Только загрузка (Push)")
					.addOption(SyncDirection.Pull, "Только скачивание (Pull)")
					.setValue(this.plugin.settings.syncDirection)
					.onChange(async (value) => {
						this.plugin.settings.syncDirection = value as SyncDirection;
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName("Конфликты")
			.addDropdown((dd) =>
				dd
					.addOption(ConflictStrategy.NewerWins, "Побеждает новый")
					.addOption(ConflictStrategy.LocalWins, "Побеждает локальный")
					.addOption(ConflictStrategy.RemoteWins, "Побеждает удалённый")
					.addOption(ConflictStrategy.Ask, "Спросить")
					.setValue(this.plugin.settings.conflictStrategy)
					.onChange(async (value) => {
						this.plugin.settings.conflictStrategy = value as ConflictStrategy;
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName("Автосинхронизация (минуты)")
			.setDesc("0 = отключено")
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
			.setName("Синхронизация при запуске")
			.addToggle((toggle) =>
				toggle.setValue(this.plugin.settings.syncOnStartup).onChange(async (value) => {
					this.plugin.settings.syncOnStartup = value;
					await this.plugin.saveSettings();
				}),
			);

		new Setting(containerEl)
			.setName("Исключения")
			.setDesc("По одному паттерну на строку")
			.addTextArea((ta) =>
				ta
					.setPlaceholder(".obsidian/workspace*.json\n.trash/**")
					.setValue(this.plugin.settings.excludePatterns.join("\n"))
					.then((t) => {
						t.inputEl.rows = 5;
						t.inputEl.style.width = "100%";
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
			.setName("Макс. размер файла (МБ)")
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
			.setName("Сбросить состояние синхронизации")
			.setDesc("Следующая синхронизация будет полной")
			.addButton((btn) =>
				btn
					.setButtonText("Сбросить")
					.setWarning()
					.onClick(async () => {
						this.plugin.stateManager.resetState();
						await this.plugin.saveSettings();
						btn.setButtonText("Сброшено!");
						setTimeout(() => btn.setButtonText("Сбросить"), 2000);
					}),
			);
	}
}
