// @name ファイルハッシュ
// @description ファイルの MD5 / SHA256 ハッシュ値をコンソールに表示 (certutil 使用)

hue.contextMenu.add({
  label: 'SHA256 を表示',
  icon: '🔑',
  match: (entry) => !entry.isDir,
  action: (entry) => hue.exec('certutil -hashfile "' + entry.path + '" SHA256'),
})

hue.contextMenu.add({
  label: 'MD5 を表示',
  icon: '🔑',
  match: (entry) => !entry.isDir,
  action: (entry) => hue.exec('certutil -hashfile "' + entry.path + '" MD5'),
})

hue.contextMenu.add({
  label: 'SHA1 を表示',
  icon: '🔑',
  match: (entry) => !entry.isDir,
  action: (entry) => hue.exec('certutil -hashfile "' + entry.path + '" SHA1'),
})

hue.shortcuts.add({
  key: 'ctrl+shift+h',
  label: 'SHA256 ハッシュ',
  description: '選択ファイルの SHA256 ハッシュ値を表示',
  action: (entry) => {
    if (!entry || entry.isDir) return
    hue.exec('certutil -hashfile "' + entry.path + '" SHA256')
  },
})
