<script setup>
import { computed } from 'vue'
import BaseModal from './BaseModal.vue'
import TrendsChart from './TrendsChart.vue'
import { state as store } from '../js/data.js'
import { useTrendsChart } from '../js/useTrendsChart.js'

const emit = defineEmits(['close'])
const { days, windowAverageKcal, windowAverageDeficit, windowProjectedKgPerWeek } = useTrendsChart()
const projectedWeightDisplay = computed(() => Math.abs(windowProjectedKgPerWeek.value) * 4)
</script>

<template>
  <BaseModal title="Trends" :subtitle="`Averages from the last ${days} days`" @close="emit('close')">
    <TrendsChart />
    <section class="trends-summary section-block">
      <div class="trends-summary-stats">
        <div class="trends-summary-stats-item">
          <strong>{{ windowAverageKcal.toLocaleString() }}</strong>
          <span>kcal / day</span>
        </div>
        <div class="trends-summary-stats-item" :class="{ surplus: windowAverageDeficit < 0 }">
          <strong>{{ Math.abs(windowAverageDeficit).toLocaleString() }}</strong>
          <span>kcal {{ windowAverageDeficit >= 0 ? 'deficit' : 'surplus' }} / day</span>
        </div>
        <div class="trends-summary-stats-item" :class="{ surplus: windowProjectedKgPerWeek < 0 }">
          <strong v-if="projectedWeightDisplay >= 0.05">{{ projectedWeightDisplay.toFixed(1) }} {{ store.weightUnit }} </strong>
          <strong v-else>Maintenance</strong>
          <span>{{ windowProjectedKgPerWeek >= 0 ? 'loss' : 'gain' }} per month</span>
        </div>
      </div>
    </section>
  </BaseModal>
</template>

<style scoped>
.trends-summary {
  margin-top: 14px;
}

.trends-summary-stats-item {
    align-items: center;
}

.trends-summary-stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

.trends-summary-stats > div {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}

.trends-summary-stats strong {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 16px;
}

.trends-summary-stats span {
  color: var(--ink-muted);
  font-size: 11px;
}

.trends-summary-stats .surplus strong {
  color: var(--red);
}
</style>
