package main

import (
	"context"
	"encoding/json"
	"net"
	"net/http"
	"os"
	"path/filepath"
	"sync"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

type HueSettings struct {
	ShowHidden     bool   `json:"showHidden"`
	DateFormat     string `json:"dateFormat"`
	PreviewWidth   int    `json:"previewWidth"`
	ThumbSize      int    `json:"thumbSize"`
	Language       string `json:"language"`
	SortBy         string `json:"sortBy"`
	SortAsc        bool   `json:"sortAsc"`
	ShowExtensions bool   `json:"showExtensions"`
	ConfirmDelete  bool   `json:"confirmDelete"`
}

func defaultHueSettings() HueSettings {
	return HueSettings{
		ShowHidden:     false,
		DateFormat:     "datetime",
		PreviewWidth:   220,
		ThumbSize:      128,
		Language:       "ja",
		SortBy:         "name",
		SortAsc:        true,
		ShowExtensions: true,
		ConfirmDelete:  true,
	}
}

var (
	settingsMu     sync.RWMutex
	cachedSettings *HueSettings
	settingsPort   = 9271
	wailsCtx       context.Context
)

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

	settingsMu.Lock()
	cachedSettings = &s
	settingsMu.Unlock()
	return s
}

func persistSettings(s HueSettings) error {
	settingsMu.Lock()
	cachedSettings = &s
	settingsMu.Unlock()

	if wailsCtx != nil {
		runtime.EventsEmit(wailsCtx, "settings:changed")
	}

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

func startSettingsServer() {
	ln, err := net.Listen("tcp", "127.0.0.1:9271")
	if err != nil {
		return
	}

	mux := http.NewServeMux()
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

	go http.Serve(ln, mux)
}

func (a *App) GetSettings() HueSettings {
	return loadSettings()
}

func (a *App) SaveSettings(s HueSettings) {
	persistSettings(s)
}
