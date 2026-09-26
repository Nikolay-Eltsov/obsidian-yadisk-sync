import { App, TFile } from "obsidian";
import {
	YaDiskSyncSettings,
	FileRecord,
	SyncPlanItem,
	SyncAction,
	SyncDirection,
	ConflictStrategy,
	ConflictResolution,
	ApprovedDeletions,
	SyncBlock,
} from "./types";
import { YandexDiskClient, describeError } from "./yandex-client";
import { ScanResult, SyncStateManager } from "./sync-state";
import { ConflictModal } from "./conflict-modal";
import type { QueueListener } from "./queue";
import { DeletionGuard, findMassDeletions, restoreDeleted, settleUnfinished } from "./safety";
import { t } from "./i18n";
import { md5 } from "./md5";
import { normalizeRemotePath, pathDepth, resolveWithin, runPool, yieldToUi } from "./utils";

/** Paths to classify before handing the main thread back to the UI. */
const PLAN_CHUNK = 500;

/** Minimum gap between writes of the sync state to disk. */
const CHECKPOINT_INTERVAL_MS = 15000;

/**
 * Files looked up on disk before a sync that would delete them remotely.
 * Enough to tell a stale file list from real deletions; each of the rest is
 * looked up again just before it is deleted.
 */
const DISK_CHECK_LIMIT = 200;

/** How long one disk lookup may take before the file counts as unaccounted for. */
const DISK_CHECK_TIMEOUT_MS = 5000;

/**
 * Transfers failing one after another before a sync gives up. By then the
 * fault is not with a file but with all of them — a wrong folder, a lost
 * connection — and working through the rest only buries it under errors.
 */
export const FAILURE_STREAK_LIMIT = 20;

export interface SyncStats {
	uploaded: number;
	downloaded: number;
	deleted: number;
	errors: number;
	/** The most recent failure, to tell the user what went wrong and where. */
	lastError?: { path: string; message: string };
	/** Stopped after FAILURE_STREAK_LIMIT transfers failed in a row. */
	gaveUp?: boolean;
	/** Changes held back because the local file changed mid-sync. */
	skipped: number;
	aborted: boolean;
	/**
	 * Why the sync stopped itself. Nothing was changed if it came up before
	 * the first transfer; otherwise the work done up to then is kept.
	 */
	blocked?: SyncBlock;
}

/** Narrow view of the progress UI, so the engine does not depend on Notice. */
export interface SyncReporter {
	phase(label: string): void;
	tick(current: number, total?: number): void;
	message(text: string): void;
	/** A transfer failed; `failed` is how many have so far in this run. */
	failure(failed: number, path: string, message: string): void;
}

export interface SyncHooks {
	reporter?: SyncReporter;
	/** Told which files the run will move, and as each one starts and ends. */
	queue?: QueueListener;
	/** Persists the current snapshots so an interrupted sync is not wasted. */
	checkpoint?: () => Promise<void>;
	/**
	 * Set when the disk revision proves nothing on the remote has moved since
	 * the stored snapshot was taken. Lets a sync caused by a local edit skip
	 * the remote walk entirely, which is otherwise the whole cost of the run.
	 */
	remoteUnchanged?: boolean;
	/**
	 * Reads every file in the vault again instead of trusting the hashes of
	 * those whose size and time have not changed. Part of a full sync, the one
	 * that takes nothing it saved on trust.
	 */
	rehashLocal?: boolean;
	/**
	 * Called once the size of the run is known, before any transfer starts.
	 * Lets the caller decide whether this run is worth holding the screen on
	 * for — on iOS a locked screen suspends the app and freezes the sync.
	 */
	onPlanReady?: (total: number) => void;
	/**
	 * Reports a vault path the sync is about to write or remove. Lets the
	 * caller tell its own writes apart from the user's edits, which arrive
	 * as the same vault events. Called before the write, since Obsidian may
	 * send the event before the write returns.
	 */
	onFileWritten?: (path: string) => void;
	/**
	 * Confirms the vault's own storage is still there to read. Obsidian keeps
	 * its file list in memory, and when the drive holding the vault goes
	 * away, files drop out of that list exactly as if they had been deleted.
	 */
	checkStorage?: () => Promise<boolean>;
	/** Deletions the user reviewed and allowed despite their number. */
	approvedDeletions?: ApprovedDeletions;
	/** Paths whose deletion the user chose to undo instead. */
	restorePaths?: ReadonlySet<string>;
}

/** The parts of an executing run the urgent lane works with. */
interface LiveRun {
	planByPath: Map<string, SyncPlanItem>;
	completed: Set<string>;
	stats: SyncStats;
	localSnapshot: Record<string, FileRecord>;
	remoteSnapshot: Record<string, FileRecord>;
	hooks: SyncHooks;
	direction: SyncDirection;
}

export class SyncEngine {
	private aborted = false;
	/** Set when the run stops itself mid-way for safety; reported as `blocked`. */
	private halt: SyncBlock | null = null;
	/** The remote folder this run belongs to, fixed when it starts. */
	private remotePath = "";
	/** Failures in a row, across all workers, since a transfer last went through. */
	private failureStreak = 0;
	private gaveUp = false;
	private lastCheckpointAt = 0;
	private checkpointInFlight = false;

	/** Files changed here mid-run, to be sent ahead of the rest. */
	private urgent = new Set<string>();
	/** Taken by the urgent lane; the plan's own item for them is passed over. */
	private expedited = new Set<string>();
	/** Paths a transfer is working on right now, in either lane. */
	private inFlight = new Set<string>();
	/** What the urgent lane needs from the run; set only while it executes. */
	private live: LiveRun | null = null;

	constructor(
		private app: App,
		private client: YandexDiskClient,
		private stateManager: SyncStateManager,
		private settings: YaDiskSyncSettings,
	) {}

	abort(): void {
		this.aborted = true;
	}

	/**
	 * Asks for files changed here since the run started to be sent within it,
	 * ahead of whatever it has left. Without this an edit made during a first
	 * sync waits behind every download — which can be hours.
	 *
	 * Only what can go up safely is taken, and only once the run is
	 * transferring; anything else simply waits for the next run.
	 */
	expedite(paths: Iterable<string>): void {
		for (const path of paths) this.urgent.add(path);
	}

	async run(directionOverride?: SyncDirection, hooks: SyncHooks = {}): Promise<SyncStats> {
		this.aborted = false;
		this.halt = null;
		this.failureStreak = 0;
		this.gaveUp = false;
		this.lastCheckpointAt = Date.now();

		const direction = directionOverride || this.settings.syncDirection;
		// Read once: every listing, snapshot and checkpoint of this run belongs
		// to the folder it started against.
		const remotePath = normalizeRemotePath(this.settings.remotePath);
		this.remotePath = remotePath;
		const stats: SyncStats = {
			uploaded: 0,
			downloaded: 0,
			deleted: 0,
			errors: 0,
			skipped: 0,
			aborted: false,
		};
		const reporter = hooks.reporter;

		// Lets retry back-off inside the client wake up early on cancel.
		this.client.setAbortCheck(() => this.shouldStop());

		try {
			// A vault whose drive went away looks like a vault with nothing in
			// it. Better to know that before reading anything into it.
			if (!(await this.storageAvailable(hooks))) return this.blocked(stats, { kind: "storage" });

			// Phase 1: Scan
			const prevState = this.stateManager.getState();

			// Snapshots taken against another remote folder say nothing about
			// this one: judged by them, a new, empty folder reads as every file
			// deleted. Without them the run behaves as a first sync, which has
			// nothing to delete by.
			const sameRemote =
				prevState.remotePath === undefined ||
				normalizeRemotePath(prevState.remotePath) === remotePath;
			const basePrevLocal = sameRemote ? prevState.localSnapshot : {};
			const basePrevRemote = sameRemote ? prevState.remoteSnapshot : {};
			// An empty snapshot stands in for no listing: after a reset it would
			// read as an empty disk, and every file here would be sent again.
			const remoteUnchanged =
				sameRemote && hooks.remoteUnchanged && Object.keys(basePrevRemote).length > 0;

			if (reporter) reporter.phase(t("phase.scanning"));
			let vaultText = "";
			let diskText = "";
			const renderScan = () => {
				if (reporter) reporter.message(t("scan.line", { detail: `${vaultText}${diskText}` }));
			};

			const scanLocal = this.stateManager.buildLocalSnapshot(
				this.settings,
				// Serves only as a cache of hashes, whichever folder it came from.
				hooks.rehashLocal ? {} : prevState.localSnapshot,
				(done, total) => {
					vaultText = t("scan.vault", { done, total });
					renderScan();
				},
				() => this.aborted,
			);

			// The stored snapshot stands in for a listing here, so it goes
			// through the filters a listing would. A pattern added since would
			// otherwise drop its files from this side only, and they would read
			// as deleted.
			const scanRemote: Promise<ScanResult | null> = remoteUnchanged
				? Promise.resolve(this.stateManager.filterRecords(Object.values(basePrevRemote), this.settings))
				: this.stateManager.buildRemoteSnapshot(
						this.client,
						remotePath,
						this.settings,
						(dirs, files) => {
							diskText = ` · ${t("scan.disk", { dirs, files })}`;
							renderScan();
						},
					);

			if (remoteUnchanged) diskText = ` · ${t("scan.diskUnchanged")}`;

			const [localScan, remoteListing] = await Promise.all([scanLocal, scanRemote]);

			if (this.aborted) return this.finish(stats);

			// No remote folder only means "nothing uploaded yet" before the
			// first sync. After it, the folder was deleted, renamed or mistyped,
			// and reading that as every file deleted would empty this vault.
			if (remoteListing === null && Object.keys(basePrevRemote).length > 0) {
				return this.blocked(stats, { kind: "remote-missing", remotePath });
			}
			const remoteScan = remoteListing ?? { snapshot: {}, skipped: new Set<string>() };
			const localSnapshot = localScan.snapshot;
			const remoteSnapshot = remoteScan.snapshot;

			// Files left out by pattern or size take no part in the run at all.
			// Missing from one scan but not the other, they would read as
			// deleted — a note that outgrew the size limit, say, removed from
			// Yandex Disk and then from every other device.
			const outOfScope = new Set([...localScan.skipped, ...remoteScan.skipped]);
			const localPrev = withoutPaths(basePrevLocal, outOfScope);
			const remotePrev = withoutPaths(basePrevRemote, outOfScope);

			// Phase 2: Plan
			if (reporter) reporter.phase(t("phase.comparing"));
			let plan = await this.buildPlan(
				localSnapshot,
				remoteSnapshot,
				localPrev,
				remotePrev,
				direction,
			);

			if (this.aborted) return this.finish(stats);

			const stillOnDisk = await this.findStillOnDisk(plan);
			if (stillOnDisk.length > 0) {
				return this.blocked(stats, { kind: "stale-list", paths: stillOnDisk });
			}

			if (hooks.restorePaths) plan = restoreDeleted(plan, hooks.restorePaths);

			const guard: DeletionGuard = {
				threshold: this.settings.deleteConfirmThreshold,
				trackedLocal: Object.keys(localPrev).length,
				trackedRemote: Object.keys(remotePrev).length,
				approved: hooks.approvedDeletions,
			};

			// Checked ahead of conflicts too, so a side that vanished is
			// reported as that, not as a dialog full of conflicts about it.
			let massDeletions = findMassDeletions(plan, guard);
			if (massDeletions.length > 0) {
				return this.blocked(stats, { kind: "mass-delete", deletions: massDeletions });
			}

			const conflicts = plan.filter((p) => p.action === SyncAction.Conflict);
			if (conflicts.length > 0) {
				plan = await this.resolveConflicts(plan, conflicts);
			}

			if (this.aborted) return this.finish(stats);

			// Resolving a conflict can delete as well: "local wins" over a file
			// deleted here removes it there.
			massDeletions = findMassDeletions(plan, guard);
			if (massDeletions.length > 0) {
				return this.blocked(stats, { kind: "mass-delete", deletions: massDeletions });
			}

			// Phase 3: Execute
			const completed = new Set<string>();
			await this.executePlan(plan, completed, stats, localSnapshot, remoteSnapshot, hooks, direction);

			settleUnfinished(plan, completed, localSnapshot, remoteSnapshot);
			this.stateManager.setState({
				lastSyncTime: Date.now(),
				remotePath,
				localSnapshot,
				remoteSnapshot,
			});

			if (this.halt) stats.blocked = this.halt;
			return this.finish(stats);
		} finally {
			this.client.setAbortCheck(null);
		}
	}

	private finish(stats: SyncStats): SyncStats {
		stats.aborted = this.aborted;
		stats.gaveUp = this.gaveUp;
		return stats;
	}

	/** Ends a run that refused to go on. */
	private blocked(stats: SyncStats, block: SyncBlock): SyncStats {
		stats.blocked = block;
		return this.finish(stats);
	}

	private shouldStop(): boolean {
		return this.aborted || this.halt !== null || this.gaveUp;
	}

	private storageAvailable(hooks: SyncHooks): Promise<boolean> {
		return hooks.checkStorage ? hooks.checkStorage() : Promise.resolve(true);
	}

	/**
	 * Files Obsidian no longer lists that are on disk all the same — the sign
	 * of a file list gone stale. Obsidian does not re-read a vault whose drive
	 * was unplugged and plugged back in, so until it restarts, what it reports
	 * missing may not be missing at all.
	 *
	 * Only files the plan would act on for being missing here are looked up,
	 * and no more than DISK_CHECK_LIMIT of them: enough to tell, and each of
	 * the rest is looked up again right before it would be deleted.
	 */
	private async findStillOnDisk(plan: SyncPlanItem[]): Promise<string[]> {
		const found: string[] = [];
		let checked = 0;

		for (const item of plan) {
			const missingHere =
				item.action === SyncAction.DeleteRemote ||
				(item.action === SyncAction.Conflict && !item.localRecord);
			if (!missingHere) continue;
			// Still listed: merely left out of the scan, not missing.
			if (this.app.vault.getAbstractFileByPath(item.path)) continue;

			if (checked++ >= DISK_CHECK_LIMIT) break;
			if (await this.onDisk(item.path)) found.push(item.path);
		}

		return found;
	}

	/**
	 * Asks the disk itself, past Obsidian's list, whether a file is there.
	 * Case-sensitively, so a note renamed only in case is not still present;
	 * and a lookup that does not come back counts as present, since the file
	 * cannot then be shown to be gone.
	 */
	private async onDisk(path: string): Promise<boolean> {
		const exists = await resolveWithin(this.app.vault.adapter.exists(path, true), DISK_CHECK_TIMEOUT_MS);
		return exists !== false;
	}

	/**
	 * Last look before a file is removed from Yandex Disk for being gone here:
	 * it has to be missing from the disk itself, not only from Obsidian's
	 * list, and the disk has to still be there to say so.
	 */
	private async confirmGoneLocally(item: SyncPlanItem, stats: SyncStats, hooks: SyncHooks): Promise<boolean> {
		// Created again since the scan; the next sync weighs it afresh.
		if (this.app.vault.getAbstractFileByPath(item.path)) {
			stats.skipped++;
			return false;
		}

		if (await this.onDisk(item.path)) {
			this.halt ??= { kind: "stale-list", paths: [item.path] };
			return false;
		}

		// Absent from a disk that is itself gone proves nothing.
		if (!(await this.storageAvailable(hooks))) {
			this.halt ??= { kind: "storage" };
			return false;
		}

		return true;
	}

	/**
	 * Runs the plan in three passes — creates, then updates, then deletes —
	 * with a bounded number of transfers in flight inside each pass.
	 *
	 * A strictly sequential loop costs at least two round trips per file, which
	 * on a vault of this size runs for hours and never survives the app being
	 * backgrounded.
	 */
	private async executePlan(
		plan: SyncPlanItem[],
		completed: Set<string>,
		stats: SyncStats,
		localSnapshot: Record<string, FileRecord>,
		remoteSnapshot: Record<string, FileRecord>,
		hooks: SyncHooks,
		direction: SyncDirection,
	): Promise<void> {
		const actionItems = plan.filter((p) => p.action !== SyncAction.Skip);
		const total = actionItems.length;
		if (hooks.onPlanReady) hooks.onPlanReady(total);
		if (total === 0) return;

		// Uploads go first, and as their own phase.
		//
		// Mixed in with the downloads, a note just written on this device would
		// sit behind however many thousand files the remote happens to be
		// sending — hours, on a first sync. Work done here is the only work
		// that exists nowhere else yet, so it is the work worth doing first.
		const uploads = actionItems.filter(
			(i) => i.action === SyncAction.UploadNew || i.action === SyncAction.UploadModified,
		);
		const downloads = actionItems.filter(
			(i) => i.action === SyncAction.DownloadNew || i.action === SyncAction.DownloadModified,
		);
		const deletes = actionItems.filter(
			(i) => i.action === SyncAction.DeleteLocal || i.action === SyncAction.DeleteRemote,
		);

		// Sorting the items directly, rather than sorting paths and then looking
		// each one up again, keeps this O(n log n) instead of O(n²).
		uploads.sort(byDepthAsc);
		downloads.sort(byDepthAsc);
		deletes.sort(byDepthDesc);

		const reporter = hooks.reporter;
		const queue = hooks.queue;
		if (queue) queue.planned([...uploads, ...downloads, ...deletes]);

		this.live = {
			planByPath: new Map(plan.map((item) => [item.path, item])),
			completed,
			stats,
			localSnapshot,
			remoteSnapshot,
			hooks,
			direction,
		};

		const runPhase = async (label: string, items: SyncPlanItem[]) => {
			if (items.length === 0 || this.shouldStop()) return;

			// Minutes can pass between the scan and a later phase. A drive
			// pulled in the meantime must be neither written to nor believed.
			if (!(await this.storageAvailable(hooks))) {
				this.halt = { kind: "storage" };
				return;
			}

			if (reporter) reporter.phase(label);

			// Counted within the phase: "Uploading 1/2" says far more than the
			// same file's position among twenty thousand downloads.
			let done = 0;

			await runPool(
				items,
				this.settings.concurrency,
				async (item) => {
					// Already sent by the urgent lane, with newer content.
					if (this.expedited.has(item.path)) {
						done++;
						if (reporter) reporter.tick(done, items.length);
						return;
					}
					if (queue) queue.started(item);
					this.inFlight.add(item.path);
					let failure: string | undefined;
					try {
						if (await this.executeItem(item, stats, localSnapshot, remoteSnapshot, hooks)) {
							completed.add(item.path);
						}
						this.failureStreak = 0;
					} catch (e) {
						console.error(`[YaDisk Sync] Error processing ${item.path}:`, e);
						const message = describeError(e);
						failure = message;
						stats.errors++;
						stats.lastError = { path: item.path, message };
						// A failed file still moves the counter on, so without this
						// a run of failures would read as progress.
						if (reporter) reporter.failure(stats.errors, item.path, message);

						// With the drive gone every remaining item fails the same
						// way; stop instead of trying each one.
						if (!this.halt && !(await this.storageAvailable(hooks))) {
							this.halt = { kind: "storage" };
						}
						// So does anything else that is not about one file.
						if (++this.failureStreak >= FAILURE_STREAK_LIMIT) this.gaveUp = true;
					}

					this.inFlight.delete(item.path);
					if (queue) queue.finished(item, failure);
					done++;
					if (reporter) reporter.tick(done, items.length);
					await this.maybeCheckpoint(plan, completed, localSnapshot, remoteSnapshot, hooks);
				},
				() => this.shouldStop(),
				() => this.takeUrgent(),
			);
		};

		try {
			await runPhase(t("phase.uploading"), uploads);
			await runPhase(t("phase.downloading"), downloads);
			await runPhase(t("phase.deleting"), deletes);
		} finally {
			this.live = null;
		}
	}

	/** The next urgent file that can go up now, as a task; see expedite. */
	private takeUrgent(): (() => Promise<void>) | undefined {
		const live = this.live;
		if (!live) return undefined;
		for (const path of this.urgent) {
			// Picked up again once the transfer on it is over.
			if (this.inFlight.has(path)) continue;
			this.urgent.delete(path);
			const item = this.urgentUpload(path, live);
			if (item) return () => this.runUrgent(item, live);
		}
		return undefined;
	}

	/**
	 * The upload an urgent file stands for, or nothing if sending it now is
	 * not safe. Sending is safe only where this run would not have written
	 * Yandex Disk's side over it — no download, deletion or conflict was
	 * planned for it — so the file goes up exactly as a plan would send it.
	 */
	private urgentUpload(path: string, live: LiveRun): SyncPlanItem | null {
		if (live.direction === SyncDirection.Pull) return null;

		const file = this.app.vault.getAbstractFileByPath(path);
		if (!(file instanceof TFile)) return null;
		if (this.stateManager.excludes(path, file.stat.size, this.settings)) return null;

		const planned = live.planByPath.get(path);
		if (planned) {
			const sendable =
				planned.action === SyncAction.UploadNew ||
				planned.action === SyncAction.UploadModified ||
				planned.action === SyncAction.Skip;
			if (!sendable) return null;
		} else if (live.remoteSnapshot[path]) {
			// Not in the plan, yet on the disk: listed after the scan.
			return null;
		}

		const onDisk = live.remoteSnapshot[path] ?? planned?.remoteRecord;
		return {
			path,
			action: onDisk ? SyncAction.UploadModified : SyncAction.UploadNew,
			localRecord: planned?.localRecord,
			remoteRecord: planned?.remoteRecord,
			prevLocalRecord: planned?.prevLocalRecord,
			prevRemoteRecord: planned?.prevRemoteRecord,
		};
	}

	private async runUrgent(item: SyncPlanItem, live: LiveRun): Promise<void> {
		const queue = live.hooks.queue;
		const reporter = live.hooks.reporter;
		this.expedited.add(item.path);
		this.inFlight.add(item.path);
		if (queue) {
			queue.expedited(item);
			queue.started(item);
		}

		let failure: string | undefined;
		try {
			const file = this.app.vault.getAbstractFileByPath(item.path);
			if (!(file instanceof TFile)) throw new Error(t("error.localMissing", { path: item.path }));
			// Taken before the read. Should the file change in between, the
			// recorded time is older than the file's and the next scan hashes
			// it afresh rather than trusting the hash below.
			const mtime = file.stat.mtime;
			const data = await this.app.vault.readBinary(file);
			await this.client.uploadFile(this.client.toRemotePath(item.path), data);

			// What was sent, not what the scan saw: the two sides now match
			// on this content, and the snapshots must say so or the next run
			// reads the file as changed on both sides.
			const hash = md5(data);
			live.localSnapshot[item.path] = { path: item.path, mtime, size: data.byteLength, md5: hash };
			live.remoteSnapshot[item.path] = { path: item.path, mtime: Date.now(), size: data.byteLength, md5: hash };
			live.completed.add(item.path);
			live.stats.uploaded++;
			this.failureStreak = 0;
		} catch (e) {
			console.error(`[YaDisk Sync] Error processing ${item.path}:`, e);
			failure = describeError(e);
			live.stats.errors++;
			live.stats.lastError = { path: item.path, message: failure };
			if (reporter) reporter.failure(live.stats.errors, item.path, failure);
			if (++this.failureStreak >= FAILURE_STREAK_LIMIT) this.gaveUp = true;
		} finally {
			this.inFlight.delete(item.path);
		}
		if (queue) queue.finished(item, failure);
	}

	/**
	 * Applies one plan item and folds the result back into the in-memory
	 * snapshots, so the sync does not need a second full scan of both sides
	 * just to learn what it already did. Returns whether the item was carried
	 * out; one that was not is left for the next sync.
	 */
	private async executeItem(
		item: SyncPlanItem,
		stats: SyncStats,
		localSnapshot: Record<string, FileRecord>,
		remoteSnapshot: Record<string, FileRecord>,
		hooks: SyncHooks,
	): Promise<boolean> {
		switch (item.action) {
			case SyncAction.UploadNew:
			case SyncAction.UploadModified: {
				await this.executeUpload(item);
				stats.uploaded++;
				const local = localSnapshot[item.path];
				if (local) {
					remoteSnapshot[item.path] = {
						path: item.path,
						// The server's own mtime is only used to break ties under
						// the "newer wins" strategy; a round trip to read it back
						// is not worth one request per file.
						mtime: Date.now(),
						size: local.size,
						md5: local.md5,
					};
				}
				return true;
			}
			case SyncAction.DownloadNew:
			case SyncAction.DownloadModified: {
				const written = await this.executeDownload(item, hooks);
				if (!written) {
					// Left for the next sync to weigh as a genuine conflict,
					// rather than silently overwriting what was just typed.
					stats.skipped++;
					return false;
				}
				stats.downloaded++;
				const file = this.app.vault.getAbstractFileByPath(item.path);
				if (item.remoteRecord && file instanceof TFile) {
					localSnapshot[item.path] = {
						path: item.path,
						mtime: file.stat.mtime,
						size: file.stat.size,
						md5: item.remoteRecord.md5,
					};
					remoteSnapshot[item.path] = item.remoteRecord;
				}
				return true;
			}
			case SyncAction.DeleteRemote:
				if (!(await this.confirmGoneLocally(item, stats, hooks))) return false;
				await this.executeDeleteRemote(item);
				stats.deleted++;
				delete remoteSnapshot[item.path];
				delete localSnapshot[item.path];
				return true;
			case SyncAction.DeleteLocal:
				await this.executeDeleteLocal(item, hooks);
				stats.deleted++;
				delete localSnapshot[item.path];
				delete remoteSnapshot[item.path];
				return true;
		}
		return false;
	}

	private async maybeCheckpoint(
		plan: SyncPlanItem[],
		completed: ReadonlySet<string>,
		localSnapshot: Record<string, FileRecord>,
		remoteSnapshot: Record<string, FileRecord>,
		hooks: SyncHooks,
	): Promise<void> {
		// A run that stopped itself is no longer trusting its storage.
		if (!hooks.checkpoint || this.checkpointInFlight || this.halt) return;
		if (Date.now() - this.lastCheckpointAt < CHECKPOINT_INTERVAL_MS) return;

		this.checkpointInFlight = true;
		try {
			// Settled copies: work still in flight must not be saved as done,
			// and the live snapshots keep changing while this is written.
			const local = { ...localSnapshot };
			const remote = { ...remoteSnapshot };
			settleUnfinished(plan, completed, local, remote);
			this.stateManager.setState({
				lastSyncTime: Date.now(),
				remotePath: this.remotePath,
				localSnapshot: local,
				remoteSnapshot: remote,
			});
			await hooks.checkpoint();
		} catch (e) {
			console.error("[YaDisk Sync] Checkpoint failed:", e);
		} finally {
			this.lastCheckpointAt = Date.now();
			this.checkpointInFlight = false;
		}
	}

	private async buildPlan(
		localCur: Record<string, FileRecord>,
		remoteCur: Record<string, FileRecord>,
		localPrev: Record<string, FileRecord>,
		remotePrev: Record<string, FileRecord>,
		direction: SyncDirection,
	): Promise<SyncPlanItem[]> {
		const plan: SyncPlanItem[] = [];
		const allPaths = new Set([
			...Object.keys(localCur),
			...Object.keys(remoteCur),
			...Object.keys(localPrev),
			...Object.keys(remotePrev),
		]);

		let sinceYield = 0;
		for (const path of allPaths) {
			if (++sinceYield >= PLAN_CHUNK) {
				sinceYield = 0;
				await yieldToUi();
				if (this.aborted) break;
			}

			const lCur = localCur[path];
			const rCur = remoteCur[path];
			const lPrev = localPrev[path];
			const rPrev = remotePrev[path];

			const action = this.decideSyncAction(lCur, rCur, lPrev, rPrev, direction);

			plan.push({
				path,
				action,
				localRecord: lCur,
				remoteRecord: rCur,
				prevLocalRecord: lPrev,
				prevRemoteRecord: rPrev,
			});
		}

		return plan;
	}

	private decideSyncAction(
		lCur: FileRecord | undefined,
		rCur: FileRecord | undefined,
		lPrev: FileRecord | undefined,
		rPrev: FileRecord | undefined,
		direction: SyncDirection,
	): SyncAction {
		const localExists = !!lCur;
		const remoteExists = !!rCur;
		const localExisted = !!lPrev;
		const remoteExisted = !!rPrev;

		const localChanged = localExists && localExisted && lCur.md5 !== lPrev.md5;
		const remoteChanged = remoteExists && remoteExisted && rCur.md5 !== rPrev.md5;
		const localNew = localExists && !localExisted;
		const remoteNew = remoteExists && !remoteExisted;
		const localDeleted = !localExists && localExisted;
		const remoteDeleted = !remoteExists && remoteExisted;
		const localSame = localExists && localExisted && lCur.md5 === lPrev.md5;
		const remoteSame = remoteExists && remoteExisted && rCur.md5 === rPrev.md5;

		if (localExists && remoteExists && lCur.md5 === rCur.md5) {
			return SyncAction.Skip;
		}

		if (direction === SyncDirection.Push) {
			// `!remoteExists` matters on its own: a local file the previous sync
			// skipped is already in the tracked snapshot, so it counts as
			// neither new nor changed and would otherwise never be pushed.
			if (localExists && (!remoteExists || localNew || localChanged)) return SyncAction.UploadNew;
			if (localDeleted && remoteExists) return SyncAction.DeleteRemote;
			return SyncAction.Skip;
		}

		if (direction === SyncDirection.Pull) {
			if (remoteExists && (!localExists || remoteNew || remoteChanged)) return SyncAction.DownloadNew;
			if (remoteDeleted && localExists) return SyncAction.DeleteLocal;
			return SyncAction.Skip;
		}

		if (!localExisted && !remoteExisted) {
			if (localExists && remoteExists) {
				return lCur.md5 === rCur.md5 ? SyncAction.Skip : SyncAction.Conflict;
			}
			if (localExists) return SyncAction.UploadNew;
			if (remoteExists) return SyncAction.DownloadNew;
			return SyncAction.Skip;
		}

		// File exists on one side but was never tracked on the other (e.g. prior download/upload failed)
		if (remoteExists && !localExists && !localExisted) return SyncAction.DownloadNew;
		if (localExists && !remoteExists && !remoteExisted) return SyncAction.UploadNew;

		if (localNew && !remoteExists) return SyncAction.UploadNew;
		if (localNew && remoteSame) return SyncAction.UploadNew;
		if (localNew && remoteNew) return SyncAction.Conflict;
		if (localNew && remoteChanged) return SyncAction.Conflict;

		if (remoteNew && !localExists) return SyncAction.DownloadNew;
		if (remoteNew && localSame) return SyncAction.DownloadNew;

		if (localChanged && (remoteSame || !remoteExists)) return SyncAction.UploadModified;
		if (remoteChanged && (localSame || !localExists)) return SyncAction.DownloadModified;

		if (localChanged && remoteChanged) return SyncAction.Conflict;

		if (localDeleted && remoteSame) return SyncAction.DeleteRemote;
		if (remoteDeleted && localSame) return SyncAction.DeleteLocal;

		if (localDeleted && remoteChanged) return SyncAction.Conflict;
		if (remoteDeleted && localChanged) return SyncAction.Conflict;

		if (localDeleted && remoteDeleted) return SyncAction.Skip;

		if (localSame && remoteSame) return SyncAction.Skip;

		return SyncAction.Skip;
	}

	private async resolveConflicts(
		plan: SyncPlanItem[],
		conflicts: SyncPlanItem[],
	): Promise<SyncPlanItem[]> {
		const strategy = this.settings.conflictStrategy;

		if (strategy === ConflictStrategy.Ask) {
			const modal = new ConflictModal(this.app, conflicts);
			modal.open();
			const resolutions = await modal.waitForResolution();
			return this.applyResolutions(plan, resolutions);
		}

		return plan.map((item) => {
			if (item.action !== SyncAction.Conflict) return item;

			let resolvedAction: SyncAction;

			switch (strategy) {
				case ConflictStrategy.LocalWins:
					resolvedAction = item.localRecord
						? SyncAction.UploadModified
						: SyncAction.DeleteRemote;
					break;
				case ConflictStrategy.RemoteWins:
					resolvedAction = item.remoteRecord
						? SyncAction.DownloadModified
						: SyncAction.DeleteLocal;
					break;
				case ConflictStrategy.NewerWins: {
					const lTime = item.localRecord?.mtime || 0;
					const rTime = item.remoteRecord?.mtime || 0;
					if (lTime >= rTime) {
						resolvedAction = item.localRecord
							? SyncAction.UploadModified
							: SyncAction.DeleteRemote;
					} else {
						resolvedAction = item.remoteRecord
							? SyncAction.DownloadModified
							: SyncAction.DeleteLocal;
					}
					break;
				}
				default:
					resolvedAction = SyncAction.Skip;
			}

			return { ...item, action: resolvedAction };
		});
	}

	private applyResolutions(
		plan: SyncPlanItem[],
		resolutions: ConflictResolution[],
	): SyncPlanItem[] {
		const resMap = new Map(resolutions.map((r) => [r.path, r.choice]));

		return plan.map((item) => {
			if (item.action !== SyncAction.Conflict) return item;

			const choice = resMap.get(item.path) || "skip";
			let resolvedAction: SyncAction;

			switch (choice) {
				case "local":
					resolvedAction = item.localRecord
						? (item.remoteRecord ? SyncAction.UploadModified : SyncAction.UploadNew)
						: SyncAction.DeleteRemote;
					break;
				case "remote":
					resolvedAction = item.remoteRecord
						? (item.localRecord ? SyncAction.DownloadModified : SyncAction.DownloadNew)
						: SyncAction.DeleteLocal;
					break;
				default:
					resolvedAction = SyncAction.Skip;
			}

			return { ...item, action: resolvedAction };
		});
	}

	private async executeUpload(item: SyncPlanItem): Promise<void> {
		const file = this.app.vault.getAbstractFileByPath(item.path);
		if (!file || !(file instanceof TFile)) throw new Error(t("error.localMissing", { path: item.path }));

		const data = await this.app.vault.readBinary(file);
		const remotePath = this.client.toRemotePath(item.path);
		await this.client.uploadFile(remotePath, data);
	}

	/**
	 * Returns false when the download was abandoned because the local file
	 * moved on since the scan.
	 *
	 * A sync of a large vault runs for minutes, and the plan is built from a
	 * snapshot taken at the start. Writing that plan out blindly would let a
	 * download land on top of a note edited while it was queued.
	 */
	private async executeDownload(item: SyncPlanItem, hooks: SyncHooks): Promise<boolean> {
		if (this.hasLocalFileChanged(item)) return false;

		const remotePath = this.client.toRemotePath(item.path);
		const data = await this.client.downloadFile(remotePath);

		// Re-checked after the transfer: the download itself is the long part,
		// and is exactly when an edit is likely to arrive.
		if (this.hasLocalFileChanged(item)) return false;

		// Obsidian announces a created file before createBinary returns; told
		// afterwards, the caller took every downloaded file for a new note.
		if (hooks.onFileWritten) hooks.onFileWritten(item.path);

		const existingFile = this.app.vault.getAbstractFileByPath(item.path);
		if (existingFile && existingFile instanceof TFile) {
			await this.app.vault.modifyBinary(existingFile, data);
		} else {
			const parentPath = item.path.substring(0, item.path.lastIndexOf("/"));
			if (parentPath) {
				await this.ensureLocalFolder(parentPath, hooks);
			}
			await this.app.vault.createBinary(item.path, data);
		}

		return true;
	}

	private hasLocalFileChanged(item: SyncPlanItem): boolean {
		const file = this.app.vault.getAbstractFileByPath(item.path);

		if (!item.localRecord) {
			// The plan expected nothing here; anything present arrived since.
			return file instanceof TFile;
		}

		if (!(file instanceof TFile)) return true;
		return file.stat.mtime !== item.localRecord.mtime || file.stat.size !== item.localRecord.size;
	}

	private async executeDeleteRemote(item: SyncPlanItem): Promise<void> {
		const remotePath = this.client.toRemotePath(item.path);
		await this.client.deleteResource(remotePath);
	}

	private async executeDeleteLocal(item: SyncPlanItem, hooks: SyncHooks): Promise<void> {
		const file = this.app.vault.getAbstractFileByPath(item.path);
		if (file) {
			if (hooks.onFileWritten) hooks.onFileWritten(item.path);
			await this.app.fileManager.trashFile(file);
		}
	}

	private async ensureLocalFolder(folderPath: string, hooks: SyncHooks): Promise<void> {
		const parts = folderPath.split("/");
		let current = "";
		for (const part of parts) {
			current = current ? current + "/" + part : part;
			const existing = this.app.vault.getAbstractFileByPath(current);
			if (!existing) {
				if (hooks.onFileWritten) hooks.onFileWritten(current);
				try {
					await this.app.vault.createFolder(current);
				} catch {
					// Another download in this batch created it first.
				}
			}
		}
	}
}

/** The snapshot without the given paths; a copy only when there is any to drop. */
function withoutPaths(
	snapshot: Record<string, FileRecord>,
	paths: ReadonlySet<string>,
): Record<string, FileRecord> {
	if (paths.size === 0) return snapshot;
	const copy = { ...snapshot };
	for (const path of paths) delete copy[path];
	return copy;
}

function byDepthAsc(a: SyncPlanItem, b: SyncPlanItem): number {
	return pathDepth(a.path) - pathDepth(b.path) || a.path.localeCompare(b.path);
}

function byDepthDesc(a: SyncPlanItem, b: SyncPlanItem): number {
	return pathDepth(b.path) - pathDepth(a.path) || a.path.localeCompare(b.path);
}
