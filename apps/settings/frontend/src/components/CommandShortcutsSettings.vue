<script setup lang="ts">
import { computed, ref } from 'vue'
import type { HueSettings, CommandShortcut } from '../types'
import { translations } from '../i18n'
import type { Lang } from '../i18n'

const props = defineProps<{ settings: HueSettings; lang: string }>()
const emit = defineEmits<{ change: [] }>()

const t = computed(() => translations[props.lang as Lang] ?? translations.ja)
const ts = computed(() => t.value.shortcuts)

type EditState = CommandShortcut & { isNew: boolean }

const editing = ref<EditState | null>(null)

function newShortcut(): EditState {
  return {
    isNew: true,
    id: Date.now().toString(36) + Math.random().toString(36).slice(2),
    label: '',
    icon: '⚡',
    command: '',
    executionMode: 'current',
    fixedPath: '',
    promptEnabled: false,
    promptMessage: '',
    promptPlaceholder: '',
  }
}

function startAdd() {
  editing.value = newShortcut()
}

function startEdit(sc: CommandShortcut) {
  editing.value = { ...sc, isNew: false }
}

function cancelEdit() {
  editing.value = null
}

function saveEdit() {
  if (!editing.value || !editing.value.label.trim()) return
  const sc = editing.value
  const list = [...(props.settings.commandShortcuts ?? [])]
  if (sc.isNew) {
    list.push({
      id: sc.id, label: sc.label.trim(), icon: sc.icon,
      command: sc.command, executionMode: sc.executionMode,
      fixedPath: sc.fixedPath, promptEnabled: sc.promptEnabled,
      promptMessage: sc.promptMessage, promptPlaceholder: sc.promptPlaceholder,
    })
  } else {
    const idx = list.findIndex(x => x.id === sc.id)
    if (idx >= 0) {
      list[idx] = {
        id: sc.id, label: sc.label.trim(), icon: sc.icon,
        command: sc.command, executionMode: sc.executionMode,
        fixedPath: sc.fixedPath, promptEnabled: sc.promptEnabled,
        promptMessage: sc.promptMessage, promptPlaceholder: sc.promptPlaceholder,
      }
    }
  }
  props.settings.commandShortcuts = list
  emit('change')
  editing.value = null
}

function deleteShortcut(id: string) {
  props.settings.commandShortcuts = (props.settings.commandShortcuts ?? []).filter(s => s.id !== id)
  emit('change')
}
</script>

<template>
  <section class="settings-section">
    <h2>{{ ts.title }}</h2>

    <!-- 一覧 -->
    <div class="sc-list">
      <div v-if="!settings.commandShortcuts?.length" class="sc-empty">{{ ts.empty }}</div>

      <div
        v-for="sc in settings.commandShortcuts"
        :key="sc.id"
        class="sc-row"
      >
        <span class="sc-icon">{{ sc.icon || '⚡' }}</span>
        <span class="sc-label">{{ sc.label }}</span>
        <span class="sc-mode-badge">{{ sc.executionMode === 'fixed' ? '📌' : '📂' }}</span>
        <div class="sc-actions">
          <button class="btn-small" @click="startEdit(sc)">{{ ts.edit }}</button>
          <button class="btn-small danger" @click="deleteShortcut(sc.id)">{{ ts.delete }}</button>
        </div>
      </div>
    </div>

    <button class="btn-add" @click="startAdd">{{ ts.add }}</button>

    <!-- 編集フォーム -->
    <div v-if="editing" class="sc-form">
      <div class="form-row">
        <label>{{ ts.iconField }}</label>
        <input v-model="editing.icon" class="input-icon" maxlength="2" />
        <label style="margin-left:12px">{{ ts.labelField }}</label>
        <input v-model="editing.label" class="input-label" :placeholder="ts.labelField" />
      </div>

      <div class="form-row col">
        <label>{{ ts.commandField }}</label>
        <span class="hint">{{ ts.commandHint }}</span>
        <textarea v-model="editing.command" class="input-command" rows="4" />
      </div>

      <div class="form-row">
        <label>{{ ts.executionMode }}</label>
        <label class="radio-label">
          <input type="radio" v-model="editing.executionMode" value="current" />
          {{ ts.modeCurrentDir }}
        </label>
        <label class="radio-label">
          <input type="radio" v-model="editing.executionMode" value="fixed" />
          {{ ts.modeFixed }}
        </label>
      </div>

      <div v-if="editing.executionMode === 'fixed'" class="form-row">
        <label>{{ ts.fixedPathLabel }}</label>
        <input v-model="editing.fixedPath" class="input-path" placeholder="C:\Users\..." />
      </div>

      <div class="form-row">
        <label class="checkbox-label">
          <input type="checkbox" v-model="editing.promptEnabled" />
          {{ ts.promptEnabled }}
        </label>
      </div>

      <template v-if="editing.promptEnabled">
        <div class="form-row">
          <label>{{ ts.promptMessage }}</label>
          <input v-model="editing.promptMessage" class="input-label" placeholder="リポジトリURLを入力" />
        </div>
        <div class="form-row">
          <label>{{ ts.promptPlaceholder }}</label>
          <input v-model="editing.promptPlaceholder" class="input-label" placeholder="https://github.com/..." />
        </div>
      </template>

      <div class="form-actions">
        <button class="btn-save" @click="saveEdit">{{ ts.save }}</button>
        <button class="btn-cancel" @click="cancelEdit">{{ ts.cancel }}</button>
      </div>
    </div>
  </section>
</template>

<style scoped>
h2 { font-size: 13px; font-weight: 600; color: #858585; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.05em; }

.sc-list { display: flex; flex-direction: column; gap: 4px; margin-bottom: 10px; }

.sc-empty { font-size: 12px; color: #555; font-style: italic; padding: 8px 0; }

.sc-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  background: #2d2d2d;
  border: 1px solid #3c3c3c;
  border-radius: 4px;
}
.sc-icon { font-size: 14px; flex-shrink: 0; }
.sc-label { flex: 1; font-size: 13px; color: #d4d4d4; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.sc-mode-badge { font-size: 12px; opacity: 0.5; flex-shrink: 0; }
.sc-actions { display: flex; gap: 4px; flex-shrink: 0; }

.btn-small {
  padding: 2px 8px; font-size: 11px;
  background: #3c3c3c; border: 1px solid #555; color: #d4d4d4;
  border-radius: 3px; cursor: pointer;
}
.btn-small:hover { background: #4a4a4a; }
.btn-small.danger:hover { background: #6b1c1c; color: #f48771; border-color: #6b1c1c; }

.btn-add {
  padding: 5px 14px; font-size: 12px;
  background: transparent; border: 1px dashed #555; color: #858585;
  border-radius: 4px; cursor: pointer; width: 100%;
  transition: all 0.15s;
}
.btn-add:hover { border-color: #007acc; color: #007acc; }

.sc-form {
  margin-top: 14px;
  padding: 14px;
  background: #252526;
  border: 1px solid #3c3c3c;
  border-radius: 6px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.form-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.form-row.col { flex-direction: column; align-items: flex-start; }

label { font-size: 12px; color: #858585; flex-shrink: 0; }
.hint { font-size: 11px; color: #555; }

.radio-label, .checkbox-label {
  display: flex; align-items: center; gap: 4px;
  font-size: 12px; color: #cccccc; cursor: pointer;
}

input[type="text"], .input-icon, .input-label, .input-path, .input-command {
  background: #3c3c3c; border: 1px solid #555; color: #d4d4d4;
  padding: 3px 8px; border-radius: 4px; font-size: 12px; outline: none;
}
input[type="text"]:focus, .input-icon:focus, .input-label:focus, .input-path:focus, .input-command:focus {
  border-color: #007acc;
}

.input-icon { width: 36px; text-align: center; }
.input-label { flex: 1; min-width: 140px; }
.input-path { flex: 1; min-width: 200px; font-family: 'Consolas', monospace; }
.input-command { width: 100%; font-family: 'Consolas', monospace; resize: vertical; }

textarea { background: #3c3c3c; border: 1px solid #555; color: #d4d4d4; border-radius: 4px; padding: 6px 8px; font-size: 12px; outline: none; }
textarea:focus { border-color: #007acc; }

.form-actions { display: flex; gap: 8px; margin-top: 4px; }

.btn-save {
  padding: 5px 16px; font-size: 12px;
  background: #007acc; border: none; color: white;
  border-radius: 4px; cursor: pointer;
}
.btn-save:hover { background: #005fa3; }

.btn-cancel {
  padding: 5px 14px; font-size: 12px;
  background: transparent; border: 1px solid #555; color: #858585;
  border-radius: 4px; cursor: pointer;
}
.btn-cancel:hover { background: #3c3c3c; }
</style>
