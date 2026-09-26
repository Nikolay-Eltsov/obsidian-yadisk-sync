import { ItemView, WorkspaceLeaf, setIcon } from "obsidian";
import { t, MessageKey } from "./i18n";
import { LocalChangeKind, QUEUE_HISTORY_LIMIT, QueueEntry } from "./queue";
import { SYNC_ICON } from "./icon";
import { renderRemaining } from "./remaining";
import { SyncAction } from "./types";
import type YaDiskSyncPlugin from "./main";

export const QUEUE_VIEW_TYPE = "yadisk-sync-queue";
/** Shared with the ribbon button, which opens this view. */
export const QUEUE_VIEW_ICON = SYNC_ICON;

/** Rows an opened group shows before the rest is summed up in one line. */
const PENDING_SHOWN = 50;

/**
 * Minimum gap between redraws. The queue changes once per file started and
 * once per file finished, which on a large sync is far more often than
 * anyone can read.
 */
const RENDER_INTERVAL_MS = 250;

const ACTION_ICONS: Record<SyncAction, string> = {
	[SyncAction.UploadNew]: "upload",
	[SyncAction.UploadModified]: "upload",
	[SyncAction.DownloadNew]: "download",
	[SyncAction.DownloadModified]: "download",
	[SyncAction.DeleteRemote]: "cloud-off",
	[SyncAction.DeleteLocal]: "trash-2",
	[SyncAction.Conflict]: "git-compare",
	[SyncAction.Skip]: "minus",
};

const GROUP_LABELS: Partial<Record<SyncAction, MessageKey>> = {
	[SyncAction.UploadNew]: "queue.group.uploadNew",
	[SyncAction.UploadModified]: "queue.group.uploadModified",
	[SyncAction.DownloadNew]: "queue.group.downloadNew",
	[SyncAction.DownloadModified]: "queue.group.downloadModified",
	[SyncAction.DeleteRemote]: "queue.group.deleteRemote",
	[SyncAction.DeleteLocal]: "queue.group.deleteLocal",
};

const LOCAL_ICONS: Record<LocalChangeKind, string> = {
	created: "file-plus",
	modified: "pencil",
	deleted: "trash-2",
	renamed: "arrow-right-left",
};

const LOCAL_LABELS: Record<LocalChangeKind, MessageKey> = {
	created: "queue.local.created",
	modified: "queue.local.modified",
	deleted: "queue.local.deleted",
	renamed: "queue.local.renamed",
};

const ACTION_LABELS: Record<SyncAction, MessageKey> = {
	[SyncAction.UploadNew]: "queue.action.upload",
	[SyncAction.UploadModified]: "queue.action.upload",
	[SyncAction.DownloadNew]: "queue.action.download",
	[SyncAction.DownloadModified]: "queue.action.download",
	[SyncAction.DeleteRemote]: "queue.action.deleteRemote",
	[SyncAction.DeleteLocal]: "queue.action.deleteLocal",
	[SyncAction.Conflict]: "queue.action.conflict",
	[SyncAction.Skip]: "queue.action.skip",
};

/** Sidebar view of what the sync is moving now, what comes next, and what it has done. */
export class QueueView extends ItemView {
	private unsubscribe: (() => void) | null = null;
	private renderTimer: number | null = null;
	private lastRenderAt = 0;
	/** Groups of waiting files, and the history, the user opened; all start closed. */
	private openGroups = new Set<string>();
	/** Held while a press is under way, so a redraw cannot swallow the click. */
	private pressed = false;

	constructor(leaf: WorkspaceLeaf, private plugin: YaDiskSyncPlugin) {
		super(leaf);
	}

	getViewType(): string {
		return QUEUE_VIEW_TYPE;
	}

	getDisplayText(): string {
		return t("queue.title");
	}

	getIcon(): string {
		return QUEUE_VIEW_ICON;
	}

	async onOpen(): Promise<void> {
		this.contentEl.addClass("yadisk-queue");
		this.unsubscribe = this.plugin.queue.subscribe(() => this.scheduleRender());
		// The countdown to the next check moves with no change to the queue.
		this.registerInterval(window.setInterval(() => this.scheduleRender(), 1000));
		this.registerDomEvent(this.contentEl, "pointerdown", () => {
			this.pressed = true;
		});
		const release = () => {
			this.pressed = false;
		};
		this.registerDomEvent(window, "pointerup", release);
		this.registerDomEvent(window, "pointercancel", release);
		this.render();
	}

	async onClose(): Promise<void> {
		this.unsubscribe?.();
		this.unsubscribe = null;
		if (this.renderTimer !== null) window.clearTimeout(this.renderTimer);
		this.renderTimer = null;
	}

	private scheduleRender(): void {
		if (this.renderTimer !== null) return;
		const wait = Math.max(0, RENDER_INTERVAL_MS - (Date.now() - this.lastRenderAt));
		this.renderTimer = window.setTimeout(() => {
			this.renderTimer = null;
			// Redrawn between press and release, the element pressed is gone
			// and the click never arrives.
			if (this.pressed) {
				this.scheduleRender();
				return;
			}
			this.render();
		}, wait);
	}

	private render(): void {
		this.lastRenderAt = Date.now();
		const queue = this.plugin.queue;
		const el = this.contentEl;
		// Everything is redrawn; without this the list jumps back to the top
		// several times a second.
		const scrollTop = el.scrollTop;
		el.empty();

		const header = el.createDiv({ cls: "yadisk-queue-header" });
		const status = header.createDiv({ cls: "yadisk-queue-status" });
		if (queue.stage === "scanning") {
			status.setText(t("queue.scanning"));
		} else if (queue.stage === "transferring") {
			const total = queue.entries.length;
			status.setText(t("queue.progress", { done: queue.finishedCount(), total }));
		} else if (queue.paused) {
			status.setText(t("queue.paused"));
		} else {
			status.setText(t("queue.idle"));
		}
		if (queue.stage !== "idle" && queue.detail) {
			status.createDiv({ cls: "yadisk-queue-note", text: queue.detail });
		}
		if (queue.stage !== "idle" && queue.lastError) {
			status.createDiv({ cls: "yadisk-queue-error", text: queue.lastError });
		}
		renderRemaining(status.createDiv(), queue);
		if (queue.nextCheckAt !== null && !queue.paused) {
			const seconds = Math.max(0, Math.ceil((queue.nextCheckAt - Date.now()) / 1000));
			status.createDiv({ cls: "yadisk-queue-note", text: t("queue.nextCheck", { seconds }) });
		}

		if (queue.stage !== "idle") {
			header.createEl("button", { text: t("queue.cancel") }).addEventListener("click", () => {
				this.plugin.abortSync();
			});
		} else if (queue.paused) {
			header.createEl("button", { text: t("queue.review"), cls: "mod-warning" }).addEventListener("click", () => {
				this.plugin.openPauseReview();
			});
		} else {
			header.createEl("button", { text: t("queue.syncNow"), cls: "mod-cta" }).addEventListener("click", () => {
				this.plugin.syncNow();
			});
		}

		const active = queue.active();
		if (active.length > 0) {
			this.section(el, t("queue.now", { count: active.length }), (list) => {
				for (const entry of active) this.row(list, entry);
			});
		}

		const pendingCount = queue.pendingCount();
		if (pendingCount > 0) {
			this.section(el, t("queue.next", { count: pendingCount }), (list) => {
				for (const { action, count } of queue.pendingGroups()) this.group(list, action, count);
			});
		}

		if (queue.history.length > 0) {
			const history = this.collapsible(el, "history", "yadisk-queue-section");
			const summary = history.summary.createDiv({ cls: "yadisk-queue-section-title" });
			// Once full the count stops moving, which read as the sync hanging.
			const title =
				queue.history.length >= QUEUE_HISTORY_LIMIT
					? t("queue.historyLatest", { count: QUEUE_HISTORY_LIMIT })
					: t("queue.historyCount", { count: queue.history.length });
			summary.createSpan({ text: title });
			const failed = queue.history.filter((entry) => entry.status === "failed").length;
			if (failed > 0) summary.createSpan({ cls: "yadisk-queue-error", text: ` · ${t("queue.failedCount", { count: failed })}` });
			if (history.open) {
				const list = history.details.createDiv({ cls: "yadisk-queue-list" });
				for (const entry of queue.history) this.row(list, entry, true);
			}
		}

		el.scrollTop = scrollTop;
	}

	/** One kind of waiting file: a line with the count, the files once opened. */
	private group(list: HTMLElement, action: SyncAction, count: number): void {
		const { details, summary, open } = this.collapsible(list, action, "yadisk-queue-group");
		summary.addClass("yadisk-queue-group-summary");
		setIcon(summary.createSpan({ cls: "yadisk-queue-icon" }), ACTION_ICONS[action]);
		const labelKey = GROUP_LABELS[action];
		summary.createSpan({ cls: "yadisk-queue-group-label", text: labelKey ? t(labelKey) : action });
		summary.createSpan({ cls: "yadisk-queue-group-count", text: String(count) });

		// Closed groups stay empty: a large sync has thousands of rows to build.
		if (!open) return;
		const files = details.createDiv({ cls: "yadisk-queue-list" });
		// Changes made here first: they are the ones someone opens this to find.
		const local = (this.plugin.queue.localByAction().get(action) ?? []).slice(0, PENDING_SHOWN);
		for (const { path, kind } of local) this.localRow(files, path, kind);
		for (const entry of this.plugin.queue.pending(PENDING_SHOWN - local.length, action)) this.row(files, entry);
		if (count > PENDING_SHOWN) {
			files.createDiv({ cls: "yadisk-queue-more", text: t("queue.more", { count: count - PENDING_SHOWN }) });
		}
	}

	/**
	 * A block that opens on a tap and stays as the user left it across
	 * redraws. Its contents are for the caller to add, and only when open.
	 */
	private collapsible(
		parent: HTMLElement,
		key: string,
		cls: string,
	): { details: HTMLDetailsElement; summary: HTMLElement; open: boolean } {
		const details = parent.createEl("details", { cls: `yadisk-queue-collapsible ${cls}` });
		const open = this.openGroups.has(key);
		details.open = open;
		details.addEventListener("toggle", () => {
			if (details.open) this.openGroups.add(key);
			else this.openGroups.delete(key);
			// Opened now, filled now: waiting for the next change could take a while.
			if (details.open && details.childElementCount === 1) this.scheduleRender();
		});
		const summary = details.createEl("summary", { cls: "yadisk-queue-summary" });
		return { details, summary, open };
	}

	private section(parent: HTMLElement, title: string, fill: (list: HTMLElement) => void): void {
		const section = parent.createDiv({ cls: "yadisk-queue-section" });
		section.createDiv({ cls: "yadisk-queue-section-title", text: title });
		fill(section.createDiv({ cls: "yadisk-queue-list" }));
	}

	/** A file changed here, not yet picked up by a sync. */
	private localRow(list: HTMLElement, path: string, kind: LocalChangeKind): void {
		const row = list.createDiv({ cls: "yadisk-queue-row is-pending" });
		row.setAttr("title", path);
		setIcon(row.createSpan({ cls: "yadisk-queue-icon" }), LOCAL_ICONS[kind]);
		const slash = path.lastIndexOf("/");
		const body = row.createDiv({ cls: "yadisk-queue-body" });
		body.createDiv({ cls: "yadisk-queue-name", text: path.slice(slash + 1) });
		const details = [t(LOCAL_LABELS[kind])];
		if (slash > 0) details.push(path.slice(0, slash));
		body.createDiv({ cls: "yadisk-queue-detail", text: details.join(" · ") });
	}

	/** A file as its name, with its folder and anything else in small print below. */
	private row(list: HTMLElement, entry: QueueEntry, withTime = false): void {
		const row = list.createDiv({ cls: `yadisk-queue-row is-${entry.status}` });
		row.setAttr("title", `${t(ACTION_LABELS[entry.action])}: ${entry.path}`);
		const icon = row.createSpan({ cls: "yadisk-queue-icon" });
		setIcon(icon, entry.status === "failed" ? "alert-circle" : ACTION_ICONS[entry.action]);

		const slash = entry.path.lastIndexOf("/");
		const body = row.createDiv({ cls: "yadisk-queue-body" });
		body.createDiv({ cls: "yadisk-queue-name", text: entry.path.slice(slash + 1) });
		const details: string[] = [];
		if (slash > 0) details.push(entry.path.slice(0, slash));
		if (withTime && entry.finishedAt !== undefined) details.push(new Date(entry.finishedAt).toLocaleTimeString());
		if (details.length > 0) body.createDiv({ cls: "yadisk-queue-detail", text: details.join(" · ") });
		if (entry.error) body.createDiv({ cls: "yadisk-queue-error", text: entry.error });
	}
}
