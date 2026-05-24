// @name VS Codeで開く
// @description VS Codeでファイル・フォルダを開く

hue.contextMenu.add({
  label: 'VS Codeで開く',
  icon: '📝',
  match: (entry) => true,
  action: (entry) => hue.exec('code "' + entry.path + '"'),
})

hue.shortcuts.add({
  key: 'ctrl+e',
  label: 'VS Codeで開く',
  description: '選択アイテムをVS Codeで開く',
  action: (entry) => hue.exec('code "' + (entry?.path ?? hue.currentPath) + '"'),
})
