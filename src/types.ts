export enum SyncDirection {
	Bidirectional = "bidirectional",
	Push = "push",
	Pull = "pull",
}

export enum ConflictStrategy {
	NewerWins = "newer_wins",
	LocalWins = "local_wins",
	RemoteWins = "remote_wins",
	Ask = "ask",
}

export enum SyncAction {
	UploadNew = "upload_new",
	DownloadNew = "download_new",
	UploadModified = "upload_modified",
	DownloadModified = "download_modified",
	DeleteRemote = "delete_remote",
	DeleteLocal = "delete_local",
	Conflict = "conflict",
	Skip = "skip",
}

export interface YaDiskSyncSettings {
	accessToken: string;
	refreshToken: string;
	tokenExpiresAt: number;
	remotePath: string;
	syncDirection: SyncDirection;
	conflictStrategy: ConflictStrategy;
	/** @deprecated Minutes. Kept only to migrate settings saved before 1.2.1. */
	autoSyncInterval: number;
	/** Auto-sync poll interval in seconds. 0 disables it. */
	autoSyncSeconds: number;
	excludePatterns: string[];
	maxFileSizeMB: number;
	syncOnStartup: boolean;
	/** How many transfers/listings may be in flight at once. */
	concurrency: number;
}

export const MIN_CONCURRENCY = 1;
export const MAX_CONCURRENCY = 8;

export interface YaDiskTokenResponse {
	access_token: string;
	refresh_token: string;
	token_type: string;
	expires_in: number;
}

export const DEFAULT_SETTINGS: YaDiskSyncSettings = {
	accessToken: "",
	refreshToken: "",
	tokenExpiresAt: 0,
	remotePath: "/ObsidianVault",
	syncDirection: SyncDirection.Bidirectional,
	conflictStrategy: ConflictStrategy.NewerWins,
	autoSyncInterval: 0,
	autoSyncSeconds: 0,
	excludePatterns: [
		".trash/**",
	],
	maxFileSizeMB: 50,
	syncOnStartup: false,
	concurrency: 4,
};

export interface FileRecord {
	path: string;
	mtime: number;
	size: number;
	md5: string;
}

export interface SyncState {
	lastSyncTime: number;
	localSnapshot: Record<string, FileRecord>;
	remoteSnapshot: Record<string, FileRecord>;
}

/**
 * On-disk form of a {@link FileRecord}: `[mtime, size, md5]`.
 * The path is already the map key, so repeating it in the value roughly
 * doubles the size of a snapshot holding tens of thousands of files.
 */
export type PackedRecord = [number, number, string];

export const PERSISTED_STATE_VERSION = 2;

export interface PersistedSyncState {
	version: number;
	lastSyncTime: number;
	local: Record<string, PackedRecord>;
	remote: Record<string, PackedRecord>;
}

export interface SyncPlanItem {
	path: string;
	action: SyncAction;
	localRecord?: FileRecord;
	remoteRecord?: FileRecord;
	prevLocalRecord?: FileRecord;
	prevRemoteRecord?: FileRecord;
}

export interface ConflictResolution {
	path: string;
	choice: "local" | "remote" | "skip";
}

export interface YaDiskResource {
	name: string;
	path: string;
	type: "dir" | "file";
	size?: number;
	modified?: string;
	md5?: string;
	_embedded?: {
		items: YaDiskResource[];
		total: number;
		limit: number;
		offset: number;
	};
}

export interface YaDiskDiskInfo {
	total_space: number;
	used_space: number;
	user?: {
		login: string;
		display_name: string;
	};
}

export interface YaDiskLink {
	href: string;
	method: string;
}
