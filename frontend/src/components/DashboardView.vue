<script setup>
import { computed } from 'vue'
import { state as store, getLog, UNCATEGORIZED_GROUP_ID } from '../js/data.js'
import { view } from '../js/ui.js'
import { auth } from '../js/auth.js'
import { Modals, openModal } from '../js/modals.js'
import DateNav from './DateNav.vue'
import CalorieSummary from './CalorieSummary.vue'
import FoodGroupList from './FoodGroupList.vue'
import HistoryChart from './HistoryChart.vue'
import { useHistoryChart } from '../js/useHistoryChart.js'

const log = computed(() => getLog(view.logDate))
const { days, windowAverageKcal, windowAverageDeficit, windowProjectedKgPerWeek } = useHistoryChart()
const groups = computed(() => store.groups.filter((group) => store.showUncategorized || group.id !== UNCATEGORIZED_GROUP_ID))

const projectedWeightDisplay = computed(() => {
  const kgValue = Math.abs(windowProjectedKgPerWeek.value) * 4
  return store.weightUnit === 'lb' ? kgValue * 2.20462 : kgValue
})

const projectedWeightUnit = computed(() => (store.weightUnit === 'lb' ? 'lb' : 'kg'))
</script>

<template>
  <div class="home">
    <DateNav />

    <section class="today-card">
      <CalorieSummary :log="log" />
    </section>

    <section v-for="group in groups" :key="group.id" class="today-group-card">
      <FoodGroupList :group="group" :log="log" />
    </section>

    <HistoryChart />

    <section class="history-summary section-block">
      <div class="section-head">
        <div>
          <h2>Summary</h2>
          <div class="muted">Averages from the last {{ days }} days</div>
        </div>
      </div>
      <div class="history-summary-stats">
        <div>
          <strong>{{ windowAverageKcal.toLocaleString() }}</strong>
          <span>kcal</span>
        </div>
        <div :class="{ surplus: windowAverageDeficit < 0 }">
          <strong>{{ Math.abs(windowAverageDeficit).toLocaleString() }}</strong>
          <span>kcal {{ windowAverageDeficit >= 0 ? 'deficit' : 'surplus' }}</span>
        </div>
        <div :class="{ surplus: windowProjectedKgPerWeek < 0 }">
          <strong v-if="projectedWeightDisplay >= 0.05">{{ projectedWeightDisplay.toFixed(1) }} {{ projectedWeightUnit }}</strong>
          <strong v-else>Maintenance</strong>
          <span>{{ windowProjectedKgPerWeek >= 0 ? 'loss' : 'gain' }} per month</span>
        </div>
      </div>
    </section>

    <section class="manage-section">
      <div class="manage-actions">
        <button class="manage-toggle group-add-button" type="button" @click="openModal(Modals.FOOD_MANAGER)">
          Manage foods
        </button>
        <button class="manage-toggle group-add-button" type="button" @click="openModal(Modals.GROUP_MANAGER)">
          Manage groups
        </button>
      </div>
    </section>

    <header class="home-header">
      <div><div class="eyebrow">Pantry to Plate</div></div>
      <div class="header-actions">
        <button class="header-profile-btn" aria-label="Open settings" @click="openModal(Modals.SETTINGS)">
          <span class="header-profile-name">{{ auth.user?.username || 'Settings' }}</span>
          <span class="header-profile-icon" aria-hidden="true">⚙</span>
        </button>
      </div>
    </header>
  </div>
</template>

<style scoped>
.home {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.today-card {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 20px;
  padding: 12px 12px 10px;
  box-shadow: 1px 2px 8px rgba(var(--shadow-rgb), 0.06);
}

.today-meal-card,
.today-snack-card {
  border-radius: 20px;
  padding: 5px 12px;
}

.history-summary {
  margin-top: 2px;
}

.history-summary-stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  margin-top: 12px;
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

.manage-actions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;
  padding: 5px 12px 0;
}

.manage-toggle {
  width: 100%;
  color: var(--green);
}

.manage-toggle:hover {
  color: var(--green-strong);
}

.home-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-top: 6px;
}

.home-header .eyebrow {
  margin: 0;
}

.header-actions {
  display: flex;
  gap: 10px;
  align-items: center;
}

.header-profile-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 999px;
  border: 1px solid var(--line);
  background: var(--surface);
  color: var(--ink);
  transition:
    background 0.15s ease,
    border-color 0.15s ease,
    box-shadow 0.15s ease;
}

.header-profile-btn:hover {
  background: var(--surface-alt);
  border-color: rgba(var(--shadow-rgb), 0.12);
  box-shadow: 0 2px 8px rgba(var(--shadow-rgb), 0.06);
}

.header-profile-name {
  font-size: 13px;
  color: var(--ink-muted);
  line-height: 1.2;
}

.header-profile-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 15px;
  color: var(--ink);
}
</style>