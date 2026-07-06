# Publishing SeedDeck

This guide covers the final steps after the local release checklist has passed.

## 1. Confirm Local State

```sh
git status
git log --oneline --decorate -5
```

Expected:

- The current branch is `main`.
- The working tree is clean.
- `release/`, `dist/`, `dist-desktop/`, `node_modules/`, caches, and logs are ignored.

## 2. Add Repository Metadata

After the GitHub repository exists, update `package.json` with the real URL:

```json
{
  "repository": {
    "type": "git",
    "url": "git+https://github.com/<owner>/seeddeck.git"
  },
  "bugs": {
    "url": "https://github.com/<owner>/seeddeck/issues"
  },
  "homepage": "https://github.com/<owner>/seeddeck#readme"
}
```

Commit that metadata change:

```sh
git add package.json package-lock.json
git commit -m "chore: add repository metadata"
```

## 3. Push Source

```sh
git remote add origin https://github.com/<owner>/seeddeck.git
git push -u origin main
```

If the remote already exists:

```sh
git remote set-url origin https://github.com/<owner>/seeddeck.git
git push -u origin main
```

## 4. Tag The Release

```sh
git tag v1.1.1
git push origin v1.1.1
```

## 5. Create GitHub Release

Create a GitHub Release from tag `v1.1.1`.

Use:

```text
docs/RELEASE_NOTES_v1.1.1.md
```

as the release notes.

Upload:

```text
release/SeedDeck-1.1.1-win-x64.zip
```

Do not commit files under `release/`; they are local build artifacts and are ignored by `.gitignore`.

## 6. Post-Release Smoke Check

After downloading the uploaded zip from GitHub Releases:

- Extract it to a clean folder.
- Start `SeedDeck.exe`.
- Run through the startup and search-source connectivity checks.
- Confirm no local-only path, cache, or debug file is bundled unexpectedly.
