package main

import (
	"context"
	"io/fs"
	"log"
	"os"
	"path/filepath"
	"strings"

	"golang.org/x/sys/unix"
)

// App struct
type App struct {
	ctx context.Context
}

// NewApp creates a new App application struct
func NewApp() *App {
	return &App{}
}

// startup is called when the app starts. The context is saved
// so we can call the runtime methods
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
}

var mountPrefixesToSkip = [...]string{"/dev", "/System", "/private"}

// VolumesFromGetfsstat retrieves a list of mounted filesystem volumes on the system.
// Returns:
//   - A slice of strings representing the mount points of the filesystems.
//   - An error if any system call fails during the process.
func (a *App) VolumesFromGetfsstat() ([]string, error) {
	// first call to get count
	n, err := unix.Getfsstat(nil, unix.MNT_NOWAIT)
	if err != nil {
		return nil, err
	}
	buf := make([]unix.Statfs_t, n)
	_, err = unix.Getfsstat(buf, unix.MNT_NOWAIT)
	if err != nil {
		return nil, err
	}
	var vols []string
	for _, st := range buf {
		// mount point is Mntonname (fixed-size byte array)
		mp := string(st.Mntonname[:])
		// trim at first NUL
		if i := strings.IndexByte(mp, 0); i >= 0 {
			mp = mp[:i]
		}
		if shouldSkipMountPoint(mp) {
			continue
		}
		vols = append(vols, mp)
	}
	return vols, nil
}

type MediaFile struct {
	Path     string
	Filename string
	Size     int64
	Status   string
	Duration string
}

func (a *App) GetMediaFilesForVolume(volumePath string) ([]MediaFile, error) {
	// Placeholder implementation: In a real application, this function would
	// scan the specified volume for media files and return their paths.
	var foundMediaFiles []MediaFile
	err := filepath.WalkDir(volumePath, func(path string, info fs.DirEntry, err error) error {
		if err != nil {
			if os.IsPermission(err) {
				log.Printf("skipping (permission): %s: %v", path, err)
				return nil
			}
			log.Printf("walk error for %s: %v", path, err)
		}
		if info.IsDir() {
			return nil
		}
		if !IsMedia(path) {
			return nil
		}
		fileinfo, err := info.Info()
		if err != nil {
			log.Printf("error getting file size for %s: %v", path, err)
			return nil
		}
		// TODO: extract real duration for video files
		foundMediaFiles = append(foundMediaFiles, MediaFile{Path: path, Filename: info.Name(), Size: fileinfo.Size(), Status: "found", Duration: "0"})
		return nil
	})
	if err != nil {
		log.Printf("error at: %v", err)
	}
	return foundMediaFiles, nil
}
