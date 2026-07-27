import { Notice } from "obsidian";

/**
 * Minimum gap between DOM writes. Progress is reported per file, which on a
 * large vault means thousands of calls; without this the notice would repaint
 * far more often than anyone can read.
 */
const RENDER_INTERVAL_MS = 250;

/**
 * Long-lived progress indicator built on a zero-duration Notice.
 *
 * The status bar (`Plugin.addStatusBarItem`) does not exist on mobile, so it
 * cannot be the only channel: on a phone a multi-minute sync would otherwise
 * show nothing at all until it finished.
 */
export class SyncProgress {
	private notice: Notice | null = null;
	private textEl: HTMLElement | null = null;
	private label = "";
	private lastRenderAt = 0;

	constructor(private onCancel: () => void) {}

	open(): void {
		if (this.notice) return;

		const frag = createFragment((el) => {
			const wrapper = el.createDiv({ cls: "yadisk-progress" });
			this.textEl = wrapper.createDiv({
				cls: "yadisk-progress-text",
				text: "Starting sync…",
			});
			const cancelBtn = wrapper.createEl("button", {
				cls: "yadisk-progress-cancel",
				text: "Cancel",
			});
			cancelBtn.addEventListener("click", (evt) => {
				// Clicking anywhere on a Notice dismisses it; keep it up so the
				// user can watch the sync wind down.
				evt.preventDefault();
				evt.stopPropagation();
				this.onCancel();
			});
		});

		this.notice = new Notice(frag, 0);
	}

	/** Starts a new phase and repaints immediately. */
	phase(label: string): void {
		this.label = label;
		this.render(label);
	}

	/** Per-item update. Cheap to call in a tight loop. */
	tick(current: number, total?: number): void {
		if (Date.now() - this.lastRenderAt < RENDER_INTERVAL_MS) return;
		this.render(
			total !== undefined ? `${this.label} ${current}/${total}` : `${this.label} ${current}`,
		);
	}

	/** Replaces the whole line, ignoring the throttle. */
	message(text: string): void {
		this.render(text);
	}

	private render(text: string): void {
		this.lastRenderAt = Date.now();
		if (this.textEl) this.textEl.setText(text);
	}

	close(): void {
		if (this.notice) this.notice.hide();
		this.notice = null;
		this.textEl = null;
	}
}
