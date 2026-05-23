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
    {#each drives as drive}
      <TreeNode
        path={drive}
        name={drive}
        {currentPath}
        depth={0}
        {onNavigate}
      />
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

  .tree-sidebar::-webkit-scrollbar { width: 6px; }
  .tree-sidebar::-webkit-scrollbar-track { background: transparent; }
  .tree-sidebar::-webkit-scrollbar-thumb { background: #424242; border-radius: 3px; }
  .tree-sidebar::-webkit-scrollbar-thumb:hover { background: #555; }
</style>
