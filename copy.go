package main

import (
	"context"
	"fmt"
	"io"
	"log"
	"os"
	"path/filepath"
	"sync"

	wailsruntime "github.com/wailsapp/wails/v2/pkg/runtime"
)

var copyBuffer = 8 * 1024 * 1024 // 8MB buffer

// ExportProgressPayload is the payload for the export-progress event
type ExportProgressPayload struct {
	FileName    string `json:"fileName"`
	FilePath    string `json:"filePath"`
	TotalSize   int64  `json:"totalSize"`
	BytesCopied int64  `json:"bytesCopied"`
	Percentage  int    `json:"percentage"`
}

type copyFileWriter struct {
	w              io.Writer
	emit           func(ExportProgressPayload)
	fileName       string
	dstPath        string
	totalSize      int64
	bytesCopied    int64
	lastPercentage int
}

func (fr *copyFileWriter) Write(p []byte) (int, error) {
	n, err := fr.w.Write(p)
	fr.bytesCopied += int64(n)

	if fr.totalSize > 0 {
		percentage := int(float64(fr.bytesCopied) / float64(fr.totalSize) * 100)
		if percentage > fr.lastPercentage {
			fr.emit(ExportProgressPayload{
				FileName:    fr.fileName,
				FilePath:    fr.dstPath,
				TotalSize:   fr.totalSize,
				BytesCopied: fr.bytesCopied,
				Percentage:  percentage,
			})
			fr.lastPercentage = percentage
		}
	}

	return n, err
}

func copyFileWithProgress(dst io.Writer, src io.Reader, fileName, dstPath string, totalSize int64, emit func(ExportProgressPayload)) (int64, error) {
	fr := &copyFileWriter{
		w:         dst,
		emit:      emit,
		fileName:  fileName,
		dstPath:   dstPath,
		totalSize: totalSize,
	}
	buf := make([]byte, copyBuffer)
	return io.CopyBuffer(fr, src, buf)
}

// copyJob represents a single file copy operation.
type copyJob struct {
	sourcePath     string
	destFolderBase string
	totalSize      int64
}

// copyFile performs the actual file copying and emits progress events.
func copyFile(ctx context.Context, src, destFolderBase string, totalSize int64) error {
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

	emit := func(payload ExportProgressPayload) {
		wailsruntime.EventsEmit(ctx, "export-progress", payload)
	}
	if _, err := copyFileWithProgress(destination, source, filepath.Base(src), dst, totalSize, emit); err != nil {
		return fmt.Errorf("failed to copy file %s to %s: %w", src, dst, err)
	}

	return nil
}

// ExportFiles copies a list of files to a specified destination directory in parallel.
// Each file is copied into a subdirectory named after its creation date, and progress events are emitted during the copy.
// The function uses a fixed number of worker goroutines to avoid disk thrashing.
// If any file fails to copy, the function collects all errors and returns a combined error.
// Parameters:
//   - files: Slice of source file paths to export.
//   - destinationPath: The base directory where files will be copied.
//
// Returns:
//   - error: nil if all files are exported successfully, otherwise an error containing all encountered issues.
//
// It returns an error if any of the operations fail.
func ExportFiles(ctx context.Context, files []string, destinationPath string) error {
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

				if err := copyFile(ctx, job.sourcePath, job.destFolderBase, job.totalSize); err != nil {
					log.Printf("Error copying file %s: %v", job.sourcePath, err)
					errs <- err
				}
			}
		}()
	}

	// Send jobs to the channel, validating each file once up front
	for _, sourceFilePath := range files {
		info, err := os.Stat(sourceFilePath)
		if err != nil {
			errs <- fmt.Errorf("failed to stat %s: %w", sourceFilePath, err)
			continue
		}
		if !info.Mode().IsRegular() {
			errs <- fmt.Errorf("%s is not a regular file", sourceFilePath)
			continue
		}
		jobs <- copyJob{sourcePath: sourceFilePath, destFolderBase: destinationPath, totalSize: info.Size()}
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
