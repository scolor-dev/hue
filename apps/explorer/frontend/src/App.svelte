<script>
  import { onMount } from 'svelte'
  import { ListDirectory, GetHomeDir, GetDrives, GetParentDir, OpenFile,
           DeleteItem, RenameItem, CreateFolder, CopyItem, MoveItem,
           GetThumbnail, GetPreview, OpenSettings, GetSettings,
           AddFavorite, RemoveFavorite,
           GetStartupPath, OpenInNewWindow, ExecInConsole } from '../wailsjs/go/main/App'
  import { EventsOn } from '../wailsjs/runtime/runtime'
  import TreeSidebar from './TreeSidebar.svelte'
  import ConsolePane from './ConsolePane.svelte'

  let currentPath = ''
  let entries = []
  let history = []
  let historyIndex = -1
  let selectedPath = ''
  let error = ''
  let drives = []

  // 右クリックメニュー
  let contextMenu = { visible: false, x: 0, y: 0, target: null }

  // 名前変更
  let renamingPath = ''
  let renameValue = ''

  // 新規フォルダ
  let creatingFolder = false
  let newFolderName = ''

  // クリップボード
  let clipboard = null // { path, op: 'copy' | 'cut' }

  // サムネイル / プレビュー
  let thumbnailSrc = ''
  let preview = null // { isText, content, truncated, fileSize }
  const IMG_EXTS = new Set(['.jpg','.jpeg','.png','.gif','.webp','.bmp','.tiff','.ico'])

  // 翻訳
  const tr = {
    ja: {
      sidebarLabel: 'フォルダ',
      shortcutsLabel: 'ショートカット',
      favoritesLabel: 'お気に入り',
      addFavorite: 'お気に入りに追加',
      removeFavorite: 'お気に入りから削除',
      back: '戻る', forward: '進む', up: '上へ', refresh: '更新', settingsBtn: '設定',
      colName: '名前', colSize: 'サイズ', colDate: '更新日時',
      openFolder: 'フォルダを開く', open: '開く', openNewWindow: '新しいウィンドウで開く', openConsole: 'コンソールで開く',
      copy: 'コピー', cut: '切り取り', paste: '貼り付け',
      newFolder: '新規フォルダー', rename: '名前の変更', delete: '削除',
      countItems: (n) => `${n} 件`,
      selectedLabel: (name) => `${name} を選択中`,
      clipboardLabel: (op) => `クリップボード: ${op === 'copy' ? 'コピー' : '切り取り'}`,
      confirmDelete: (name) => `「${name}」を削除しますか？`,
      defaultFolderName: '新しいフォルダー',
      truncated: '省略',
      relNow: 'たった今',
      relMin: (n) => `${n}分前`, relHr: (n) => `${n}時間前`,
      relDay: (n) => `${n}日前`, relMo: (n) => `${n}ヶ月前`, relYr: (n) => `${n}年前`,
    },
    en: {
      sidebarLabel: 'Folders',
      shortcutsLabel: 'Shortcuts',
      favoritesLabel: 'Favorites',
      addFavorite: 'Add to Favorites',
      removeFavorite: 'Remove from Favorites',
      back: 'Back', forward: 'Forward', up: 'Up', refresh: 'Refresh', settingsBtn: 'Settings',
      colName: 'Name', colSize: 'Size', colDate: 'Modified',
      openFolder: 'Open Folder', open: 'Open', openNewWindow: 'Open in New Window', openConsole: 'Open in Console',
      copy: 'Copy', cut: 'Cut', paste: 'Paste',
      newFolder: 'New Folder', rename: 'Rename', delete: 'Delete',
      countItems: (n) => `${n} item${n !== 1 ? 's' : ''}`,
      selectedLabel: (name) => `${name} selected`,
      clipboardLabel: (op) => `Clipboard: ${op === 'copy' ? 'Copy' : 'Cut'}`,
      confirmDelete: (name) => `Delete "${name}"?`,
      defaultFolderName: 'New Folder',
      truncated: 'truncated',
      relNow: 'just now',
      relMin: (n) => `${n}m ago`, relHr: (n) => `${n}h ago`,
      relDay: (n) => `${n}d ago`, relMo: (n) => `${n}mo ago`, relYr: (n) => `${n}y ago`,
    },
  }
  $: t = tr[settings.language] ?? tr.ja

  // 設定
  let settings = {
    showHidden: false,
    dateFormat: 'datetime',
    previewWidth: 220,
    thumbSize: 128,
    language: 'ja',
    sortBy: 'name',
    sortAsc: true,
    showExtensions: true,
    confirmDelete: true,
    favorites: [],
    commandShortcuts: [],
  }

  // 設定適用: フィルタ + ソート
  $: visibleEntries = (() => {
    let list = settings.showHidden ? entries : entries.filter(e => !e.isHidden)
    const { sortBy, sortAsc } = settings
    list = [...list].sort((a, b) => {
      if (a.isDir !== b.isDir) return a.isDir ? -1 : 1
      let cmp = 0
      if (sortBy === 'size')       cmp = a.size - b.size
      else if (sortBy === 'date')  cmp = a.modTime.localeCompare(b.modTime)
      else                         cmp = a.name.toLowerCase().localeCompare(b.name.toLowerCase())
      return sortAsc ? cmp : -cmp
    })
    return list
  })()

  // コンソールパネル
  let consoleVisible = false
  let consoleRunning = false
  let consoleLabel = ''
  let consoleLines = []
  let consoleSeq = 0
  let consoleCwd = ''

  function consolePush(type, text) {
    consoleLines = [...consoleLines, { id: consoleSeq++, type, text }]
  }

  // プレビューパネル リサイズ
  let previewWidth = 220
  let resizing = false

  function onResizerMousedown(e) {
    resizing = true
    document.body.classList.add('resizing')
    e.preventDefault()
  }

  function onMousemove(e) {
    if (!resizing) return
    const contentArea = document.querySelector('.content-area')
    if (!contentArea) return
    const rect = contentArea.getBoundingClientRect()
    previewWidth = Math.max(160, Math.min(600, rect.right - e.clientX))
  }

  function onMouseup() {
    if (!resizing) return
    resizing = false
    document.body.classList.remove('resizing')
  }

  async function applySettings(s) {
    settings = { ...s, favorites: s.favorites ?? [] }
    previewWidth = s.previewWidth
  }

  async function doAddFavorite(path) {
    await AddFavorite(path)
    const updated = await GetSettings()
    await applySettings(updated)
  }

  async function doRemoveFavorite(path) {
    await RemoveFavorite(path)
    const updated = await GetSettings()
    await applySettings(updated)
  }

  onMount(async () => {
    const s = await GetSettings()
    await applySettings(s)
    drives = await GetDrives()
    const startupPath = await GetStartupPath()
    const initialPath = startupPath || await GetHomeDir()
    await navigate(initialPath)
    window.addEventListener('click', closeContextMenu)
    EventsOn('fs:changed', () => refresh())
    EventsOn('settings:changed', async () => {
      const updated = await GetSettings()
      await applySettings(updated)
      await refresh()
    })
    EventsOn('console:start', (lbl) => {
      consoleLabel = lbl
      consoleLines = []
      consoleSeq = 0
      consoleRunning = true
      consoleVisible = true
      if (!consoleCwd) consoleCwd = currentPath
    })
    EventsOn('console:line', (msg) => {
      consolePush(msg.type, msg.text)
    })
    EventsOn('console:done', (code) => {
      consoleRunning = false
      if (code === 0) {
        consolePush('done-ok', `✓ 完了 (exit 0)`)
      } else {
        consolePush('done-err', `✗ 終了コード ${code}`)
      }
    })
  })

  async function navigate(path) {
    try {
      const result = await ListDirectory(path)
      entries = result ?? []
      currentPath = path
      error = ''
      if (historyIndex < history.length - 1) {
        history = history.slice(0, historyIndex + 1)
      }
      history = [...history, path]
      historyIndex = history.length - 1
      selectedPath = ''
    } catch (e) {
      error = String(e)
    }
  }

  async function selectEntry(path) {
    selectedPath = path
    thumbnailSrc = ''
    preview = null
    const entry = entries.find(e => e.path === path)
    if (!entry || entry.isDir) return
    if (IMG_EXTS.has(entry.ext)) {
      thumbnailSrc = await GetThumbnail(path)
    } else {
      const raw = await GetPreview(path)
      if (raw) preview = JSON.parse(raw)
    }
  }

  async function refresh() {
    if (!currentPath) return
    try {
      entries = (await ListDirectory(currentPath)) ?? []
      error = ''
    } catch (e) { error = String(e) }
  }

  async function goBack() {
    if (historyIndex <= 0) return
    historyIndex--
    try {
      entries = (await ListDirectory(history[historyIndex])) ?? []
      currentPath = history[historyIndex]
      selectedPath = ''
      error = ''
    } catch (e) { error = String(e) }
  }

  async function goForward() {
    if (historyIndex >= history.length - 1) return
    historyIndex++
    try {
      entries = (await ListDirectory(history[historyIndex])) ?? []
      currentPath = history[historyIndex]
      selectedPath = ''
      error = ''
    } catch (e) { error = String(e) }
  }

  async function goUp() {
    const parent = await GetParentDir(currentPath)
    if (parent) await navigate(parent)
  }

  async function onEnter(entry) {
    if (entry.isDir) {
      await navigate(entry.path)
    } else {
      await OpenFile(entry.path)
    }
  }

  async function handleAddressKeydown(e) {
    if (e.key === 'Enter') await navigate(e.target.value)
  }

  // ── キーボードショートカット ──
  async function handleKeydown(e) {
    if (renamingPath || creatingFolder) return

    if (e.key === 'Delete' && selectedPath) {
      await doDelete(selectedPath)
    } else if (e.key === 'F2' && selectedPath) {
      startRename(selectedPath)
    } else if (e.key === 'F5') {
      await refresh()
    } else if (e.ctrlKey && e.key === 'c' && selectedPath) {
      clipboard = { path: selectedPath, op: 'copy' }
    } else if (e.ctrlKey && e.key === 'x' && selectedPath) {
      clipboard = { path: selectedPath, op: 'cut' }
    } else if (e.ctrlKey && e.key === 'v' && clipboard) {
      await doPaste()
    } else if (e.ctrlKey && e.shiftKey && e.key === 'N') {
      startCreateFolder()
    } else if (e.key === 'Escape') {
      renamingPath = ''
      creatingFolder = false
    }
  }

  // ── 削除 ──
  async function doDelete(path) {
    const name = entries.find(e => e.path === path)?.name ?? path
    if (settings.confirmDelete && !confirm(t.confirmDelete(name))) return
    try {
      await DeleteItem(path)
      if (selectedPath === path) selectedPath = ''
      await refresh()
    } catch (e) { error = String(e) }
  }

  // ── 名前変更 ──
  function startRename(path) {
    renamingPath = path
    renameValue = entries.find(e => e.path === path)?.name ?? ''
    setTimeout(() => document.getElementById('rename-input')?.select(), 0)
  }

  async function commitRename() {
    if (!renameValue.trim()) { renamingPath = ''; return }
    const dir = currentPath
    const newPath = dir.replace(/\\$/, '') + '\\' + renameValue.trim()
    try {
      await RenameItem(renamingPath, newPath)
      renamingPath = ''
      selectedPath = newPath
      await refresh()
    } catch (e) { error = String(e); renamingPath = '' }
  }

  // ── 新規フォルダ ──
  function startCreateFolder() {
    creatingFolder = true
    newFolderName = t.defaultFolderName
    setTimeout(() => {
      const el = document.getElementById('new-folder-input')
      el?.focus(); el?.select()
    }, 0)
  }

  async function commitCreateFolder() {
    if (!newFolderName.trim()) { creatingFolder = false; return }
    try {
      await CreateFolder(currentPath, newFolderName.trim())
      creatingFolder = false
      await refresh()
    } catch (e) { error = String(e); creatingFolder = false }
  }

  // ── コピー・貼り付け ──
  async function doPaste() {
    if (!clipboard) return
    try {
      if (clipboard.op === 'copy') {
        await CopyItem(clipboard.path, currentPath)
      } else {
        await MoveItem(clipboard.path, currentPath)
        clipboard = null
      }
      await refresh()
    } catch (e) { error = String(e) }
  }

  // ── 右クリックメニュー ──
  function openContextMenu(e, entry) {
    e.preventDefault()
    contextMenu = { visible: true, x: e.clientX, y: e.clientY, target: entry }
    if (entry) selectedPath = entry.path
  }

  function closeContextMenu() {
    contextMenu = { ...contextMenu, visible: false }
  }

  // ── ユーティリティ ──
  function displayName(entry) {
    if (settings.showExtensions || entry.isDir || !entry.ext) return entry.name
    return entry.name.slice(0, entry.name.length - entry.ext.length)
  }

  function formatDate(modTime) {
    if (settings.dateFormat === 'datetime') return modTime
    if (settings.dateFormat === 'date') return modTime.slice(0, 10)
    const diff = Date.now() - new Date(modTime.replace(' ', 'T')).getTime()
    const sec = Math.floor(diff / 1000)
    if (sec < 60)   return t.relNow
    const min = Math.floor(sec / 60)
    if (min < 60)   return t.relMin(min)
    const hr = Math.floor(min / 60)
    if (hr < 24)    return t.relHr(hr)
    const day = Math.floor(hr / 24)
    if (day < 30)   return t.relDay(day)
    const mo = Math.floor(day / 30)
    if (mo < 12)    return t.relMo(mo)
    return t.relYr(Math.floor(mo / 12))
  }

  function formatSize(bytes, isDir) {
    if (isDir) return '—'
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB'
    if (bytes < 1073741824) return (bytes / 1048576).toFixed(1) + ' MB'
    return (bytes / 1073741824).toFixed(1) + ' GB'
  }

  function getIcon(entry) {
    if (entry.isDir) return '📁'
    const map = {
      '.pdf': '📄', '.doc': '📄', '.docx': '📄',
      '.xls': '📊', '.xlsx': '📊', '.csv': '📊',
      '.jpg': '🖼', '.jpeg': '🖼', '.png': '🖼', '.gif': '🖼', '.webp': '🖼', '.svg': '🖼',
      '.mp4': '🎬', '.avi': '🎬', '.mov': '🎬', '.mkv': '🎬',
      '.mp3': '🎵', '.wav': '🎵', '.flac': '🎵',
      '.zip': '📦', '.rar': '📦', '.7z': '📦', '.tar': '📦', '.gz': '📦',
      '.exe': '⚙', '.msi': '⚙', '.bat': '⚙',
      '.txt': '📝', '.md': '📝', '.log': '📝',
      '.js': '📜', '.ts': '📜', '.go': '📜', '.py': '📜', '.rs': '📜',
      '.svelte': '📜', '.vue': '📜', '.html': '📜', '.css': '📜',
    }
    return map[entry.ext] ?? '📄'
  }
</script>

<svelte:window on:keydown={handleKeydown} on:mousemove={onMousemove} on:mouseup={onMouseup} />

<main>
  <div class="toolbar">
    <button on:click={goBack} disabled={historyIndex <= 0} title={t.back}>&#8592;</button>
    <button on:click={goForward} disabled={historyIndex >= history.length - 1} title={t.forward}>&#8594;</button>
    <button on:click={goUp} title={t.up}>&#8593;</button>
    <button on:click={refresh} title={t.refresh}>&#8635;</button>
    <div class="drives">
      {#each drives as drive}
        <button class="drive-btn" on:click={() => navigate(drive)}>{drive}</button>
      {/each}
    </div>
    <input
      class="address-bar"
      value={currentPath}
      on:keydown={handleAddressKeydown}
      spellcheck="false"
    />
    <button on:click={OpenSettings} title={t.settingsBtn}>&#9881;</button>
  </div>

  {#if error}
    <div class="error" on:click={() => (error = '')}>{error} &nbsp;✕</div>
  {/if}

  <div class="content-area">
  <TreeSidebar
    {drives}
    {currentPath}
    onNavigate={navigate}
    label={t.sidebarLabel}
    favorites={settings.favorites}
    onRemoveFavorite={doRemoveFavorite}
    favoritesLabel={t.favoritesLabel}
    removeLabel={t.removeFavorite}
    shortcuts={settings.commandShortcuts ?? []}
    shortcutsLabel={t.shortcutsLabel}
  />

  <div class="file-list" on:contextmenu={(e) => openContextMenu(e, null)}>
    <div class="file-list-header">
      <span class="col-icon"></span>
      <span class="col-name">{t.colName}</span>
      <span class="col-size">{t.colSize}</span>
      <span class="col-modified">{t.colDate}</span>
    </div>
    <div class="file-list-body">
      {#each visibleEntries as entry (entry.path)}
        <div
          class="file-row"
          class:selected={selectedPath === entry.path}
          class:cut={clipboard?.op === 'cut' && clipboard?.path === entry.path}
          on:click={() => selectEntry(entry.path)}
          on:dblclick={() => onEnter(entry)}
          on:contextmenu={(e) => { e.stopPropagation(); openContextMenu(e, entry) }}
          on:keydown={(e) => e.key === 'Enter' && onEnter(entry)}
          role="row"
          tabindex="0"
        >
          <span class="col-icon">{getIcon(entry)}</span>
          <span class="col-name">
            {#if renamingPath === entry.path}
              <input
                id="rename-input"
                class="rename-input"
                bind:value={renameValue}
                on:keydown={(e) => {
                  if (e.key === 'Enter') commitRename()
                  if (e.key === 'Escape') renamingPath = ''
                  e.stopPropagation()
                }}
                on:blur={commitRename}
                on:click={(e) => e.stopPropagation()}
              />
            {:else}
              {displayName(entry)}
            {/if}
          </span>
          <span class="col-size">{formatSize(entry.size, entry.isDir)}</span>
          <span class="col-modified">{formatDate(entry.modTime)}</span>
        </div>
      {/each}

      {#if creatingFolder}
        <div class="file-row">
          <span class="col-icon">📁</span>
          <span class="col-name">
            <input
              id="new-folder-input"
              class="rename-input"
              bind:value={newFolderName}
              on:keydown={(e) => {
                if (e.key === 'Enter') commitCreateFolder()
                if (e.key === 'Escape') creatingFolder = false
                e.stopPropagation()
              }}
              on:blur={commitCreateFolder}
            />
          </span>
        </div>
      {/if}
    </div>
  </div>

  {#if selectedPath && (thumbnailSrc || preview)}
    {#each [entries.find(e => e.path === selectedPath)] as entry}
    <div class="resizer" on:mousedown={onResizerMousedown} on:keydown={() => {}} class:resizing role="separator" aria-orientation="vertical"></div>
    <div class="preview-pane" style="width:{previewWidth}px">
      {#if entry}
        <div class="preview-name" title={entry.name}>{entry.name}</div>
        <div class="preview-meta">{formatSize(entry.size, entry.isDir)} &nbsp;·&nbsp; {entry.modTime}</div>
      {/if}
      {#if thumbnailSrc}
        <div class="preview-thumb">
          <img src={thumbnailSrc} alt="preview" />
        </div>
      {:else if preview}
        {#if preview.isText}
          <pre class="preview-text">{preview.content}{#if preview.truncated}<span class="preview-trunc">…({t.truncated})</span>{/if}</pre>
        {:else}
          <pre class="preview-hex">{preview.content}</pre>
        {/if}
      {/if}
    </div>
    {/each}
  {/if}

  </div>

  {#if consoleVisible}
    <ConsolePane
      lines={consoleLines}
      running={consoleRunning}
      label={consoleLabel}
      cwd={consoleCwd}
      onClose={() => { consoleVisible = false }}
      onClear={() => { consoleLines = []; consoleSeq = 0 }}
      onRun={(cmd) => {
        consolePush('system', `> ${cmd}`)
        consoleRunning = true
        ExecInConsole(consoleCwd, cmd)
      }}
    />
  {/if}

  <div class="statusbar">
    {t.countItems(visibleEntries.length)}
    {#if selectedPath}
      &nbsp;·&nbsp;{t.selectedLabel(entries.find(e => e.path === selectedPath)?.name ?? '')}
    {/if}
    {#if clipboard}
      &nbsp;·&nbsp;{t.clipboardLabel(clipboard.op)}
    {/if}
  </div>
</main>

{#if contextMenu.visible}
  <div class="context-menu" style="left:{contextMenu.x}px; top:{contextMenu.y}px">
    {#if contextMenu.target}
      <!-- ファイル / フォルダ上 -->
      <button on:click={() => { onEnter(contextMenu.target); closeContextMenu() }}>
        {contextMenu.target.isDir ? t.openFolder : t.open}
      </button>
      {#if contextMenu.target.isDir}
        <button on:click={() => { OpenInNewWindow(contextMenu.target.path); closeContextMenu() }}>
          {t.openNewWindow}
        </button>
        <button on:click={() => {
          consoleCwd = contextMenu.target.path
          consoleVisible = true
          consoleLabel = 'コンソール'
          closeContextMenu()
        }}>
          {t.openConsole}
        </button>
      {/if}
      <hr />
      <button on:click={() => { clipboard = { path: contextMenu.target.path, op: 'copy' }; closeContextMenu() }}>
        {t.copy} <span class="shortcut">Ctrl+C</span>
      </button>
      <button on:click={() => { clipboard = { path: contextMenu.target.path, op: 'cut' }; closeContextMenu() }}>
        {t.cut} <span class="shortcut">Ctrl+X</span>
      </button>
      {#if clipboard}
        <button on:click={() => { doPaste(); closeContextMenu() }}>
          {t.paste} <span class="shortcut">Ctrl+V</span>
        </button>
      {/if}
      <hr />
      <button on:click={() => { startCreateFolder(); closeContextMenu() }}>
        {t.newFolder} <span class="shortcut">Ctrl+Shift+N</span>
      </button>
      <hr />
      <button on:click={() => { doAddFavorite(contextMenu.target.path); closeContextMenu() }}>
        {t.addFavorite}
      </button>
      <hr />
      <button on:click={() => { startRename(contextMenu.target.path); closeContextMenu() }}>
        {t.rename} <span class="shortcut">F2</span>
      </button>
      <button class="danger" on:click={() => { doDelete(contextMenu.target.path); closeContextMenu() }}>
        {t.delete} <span class="shortcut">Del</span>
      </button>
    {:else}
      {#if clipboard}
        <button on:click={() => { doPaste(); closeContextMenu() }}>
          {t.paste} <span class="shortcut">Ctrl+V</span>
        </button>
        <hr />
      {/if}
      <button on:click={() => { startCreateFolder(); closeContextMenu() }}>
        {t.newFolder} <span class="shortcut">Ctrl+Shift+N</span>
      </button>
      <hr />
      <button on:click={() => {
        consoleCwd = currentPath
        consoleVisible = true
        consoleLabel = 'コンソール'
        closeContextMenu()
      }}>
        {t.openConsole}
      </button>
    {/if}
  </div>
{/if}

<style>
  :global(html), :global(body), :global(#app) {
    height: 100%;
    margin: 0;
    padding: 0;
    overflow: hidden;
  }

  :global(body.resizing) { user-select: none; cursor: col-resize; }

  main {
    display: flex;
    flex-direction: column;
    height: 100vh;
    background: #1e1e1e;
    color: #d4d4d4;
    font-family: 'Segoe UI', system-ui, sans-serif;
    font-size: 13px;
  }

  /* ── Toolbar ── */
  .toolbar {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 5px 8px;
    background: #252526;
    border-bottom: 1px solid #3c3c3c;
    flex-shrink: 0;
  }

  .toolbar button {
    background: transparent;
    border: 1px solid transparent;
    color: #d4d4d4;
    width: 28px;
    height: 26px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
  }

  .toolbar button:hover:not(:disabled) {
    background: #3c3c3c;
    border-color: #555;
  }

  .toolbar button:disabled {
    opacity: 0.3;
    cursor: default;
  }

  .drives { display: flex; gap: 2px; }

  .drive-btn {
    width: auto !important;
    padding: 0 8px;
    font-size: 12px !important;
    color: #9cdcfe !important;
  }

  .address-bar {
    flex: 1;
    background: #3c3c3c;
    border: 1px solid #555;
    color: #d4d4d4;
    padding: 3px 8px;
    border-radius: 4px;
    font-size: 13px;
    font-family: 'Consolas', monospace;
    height: 26px;
  }

  .address-bar:focus {
    outline: none;
    border-color: #007acc;
  }

  /* ── Content area ── */
  .content-area {
    flex: 1;
    display: flex;
    flex-direction: row;
    overflow: hidden;
  }

  /* ── File list ── */
  .file-list {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  /* ── Resizer ── */
  .resizer {
    width: 4px;
    flex-shrink: 0;
    background: #3c3c3c;
    cursor: col-resize;
    transition: background 0.15s;
  }
  .resizer:hover, .resizer.resizing { background: #007acc; }

  /* ── Preview pane ── */
  .preview-pane {
    flex-shrink: 0;
    background: #252526;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    padding: 10px 10px 0;
    min-width: 0;
  }

  .preview-name {
    font-size: 12px;
    font-weight: 600;
    color: #d4d4d4;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    margin-bottom: 2px;
  }

  .preview-meta {
    font-size: 11px;
    color: #858585;
    margin-bottom: 8px;
  }

  .preview-thumb {
    display: flex;
    justify-content: center;
    margin-bottom: 8px;
  }

  .preview-thumb img {
    max-width: 100%;
    max-height: 140px;
    object-fit: contain;
    border-radius: 3px;
    border: 1px solid #3c3c3c;
  }

  .preview-text, .preview-hex {
    flex: 1;
    overflow-y: auto;
    font-family: 'Consolas', monospace;
    font-size: 11px;
    color: #ce9178;
    white-space: pre-wrap;
    word-break: break-all;
    margin: 0;
    line-height: 1.5;
  }

  .preview-hex { color: #4ec9b0; }

  .preview-trunc {
    color: #858585;
    font-style: italic;
  }

  .file-list-header {
    display: grid;
    grid-template-columns: 28px 1fr 90px 160px;
    padding: 4px 10px;
    background: #2d2d2d;
    border-bottom: 1px solid #3c3c3c;
    color: #858585;
    font-size: 12px;
    user-select: none;
    flex-shrink: 0;
  }

  .file-list-body {
    flex: 1;
    overflow-y: auto;
    padding: 2px 0;
  }

  .file-row {
    display: grid;
    grid-template-columns: 28px 1fr 90px 160px;
    padding: 3px 10px;
    cursor: pointer;
    user-select: none;
    border-radius: 3px;
    margin: 0 2px;
    align-items: center;
  }

  .file-row:hover { background: #2a2d2e; }
  .file-row.selected { background: #094771; }
  .file-row.cut { opacity: 0.5; }

  .col-icon { font-size: 14px; }

  .col-name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    padding-right: 8px;
  }

  .col-size {
    text-align: right;
    color: #858585;
    padding-right: 16px;
  }

  .col-modified { color: #858585; }

  /* ── Rename input ── */
  .rename-input {
    width: 100%;
    background: #3c3c3c;
    border: 1px solid #007acc;
    color: #d4d4d4;
    padding: 1px 4px;
    border-radius: 2px;
    font-size: 13px;
    font-family: inherit;
    outline: none;
  }

  /* ── Statusbar ── */
  .statusbar {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 3px 10px;
    background: #007acc;
    color: white;
    font-size: 12px;
    flex-shrink: 0;
  }

  /* ── Error ── */
  .error {
    padding: 6px 12px;
    background: #5a1d1d;
    color: #f48771;
    font-size: 12px;
    flex-shrink: 0;
    cursor: pointer;
  }

  /* ── Context menu ── */
  .context-menu {
    position: fixed;
    background: #2d2d2d;
    border: 1px solid #454545;
    border-radius: 4px;
    padding: 4px 0;
    min-width: 180px;
    z-index: 1000;
    box-shadow: 0 4px 12px rgba(0,0,0,0.4);
  }

  .context-menu button {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
    padding: 5px 16px;
    background: transparent;
    border: none;
    color: #d4d4d4;
    font-size: 13px;
    cursor: pointer;
    text-align: left;
  }

  .context-menu button:hover { background: #094771; }
  .context-menu button.danger:hover { background: #6b1c1c; color: #f48771; }

  .context-menu hr {
    border: none;
    border-top: 1px solid #3c3c3c;
    margin: 3px 0;
  }

  .shortcut {
    color: #858585;
    font-size: 11px;
    margin-left: 16px;
  }

  /* ── Scrollbar ── */
  .file-list-body::-webkit-scrollbar { width: 8px; }
  .file-list-body::-webkit-scrollbar-track { background: #1e1e1e; }
  .file-list-body::-webkit-scrollbar-thumb { background: #424242; border-radius: 4px; }
</style>
