<script setup>
import { computed, ref } from 'vue'
import BaseModal from './BaseModal.vue'
import { state as store, foodKcal } from '../js/data.js'
import { prettyDate, shiftDateStr, todayStr } from '../js/date.js'

const props = defineProps({
  foodId: { type: String, required: true },
})
const emit = defineEmits(['close'])

const food = computed(() => store.foods.find((item) => item.id === props.foodId))
const range = ref('30')
const rangeOptions = [
  { value: '7', label: '7 days' },
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
      const servings = (log.entries || [])
        .filter((entry) => entry.foodId === props.foodId)
        .reduce((sum, entry) => sum + (Number(entry.qty) > 0 ? Number(entry.qty) : 1), 0)
      return { date, servings, kcal: Math.round(servings * foodKcalValue.value) }
    })
    .filter((day) => day.servings > 0)
    .sort((a, b) => b.date.localeCompare(a.date))
})
const totalServings = computed(() => usage.value.reduce((sum, day) => sum + day.servings, 0))
const totalKcal = computed(() => usage.value.reduce((sum, day) => sum + day.kcal, 0))
const averageServings = computed(() => usage.value.length ? totalServings.value / usage.value.length : 0)
const lastUsed = computed(() => usage.value[0]?.date || '')

function formatServings(value) {
  return Number.isInteger(value) ? value.toLocaleString() : value.toFixed(2).replace(/0+$/, '').replace(/\.$/, '')
}
</script>

<template>
  <BaseModal
    :title="`${food?.name || 'Food'} stats`"
    subtitle="See how often this food has been used."
    panel-class="food-stats-modal"
    @close="emit('close')"
  >
    <div class="food-stats-content">
      <div class="food-stats-kcal">
        <strong>{{ foodKcalValue.toLocaleString() }} kcal</strong>
        <span>per serving</span>
      </div>

      <div class="food-stats-range" role="tablist" aria-label="Stats date range">
        <button
          v-for="option in rangeOptions"
          :key="option.value"
          type="button"
          role="tab"
          :aria-selected="range === option.value"
          :class="{ active: range === option.value }"
          @click="range = option.value"
        >{{ option.label }}</button>
      </div>

      <div class="food-stats-grid">
        <div><strong>{{ formatServings(totalServings) }}</strong><span>servings logged</span></div>
        <div><strong>{{ usage.length }}</strong><span>days used</span></div>
        <div><strong>{{ lastUsed ? prettyDate(lastUsed) : '—' }}</strong><span>last logged</span></div>
        <div><strong>{{ formatServings(averageServings) }}</strong><span>avg servings / day used</span></div>
      </div>

      <div class="food-stats-total">{{ totalKcal.toLocaleString() }} kcal estimated in this period</div>

      <section class="food-stats-history">
        <h3>Recent history</h3>
        <div v-if="!usage.length" class="empty-note">No logged servings in this period.</div>
        <div v-else class="food-stats-history-list">
          <div v-for="day in usage" :key="day.date" class="food-stats-history-row">
            <span>{{ prettyDate(day.date) }}</span>
            <span>{{ formatServings(day.servings) }} serving{{ day.servings === 1 ? '' : 's' }}</span>
            <strong>{{ day.kcal.toLocaleString() }} kcal</strong>
          </div>
        </div>
      </section>
    </div>
  </BaseModal>
</template>

<style scoped>
:deep(.modal.food-stats-modal) {
  display: flex;
  height: min(680px, calc(100dvh - 32px));
  flex-direction: column;
  overflow: hidden;
}

.food-stats-content {
  display: flex;
  flex: 1;
  min-height: 0;
  flex-direction: column;
  gap: 16px;
}

.food-stats-kcal {
  display: flex;
  align-items: baseline;
  gap: 7px;
  color: var(--ink-muted);
}

.food-stats-kcal strong {
  color: var(--green);
  font-size: 24px;
}

.food-stats-range {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 4px;
  padding: 4px;
  border-radius: 10px;
  background: var(--surface-alt);
}

.food-stats-range button {
  border: 0;
  border-radius: 7px;
  padding: 8px 4px;
  background: transparent;
  color: var(--ink-muted);
  font-size: 12px;
  cursor: pointer;
}

.food-stats-range button.active {
  background: var(--surface);
  color: var(--ink);
  font-weight: 700;
  box-shadow: 0 1px 3px rgba(var(--shadow-rgb), 0.14);
}

.food-stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1px;
  overflow: hidden;
  border: 1px solid var(--line);
  border-radius: 10px;
  background: var(--line);
}

.food-stats-grid > div {
  display: flex;
  min-height: 72px;
  flex-direction: column;
  justify-content: center;
  gap: 3px;
  padding: 10px 12px;
  background: var(--surface);
}

.food-stats-grid strong {
  font-size: 16px;
}

.food-stats-grid span,
.food-stats-total {
  color: var(--ink-muted);
  font-size: 11px;
}

.food-stats-total {
  text-align: right;
}

.food-stats-history {
  display: flex;
  min-height: 0;
  flex: 1;
  flex-direction: column;
}

.food-stats-history h3 {
  flex: none;
  margin-bottom: 8px;
  font-size: 16px;
}

.food-stats-history-list {
  min-height: 0;
  border-top: 1px solid var(--line);
  overflow-y: auto;
}

.food-stats-history-row {
  display: grid;
  grid-template-columns: 1.2fr 1fr auto;
  gap: 8px;
  align-items: center;
  padding: 9px 0;
  border-bottom: 1px solid var(--line);
  font-size: 12px;
}

.food-stats-history-row span:nth-child(2) {
  color: var(--ink-muted);
}

@media (max-width: 480px) {
  :deep(.modal.food-stats-modal) {
    height: 100dvh;
    max-height: 100dvh;
  }

  .food-stats-range button {
    font-size: 11px;
  }

  .food-stats-history-row {
    grid-template-columns: 1fr auto;
  }

  .food-stats-history-row strong {
    grid-column: 2;
    grid-row: 1;
  }

  .food-stats-history-row span:nth-child(2) {
    grid-column: 1 / -1;
  }
}
</style>
