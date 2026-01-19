package main

import (
	"context"
	"fmt"
	"io"
	"io/fs"
	"log"
	"os"
	"path/filepath"
	"strings"
	"sync"

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
	Duration uint64
}

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
		foundMediaFiles = append(foundMediaFiles, MediaFile{Path: path, Filename: name, Size: fileinfo.Size(), Status: "found", Duration: duration})
		return nil
	})
	if err != nil {
		log.Printf("error at: %v", err)
	}
	return foundMediaFiles, nil
}

// copyJob represents a single file copy operation.
type copyJob struct {
	sourcePath     string
	destFolderBase string
}

var copyBuffer = 8 * 1024 * 1024 // 8MB buffer

// ExportProgressPayload is the payload for the export-progress event
type ExportProgressPayload struct {
	FileName    string `json:"fileName"`
	FilePath    string `json:"filePath"`
	TotalSize   int64  `json:"totalSize"`
	BytesCopied int64  `json:"bytesCopied"`
	Percentage  int    `json:"percentage"`
}

// copyFile performs the actual file copying and emits progress events.
func (a *App) copyFile(src, destFolderBase string) error {
	sourceFileStat, err := os.Stat(src)
	creationDate, err := GetMediFileCreationDate(src)
	if err != nil {
		log.Printf("error getting creation date for %s: %v", src, err)
	}

	dstFolder := filepath.Join(destFolderBase, creationDate)
	// check if dst directory exists, if not create it
	err = os.MkdirAll(dstFolder, 0755)
	if err != nil {
		return fmt.Errorf("failed to create directory %s: %w", dstFolder, err)
	}
	if !sourceFileStat.Mode().IsRegular() {
		return fmt.Errorf("%s is not a regular file", src)
	}
	source, err := os.Open(src)
	if err != nil {
		return fmt.Errorf("failed to open source file %s: %w", src, err)
	}
	defer source.Close()

	dst := filepath.Join(dstFolder, filepath.Base(src))
	destination, err := os.Create(dst)
	if err != nil {
		return fmt.Errorf("failed to create destination file %s: %w", dst, err)
	}
	defer destination.Close()

	totalSize := sourceFileStat.Size()
	buf := make([]byte, copyBuffer)
	var bytesCopied int64
	lastPercentage := -1

	for {
		n, err := source.Read(buf)
		if err != nil && err != io.EOF {
			return fmt.Errorf("failed to read from source file %s: %w", src, err)
		}
		if n == 0 {
			break
		}

		if _, err := destination.Write(buf[:n]); err != nil {
			return fmt.Errorf("failed to write to destination file %s: %w", dst, err)
		}

		bytesCopied += int64(n)
		percentage := int(float64(bytesCopied) / float64(totalSize) * 100)

		if percentage > lastPercentage {
			payload := ExportProgressPayload{
				FileName:    filepath.Base(src),
				FilePath:    dst,
				TotalSize:   totalSize,
				BytesCopied: bytesCopied,
				Percentage:  percentage,
			}
			wailsruntime.EventsEmit(a.ctx, "export-progress", payload)
			lastPercentage = percentage
		}
	}

	return nil
}

// ExportFiles copies a list of files to a specified destination directory in parallel.
// It returns an error if any of the operations fail.
func (a *App) ExportFiles(files []string, destinationPath string) error {
	if len(files) == 0 {
		return nil // Nothing to export
	}

	// Ensure the destination directory exists
	err := os.MkdirAll(destinationPath, 0755)
	if err != nil {
		return fmt.Errorf("failed to create destination directory %s: %w", destinationPath, err)
	}

	numWorkers := 2 // Use a fixed number of workers to avoid disk thrashing
	log.Printf("Starting %d workers for file export", numWorkers)

	jobs := make(chan copyJob, len(files))
	var wg sync.WaitGroup
	errs := make(chan error, len(files))

	// Start worker goroutines
	for i := 0; i < numWorkers; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for job := range jobs {
				log.Printf("Copying %s to %s", job.sourcePath, job.destFolderBase)

				if err := a.copyFile(job.sourcePath, job.destFolderBase); err != nil {
					log.Printf("Error copying file %s: %v", job.sourcePath, err)
					errs <- err
				}
			}
		}()
	}

	// Send jobs to the channel
	for _, sourceFilePath := range files {
		jobs <- copyJob{sourcePath: sourceFilePath, destFolderBase: destinationPath}
	}
	close(jobs) // Close the jobs channel after all jobs are sent

	// Wait for all workers to finish
	wg.Wait()
	close(errs) // Close the errors channel after all workers are done

	// Collect any errors
	var allErrors []error
	for err := range errs {
		allErrors = append(allErrors, err)
	}

	if len(allErrors) > 0 {
		return fmt.Errorf("encountered %d errors during export: %v", len(allErrors), allErrors)
	}

	log.Printf("Successfully exported %d files to %s", len(files), destinationPath)
	return nil
}

func (a *App) ChooseDestinationFolder() (string, error) {
	result, err := wailsruntime.OpenDirectoryDialog(a.ctx, wailsruntime.OpenDialogOptions{
		Title: "Choose Export Destination",
	})
	if err != nil {
		return "", err
	}
	return result, nil
}
