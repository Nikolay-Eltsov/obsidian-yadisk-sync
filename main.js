var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/main.ts
var main_exports = {};
__export(main_exports, {
  default: () => YaDiskSyncPlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian6 = require("obsidian");

// src/types.ts
var MIN_CONCURRENCY = 1;
var MAX_CONCURRENCY = 8;
var DEFAULT_SETTINGS = {
  accessToken: "",
  refreshToken: "",
  tokenExpiresAt: 0,
  remotePath: "/ObsidianVault",
  syncDirection: "bidirectional" /* Bidirectional */,
  conflictStrategy: "newer_wins" /* NewerWins */,
  autoSyncSeconds: 0,
  excludePatterns: [
    ".trash/**"
  ],
  maxFileSizeMB: 50,
  syncOnStartup: false,
  concurrency: 4,
  keepScreenOn: true
};
var WAKE_LOCK_MIN_ITEMS = 50;
var PERSISTED_STATE_VERSION = 2;

// src/yandex-client.ts
var import_obsidian = require("obsidian");

// src/utils.ts
function normalizePath(p) {
  return p.replace(/\\/g, "/").replace(/\/+/g, "/").replace(/\/$/, "");
}
function isoToTimestamp(iso) {
  return new Date(iso).getTime();
}
function pathDepth(p) {
  let depth = 1;
  for (let i = 0; i < p.length; i++) {
    if (p.charCodeAt(i) === 47)
      depth++;
  }
  return depth;
}
var Semaphore = class {
  constructor(available) {
    this.available = available;
    this.waiters = [];
  }
  async acquire() {
    if (this.available > 0) {
      this.available--;
      return;
    }
    await new Promise((resolve) => this.waiters.push(resolve));
  }
  release() {
    const next = this.waiters.shift();
    if (next) {
      next();
    } else {
      this.available++;
    }
  }
};
async function runPool(items, concurrency, worker, shouldStop) {
  let cursor = 0;
  const size = Math.max(1, Math.min(concurrency, items.length));
  const runners = [];
  for (let i = 0; i < size; i++) {
    runners.push(
      (async () => {
        for (; ; ) {
          if (shouldStop && shouldStop())
            return;
          const index = cursor++;
          if (index >= items.length)
            return;
          await worker(items[index]);
        }
      })()
    );
  }
  await Promise.all(runners);
}
function yieldToUi() {
  return new Promise((resolve) => window.setTimeout(resolve, 0));
}
function debounce(fn, ms) {
  let timer = null;
  return (...args) => {
    if (timer)
      window.clearTimeout(timer);
    timer = window.setTimeout(() => fn(...args), ms);
  };
}
function minimatch(path, pattern) {
  const regexStr = pattern.split("**").map(
    (segment) => segment.split("*").map((part) => part.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\?/g, "[^/]")).join("[^/]*")
  ).join(".*");
  const regex = new RegExp(`^${regexStr}$`);
  return regex.test(path);
}
function matchesExcludePattern(path, patterns) {
  return patterns.some((p) => minimatch(path, p));
}

// src/credentials.ts
var _a = "MDVmMDMxZWJlMTVhNGQ3M2E5MmZjNDJjMDJkNGZhOTA=";
var _b = "NTQ2ZDdlY2VmNTE3NGQ3Njg4YjdkMjFiOGZjMjk2YTU=";
function getClientId() {
  return atob(_a);
}
function getClientSecret() {
  return atob(_b);
}

// src/yandex-client.ts
var API_BASE = "https://cloud-api.yandex.net/v1/disk";
var OAUTH_BASE = "https://oauth.yandex.ru";
var MAX_RETRIES = 3;
var LIST_LIMIT = 1e3;
var LIST_FIELDS = [
  "_embedded.total",
  "_embedded.items.path",
  "_embedded.items.type",
  "_embedded.items.size",
  "_embedded.items.md5",
  "_embedded.items.modified"
].join(",");
var MAX_PAGES_PER_DIR = 1e4;
var YaDiskApiError = class extends Error {
  constructor(status, body) {
    super(`Yandex Disk API error: ${status} ${body || "Unknown error"}`);
    this.status = status;
    this.body = body;
    this.name = "YaDiskApiError";
  }
};
function isRetryableStatus(status) {
  return status === 408 || status === 429 || status >= 500;
}
function stripDiskPrefix(path) {
  return path.startsWith("disk:") ? path.slice(5) : path;
}
var YandexDiskClient = class _YandexDiskClient {
  constructor(token, remotePath, refreshTokenValue = "", tokenExpiresAt = 0) {
    this.token = token;
    this.remotePath = remotePath;
    this.refreshTokenValue = refreshTokenValue;
    this.tokenExpiresAt = tokenExpiresAt;
    this.onTokenRefreshed = null;
    /**
     * Remote directories known to exist. Seeded by {@link listAllRecursive} and
     * extended on create, so uploading a file no longer costs one existence
     * check per path segment.
     */
    this.knownFolders = /* @__PURE__ */ new Set();
    /** Folder creations currently in flight, keyed by remote path. */
    this.folderCreations = /* @__PURE__ */ new Map();
    /**
     * Shared back-off deadline. With several transfers in flight, a 429 has to
     * pause all of them — otherwise the remaining workers keep hammering the
     * endpoint that just asked us to slow down.
     */
    this.cooldownUntil = 0;
    this.abortCheck = null;
    this.remotePath = normalizePath(remotePath);
  }
  setToken(token) {
    this.token = token;
  }
  setRefreshToken(refreshToken, expiresAt) {
    this.refreshTokenValue = refreshToken;
    this.tokenExpiresAt = expiresAt;
  }
  setRemotePath(remotePath) {
    const next = normalizePath(remotePath);
    if (next !== this.remotePath)
      this.knownFolders.clear();
    this.remotePath = next;
  }
  /** Lets in-flight requests bail out of retry back-off when the user cancels. */
  setAbortCheck(check) {
    this.abortCheck = check;
  }
  resetFolderCache() {
    this.knownFolders.clear();
  }
  onTokenRefresh(callback) {
    this.onTokenRefreshed = callback;
  }
  getAuthUrl() {
    const params = new URLSearchParams({
      response_type: "code",
      client_id: getClientId(),
      redirect_uri: `${OAUTH_BASE}/verification_code`,
      force_confirm: "yes"
    });
    return `${OAUTH_BASE}/authorize?${params.toString()}`;
  }
  async exchangeCode(code) {
    const body = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      client_id: getClientId(),
      client_secret: getClientSecret()
    });
    const resp = await (0, import_obsidian.requestUrl)({
      url: `${OAUTH_BASE}/token`,
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
      throw: false
    });
    if (resp.status !== 200) {
      const err = resp.json;
      throw new Error((err == null ? void 0 : err.error_description) || (err == null ? void 0 : err.error) || `OAuth error: ${resp.status}`);
    }
    const data = resp.json;
    this.token = data.access_token;
    this.refreshTokenValue = data.refresh_token;
    this.tokenExpiresAt = Date.now() + data.expires_in * 1e3;
    if (this.onTokenRefreshed) {
      this.onTokenRefreshed(this.token, this.refreshTokenValue, this.tokenExpiresAt);
    }
    return data;
  }
  async refreshAccessToken() {
    if (!this.refreshTokenValue) {
      throw new Error("No refresh token available. Please re-authorize.");
    }
    const body = new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: this.refreshTokenValue,
      client_id: getClientId(),
      client_secret: getClientSecret()
    });
    const resp = await (0, import_obsidian.requestUrl)({
      url: `${OAUTH_BASE}/token`,
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
      throw: false
    });
    if (resp.status !== 200) {
      const err = resp.json;
      throw new Error((err == null ? void 0 : err.error_description) || (err == null ? void 0 : err.error) || `Token refresh error: ${resp.status}`);
    }
    const data = resp.json;
    this.token = data.access_token;
    this.refreshTokenValue = data.refresh_token;
    this.tokenExpiresAt = Date.now() + data.expires_in * 1e3;
    if (this.onTokenRefreshed) {
      this.onTokenRefreshed(this.token, this.refreshTokenValue, this.tokenExpiresAt);
    }
    return data;
  }
  async ensureValidToken() {
    if (this.refreshTokenValue && this.tokenExpiresAt > 0 && Date.now() > this.tokenExpiresAt - 5 * 60 * 1e3) {
      await this.refreshAccessToken();
    }
  }
  toRemotePath(localPath) {
    const remote = normalizePath(this.remotePath);
    return `${remote}/${localPath}`;
  }
  toLocalPath(remotePath) {
    const remote = normalizePath(this.remotePath);
    const path = stripDiskPrefix(remotePath);
    const prefix = remote + "/";
    if (path.startsWith(prefix)) {
      return path.slice(prefix.length);
    }
    return path;
  }
  /** Sleep that wakes early when the sync is cancelled. */
  async delay(ms) {
    const deadline = Date.now() + ms;
    for (; ; ) {
      const remaining = deadline - Date.now();
      if (remaining <= 0)
        return;
      if (this.abortCheck && this.abortCheck())
        return;
      await sleep(Math.min(200, remaining));
    }
  }
  async waitOutCooldown() {
    const remaining = this.cooldownUntil - Date.now();
    if (remaining > 0)
      await this.delay(remaining);
  }
  static backoffMs(attempt) {
    return Math.pow(2, attempt) * 1e3;
  }
  static retryAfterMs(response, attempt) {
    var _a2;
    const headers = response.headers || {};
    const raw = (_a2 = headers["retry-after"]) != null ? _a2 : headers["Retry-After"];
    const seconds = raw ? Number(raw) : NaN;
    if (!isNaN(seconds) && seconds > 0)
      return Math.min(seconds * 1e3, 6e4);
    return _YandexDiskClient.backoffMs(attempt);
  }
  async request(params, retries = MAX_RETRIES) {
    await this.ensureValidToken();
    const headers = {
      Authorization: `OAuth ${this.token}`,
      ...params.headers || {}
    };
    for (let attempt = 0; attempt <= retries; attempt++) {
      await this.waitOutCooldown();
      let response;
      try {
        response = await (0, import_obsidian.requestUrl)({ ...params, headers, throw: false });
      } catch (e) {
        if (attempt < retries) {
          await this.delay(_YandexDiskClient.backoffMs(attempt));
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
          this.cooldownUntil = Date.now() + _YandexDiskClient.retryAfterMs(response, attempt);
        } else {
          await this.delay(_YandexDiskClient.backoffMs(attempt));
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
  async requestStorage(params, retries = MAX_RETRIES) {
    for (let attempt = 0; attempt <= retries; attempt++) {
      let response;
      try {
        response = await (0, import_obsidian.requestUrl)({ ...params, throw: false });
      } catch (e) {
        if (attempt < retries) {
          await this.delay(_YandexDiskClient.backoffMs(attempt));
          continue;
        }
        throw e;
      }
      if (response.status >= 200 && response.status < 300) {
        return response;
      }
      if (isRetryableStatus(response.status) && attempt < retries) {
        await this.delay(_YandexDiskClient.retryAfterMs(response, attempt));
        continue;
      }
      throw new YaDiskApiError(response.status, response.text);
    }
    throw new Error("Max retries exceeded");
  }
  async getDiskInfo() {
    const resp = await this.request({ url: API_BASE });
    return resp.json;
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
  async getDiskRevision() {
    const resp = await this.request({ url: `${API_BASE}?fields=revision` });
    const data = resp.json;
    return typeof data.revision === "number" ? data.revision : null;
  }
  async getResource(path, opts = {}) {
    var _a2;
    const params = new URLSearchParams({ path });
    if (opts.limit !== void 0) {
      params.set("limit", String(opts.limit));
      params.set("offset", String((_a2 = opts.offset) != null ? _a2 : 0));
    }
    if (opts.fields)
      params.set("fields", opts.fields);
    const resp = await this.request({
      url: `${API_BASE}/resources?${params.toString()}`
    });
    return resp.json;
  }
  /**
   * Walks the remote tree under `folderPath`.
   *
   * Directories are listed concurrently: a depth-first walk that awaits every
   * child in turn spends the entire scan waiting on one round trip at a time,
   * which on a phone is the dominant cost of a sync.
   */
  async listAllRecursive(folderPath, concurrency = 4, onProgress) {
    const records = [];
    const semaphore = new Semaphore(Math.max(1, concurrency));
    let dirsDone = 0;
    const listDir = async (dirPath) => {
      const subdirs = [];
      await semaphore.acquire();
      try {
        let offset = 0;
        let total = Infinity;
        for (let page = 0; page < MAX_PAGES_PER_DIR; page++) {
          if (this.abortCheck && this.abortCheck())
            return;
          const resource = await this.getResource(dirPath, {
            limit: LIST_LIMIT,
            offset,
            fields: LIST_FIELDS
          });
          const embedded = resource._embedded;
          if (!embedded)
            break;
          const items = embedded.items || [];
          if (items.length === 0)
            break;
          if (typeof embedded.total === "number")
            total = embedded.total;
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
                md5: item.md5 || ""
              });
            }
          }
          offset += items.length;
          if (offset >= total)
            break;
        }
      } finally {
        semaphore.release();
      }
      dirsDone++;
      if (onProgress)
        onProgress(dirsDone, records.length);
      const results = await Promise.allSettled(subdirs.map((dir) => listDir(dir)));
      const failed = results.find((r) => r.status === "rejected");
      if (failed && failed.status === "rejected")
        throw failed.reason;
    };
    try {
      await listDir(folderPath);
    } catch (e) {
      if (e instanceof YaDiskApiError && e.status === 404) {
        return [];
      }
      throw e;
    }
    this.knownFolders.add(normalizePath(folderPath));
    return records;
  }
  async createFolder(path) {
    await this.request({
      url: `${API_BASE}/resources?path=${encodeURIComponent(path)}`,
      method: "PUT"
    });
  }
  async ensureFolderExists(path) {
    const normalized = normalizePath(path);
    if (!normalized || this.knownFolders.has(normalized))
      return;
    const parts = normalized.split("/").filter(Boolean);
    let current = "";
    for (const part of parts) {
      current += "/" + part;
      if (this.knownFolders.has(current))
        continue;
      await this.createFolderOnce(current);
    }
  }
  /**
   * Creates a folder at most once, even when several uploads discover the
   * same missing parent at the same moment. Without the in-flight map the
   * cache is only populated after the request returns, so a batch of
   * concurrent uploads all issue their own create for the same directory.
   */
  createFolderOnce(path) {
    const inFlight = this.folderCreations.get(path);
    if (inFlight)
      return inFlight;
    const creation = (async () => {
      try {
        await this.createFolder(path);
      } catch (e) {
        if (!(e instanceof YaDiskApiError && e.status === 409))
          throw e;
      }
      this.knownFolders.add(path);
    })();
    this.folderCreations.set(path, creation);
    const forget = () => {
      if (this.folderCreations.get(path) === creation)
        this.folderCreations.delete(path);
    };
    creation.then(forget, forget);
    return creation;
  }
  async uploadFile(remotePath, data) {
    const parentDir = remotePath.substring(0, remotePath.lastIndexOf("/"));
    await this.ensureFolderExists(parentDir);
    const params = new URLSearchParams({
      path: remotePath,
      overwrite: "true"
    });
    const linkResp = await this.request({
      url: `${API_BASE}/resources/upload?${params.toString()}`
    });
    const link = linkResp.json;
    await this.requestStorage({
      url: link.href,
      method: "PUT",
      body: data,
      headers: { "Content-Type": "application/octet-stream" }
    });
  }
  async downloadFile(remotePath) {
    const params = new URLSearchParams({ path: remotePath });
    const linkResp = await this.request({
      url: `${API_BASE}/resources/download?${params.toString()}`
    });
    const link = linkResp.json;
    const resp = await this.requestStorage({ url: link.href, method: "GET" });
    return resp.arrayBuffer;
  }
  async deleteResource(path, permanently = false) {
    const params = new URLSearchParams({
      path,
      permanently: String(permanently)
    });
    await this.request({
      url: `${API_BASE}/resources?${params.toString()}`,
      method: "DELETE"
    });
  }
};

// src/sync-engine.ts
var import_obsidian3 = require("obsidian");

// src/conflict-modal.ts
var import_obsidian2 = require("obsidian");
var MAX_RENDERED = 200;
var ConflictModal = class extends import_obsidian2.Modal {
  constructor(app, conflicts) {
    super(app);
    this.resolvePromise = null;
    this.conflicts = conflicts;
    this.resolutions = /* @__PURE__ */ new Map();
    for (const c of conflicts) {
      this.resolutions.set(c.path, "skip");
    }
  }
  onOpen() {
    const { contentEl } = this;
    contentEl.addClass("yadisk-conflict-modal");
    new import_obsidian2.Setting(contentEl).setName(`Sync conflicts (${this.conflicts.length})`).setHeading();
    const listEl = contentEl.createDiv({ cls: "conflict-list" });
    const shown = this.conflicts.slice(0, MAX_RENDERED);
    const hidden = this.conflicts.slice(MAX_RENDERED);
    for (const conflict of shown) {
      const item = listEl.createDiv({ cls: "yadisk-conflict-item" });
      item.createDiv({ cls: "conflict-path", text: conflict.path });
      const details = item.createDiv({ cls: "conflict-details" });
      const localCol = details.createDiv({ cls: "detail-col" });
      localCol.createDiv({ cls: "detail-label", text: "Local" });
      if (conflict.localRecord) {
        localCol.createDiv({ text: `Size: ${formatSize(conflict.localRecord.size)}` });
        localCol.createDiv({ text: `Modified: ${formatDate(conflict.localRecord.mtime)}` });
      } else {
        localCol.createDiv({ text: "Deleted" });
      }
      const remoteCol = details.createDiv({ cls: "detail-col" });
      remoteCol.createDiv({ cls: "detail-label", text: "Remote" });
      if (conflict.remoteRecord) {
        remoteCol.createDiv({ text: `Size: ${formatSize(conflict.remoteRecord.size)}` });
        remoteCol.createDiv({ text: `Modified: ${formatDate(conflict.remoteRecord.mtime)}` });
      } else {
        remoteCol.createDiv({ text: "Deleted" });
      }
      const choiceEl = item.createDiv({ cls: "conflict-choice" });
      const choices = [
        { label: "Local", value: "local" },
        { label: "Remote", value: "remote" },
        { label: "Skip", value: "skip" }
      ];
      const buttons = [];
      for (const choice of choices) {
        const btn = choiceEl.createEl("button", { text: choice.label });
        buttons.push(btn);
        if (this.resolutions.get(conflict.path) === choice.value) {
          btn.addClass("is-active");
        }
        btn.addEventListener("click", () => {
          this.resolutions.set(conflict.path, choice.value);
          buttons.forEach((b) => b.removeClass("is-active"));
          btn.addClass("is-active");
        });
      }
    }
    if (hidden.length > 0) {
      const bulkEl = contentEl.createDiv({ cls: "yadisk-conflict-bulk" });
      bulkEl.createDiv({
        text: `${hidden.length} more conflicts are not listed. Choose what to do with them:`
      });
      const bulkChoices = [
        { label: "All local", value: "local" },
        { label: "All remote", value: "remote" },
        { label: "Skip all", value: "skip" }
      ];
      const bulkButtons = [];
      const bulkRow = bulkEl.createDiv({ cls: "conflict-choice" });
      for (const choice of bulkChoices) {
        const btn = bulkRow.createEl("button", { text: choice.label });
        bulkButtons.push(btn);
        if (choice.value === "skip")
          btn.addClass("is-active");
        btn.addEventListener("click", () => {
          for (const conflict of hidden) {
            this.resolutions.set(conflict.path, choice.value);
          }
          bulkButtons.forEach((b) => b.removeClass("is-active"));
          btn.addClass("is-active");
        });
      }
    }
    const footer = contentEl.createDiv({ cls: "modal-button-container" });
    const applyBtn = footer.createEl("button", {
      text: "Apply",
      cls: "mod-cta"
    });
    applyBtn.addEventListener("click", () => {
      this.submitAndClose();
    });
    const cancelBtn = footer.createEl("button", { text: "Cancel" });
    cancelBtn.addEventListener("click", () => {
      this.resolutions.forEach((_, key) => this.resolutions.set(key, "skip"));
      this.submitAndClose();
    });
  }
  submitAndClose() {
    const results = [];
    this.resolutions.forEach((choice, path) => {
      results.push({ path, choice });
    });
    if (this.resolvePromise) {
      this.resolvePromise(results);
    }
    this.close();
  }
  onClose() {
    this.contentEl.empty();
    if (this.resolvePromise) {
      const results = [];
      this.resolutions.forEach((choice, path) => {
        results.push({ path, choice });
      });
      this.resolvePromise(results);
      this.resolvePromise = null;
    }
  }
  waitForResolution() {
    return new Promise((resolve) => {
      this.resolvePromise = resolve;
    });
  }
};
function formatSize(bytes) {
  if (bytes < 1024)
    return bytes + " B";
  if (bytes < 1024 * 1024)
    return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}
function formatDate(ms) {
  if (!ms)
    return "\u2014";
  const d = new Date(ms);
  return d.toLocaleString();
}

// src/sync-engine.ts
var PLAN_CHUNK = 500;
var CHECKPOINT_INTERVAL_MS = 15e3;
var SyncEngine = class {
  constructor(app, client, stateManager, settings) {
    this.app = app;
    this.client = client;
    this.stateManager = stateManager;
    this.settings = settings;
    this.aborted = false;
    this.lastCheckpointAt = 0;
    this.checkpointInFlight = false;
  }
  abort() {
    this.aborted = true;
  }
  async run(directionOverride, hooks = {}) {
    this.aborted = false;
    this.lastCheckpointAt = Date.now();
    const direction = directionOverride || this.settings.syncDirection;
    const stats = { uploaded: 0, downloaded: 0, deleted: 0, errors: 0, aborted: false };
    const reporter = hooks.reporter;
    this.client.setAbortCheck(() => this.aborted);
    try {
      const prevState = this.stateManager.getState();
      if (reporter)
        reporter.phase("Scanning");
      let vaultText = "";
      let diskText = "";
      const renderScan = () => {
        if (reporter)
          reporter.message(`Scanning \u2014 ${vaultText}${diskText}`);
      };
      const scanLocal = this.stateManager.buildLocalSnapshot(
        this.settings,
        prevState.localSnapshot,
        (done, total) => {
          vaultText = `vault ${done}/${total}`;
          renderScan();
        },
        () => this.aborted
      );
      const scanRemote = hooks.remoteUnchanged ? Promise.resolve({ ...prevState.remoteSnapshot }) : this.stateManager.buildRemoteSnapshot(
        this.client,
        this.settings.remotePath,
        this.settings,
        (dirs, files) => {
          diskText = ` \xB7 disk ${dirs} folders, ${files} files`;
          renderScan();
        }
      );
      if (hooks.remoteUnchanged)
        diskText = " \xB7 disk unchanged";
      const [localSnapshot, remoteSnapshot] = await Promise.all([scanLocal, scanRemote]);
      if (this.aborted)
        return this.finish(stats);
      if (reporter)
        reporter.phase("Comparing");
      let plan = await this.buildPlan(
        localSnapshot,
        remoteSnapshot,
        prevState.localSnapshot,
        prevState.remoteSnapshot,
        direction
      );
      if (this.aborted)
        return this.finish(stats);
      const conflicts = plan.filter((p) => p.action === "conflict" /* Conflict */);
      if (conflicts.length > 0) {
        plan = await this.resolveConflicts(plan, conflicts);
      }
      if (this.aborted)
        return this.finish(stats);
      await this.executePlan(plan, stats, localSnapshot, remoteSnapshot, hooks);
      this.stateManager.setState({
        lastSyncTime: Date.now(),
        localSnapshot,
        remoteSnapshot
      });
      return this.finish(stats);
    } finally {
      this.client.setAbortCheck(null);
    }
  }
  finish(stats) {
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
  async executePlan(plan, stats, localSnapshot, remoteSnapshot, hooks) {
    const actionItems = plan.filter((p) => p.action !== "skip" /* Skip */);
    const total = actionItems.length;
    if (hooks.onPlanReady)
      hooks.onPlanReady(total);
    if (total === 0)
      return;
    const creates = actionItems.filter(
      (i) => i.action === "upload_new" /* UploadNew */ || i.action === "download_new" /* DownloadNew */
    );
    const updates = actionItems.filter(
      (i) => i.action === "upload_modified" /* UploadModified */ || i.action === "download_modified" /* DownloadModified */
    );
    const deletes = actionItems.filter(
      (i) => i.action === "delete_local" /* DeleteLocal */ || i.action === "delete_remote" /* DeleteRemote */
    );
    creates.sort(byDepthAsc);
    deletes.sort(byDepthDesc);
    let current = 0;
    const reporter = hooks.reporter;
    const runPhase = async (label, items) => {
      if (items.length === 0 || this.aborted)
        return;
      if (reporter)
        reporter.phase(label);
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
          if (reporter)
            reporter.tick(current, total);
          await this.maybeCheckpoint(localSnapshot, remoteSnapshot, hooks);
        },
        () => this.aborted
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
  async executeItem(item, stats, localSnapshot, remoteSnapshot) {
    switch (item.action) {
      case "upload_new" /* UploadNew */:
      case "upload_modified" /* UploadModified */: {
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
            md5: local.md5
          };
        }
        break;
      }
      case "download_new" /* DownloadNew */:
      case "download_modified" /* DownloadModified */: {
        await this.executeDownload(item);
        stats.downloaded++;
        const file = this.app.vault.getAbstractFileByPath(item.path);
        if (item.remoteRecord && file instanceof import_obsidian3.TFile) {
          localSnapshot[item.path] = {
            path: item.path,
            mtime: file.stat.mtime,
            size: file.stat.size,
            md5: item.remoteRecord.md5
          };
          remoteSnapshot[item.path] = item.remoteRecord;
        }
        break;
      }
      case "delete_remote" /* DeleteRemote */:
        await this.executeDeleteRemote(item);
        stats.deleted++;
        delete remoteSnapshot[item.path];
        delete localSnapshot[item.path];
        break;
      case "delete_local" /* DeleteLocal */:
        await this.executeDeleteLocal(item);
        stats.deleted++;
        delete localSnapshot[item.path];
        delete remoteSnapshot[item.path];
        break;
    }
  }
  async maybeCheckpoint(localSnapshot, remoteSnapshot, hooks) {
    if (!hooks.checkpoint || this.checkpointInFlight)
      return;
    if (Date.now() - this.lastCheckpointAt < CHECKPOINT_INTERVAL_MS)
      return;
    this.checkpointInFlight = true;
    try {
      this.stateManager.setState({
        lastSyncTime: Date.now(),
        localSnapshot,
        remoteSnapshot
      });
      await hooks.checkpoint();
    } catch (e) {
      console.error("[YaDisk Sync] Checkpoint failed:", e);
    } finally {
      this.lastCheckpointAt = Date.now();
      this.checkpointInFlight = false;
    }
  }
  async buildPlan(localCur, remoteCur, localPrev, remotePrev, direction) {
    const plan = [];
    const allPaths = /* @__PURE__ */ new Set([
      ...Object.keys(localCur),
      ...Object.keys(remoteCur),
      ...Object.keys(localPrev),
      ...Object.keys(remotePrev)
    ]);
    let sinceYield = 0;
    for (const path of allPaths) {
      if (++sinceYield >= PLAN_CHUNK) {
        sinceYield = 0;
        await yieldToUi();
        if (this.aborted)
          break;
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
        prevRemoteRecord: rPrev
      });
    }
    return plan;
  }
  decideSyncAction(lCur, rCur, lPrev, rPrev, direction) {
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
      return "skip" /* Skip */;
    }
    if (direction === "push" /* Push */) {
      if (localExists && (!remoteExists || localNew || localChanged))
        return "upload_new" /* UploadNew */;
      if (localDeleted && remoteExists)
        return "delete_remote" /* DeleteRemote */;
      return "skip" /* Skip */;
    }
    if (direction === "pull" /* Pull */) {
      if (remoteExists && (!localExists || remoteNew || remoteChanged))
        return "download_new" /* DownloadNew */;
      if (remoteDeleted && localExists)
        return "delete_local" /* DeleteLocal */;
      return "skip" /* Skip */;
    }
    if (!localExisted && !remoteExisted) {
      if (localExists && remoteExists) {
        return lCur.md5 === rCur.md5 ? "skip" /* Skip */ : "conflict" /* Conflict */;
      }
      if (localExists)
        return "upload_new" /* UploadNew */;
      if (remoteExists)
        return "download_new" /* DownloadNew */;
      return "skip" /* Skip */;
    }
    if (remoteExists && !localExists && !localExisted)
      return "download_new" /* DownloadNew */;
    if (localExists && !remoteExists && !remoteExisted)
      return "upload_new" /* UploadNew */;
    if (localNew && !remoteExists)
      return "upload_new" /* UploadNew */;
    if (localNew && remoteSame)
      return "upload_new" /* UploadNew */;
    if (localNew && remoteNew)
      return "conflict" /* Conflict */;
    if (localNew && remoteChanged)
      return "conflict" /* Conflict */;
    if (remoteNew && !localExists)
      return "download_new" /* DownloadNew */;
    if (remoteNew && localSame)
      return "download_new" /* DownloadNew */;
    if (localChanged && (remoteSame || !remoteExists))
      return "upload_modified" /* UploadModified */;
    if (remoteChanged && (localSame || !localExists))
      return "download_modified" /* DownloadModified */;
    if (localChanged && remoteChanged)
      return "conflict" /* Conflict */;
    if (localDeleted && remoteSame)
      return "delete_remote" /* DeleteRemote */;
    if (remoteDeleted && localSame)
      return "delete_local" /* DeleteLocal */;
    if (localDeleted && remoteChanged)
      return "conflict" /* Conflict */;
    if (remoteDeleted && localChanged)
      return "conflict" /* Conflict */;
    if (localDeleted && remoteDeleted)
      return "skip" /* Skip */;
    if (localSame && remoteSame)
      return "skip" /* Skip */;
    return "skip" /* Skip */;
  }
  async resolveConflicts(plan, conflicts) {
    const strategy = this.settings.conflictStrategy;
    if (strategy === "ask" /* Ask */) {
      const modal = new ConflictModal(this.app, conflicts);
      modal.open();
      const resolutions = await modal.waitForResolution();
      return this.applyResolutions(plan, resolutions);
    }
    return plan.map((item) => {
      var _a2, _b2;
      if (item.action !== "conflict" /* Conflict */)
        return item;
      let resolvedAction;
      switch (strategy) {
        case "local_wins" /* LocalWins */:
          resolvedAction = item.localRecord ? "upload_modified" /* UploadModified */ : "delete_remote" /* DeleteRemote */;
          break;
        case "remote_wins" /* RemoteWins */:
          resolvedAction = item.remoteRecord ? "download_modified" /* DownloadModified */ : "delete_local" /* DeleteLocal */;
          break;
        case "newer_wins" /* NewerWins */: {
          const lTime = ((_a2 = item.localRecord) == null ? void 0 : _a2.mtime) || 0;
          const rTime = ((_b2 = item.remoteRecord) == null ? void 0 : _b2.mtime) || 0;
          if (lTime >= rTime) {
            resolvedAction = item.localRecord ? "upload_modified" /* UploadModified */ : "delete_remote" /* DeleteRemote */;
          } else {
            resolvedAction = item.remoteRecord ? "download_modified" /* DownloadModified */ : "delete_local" /* DeleteLocal */;
          }
          break;
        }
        default:
          resolvedAction = "skip" /* Skip */;
      }
      return { ...item, action: resolvedAction };
    });
  }
  applyResolutions(plan, resolutions) {
    const resMap = new Map(resolutions.map((r) => [r.path, r.choice]));
    return plan.map((item) => {
      if (item.action !== "conflict" /* Conflict */)
        return item;
      const choice = resMap.get(item.path) || "skip";
      let resolvedAction;
      switch (choice) {
        case "local":
          resolvedAction = item.localRecord ? item.remoteRecord ? "upload_modified" /* UploadModified */ : "upload_new" /* UploadNew */ : "delete_remote" /* DeleteRemote */;
          break;
        case "remote":
          resolvedAction = item.remoteRecord ? item.localRecord ? "download_modified" /* DownloadModified */ : "download_new" /* DownloadNew */ : "delete_local" /* DeleteLocal */;
          break;
        default:
          resolvedAction = "skip" /* Skip */;
      }
      return { ...item, action: resolvedAction };
    });
  }
  async executeUpload(item) {
    const file = this.app.vault.getAbstractFileByPath(item.path);
    if (!file || !(file instanceof import_obsidian3.TFile))
      throw new Error(`Local file not found: ${item.path}`);
    const data = await this.app.vault.readBinary(file);
    const remotePath = this.client.toRemotePath(item.path);
    await this.client.uploadFile(remotePath, data);
  }
  async executeDownload(item) {
    const remotePath = this.client.toRemotePath(item.path);
    const data = await this.client.downloadFile(remotePath);
    const existingFile = this.app.vault.getAbstractFileByPath(item.path);
    if (existingFile && existingFile instanceof import_obsidian3.TFile) {
      await this.app.vault.modifyBinary(existingFile, data);
    } else {
      const parentPath = item.path.substring(0, item.path.lastIndexOf("/"));
      if (parentPath) {
        await this.ensureLocalFolder(parentPath);
      }
      await this.app.vault.createBinary(item.path, data);
    }
  }
  async executeDeleteRemote(item) {
    const remotePath = this.client.toRemotePath(item.path);
    await this.client.deleteResource(remotePath);
  }
  async executeDeleteLocal(item) {
    const file = this.app.vault.getAbstractFileByPath(item.path);
    if (file) {
      await this.app.fileManager.trashFile(file);
    }
  }
  async ensureLocalFolder(folderPath) {
    const parts = folderPath.split("/");
    let current = "";
    for (const part of parts) {
      current = current ? current + "/" + part : part;
      const existing = this.app.vault.getAbstractFileByPath(current);
      if (!existing) {
        try {
          await this.app.vault.createFolder(current);
        } catch (e) {
        }
      }
    }
  }
};
function byDepthAsc(a, b) {
  return pathDepth(a.path) - pathDepth(b.path) || a.path.localeCompare(b.path);
}
function byDepthDesc(a, b) {
  return pathDepth(b.path) - pathDepth(a.path) || a.path.localeCompare(b.path);
}

// src/md5.ts
function md5cycle(x, k) {
  let a = x[0], b = x[1], c = x[2], d = x[3];
  a = ff(a, b, c, d, k[0], 7, -680876936);
  d = ff(d, a, b, c, k[1], 12, -389564586);
  c = ff(c, d, a, b, k[2], 17, 606105819);
  b = ff(b, c, d, a, k[3], 22, -1044525330);
  a = ff(a, b, c, d, k[4], 7, -176418897);
  d = ff(d, a, b, c, k[5], 12, 1200080426);
  c = ff(c, d, a, b, k[6], 17, -1473231341);
  b = ff(b, c, d, a, k[7], 22, -45705983);
  a = ff(a, b, c, d, k[8], 7, 1770035416);
  d = ff(d, a, b, c, k[9], 12, -1958414417);
  c = ff(c, d, a, b, k[10], 17, -42063);
  b = ff(b, c, d, a, k[11], 22, -1990404162);
  a = ff(a, b, c, d, k[12], 7, 1804603682);
  d = ff(d, a, b, c, k[13], 12, -40341101);
  c = ff(c, d, a, b, k[14], 17, -1502002290);
  b = ff(b, c, d, a, k[15], 22, 1236535329);
  a = gg(a, b, c, d, k[1], 5, -165796510);
  d = gg(d, a, b, c, k[6], 9, -1069501632);
  c = gg(c, d, a, b, k[11], 14, 643717713);
  b = gg(b, c, d, a, k[0], 20, -373897302);
  a = gg(a, b, c, d, k[5], 5, -701558691);
  d = gg(d, a, b, c, k[10], 9, 38016083);
  c = gg(c, d, a, b, k[15], 14, -660478335);
  b = gg(b, c, d, a, k[4], 20, -405537848);
  a = gg(a, b, c, d, k[9], 5, 568446438);
  d = gg(d, a, b, c, k[14], 9, -1019803690);
  c = gg(c, d, a, b, k[3], 14, -187363961);
  b = gg(b, c, d, a, k[8], 20, 1163531501);
  a = gg(a, b, c, d, k[13], 5, -1444681467);
  d = gg(d, a, b, c, k[2], 9, -51403784);
  c = gg(c, d, a, b, k[7], 14, 1735328473);
  b = gg(b, c, d, a, k[12], 20, -1926607734);
  a = hh(a, b, c, d, k[5], 4, -378558);
  d = hh(d, a, b, c, k[8], 11, -2022574463);
  c = hh(c, d, a, b, k[11], 16, 1839030562);
  b = hh(b, c, d, a, k[14], 23, -35309556);
  a = hh(a, b, c, d, k[1], 4, -1530992060);
  d = hh(d, a, b, c, k[4], 11, 1272893353);
  c = hh(c, d, a, b, k[7], 16, -155497632);
  b = hh(b, c, d, a, k[10], 23, -1094730640);
  a = hh(a, b, c, d, k[13], 4, 681279174);
  d = hh(d, a, b, c, k[0], 11, -358537222);
  c = hh(c, d, a, b, k[3], 16, -722521979);
  b = hh(b, c, d, a, k[6], 23, 76029189);
  a = hh(a, b, c, d, k[9], 4, -640364487);
  d = hh(d, a, b, c, k[12], 11, -421815835);
  c = hh(c, d, a, b, k[15], 16, 530742520);
  b = hh(b, c, d, a, k[2], 23, -995338651);
  a = ii(a, b, c, d, k[0], 6, -198630844);
  d = ii(d, a, b, c, k[7], 10, 1126891415);
  c = ii(c, d, a, b, k[14], 15, -1416354905);
  b = ii(b, c, d, a, k[5], 21, -57434055);
  a = ii(a, b, c, d, k[12], 6, 1700485571);
  d = ii(d, a, b, c, k[3], 10, -1894986606);
  c = ii(c, d, a, b, k[10], 15, -1051523);
  b = ii(b, c, d, a, k[1], 21, -2054922799);
  a = ii(a, b, c, d, k[8], 6, 1873313359);
  d = ii(d, a, b, c, k[15], 10, -30611744);
  c = ii(c, d, a, b, k[6], 15, -1560198380);
  b = ii(b, c, d, a, k[13], 21, 1309151649);
  a = ii(a, b, c, d, k[4], 6, -145523070);
  d = ii(d, a, b, c, k[11], 10, -1120210379);
  c = ii(c, d, a, b, k[2], 15, 718787259);
  b = ii(b, c, d, a, k[9], 21, -343485551);
  x[0] = add32(a, x[0]);
  x[1] = add32(b, x[1]);
  x[2] = add32(c, x[2]);
  x[3] = add32(d, x[3]);
}
function cmn(q, a, b, x, s, t) {
  a = add32(add32(a, q), add32(x, t));
  return add32(a << s | a >>> 32 - s, b);
}
function ff(a, b, c, d, x, s, t) {
  return cmn(b & c | ~b & d, a, b, x, s, t);
}
function gg(a, b, c, d, x, s, t) {
  return cmn(b & d | c & ~d, a, b, x, s, t);
}
function hh(a, b, c, d, x, s, t) {
  return cmn(b ^ c ^ d, a, b, x, s, t);
}
function ii(a, b, c, d, x, s, t) {
  return cmn(c ^ (b | ~d), a, b, x, s, t);
}
function add32(a, b) {
  return a + b & 4294967295;
}
function md5blk(bytes, offset) {
  const md5blks = [];
  for (let i = 0; i < 64; i += 4) {
    md5blks[i >> 2] = bytes[offset + i] + (bytes[offset + i + 1] << 8) + (bytes[offset + i + 2] << 16) + (bytes[offset + i + 3] << 24);
  }
  return md5blks;
}
function rhex(n) {
  const hex = "0123456789abcdef";
  let s = "";
  for (let j = 0; j < 4; j++) {
    s += hex.charAt(n >> j * 8 + 4 & 15) + hex.charAt(n >> j * 8 & 15);
  }
  return s;
}
function md5(buffer) {
  const bytes = new Uint8Array(buffer);
  const n = bytes.length;
  const state = [1732584193, -271733879, -1732584194, 271733878];
  let i;
  for (i = 64; i <= n; i += 64) {
    md5cycle(state, md5blk(bytes, i - 64));
  }
  const tail = new Uint8Array(64);
  const remaining = n - (i - 64);
  for (let j = 0; j < remaining; j++) {
    tail[j] = bytes[i - 64 + j];
  }
  tail[remaining] = 128;
  if (remaining > 55) {
    md5cycle(state, md5blk(tail, 0));
    tail.fill(0);
  }
  const bitLen = n * 8;
  tail[56] = bitLen & 255;
  tail[57] = bitLen >>> 8 & 255;
  tail[58] = bitLen >>> 16 & 255;
  tail[59] = bitLen >>> 24 & 255;
  tail[60] = 0;
  tail[61] = 0;
  tail[62] = 0;
  tail[63] = 0;
  md5cycle(state, md5blk(tail, 0));
  return rhex(state[0]) + rhex(state[1]) + rhex(state[2]) + rhex(state[3]);
}

// src/sync-state.ts
var EMPTY_STATE = {
  lastSyncTime: 0,
  localSnapshot: {},
  remoteSnapshot: {}
};
var HASH_YIELD_EVERY = 200;
function pack(snapshot) {
  const packed = {};
  for (const path in snapshot) {
    const rec = snapshot[path];
    packed[path] = [rec.mtime, rec.size, rec.md5];
  }
  return packed;
}
function unpack(packed) {
  const snapshot = {};
  for (const path in packed) {
    const [mtime, size, hash] = packed[path];
    snapshot[path] = { path, mtime, size, md5: hash };
  }
  return snapshot;
}
var SyncStateManager = class {
  constructor(app) {
    this.app = app;
    this.state = { ...EMPTY_STATE, localSnapshot: {}, remoteSnapshot: {} };
  }
  getState() {
    return this.state;
  }
  setState(state) {
    this.state = state;
  }
  loadFromData(data) {
    if (data.state && data.state.version === PERSISTED_STATE_VERSION) {
      this.state = {
        lastSyncTime: data.state.lastSyncTime,
        localSnapshot: unpack(data.state.local || {}),
        remoteSnapshot: unpack(data.state.remote || {})
      };
      return;
    }
    if (data.syncState) {
      this.state = data.syncState;
    }
  }
  getDataToSave() {
    return {
      state: {
        version: PERSISTED_STATE_VERSION,
        lastSyncTime: this.state.lastSyncTime,
        local: pack(this.state.localSnapshot),
        remote: pack(this.state.remoteSnapshot)
      }
    };
  }
  resetState() {
    this.state = { ...EMPTY_STATE, localSnapshot: {}, remoteSnapshot: {} };
  }
  getEffectiveExcludePatterns(settings) {
    const configDir = this.app.vault.configDir;
    return [
      ...settings.excludePatterns,
      `${configDir}/workspace*.json`,
      `${configDir}/plugins/*/data.json`
    ];
  }
  async buildLocalSnapshot(settings, prevSnapshot, onProgress, shouldStop) {
    const files = this.app.vault.getFiles();
    const snapshot = {};
    const patterns = this.getEffectiveExcludePatterns(settings);
    let processed = 0;
    for (const file of files) {
      if (shouldStop && shouldStop())
        break;
      processed++;
      if (processed % HASH_YIELD_EVERY === 0) {
        await yieldToUi();
        if (onProgress)
          onProgress(processed, files.length);
      }
      if (matchesExcludePattern(file.path, patterns))
        continue;
      const sizeMB = file.stat.size / (1024 * 1024);
      if (sizeMB > settings.maxFileSizeMB)
        continue;
      const prev = prevSnapshot[file.path];
      let hash;
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
        md5: hash
      };
    }
    if (onProgress)
      onProgress(processed, files.length);
    return snapshot;
  }
  async buildRemoteSnapshot(client, remotePath, settings, onProgress) {
    const records = await client.listAllRecursive(remotePath, settings.concurrency, onProgress);
    const snapshot = {};
    const patterns = this.getEffectiveExcludePatterns(settings);
    for (const record of records) {
      if (matchesExcludePattern(record.path, patterns))
        continue;
      const sizeMB = record.size / (1024 * 1024);
      if (sizeMB > settings.maxFileSizeMB)
        continue;
      snapshot[record.path] = record;
    }
    return snapshot;
  }
};

// src/progress.ts
var import_obsidian4 = require("obsidian");
var RENDER_INTERVAL_MS = 250;
var SyncProgress = class {
  constructor(onCancel) {
    this.onCancel = onCancel;
    this.notice = null;
    this.textEl = null;
    this.label = "";
    this.lastRenderAt = 0;
  }
  open() {
    if (this.notice)
      return;
    const frag = createFragment((el) => {
      const wrapper = el.createDiv({ cls: "yadisk-progress" });
      this.textEl = wrapper.createDiv({
        cls: "yadisk-progress-text",
        text: "Starting sync\u2026"
      });
      const cancelBtn = wrapper.createEl("button", {
        cls: "yadisk-progress-cancel",
        text: "Cancel"
      });
      cancelBtn.addEventListener("click", (evt) => {
        evt.preventDefault();
        evt.stopPropagation();
        this.onCancel();
      });
    });
    this.notice = new import_obsidian4.Notice(frag, 0);
  }
  /** Starts a new phase and repaints immediately. */
  phase(label) {
    this.label = label;
    this.render(label);
  }
  /** Per-item update. Cheap to call in a tight loop. */
  tick(current, total) {
    if (Date.now() - this.lastRenderAt < RENDER_INTERVAL_MS)
      return;
    this.render(
      total !== void 0 ? `${this.label} ${current}/${total}` : `${this.label} ${current}`
    );
  }
  /** Replaces the whole line, ignoring the throttle. */
  message(text) {
    this.render(text);
  }
  render(text) {
    this.lastRenderAt = Date.now();
    if (this.textEl)
      this.textEl.setText(text);
  }
  close() {
    if (this.notice)
      this.notice.hide();
    this.notice = null;
    this.textEl = null;
  }
};

// src/settings.ts
var import_obsidian5 = require("obsidian");
var YaDiskSyncSettingTab = class extends import_obsidian5.PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }
  display() {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.addClass("yadisk-sync-settings");
    new import_obsidian5.Setting(containerEl).setName("Authorization").setHeading();
    const isAuthorized = !!this.plugin.settings.accessToken;
    if (!isAuthorized) {
      const authSetting = new import_obsidian5.Setting(containerEl).setName("Sign in").setDesc("Click the button, authorize in the browser, and copy the code");
      authSetting.addButton(
        (btn) => btn.setButtonText("Sign in").setCta().onClick(() => {
          const url = this.plugin.client.getAuthUrl();
          window.open(url);
        })
      );
      const codeSetting = new import_obsidian5.Setting(containerEl).setName("Authorization code").setDesc("Paste the code you received after authorization");
      let codeValue = "";
      codeSetting.addText(
        (text) => text.setPlaceholder("Paste code here").onChange((value) => {
          codeValue = value.trim();
        })
      );
      codeSetting.addButton(
        (btn) => btn.setButtonText("Confirm").onClick(async () => {
          if (!codeValue) {
            new import_obsidian5.Notice("Enter the authorization code");
            return;
          }
          try {
            btn.setButtonText("...");
            btn.buttonEl.disabled = true;
            await this.plugin.client.exchangeCode(codeValue);
            new import_obsidian5.Notice("Authorization successful");
            await this.plugin.saveSettings();
            this.display();
          } catch (e) {
            new import_obsidian5.Notice(`Error: ${e instanceof Error ? e.message : String(e)}`);
            btn.setButtonText("Confirm");
            btn.buttonEl.disabled = false;
          }
        })
      );
    } else {
      new import_obsidian5.Setting(containerEl).setName("Account").setDesc("Authorized").addButton(
        (btn) => btn.setButtonText("Check connection").onClick(async () => {
          var _a2, _b2;
          try {
            const info = await this.plugin.client.getDiskInfo();
            const login = ((_a2 = info.user) == null ? void 0 : _a2.display_name) || ((_b2 = info.user) == null ? void 0 : _b2.login) || "\u2014";
            const freeGB = ((info.total_space - info.used_space) / (1024 * 1024 * 1024)).toFixed(2);
            new import_obsidian5.Notice(`${login} \u2014 ${freeGB} GB free`);
          } catch (e) {
            new import_obsidian5.Notice(`Error: ${e instanceof Error ? e.message : String(e)}`);
          }
        })
      ).addButton(
        (btn) => btn.setButtonText("Sign out").setWarning().onClick(async () => {
          this.plugin.settings.accessToken = "";
          this.plugin.settings.refreshToken = "";
          this.plugin.settings.tokenExpiresAt = 0;
          await this.plugin.saveSettings();
          this.display();
        })
      );
    }
    new import_obsidian5.Setting(containerEl).setName("Synchronization").setHeading();
    new import_obsidian5.Setting(containerEl).setName("Remote folder").addText(
      (text) => text.setPlaceholder("/vault").setValue(this.plugin.settings.remotePath).onChange((value) => {
        this.plugin.settings.remotePath = value.trim() || DEFAULT_SETTINGS.remotePath;
        this.plugin.client.setRemotePath(this.plugin.settings.remotePath);
        this.plugin.queueSaveSettings();
      })
    );
    new import_obsidian5.Setting(containerEl).setName("Direction").addDropdown(
      (dd) => dd.addOption("bidirectional" /* Bidirectional */, "Bidirectional").addOption("push" /* Push */, "Push only").addOption("pull" /* Pull */, "Pull only").setValue(this.plugin.settings.syncDirection).onChange((value) => {
        this.plugin.settings.syncDirection = value;
        this.plugin.queueSaveSettings();
      })
    );
    new import_obsidian5.Setting(containerEl).setName("Conflict strategy").addDropdown(
      (dd) => dd.addOption("newer_wins" /* NewerWins */, "Newer wins").addOption("local_wins" /* LocalWins */, "Local wins").addOption("remote_wins" /* RemoteWins */, "Remote wins").addOption("ask" /* Ask */, "Ask").setValue(this.plugin.settings.conflictStrategy).onChange((value) => {
        this.plugin.settings.conflictStrategy = value;
        this.plugin.queueSaveSettings();
      })
    );
    new import_obsidian5.Setting(containerEl).setName("Auto-sync interval").setDesc(
      "How often to check Yandex Disk for changes. The check itself is a single request, so short intervals are cheap \u2014 but a change found on a large vault still takes a full scan to apply. Edits you make here sync 5 seconds after you stop typing, regardless of this setting."
    ).addDropdown((dd) => {
      const options = [
        [0, "Off"],
        [10, "Every 10 seconds"],
        [30, "Every 30 seconds"],
        [60, "Every minute"],
        [300, "Every 5 minutes"],
        [900, "Every 15 minutes"],
        [1800, "Every 30 minutes"],
        [3600, "Every hour"]
      ];
      const current = this.plugin.settings.autoSyncSeconds;
      if (current > 0 && !options.some(([seconds]) => seconds === current)) {
        options.push([current, `Every ${Math.round(current / 60)} minutes`]);
        options.sort((a, b) => a[0] - b[0]);
      }
      for (const [seconds, label] of options) {
        dd.addOption(String(seconds), label);
      }
      dd.setValue(String(this.plugin.settings.autoSyncSeconds)).onChange((value) => {
        this.plugin.settings.autoSyncSeconds = parseInt(value, 10) || 0;
        this.plugin.setupAutoSync();
        this.plugin.queueSaveSettings();
      });
    });
    new import_obsidian5.Setting(containerEl).setName("Sync on startup").addToggle(
      (toggle) => toggle.setValue(this.plugin.settings.syncOnStartup).onChange((value) => {
        this.plugin.settings.syncOnStartup = value;
        this.plugin.queueSaveSettings();
      })
    );
    const configDir = this.app.vault.configDir;
    new import_obsidian5.Setting(containerEl).setName("Exclude patterns").setDesc("One pattern per line").addTextArea(
      (ta) => ta.setPlaceholder(`${configDir}/workspace*.json
.trash/**`).setValue(this.plugin.settings.excludePatterns.join("\n")).then((t) => {
        t.inputEl.rows = 5;
        t.inputEl.addClass("yadisk-textarea-wide");
      }).onChange((value) => {
        this.plugin.settings.excludePatterns = value.split("\n").map((s) => s.trim()).filter(Boolean);
        this.plugin.queueSaveSettings();
      })
    );
    new import_obsidian5.Setting(containerEl).setName("Max file size (mb)").addText(
      (text) => text.setPlaceholder("50").setValue(String(this.plugin.settings.maxFileSizeMB)).onChange((value) => {
        const num = parseInt(value, 10);
        this.plugin.settings.maxFileSizeMB = isNaN(num) ? 50 : Math.max(1, num);
        this.plugin.queueSaveSettings();
      })
    );
    new import_obsidian5.Setting(containerEl).setName("Parallel transfers").setDesc(
      "How many files to transfer at once. Higher is faster on large vaults; lower it if Yandex Disk starts rate-limiting."
    ).addSlider(
      (slider) => slider.setLimits(MIN_CONCURRENCY, MAX_CONCURRENCY, 1).setValue(this.plugin.settings.concurrency).setDynamicTooltip().onChange((value) => {
        this.plugin.settings.concurrency = value;
        this.plugin.queueSaveSettings();
      })
    );
    new import_obsidian5.Setting(containerEl).setName("Keep screen on during long syncs").setDesc(
      "On iOS a locked screen suspends Obsidian and freezes the sync. This holds the screen awake for syncs of 50 files or more; short syncs are unaffected."
    ).addToggle(
      (toggle) => toggle.setValue(this.plugin.settings.keepScreenOn).onChange((value) => {
        this.plugin.settings.keepScreenOn = value;
        this.plugin.queueSaveSettings();
      })
    );
    new import_obsidian5.Setting(containerEl).setName("Reset sync state").setDesc("Next sync will be a full comparison").addButton(
      (btn) => btn.setButtonText("Reset").setWarning().onClick((evt) => {
        this.plugin.stateManager.resetState();
        void this.plugin.saveSettings();
        btn.setButtonText("Done!");
        window.setTimeout(() => {
          btn.setButtonText("Reset");
        }, 2e3);
      })
    );
  }
};

// src/main.ts
var DEBOUNCE_DELAY = 5e3;
var POST_SYNC_QUIET_MS = 1e4;
var SETTINGS_SAVE_DELAY = 400;
var AUTO_FULL_SYNC_MS = 10 * 60 * 1e3;
var NO_REVISION_MIN_INTERVAL_MS = 60 * 1e3;
var FULL_SCAN_MAX_AGE_MS = 10 * 60 * 1e3;
var YaDiskSyncPlugin = class extends import_obsidian6.Plugin {
  constructor() {
    super(...arguments);
    this.settings = DEFAULT_SETTINGS;
    this.client = null;
    this.stateManager = null;
    this.statusBarEl = null;
    this.autoSyncIntervalId = null;
    this.syncInProgress = false;
    this.currentEngine = null;
    this.debouncedSyncTimer = null;
    this.lastSyncEndedAt = 0;
    this.lastRevision = null;
    this.revisionSupported = true;
    this.lastFullSyncAt = 0;
    this.lastFullScanAt = 0;
    this.autoTickInFlight = false;
    this.wakeLock = null;
    /**
     * Settings live in the same file as the snapshots, which run to megabytes
     * on a large vault. Writing on every keystroke in the settings tab would
     * re-serialize all of it each time.
     */
    this.saveSettingsSoon = debounce(() => {
      void this.saveSettings();
    }, SETTINGS_SAVE_DELAY);
  }
  async onload() {
    var _a2, _b2, _c;
    const data = await this.loadData();
    this.settings = Object.assign({}, DEFAULT_SETTINGS, (_a2 = data == null ? void 0 : data.settings) != null ? _a2 : {});
    this.settings.concurrency = clampConcurrency(this.settings.concurrency);
    const legacyMinutes = (_b2 = data == null ? void 0 : data.settings) == null ? void 0 : _b2.autoSyncInterval;
    if (((_c = data == null ? void 0 : data.settings) == null ? void 0 : _c.autoSyncSeconds) === void 0 && typeof legacyMinutes === "number") {
      this.settings.autoSyncSeconds = Math.max(0, legacyMinutes) * 60;
    }
    delete this.settings.autoSyncInterval;
    this.client = new YandexDiskClient(
      this.settings.accessToken,
      this.settings.remotePath,
      this.settings.refreshToken,
      this.settings.tokenExpiresAt
    );
    this.client.onTokenRefresh((accessToken, refreshToken, expiresAt) => {
      this.settings.accessToken = accessToken;
      this.settings.refreshToken = refreshToken;
      this.settings.tokenExpiresAt = expiresAt;
      void this.saveSettings();
    });
    this.stateManager = new SyncStateManager(this.app);
    if (data) {
      this.stateManager.loadFromData(data);
    }
    this.addSettingTab(new YaDiskSyncSettingTab(this.app, this));
    this.addRibbonIcon("refresh-cw", "Sync vault", () => {
      void this.runSync();
    });
    this.addCommand({
      id: "sync-now",
      name: "Sync now",
      callback: () => void this.runSync()
    });
    this.addCommand({
      id: "push-all",
      name: "Push all",
      callback: () => void this.runSync("push" /* Push */)
    });
    this.addCommand({
      id: "pull-all",
      name: "Pull all",
      callback: () => void this.runSync("pull" /* Pull */)
    });
    this.addCommand({
      id: "abort-sync",
      name: "Abort sync",
      callback: () => this.abortSync()
    });
    this.statusBarEl = this.addStatusBarItem();
    this.updateStatusBar("idle");
    this.setupAutoSync();
    this.registerDomEvent(document, "visibilitychange", () => {
      if (document.visibilityState !== "visible")
        return;
      if (this.settings.autoSyncSeconds <= 0)
        return;
      void this.autoSyncTick();
    });
    this.registerEvent(this.app.vault.on("create", (file) => this.onFileChange(file)));
    this.registerEvent(this.app.vault.on("modify", (file) => this.onFileChange(file)));
    this.registerEvent(this.app.vault.on("delete", (file) => this.onFileChange(file)));
    this.registerEvent(this.app.vault.on("rename", (file) => this.onFileChange(file)));
    if (this.settings.syncOnStartup && this.settings.accessToken) {
      window.setTimeout(() => {
        void this.runSync(void 0, "auto");
      }, 3e3);
    }
  }
  onunload() {
    if (this.autoSyncIntervalId !== null) {
      window.clearInterval(this.autoSyncIntervalId);
    }
    if (this.debouncedSyncTimer !== null) {
      window.clearTimeout(this.debouncedSyncTimer);
    }
  }
  onFileChange(file) {
    if (!this.settings.accessToken)
      return;
    if (this.isQuietPeriod())
      return;
    if (matchesExcludePattern(file.path, this.settings.excludePatterns))
      return;
    if (this.debouncedSyncTimer !== null) {
      window.clearTimeout(this.debouncedSyncTimer);
    }
    this.debouncedSyncTimer = window.setTimeout(() => {
      this.debouncedSyncTimer = null;
      if (this.isQuietPeriod())
        return;
      void this.runSync(void 0, "auto");
    }, DEBOUNCE_DELAY);
  }
  isQuietPeriod() {
    return this.syncInProgress || Date.now() - this.lastSyncEndedAt < POST_SYNC_QUIET_MS;
  }
  async saveSettings() {
    const stateData = this.stateManager ? this.stateManager.getDataToSave() : {};
    await this.saveData({
      settings: this.settings,
      ...stateData
    });
    if (this.client) {
      this.client.setToken(this.settings.accessToken);
      this.client.setRemotePath(this.settings.remotePath);
      this.client.setRefreshToken(this.settings.refreshToken, this.settings.tokenExpiresAt);
    }
  }
  /** Debounced write, for settings-tab edits. */
  queueSaveSettings() {
    this.saveSettingsSoon();
  }
  setupAutoSync() {
    if (this.autoSyncIntervalId !== null) {
      window.clearInterval(this.autoSyncIntervalId);
      this.autoSyncIntervalId = null;
    }
    if (this.settings.autoSyncSeconds > 0 && this.settings.accessToken) {
      const ms = this.settings.autoSyncSeconds * 1e3;
      this.autoSyncIntervalId = this.registerInterval(
        window.setInterval(() => {
          void this.autoSyncTick();
        }, ms)
      );
    }
  }
  /**
   * Decides whether the tick is worth a full sync.
   *
   * Polling every few seconds is only affordable because the disk revision
   * answers "did anything change" in a single request; a full scan of a large
   * vault costs hundreds and takes longer than the interval itself.
   */
  async autoSyncTick() {
    if (!this.settings.accessToken)
      return;
    if (this.autoTickInFlight || this.syncInProgress || this.isQuietPeriod())
      return;
    this.autoTickInFlight = true;
    try {
      const sinceFullSync = Date.now() - this.lastFullSyncAt;
      if (sinceFullSync >= AUTO_FULL_SYNC_MS) {
        await this.runSync(void 0, "auto");
        return;
      }
      const probe = await this.probeRemote();
      if (probe === "unchanged")
        return;
      if (probe === "unknown" && sinceFullSync < NO_REVISION_MIN_INTERVAL_MS)
        return;
      await this.runSync(void 0, "auto", false);
    } finally {
      this.autoTickInFlight = false;
    }
  }
  /**
   * Asks the disk revision whether the stored remote snapshot is still
   * accurate. "unknown" means the question could not be answered, which is
   * never treated as "unchanged".
   */
  async probeRemote() {
    if (!this.revisionSupported || this.lastRevision === null)
      return "unknown";
    if (Date.now() - this.lastFullScanAt >= FULL_SCAN_MAX_AGE_MS)
      return "changed";
    try {
      const revision = await this.client.getDiskRevision();
      if (revision === null) {
        this.revisionSupported = false;
        return "unknown";
      }
      return revision === this.lastRevision ? "unchanged" : "changed";
    } catch (e) {
      return "unknown";
    }
  }
  async runSync(directionOverride, trigger = "manual", remoteUnchangedHint) {
    if (this.syncInProgress) {
      if (trigger === "manual")
        new import_obsidian6.Notice("Sync already in progress");
      return;
    }
    if (!this.settings.accessToken) {
      new import_obsidian6.Notice("Authorize in plugin settings first");
      return;
    }
    this.syncInProgress = true;
    this.updateStatusBar("syncing", 0, 0);
    const engine = new SyncEngine(this.app, this.client, this.stateManager, this.settings);
    this.currentEngine = engine;
    const progress = new SyncProgress(() => {
      engine.abort();
      progress.message("Cancelling\u2026");
    });
    progress.open();
    try {
      const remoteUnchanged = remoteUnchangedHint != null ? remoteUnchangedHint : await this.probeRemote() === "unchanged";
      const stats = await engine.run(directionOverride, {
        reporter: progress,
        checkpoint: () => this.saveSettings(),
        remoteUnchanged,
        onPlanReady: (total) => {
          if (total >= WAKE_LOCK_MIN_ITEMS)
            void this.acquireWakeLock();
        }
      });
      await this.saveSettings();
      this.reportResult(stats, trigger);
      this.lastFullSyncAt = Date.now();
      if (!remoteUnchanged && !stats.aborted)
        this.lastFullScanAt = Date.now();
      if (this.revisionSupported && !stats.aborted) {
        try {
          this.lastRevision = await this.client.getDiskRevision();
        } catch (e) {
        }
      }
    } catch (e) {
      console.error("[YaDisk Sync] Sync error:", e);
      new import_obsidian6.Notice(`Sync error: ${e instanceof Error ? e.message : String(e)}`);
      this.updateStatusBar("error");
    } finally {
      progress.close();
      this.releaseWakeLock();
      this.syncInProgress = false;
      this.lastSyncEndedAt = Date.now();
      this.currentEngine = null;
    }
  }
  /**
   * Keeps the screen awake for the duration of a long sync.
   *
   * iOS suspends the app when the screen locks, which freezes a transfer
   * mid-run; on a first sync of thousands of files the auto-lock timer will
   * otherwise fire long before the sync finishes. Best effort only — the API
   * is absent on most desktop setups and may refuse.
   */
  async acquireWakeLock() {
    if (!this.settings.keepScreenOn || this.wakeLock)
      return;
    const nav = navigator;
    if (!nav.wakeLock)
      return;
    try {
      this.wakeLock = await nav.wakeLock.request("screen");
    } catch (e) {
    }
  }
  releaseWakeLock() {
    const lock = this.wakeLock;
    this.wakeLock = null;
    if (lock)
      void lock.release().catch(() => void 0);
  }
  reportResult(stats, trigger) {
    const moved = stats.uploaded + stats.downloaded + stats.deleted;
    const counts = `up:${stats.uploaded} down:${stats.downloaded} del:${stats.deleted}`;
    if (stats.aborted) {
      new import_obsidian6.Notice(`Sync cancelled. ${counts}`);
      this.updateStatusBar("idle");
      return;
    }
    if (stats.errors > 0) {
      new import_obsidian6.Notice(`Sync done with errors. ${counts} err:${stats.errors}`);
      this.updateStatusBar("error");
      return;
    }
    this.updateStatusBar("idle");
    if (moved > 0) {
      new import_obsidian6.Notice(`Sync complete. ${counts}`);
      return;
    }
    if (trigger === "manual")
      new import_obsidian6.Notice("Sync complete. Already up to date");
  }
  abortSync() {
    if (this.currentEngine) {
      this.currentEngine.abort();
      new import_obsidian6.Notice("Stopping sync\u2026");
    } else {
      new import_obsidian6.Notice("No sync is running");
    }
  }
  updateStatusBar(status, current, total) {
    if (!this.statusBarEl)
      return;
    switch (status) {
      case "idle":
        this.statusBarEl.setText("Synced");
        break;
      case "syncing":
        if (current !== void 0 && total !== void 0 && total > 0) {
          this.statusBarEl.setText(`Syncing ${current}/${total}`);
        } else {
          this.statusBarEl.setText("Scanning...");
        }
        break;
      case "error":
        this.statusBarEl.setText("Sync error");
        break;
    }
  }
};
function clampConcurrency(value) {
  if (!Number.isFinite(value))
    return DEFAULT_SETTINGS.concurrency;
  return Math.min(MAX_CONCURRENCY, Math.max(MIN_CONCURRENCY, Math.round(value)));
}
