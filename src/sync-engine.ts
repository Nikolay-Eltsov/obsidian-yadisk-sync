import { App, TFile } from "obsidian";
import {
	YaDiskSyncSettings,
	FileRecord,
	SyncPlanItem,
	SyncAction,
	SyncDirection,
	ConflictStrategy,
	ConflictResolution,
} from "./types";
import { YandexDiskClient } from "./yandex-client";
import { SyncStateManager } from "./sync-state";
import { ConflictModal } from "./conflict-modal";
import { pathDepth, runPool, yieldToUi } from "./utils";

/** Paths to classify before handing the main thread back to the UI. */
const PLAN_CHUNK = 500;

/** Minimum gap between writes of the sync state to disk. */
const CHECKPOINT_INTERVAL_MS = 15000;

export interface SyncStats {
	uploaded: number;
	downloaded: number;
	deleted: number;
	errors: number;
	aborted: boolean;
}

/** Narrow view of the progress UI, so the engine does not depend on Notice. */
export interface SyncReporter {
	phase(label: string): void;
	tick(current: number, total?: number): void;
	message(text: string): void;
}

export interface SyncHooks {
	reporter?: SyncReporter;
	/** Persists the current snapshots so an interrupted sync is not wasted. */
	checkpoint?: () => Promise<void>;
	/**
	 * Set when the disk revision proves nothing on the remote has moved since
	 * the stored snapshot was taken. Lets a sync caused by a local edit skip
	 * the remote walk entirely, which is otherwise the whole cost of the run.
	 */
	remoteUnchanged?: boolean;
	/**
	 * Called once the size of the run is known, before any transfer starts.
	 * Lets the caller decide whether this run is worth holding the screen on
	 * for — on iOS a locked screen suspends the app and freezes the sync.
	 */
	onPlanReady?: (total: number) => void;
}

export class SyncEngine {
	private aborted = false;
	private lastCheckpointAt = 0;
	private checkpointInFlight = false;

	constructor(
		private app: App,
		private client: YandexDiskClient,
		private stateManager: SyncStateManager,
		private settings: YaDiskSyncSettings,
	) {}

	abort(): void {
		this.aborted = true;
	}

	async run(directionOverride?: SyncDirection, hooks: SyncHooks = {}): Promise<SyncStats> {
		this.aborted = false;
		this.lastCheckpointAt = Date.now();

		const direction = directionOverride || this.settings.syncDirection;
		const stats: SyncStats = { uploaded: 0, downloaded: 0, deleted: 0, errors: 0, aborted: false };
		const reporter = hooks.reporter;

		// Lets retry back-off inside the client wake up early on cancel.
		this.client.setAbortCheck(() => this.aborted);

		try {
			// Phase 1: Scan
			const prevState = this.stateManager.getState();

			if (reporter) reporter.phase("Scanning");
			let vaultText = "";
			let diskText = "";
			const renderScan = () => {
				if (reporter) reporter.message(`Scanning — ${vaultText}${diskText}`);
			};

			const scanLocal = this.stateManager.buildLocalSnapshot(
				this.settings,
				prevState.localSnapshot,
				(done, total) => {
					vaultText = `vault ${done}/${total}`;
					renderScan();
				},
				() => this.aborted,
			);

			const scanRemote = hooks.remoteUnchanged
				? Promise.resolve({ ...prevState.remoteSnapshot })
				: this.stateManager.buildRemoteSnapshot(
						this.client,
						this.settings.remotePath,
						this.settings,
						(dirs, files) => {
							diskText = ` · disk ${dirs} folders, ${files} files`;
							renderScan();
						},
					);

			if (hooks.remoteUnchanged) diskText = " · disk unchanged";

			const [localSnapshot, remoteSnapshot] = await Promise.all([scanLocal, scanRemote]);

			if (this.aborted) return this.finish(stats);

			// Phase 2: Plan
			if (reporter) reporter.phase("Comparing");
			let plan = await this.buildPlan(
				localSnapshot,
				remoteSnapshot,
				prevState.localSnapshot,
				prevState.remoteSnapshot,
				direction,
			);

			if (this.aborted) return this.finish(stats);

			const conflicts = plan.filter((p) => p.action === SyncAction.Conflict);
			if (conflicts.length > 0) {
				plan = await this.resolveConflicts(plan, conflicts);
			}

			if (this.aborted) return this.finish(stats);

			// Phase 3: Execute
			await this.executePlan(plan, stats, localSnapshot, remoteSnapshot, hooks);

			this.stateManager.setState({
				lastSyncTime: Date.now(),
				localSnapshot,
				remoteSnapshot,
			});

			return this.finish(stats);
		} finally {
			this.client.setAbortCheck(null);
		}
	}

	private finish(stats: SyncStats): SyncStats {
		stats.aborted = this.aborted;
		return stats;
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
		stats: SyncStats,
		localSnapshot: Record<string, FileRecord>,
		remoteSnapshot: Record<string, FileRecord>,
		hooks: SyncHooks,
	): Promise<void> {
		const actionItems = plan.filter((p) => p.action !== SyncAction.Skip);
		const total = actionItems.length;
		if (hooks.onPlanReady) hooks.onPlanReady(total);
		if (total === 0) return;

		const creates = actionItems.filter(
			(i) => i.action === SyncAction.UploadNew || i.action === SyncAction.DownloadNew,
		);
		const updates = actionItems.filter(
			(i) => i.action === SyncAction.UploadModified || i.action === SyncAction.DownloadModified,
		);
		const deletes = actionItems.filter(
			(i) => i.action === SyncAction.DeleteLocal || i.action === SyncAction.DeleteRemote,
		);

		// Sorting the items directly, rather than sorting paths and then looking
		// each one up again, keeps this O(n log n) instead of O(n²).
		creates.sort(byDepthAsc);
		deletes.sort(byDepthDesc);

		let current = 0;
		const reporter = hooks.reporter;

		const runPhase = async (label: string, items: SyncPlanItem[]) => {
			if (items.length === 0 || this.aborted) return;
			if (reporter) reporter.phase(label);

			await runPool(
				items,
				this.settings.concurrency,
				async (item) => {
					try {
						await this.executeItem(item, stats, localSnapshot, remoteSnapshot);
					} catch (e) {
						console.error(`[YaDisk Sync] Error processing ${item.path}:`, e);
						stats.errors++;
					}

					current++;
					if (reporter) reporter.tick(current, total);
					await this.maybeCheckpoint(localSnapshot, remoteSnapshot, hooks);
				},
				() => this.aborted,
			);
		};

		await runPhase("Transferring", creates);
		await runPhase("Updating", updates);
		await runPhase("Deleting", deletes);
	}

	/**
	 * Applies one plan item and folds the result back into the in-memory
	 * snapshots, so the sync does not need a second full scan of both sides
	 * just to learn what it already did.
	 */
	private async executeItem(
		item: SyncPlanItem,
		stats: SyncStats,
		localSnapshot: Record<string, FileRecord>,
		remoteSnapshot: Record<string, FileRecord>,
	): Promise<void> {
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
				break;
			}
			case SyncAction.DownloadNew:
			case SyncAction.DownloadModified: {
				await this.executeDownload(item);
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
				break;
			}
			case SyncAction.DeleteRemote:
				await this.executeDeleteRemote(item);
				stats.deleted++;
				delete remoteSnapshot[item.path];
				delete localSnapshot[item.path];
				break;
			case SyncAction.DeleteLocal:
				await this.executeDeleteLocal(item);
				stats.deleted++;
				delete localSnapshot[item.path];
				delete remoteSnapshot[item.path];
				break;
		}
	}

	private async maybeCheckpoint(
		localSnapshot: Record<string, FileRecord>,
		remoteSnapshot: Record<string, FileRecord>,
		hooks: SyncHooks,
	): Promise<void> {
		if (!hooks.checkpoint || this.checkpointInFlight) return;
		if (Date.now() - this.lastCheckpointAt < CHECKPOINT_INTERVAL_MS) return;

		this.checkpointInFlight = true;
		try {
			this.stateManager.setState({
				lastSyncTime: Date.now(),
				localSnapshot,
				remoteSnapshot,
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
		if (!file || !(file instanceof TFile)) throw new Error(`Local file not found: ${item.path}`);

		const data = await this.app.vault.readBinary(file);
		const remotePath = this.client.toRemotePath(item.path);
		await this.client.uploadFile(remotePath, data);
	}

	private async executeDownload(item: SyncPlanItem): Promise<void> {
		const remotePath = this.client.toRemotePath(item.path);
		const data = await this.client.downloadFile(remotePath);

		const existingFile = this.app.vault.getAbstractFileByPath(item.path);
		if (existingFile && existingFile instanceof TFile) {
			await this.app.vault.modifyBinary(existingFile, data);
		} else {
			const parentPath = item.path.substring(0, item.path.lastIndexOf("/"));
			if (parentPath) {
				await this.ensureLocalFolder(parentPath);
			}
			await this.app.vault.createBinary(item.path, data);
		}
	}

	private async executeDeleteRemote(item: SyncPlanItem): Promise<void> {
		const remotePath = this.client.toRemotePath(item.path);
		await this.client.deleteResource(remotePath);
	}

	private async executeDeleteLocal(item: SyncPlanItem): Promise<void> {
		const file = this.app.vault.getAbstractFileByPath(item.path);
		if (file) {
			await this.app.fileManager.trashFile(file);
		}
	}

	private async ensureLocalFolder(folderPath: string): Promise<void> {
		const parts = folderPath.split("/");
		let current = "";
		for (const part of parts) {
			current = current ? current + "/" + part : part;
			const existing = this.app.vault.getAbstractFileByPath(current);
			if (!existing) {
				try {
					await this.app.vault.createFolder(current);
				} catch {
					// Another download in this batch created it first.
				}
			}
		}
	}
}

function byDepthAsc(a: SyncPlanItem, b: SyncPlanItem): number {
	return pathDepth(a.path) - pathDepth(b.path) || a.path.localeCompare(b.path);
}

function byDepthDesc(a: SyncPlanItem, b: SyncPlanItem): number {
	return pathDepth(b.path) - pathDepth(a.path) || a.path.localeCompare(b.path);
}
