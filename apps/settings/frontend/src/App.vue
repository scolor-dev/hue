<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import type { SettingsSection } from './types'
import { defaultSettings } from './types'
import { fetchSettings, saveSettings } from './api'
import { translations } from './i18n'
import type { Lang } from './i18n'
import GeneralSettings from './components/GeneralSettings.vue'
import DisplaySettings from './components/DisplaySettings.vue'
import PreviewSettings from './components/PreviewSettings.vue'
import AboutSection from './components/AboutSection.vue'

const settings = ref({ ...defaultSettings })
const activeSection = ref<SettingsSection>('general')
const saved = ref(false)

const t = computed(() => translations[settings.value.language as Lang] ?? translations.ja)

onMounted(async () => {
  settings.value = await fetchSettings()
})

async function onChange() {
  await saveSettings(settings.value)
  saved.value = true
  setTimeout(() => { saved.value = false }, 1500)
}

const navSections: { id: SettingsSection; icon: string }[] = [
  { id: 'general', icon: '⚙' },
  { id: 'display', icon: '👁' },
  { id: 'preview', icon: '🖼' },
  { id: 'about',   icon: 'ℹ' },
]
</script>

<template>
  <div class="app">
    <nav class="sidebar">
      <div class="sidebar-title">{{ t.settings }}</div>
      <button
        v-for="item in navSections"
        :key="item.id"
        class="nav-item"
        :class="{ active: activeSection === item.id }"
        @click="activeSection = item.id"
      >
        <span class="nav-icon">{{ item.icon }}</span>
        {{ t.nav[item.id] }}
      </button>
    </nav>

    <main class="content">
      <div class="saved-toast" :class="{ visible: saved }">{{ t.saved }}</div>

      <GeneralSettings
        v-if="activeSection === 'general'"
        :settings="settings"
        :lang="settings.language"
        @change="onChange"
      />
      <DisplaySettings
        v-else-if="activeSection === 'display'"
        :settings="settings"
        :lang="settings.language"
        @change="onChange"
      />
      <PreviewSettings
        v-else-if="activeSection === 'preview'"
        :settings="settings"
        :lang="settings.language"
        @change="onChange"
      />
      <AboutSection v-else-if="activeSection === 'about'" :lang="settings.language" />
    </main>
  </div>
</template>

<style scoped>
.app {
  display: flex;
  height: 100vh;
  overflow: hidden;
}

/* ── Sidebar ── */
.sidebar {
  width: 180px;
  flex-shrink: 0;
  background: #252526;
  border-right: 1px solid #3c3c3c;
  display: flex;
  flex-direction: column;
  padding: 12px 0;
}

.sidebar-title {
  padding: 4px 16px 12px;
  font-size: 11px;
  font-weight: 600;
  color: #858585;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 16px;
  background: transparent;
  border: none;
  color: #cccccc;
  font-size: 13px;
  text-align: left;
  cursor: pointer;
  border-left: 2px solid transparent;
  transition: background 0.1s;
}
.nav-item:hover { background: #2a2d2e; }
.nav-item.active { background: #094771; border-left-color: #007acc; color: #ffffff; }

.nav-icon { font-size: 14px; width: 18px; text-align: center; }

/* ── Content ── */
.content {
  flex: 1;
  overflow-y: auto;
  padding: 24px 28px;
  position: relative;
}

.saved-toast {
  position: fixed;
  top: 12px;
  right: 16px;
  background: #007acc;
  color: white;
  padding: 5px 14px;
  border-radius: 4px;
  font-size: 12px;
  opacity: 0;
  transition: opacity 0.2s;
  pointer-events: none;
}
.saved-toast.visible { opacity: 1; }
</style>
