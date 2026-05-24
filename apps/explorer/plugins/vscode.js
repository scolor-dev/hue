hue.contextMenu.add({
  label: 'VS Codeで開く',
  icon: '📝',
  match: (entry) => true,
  action: (entry) => hue.exec('code "' + entry.path + '"'),
})
