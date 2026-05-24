// @name 一括リネーム
// @description 連番・日付プレフィックス・拡張子一括変換などのリネームを実行

// 連番リネーム: file_001.jpg, file_002.jpg, ...
hue.contextMenu.add({
  label: '連番リネーム (このフォルダ内)',
  icon: '🔢',
  match: (entry) => entry.isDir,
  action: (entry) => {
    const cmd = [
      'powershell -Command "',
      '$i=1;',
      'Get-ChildItem -LiteralPath \'' + entry.path + '\' -File |',
      'Sort-Object Name |',
      'ForEach-Object {',
      '  $ext=$_.Extension;',
      '  $dst=Join-Path $_.DirectoryName (\'file_\' + $i.ToString(\'000\') + $ext);',
      '  Rename-Item -LiteralPath $_.FullName -NewName $dst;',
      '  $i++',
      '}"',
    ].join(' ')
    hue.exec(cmd)
    setTimeout(() => hue.refresh(), 800)
  },
})

// 日付プレフィックス: 20260524_originalname.ext
hue.contextMenu.add({
  label: '日付プレフィックスを追加 (このフォルダ内)',
  icon: '📅',
  match: (entry) => entry.isDir,
  action: (entry) => {
    const cmd = [
      'powershell -Command "',
      '$date=(Get-Date -Format yyyyMMdd);',
      'Get-ChildItem -LiteralPath \'' + entry.path + '\' -File |',
      'Where-Object { $_.Name -notmatch \'^\\\d{8}_\' } |',
      'ForEach-Object {',
      '  $dst=Join-Path $_.DirectoryName ($date + \'_\' + $_.Name);',
      '  Rename-Item -LiteralPath $_.FullName -NewName $dst',
      '}"',
    ].join(' ')
    hue.exec(cmd)
    setTimeout(() => hue.refresh(), 800)
  },
})

// 拡張子を一括変換: フォルダ内の .jpeg → .jpg
hue.contextMenu.add({
  label: '.jpeg → .jpg に一括変換',
  icon: '🖼️',
  match: (entry) => entry.isDir,
  action: (entry) => {
    const cmd = [
      'powershell -Command "',
      'Get-ChildItem -LiteralPath \'' + entry.path + '\' -Filter *.jpeg -File |',
      'ForEach-Object {',
      '  $dst=[System.IO.Path]::ChangeExtension($_.FullName, \'.jpg\');',
      '  Rename-Item -LiteralPath $_.FullName -NewName $dst',
      '}"',
    ].join(' ')
    hue.exec(cmd)
    setTimeout(() => hue.refresh(), 800)
  },
})

// スペースをアンダースコアに置換
hue.contextMenu.add({
  label: 'スペース → _ に置換 (このフォルダ内)',
  icon: '✏️',
  match: (entry) => entry.isDir,
  action: (entry) => {
    const cmd = [
      'powershell -Command "',
      'Get-ChildItem -LiteralPath \'' + entry.path + '\' -File |',
      'Where-Object { $_.Name -match \' \' } |',
      'ForEach-Object {',
      '  $dst=Join-Path $_.DirectoryName ($_.Name -replace \' \', \'_\');',
      '  Rename-Item -LiteralPath $_.FullName -NewName $dst',
      '}"',
    ].join(' ')
    hue.exec(cmd)
    setTimeout(() => hue.refresh(), 800)
  },
})

// 選択ファイル単体のリネーム (名前を入力)
hue.contextMenu.add({
  label: 'リネーム (新しい名前を入力)',
  icon: '✏️',
  match: (entry) => !entry.isDir,
  action: (entry) => {
    const newName = prompt('新しいファイル名:', entry.name)
    if (!newName || newName === entry.name) return
    const dir = entry.path.substring(0, entry.path.lastIndexOf('\\'))
    const dst = dir + '\\' + newName
    hue.exec('powershell -Command "Rename-Item -LiteralPath \'' + entry.path + '\' -NewName \'' + dst + '\'"')
    setTimeout(() => hue.refresh(), 500)
  },
})
