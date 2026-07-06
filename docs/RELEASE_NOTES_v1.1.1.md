# SeedDeck v1.1.1

This release prepares SeedDeck for its first open-source desktop delivery. It focuses on the Windows desktop app: search, import, download management, seeding, history, settings, and source health in one polished workspace.

## Highlights

- Desktop torrent search and download app with a compact SeedDeck visual style.
- Public source search across built-in adapters.
- Magnet link import from search input, clipboard, command routing, and protocol handling.
- Local `.torrent` file import from file picker, file association, and drag-and-drop.
- Download queue with progress, speed, peers, ETA, pause, resume, retry, and remove actions.
- Completed download history and seeding controls.
- Source connectivity status on startup and search.
- Custom RSS source management from Settings.
- English and Chinese UI, dark and light themes.
- Windows x64 zip package for GitHub Releases.

## Verification

The following checks passed locally on Windows with Node.js 26.3.1 / npm 11.16.0 before preparing this release:

```sh
npm run typecheck
npm test  # 13 files, 69 tests
npm run desktop:build
npm run desktop:pack
npm run desktop:dist
npm run build
npm run verify:seeding
```

Automated desktop service acceptance covers source checks, search, magnet import, torrent-file import, canceled file dialogs, pause/resume/remove, history seeding, settings persistence, and custom RSS source management.

Real seeding verification confirms a local peer can download a 4 MB payload, pause stops uploads, and resume re-seeds successfully.


Desktop package smoke test:

- `release/win-unpacked/SeedDeck.exe` starts successfully when `ELECTRON_RUN_AS_NODE` is not set.
- No SeedDeck process remains after closing the app during the smoke test.

## Artifact

Upload this file to GitHub Releases:

```text
release/SeedDeck-1.1.1-win-x64.zip
```

Do not commit `release/` to the repository; it is ignored by `.gitignore`.

## Known Notes

- Use Node.js 22 or newer for development and packaging. This release was verified with Node.js 26.3.1.
- Public torrent sources may be unavailable depending on region, network, rate limits, or upstream markup/API changes.
- BitTorrent download speed depends on seeds, peers, NAT/firewall behavior, and peer upload capacity.

## Responsible Use

SeedDeck does not host, provide, or verify content. It searches public third-party sources and connects to the BitTorrent network from the user's machine. Use it only with content you are legally allowed to download or share.
