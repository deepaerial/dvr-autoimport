# AGENTS.md

Guidance for AI agents working in this repository.

## Project

DVR auto-importer — a macOS-only Wails app (Go backend + React/TypeScript frontend)
that scans volumes for media files (MP4/MOV/MKV/SRT) and exports them into folders
named after each file's creation date (`YYYY-MM-DD`).

Backend layout: `app.go` (App + volume/media discovery), `copy.go` (all copy/export
logic), `helpers.go` (media helpers, dates, mp4 probing), `types.go` (shared types).

## Verify changes

```bash
gofmt -l .
go build ./...
go vet ./...
```

Frontend lives under `frontend/` (npm based).

## Skills

- **Versioning** (`.agents/skills/version/`) — when asked to bump the version or add a
  changelog entry, load the `version` skill before editing any files. It defines the
  bump rules (SemVer), the version sources of truth (`wails.json`, `frontend/package.json`),
  the changelog format, and the verification steps.

## testData folder

`testData/` is a working directory for manual testing and is **gitignored** — do not
commit anything under it.

- `testData/input/` — source media files used as the test dataset for copying
  (real DVR recordings, several GB each).
- `testData/output/` — the destination folder where files should be exported to when
  testing the app: launch the app, choose `testData/output` as the export destination.
- `testData/.volumes/` — scratch dir created by the mount script below (sparse disk
  images). Safe to delete to rebuild volumes.

## Mounting test data as a volume

The app's source-volume dropdown is populated from `VolumesFromGetfsstat()`, which only
lists *mounted filesystems*. To make `testData/input` selectable in the UI, create a
mounted disk image volume from it:

```bash
./scripts/mount-test-volume.sh                       # mounts testData/input at /Volumes/DVR_INPUT
./scripts/mount-test-volume.sh testData/output DVR_OUTPUT   # any folder, any volume name
./scripts/mount-test-volume.sh --detach DVR_INPUT    # unmount
```

The script creates a sparse APFS image sized to fit the folder, mounts it, and rsyncs
the folder contents into it (with progress). Run it with any source folder; re-running
re-syncs changes. If the folder outgrows the image, delete
`testData/.volumes/<name>.sparseimage` and re-run to rebuild.