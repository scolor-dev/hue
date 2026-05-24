// @name Web 検索
// @description ファイル名やフォルダ名でWeb検索・GitHub検索を開く

function openUrl(url) {
  hue.exec('start "" "' + url + '"')
}

hue.contextMenu.add({
  label: 'Google で検索',
  icon: '🔍',
  match: (entry) => true,
  action: (entry) => openUrl('https://www.google.com/search?q=' + encodeURIComponent(entry.name)),
})

hue.contextMenu.add({
  label: 'GitHub で検索',
  icon: '🐙',
  match: (entry) => true,
  action: (entry) => openUrl('https://github.com/search?q=' + encodeURIComponent(entry.name)),
})

hue.contextMenu.add({
  label: 'npm で検索',
  icon: '📦',
  match: (entry) => !entry.isDir,
  action: (entry) => {
    const name = entry.name.replace(/\.[^.]+$/, '')
    openUrl('https://www.npmjs.com/search?q=' + encodeURIComponent(name))
  },
})
