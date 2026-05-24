// @name クイック作成
// @description よく使うファイルテンプレートをすぐに作成

const templates = [
  {
    label: 'README.md',
    icon: '📝',
    name: 'README.md',
    content: '# Project\n\n## Overview\n\n## Usage\n',
  },
  {
    label: 'package.json',
    icon: '📦',
    name: 'package.json',
    content: JSON.stringify({ name: 'my-project', version: '1.0.0', scripts: {}, dependencies: {} }, null, 2) + '\n',
  },
  {
    label: '.gitignore',
    icon: '🙈',
    name: '.gitignore',
    content: 'node_modules/\ndist/\n.env\n*.log\n',
  },
  {
    label: 'tsconfig.json',
    icon: '🔷',
    name: 'tsconfig.json',
    content: JSON.stringify({ compilerOptions: { target: 'ES2020', module: 'ESNext', strict: true } }, null, 2) + '\n',
  },
]

templates.forEach((tpl) => {
  hue.contextMenu.add({
    label: tpl.label + ' を作成',
    icon: tpl.icon,
    match: (_entry) => false, // 背景右クリック用（将来対応）
    action: (_entry) => {
      const path = hue.currentPath + '\\' + tpl.name
      hue.exec(
        'powershell -Command "if (-not (Test-Path \'' + path + '\')) { Set-Content -Path \'' + path + '\' -Value \'' + tpl.content.replace(/'/g, "''").replace(/\n/g, '`n') + '\' -Encoding UTF8 }"'
      )
      setTimeout(() => hue.refresh(), 500)
    },
  })
})
