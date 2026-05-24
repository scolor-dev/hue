// @name シェルで開く
// @description PowerShell または コマンドプロンプトをここで開く

hue.contextMenu.add({
  label: 'PowerShell をここで開く',
  icon: '💙',
  match: (entry) => entry.isDir,
  action: (entry) => hue.exec('start powershell -NoExit -Command "Set-Location \'' + entry.path + '\'"'),
})

hue.contextMenu.add({
  label: 'コマンドプロンプトをここで開く',
  icon: '⬛',
  match: (entry) => entry.isDir,
  action: (entry) => hue.exec('start cmd /K "cd /d ' + entry.path + '"'),
})

hue.contextMenu.add({
  label: 'PowerShell をここで開く',
  icon: '💙',
  match: (entry) => !entry.isDir,
  action: (_entry) => hue.exec('start powershell -NoExit -Command "Set-Location \'' + hue.currentPath + '\'"'),
})

hue.shortcuts.add({
  key: 'ctrl+shift+p',
  label: 'PowerShell を開く',
  description: '現在のフォルダで PowerShell を起動',
  action: (_entry) => hue.exec('start powershell -NoExit -Command "Set-Location \'' + hue.currentPath + '\'"'),
})
