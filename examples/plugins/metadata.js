// @name ファイルメタデータ
// @description ファイル・フォルダの詳細情報（属性・作成日・更新日・所有者）を表示

hue.contextMenu.add({
  label: 'メタデータを表示',
  icon: 'ℹ️',
  match: (entry) => true,
  action: (entry) => hue.exec(
    'powershell -Command "' +
    '$item = Get-Item -LiteralPath \\"' + entry.path + '\\";' +
    'Write-Host \\"=== メタデータ ===\\";' +
    'Write-Host (\\"名前       : \\" + $item.Name);' +
    'Write-Host (\\"フルパス   : \\" + $item.FullName);' +
    'Write-Host (\\"種別       : \\" + (if ($item.PSIsContainer) { \\"フォルダ\\" } else { \\"ファイル\\" }));' +
    'if (-not $item.PSIsContainer) {' +
    '  $size = $item.Length;' +
    '  $sizeStr = if ($size -ge 1GB) { \\"{0:N2} GB\\" -f ($size/1GB) }' +
    '    elseif ($size -ge 1MB) { \\"{0:N2} MB\\" -f ($size/1MB) }' +
    '    elseif ($size -ge 1KB) { \\"{0:N2} KB\\" -f ($size/1KB) }' +
    '    else { \\"$size バイト\\" };' +
    '  Write-Host (\\"サイズ     : \\" + $sizeStr);' +
    '  Write-Host (\\"拡張子     : \\" + $item.Extension)' +
    '};' +
    'Write-Host (\\"作成日時   : \\" + $item.CreationTime.ToString(\\"yyyy-MM-dd HH:mm:ss\\"));' +
    'Write-Host (\\"更新日時   : \\" + $item.LastWriteTime.ToString(\\"yyyy-MM-dd HH:mm:ss\\"));' +
    'Write-Host (\\"アクセス日 : \\" + $item.LastAccessTime.ToString(\\"yyyy-MM-dd HH:mm:ss\\"));' +
    'Write-Host (\\"属性       : \\" + $item.Attributes);' +
    '$acl = Get-Acl -LiteralPath \\"' + entry.path + '\\" -ErrorAction SilentlyContinue;' +
    'if ($acl) { Write-Host (\\"所有者     : \\" + $acl.Owner) };' +
    'if ($item.PSIsContainer) {' +
    '  $count = (Get-ChildItem -LiteralPath $item.FullName -ErrorAction SilentlyContinue).Count;' +
    '  Write-Host (\\"アイテム数 : \\" + $count)' +
    '}' +
    '"'
  ),
})

hue.contextMenu.add({
  label: 'フォルダサイズを計算',
  icon: '📦',
  match: (entry) => entry.isDir,
  action: (entry) => hue.exec(
    'powershell -Command "' +
    'Write-Host \\"計算中...\\";' +
    '$size = (Get-ChildItem -LiteralPath \\"' + entry.path + '\\" -Recurse -File -ErrorAction SilentlyContinue |' +
    '  Measure-Object -Property Length -Sum).Sum;' +
    '$count = (Get-ChildItem -LiteralPath \\"' + entry.path + '\\" -Recurse -File -ErrorAction SilentlyContinue).Count;' +
    '$sizeStr = if ($size -ge 1GB) { \\"{0:N2} GB\\" -f ($size/1GB) }' +
    '  elseif ($size -ge 1MB) { \\"{0:N2} MB\\" -f ($size/1MB) }' +
    '  else { \\"{0:N2} KB\\" -f ($size/1KB) };' +
    'Write-Host (\\"フォルダ: ' + entry.path.replace(/\\/g, '\\\\') + '\\");' +
    'Write-Host (\\"サイズ  : \\" + $sizeStr);' +
    'Write-Host (\\"ファイル: \\" + $count + \\" 個\\")' +
    '"'
  ),
})

hue.shortcuts.add({
  key: 'ctrl+shift+i',
  label: 'メタデータ表示',
  description: '選択アイテムの詳細情報を表示',
  action: (entry) => {
    if (!entry) return
    hue.exec(
      'powershell -Command "' +
      '$item = Get-Item -LiteralPath \\"' + entry.path + '\\";' +
      'Write-Host (\\"名前: \\" + $item.Name);' +
      'Write-Host (\\"更新: \\" + $item.LastWriteTime.ToString(\\"yyyy-MM-dd HH:mm:ss\\"));' +
      'if (-not $item.PSIsContainer) {' +
      '  Write-Host (\\"サイズ: \\" + $item.Length + \\" バイト\\")' +
      '}"'
    )
  },
})
