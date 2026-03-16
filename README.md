# Yandex Disk Sync for Obsidian

Synchronize your Obsidian vault with Yandex Disk. Supports bidirectional sync, conflict resolution, and works on mobile (iPad/iPhone).

## Features

- **Bidirectional sync** with three-way merge algorithm
- **Auto-sync** on file changes (create, edit, delete, rename)
- **Conflict resolution** — choose per file: keep local, remote, or skip
- **Push / Pull modes** — one-directional sync when needed
- **Works on mobile** — uses Obsidian's `requestUrl()`, no CORS issues
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
2. Click **"Войти через Яндекс"** (Sign in with Yandex)
3. Authorize in the browser and copy the code
4. Paste the code and click **"Подтвердить"** (Confirm)
5. Set the remote folder path (default: `/ObsidianVault`)
6. Press the sync button in the ribbon or use the command palette

## Commands

| Command | Description |
|---------|-------------|
| Sync now | Run bidirectional sync |
| Push all | Upload everything to Yandex Disk |
| Pull all | Download everything from Yandex Disk |
| Abort sync | Stop the current sync operation |

## How sync works

The plugin uses a **three-way merge** algorithm:

- Compares the current local state, current remote state, and the snapshot from the last sync
- Detects new, modified, and deleted files on both sides
- Resolves conflicts based on your chosen strategy (newer wins, local wins, remote wins, or ask)

## License

[MIT](LICENSE)
