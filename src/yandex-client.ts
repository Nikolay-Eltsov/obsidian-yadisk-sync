import { requestUrl, RequestUrlParam, RequestUrlResponse } from "obsidian";
import { YaDiskResource, YaDiskDiskInfo, YaDiskLink, YaDiskTokenResponse, FileRecord } from "./types";
import { normalizePath, isoToTimestamp } from "./utils";
import { getClientId, getClientSecret } from "./credentials";

const API_BASE = "https://cloud-api.yandex.net/v1/disk";
const OAUTH_BASE = "https://oauth.yandex.ru";
const MAX_RETRIES = 3;
const RETRY_CODES = [429, 500, 502, 503, 504];

export class YandexDiskClient {
	private onTokenRefreshed: ((token: string, refresh: string, expiresAt: number) => void) | null = null;

	constructor(
		private token: string,
		private remotePath: string,
		private refreshTokenValue: string = "",
		private tokenExpiresAt: number = 0,
	) {}

	setToken(token: string): void {
		this.token = token;
	}

	setRefreshToken(refreshToken: string, expiresAt: number): void {
		this.refreshTokenValue = refreshToken;
		this.tokenExpiresAt = expiresAt;
	}

	setRemotePath(remotePath: string): void {
		this.remotePath = normalizePath(remotePath);
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
			const err = resp.json;
			throw new Error(err?.error_description || err?.error || `OAuth error: ${resp.status}`);
		}

		const data = resp.json as YaDiskTokenResponse;
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
			const err = resp.json;
			throw new Error(err?.error_description || err?.error || `Token refresh error: ${resp.status}`);
		}

		const data = resp.json as YaDiskTokenResponse;
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
		const prefix = remote + "/";
		if (remotePath.startsWith(prefix)) {
			return remotePath.slice(prefix.length);
		}
		return remotePath;
	}

	private async request(params: RequestUrlParam, retries = MAX_RETRIES): Promise<RequestUrlResponse> {
		await this.ensureValidToken();

		const headers: Record<string, string> = {
			Authorization: `OAuth ${this.token}`,
			...(params.headers || {}),
		};

		for (let attempt = 0; attempt <= retries; attempt++) {
			try {
				const response = await requestUrl({
					...params,
					headers,
					throw: false,
				});

				if (response.status >= 200 && response.status < 300) {
					return response;
				}

				if (response.status === 401 && this.refreshTokenValue && attempt === 0) {
					await this.refreshAccessToken();
					headers["Authorization"] = `OAuth ${this.token}`;
					continue;
				}

				if (RETRY_CODES.includes(response.status) && attempt < retries) {
					const delay = Math.pow(2, attempt) * 1000;
					await sleep(delay);
					continue;
				}

				throw new Error(
					`Yandex Disk API error: ${response.status} ${response.text || "Unknown error"}`,
				);
			} catch (e) {
				if (attempt < retries && e instanceof TypeError) {
					const delay = Math.pow(2, attempt) * 1000;
					await sleep(delay);
					continue;
				}
				throw e;
			}
		}
		throw new Error("Max retries exceeded");
	}

	async getDiskInfo(): Promise<YaDiskDiskInfo> {
		const resp = await this.request({ url: API_BASE });
		return resp.json as YaDiskDiskInfo;
	}

	async getResource(path: string, limit = 0, offset = 0): Promise<YaDiskResource> {
		const params = new URLSearchParams({
			path,
			...(limit > 0 ? { limit: String(limit), offset: String(offset) } : {}),
		});
		const resp = await this.request({
			url: `${API_BASE}/resources?${params.toString()}`,
		});
		return resp.json as YaDiskResource;
	}

	async listAllRecursive(folderPath: string): Promise<FileRecord[]> {
		const records: FileRecord[] = [];
		const limit = 100;

		const listDir = async (dirPath: string): Promise<void> => {
			let offset = 0;
			let total = Infinity;

			while (offset < total) {
				const resource = await this.getResource(dirPath, limit, offset);
				if (!resource._embedded) break;

				total = resource._embedded.total;

				for (const item of resource._embedded.items) {
					if (item.type === "dir") {
						await listDir(item.path);
					} else {
						const localPath = this.toLocalPath(item.path);
						records.push({
							path: localPath,
							mtime: item.modified ? isoToTimestamp(item.modified) : 0,
							size: item.size || 0,
							md5: item.md5 || "",
						});
					}
				}

				offset += resource._embedded.items.length;
			}
		};

		try {
			await listDir(folderPath);
		} catch (e) {
			if (String(e).includes("404")) {
				return [];
			}
			throw e;
		}

		return records;
	}

	async createFolder(path: string): Promise<void> {
		await this.request({
			url: `${API_BASE}/resources?path=${encodeURIComponent(path)}`,
			method: "PUT",
		});
	}

	async ensureFolderExists(path: string): Promise<void> {
		const parts = normalizePath(path).split("/").filter(Boolean);
		let current = "";
		for (const part of parts) {
			current += "/" + part;
			try {
				await this.getResource(current);
			} catch {
				try {
					await this.createFolder(current);
				} catch (e) {
					if (!String(e).includes("409")) throw e;
				}
			}
		}
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
		const link = linkResp.json as YaDiskLink;

		await requestUrl({
			url: link.href,
			method: "PUT",
			body: data,
			headers: { "Content-Type": "application/octet-stream" },
			throw: true,
		});
	}

	async downloadFile(remotePath: string): Promise<ArrayBuffer> {
		const params = new URLSearchParams({ path: remotePath });
		const linkResp = await this.request({
			url: `${API_BASE}/resources/download?${params.toString()}`,
		});
		const link = linkResp.json as YaDiskLink;

		const resp = await requestUrl({
			url: link.href,
			method: "GET",
			throw: true,
		});
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

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}
