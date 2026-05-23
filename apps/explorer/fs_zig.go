//go:build windows

package main

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"syscall"
	"unsafe"
)

type zigFSLib struct {
	dll     *syscall.DLL
	listDir *syscall.Proc
}

var zigFS *zigFSLib

func initZigFS() {
	candidates := []string{
		`hue_fs.dll`,
		`..\..\zig-out\bin\hue_fs.dll`,
	}
	for _, p := range candidates {
		if _, err := os.Stat(p); err != nil {
			continue
		}
		dll, err := syscall.LoadDLL(p)
		if err != nil {
			continue
		}
		proc, err := dll.FindProc("hue_list_dir")
		if err != nil {
			dll.Release()
			continue
		}
		zigFS = &zigFSLib{dll: dll, listDir: proc}
		return
	}
}

type zigEntry struct {
	Name    string `json:"name"`
	IsDir   bool   `json:"isDir"`
	Size    int64  `json:"size"`
	ModTime string `json:"modTime"`
	Ext     string `json:"ext"`
}

func (z *zigFSLib) listDirectory(path string) ([]FileEntry, error) {
	pathBytes := append([]byte(path), 0)
	buf := make([]byte, 4*1024*1024)

	r, _, _ := z.listDir.Call(
		uintptr(unsafe.Pointer(&pathBytes[0])),
		uintptr(unsafe.Pointer(&buf[0])),
		uintptr(len(buf)),
	)

	n := int32(r)
	if n < 0 {
		return nil, fmt.Errorf("hue_fs error: %d", n)
	}

	var zigEntries []zigEntry
	if err := json.Unmarshal(buf[:n], &zigEntries); err != nil {
		return nil, err
	}

	entries := make([]FileEntry, len(zigEntries))
	for i, ze := range zigEntries {
		p := filepath.Join(path, ze.Name)
		entries[i] = FileEntry{
			Name:     ze.Name,
			Path:     p,
			IsDir:    ze.IsDir,
			IsHidden: isHiddenWindows(p),
			Size:     ze.Size,
			ModTime:  ze.ModTime,
			Ext:      ze.Ext,
		}
	}
	return entries, nil
}
