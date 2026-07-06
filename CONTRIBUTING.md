# Contributing to SeedDeck

Thanks for helping make SeedDeck better. The project has two user surfaces now: a desktop app for everyday use and a terminal UI for keyboard-first users. Please keep both in mind when changing shared search, config, or download behavior.

## Set Up

```sh
cd seeddeck
npm install
```

Run the desktop app:

```sh
npm run desktop:dev
```

Run the terminal UI:

```sh
npm run dev
```

## Checks

Run these before opening a PR:

```sh
npm run typecheck
npm test
```

If you touched the desktop app, also run:

```sh
npm run desktop:build
```

If you touched the packaged CLI, also run:

```sh
npm run build
```

## Project Standards

Keep changes focused. One behavior change, bug fix, or cleanup per PR is much easier to review and release.

Reuse existing modules before adding new ones. Search sources belong in `src/sources/`, persisted app settings belong in `src/config/`, desktop-only UI belongs in `src/desktop/`, and terminal UI belongs in `src/ui/`.

Source adapters should fail softly. A broken source should report its status without blocking results from other sources.

OS-specific code must account for Windows, macOS, and Linux. If a branch cannot support one platform, surface a clear fallback message instead of throwing an opaque error.

Non-trivial logic should have a Vitest test. Pure helpers are easiest to test directly; platform behavior should mock Node built-ins or local services instead of depending on a contributor's machine.

Desktop UI should continue the current SeedDeck direction: dark, compact, readable, black/white foundation, and restrained neon accents. Avoid decorative clutter and avoid turning functional panels into a marketing page.

Terminal UI should remain lightweight and keyboard-friendly. If you add a key command, update both the help sheet and footer hints so users can discover it.

## Pull Requests

- Use Conventional Commit-style titles such as `feat:`, `fix:`, `docs:`, `chore:`, or `refactor:`.
- Explain why the change exists, not only what changed.
- Include screenshots or short screen recordings for visible desktop UI changes.
- Mention any source/network behavior you could not verify locally.

## Responsible Use

SeedDeck does not host or distribute content. It searches public third-party sources and connects to the BitTorrent network from the user's machine. Do not add sources, examples, tests, or documentation that encourage illegal downloads.
