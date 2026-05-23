//go:build windows

package main

import (
	"encoding/base64"
	"fmt"
	"os"
	"syscall"
	"unsafe"
)

type zigThumbLib struct {
	dll      *syscall.DLL
	thumbGet *syscall.Proc
}

var zigThumb *zigThumbLib

func initZigThumb() {
	candidates := []string{
		`hue_thumbnailer.dll`,
		`..\..\zig-out\bin\hue_thumbnailer.dll`,
	}
	for _, p := range candidates {
		if _, err := os.Stat(p); err != nil {
			continue
		}
		dll, err := syscall.LoadDLL(p)
		if err != nil {
			continue
		}
		proc, err := dll.FindProc("hue_thumb_get")
		if err != nil {
			dll.Release()
			continue
		}
		zigThumb = &zigThumbLib{dll: dll, thumbGet: proc}
		return
	}
}

func (z *zigThumbLib) getThumbnail(path string) ([]byte, error) {
	pathBytes := append([]byte(path), 0)
	buf := make([]byte, 256*1024)

	r, _, _ := z.thumbGet.Call(
		uintptr(unsafe.Pointer(&pathBytes[0])),
		uintptr(unsafe.Pointer(&buf[0])),
		uintptr(len(buf)),
	)

	n := int32(r)
	if n < 0 {
		return nil, fmt.Errorf("hue_thumbnailer error: %d", n)
	}
	return buf[:n], nil
}

func (a *App) GetThumbnail(path string) string {
	if zigThumb == nil {
		return ""
	}
	data, err := zigThumb.getThumbnail(path)
	if err != nil {
		return ""
	}
	return "data:image/png;base64," + base64.StdEncoding.EncodeToString(data)
}
