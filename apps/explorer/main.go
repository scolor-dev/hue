package main

import (
	"embed"
	"os"
	"strings"

	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
)

//go:embed all:frontend/dist
var assets embed.FS

var startupPath string

func main() {
	for _, arg := range os.Args[1:] {
		if arg == "--daemon" {
			runDaemon()
			return
		}
		if strings.HasPrefix(arg, "--path=") {
			startupPath = strings.TrimPrefix(arg, "--path=")
		}
	}

	ensureDaemon()

	app := NewApp()
	err := wails.Run(&options.App{
		Title:  "Hue",
		Width:  960,
		Height: 640,
		AssetServer: &assetserver.Options{
			Assets: assets,
		},
		BackgroundColour: &options.RGBA{R: 27, G: 38, B: 54, A: 1},
		OnStartup:        app.startup,
		Bind: []interface{}{
			app,
		},
	})
	if err != nil {
		println("Error:", err.Error())
	}
}
