import { requestUrl, RequestUrlParam, RequestUrlResponse } from "obsidian";
import { YaDiskResource, YaDiskDiskInfo, YaDiskLink, YaDiskTokenResponse, FileRecord } from "./types";
import { normalizePath, isoToTimestamp, Semaphore } from "./utils";
import { getClientId, getClientSecret } from "./credentials";

const API_BASE = "https://cloud-api.yandex.net/v1/disk";
const OAUTH_BASE = "https://oauth.yandex.ru";
const MAX_RETRIES = 3;

/**
 * Page size for directory listings. The API defaults to 20; on a vault with
 * thousands of files that alone costs hundreds of extra round trips.
 */
const LIST_LIMIT = 1000;

/**
 * Only the properties the sync engine actually reads. Without this the API
 * ships previews, resource ids, exif blocks and sharing metadata for every
 * one of the listed items.
 */
const LIST_FIELDS = [
	"_embedded.total",
	"_embedded.items.path",
	"_embedded.items.type",
	"_embedded.items.size",
	"_embedded.items.md5",
	"_embedded.items.modified",
].join(",");

/** Hard stop for pagination so a malformed response cannot spin forever. */
const MAX_PAGES_PER_DIR = 10000;

export class YaDiskApiError extends Error {
	constructor(
		readonly status: number,
		readonly body: string,
	) {
		super(`Yandex Disk API error: ${status} ${body || "Unknown error"}`);
		this.name = "YaDiskApiError";
	}
}

export interface ScanProgress {
	(dirsDone: number, filesFound: number): void;
}

function isRetryableStatus(status: number): boolean {
	return status === 408 || status === 429 || status >= 500;
}

function stripDiskPrefix(path: string): string {
	return path.startsWith("disk:") ? path.slice(5) : path;
}

export class YandexDiskClient {
	private onTokenRefreshed: ((token: string, refresh: string, expiresAt: number) => void) | null = null;

	/**
	 * Remote directories known to exist. Seeded by {@link listAllRecursive} and
	 * extended on create, so uploading a file no longer costs one existence
	 * check per path segment.
	 */
	private knownFolders = new Set<string>();

	/** Folder creations currently in flight, keyed by remote path. */
	private folderCreations = new Map<string, Promise<void>>();

	/**
	 * Shared back-off deadline. With several transfers in flight, a 429 has to
	 * pause all of them — otherwise the remaining workers keep hammering the
	 * endpoint that just asked us to slow down.
	 */
	private cooldownUntil = 0;

	private abortCheck: (() => boolean) | null = null;

	constructor(
		private token: string,
		private remotePath: string,
		private refreshTokenValue: string = "",
		private tokenExpiresAt: number = 0,
	) {
		// Normalized up front so a later setRemotePath with the same logical
		// path is a no-op and does not drop the folder cache mid-sync.
		this.remotePath = normalizePath(remotePath);
	}

	setToken(token: string): void {
		this.token = token;
	}

	setRefreshToken(refreshToken: string, expiresAt: number): void {
		this.refreshTokenValue = refreshToken;
		this.tokenExpiresAt = expiresAt;
	}

	setRemotePath(remotePath: string): void {
		const next = normalizePath(remotePath);
		if (next !== this.remotePath) this.knownFolders.clear();
		this.remotePath = next;
	}

	/** Lets in-flight requests bail out of retry back-off when the user cancels. */
	setAbortCheck(check: (() => boolean) | null): void {
		this.abortCheck = check;
	}

	resetFolderCache(): void {
		this.knownFolders.clear();
	}

	onTokenRefresh(callback: (accessToken: string, refreshToken: string, expiresAt: number) => void): void {
		this.onTokenRefreshed = callback;
	}

	getAuthUrl(): string {
		const params = new URLSearchParams({
			response_type: "code",
			client_id: getClientId(),
			redirect_uri: `${OAUTH_BASE}/verification_code`,
			force_confirm: "yes",
		});
		return `${OAUTH_BASE}/authorize?${params.toString()}`;
	}

	async exchangeCode(code: string): Promise<YaDiskTokenResponse> {
		const body = new URLSearchParams({
			grant_type: "authorization_code",
			code,
			client_id: getClientId(),
			client_secret: getClientSecret(),
		});

		const resp = await requestUrl({
			url: `${OAUTH_BASE}/token`,
			method: "POST",
			headers: { "Content-Type": "application/x-www-form-urlencoded" },
			body: body.toString(),
			throw: false,
		});

		if (resp.status !== 200) {
			const err = (resp.json as unknown) as { error_description?: string; error?: string } | undefined;
			throw new Error(err?.error_description || err?.error || `OAuth error: ${resp.status}`);
		}

		const data = (resp.json as unknown) as YaDiskTokenResponse;
		this.token = data.access_token;
		this.refreshTokenValue = data.refresh_token;
		this.tokenExpiresAt = Date.now() + data.expires_in * 1000;

		if (this.onTokenRefreshed) {
			this.onTokenRefreshed(this.token, this.refreshTokenValue, this.tokenExpiresAt);
		}

		return data;
	}

	async refreshAccessToken(): Promise<YaDiskTokenResponse> {
		if (!this.refreshTokenValue) {
			throw new Error("No refresh token available. Please re-authorize.");
		}

		const body = new URLSearchParams({
			grant_type: "refresh_token",
			refresh_token: this.refreshTokenValue,
			client_id: getClientId(),
			client_secret: getClientSecret(),
		});

		const resp = await requestUrl({
			url: `${OAUTH_BASE}/token`,
			method: "POST",
			headers: { "Content-Type": "application/x-www-form-urlencoded" },
			body: body.toString(),
			throw: false,
		});

		if (resp.status !== 200) {
			const err = (resp.json as unknown) as { error_description?: string; error?: string } | undefined;
			throw new Error(err?.error_description || err?.error || `Token refresh error: ${resp.status}`);
		}

		const data = (resp.json as unknown) as YaDiskTokenResponse;
		this.token = data.access_token;
		this.refreshTokenValue = data.refresh_token;
		this.tokenExpiresAt = Date.now() + data.expires_in * 1000;

		if (this.onTokenRefreshed) {
			this.onTokenRefreshed(this.token, this.refreshTokenValue, this.tokenExpiresAt);
		}

		return data;
	}

	private async ensureValidToken(): Promise<void> {
		if (this.refreshTokenValue && this.tokenExpiresAt > 0 && Date.now() > this.tokenExpiresAt - 5 * 60 * 1000) {
			await this.refreshAccessToken();
		}
	}

	toRemotePath(localPath: string): string {
		const remote = normalizePath(this.remotePath);
		return `${remote}/${localPath}`;
	}

	toLocalPath(remotePath: string): string {
		const remote = normalizePath(this.remotePath);
		const path = stripDiskPrefix(remotePath);
		const prefix = remote + "/";
		if (path.startsWith(prefix)) {
			return path.slice(prefix.length);
		}
		return path;
	}

	/** Sleep that wakes early when the sync is cancelled. */
	private async delay(ms: number): Promise<void> {
		const deadline = Date.now() + ms;
		for (;;) {
			const remaining = deadline - Date.now();
			if (remaining <= 0) return;
			if (this.abortCheck && this.abortCheck()) return;
			await sleep(Math.min(200, remaining));
		}
	}

	private async waitOutCooldown(): Promise<void> {
		const remaining = this.cooldownUntil - Date.now();
		if (remaining > 0) await this.delay(remaining);
	}

	private static backoffMs(attempt: number): number {
		return Math.pow(2, attempt) * 1000;
	}

	private static retryAfterMs(response: RequestUrlResponse, attempt: number): number {
		const headers = response.headers || {};
		const raw = headers["retry-after"] ?? headers["Retry-After"];
		const seconds = raw ? Number(raw) : NaN;
		if (!isNaN(seconds) && seconds > 0) return Math.min(seconds * 1000, 60000);
		return YandexDiskClient.backoffMs(attempt);
	}

	private async request(params: RequestUrlParam, retries = MAX_RETRIES): Promise<RequestUrlResponse> {
		await this.ensureValidToken();

		const headers: Record<string, string> = {
			Authorization: `OAuth ${this.token}`,
			...(params.headers || {}),
		};

		for (let attempt = 0; attempt <= retries; attempt++) {
			await this.waitOutCooldown();

			let response: RequestUrlResponse;
			try {
				response = await requestUrl({ ...params, headers, throw: false });
			} catch (e) {
				// A transport failure. `requestUrl` rejects with a plain Error,
				// so this must not be narrowed to any particular error class.
				if (attempt < retries) {
					await this.delay(YandexDiskClient.backoffMs(attempt));
					continue;
				}
				throw e;
			}

			if (response.status >= 200 && response.status < 300) {
				return response;
			}

			if (response.status === 401 && this.refreshTokenValue && attempt === 0) {
				await this.refreshAccessToken();
				headers["Authorization"] = `OAuth ${this.token}`;
				continue;
			}

			if (isRetryableStatus(response.status) && attempt < retries) {
				if (response.status === 429) {
					// Hold every worker back, not just this one.
					this.cooldownUntil = Date.now() + YandexDiskClient.retryAfterMs(response, attempt);
				} else {
					await this.delay(YandexDiskClient.backoffMs(attempt));
				}
				continue;
			}

			throw new YaDiskApiError(response.status, response.text);
		}

		throw new Error("Max retries exceeded");
	}

	/**
	 * Transfer against a storage host. These URLs are pre-signed, so they carry
	 * no auth header and are not subject to the API cooldown.
	 */
	private async requestStorage(params: RequestUrlParam, retries = MAX_RETRIES): Promise<RequestUrlResponse> {
		for (let attempt = 0; attempt <= retries; attempt++) {
			let response: RequestUrlResponse;
			try {
				response = await requestUrl({ ...params, throw: false });
			} catch (e) {
				if (attempt < retries) {
					await this.delay(YandexDiskClient.backoffMs(attempt));
					continue;
				}
				throw e;
			}

			if (response.status >= 200 && response.status < 300) {
				return response;
			}

			if (isRetryableStatus(response.status) && attempt < retries) {
				await this.delay(YandexDiskClient.retryAfterMs(response, attempt));
				continue;
			}

			throw new YaDiskApiError(response.status, response.text);
		}

		throw new Error("Max retries exceeded");
	}

	async getDiskInfo(): Promise<YaDiskDiskInfo> {
		const resp = await this.request({ url: API_BASE });
		return (resp.json as unknown) as YaDiskDiskInfo;
	}

	/**
	 * Counter that Yandex Disk bumps whenever anything on the account changes.
	 *
	 * One request answers "is a sync worth doing at all", which is what makes a
	 * short auto-sync interval affordable: a full scan of a large vault costs
	 * hundreds of requests, this costs one.
	 *
	 * Returns null when the field is absent — it is not part of the documented
	 * response, so callers must cope with it going away.
	 */
	async getDiskRevision(): Promise<number | null> {
		const resp = await this.request({ url: `${API_BASE}?fields=revision` });
		const data = (resp.json as unknown) as { revision?: unknown };
		return typeof data.revision === "number" ? data.revision : null;
	}

	async getResource(
		path: string,
		opts: { limit?: number; offset?: number; fields?: string } = {},
	): Promise<YaDiskResource> {
		const params = new URLSearchParams({ path });
		if (opts.limit !== undefined) {
			params.set("limit", String(opts.limit));
			params.set("offset", String(opts.offset ?? 0));
		}
		if (opts.fields) params.set("fields", opts.fields);

		const resp = await this.request({
			url: `${API_BASE}/resources?${params.toString()}`,
		});
		return (resp.json as unknown) as YaDiskResource;
	}

	/**
	 * Walks the remote tree under `folderPath`.
	 *
	 * Directories are listed concurrently: a depth-first walk that awaits every
	 * child in turn spends the entire scan waiting on one round trip at a time,
	 * which on a phone is the dominant cost of a sync.
	 */
	async listAllRecursive(
		folderPath: string,
		concurrency = 4,
		onProgress?: ScanProgress,
	): Promise<FileRecord[]> {
		const records: FileRecord[] = [];
		const semaphore = new Semaphore(Math.max(1, concurrency));
		let dirsDone = 0;

		const listDir = async (dirPath: string): Promise<void> => {
			const subdirs: string[] = [];

			await semaphore.acquire();
			try {
				let offset = 0;
				let total = Infinity;

				for (let page = 0; page < MAX_PAGES_PER_DIR; page++) {
					if (this.abortCheck && this.abortCheck()) return;

					const resource = await this.getResource(dirPath, {
						limit: LIST_LIMIT,
						offset,
						fields: LIST_FIELDS,
					});
					const embedded = resource._embedded;
					if (!embedded) break;

					const items = embedded.items || [];
					// Safety net: without this an inconsistent `total` would
					// leave the offset stuck and spin the loop forever.
					if (items.length === 0) break;

					if (typeof embedded.total === "number") total = embedded.total;

					for (const item of items) {
						if (item.type === "dir") {
							const dir = stripDiskPrefix(item.path);
							this.knownFolders.add(normalizePath(dir));
							subdirs.push(dir);
						} else {
							records.push({
								path: this.toLocalPath(item.path),
								mtime: item.modified ? isoToTimestamp(item.modified) : 0,
								size: item.size || 0,
								md5: item.md5 || "",
							});
						}
					}

					// Advance by what actually came back: the server is free to
					// cap the page below LIST_LIMIT, and assuming otherwise
					// would silently skip the rest of a large directory.
					offset += items.length;
					if (offset >= total) break;
				}
			} finally {
				semaphore.release();
			}

			dirsDone++;
			if (onProgress) onProgress(dirsDone, records.length);

			// Released before recursing, so a worker never blocks on a permit it
			// is itself holding. allSettled rather than all, so a failure in one
			// branch does not leave sibling rejections unhandled.
			const results = await Promise.allSettled(subdirs.map((dir) => listDir(dir)));
			const failed = results.find((r) => r.status === "rejected");
			if (failed && failed.status === "rejected") throw failed.reason;
		};

		try {
			await listDir(folderPath);
		} catch (e) {
			if (e instanceof YaDiskApiError && e.status === 404) {
				// Remote root does not exist yet; leave it out of the folder
				// cache so the first upload actually creates it.
				return [];
			}
			throw e;
		}

		this.knownFolders.add(normalizePath(folderPath));
		return records;
	}

	async createFolder(path: string): Promise<void> {
		await this.request({
			url: `${API_BASE}/resources?path=${encodeURIComponent(path)}`,
			method: "PUT",
		});
	}

	async ensureFolderExists(path: string): Promise<void> {
		const normalized = normalizePath(path);
		if (!normalized || this.knownFolders.has(normalized)) return;

		const parts = normalized.split("/").filter(Boolean);
		let current = "";
		for (const part of parts) {
			current += "/" + part;
			if (this.knownFolders.has(current)) continue;
			await this.createFolderOnce(current);
		}
	}

	/**
	 * Creates a folder at most once, even when several uploads discover the
	 * same missing parent at the same moment. Without the in-flight map the
	 * cache is only populated after the request returns, so a batch of
	 * concurrent uploads all issue their own create for the same directory.
	 */
	private createFolderOnce(path: string): Promise<void> {
		const inFlight = this.folderCreations.get(path);
		if (inFlight) return inFlight;

		const creation = (async () => {
			try {
				await this.createFolder(path);
			} catch (e) {
				// 409 means it already exists, which is the outcome we wanted.
				if (!(e instanceof YaDiskApiError && e.status === 409)) throw e;
			}
			this.knownFolders.add(path);
		})();

		this.folderCreations.set(path, creation);
		const forget = () => {
			if (this.folderCreations.get(path) === creation) this.folderCreations.delete(path);
		};
		creation.then(forget, forget);

		return creation;
	}

	async uploadFile(remotePath: string, data: ArrayBuffer): Promise<void> {
		const parentDir = remotePath.substring(0, remotePath.lastIndexOf("/"));
		await this.ensureFolderExists(parentDir);

		const params = new URLSearchParams({
			path: remotePath,
			overwrite: "true",
		});
		const linkResp = await this.request({
			url: `${API_BASE}/resources/upload?${params.toString()}`,
		});
		const link = (linkResp.json as unknown) as YaDiskLink;

		await this.requestStorage({
			url: link.href,
			method: "PUT",
			body: data,
			headers: { "Content-Type": "application/octet-stream" },
		});
	}

	async downloadFile(remotePath: string): Promise<ArrayBuffer> {
		const params = new URLSearchParams({ path: remotePath });
		const linkResp = await this.request({
			url: `${API_BASE}/resources/download?${params.toString()}`,
		});
		const link = (linkResp.json as unknown) as YaDiskLink;

		const resp = await this.requestStorage({ url: link.href, method: "GET" });
		return resp.arrayBuffer;
	}

	async deleteResource(path: string, permanently = false): Promise<void> {
		const params = new URLSearchParams({
			path,
			permanently: String(permanently),
		});
		await this.request({
			url: `${API_BASE}/resources?${params.toString()}`,
			method: "DELETE",
		});
	}
}
