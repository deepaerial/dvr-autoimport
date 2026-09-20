package main

import (
	"context"
	"log"
	"os"
	"sync"
	"time"

	"github.com/fsnotify/fsnotify"
	wailsruntime "github.com/wailsapp/wails/v2/pkg/runtime"
)

const (
	mountDir     = "/Volumes"
	pollInterval = 3 * time.Second
)

type volumeWatcher struct {
	watcher *fsnotify.Watcher
	mu      sync.Mutex
	last    []string
	stop    chan struct{}
	once    sync.Once
}

// startVolumeWatcher detects volume attach/detach events and emits a
// "volumes-changed" event with the refreshed volume list whenever it changes.
//
// fsnotify (kqueue) on macOS fires on volume mount but NOT on unmount, so a
// periodic getfsstat poll is used as the reliable fallback for detaches.
func (a *App) startVolumeWatcher() *volumeWatcher {
	if _, err := os.Stat(mountDir); err != nil {
		log.Printf("volume watcher: cannot watch %s: %v", mountDir, err)
		return nil
	}
	w, err := fsnotify.NewWatcher()
	if err != nil {
		log.Printf("volume watcher: failed to create watcher: %v", err)
		return nil
	}
	if err := w.Add(mountDir); err != nil {
		w.Close()
		log.Printf("volume watcher: failed to watch %s: %v", mountDir, err)
		return nil
	}

	vw := &volumeWatcher{
		watcher: w,
		stop:    make(chan struct{}),
	}
	go vw.run(a.ctx, w.Events, w.Errors)
	log.Printf("volume watcher: watching %s", mountDir)
	return vw
}

// run refreshes the volume list on fsnotify events (fast path for mounts) and
// on a fixed interval (fallback that catches unmounts).
func (vw *volumeWatcher) run(ctx context.Context, events <-chan fsnotify.Event, errs <-chan error) {
	ticker := time.NewTicker(pollInterval)
	defer ticker.Stop()
	for {
		select {
		case <-vw.stop:
			return
		case err, ok := <-errs:
			if !ok {
				return
			}
			log.Printf("volume watcher: error: %v", err)
		case _, ok := <-events:
			if !ok {
				return
			}
			vw.refresh(ctx)
		case <-ticker.C:
			vw.refresh(ctx)
		}
	}
}

// refresh re-scans mounted volumes and emits volumes-changed if the list differs.
func (vw *volumeWatcher) refresh(ctx context.Context) {
	vols, err := getVolumesFromGetfsstat()
	if err != nil {
		log.Printf("volume watcher: failed to list volumes: %v", err)
		return
	}

	vw.mu.Lock()
	changed := !slicesEqual(vw.last, vols)
	if changed {
		vw.last = vols
	}
	vw.mu.Unlock()

	if changed {
		log.Printf("volume watcher: volumes changed, emitting %d mounts", len(vols))
		wailsruntime.EventsEmit(ctx, "volumes-changed", vols)
	}
}

func (vw *volumeWatcher) Stop() {
	if vw == nil {
		return
	}
	vw.once.Do(func() {
		close(vw.stop)
		vw.watcher.Close()
	})
}

func slicesEqual(a, b []string) bool {
	if len(a) != len(b) {
		return false
	}
	for i := range a {
		if a[i] != b[i] {
			return false
		}
	}
	return true
}
