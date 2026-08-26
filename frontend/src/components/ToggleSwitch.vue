<script setup>
defineProps({
  modelValue: Boolean,
  label: String,
})
const emit = defineEmits(['update:modelValue'])
</script>

<template>
  <button
    type="button"
    class="toggle-switch"
    role="switch"
    :aria-checked="modelValue"
    :aria-label="label"
    @click="emit('update:modelValue', !modelValue)"
  >
    <span class="toggle-switch-knob"></span>
  </button>
</template>
<style scoped>
.toggle-switch {
  position: relative;
  display: inline-flex;
  align-items: center;
  width: 36px;
  height: 20px;
  flex-shrink: 0;
  border-radius: 999px;
  border: none;
  background: color-mix(in srgb, var(--ink-muted) 30%, var(--surface) 70%);
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--ink-muted) 25%, transparent);
  cursor: pointer;
  padding: 0;
  transition: background 0.18s ease;
}

.toggle-switch[aria-checked='true'] {
  background: var(--toggle-active);
  box-shadow: inset 0 0 0 1px var(--toggle-active);
}

.toggle-switch-knob {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: color-mix(in srgb, var(--ink-muted) 62%, var(--surface) 38%);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  line-height: 1;
  box-shadow: 0 1px 3px rgba(var(--shadow-rgb), 0.3);
  transform: translateX(0);
  transition: transform 0.18s ease;
}

.toggle-switch[aria-checked='true'] .toggle-switch-knob {
  background: var(--toggle-knob-active);
  transform: translateX(16px);
}
</style>
