//go:build windows

package main

import (
	"fmt"
	"os"
	"syscall"
	"unsafe"
)

type zigFileopsLib struct {
	dll        *syscall.DLL
	copyPath   *syscall.Proc
	movePath   *syscall.Proc
	deletePath *syscall.Proc
}

var zigFileops *zigFileopsLib

func initZigFileops() {
	candidates := []string{
		`hue_fileops.dll`,
		`..\..\zig-out\bin\hue_fileops.dll`,
	}
	for _, p := range candidates {
		if _, err := os.Stat(p); err != nil {
			continue
		}
		dll, err := syscall.LoadDLL(p)
		if err != nil {
			continue
		}
		copyPath, err := dll.FindProc("hue_copy_path")
		if err != nil {
			dll.Release()
			continue
		}
		movePath, _ := dll.FindProc("hue_move_path")
		deletePath, _ := dll.FindProc("hue_delete_path")
		zigFileops = &zigFileopsLib{dll: dll, copyPath: copyPath, movePath: movePath, deletePath: deletePath}
		return
	}
}

func (z *zigFileopsLib) copyItem(src, dst string) error {
	srcB := append([]byte(src), 0)
	dstB := append([]byte(dst), 0)
	r, _, _ := z.copyPath.Call(
		uintptr(unsafe.Pointer(&srcB[0])),
		uintptr(unsafe.Pointer(&dstB[0])),
	)
	if int32(r) != 0 {
		return fmt.Errorf("hue_copy_path error: %d", int32(r))
	}
	return nil
}

func (z *zigFileopsLib) moveItem(src, dst string) error {
	if z.movePath == nil {
		return fmt.Errorf("hue_move_path not available")
	}
	srcB := append([]byte(src), 0)
	dstB := append([]byte(dst), 0)
	r, _, _ := z.movePath.Call(
		uintptr(unsafe.Pointer(&srcB[0])),
		uintptr(unsafe.Pointer(&dstB[0])),
	)
	if int32(r) != 0 {
		return fmt.Errorf("hue_move_path error: %d", int32(r))
	}
	return nil
}

func (z *zigFileopsLib) deleteItem(path string) error {
	if z.deletePath == nil {
		return fmt.Errorf("hue_delete_path not available")
	}
	pathB := append([]byte(path), 0)
	r, _, _ := z.deletePath.Call(
		uintptr(unsafe.Pointer(&pathB[0])),
	)
	if int32(r) != 0 {
		return fmt.Errorf("hue_delete_path error: %d", int32(r))
	}
	return nil
}
