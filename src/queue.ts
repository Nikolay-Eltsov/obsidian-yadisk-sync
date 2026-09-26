import { SyncAction, SyncPlanItem } from "./types";

/** The order groups of waiting files are listed in. */
export const QUEUE_GROUP_ORDER: SyncAction[] = [
	SyncAction.UploadNew,
	SyncAction.UploadModified,
	SyncAction.DownloadNew,
	SyncAction.DownloadModified,
	SyncAction.DeleteRemote,
	SyncAction.DeleteLocal,
];

/** What happened to a file here that is waiting to be sent. */
export type LocalChangeKind = "created" | "modified" | "deleted" | "renamed";

/** Where a change made here lands in the queue: what sending it will do. */
export const LOCAL_CHANGE_ACTIONS: Record<LocalChangeKind, SyncAction> = {
	created: SyncAction.UploadNew,
	modified: SyncAction.UploadModified,
	// A rename reaches Yandex Disk as the file under its new name.
	renamed: SyncAction.UploadNew,
	deleted: SyncAction.DeleteRemote,
};

export type RemainingKind = "upload" | "download" | "deleteRemote" | "deleteLocal";

const REMAINING_ORDER: RemainingKind[] = ["upload", "download", "deleteRemote", "deleteLocal"];

const REMAINING_KINDS: Partial<Record<SyncAction, RemainingKind>> = {
	[SyncAction.UploadNew]: "upload",
	[SyncAction.UploadModified]: "upload",
	[SyncAction.DownloadNew]: "download",
	[SyncAction.DownloadModified]: "download",
	[SyncAction.DeleteRemote]: "deleteRemote",
	[SyncAction.DeleteLocal]: "deleteLocal",
};

/** How many finished files the queue remembers, across runs. */
export const QUEUE_HISTORY_LIMIT = 100;

export type QueueStage = "idle" | "scanning" | "transferring";

export interface QueueEntry {
	path: string;
	action: SyncAction;
	status: "pending" | "active" | "done" | "failed";
	error?: string;
	finishedAt?: number;
}

/** What the engine tells the queue as it works through a plan. */
export interface QueueListener {
	/** The whole run, in the order the items will start. */
	planned(items: SyncPlanItem[]): void;
	/** A file changed here mid-run, sent ahead of the rest; started next. */
	expedited(item: SyncPlanItem): void;
	started(item: SyncPlanItem): void;
	finished(item: SyncPlanItem, error?: string): void;
}

/**
 * What the sync is doing and what it will do next, for the queue view.
 *
 * Kept apart from the view so it can be fed while no view is open, and so
 * a view opened mid-sync starts from the current state. Observers are told
 * on every change; drawing is theirs to throttle.
 */
export class SyncQueue implements QueueListener {
	stage: QueueStage = "idle";
	/** The current run's items in start order. Emptied when the run ends. */
	entries: QueueEntry[] = [];
	/** Finished items, newest first. */
	history: QueueEntry[] = [];
	/** Files changed here and not yet taken by a run, newest last. */
	localChanges = new Map<string, LocalChangeKind>();
	/** When the next auto-sync check is due; null with auto-sync off. */
	nextCheckAt: number | null = null;
	/** What the running sync is doing, as the progress indicator says it. */
	detail = "";
	/** The last failure of the running sync, as the indicator says it. */
	lastError = "";
	paused = false;

	private byPath = new Map<string, QueueEntry>();
	/** Entries before this index have all started. */
	private firstPending = 0;
	private startedCount = 0;
	private pendingPerAction = new Map<SyncAction, number>();
	private finishedTotal = 0;
	private listeners = new Set<() => void>();

	subscribe(listener: () => void): () => void {
		this.listeners.add(listener);
		return () => this.listeners.delete(listener);
	}

	notify(): void {
		for (const listener of this.listeners) listener();
	}

	noteLocalChange(path: string, kind: LocalChangeKind, oldPath?: string): void {
		if (oldPath !== undefined) this.localChanges.delete(oldPath);
		const earlier = this.localChanges.get(path);
		this.localChanges.delete(path);
		// A file made and then edited before it was sent is still a new file.
		this.localChanges.set(path, earlier === "created" && kind === "modified" ? "created" : kind);
		this.notify();
	}

	/** Hands over the waiting files to the run about to carry them. */
	takeLocalChanges(): Map<string, LocalChangeKind> {
		const taken = this.localChanges;
		this.localChanges = new Map();
		this.notify();
		return taken;
	}

	/** Puts back files a run did not get through; later changes win. */
	restoreLocalChanges(changes: Map<string, LocalChangeKind>): void {
		const merged = new Map(changes);
		for (const [path, kind] of this.localChanges) {
			merged.delete(path);
			merged.set(path, kind);
		}
		this.localChanges = merged;
		this.notify();
	}

	setDetail(detail: string, lastError: string): void {
		if (detail === this.detail && lastError === this.lastError) return;
		this.detail = detail;
		this.lastError = lastError;
		this.notify();
	}

	begin(): void {
		this.detail = "";
		this.lastError = "";
		this.stage = "scanning";
		this.entries = [];
		this.byPath.clear();
		this.pendingPerAction.clear();
		this.firstPending = 0;
		this.startedCount = 0;
		this.finishedTotal = 0;
		this.notify();
	}

	planned(items: SyncPlanItem[]): void {
		this.stage = "transferring";
		this.entries = items.map((item) => ({ path: item.path, action: item.action, status: "pending" }));
		this.byPath = new Map(this.entries.map((entry) => [entry.path, entry]));
		this.pendingPerAction.clear();
		for (const entry of this.entries) {
			this.pendingPerAction.set(entry.action, (this.pendingPerAction.get(entry.action) ?? 0) + 1);
		}
		this.firstPending = 0;
		this.startedCount = 0;
		this.finishedTotal = 0;
		this.notify();
	}

	expedited(item: SyncPlanItem): void {
		// Taken by this run after all: no longer waiting for the next one.
		this.localChanges.delete(item.path);
		const existing = this.byPath.get(item.path);
		if (existing?.status === "pending") {
			this.notify();
			return;
		}
		// Sent earlier in this run, or not part of it at all: a new line.
		const entry: QueueEntry = { path: item.path, action: item.action, status: "pending" };
		this.entries.push(entry);
		this.byPath.set(item.path, entry);
		this.pendingPerAction.set(entry.action, (this.pendingPerAction.get(entry.action) ?? 0) + 1);
		this.notify();
	}

	started(item: SyncPlanItem): void {
		const entry = this.byPath.get(item.path);
		if (!entry || entry.status !== "pending") return;
		entry.status = "active";
		this.startedCount++;
		this.pendingPerAction.set(entry.action, (this.pendingPerAction.get(entry.action) ?? 1) - 1);
		this.notify();
	}

	finished(item: SyncPlanItem, error?: string): void {
		const entry = this.byPath.get(item.path);
		if (!entry || entry.status !== "active") return;
		this.finishedTotal++;
		entry.status = error === undefined ? "done" : "failed";
		entry.error = error;
		entry.finishedAt = Date.now();
		this.history.unshift({ ...entry });
		if (this.history.length > QUEUE_HISTORY_LIMIT) this.history.length = QUEUE_HISTORY_LIMIT;
		this.notify();
	}

	/** Items not finished when a run stops are dropped: the next run plans afresh. */
	end(): void {
		this.detail = "";
		this.lastError = "";
		this.stage = "idle";
		this.entries = [];
		this.byPath.clear();
		this.pendingPerAction.clear();
		this.firstPending = 0;
		this.startedCount = 0;
		this.finishedTotal = 0;
		this.notify();
	}

	active(): QueueEntry[] {
		return this.entries.filter((entry) => entry.status === "active");
	}

	/**
	 * How many files of each kind are still waiting, in QUEUE_GROUP_ORDER:
	 * the run's own and those changed here since.
	 */
	pendingGroups(): { action: SyncAction; count: number }[] {
		const local = this.localByAction();
		return QUEUE_GROUP_ORDER.map((action) => ({
			action,
			count: (this.pendingPerAction.get(action) ?? 0) + (local.get(action)?.length ?? 0),
		})).filter((group) => group.count > 0);
	}

	/**
	 * What is left, in four kinds — new and changed files counted together —
	 * for a line short enough for the status bar. Kinds with nothing left
	 * are left out.
	 */
	remaining(): { kind: RemainingKind; count: number }[] {
		const counts = new Map<RemainingKind, number>();
		for (const { action, count } of this.pendingGroups()) {
			const kind = REMAINING_KINDS[action];
			if (kind) counts.set(kind, (counts.get(kind) ?? 0) + count);
		}
		return REMAINING_ORDER.filter((kind) => counts.has(kind)).map((kind) => ({ kind, count: counts.get(kind) ?? 0 }));
	}

	/**
	 * Files changed here that no run has taken yet, newest first, by what
	 * sending them will do. A file the running sync is about to send anyway
	 * is shown once, as the sync's.
	 */
	localByAction(): Map<SyncAction, { path: string; kind: LocalChangeKind }[]> {
		const result = new Map<SyncAction, { path: string; kind: LocalChangeKind }[]>();
		for (const [path, kind] of [...this.localChanges].reverse()) {
			if (this.byPath.get(path)?.status === "pending") continue;
			const action = LOCAL_CHANGE_ACTIONS[kind];
			const list = result.get(action) ?? [];
			list.push({ path, kind });
			result.set(action, list);
		}
		return result;
	}

	/**
	 * Up to `limit` items not yet started, in the order they will start;
	 * only those of `action` if given.
	 */
	pending(limit: number, action?: SyncAction): QueueEntry[] {
		// Items start in plan order, so everything before the first pending
		// one has started; skipping it keeps a large run from being walked
		// in full on every redraw.
		while (this.firstPending < this.entries.length && this.entries[this.firstPending].status !== "pending") {
			this.firstPending++;
		}
		const result: QueueEntry[] = [];
		for (let i = this.firstPending; i < this.entries.length && result.length < limit; i++) {
			const entry = this.entries[i];
			if (entry.status === "pending" && (action === undefined || entry.action === action)) result.push(entry);
		}
		return result;
	}

	/** Everything still to go: the run's own files and those changed here since. */
	pendingCount(): number {
		let local = 0;
		for (const list of this.localByAction().values()) local += list.length;
		return this.entries.length - this.startedCount + local;
	}

	finishedCount(): number {
		return this.finishedTotal;
	}
}
