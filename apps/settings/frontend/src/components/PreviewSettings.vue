<script setup lang="ts">
import { computed } from 'vue'
import type { HueSettings } from '../types'
import { translations } from '../i18n'
import type { Lang } from '../i18n'
import SettingRow from './SettingRow.vue'

const props = defineProps<{ settings: HueSettings; lang: string }>()
const emit = defineEmits<{ change: [] }>()

const t = computed(() => translations[props.lang as Lang] ?? translations.ja)

function update<K extends keyof HueSettings>(key: K, value: HueSettings[K]) {
  props.settings[key] = value
  emit('change')
}
</script>

<template>
  <section class="settings-section">
    <h2>{{ t.preview.title }}</h2>

    <SettingRow
      :label="t.preview.panelWidth"
      :description="`${settings.previewWidth}px`"
    >
      <input
        type="range"
        min="160"
        max="600"
        step="10"
        :value="settings.previewWidth"
        @input="update('previewWidth', Number(($event.target as HTMLInputElement).value))"
        @change="emit('change')"
      />
    </SettingRow>

    <SettingRow
      :label="t.preview.thumbSize"
      :description="`${settings.thumbSize}px`"
    >
      <input
        type="range"
        min="64"
        max="256"
        step="32"
        :value="settings.thumbSize"
        @input="update('thumbSize', Number(($event.target as HTMLInputElement).value))"
        @change="emit('change')"
      />
    </SettingRow>
  </section>
</template>

<style scoped>
h2 { font-size: 13px; font-weight: 600; color: #858585; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.05em; }

input[type="range"] {
  width: 140px;
  accent-color: #007acc;
}
</style>
