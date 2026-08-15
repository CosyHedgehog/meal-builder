<script setup>
import { computed } from 'vue'
import BaseModal from './BaseModal.vue'
import HistoryChart from './HistoryChart.vue'
import { state as store } from '../js/data.js'
import { useHistoryChart } from '../js/useHistoryChart.js'

const emit = defineEmits(['close'])
const { days, windowAverageKcal, windowAverageDeficit, windowProjectedKgPerWeek } = useHistoryChart()
const projectedWeightDisplay = computed(() => Math.abs(windowProjectedKgPerWeek.value) * 4)
</script>

<template>
  <BaseModal title="History" :subtitle="`Averages from the last ${days} days`" @close="emit('close')">
    <HistoryChart />
    <section class="history-summary section-block">
      <div class="history-summary-stats">
        <div class="history-summary-stats-item">
          <strong>{{ windowAverageKcal.toLocaleString() }}</strong>
          <span>kcal / day</span>
        </div>
        <div class="history-summary-stats-item" :class="{ surplus: windowAverageDeficit < 0 }">
          <strong>{{ Math.abs(windowAverageDeficit).toLocaleString() }}</strong>
          <span>kcal {{ windowAverageDeficit >= 0 ? 'deficit' : 'surplus' }} / day</span>
        </div>
        <div class="history-summary-stats-item" :class="{ surplus: windowProjectedKgPerWeek < 0 }">
          <strong v-if="projectedWeightDisplay >= 0.05">{{ projectedWeightDisplay.toFixed(1) }} {{ store.weightUnit }} </strong>
          <strong v-else>Maintenance</strong>
          <span>{{ windowProjectedKgPerWeek >= 0 ? 'loss' : 'gain' }} per month</span>
        </div>
      </div>
    </section>
  </BaseModal>
</template>

<style scoped>
.history-summary {
  margin-top: 14px;
}

.history-summary-stats-item {
    align-items: center;
}

.history-summary-stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

.history-summary-stats > div {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}

.history-summary-stats strong {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 16px;
}

.history-summary-stats span {
  color: var(--ink-muted);
  font-size: 11px;
}

.history-summary-stats .surplus strong {
  color: var(--red);
}
</style>
