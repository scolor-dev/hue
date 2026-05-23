package main

import (
	_ "embed"
	"os"
	"os/exec"
	"syscall"

	"github.com/getlantern/systray"
)

//go:embed build/windows/icon.ico
var trayIcon []byte

func runDaemon() {
	startSettingsServer()
	systray.Run(onTrayReady, nil)
}

func onTrayReady() {
	systray.SetIcon(trayIcon)
	systray.SetTooltip("Hue")

	mNew := systray.AddMenuItem("新規ウィンドウ", "新しいウィンドウを開く")
	mSet := systray.AddMenuItem("設定を開く", "")
	systray.AddSeparator()
	mQuit := systray.AddMenuItem("終了", "Hue を終了する")

	go func() {
		for {
			select {
			case <-mNew.ClickedCh:
				launchExplorer()
			case <-mSet.ClickedCh:
				exec.Command("cmd", "/c", "start", "http://localhost:5200").Start()
			case <-mQuit.ClickedCh:
				systray.Quit()
				os.Exit(0)
			}
		}
	}()
}

func launchExplorer() {
	exe, err := os.Executable()
	if err != nil {
		return
	}
	cmd := exec.Command(exe)
	cmd.SysProcAttr = &syscall.SysProcAttr{
		CreationFlags: 0x01000000, // CREATE_BREAKAWAY_FROM_JOB
	}
	cmd.Start()
}
