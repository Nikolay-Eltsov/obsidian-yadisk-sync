import { App, Modal, Setting } from "obsidian";
import { SyncPlanItem, ConflictResolution } from "./types";

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
			.setName(`Sync conflicts (${this.conflicts.length})`)
			.setHeading();

		const listEl = contentEl.createDiv({ cls: "conflict-list" });

		for (const conflict of this.conflicts) {
			const item = listEl.createDiv({ cls: "yadisk-conflict-item" });

			item.createDiv({ cls: "conflict-path", text: conflict.path });

			const details = item.createDiv({ cls: "conflict-details" });

			const localCol = details.createDiv({ cls: "detail-col" });
			localCol.createDiv({ cls: "detail-label", text: "Local" });
			if (conflict.localRecord) {
				localCol.createEl("div", {
					text: `Size: ${formatSize(conflict.localRecord.size)}`,
				});
				localCol.createEl("div", {
					text: `Modified: ${formatDate(conflict.localRecord.mtime)}`,
				});
			} else {
				localCol.createEl("div", { text: "Deleted" });
			}

			const remoteCol = details.createDiv({ cls: "detail-col" });
			remoteCol.createDiv({ cls: "detail-label", text: "Remote" });
			if (conflict.remoteRecord) {
				remoteCol.createEl("div", {
					text: `Size: ${formatSize(conflict.remoteRecord.size)}`,
				});
				remoteCol.createEl("div", {
					text: `Modified: ${formatDate(conflict.remoteRecord.mtime)}`,
				});
			} else {
				remoteCol.createEl("div", { text: "Deleted" });
			}

			const choiceEl = item.createDiv({ cls: "conflict-choice" });
			const choices: { label: string; value: "local" | "remote" | "skip" }[] = [
				{ label: "Local", value: "local" },
				{ label: "Remote", value: "remote" },
				{ label: "Skip", value: "skip" },
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

		const footer = contentEl.createDiv({ cls: "modal-button-container" });

		const applyBtn = footer.createEl("button", {
			text: "Apply",
			cls: "mod-cta",
		});
		applyBtn.addEventListener("click", () => {
			this.submitAndClose();
		});

		const cancelBtn = footer.createEl("button", { text: "Cancel" });
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
	if (bytes < 1024) return bytes + " B";
	if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
	return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

function formatDate(ms: number): string {
	if (!ms) return "—";
	const d = new Date(ms);
	return d.toLocaleString();
}
