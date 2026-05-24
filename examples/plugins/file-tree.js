// @name ファイルツリー生成
// @description フォルダ構造を ASCII ツリーとして出力・クリップボードにコピー

function buildTree(dir, prefix, maxDepth, depth) {
  if (depth > maxDepth) return 'echo "  (省略)"'
  return (
    'powershell -Command "' +
    'function Show-Tree($path, $prefix, $depth, $max) {' +
    '  if ($depth -gt $max) { return }' +
    '  $items = Get-ChildItem -LiteralPath $path | Sort-Object { $_.PSIsContainer -eq $false }, Name;' +
    '  for ($i = 0; $i -lt $items.Count; $i++) {' +
    '    $item = $items[$i];' +
    '    $isLast = $i -eq $items.Count - 1;' +
    '    $branch = if ($isLast) { \\"└── \\" } else { \\"├── \\" };' +
    '    Write-Host ($prefix + $branch + $item.Name);' +
    '    if ($item.PSIsContainer) {' +
    '      $newPrefix = $prefix + (if ($isLast) { \\"    \\" } else { \\"│   \\" });' +
    '      Show-Tree $item.FullName $newPrefix ($depth + 1) $max' +
    '    }' +
    '  }' +
    '};' +
    'Write-Host \\"' + dir + '\\";' +
    'Show-Tree \\"' + dir + '\\" \\"\\" 0 3"'
  )
}

hue.contextMenu.add({
  label: 'ファイルツリーを表示',
  icon: '🌲',
  match: (entry) => entry.isDir,
  action: (entry) => hue.exec(buildTree(entry.path, '', 3, 0)),
})

hue.contextMenu.add({
  label: 'ファイルツリーをコピー',
  icon: '📋',
  match: (entry) => entry.isDir,
  action: (entry) => hue.exec(
    'powershell -Command "' +
    'function Get-Tree($path, $prefix, $depth) {' +
    '  if ($depth -gt 3) { return @() }' +
    '  $lines = @($path);' +
    '  $items = Get-ChildItem -LiteralPath $path | Sort-Object { $_.PSIsContainer -eq $false }, Name;' +
    '  for ($i = 0; $i -lt $items.Count; $i++) {' +
    '    $item = $items[$i]; $isLast = $i -eq $items.Count - 1;' +
    '    $branch = if ($isLast) { \\"└── \\" } else { \\"├── \\" };' +
    '    $lines += $prefix + $branch + $item.Name;' +
    '    if ($item.PSIsContainer) {' +
    '      $np = $prefix + (if ($isLast) { \\"    \\" } else { \\"│   \\" });' +
    '      $lines += Get-Tree $item.FullName $np ($depth + 1)' +
    '    }' +
    '  }; return $lines' +
    '};' +
    '(Get-Tree \\"' + entry.path + '\\" \\"\\" 0) -join [Environment]::NewLine | Set-Clipboard;' +
    'Write-Host \\"クリップボードにコピーしました\\"'  +
    '"'
  ),
})

hue.shortcuts.add({
  key: 'ctrl+shift+t',
  label: 'ファイルツリー表示',
  description: '現在のフォルダのファイルツリーをコンソールに出力',
  action: (_entry) => hue.exec(buildTree(hue.currentPath, '', 3, 0)),
})
