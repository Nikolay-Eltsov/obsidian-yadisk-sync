import { App, Modal, Setting } from "obsidian";
import { t } from "./i18n";
import { SyncPlanItem, ConflictResolution } from "./types";

/**
 * Upper bound on individually rendered conflicts. Each one costs about ten DOM
 * nodes, so a full first sync gone wrong would otherwise try to build tens of
 * thousands of them and lock up the app.
 */
const MAX_RENDERED = 200;

export class ConflictModal extends Modal {
	private conflicts: SyncPlanItem[];
	private resolutions: Map<string, "local" | "remote" | "skip">;
	private resolvePromise: ((value: ConflictResolution[]) => void) | null = null;

	constructor(app: App, conflicts: SyncPlanItem[]) {
		super(app);
		this.conflicts = conflicts;
		this.resolutions = new Map();
		for (const c of conflicts) {
			this.resolutions.set(c.path, "skip");
		}
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.addClass("yadisk-conflict-modal");

		new Setting(contentEl)
			.setName(t("conflict.title", { count: this.conflicts.length }))
			.setHeading();

		const listEl = contentEl.createDiv({ cls: "conflict-list" });

		const shown = this.conflicts.slice(0, MAX_RENDERED);
		const hidden = this.conflicts.slice(MAX_RENDERED);

		for (const conflict of shown) {
			const item = listEl.createDiv({ cls: "yadisk-conflict-item" });

			item.createDiv({ cls: "conflict-path", text: conflict.path });

			const details = item.createDiv({ cls: "conflict-details" });

			const localCol = details.createDiv({ cls: "detail-col" });
			localCol.createDiv({ cls: "detail-label", text: t("conflict.sideLocal") });
			if (conflict.localRecord) {
				localCol.createDiv({ text: t("conflict.size", { size: formatSize(conflict.localRecord.size) }) });
				localCol.createDiv({ text: t("conflict.modified", { date: formatDate(conflict.localRecord.mtime) }) });
			} else {
				localCol.createDiv({ text: t("conflict.deleted") });
			}

			const remoteCol = details.createDiv({ cls: "detail-col" });
			remoteCol.createDiv({ cls: "detail-label", text: t("conflict.sideRemote") });
			if (conflict.remoteRecord) {
				remoteCol.createDiv({ text: t("conflict.size", { size: formatSize(conflict.remoteRecord.size) }) });
				remoteCol.createDiv({ text: t("conflict.modified", { date: formatDate(conflict.remoteRecord.mtime) }) });
			} else {
				remoteCol.createDiv({ text: t("conflict.deleted") });
			}

			const choiceEl = item.createDiv({ cls: "conflict-choice" });
			const choices: { label: string; value: "local" | "remote" | "skip" }[] = [
				{ label: t("conflict.keepLocal"), value: "local" },
				{ label: t("conflict.keepRemote"), value: "remote" },
				{ label: t("conflict.skip"), value: "skip" },
			];

			const buttons: HTMLButtonElement[] = [];
			for (const choice of choices) {
				const btn = choiceEl.createEl("button", { text: choice.label });
				buttons.push(btn);

				if (this.resolutions.get(conflict.path) === choice.value) {
					btn.addClass("is-active");
				}

				btn.addEventListener("click", () => {
					this.resolutions.set(conflict.path, choice.value);
					buttons.forEach((b) => b.removeClass("is-active"));
					btn.addClass("is-active");
				});
			}
		}

		if (hidden.length > 0) {
			const bulkEl = contentEl.createDiv({ cls: "yadisk-conflict-bulk" });
			bulkEl.createDiv({
				text: t("conflict.hidden", { count: hidden.length }),
			});

			const bulkChoices: { label: string; value: "local" | "remote" | "skip" }[] = [
				{ label: t("conflict.allLocal"), value: "local" },
				{ label: t("conflict.allRemote"), value: "remote" },
				{ label: t("conflict.skipAll"), value: "skip" },
			];

			const bulkButtons: HTMLButtonElement[] = [];
			const bulkRow = bulkEl.createDiv({ cls: "conflict-choice" });
			for (const choice of bulkChoices) {
				const btn = bulkRow.createEl("button", { text: choice.label });
				bulkButtons.push(btn);
				if (choice.value === "skip") btn.addClass("is-active");

				btn.addEventListener("click", () => {
					for (const conflict of hidden) {
						this.resolutions.set(conflict.path, choice.value);
					}
					bulkButtons.forEach((b) => b.removeClass("is-active"));
					btn.addClass("is-active");
				});
			}
		}

		const footer = contentEl.createDiv({ cls: "modal-button-container" });

		const applyBtn = footer.createEl("button", {
			text: t("conflict.apply"),
			cls: "mod-cta",
		});
		applyBtn.addEventListener("click", () => {
			this.submitAndClose();
		});

		const cancelBtn = footer.createEl("button", { text: t("queue.cancel") });
		cancelBtn.addEventListener("click", () => {
			this.resolutions.forEach((_, key) => this.resolutions.set(key, "skip"));
			this.submitAndClose();
		});
	}

	private submitAndClose(): void {
		const results: ConflictResolution[] = [];
		this.resolutions.forEach((choice, path) => {
			results.push({ path, choice });
		});
		if (this.resolvePromise) {
			this.resolvePromise(results);
		}
		this.close();
	}

	onClose(): void {
		this.contentEl.empty();
		if (this.resolvePromise) {
			const results: ConflictResolution[] = [];
			this.resolutions.forEach((choice, path) => {
				results.push({ path, choice });
			});
			this.resolvePromise(results);
			this.resolvePromise = null;
		}
	}

	waitForResolution(): Promise<ConflictResolution[]> {
		return new Promise((resolve) => {
			this.resolvePromise = resolve;
		});
	}
}

function formatSize(bytes: number): string {
	if (bytes < 1024) return t("size.bytes", { n: bytes });
	if (bytes < 1024 * 1024) return t("size.kb", { n: (bytes / 1024).toFixed(1) });
	return t("size.mb", { n: (bytes / (1024 * 1024)).toFixed(1) });
}

function formatDate(ms: number): string {
	if (!ms) return "—";
	const d = new Date(ms);
	return d.toLocaleString();
}
