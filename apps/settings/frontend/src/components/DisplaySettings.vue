<script setup lang="ts">
import { computed } from 'vue'
import type { HueSettings } from '../types'
import { translations } from '../i18n'
import type { Lang } from '../i18n'
import SettingRow from './SettingRow.vue'
import ToggleSwitch from './ToggleSwitch.vue'

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
    <h2>{{ t.display.title }}</h2>

    <SettingRow :label="t.display.dateFormat" :description="t.display.dateFormatDesc">
      <select
        :value="settings.dateFormat"
        @change="update('dateFormat', ($event.target as HTMLSelectElement).value as HueSettings['dateFormat'])"
      >
        <option value="datetime">{{ t.display.dateTime }}</option>
        <option value="date">{{ t.display.dateOnly }}</option>
        <option value="relative">{{ t.display.relative }}</option>
      </select>
    </SettingRow>

    <SettingRow :label="t.display.showExtensions" :description="t.display.showExtensionsDesc">
      <ToggleSwitch
        :model-value="settings.showExtensions"
        @update:model-value="update('showExtensions', $event)"
      />
    </SettingRow>

    <SettingRow :label="t.display.sortBy" :description="t.display.sortByDesc">
      <select
        :value="settings.sortBy"
        @change="update('sortBy', ($event.target as HTMLSelectElement).value as HueSettings['sortBy'])"
      >
        <option value="name">{{ t.display.sortName }}</option>
        <option value="size">{{ t.display.sortSize }}</option>
        <option value="date">{{ t.display.sortDate }}</option>
      </select>
    </SettingRow>

    <SettingRow :label="t.display.sortAsc" :description="t.display.sortAscDesc">
      <ToggleSwitch
        :model-value="settings.sortAsc"
        @update:model-value="update('sortAsc', $event)"
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
</style>
