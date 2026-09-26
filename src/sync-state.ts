import { App } from "obsidian";
import {
	DEFAULT_SETTINGS,
	FileRecord,
	MAX_SCAN_CONCURRENCY,
	MIN_SCAN_CONCURRENCY,
	PackedRecord,
	PersistedSyncState,
	PERSISTED_STATE_VERSION,
	SyncState,
	YaDiskSyncSettings,
} from "./types";
import { matchesExcludePattern, yieldToUi } from "./utils";
import { md5 } from "./md5";
import { ScanProgress, YandexDiskClient } from "./yandex-client";

const EMPTY_STATE: SyncState = {
	lastSyncTime: 0,
	localSnapshot: {},
	remoteSnapshot: {},
};

/** How many files to walk before handing the main thread back to the UI. */
const HASH_YIELD_EVERY = 200;

/**
 * Folder listings to keep in flight during a remote scan: the setting, kept
 * within bounds whatever the data file says. A 429 still slows every request
 * down together through the client's shared back-off.
 */
function listingConcurrency(settings: YaDiskSyncSettings): number {
	const value = settings.scanConcurrency;
	if (!Number.isFinite(value)) return DEFAULT_SETTINGS.scanConcurrency;
	return Math.min(MAX_SCAN_CONCURRENCY, Math.max(MIN_SCAN_CONCURRENCY, Math.round(value)));
}

export type LocalScanProgress = (done: number, total: number) => void;

/** One side as a sync sees it. */
export interface ScanResult {
	snapshot: Record<string, FileRecord>;
	/**
	 * Files that exist but are left out by the exclude patterns or the size
	 * limit. Missing from the snapshot without being gone, so a sync must not
	 * take them for deleted.
	 */
	skipped: Set<string>;
}

function pack(snapshot: Record<string, FileRecord>): Record<string, PackedRecord> {
	const packed: Record<string, PackedRecord> = {};
	for (const path in snapshot) {
		const rec = snapshot[path];
		packed[path] = [rec.mtime, rec.size, rec.md5];
	}
	return packed;
}

function unpack(packed: Record<string, PackedRecord>): Record<string, FileRecord> {
	const snapshot: Record<string, FileRecord> = {};
	for (const path in packed) {
		const [mtime, size, hash] = packed[path];
		snapshot[path] = { path, mtime, size, md5: hash };
	}
	return snapshot;
}

export class SyncStateManager {
	private state: SyncState = { ...EMPTY_STATE, localSnapshot: {}, remoteSnapshot: {} };

	constructor(private app: App) {}

	getState(): SyncState {
		return this.state;
	}

	setState(state: SyncState): void {
		this.state = state;
	}

	/** Records the disk revision the current snapshots are accurate as of. */
	setRevision(revision: number | null): void {
		this.state.revision = revision ?? undefined;
	}

	loadFromData(data: { state?: PersistedSyncState; syncState?: SyncState }): void {
		if (data.state && data.state.version === PERSISTED_STATE_VERSION) {
			this.state = {
				lastSyncTime: data.state.lastSyncTime,
				remotePath: data.state.remotePath,
				revision: data.state.revision,
				localSnapshot: unpack(data.state.local || {}),
				remoteSnapshot: unpack(data.state.remote || {}),
			};
			return;
		}

		// Pre-1.2 layout: full records with the path repeated inside the value.
		if (data.syncState) {
			this.state = data.syncState;
		}
	}

	getDataToSave(): { state: PersistedSyncState } {
		return {
			state: {
				version: PERSISTED_STATE_VERSION,
				lastSyncTime: this.state.lastSyncTime,
				remotePath: this.state.remotePath,
				revision: this.state.revision,
				local: pack(this.state.localSnapshot),
				remote: pack(this.state.remoteSnapshot),
			},
		};
	}

	resetState(): void {
		this.state = { ...EMPTY_STATE, localSnapshot: {}, remoteSnapshot: {} };
	}

	private getEffectiveExcludePatterns(settings: YaDiskSyncSettings): string[] {
		const configDir = this.app.vault.configDir;
		return [
			...settings.excludePatterns,
			`${configDir}/workspace*.json`,
			`${configDir}/plugins/*/data.json`,
		];
	}

	/** Whether a file of this path and size is left out of syncing. */
	excludes(path: string, size: number, settings: YaDiskSyncSettings): boolean {
		return this.isExcluded(path, size, this.getEffectiveExcludePatterns(settings), settings);
	}

	/** Whether a file is left out of syncing by the user's patterns or size limit. */
	private isExcluded(path: string, size: number, patterns: string[], settings: YaDiskSyncSettings): boolean {
		if (matchesExcludePattern(path, patterns)) return true;
		return size / (1024 * 1024) > settings.maxFileSizeMB;
	}

	/**
	 * Applies the exclude patterns and size limit to records already in hand —
	 * a remote listing, or the stored snapshot standing in for one.
	 */
	filterRecords(records: Iterable<FileRecord>, settings: YaDiskSyncSettings): ScanResult {
		const patterns = this.getEffectiveExcludePatterns(settings);
		const snapshot: Record<string, FileRecord> = {};
		const skipped = new Set<string>();

		for (const record of records) {
			if (this.isExcluded(record.path, record.size, patterns, settings)) {
				skipped.add(record.path);
				continue;
			}
			snapshot[record.path] = record;
		}

		return { snapshot, skipped };
	}

	async buildLocalSnapshot(
		settings: YaDiskSyncSettings,
		prevSnapshot: Record<string, FileRecord>,
		onProgress?: LocalScanProgress,
		shouldStop?: () => boolean,
	): Promise<ScanResult> {
		const files = this.app.vault.getFiles();
		const snapshot: Record<string, FileRecord> = {};
		const skipped = new Set<string>();
		const patterns = this.getEffectiveExcludePatterns(settings);

		let processed = 0;

		for (const file of files) {
			if (shouldStop && shouldStop()) break;

			processed++;
			if (processed % HASH_YIELD_EVERY === 0) {
				// Records served from the previous snapshot never hit an await,
				// so without this the loop would hold the main thread for the
				// whole vault.
				await yieldToUi();
				if (onProgress) onProgress(processed, files.length);
			}

			if (this.isExcluded(file.path, file.stat.size, patterns, settings)) {
				skipped.add(file.path);
				continue;
			}

			const prev = prevSnapshot[file.path];
			let hash: string;

			if (prev && prev.mtime === file.stat.mtime && prev.size === file.stat.size) {
				hash = prev.md5;
			} else {
				const data = await this.app.vault.readBinary(file);
				hash = md5(data);
			}

			snapshot[file.path] = {
				path: file.path,
				mtime: file.stat.mtime,
				size: file.stat.size,
				md5: hash,
			};
		}

		if (onProgress) onProgress(processed, files.length);
		return { snapshot, skipped };
	}

	/** Null when the remote folder does not exist. */
	async buildRemoteSnapshot(
		client: YandexDiskClient,
		remotePath: string,
		settings: YaDiskSyncSettings,
		onProgress?: ScanProgress,
	): Promise<ScanResult | null> {
		const records = await client.listAllRecursive(
			remotePath,
			listingConcurrency(settings),
			onProgress,
		);
		if (records === null) return null;
		return this.filterRecords(records, settings);
	}
}
