<script setup>
import { computed, ref } from 'vue'
import BaseModal from './BaseModal.vue'
import { state as store, foodKcal } from '../js/data.js'
import { prettyDate, shiftDateStr, todayStr } from '../js/date.js'
import { setLogDate } from '../js/ui.js'
import { closeAllModals } from '../js/modals.js'

const props = defineProps({
  foodId: { type: String, required: true },
})
const emit = defineEmits(['close'])

const food = computed(() => store.foods.find((item) => item.id === props.foodId))
const range = ref('all')
const rangeOptions = [
  { value: '30', label: '30 days' },
  { value: '90', label: '90 days' },
  { value: 'all', label: 'All time' },
]

const foodKcalValue = computed(() => foodKcal(food.value))

const usage = computed(() => {
  const today = todayStr()
  const start = range.value === 'all' ? '' : shiftDateStr(today, -(Number(range.value) - 1))
  return Object.entries(store.logs)
    .filter(([date]) => (!start || date >= start) && date <= today)
    .map(([date, log]) => {
      const matchingEntries = (log.entries || []).filter((entry) => entry.foodId === props.foodId)
      const servings = matchingEntries.reduce((sum, entry) => sum + (Number(entry.qty) > 0 ? Number(entry.qty) : 1), 0)
      return {
        date,
        servings,
        kcal: Math.round(servings * foodKcalValue.value),
        entryCount: matchingEntries.length,
      }
    })
    .filter((day) => day.servings > 0)
    .sort((a, b) => b.date.localeCompare(a.date))
})

const totalServings = computed(() => usage.value.reduce((sum, day) => sum + day.servings, 0))
const totalKcal = computed(() => usage.value.reduce((sum, day) => sum + day.kcal, 0))

function formatServings(value) {
  return Number.isInteger(value) ? value.toLocaleString() : value.toFixed(2).replace(/0+$/, '').replace(/\.$/, '')
}

function navigateToLog(dateStr) {
  setLogDate(dateStr)
  closeAllModals()
}
</script>

<template>
  <BaseModal
    :title="`${food?.name || 'Food'} logs`"
    :subtitle="`Logged on ${usage.length} day${usage.length === 1 ? '' : 's'} (${formatServings(totalServings)} total servings).`"
    panel-class="food-logs-modal"
    @close="emit('close')"
  >
    <div class="food-logs-content">
      <div class="food-logs-header-meta">
        <div class="food-logs-range" role="tablist" aria-label="Logs date range">
          <button
            v-for="option in rangeOptions"
            :key="option.value"
            type="button"
            role="tab"
            :aria-selected="range === option.value"
            :class="{ active: range === option.value }"
            @click="range = option.value"
          >
            {{ option.label }}
          </button>
        </div>
        <div class="food-logs-summary-text">
          {{ totalKcal.toLocaleString() }} kcal total
        </div>
      </div>

      <div v-if="usage.length" class="food-logs-list" role="list">
        <div v-for="day in usage" :key="day.date" class="food-log-item-row">
          <button
            type="button"
            class="food-log-item-btn"
            :title="`Jump to log for ${prettyDate(day.date)}`"
            @click="navigateToLog(day.date)"
          >
            <div class="food-log-date-wrap">
              <strong class="food-log-date">{{ prettyDate(day.date) }}</strong>
              <small class="food-log-servings">
                {{ formatServings(day.servings) }} serving{{ day.servings === 1 ? '' : 's' }}
                &bull; Click to open log
              </small>
            </div>
            <div class="food-log-right">
              <span class="food-log-kcal">{{ day.kcal.toLocaleString() }} kcal</span>
              <svg class="chevron-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </div>
          </button>
        </div>
      </div>
      <div v-else class="empty-note">
        No logged servings found in this period.
      </div>
    </div>
  </BaseModal>
</template>

<style scoped>
:deep(.modal.food-logs-modal) {
  display: flex;
  height: min(680px, calc(100dvh - 32px));
  flex-direction: column;
  overflow: hidden;
  width: 480px;
}

.food-logs-content {
  display: flex;
  flex: 1;
  min-height: 0;
  flex-direction: column;
  gap: 10px;
}

.food-logs-header-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin: 0 -26px 4px;
  padding: 0 26px 8px;
  border-bottom: 1px solid var(--line);
}

.food-logs-range {
  display: flex;
  gap: 16px;
}

.food-logs-range button {
  padding: 4px 0;
  border: 0;
  border-bottom: 2px solid transparent;
  background: transparent;
  color: var(--ink-muted);
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}

.food-logs-range button.active {
  color: var(--green);
  border-bottom-color: var(--green);
}

.food-logs-summary-text {
  color: var(--ink-muted);
  font-size: 12px;
}

.food-logs-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex: 1;
  min-height: 0;
  margin: 0 -26px;
  padding: 0 26px;
  overflow-y: auto;
}

.food-log-item-row {
  width: 100%;
}

.food-log-item-btn {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  padding: 11px 13px;
  border: 1px solid var(--line);
  border-radius: 10px;
  background: var(--surface);
  color: var(--ink);
  text-align: left;
  cursor: pointer;
  transition: background 0.15s ease, border-color 0.15s ease;
}

.food-log-item-btn:hover,
.food-log-item-btn:focus-visible {
  background: var(--surface-alt);
  border-color: var(--green-light);
  color: var(--ink);
  outline: none;
}

.food-log-date-wrap {
  display: flex;
  flex-direction: column;
  min-width: 0;
  flex: 1;
}

.food-log-date {
  font-size: 13px;
  font-weight: 600;
  color: var(--ink);
}

.food-log-servings {
  margin-top: 3px;
  color: var(--ink-muted);
  font-size: 11px;
}

.food-log-right {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: none;
}

.food-log-kcal {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 12px;
  font-weight: 600;
  color: var(--green-strong);
}

.chevron-icon {
  width: 15px;
  height: 15px;
  color: var(--ink-muted);
  flex: none;
  opacity: 0.6;
}

.food-log-item-btn:hover .chevron-icon {
  color: var(--green-strong);
  opacity: 1;
}

.empty-note {
  padding: 32px 0;
  color: var(--ink-muted);
  text-align: center;
  font-size: 13px;
}

@media (max-width: 480px) {
  :deep(.modal.food-logs-modal) {
    height: 100dvh;
    max-height: 100dvh;
  }

  .food-logs-header-meta {
    margin-right: -20px;
    margin-left: -20px;
    padding-right: 20px;
    padding-left: 20px;
  }

  .food-logs-list {
    margin-right: -20px;
    margin-left: -20px;
    padding-right: 20px;
    padding-left: 20px;
  }
}
</style>