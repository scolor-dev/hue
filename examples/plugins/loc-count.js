// @name 行数カウント
// @description フォルダ内のソースファイルの行数を拡張子別に集計

const SOURCE_EXTS = [
  '.js', '.ts', '.jsx', '.tsx', '.vue', '.svelte',
  '.go', '.zig', '.py', '.rb', '.rs', '.java', '.c', '.cpp', '.h',
  '.cs', '.swift', '.kt', '.ex', '.exs', '.sh', '.ps1',
  '.html', '.css', '.scss', '.json', '.yaml', '.toml', '.md',
]

function buildLocCmd(dirPath) {
  const extFilter = SOURCE_EXTS.map(e => '"*' + e + '"').join(', ')
  return (
    'powershell -Command "' +
    '$exts = @(' + extFilter + ');' +
    '$total = 0;' +
    '$results = @{};' +
    'Get-ChildItem -LiteralPath \\"' + dirPath + '\\" -Recurse -File |' +
    '  Where-Object { $exts -contains $_.Extension } |' +
    '  Where-Object { $_.FullName -notmatch \\"node_modules|.git|dist|bin|\\\\.zig-cache\\" } |' +
    '  ForEach-Object {' +
    '    $ext = $_.Extension;' +
    '    $lines = (Get-Content $_.FullName -ErrorAction SilentlyContinue | Measure-Object -Line).Lines;' +
    '    if (-not $results[$ext]) { $results[$ext] = 0 };' +
    '    $results[$ext] += $lines; $total += $lines' +
    '  };' +
    'Write-Host \\"--- 行数カウント: ' + dirPath.replace(/\\/g, '\\\\') + ' ---\\";' +
    '$results.GetEnumerator() | Sort-Object Value -Descending |' +
    '  ForEach-Object { Write-Host ($_.Key.PadRight(12) + \\" : \\" + $_.Value) };' +
    'Write-Host (\\"-\\" * 30);' +
    'Write-Host (\\"合計           : \\" + $total)' +
    '"'
  )
}

hue.contextMenu.add({
  label: '行数カウント (拡張子別)',
  icon: '📊',
  match: (entry) => entry.isDir,
  action: (entry) => hue.exec(buildLocCmd(entry.path)),
})

hue.shortcuts.add({
  key: 'ctrl+shift+k',
  label: '行数カウント',
  description: '現在のフォルダのソースファイル行数を集計',
  action: (_entry) => hue.exec(buildLocCmd(hue.currentPath)),
})
