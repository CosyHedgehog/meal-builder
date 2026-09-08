<script setup>
import { onMounted, onUnmounted, ref } from 'vue'
import { Modals, openModal } from '../js/modals.js'

const open = ref(false)
const popover = ref(null)

function closeOnOutsideClick(event) {
  if (!popover.value?.contains(event.target)) open.value = false
}

function closeOnEscape(event) {
  if (event.key === 'Escape') open.value = false
}

function openSettings() {
  open.value = false
  openModal(Modals.SETTINGS)
}

onMounted(() => {
  document.addEventListener('click', closeOnOutsideClick)
  document.addEventListener('keydown', closeOnEscape)
})

onUnmounted(() => {
  document.removeEventListener('click', closeOnOutsideClick)
  document.removeEventListener('keydown', closeOnEscape)
})
</script>

<template>
  <div ref="popover" class="locked-day-popover-wrap">
    <button type="button" class="locked-day-button" aria-label="About locked day" title="About locked day"
      :aria-expanded="open" @click.stop="open = !open">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
        stroke-linejoin="round" aria-hidden="true">
        <rect x="5" y="10" width="14" height="11" rx="2" />
        <path d="M8 10V7a4 4 0 0 1 8 0v3" />
      </svg>
    </button>

    <div v-if="open" class="locked-day-popover" role="dialog" aria-label="Day locked information" @click.stop>
      <p>Past day foods can't be selected.</p>
      <button type="button" class="locked-day-settings" @click="openSettings">Edit in Settings</button>
      <button type="button" class="locked-day-close" aria-label="Close information" @click="open = false">×</button>
    </div>
  </div>
</template>

<style scoped>
.locked-day-popover-wrap {
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 20;
}

.locked-day-button {
  display: inline-flex;
  width: 24px;
  height: 24px;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: 1px solid var(--line);
  border-radius: 50%;
  background: var(--surface);
  color: var(--ink-muted);
}

.locked-day-button svg {
  width: 13px;
  height: 13px;
}

.locked-day-button:hover,
.locked-day-button:focus-visible,
.locked-day-button[aria-expanded='true'] {
  border-color: var(--orange);
  color: var(--orange);
  outline: none;
}

.locked-day-popover {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  width: min(270px, calc(100vw - 32px));
  padding: 10px 10px 10px 12px;
  border: 1px solid var(--line);
  border-radius: 10px;
  background: var(--surface);
  box-shadow: 0 10px 24px rgba(var(--shadow-rgb), 0.28);
  color: var(--ink-muted);
  font-size: 12px;
  line-height: 1.35;
}

.locked-day-popover p {
  flex: 1;
  margin: 0;
}

.locked-day-settings {
  flex: none;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--green);
  font: inherit;
  font-weight: 700;
  white-space: nowrap;
}

.locked-day-settings:hover,
.locked-day-settings:focus-visible {
  color: var(--green-strong);
  outline: none;
  text-decoration: underline;
}

.locked-day-close {
  flex: none;
  width: 20px;
  height: 20px;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--ink-muted);
  font-size: 18px;
  line-height: 1;
}
</style>