export enum Language {
	/** Follow Obsidian's own interface language. */
	Auto = "auto",
	English = "en",
	Russian = "ru",
}

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

export enum ProgressDisplay {
	/** Appear only once a sync has run long enough to be worth reporting. */
	Delayed = "delayed",
	Always = "always",
	Never = "never",
}

/** How long a sync must run before the delayed indicator appears. */
export const PROGRESS_DELAY_MS = 20000;

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
	/** Auto-sync poll interval in seconds. 0 disables it. */
	autoSyncSeconds: number;
	excludePatterns: string[];
	maxFileSizeMB: number;
	syncOnStartup: boolean;
	/** How many uploads and downloads may be in flight at once. */
	concurrency: number;
	/** How many folder listings may be in flight while scanning Yandex Disk. */
	scanConcurrency: number;
	/** Hold a screen wake lock for the duration of a large sync. */
	keepScreenOn: boolean;
	/** Show what is left to send, download and delete in the status bar. */
	statusBarCounts: boolean;
	/** When the progress indicator is shown. */
	progressDisplay: ProgressDisplay;
	/**
	 * A sync that would delete at least this many files on one side stops
	 * and asks first. A quarter of that side asks regardless.
	 */
	deleteConfirmThreshold: number;
	/** Language of the settings; Auto follows Obsidian's. */
	language: Language;
}

export const MIN_CONCURRENCY = 1;
export const MAX_CONCURRENCY = 8;

/**
 * Bounds on folder listings in flight. A listing is one small request, and
 * each folder costs a round trip of most of a second, so on a deep vault
 * those round trips are the whole scan: 160 folders took 42 s three at a
 * time, 12 s at twelve, 9 s at sixteen and 7 s at twenty-four, with no rate
 * limiting at any of them.
 */
export const MIN_SCAN_CONCURRENCY = 1;
export const MAX_SCAN_CONCURRENCY = 24;

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
	autoSyncSeconds: 60,
	excludePatterns: [
		".trash/**",
	],
	maxFileSizeMB: 50,
	syncOnStartup: true,
	concurrency: 4,
	scanConcurrency: 12,
	keepScreenOn: true,
	statusBarCounts: false,
	progressDisplay: ProgressDisplay.Never,
	deleteConfirmThreshold: 50,
	language: Language.Auto,
};

/** Below this many files a sync is too short to be worth a wake lock. */
export const WAKE_LOCK_MIN_ITEMS = 50;

export interface FileRecord {
	path: string;
	mtime: number;
	size: number;
	md5: string;
}

export interface SyncState {
	lastSyncTime: number;
	/**
	 * Remote folder the snapshots were taken against. Absent in state saved
	 * before this was recorded, which is read as the current folder.
	 */
	remotePath?: string;
	/**
	 * Yandex Disk's revision once the last sync finished: while the disk still
	 * reports it, the remote snapshot is still accurate. Kept with the
	 * snapshots, so a sync right after a restart need not walk the disk to
	 * find nothing changed. Absent whenever the snapshots were written by
	 * anything else — a checkpoint, a cancelled or blocked run, a reset.
	 */
	revision?: number;
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
	remotePath?: string;
	revision?: number;
	local: Record<string, PackedRecord>;
	remote: Record<string, PackedRecord>;
}

/** Files that went missing from one side, beyond what a sync may delete unasked. */
export interface MassDeletion {
	/** Where the files went missing: "local" is this vault. */
	side: "local" | "remote";
	/** What the sync would delete on the other side as a result. */
	paths: string[];
	/** Files that side had at the last sync, for scale. */
	tracked: number;
}

/** Deletions the user has reviewed and allowed, by the side the files went missing from. */
export interface ApprovedDeletions {
	local: ReadonlySet<string>;
	remote: ReadonlySet<string>;
}

/**
 * Why a sync refused to go on. Raised before anything changed, or — when it
 * comes up mid-run — with the work done so far kept and nothing further.
 */
export type SyncBlock =
	/** The vault's own storage cannot be read: a drive was unplugged, say. */
	| { kind: "storage" }
	/** Files Obsidian lists as gone are still on disk. */
	| { kind: "stale-list"; paths: string[] }
	/** The remote folder no longer exists, though the last sync saw files in it. */
	| { kind: "remote-missing"; remotePath: string }
	| { kind: "mass-delete"; deletions: MassDeletion[] };

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
