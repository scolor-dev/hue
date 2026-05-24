// @name Windows Terminal
// @description Windows Terminal でフォルダを開く

hue.contextMenu.add({
  label: 'Windows Terminal で開く',
  icon: '🖥️',
  match: (entry) => entry.isDir,
  action: (entry) => hue.exec('wt -d "' + entry.path + '"'),
})

hue.contextMenu.add({
  label: 'Windows Terminal をここで開く',
  icon: '🖥️',
  match: (entry) => !entry.isDir,
  action: (_entry) => hue.exec('wt -d "' + hue.currentPath + '"'),
})

hue.shortcuts.add({
  key: 'ctrl+alt+t',
  label: 'Windows Terminal を開く',
  description: '現在のフォルダで Windows Terminal を起動',
  action: (_entry) => hue.exec('wt -d "' + hue.currentPath + '"'),
})
