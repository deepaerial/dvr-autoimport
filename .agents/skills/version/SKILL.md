---
name: version
description: Bumps the DVR auto-importer version (major/minor/patch, patch by default) and adds an entry to CHANGELOG.md. Use when asked to bump/update the version, make a release, or add a changelog entry. Honors a user-supplied description of the changes if provided.
---

# Version bump + changelog

Bump the project version and document the release in `CHANGELOG.md`, following
the existing conventions in the repo (Keep a Changelog + SemVer).

## Determine the bump level

- `major` bumps X in X.Y.Z
- `minor` bumps Y
- `patch` bumps Z (the default when the user does not specify)

## Read the current version

The single source of truth is `wails.json` → `info.productVersion` (e.g. `1.0.3`).

Cross-check `frontend/package.json` → `version`. If they disagree, still trust
`wails.json` and mention the drift to the user.

Compute the next version with semver rules (reset Z on minor, reset Z+Y on major).

## Bump the version files

1. `npm --prefix frontend version <X.Y.Z> --no-git-tag-version`
   - Sets the exact new version in `frontend/package.json` and
     `frontend/package-lock.json` (both occurrences) and creates no commit or tag.
2. Edit `wails.json` `info.productVersion` to the same value.
3. Update the version string in `frontend/src/main.tsx` (passed to `<App>` as
   `version='v1.X.Y.Z'` — note the leading `v`) so the header displays the new version.
4. Do NOT edit `build/bin/.../Info.plist` — it is a gitignored build artifact.
5. Verify all version files match (grep for the old version to confirm no leftovers).

## Draft the changelog entry

- If the user supplied a description of changes, use it directly.
- Otherwise run `git log --oneline` back to the previous version in `CHANGELOG.md`
  and group the commits into keep-a-changelog subsections
  (`### Added`, `### Changed`, `### Fixed`, `### Removed`).
- Show the draft to the user for confirmation before writing it.

## Write the changelog entry

Insert at the top of `CHANGELOG.md`, above the current newest entry, matching
the existing style exactly:

```markdown
## [X.Y.Z] - YYYY-MM-DD
### Added
- ...
### Fixed
- ...
```

- Date is `YYYY-MM-DD` for today.
- No blank line between the `##` header and the first `###` subsection.
- `- ` bullets per item.

## Verify

- Version consistent across `wails.json`, `frontend/package.json`,
  `frontend/package-lock.json`, and `frontend/src/main.tsx`.
- New entry sits at the top of `CHANGELOG.md`.
- Markdown is well-formed (subsections and bullets align with neighbors).