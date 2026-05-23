<script setup lang="ts">
defineProps<{
  label: string
  description?: string
}>()
</script>

<template>
  <div class="setting-row">
    <div class="setting-label">
      <span class="label">{{ label }}</span>
      <span v-if="description" class="desc">{{ description }}</span>
    </div>
    <div class="setting-control">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.setting-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 0;
  border-bottom: 1px solid #2d2d2d;
  gap: 16px;
}
.setting-row:last-child { border-bottom: none; }

.setting-label {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
}
.label { color: #d4d4d4; }
.desc { font-size: 11px; color: #858585; }

.setting-control {
  display: flex;
  align-items: center;
  flex-shrink: 0;
}
</style>
