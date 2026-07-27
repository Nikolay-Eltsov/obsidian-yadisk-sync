import { Notice } from "obsidian";
import { ProgressDisplay, PROGRESS_DELAY_MS } from "./types";

/**
 * Minimum gap between DOM writes. Progress is reported per file, which on a
 * large vault means thousands of calls; without this the notice would repaint
 * far more often than anyone can read.
 */
const RENDER_INTERVAL_MS = 250;

/**
 * Progress indicator built on a zero-duration Notice.
 *
 * The status bar (`Plugin.addStatusBarItem`) does not exist on mobile, so it
 * cannot be the only channel: on a phone a multi-minute sync would otherwise
 * show nothing at all until it finished.
 *
 * By default it waits before appearing. Most syncs carry a single edited note
 * and are over in a couple of seconds — announcing those turns a background
 * task into an interruption. What is worth reporting is a sync long enough
 * that the user would otherwise wonder whether anything is happening.
 */
export class SyncProgress {
	private notice: Notice | null = null;
	private textEl: HTMLElement | null = null;
	private appearTimer: number | null = null;
	private label = "";
	private lastRenderAt = 0;
	private lastText = "Starting sync…";

	constructor(
		private onCancel: () => void,
		private display: ProgressDisplay = ProgressDisplay.Delayed,
	) {}

	start(): void {
		if (this.display === ProgressDisplay.Never) return;

		if (this.display === ProgressDisplay.Always) {
			this.show();
			return;
		}

		this.appearTimer = window.setTimeout(() => {
			this.appearTimer = null;
			this.show();
		}, PROGRESS_DELAY_MS);
	}

	/** Starts a new phase. Repaints if the indicator is already visible. */
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

	/**
	 * Shows the indicator on request, whatever the setting says.
	 *
	 * Used when the user asks what the sync is doing — either by tapping the
	 * ribbon mid-sync or through the command — including after dismissing the
	 * notice, which a tap anywhere on it does.
	 */
	reopen(): void {
		this.clearTimer();
		if (this.notice) this.notice.hide();
		this.notice = null;
		this.textEl = null;
		this.show();
	}

	close(): void {
		this.clearTimer();
		if (this.notice) this.notice.hide();
		this.notice = null;
		this.textEl = null;
	}

	private show(): void {
		if (this.notice) return;

		const frag = createFragment((el) => {
			const wrapper = el.createDiv({ cls: "yadisk-progress" });
			this.textEl = wrapper.createDiv({
				cls: "yadisk-progress-text",
				text: this.lastText,
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

	private clearTimer(): void {
		if (this.appearTimer !== null) {
			window.clearTimeout(this.appearTimer);
			this.appearTimer = null;
		}
	}

	private render(text: string): void {
		this.lastRenderAt = Date.now();
		// Recorded even while hidden, so a late-appearing indicator opens on the
		// current state rather than on "Starting sync…".
		this.lastText = text;
		if (this.textEl) this.textEl.setText(text);
	}
}
