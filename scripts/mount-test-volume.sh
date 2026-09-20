#!/usr/bin/env bash
set -euo pipefail

# mount-test-volume.sh
#
# Creates a sparse disk image of a source folder and mounts it as a real
# macOS volume. The app's "SOURCE_VOLUME" dropdown is populated from
# VolumesFromGetfsstat(), so a mounted volume shows up there and its contents
# can be scanned as normal media files.
#
# The image lives under testData/.volumes/ next to the repo (testData is gitignored).
#
# Usage:
#   ./scripts/mount-test-volume.sh [source-folder] [volume-name]
#   ./scripts/mount-test-volume.sh --detach [volume-name]      # unmount the image(s)
#
# Examples:
#   ./scripts/mount-test-volume.sh                              # testData/input -> /Volumes/DVR_INPUT
#   ./scripts/mount-test-volume.sh testData/output DVR_OUTPUT   # output folder as a volume
#   ./scripts/mount-test-volume.sh --detach DVR_INPUT           # unmount DVR_INPUT
#
# Notes:
#   - The volume is a copy of the source folder, kept in sync on every run
#     via rsync (so edits/deletions in the source folder are reflected).
#   - If the source folder grows beyond the image size, delete the image file
#     under testData/.volumes/ and re-run to rebuild it.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
IMG_DIR="${REPO_ROOT}/testData/.volumes"

usage() {
  sed -n '2,30p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'
  exit 1
}

if [[ "${1:-}" == "--detach" ]]; then
  VOL_NAME="${2:-}"
  if [[ -z "$VOL_NAME" ]]; then
    usage
  fi
  MOUNTPOINT="/Volumes/$VOL_NAME"
  if mount | grep -q " $MOUNTPOINT "; then
    hdiutil detach "$MOUNTPOINT" >/dev/null
    echo "Detached $MOUNTPOINT"
  else
    echo "Volume $MOUNTPOINT is not mounted"
  fi
  exit 0
fi

SRC="${1:-$REPO_ROOT/testData/input}"
VOL_NAME="${2:-DVR_INPUT}"
MOUNTPOINT="/Volumes/$VOL_NAME"
IMG_PATH="$IMG_DIR/$VOL_NAME.sparseimage"

SRC="$(cd "$SRC" && pwd)"
if [[ ! -d "$SRC" ]]; then
  echo "Source folder does not exist: $SRC" >&2
  exit 1
fi

mkdir -p "$IMG_DIR"

if mount | grep -q " $MOUNTPOINT "; then
  echo "Already mounted at $MOUNTPOINT"
else
  if [[ ! -f "$IMG_PATH" ]]; then
    SIZE_MB="$(du -sm "$SRC" | awk '{print $1}')"
    SIZE_MB=$(( SIZE_MB * 110 / 100 + 64 )) # +10% for filesystem overhead
    if [[ "$SIZE_MB" -lt 256 ]]; then
      SIZE_MB=256
    fi
    echo "Creating disk image ($SIZE_MB MB) for $SRC..."
    hdiutil create \
      -size "${SIZE_MB}m" \
      -type SPARSE \
      -fs APFS \
      -volname "$VOL_NAME" \
      -ov \
      "$IMG_PATH"
  fi
  echo "Mounting image at $MOUNTPOINT..."
  hdiutil attach "$IMG_PATH" -mountpoint "$MOUNTPOINT" >/dev/null
fi

echo "Syncing $SRC into $MOUNTPOINT..."
rsync -a --delete --progress "$SRC/" "$MOUNTPOINT/"

echo
echo "Volume ready: $MOUNTPOINT"
echo "Refresh the volume dropdown in the app and select it."