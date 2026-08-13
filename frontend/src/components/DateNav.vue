<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { prettyDateNoYear, shiftDateStr, todayStr } from '../js/date.js'
import { setLogDate, view } from '../js/ui.js'

const dateInput = ref(null)
const today = computed(() => todayStr())
const isToday = computed(() => view.logDate === today.value)
const label = computed(() => prettyDateNoYear(view.logDate))

function openPicker() {
  const el = dateInput.value
  if (!el) return
  if (typeof el.showPicker === 'function') el.showPicker()
  else el.click()
}

function shiftDay(amount) {
  const next = shiftDateStr(view.logDate, amount)
  if (next <= today.value) setLogDate(next)
}

function onKeydown(event) {
  if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement || event.target instanceof HTMLSelectElement) return
  if (event.key === 'ArrowLeft') shiftDay(-1)
  if (event.key === 'ArrowRight') shiftDay(1)
}

onMounted(() => document.addEventListener('keydown', onKeydown))
onUnmounted(() => document.removeEventListener('keydown', onKeydown))
</script>

<template>
  <section class="today-date-row">
    <button class="date-arrow" aria-label="Previous day" @click="shiftDay(-1)">
      ‹
    </button>

    <button type="button" class="date-picker-trigger" aria-label="Choose date" @click="openPicker">
      <span class="today-date">
        {{ label }}
        <small>{{ isToday ? 'Today' : 'Selected day' }}</small>
      </span>
      <svg class="date-picker-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
        <rect x="3" y="5" width="18" height="16" rx="2"></rect>
        <path d="M16 3v4M8 3v4M3 10h18"></path>
      </svg>
    </button>

    <input
      ref="dateInput"
      class="date-picker-input"
      type="date"
      :value="view.logDate"
      :max="today"
      aria-label="Choose log date"
      @change="(e) => e.target.value && setLogDate(e.target.value)"
    />


    <button
      class="date-arrow"
      aria-label="Next day"
      :disabled="isToday"
      @click="shiftDay(1)"
    >
      ›
    </button>

        <button
      v-if="!isToday"
      class="date-today-arrow"
      type="button"
      aria-label="Jump to today"
      title="Jump to today"
      @click="setLogDate(today)"
    >
      »
    </button>
  </section>
</template>

<style scoped>
.today-date-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 15px;
  position: relative;
}

.today-date {
  font-family: 'Fraunces', serif;
  font-size: 22px;
  font-weight: 600;
  text-align: left;
}

.today-date small {
  display: block;
  font-family: 'Inter', sans-serif;
  font-size: 11px;
  font-weight: 500;
  color: var(--ink-muted);
  margin-top: 3px;
}

.date-picker-trigger {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 0 4px;
  background: transparent;
  color: var(--ink);
}

.date-picker-trigger:hover .today-date {
  color: var(--green);
}

.date-picker-icon {
  width: 16px;
  height: 16px;
  color: var(--ink-muted);
  flex: none;
}

.date-picker-input {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
  pointer-events: none;
}

.date-arrow {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  font-size: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--line);
  background: var(--surface);
  color: var(--ink);
  transition:
    background 0.15s ease,
    border-color 0.15s ease;
}

.date-today-arrow {
  width: 30px;
  height: 30px;
  margin-right: -22px;
  padding: 0;
  border: 1px solid var(--line);
  border-radius: 50%;
  background: var(--surface);
  color: var(--green);
  font-size: 19px;
  line-height: 1;
}

.date-today-arrow:hover {
  background: var(--surface-alt);
  color: var(--green-strong);
}

.date-arrow:hover {
  background: var(--surface-alt);
}

.date-arrow:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

@media (max-width: 600px) {
  .today-date {
    font-size: 20px;
    white-space: nowrap;
  }
}
</style>