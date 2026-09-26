# Yandex Disk Sync for Obsidian

**English** | [Русский](https://github.com/Nikolay-Eltsov/obsidian-yadisk-sync/blob/main/README.ru.md)

Synchronize your Obsidian vault with Yandex Disk. Supports bidirectional sync, conflict resolution, and works on mobile (iPad/iPhone).

## Features

- **Bidirectional sync** with three-way merge algorithm
- **Auto-sync** on file changes (create, edit, delete, rename)
- **Cheap change detection** — a poll costs a single request, so short intervals are affordable
- **Parallel transfers** — configurable, so large vaults finish in minutes instead of hours
- **Progress you can see on mobile**, with a cancel button — shown only when a sync runs long enough to be worth reporting
- **Sync queue** in the sidebar — what is transferring now, what comes next, and what finished or failed
- **Resumable** — an interrupted sync picks up where it left off instead of starting over
- **Conflict resolution** — choose per file: keep local, remote, or skip
- **Protection against mass deletion** — a disconnected drive, a missing remote folder or an unusually large deletion pauses the sync and asks, instead of deleting everywhere
- **Push / Pull modes** — one-directional sync when needed
- **Exclude patterns** — skip files by glob patterns (e.g. `.trash/**`)
- **Max file size filter** — skip large files automatically

## Installation

1. In Obsidian: **Settings → Community plugins → Browse**
2. Search for **"Yandex Disk Sync"**
3. Click **Install**, then **Enable**

### Manual installation

1. Download `main.js`, `manifest.json`, `styles.css` from the [latest release](https://github.com/Nikolay-Eltsov/obsidian-yadisk-sync/releases)
2. Create folder `.obsidian/plugins/yadisk-sync/` in your vault
3. Copy the downloaded files into it
4. Reload Obsidian and enable the plugin

## Setup

1. Open plugin settings. The language can be switched at the very top; by default it follows Obsidian's
2. Click **Sign in**
3. Authorize in the browser and copy the code
4. Paste the code and click **Confirm**
5. Set the remote folder path (default: `/ObsidianVault`)
6. Press the sync button in the ribbon: it starts a sync and opens the sync queue in the sidebar

## Commands

| Command | Description |
|---------|-------------|
| Sync now | Run bidirectional sync. Quick when Yandex Disk reports no changes: the remote folder is not read again. Also the sync icon in the status bar (desktop), which opens nothing |
| Full sync: read Yandex Disk and the vault again | Walk the whole remote folder and re-check every file in the vault, trusting nothing saved — for when a change made elsewhere has not arrived. Also a button at the end of the settings |
| Push all | Upload everything to Yandex Disk |
| Pull all | Download everything from Yandex Disk |
| Abort sync | Stop the current sync operation |
| Show sync queue | Open the queue in the sidebar |
| Show sync status | Bring the progress indicator back up |

## Settings

| Setting | Description |
|---------|-------------|
| Language | Language of the settings: same as Obsidian, English, or Russian |
| Remote folder | Path on Yandex Disk to sync against. Takes effect once you finish editing |
| Direction | Bidirectional, push only, or pull only |
| Conflict strategy | Newer wins, local wins, remote wins, or ask |
| Ask before large deletions | A sync that would delete this many files on one side, or a quarter of them, pauses and asks first |
| Auto-sync interval | How often to check the disk for changes, from every 10 seconds |
| Sync on startup | Run a sync shortly after Obsidian opens |
| Exclude patterns | Glob patterns to skip, one per line |
| Max file size | Files above this size are not synced |
| Parallel transfers | How many files to upload or download at once (1–8) |
| Parallel folder scans | How many folders on Yandex Disk to read at once when looking for changes (1–24) |
| Show sync progress | When the progress indicator appears: only for long syncs, always, or never (default; the queue panel shows the same) |
| Remaining files in the status bar | During a sync, show how many files are left to upload, download and delete. Desktop only; off by default, the queue panel shows the same |
| Keep screen on during long syncs | Prevents the screen locking mid-transfer on mobile |

### Full sync or reset?

Both buttons at the end of the settings read everything again, but they are not the same:

| | Full sync | Reset sync state |
|---|---|---|
| Starts a sync | right away | no, changes the next one |
| Memory of the last sync | kept | erased |
| Deletions | carried over | not carried over; deleted files come back |
| Edits | carried over as usual | every difference is a conflict |
| Re-reads Yandex Disk and the vault | yes | yes, on the next sync |

Use the full sync when a change made elsewhere has not arrived. Reset is for when the memory of the last sync itself seems wrong — the vault was restored from a backup, say, or copied to another device.

## How sync works

The plugin uses a **three-way merge** algorithm:

- Compares the current local state, current remote state, and the snapshot from the last sync
- Detects new, modified, and deleted files on both sides
- Resolves conflicts based on your chosen strategy (newer wins, local wins, remote wins, or ask)

Files are compared by MD5, which Yandex Disk reports for every file, so a sync never re-transfers content that already matches on both sides.

A sync that fails or is interrupted partway through retries what it did not finish on the next run, rather than counting it as done. Failures are shown as they happen, with the file and the reason, and if 20 transfers fail in a row the sync stops and says why instead of working through the rest.

## Protection against mass deletion

A file missing from one side normally means it was deleted, and the sync repeats that on the other side — and from there on every other device. That only holds while the side it is missing from is really there, so the plugin checks before it believes it:

- **The vault is still there.** Obsidian keeps its file list in memory, and when the drive holding the vault is disconnected, files drop out of that list as if they had been deleted. Every sync first checks that the vault can still be read, and checks again before each phase and before each deletion on Yandex Disk.
- **Obsidian's list matches the disk.** A file is deleted on Yandex Disk for being missing here only if it is missing from the disk itself, not just from Obsidian's list — which goes stale when a drive is reconnected while Obsidian is running.
- **The remote folder still exists.** If it was renamed, deleted or mistyped, nothing in the vault is deleted over it. Pointing the plugin at a different folder syncs against it as if for the first time.
- **Excluded files are left alone.** Adding an exclude pattern, or a file outgrowing the size limit, takes a file out of syncing; it is not deleted on the other side.
- **Large deletions ask first.** A sync that would delete at least the number of files set in **Ask before large deletions** (50 by default) on one side, or a quarter of them, pauses. Renamed and moved files do not count.

While paused, nothing syncs on its own. The notice, the sync button and the "Show sync status" command open a review that lists the files. From there you can restore them from the side that still has them, delete them after a 10-second countdown, or keep the sync paused. The pause itself is not stored: after a restart the checks simply run again, and stop the sync again if the problem is still there.

## Large vaults

Some notes if your vault runs to thousands of files.

**Editing a note does not wait for the poll interval.** Five seconds after you stop typing, the changed file is uploaded. That upload does not scan the remote side at all, as long as nothing else changed on your disk in the meantime.

**The poll interval is for changes made elsewhere** — on your desktop, say. Each poll reads one counter from Yandex Disk and does nothing further unless it moved, which is why intervals as short as 10 seconds are practical. The remote tree is re-walked in full at least every 10 minutes regardless. The counter covers the whole account, not just the vault's folder, so a change anywhere on your Yandex Disk sets off a walk. Each folder costs one request, and **Parallel folder scans** sets how many are read at once: 160 folders take about 12 seconds at the default of 12.

**The first sync is the expensive one**, because every file has to cross the network. Raise **Parallel transfers** to speed it up, and lower it again if Yandex Disk starts rate-limiting. Progress is shown throughout and the sync can be cancelled; state is checkpointed every 15 seconds, so closing Obsidian midway costs you the current file, not the whole run.

**On iOS, a sync only runs while Obsidian is on screen.** The system suspends backgrounded apps, and a plugin cannot ask for background execution — that requires capabilities the host app has to declare. Switching away pauses the sync; returning resumes it. The **Keep screen on during long syncs** setting stops the screen lock from suspending the app mid-transfer.

## License

[MIT](LICENSE)
