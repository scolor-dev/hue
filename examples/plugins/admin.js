// @name 管理者として実行
// @description ファイルやフォルダを管理者権限で操作

hue.contextMenu.add({
  label: '管理者として実行',
  icon: '🛡️',
  match: (entry) => !entry.isDir && ['.exe', '.msi', '.bat', '.cmd', '.ps1'].includes(entry.ext),
  action: (entry) => hue.exec('powershell -Command "Start-Process \'' + entry.path + '\' -Verb RunAs"'),
})

hue.contextMenu.add({
  label: '管理者 PowerShell をここで開く',
  icon: '🛡️',
  match: (entry) => entry.isDir,
  action: (entry) => hue.exec(
    'powershell -Command "Start-Process powershell -ArgumentList \'-NoExit -Command Set-Location \\\'' + entry.path + '\\\'\' -Verb RunAs"'
  ),
})

hue.contextMenu.add({
  label: '管理者 PowerShell をここで開く',
  icon: '🛡️',
  match: (entry) => !entry.isDir,
  action: (_entry) => hue.exec(
    'powershell -Command "Start-Process powershell -ArgumentList \'-NoExit -Command Set-Location \\\'' + hue.currentPath + '\\\'\' -Verb RunAs"'
  ),
})
