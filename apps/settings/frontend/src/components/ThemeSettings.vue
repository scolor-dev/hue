<script setup lang="ts">
import type { HueSettings } from '../types'
import type { Lang } from '../i18n'
import { translations } from '../i18n'
import { computed } from 'vue'

const props = defineProps<{ settings: HueSettings; lang: string }>()
const emit = defineEmits<{ (e: 'change'): void }>()

const t = computed(() => (translations[props.lang as Lang] ?? translations.ja).theme)

interface Preset {
  id: string
  bg: string
  panel: string
  accent: string
  accentDim: string
  text: string
  textMuted: string
  border: string
}

const presets: Preset[] = [
  { id: 'dark',     bg: '#1e1e1e', panel: '#252526', accent: '#007acc', accentDim: '#094771', text: '#cccccc', textMuted: '#858585', border: '#3c3c3c' },
  { id: 'darker',   bg: '#141414', panel: '#1a1a1a', accent: '#0098ff', accentDim: '#003d66', text: '#d4d4d4', textMuted: '#6a6a6a', border: '#2d2d2d' },
  { id: 'midnight', bg: '#0d1117', panel: '#161b22', accent: '#58a6ff', accentDim: '#1f3a5f', text: '#c9d1d9', textMuted: '#6e7681', border: '#30363d' },
  { id: 'forest',   bg: '#1a1f1a', panel: '#212821', accent: '#4ec94e', accentDim: '#1a3b1a', text: '#c8d5c8', textMuted: '#6a7a6a', border: '#2e3f2e' },
  { id: 'sunset',   bg: '#1f1a1a', panel: '#281f1f', accent: '#ff6b35', accentDim: '#4d1f0d', text: '#d5c8c8', textMuted: '#7a6a6a', border: '#3f2e2e' },
  { id: 'ocean',    bg: '#0f1b2d', panel: '#152238', accent: '#00b4d8', accentDim: '#003d52', text: '#caf0f8', textMuted: '#5a8a9a', border: '#1e3a5f' },
]

function activeAccent(preset: Preset): string {
  return props.settings.themePreset === preset.id && props.settings.accentColor
    ? props.settings.accentColor
    : preset.accent
}

function selectPreset(id: string) {
  props.settings.themePreset = id
  emit('change')
}

function onAccentChange() {
  emit('change')
}

function resetAccent() {
  props.settings.accentColor = ''
  emit('change')
}
</script>

<template>
  <div class="section">
    <h2 class="section-title">{{ t.title }}</h2>

    <!-- Preset cards -->
    <div class="setting-row">
      <div class="setting-label">
        <span>{{ t.preset }}</span>
        <span class="setting-desc">{{ t.presetDesc }}</span>
      </div>
      <div class="preset-grid">
        <button
          v-for="preset in presets"
          :key="preset.id"
          class="preset-card"
          :class="{ active: settings.themePreset === preset.id }"
          :style="{ background: preset.bg, borderColor: settings.themePreset === preset.id ? activeAccent(preset) : preset.border }"
          @click="selectPreset(preset.id)"
        >
          <!-- mini preview -->
          <div class="card-preview" :style="{ background: preset.bg }">
            <div class="card-sidebar" :style="{ background: preset.panel, borderColor: preset.border }">
              <div class="card-dot" :style="{ background: activeAccent(preset) }" />
              <div class="card-line" :style="{ background: preset.textMuted }" />
              <div class="card-line short" :style="{ background: preset.textMuted }" />
            </div>
            <div class="card-content" :style="{ background: preset.bg }">
              <div class="card-row" :style="{ background: preset.accentDim }">
                <div class="card-file" :style="{ background: preset.text }" />
                <div class="card-file sm" :style="{ background: preset.textMuted }" />
              </div>
              <div class="card-row">
                <div class="card-file" :style="{ background: preset.text }" />
                <div class="card-file sm" :style="{ background: preset.textMuted }" />
              </div>
            </div>
          </div>
          <span class="card-label" :style="{ color: preset.text }">{{ t.presets[preset.id] }}</span>
        </button>
      </div>
    </div>

    <!-- Accent color override -->
    <div class="setting-row">
      <div class="setting-label">
        <span>{{ t.accentColor }}</span>
        <span class="setting-desc">{{ t.accentColorDesc }}</span>
      </div>
      <div class="accent-row">
        <input
          type="color"
          class="color-input"
          :value="settings.accentColor || (presets.find(p => p.id === settings.themePreset)?.accent ?? '#007acc')"
          @input="(e) => { settings.accentColor = (e.target as HTMLInputElement).value; onAccentChange() }"
        />
        <span class="accent-hex">{{ settings.accentColor || '(プリセット既定)' }}</span>
        <button v-if="settings.accentColor" class="reset-btn" @click="resetAccent">{{ t.accentReset }}</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.section { max-width: 680px; }
.section-title { font-size: 16px; font-weight: 600; margin: 0 0 20px; color: #cccccc; }

.setting-row {
  display: flex;
  gap: 16px;
  align-items: flex-start;
  padding: 14px 0;
  border-bottom: 1px solid #2d2d2d;
}
.setting-label { width: 180px; flex-shrink: 0; padding-top: 2px; }
.setting-label > span:first-child { display: block; font-size: 13px; color: #cccccc; }
.setting-desc { display: block; font-size: 11px; color: #858585; margin-top: 2px; }

/* Preset grid */
.preset-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  flex: 1;
}

.preset-card {
  border: 2px solid transparent;
  border-radius: 8px;
  padding: 0;
  cursor: pointer;
  overflow: hidden;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.preset-card:hover { box-shadow: 0 0 0 1px #555; }
.preset-card.active { box-shadow: 0 0 0 2px rgba(255,255,255,0.15); }

.card-preview {
  display: flex;
  height: 64px;
  overflow: hidden;
}
.card-sidebar {
  width: 28px;
  border-right: 1px solid;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 6px 5px;
}
.card-dot { width: 8px; height: 8px; border-radius: 50%; }
.card-line { width: 14px; height: 3px; border-radius: 2px; }
.card-line.short { width: 10px; }

.card-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 1px;
  padding: 4px;
}
.card-row {
  display: flex;
  gap: 4px;
  align-items: center;
  padding: 4px 4px;
  border-radius: 2px;
}
.card-file { height: 3px; flex: 1; border-radius: 1px; }
.card-file.sm { width: 20px; flex: none; }

.card-label {
  display: block;
  font-size: 11px;
  padding: 5px 0 4px;
  text-align: center;
}

/* Accent color */
.accent-row { display: flex; align-items: center; gap: 10px; padding-top: 2px; }
.color-input {
  width: 40px; height: 28px;
  border: none; border-radius: 4px;
  cursor: pointer; padding: 2px;
  background: #3c3c3c;
}
.accent-hex { font-size: 12px; color: #858585; font-family: monospace; }
.reset-btn {
  font-size: 11px; padding: 3px 8px;
  background: #3c3c3c; border: 1px solid #555;
  border-radius: 4px; color: #cccccc; cursor: pointer;
}
.reset-btn:hover { background: #4a4a4a; }
</style>
