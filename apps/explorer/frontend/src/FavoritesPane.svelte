<script>
  export let favorites = []
  export let currentPath = ''
  export let onNavigate
  export let onRemove
  export let label = 'お気に入り'
  export let removeLabel = 'お気に入りから削除'

  let ctxVisible = false
  let ctxPath = ''
  let ctxX = 0
  let ctxY = 0

  function showCtx(e, path) {
    e.preventDefault()
    e.stopPropagation()
    ctxVisible = true
    ctxPath = path
    ctxX = e.clientX
    ctxY = e.clientY
  }

  function closeCtx() {
    ctxVisible = false
  }

  function getName(path) {
    const trimmed = path.replace(/[\\/]+$/, '')
    const parts = trimmed.split(/[\\/]/)
    return parts[parts.length - 1] || path
  }

  function isDrive(path) {
    return /^[A-Z]:\\?$/i.test(path)
  }

  function isSelected(path) {
    return currentPath.toLowerCase() === path.toLowerCase()
  }
</script>

{#if favorites.length > 0}
  <div class="fav-section">
    <div class="section-label">{label}</div>

    {#each favorites as fav (fav)}
      <div
        class="fav-row"
        class:selected={isSelected(fav)}
        on:click={() => onNavigate(fav)}
        on:contextmenu={(e) => showCtx(e, fav)}
        on:keydown={(e) => {
          if (e.key === 'Enter') onNavigate(fav)
          if (e.key === 'Delete') onRemove(fav)
        }}
        role="row"
        tabindex="0"
        title={fav}
      >
        <span class="fav-icon">{isDrive(fav) ? '💾' : '⭐'}</span>
        <span class="fav-name">{getName(fav)}</span>
      </div>
    {/each}

    <div class="section-sep"></div>
  </div>
{/if}

{#if ctxVisible}
  <div
    class="fav-ctx-menu"
    style="left:{ctxX}px; top:{ctxY}px"
    role="menu"
  >
    <button role="menuitem" on:click={() => { onNavigate(ctxPath); closeCtx() }}>
      開く
    </button>
    <hr />
    <button
      class="danger"
      role="menuitem"
      on:click={() => { onRemove(ctxPath); closeCtx() }}
    >
      {removeLabel}
    </button>
  </div>
{/if}

<svelte:window on:click={closeCtx} on:contextmenu={closeCtx} />

<style>
  .fav-section {
    display: flex;
    flex-direction: column;
  }

  .section-label {
    font-size: 11px;
    font-weight: 600;
    color: var(--hue-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    padding: 8px 12px 4px;
    user-select: none;
  }

  .fav-row {
    display: flex;
    align-items: center;
    gap: 6px;
    height: 24px;
    padding: 0 8px 0 10px;
    cursor: pointer;
    user-select: none;
    border-radius: 3px;
    margin: 0 3px;
    outline: none;
  }

  .fav-row:hover { background: rgba(255,255,255,0.05); }
  .fav-row:focus-visible { outline: 1px solid var(--hue-accent); outline-offset: -1px; }
  .fav-row.selected { background: var(--hue-accent-dim); }

  .fav-icon { font-size: 13px; flex-shrink: 0; }

  .fav-name {
    font-size: 12px;
    color: var(--hue-text);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    flex: 1;
  }

  .fav-row.selected .fav-name { color: #ffffff; }

  .section-sep {
    height: 1px;
    background: var(--hue-border);
    margin: 6px 8px;
  }

  .fav-ctx-menu {
    position: fixed;
    background: var(--hue-bg-panel);
    border: 1px solid #454545;
    border-radius: 4px;
    padding: 4px 0;
    min-width: 160px;
    z-index: 2000;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
  }

  .fav-ctx-menu button {
    display: block;
    width: 100%;
    padding: 5px 16px;
    background: transparent;
    border: none;
    color: var(--hue-text);
    font-size: 13px;
    cursor: pointer;
    text-align: left;
  }

  .fav-ctx-menu button:hover { background: var(--hue-accent-dim); }
  .fav-ctx-menu button.danger:hover { background: #6b1c1c; color: #f48771; }

  .fav-ctx-menu hr {
    border: none;
    border-top: 1px solid var(--hue-border);
    margin: 3px 0;
  }
</style>
