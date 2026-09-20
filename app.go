package main

import (
	"context"
	"fmt"
	"io/fs"
	"log"
	"os"
	"os/exec"
	"path/filepath"
	"strings"

	wailsruntime "github.com/wailsapp/wails/v2/pkg/runtime"
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

// GetDefaultExportDestination returns the value of the DVR_EXPORT_PATH environment variable if it exists.
func (a *App) GetDefaultExportDestination() string {
	return os.Getenv("DVR_EXPORT_PATH")
}

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

// GetMediaFilesForVolume walks through the specified volume path and collects information about media files.
// It returns a slice of MediaFile structs containing the path, filename, size, status, and duration of each media file found.
// The function handles permission errors gracefully by logging them and skipping the affected files or directories.
// Parameters:
//   - volumePath: The root directory path of the volume to scan for media files.
//
// Returns:
//   - A slice of MediaFile structs representing the media files found on the volume.
//   - An error if any unexpected issues occur during the directory traversal.
func (a *App) GetMediaFilesForVolume(volumePath string) ([]MediaFile, error) {
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
		name := info.Name()
		if strings.HasPrefix(name, ".") {
			// skip hidden files
			return nil
		}
		fileinfo, err := info.Info()
		if err != nil {
			log.Printf("error getting file size for %s: %v", path, err)
			return nil
		}
		duration, err := GetVideoDurationSeconds(path)
		if err != nil {
			log.Printf("error getting video duration for %s: %v", path, err)
			duration = 0
		}
		foundMediaFiles = append(foundMediaFiles, MediaFile{Path: path, Filename: name, Size: fileinfo.Size(), Status: "found", Duration: duration, ExportPath: ""})
		return nil
	})
	if err != nil {
		log.Printf("error at: %v", err)
	}
	return foundMediaFiles, nil
}

// Function returns a list of media files that have already been exported to the destination folder.
func (a *App) CheckIfFilesAlreadyExported(files []MediaFile, destFolderBase string) ([]MediaFile, error) {
	var alreadyExported []MediaFile = []MediaFile{}
	for _, file := range files {
		destPath, err := GetDestinationPathForFile(file.Path, destFolderBase)
		if err != nil {
			log.Printf("error getting destination path for %s: %v", file.Path, err)
			continue
		}
		if _, err := os.Stat(destPath); err == nil {
			file.Status = "completed"
			file.ExportPath = destPath
			alreadyExported = append(alreadyExported, file)
		} else if !os.IsNotExist(err) {
			log.Printf("error checking if file exists at %s: %v", destPath, err)
		}
	}
	return alreadyExported, nil
}

// ChooseDestinationFolder opens a directory selection dialog and returns the selected path.
func (a *App) ChooseDestinationFolder() (string, error) {
	result, err := wailsruntime.OpenDirectoryDialog(a.ctx, wailsruntime.OpenDialogOptions{
		Title: "Choose Export Destination",
	})
	if err != nil {
		return "", err
	}
	return result, nil
}

// ShowFileInFilesystem reveals the specified file in the user's file explorer.
// It constructs the full path to the file using the destination folder and the file's original path
// to determine the creation date-based subfolder.
func (a *App) ShowFileInFilesystem(filePath string) error {

	cmd := exec.Command("open", "-R", filePath)
	err := cmd.Run()
	if err != nil {
		return fmt.Errorf("failed to open file in filesystem: %w", err)
	}

	return nil
}

// ExportFiles delegates to the copy logic in copy.go. It is a method on App only
// because Wails binds exported methods on the bound struct.
func (a *App) ExportFiles(files []string, destinationPath string) error {
	return ExportFiles(a.ctx, files, destinationPath)
}
