<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { translations } from '../i18n'
import type { Lang } from '../i18n'

interface ShortcutMeta {
  key: string
  label: string
  description: string
  source: 'builtin' | 'plugin'
}

const props = defineProps<{ lang: string }>()
const t = computed(() => translations[props.lang as Lang] ?? translations.ja)

const shortcuts = ref<ShortcutMeta[]>([])

onMounted(async () => {
  try {
    const res = await fetch('/api/shortcuts')
    if (res.ok) shortcuts.value = await res.json()
  } catch {}
})

const builtin = computed(() => shortcuts.value.filter(s => s.source === 'builtin'))
const plugin  = computed(() => shortcuts.value.filter(s => s.source === 'plugin'))
</script>

<template>
  <section class="settings-section">
    <h2>{{ t.keymap.title }}</h2>

    <div class="group">
      <div class="group-label">{{ t.keymap.builtin }}</div>
      <table class="keymap-table">
        <thead>
          <tr>
            <th class="col-key">{{ t.keymap.key }}</th>
            <th>{{ t.keymap.action }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="sc in builtin" :key="sc.key">
            <td class="col-key"><kbd>{{ sc.key }}</kbd></td>
            <td>{{ sc.label }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="group">
      <div class="group-label">{{ t.keymap.plugin }}</div>
      <div v-if="plugin.length === 0" class="empty">{{ t.keymap.noPlugin }}</div>
      <table v-else class="keymap-table">
        <thead>
          <tr>
            <th class="col-key">{{ t.keymap.key }}</th>
            <th>{{ t.keymap.action }}</th>
            <th>{{ t.keymap.description }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="sc in plugin" :key="sc.key">
            <td class="col-key"><kbd>{{ sc.key }}</kbd></td>
            <td>{{ sc.label }}</td>
            <td class="col-desc">{{ sc.description }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>

<style scoped>
h2 { font-size: 13px; font-weight: 600; color: #858585; margin-bottom: 16px; text-transform: uppercase; letter-spacing: 0.05em; }

.group { margin-bottom: 24px; }

.group-label {
  font-size: 11px;
  font-weight: 600;
  color: #858585;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin-bottom: 8px;
  padding-bottom: 4px;
  border-bottom: 1px solid #3c3c3c;
}

.keymap-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.keymap-table th {
  text-align: left;
  padding: 5px 10px;
  color: #858585;
  font-size: 11px;
  font-weight: 500;
}

.keymap-table td {
  padding: 5px 10px;
  color: #d4d4d4;
  border-top: 1px solid #2d2d2d;
}

.keymap-table tr:hover td { background: #2a2d2e; }

.col-key { width: 160px; }
.col-desc { color: #858585; font-size: 12px; }

kbd {
  display: inline-block;
  padding: 1px 6px;
  background: #3c3c3c;
  border: 1px solid #555;
  border-radius: 3px;
  font-family: 'Consolas', monospace;
  font-size: 12px;
  color: #d4d4d4;
  white-space: nowrap;
}

.empty { color: #555; font-size: 12px; padding: 8px 0; }
</style>
