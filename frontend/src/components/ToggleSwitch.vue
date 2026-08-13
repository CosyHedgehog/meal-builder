<script setup>
defineProps({
  modelValue: Boolean,
  label: String,
  knob: { type: String, default: '' },
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
    <span class="toggle-switch-knob">{{ knob }}</span>
  </button>
</template>
<style scoped>
.toggle-switch {
  position: relative;
  display: inline-flex;
  align-items: center;
  width: 46px;
  height: 27px;
  flex-shrink: 0;
  border-radius: 999px;
  border: none;
  background: var(--surface-alt);
  box-shadow: inset 0 0 0 1px var(--line);
  cursor: pointer;
  padding: 0;
  transition: background 0.18s ease;
}

.toggle-switch[aria-checked='true'] {
  background: var(--green);
  box-shadow: inset 0 0 0 1px var(--green);
}

.toggle-switch-knob {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 21px;
  height: 21px;
  border-radius: 50%;
  background: var(--surface);
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
  transform: translateX(19px);
}
</style>
