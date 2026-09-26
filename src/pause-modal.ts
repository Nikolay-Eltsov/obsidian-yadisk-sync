import { App, Modal, Notice, Setting } from "obsidian";
import { t } from "./i18n";
import { MassDeletion, SyncBlock } from "./types";

/** Paths listed one by one; the rest are counted, as in the conflict dialog. */
const MAX_LISTED = 200;

/** Seconds the button that deletes stays disabled: time to read what it will do. */
const CONFIRM_DELAY_S = 10;

export interface PauseActions {
	/** Runs the sync again, to see whether the problem is still there. */
	recheck(): void;
	/** Forgets the snapshots and uploads this vault into the remote folder. */
	startOver(): void;
	/** Copies the missing files back from the side that still has them. */
	restore(deletions: MassDeletion[]): void;
	/** Lets the sync go ahead and delete them. */
	approve(deletions: MassDeletion[]): void;
}

interface ButtonSpec {
	text: string;
	cls?: string;
	/** Seconds the button stays disabled after the dialog opens. */
	delay?: number;
	onClick: () => void;
}

/**
 * The line that announces a pause. `partial` means the run had already
 * transferred something when it stopped, so it did not leave everything as
 * it was.
 */
export function describeBlock(block: SyncBlock, partial: boolean): string {
	const untouched = partial ? t("pause.notice.partial") : t("pause.untouched");

	switch (block.kind) {
		case "storage":
			return t("pause.notice.storage", { untouched });
		case "stale-list":
			return t("pause.notice.staleList", { untouched });
		case "remote-missing":
			return t("pause.notice.remoteMissing", { path: block.remotePath });
		case "mass-delete": {
			if (block.deletions.length > 1) return t("pause.notice.massBoth");
			const deletion = block.deletions[0];
			return deletion.side === "local"
				? t("pause.notice.massLocal", countVars(deletion))
				: t("pause.notice.massRemote", countVars(deletion));
		}
	}
}

/** A notice that stays up until dismissed, with a way into the review. */
export function showPauseNotice(text: string, onReview: () => void): Notice {
	const frag = createFragment((el) => {
		const wrapper = el.createDiv({ cls: "yadisk-pause-notice" });
		wrapper.createDiv({ cls: "yadisk-pause-notice-text", text });
		const reviewBtn = wrapper.createEl("button", { text: t("queue.review") });
		reviewBtn.addEventListener("click", () => onReview());
	});
	return new Notice(frag, 0);
}

/**
 * Explains why syncing is on hold and offers what can be done about it.
 *
 * Deleting is never the default. When files went missing, the first choice
 * brings them back, and the one that deletes them unlocks only after a
 * countdown: a mass deletion is exactly what a vanished drive looks like,
 * and a reflexive click would finish what the drive started.
 */
export class PauseModal extends Modal {
	private countdownTimer: number | null = null;

	constructor(
		app: App,
		private block: SyncBlock,
		private partial: boolean,
		/** Deletions already allowed in this review, which will go ahead too. */
		private approvedEarlier: number,
		private actions: PauseActions,
	) {
		super(app);
	}

	onOpen(): void {
		this.contentEl.addClass("yadisk-pause-modal");
		new Setting(this.contentEl).setName(t("pause.title")).setHeading();

		const block = this.block;
		switch (block.kind) {
			case "storage":
				this.renderStorage();
				break;
			case "stale-list":
				this.renderStaleList(block.paths);
				break;
			case "remote-missing":
				this.renderRemoteMissing(block.remotePath);
				break;
			case "mass-delete":
				this.renderMassDelete(block.deletions);
				break;
		}
	}

	onClose(): void {
		this.stopCountdown();
		this.contentEl.empty();
	}

	private renderStorage(): void {
		this.paragraph(t("pause.storage.what"));
		this.paragraph(this.untouched());
		this.paragraph(t("pause.storage.todo"));
		this.buttons([{ text: t("pause.checkAgain"), cls: "mod-cta", onClick: () => this.actions.recheck() }]);
	}

	private renderStaleList(paths: string[]): void {
		this.paragraph(t("pause.staleList.what"));
		this.paragraph(this.untouched());
		this.paragraph(t("pause.staleList.todo"));
		this.list(paths);
		this.buttons([{ text: t("pause.checkAgain"), cls: "mod-cta", onClick: () => this.actions.recheck() }]);
	}

	private renderRemoteMissing(remotePath: string): void {
		this.paragraph(t("pause.remoteMissing.what", { path: remotePath }));
		this.paragraph(t("pause.remoteMissing.todo"));
		this.buttons([
			{ text: t("pause.checkAgain"), cls: "mod-cta", onClick: () => this.actions.recheck() },
			{ text: t("pause.startOver"), onClick: () => this.actions.startOver() },
		]);
	}

	private renderMassDelete(deletions: MassDeletion[]): void {
		for (const deletion of deletions) {
			this.paragraph(
				deletion.side === "local"
					? t("pause.mass.local", countVars(deletion))
					: t("pause.mass.remote", countVars(deletion)),
			);
			this.list(deletion.paths);
		}

		if (this.approvedEarlier > 0) {
			this.paragraph(t("pause.mass.approvedEarlier", { count: formatCount(this.approvedEarlier) }));
		}
		this.paragraph(t("pause.mass.nothingYet"));

		let deleteText = t("pause.mass.applyAll");
		if (deletions.length === 1) {
			deleteText = deletions[0].side === "local" ? t("pause.mass.deleteRemote") : t("pause.mass.deleteLocal");
		}

		this.buttons([
			{ text: t("pause.mass.restore"), cls: "mod-cta", onClick: () => this.actions.restore(deletions) },
			{
				text: deleteText,
				cls: "mod-warning",
				delay: CONFIRM_DELAY_S,
				onClick: () => this.actions.approve(deletions),
			},
			{ text: t("pause.keepPaused"), onClick: () => undefined },
		]);
	}

	private untouched(): string {
		return this.partial ? t("pause.partial") : t("pause.untouched");
	}

	private paragraph(text: string): void {
		this.contentEl.createEl("p", { text });
	}

	private list(paths: string[]): void {
		const listEl = this.contentEl.createDiv({ cls: "yadisk-pause-list" });
		for (const path of paths.slice(0, MAX_LISTED)) {
			listEl.createDiv({ text: path });
		}
		if (paths.length > MAX_LISTED) {
			listEl.createDiv({
				cls: "yadisk-pause-more",
				text: t("queue.more", { count: formatCount(paths.length - MAX_LISTED) }),
			});
		}
	}

	/** Every button closes the dialog first; what it does comes after. */
	private buttons(specs: ButtonSpec[]): void {
		const footer = this.contentEl.createDiv({ cls: "modal-button-container" });

		for (const spec of specs) {
			const btn = footer.createEl("button", { text: spec.text });
			if (spec.cls) btn.addClass(spec.cls);
			btn.addEventListener("click", () => {
				if (btn.disabled) return;
				this.close();
				spec.onClick();
			});
			if (spec.delay) this.startCountdown(btn, spec.text, spec.delay);
		}
	}

	private startCountdown(btn: HTMLButtonElement, text: string, seconds: number): void {
		let left = seconds;
		btn.disabled = true;
		btn.setText(`${text} (${left})`);

		this.countdownTimer = window.setInterval(() => {
			left--;
			if (left > 0) {
				btn.setText(`${text} (${left})`);
				return;
			}
			this.stopCountdown();
			btn.disabled = false;
			btn.setText(text);
		}, 1000);
	}

	private stopCountdown(): void {
		if (this.countdownTimer !== null) {
			window.clearInterval(this.countdownTimer);
			this.countdownTimer = null;
		}
	}
}

function countVars(deletion: MassDeletion): { count: string; total: string } {
	return { count: formatCount(deletion.paths.length), total: formatCount(deletion.tracked) };
}

function formatCount(n: number): string {
	return n.toLocaleString();
}
