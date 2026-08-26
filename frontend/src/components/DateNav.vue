<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { state as store } from '../js/data.js'
import { prettyDateNoYear, shiftDateStr, todayStr } from '../js/date.js'
import { setLogDate, triggerDateBoundaryBounce, view } from '../js/ui.js'

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
  if (next <= today.value) {
    setLogDate(next)
  } else {
    triggerDateBoundaryBounce()
  }
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
    <button class="date-arrow previous-day" aria-label="Previous day" @click="shiftDay(-1)">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m14.5 18-6-6 6-6" /></svg>
    </button>

    <button type="button" class="date-picker-trigger" aria-label="Choose date" @click="openPicker">
      <span class="today-date">
        {{ label }}
        <small>{{ isToday ? 'Today' : 'Selected day' }}</small>
      </span>
      <svg class="date-picker-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
        <rect x="3" y="4" width="18" height="18" rx="2"></rect>
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
      class="date-arrow next-day"
      aria-label="Next day"
      :disabled="isToday"
      @click="shiftDay(1)"
    >
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9.5 18 6-6-6-6" /></svg>
    </button>


        <button
      v-if="!isToday"
      class="date-today-arrow"
      type="button"
      aria-label="Jump to today"
      title="Jump to today"
      @click="setLogDate(today)"
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="m5 7 5 5-5 5m8-10 5 5-5 5" />
      </svg>
    </button>
  </section>
</template>

<style scoped>
.today-date-row {
  min-height: 44px;
  padding-top: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 15px;
  position: relative;
}

.today-date {
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 24px;
  font-weight: 400;
  text-align: center;
}

.today-date small {
  display: block;
  font-family: 'Inter', sans-serif;
  font-size: 12px;
  font-weight: 400;
  color: color-mix(in srgb, var(--green) 70%, transparent);
  margin-top: 2px;
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
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 0;
  background: transparent;
  color: color-mix(in srgb, var(--ink) 42%, transparent);
  transition:
    background 0.15s ease,
    border-color 0.15s ease;
}

.date-today-arrow {
  position: absolute;
  top: 50%;
  right: 32px;
  transform: translateY(-50%);
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 0;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: var(--green);
  font-size: 19px;
  line-height: 1;
}

.date-today-arrow:hover {
  background: rgba(255, 255, 255, 0.05);
  color: var(--ink);
}

.date-today-arrow svg {
  width: 16px;
  height: 16px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.date-arrow:hover {
  background: rgba(255, 255, 255, 0.05);
  color: var(--ink);
}

.date-arrow.previous-day {
  left: 0;
}

.date-arrow.next-day {
  right: 0;
}

.date-arrow svg {
  width: 16px;
  height: 16px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.date-arrow:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

@media (max-width: 600px) {
  .today-date-row {
    min-height: 42px;
    padding-top: 10px;
  }

  .today-date {
    font-size: 24px;
    white-space: nowrap;
  }

  .date-today-arrow {
    right: 36px;
  }
}

@media (min-width: 601px) {
  .today-date-row {
    position: sticky;
    top: var(--desktop-nav-height, 0px);
    z-index: 20;
    background: var(--bg);
    gap: 16px;
    padding: 12px 0 0;
  }

  .date-arrow {
    position: static;
    flex: 0 0 32px;
    width: 32px;
    height: 32px;
    transform: none;
    color: color-mix(in srgb, var(--ink) 40%, transparent);
  }

  .date-arrow:hover {
    background: color-mix(in srgb, var(--ink) 5%, transparent);
    color: var(--ink);
  }

  .date-arrow.previous-day,
  .date-arrow.next-day {
    left: auto;
    right: auto;
  }

  .today-date {
    font-family: Georgia, 'Times New Roman', serif;
    font-size: 24px;
    font-weight: 400;
  }

  .today-date small {
    margin-top: 2px;
    font-size: 12px;
    font-weight: 400;
  }

  .date-picker-trigger {
    gap: 6px;
  }

  .date-picker-icon {
    width: 15px;
    height: 15px;
    color: color-mix(in srgb, var(--ink) 35%, transparent);
  }

  .date-today-arrow {
    right: 0;
  }
}
</style>
