package main

import (
	"path/filepath"
	"strings"
)

func shouldSkipMountPoint(mountPoint string) bool {
	if mountPoint == "/" {
		return true
	}
	for _, prefix := range mountPrefixesToSkip {
		if strings.HasPrefix(mountPoint, prefix) {
			return true
		}
	}
	return false
}

// using a set for many extensions
var mediaExts = map[string]bool{
	".mp4": true, ".mov": true, ".mkv": true,
	".jpg": true, ".jpeg": true, ".png": true,
	".srt": true,
}

func IsMedia(path string) bool {
	ext := strings.ToLower(filepath.Ext(path))
	return mediaExts[ext]
}
