<script>
  import { RunCommandShortcut } from '../wailsjs/go/main/App'

  export let shortcuts = []
  export let currentPath = ''
  export let label = 'ショートカット'

  let promptingId = null
  let promptInputs = {}
  let runningId = null

  function parseFields(command) {
    const seen = new Set()
    const fields = []
    for (const m of (command || '').matchAll(/\{input(?::([^}]*))?\}/g)) {
      if (!seen.has(m[0])) {
        seen.add(m[0])
        fields.push({ key: m[0], label: m[1] || '' })
      }
    }
    return fields.length > 0 ? fields : [{ key: '{input}', label: '' }]
  }

  function handleClick(sc) {
    if (sc.promptEnabled) {
      if (promptingId === sc.id) {
        promptingId = null
        promptInputs = {}
      } else {
        promptingId = sc.id
        promptInputs = Object.fromEntries(parseFields(sc.command).map(f => [f.key, '']))
      }
    } else {
      run(sc)
    }
  }

  async function run(sc) {
    runningId = sc.id
    const fields = parseFields(sc.command)
    let extra
    if (fields.length === 1 && fields[0].key === '{input}') {
      extra = promptInputs['{input}'] || ''
    } else {
      extra = JSON.stringify(Object.fromEntries(fields.map(f => [f.key, promptInputs[f.key] || ''])))
    }
    promptingId = null
    promptInputs = {}
    try {
      await RunCommandShortcut(sc.id, currentPath, extra)
    } catch(e) {
      console.error(e)
    }
    runningId = null
  }

  function handleKey(e, sc, isLast) {
    if (e.key === 'Enter' && isLast) run(sc)
    if (e.key === 'Escape') { promptingId = null; promptInputs = {} }
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
          {@const fields = parseFields(sc.command)}
          <div class="sc-prompt">
            {#if sc.promptMessage}
              <div class="sc-prompt-msg">{sc.promptMessage}</div>
            {/if}
            {#each fields as field, i}
              {#if field.label}
                <div class="sc-field-label">{field.label}</div>
              {/if}
              <div class="sc-prompt-row" style={i < fields.length - 1 ? 'margin-bottom:4px' : ''}>
                <input
                  class="sc-input"
                  placeholder={field.label || sc.promptPlaceholder || ''}
                  bind:value={promptInputs[field.key]}
                  on:keydown={(e) => handleKey(e, sc, i === fields.length - 1)}
                  autofocus={i === 0}
                />
                {#if i === fields.length - 1}
                  <button class="sc-run-btn" on:click={() => run(sc)}>▶</button>
                {/if}
              </div>
            {/each}
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
    color: var(--hue-text-muted);
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
    background: var(--hue-bg-panel);
    border: 1px solid var(--hue-border);
    border-radius: 4px;
    color: var(--hue-text);
    font-size: 12px;
    cursor: pointer;
    text-align: left;
    transition: background 0.1s, border-color 0.1s;
  }

  .sc-btn:hover { background: var(--hue-accent-dim); border-color: var(--hue-accent); color: #fff; }
  .sc-btn.running { opacity: 0.6; cursor: wait; }

  .sc-icon { font-size: 13px; flex-shrink: 0; }
  .sc-label { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .sc-badge { font-size: 10px; flex-shrink: 0; opacity: 0.6; }

  .sc-prompt {
    margin-top: 4px;
    padding: 6px 4px;
    background: var(--hue-bg);
    border: 1px solid var(--hue-border);
    border-radius: 4px;
  }

  .sc-prompt-msg {
    font-size: 11px;
    color: var(--hue-text-muted);
    margin-bottom: 4px;
    padding: 0 2px;
  }

  .sc-field-label {
    font-size: 10px;
    color: var(--hue-text-muted);
    margin-bottom: 2px;
    padding: 0 2px;
  }

  .sc-prompt-row { display: flex; gap: 4px; }

  .sc-input {
    flex: 1;
    background: var(--hue-border);
    border: 1px solid #555;
    color: var(--hue-text);
    padding: 2px 6px;
    border-radius: 3px;
    font-size: 12px;
    font-family: 'Consolas', monospace;
    outline: none;
    min-width: 0;
  }

  .sc-input:focus { border-color: var(--hue-accent); }

  .sc-run-btn {
    background: var(--hue-accent);
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
    background: var(--hue-border);
    margin: 6px 8px;
  }
</style>
