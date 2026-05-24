<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import type { HueSettings } from '../types'
import { translations } from '../i18n'
import type { Lang } from '../i18n'

interface PluginMeta {
  name: string
  displayName: string
  description: string
  enabled: boolean
  fileName: string
}

const props = defineProps<{ settings: HueSettings; lang: string }>()
const emit = defineEmits<{ change: [] }>()

const t = computed(() => translations[props.lang as Lang] ?? translations.ja)
const plugins = ref<PluginMeta[]>([])

onMounted(async () => {
  await loadPlugins()
})

async function loadPlugins() {
  try {
    const res = await fetch('/api/plugins')
    if (res.ok) plugins.value = await res.json()
  } catch {}
}

async function togglePlugin(plugin: PluginMeta) {
  const disabled = props.settings.disabledPlugins ?? []
  if (plugin.enabled) {
    props.settings.disabledPlugins = [...disabled, plugin.name]
  } else {
    props.settings.disabledPlugins = disabled.filter(n => n !== plugin.name)
  }
  plugin.enabled = !plugin.enabled
  emit('change')
}

async function deletePlugin(plugin: PluginMeta) {
  if (!confirm(t.value.plugins.deleteConfirm(plugin.displayName))) return
  try {
    const res = await fetch(`/api/plugins?name=${encodeURIComponent(plugin.name)}`, { method: 'DELETE' })
    if (res.ok) await loadPlugins()
  } catch {}
}
</script>

<template>
  <section class="settings-section">
    <h2>{{ t.plugins.title }}</h2>

    <div v-if="plugins.length === 0" class="empty">
      <p>{{ t.plugins.empty }}</p>
      <p class="empty-hint">{{ t.plugins.emptyHint }}</p>
    </div>

    <div v-else class="plugin-list">
      <div v-for="plugin in plugins" :key="plugin.name" class="plugin-row">
        <div class="plugin-info">
          <span class="plugin-name">{{ plugin.displayName }}</span>
          <span v-if="plugin.description" class="plugin-desc">{{ plugin.description }}</span>
          <span class="plugin-file">{{ plugin.fileName }}</span>
        </div>
        <div class="plugin-actions">
          <button
            class="toggle-btn"
            :class="{ enabled: plugin.enabled }"
            @click="togglePlugin(plugin)"
          >
            {{ plugin.enabled ? t.plugins.enabled : t.plugins.disabled }}
          </button>
          <button class="delete-btn" @click="deletePlugin(plugin)">✕</button>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
h2 { font-size: 13px; font-weight: 600; color: #858585; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.05em; }

.empty { padding: 24px 0; color: #858585; }
.empty p { margin: 0 0 6px; }
.empty-hint { font-size: 12px; font-family: 'Consolas', monospace; color: #555; }

.plugin-list { display: flex; flex-direction: column; gap: 1px; }

.plugin-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  background: #2d2d2d;
  border-radius: 4px;
  gap: 12px;
}
.plugin-row:hover { background: #333; }

.plugin-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.plugin-name { font-size: 13px; color: #d4d4d4; font-weight: 500; }
.plugin-desc { font-size: 12px; color: #858585; }
.plugin-file { font-size: 11px; color: #555; font-family: 'Consolas', monospace; }

.plugin-actions { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }

.toggle-btn {
  padding: 3px 10px;
  border-radius: 3px;
  border: 1px solid #555;
  background: #3c3c3c;
  color: #858585;
  font-size: 12px;
  cursor: pointer;
  min-width: 52px;
}
.toggle-btn.enabled { border-color: #007acc; background: #094771; color: #4fc3f7; }
.toggle-btn:hover { opacity: 0.8; }

.delete-btn {
  background: transparent;
  border: none;
  color: #555;
  font-size: 13px;
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 3px;
}
.delete-btn:hover { color: #f48771; background: #3c1c1c; }
</style>
