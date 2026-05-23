//go:build windows

package main

import (
	"context"
	"os"
	"sync"
	"syscall"
	"time"
	"unsafe"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

type zigWatcherLib struct {
	dll        *syscall.DLL
	watchStart *syscall.Proc
	watchStop  *syscall.Proc
	hasChange  *syscall.Proc
}

var zigWatcher *zigWatcherLib
var watchCancel context.CancelFunc
var watchCurrentPath string
var watchMu sync.Mutex

func initZigWatcher() {
	candidates := []string{
		`hue_watcher.dll`,
		`..\..\zig-out\bin\hue_watcher.dll`,
	}
	for _, p := range candidates {
		if _, err := os.Stat(p); err != nil {
			continue
		}
		dll, err := syscall.LoadDLL(p)
		if err != nil {
			continue
		}
		start, err1 := dll.FindProc("hue_watch_start")
		stop, err2 := dll.FindProc("hue_watch_stop")
		hasChange, err3 := dll.FindProc("hue_watch_has_change")
		if err1 != nil || err2 != nil || err3 != nil {
			dll.Release()
			continue
		}
		zigWatcher = &zigWatcherLib{
			dll:        dll,
			watchStart: start,
			watchStop:  stop,
			hasChange:  hasChange,
		}
		return
	}
}

func (a *App) startWatching(path string) {
	if zigWatcher == nil {
		return
	}
	watchMu.Lock()
	defer watchMu.Unlock()

	// 同じパスを監視中なら再起動不要
	if path == watchCurrentPath {
		return
	}

	// 旧 goroutine をキャンセル（Zig 側は SetEvent で即時停止するので watchStart 内部の watchStop も速い）
	if watchCancel != nil {
		watchCancel()
		watchCancel = nil
	}
	watchCurrentPath = path

	pathBytes := append([]byte(path), 0)
	r, _, _ := zigWatcher.watchStart.Call(uintptr(unsafe.Pointer(&pathBytes[0])))
	if int32(r) != 0 {
		watchCurrentPath = ""
		return
	}

	ctx, cancel := context.WithCancel(context.Background())
	watchCancel = cancel
	go func() {
		ticker := time.NewTicker(300 * time.Millisecond)
		defer ticker.Stop()
		for {
			select {
			case <-ctx.Done():
				zigWatcher.watchStop.Call()
				return
			case <-ticker.C:
				res, _, _ := zigWatcher.hasChange.Call()
				if res != 0 {
					runtime.EventsEmit(a.ctx, "fs:changed")
				}
			}
		}
	}()
}
