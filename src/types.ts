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
	autoSyncInterval: number;
	excludePatterns: string[];
	maxFileSizeMB: number;
	syncOnStartup: boolean;
}

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
	excludePatterns: [
		".obsidian/workspace*.json",
		".obsidian/plugins/*/data.json",
		".trash/**",
	],
	maxFileSizeMB: 50,
	syncOnStartup: false,
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
