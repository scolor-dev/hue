//go:build windows

package main

import (
	"fmt"
	"os"
	"syscall"
	"unsafe"
)

type zigPreviewLib struct {
	dll        *syscall.DLL
	previewGet *syscall.Proc
}

var zigPreview *zigPreviewLib

func initZigPreview() {
	candidates := []string{
		`hue_preview.dll`,
		`..\..\zig-out\bin\hue_preview.dll`,
	}
	for _, p := range candidates {
		if _, err := os.Stat(p); err != nil {
			continue
		}
		dll, err := syscall.LoadDLL(p)
		if err != nil {
			continue
		}
		proc, err := dll.FindProc("hue_preview_get")
		if err != nil {
			dll.Release()
			continue
		}
		zigPreview = &zigPreviewLib{dll: dll, previewGet: proc}
		return
	}
}

func (a *App) GetPreview(path string) string {
	if zigPreview == nil {
		return ""
	}
	pathBytes := append([]byte(path), 0)
	buf := make([]byte, 64*1024)

	r, _, _ := zigPreview.previewGet.Call(
		uintptr(unsafe.Pointer(&pathBytes[0])),
		uintptr(unsafe.Pointer(&buf[0])),
		uintptr(len(buf)),
	)

	n := int32(r)
	if n < 0 {
		return fmt.Sprintf(`{"isText":false,"content":"","truncated":false,"fileSize":0}`)
	}
	return string(buf[:n])
}
