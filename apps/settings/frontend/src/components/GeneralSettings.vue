<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import type { HueSettings } from '../types'
import { translations } from '../i18n'
import type { Lang } from '../i18n'
import SettingRow from './SettingRow.vue'
import ToggleSwitch from './ToggleSwitch.vue'

const props = defineProps<{ settings: HueSettings; lang: string }>()
const emit = defineEmits<{ change: [] }>()

const t = computed(() => translations[props.lang as Lang] ?? translations.ja)

const languages = ref([
  { value: 'ja', label: '日本語' },
  { value: 'en', label: 'English' },
])

onMounted(async () => {
  try {
    const res = await fetch('/api/languages')
    if (res.ok) languages.value = await res.json()
  } catch {}
})

function update<K extends keyof HueSettings>(key: K, value: HueSettings[K]) {
  props.settings[key] = value
  emit('change')
}
</script>

<template>
  <section class="settings-section">
    <h2>{{ t.general.title }}</h2>

    <SettingRow :label="t.general.language" :description="t.general.languageDesc">
      <select
        :value="settings.language"
        @change="update('language', ($event.target as HTMLSelectElement).value)"
      >
        <option v-for="lang in languages" :key="lang.value" :value="lang.value">
          {{ lang.label }}
        </option>
      </select>
    </SettingRow>

    <SettingRow :label="t.general.startupMode" :description="t.general.startupModeDesc">
      <select :value="settings.startupMode" @change="update('startupMode', ($event.target as HTMLSelectElement).value as HueSettings['startupMode'])">
        <option value="home">{{ t.general.startupHome }}</option>
        <option value="last">{{ t.general.startupLast }}</option>
        <option value="fixed">{{ t.general.startupFixed }}</option>
      </select>
    </SettingRow>

    <SettingRow v-if="settings.startupMode === 'fixed'" :label="t.general.startupFixedPath" description="">
      <input
        type="text"
        :value="settings.startupFixedPath"
        @change="update('startupFixedPath', ($event.target as HTMLInputElement).value)"
        placeholder="C:\Users\..."
        class="path-input"
      />
    </SettingRow>

    <SettingRow :label="t.general.clickToOpen" :description="t.general.clickToOpenDesc">
      <select :value="settings.clickToOpen" @change="update('clickToOpen', ($event.target as HTMLSelectElement).value as HueSettings['clickToOpen'])">
        <option value="double">{{ t.general.clickDouble }}</option>
        <option value="single">{{ t.general.clickSingle }}</option>
      </select>
    </SettingRow>

    <SettingRow :label="t.general.confirmDelete" :description="t.general.confirmDeleteDesc">
      <ToggleSwitch
        :model-value="settings.confirmDelete"
        @update:model-value="update('confirmDelete', $event)"
      />
    </SettingRow>

    <SettingRow :label="t.general.showHidden" :description="t.general.showHiddenDesc">
      <ToggleSwitch
        :model-value="settings.showHidden"
        @update:model-value="update('showHidden', $event)"
      />
    </SettingRow>
  </section>
</template>

<style scoped>
h2 { font-size: 13px; font-weight: 600; color: #858585; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.05em; }
select {
  background: #3c3c3c;
  border: 1px solid #555;
  color: #d4d4d4;
  padding: 3px 8px;
  border-radius: 4px;
}
.path-input {
  background: #3c3c3c;
  border: 1px solid #555;
  color: #d4d4d4;
  padding: 3px 8px;
  border-radius: 4px;
  font-family: 'Consolas', monospace;
  font-size: 12px;
  width: 240px;
}
.path-input:focus { outline: none; border-color: #007acc; }
</style>
