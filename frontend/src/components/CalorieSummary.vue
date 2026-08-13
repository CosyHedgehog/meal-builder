<script setup>
import { computed } from 'vue'
import { state as store, logMealKcal, logSnacksKcal } from '../js/data.js'

const props = defineProps({ log: { type: Object, required: true } })

const mealK = computed(() => logMealKcal(props.log))
const snackK = computed(() => logSnacksKcal(props.log))
const totalK = computed(() => mealK.value + snackK.value)
const deficit = computed(() => store.maintenanceCal - totalK.value)

const barTotal = computed(() => Math.max(store.maintenanceCal, totalK.value, 1))
const mealPct = computed(() => Math.min(100, (mealK.value / barTotal.value) * 100))
const snackPct = computed(() =>
  Math.min(100 - mealPct.value, (snackK.value / barTotal.value) * 100),
)
const restPct = computed(() => Math.max(0, 100 - mealPct.value - snackPct.value))
</script>

<template>
  <div class="today-top">
    <div class="today-kcal">
      <strong>
        {{ totalK.toLocaleString() }}
        <span class="goal-kcal">/ {{ store.maintenanceCal.toLocaleString() }} kcal</span>
      </strong>
    </div>
  </div>

  <div class="today-status">
    <div class="today-status-bar">
      <div class="status-seg meal" :style="{ width: mealPct + '%' }"></div>
      <div class="status-seg snack" :style="{ width: snackPct + '%' }"></div>
      <div class="status-seg deficit" :style="{ width: restPct + '%' }"></div>
    </div>

    <div class="today-status-labels">
      <div class="status-pill meal">
        <span>Meals</span><strong>{{ mealK.toLocaleString() }} <small>kcal</small></strong>
      </div>
      <div class="status-pill snack">
        <span>Snacks</span><strong>{{ snackK.toLocaleString() }} <small>kcal</small></strong>
      </div>
      <div class="status-pill" :class="deficit >= 0 ? 'deficit' : 'surplus'">
        <span>{{ deficit >= 0 ? 'Deficit' : 'Surplus' }}</span>
        <strong>{{ Math.abs(deficit).toLocaleString() }} <small>kcal</small></strong>
      </div>
    </div>
  </div>
</template>

<style scoped>
.today-top {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
}

.today-kcal {
  font-family: 'IBM Plex Mono', monospace;
  color: var(--ink);
  text-align: center;
  white-space: nowrap;
}

.today-kcal strong {
  display: block;
  font-size: 20px;
}

.goal-kcal {
  color: var(--ink-muted);
  font: inherit;
}

.today-status {
  margin-top: 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.today-status-bar {
  height: 20px;
  border-radius: 999px;
  background: var(--surface-alt);
  overflow: hidden;
  display: flex;
}

.status-seg {
  height: 100%;
}

.status-seg.meal {
  background: var(--green);
}

.status-seg.snack {
  background: var(--green-light);
}

.status-seg.deficit {
  background: transparent;
}

.today-status-labels {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.status-pill {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 0 2px;
  font-size: 13px;
  text-align: center;
}

.status-pill span {
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--ink-muted);
}

.status-pill strong {
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 3px;
  font-family: 'IBM Plex Mono', monospace;
  font-size: 16px;
  color: var(--ink);
}

.status-pill strong small {
  font-family: 'Inter', sans-serif;
  font-size: 10px;
  font-weight: 600;
  color: var(--ink-muted);
}

.status-pill.surplus strong {
  color: var(--red);
}

@media (max-width: 600px) {
  .today-kcal strong {
    font-size: 18px;
  }

  .today-status-labels {
    gap: 4px;
  }

  .status-pill span {
    font-size: 9px;
    letter-spacing: 0.08em;
    white-space: nowrap;
  }

  .status-pill strong {
    font-size: 15px;
  }

  .status-pill strong small {
    font-size: 9px;
  }
}
</style>