<script>
  import { onDestroy } from 'svelte'
  import TreeNode from './TreeNode.svelte'
  import FavoritesPane from './FavoritesPane.svelte'
  import CommandShortcutsPane from './CommandShortcutsPane.svelte'

  export let drives = []
  export let currentPath = ''
  export let onNavigate
  export let label = 'フォルダ'
  export let favorites = []
  export let onRemoveFavorite = (_path) => {}
  export let favoritesLabel = 'お気に入り'
  export let removeLabel = 'お気に入りから削除'
  export let shortcuts = []
  export let shortcutsLabel = 'ショートカット'

  function fmtGB(bytes) {
    if (bytes >= 1e9) return (bytes / 1e9).toFixed(1) + ' GB'
    if (bytes >= 1e6) return (bytes / 1e6).toFixed(0) + ' MB'
    return (bytes / 1e3).toFixed(0) + ' KB'
  }

  let sidebarWidth = 200
  let isResizing = false

  function startResize(e) {
    isResizing = true
    e.preventDefault()
    window.addEventListener('mousemove', onResize)
    window.addEventListener('mouseup', stopResize)
    document.body.classList.add('resizing')
  }

  function onResize(e) {
    if (!isResizing) return
    sidebarWidth = Math.max(120, Math.min(400, e.clientX))
  }

  function stopResize() {
    isResizing = false
    window.removeEventListener('mousemove', onResize)
    window.removeEventListener('mouseup', stopResize)
    document.body.classList.remove('resizing')
  }

  onDestroy(() => {
    window.removeEventListener('mousemove', onResize)
    window.removeEventListener('mouseup', stopResize)
  })
</script>

<div class="sidebar-wrapper">
  <div class="tree-sidebar" style="width: {sidebarWidth}px">
    <CommandShortcutsPane
      {shortcuts}
      {currentPath}
      label={shortcutsLabel}
    />

    <FavoritesPane
      {favorites}
      {currentPath}
      {onNavigate}
      onRemove={onRemoveFavorite}
      label={favoritesLabel}
      {removeLabel}
    />

    <div class="sidebar-title" role="tree" aria-label={label}>{label}</div>
    {#each drives as d}
      <div class="drive-entry">
        <TreeNode
          path={d.path}
          name={d.label ? `${d.path[0]}: ${d.label}` : d.path}
          {currentPath}
          depth={0}
          {onNavigate}
        />
        {#if d.totalBytes > 0}
          {@const usedRatio = 1 - d.freeBytes / d.totalBytes}
          <div class="drive-bar-wrap" title="{fmtGB(d.freeBytes)} 空き / {fmtGB(d.totalBytes)}">
            <div class="drive-bar">
              <div
                class="drive-bar-used"
                class:warn={usedRatio > 0.85}
                style="width:{Math.round(usedRatio * 100)}%"
              ></div>
            </div>
            <span class="drive-space">{fmtGB(d.freeBytes)} 空き</span>
          </div>
        {/if}
      </div>
    {/each}
  </div>

  <div
    class="sidebar-resizer"
    class:active={isResizing}
    on:mousedown={startResize}
    on:keydown={() => {}}
    role="separator"
    aria-orientation="vertical"
    tabindex="0"
    title="ドラッグしてサイズ変更"
  ></div>
</div>

<style>
  .sidebar-wrapper {
    display: flex;
    flex-direction: row;
    flex-shrink: 0;
    height: 100%;
  }

  .tree-sidebar {
    background: #252526;
    overflow-y: auto;
    overflow-x: hidden;
    display: flex;
    flex-direction: column;
    flex-shrink: 0;
    border-right: none;
    padding-bottom: 8px;
  }

  .sidebar-title {
    font-size: 11px;
    font-weight: 600;
    color: #858585;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    padding: 8px 12px 6px;
    flex-shrink: 0;
    user-select: none;
  }

  .sidebar-resizer {
    width: 4px;
    flex-shrink: 0;
    background: #3c3c3c;
    cursor: col-resize;
    transition: background 0.15s;
  }

  .sidebar-resizer:hover,
  .sidebar-resizer.active { background: #007acc; }

  .drive-entry { display: flex; flex-direction: column; }

  .drive-bar-wrap {
    display: flex;
    align-items: center;
    gap: 5px;
    padding: 1px 10px 4px 24px;
  }

  .drive-bar {
    flex: 1;
    height: 3px;
    background: #3c3c3c;
    border-radius: 2px;
    overflow: hidden;
  }

  .drive-bar-used {
    height: 100%;
    background: #007acc;
    border-radius: 2px;
    transition: width 0.3s;
  }
  .drive-bar-used.warn { background: #e8a838; }

  .drive-space {
    font-size: 10px;
    color: #666;
    white-space: nowrap;
    flex-shrink: 0;
  }

  .tree-sidebar::-webkit-scrollbar { width: 6px; }
  .tree-sidebar::-webkit-scrollbar-track { background: transparent; }
  .tree-sidebar::-webkit-scrollbar-thumb { background: #424242; border-radius: 3px; }
  .tree-sidebar::-webkit-scrollbar-thumb:hover { background: #555; }
</style>
