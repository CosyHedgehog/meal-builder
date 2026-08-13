<script setup>
import { onMounted, onUnmounted, ref } from 'vue'

defineProps({ label: { type: String, default: 'Options' } })

const open = ref(false)
const root = ref(null)

function onDocumentClick(e) {
  if (open.value && root.value && !root.value.contains(e.target)) open.value = false
}

function onKeydown(e) {
  if (e.key === 'Escape') open.value = false
}

onMounted(() => {
  document.addEventListener('click', onDocumentClick)
  document.addEventListener('keydown', onKeydown)
})

onUnmounted(() => {
  document.removeEventListener('click', onDocumentClick)
  document.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <div ref="root" class="chip-group-menu-wrap">
    <button
      type="button"
      class="chip-group-menu-btn"
      :aria-label="label"
      :aria-expanded="open"
      @click="open = !open"
    >
      ⋯
    </button>
    <!-- Any click inside closes the menu; actions are plain buttons in the slot. -->
    <div class="chip-group-menu" :class="{ open }" @click="open = false">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.chip-group-menu-wrap {
  position: relative;
  margin-left: auto;
  display: flex;
}

.chip-group-menu-btn {
  width: 28px;
  height: 28px;
  padding: 0;
  background: transparent;
  color: var(--ink-muted);
  border-radius: 8px;
  font-size: 20px;
  line-height: 1;
}

.chip-group-menu-btn:hover,
.chip-group-menu-btn:focus-visible {
  background: var(--surface-alt);
  color: var(--ink);
  outline: none;
}

.chip-group-menu {
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  z-index: 20;
  display: none;
  min-width: 140px;
  padding: 5px;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 10px;
}

.chip-group-menu.open {
  display: block;
}

.chip-group-menu :deep(button) {
  width: 100%;
  padding: 9px 10px;
  background: transparent;
  color: var(--ink);
  border-radius: 7px;
  text-align: left;
  font: inherit;
  font-size: 11px;
  letter-spacing: 0;
  text-transform: none;
}

.chip-group-menu :deep(button:hover),
.chip-group-menu :deep(button:focus-visible) {
  background: var(--surface-alt);
  outline: none;
}
</style>