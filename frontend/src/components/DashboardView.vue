<script setup>
import { computed, ref, watch } from 'vue'
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
const dayLocked = computed(() => store.allowPreviousDayLocking && view.logDate < new Date().toISOString().slice(0, 10))
const mobileActionsOpen = ref(false)
const mobileActionStartY = ref(null)

watch(dayLocked, (locked) => {
  if (locked) finishDashboardEdit()
})

function finishDashboardEdit() {
  clearDragState()
  view.dashboardEditMode = false
}

function toggleMobileActions() {
  mobileActionsOpen.value = !mobileActionsOpen.value
}

function startMobileActionSwipe(event) {
  mobileActionStartY.value = event.changedTouches[0]?.clientY ?? null
}

function endMobileActionSwipe(event) {
  if (mobileActionStartY.value === null) return
  const endY = event.changedTouches[0]?.clientY ?? mobileActionStartY.value
  const deltaY = endY - mobileActionStartY.value
  mobileActionStartY.value = null
  if (Math.abs(deltaY) < 40) return
  mobileActionsOpen.value = deltaY < 0
}

function closeMobileActions() {
  mobileActionsOpen.value = false
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
      <FoodGroupList :group="group" :log="log" :edit-mode="view.dashboardEditMode && !dayLocked" :locked="dayLocked" />
    </section>

    <div v-if="dayLocked" class="locked-day-note">
      <span aria-hidden="true">🔒</span>
      <span>Previous days are locked. <button type="button" @click="openModal(Modals.SETTINGS)">Change in Settings</button></span>
    </div>

    <div class="dashboard-edit-toolbar">
      <button v-if="!view.dashboardEditMode && !dayLocked" class="manage-toggle group-add-button desktop-edit-dashboard" type="button" @click="view.dashboardEditMode = true">
        ✎ Edit dashboard
      </button>
      <button v-else-if="!dayLocked" class="btn btn-primary" type="button" @click="finishDashboardEdit">
        Done
      </button>
      <span v-if="view.dashboardEditMode" class="dashboard-edit-note">Drag food handles into another group.</span>
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
      <div class="manage-actions desktop-manage-actions">
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

    <div v-if="mobileActionsOpen" class="mobile-actions-backdrop" @click="closeMobileActions"></div>
    <section
      class="mobile-action-sheet"
      :class="{ open: mobileActionsOpen }"
      aria-label="Dashboard actions"
      @touchstart.passive="startMobileActionSwipe"
      @touchend.passive="endMobileActionSwipe"
    >
      <button class="mobile-action-handle" type="button" aria-label="Show dashboard actions" @click="toggleMobileActions">
        <span aria-hidden="true">⌃</span> Manage
      </button>
      <div v-if="mobileActionsOpen" class="mobile-action-list">
        <button type="button" @click="openModal(Modals.FOOD_MANAGER); closeMobileActions()">✎ Foods</button>
        <button type="button" @click="openModal(Modals.GROUP_MANAGER); closeMobileActions()">✎ Groups</button>
        <button type="button" @click="openModal(Modals.SETTINGS); closeMobileActions()">⚙ Settings</button>
        <button v-if="!view.dashboardEditMode && !dayLocked" type="button" @click="view.dashboardEditMode = true; closeMobileActions()">✎ Edit dashboard</button>
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

.locked-day-note {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  padding: 9px 11px;
  border: 1px solid var(--line);
  border-radius: 10px;
  background: var(--surface);
  color: var(--ink-muted);
  font-size: 12px;
  line-height: 1.4;
}

.locked-day-note > span:first-child {
  flex: none;
}

.locked-day-note button {
  padding: 0;
  background: transparent;
  color: var(--green);
  font: inherit;
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

.mobile-action-sheet,
.mobile-actions-backdrop {
  display: none;
}

@media (max-width: 600px) {
  .desktop-manage-actions {
    display: none;
  }

  .desktop-edit-dashboard {
    display: none;
  }

  .mobile-actions-backdrop {
    position: fixed;
    inset: 0;
    display: block;
    background: rgba(var(--backdrop-rgb), 0.28);
    z-index: 20;
  }

  .mobile-action-sheet {
    position: fixed;
    right: 12px;
    bottom: 0;
    left: 12px;
    display: block;
    padding-bottom: env(safe-area-inset-bottom);
    border: 1px solid var(--line);
    border-bottom: 0;
    border-radius: 14px 14px 0 0;
    background: var(--surface);
    box-shadow: 0 -5px 20px rgba(var(--shadow-rgb), 0.14);
    transform: translateY(calc(100% - 42px));
    transition: transform 0.2s ease;
    z-index: 21;
  }

  .mobile-action-sheet.open {
    transform: translateY(0);
  }

  .mobile-action-handle {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 5px;
    width: 100%;
    min-height: 42px;
    border: 0;
    background: transparent;
    color: var(--green);
    font-weight: 700;
  }

  .mobile-action-list {
    display: grid;
    gap: 6px;
    padding: 0 10px 12px;
  }

  .mobile-action-list button {
    min-height: 42px;
    padding: 9px 12px;
    border: 1px solid var(--line);
    border-radius: 9px;
    background: var(--surface-alt);
    color: var(--ink);
    text-align: left;
  }
}

</style>