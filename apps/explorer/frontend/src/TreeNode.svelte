<script>
  import { ListDirectory } from '../wailsjs/go/main/App'

  export let path = ''
  export let name = ''
  export let currentPath = ''
  export let depth = 0
  export let onNavigate

  let expanded = false
  let children = []
  let loaded = false
  let loading = false

  $: isSelected = currentPath.toLowerCase() === path.toLowerCase()
  $: hasArrow = !loaded || children.length > 0

  async function loadChildren() {
    if (loading) return
    loading = true
    try {
      const entries = await ListDirectory(path)
      children = (entries ?? []).filter(e => e.isDir && !e.isHidden)
      loaded = true
    } catch {
      children = []
      loaded = true
    }
    loading = false
  }

  async function toggle(e) {
    e.stopPropagation()
    if (expanded) {
      expanded = false
      return
    }
    if (!loaded) await loadChildren()
    expanded = true
  }

  function handleClick() {
    onNavigate(path)
  }

  function handleKeydown(e) {
    if (e.key === 'Enter') handleClick()
    else if (e.key === 'ArrowRight' && !expanded) toggle(e)
    else if (e.key === 'ArrowLeft' && expanded) { expanded = false; e.stopPropagation() }
  }
</script>

<div class="tree-node" role="none">
  <div
    class="node-row"
    class:selected={isSelected}
    style="padding-left: {6 + depth * 14}px"
    on:click={handleClick}
    on:keydown={handleKeydown}
    role="treeitem"
    tabindex="0"
    aria-expanded={expanded}
    aria-selected={isSelected}
  >
    <button class="toggle-btn" on:click={toggle} tabindex="-1" aria-label={expanded ? 'collapse' : 'expand'}>
      {#if loading}
        <span class="loading-dot">•</span>
      {:else if hasArrow}
        <span class="arrow" class:open={expanded}>▸</span>
      {:else}
        <span class="no-arrow"></span>
      {/if}
    </button>
    <span class="folder-icon">{expanded ? '📂' : '📁'}</span>
    <span class="node-name" title={path}>{name}</span>
  </div>

  {#if expanded && children.length > 0}
    <div class="children" role="group">
      {#each children as child (child.path)}
        <svelte:self
          path={child.path}
          name={child.name}
          {currentPath}
          depth={depth + 1}
          {onNavigate}
        />
      {/each}
    </div>
  {/if}
</div>

<style>
  .tree-node { display: flex; flex-direction: column; }

  .node-row {
    display: flex;
    align-items: center;
    height: 22px;
    cursor: pointer;
    user-select: none;
    border-radius: 3px;
    margin: 0 3px;
    min-width: 0;
    outline: none;
  }

  .node-row:hover { background: rgba(255,255,255,0.05); }
  .node-row:focus-visible { outline: 1px solid var(--hue-accent); outline-offset: -1px; }
  .node-row.selected { background: var(--hue-accent-dim); }

  .toggle-btn {
    width: 18px;
    height: 18px;
    flex-shrink: 0;
    background: transparent;
    border: none;
    color: var(--hue-text-muted);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    font-size: 9px;
    border-radius: 2px;
  }

  .toggle-btn:hover { color: var(--hue-text); background: rgba(255,255,255,0.06); }

  .arrow { display: inline-block; transition: transform 0.12s; }
  .arrow.open { transform: rotate(90deg); }
  .no-arrow { width: 9px; display: inline-block; }

  .folder-icon { font-size: 13px; flex-shrink: 0; margin: 0 4px 0 2px; }

  .node-name {
    font-size: 12px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    flex: 1;
    color: var(--hue-text);
    padding-right: 6px;
  }

  .node-row.selected .node-name { color: #ffffff; }

  .loading-dot {
    display: inline-block;
    animation: pulse 0.8s ease-in-out infinite;
    font-size: 14px;
    color: var(--hue-accent);
  }

  @keyframes pulse {
    0%, 100% { opacity: 0.2; }
    50% { opacity: 1; }
  }
</style>
