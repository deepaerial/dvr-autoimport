package main

import (
	"os"
	"path/filepath"
	"strings"

	"github.com/abema/go-mp4"
	"github.com/sunfish-shogi/bufseekio"
)

var mountPrefixesToSkip = [...]string{"/dev", "/System", "/private"}

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

// TODO: This implementation works weird. Shows wrong size for files. Will need to fix later...
func GetVideoDurationSeconds(path string) (uint64, error) {
	// Placeholder implementation
	// In a real implementation, you would use a library to read video metadata
	// get basic informations
	file, err := os.Open(path)
	if err != nil {
		return 0, err
	}
	defer file.Close()
	info, err := mp4.Probe(bufseekio.NewReadSeeker(file, 1024, 4))
	if err != nil {
		return 0, err
	}
	return info.Duration, nil
}
