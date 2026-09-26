import { App, Notice, PluginSettingTab, Setting } from "obsidian";
import {
	SyncDirection,
	ConflictStrategy,
	DEFAULT_SETTINGS,
	MIN_CONCURRENCY,
	MAX_CONCURRENCY,
	MIN_SCAN_CONCURRENCY,
	MAX_SCAN_CONCURRENCY,
	ProgressDisplay,
	Language,
} from "./types";
import { MessageKey, setLanguage, t } from "./i18n";
import type YaDiskSyncPlugin from "./main";

export class YaDiskSyncSettingTab extends PluginSettingTab {
	plugin: YaDiskSyncPlugin;

	/** A remote folder being typed, not yet handed to the plugin. */
	private typedRemotePath: string | null = null;

	constructor(app: App, plugin: YaDiskSyncPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	hide(): void {
		// Closing the settings does not reliably blur the field first, and by
		// now its contents are gone: what was typed is only in the tab.
		this.commitRemotePath();
		super.hide();
	}

	private commitRemotePath(): void {
		if (this.typedRemotePath === null) return;
		const value = this.typedRemotePath;
		this.typedRemotePath = null;
		this.plugin.applyRemotePath(value);
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();
		containerEl.addClass("yadisk-sync-settings");
		setLanguage(this.plugin.settings.language);

		new Setting(containerEl)
			.setName(t("language.name"))
			.setDesc(t("language.desc"))
			.addDropdown((dd) =>
				dd
					.addOption(Language.Auto, t("language.auto"))
					.addOption(Language.English, "English")
					.addOption(Language.Russian, "Русский")
					.setValue(this.plugin.settings.language)
					.onChange((value) => {
						this.plugin.settings.language = value as Language;
						this.plugin.queueSaveSettings();
						this.display();
						this.plugin.queue.notify();
					}),
			);

		new Setting(containerEl).setName(t("auth.heading")).setHeading();

		const isAuthorized = !!this.plugin.settings.accessToken;

		if (!isAuthorized) {
			const authSetting = new Setting(containerEl)
				.setName(t("auth.signIn"))
				.setDesc(t("auth.signInDesc"));

			authSetting.addButton((btn) =>
				btn.setButtonText(t("auth.signIn")).setCta().onClick(() => {
					const url = this.plugin.client.getAuthUrl();
					window.open(url);
				}),
			);

			const codeSetting = new Setting(containerEl)
				.setName(t("auth.code"))
				.setDesc(t("auth.codeDesc"));

			let codeValue = "";
			codeSetting.addText((text) =>
				text.setPlaceholder(t("auth.codePlaceholder")).onChange((value) => {
					codeValue = value.trim();
				}),
			);

			codeSetting.addButton((btn) =>
				btn.setButtonText(t("auth.confirm")).onClick(async () => {
					if (!codeValue) {
						new Notice(t("auth.enterCode"));
						return;
					}
					try {
						btn.setButtonText("...");
						btn.buttonEl.disabled = true;
						await this.plugin.client.exchangeCode(codeValue);
						new Notice(t("auth.success"));
						await this.plugin.saveSettings();
						this.display();
					} catch (e) {
						new Notice(t("error", { message: e instanceof Error ? e.message : String(e) }));
						btn.setButtonText(t("auth.confirm"));
						btn.buttonEl.disabled = false;
					}
				}),
			);
		} else {
			new Setting(containerEl)
				.setName(t("auth.account"))
				.setDesc(t("auth.authorized"))
				.addButton((btn) =>
					btn.setButtonText(t("auth.check")).onClick(async () => {
						try {
							const info = await this.plugin.client.getDiskInfo();
							const login = info.user?.display_name || info.user?.login || "—";
							const freeGB = ((info.total_space - info.used_space) / (1024 * 1024 * 1024)).toFixed(2);
							new Notice(t("auth.free", { login, free: freeGB }));
						} catch (e) {
							new Notice(t("error", { message: e instanceof Error ? e.message : String(e) }));
						}
					}),
				)
				.addButton((btn) =>
					btn
						.setButtonText(t("auth.signOut"))
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

		new Setting(containerEl).setName(t("sync.heading")).setHeading();

		new Setting(containerEl)
			.setName(t("remote.name"))
			.setDesc(t("remote.desc"))
			.addText((text) => {
				text
					.setPlaceholder("/vault")
					.setValue(this.plugin.settings.remotePath)
					// Held until the edit is done: applied per keystroke, a
					// half-typed path would be synced against.
					.onChange((value) => {
						this.typedRemotePath = value;
					});
				text.inputEl.addEventListener("change", () => this.commitRemotePath());
			});

		new Setting(containerEl)
			.setName(t("direction.name"))
			.addDropdown((dd) =>
				dd
					.addOption(SyncDirection.Bidirectional, t("direction.bidirectional"))
					.addOption(SyncDirection.Push, t("direction.push"))
					.addOption(SyncDirection.Pull, t("direction.pull"))
					.setValue(this.plugin.settings.syncDirection)
					.onChange((value) => {
						this.plugin.settings.syncDirection = value as SyncDirection;
						this.plugin.queueSaveSettings();
					}),
			);

		new Setting(containerEl)
			.setName(t("conflict.name"))
			.addDropdown((dd) =>
				dd
					.addOption(ConflictStrategy.NewerWins, t("conflict.newer"))
					.addOption(ConflictStrategy.LocalWins, t("conflict.local"))
					.addOption(ConflictStrategy.RemoteWins, t("conflict.remote"))
					.addOption(ConflictStrategy.Ask, t("conflict.ask"))
					.setValue(this.plugin.settings.conflictStrategy)
					.onChange((value) => {
						this.plugin.settings.conflictStrategy = value as ConflictStrategy;
						this.plugin.queueSaveSettings();
					}),
			);

		new Setting(containerEl)
			.setName(t("deletions.name"))
			.setDesc(t("deletions.desc"))
			.addDropdown((dd) => {
				const options = [10, 20, 50, 100, 250, 500, 1000];
				const current = this.plugin.settings.deleteConfirmThreshold;
				if (!options.includes(current)) {
					// Set by hand in the data file.
					options.push(current);
					options.sort((a, b) => a - b);
				}
				for (const count of options) {
					dd.addOption(String(count), t("deletions.files", { count }));
				}
				dd.setValue(String(current)).onChange((value) => {
					this.plugin.settings.deleteConfirmThreshold =
						parseInt(value, 10) || DEFAULT_SETTINGS.deleteConfirmThreshold;
					this.plugin.queueSaveSettings();
				});
			});

		new Setting(containerEl)
			.setName(t("interval.name"))
			.setDesc(t("interval.desc"))
			.addDropdown((dd) => {
				const options: [number, string][] = [
					[0, t("interval.off")],
					[10, t("interval.seconds", { count: 10 })],
					[30, t("interval.seconds", { count: 30 })],
					[60, t("interval.minute")],
					[300, t("interval.minutes", { count: 5 })],
					[900, t("interval.minutes", { count: 15 })],
					[1800, t("interval.minutes", { count: 30 })],
					[3600, t("interval.hour")],
				];
				const current = this.plugin.settings.autoSyncSeconds;
				if (current > 0 && !options.some(([seconds]) => seconds === current)) {
					// Carried over from the old minutes-based setting.
					options.push([current, t("interval.minutes", { count: Math.round(current / 60) })]);
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
			.setName(t("startup.name"))
			.addToggle((toggle) =>
				toggle.setValue(this.plugin.settings.syncOnStartup).onChange((value) => {
					this.plugin.settings.syncOnStartup = value;
					this.plugin.queueSaveSettings();
				}),
			);

		const configDir = this.app.vault.configDir;

		new Setting(containerEl)
			.setName(t("exclude.name"))
			.setDesc(t("exclude.desc"))
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
			.setName(t("maxSize.name"))
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
			.setName(t("concurrency.name"))
			.setDesc(t("concurrency.desc"))
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
			.setName(t("scanConcurrency.name"))
			.setDesc(t("scanConcurrency.desc"))
			.addSlider((slider) =>
				slider
					.setLimits(MIN_SCAN_CONCURRENCY, MAX_SCAN_CONCURRENCY, 1)
					.setValue(this.plugin.settings.scanConcurrency)
					.setDynamicTooltip()
					.onChange((value) => {
						this.plugin.settings.scanConcurrency = value;
						this.plugin.queueSaveSettings();
					}),
			);

		new Setting(containerEl)
			.setName(t("progress.name"))
			.setDesc(t("progress.desc"))
			.addDropdown((dd) =>
				dd
					.addOption(ProgressDisplay.Delayed, t("progress.delayed"))
					.addOption(ProgressDisplay.Always, t("progress.always"))
					.addOption(ProgressDisplay.Never, t("progress.never"))
					.setValue(this.plugin.settings.progressDisplay)
					.onChange((value) => {
						this.plugin.settings.progressDisplay = value as ProgressDisplay;
						this.plugin.queueSaveSettings();
					}),
			);

		new Setting(containerEl)
			.setName(t("statusCounts.name"))
			.setDesc(t("statusCounts.desc"))
			.addToggle((toggle) =>
				toggle.setValue(this.plugin.settings.statusBarCounts).onChange((value) => {
					this.plugin.settings.statusBarCounts = value;
					this.plugin.queueSaveSettings();
					this.plugin.queue.notify();
				}),
			);

		new Setting(containerEl)
			.setName(t("screen.name"))
			.setDesc(t("screen.desc"))
			.addToggle((toggle) =>
				toggle.setValue(this.plugin.settings.keepScreenOn).onChange((value) => {
					this.plugin.settings.keepScreenOn = value;
					this.plugin.queueSaveSettings();
				}),
			);

		new Setting(containerEl)
			.setName(t("fullSync.name"))
			.setDesc(t("fullSync.desc"))
			.addButton((btn) =>
				btn.setButtonText(t("fullSync.button")).onClick(() => {
					this.plugin.runFullSync();
				}),
			);

		new Setting(containerEl)
			.setName(t("reset.name"))
			.setDesc(t("reset.desc"))
			.addButton((btn) =>
				btn
					.setButtonText(t("reset.button"))
					.setWarning()
					.onClick((evt) => {
						this.plugin.stateManager.resetState();
						void this.plugin.saveSettings();
						btn.setButtonText(t("reset.done"));
						window.setTimeout(() => { btn.setButtonText(t("reset.button")); }, 2000);
					}),
			);

		this.renderSyncComparison(containerEl);
	}

	/**
	 * How the two buttons above differ. Both read everything again, so side
	 * by side they look alike; what sets them apart is whether the memory of
	 * the last sync survives, and with it whether deletions carry over.
	 */
	private renderSyncComparison(containerEl: HTMLElement): void {
		const rows: [MessageKey, MessageKey, MessageKey][] = [
			["compare.starts", "compare.starts.full", "compare.starts.reset"],
			["compare.memory", "compare.memory.full", "compare.memory.reset"],
			["compare.deletions", "compare.deletions.full", "compare.deletions.reset"],
			["compare.edits", "compare.edits.full", "compare.edits.reset"],
			["compare.rereads", "compare.rereads.full", "compare.rereads.reset"],
		];

		const table = containerEl.createEl("table", { cls: "yadisk-compare" });
		table.createEl("caption", { text: t("compare.caption") });

		const head = table.createEl("thead").createEl("tr");
		head.createEl("th");
		head.createEl("th", { text: t("compare.full"), attr: { scope: "col" } });
		head.createEl("th", { text: t("compare.reset"), attr: { scope: "col" } });

		const body = table.createEl("tbody");
		for (const [label, full, reset] of rows) {
			const row = body.createEl("tr");
			row.createEl("th", { text: t(label), attr: { scope: "row" } });
			row.createEl("td", { text: t(full) });
			row.createEl("td", { text: t(reset) });
		}
	}
}
