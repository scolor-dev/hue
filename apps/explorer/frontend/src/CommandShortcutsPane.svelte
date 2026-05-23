<script>
  import { RunCommandShortcut } from '../wailsjs/go/main/App'

  export let shortcuts = []
  export let currentPath = ''
  export let label = 'ショートカット'

  let promptingId = null
  let promptInput = ''
  let runningId = null

  function handleClick(sc) {
    if (sc.promptEnabled) {
      promptingId = promptingId === sc.id ? null : sc.id
      promptInput = ''
    } else {
      run(sc, '')
    }
  }

  async function run(sc, extra) {
    runningId = sc.id
    promptingId = null
    promptInput = ''
    try {
      await RunCommandShortcut(sc.id, currentPath, extra)
    } catch(e) {
      console.error(e)
    }
    runningId = null
  }

  function handlePromptKey(e, sc) {
    if (e.key === 'Enter') run(sc, promptInput)
    if (e.key === 'Escape') { promptingId = null; promptInput = '' }
    e.stopPropagation()
  }
</script>

{#if shortcuts.length > 0}
  <div class="sc-section">
    <div class="section-label">{label}</div>

    {#each shortcuts as sc (sc.id)}
      <div class="sc-item">
        <button
          class="sc-btn"
          class:running={runningId === sc.id}
          on:click={() => handleClick(sc)}
          title={sc.command}
        >
          {#if sc.icon}<span class="sc-icon">{sc.icon}</span>{/if}
          <span class="sc-label">{sc.label}</span>
          {#if sc.executionMode === 'fixed'}
            <span class="sc-badge" title={sc.fixedPath}>📌</span>
          {/if}
        </button>

        {#if promptingId === sc.id}
          <div class="sc-prompt">
            {#if sc.promptMessage}
              <div class="sc-prompt-msg">{sc.promptMessage}</div>
            {/if}
            <div class="sc-prompt-row">
              <input
                class="sc-input"
                placeholder={sc.promptPlaceholder || ''}
                bind:value={promptInput}
                on:keydown={(e) => handlePromptKey(e, sc)}
                autofocus
              />
              <button class="sc-run-btn" on:click={() => run(sc, promptInput)}>▶</button>
            </div>
          </div>
        {/if}
      </div>
    {/each}

    <div class="section-sep"></div>
  </div>
{/if}

<style>
  .sc-section { display: flex; flex-direction: column; }

  .section-label {
    font-size: 11px;
    font-weight: 600;
    color: #858585;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    padding: 8px 12px 4px;
    user-select: none;
  }

  .sc-item { display: flex; flex-direction: column; margin: 1px 4px; }

  .sc-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    width: 100%;
    height: 26px;
    padding: 0 8px;
    background: #2d2d2d;
    border: 1px solid #3c3c3c;
    border-radius: 4px;
    color: #cccccc;
    font-size: 12px;
    cursor: pointer;
    text-align: left;
    transition: background 0.1s, border-color 0.1s;
  }

  .sc-btn:hover { background: #094771; border-color: #007acc; color: #fff; }
  .sc-btn.running { opacity: 0.6; cursor: wait; }

  .sc-icon { font-size: 13px; flex-shrink: 0; }
  .sc-label { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .sc-badge { font-size: 10px; flex-shrink: 0; opacity: 0.6; }

  .sc-prompt {
    margin-top: 4px;
    padding: 6px 4px;
    background: #1e1e1e;
    border: 1px solid #3c3c3c;
    border-radius: 4px;
  }

  .sc-prompt-msg {
    font-size: 11px;
    color: #858585;
    margin-bottom: 4px;
    padding: 0 2px;
  }

  .sc-prompt-row { display: flex; gap: 4px; }

  .sc-input {
    flex: 1;
    background: #3c3c3c;
    border: 1px solid #555;
    color: #d4d4d4;
    padding: 2px 6px;
    border-radius: 3px;
    font-size: 12px;
    font-family: 'Consolas', monospace;
    outline: none;
    min-width: 0;
  }

  .sc-input:focus { border-color: #007acc; }

  .sc-run-btn {
    background: #007acc;
    border: none;
    color: white;
    padding: 0 8px;
    border-radius: 3px;
    cursor: pointer;
    font-size: 11px;
    flex-shrink: 0;
  }

  .sc-run-btn:hover { background: #005fa3; }

  .section-sep {
    height: 1px;
    background: #3c3c3c;
    margin: 6px 8px;
  }
</style>
