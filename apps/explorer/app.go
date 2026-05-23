package main

import (
	"bufio"
	"context"
	"fmt"
	"net"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"sort"
	"strings"
	"syscall"
	"time"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

type App struct {
	ctx context.Context
}

func NewApp() *App {
	return &App{}
}

func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
	initZigFS()
	initZigWatcher()
	initZigThumb()
	initZigPreview()
	a.subscribeSettingsEvents()
}

// ── デーモン管理 ──

func isDevBinary() bool {
	exe, err := os.Executable()
	if err != nil {
		return false
	}
	return strings.Contains(strings.ToLower(filepath.Base(exe)), "-dev")
}

func isDaemonRunning() bool {
	conn, err := net.DialTimeout("tcp", "127.0.0.1:9271", 500*time.Millisecond)
	if err != nil {
		return false
	}
	conn.Close()
	return true
}

func ensureDaemon() {
	if isDevBinary() {
		// dev モード: バイナリを共有しないようプロセス内でサーバーを起動
		if !isDaemonRunning() {
			startSettingsServer()
		}
		return
	}
	if isDaemonRunning() {
		return
	}
	exe, err := os.Executable()
	if err != nil {
		return
	}
	cmd := exec.Command(exe, "--daemon")
	cmd.SysProcAttr = &syscall.SysProcAttr{
		CreationFlags: 0x08000000 | 0x01000000, // CREATE_NO_WINDOW | CREATE_BREAKAWAY_FROM_JOB
	}
	if err := cmd.Start(); err != nil {
		return
	}
	for i := 0; i < 20; i++ {
		time.Sleep(100 * time.Millisecond)
		if isDaemonRunning() {
			return
		}
	}
}

// ── SSE サブスクライバー ──

func (a *App) subscribeSettingsEvents() {
	go func() {
		for {
			resp, err := http.Get("http://127.0.0.1:9271/api/settings/events")
			if err != nil {
				time.Sleep(2 * time.Second)
				continue
			}
			scanner := bufio.NewScanner(resp.Body)
			for scanner.Scan() {
				if strings.HasPrefix(scanner.Text(), "data: changed") {
					runtime.EventsEmit(a.ctx, "settings:changed")
				}
			}
			resp.Body.Close()
			time.Sleep(1 * time.Second)
		}
	}()
}

func (a *App) OpenSettings() {
	exec.Command("cmd", "/c", "start", "http://localhost:5200").Start()
}

func (a *App) GetStartupPath() string {
	return startupPath
}

func (a *App) OpenInNewWindow(path string) {
	exe, err := os.Executable()
	if err != nil {
		return
	}
	cmd := exec.Command(exe, "--path="+path)
	cmd.SysProcAttr = &syscall.SysProcAttr{
		CreationFlags: 0x01000000, // CREATE_BREAKAWAY_FROM_JOB
	}
	cmd.Start()
}

type FileEntry struct {
	Name     string `json:"name"`
	Path     string `json:"path"`
	IsDir    bool   `json:"isDir"`
	IsHidden bool   `json:"isHidden"`
	Size     int64  `json:"size"`
	ModTime  string `json:"modTime"`
	Ext      string `json:"ext"`
}

func isHiddenWindows(path string) bool {
	p, err := syscall.UTF16PtrFromString(path)
	if err != nil {
		return false
	}
	attrs, err := syscall.GetFileAttributes(p)
	if err != nil {
		return false
	}
	return attrs&syscall.FILE_ATTRIBUTE_HIDDEN != 0
}

func (a *App) GetHomeDir() string {
	home, err := os.UserHomeDir()
	if err != nil {
		return "C:\\"
	}
	return home
}

func (a *App) GetDrives() []string {
	var drives []string
	for _, letter := range "ABCDEFGHIJKLMNOPQRSTUVWXYZ" {
		path := string(letter) + ":\\"
		if _, err := os.Stat(path); err == nil {
			drives = append(drives, path)
		}
	}
	return drives
}

func (a *App) ListDirectory(path string) ([]FileEntry, error) {
	a.startWatching(path)
	if zigFS != nil {
		if entries, err := zigFS.listDirectory(path); err == nil {
			return entries, nil
		}
	}
	return goListDirectory(path)
}

func goListDirectory(path string) ([]FileEntry, error) {
	entries, err := os.ReadDir(path)
	if err != nil {
		return nil, err
	}

	var files []FileEntry
	for _, entry := range entries {
		info, err := entry.Info()
		if err != nil {
			continue
		}
		ext := ""
		if !entry.IsDir() {
			ext = strings.ToLower(filepath.Ext(entry.Name()))
		}
		entryPath := filepath.Join(path, entry.Name())
		files = append(files, FileEntry{
			Name:     entry.Name(),
			Path:     entryPath,
			IsDir:    entry.IsDir(),
			IsHidden: isHiddenWindows(entryPath),
			Size:     info.Size(),
			ModTime:  info.ModTime().Format(time.DateTime),
			Ext:      ext,
		})
	}

	sort.Slice(files, func(i, j int) bool {
		if files[i].IsDir != files[j].IsDir {
			return files[i].IsDir
		}
		return strings.ToLower(files[i].Name) < strings.ToLower(files[j].Name)
	})

	return files, nil
}

func (a *App) GetParentDir(path string) string {
	parent := filepath.Dir(path)
	if parent == path {
		return ""
	}
	return parent
}

func (a *App) OpenFile(path string) error {
	return exec.Command("cmd", "/c", "start", "", path).Start()
}

func (a *App) DeleteItem(path string) error {
	return os.RemoveAll(path)
}

func (a *App) RenameItem(oldPath, newPath string) error {
	return os.Rename(oldPath, newPath)
}

func (a *App) CreateFolder(parentPath, name string) error {
	return os.MkdirAll(filepath.Join(parentPath, name), 0755)
}

func (a *App) CopyItem(src, dstDir string) error {
	name := filepath.Base(src)
	dst := filepath.Join(dstDir, name)
	if dst == src {
		dst = uniqueCopyPath(dstDir, name)
	} else if _, err := os.Stat(dst); err == nil {
		dst = uniqueCopyPath(dstDir, name)
	}
	return copyPath(src, dst)
}

func uniqueCopyPath(dir, name string) string {
	ext := filepath.Ext(name)
	base := strings.TrimSuffix(name, ext)
	candidate := filepath.Join(dir, base+" - コピー"+ext)
	if _, err := os.Stat(candidate); os.IsNotExist(err) {
		return candidate
	}
	for i := 2; ; i++ {
		candidate = filepath.Join(dir, fmt.Sprintf("%s - コピー (%d)%s", base, i, ext))
		if _, err := os.Stat(candidate); os.IsNotExist(err) {
			return candidate
		}
	}
}

func (a *App) MoveItem(src, dstDir string) error {
	dst := filepath.Join(dstDir, filepath.Base(src))
	if err := os.Rename(src, dst); err == nil {
		return nil
	}
	if err := copyPath(src, dst); err != nil {
		return err
	}
	return os.RemoveAll(src)
}

func copyPath(src, dst string) error {
	info, err := os.Stat(src)
	if err != nil {
		return err
	}
	if info.IsDir() {
		return copyDir(src, dst)
	}
	return copyFile(src, dst)
}

func copyFile(src, dst string) error {
	in, err := os.Open(src)
	if err != nil {
		return err
	}
	defer in.Close()

	if err := os.MkdirAll(filepath.Dir(dst), 0755); err != nil {
		return err
	}
	out, err := os.Create(dst)
	if err != nil {
		return err
	}
	defer out.Close()

	buf := make([]byte, 32*1024)
	for {
		n, err := in.Read(buf)
		if n > 0 {
			if _, werr := out.Write(buf[:n]); werr != nil {
				return werr
			}
		}
		if err != nil {
			break
		}
	}
	return nil
}

func copyDir(src, dst string) error {
	return filepath.Walk(src, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}
		rel, _ := filepath.Rel(src, path)
		target := filepath.Join(dst, rel)
		if info.IsDir() {
			return os.MkdirAll(target, info.Mode())
		}
		return copyFile(path, target)
	})
}
