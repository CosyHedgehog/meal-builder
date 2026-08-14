<script setup>
import { computed } from 'vue'
import { state as store, getLog, logEntries } from '../js/data.js'
import { view, clearDragState } from '../js/ui.js'
import { Modals, openModal } from '../js/modals.js'
import DateNav from './DateNav.vue'
import CalorieSummary from './CalorieSummary.vue'
import FoodGroupList from './FoodGroupList.vue'
import HistoryChart from './HistoryChart.vue'
import { useHistoryChart } from '../js/useHistoryChart.js'

const log = computed(() => getLog(view.logDate))
const { days, windowAverageKcal, windowAverageDeficit, windowProjectedKgPerWeek } = useHistoryChart()
const groups = computed(() => view.dashboardEditMode ? store.groups : store.groups.filter((group) => group.visible !== false))
const hiddenLoggedGroups = computed(() => {
  const hiddenIds = new Set(store.groups.filter((group) => group.visible === false).map((group) => group.id))
  const ids = new Set(logEntries(log.value).filter((entry) => hiddenIds.has(entry.groupId)).map((entry) => entry.groupId))
  return store.groups.filter((group) => ids.has(group.id))
})

const projectedWeightDisplay = computed(() => {
  const kgValue = Math.abs(windowProjectedKgPerWeek.value) * 4
  return store.weightUnit === 'lb' ? kgValue * 2.20462 : kgValue
})

const projectedWeightUnit = computed(() => (store.weightUnit === 'lb' ? 'lb' : 'kg'))

function finishDashboardEdit() {
  clearDragState()
  view.dashboardEditMode = false
}
</script>

<template>
  <div class="home">
    <DateNav />

    <section class="today-card">
      <CalorieSummary :log="log" />
    </section>

    <div v-if="hiddenLoggedGroups.length" class="hidden-food-note">
      <span class="hidden-food-note-icon" aria-hidden="true">ⓘ</span>
      <span>Food logged in hidden group{{ hiddenLoggedGroups.length === 1 ? '' : 's' }}: {{ hiddenLoggedGroups.map((group) => group.name).join(', ') }}. <button type="button" @click="openModal(Modals.GROUP_MANAGER)">Manage groups</button></span>
    </div>

    <section v-for="group in groups" :key="group.id" class="today-group-card">
      <FoodGroupList :group="group" :log="log" :edit-mode="view.dashboardEditMode" />
    </section>

    <div class="dashboard-edit-toolbar">
      <button v-if="!view.dashboardEditMode" class="manage-toggle group-add-button" type="button" @click="view.dashboardEditMode = true">
        ✎ Edit dashboard
      </button>
      <button v-else class="btn btn-primary" type="button" @click="finishDashboardEdit">
        Done
      </button>
      <span v-if="view.dashboardEditMode" class="dashboard-edit-note">Drag food handles into another group.</span>
      <div v-if="view.dashboardEditMode" class="food-order-mode" role="group" aria-label="Food ordering mode">
        <span>Food order</span>
        <button type="button" :class="{ active: view.foodOrderMode === 'swap' }" @click="view.foodOrderMode = 'swap'">Swap</button>
        <button type="button" :class="{ active: view.foodOrderMode === 'insert' }" @click="view.foodOrderMode = 'insert'">Insert</button>
      </div>
    </div>

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
          ✎ Foods
        </button>
        <button class="manage-toggle group-add-button" type="button" @click="openModal(Modals.GROUP_MANAGER)">
          ✎ Groups
        </button>
        <button class="manage-toggle group-add-button" type="button" @click="openModal(Modals.SETTINGS)">
          ⚙ Settings
        </button>
      </div>
    </section>

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

.dashboard-edit-toolbar {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 12px;
}

.dashboard-edit-note {
  color: var(--ink-muted);
  font-size: 12px;
}

.food-order-mode {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: var(--ink-muted);
  font-size: 12px;
}

.food-order-mode button {
  padding: 4px 8px;
  border: 1px solid var(--line);
  background: var(--surface);
  color: var(--ink-muted);
  font: inherit;
}

.food-order-mode button:first-of-type { border-radius: 6px 0 0 6px; }
.food-order-mode button:last-of-type { border-radius: 0 6px 6px 0; }

.food-order-mode button.active {
  border-color: var(--green);
  background: var(--green-soft);
  color: var(--green-strong);
  font-weight: 700;
}

.hidden-food-note {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  padding: 9px 11px;
  border: 1px solid var(--line);
  border-radius: 10px;
  background: var(--surface);
  color: var(--ink-muted);
  font-size: 12px;
}

.hidden-food-note-icon {
  flex: none;
  color: var(--green);
  font-size: 14px;
  line-height: 1.1;
}

.hidden-food-note button {
  padding: 0;
  background: transparent;
  color: var(--green);
  font: inherit;
  font-weight: 700;
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
  grid-template-columns: repeat(3, minmax(0, 1fr));
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

</style>