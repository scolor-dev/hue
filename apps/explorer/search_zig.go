//go:build windows

package main

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"syscall"
	"unsafe"
)

type zigSearchLib struct {
	dll        *syscall.DLL
	searchProc *syscall.Proc
}

var zigSearch *zigSearchLib

func initZigSearch() {
	candidates := []string{
		`hue_search.dll`,
		`..\..\zig-out\bin\hue_search.dll`,
	}
	for _, p := range candidates {
		if _, err := os.Stat(p); err != nil {
			continue
		}
		dll, err := syscall.LoadDLL(p)
		if err != nil {
			continue
		}
		searchProc, err := dll.FindProc("hue_search")
		if err != nil {
			dll.Release()
			continue
		}
		zigSearch = &zigSearchLib{dll: dll, searchProc: searchProc}
		return
	}
}

type SearchEntry struct {
	Name     string `json:"name"`
	Path     string `json:"path"`
	IsDir    bool   `json:"isDir"`
	IsHidden bool   `json:"isHidden"`
	Size     int64  `json:"size"`
	Ext      string `json:"ext"`
}

func (z *zigSearchLib) search(root, query string) ([]SearchEntry, error) {
	rootB := append([]byte(root), 0)
	queryB := append([]byte(query), 0)
	buf := make([]byte, 4*1024*1024)
	r, _, _ := z.searchProc.Call(
		uintptr(unsafe.Pointer(&rootB[0])),
		uintptr(unsafe.Pointer(&queryB[0])),
		uintptr(unsafe.Pointer(&buf[0])),
		uintptr(len(buf)),
	)
	n := int32(r)
	if n < 0 {
		return nil, fmt.Errorf("hue_search error: %d", n)
	}
	var entries []SearchEntry
	if err := json.Unmarshal(buf[:n], &entries); err != nil {
		return nil, err
	}
	return entries, nil
}

func goSearch(root, query string) []SearchEntry {
	queryLower := strings.ToLower(query)
	var results []SearchEntry
	_ = filepath.Walk(root, func(path string, info os.FileInfo, err error) error {
		if err != nil || len(results) >= 2000 {
			return nil
		}
		name := info.Name()
		if strings.Contains(strings.ToLower(name), queryLower) {
			ext := ""
			if !info.IsDir() {
				ext = strings.ToLower(filepath.Ext(name))
			}
			results = append(results, SearchEntry{
				Name:     name,
				Path:     path,
				IsDir:    info.IsDir(),
				IsHidden: isHiddenWindows(path),
				Size:     info.Size(),
				Ext:      ext,
			})
		}
		return nil
	})
	return results
}
