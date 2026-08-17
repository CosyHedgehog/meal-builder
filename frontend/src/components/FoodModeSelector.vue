<script setup>
defineProps({
  modelValue: { type: String, required: true },
})

const emit = defineEmits(['update:modelValue'])
</script>

<template>
  <div class="food-mode-control">
    <span class="food-mode-label">Food type</span>
    <div class="food-mode-tabs" role="group" aria-label="Food type">
      <button type="button" :class="{ active: modelValue === 'ingredients' }" @click="emit('update:modelValue', 'ingredients')">
        Ingredients
      </button>
      <button type="button" :class="{ active: modelValue === 'simple' }" @click="emit('update:modelValue', 'simple')">
        Simple food
      </button>
    </div>
  </div>
</template>

<style scoped>
.food-mode-control {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 3px;
  margin: 2px 0 4px;
}

.food-mode-label {
  color: var(--ink-muted);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.food-mode-tabs {
  display: flex;
  gap: 12px;
}

.food-mode-tabs button {
  position: relative;
  min-height: 28px;
  padding: 4px 0;
  border: 0;
  background: transparent;
  color: var(--ink-muted);
  font-size: 12px;
}

.food-mode-tabs button.active {
  color: var(--green-strong);
  font-weight: 700;
}

.food-mode-tabs button.active::after {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  height: 2px;
  border-radius: 2px;
  background: var(--green);
  content: '';
}
</style>
