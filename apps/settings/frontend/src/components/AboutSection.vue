<script setup lang="ts">
import { computed } from 'vue'
import { translations } from '../i18n'
import type { Lang } from '../i18n'

const props = defineProps<{ lang: string }>()

const t = computed(() => translations[props.lang as Lang] ?? translations.ja)

const version = '0.1.0'
const stack = [
  { lang: 'Svelte',     color: '#ff3e00', role: 'メイン UI' },
  { lang: 'Zig',        color: '#f7a41d', role: 'ネイティブコア' },
  { lang: 'JavaScript', color: '#f1e05a', role: 'プラグイン' },
  { lang: 'Vue',        color: '#41b883', role: '設定 UI' },
  { lang: 'Go',         color: '#00add8', role: 'バックエンド' },
  { lang: 'TypeScript', color: '#3178c6', role: 'フロントエンド型' },
  { lang: 'Elixir',     color: '#6e4a7e', role: 'リアルタイム同期' },
]
</script>

<template>
  <section class="settings-section">
    <h2>{{ t.about.title }}</h2>

    <div class="about-header">
      <div class="app-name">Hue</div>
      <div class="app-version">v{{ version }}</div>
      <div class="app-desc">{{ t.about.appDesc }}</div>
    </div>

    <div class="stack-title">{{ t.about.stack }}</div>
    <div class="stack-list">
      <div v-for="item in stack" :key="item.lang" class="stack-item">
        <span class="lang-dot" :style="{ background: item.color }" />
        <span class="lang-name">{{ item.lang }}</span>
        <span class="lang-role">{{ t.about.roles[item.role] ?? item.role }}</span>
      </div>
    </div>
  </section>
</template>

<style scoped>
h2 { font-size: 13px; font-weight: 600; color: #858585; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.05em; }

.about-header {
  padding: 16px 0;
  border-bottom: 1px solid #2d2d2d;
  margin-bottom: 16px;
}
.app-name { font-size: 22px; font-weight: 700; color: #d4d4d4; }
.app-version { font-size: 12px; color: #858585; margin-top: 2px; }
.app-desc { font-size: 12px; color: #858585; margin-top: 6px; }

.stack-title { font-size: 12px; color: #858585; margin-bottom: 8px; }

.stack-list { display: flex; flex-direction: column; gap: 8px; }

.stack-item { display: flex; align-items: center; gap: 8px; }
.lang-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
.lang-name { color: #d4d4d4; min-width: 100px; }
.lang-role { color: #858585; font-size: 12px; }
</style>
