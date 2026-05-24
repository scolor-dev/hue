// @name パスをコピー
// @description ファイル・フォルダのパスをクリップボードにコピー

hue.contextMenu.add({
  label: 'パスをコピー',
  icon: '📋',
  match: (entry) => true,
  action: (entry) => hue.exec('echo|set /p="' + entry.path + '" | clip'),
})

hue.contextMenu.add({
  label: 'フォルダのパスをコピー',
  icon: '📋',
  match: (entry) => !entry.isDir,
  action: (_entry) => hue.exec('echo|set /p="' + hue.currentPath + '" | clip'),
})

hue.shortcuts.add({
  key: 'ctrl+shift+c',
  label: 'パスをコピー',
  description: '選択アイテムのフルパスをクリップボードにコピー',
  action: (entry) => {
    const path = entry ? entry.path : hue.currentPath
    hue.exec('echo|set /p="' + path + '" | clip')
  },
})
