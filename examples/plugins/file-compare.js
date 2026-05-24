// @name ファイル比較
// @description 2つのファイルを選択して差分を表示 (fc コマンド)
// 使い方: Ctrl+クリックで2ファイル選択 → 右クリック → 「差分を表示」

// NOTE: このプラグインは将来のマルチセレクトコンテキストメニュー対応後に有効になります。
// 現在は単ファイル選択時に前回選択ファイルと比較する形で動作します。

let lastSelectedPath = null

hue.contextMenu.add({
  label: '比較ファイルとしてマーク',
  icon: '🔖',
  match: (entry) => !entry.isDir,
  action: (entry) => {
    lastSelectedPath = entry.path
    hue.exec('echo 比較元: ' + entry.name + ' (マーク済み)')
  },
})

hue.contextMenu.add({
  label: 'マーク済みファイルと比較',
  icon: '🔀',
  match: (entry) => !entry.isDir && lastSelectedPath !== null,
  action: (entry) => {
    if (!lastSelectedPath) return
    hue.exec('fc "' + lastSelectedPath + '" "' + entry.path + '"')
  },
})

hue.shortcuts.add({
  key: 'ctrl+shift+d',
  label: 'マーク済みファイルと差分表示',
  description: '比較元としてマークしたファイルと現在の選択を比較',
  action: (entry) => {
    if (!entry || entry.isDir) return
    if (!lastSelectedPath) {
      lastSelectedPath = entry.path
      hue.exec('echo 比較元: ' + entry.name + ' (マーク済み)')
      return
    }
    hue.exec('fc "' + lastSelectedPath + '" "' + entry.path + '"')
  },
})
