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
var import_obsidian5 = require("obsidian");

// src/types.ts
var DEFAULT_SETTINGS = {
  accessToken: "",
  refreshToken: "",
  tokenExpiresAt: 0,
  remotePath: "/ObsidianVault",
  syncDirection: "bidirectional" /* Bidirectional */,
  conflictStrategy: "newer_wins" /* NewerWins */,
  autoSyncInterval: 0,
  excludePatterns: [
    ".trash/**"
  ],
  maxFileSizeMB: 50,
  syncOnStartup: false
};

// src/yandex-client.ts
var import_obsidian = require("obsidian");

// src/utils.ts
function normalizePath(p) {
  return p.replace(/\\/g, "/").replace(/\/+/g, "/").replace(/\/$/, "");
}
function isoToTimestamp(iso) {
  return new Date(iso).getTime();
}
function sortByDepthAsc(paths) {
  return [...paths].sort((a, b) => {
    const da = a.split("/").length;
    const db = b.split("/").length;
    return da - db || a.localeCompare(b);
  });
}
function sortByDepthDesc(paths) {
  return [...paths].sort((a, b) => {
    const da = a.split("/").length;
    const db = b.split("/").length;
    return db - da || a.localeCompare(b);
  });
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
var RETRY_CODES = [429, 500, 502, 503, 504];
var YandexDiskClient = class {
  constructor(token, remotePath, refreshTokenValue = "", tokenExpiresAt = 0) {
    this.token = token;
    this.remotePath = remotePath;
    this.refreshTokenValue = refreshTokenValue;
    this.tokenExpiresAt = tokenExpiresAt;
    this.onTokenRefreshed = null;
  }
  setToken(token) {
    this.token = token;
  }
  setRefreshToken(refreshToken, expiresAt) {
    this.refreshTokenValue = refreshToken;
    this.tokenExpiresAt = expiresAt;
  }
  setRemotePath(remotePath) {
    this.remotePath = normalizePath(remotePath);
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
    const prefix = remote + "/";
    if (remotePath.startsWith(prefix)) {
      return remotePath.slice(prefix.length);
    }
    return remotePath;
  }
  async request(params, retries = MAX_RETRIES) {
    await this.ensureValidToken();
    const headers = {
      Authorization: `OAuth ${this.token}`,
      ...params.headers || {}
    };
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const response = await (0, import_obsidian.requestUrl)({
          ...params,
          headers,
          throw: false
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
          const delay = Math.pow(2, attempt) * 1e3;
          await sleep(delay);
          continue;
        }
        throw new Error(
          `Yandex Disk API error: ${response.status} ${response.text || "Unknown error"}`
        );
      } catch (e) {
        if (attempt < retries && e instanceof TypeError) {
          const delay = Math.pow(2, attempt) * 1e3;
          await sleep(delay);
          continue;
        }
        throw e;
      }
    }
    throw new Error("Max retries exceeded");
  }
  async getDiskInfo() {
    const resp = await this.request({ url: API_BASE });
    return resp.json;
  }
  async getResource(path, limit = 0, offset = 0) {
    const params = new URLSearchParams({
      path,
      ...limit > 0 ? { limit: String(limit), offset: String(offset) } : {}
    });
    const resp = await this.request({
      url: `${API_BASE}/resources?${params.toString()}`
    });
    return resp.json;
  }
  async listAllRecursive(folderPath) {
    const records = [];
    const limit = 100;
    const listDir = async (dirPath) => {
      let offset = 0;
      let total = Infinity;
      while (offset < total) {
        const resource = await this.getResource(dirPath, limit, offset);
        if (!resource._embedded)
          break;
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
              md5: item.md5 || ""
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
  async createFolder(path) {
    await this.request({
      url: `${API_BASE}/resources?path=${encodeURIComponent(path)}`,
      method: "PUT"
    });
  }
  async ensureFolderExists(path) {
    const parts = normalizePath(path).split("/").filter(Boolean);
    let current = "";
    for (const part of parts) {
      current += "/" + part;
      try {
        await this.getResource(current);
      } catch (e) {
        try {
          await this.createFolder(current);
        } catch (e2) {
          if (!String(e2).includes("409"))
            throw e2;
        }
      }
    }
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
    await (0, import_obsidian.requestUrl)({
      url: link.href,
      method: "PUT",
      body: data,
      headers: { "Content-Type": "application/octet-stream" },
      throw: true
    });
  }
  async downloadFile(remotePath) {
    const params = new URLSearchParams({ path: remotePath });
    const linkResp = await this.request({
      url: `${API_BASE}/resources/download?${params.toString()}`
    });
    const link = linkResp.json;
    const resp = await (0, import_obsidian.requestUrl)({
      url: link.href,
      method: "GET",
      throw: true
    });
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
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// src/sync-engine.ts
var import_obsidian3 = require("obsidian");

// src/conflict-modal.ts
var import_obsidian2 = require("obsidian");
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
    for (const conflict of this.conflicts) {
      const item = listEl.createDiv({ cls: "yadisk-conflict-item" });
      item.createDiv({ cls: "conflict-path", text: conflict.path });
      const details = item.createDiv({ cls: "conflict-details" });
      const localCol = details.createDiv({ cls: "detail-col" });
      localCol.createDiv({ cls: "detail-label", text: "Local" });
      if (conflict.localRecord) {
        localCol.createEl("div", {
          text: `Size: ${formatSize(conflict.localRecord.size)}`
        });
        localCol.createEl("div", {
          text: `Modified: ${formatDate(conflict.localRecord.mtime)}`
        });
      } else {
        localCol.createEl("div", { text: "Deleted" });
      }
      const remoteCol = details.createDiv({ cls: "detail-col" });
      remoteCol.createDiv({ cls: "detail-label", text: "Remote" });
      if (conflict.remoteRecord) {
        remoteCol.createEl("div", {
          text: `Size: ${formatSize(conflict.remoteRecord.size)}`
        });
        remoteCol.createEl("div", {
          text: `Modified: ${formatDate(conflict.remoteRecord.mtime)}`
        });
      } else {
        remoteCol.createEl("div", { text: "Deleted" });
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
var SyncEngine = class {
  constructor(app, client, stateManager, settings) {
    this.app = app;
    this.client = client;
    this.stateManager = stateManager;
    this.settings = settings;
    this.aborted = false;
  }
  abort() {
    this.aborted = true;
  }
  async run(directionOverride, onProgress) {
    this.aborted = false;
    const direction = directionOverride || this.settings.syncDirection;
    const stats = { uploaded: 0, downloaded: 0, deleted: 0, errors: 0 };
    const prevState = this.stateManager.getState();
    const [localSnapshot, remoteSnapshot] = await Promise.all([
      this.stateManager.buildLocalSnapshot(this.settings, prevState.localSnapshot),
      this.stateManager.buildRemoteSnapshot(this.client, this.settings.remotePath, this.settings)
    ]);
    if (this.aborted)
      return stats;
    let plan = this.buildPlan(
      localSnapshot,
      remoteSnapshot,
      prevState.localSnapshot,
      prevState.remoteSnapshot,
      direction
    );
    if (this.aborted)
      return stats;
    const conflicts = plan.filter((p) => p.action === "conflict" /* Conflict */);
    if (conflicts.length > 0) {
      plan = await this.resolveConflicts(plan, conflicts);
    }
    if (this.aborted)
      return stats;
    const actionItems = plan.filter((p) => p.action !== "skip" /* Skip */);
    const total = actionItems.length;
    let current = 0;
    const creates = actionItems.filter(
      (i) => i.action === "upload_new" /* UploadNew */ || i.action === "download_new" /* DownloadNew */
    );
    const updates = actionItems.filter(
      (i) => i.action === "upload_modified" /* UploadModified */ || i.action === "download_modified" /* DownloadModified */
    );
    const deletes = actionItems.filter(
      (i) => i.action === "delete_local" /* DeleteLocal */ || i.action === "delete_remote" /* DeleteRemote */
    );
    const createPaths = creates.map((i) => i.path);
    const sortedCreates = sortByDepthAsc(createPaths).map(
      (p) => creates.find((i) => i.path === p)
    );
    const deletePaths = deletes.map((i) => i.path);
    const sortedDeletes = sortByDepthDesc(deletePaths).map(
      (p) => deletes.find((i) => i.path === p)
    );
    const ordered = [...sortedCreates, ...updates, ...sortedDeletes];
    for (const item of ordered) {
      if (this.aborted)
        break;
      current++;
      if (onProgress)
        onProgress(current, total);
      try {
        switch (item.action) {
          case "upload_new" /* UploadNew */:
          case "upload_modified" /* UploadModified */:
            await this.executeUpload(item);
            stats.uploaded++;
            break;
          case "download_new" /* DownloadNew */:
          case "download_modified" /* DownloadModified */:
            await this.executeDownload(item);
            stats.downloaded++;
            break;
          case "delete_remote" /* DeleteRemote */:
            await this.executeDeleteRemote(item);
            stats.deleted++;
            break;
          case "delete_local" /* DeleteLocal */:
            await this.executeDeleteLocal(item);
            stats.deleted++;
            break;
        }
      } catch (e) {
        console.error(`[YaDisk Sync] Error processing ${item.path}:`, e);
        stats.errors++;
      }
    }
    if (!this.aborted) {
      const newLocalSnapshot = await this.stateManager.buildLocalSnapshot(
        this.settings,
        localSnapshot
      );
      const newRemoteSnapshot = await this.stateManager.buildRemoteSnapshot(
        this.client,
        this.settings.remotePath,
        this.settings
      );
      this.stateManager.setState({
        lastSyncTime: Date.now(),
        localSnapshot: newLocalSnapshot,
        remoteSnapshot: newRemoteSnapshot
      });
    }
    return stats;
  }
  buildPlan(localCur, remoteCur, localPrev, remotePrev, direction) {
    const plan = [];
    const allPaths = /* @__PURE__ */ new Set([
      ...Object.keys(localCur),
      ...Object.keys(remoteCur),
      ...Object.keys(localPrev),
      ...Object.keys(remotePrev)
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
      if (localNew || localChanged)
        return "upload_new" /* UploadNew */;
      if (localDeleted && remoteExists)
        return "delete_remote" /* DeleteRemote */;
      return "skip" /* Skip */;
    }
    if (direction === "pull" /* Pull */) {
      if (remoteNew || remoteChanged)
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
        await this.app.vault.createFolder(current);
      }
    }
  }
};

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
    if (data.syncState) {
      this.state = data.syncState;
    }
  }
  getDataToSave() {
    return { syncState: this.state };
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
  async buildLocalSnapshot(settings, prevSnapshot) {
    const files = this.app.vault.getFiles();
    const snapshot = {};
    const patterns = this.getEffectiveExcludePatterns(settings);
    for (const file of files) {
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
    return snapshot;
  }
  async buildRemoteSnapshot(client, remotePath, settings) {
    const records = await client.listAllRecursive(remotePath);
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

// src/settings.ts
var import_obsidian4 = require("obsidian");
var YaDiskSyncSettingTab = class extends import_obsidian4.PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }
  display() {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.addClass("yadisk-sync-settings");
    new import_obsidian4.Setting(containerEl).setName("Authorization").setHeading();
    const isAuthorized = !!this.plugin.settings.accessToken;
    if (!isAuthorized) {
      const authSetting = new import_obsidian4.Setting(containerEl).setName("Sign in").setDesc("Click the button, authorize in the browser, and copy the code");
      authSetting.addButton(
        (btn) => btn.setButtonText("Sign in").setCta().onClick(() => {
          const url = this.plugin.client.getAuthUrl();
          window.open(url);
        })
      );
      const codeSetting = new import_obsidian4.Setting(containerEl).setName("Authorization code").setDesc("Paste the code you received after authorization");
      let codeValue = "";
      codeSetting.addText(
        (text) => text.setPlaceholder("Paste code here").onChange((value) => {
          codeValue = value.trim();
        })
      );
      codeSetting.addButton(
        (btn) => btn.setButtonText("Confirm").onClick(async () => {
          if (!codeValue) {
            new import_obsidian4.Notice("Enter the authorization code");
            return;
          }
          try {
            btn.setButtonText("...");
            btn.setDisabled(true);
            await this.plugin.client.exchangeCode(codeValue);
            new import_obsidian4.Notice("Authorization successful");
            await this.plugin.saveSettings();
            this.display();
          } catch (e) {
            new import_obsidian4.Notice(`Error: ${e instanceof Error ? e.message : String(e)}`);
            btn.setButtonText("Confirm");
            btn.setDisabled(false);
          }
        })
      );
    } else {
      new import_obsidian4.Setting(containerEl).setName("Account").setDesc("Authorized").addButton(
        (btn) => btn.setButtonText("Check connection").onClick(async () => {
          var _a2, _b2;
          try {
            const info = await this.plugin.client.getDiskInfo();
            const login = ((_a2 = info.user) == null ? void 0 : _a2.display_name) || ((_b2 = info.user) == null ? void 0 : _b2.login) || "\u2014";
            const freeGB = ((info.total_space - info.used_space) / (1024 * 1024 * 1024)).toFixed(2);
            new import_obsidian4.Notice(`${login} \u2014 ${freeGB} GB free`);
          } catch (e) {
            new import_obsidian4.Notice(`Error: ${e instanceof Error ? e.message : String(e)}`);
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
    new import_obsidian4.Setting(containerEl).setName("Synchronization").setHeading();
    new import_obsidian4.Setting(containerEl).setName("Remote folder").addText(
      (text) => text.setPlaceholder("/vault").setValue(this.plugin.settings.remotePath).onChange(async (value) => {
        this.plugin.settings.remotePath = value.trim() || DEFAULT_SETTINGS.remotePath;
        await this.plugin.saveSettings();
        this.plugin.client.setRemotePath(this.plugin.settings.remotePath);
      })
    );
    new import_obsidian4.Setting(containerEl).setName("Direction").addDropdown(
      (dd) => dd.addOption("bidirectional" /* Bidirectional */, "Bidirectional").addOption("push" /* Push */, "Push only").addOption("pull" /* Pull */, "Pull only").setValue(this.plugin.settings.syncDirection).onChange(async (value) => {
        this.plugin.settings.syncDirection = value;
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian4.Setting(containerEl).setName("Conflict strategy").addDropdown(
      (dd) => dd.addOption("newer_wins" /* NewerWins */, "Newer wins").addOption("local_wins" /* LocalWins */, "Local wins").addOption("remote_wins" /* RemoteWins */, "Remote wins").addOption("ask" /* Ask */, "Ask").setValue(this.plugin.settings.conflictStrategy).onChange(async (value) => {
        this.plugin.settings.conflictStrategy = value;
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian4.Setting(containerEl).setName("Auto-sync interval (minutes)").setDesc("0 = disabled").addText(
      (text) => text.setPlaceholder("0").setValue(String(this.plugin.settings.autoSyncInterval)).onChange(async (value) => {
        const num = parseInt(value, 10);
        this.plugin.settings.autoSyncInterval = isNaN(num) ? 0 : Math.max(0, num);
        await this.plugin.saveSettings();
        this.plugin.setupAutoSync();
      })
    );
    new import_obsidian4.Setting(containerEl).setName("Sync on startup").addToggle(
      (toggle) => toggle.setValue(this.plugin.settings.syncOnStartup).onChange(async (value) => {
        this.plugin.settings.syncOnStartup = value;
        await this.plugin.saveSettings();
      })
    );
    const configDir = this.app.vault.configDir;
    new import_obsidian4.Setting(containerEl).setName("Exclude patterns").setDesc("One pattern per line").addTextArea(
      (ta) => ta.setPlaceholder(`${configDir}/workspace*.json
.trash/**`).setValue(this.plugin.settings.excludePatterns.join("\n")).then((t) => {
        t.inputEl.rows = 5;
        t.inputEl.addClass("yadisk-textarea-wide");
      }).onChange(async (value) => {
        this.plugin.settings.excludePatterns = value.split("\n").map((s) => s.trim()).filter(Boolean);
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian4.Setting(containerEl).setName("Max file size (mb)").addText(
      (text) => text.setPlaceholder("50").setValue(String(this.plugin.settings.maxFileSizeMB)).onChange(async (value) => {
        const num = parseInt(value, 10);
        this.plugin.settings.maxFileSizeMB = isNaN(num) ? 50 : Math.max(1, num);
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian4.Setting(containerEl).setName("Reset sync state").setDesc("Next sync will be a full comparison").addButton(
      (btn) => btn.setButtonText("Reset").setWarning().onClick((evt) => {
        this.plugin.stateManager.resetState();
        void this.plugin.saveSettings();
        btn.setButtonText("Done!");
        setTimeout(() => btn.setButtonText("Reset"), 2e3);
      })
    );
  }
};

// src/main.ts
var DEBOUNCE_DELAY = 5e3;
var YaDiskSyncPlugin = class extends import_obsidian5.Plugin {
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
  }
  async onload() {
    await this.loadSettings();
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
    const data = await this.loadData();
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
    this.registerEvent(this.app.vault.on("create", (file) => this.onFileChange(file)));
    this.registerEvent(this.app.vault.on("modify", (file) => this.onFileChange(file)));
    this.registerEvent(this.app.vault.on("delete", (file) => this.onFileChange(file)));
    this.registerEvent(this.app.vault.on("rename", (file) => this.onFileChange(file)));
    if (this.settings.syncOnStartup && this.settings.accessToken) {
      setTimeout(() => void this.runSync(), 3e3);
    }
  }
  onunload() {
    if (this.autoSyncIntervalId !== null) {
      window.clearInterval(this.autoSyncIntervalId);
    }
    if (this.debouncedSyncTimer !== null) {
      clearTimeout(this.debouncedSyncTimer);
    }
  }
  onFileChange(file) {
    if (!this.settings.accessToken)
      return;
    if (matchesExcludePattern(file.path, this.settings.excludePatterns))
      return;
    if (this.debouncedSyncTimer !== null) {
      clearTimeout(this.debouncedSyncTimer);
    }
    this.debouncedSyncTimer = setTimeout(() => {
      this.debouncedSyncTimer = null;
      void this.runSync();
    }, DEBOUNCE_DELAY);
  }
  async loadSettings() {
    const data = await this.loadData();
    this.settings = Object.assign({}, DEFAULT_SETTINGS, (data == null ? void 0 : data.settings) || {});
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
  setupAutoSync() {
    if (this.autoSyncIntervalId !== null) {
      window.clearInterval(this.autoSyncIntervalId);
      this.autoSyncIntervalId = null;
    }
    if (this.settings.autoSyncInterval > 0 && this.settings.accessToken) {
      const ms = this.settings.autoSyncInterval * 60 * 1e3;
      this.autoSyncIntervalId = this.registerInterval(
        window.setInterval(() => void this.runSync(), ms)
      );
    }
  }
  async runSync(directionOverride) {
    if (this.syncInProgress)
      return;
    if (!this.settings.accessToken) {
      new import_obsidian5.Notice("Authorize in plugin settings first");
      return;
    }
    this.syncInProgress = true;
    this.updateStatusBar("syncing", 0, 0);
    const engine = new SyncEngine(this.app, this.client, this.stateManager, this.settings);
    this.currentEngine = engine;
    try {
      const stats = await engine.run(directionOverride, (current, total) => {
        this.updateStatusBar("syncing", current, total);
      });
      await this.saveSettings();
      if (stats.errors > 0) {
        new import_obsidian5.Notice(
          `Sync done with errors. up:${stats.uploaded} down:${stats.downloaded} del:${stats.deleted} err:${stats.errors}`
        );
        this.updateStatusBar("error");
      } else if (stats.uploaded + stats.downloaded + stats.deleted > 0) {
        new import_obsidian5.Notice(
          `Sync complete. up:${stats.uploaded} down:${stats.downloaded} del:${stats.deleted}`
        );
        this.updateStatusBar("idle");
      } else {
        this.updateStatusBar("idle");
      }
    } catch (e) {
      console.error("[YaDisk Sync] Sync error:", e);
      new import_obsidian5.Notice(`Sync error: ${e instanceof Error ? e.message : String(e)}`);
      this.updateStatusBar("error");
    } finally {
      this.syncInProgress = false;
      this.currentEngine = null;
    }
  }
  abortSync() {
    if (this.currentEngine) {
      this.currentEngine.abort();
      new import_obsidian5.Notice("Sync aborted");
      this.updateStatusBar("idle");
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
