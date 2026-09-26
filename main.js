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
var import_obsidian11 = require("obsidian");

// src/types.ts
var PROGRESS_DELAY_MS = 2e4;
var MIN_CONCURRENCY = 1;
var MAX_CONCURRENCY = 8;
var MIN_SCAN_CONCURRENCY = 1;
var MAX_SCAN_CONCURRENCY = 24;
var DEFAULT_SETTINGS = {
  accessToken: "",
  refreshToken: "",
  tokenExpiresAt: 0,
  remotePath: "/ObsidianVault",
  syncDirection: "bidirectional" /* Bidirectional */,
  conflictStrategy: "newer_wins" /* NewerWins */,
  autoSyncSeconds: 60,
  excludePatterns: [
    ".trash/**"
  ],
  maxFileSizeMB: 50,
  syncOnStartup: true,
  concurrency: 4,
  scanConcurrency: 12,
  keepScreenOn: true,
  statusBarCounts: false,
  progressDisplay: "never" /* Never */,
  deleteConfirmThreshold: 50,
  language: "auto" /* Auto */
};
var WAKE_LOCK_MIN_ITEMS = 50;
var PERSISTED_STATE_VERSION = 2;

// src/yandex-client.ts
var import_obsidian2 = require("obsidian");

// src/i18n.ts
var import_obsidian = require("obsidian");
var en = {
  "language.name": "Language",
  "language.desc": "Language of the plugin's settings and sync queue.",
  "language.auto": "Same as Obsidian",
  "auth.heading": "Authorization",
  "auth.signIn": "Sign in",
  "auth.signInDesc": "Click the button, authorize in the browser, and copy the code",
  "auth.code": "Authorization code",
  "auth.codeDesc": "Paste the code you received after authorization",
  "auth.codePlaceholder": "Paste code here",
  "auth.confirm": "Confirm",
  "auth.enterCode": "Enter the authorization code",
  "auth.success": "Authorization successful",
  "auth.account": "Account",
  "auth.authorized": "Authorized",
  "auth.check": "Check connection",
  "auth.free": "{login} \u2014 {free} GB free",
  "auth.signOut": "Sign out",
  "error": "Error: {message}",
  "sync.heading": "Synchronization",
  "remote.name": "Remote folder",
  "remote.desc": "Takes effect once you finish editing. A different folder is synced as if for the first time, so switching never deletes anything.",
  "direction.name": "Direction",
  "direction.bidirectional": "Bidirectional",
  "direction.push": "Push only",
  "direction.pull": "Pull only",
  "conflict.name": "Conflict strategy",
  "conflict.newer": "Newer wins",
  "conflict.local": "Local wins",
  "conflict.remote": "Remote wins",
  "conflict.ask": "Ask",
  "deletions.name": "Ask before large deletions",
  "deletions.desc": "A sync that would delete this many files on one side, or a quarter of them, pauses and asks first. Renamed and moved files don't count.",
  "deletions.files": "{count} files",
  "interval.name": "Auto-sync interval",
  "interval.desc": "How often to check Yandex Disk for changes. The check itself is a single request, so short intervals are cheap \u2014 but a change found on a large vault still takes a full scan to apply. Edits you make here sync 5 seconds after you stop typing, regardless of this setting.",
  "interval.off": "Off",
  "interval.seconds": "Every {count} seconds",
  "interval.minute": "Every minute",
  "interval.minutes": "Every {count} minutes",
  "interval.hour": "Every hour",
  "startup.name": "Sync on startup",
  "exclude.name": "Exclude patterns",
  "exclude.desc": "One pattern per line",
  "maxSize.name": "Max file size (mb)",
  "concurrency.name": "Parallel transfers",
  "concurrency.desc": "How many files to upload or download at once. Higher is faster on large vaults; lower it if Yandex Disk starts rate-limiting.",
  "scanConcurrency.name": "Parallel folder scans",
  "scanConcurrency.desc": "How many folders on Yandex Disk to read at once when looking for changes. Each folder is one quick request, so a large vault is checked much faster with more of them; lower it if Yandex Disk starts rate-limiting.",
  "progress.name": "Show sync progress",
  "progress.desc": 'Most syncs carry a single edited note and are over in seconds. "Only for long syncs" brings the indicator up once a sync has been running for 20 seconds, so a long one still shows it is working; by default it stays hidden, and the queue panel shows the same. The "Show sync status" command brings it up at any time, and the sync icon opens the full queue.',
  "progress.delayed": "Only for long syncs",
  "progress.always": "Always",
  "progress.never": "Never",
  "statusCounts.name": "Remaining files in the status bar",
  "statusCounts.desc": "During a sync, show how many files are left to upload, download and delete, with small icons. The queue panel shows them regardless. Desktop only: there is no status bar on mobile.",
  "screen.name": "Keep screen on during long syncs",
  "screen.desc": "On iOS a locked screen suspends Obsidian and freezes the sync. This holds the screen awake for syncs of 50 files or more; short syncs are unaffected.",
  "fullSync.name": "Full sync",
  "fullSync.desc": "Reads all of Yandex Disk again and re-checks every file in the vault, trusting nothing saved. For when a change made elsewhere has not arrived; slow on a large vault. The sync button is the quick one: it skips reading Yandex Disk when the disk reports no changes.",
  "fullSync.button": "Sync fully",
  "reset.name": "Reset sync state",
  "reset.desc": "Forgets what has been synced. The next sync brings both sides together without deleting anything: a file deleted on one side comes back from the other, and files that differ become conflicts.",
  "reset.button": "Reset",
  "reset.done": "Done!",
  "compare.caption": "How they differ",
  "compare.full": "Full sync",
  "compare.reset": "Reset",
  "compare.starts": "Starts a sync",
  "compare.starts.full": "right away",
  "compare.starts.reset": "no, changes the next one",
  "compare.memory": "Memory of the last sync",
  "compare.memory.full": "kept",
  "compare.memory.reset": "erased",
  "compare.deletions": "Deletions",
  "compare.deletions.full": "carried over",
  "compare.deletions.reset": "not carried over; deleted files come back",
  "compare.edits": "Edits",
  "compare.edits.full": "carried over as usual",
  "compare.edits.reset": "every difference is a conflict",
  "compare.rereads": "Re-reads Yandex Disk and the vault",
  "compare.rereads.full": "yes",
  "compare.rereads.reset": "yes, on the next sync",
  "ribbon.sync": "Sync with Yandex Disk",
  "button.sync": "Sync now",
  "phase.scanning": "Scanning",
  "phase.comparing": "Comparing",
  "phase.uploading": "Uploading",
  "phase.downloading": "Downloading",
  "phase.deleting": "Deleting",
  "scan.line": "Scanning \u2014 {detail}",
  "scan.vault": "vault {done}/{total}",
  "scan.disk": "disk {dirs} folders, {files} files",
  "scan.diskUnchanged": "disk unchanged",
  "progress.starting": "Starting sync\u2026",
  "progress.cancelling": "Cancelling\u2026",
  "progress.failed": "{count} failed",
  "progress.lastError": "Last error: {path} \u2014 {message}",
  "status.synced": "Synced",
  "status.scanning": "Looking for changes\u2026",
  "status.progress": "Syncing {done}/{total}",
  "status.error": "Sync error",
  "status.paused": "Sync paused",
  "queue.title": "Sync queue",
  "queue.idle": "Nothing is syncing",
  "queue.scanning": "Looking for changes\u2026",
  "queue.progress": "{done} of {total} done",
  "queue.paused": "Sync is paused",
  "queue.cancel": "Cancel",
  "queue.review": "Review",
  "queue.syncNow": "Sync now",
  "queue.now": "Now ({count})",
  "queue.next": "Next ({count})",
  "queue.more": "\u2026and {count} more",
  "queue.local.created": "Created here",
  "queue.local.modified": "Edited here",
  "queue.local.deleted": "Deleted here",
  "queue.local.renamed": "Renamed or moved here",
  "queue.nextCheck": "Next check of Yandex Disk in {seconds} s",
  "queue.historyCount": "Done ({count})",
  "queue.historyLatest": "Done \xB7 last {count}",
  "queue.failedCount": "{count} failed",
  "queue.group.uploadNew": "Upload: new",
  "queue.group.uploadModified": "Upload: changed",
  "queue.group.downloadNew": "Download: new",
  "queue.group.downloadModified": "Download: changed",
  "queue.group.deleteRemote": "Delete on Yandex Disk",
  "queue.group.deleteLocal": "Delete here",
  "queue.action.upload": "Upload to Yandex Disk",
  "queue.action.download": "Download from Yandex Disk",
  "queue.action.deleteRemote": "Delete on Yandex Disk",
  "queue.action.deleteLocal": "Delete here",
  "queue.action.conflict": "Conflict",
  "queue.action.skip": "Skip",
  "pause.title": "Sync paused",
  "pause.untouched": "Nothing was changed on Yandex Disk.",
  "pause.partial": "The sync stopped partway through. What it had already synced is kept, and nothing it couldn't verify was deleted.",
  "pause.checkAgain": "Check again",
  "pause.keepPaused": "Keep paused",
  "pause.notice.partial": "It stopped partway through; nothing it couldn't verify was deleted.",
  "pause.notice.storage": "Sync paused: the vault folder can't be read. {untouched}",
  "pause.notice.staleList": "Sync paused: Obsidian's file list doesn't match the disk. Restart Obsidian. {untouched}",
  "pause.notice.remoteMissing": "Sync paused: {path} was not found on Yandex Disk. Nothing was deleted in this vault.",
  "pause.notice.massBoth": "Sync paused: files went missing both here and on Yandex Disk. Nothing was deleted.",
  "pause.notice.massLocal": "Sync paused: {count} of {total} files are missing from this vault. Nothing was deleted on Yandex Disk.",
  "pause.notice.massRemote": "Sync paused: {count} of {total} files were removed from Yandex Disk. Nothing was deleted in this vault.",
  "pause.storage.what": "The vault folder can't be read. Was the drive it is on disconnected?",
  "pause.storage.todo": "Reconnect the drive and restart Obsidian. The sync picks up where it left off.",
  "pause.staleList.what": "Obsidian's list of files no longer matches the disk: files it considers deleted are still there. This happens when the drive holding the vault is reconnected while Obsidian is running.",
  "pause.staleList.todo": "Restart Obsidian so that it reads the vault again. Still on disk:",
  "pause.remoteMissing.what": "The folder {path} was not found on Yandex Disk, although the last sync saw files in it. Nothing was deleted in this vault.",
  "pause.remoteMissing.todo": "If it was renamed or moved, point the remote folder setting at its new place. To create it again from this vault, start over: everything here is uploaded, and nothing is deleted anywhere.",
  "pause.startOver": "Start over: upload this vault",
  "pause.mass.local": "{count} of {total} files are missing from this vault since the last sync. Syncing now would delete them from Yandex Disk as well.",
  "pause.mass.remote": "{count} of {total} files were removed from Yandex Disk since the last sync. Syncing now would delete them from this vault as well.",
  "pause.mass.approvedEarlier": "{count} files you approved earlier will be deleted too.",
  "pause.mass.nothingYet": "Nothing has been deleted yet. Restoring copies the files back from the side that still has them. Renamed and moved files are not counted here.",
  "pause.mass.applyAll": "Apply these deletions",
  "pause.mass.deleteRemote": "Delete on Yandex Disk too",
  "pause.mass.deleteLocal": "Delete in this vault too",
  "pause.mass.restore": "Restore files",
  "command.syncNow": "Sync now",
  "command.syncFull": "Full sync: read Yandex Disk and the vault again",
  "command.pushAll": "Push all",
  "command.pullAll": "Pull all",
  "command.abort": "Abort sync",
  "command.showQueue": "Show sync queue",
  "command.showStatus": "Show sync status",
  "notice.authorizeFirst": "Authorize in plugin settings first",
  "notice.vaultLoading": "The vault is still loading. Try again in a moment.",
  "notice.syncError": "Sync error: {message}",
  "notice.stopping": "Stopping sync\u2026",
  "notice.noSync": "No sync is running",
  "result.counts": "uploaded {up}, downloaded {down}, deleted {del}",
  "result.kept": ", kept {count}",
  "result.errors": ", errors {count}",
  "result.cancelled": "Sync cancelled: {counts}.",
  "result.gaveUp": "Sync stopped: {count} files in a row failed.",
  "result.withErrors": "Sync done with errors:",
  "result.complete": "Sync complete: {counts}.",
  "result.upToDate": "Sync complete. Already up to date",
  "conflict.title": "Sync conflicts ({count})",
  "conflict.sideLocal": "Here",
  "conflict.sideRemote": "On Yandex Disk",
  "conflict.size": "Size: {size}",
  "conflict.modified": "Modified: {date}",
  "conflict.deleted": "Deleted",
  "conflict.keepLocal": "Keep this one",
  "conflict.keepRemote": "Keep Yandex Disk's",
  "conflict.skip": "Skip",
  "conflict.hidden": "{count} more conflicts are not listed. Choose what to do with them:",
  "conflict.allLocal": "All from here",
  "conflict.allRemote": "All from Yandex Disk",
  "conflict.skipAll": "Skip all",
  "conflict.apply": "Apply",
  "size.bytes": "{n} B",
  "size.kb": "{n} KB",
  "size.mb": "{n} MB",
  "error.localMissing": "Local file not found: {path}",
  "error.oauth": "Authorization error: {status}",
  "error.noRefreshToken": "The sign-in has expired. Sign in again in the plugin settings.",
  "error.tokenRefresh": "Could not renew the sign-in: {status}",
  "error.maxRetries": "Yandex Disk did not respond after several attempts"
};
var ru = {
  "language.name": "\u042F\u0437\u044B\u043A",
  "language.desc": "\u042F\u0437\u044B\u043A \u043D\u0430\u0441\u0442\u0440\u043E\u0435\u043A \u043F\u043B\u0430\u0433\u0438\u043D\u0430 \u0438 \u043E\u0447\u0435\u0440\u0435\u0434\u0438 \u0441\u0438\u043D\u0445\u0440\u043E\u043D\u0438\u0437\u0430\u0446\u0438\u0438.",
  "language.auto": "\u041A\u0430\u043A \u0432 Obsidian",
  "auth.heading": "\u0410\u0432\u0442\u043E\u0440\u0438\u0437\u0430\u0446\u0438\u044F",
  "auth.signIn": "\u0412\u043E\u0439\u0442\u0438",
  "auth.signInDesc": "\u041D\u0430\u0436\u043C\u0438\u0442\u0435 \u043A\u043D\u043E\u043F\u043A\u0443, \u0430\u0432\u0442\u043E\u0440\u0438\u0437\u0443\u0439\u0442\u0435\u0441\u044C \u0432 \u0431\u0440\u0430\u0443\u0437\u0435\u0440\u0435 \u0438 \u0441\u043A\u043E\u043F\u0438\u0440\u0443\u0439\u0442\u0435 \u043A\u043E\u0434",
  "auth.code": "\u041A\u043E\u0434 \u0430\u0432\u0442\u043E\u0440\u0438\u0437\u0430\u0446\u0438\u0438",
  "auth.codeDesc": "\u0412\u0441\u0442\u0430\u0432\u044C\u0442\u0435 \u043A\u043E\u0434, \u043F\u043E\u043B\u0443\u0447\u0435\u043D\u043D\u044B\u0439 \u043F\u043E\u0441\u043B\u0435 \u0430\u0432\u0442\u043E\u0440\u0438\u0437\u0430\u0446\u0438\u0438",
  "auth.codePlaceholder": "\u0412\u0441\u0442\u0430\u0432\u044C\u0442\u0435 \u043A\u043E\u0434",
  "auth.confirm": "\u041F\u043E\u0434\u0442\u0432\u0435\u0440\u0434\u0438\u0442\u044C",
  "auth.enterCode": "\u0412\u0432\u0435\u0434\u0438\u0442\u0435 \u043A\u043E\u0434 \u0430\u0432\u0442\u043E\u0440\u0438\u0437\u0430\u0446\u0438\u0438",
  "auth.success": "\u0410\u0432\u0442\u043E\u0440\u0438\u0437\u0430\u0446\u0438\u044F \u043F\u0440\u043E\u0448\u043B\u0430 \u0443\u0441\u043F\u0435\u0448\u043D\u043E",
  "auth.account": "\u0410\u043A\u043A\u0430\u0443\u043D\u0442",
  "auth.authorized": "\u0410\u0432\u0442\u043E\u0440\u0438\u0437\u043E\u0432\u0430\u043D",
  "auth.check": "\u041F\u0440\u043E\u0432\u0435\u0440\u0438\u0442\u044C \u043F\u043E\u0434\u043A\u043B\u044E\u0447\u0435\u043D\u0438\u0435",
  "auth.free": "{login} \u2014 \u0441\u0432\u043E\u0431\u043E\u0434\u043D\u043E {free} \u0413\u0411",
  "auth.signOut": "\u0412\u044B\u0439\u0442\u0438",
  "error": "\u041E\u0448\u0438\u0431\u043A\u0430: {message}",
  "sync.heading": "\u0421\u0438\u043D\u0445\u0440\u043E\u043D\u0438\u0437\u0430\u0446\u0438\u044F",
  "remote.name": "\u041F\u0430\u043F\u043A\u0430 \u043D\u0430 \u0414\u0438\u0441\u043A\u0435",
  "remote.desc": "\u041F\u0440\u0438\u043C\u0435\u043D\u044F\u0435\u0442\u0441\u044F, \u043A\u043E\u0433\u0434\u0430 \u0432\u044B \u0437\u0430\u043A\u043E\u043D\u0447\u0438\u0442\u0435 \u0432\u0432\u043E\u0434. \u0414\u0440\u0443\u0433\u0430\u044F \u043F\u0430\u043F\u043A\u0430 \u0441\u0438\u043D\u0445\u0440\u043E\u043D\u0438\u0437\u0438\u0440\u0443\u0435\u0442\u0441\u044F \u043A\u0430\u043A \u0432 \u043F\u0435\u0440\u0432\u044B\u0439 \u0440\u0430\u0437, \u043F\u043E\u044D\u0442\u043E\u043C\u0443 \u0441\u043C\u0435\u043D\u0430 \u043F\u0430\u043F\u043A\u0438 \u043D\u0438\u0447\u0435\u0433\u043E \u043D\u0435 \u0443\u0434\u0430\u043B\u044F\u0435\u0442.",
  "direction.name": "\u041D\u0430\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u0438\u0435",
  "direction.bidirectional": "\u0412 \u043E\u0431\u0435 \u0441\u0442\u043E\u0440\u043E\u043D\u044B",
  "direction.push": "\u0422\u043E\u043B\u044C\u043A\u043E \u043E\u0442\u043F\u0440\u0430\u0432\u043A\u0430",
  "direction.pull": "\u0422\u043E\u043B\u044C\u043A\u043E \u0437\u0430\u0433\u0440\u0443\u0437\u043A\u0430",
  "conflict.name": "\u041F\u0440\u0438 \u043A\u043E\u043D\u0444\u043B\u0438\u043A\u0442\u0435",
  "conflict.newer": "\u041F\u043E\u0431\u0435\u0436\u0434\u0430\u0435\u0442 \u043D\u043E\u0432\u0435\u0435",
  "conflict.local": "\u041F\u043E\u0431\u0435\u0436\u0434\u0430\u0435\u0442 \u043B\u043E\u043A\u0430\u043B\u044C\u043D\u044B\u0439",
  "conflict.remote": "\u041F\u043E\u0431\u0435\u0436\u0434\u0430\u0435\u0442 \u0441 \u0414\u0438\u0441\u043A\u0430",
  "conflict.ask": "\u0421\u043F\u0440\u0430\u0448\u0438\u0432\u0430\u0442\u044C",
  "deletions.name": "\u0421\u043F\u0440\u0430\u0448\u0438\u0432\u0430\u0442\u044C \u043F\u0435\u0440\u0435\u0434 \u043C\u0430\u0441\u0441\u043E\u0432\u044B\u043C \u0443\u0434\u0430\u043B\u0435\u043D\u0438\u0435\u043C",
  "deletions.desc": "\u0421\u0438\u043D\u0445\u0440\u043E\u043D\u0438\u0437\u0430\u0446\u0438\u044F, \u043A\u043E\u0442\u043E\u0440\u0430\u044F \u0443\u0434\u0430\u043B\u0438\u043B\u0430 \u0431\u044B \u0441\u0442\u043E\u043B\u044C\u043A\u043E \u0444\u0430\u0439\u043B\u043E\u0432 \u043D\u0430 \u043E\u0434\u043D\u043E\u0439 \u0441\u0442\u043E\u0440\u043E\u043D\u0435 \u0438\u043B\u0438 \u0447\u0435\u0442\u0432\u0435\u0440\u0442\u044C \u043E\u0442 \u043D\u0438\u0445, \u043E\u0441\u0442\u0430\u043D\u0430\u0432\u043B\u0438\u0432\u0430\u0435\u0442\u0441\u044F \u0438 \u0441\u043D\u0430\u0447\u0430\u043B\u0430 \u0441\u043F\u0440\u0430\u0448\u0438\u0432\u0430\u0435\u0442. \u041F\u0435\u0440\u0435\u0438\u043C\u0435\u043D\u043E\u0432\u0430\u043D\u043D\u044B\u0435 \u0438 \u043F\u0435\u0440\u0435\u043C\u0435\u0449\u0451\u043D\u043D\u044B\u0435 \u0444\u0430\u0439\u043B\u044B \u043D\u0435 \u0441\u0447\u0438\u0442\u0430\u044E\u0442\u0441\u044F.",
  "deletions.files": "{count} \u0444\u0430\u0439\u043B\u043E\u0432",
  "interval.name": "\u0418\u043D\u0442\u0435\u0440\u0432\u0430\u043B \u0430\u0432\u0442\u043E\u0441\u0438\u043D\u0445\u0440\u043E\u043D\u0438\u0437\u0430\u0446\u0438\u0438",
  "interval.desc": "\u041A\u0430\u043A \u0447\u0430\u0441\u0442\u043E \u043F\u0440\u043E\u0432\u0435\u0440\u044F\u0442\u044C \u042F\u043D\u0434\u0435\u043A\u0441 \u0414\u0438\u0441\u043A \u043D\u0430 \u0438\u0437\u043C\u0435\u043D\u0435\u043D\u0438\u044F. \u0421\u0430\u043C\u0430 \u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0430 \u2014 \u043E\u0434\u0438\u043D \u0437\u0430\u043F\u0440\u043E\u0441, \u043F\u043E\u044D\u0442\u043E\u043C\u0443 \u043A\u043E\u0440\u043E\u0442\u043A\u0438\u0435 \u0438\u043D\u0442\u0435\u0440\u0432\u0430\u043B\u044B \u0434\u0451\u0448\u0435\u0432\u044B, \u043D\u043E \u043D\u0430\u0439\u0434\u0435\u043D\u043D\u043E\u0435 \u0438\u0437\u043C\u0435\u043D\u0435\u043D\u0438\u0435 \u0432 \u0431\u043E\u043B\u044C\u0448\u043E\u043C \u0445\u0440\u0430\u043D\u0438\u043B\u0438\u0449\u0435 \u0432\u0441\u0451 \u0440\u0430\u0432\u043D\u043E \u0442\u0440\u0435\u0431\u0443\u0435\u0442 \u043F\u043E\u043B\u043D\u043E\u0433\u043E \u043E\u0431\u0445\u043E\u0434\u0430. \u041F\u0440\u0430\u0432\u043A\u0438, \u0441\u0434\u0435\u043B\u0430\u043D\u043D\u044B\u0435 \u0437\u0434\u0435\u0441\u044C, \u0441\u0438\u043D\u0445\u0440\u043E\u043D\u0438\u0437\u0438\u0440\u0443\u044E\u0442\u0441\u044F \u0447\u0435\u0440\u0435\u0437 5 \u0441\u0435\u043A\u0443\u043D\u0434 \u043F\u043E\u0441\u043B\u0435 \u0442\u043E\u0433\u043E, \u043A\u0430\u043A \u0432\u044B \u043F\u0435\u0440\u0435\u0441\u0442\u0430\u043B\u0438 \u043F\u0435\u0447\u0430\u0442\u0430\u0442\u044C, \u043D\u0435\u0437\u0430\u0432\u0438\u0441\u0438\u043C\u043E \u043E\u0442 \u044D\u0442\u043E\u0439 \u043D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438.",
  "interval.off": "\u0412\u044B\u043A\u043B\u044E\u0447\u0435\u043D\u043E",
  "interval.seconds": "\u041A\u0430\u0436\u0434\u044B\u0435 {count} \u0441\u0435\u043A\u0443\u043D\u0434",
  "interval.minute": "\u041A\u0430\u0436\u0434\u0443\u044E \u043C\u0438\u043D\u0443\u0442\u0443",
  "interval.minutes": "\u041A\u0430\u0436\u0434\u044B\u0435 {count} \u043C\u0438\u043D",
  "interval.hour": "\u041A\u0430\u0436\u0434\u044B\u0439 \u0447\u0430\u0441",
  "startup.name": "\u0421\u0438\u043D\u0445\u0440\u043E\u043D\u0438\u0437\u0438\u0440\u043E\u0432\u0430\u0442\u044C \u043F\u0440\u0438 \u0437\u0430\u043F\u0443\u0441\u043A\u0435",
  "exclude.name": "\u0418\u0441\u043A\u043B\u044E\u0447\u0435\u043D\u0438\u044F",
  "exclude.desc": "\u041F\u043E \u043E\u0434\u043D\u043E\u043C\u0443 \u0448\u0430\u0431\u043B\u043E\u043D\u0443 \u043D\u0430 \u0441\u0442\u0440\u043E\u043A\u0443",
  "maxSize.name": "\u041C\u0430\u043A\u0441\u0438\u043C\u0430\u043B\u044C\u043D\u044B\u0439 \u0440\u0430\u0437\u043C\u0435\u0440 \u0444\u0430\u0439\u043B\u0430 (\u041C\u0411)",
  "concurrency.name": "\u041F\u0430\u0440\u0430\u043B\u043B\u0435\u043B\u044C\u043D\u044B\u0435 \u043F\u0435\u0440\u0435\u0434\u0430\u0447\u0438",
  "concurrency.desc": "\u0421\u043A\u043E\u043B\u044C\u043A\u043E \u0444\u0430\u0439\u043B\u043E\u0432 \u043E\u0442\u043F\u0440\u0430\u0432\u043B\u044F\u0442\u044C \u0438\u043B\u0438 \u0441\u043A\u0430\u0447\u0438\u0432\u0430\u0442\u044C \u043E\u0434\u043D\u043E\u0432\u0440\u0435\u043C\u0435\u043D\u043D\u043E. \u0411\u043E\u043B\u044C\u0448\u0435 \u2014 \u0431\u044B\u0441\u0442\u0440\u0435\u0435 \u043D\u0430 \u0431\u043E\u043B\u044C\u0448\u0438\u0445 \u0445\u0440\u0430\u043D\u0438\u043B\u0438\u0449\u0430\u0445; \u0443\u043C\u0435\u043D\u044C\u0448\u0438\u0442\u0435, \u0435\u0441\u043B\u0438 \u042F\u043D\u0434\u0435\u043A\u0441 \u0414\u0438\u0441\u043A \u043D\u0430\u0447\u043D\u0451\u0442 \u043E\u0433\u0440\u0430\u043D\u0438\u0447\u0438\u0432\u0430\u0442\u044C \u0437\u0430\u043F\u0440\u043E\u0441\u044B.",
  "scanConcurrency.name": "\u041F\u0430\u0440\u0430\u043B\u043B\u0435\u043B\u044C\u043D\u044B\u0439 \u043E\u043F\u0440\u043E\u0441 \u043F\u0430\u043F\u043E\u043A",
  "scanConcurrency.desc": "\u0421\u043A\u043E\u043B\u044C\u043A\u043E \u043F\u0430\u043F\u043E\u043A \u043D\u0430 \u042F\u043D\u0434\u0435\u043A\u0441 \u0414\u0438\u0441\u043A\u0435 \u0447\u0438\u0442\u0430\u0442\u044C \u043E\u0434\u043D\u043E\u0432\u0440\u0435\u043C\u0435\u043D\u043D\u043E \u043F\u0440\u0438 \u043F\u043E\u0438\u0441\u043A\u0435 \u0438\u0437\u043C\u0435\u043D\u0435\u043D\u0438\u0439. \u041A\u0430\u0436\u0434\u0430\u044F \u043F\u0430\u043F\u043A\u0430 \u2014 \u043E\u0434\u0438\u043D \u0431\u044B\u0441\u0442\u0440\u044B\u0439 \u0437\u0430\u043F\u0440\u043E\u0441, \u043F\u043E\u044D\u0442\u043E\u043C\u0443 \u0431\u043E\u043B\u044C\u0448\u043E\u0435 \u0445\u0440\u0430\u043D\u0438\u043B\u0438\u0449\u0435 \u043F\u0440\u043E\u0432\u0435\u0440\u044F\u0435\u0442\u0441\u044F \u0437\u0430\u043C\u0435\u0442\u043D\u043E \u0431\u044B\u0441\u0442\u0440\u0435\u0435; \u0443\u043C\u0435\u043D\u044C\u0448\u0438\u0442\u0435, \u0435\u0441\u043B\u0438 \u042F\u043D\u0434\u0435\u043A\u0441 \u0414\u0438\u0441\u043A \u043D\u0430\u0447\u043D\u0451\u0442 \u043E\u0433\u0440\u0430\u043D\u0438\u0447\u0438\u0432\u0430\u0442\u044C \u0437\u0430\u043F\u0440\u043E\u0441\u044B.",
  "progress.name": "\u041F\u043E\u043A\u0430\u0437\u044B\u0432\u0430\u0442\u044C \u043F\u0440\u043E\u0433\u0440\u0435\u0441\u0441",
  "progress.desc": "\u041E\u0431\u044B\u0447\u043D\u043E \u0441\u0438\u043D\u0445\u0440\u043E\u043D\u0438\u0437\u0430\u0446\u0438\u044F \u043F\u0435\u0440\u0435\u043D\u043E\u0441\u0438\u0442 \u043E\u0434\u043D\u0443 \u043E\u0442\u0440\u0435\u0434\u0430\u043A\u0442\u0438\u0440\u043E\u0432\u0430\u043D\u043D\u0443\u044E \u0437\u0430\u043C\u0435\u0442\u043A\u0443 \u0438 \u0437\u0430\u043D\u0438\u043C\u0430\u0435\u0442 \u0441\u0435\u043A\u0443\u043D\u0434\u044B. \u0412\u0430\u0440\u0438\u0430\u043D\u0442 \xAB\u0422\u043E\u043B\u044C\u043A\u043E \u0434\u043B\u044F \u0434\u043E\u043B\u0433\u0438\u0445\xBB \u043F\u043E\u043A\u0430\u0437\u044B\u0432\u0430\u0435\u0442 \u0438\u043D\u0434\u0438\u043A\u0430\u0442\u043E\u0440, \u0435\u0441\u043B\u0438 \u0441\u0438\u043D\u0445\u0440\u043E\u043D\u0438\u0437\u0430\u0446\u0438\u044F \u0438\u0434\u0451\u0442 \u0434\u043E\u043B\u044C\u0448\u0435 20 \u0441\u0435\u043A\u0443\u043D\u0434, \u0447\u0442\u043E\u0431\u044B \u0434\u043B\u0438\u043D\u043D\u0430\u044F \u0432\u0441\u0451 \u0436\u0435 \u043F\u043E\u043A\u0430\u0437\u044B\u0432\u0430\u043B\u0430, \u0447\u0442\u043E \u0440\u0430\u0431\u043E\u0442\u0430\u0435\u0442; \u043F\u043E \u0443\u043C\u043E\u043B\u0447\u0430\u043D\u0438\u044E \u043E\u043D \u0441\u043A\u0440\u044B\u0442, \u0430 \u0442\u043E \u0436\u0435 \u0441\u0430\u043C\u043E\u0435 \u0432\u0438\u0434\u043D\u043E \u0432 \u043F\u0430\u043D\u0435\u043B\u0438 \u043E\u0447\u0435\u0440\u0435\u0434\u0438. \u041A\u043E\u043C\u0430\u043D\u0434\u0430 \xAB\u041F\u043E\u043A\u0430\u0437\u0430\u0442\u044C \u0445\u043E\u0434 \u0441\u0438\u043D\u0445\u0440\u043E\u043D\u0438\u0437\u0430\u0446\u0438\u0438\xBB \u043F\u043E\u043A\u0430\u0436\u0435\u0442 \u0435\u0433\u043E \u0432 \u043B\u044E\u0431\u043E\u0439 \u043C\u043E\u043C\u0435\u043D\u0442, \u0430 \u0437\u043D\u0430\u0447\u043E\u043A \u0441\u0438\u043D\u0445\u0440\u043E\u043D\u0438\u0437\u0430\u0446\u0438\u0438 \u043E\u0442\u043A\u0440\u044B\u0432\u0430\u0435\u0442 \u0432\u0441\u044E \u043E\u0447\u0435\u0440\u0435\u0434\u044C.",
  "progress.delayed": "\u0422\u043E\u043B\u044C\u043A\u043E \u0434\u043B\u044F \u0434\u043E\u043B\u0433\u0438\u0445",
  "progress.always": "\u0412\u0441\u0435\u0433\u0434\u0430",
  "progress.never": "\u041D\u0438\u043A\u043E\u0433\u0434\u0430",
  "statusCounts.name": "\u041E\u0441\u0442\u0430\u0442\u043E\u043A \u0432 \u0441\u0442\u0440\u043E\u043A\u0435 \u0441\u043E\u0441\u0442\u043E\u044F\u043D\u0438\u044F",
  "statusCounts.desc": "\u0412\u043E \u0432\u0440\u0435\u043C\u044F \u0441\u0438\u043D\u0445\u0440\u043E\u043D\u0438\u0437\u0430\u0446\u0438\u0438 \u043F\u043E\u043A\u0430\u0437\u044B\u0432\u0430\u0442\u044C, \u0441\u043A\u043E\u043B\u044C\u043A\u043E \u0444\u0430\u0439\u043B\u043E\u0432 \u043E\u0441\u0442\u0430\u043B\u043E\u0441\u044C \u043E\u0442\u043F\u0440\u0430\u0432\u0438\u0442\u044C, \u0441\u043A\u0430\u0447\u0430\u0442\u044C \u0438 \u0443\u0434\u0430\u043B\u0438\u0442\u044C, \u043C\u0430\u043B\u0435\u043D\u044C\u043A\u0438\u043C\u0438 \u0437\u043D\u0430\u0447\u043A\u0430\u043C\u0438. \u0412 \u043F\u0430\u043D\u0435\u043B\u0438 \u043E\u0447\u0435\u0440\u0435\u0434\u0438 \u043E\u043D\u0438 \u0432\u0438\u0434\u043D\u044B \u0432 \u043B\u044E\u0431\u043E\u043C \u0441\u043B\u0443\u0447\u0430\u0435. \u0422\u043E\u043B\u044C\u043A\u043E \u043D\u0430 \u043A\u043E\u043C\u043F\u044C\u044E\u0442\u0435\u0440\u0435: \u043D\u0430 \u0442\u0435\u043B\u0435\u0444\u043E\u043D\u0435 \u0441\u0442\u0440\u043E\u043A\u0438 \u0441\u043E\u0441\u0442\u043E\u044F\u043D\u0438\u044F \u043D\u0435\u0442.",
  "screen.name": "\u041D\u0435 \u0433\u0430\u0441\u0438\u0442\u044C \u044D\u043A\u0440\u0430\u043D \u043F\u0440\u0438 \u0434\u043E\u043B\u0433\u043E\u0439 \u0441\u0438\u043D\u0445\u0440\u043E\u043D\u0438\u0437\u0430\u0446\u0438\u0438",
  "screen.desc": "\u041D\u0430 iOS \u0431\u043B\u043E\u043A\u0438\u0440\u043E\u0432\u043A\u0430 \u044D\u043A\u0440\u0430\u043D\u0430 \u043F\u0440\u0438\u043E\u0441\u0442\u0430\u043D\u0430\u0432\u043B\u0438\u0432\u0430\u0435\u0442 Obsidian \u0438 \u0437\u0430\u043C\u043E\u0440\u0430\u0436\u0438\u0432\u0430\u0435\u0442 \u0441\u0438\u043D\u0445\u0440\u043E\u043D\u0438\u0437\u0430\u0446\u0438\u044E. \u042D\u0442\u0430 \u043D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0430 \u043D\u0435 \u0434\u0430\u0451\u0442 \u044D\u043A\u0440\u0430\u043D\u0443 \u043F\u043E\u0433\u0430\u0441\u043D\u0443\u0442\u044C \u043F\u0440\u0438 \u0441\u0438\u043D\u0445\u0440\u043E\u043D\u0438\u0437\u0430\u0446\u0438\u0438 \u043E\u0442 50 \u0444\u0430\u0439\u043B\u043E\u0432; \u043A\u043E\u0440\u043E\u0442\u043A\u0438\u0435 \u043D\u0435 \u0437\u0430\u0442\u0440\u0430\u0433\u0438\u0432\u0430\u044E\u0442\u0441\u044F.",
  "fullSync.name": "\u041F\u043E\u043B\u043D\u0430\u044F \u0441\u0438\u043D\u0445\u0440\u043E\u043D\u0438\u0437\u0430\u0446\u0438\u044F",
  "fullSync.desc": "\u0417\u0430\u043D\u043E\u0432\u043E \u0447\u0438\u0442\u0430\u0435\u0442 \u0432\u0435\u0441\u044C \u042F\u043D\u0434\u0435\u043A\u0441 \u0414\u0438\u0441\u043A \u0438 \u043F\u0435\u0440\u0435\u043F\u0440\u043E\u0432\u0435\u0440\u044F\u0435\u0442 \u043A\u0430\u0436\u0434\u044B\u0439 \u0444\u0430\u0439\u043B \u0445\u0440\u0430\u043D\u0438\u043B\u0438\u0449\u0430, \u043D\u0435 \u043F\u043E\u043B\u0430\u0433\u0430\u044F\u0441\u044C \u043D\u0430 \u0441\u043E\u0445\u0440\u0430\u043D\u0451\u043D\u043D\u043E\u0435. \u041D\u0443\u0436\u043D\u0430, \u0435\u0441\u043B\u0438 \u0438\u0437\u043C\u0435\u043D\u0435\u043D\u0438\u0435 \u0441 \u0434\u0440\u0443\u0433\u043E\u0433\u043E \u0443\u0441\u0442\u0440\u043E\u0439\u0441\u0442\u0432\u0430 \u043D\u0435 \u043F\u0440\u0438\u0448\u043B\u043E; \u043D\u0430 \u0431\u043E\u043B\u044C\u0448\u043E\u043C \u0445\u0440\u0430\u043D\u0438\u043B\u0438\u0449\u0435 \u0438\u0434\u0451\u0442 \u0434\u043E\u043B\u0433\u043E. \u041A\u043D\u043E\u043F\u043A\u0430 \u0441\u0438\u043D\u0445\u0440\u043E\u043D\u0438\u0437\u0430\u0446\u0438\u0438 \u2014 \u0431\u044B\u0441\u0442\u0440\u0430\u044F: \u0435\u0441\u043B\u0438 \u0414\u0438\u0441\u043A \u0441\u043E\u043E\u0431\u0449\u0430\u0435\u0442, \u0447\u0442\u043E \u0438\u0437\u043C\u0435\u043D\u0435\u043D\u0438\u0439 \u043D\u0435\u0442, \u043E\u043D\u0430 \u0435\u0433\u043E \u043D\u0435 \u043F\u0435\u0440\u0435\u0447\u0438\u0442\u044B\u0432\u0430\u0435\u0442.",
  "fullSync.button": "\u0421\u0438\u043D\u0445\u0440\u043E\u043D\u0438\u0437\u0438\u0440\u043E\u0432\u0430\u0442\u044C \u043F\u043E\u043B\u043D\u043E\u0441\u0442\u044C\u044E",
  "reset.name": "\u0421\u0431\u0440\u043E\u0441\u0438\u0442\u044C \u0441\u043E\u0441\u0442\u043E\u044F\u043D\u0438\u0435 \u0441\u0438\u043D\u0445\u0440\u043E\u043D\u0438\u0437\u0430\u0446\u0438\u0438",
  "reset.desc": "\u0417\u0430\u0431\u044B\u0432\u0430\u0435\u0442, \u0447\u0442\u043E \u0431\u044B\u043B\u043E \u0441\u0438\u043D\u0445\u0440\u043E\u043D\u0438\u0437\u0438\u0440\u043E\u0432\u0430\u043D\u043E. \u0421\u043B\u0435\u0434\u0443\u044E\u0449\u0430\u044F \u0441\u0438\u043D\u0445\u0440\u043E\u043D\u0438\u0437\u0430\u0446\u0438\u044F \u0441\u0432\u0435\u0434\u0451\u0442 \u043E\u0431\u0435 \u0441\u0442\u043E\u0440\u043E\u043D\u044B, \u043D\u0438\u0447\u0435\u0433\u043E \u043D\u0435 \u0443\u0434\u0430\u043B\u044F\u044F: \u0443\u0434\u0430\u043B\u0451\u043D\u043D\u043E\u0435 \u043D\u0430 \u043E\u0434\u043D\u043E\u0439 \u0441\u0442\u043E\u0440\u043E\u043D\u0435 \u0432\u0435\u0440\u043D\u0451\u0442\u0441\u044F \u0441\u043E \u0432\u0442\u043E\u0440\u043E\u0439, \u0430 \u0440\u0430\u0437\u043B\u0438\u0447\u0430\u044E\u0449\u0438\u0435\u0441\u044F \u0444\u0430\u0439\u043B\u044B \u0441\u0442\u0430\u043D\u0443\u0442 \u043A\u043E\u043D\u0444\u043B\u0438\u043A\u0442\u0430\u043C\u0438.",
  "reset.button": "\u0421\u0431\u0440\u043E\u0441\u0438\u0442\u044C",
  "reset.done": "\u0413\u043E\u0442\u043E\u0432\u043E!",
  "compare.caption": "\u0427\u0435\u043C \u043E\u043D\u0438 \u043E\u0442\u043B\u0438\u0447\u0430\u044E\u0442\u0441\u044F",
  "compare.full": "\u041F\u043E\u043B\u043D\u0430\u044F \u0441\u0438\u043D\u0445\u0440\u043E\u043D\u0438\u0437\u0430\u0446\u0438\u044F",
  "compare.reset": "\u0421\u0431\u0440\u043E\u0441",
  "compare.starts": "\u0417\u0430\u043F\u0443\u0441\u043A\u0430\u0435\u0442 \u0441\u0438\u043D\u0445\u0440\u043E\u043D\u0438\u0437\u0430\u0446\u0438\u044E",
  "compare.starts.full": "\u0441\u0440\u0430\u0437\u0443",
  "compare.starts.reset": "\u043D\u0435\u0442, \u043C\u0435\u043D\u044F\u0435\u0442 \u0441\u043B\u0435\u0434\u0443\u044E\u0449\u0443\u044E",
  "compare.memory": "\u041F\u0430\u043C\u044F\u0442\u044C \u043E \u043F\u0440\u043E\u0448\u043B\u043E\u0439 \u0441\u0438\u043D\u0445\u0440\u043E\u043D\u0438\u0437\u0430\u0446\u0438\u0438",
  "compare.memory.full": "\u043E\u0441\u0442\u0430\u0451\u0442\u0441\u044F",
  "compare.memory.reset": "\u0441\u0442\u0438\u0440\u0430\u0435\u0442\u0441\u044F",
  "compare.deletions": "\u0423\u0434\u0430\u043B\u0435\u043D\u0438\u044F",
  "compare.deletions.full": "\u043F\u0435\u0440\u0435\u043D\u043E\u0441\u044F\u0442\u0441\u044F",
  "compare.deletions.reset": "\u043D\u0435 \u043F\u0435\u0440\u0435\u043D\u043E\u0441\u044F\u0442\u0441\u044F, \u0443\u0434\u0430\u043B\u0451\u043D\u043D\u043E\u0435 \u0432\u043E\u0437\u0432\u0440\u0430\u0449\u0430\u0435\u0442\u0441\u044F",
  "compare.edits": "\u041F\u0440\u0430\u0432\u043A\u0438",
  "compare.edits.full": "\u043F\u0435\u0440\u0435\u043D\u043E\u0441\u044F\u0442\u0441\u044F \u043F\u043E \u043E\u0431\u044B\u0447\u043D\u044B\u043C \u043F\u0440\u0430\u0432\u0438\u043B\u0430\u043C",
  "compare.edits.reset": "\u043A\u0430\u0436\u0434\u043E\u0435 \u0440\u0430\u0437\u043B\u0438\u0447\u0438\u0435 \u2014 \u043A\u043E\u043D\u0444\u043B\u0438\u043A\u0442",
  "compare.rereads": "\u041F\u0435\u0440\u0435\u0447\u0438\u0442\u044B\u0432\u0430\u0435\u0442 \u042F\u043D\u0434\u0435\u043A\u0441 \u0414\u0438\u0441\u043A \u0438 \u0445\u0440\u0430\u043D\u0438\u043B\u0438\u0449\u0435",
  "compare.rereads.full": "\u0434\u0430",
  "compare.rereads.reset": "\u0434\u0430, \u043F\u0440\u0438 \u0441\u043B\u0435\u0434\u0443\u044E\u0449\u0435\u0439",
  "ribbon.sync": "\u0421\u0438\u043D\u0445\u0440\u043E\u043D\u0438\u0437\u0430\u0446\u0438\u044F \u0441 \u042F\u043D\u0434\u0435\u043A\u0441 \u0414\u0438\u0441\u043A\u043E\u043C",
  "button.sync": "\u0421\u0438\u043D\u0445\u0440\u043E\u043D\u0438\u0437\u0438\u0440\u043E\u0432\u0430\u0442\u044C \u0441\u0435\u0439\u0447\u0430\u0441",
  "phase.scanning": "\u041F\u043E\u0438\u0441\u043A \u0438\u0437\u043C\u0435\u043D\u0435\u043D\u0438\u0439",
  "phase.comparing": "\u0421\u0440\u0430\u0432\u043D\u0435\u043D\u0438\u0435",
  "phase.uploading": "\u041E\u0442\u043F\u0440\u0430\u0432\u043A\u0430",
  "phase.downloading": "\u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430",
  "phase.deleting": "\u0423\u0434\u0430\u043B\u0435\u043D\u0438\u0435",
  "scan.line": "\u041F\u043E\u0438\u0441\u043A \u0438\u0437\u043C\u0435\u043D\u0435\u043D\u0438\u0439 \u2014 {detail}",
  "scan.vault": "\u0445\u0440\u0430\u043D\u0438\u043B\u0438\u0449\u0435 {done}/{total}",
  "scan.disk": "\u0414\u0438\u0441\u043A: \u043F\u0430\u043F\u043E\u043A {dirs}, \u0444\u0430\u0439\u043B\u043E\u0432 {files}",
  "scan.diskUnchanged": "\u043D\u0430 \u0414\u0438\u0441\u043A\u0435 \u0431\u0435\u0437 \u0438\u0437\u043C\u0435\u043D\u0435\u043D\u0438\u0439",
  "progress.starting": "\u0417\u0430\u043F\u0443\u0441\u043A \u0441\u0438\u043D\u0445\u0440\u043E\u043D\u0438\u0437\u0430\u0446\u0438\u0438\u2026",
  "progress.cancelling": "\u041E\u0442\u043C\u0435\u043D\u0430\u2026",
  "progress.failed": "\u0441 \u043E\u0448\u0438\u0431\u043A\u043E\u0439: {count}",
  "progress.lastError": "\u041F\u043E\u0441\u043B\u0435\u0434\u043D\u044F\u044F \u043E\u0448\u0438\u0431\u043A\u0430: {path} \u2014 {message}",
  "status.synced": "\u0421\u0438\u043D\u0445\u0440\u043E\u043D\u0438\u0437\u0438\u0440\u043E\u0432\u0430\u043D\u043E",
  "status.scanning": "\u041F\u043E\u0438\u0441\u043A \u0438\u0437\u043C\u0435\u043D\u0435\u043D\u0438\u0439\u2026",
  "status.progress": "\u0421\u0438\u043D\u0445\u0440\u043E\u043D\u0438\u0437\u0430\u0446\u0438\u044F {done}/{total}",
  "status.error": "\u041E\u0448\u0438\u0431\u043A\u0430 \u0441\u0438\u043D\u0445\u0440\u043E\u043D\u0438\u0437\u0430\u0446\u0438\u0438",
  "status.paused": "\u0421\u0438\u043D\u0445\u0440\u043E\u043D\u0438\u0437\u0430\u0446\u0438\u044F \u043D\u0430 \u043F\u0430\u0443\u0437\u0435",
  "queue.title": "\u041E\u0447\u0435\u0440\u0435\u0434\u044C \u0441\u0438\u043D\u0445\u0440\u043E\u043D\u0438\u0437\u0430\u0446\u0438\u0438",
  "queue.idle": "\u0421\u0438\u043D\u0445\u0440\u043E\u043D\u0438\u0437\u0430\u0446\u0438\u044F \u043D\u0435 \u0438\u0434\u0451\u0442",
  "queue.scanning": "\u041F\u043E\u0438\u0441\u043A \u0438\u0437\u043C\u0435\u043D\u0435\u043D\u0438\u0439\u2026",
  "queue.progress": "\u0413\u043E\u0442\u043E\u0432\u043E {done} \u0438\u0437 {total}",
  "queue.paused": "\u0421\u0438\u043D\u0445\u0440\u043E\u043D\u0438\u0437\u0430\u0446\u0438\u044F \u043D\u0430 \u043F\u0430\u0443\u0437\u0435",
  "queue.cancel": "\u041E\u0442\u043C\u0435\u043D\u0438\u0442\u044C",
  "queue.review": "\u041F\u043E\u0441\u043C\u043E\u0442\u0440\u0435\u0442\u044C",
  "queue.syncNow": "\u0421\u0438\u043D\u0445\u0440\u043E\u043D\u0438\u0437\u0438\u0440\u043E\u0432\u0430\u0442\u044C",
  "queue.now": "\u0421\u0435\u0439\u0447\u0430\u0441 ({count})",
  "queue.next": "\u0414\u0430\u043B\u0435\u0435 ({count})",
  "queue.more": "\u2026\u0438 \u0435\u0449\u0451 {count}",
  "queue.local.created": "\u0421\u043E\u0437\u0434\u0430\u043D \u0437\u0434\u0435\u0441\u044C",
  "queue.local.modified": "\u0418\u0437\u043C\u0435\u043D\u0451\u043D \u0437\u0434\u0435\u0441\u044C",
  "queue.local.deleted": "\u0423\u0434\u0430\u043B\u0451\u043D \u0437\u0434\u0435\u0441\u044C",
  "queue.local.renamed": "\u041F\u0435\u0440\u0435\u0438\u043C\u0435\u043D\u043E\u0432\u0430\u043D \u0438\u043B\u0438 \u043F\u0435\u0440\u0435\u043C\u0435\u0449\u0451\u043D \u0437\u0434\u0435\u0441\u044C",
  "queue.nextCheck": "\u0421\u043B\u0435\u0434\u0443\u044E\u0449\u0430\u044F \u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0430 \u042F\u043D\u0434\u0435\u043A\u0441 \u0414\u0438\u0441\u043A\u0430 \u0447\u0435\u0440\u0435\u0437 {seconds} \u0441",
  "queue.historyCount": "\u0413\u043E\u0442\u043E\u0432\u043E ({count})",
  "queue.historyLatest": "\u0413\u043E\u0442\u043E\u0432\u043E \xB7 \u043F\u043E\u0441\u043B\u0435\u0434\u043D\u0438\u0435 {count}",
  "queue.failedCount": "\u0441 \u043E\u0448\u0438\u0431\u043A\u043E\u0439: {count}",
  "queue.group.uploadNew": "\u041E\u0442\u043F\u0440\u0430\u0432\u043A\u0430: \u043D\u043E\u0432\u044B\u0435",
  "queue.group.uploadModified": "\u041E\u0442\u043F\u0440\u0430\u0432\u043A\u0430: \u0438\u0437\u043C\u0435\u043D\u0451\u043D\u043D\u044B\u0435",
  "queue.group.downloadNew": "\u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430: \u043D\u043E\u0432\u044B\u0435",
  "queue.group.downloadModified": "\u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430: \u0438\u0437\u043C\u0435\u043D\u0451\u043D\u043D\u044B\u0435",
  "queue.group.deleteRemote": "\u0423\u0434\u0430\u043B\u0435\u043D\u0438\u0435 \u043D\u0430 \u042F\u043D\u0434\u0435\u043A\u0441 \u0414\u0438\u0441\u043A\u0435",
  "queue.group.deleteLocal": "\u0423\u0434\u0430\u043B\u0435\u043D\u0438\u0435 \u0437\u0434\u0435\u0441\u044C",
  "queue.action.upload": "\u041E\u0442\u043F\u0440\u0430\u0432\u043A\u0430 \u043D\u0430 \u042F\u043D\u0434\u0435\u043A\u0441 \u0414\u0438\u0441\u043A",
  "queue.action.download": "\u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430 \u0441 \u042F\u043D\u0434\u0435\u043A\u0441 \u0414\u0438\u0441\u043A\u0430",
  "queue.action.deleteRemote": "\u0423\u0434\u0430\u043B\u0435\u043D\u0438\u0435 \u043D\u0430 \u042F\u043D\u0434\u0435\u043A\u0441 \u0414\u0438\u0441\u043A\u0435",
  "queue.action.deleteLocal": "\u0423\u0434\u0430\u043B\u0435\u043D\u0438\u0435 \u0437\u0434\u0435\u0441\u044C",
  "queue.action.conflict": "\u041A\u043E\u043D\u0444\u043B\u0438\u043A\u0442",
  "queue.action.skip": "\u041F\u0440\u043E\u043F\u0443\u0441\u043A",
  "pause.title": "\u0421\u0438\u043D\u0445\u0440\u043E\u043D\u0438\u0437\u0430\u0446\u0438\u044F \u043D\u0430 \u043F\u0430\u0443\u0437\u0435",
  "pause.untouched": "\u041D\u0430 \u042F\u043D\u0434\u0435\u043A\u0441 \u0414\u0438\u0441\u043A\u0435 \u043D\u0438\u0447\u0435\u0433\u043E \u043D\u0435 \u0438\u0437\u043C\u0435\u043D\u0435\u043D\u043E.",
  "pause.partial": "\u0421\u0438\u043D\u0445\u0440\u043E\u043D\u0438\u0437\u0430\u0446\u0438\u044F \u043E\u0441\u0442\u0430\u043D\u043E\u0432\u0438\u043B\u0430\u0441\u044C \u043D\u0430 \u0441\u0435\u0440\u0435\u0434\u0438\u043D\u0435. \u0423\u0436\u0435 \u0441\u0438\u043D\u0445\u0440\u043E\u043D\u0438\u0437\u0438\u0440\u043E\u0432\u0430\u043D\u043D\u043E\u0435 \u0441\u043E\u0445\u0440\u0430\u043D\u0435\u043D\u043E, \u0430 \u0442\u043E, \u0447\u0442\u043E \u043D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u043F\u0440\u043E\u0432\u0435\u0440\u0438\u0442\u044C, \u043D\u0435 \u0443\u0434\u0430\u043B\u0435\u043D\u043E.",
  "pause.checkAgain": "\u041F\u0440\u043E\u0432\u0435\u0440\u0438\u0442\u044C \u0441\u043D\u043E\u0432\u0430",
  "pause.keepPaused": "\u041E\u0441\u0442\u0430\u0432\u0438\u0442\u044C \u043D\u0430 \u043F\u0430\u0443\u0437\u0435",
  "pause.notice.partial": "\u041E\u043D\u0430 \u043E\u0441\u0442\u0430\u043D\u043E\u0432\u0438\u043B\u0430\u0441\u044C \u043D\u0430 \u0441\u0435\u0440\u0435\u0434\u0438\u043D\u0435; \u0442\u043E, \u0447\u0442\u043E \u043D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u043F\u0440\u043E\u0432\u0435\u0440\u0438\u0442\u044C, \u043D\u0435 \u0443\u0434\u0430\u043B\u0435\u043D\u043E.",
  "pause.notice.storage": "\u0421\u0438\u043D\u0445\u0440\u043E\u043D\u0438\u0437\u0430\u0446\u0438\u044F \u043D\u0430 \u043F\u0430\u0443\u0437\u0435: \u043F\u0430\u043F\u043A\u0430 \u0445\u0440\u0430\u043D\u0438\u043B\u0438\u0449\u0430 \u043D\u0435 \u0447\u0438\u0442\u0430\u0435\u0442\u0441\u044F. {untouched}",
  "pause.notice.staleList": "\u0421\u0438\u043D\u0445\u0440\u043E\u043D\u0438\u0437\u0430\u0446\u0438\u044F \u043D\u0430 \u043F\u0430\u0443\u0437\u0435: \u0441\u043F\u0438\u0441\u043E\u043A \u0444\u0430\u0439\u043B\u043E\u0432 Obsidian \u043D\u0435 \u0441\u043E\u0432\u043F\u0430\u0434\u0430\u0435\u0442 \u0441 \u0434\u0438\u0441\u043A\u043E\u043C. \u041F\u0435\u0440\u0435\u0437\u0430\u043F\u0443\u0441\u0442\u0438\u0442\u0435 Obsidian. {untouched}",
  "pause.notice.remoteMissing": "\u0421\u0438\u043D\u0445\u0440\u043E\u043D\u0438\u0437\u0430\u0446\u0438\u044F \u043D\u0430 \u043F\u0430\u0443\u0437\u0435: \u043F\u0430\u043F\u043A\u0430 {path} \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u0430 \u043D\u0430 \u042F\u043D\u0434\u0435\u043A\u0441 \u0414\u0438\u0441\u043A\u0435. \u0412 \u0445\u0440\u0430\u043D\u0438\u043B\u0438\u0449\u0435 \u043D\u0438\u0447\u0435\u0433\u043E \u043D\u0435 \u0443\u0434\u0430\u043B\u0435\u043D\u043E.",
  "pause.notice.massBoth": "\u0421\u0438\u043D\u0445\u0440\u043E\u043D\u0438\u0437\u0430\u0446\u0438\u044F \u043D\u0430 \u043F\u0430\u0443\u0437\u0435: \u0444\u0430\u0439\u043B\u044B \u043F\u0440\u043E\u043F\u0430\u043B\u0438 \u0438 \u0437\u0434\u0435\u0441\u044C, \u0438 \u043D\u0430 \u042F\u043D\u0434\u0435\u043A\u0441 \u0414\u0438\u0441\u043A\u0435. \u041D\u0438\u0447\u0435\u0433\u043E \u043D\u0435 \u0443\u0434\u0430\u043B\u0435\u043D\u043E.",
  "pause.notice.massLocal": "\u0421\u0438\u043D\u0445\u0440\u043E\u043D\u0438\u0437\u0430\u0446\u0438\u044F \u043D\u0430 \u043F\u0430\u0443\u0437\u0435: \u0438\u0437 \u0445\u0440\u0430\u043D\u0438\u043B\u0438\u0449\u0430 \u043F\u0440\u043E\u043F\u0430\u043B\u0438 {count} \u0438\u0437 {total} \u0444\u0430\u0439\u043B\u043E\u0432. \u041D\u0430 \u042F\u043D\u0434\u0435\u043A\u0441 \u0414\u0438\u0441\u043A\u0435 \u043D\u0438\u0447\u0435\u0433\u043E \u043D\u0435 \u0443\u0434\u0430\u043B\u0435\u043D\u043E.",
  "pause.notice.massRemote": "\u0421\u0438\u043D\u0445\u0440\u043E\u043D\u0438\u0437\u0430\u0446\u0438\u044F \u043D\u0430 \u043F\u0430\u0443\u0437\u0435: \u0441 \u042F\u043D\u0434\u0435\u043A\u0441 \u0414\u0438\u0441\u043A\u0430 \u0443\u0434\u0430\u043B\u0435\u043D\u044B {count} \u0438\u0437 {total} \u0444\u0430\u0439\u043B\u043E\u0432. \u0412 \u0445\u0440\u0430\u043D\u0438\u043B\u0438\u0449\u0435 \u043D\u0438\u0447\u0435\u0433\u043E \u043D\u0435 \u0443\u0434\u0430\u043B\u0435\u043D\u043E.",
  "pause.storage.what": "\u041F\u0430\u043F\u043A\u0430 \u0445\u0440\u0430\u043D\u0438\u043B\u0438\u0449\u0430 \u043D\u0435 \u0447\u0438\u0442\u0430\u0435\u0442\u0441\u044F. \u0412\u043E\u0437\u043C\u043E\u0436\u043D\u043E, \u0434\u0438\u0441\u043A, \u043D\u0430 \u043A\u043E\u0442\u043E\u0440\u043E\u043C \u043E\u043D\u0430 \u043B\u0435\u0436\u0438\u0442, \u043E\u0442\u043A\u043B\u044E\u0447\u0451\u043D?",
  "pause.storage.todo": "\u041F\u043E\u0434\u043A\u043B\u044E\u0447\u0438\u0442\u0435 \u0434\u0438\u0441\u043A \u0438 \u043F\u0435\u0440\u0435\u0437\u0430\u043F\u0443\u0441\u0442\u0438\u0442\u0435 Obsidian. \u0421\u0438\u043D\u0445\u0440\u043E\u043D\u0438\u0437\u0430\u0446\u0438\u044F \u043F\u0440\u043E\u0434\u043E\u043B\u0436\u0438\u0442\u0441\u044F \u0441 \u0442\u043E\u0433\u043E \u043C\u0435\u0441\u0442\u0430, \u0433\u0434\u0435 \u043E\u0441\u0442\u0430\u043D\u043E\u0432\u0438\u043B\u0430\u0441\u044C.",
  "pause.staleList.what": "\u0421\u043F\u0438\u0441\u043E\u043A \u0444\u0430\u0439\u043B\u043E\u0432 Obsidian \u0431\u043E\u043B\u044C\u0448\u0435 \u043D\u0435 \u0441\u043E\u0432\u043F\u0430\u0434\u0430\u0435\u0442 \u0441 \u0434\u0438\u0441\u043A\u043E\u043C: \u0444\u0430\u0439\u043B\u044B, \u043A\u043E\u0442\u043E\u0440\u044B\u0435 \u043E\u043D \u0441\u0447\u0438\u0442\u0430\u0435\u0442 \u0443\u0434\u0430\u043B\u0451\u043D\u043D\u044B\u043C\u0438, \u043D\u0430 \u043C\u0435\u0441\u0442\u0435. \u0422\u0430\u043A \u0431\u044B\u0432\u0430\u0435\u0442, \u0435\u0441\u043B\u0438 \u0434\u0438\u0441\u043A \u0441 \u0445\u0440\u0430\u043D\u0438\u043B\u0438\u0449\u0435\u043C \u043F\u043E\u0434\u043A\u043B\u044E\u0447\u0438\u043B\u0438 \u043E\u0431\u0440\u0430\u0442\u043D\u043E \u043F\u0440\u0438 \u0437\u0430\u043F\u0443\u0449\u0435\u043D\u043D\u043E\u043C Obsidian.",
  "pause.staleList.todo": "\u041F\u0435\u0440\u0435\u0437\u0430\u043F\u0443\u0441\u0442\u0438\u0442\u0435 Obsidian, \u0447\u0442\u043E\u0431\u044B \u043E\u043D \u0437\u0430\u043D\u043E\u0432\u043E \u043F\u0440\u043E\u0447\u0438\u0442\u0430\u043B \u0445\u0440\u0430\u043D\u0438\u043B\u0438\u0449\u0435. \u0412\u0441\u0451 \u0435\u0449\u0451 \u043D\u0430 \u0434\u0438\u0441\u043A\u0435:",
  "pause.remoteMissing.what": "\u041F\u0430\u043F\u043A\u0430 {path} \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u0430 \u043D\u0430 \u042F\u043D\u0434\u0435\u043A\u0441 \u0414\u0438\u0441\u043A\u0435, \u0445\u043E\u0442\u044F \u043F\u0440\u0438 \u043F\u0440\u043E\u0448\u043B\u043E\u0439 \u0441\u0438\u043D\u0445\u0440\u043E\u043D\u0438\u0437\u0430\u0446\u0438\u0438 \u0432 \u043D\u0435\u0439 \u0431\u044B\u043B\u0438 \u0444\u0430\u0439\u043B\u044B. \u0412 \u0445\u0440\u0430\u043D\u0438\u043B\u0438\u0449\u0435 \u043D\u0438\u0447\u0435\u0433\u043E \u043D\u0435 \u0443\u0434\u0430\u043B\u0435\u043D\u043E.",
  "pause.remoteMissing.todo": "\u0415\u0441\u043B\u0438 \u0435\u0451 \u043F\u0435\u0440\u0435\u0438\u043C\u0435\u043D\u043E\u0432\u0430\u043B\u0438 \u0438\u043B\u0438 \u043F\u0435\u0440\u0435\u043D\u0435\u0441\u043B\u0438, \u0443\u043A\u0430\u0436\u0438\u0442\u0435 \u043D\u043E\u0432\u043E\u0435 \u043C\u0435\u0441\u0442\u043E \u0432 \u043D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0435 \xAB\u041F\u0430\u043F\u043A\u0430 \u043D\u0430 \u0414\u0438\u0441\u043A\u0435\xBB. \u0427\u0442\u043E\u0431\u044B \u0441\u043E\u0437\u0434\u0430\u0442\u044C \u0435\u0451 \u0437\u0430\u043D\u043E\u0432\u043E \u0438\u0437 \u044D\u0442\u043E\u0433\u043E \u0445\u0440\u0430\u043D\u0438\u043B\u0438\u0449\u0430, \u043D\u0430\u0447\u043D\u0438\u0442\u0435 \u0441\u043D\u0430\u0447\u0430\u043B\u0430: \u0432\u0441\u0451 \u043E\u0442\u0441\u044E\u0434\u0430 \u0431\u0443\u0434\u0435\u0442 \u043E\u0442\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u043E, \u0438 \u043D\u0438\u0433\u0434\u0435 \u043D\u0438\u0447\u0435\u0433\u043E \u043D\u0435 \u0443\u0434\u0430\u043B\u0438\u0442\u0441\u044F.",
  "pause.startOver": "\u041D\u0430\u0447\u0430\u0442\u044C \u0441\u043D\u0430\u0447\u0430\u043B\u0430: \u043E\u0442\u043F\u0440\u0430\u0432\u0438\u0442\u044C \u0445\u0440\u0430\u043D\u0438\u043B\u0438\u0449\u0435",
  "pause.mass.local": "\u0421 \u043F\u0440\u043E\u0448\u043B\u043E\u0439 \u0441\u0438\u043D\u0445\u0440\u043E\u043D\u0438\u0437\u0430\u0446\u0438\u0438 \u0438\u0437 \u0445\u0440\u0430\u043D\u0438\u043B\u0438\u0449\u0430 \u043F\u0440\u043E\u043F\u0430\u043B\u0438 {count} \u0438\u0437 {total} \u0444\u0430\u0439\u043B\u043E\u0432. \u0415\u0441\u043B\u0438 \u0441\u0438\u043D\u0445\u0440\u043E\u043D\u0438\u0437\u0438\u0440\u043E\u0432\u0430\u0442\u044C \u0441\u0435\u0439\u0447\u0430\u0441, \u043E\u043D\u0438 \u0443\u0434\u0430\u043B\u044F\u0442\u0441\u044F \u0438 \u0441 \u042F\u043D\u0434\u0435\u043A\u0441 \u0414\u0438\u0441\u043A\u0430.",
  "pause.mass.remote": "\u0421 \u043F\u0440\u043E\u0448\u043B\u043E\u0439 \u0441\u0438\u043D\u0445\u0440\u043E\u043D\u0438\u0437\u0430\u0446\u0438\u0438 \u0441 \u042F\u043D\u0434\u0435\u043A\u0441 \u0414\u0438\u0441\u043A\u0430 \u0443\u0434\u0430\u043B\u0435\u043D\u044B {count} \u0438\u0437 {total} \u0444\u0430\u0439\u043B\u043E\u0432. \u0415\u0441\u043B\u0438 \u0441\u0438\u043D\u0445\u0440\u043E\u043D\u0438\u0437\u0438\u0440\u043E\u0432\u0430\u0442\u044C \u0441\u0435\u0439\u0447\u0430\u0441, \u043E\u043D\u0438 \u0443\u0434\u0430\u043B\u044F\u0442\u0441\u044F \u0438 \u0438\u0437 \u0445\u0440\u0430\u043D\u0438\u043B\u0438\u0449\u0430.",
  "pause.mass.approvedEarlier": "\u0422\u0430\u043A\u0436\u0435 \u0443\u0434\u0430\u043B\u044F\u0442\u0441\u044F \u0444\u0430\u0439\u043B\u044B, \u043A\u043E\u0442\u043E\u0440\u044B\u0435 \u0432\u044B \u0440\u0430\u0437\u0440\u0435\u0448\u0438\u043B\u0438 \u0443\u0434\u0430\u043B\u0438\u0442\u044C \u0440\u0430\u043D\u0435\u0435: {count}.",
  "pause.mass.nothingYet": "\u041F\u043E\u043A\u0430 \u043D\u0438\u0447\u0435\u0433\u043E \u043D\u0435 \u0443\u0434\u0430\u043B\u0435\u043D\u043E. \u0412\u043E\u0441\u0441\u0442\u0430\u043D\u043E\u0432\u043B\u0435\u043D\u0438\u0435 \u0441\u043A\u043E\u043F\u0438\u0440\u0443\u0435\u0442 \u0444\u0430\u0439\u043B\u044B \u043E\u0431\u0440\u0430\u0442\u043D\u043E \u0441\u043E \u0441\u0442\u043E\u0440\u043E\u043D\u044B, \u0433\u0434\u0435 \u043E\u043D\u0438 \u0435\u0449\u0451 \u0435\u0441\u0442\u044C. \u041F\u0435\u0440\u0435\u0438\u043C\u0435\u043D\u043E\u0432\u0430\u043D\u043D\u044B\u0435 \u0438 \u043F\u0435\u0440\u0435\u043C\u0435\u0449\u0451\u043D\u043D\u044B\u0435 \u0444\u0430\u0439\u043B\u044B \u0437\u0434\u0435\u0441\u044C \u043D\u0435 \u0441\u0447\u0438\u0442\u0430\u044E\u0442\u0441\u044F.",
  "pause.mass.applyAll": "\u041F\u0440\u0438\u043C\u0435\u043D\u0438\u0442\u044C \u0443\u0434\u0430\u043B\u0435\u043D\u0438\u044F",
  "pause.mass.deleteRemote": "\u0423\u0434\u0430\u043B\u0438\u0442\u044C \u0438 \u043D\u0430 \u042F\u043D\u0434\u0435\u043A\u0441 \u0414\u0438\u0441\u043A\u0435",
  "pause.mass.deleteLocal": "\u0423\u0434\u0430\u043B\u0438\u0442\u044C \u0438 \u0432 \u0445\u0440\u0430\u043D\u0438\u043B\u0438\u0449\u0435",
  "pause.mass.restore": "\u0412\u043E\u0441\u0441\u0442\u0430\u043D\u043E\u0432\u0438\u0442\u044C \u0444\u0430\u0439\u043B\u044B",
  "command.syncNow": "\u0421\u0438\u043D\u0445\u0440\u043E\u043D\u0438\u0437\u0438\u0440\u043E\u0432\u0430\u0442\u044C \u0441\u0435\u0439\u0447\u0430\u0441",
  "command.syncFull": "\u041F\u043E\u043B\u043D\u0430\u044F \u0441\u0438\u043D\u0445\u0440\u043E\u043D\u0438\u0437\u0430\u0446\u0438\u044F: \u0437\u0430\u043D\u043E\u0432\u043E \u043F\u0440\u043E\u0447\u0438\u0442\u0430\u0442\u044C \u042F\u043D\u0434\u0435\u043A\u0441 \u0414\u0438\u0441\u043A \u0438 \u0445\u0440\u0430\u043D\u0438\u043B\u0438\u0449\u0435",
  "command.pushAll": "\u041E\u0442\u043F\u0440\u0430\u0432\u0438\u0442\u044C \u0432\u0441\u0451 \u043D\u0430 \u042F\u043D\u0434\u0435\u043A\u0441 \u0414\u0438\u0441\u043A",
  "command.pullAll": "\u0421\u043A\u0430\u0447\u0430\u0442\u044C \u0432\u0441\u0451 \u0441 \u042F\u043D\u0434\u0435\u043A\u0441 \u0414\u0438\u0441\u043A\u0430",
  "command.abort": "\u041F\u0440\u0435\u0440\u0432\u0430\u0442\u044C \u0441\u0438\u043D\u0445\u0440\u043E\u043D\u0438\u0437\u0430\u0446\u0438\u044E",
  "command.showQueue": "\u041F\u043E\u043A\u0430\u0437\u0430\u0442\u044C \u043E\u0447\u0435\u0440\u0435\u0434\u044C \u0441\u0438\u043D\u0445\u0440\u043E\u043D\u0438\u0437\u0430\u0446\u0438\u0438",
  "command.showStatus": "\u041F\u043E\u043A\u0430\u0437\u0430\u0442\u044C \u0445\u043E\u0434 \u0441\u0438\u043D\u0445\u0440\u043E\u043D\u0438\u0437\u0430\u0446\u0438\u0438",
  "notice.authorizeFirst": "\u0421\u043D\u0430\u0447\u0430\u043B\u0430 \u0432\u043E\u0439\u0434\u0438\u0442\u0435 \u0432 \u043D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0430\u0445 \u043F\u043B\u0430\u0433\u0438\u043D\u0430",
  "notice.vaultLoading": "\u0425\u0440\u0430\u043D\u0438\u043B\u0438\u0449\u0435 \u0435\u0449\u0451 \u0437\u0430\u0433\u0440\u0443\u0436\u0430\u0435\u0442\u0441\u044F. \u041F\u043E\u043F\u0440\u043E\u0431\u0443\u0439\u0442\u0435 \u0447\u0435\u0440\u0435\u0437 \u043C\u0433\u043D\u043E\u0432\u0435\u043D\u0438\u0435.",
  "notice.syncError": "\u041E\u0448\u0438\u0431\u043A\u0430 \u0441\u0438\u043D\u0445\u0440\u043E\u043D\u0438\u0437\u0430\u0446\u0438\u0438: {message}",
  "notice.stopping": "\u0421\u0438\u043D\u0445\u0440\u043E\u043D\u0438\u0437\u0430\u0446\u0438\u044F \u043E\u0441\u0442\u0430\u043D\u0430\u0432\u043B\u0438\u0432\u0430\u0435\u0442\u0441\u044F\u2026",
  "notice.noSync": "\u0421\u0438\u043D\u0445\u0440\u043E\u043D\u0438\u0437\u0430\u0446\u0438\u044F \u043D\u0435 \u0438\u0434\u0451\u0442",
  "result.counts": "\u043E\u0442\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u043E {up}, \u0441\u043A\u0430\u0447\u0430\u043D\u043E {down}, \u0443\u0434\u0430\u043B\u0435\u043D\u043E {del}",
  "result.kept": ", \u043E\u0441\u0442\u0430\u0432\u043B\u0435\u043D\u043E {count}",
  "result.errors": ", \u043E\u0448\u0438\u0431\u043E\u043A {count}",
  "result.cancelled": "\u0421\u0438\u043D\u0445\u0440\u043E\u043D\u0438\u0437\u0430\u0446\u0438\u044F \u043E\u0442\u043C\u0435\u043D\u0435\u043D\u0430: {counts}.",
  "result.gaveUp": "\u0421\u0438\u043D\u0445\u0440\u043E\u043D\u0438\u0437\u0430\u0446\u0438\u044F \u043E\u0441\u0442\u0430\u043D\u043E\u0432\u043B\u0435\u043D\u0430: {count} \u0444\u0430\u0439\u043B\u043E\u0432 \u043F\u043E\u0434\u0440\u044F\u0434 \u043D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u043F\u0435\u0440\u0435\u0434\u0430\u0442\u044C.",
  "result.withErrors": "\u0421\u0438\u043D\u0445\u0440\u043E\u043D\u0438\u0437\u0430\u0446\u0438\u044F \u0437\u0430\u0432\u0435\u0440\u0448\u0435\u043D\u0430 \u0441 \u043E\u0448\u0438\u0431\u043A\u0430\u043C\u0438:",
  "result.complete": "\u0421\u0438\u043D\u0445\u0440\u043E\u043D\u0438\u0437\u0430\u0446\u0438\u044F \u0437\u0430\u0432\u0435\u0440\u0448\u0435\u043D\u0430: {counts}.",
  "result.upToDate": "\u0421\u0438\u043D\u0445\u0440\u043E\u043D\u0438\u0437\u0430\u0446\u0438\u044F \u0437\u0430\u0432\u0435\u0440\u0448\u0435\u043D\u0430. \u0412\u0441\u0451 \u0443\u0436\u0435 \u0441\u043E\u0432\u043F\u0430\u0434\u0430\u0435\u0442",
  "conflict.title": "\u041A\u043E\u043D\u0444\u043B\u0438\u043A\u0442\u044B \u0441\u0438\u043D\u0445\u0440\u043E\u043D\u0438\u0437\u0430\u0446\u0438\u0438 ({count})",
  "conflict.sideLocal": "\u0417\u0434\u0435\u0441\u044C",
  "conflict.sideRemote": "\u041D\u0430 \u042F\u043D\u0434\u0435\u043A\u0441 \u0414\u0438\u0441\u043A\u0435",
  "conflict.size": "\u0420\u0430\u0437\u043C\u0435\u0440: {size}",
  "conflict.modified": "\u0418\u0437\u043C\u0435\u043D\u0451\u043D: {date}",
  "conflict.deleted": "\u0423\u0434\u0430\u043B\u0451\u043D",
  "conflict.keepLocal": "\u041E\u0441\u0442\u0430\u0432\u0438\u0442\u044C \u044D\u0442\u043E\u0442",
  "conflict.keepRemote": "\u041E\u0441\u0442\u0430\u0432\u0438\u0442\u044C \u0441 \u0414\u0438\u0441\u043A\u0430",
  "conflict.skip": "\u041F\u0440\u043E\u043F\u0443\u0441\u0442\u0438\u0442\u044C",
  "conflict.hidden": "\u0415\u0449\u0451 {count} \u043A\u043E\u043D\u0444\u043B\u0438\u043A\u0442\u043E\u0432 \u043D\u0435 \u043F\u043E\u043A\u0430\u0437\u0430\u043D\u044B. \u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435, \u0447\u0442\u043E \u0441 \u043D\u0438\u043C\u0438 \u0441\u0434\u0435\u043B\u0430\u0442\u044C:",
  "conflict.allLocal": "\u0412\u0441\u0435 \u043E\u0442\u0441\u044E\u0434\u0430",
  "conflict.allRemote": "\u0412\u0441\u0435 \u0441 \u042F\u043D\u0434\u0435\u043A\u0441 \u0414\u0438\u0441\u043A\u0430",
  "conflict.skipAll": "\u041F\u0440\u043E\u043F\u0443\u0441\u0442\u0438\u0442\u044C \u0432\u0441\u0435",
  "conflict.apply": "\u041F\u0440\u0438\u043C\u0435\u043D\u0438\u0442\u044C",
  "size.bytes": "{n} \u0411",
  "size.kb": "{n} \u041A\u0411",
  "size.mb": "{n} \u041C\u0411",
  "error.localMissing": "\u041B\u043E\u043A\u0430\u043B\u044C\u043D\u044B\u0439 \u0444\u0430\u0439\u043B \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D: {path}",
  "error.oauth": "\u041E\u0448\u0438\u0431\u043A\u0430 \u0430\u0432\u0442\u043E\u0440\u0438\u0437\u0430\u0446\u0438\u0438: {status}",
  "error.noRefreshToken": "\u0412\u0445\u043E\u0434 \u0438\u0441\u0442\u0451\u043A. \u0412\u043E\u0439\u0434\u0438\u0442\u0435 \u0441\u043D\u043E\u0432\u0430 \u0432 \u043D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0430\u0445 \u043F\u043B\u0430\u0433\u0438\u043D\u0430.",
  "error.tokenRefresh": "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u043F\u0440\u043E\u0434\u043B\u0438\u0442\u044C \u0432\u0445\u043E\u0434: {status}",
  "error.maxRetries": "\u042F\u043D\u0434\u0435\u043A\u0441 \u0414\u0438\u0441\u043A \u043D\u0435 \u043E\u0442\u0432\u0435\u0442\u0438\u043B \u043F\u043E\u0441\u043B\u0435 \u043D\u0435\u0441\u043A\u043E\u043B\u044C\u043A\u0438\u0445 \u043F\u043E\u043F\u044B\u0442\u043E\u043A"
};
var dictionaries = { en, ru };
var current = "en" /* English */;
function obsidianLanguage() {
  return typeof import_obsidian.getLanguage === "function" ? (0, import_obsidian.getLanguage)() : import_obsidian.moment.locale();
}
function setLanguage(language) {
  const code = language === "auto" /* Auto */ ? obsidianLanguage() : language;
  current = code.toLowerCase().startsWith("ru") ? "ru" /* Russian */ : "en" /* English */;
}
function t(key, vars) {
  let text = dictionaries[current][key];
  if (vars) {
    for (const [name, value] of Object.entries(vars)) {
      text = text.replace(`{${name}}`, String(value));
    }
  }
  return text;
}

// src/utils.ts
function normalizePath(p) {
  return p.replace(/\\/g, "/").replace(/\/+/g, "/").replace(/\/$/, "");
}
function normalizeRemotePath(p) {
  const path = normalizePath(p.trim().replace(/^disk:/, ""));
  return path.startsWith("/") ? path : `/${path}`;
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
async function runPool(items, concurrency, worker, shouldStop, priority) {
  let cursor = 0;
  const size = Math.max(1, Math.min(concurrency, items.length));
  const runners = [];
  for (let i = 0; i < size; i++) {
    runners.push(
      (async () => {
        for (; ; ) {
          if (shouldStop && shouldStop())
            return;
          const urgent = priority == null ? void 0 : priority();
          if (urgent) {
            await urgent();
            continue;
          }
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
function resolveWithin(promise, ms) {
  return new Promise((resolve) => {
    const timer = window.setTimeout(() => resolve(null), ms);
    promise.then(
      (value) => {
        window.clearTimeout(timer);
        resolve(value);
      },
      () => {
        window.clearTimeout(timer);
        resolve(null);
      }
    );
  });
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
  // The listed resource's own type: a remote path that turns out to be a
  // file must not pass for an empty folder.
  "type",
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
function describeError(e) {
  if (e instanceof YaDiskApiError) {
    try {
      const body = JSON.parse(e.body);
      const detail = body.description || body.message || body.error;
      if (detail)
        return `${e.status} ${detail}`;
    } catch (e2) {
    }
    return `HTTP ${e.status}`;
  }
  return e instanceof Error ? e.message : String(e);
}
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
    this.remotePath = normalizeRemotePath(remotePath);
  }
  setToken(token) {
    this.token = token;
  }
  setRefreshToken(refreshToken, expiresAt) {
    this.refreshTokenValue = refreshToken;
    this.tokenExpiresAt = expiresAt;
  }
  setRemotePath(remotePath) {
    const next = normalizeRemotePath(remotePath);
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
    const resp = await (0, import_obsidian2.requestUrl)({
      url: `${OAUTH_BASE}/token`,
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
      throw: false
    });
    if (resp.status !== 200) {
      const err = resp.json;
      throw new Error((err == null ? void 0 : err.error_description) || (err == null ? void 0 : err.error) || t("error.oauth", { status: resp.status }));
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
      throw new Error(t("error.noRefreshToken"));
    }
    const body = new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: this.refreshTokenValue,
      client_id: getClientId(),
      client_secret: getClientSecret()
    });
    const resp = await (0, import_obsidian2.requestUrl)({
      url: `${OAUTH_BASE}/token`,
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
      throw: false
    });
    if (resp.status !== 200) {
      const err = resp.json;
      throw new Error((err == null ? void 0 : err.error_description) || (err == null ? void 0 : err.error) || t("error.tokenRefresh", { status: resp.status }));
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
        response = await (0, import_obsidian2.requestUrl)({ ...params, headers, throw: false });
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
    throw new Error(t("error.maxRetries"));
  }
  /**
   * Transfer against a storage host. These URLs are pre-signed, so they carry
   * no auth header and are not subject to the API cooldown.
   */
  async requestStorage(params, retries = MAX_RETRIES) {
    for (let attempt = 0; attempt <= retries; attempt++) {
      let response;
      try {
        response = await (0, import_obsidian2.requestUrl)({ ...params, throw: false });
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
    throw new Error(t("error.maxRetries"));
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
   * Walks the remote tree under `folderPath`. Null means there is no folder
   * there — none yet, or a file in its place.
   *
   * Directories are listed concurrently: a depth-first walk that awaits every
   * child in turn spends the entire scan waiting on one round trip at a time,
   * which on a phone is the dominant cost of a sync.
   */
  async listAllRecursive(folderPath, concurrency = 4, onProgress) {
    const records = [];
    const semaphore = new Semaphore(Math.max(1, concurrency));
    let dirsDone = 0;
    let rootListed = false;
    let rootIsFile = false;
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
          if (!rootListed) {
            rootListed = true;
            if (resource.type === "file") {
              rootIsFile = true;
              return;
            }
          }
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
        if (!rootListed)
          return null;
        throw new Error("A folder on Yandex Disk changed during the scan. The sync will retry.");
      }
      throw e;
    }
    if (rootIsFile)
      return null;
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
    let current2 = "";
    for (const part of parts) {
      current2 += "/" + part;
      if (this.knownFolders.has(current2))
        continue;
      await this.createFolderOnce(current2);
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
var import_obsidian4 = require("obsidian");

// src/conflict-modal.ts
var import_obsidian3 = require("obsidian");
var MAX_RENDERED = 200;
var ConflictModal = class extends import_obsidian3.Modal {
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
    new import_obsidian3.Setting(contentEl).setName(t("conflict.title", { count: this.conflicts.length })).setHeading();
    const listEl = contentEl.createDiv({ cls: "conflict-list" });
    const shown = this.conflicts.slice(0, MAX_RENDERED);
    const hidden = this.conflicts.slice(MAX_RENDERED);
    for (const conflict of shown) {
      const item = listEl.createDiv({ cls: "yadisk-conflict-item" });
      item.createDiv({ cls: "conflict-path", text: conflict.path });
      const details = item.createDiv({ cls: "conflict-details" });
      const localCol = details.createDiv({ cls: "detail-col" });
      localCol.createDiv({ cls: "detail-label", text: t("conflict.sideLocal") });
      if (conflict.localRecord) {
        localCol.createDiv({ text: t("conflict.size", { size: formatSize(conflict.localRecord.size) }) });
        localCol.createDiv({ text: t("conflict.modified", { date: formatDate(conflict.localRecord.mtime) }) });
      } else {
        localCol.createDiv({ text: t("conflict.deleted") });
      }
      const remoteCol = details.createDiv({ cls: "detail-col" });
      remoteCol.createDiv({ cls: "detail-label", text: t("conflict.sideRemote") });
      if (conflict.remoteRecord) {
        remoteCol.createDiv({ text: t("conflict.size", { size: formatSize(conflict.remoteRecord.size) }) });
        remoteCol.createDiv({ text: t("conflict.modified", { date: formatDate(conflict.remoteRecord.mtime) }) });
      } else {
        remoteCol.createDiv({ text: t("conflict.deleted") });
      }
      const choiceEl = item.createDiv({ cls: "conflict-choice" });
      const choices = [
        { label: t("conflict.keepLocal"), value: "local" },
        { label: t("conflict.keepRemote"), value: "remote" },
        { label: t("conflict.skip"), value: "skip" }
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
        text: t("conflict.hidden", { count: hidden.length })
      });
      const bulkChoices = [
        { label: t("conflict.allLocal"), value: "local" },
        { label: t("conflict.allRemote"), value: "remote" },
        { label: t("conflict.skipAll"), value: "skip" }
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
      text: t("conflict.apply"),
      cls: "mod-cta"
    });
    applyBtn.addEventListener("click", () => {
      this.submitAndClose();
    });
    const cancelBtn = footer.createEl("button", { text: t("queue.cancel") });
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
    return t("size.bytes", { n: bytes });
  if (bytes < 1024 * 1024)
    return t("size.kb", { n: (bytes / 1024).toFixed(1) });
  return t("size.mb", { n: (bytes / (1024 * 1024)).toFixed(1) });
}
function formatDate(ms) {
  if (!ms)
    return "\u2014";
  const d = new Date(ms);
  return d.toLocaleString();
}

// src/safety.ts
var DELETE_GUARD_FLOOR = 10;
var DELETE_GUARD_SHARE = 0.25;
function findMassDeletions(plan, guard) {
  var _a2, _b2;
  const appearedHere = /* @__PURE__ */ new Map();
  const appearedThere = /* @__PURE__ */ new Map();
  const goneHere = [];
  const goneThere = [];
  for (const item of plan) {
    if (item.localRecord && !item.prevLocalRecord)
      tally(appearedHere, item.localRecord.md5);
    if (item.remoteRecord && !item.prevRemoteRecord)
      tally(appearedThere, item.remoteRecord.md5);
    if (item.action === "delete_remote" /* DeleteRemote */ && !((_a2 = guard.approved) == null ? void 0 : _a2.local.has(item.path))) {
      goneHere.push(item);
    } else if (item.action === "delete_local" /* DeleteLocal */ && !((_b2 = guard.approved) == null ? void 0 : _b2.remote.has(item.path))) {
      goneThere.push(item);
    }
  }
  const found = [];
  const here = unexplained(goneHere, (item) => item.remoteRecord, appearedHere);
  if (exceeds(here.length, guard.trackedLocal, guard.threshold)) {
    found.push({ side: "local", paths: here, tracked: guard.trackedLocal });
  }
  const there = unexplained(goneThere, (item) => item.localRecord, appearedThere);
  if (exceeds(there.length, guard.trackedRemote, guard.threshold)) {
    found.push({ side: "remote", paths: there, tracked: guard.trackedRemote });
  }
  return found;
}
function exceeds(deletions, tracked, threshold) {
  if (deletions < DELETE_GUARD_FLOOR)
    return false;
  return deletions >= threshold || deletions >= tracked * DELETE_GUARD_SHARE;
}
function restoreDeleted(plan, paths) {
  return plan.map((item) => {
    if (!paths.has(item.path))
      return item;
    if (item.remoteRecord && !item.localRecord)
      return { ...item, action: "download_new" /* DownloadNew */ };
    if (item.localRecord && !item.remoteRecord)
      return { ...item, action: "upload_new" /* UploadNew */ };
    return item;
  });
}
function settleUnfinished(plan, done, localSnapshot, remoteSnapshot) {
  for (const item of plan) {
    if (item.action === "skip" /* Skip */ || done.has(item.path))
      continue;
    revert(localSnapshot, item.path, item.prevLocalRecord);
    revert(remoteSnapshot, item.path, item.prevRemoteRecord);
  }
}
function unexplained(items, destroyed, appeared) {
  var _a2, _b2;
  const paths = [];
  for (const item of items) {
    const md52 = (_a2 = destroyed(item)) == null ? void 0 : _a2.md5;
    const left = md52 ? (_b2 = appeared.get(md52)) != null ? _b2 : 0 : 0;
    if (md52 && left > 0) {
      appeared.set(md52, left - 1);
      continue;
    }
    paths.push(item.path);
  }
  return paths;
}
function tally(counts, md52) {
  var _a2;
  if (!md52)
    return;
  counts.set(md52, ((_a2 = counts.get(md52)) != null ? _a2 : 0) + 1);
}
function revert(snapshot, path, prev) {
  if (prev)
    snapshot[path] = prev;
  else
    delete snapshot[path];
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
function cmn(q, a, b, x, s, t2) {
  a = add32(add32(a, q), add32(x, t2));
  return add32(a << s | a >>> 32 - s, b);
}
function ff(a, b, c, d, x, s, t2) {
  return cmn(b & c | ~b & d, a, b, x, s, t2);
}
function gg(a, b, c, d, x, s, t2) {
  return cmn(b & d | c & ~d, a, b, x, s, t2);
}
function hh(a, b, c, d, x, s, t2) {
  return cmn(b ^ c ^ d, a, b, x, s, t2);
}
function ii(a, b, c, d, x, s, t2) {
  return cmn(c ^ (b | ~d), a, b, x, s, t2);
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

// src/sync-engine.ts
var PLAN_CHUNK = 500;
var CHECKPOINT_INTERVAL_MS = 15e3;
var DISK_CHECK_LIMIT = 200;
var DISK_CHECK_TIMEOUT_MS = 5e3;
var FAILURE_STREAK_LIMIT = 20;
var SyncEngine = class {
  constructor(app, client, stateManager, settings) {
    this.app = app;
    this.client = client;
    this.stateManager = stateManager;
    this.settings = settings;
    this.aborted = false;
    /** Set when the run stops itself mid-way for safety; reported as `blocked`. */
    this.halt = null;
    /** The remote folder this run belongs to, fixed when it starts. */
    this.remotePath = "";
    /** Failures in a row, across all workers, since a transfer last went through. */
    this.failureStreak = 0;
    this.gaveUp = false;
    this.lastCheckpointAt = 0;
    this.checkpointInFlight = false;
    /** Files changed here mid-run, to be sent ahead of the rest. */
    this.urgent = /* @__PURE__ */ new Set();
    /** Taken by the urgent lane; the plan's own item for them is passed over. */
    this.expedited = /* @__PURE__ */ new Set();
    /** Paths a transfer is working on right now, in either lane. */
    this.inFlight = /* @__PURE__ */ new Set();
    /** What the urgent lane needs from the run; set only while it executes. */
    this.live = null;
  }
  abort() {
    this.aborted = true;
  }
  /**
   * Asks for files changed here since the run started to be sent within it,
   * ahead of whatever it has left. Without this an edit made during a first
   * sync waits behind every download — which can be hours.
   *
   * Only what can go up safely is taken, and only once the run is
   * transferring; anything else simply waits for the next run.
   */
  expedite(paths) {
    for (const path of paths)
      this.urgent.add(path);
  }
  async run(directionOverride, hooks = {}) {
    this.aborted = false;
    this.halt = null;
    this.failureStreak = 0;
    this.gaveUp = false;
    this.lastCheckpointAt = Date.now();
    const direction = directionOverride || this.settings.syncDirection;
    const remotePath = normalizeRemotePath(this.settings.remotePath);
    this.remotePath = remotePath;
    const stats = {
      uploaded: 0,
      downloaded: 0,
      deleted: 0,
      errors: 0,
      skipped: 0,
      aborted: false
    };
    const reporter = hooks.reporter;
    this.client.setAbortCheck(() => this.shouldStop());
    try {
      if (!await this.storageAvailable(hooks))
        return this.blocked(stats, { kind: "storage" });
      const prevState = this.stateManager.getState();
      const sameRemote = prevState.remotePath === void 0 || normalizeRemotePath(prevState.remotePath) === remotePath;
      const basePrevLocal = sameRemote ? prevState.localSnapshot : {};
      const basePrevRemote = sameRemote ? prevState.remoteSnapshot : {};
      const remoteUnchanged = sameRemote && hooks.remoteUnchanged && Object.keys(basePrevRemote).length > 0;
      if (reporter)
        reporter.phase(t("phase.scanning"));
      let vaultText = "";
      let diskText = "";
      const renderScan = () => {
        if (reporter)
          reporter.message(t("scan.line", { detail: `${vaultText}${diskText}` }));
      };
      const scanLocal = this.stateManager.buildLocalSnapshot(
        this.settings,
        // Serves only as a cache of hashes, whichever folder it came from.
        hooks.rehashLocal ? {} : prevState.localSnapshot,
        (done, total) => {
          vaultText = t("scan.vault", { done, total });
          renderScan();
        },
        () => this.aborted
      );
      const scanRemote = remoteUnchanged ? Promise.resolve(this.stateManager.filterRecords(Object.values(basePrevRemote), this.settings)) : this.stateManager.buildRemoteSnapshot(
        this.client,
        remotePath,
        this.settings,
        (dirs, files) => {
          diskText = ` \xB7 ${t("scan.disk", { dirs, files })}`;
          renderScan();
        }
      );
      if (remoteUnchanged)
        diskText = ` \xB7 ${t("scan.diskUnchanged")}`;
      const [localScan, remoteListing] = await Promise.all([scanLocal, scanRemote]);
      if (this.aborted)
        return this.finish(stats);
      if (remoteListing === null && Object.keys(basePrevRemote).length > 0) {
        return this.blocked(stats, { kind: "remote-missing", remotePath });
      }
      const remoteScan = remoteListing != null ? remoteListing : { snapshot: {}, skipped: /* @__PURE__ */ new Set() };
      const localSnapshot = localScan.snapshot;
      const remoteSnapshot = remoteScan.snapshot;
      const outOfScope = /* @__PURE__ */ new Set([...localScan.skipped, ...remoteScan.skipped]);
      const localPrev = withoutPaths(basePrevLocal, outOfScope);
      const remotePrev = withoutPaths(basePrevRemote, outOfScope);
      if (reporter)
        reporter.phase(t("phase.comparing"));
      let plan = await this.buildPlan(
        localSnapshot,
        remoteSnapshot,
        localPrev,
        remotePrev,
        direction
      );
      if (this.aborted)
        return this.finish(stats);
      const stillOnDisk = await this.findStillOnDisk(plan);
      if (stillOnDisk.length > 0) {
        return this.blocked(stats, { kind: "stale-list", paths: stillOnDisk });
      }
      if (hooks.restorePaths)
        plan = restoreDeleted(plan, hooks.restorePaths);
      const guard = {
        threshold: this.settings.deleteConfirmThreshold,
        trackedLocal: Object.keys(localPrev).length,
        trackedRemote: Object.keys(remotePrev).length,
        approved: hooks.approvedDeletions
      };
      let massDeletions = findMassDeletions(plan, guard);
      if (massDeletions.length > 0) {
        return this.blocked(stats, { kind: "mass-delete", deletions: massDeletions });
      }
      const conflicts = plan.filter((p) => p.action === "conflict" /* Conflict */);
      if (conflicts.length > 0) {
        plan = await this.resolveConflicts(plan, conflicts);
      }
      if (this.aborted)
        return this.finish(stats);
      massDeletions = findMassDeletions(plan, guard);
      if (massDeletions.length > 0) {
        return this.blocked(stats, { kind: "mass-delete", deletions: massDeletions });
      }
      const completed = /* @__PURE__ */ new Set();
      await this.executePlan(plan, completed, stats, localSnapshot, remoteSnapshot, hooks, direction);
      settleUnfinished(plan, completed, localSnapshot, remoteSnapshot);
      this.stateManager.setState({
        lastSyncTime: Date.now(),
        remotePath,
        localSnapshot,
        remoteSnapshot
      });
      if (this.halt)
        stats.blocked = this.halt;
      return this.finish(stats);
    } finally {
      this.client.setAbortCheck(null);
    }
  }
  finish(stats) {
    stats.aborted = this.aborted;
    stats.gaveUp = this.gaveUp;
    return stats;
  }
  /** Ends a run that refused to go on. */
  blocked(stats, block) {
    stats.blocked = block;
    return this.finish(stats);
  }
  shouldStop() {
    return this.aborted || this.halt !== null || this.gaveUp;
  }
  storageAvailable(hooks) {
    return hooks.checkStorage ? hooks.checkStorage() : Promise.resolve(true);
  }
  /**
   * Files Obsidian no longer lists that are on disk all the same — the sign
   * of a file list gone stale. Obsidian does not re-read a vault whose drive
   * was unplugged and plugged back in, so until it restarts, what it reports
   * missing may not be missing at all.
   *
   * Only files the plan would act on for being missing here are looked up,
   * and no more than DISK_CHECK_LIMIT of them: enough to tell, and each of
   * the rest is looked up again right before it would be deleted.
   */
  async findStillOnDisk(plan) {
    const found = [];
    let checked = 0;
    for (const item of plan) {
      const missingHere = item.action === "delete_remote" /* DeleteRemote */ || item.action === "conflict" /* Conflict */ && !item.localRecord;
      if (!missingHere)
        continue;
      if (this.app.vault.getAbstractFileByPath(item.path))
        continue;
      if (checked++ >= DISK_CHECK_LIMIT)
        break;
      if (await this.onDisk(item.path))
        found.push(item.path);
    }
    return found;
  }
  /**
   * Asks the disk itself, past Obsidian's list, whether a file is there.
   * Case-sensitively, so a note renamed only in case is not still present;
   * and a lookup that does not come back counts as present, since the file
   * cannot then be shown to be gone.
   */
  async onDisk(path) {
    const exists = await resolveWithin(this.app.vault.adapter.exists(path, true), DISK_CHECK_TIMEOUT_MS);
    return exists !== false;
  }
  /**
   * Last look before a file is removed from Yandex Disk for being gone here:
   * it has to be missing from the disk itself, not only from Obsidian's
   * list, and the disk has to still be there to say so.
   */
  async confirmGoneLocally(item, stats, hooks) {
    var _a2, _b2;
    if (this.app.vault.getAbstractFileByPath(item.path)) {
      stats.skipped++;
      return false;
    }
    if (await this.onDisk(item.path)) {
      (_a2 = this.halt) != null ? _a2 : this.halt = { kind: "stale-list", paths: [item.path] };
      return false;
    }
    if (!await this.storageAvailable(hooks)) {
      (_b2 = this.halt) != null ? _b2 : this.halt = { kind: "storage" };
      return false;
    }
    return true;
  }
  /**
   * Runs the plan in three passes — creates, then updates, then deletes —
   * with a bounded number of transfers in flight inside each pass.
   *
   * A strictly sequential loop costs at least two round trips per file, which
   * on a vault of this size runs for hours and never survives the app being
   * backgrounded.
   */
  async executePlan(plan, completed, stats, localSnapshot, remoteSnapshot, hooks, direction) {
    const actionItems = plan.filter((p) => p.action !== "skip" /* Skip */);
    const total = actionItems.length;
    if (hooks.onPlanReady)
      hooks.onPlanReady(total);
    if (total === 0)
      return;
    const uploads = actionItems.filter(
      (i) => i.action === "upload_new" /* UploadNew */ || i.action === "upload_modified" /* UploadModified */
    );
    const downloads = actionItems.filter(
      (i) => i.action === "download_new" /* DownloadNew */ || i.action === "download_modified" /* DownloadModified */
    );
    const deletes = actionItems.filter(
      (i) => i.action === "delete_local" /* DeleteLocal */ || i.action === "delete_remote" /* DeleteRemote */
    );
    uploads.sort(byDepthAsc);
    downloads.sort(byDepthAsc);
    deletes.sort(byDepthDesc);
    const reporter = hooks.reporter;
    const queue = hooks.queue;
    if (queue)
      queue.planned([...uploads, ...downloads, ...deletes]);
    this.live = {
      planByPath: new Map(plan.map((item) => [item.path, item])),
      completed,
      stats,
      localSnapshot,
      remoteSnapshot,
      hooks,
      direction
    };
    const runPhase = async (label, items) => {
      if (items.length === 0 || this.shouldStop())
        return;
      if (!await this.storageAvailable(hooks)) {
        this.halt = { kind: "storage" };
        return;
      }
      if (reporter)
        reporter.phase(label);
      let done = 0;
      await runPool(
        items,
        this.settings.concurrency,
        async (item) => {
          if (this.expedited.has(item.path)) {
            done++;
            if (reporter)
              reporter.tick(done, items.length);
            return;
          }
          if (queue)
            queue.started(item);
          this.inFlight.add(item.path);
          let failure;
          try {
            if (await this.executeItem(item, stats, localSnapshot, remoteSnapshot, hooks)) {
              completed.add(item.path);
            }
            this.failureStreak = 0;
          } catch (e) {
            console.error(`[YaDisk Sync] Error processing ${item.path}:`, e);
            const message = describeError(e);
            failure = message;
            stats.errors++;
            stats.lastError = { path: item.path, message };
            if (reporter)
              reporter.failure(stats.errors, item.path, message);
            if (!this.halt && !await this.storageAvailable(hooks)) {
              this.halt = { kind: "storage" };
            }
            if (++this.failureStreak >= FAILURE_STREAK_LIMIT)
              this.gaveUp = true;
          }
          this.inFlight.delete(item.path);
          if (queue)
            queue.finished(item, failure);
          done++;
          if (reporter)
            reporter.tick(done, items.length);
          await this.maybeCheckpoint(plan, completed, localSnapshot, remoteSnapshot, hooks);
        },
        () => this.shouldStop(),
        () => this.takeUrgent()
      );
    };
    try {
      await runPhase(t("phase.uploading"), uploads);
      await runPhase(t("phase.downloading"), downloads);
      await runPhase(t("phase.deleting"), deletes);
    } finally {
      this.live = null;
    }
  }
  /** The next urgent file that can go up now, as a task; see expedite. */
  takeUrgent() {
    const live = this.live;
    if (!live)
      return void 0;
    for (const path of this.urgent) {
      if (this.inFlight.has(path))
        continue;
      this.urgent.delete(path);
      const item = this.urgentUpload(path, live);
      if (item)
        return () => this.runUrgent(item, live);
    }
    return void 0;
  }
  /**
   * The upload an urgent file stands for, or nothing if sending it now is
   * not safe. Sending is safe only where this run would not have written
   * Yandex Disk's side over it — no download, deletion or conflict was
   * planned for it — so the file goes up exactly as a plan would send it.
   */
  urgentUpload(path, live) {
    var _a2;
    if (live.direction === "pull" /* Pull */)
      return null;
    const file = this.app.vault.getAbstractFileByPath(path);
    if (!(file instanceof import_obsidian4.TFile))
      return null;
    if (this.stateManager.excludes(path, file.stat.size, this.settings))
      return null;
    const planned = live.planByPath.get(path);
    if (planned) {
      const sendable = planned.action === "upload_new" /* UploadNew */ || planned.action === "upload_modified" /* UploadModified */ || planned.action === "skip" /* Skip */;
      if (!sendable)
        return null;
    } else if (live.remoteSnapshot[path]) {
      return null;
    }
    const onDisk = (_a2 = live.remoteSnapshot[path]) != null ? _a2 : planned == null ? void 0 : planned.remoteRecord;
    return {
      path,
      action: onDisk ? "upload_modified" /* UploadModified */ : "upload_new" /* UploadNew */,
      localRecord: planned == null ? void 0 : planned.localRecord,
      remoteRecord: planned == null ? void 0 : planned.remoteRecord,
      prevLocalRecord: planned == null ? void 0 : planned.prevLocalRecord,
      prevRemoteRecord: planned == null ? void 0 : planned.prevRemoteRecord
    };
  }
  async runUrgent(item, live) {
    const queue = live.hooks.queue;
    const reporter = live.hooks.reporter;
    this.expedited.add(item.path);
    this.inFlight.add(item.path);
    if (queue) {
      queue.expedited(item);
      queue.started(item);
    }
    let failure;
    try {
      const file = this.app.vault.getAbstractFileByPath(item.path);
      if (!(file instanceof import_obsidian4.TFile))
        throw new Error(t("error.localMissing", { path: item.path }));
      const mtime = file.stat.mtime;
      const data = await this.app.vault.readBinary(file);
      await this.client.uploadFile(this.client.toRemotePath(item.path), data);
      const hash = md5(data);
      live.localSnapshot[item.path] = { path: item.path, mtime, size: data.byteLength, md5: hash };
      live.remoteSnapshot[item.path] = { path: item.path, mtime: Date.now(), size: data.byteLength, md5: hash };
      live.completed.add(item.path);
      live.stats.uploaded++;
      this.failureStreak = 0;
    } catch (e) {
      console.error(`[YaDisk Sync] Error processing ${item.path}:`, e);
      failure = describeError(e);
      live.stats.errors++;
      live.stats.lastError = { path: item.path, message: failure };
      if (reporter)
        reporter.failure(live.stats.errors, item.path, failure);
      if (++this.failureStreak >= FAILURE_STREAK_LIMIT)
        this.gaveUp = true;
    } finally {
      this.inFlight.delete(item.path);
    }
    if (queue)
      queue.finished(item, failure);
  }
  /**
   * Applies one plan item and folds the result back into the in-memory
   * snapshots, so the sync does not need a second full scan of both sides
   * just to learn what it already did. Returns whether the item was carried
   * out; one that was not is left for the next sync.
   */
  async executeItem(item, stats, localSnapshot, remoteSnapshot, hooks) {
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
        return true;
      }
      case "download_new" /* DownloadNew */:
      case "download_modified" /* DownloadModified */: {
        const written = await this.executeDownload(item, hooks);
        if (!written) {
          stats.skipped++;
          return false;
        }
        stats.downloaded++;
        const file = this.app.vault.getAbstractFileByPath(item.path);
        if (item.remoteRecord && file instanceof import_obsidian4.TFile) {
          localSnapshot[item.path] = {
            path: item.path,
            mtime: file.stat.mtime,
            size: file.stat.size,
            md5: item.remoteRecord.md5
          };
          remoteSnapshot[item.path] = item.remoteRecord;
        }
        return true;
      }
      case "delete_remote" /* DeleteRemote */:
        if (!await this.confirmGoneLocally(item, stats, hooks))
          return false;
        await this.executeDeleteRemote(item);
        stats.deleted++;
        delete remoteSnapshot[item.path];
        delete localSnapshot[item.path];
        return true;
      case "delete_local" /* DeleteLocal */:
        await this.executeDeleteLocal(item, hooks);
        stats.deleted++;
        delete localSnapshot[item.path];
        delete remoteSnapshot[item.path];
        return true;
    }
    return false;
  }
  async maybeCheckpoint(plan, completed, localSnapshot, remoteSnapshot, hooks) {
    if (!hooks.checkpoint || this.checkpointInFlight || this.halt)
      return;
    if (Date.now() - this.lastCheckpointAt < CHECKPOINT_INTERVAL_MS)
      return;
    this.checkpointInFlight = true;
    try {
      const local = { ...localSnapshot };
      const remote = { ...remoteSnapshot };
      settleUnfinished(plan, completed, local, remote);
      this.stateManager.setState({
        lastSyncTime: Date.now(),
        remotePath: this.remotePath,
        localSnapshot: local,
        remoteSnapshot: remote
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
    if (!file || !(file instanceof import_obsidian4.TFile))
      throw new Error(t("error.localMissing", { path: item.path }));
    const data = await this.app.vault.readBinary(file);
    const remotePath = this.client.toRemotePath(item.path);
    await this.client.uploadFile(remotePath, data);
  }
  /**
   * Returns false when the download was abandoned because the local file
   * moved on since the scan.
   *
   * A sync of a large vault runs for minutes, and the plan is built from a
   * snapshot taken at the start. Writing that plan out blindly would let a
   * download land on top of a note edited while it was queued.
   */
  async executeDownload(item, hooks) {
    if (this.hasLocalFileChanged(item))
      return false;
    const remotePath = this.client.toRemotePath(item.path);
    const data = await this.client.downloadFile(remotePath);
    if (this.hasLocalFileChanged(item))
      return false;
    if (hooks.onFileWritten)
      hooks.onFileWritten(item.path);
    const existingFile = this.app.vault.getAbstractFileByPath(item.path);
    if (existingFile && existingFile instanceof import_obsidian4.TFile) {
      await this.app.vault.modifyBinary(existingFile, data);
    } else {
      const parentPath = item.path.substring(0, item.path.lastIndexOf("/"));
      if (parentPath) {
        await this.ensureLocalFolder(parentPath, hooks);
      }
      await this.app.vault.createBinary(item.path, data);
    }
    return true;
  }
  hasLocalFileChanged(item) {
    const file = this.app.vault.getAbstractFileByPath(item.path);
    if (!item.localRecord) {
      return file instanceof import_obsidian4.TFile;
    }
    if (!(file instanceof import_obsidian4.TFile))
      return true;
    return file.stat.mtime !== item.localRecord.mtime || file.stat.size !== item.localRecord.size;
  }
  async executeDeleteRemote(item) {
    const remotePath = this.client.toRemotePath(item.path);
    await this.client.deleteResource(remotePath);
  }
  async executeDeleteLocal(item, hooks) {
    const file = this.app.vault.getAbstractFileByPath(item.path);
    if (file) {
      if (hooks.onFileWritten)
        hooks.onFileWritten(item.path);
      await this.app.fileManager.trashFile(file);
    }
  }
  async ensureLocalFolder(folderPath, hooks) {
    const parts = folderPath.split("/");
    let current2 = "";
    for (const part of parts) {
      current2 = current2 ? current2 + "/" + part : part;
      const existing = this.app.vault.getAbstractFileByPath(current2);
      if (!existing) {
        if (hooks.onFileWritten)
          hooks.onFileWritten(current2);
        try {
          await this.app.vault.createFolder(current2);
        } catch (e) {
        }
      }
    }
  }
};
function withoutPaths(snapshot, paths) {
  if (paths.size === 0)
    return snapshot;
  const copy = { ...snapshot };
  for (const path of paths)
    delete copy[path];
  return copy;
}
function byDepthAsc(a, b) {
  return pathDepth(a.path) - pathDepth(b.path) || a.path.localeCompare(b.path);
}
function byDepthDesc(a, b) {
  return pathDepth(b.path) - pathDepth(a.path) || a.path.localeCompare(b.path);
}

// src/sync-state.ts
var EMPTY_STATE = {
  lastSyncTime: 0,
  localSnapshot: {},
  remoteSnapshot: {}
};
var HASH_YIELD_EVERY = 200;
function listingConcurrency(settings) {
  const value = settings.scanConcurrency;
  if (!Number.isFinite(value))
    return DEFAULT_SETTINGS.scanConcurrency;
  return Math.min(MAX_SCAN_CONCURRENCY, Math.max(MIN_SCAN_CONCURRENCY, Math.round(value)));
}
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
  /** Records the disk revision the current snapshots are accurate as of. */
  setRevision(revision) {
    this.state.revision = revision != null ? revision : void 0;
  }
  loadFromData(data) {
    if (data.state && data.state.version === PERSISTED_STATE_VERSION) {
      this.state = {
        lastSyncTime: data.state.lastSyncTime,
        remotePath: data.state.remotePath,
        revision: data.state.revision,
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
        remotePath: this.state.remotePath,
        revision: this.state.revision,
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
  /** Whether a file of this path and size is left out of syncing. */
  excludes(path, size, settings) {
    return this.isExcluded(path, size, this.getEffectiveExcludePatterns(settings), settings);
  }
  /** Whether a file is left out of syncing by the user's patterns or size limit. */
  isExcluded(path, size, patterns, settings) {
    if (matchesExcludePattern(path, patterns))
      return true;
    return size / (1024 * 1024) > settings.maxFileSizeMB;
  }
  /**
   * Applies the exclude patterns and size limit to records already in hand —
   * a remote listing, or the stored snapshot standing in for one.
   */
  filterRecords(records, settings) {
    const patterns = this.getEffectiveExcludePatterns(settings);
    const snapshot = {};
    const skipped = /* @__PURE__ */ new Set();
    for (const record of records) {
      if (this.isExcluded(record.path, record.size, patterns, settings)) {
        skipped.add(record.path);
        continue;
      }
      snapshot[record.path] = record;
    }
    return { snapshot, skipped };
  }
  async buildLocalSnapshot(settings, prevSnapshot, onProgress, shouldStop) {
    const files = this.app.vault.getFiles();
    const snapshot = {};
    const skipped = /* @__PURE__ */ new Set();
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
      if (this.isExcluded(file.path, file.stat.size, patterns, settings)) {
        skipped.add(file.path);
        continue;
      }
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
    return { snapshot, skipped };
  }
  /** Null when the remote folder does not exist. */
  async buildRemoteSnapshot(client, remotePath, settings, onProgress) {
    const records = await client.listAllRecursive(
      remotePath,
      listingConcurrency(settings),
      onProgress
    );
    if (records === null)
      return null;
    return this.filterRecords(records, settings);
  }
};

// src/progress.ts
var import_obsidian5 = require("obsidian");
var RENDER_INTERVAL_MS = 250;
var SyncProgress = class {
  constructor(onCancel, display = "delayed" /* Delayed */, onUpdate) {
    this.onCancel = onCancel;
    this.display = display;
    this.onUpdate = onUpdate;
    this.notice = null;
    this.textEl = null;
    this.errorEl = null;
    this.appearTimer = null;
    this.label = "";
    this.lastRenderAt = 0;
    this.lastText = t("progress.starting");
    this.failed = 0;
    this.lastFailure = "";
  }
  start() {
    if (this.display === "never" /* Never */)
      return;
    if (this.display === "always" /* Always */) {
      this.show();
      return;
    }
    this.appearTimer = window.setTimeout(() => {
      this.appearTimer = null;
      this.show();
    }, PROGRESS_DELAY_MS);
  }
  /** Starts a new phase. Repaints if the indicator is already visible. */
  phase(label) {
    this.label = label;
    this.render(label);
  }
  /** Per-item update. Cheap to call in a tight loop. */
  tick(current2, total) {
    if (Date.now() - this.lastRenderAt < RENDER_INTERVAL_MS)
      return;
    const count = total !== void 0 ? `${current2}/${total}` : `${current2}`;
    const failed = this.failed > 0 ? ` \xB7 ${t("progress.failed", { count: this.failed })}` : "";
    this.render(`${this.label} ${count}${failed}`);
  }
  /** Records a failure; it shows with the next update. */
  failure(failed, path, message) {
    this.failed = failed;
    this.lastFailure = t("progress.lastError", { path, message });
  }
  /** Replaces the whole line, ignoring the throttle. */
  message(text) {
    this.render(text);
  }
  /**
   * Shows the indicator on request, whatever the setting says.
   *
   * Used when the user asks what the sync is doing — either by tapping the
   * ribbon mid-sync or through the command — including after dismissing the
   * notice, which a tap anywhere on it does.
   */
  reopen() {
    this.clearTimer();
    if (this.notice)
      this.notice.hide();
    this.notice = null;
    this.textEl = null;
    this.errorEl = null;
    this.show();
  }
  close() {
    this.clearTimer();
    if (this.notice)
      this.notice.hide();
    this.notice = null;
    this.textEl = null;
    this.errorEl = null;
  }
  show() {
    if (this.notice)
      return;
    const frag = createFragment((el) => {
      const wrapper = el.createDiv({ cls: "yadisk-progress" });
      const body = wrapper.createDiv({ cls: "yadisk-progress-body" });
      this.textEl = body.createDiv({
        cls: "yadisk-progress-text",
        text: this.lastText
      });
      this.errorEl = body.createDiv({
        cls: "yadisk-progress-error",
        text: this.lastFailure
      });
      this.errorEl.toggle(this.lastFailure !== "");
      const cancelBtn = wrapper.createEl("button", {
        cls: "yadisk-progress-cancel",
        text: t("queue.cancel")
      });
      cancelBtn.addEventListener("click", (evt) => {
        evt.preventDefault();
        evt.stopPropagation();
        this.onCancel();
      });
    });
    this.notice = new import_obsidian5.Notice(frag, 0);
  }
  clearTimer() {
    if (this.appearTimer !== null) {
      window.clearTimeout(this.appearTimer);
      this.appearTimer = null;
    }
  }
  render(text) {
    var _a2;
    this.lastRenderAt = Date.now();
    this.lastText = text;
    (_a2 = this.onUpdate) == null ? void 0 : _a2.call(this, text, this.lastFailure);
    if (this.textEl)
      this.textEl.setText(text);
    if (this.errorEl) {
      this.errorEl.setText(this.lastFailure);
      this.errorEl.toggle(this.lastFailure !== "");
    }
  }
};

// src/settings.ts
var import_obsidian6 = require("obsidian");
var YaDiskSyncSettingTab = class extends import_obsidian6.PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    /** A remote folder being typed, not yet handed to the plugin. */
    this.typedRemotePath = null;
    this.plugin = plugin;
  }
  hide() {
    this.commitRemotePath();
    super.hide();
  }
  commitRemotePath() {
    if (this.typedRemotePath === null)
      return;
    const value = this.typedRemotePath;
    this.typedRemotePath = null;
    this.plugin.applyRemotePath(value);
  }
  display() {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.addClass("yadisk-sync-settings");
    setLanguage(this.plugin.settings.language);
    new import_obsidian6.Setting(containerEl).setName(t("language.name")).setDesc(t("language.desc")).addDropdown(
      (dd) => dd.addOption("auto" /* Auto */, t("language.auto")).addOption("en" /* English */, "English").addOption("ru" /* Russian */, "\u0420\u0443\u0441\u0441\u043A\u0438\u0439").setValue(this.plugin.settings.language).onChange((value) => {
        this.plugin.settings.language = value;
        this.plugin.queueSaveSettings();
        this.display();
        this.plugin.queue.notify();
      })
    );
    new import_obsidian6.Setting(containerEl).setName(t("auth.heading")).setHeading();
    const isAuthorized = !!this.plugin.settings.accessToken;
    if (!isAuthorized) {
      const authSetting = new import_obsidian6.Setting(containerEl).setName(t("auth.signIn")).setDesc(t("auth.signInDesc"));
      authSetting.addButton(
        (btn) => btn.setButtonText(t("auth.signIn")).setCta().onClick(() => {
          const url = this.plugin.client.getAuthUrl();
          window.open(url);
        })
      );
      const codeSetting = new import_obsidian6.Setting(containerEl).setName(t("auth.code")).setDesc(t("auth.codeDesc"));
      let codeValue = "";
      codeSetting.addText(
        (text) => text.setPlaceholder(t("auth.codePlaceholder")).onChange((value) => {
          codeValue = value.trim();
        })
      );
      codeSetting.addButton(
        (btn) => btn.setButtonText(t("auth.confirm")).onClick(async () => {
          if (!codeValue) {
            new import_obsidian6.Notice(t("auth.enterCode"));
            return;
          }
          try {
            btn.setButtonText("...");
            btn.buttonEl.disabled = true;
            await this.plugin.client.exchangeCode(codeValue);
            new import_obsidian6.Notice(t("auth.success"));
            await this.plugin.saveSettings();
            this.display();
          } catch (e) {
            new import_obsidian6.Notice(t("error", { message: e instanceof Error ? e.message : String(e) }));
            btn.setButtonText(t("auth.confirm"));
            btn.buttonEl.disabled = false;
          }
        })
      );
    } else {
      new import_obsidian6.Setting(containerEl).setName(t("auth.account")).setDesc(t("auth.authorized")).addButton(
        (btn) => btn.setButtonText(t("auth.check")).onClick(async () => {
          var _a2, _b2;
          try {
            const info = await this.plugin.client.getDiskInfo();
            const login = ((_a2 = info.user) == null ? void 0 : _a2.display_name) || ((_b2 = info.user) == null ? void 0 : _b2.login) || "\u2014";
            const freeGB = ((info.total_space - info.used_space) / (1024 * 1024 * 1024)).toFixed(2);
            new import_obsidian6.Notice(t("auth.free", { login, free: freeGB }));
          } catch (e) {
            new import_obsidian6.Notice(t("error", { message: e instanceof Error ? e.message : String(e) }));
          }
        })
      ).addButton(
        (btn) => btn.setButtonText(t("auth.signOut")).setWarning().onClick(async () => {
          this.plugin.settings.accessToken = "";
          this.plugin.settings.refreshToken = "";
          this.plugin.settings.tokenExpiresAt = 0;
          await this.plugin.saveSettings();
          this.display();
        })
      );
    }
    new import_obsidian6.Setting(containerEl).setName(t("sync.heading")).setHeading();
    new import_obsidian6.Setting(containerEl).setName(t("remote.name")).setDesc(t("remote.desc")).addText((text) => {
      text.setPlaceholder("/vault").setValue(this.plugin.settings.remotePath).onChange((value) => {
        this.typedRemotePath = value;
      });
      text.inputEl.addEventListener("change", () => this.commitRemotePath());
    });
    new import_obsidian6.Setting(containerEl).setName(t("direction.name")).addDropdown(
      (dd) => dd.addOption("bidirectional" /* Bidirectional */, t("direction.bidirectional")).addOption("push" /* Push */, t("direction.push")).addOption("pull" /* Pull */, t("direction.pull")).setValue(this.plugin.settings.syncDirection).onChange((value) => {
        this.plugin.settings.syncDirection = value;
        this.plugin.queueSaveSettings();
      })
    );
    new import_obsidian6.Setting(containerEl).setName(t("conflict.name")).addDropdown(
      (dd) => dd.addOption("newer_wins" /* NewerWins */, t("conflict.newer")).addOption("local_wins" /* LocalWins */, t("conflict.local")).addOption("remote_wins" /* RemoteWins */, t("conflict.remote")).addOption("ask" /* Ask */, t("conflict.ask")).setValue(this.plugin.settings.conflictStrategy).onChange((value) => {
        this.plugin.settings.conflictStrategy = value;
        this.plugin.queueSaveSettings();
      })
    );
    new import_obsidian6.Setting(containerEl).setName(t("deletions.name")).setDesc(t("deletions.desc")).addDropdown((dd) => {
      const options = [10, 20, 50, 100, 250, 500, 1e3];
      const current2 = this.plugin.settings.deleteConfirmThreshold;
      if (!options.includes(current2)) {
        options.push(current2);
        options.sort((a, b) => a - b);
      }
      for (const count of options) {
        dd.addOption(String(count), t("deletions.files", { count }));
      }
      dd.setValue(String(current2)).onChange((value) => {
        this.plugin.settings.deleteConfirmThreshold = parseInt(value, 10) || DEFAULT_SETTINGS.deleteConfirmThreshold;
        this.plugin.queueSaveSettings();
      });
    });
    new import_obsidian6.Setting(containerEl).setName(t("interval.name")).setDesc(t("interval.desc")).addDropdown((dd) => {
      const options = [
        [0, t("interval.off")],
        [10, t("interval.seconds", { count: 10 })],
        [30, t("interval.seconds", { count: 30 })],
        [60, t("interval.minute")],
        [300, t("interval.minutes", { count: 5 })],
        [900, t("interval.minutes", { count: 15 })],
        [1800, t("interval.minutes", { count: 30 })],
        [3600, t("interval.hour")]
      ];
      const current2 = this.plugin.settings.autoSyncSeconds;
      if (current2 > 0 && !options.some(([seconds]) => seconds === current2)) {
        options.push([current2, t("interval.minutes", { count: Math.round(current2 / 60) })]);
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
    new import_obsidian6.Setting(containerEl).setName(t("startup.name")).addToggle(
      (toggle) => toggle.setValue(this.plugin.settings.syncOnStartup).onChange((value) => {
        this.plugin.settings.syncOnStartup = value;
        this.plugin.queueSaveSettings();
      })
    );
    const configDir = this.app.vault.configDir;
    new import_obsidian6.Setting(containerEl).setName(t("exclude.name")).setDesc(t("exclude.desc")).addTextArea(
      (ta) => ta.setPlaceholder(`${configDir}/workspace*.json
.trash/**`).setValue(this.plugin.settings.excludePatterns.join("\n")).then((t2) => {
        t2.inputEl.rows = 5;
        t2.inputEl.addClass("yadisk-textarea-wide");
      }).onChange((value) => {
        this.plugin.settings.excludePatterns = value.split("\n").map((s) => s.trim()).filter(Boolean);
        this.plugin.queueSaveSettings();
      })
    );
    new import_obsidian6.Setting(containerEl).setName(t("maxSize.name")).addText(
      (text) => text.setPlaceholder("50").setValue(String(this.plugin.settings.maxFileSizeMB)).onChange((value) => {
        const num = parseInt(value, 10);
        this.plugin.settings.maxFileSizeMB = isNaN(num) ? 50 : Math.max(1, num);
        this.plugin.queueSaveSettings();
      })
    );
    new import_obsidian6.Setting(containerEl).setName(t("concurrency.name")).setDesc(t("concurrency.desc")).addSlider(
      (slider) => slider.setLimits(MIN_CONCURRENCY, MAX_CONCURRENCY, 1).setValue(this.plugin.settings.concurrency).setDynamicTooltip().onChange((value) => {
        this.plugin.settings.concurrency = value;
        this.plugin.queueSaveSettings();
      })
    );
    new import_obsidian6.Setting(containerEl).setName(t("scanConcurrency.name")).setDesc(t("scanConcurrency.desc")).addSlider(
      (slider) => slider.setLimits(MIN_SCAN_CONCURRENCY, MAX_SCAN_CONCURRENCY, 1).setValue(this.plugin.settings.scanConcurrency).setDynamicTooltip().onChange((value) => {
        this.plugin.settings.scanConcurrency = value;
        this.plugin.queueSaveSettings();
      })
    );
    new import_obsidian6.Setting(containerEl).setName(t("progress.name")).setDesc(t("progress.desc")).addDropdown(
      (dd) => dd.addOption("delayed" /* Delayed */, t("progress.delayed")).addOption("always" /* Always */, t("progress.always")).addOption("never" /* Never */, t("progress.never")).setValue(this.plugin.settings.progressDisplay).onChange((value) => {
        this.plugin.settings.progressDisplay = value;
        this.plugin.queueSaveSettings();
      })
    );
    new import_obsidian6.Setting(containerEl).setName(t("statusCounts.name")).setDesc(t("statusCounts.desc")).addToggle(
      (toggle) => toggle.setValue(this.plugin.settings.statusBarCounts).onChange((value) => {
        this.plugin.settings.statusBarCounts = value;
        this.plugin.queueSaveSettings();
        this.plugin.queue.notify();
      })
    );
    new import_obsidian6.Setting(containerEl).setName(t("screen.name")).setDesc(t("screen.desc")).addToggle(
      (toggle) => toggle.setValue(this.plugin.settings.keepScreenOn).onChange((value) => {
        this.plugin.settings.keepScreenOn = value;
        this.plugin.queueSaveSettings();
      })
    );
    new import_obsidian6.Setting(containerEl).setName(t("fullSync.name")).setDesc(t("fullSync.desc")).addButton(
      (btn) => btn.setButtonText(t("fullSync.button")).onClick(() => {
        this.plugin.runFullSync();
      })
    );
    new import_obsidian6.Setting(containerEl).setName(t("reset.name")).setDesc(t("reset.desc")).addButton(
      (btn) => btn.setButtonText(t("reset.button")).setWarning().onClick((evt) => {
        this.plugin.stateManager.resetState();
        void this.plugin.saveSettings();
        btn.setButtonText(t("reset.done"));
        window.setTimeout(() => {
          btn.setButtonText(t("reset.button"));
        }, 2e3);
      })
    );
    this.renderSyncComparison(containerEl);
  }
  /**
   * How the two buttons above differ. Both read everything again, so side
   * by side they look alike; what sets them apart is whether the memory of
   * the last sync survives, and with it whether deletions carry over.
   */
  renderSyncComparison(containerEl) {
    const rows = [
      ["compare.starts", "compare.starts.full", "compare.starts.reset"],
      ["compare.memory", "compare.memory.full", "compare.memory.reset"],
      ["compare.deletions", "compare.deletions.full", "compare.deletions.reset"],
      ["compare.edits", "compare.edits.full", "compare.edits.reset"],
      ["compare.rereads", "compare.rereads.full", "compare.rereads.reset"]
    ];
    const table = containerEl.createEl("table", { cls: "yadisk-compare" });
    table.createEl("caption", { text: t("compare.caption") });
    const head = table.createEl("thead").createEl("tr");
    head.createEl("th");
    head.createEl("th", { text: t("compare.full"), attr: { scope: "col" } });
    head.createEl("th", { text: t("compare.reset"), attr: { scope: "col" } });
    const body = table.createEl("tbody");
    for (const [label, full, reset] of rows) {
      const row = body.createEl("tr");
      row.createEl("th", { text: t(label), attr: { scope: "row" } });
      row.createEl("td", { text: t(full) });
      row.createEl("td", { text: t(reset) });
    }
  }
};

// src/queue.ts
var QUEUE_GROUP_ORDER = [
  "upload_new" /* UploadNew */,
  "upload_modified" /* UploadModified */,
  "download_new" /* DownloadNew */,
  "download_modified" /* DownloadModified */,
  "delete_remote" /* DeleteRemote */,
  "delete_local" /* DeleteLocal */
];
var LOCAL_CHANGE_ACTIONS = {
  created: "upload_new" /* UploadNew */,
  modified: "upload_modified" /* UploadModified */,
  // A rename reaches Yandex Disk as the file under its new name.
  renamed: "upload_new" /* UploadNew */,
  deleted: "delete_remote" /* DeleteRemote */
};
var REMAINING_ORDER = ["upload", "download", "deleteRemote", "deleteLocal"];
var REMAINING_KINDS = {
  ["upload_new" /* UploadNew */]: "upload",
  ["upload_modified" /* UploadModified */]: "upload",
  ["download_new" /* DownloadNew */]: "download",
  ["download_modified" /* DownloadModified */]: "download",
  ["delete_remote" /* DeleteRemote */]: "deleteRemote",
  ["delete_local" /* DeleteLocal */]: "deleteLocal"
};
var QUEUE_HISTORY_LIMIT = 100;
var SyncQueue = class {
  constructor() {
    this.stage = "idle";
    /** The current run's items in start order. Emptied when the run ends. */
    this.entries = [];
    /** Finished items, newest first. */
    this.history = [];
    /** Files changed here and not yet taken by a run, newest last. */
    this.localChanges = /* @__PURE__ */ new Map();
    /** When the next auto-sync check is due; null with auto-sync off. */
    this.nextCheckAt = null;
    /** What the running sync is doing, as the progress indicator says it. */
    this.detail = "";
    /** The last failure of the running sync, as the indicator says it. */
    this.lastError = "";
    this.paused = false;
    this.byPath = /* @__PURE__ */ new Map();
    /** Entries before this index have all started. */
    this.firstPending = 0;
    this.startedCount = 0;
    this.pendingPerAction = /* @__PURE__ */ new Map();
    this.finishedTotal = 0;
    this.listeners = /* @__PURE__ */ new Set();
  }
  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
  notify() {
    for (const listener of this.listeners)
      listener();
  }
  noteLocalChange(path, kind, oldPath) {
    if (oldPath !== void 0)
      this.localChanges.delete(oldPath);
    const earlier = this.localChanges.get(path);
    this.localChanges.delete(path);
    this.localChanges.set(path, earlier === "created" && kind === "modified" ? "created" : kind);
    this.notify();
  }
  /** Hands over the waiting files to the run about to carry them. */
  takeLocalChanges() {
    const taken = this.localChanges;
    this.localChanges = /* @__PURE__ */ new Map();
    this.notify();
    return taken;
  }
  /** Puts back files a run did not get through; later changes win. */
  restoreLocalChanges(changes) {
    const merged = new Map(changes);
    for (const [path, kind] of this.localChanges) {
      merged.delete(path);
      merged.set(path, kind);
    }
    this.localChanges = merged;
    this.notify();
  }
  setDetail(detail, lastError) {
    if (detail === this.detail && lastError === this.lastError)
      return;
    this.detail = detail;
    this.lastError = lastError;
    this.notify();
  }
  begin() {
    this.detail = "";
    this.lastError = "";
    this.stage = "scanning";
    this.entries = [];
    this.byPath.clear();
    this.pendingPerAction.clear();
    this.firstPending = 0;
    this.startedCount = 0;
    this.finishedTotal = 0;
    this.notify();
  }
  planned(items) {
    var _a2;
    this.stage = "transferring";
    this.entries = items.map((item) => ({ path: item.path, action: item.action, status: "pending" }));
    this.byPath = new Map(this.entries.map((entry) => [entry.path, entry]));
    this.pendingPerAction.clear();
    for (const entry of this.entries) {
      this.pendingPerAction.set(entry.action, ((_a2 = this.pendingPerAction.get(entry.action)) != null ? _a2 : 0) + 1);
    }
    this.firstPending = 0;
    this.startedCount = 0;
    this.finishedTotal = 0;
    this.notify();
  }
  expedited(item) {
    var _a2;
    this.localChanges.delete(item.path);
    const existing = this.byPath.get(item.path);
    if ((existing == null ? void 0 : existing.status) === "pending") {
      this.notify();
      return;
    }
    const entry = { path: item.path, action: item.action, status: "pending" };
    this.entries.push(entry);
    this.byPath.set(item.path, entry);
    this.pendingPerAction.set(entry.action, ((_a2 = this.pendingPerAction.get(entry.action)) != null ? _a2 : 0) + 1);
    this.notify();
  }
  started(item) {
    var _a2;
    const entry = this.byPath.get(item.path);
    if (!entry || entry.status !== "pending")
      return;
    entry.status = "active";
    this.startedCount++;
    this.pendingPerAction.set(entry.action, ((_a2 = this.pendingPerAction.get(entry.action)) != null ? _a2 : 1) - 1);
    this.notify();
  }
  finished(item, error) {
    const entry = this.byPath.get(item.path);
    if (!entry || entry.status !== "active")
      return;
    this.finishedTotal++;
    entry.status = error === void 0 ? "done" : "failed";
    entry.error = error;
    entry.finishedAt = Date.now();
    this.history.unshift({ ...entry });
    if (this.history.length > QUEUE_HISTORY_LIMIT)
      this.history.length = QUEUE_HISTORY_LIMIT;
    this.notify();
  }
  /** Items not finished when a run stops are dropped: the next run plans afresh. */
  end() {
    this.detail = "";
    this.lastError = "";
    this.stage = "idle";
    this.entries = [];
    this.byPath.clear();
    this.pendingPerAction.clear();
    this.firstPending = 0;
    this.startedCount = 0;
    this.finishedTotal = 0;
    this.notify();
  }
  active() {
    return this.entries.filter((entry) => entry.status === "active");
  }
  /**
   * How many files of each kind are still waiting, in QUEUE_GROUP_ORDER:
   * the run's own and those changed here since.
   */
  pendingGroups() {
    const local = this.localByAction();
    return QUEUE_GROUP_ORDER.map((action) => {
      var _a2, _b2, _c;
      return {
        action,
        count: ((_a2 = this.pendingPerAction.get(action)) != null ? _a2 : 0) + ((_c = (_b2 = local.get(action)) == null ? void 0 : _b2.length) != null ? _c : 0)
      };
    }).filter((group) => group.count > 0);
  }
  /**
   * What is left, in four kinds — new and changed files counted together —
   * for a line short enough for the status bar. Kinds with nothing left
   * are left out.
   */
  remaining() {
    var _a2;
    const counts = /* @__PURE__ */ new Map();
    for (const { action, count } of this.pendingGroups()) {
      const kind = REMAINING_KINDS[action];
      if (kind)
        counts.set(kind, ((_a2 = counts.get(kind)) != null ? _a2 : 0) + count);
    }
    return REMAINING_ORDER.filter((kind) => counts.has(kind)).map((kind) => {
      var _a3;
      return { kind, count: (_a3 = counts.get(kind)) != null ? _a3 : 0 };
    });
  }
  /**
   * Files changed here that no run has taken yet, newest first, by what
   * sending them will do. A file the running sync is about to send anyway
   * is shown once, as the sync's.
   */
  localByAction() {
    var _a2, _b2;
    const result = /* @__PURE__ */ new Map();
    for (const [path, kind] of [...this.localChanges].reverse()) {
      if (((_a2 = this.byPath.get(path)) == null ? void 0 : _a2.status) === "pending")
        continue;
      const action = LOCAL_CHANGE_ACTIONS[kind];
      const list = (_b2 = result.get(action)) != null ? _b2 : [];
      list.push({ path, kind });
      result.set(action, list);
    }
    return result;
  }
  /**
   * Up to `limit` items not yet started, in the order they will start;
   * only those of `action` if given.
   */
  pending(limit, action) {
    while (this.firstPending < this.entries.length && this.entries[this.firstPending].status !== "pending") {
      this.firstPending++;
    }
    const result = [];
    for (let i = this.firstPending; i < this.entries.length && result.length < limit; i++) {
      const entry = this.entries[i];
      if (entry.status === "pending" && (action === void 0 || entry.action === action))
        result.push(entry);
    }
    return result;
  }
  /** Everything still to go: the run's own files and those changed here since. */
  pendingCount() {
    let local = 0;
    for (const list of this.localByAction().values())
      local += list.length;
    return this.entries.length - this.startedCount + local;
  }
  finishedCount() {
    return this.finishedTotal;
  }
};

// src/queue-view.ts
var import_obsidian9 = require("obsidian");

// src/icon.ts
var import_obsidian7 = require("obsidian");
var SYNC_ICON = "yadisk-sync";
var ARROWS = '<g class="yadisk-sync-arrows"><g transform="scale(4.1667)" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/></g></g>';
var LETTER = '<text x="53" y="48" text-anchor="middle" dominant-baseline="central" font-size="38" font-weight="700" fill="currentColor" stroke="none" style="font-family: var(--font-interface), sans-serif">\u042F</text>';
function registerSyncIcon() {
  (0, import_obsidian7.addIcon)(SYNC_ICON, ARROWS + LETTER);
}

// src/remaining.ts
var import_obsidian8 = require("obsidian");
var ICONS = {
  upload: "upload",
  download: "download",
  deleteRemote: "cloud-off",
  deleteLocal: "trash-2"
};
var LABELS = {
  upload: "queue.action.upload",
  download: "queue.action.download",
  deleteRemote: "queue.action.deleteRemote",
  deleteLocal: "queue.action.deleteLocal"
};
function renderRemaining(parent, queue) {
  const remaining = queue.remaining();
  if (remaining.length === 0)
    return;
  const line = parent.createSpan({ cls: "yadisk-remaining" });
  for (const { kind, count } of remaining) {
    const item = line.createSpan({ cls: "yadisk-remaining-item" });
    item.setAttr("aria-label", `${t(LABELS[kind])}: ${count}`);
    (0, import_obsidian8.setIcon)(item.createSpan({ cls: "yadisk-remaining-icon" }), ICONS[kind]);
    item.createSpan({ text: count.toLocaleString() });
  }
}

// src/queue-view.ts
var QUEUE_VIEW_TYPE = "yadisk-sync-queue";
var QUEUE_VIEW_ICON = SYNC_ICON;
var PENDING_SHOWN = 50;
var RENDER_INTERVAL_MS2 = 250;
var ACTION_ICONS = {
  ["upload_new" /* UploadNew */]: "upload",
  ["upload_modified" /* UploadModified */]: "upload",
  ["download_new" /* DownloadNew */]: "download",
  ["download_modified" /* DownloadModified */]: "download",
  ["delete_remote" /* DeleteRemote */]: "cloud-off",
  ["delete_local" /* DeleteLocal */]: "trash-2",
  ["conflict" /* Conflict */]: "git-compare",
  ["skip" /* Skip */]: "minus"
};
var GROUP_LABELS = {
  ["upload_new" /* UploadNew */]: "queue.group.uploadNew",
  ["upload_modified" /* UploadModified */]: "queue.group.uploadModified",
  ["download_new" /* DownloadNew */]: "queue.group.downloadNew",
  ["download_modified" /* DownloadModified */]: "queue.group.downloadModified",
  ["delete_remote" /* DeleteRemote */]: "queue.group.deleteRemote",
  ["delete_local" /* DeleteLocal */]: "queue.group.deleteLocal"
};
var LOCAL_ICONS = {
  created: "file-plus",
  modified: "pencil",
  deleted: "trash-2",
  renamed: "arrow-right-left"
};
var LOCAL_LABELS = {
  created: "queue.local.created",
  modified: "queue.local.modified",
  deleted: "queue.local.deleted",
  renamed: "queue.local.renamed"
};
var ACTION_LABELS = {
  ["upload_new" /* UploadNew */]: "queue.action.upload",
  ["upload_modified" /* UploadModified */]: "queue.action.upload",
  ["download_new" /* DownloadNew */]: "queue.action.download",
  ["download_modified" /* DownloadModified */]: "queue.action.download",
  ["delete_remote" /* DeleteRemote */]: "queue.action.deleteRemote",
  ["delete_local" /* DeleteLocal */]: "queue.action.deleteLocal",
  ["conflict" /* Conflict */]: "queue.action.conflict",
  ["skip" /* Skip */]: "queue.action.skip"
};
var QueueView = class extends import_obsidian9.ItemView {
  constructor(leaf, plugin) {
    super(leaf);
    this.plugin = plugin;
    this.unsubscribe = null;
    this.renderTimer = null;
    this.lastRenderAt = 0;
    /** Groups of waiting files, and the history, the user opened; all start closed. */
    this.openGroups = /* @__PURE__ */ new Set();
    /** Held while a press is under way, so a redraw cannot swallow the click. */
    this.pressed = false;
  }
  getViewType() {
    return QUEUE_VIEW_TYPE;
  }
  getDisplayText() {
    return t("queue.title");
  }
  getIcon() {
    return QUEUE_VIEW_ICON;
  }
  async onOpen() {
    this.contentEl.addClass("yadisk-queue");
    this.unsubscribe = this.plugin.queue.subscribe(() => this.scheduleRender());
    this.registerInterval(window.setInterval(() => this.scheduleRender(), 1e3));
    this.registerDomEvent(this.contentEl, "pointerdown", () => {
      this.pressed = true;
    });
    const release = () => {
      this.pressed = false;
    };
    this.registerDomEvent(window, "pointerup", release);
    this.registerDomEvent(window, "pointercancel", release);
    this.render();
  }
  async onClose() {
    var _a2;
    (_a2 = this.unsubscribe) == null ? void 0 : _a2.call(this);
    this.unsubscribe = null;
    if (this.renderTimer !== null)
      window.clearTimeout(this.renderTimer);
    this.renderTimer = null;
  }
  scheduleRender() {
    if (this.renderTimer !== null)
      return;
    const wait = Math.max(0, RENDER_INTERVAL_MS2 - (Date.now() - this.lastRenderAt));
    this.renderTimer = window.setTimeout(() => {
      this.renderTimer = null;
      if (this.pressed) {
        this.scheduleRender();
        return;
      }
      this.render();
    }, wait);
  }
  render() {
    this.lastRenderAt = Date.now();
    const queue = this.plugin.queue;
    const el = this.contentEl;
    const scrollTop = el.scrollTop;
    el.empty();
    const header = el.createDiv({ cls: "yadisk-queue-header" });
    const status = header.createDiv({ cls: "yadisk-queue-status" });
    if (queue.stage === "scanning") {
      status.setText(t("queue.scanning"));
    } else if (queue.stage === "transferring") {
      const total = queue.entries.length;
      status.setText(t("queue.progress", { done: queue.finishedCount(), total }));
    } else if (queue.paused) {
      status.setText(t("queue.paused"));
    } else {
      status.setText(t("queue.idle"));
    }
    if (queue.stage !== "idle" && queue.detail) {
      status.createDiv({ cls: "yadisk-queue-note", text: queue.detail });
    }
    if (queue.stage !== "idle" && queue.lastError) {
      status.createDiv({ cls: "yadisk-queue-error", text: queue.lastError });
    }
    renderRemaining(status.createDiv(), queue);
    if (queue.nextCheckAt !== null && !queue.paused) {
      const seconds = Math.max(0, Math.ceil((queue.nextCheckAt - Date.now()) / 1e3));
      status.createDiv({ cls: "yadisk-queue-note", text: t("queue.nextCheck", { seconds }) });
    }
    if (queue.stage !== "idle") {
      header.createEl("button", { text: t("queue.cancel") }).addEventListener("click", () => {
        this.plugin.abortSync();
      });
    } else if (queue.paused) {
      header.createEl("button", { text: t("queue.review"), cls: "mod-warning" }).addEventListener("click", () => {
        this.plugin.openPauseReview();
      });
    } else {
      header.createEl("button", { text: t("queue.syncNow"), cls: "mod-cta" }).addEventListener("click", () => {
        this.plugin.syncNow();
      });
    }
    const active = queue.active();
    if (active.length > 0) {
      this.section(el, t("queue.now", { count: active.length }), (list) => {
        for (const entry of active)
          this.row(list, entry);
      });
    }
    const pendingCount = queue.pendingCount();
    if (pendingCount > 0) {
      this.section(el, t("queue.next", { count: pendingCount }), (list) => {
        for (const { action, count } of queue.pendingGroups())
          this.group(list, action, count);
      });
    }
    if (queue.history.length > 0) {
      const history = this.collapsible(el, "history", "yadisk-queue-section");
      const summary = history.summary.createDiv({ cls: "yadisk-queue-section-title" });
      const title = queue.history.length >= QUEUE_HISTORY_LIMIT ? t("queue.historyLatest", { count: QUEUE_HISTORY_LIMIT }) : t("queue.historyCount", { count: queue.history.length });
      summary.createSpan({ text: title });
      const failed = queue.history.filter((entry) => entry.status === "failed").length;
      if (failed > 0)
        summary.createSpan({ cls: "yadisk-queue-error", text: ` \xB7 ${t("queue.failedCount", { count: failed })}` });
      if (history.open) {
        const list = history.details.createDiv({ cls: "yadisk-queue-list" });
        for (const entry of queue.history)
          this.row(list, entry, true);
      }
    }
    el.scrollTop = scrollTop;
  }
  /** One kind of waiting file: a line with the count, the files once opened. */
  group(list, action, count) {
    var _a2;
    const { details, summary, open } = this.collapsible(list, action, "yadisk-queue-group");
    summary.addClass("yadisk-queue-group-summary");
    (0, import_obsidian9.setIcon)(summary.createSpan({ cls: "yadisk-queue-icon" }), ACTION_ICONS[action]);
    const labelKey = GROUP_LABELS[action];
    summary.createSpan({ cls: "yadisk-queue-group-label", text: labelKey ? t(labelKey) : action });
    summary.createSpan({ cls: "yadisk-queue-group-count", text: String(count) });
    if (!open)
      return;
    const files = details.createDiv({ cls: "yadisk-queue-list" });
    const local = ((_a2 = this.plugin.queue.localByAction().get(action)) != null ? _a2 : []).slice(0, PENDING_SHOWN);
    for (const { path, kind } of local)
      this.localRow(files, path, kind);
    for (const entry of this.plugin.queue.pending(PENDING_SHOWN - local.length, action))
      this.row(files, entry);
    if (count > PENDING_SHOWN) {
      files.createDiv({ cls: "yadisk-queue-more", text: t("queue.more", { count: count - PENDING_SHOWN }) });
    }
  }
  /**
   * A block that opens on a tap and stays as the user left it across
   * redraws. Its contents are for the caller to add, and only when open.
   */
  collapsible(parent, key, cls) {
    const details = parent.createEl("details", { cls: `yadisk-queue-collapsible ${cls}` });
    const open = this.openGroups.has(key);
    details.open = open;
    details.addEventListener("toggle", () => {
      if (details.open)
        this.openGroups.add(key);
      else
        this.openGroups.delete(key);
      if (details.open && details.childElementCount === 1)
        this.scheduleRender();
    });
    const summary = details.createEl("summary", { cls: "yadisk-queue-summary" });
    return { details, summary, open };
  }
  section(parent, title, fill) {
    const section = parent.createDiv({ cls: "yadisk-queue-section" });
    section.createDiv({ cls: "yadisk-queue-section-title", text: title });
    fill(section.createDiv({ cls: "yadisk-queue-list" }));
  }
  /** A file changed here, not yet picked up by a sync. */
  localRow(list, path, kind) {
    const row = list.createDiv({ cls: "yadisk-queue-row is-pending" });
    row.setAttr("title", path);
    (0, import_obsidian9.setIcon)(row.createSpan({ cls: "yadisk-queue-icon" }), LOCAL_ICONS[kind]);
    const slash = path.lastIndexOf("/");
    const body = row.createDiv({ cls: "yadisk-queue-body" });
    body.createDiv({ cls: "yadisk-queue-name", text: path.slice(slash + 1) });
    const details = [t(LOCAL_LABELS[kind])];
    if (slash > 0)
      details.push(path.slice(0, slash));
    body.createDiv({ cls: "yadisk-queue-detail", text: details.join(" \xB7 ") });
  }
  /** A file as its name, with its folder and anything else in small print below. */
  row(list, entry, withTime = false) {
    const row = list.createDiv({ cls: `yadisk-queue-row is-${entry.status}` });
    row.setAttr("title", `${t(ACTION_LABELS[entry.action])}: ${entry.path}`);
    const icon = row.createSpan({ cls: "yadisk-queue-icon" });
    (0, import_obsidian9.setIcon)(icon, entry.status === "failed" ? "alert-circle" : ACTION_ICONS[entry.action]);
    const slash = entry.path.lastIndexOf("/");
    const body = row.createDiv({ cls: "yadisk-queue-body" });
    body.createDiv({ cls: "yadisk-queue-name", text: entry.path.slice(slash + 1) });
    const details = [];
    if (slash > 0)
      details.push(entry.path.slice(0, slash));
    if (withTime && entry.finishedAt !== void 0)
      details.push(new Date(entry.finishedAt).toLocaleTimeString());
    if (details.length > 0)
      body.createDiv({ cls: "yadisk-queue-detail", text: details.join(" \xB7 ") });
    if (entry.error)
      body.createDiv({ cls: "yadisk-queue-error", text: entry.error });
  }
};

// src/pause-modal.ts
var import_obsidian10 = require("obsidian");
var MAX_LISTED = 200;
var CONFIRM_DELAY_S = 10;
function describeBlock(block, partial) {
  const untouched = partial ? t("pause.notice.partial") : t("pause.untouched");
  switch (block.kind) {
    case "storage":
      return t("pause.notice.storage", { untouched });
    case "stale-list":
      return t("pause.notice.staleList", { untouched });
    case "remote-missing":
      return t("pause.notice.remoteMissing", { path: block.remotePath });
    case "mass-delete": {
      if (block.deletions.length > 1)
        return t("pause.notice.massBoth");
      const deletion = block.deletions[0];
      return deletion.side === "local" ? t("pause.notice.massLocal", countVars(deletion)) : t("pause.notice.massRemote", countVars(deletion));
    }
  }
}
function showPauseNotice(text, onReview) {
  const frag = createFragment((el) => {
    const wrapper = el.createDiv({ cls: "yadisk-pause-notice" });
    wrapper.createDiv({ cls: "yadisk-pause-notice-text", text });
    const reviewBtn = wrapper.createEl("button", { text: t("queue.review") });
    reviewBtn.addEventListener("click", () => onReview());
  });
  return new import_obsidian10.Notice(frag, 0);
}
var PauseModal = class extends import_obsidian10.Modal {
  constructor(app, block, partial, approvedEarlier, actions) {
    super(app);
    this.block = block;
    this.partial = partial;
    this.approvedEarlier = approvedEarlier;
    this.actions = actions;
    this.countdownTimer = null;
  }
  onOpen() {
    this.contentEl.addClass("yadisk-pause-modal");
    new import_obsidian10.Setting(this.contentEl).setName(t("pause.title")).setHeading();
    const block = this.block;
    switch (block.kind) {
      case "storage":
        this.renderStorage();
        break;
      case "stale-list":
        this.renderStaleList(block.paths);
        break;
      case "remote-missing":
        this.renderRemoteMissing(block.remotePath);
        break;
      case "mass-delete":
        this.renderMassDelete(block.deletions);
        break;
    }
  }
  onClose() {
    this.stopCountdown();
    this.contentEl.empty();
  }
  renderStorage() {
    this.paragraph(t("pause.storage.what"));
    this.paragraph(this.untouched());
    this.paragraph(t("pause.storage.todo"));
    this.buttons([{ text: t("pause.checkAgain"), cls: "mod-cta", onClick: () => this.actions.recheck() }]);
  }
  renderStaleList(paths) {
    this.paragraph(t("pause.staleList.what"));
    this.paragraph(this.untouched());
    this.paragraph(t("pause.staleList.todo"));
    this.list(paths);
    this.buttons([{ text: t("pause.checkAgain"), cls: "mod-cta", onClick: () => this.actions.recheck() }]);
  }
  renderRemoteMissing(remotePath) {
    this.paragraph(t("pause.remoteMissing.what", { path: remotePath }));
    this.paragraph(t("pause.remoteMissing.todo"));
    this.buttons([
      { text: t("pause.checkAgain"), cls: "mod-cta", onClick: () => this.actions.recheck() },
      { text: t("pause.startOver"), onClick: () => this.actions.startOver() }
    ]);
  }
  renderMassDelete(deletions) {
    for (const deletion of deletions) {
      this.paragraph(
        deletion.side === "local" ? t("pause.mass.local", countVars(deletion)) : t("pause.mass.remote", countVars(deletion))
      );
      this.list(deletion.paths);
    }
    if (this.approvedEarlier > 0) {
      this.paragraph(t("pause.mass.approvedEarlier", { count: formatCount(this.approvedEarlier) }));
    }
    this.paragraph(t("pause.mass.nothingYet"));
    let deleteText = t("pause.mass.applyAll");
    if (deletions.length === 1) {
      deleteText = deletions[0].side === "local" ? t("pause.mass.deleteRemote") : t("pause.mass.deleteLocal");
    }
    this.buttons([
      { text: t("pause.mass.restore"), cls: "mod-cta", onClick: () => this.actions.restore(deletions) },
      {
        text: deleteText,
        cls: "mod-warning",
        delay: CONFIRM_DELAY_S,
        onClick: () => this.actions.approve(deletions)
      },
      { text: t("pause.keepPaused"), onClick: () => void 0 }
    ]);
  }
  untouched() {
    return this.partial ? t("pause.partial") : t("pause.untouched");
  }
  paragraph(text) {
    this.contentEl.createEl("p", { text });
  }
  list(paths) {
    const listEl = this.contentEl.createDiv({ cls: "yadisk-pause-list" });
    for (const path of paths.slice(0, MAX_LISTED)) {
      listEl.createDiv({ text: path });
    }
    if (paths.length > MAX_LISTED) {
      listEl.createDiv({
        cls: "yadisk-pause-more",
        text: t("queue.more", { count: formatCount(paths.length - MAX_LISTED) })
      });
    }
  }
  /** Every button closes the dialog first; what it does comes after. */
  buttons(specs) {
    const footer = this.contentEl.createDiv({ cls: "modal-button-container" });
    for (const spec of specs) {
      const btn = footer.createEl("button", { text: spec.text });
      if (spec.cls)
        btn.addClass(spec.cls);
      btn.addEventListener("click", () => {
        if (btn.disabled)
          return;
        this.close();
        spec.onClick();
      });
      if (spec.delay)
        this.startCountdown(btn, spec.text, spec.delay);
    }
  }
  startCountdown(btn, text, seconds) {
    let left = seconds;
    btn.disabled = true;
    btn.setText(`${text} (${left})`);
    this.countdownTimer = window.setInterval(() => {
      left--;
      if (left > 0) {
        btn.setText(`${text} (${left})`);
        return;
      }
      this.stopCountdown();
      btn.disabled = false;
      btn.setText(text);
    }, 1e3);
  }
  stopCountdown() {
    if (this.countdownTimer !== null) {
      window.clearInterval(this.countdownTimer);
      this.countdownTimer = null;
    }
  }
};
function countVars(deletion) {
  return { count: formatCount(deletion.paths.length), total: formatCount(deletion.tracked) };
}
function formatCount(n) {
  return n.toLocaleString();
}

// src/main.ts
var DEBOUNCE_DELAY = 5e3;
var SELF_WRITE_TTL_MS = 3e4;
var SELF_WRITE_MAX_TRACKED = 2e3;
var SETTINGS_SAVE_DELAY = 400;
var STATUS_BAR_INTERVAL_MS = 500;
var AUTO_FULL_SYNC_MS = 10 * 60 * 1e3;
var NO_REVISION_MIN_INTERVAL_MS = 60 * 1e3;
var FULL_SCAN_MAX_AGE_MS = 10 * 60 * 1e3;
var STORAGE_CHECK_ATTEMPTS = 3;
var STORAGE_CHECK_RETRY_MS = 1e3;
var STORAGE_CHECK_TIMEOUT_MS = 5e3;
var PAUSE_REMINDER_MS = 10 * 60 * 1e3;
var YaDiskSyncPlugin = class extends import_obsidian11.Plugin {
  constructor() {
    super(...arguments);
    this.settings = DEFAULT_SETTINGS;
    this.client = null;
    this.stateManager = null;
    this.statusBarEl = null;
    this.statusBarButtonEl = null;
    this.statusBarState = "idle";
    this.statusBarTimer = null;
    this.autoSyncIntervalId = null;
    this.syncInProgress = false;
    this.currentEngine = null;
    this.currentProgress = null;
    this.debouncedSyncTimer = null;
    this.selfWrittenPaths = /* @__PURE__ */ new Map();
    /** A local edit is waiting to go up. Cleared once a sync carries it. */
    this.pendingLocalChange = false;
    this.lastRevision = null;
    this.revisionSupported = true;
    this.lastFullSyncAt = 0;
    this.lastFullScanAt = 0;
    this.autoTickInFlight = false;
    this.wakeLock = null;
    /** What the sync is doing and will do next, for the queue view. */
    this.queue = new SyncQueue();
    /**
     * Set while syncing is on hold because a sync found something it would
     * not act on. Kept in memory only. What makes the hold safe is that the
     * stored snapshots were not moved on, so the first sync after a restart
     * finds the same problem — or, if it has gone, has no reason to stop.
     */
    this.pause = null;
    this.pauseNotice = null;
    this.pauseNoticeAt = 0;
    this.pauseModal = null;
    /** A remote folder entered while a sync was running, applied once it ends. */
    this.pendingRemotePath = null;
    /** The one error notice on screen; see showError. */
    this.errorNotice = null;
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
    var _a2, _b2, _c, _d;
    const data = await this.loadData();
    this.settings = Object.assign({}, DEFAULT_SETTINGS, (_a2 = data == null ? void 0 : data.settings) != null ? _a2 : {});
    this.settings.concurrency = clampConcurrency(this.settings.concurrency);
    this.settings.deleteConfirmThreshold = clampThreshold(this.settings.deleteConfirmThreshold);
    this.settings.remotePath = normalizeRemotePath(this.settings.remotePath || DEFAULT_SETTINGS.remotePath);
    const legacyMinutes = (_b2 = data == null ? void 0 : data.settings) == null ? void 0 : _b2.autoSyncInterval;
    if (((_c = data == null ? void 0 : data.settings) == null ? void 0 : _c.autoSyncSeconds) === void 0 && typeof legacyMinutes === "number") {
      this.settings.autoSyncSeconds = Math.max(0, legacyMinutes) * 60;
    }
    delete this.settings.autoSyncInterval;
    setLanguage(this.settings.language);
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
    this.lastRevision = (_d = this.stateManager.getState().revision) != null ? _d : null;
    this.addSettingTab(new YaDiskSyncSettingTab(this.app, this));
    registerSyncIcon();
    this.registerView(QUEUE_VIEW_TYPE, (leaf) => new QueueView(leaf, this));
    this.addRibbonIcon(QUEUE_VIEW_ICON, t("ribbon.sync"), () => {
      var _a3;
      void this.openQueueView();
      if (!this.syncInProgress)
        void this.runSync();
      (_a3 = this.currentProgress) == null ? void 0 : _a3.reopen();
    });
    this.addCommand({
      id: "sync-now",
      name: t("command.syncNow"),
      callback: () => void this.runSync()
    });
    this.addCommand({
      id: "sync-full",
      name: t("command.syncFull"),
      callback: () => this.runFullSync()
    });
    this.addCommand({
      id: "push-all",
      name: t("command.pushAll"),
      callback: () => void this.runSync("push" /* Push */)
    });
    this.addCommand({
      id: "pull-all",
      name: t("command.pullAll"),
      callback: () => void this.runSync("pull" /* Pull */)
    });
    this.addCommand({
      id: "abort-sync",
      name: t("command.abort"),
      callback: () => this.abortSync()
    });
    this.addCommand({
      id: "show-sync-queue",
      name: t("command.showQueue"),
      callback: () => void this.openQueueView()
    });
    this.addCommand({
      id: "show-sync-status",
      name: t("command.showStatus"),
      callback: () => this.showSyncStatus()
    });
    this.statusBarButtonEl = this.addStatusBarItem();
    this.statusBarButtonEl.addClass("mod-clickable", "yadisk-status-button");
    this.statusBarButtonEl.setAttr("aria-label", t("button.sync"));
    this.statusBarButtonEl.setAttr("data-tooltip-position", "top");
    (0, import_obsidian11.setIcon)(this.statusBarButtonEl, QUEUE_VIEW_ICON);
    this.registerDomEvent(this.statusBarButtonEl, "click", () => void this.runSync());
    this.statusBarEl = this.addStatusBarItem();
    this.statusBarEl.addClass("mod-clickable");
    this.registerDomEvent(this.statusBarEl, "click", () => void this.openQueueView());
    this.updateStatusBar("idle");
    this.register(this.queue.subscribe(() => this.scheduleStatusBar()));
    this.setupAutoSync();
    this.registerDomEvent(document, "visibilitychange", () => {
      if (document.visibilityState !== "visible")
        return;
      if (this.settings.autoSyncSeconds <= 0)
        return;
      void this.autoSyncTick();
    });
    this.app.workspace.onLayoutReady(() => {
      this.registerEvent(this.app.vault.on("create", (file) => this.onFileChange(file, "created")));
      this.registerEvent(this.app.vault.on("modify", (file) => this.onFileChange(file, "modified")));
      this.registerEvent(this.app.vault.on("delete", (file) => this.onFileChange(file, "deleted")));
      this.registerEvent(
        this.app.vault.on("rename", (file, oldPath) => this.onFileChange(file, "renamed", oldPath))
      );
      if (this.settings.syncOnStartup && this.settings.accessToken) {
        window.setTimeout(() => {
          void this.runSync(void 0, "auto");
        }, 3e3);
      }
    });
  }
  onunload() {
    var _a2, _b2, _c;
    if (this.autoSyncIntervalId !== null) {
      window.clearInterval(this.autoSyncIntervalId);
    }
    if (this.debouncedSyncTimer !== null) {
      window.clearTimeout(this.debouncedSyncTimer);
    }
    if (this.statusBarTimer !== null) {
      window.clearTimeout(this.statusBarTimer);
    }
    (_a2 = this.pauseNotice) == null ? void 0 : _a2.hide();
    (_b2 = this.pauseModal) == null ? void 0 : _b2.close();
    (_c = this.errorNotice) == null ? void 0 : _c.hide();
  }
  /**
   * Shows an error that stays until dismissed. A sync that fails fails
   * again at every tick, so the new notice replaces the old one rather than
   * stacking up, and a clean sync takes it away.
   */
  showError(text) {
    var _a2;
    (_a2 = this.errorNotice) == null ? void 0 : _a2.hide();
    this.errorNotice = new import_obsidian11.Notice(text, 0);
  }
  clearError() {
    var _a2;
    (_a2 = this.errorNotice) == null ? void 0 : _a2.hide();
    this.errorNotice = null;
  }
  onFileChange(file, kind, oldPath) {
    if (!this.settings.accessToken)
      return;
    if (matchesExcludePattern(file.path, this.settings.excludePatterns))
      return;
    if (this.consumeSelfWrite(file.path))
      return;
    if (file instanceof import_obsidian11.TFile)
      this.queue.noteLocalChange(file.path, kind, oldPath);
    this.scheduleDebouncedSync();
  }
  scheduleDebouncedSync() {
    this.pendingLocalChange = true;
    this.refreshQueue();
    if (this.debouncedSyncTimer !== null) {
      window.clearTimeout(this.debouncedSyncTimer);
    }
    this.debouncedSyncTimer = window.setTimeout(() => {
      var _a2;
      this.debouncedSyncTimer = null;
      if (this.syncInProgress) {
        const sendable = [...this.queue.localChanges].filter(([, kind]) => kind !== "deleted").map(([path]) => path);
        (_a2 = this.currentEngine) == null ? void 0 : _a2.expedite(sendable);
        this.scheduleDebouncedSync();
        return;
      }
      void this.runSync(void 0, "auto");
    }, DEBOUNCE_DELAY);
  }
  /** True if this path was just written by the sync rather than the user. */
  consumeSelfWrite(path) {
    const at = this.selfWrittenPaths.get(path);
    if (at === void 0)
      return false;
    this.selfWrittenPaths.delete(path);
    return Date.now() - at < SELF_WRITE_TTL_MS;
  }
  noteSelfWrite(path) {
    const now = Date.now();
    this.selfWrittenPaths.set(path, now);
    if (this.selfWrittenPaths.size > SELF_WRITE_MAX_TRACKED) {
      for (const [key, at] of this.selfWrittenPaths) {
        if (now - at >= SELF_WRITE_TTL_MS)
          this.selfWrittenPaths.delete(key);
      }
    }
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
  /**
   * Points syncing at another remote folder. Takes effect between syncs,
   * never during one: a run reads the folder once when it starts, and the
   * client moving on mid-run would send the rest of its transfers elsewhere.
   * Kept out of the settings until then, since every save hands the
   * settings' folder to the client.
   */
  applyRemotePath(value) {
    const next = normalizeRemotePath(value.trim() || DEFAULT_SETTINGS.remotePath);
    if (this.syncInProgress) {
      this.pendingRemotePath = next;
      return;
    }
    if (next === normalizeRemotePath(this.settings.remotePath))
      return;
    this.settings.remotePath = next;
    this.client.setRemotePath(next);
    if (this.pause) {
      this.leavePause();
      this.updateStatusBar("idle");
    }
    void this.saveSettings();
  }
  setupAutoSync() {
    if (this.autoSyncIntervalId !== null) {
      window.clearInterval(this.autoSyncIntervalId);
      this.autoSyncIntervalId = null;
    }
    this.queue.nextCheckAt = null;
    if (this.settings.autoSyncSeconds > 0 && this.settings.accessToken) {
      const ms = this.settings.autoSyncSeconds * 1e3;
      this.queue.nextCheckAt = Date.now() + ms;
      this.autoSyncIntervalId = this.registerInterval(
        window.setInterval(() => {
          this.queue.nextCheckAt = Date.now() + ms;
          void this.autoSyncTick();
        }, ms)
      );
    }
    this.queue.notify();
  }
  /** Brings the queue's view of the plugin's own state up to date. */
  refreshQueue() {
    this.queue.paused = this.pause !== null;
    this.queue.notify();
  }
  async openQueueView() {
    var _a2;
    const { workspace } = this.app;
    let leaf = (_a2 = workspace.getLeavesOfType(QUEUE_VIEW_TYPE)[0]) != null ? _a2 : null;
    if (!leaf) {
      leaf = workspace.getLeftLeaf(false);
      if (!leaf)
        return;
      await leaf.setViewState({ type: QUEUE_VIEW_TYPE, active: true });
    }
    await workspace.revealLeaf(leaf);
  }
  syncNow() {
    void this.runSync();
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
    if (this.pause) {
      this.remindPause();
      return;
    }
    if (this.autoTickInFlight || this.syncInProgress)
      return;
    this.autoTickInFlight = true;
    try {
      if (this.pendingLocalChange) {
        await this.runSync(void 0, "auto");
        return;
      }
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
   *
   * `trustRevision` is for a sync asked for by hand: it takes the counter at
   * its word, which is what makes it quick. The full sync in the settings is
   * there for when the counter seems to have missed something.
   */
  async probeRemote(trustRevision = false) {
    if (!this.revisionSupported || this.lastRevision === null)
      return "unknown";
    if (!trustRevision && Date.now() - this.lastFullScanAt >= FULL_SCAN_MAX_AGE_MS)
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
  /**
   * A sync that trusts nothing it saved: it walks all of Yandex Disk and
   * reads every file in the vault again. For when a change made elsewhere
   * has not arrived; slow on a large vault, so the indicator shows at once.
   */
  runFullSync() {
    var _a2;
    void this.runSync(void 0, "manual", false, void 0, true);
    (_a2 = this.currentProgress) == null ? void 0 : _a2.reopen();
  }
  async runSync(directionOverride, trigger = "manual", remoteUnchangedHint, decision, full = false) {
    if (this.syncInProgress) {
      if (trigger === "manual")
        this.showSyncStatus();
      return;
    }
    if (!this.settings.accessToken) {
      new import_obsidian11.Notice(t("notice.authorizeFirst"));
      return;
    }
    if (!this.app.workspace.layoutReady) {
      if (trigger === "manual")
        new import_obsidian11.Notice(t("notice.vaultLoading"));
      return;
    }
    if (this.pause && trigger === "auto") {
      this.remindPause();
      return;
    }
    this.syncInProgress = true;
    this.updateStatusBar("syncing");
    const engine = new SyncEngine(this.app, this.client, this.stateManager, this.settings);
    this.currentEngine = engine;
    const progress = new SyncProgress(
      () => {
        engine.abort();
        progress.message(t("progress.cancelling"));
      },
      this.settings.progressDisplay,
      (text, lastFailure) => this.queue.setDetail(text, lastFailure)
    );
    progress.start();
    this.currentProgress = progress;
    const hadPendingChanges = this.pendingLocalChange;
    this.pendingLocalChange = false;
    const carriedChanges = this.queue.takeLocalChanges();
    const keepWaiting = () => {
      this.pendingLocalChange = this.pendingLocalChange || hadPendingChanges;
      this.queue.restoreLocalChanges(carriedChanges);
    };
    this.queue.begin();
    this.refreshQueue();
    try {
      const remoteUnchanged = remoteUnchangedHint != null ? remoteUnchangedHint : await this.probeRemote(trigger === "manual") === "unchanged";
      const stats = await engine.run(directionOverride, {
        reporter: progress,
        queue: this.queue,
        checkpoint: () => this.saveSettings(),
        remoteUnchanged,
        onPlanReady: (total) => {
          if (total >= WAKE_LOCK_MIN_ITEMS)
            void this.acquireWakeLock();
        },
        onFileWritten: (path) => this.noteSelfWrite(path),
        checkStorage: () => this.vaultStorageAvailable(),
        approvedDeletions: decision == null ? void 0 : decision.approve,
        restorePaths: decision == null ? void 0 : decision.restore,
        rehashLocal: full
      });
      if (stats.blocked) {
        keepWaiting();
        this.enterPause(
          {
            block: stats.blocked,
            direction: directionOverride,
            partial: stats.uploaded + stats.downloaded + stats.deleted > 0,
            approved: decision == null ? void 0 : decision.approve
          },
          trigger === "manual"
        );
        return;
      }
      const complete = !stats.aborted && stats.errors === 0 && stats.skipped === 0;
      if (complete && this.revisionSupported) {
        try {
          this.lastRevision = await this.client.getDiskRevision();
        } catch (e) {
          this.lastRevision = null;
        }
      } else {
        this.lastRevision = null;
      }
      this.stateManager.setRevision(this.lastRevision);
      await this.saveSettings();
      if (this.pause)
        this.leavePause();
      if (!complete) {
        keepWaiting();
      }
      this.reportResult(stats, trigger);
      this.lastFullSyncAt = Date.now();
      if (!remoteUnchanged && !stats.aborted)
        this.lastFullScanAt = Date.now();
    } catch (e) {
      console.error("[YaDisk Sync] Sync error:", e);
      this.showError(t("notice.syncError", { message: describeError(e) }));
      this.updateStatusBar(this.pause ? "paused" : "error");
      keepWaiting();
    } finally {
      progress.close();
      this.currentProgress = null;
      this.releaseWakeLock();
      this.syncInProgress = false;
      this.currentEngine = null;
      this.queue.end();
      this.refreshQueue();
      if (this.pendingRemotePath !== null) {
        const next = this.pendingRemotePath;
        this.pendingRemotePath = null;
        this.applyRemotePath(next);
      }
    }
  }
  /**
   * Whether the vault's own storage is still there to be read.
   *
   * The plugin's manifest lives inside the vault and the plugin never writes
   * it, so it is on disk exactly while the vault is. Not so data.json: the
   * plugin writes that itself, and a write can land in whatever is left at
   * the vault's path once its drive is unmounted.
   */
  async vaultStorageAvailable() {
    var _a2;
    const dir = (_a2 = this.manifest.dir) != null ? _a2 : `${this.app.vault.configDir}/plugins/${this.manifest.id}`;
    const marker = `${dir}/manifest.json`;
    for (let attempt = 1; attempt <= STORAGE_CHECK_ATTEMPTS; attempt++) {
      const found = await resolveWithin(this.app.vault.adapter.exists(marker), STORAGE_CHECK_TIMEOUT_MS);
      if (found === true)
        return true;
      if (found === null)
        return false;
      if (attempt < STORAGE_CHECK_ATTEMPTS)
        await sleep(STORAGE_CHECK_RETRY_MS);
    }
    return false;
  }
  /** Puts syncing on hold and says so. */
  enterPause(pause, openReview) {
    this.pause = pause;
    this.refreshQueue();
    this.updateStatusBar("paused");
    this.announcePause();
    if (openReview)
      this.openPauseReview();
  }
  leavePause() {
    var _a2, _b2;
    this.pause = null;
    this.refreshQueue();
    (_a2 = this.pauseNotice) == null ? void 0 : _a2.hide();
    this.pauseNotice = null;
    (_b2 = this.pauseModal) == null ? void 0 : _b2.close();
    this.pauseModal = null;
  }
  announcePause() {
    var _a2;
    if (!this.pause)
      return;
    (_a2 = this.pauseNotice) == null ? void 0 : _a2.hide();
    this.pauseNotice = showPauseNotice(
      describeBlock(this.pause.block, this.pause.partial),
      () => this.openPauseReview()
    );
    this.pauseNoticeAt = Date.now();
  }
  /**
   * Brings the notice back now and then while on hold. A phone has no status
   * bar, so once the notice is dismissed nothing else says that edits have
   * stopped going anywhere.
   */
  remindPause() {
    if (Date.now() - this.pauseNoticeAt < PAUSE_REMINDER_MS)
      return;
    this.announcePause();
  }
  openPauseReview() {
    var _a2;
    const pause = this.pause;
    if (!pause)
      return;
    const approved = pause.approved;
    const syncAgain = (decision) => {
      void this.runSync(pause.direction, "manual", void 0, decision);
    };
    (_a2 = this.pauseModal) == null ? void 0 : _a2.close();
    this.pauseModal = new PauseModal(
      this.app,
      pause.block,
      pause.partial,
      approved ? approved.local.size + approved.remote.size : 0,
      {
        recheck: () => syncAgain({ approve: approved }),
        startOver: () => {
          this.stateManager.resetState();
          syncAgain();
        },
        restore: (deletions) => syncAgain({ approve: approved, restore: pathsOf(deletions) }),
        approve: (deletions) => syncAgain({ approve: withApproved(approved, deletions) })
      }
    );
    this.pauseModal.open();
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
    let counts = t("result.counts", { up: stats.uploaded, down: stats.downloaded, del: stats.deleted });
    if (stats.skipped > 0)
      counts += t("result.kept", { count: stats.skipped });
    if (stats.aborted) {
      new import_obsidian11.Notice(t("result.cancelled", { counts }));
      this.updateStatusBar("idle");
      return;
    }
    if (stats.gaveUp || stats.errors > 0) {
      const head = stats.gaveUp ? t("result.gaveUp", { count: FAILURE_STREAK_LIMIT }) : t("result.withErrors");
      const last = stats.lastError ? ` ${t("progress.lastError", { path: stats.lastError.path, message: stats.lastError.message })}` : "";
      this.showError(`${head} ${counts}${t("result.errors", { count: stats.errors })}.${last}`);
      this.updateStatusBar("error");
      return;
    }
    this.clearError();
    this.updateStatusBar("idle");
    if (trigger !== "manual")
      return;
    new import_obsidian11.Notice(moved > 0 ? t("result.complete", { counts }) : t("result.upToDate"));
  }
  /** Re-shows the progress indicator after it was dismissed, or the review when on hold. */
  showSyncStatus() {
    if (this.currentProgress) {
      this.currentProgress.reopen();
    } else if (this.pause) {
      this.openPauseReview();
    } else {
      new import_obsidian11.Notice(t("notice.noSync"));
    }
  }
  abortSync() {
    if (this.currentEngine) {
      this.currentEngine.abort();
      new import_obsidian11.Notice(t("notice.stopping"));
    } else {
      new import_obsidian11.Notice(t("notice.noSync"));
    }
  }
  updateStatusBar(status) {
    this.statusBarState = status;
    this.renderStatusBar();
  }
  /** Redraws at most every STATUS_BAR_INTERVAL_MS; the queue changes per file. */
  scheduleStatusBar() {
    if (this.statusBarTimer !== null)
      return;
    this.statusBarTimer = window.setTimeout(() => {
      this.statusBarTimer = null;
      this.renderStatusBar();
    }, STATUS_BAR_INTERVAL_MS);
  }
  renderStatusBar() {
    var _a2;
    const el = this.statusBarEl;
    if (!el)
      return;
    el.empty();
    (_a2 = this.statusBarButtonEl) == null ? void 0 : _a2.toggleClass("is-syncing", this.statusBarState === "syncing");
    switch (this.statusBarState) {
      case "idle":
        el.setText(t("status.synced"));
        break;
      case "syncing":
        if (this.queue.stage === "transferring") {
          el.createSpan({
            text: t("status.progress", { done: this.queue.finishedCount(), total: this.queue.entries.length })
          });
          if (this.settings.statusBarCounts)
            renderRemaining(el, this.queue);
        } else {
          el.setText(t("status.scanning"));
        }
        break;
      case "error":
        el.setText(t("status.error"));
        break;
      case "paused":
        el.setText(t("status.paused"));
        break;
    }
  }
};
function clampConcurrency(value) {
  if (!Number.isFinite(value))
    return DEFAULT_SETTINGS.concurrency;
  return Math.min(MAX_CONCURRENCY, Math.max(MIN_CONCURRENCY, Math.round(value)));
}
function clampThreshold(value) {
  if (!Number.isFinite(value) || value < DELETE_GUARD_FLOOR)
    return DEFAULT_SETTINGS.deleteConfirmThreshold;
  return Math.round(value);
}
function pathsOf(deletions) {
  const paths = /* @__PURE__ */ new Set();
  for (const deletion of deletions) {
    for (const path of deletion.paths)
      paths.add(path);
  }
  return paths;
}
function withApproved(earlier, deletions) {
  const local = new Set(earlier == null ? void 0 : earlier.local);
  const remote = new Set(earlier == null ? void 0 : earlier.remote);
  for (const deletion of deletions) {
    const target = deletion.side === "local" ? local : remote;
    for (const path of deletion.paths)
      target.add(path);
  }
  return { local, remote };
}
