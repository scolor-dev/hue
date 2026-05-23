<script setup lang="ts">
defineProps<{ modelValue: boolean; disabled?: boolean }>()
defineEmits<{ 'update:modelValue': [value: boolean] }>()
</script>

<template>
  <button
    class="toggle"
    :class="{ on: modelValue, disabled }"
    :disabled="disabled"
    @click="$emit('update:modelValue', !modelValue)"
    role="switch"
    :aria-checked="modelValue"
  >
    <span class="knob" />
  </button>
</template>

<style scoped>
.toggle {
  width: 36px;
  height: 20px;
  border-radius: 10px;
  border: none;
  background: #555;
  position: relative;
  transition: background 0.2s;
  flex-shrink: 0;
}
.toggle.on { background: #007acc; }
.toggle.disabled { opacity: 0.4; cursor: not-allowed; }

.knob {
  position: absolute;
  top: 3px;
  left: 3px;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: white;
  transition: transform 0.2s;
}
.toggle.on .knob { transform: translateX(16px); }
</style>
