# Yandex Disk Sync for Obsidian

Synchronize your Obsidian vault with Yandex Disk. Supports bidirectional sync, conflict resolution, and works on mobile (iPad/iPhone).

## Features

- **Bidirectional sync** with three-way merge algorithm
- **Auto-sync** on file changes (create, edit, delete, rename)
- **Cheap change detection** — a poll costs a single request, so short intervals are affordable
- **Parallel transfers** — configurable, so large vaults finish in minutes instead of hours
- **Progress you can see on mobile**, with a cancel button — shown only when a sync runs long enough to be worth reporting
- **Resumable** — an interrupted sync picks up where it left off instead of starting over
- **Conflict resolution** — choose per file: keep local, remote, or skip
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

1. Open plugin settings
2. Click **Sign in**
3. Authorize in the browser and copy the code
4. Paste the code and click **Confirm**
5. Set the remote folder path (default: `/ObsidianVault`)
6. Press the sync button in the ribbon or use the command palette

## Commands

| Command | Description |
|---------|-------------|
| Sync now | Run bidirectional sync |
| Push all | Upload everything to Yandex Disk |
| Pull all | Download everything from Yandex Disk |
| Abort sync | Stop the current sync operation |
| Show sync status | Bring the progress indicator back up |

## Settings

| Setting | Description |
|---------|-------------|
| Remote folder | Path on Yandex Disk to sync against |
| Direction | Bidirectional, push only, or pull only |
| Conflict strategy | Newer wins, local wins, remote wins, or ask |
| Auto-sync interval | How often to check the disk for changes, from every 10 seconds |
| Sync on startup | Run a sync shortly after Obsidian opens |
| Exclude patterns | Glob patterns to skip, one per line |
| Max file size | Files above this size are not synced |
| Parallel transfers | How many files to transfer at once (1–8) |
| Show sync progress | When the progress indicator appears: only for long syncs (default), always, or never |
| Keep screen on during long syncs | Prevents the screen locking mid-transfer on mobile |

## How sync works

The plugin uses a **three-way merge** algorithm:

- Compares the current local state, current remote state, and the snapshot from the last sync
- Detects new, modified, and deleted files on both sides
- Resolves conflicts based on your chosen strategy (newer wins, local wins, remote wins, or ask)

Files are compared by MD5, which Yandex Disk reports for every file, so a sync never re-transfers content that already matches on both sides.

## Large vaults

Some notes if your vault runs to thousands of files.

**Editing a note does not wait for the poll interval.** Five seconds after you stop typing, the changed file is uploaded. That upload does not scan the remote side at all, as long as nothing else changed on your disk in the meantime.

**The poll interval is for changes made elsewhere** — on your desktop, say. Each poll reads one counter from Yandex Disk and does nothing further unless it moved, which is why intervals as short as 10 seconds are practical. The remote tree is re-walked in full at least every 10 minutes regardless.

**The first sync is the expensive one**, because every file has to cross the network. Raise **Parallel transfers** to speed it up, and lower it again if Yandex Disk starts rate-limiting. Progress is shown throughout and the sync can be cancelled; state is checkpointed every 15 seconds, so closing Obsidian midway costs you the current file, not the whole run.

**On iOS, a sync only runs while Obsidian is on screen.** The system suspends backgrounded apps, and a plugin cannot ask for background execution — that requires capabilities the host app has to declare. Switching away pauses the sync; returning resumes it. The **Keep screen on during long syncs** setting stops the screen lock from suspending the app mid-transfer.

## License

[MIT](LICENSE)
