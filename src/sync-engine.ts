import { App, Notice, normalizePath as obsNormalize } from "obsidian";
import {
	YaDiskSyncSettings,
	FileRecord,
	SyncState,
	SyncPlanItem,
	SyncAction,
	SyncDirection,
	ConflictStrategy,
	ConflictResolution,
} from "./types";
import { YandexDiskClient } from "./yandex-client";
import { SyncStateManager } from "./sync-state";
import { ConflictModal } from "./conflict-modal";
import { sortByDepthAsc, sortByDepthDesc, normalizePath } from "./utils";

export type SyncProgressCallback = (current: number, total: number) => void;

export class SyncEngine {
	private aborted = false;

	constructor(
		private app: App,
		private client: YandexDiskClient,
		private stateManager: SyncStateManager,
		private settings: YaDiskSyncSettings,
	) {}

	abort(): void {
		this.aborted = true;
	}

	async run(
		directionOverride?: SyncDirection,
		onProgress?: SyncProgressCallback,
	): Promise<{ uploaded: number; downloaded: number; deleted: number; errors: number }> {
		this.aborted = false;
		const direction = directionOverride || this.settings.syncDirection;
		const stats = { uploaded: 0, downloaded: 0, deleted: 0, errors: 0 };

		// Phase 1: Scan
		const prevState = this.stateManager.getState();

		const [localSnapshot, remoteSnapshot] = await Promise.all([
			this.stateManager.buildLocalSnapshot(this.settings, prevState.localSnapshot),
			this.stateManager.buildRemoteSnapshot(this.client, this.settings.remotePath, this.settings),
		]);

		if (this.aborted) return stats;

		// Phase 2: Plan
		let plan = this.buildPlan(
			localSnapshot,
			remoteSnapshot,
			prevState.localSnapshot,
			prevState.remoteSnapshot,
			direction,
		);

		if (this.aborted) return stats;

		// Handle conflicts
		const conflicts = plan.filter((p) => p.action === SyncAction.Conflict);
		if (conflicts.length > 0) {
			plan = await this.resolveConflicts(plan, conflicts);
		}

		if (this.aborted) return stats;

		// Phase 3: Execute
		const actionItems = plan.filter((p) => p.action !== SyncAction.Skip);
		const total = actionItems.length;
		let current = 0;

		// Folders first (create by depth ascending)
		const uploadNewDirs = new Set<string>();
		for (const item of actionItems) {
			if (item.action === SyncAction.UploadNew || item.action === SyncAction.UploadModified) {
				const parts = item.path.split("/");
				for (let i = 1; i < parts.length; i++) {
					uploadNewDirs.add(parts.slice(0, i).join("/"));
				}
			}
		}

		// Sort actions: creates first (asc depth), then updates, then deletes (desc depth)
		const creates = actionItems.filter(
			(i) => i.action === SyncAction.UploadNew || i.action === SyncAction.DownloadNew,
		);
		const updates = actionItems.filter(
			(i) => i.action === SyncAction.UploadModified || i.action === SyncAction.DownloadModified,
		);
		const deletes = actionItems.filter(
			(i) => i.action === SyncAction.DeleteLocal || i.action === SyncAction.DeleteRemote,
		);

		const createPaths = creates.map((i) => i.path);
		const sortedCreates = sortByDepthAsc(createPaths).map(
			(p) => creates.find((i) => i.path === p)!,
		);

		const deletePaths = deletes.map((i) => i.path);
		const sortedDeletes = sortByDepthDesc(deletePaths).map(
			(p) => deletes.find((i) => i.path === p)!,
		);

		const ordered = [...sortedCreates, ...updates, ...sortedDeletes];

		for (const item of ordered) {
			if (this.aborted) break;

			current++;
			if (onProgress) onProgress(current, total);

			try {
				switch (item.action) {
					case SyncAction.UploadNew:
					case SyncAction.UploadModified:
						await this.executeUpload(item);
						stats.uploaded++;
						break;
					case SyncAction.DownloadNew:
					case SyncAction.DownloadModified:
						await this.executeDownload(item);
						stats.downloaded++;
						break;
					case SyncAction.DeleteRemote:
						await this.executeDeleteRemote(item);
						stats.deleted++;
						break;
					case SyncAction.DeleteLocal:
						await this.executeDeleteLocal(item);
						stats.deleted++;
						break;
				}
			} catch (e) {
				console.error(`[YaDisk Sync] Error processing ${item.path}:`, e);
				stats.errors++;
			}
		}

		// Save new state
		if (!this.aborted) {
			// Rebuild snapshots after execution to capture actual state
			const newLocalSnapshot = await this.stateManager.buildLocalSnapshot(
				this.settings,
				localSnapshot,
			);
			const newRemoteSnapshot = await this.stateManager.buildRemoteSnapshot(
				this.client,
				this.settings.remotePath,
				this.settings,
			);

			this.stateManager.setState({
				lastSyncTime: Date.now(),
				localSnapshot: newLocalSnapshot,
				remoteSnapshot: newRemoteSnapshot,
			});
		}

		return stats;
	}

	private buildPlan(
		localCur: Record<string, FileRecord>,
		remoteCur: Record<string, FileRecord>,
		localPrev: Record<string, FileRecord>,
		remotePrev: Record<string, FileRecord>,
		direction: SyncDirection,
	): SyncPlanItem[] {
		const plan: SyncPlanItem[] = [];
		const allPaths = new Set([
			...Object.keys(localCur),
			...Object.keys(remoteCur),
			...Object.keys(localPrev),
			...Object.keys(remotePrev),
		]);

		for (const path of allPaths) {
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

		// Both exist and are identical
		if (localExists && remoteExists && lCur.md5 === rCur.md5) {
			return SyncAction.Skip;
		}

		// Push-only mode
		if (direction === SyncDirection.Push) {
			if (localNew || localChanged) return SyncAction.UploadNew;
			if (localDeleted && remoteExists) return SyncAction.DeleteRemote;
			return SyncAction.Skip;
		}

		// Pull-only mode
		if (direction === SyncDirection.Pull) {
			if (remoteNew || remoteChanged) return SyncAction.DownloadNew;
			if (remoteDeleted && localExists) return SyncAction.DeleteLocal;
			return SyncAction.Skip;
		}

		// Bidirectional — first sync (no previous state)
		if (!localExisted && !remoteExisted) {
			if (localExists && remoteExists) {
				return lCur.md5 === rCur.md5 ? SyncAction.Skip : SyncAction.Conflict;
			}
			if (localExists) return SyncAction.UploadNew;
			if (remoteExists) return SyncAction.DownloadNew;
			return SyncAction.Skip;
		}

		// new local, no remote change
		if (localNew && !remoteExists) return SyncAction.UploadNew;
		if (localNew && remoteSame) return SyncAction.UploadNew;
		if (localNew && remoteNew) return SyncAction.Conflict;
		if (localNew && remoteChanged) return SyncAction.Conflict;

		// new remote, no local change
		if (remoteNew && !localExists) return SyncAction.DownloadNew;
		if (remoteNew && localSame) return SyncAction.DownloadNew;

		// changed local, remote same or absent
		if (localChanged && (remoteSame || !remoteExists)) return SyncAction.UploadModified;
		// changed remote, local same or absent
		if (remoteChanged && (localSame || !localExists)) return SyncAction.DownloadModified;

		// both changed
		if (localChanged && remoteChanged) return SyncAction.Conflict;

		// deleted local, remote same
		if (localDeleted && remoteSame) return SyncAction.DeleteRemote;
		// deleted remote, local same
		if (remoteDeleted && localSame) return SyncAction.DeleteLocal;

		// deleted local, remote changed — conflict (prefer keep)
		if (localDeleted && remoteChanged) return SyncAction.Conflict;
		// deleted remote, local changed — conflict (prefer keep)
		if (remoteDeleted && localChanged) return SyncAction.Conflict;

		// both deleted
		if (localDeleted && remoteDeleted) return SyncAction.Skip;

		// same on both sides
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
		if (!file) throw new Error(`Local file not found: ${item.path}`);

		const data = await this.app.vault.readBinary(file as any);
		const remotePath = this.client.toRemotePath(item.path);
		await this.client.uploadFile(remotePath, data);
	}

	private async executeDownload(item: SyncPlanItem): Promise<void> {
		const remotePath = this.client.toRemotePath(item.path);
		const data = await this.client.downloadFile(remotePath);

		const existingFile = this.app.vault.getAbstractFileByPath(item.path);
		if (existingFile) {
			await this.app.vault.modifyBinary(existingFile as any, data);
		} else {
			// Ensure parent folder exists locally
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
			await this.app.vault.delete(file);
		}
	}

	private async ensureLocalFolder(folderPath: string): Promise<void> {
		const parts = folderPath.split("/");
		let current = "";
		for (const part of parts) {
			current = current ? current + "/" + part : part;
			const existing = this.app.vault.getAbstractFileByPath(current);
			if (!existing) {
				await this.app.vault.createFolder(current);
			}
		}
	}
}
