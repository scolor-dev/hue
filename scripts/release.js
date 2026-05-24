#!/usr/bin/env node
/**
 * scripts/release.js — バージョン番号を一括更新して CHANGELOG を生成
 *
 * 使い方:
 *   node scripts/release.js patch              # 0.2.2 → 0.2.3
 *   node scripts/release.js minor "説明"       # 0.2.2 → 0.3.0
 *   node scripts/release.js major "説明"       # 0.2.2 → 1.0.0
 *
 * 実行すると:
 *   1. git タグから現在バージョンを取得
 *   2. package.json (explorer / settings) のバージョンを更新
 *   3. CHANGELOG.md に今回の変更履歴を追記
 *   4. git commit + git tag を作成
 *   (push は手動: git push origin main --tags)
 */

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

const ROOT = path.resolve(__dirname, '..')

function run(cmd, opts = {}) {
  return execSync(cmd, { cwd: ROOT, encoding: 'utf8', ...opts }).trim()
}

// ---- バージョン計算 -------------------------------------------------------

function currentTag() {
  try {
    return run('git describe --tags --abbrev=0')
  } catch {
    return 'v0.0.0'
  }
}

function bumpVersion(current, type) {
  const [major, minor, patch] = current.replace(/^v/, '').split('.').map(Number)
  if (type === 'major') return `${major + 1}.0.0`
  if (type === 'minor') return `${major}.${minor + 1}.0`
  return `${major}.${minor}.${patch + 1}`
}

// ---- package.json 更新 ---------------------------------------------------

const PACKAGE_FILES = [
  'apps/explorer/frontend/package.json',
  'apps/settings/frontend/package.json',
]

function updatePackageJson(relPath, newVersion) {
  const absPath = path.join(ROOT, relPath)
  const pkg = JSON.parse(fs.readFileSync(absPath, 'utf8'))
  pkg.version = newVersion
  fs.writeFileSync(absPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8')
  console.log(`  updated  ${relPath}  →  ${newVersion}`)
}

// ---- CHANGELOG 生成 ------------------------------------------------------

function buildChangelogEntry(fromTag, newVersion, description) {
  const date = new Date().toISOString().slice(0, 10)
  const title = description
    ? `## v${newVersion} — ${date} — ${description}`
    : `## v${newVersion} — ${date}`

  let raw
  try {
    raw = run(`git log ${fromTag}..HEAD --oneline --no-merges`)
  } catch {
    raw = run('git log --oneline --no-merges -20')
  }

  const lines = raw.split('\n').filter(Boolean)

  const feats  = lines.filter(l => /feat:/i.test(l))
  const fixes  = lines.filter(l => /fix:/i.test(l))
  const chores = lines.filter(l => /chore:|build:|docs:|refactor:/i.test(l))
  const rest   = lines.filter(l => ![...feats, ...fixes, ...chores].includes(l))

  const block = (heading, items) =>
    items.length ? `\n### ${heading}\n${items.map(l => `- ${l.replace(/^[0-9a-f]+ /, '')}`).join('\n')}` : ''

  return [
    title,
    block('Added / Changed', feats),
    block('Fixed', fixes),
    block('Chores', [...chores, ...rest]),
    '',
  ].join('\n')
}

function prependToChangelog(entry) {
  const clPath = path.join(ROOT, 'CHANGELOG.md')
  const header = '# Changelog\n\n'
  const existing = fs.existsSync(clPath) ? fs.readFileSync(clPath, 'utf8') : header
  const body = existing.startsWith('# Changelog')
    ? existing.slice(existing.indexOf('\n\n') + 2)
    : existing
  fs.writeFileSync(clPath, header + entry + '\n' + body, 'utf8')
  console.log('  updated  CHANGELOG.md')
}

// ---- メイン --------------------------------------------------------------

const bumpType   = process.argv[2] || 'patch'
const description = process.argv.slice(3).join(' ')

if (!['patch', 'minor', 'major'].includes(bumpType)) {
  console.error('Usage: node scripts/release.js [patch|minor|major] ["description"]')
  process.exit(1)
}

// 未コミットの変更がある場合は中断
const status = run('git status --porcelain')
if (status) {
  console.error('\n  Error: uncommitted changes exist. Commit or stash them first.\n')
  process.exit(1)
}

const prevTag    = currentTag()
const newVersion = bumpVersion(prevTag, bumpType)
const newTag     = `v${newVersion}`

console.log(`\n  ${prevTag}  →  ${newTag}\n`)

for (const f of PACKAGE_FILES) updatePackageJson(f, newVersion)

const entry = buildChangelogEntry(prevTag, newVersion, description)
prependToChangelog(entry)

run(`git add ${PACKAGE_FILES.map(f => `"${f}"`).join(' ')} CHANGELOG.md`)
const commitMsg = description ? `[Release] v${newVersion} — ${description}` : `[Release] v${newVersion}`
run(`git commit -m "${commitMsg}"`)
run(`git tag ${newTag}`)

console.log(`\n  committed and tagged: ${newTag}`)
console.log('  next: git push origin main --tags\n')
