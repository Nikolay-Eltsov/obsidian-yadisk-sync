import { App } from "obsidian";
import {
	FileRecord,
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

export type LocalScanProgress = (done: number, total: number) => void;

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

	loadFromData(data: { state?: PersistedSyncState; syncState?: SyncState }): void {
		if (data.state && data.state.version === PERSISTED_STATE_VERSION) {
			this.state = {
				lastSyncTime: data.state.lastSyncTime,
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

	async buildLocalSnapshot(
		settings: YaDiskSyncSettings,
		prevSnapshot: Record<string, FileRecord>,
		onProgress?: LocalScanProgress,
		shouldStop?: () => boolean,
	): Promise<Record<string, FileRecord>> {
		const files = this.app.vault.getFiles();
		const snapshot: Record<string, FileRecord> = {};
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

			if (matchesExcludePattern(file.path, patterns)) continue;

			const sizeMB = file.stat.size / (1024 * 1024);
			if (sizeMB > settings.maxFileSizeMB) continue;

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
		return snapshot;
	}

	async buildRemoteSnapshot(
		client: YandexDiskClient,
		remotePath: string,
		settings: YaDiskSyncSettings,
		onProgress?: ScanProgress,
	): Promise<Record<string, FileRecord>> {
		const records = await client.listAllRecursive(remotePath, settings.concurrency, onProgress);
		const snapshot: Record<string, FileRecord> = {};

		const patterns = this.getEffectiveExcludePatterns(settings);

		for (const record of records) {
			if (matchesExcludePattern(record.path, patterns)) continue;

			const sizeMB = record.size / (1024 * 1024);
			if (sizeMB > settings.maxFileSizeMB) continue;

			snapshot[record.path] = record;
		}

		return snapshot;
	}
}
