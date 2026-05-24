package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"sync"
)

type CommandShortcut struct {
	ID                string `json:"id"`
	Label             string `json:"label"`
	Icon              string `json:"icon"`
	Command           string `json:"command"`
	ExecutionMode     string `json:"executionMode"` // "current" | "fixed"
	FixedPath         string `json:"fixedPath"`
	PromptEnabled     bool   `json:"promptEnabled"`
	PromptMessage     string `json:"promptMessage"`
	PromptPlaceholder string `json:"promptPlaceholder"`
}

type HueSettings struct {
	ShowHidden        bool              `json:"showHidden"`
	DateFormat        string            `json:"dateFormat"`
	PreviewWidth      int               `json:"previewWidth"`
	ThumbSize         int               `json:"thumbSize"`
	Language          string            `json:"language"`
	SortBy            string            `json:"sortBy"`
	SortAsc           bool              `json:"sortAsc"`
	ShowExtensions    bool              `json:"showExtensions"`
	ConfirmDelete     bool              `json:"confirmDelete"`
	Favorites         []string          `json:"favorites"`
	CommandShortcuts  []CommandShortcut `json:"commandShortcuts"`
	StartupMode       string            `json:"startupMode"`       // "home" | "last" | "fixed"
	StartupFixedPath  string            `json:"startupFixedPath"`  // startupMode == "fixed" のとき使用
	LastPath          string            `json:"lastPath"`           // startupMode == "last" のとき自動保存
	ClickToOpen       string            `json:"clickToOpen"`       // "single" | "double"
	DisabledPlugins   []string          `json:"disabledPlugins"`
}

func defaultHueSettings() HueSettings {
	return HueSettings{
		ShowHidden:        false,
		DateFormat:        "datetime",
		PreviewWidth:      220,
		ThumbSize:         128,
		Language:          "ja",
		SortBy:            "name",
		SortAsc:           true,
		ShowExtensions:    true,
		ConfirmDelete:     true,
		Favorites:         []string{},
		CommandShortcuts:  []CommandShortcut{},
		StartupMode:       "home",
		StartupFixedPath:  "",
		LastPath:          "",
		ClickToOpen:       "double",
		DisabledPlugins:   []string{},
	}
}

type LanguageOption struct {
	Value string `json:"value"`
	Label string `json:"label"`
}

var (
	settingsMu     sync.RWMutex
	cachedSettings *HueSettings

	sseMu      sync.Mutex
	sseClients = make(map[chan struct{}]struct{})

	languagesMu sync.RWMutex
	extraLanguages = []LanguageOption{}
)

type PluginMeta struct {
	Name        string `json:"name"`
	DisplayName string `json:"displayName"`
	Description string `json:"description"`
	Enabled     bool   `json:"enabled"`
	FileName    string `json:"fileName"`
}

func parsePluginMeta(fileName, code string) PluginMeta {
	name := strings.TrimSuffix(fileName, ".js")
	displayName := name
	description := ""
	for _, line := range strings.SplitN(code, "\n", 20) {
		line = strings.TrimSpace(line)
		if !strings.HasPrefix(line, "//") {
			break
		}
		line = strings.TrimSpace(strings.TrimPrefix(line, "//"))
		if rest, ok := strings.CutPrefix(line, "@name "); ok {
			displayName = strings.TrimSpace(rest)
		} else if rest, ok := strings.CutPrefix(line, "@description "); ok {
			description = strings.TrimSpace(rest)
		}
	}
	return PluginMeta{Name: name, DisplayName: displayName, Description: description, FileName: fileName}
}

func listPluginMetas() []PluginMeta {
	s := loadSettings()
	disabled := map[string]bool{}
	for _, n := range s.DisabledPlugins {
		disabled[n] = true
	}
	seen := map[string]bool{}
	var result []PluginMeta
	for _, dir := range pluginDirs() {
		entries, err := os.ReadDir(dir)
		if err != nil {
			continue
		}
		for _, e := range entries {
			if e.IsDir() || !strings.HasSuffix(e.Name(), ".js") || seen[e.Name()] {
				continue
			}
			code, _ := os.ReadFile(filepath.Join(dir, e.Name()))
			meta := parsePluginMeta(e.Name(), string(code))
			meta.Enabled = !disabled[meta.Name]
			seen[e.Name()] = true
			result = append(result, meta)
		}
	}
	return result
}

func deletePlugin(name string) error {
	for _, dir := range pluginDirs() {
		p := filepath.Join(dir, name+".js")
		if _, err := os.Stat(p); err == nil {
			return os.Remove(p)
		}
	}
	return fmt.Errorf("plugin not found: %s", name)
}

type ShortcutMeta struct {
	Key         string `json:"key"`
	Label       string `json:"label"`
	Description string `json:"description"`
	Source      string `json:"source"` // "builtin" | "plugin"
}

var (
	shortcutsMu      sync.RWMutex
	pluginShortcuts  []ShortcutMeta
)

func allShortcuts() []ShortcutMeta {
	builtin := []ShortcutMeta{
		{Key: "↑ / ↓",           Label: "カーソル移動",           Source: "builtin"},
		{Key: "Home / End",       Label: "先頭 / 末尾へ移動",      Source: "builtin"},
		{Key: "Enter",            Label: "開く / フォルダに入る",   Source: "builtin"},
		{Key: "Backspace",        Label: "上の階層へ",             Source: "builtin"},
		{Key: "F2",               Label: "名前の変更",             Source: "builtin"},
		{Key: "F5",               Label: "更新",                  Source: "builtin"},
		{Key: "Delete",           Label: "削除",                  Source: "builtin"},
		{Key: "Ctrl+C",           Label: "コピー",                Source: "builtin"},
		{Key: "Ctrl+X",           Label: "切り取り",              Source: "builtin"},
		{Key: "Ctrl+V",           Label: "貼り付け",              Source: "builtin"},
		{Key: "Ctrl+A",           Label: "すべて選択",            Source: "builtin"},
		{Key: "Ctrl+F",           Label: "検索",                  Source: "builtin"},
		{Key: "Ctrl+Shift+N",     Label: "新規フォルダー",         Source: "builtin"},
		{Key: "Shift+↑↓",         Label: "範囲選択",              Source: "builtin"},
		{Key: "Ctrl+クリック",     Label: "複数選択",              Source: "builtin"},
	}
	shortcutsMu.RLock()
	defer shortcutsMu.RUnlock()
	return append(builtin, pluginShortcuts...)
}

func builtinLanguages() []LanguageOption {
	return []LanguageOption{
		{Value: "ja", Label: "日本語"},
		{Value: "en", Label: "English"},
	}
}

func allLanguages() []LanguageOption {
	languagesMu.RLock()
	defer languagesMu.RUnlock()
	result := builtinLanguages()
	builtinSet := map[string]bool{"ja": true, "en": true}
	for _, l := range extraLanguages {
		if !builtinSet[l.Value] {
			result = append(result, l)
		}
	}
	return result
}

func settingsFilePath() string {
	dir, _ := os.UserConfigDir()
	return filepath.Join(dir, "Hue", "settings.json")
}

func loadSettings() HueSettings {
	settingsMu.RLock()
	if cachedSettings != nil {
		s := *cachedSettings
		settingsMu.RUnlock()
		return s
	}
	settingsMu.RUnlock()

	s := defaultHueSettings()
	if data, err := os.ReadFile(settingsFilePath()); err == nil {
		json.Unmarshal(data, &s)
	}
	if s.Favorites == nil {
		s.Favorites = []string{}
	}

	settingsMu.Lock()
	cachedSettings = &s
	settingsMu.Unlock()
	return s
}

func persistSettings(s HueSettings) error {
	if s.Favorites == nil {
		s.Favorites = []string{}
	}
	settingsMu.Lock()
	cachedSettings = &s
	settingsMu.Unlock()

	broadcastSettingsChange()

	p := settingsFilePath()
	if err := os.MkdirAll(filepath.Dir(p), 0755); err != nil {
		return err
	}
	data, err := json.MarshalIndent(s, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(p, data, 0644)
}

func broadcastSettingsChange() {
	sseMu.Lock()
	defer sseMu.Unlock()
	for ch := range sseClients {
		select {
		case ch <- struct{}{}:
		default:
		}
	}
}

func findSettingsDistDir() string {
	const relPath = "apps/settings/frontend/dist"

	// CWD または実行ファイルから上位ディレクトリへ辿ってリポジトリルートを探す
	anchors := []string{}
	if cwd, err := os.Getwd(); err == nil {
		anchors = append(anchors, cwd)
	}
	if exe, err := os.Executable(); err == nil {
		anchors = append(anchors, filepath.Dir(exe))
	}

	for _, anchor := range anchors {
		dir := anchor
		for i := 0; i < 8; i++ {
			candidate := filepath.Join(dir, relPath)
			if info, err := os.Stat(filepath.Join(candidate, "index.html")); err == nil && !info.IsDir() {
				return candidate
			}
			parent := filepath.Dir(dir)
			if parent == dir {
				break
			}
			dir = parent
		}
	}
	return ""
}

func startSettingsServer() {
	ln, err := net.Listen("tcp", "127.0.0.1:9271")
	if err != nil {
		return
	}

	mux := http.NewServeMux()

	// 設定 UI (Vue SPA) を配信
	if distDir := findSettingsDistDir(); distDir != "" {
		fs := http.FileServer(http.Dir(distDir))
		mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
			if strings.HasPrefix(r.URL.Path, "/api") {
				http.NotFound(w, r)
				return
			}
			// SPA: ファイルが存在しない場合は index.html を返す
			target := filepath.Join(distDir, filepath.FromSlash(r.URL.Path))
			if _, serr := os.Stat(target); os.IsNotExist(serr) {
				http.ServeFile(w, r, filepath.Join(distDir, "index.html"))
				return
			}
			fs.ServeHTTP(w, r)
		})
	}

	mux.HandleFunc("/api/settings", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

		switch r.Method {
		case http.MethodOptions:
			w.WriteHeader(http.StatusNoContent)
		case http.MethodGet:
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(loadSettings())
		case http.MethodPost:
			var s HueSettings
			if err := json.NewDecoder(r.Body).Decode(&s); err != nil {
				http.Error(w, err.Error(), http.StatusBadRequest)
				return
			}
			persistSettings(s)
			w.WriteHeader(http.StatusNoContent)
		}
	})

	mux.HandleFunc("/api/shortcuts", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		switch r.Method {
		case http.MethodGet:
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(allShortcuts())
		case http.MethodPost:
			var sc ShortcutMeta
			if err := json.NewDecoder(r.Body).Decode(&sc); err != nil || sc.Key == "" {
				http.Error(w, "bad request", http.StatusBadRequest)
				return
			}
			sc.Source = "plugin"
			shortcutsMu.Lock()
			found := false
			for i, s := range pluginShortcuts {
				if s.Key == sc.Key {
					pluginShortcuts[i] = sc
					found = true
					break
				}
			}
			if !found {
				pluginShortcuts = append(pluginShortcuts, sc)
			}
			shortcutsMu.Unlock()
			w.WriteHeader(http.StatusNoContent)
		default:
			http.NotFound(w, r)
		}
	})

	mux.HandleFunc("/api/plugins", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		switch r.Method {
		case http.MethodGet:
			w.Header().Set("Content-Type", "application/json")
			metas := listPluginMetas()
			if metas == nil {
				metas = []PluginMeta{}
			}
			json.NewEncoder(w).Encode(metas)
		case http.MethodDelete:
			name := r.URL.Query().Get("name")
			if name == "" {
				http.Error(w, "name required", http.StatusBadRequest)
				return
			}
			if err := deletePlugin(name); err != nil {
				http.Error(w, err.Error(), http.StatusNotFound)
				return
			}
			w.WriteHeader(http.StatusNoContent)
		default:
			http.NotFound(w, r)
		}
	})

	mux.HandleFunc("/api/settings/lastpath", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		if r.Method == http.MethodOptions {
			w.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS")
			w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
			w.WriteHeader(http.StatusNoContent)
			return
		}
		if r.Method != http.MethodPost {
			http.NotFound(w, r)
			return
		}
		var body struct{ Path string `json:"path"` }
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.Path == "" {
			http.Error(w, "bad request", http.StatusBadRequest)
			return
		}
		s := loadSettings()
		s.LastPath = body.Path
		// settings:changed をブロードキャストせずに保存
		settingsMu.Lock()
		cachedSettings = &s
		settingsMu.Unlock()
		p := settingsFilePath()
		os.MkdirAll(filepath.Dir(p), 0755)
		data, _ := json.MarshalIndent(s, "", "  ")
		os.WriteFile(p, data, 0644)
		w.WriteHeader(http.StatusNoContent)
	})

	mux.HandleFunc("/api/languages", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		switch r.Method {
		case http.MethodOptions:
			w.WriteHeader(http.StatusNoContent)
		case http.MethodGet:
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(allLanguages())
		case http.MethodPost:
			var opt LanguageOption
			if err := json.NewDecoder(r.Body).Decode(&opt); err != nil || opt.Value == "" {
				http.Error(w, "bad request", http.StatusBadRequest)
				return
			}
			languagesMu.Lock()
			found := false
			for i, l := range extraLanguages {
				if l.Value == opt.Value {
					extraLanguages[i].Label = opt.Label
					found = true
					break
				}
			}
			if !found {
				extraLanguages = append(extraLanguages, opt)
			}
			languagesMu.Unlock()
			w.WriteHeader(http.StatusNoContent)
		}
	})

	mux.HandleFunc("/api/settings/events", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/event-stream")
		w.Header().Set("Cache-Control", "no-cache")
		w.Header().Set("Connection", "keep-alive")
		w.Header().Set("Access-Control-Allow-Origin", "*")

		ch := make(chan struct{}, 1)
		sseMu.Lock()
		sseClients[ch] = struct{}{}
		sseMu.Unlock()

		defer func() {
			sseMu.Lock()
			delete(sseClients, ch)
			sseMu.Unlock()
		}()

		flusher, _ := w.(http.Flusher)
		fmt.Fprintf(w, "data: connected\n\n")
		if flusher != nil {
			flusher.Flush()
		}

		for {
			select {
			case <-ch:
				fmt.Fprintf(w, "data: changed\n\n")
				if flusher != nil {
					flusher.Flush()
				}
			case <-r.Context().Done():
				return
			}
		}
	})

	go http.Serve(ln, mux)
}

// ── Wails バインドメソッド (HTTP 経由でデーモンに委譲) ──

func fetchSettings() HueSettings {
	resp, err := http.Get("http://127.0.0.1:9271/api/settings")
	if err != nil {
		return defaultHueSettings()
	}
	defer resp.Body.Close()
	var s HueSettings
	if err := json.NewDecoder(resp.Body).Decode(&s); err != nil {
		return defaultHueSettings()
	}
	if s.Favorites == nil {
		s.Favorites = []string{}
	}
	return s
}

func postSettings(s HueSettings) {
	data, _ := json.Marshal(s)
	http.Post("http://127.0.0.1:9271/api/settings", "application/json", bytes.NewReader(data))
}

func (a *App) GetSettings() HueSettings {
	return fetchSettings()
}

func (a *App) SaveSettings(s HueSettings) {
	postSettings(s)
}

func (a *App) AddFavorite(path string) {
	s := fetchSettings()
	for _, f := range s.Favorites {
		if strings.EqualFold(f, path) {
			return
		}
	}
	s.Favorites = append(s.Favorites, path)
	postSettings(s)
}

func (a *App) RemoveFavorite(path string) {
	s := fetchSettings()
	var kept []string
	for _, f := range s.Favorites {
		if !strings.EqualFold(f, path) {
			kept = append(kept, f)
		}
	}
	if kept == nil {
		kept = []string{}
	}
	s.Favorites = kept
	postSettings(s)
}
