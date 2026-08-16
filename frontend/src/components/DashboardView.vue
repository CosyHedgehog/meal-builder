<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { state as store, getLog, logEntries } from '../js/data.js'
import { view, clearDragState, getCollapseState, setCollapseState, dateNavDirection, boundaryBounce } from '../js/ui.js'
import { Modals, modalStack, openModal } from '../js/modals.js'
import { confirmState } from '../js/confirm.js'
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
const hasOpenModal = computed(() => modalStack.length > 0 || confirmState.open)
const mobileActionsOpen = ref(false)
const activeStepperId = ref(null)
const mobileActionStartY = ref(null)
const historyCollapsed = ref(getCollapseState('history'))

watch(dayLocked, (locked) => {
  if (locked) finishDashboardEdit()
})

function finishDashboardEdit() {
  clearDragState()
  view.dashboardEditMode = false
}

function openMobileActions() {
  if (mobileActionsOpen.value) return
  mobileActionsOpen.value = true
  history.pushState({ mealBuilderActions: true }, '')
}

function closeMobileActions() {
  mobileActionsOpen.value = false
}

function toggleMobileActions() {
  if (mobileActionsOpen.value) {
    closeMobileActions()
  } else {
    openMobileActions()
  }
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
  if (deltaY < 0) openMobileActions()
  else if (mobileActionsOpen.value) closeMobileActions()
}

function onMobileActionsPopState() {
  if (!mobileActionsOpen.value) return
  mobileActionsOpen.value = false
  history.replaceState(null, '', location.href)
}

function setActiveStepper(stepperId) {
  activeStepperId.value = stepperId
}

onMounted(() => window.addEventListener('popstate', onMobileActionsPopState))
onUnmounted(() => window.removeEventListener('popstate', onMobileActionsPopState))
</script>

<template>
  <div class="home">
        <section class="manage-section">
      <div class="manage-actions desktop-manage-actions">
        <button class="manage-toggle group-add-button" type="button" @click="openModal(Modals.FOOD_MANAGER)">
          Foods
        </button>
        <button class="manage-toggle group-add-button" type="button" @click="openModal(Modals.GROUP_MANAGER)">
          Groups
        </button>
        <button v-if="!view.dashboardEditMode" class="manage-toggle group-add-button" type="button"
          @click="view.dashboardEditMode = true">
          Edit Dashboard
        </button>
        <button v-else-if="view.dashboardEditMode" class="manage-toggle group-add-button" type="button"
          @click="finishDashboardEdit">
          Done
        </button>
        <button class="manage-toggle group-add-button" type="button" @click="openModal(Modals.SETTINGS)">
          ⚙ Settings
        </button>
      </div>
    </section>
    <DateNav />

    <Transition :name="`day-slide-${dateNavDirection}`" mode="out-in">
      <div :key="view.logDate" class="day-flow" :class="{ 'boundary-bounce': boundaryBounce }">
        <section class="today-card">
          <CalorieSummary :log="log" />
        </section>

        <div v-if="hiddenLoggedGroups.length && !view.dashboardEditMode" class="hidden-food-note">
          <span class="hidden-food-note-icon" aria-hidden="true">ⓘ</span>
          <span>Food logged in hidden group{{ hiddenLoggedGroups.length === 1 ? '' : 's' }}: {{
            hiddenLoggedGroups.map((group) => group.name).join(', ')}}. <button type="button"
              @click="openModal(Modals.GROUP_MANAGER)">Manage groups</button></span>
        </div>

        <div v-if="dayLocked" class="locked-day-note">
          <span aria-hidden="true">🔒</span>
            <span>Past day foods can't be selected. <button type="button" @click="openModal(Modals.SETTINGS)">Edit in Settings</button></span>
        </div>

        <section v-for="group in groups" :key="group.id" class="today-group-card">
          <FoodGroupList
            :group="group"
            :log="log"
            :edit-mode="view.dashboardEditMode"
            :locked="dayLocked"
            :active-stepper-id="activeStepperId"
            @update:active-stepper-id="setActiveStepper"
          />
        </section>
      </div>
    </Transition>
    <div class="desktop-history-section history-panel-layout">
      <div class="history-panel-heading">
        <div class="history-panel-title">
          <button type="button" class="history-panel-toggle" :aria-expanded="!historyCollapsed"
            aria-controls="dashboard-history-content"
            :aria-label="`${historyCollapsed ? 'Show' : 'Hide'} history chart and summary`"
            @click="historyCollapsed = !historyCollapsed; setCollapseState('history', historyCollapsed)">
            <h2>HISTORY</h2>
            <span class="history-panel-chevron" aria-hidden="true">{{ historyCollapsed ? '▶' : '▼' }}</span>
          </button>
          <div v-if="!historyCollapsed" class="muted">Averages from the last {{ days }} days</div>
        </div>
      </div>
      <div v-if="!historyCollapsed" id="dashboard-history-content" class="history-panel-content">
        <HistoryChart />

        <section class="history-summary section-block history-summary-card">
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
              <strong v-if="projectedWeightDisplay >= 0.05">{{ projectedWeightDisplay.toFixed(1) }} {{
                projectedWeightUnit }}</strong>
              <strong v-else>Maintenance</strong>
              <span>{{ windowProjectedKgPerWeek >= 0 ? 'loss' : 'gain' }} per month</span>
            </div>
          </div>
        </section>
      </div>
    </div>
    <div v-if="mobileActionsOpen && !hasOpenModal" class="mobile-actions-backdrop" @click="closeMobileActions" @touchmove.prevent></div>
    <section v-show="!hasOpenModal" class="mobile-action-sheet" :class="{ open: mobileActionsOpen }" aria-label="Dashboard actions"
      @touchstart="startMobileActionSwipe" @touchmove.prevent @touchend="endMobileActionSwipe">
      <button class="mobile-action-handle" type="button" aria-label="Show dashboard actions"
        @click="toggleMobileActions">
        <span aria-hidden="true">{{ mobileActionsOpen ? '↓' : '↑' }}</span> Manage
      </button>
      <div class="mobile-action-list" :aria-hidden="!mobileActionsOpen">
        <button type="button" :tabindex="mobileActionsOpen ? 0 : -1" @click="openModal(Modals.HISTORY); closeMobileActions()">◷ Summary</button>
        <button type="button" :tabindex="mobileActionsOpen ? 0 : -1" @click="openModal(Modals.FOOD_MANAGER); closeMobileActions()">✎ Foods</button>
        <button type="button" :tabindex="mobileActionsOpen ? 0 : -1" @click="openModal(Modals.GROUP_MANAGER); closeMobileActions()">✎ Groups</button>
        <button type="button" :tabindex="mobileActionsOpen ? 0 : -1" @click="openModal(Modals.SETTINGS); closeMobileActions()">⚙ Settings</button>
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

.day-flow {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
  will-change: transform, opacity;
}

/* Slide Left (Next day / Swipe left / Time forward) */
.day-slide-next-enter-from {
  opacity: 0;
  transform: translateX(28px);
}
.day-slide-next-leave-to {
  opacity: 0;
  transform: translateX(-28px);
}

/* Slide Right (Previous day / Swipe right / Time backward) */
.day-slide-prev-enter-from {
  opacity: 0;
  transform: translateX(-28px);
}
.day-slide-prev-leave-to {
  opacity: 0;
  transform: translateX(28px);
}

.day-slide-next-enter-active,
.day-slide-prev-enter-active {
  transition: transform 0.16s cubic-bezier(0.2, 0.9, 0.3, 1), opacity 0.16s ease-out;
}

.day-slide-next-leave-active,
.day-slide-prev-leave-active {
  transition: transform 0.12s ease-in, opacity 0.12s ease-in;
}

/* Boundary bounce when trying to swipe forward past today */
@keyframes boundaryNudge {
  0% { transform: translateX(0); }
  28% { transform: translateX(-10px); }
  60% { transform: translateX(5px); }
  82% { transform: translateX(-2px); }
  100% { transform: translateX(0); }
}

.boundary-bounce {
  animation: boundaryNudge 0.32s cubic-bezier(0.2, 0.9, 0.3, 1);
}

@media (prefers-reduced-motion: reduce) {
  .day-slide-next-enter-active,
  .day-slide-next-leave-active,
  .day-slide-prev-enter-active,
  .day-slide-prev-leave-active {
    transition: none;
    transform: none;
  }
  .boundary-bounce {
    animation: none;
  }
}

.today-card {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 20px;
  padding: 7px 7px 7px;
  box-shadow: 1px 2px 8px rgba(var(--shadow-rgb), 0.06);
}

.locked-day-note {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  padding: 6px 8px;
  border: 1px solid var(--line);
  border-left: 3px solid var(--orange);
  border-radius: 10px;
  background: var(--surface);
  color: var(--ink-muted);
  font-size: 11px;
  line-height: 1.4;
}

.locked-day-note>span:first-child {
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
  padding: 6px 8px;
  border: 1px solid var(--line);
  border-left: 3px solid var(--green-light);
  border-radius: 10px;
  background: var(--surface);
  color: var(--ink-muted);
  font-size: 11px;
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

.history-summary-stats-item{
  align-items: center;
}

.history-summary-stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

.history-summary-stats>div {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}

.history-summary-stats strong {
  /* font-family: 'IBM Plex Mono', monospace; */
  font-size: 16px;
}

.history-summary-stats span {
  color: var(--ink-muted);
  font-size: 11px;
}

.history-summary-stats .surplus strong {
  color: var(--red);
}

.history-panel-layout {
  display: grid;
  gap: 8px;
  padding: 5px 12px 5px 12px;
}

.history-panel-heading h2 {
  margin: 0;
  color: var(--ink-muted);
  font-size: 12px;
  font-weight: 700;
  line-height: 1.1;
  letter-spacing: 0.14em;
}

.history-panel-heading {
  display: flex;
  align-items: baseline;
  gap: 16px;
}

.history-panel-title {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
}

.history-panel-toggle {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  text-align: left;
}

.history-panel-toggle:focus-visible {
  outline: 2px solid var(--green);
  outline-offset: 4px;
  border-radius: 4px;
}

.history-panel-chevron {
  color: var(--green);
  font-size: 12px;
  line-height: 1;
}

.history-panel-content {
  display: grid;
  gap: 8px;
}

.history-panel-heading .muted {
  color: var(--green);
  /* font-family: 'IBM Plex Mono', monospace; */
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.history-summary-card {
  margin-top: 0;
}

.manage-actions {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 18px;
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
  .home {
    padding-bottom: calc(52px + env(safe-area-inset-bottom));
  }

  .today-card {
    width: calc(100% + 48px);
    margin-left: -24px;
    border-right: 0;
    border-left: 0;
    border-radius: 0;
  }

  .today-group-card {
    width: calc(100% + 48px);
    margin-left: -24px;
  }

  .desktop-manage-actions {
    display: none;
  }

  .desktop-history-section {
    display: none;
  }

  .mobile-actions-backdrop {
    position: fixed;
    inset: 0;
    display: block;
    background: rgba(var(--backdrop-rgb), 0.65);
    touch-action: none;
    overscroll-behavior: contain;
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
    transform: translateY(calc(100% - 36px));
    transition: transform 0.2s ease;
    touch-action: none;
    overscroll-behavior: contain;
    pointer-events: none;
    z-index: 21;
  }

  .mobile-action-sheet.open {
    transform: translateY(0);
    pointer-events: auto;
  }

  .mobile-action-handle {
    pointer-events: auto;
    touch-action: none;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 5px;
    width: 100%;
    min-height: 36px;
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
    touch-action: manipulation;
  }
}
</style>