// @name Git ツール
// @description よく使う Git コマンドをコンソールから実行

function gitExec(cmd) {
  hue.exec('cd /d "' + hue.currentPath + '" && git ' + cmd)
}

hue.contextMenu.add({
  label: 'git status',
  icon: '📊',
  match: (entry) => entry.isDir,
  action: (entry) => hue.exec('cd /d "' + entry.path + '" && git status'),
})

hue.contextMenu.add({
  label: 'git log (直近10件)',
  icon: '📜',
  match: (entry) => entry.isDir,
  action: (entry) => hue.exec('cd /d "' + entry.path + '" && git log --oneline -10'),
})

hue.contextMenu.add({
  label: 'git pull',
  icon: '⬇️',
  match: (entry) => entry.isDir,
  action: (entry) => hue.exec('cd /d "' + entry.path + '" && git pull'),
})

hue.shortcuts.add({
  key: 'ctrl+shift+s',
  label: 'git status',
  description: '現在のフォルダで git status を実行',
  action: (_entry) => gitExec('status'),
})

hue.shortcuts.add({
  key: 'ctrl+shift+l',
  label: 'git log',
  description: '直近10件のコミット履歴を表示',
  action: (_entry) => gitExec('log --oneline -10'),
})
