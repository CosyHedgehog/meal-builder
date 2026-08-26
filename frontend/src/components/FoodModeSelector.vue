<script setup>
defineProps({
  modelValue: { type: String, required: true },
})

const emit = defineEmits(['update:modelValue'])
</script>

<template>
  <div class="food-mode-control">
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
  margin: 2px 0 4px;
}

.food-mode-tabs {
  display: flex;
  gap: 4px;
  padding: 3px;
  border-radius: 10px;
  background: var(--surface-alt);
}

.food-mode-tabs button {
  flex: 1;
  min-height: 30px;
  padding: 5px 8px;
  border-radius: 8px;
  border: 0;
  background: transparent;
  color: var(--ink-muted);
  font-size: 13px;
}

.food-mode-tabs button.active {
  background: var(--surface);
  color: var(--ink);
  font-weight: 700;
}
</style>
