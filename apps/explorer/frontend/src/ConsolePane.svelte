<script>
  import { afterUpdate, tick } from 'svelte'

  export let lines = []
  export let running = false
  export let label = ''
  export let cwd = ''
  export let onClose = () => {}
  export let onClear = () => {}
  export let onRun = (_cmd) => {}   // インタラクティブコマンド実行コールバック

  let container
  let inputEl
  let inputVal = ''
  let history = []
  let histIdx = -1
  let panelHeight = 200
  let isResizing = false

  afterUpdate(() => {
    if (container) container.scrollTop = container.scrollHeight
  })

  function shortCwd(p) {
    if (!p) return ''
    // 長いパスは末尾2セグメントだけ表示
    const parts = p.replace(/\\/g, '/').split('/').filter(Boolean)
    if (parts.length <= 2) return p
    return '…\\' + parts.slice(-2).join('\\')
  }

  function handleKeydown(e) {
    if (e.key === 'Enter') {
      const cmd = inputVal.trim()
      if (!cmd) return
      history = [cmd, ...history.slice(0, 49)]
      histIdx = -1
      onRun(cmd)
      inputVal = ''
      e.preventDefault()
    } else if (e.key === 'ArrowUp') {
      histIdx = Math.min(histIdx + 1, history.length - 1)
      inputVal = history[histIdx] ?? ''
      e.preventDefault()
      tick().then(() => { inputEl?.setSelectionRange(inputVal.length, inputVal.length) })
    } else if (e.key === 'ArrowDown') {
      histIdx = Math.max(histIdx - 1, -1)
      inputVal = histIdx >= 0 ? history[histIdx] : ''
      e.preventDefault()
    }
    e.stopPropagation()
  }

  function startResize(e) {
    isResizing = true
    const startY = e.clientY
    const startH = panelHeight
    e.preventDefault()
    function onMove(e) {
      panelHeight = Math.max(80, Math.min(600, startH + (startY - e.clientY)))
    }
    function onUp() {
      isResizing = false
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      document.body.classList.remove('resizing')
    }
    document.body.classList.add('resizing')
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }
</script>

<div class="console-wrap" style="height:{panelHeight}px">
  <div
    class="resize-handle"
    class:active={isResizing}
    on:mousedown={startResize}
    on:keydown={() => {}}
    role="separator"
    aria-orientation="horizontal"
    tabindex="-1"
  ></div>

  <div class="console-header">
    <span class="console-title">
      {#if running}<span class="spin">⟳</span>{/if}
      {label || 'コンソール'}
    </span>
    <div class="header-actions">
      <button on:click={onClear} title="クリア">⬜</button>
      <button on:click={onClose} title="閉じる">✕</button>
    </div>
  </div>

  <div class="console-output" bind:this={container}>
    {#each lines as line (line.id)}
      <div class="line {line.type}">{line.text}</div>
    {/each}
    {#if running && lines.length === 0}
      <div class="line system">実行中...</div>
    {/if}
  </div>

  <!-- 入力バー -->
  <div class="console-input-bar">
    <span class="prompt-cwd">{shortCwd(cwd)}</span>
    <span class="prompt-sym">$</span>
    <input
      bind:this={inputEl}
      bind:value={inputVal}
      class="prompt-input"
      placeholder="コマンドを入力..."
      disabled={running}
      on:keydown={handleKeydown}
      spellcheck="false"
      autocomplete="off"
    />
  </div>
</div>

<style>
  .console-wrap {
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    background: #1e1e1e;
    border-top: 1px solid #3c3c3c;
    position: relative;
    min-height: 80px;
  }

  .resize-handle {
    position: absolute;
    top: -2px;
    left: 0;
    right: 0;
    height: 5px;
    cursor: row-resize;
    z-index: 10;
  }
  .resize-handle:hover,
  .resize-handle.active { background: #007acc; }

  .console-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 3px 10px;
    background: #252526;
    border-bottom: 1px solid #3c3c3c;
    flex-shrink: 0;
    height: 28px;
  }

  .console-title {
    font-size: 12px;
    color: #cccccc;
    font-weight: 500;
    display: flex;
    align-items: center;
    gap: 5px;
  }

  .spin {
    display: inline-block;
    animation: spin 1s linear infinite;
    color: #007acc;
  }
  @keyframes spin { to { transform: rotate(360deg); } }

  .header-actions { display: flex; gap: 2px; }
  .header-actions button {
    background: transparent;
    border: none;
    color: #858585;
    cursor: pointer;
    font-size: 12px;
    padding: 2px 5px;
    border-radius: 3px;
    line-height: 1;
  }
  .header-actions button:hover { background: #3c3c3c; color: #d4d4d4; }

  .console-output {
    flex: 1;
    overflow-y: auto;
    padding: 5px 12px 4px;
    font-family: 'Consolas', 'Courier New', monospace;
    font-size: 12px;
    line-height: 1.6;
  }

  .line { white-space: pre-wrap; word-break: break-all; }
  .line.stdout  { color: #d4d4d4; }
  .line.stderr  { color: #f48771; }
  .line.system  { color: #858585; font-style: italic; }
  .line.done-ok  { color: #4ec9b0; }
  .line.done-err { color: #f48771; font-weight: 600; }

  /* 入力バー */
  .console-input-bar {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 4px 8px;
    background: #252526;
    border-top: 1px solid #3c3c3c;
    flex-shrink: 0;
  }

  .prompt-cwd {
    font-size: 11px;
    font-family: 'Consolas', monospace;
    color: #4ec9b0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 180px;
    flex-shrink: 0;
  }

  .prompt-sym {
    font-size: 13px;
    font-family: 'Consolas', monospace;
    color: #569cd6;
    flex-shrink: 0;
  }

  .prompt-input {
    flex: 1;
    background: transparent;
    border: none;
    color: #d4d4d4;
    font-family: 'Consolas', 'Courier New', monospace;
    font-size: 12px;
    outline: none;
    min-width: 0;
  }
  .prompt-input::placeholder { color: #555; }
  .prompt-input:disabled { opacity: 0.4; cursor: not-allowed; }

  .console-output::-webkit-scrollbar { width: 6px; }
  .console-output::-webkit-scrollbar-track { background: transparent; }
  .console-output::-webkit-scrollbar-thumb { background: #424242; border-radius: 3px; }
</style>
