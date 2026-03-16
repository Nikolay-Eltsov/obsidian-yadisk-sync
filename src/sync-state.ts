import { App } from "obsidian";
import { FileRecord, SyncState, YaDiskSyncSettings } from "./types";
import { matchesExcludePattern } from "./utils";
import { md5 } from "./md5";
import { YandexDiskClient } from "./yandex-client";

const EMPTY_STATE: SyncState = {
	lastSyncTime: 0,
	localSnapshot: {},
	remoteSnapshot: {},
};

export class SyncStateManager {
	private state: SyncState = { ...EMPTY_STATE, localSnapshot: {}, remoteSnapshot: {} };

	constructor(private app: App) {}

	getState(): SyncState {
		return this.state;
	}

	setState(state: SyncState): void {
		this.state = state;
	}

	loadFromData(data: { syncState?: SyncState }): void {
		if (data.syncState) {
			this.state = data.syncState;
		}
	}

	getDataToSave(): { syncState: SyncState } {
		return { syncState: this.state };
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
	): Promise<Record<string, FileRecord>> {
		const files = this.app.vault.getFiles();
		const snapshot: Record<string, FileRecord> = {};
		const patterns = this.getEffectiveExcludePatterns(settings);

		for (const file of files) {
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

		return snapshot;
	}

	async buildRemoteSnapshot(
		client: YandexDiskClient,
		remotePath: string,
		settings: YaDiskSyncSettings,
	): Promise<Record<string, FileRecord>> {
		const records = await client.listAllRecursive(remotePath);
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
