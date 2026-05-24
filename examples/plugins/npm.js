// @name npm スクリプト
// @description package.json があるフォルダで npm scripts を素早く実行

// よく使うスクリプトをコンテキストメニューに追加
const NPM_SCRIPTS = [
  { label: 'npm install',     icon: '📦', cmd: 'npm install' },
  { label: 'npm run dev',     icon: '⚡', cmd: 'npm run dev' },
  { label: 'npm run build',   icon: '🔨', cmd: 'npm run build' },
  { label: 'npm run test',    icon: '🧪', cmd: 'npm run test' },
  { label: 'npm run lint',    icon: '🔍', cmd: 'npm run lint' },
  { label: 'npm run preview', icon: '👁️', cmd: 'npm run preview' },
]

function hasPackageJson(entry) {
  // フォルダ上にのみ表示 (package.json の存在チェックは実行時に行う)
  return entry.isDir
}

function runNpm(dirPath, cmd) {
  hue.exec('cd /d "' + dirPath + '" && ' + cmd)
}

NPM_SCRIPTS.forEach((item) => {
  hue.contextMenu.add({
    label: item.label,
    icon: item.icon,
    match: hasPackageJson,
    action: (entry) => runNpm(entry.path, item.cmd),
  })
})

// package.json のスクリプト一覧を表示
hue.contextMenu.add({
  label: 'npm scripts 一覧を表示',
  icon: '📋',
  match: hasPackageJson,
  action: (entry) => {
    hue.exec(
      'cd /d "' + entry.path + '" && ' +
      'powershell -Command "' +
      'if (Test-Path package.json) {' +
      '  $pkg = Get-Content package.json | ConvertFrom-Json;' +
      '  Write-Host \\"--- npm scripts ---\\";' +
      '  $pkg.scripts.PSObject.Properties | ForEach-Object { Write-Host ($_.Name + \\" : \\" + $_.Value) }' +
      '} else { Write-Host \\"package.json が見つかりません\\" }' +
      '"'
    )
  },
})

// npm outdated で古いパッケージを確認
hue.contextMenu.add({
  label: 'npm outdated',
  icon: '⬆️',
  match: hasPackageJson,
  action: (entry) => runNpm(entry.path, 'npm outdated'),
})

// node_modules を削除して再インストール
hue.contextMenu.add({
  label: 'node_modules を削除して再インストール',
  icon: '♻️',
  match: hasPackageJson,
  action: (entry) => {
    const confirmed = confirm(entry.path + '\\node_modules を削除して npm install しますか？')
    if (!confirmed) return
    hue.exec(
      'cd /d "' + entry.path + '" && ' +
      'powershell -Command "Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue" && ' +
      'npm install'
    )
  },
})

hue.shortcuts.add({
  key: 'ctrl+shift+n',
  label: 'npm run dev',
  description: '現在のフォルダで npm run dev を実行',
  action: (_entry) => runNpm(hue.currentPath, 'npm run dev'),
})

hue.shortcuts.add({
  key: 'ctrl+shift+b',
  label: 'npm run build',
  description: '現在のフォルダで npm run build を実行',
  action: (_entry) => runNpm(hue.currentPath, 'npm run build'),
})
