<script>
  import { onMount } from 'svelte'
  import { ListDirectory, GetHomeDir, GetDrives, GetParentDir, OpenFile,
           DeleteItem, RenameItem, CreateFolder, CopyItem, MoveItem,
           GetThumbnail } from '../wailsjs/go/main/App'
  import { EventsOn } from '../wailsjs/runtime/runtime'

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

  // サムネイル
  let thumbnailSrc = ''
  const IMG_EXTS = new Set(['.jpg','.jpeg','.png','.gif','.webp','.bmp','.tiff','.ico'])

  onMount(async () => {
    drives = await GetDrives()
    const home = await GetHomeDir()
    await navigate(home)
    window.addEventListener('click', closeContextMenu)
    EventsOn('fs:changed', () => refresh())
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
    const entry = entries.find(e => e.path === path)
    if (entry && !entry.isDir && IMG_EXTS.has(entry.ext)) {
      thumbnailSrc = await GetThumbnail(path)
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
    if (!confirm(`「${name}」を削除しますか？`)) return
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
    newFolderName = '新しいフォルダー'
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

<svelte:window on:keydown={handleKeydown} />

<main>
  <div class="toolbar">
    <button on:click={goBack} disabled={historyIndex <= 0} title="戻る (Alt+←)">&#8592;</button>
    <button on:click={goForward} disabled={historyIndex >= history.length - 1} title="進む (Alt+→)">&#8594;</button>
    <button on:click={goUp} title="上へ">&#8593;</button>
    <button on:click={refresh} title="更新 (F5)">&#8635;</button>
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
  </div>

  {#if error}
    <div class="error" on:click={() => (error = '')}>{error} &nbsp;✕</div>
  {/if}

  <div class="file-list" on:contextmenu={(e) => openContextMenu(e, null)}>
    <div class="file-list-header">
      <span class="col-icon"></span>
      <span class="col-name">名前</span>
      <span class="col-size">サイズ</span>
      <span class="col-modified">更新日時</span>
    </div>
    <div class="file-list-body">
      {#each entries as entry (entry.path)}
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
              {entry.name}
            {/if}
          </span>
          <span class="col-size">{formatSize(entry.size, entry.isDir)}</span>
          <span class="col-modified">{entry.modTime}</span>
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

  <div class="statusbar">
    {#if thumbnailSrc}
      <img class="thumb-preview" src={thumbnailSrc} alt="preview" />
    {/if}
    {entries.length} 件
    {#if selectedPath}
      &nbsp;・&nbsp;{entries.find(e => e.path === selectedPath)?.name} を選択中
    {/if}
    {#if clipboard}
      &nbsp;・&nbsp;クリップボード: {clipboard.op === 'copy' ? 'コピー' : '切り取り'}
    {/if}
  </div>
</main>

{#if contextMenu.visible}
  <div class="context-menu" style="left:{contextMenu.x}px; top:{contextMenu.y}px">
    {#if contextMenu.target}
      <!-- ファイル / フォルダ上 -->
      <button on:click={() => { onEnter(contextMenu.target); closeContextMenu() }}>
        {contextMenu.target.isDir ? 'フォルダを開く' : '開く'}
      </button>
      <hr />
      <button on:click={() => { clipboard = { path: contextMenu.target.path, op: 'copy' }; closeContextMenu() }}>
        コピー <span class="shortcut">Ctrl+C</span>
      </button>
      <button on:click={() => { clipboard = { path: contextMenu.target.path, op: 'cut' }; closeContextMenu() }}>
        切り取り <span class="shortcut">Ctrl+X</span>
      </button>
      {#if clipboard}
        <button on:click={() => { doPaste(); closeContextMenu() }}>
          貼り付け <span class="shortcut">Ctrl+V</span>
        </button>
      {/if}
      <hr />
      <button on:click={() => { startCreateFolder(); closeContextMenu() }}>
        新規フォルダー <span class="shortcut">Ctrl+Shift+N</span>
      </button>
      <hr />
      <button on:click={() => { startRename(contextMenu.target.path); closeContextMenu() }}>
        名前の変更 <span class="shortcut">F2</span>
      </button>
      <button class="danger" on:click={() => { doDelete(contextMenu.target.path); closeContextMenu() }}>
        削除 <span class="shortcut">Del</span>
      </button>
    {:else}
      <!-- 何もない箇所 -->
      {#if clipboard}
        <button on:click={() => { doPaste(); closeContextMenu() }}>
          貼り付け <span class="shortcut">Ctrl+V</span>
        </button>
        <hr />
      {/if}
      <button on:click={() => { startCreateFolder(); closeContextMenu() }}>
        新規フォルダー <span class="shortcut">Ctrl+Shift+N</span>
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

  /* ── File list ── */
  .file-list {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
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

  .thumb-preview {
    height: 20px;
    width: 20px;
    object-fit: cover;
    border-radius: 2px;
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
