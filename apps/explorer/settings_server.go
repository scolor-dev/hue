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
	ShowHidden       bool              `json:"showHidden"`
	DateFormat       string            `json:"dateFormat"`
	PreviewWidth     int               `json:"previewWidth"`
	ThumbSize        int               `json:"thumbSize"`
	Language         string            `json:"language"`
	SortBy           string            `json:"sortBy"`
	SortAsc          bool              `json:"sortAsc"`
	ShowExtensions   bool              `json:"showExtensions"`
	ConfirmDelete    bool              `json:"confirmDelete"`
	Favorites        []string          `json:"favorites"`
	CommandShortcuts []CommandShortcut `json:"commandShortcuts"`
}

func defaultHueSettings() HueSettings {
	return HueSettings{
		ShowHidden:       false,
		DateFormat:       "datetime",
		PreviewWidth:     220,
		ThumbSize:        128,
		Language:         "ja",
		SortBy:           "name",
		SortAsc:          true,
		ShowExtensions:   true,
		ConfirmDelete:    true,
		Favorites:        []string{},
		CommandShortcuts: []CommandShortcut{},
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
