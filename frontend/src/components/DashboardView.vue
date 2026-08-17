<script setup>
import { computed, ref, watch } from 'vue'
import { state as store, getLog, logEntries } from '../js/data.js'
import { view, clearDragState, dateNavDirection, boundaryBounce } from '../js/ui.js'
import { Modals, modalStack, openModal } from '../js/modals.js'
import { confirmState } from '../js/confirm.js'
import DateNav from './DateNav.vue'
import CalorieSummary from './CalorieSummary.vue'
import FoodGroupList from './FoodGroupList.vue'
import MobileActionSheet from './MobileActionSheet.vue'

const log = computed(() => getLog(view.logDate))
const groups = computed(() => view.dashboardEditMode ? store.groups : store.groups.filter((group) => group.visible !== false))
const hiddenLoggedGroups = computed(() => {
  const hiddenIds = new Set(store.groups.filter((group) => group.visible === false).map((group) => group.id))
  const ids = new Set(logEntries(log.value).filter((entry) => hiddenIds.has(entry.groupId)).map((entry) => entry.groupId))
  return store.groups.filter((group) => ids.has(group.id))
})

const dayLocked = computed(() => store.allowPreviousDayLocking && view.logDate < new Date().toISOString().slice(0, 10))
const hasOpenModal = computed(() => modalStack.length > 0 || confirmState.open)
const activeStepperId = ref(null)
watch(dayLocked, (locked) => {
  if (locked) {
    activeStepperId.value = null
    finishDashboardEdit()
  }
})

function finishDashboardEdit() {
  clearDragState()
  view.dashboardEditMode = false
}

function setActiveStepper(stepperId) {
  activeStepperId.value = stepperId
}

</script>

<template>
  <div class="home">
    <section class="manage-section">
      <div class="manage-actions desktop-manage-actions">
        <button class="manage-toggle group-add-button" type="button" @click="openModal(Modals.FOOD_MANAGER)">
          <span class="desktop-manage-icon desktop-manage-icon-foods" aria-hidden="true"></span> Foods
        </button>
        <button class="manage-toggle group-add-button" type="button" @click="openModal(Modals.GROUP_MANAGER)">
          <span class="desktop-manage-icon desktop-manage-icon-groups" aria-hidden="true"></span> Groups
        </button>
        <button class="manage-toggle group-add-button" type="button" @click="openModal(Modals.ACTIVITY)">
          <span class="desktop-manage-icon desktop-manage-icon-activity" aria-hidden="true"></span> Activity
        </button>
        <button class="manage-toggle group-add-button" type="button" @click="openModal(Modals.TRENDS)">
          <span class="desktop-manage-icon desktop-manage-icon-trends" aria-hidden="true"></span> Trends
        </button>
        <button v-if="!view.dashboardEditMode" class="manage-toggle group-add-button" type="button"
          @click="view.dashboardEditMode = true">
          <span class="desktop-manage-icon desktop-manage-icon-edit" aria-hidden="true"></span> Dashboard
        </button>
        <button v-else-if="view.dashboardEditMode" class="manage-toggle group-add-button" type="button"
          @click="finishDashboardEdit">
          <span class="desktop-manage-icon desktop-manage-icon-done" aria-hidden="true"></span> Done
        </button>
        <button class="manage-toggle group-add-button" type="button" @click="openModal(Modals.SETTINGS)">
          <span class="desktop-manage-icon desktop-manage-icon-settings" aria-hidden="true"></span> Settings
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
          <span>Past day foods can't be selected. <button type="button" @click="openModal(Modals.SETTINGS)">Edit in
              Settings</button></span>
        </div>

        <section v-for="group in groups" :key="group.id" class="today-group-card">
          <FoodGroupList :group="group" :log="log" :edit-mode="view.dashboardEditMode" :locked="dayLocked"
            :active-stepper-id="activeStepperId" @update:active-stepper-id="setActiveStepper" />
        </section>
      </div>
    </Transition>
    <MobileActionSheet :has-open-modal="hasOpenModal" />

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
  0% {
    transform: translateX(0);
  }

  28% {
    transform: translateX(-10px);
  }

  60% {
    transform: translateX(5px);
  }

  82% {
    transform: translateX(-2px);
  }

  100% {
    transform: translateX(0);
  }
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

.manage-actions {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 18px;
  padding: 18px;
}

.manage-toggle {
  width: 100%;
  color: var(--green);
}

.manage-toggle:hover {
  color: var(--green-strong);
}

.desktop-manage-icon {
  position: relative;
  display: inline-block;
  width: 15px;
  height: 15px;
  margin-right: 5px;
  vertical-align: -2px;
  color: currentColor;
}

.desktop-manage-icon-foods {
  border: 2px solid currentColor;
  border-radius: 3px;
}

.desktop-manage-icon-foods::before,
.desktop-manage-icon-foods::after {
  position: absolute;
  left: 3px;
  width: 6px;
  height: 2px;
  background: currentColor;
  content: '';
}

.desktop-manage-icon-foods::before { top: 3px; }
.desktop-manage-icon-foods::after { bottom: 3px; }

.desktop-manage-icon-groups::before,
.desktop-manage-icon-groups::after {
  position: absolute;
  bottom: 0;
  width: 6px;
  border: 2px solid currentColor;
  border-radius: 2px;
  content: '';
}

.desktop-manage-icon-groups::before { left: 0; height: 9px; }
.desktop-manage-icon-groups::after { right: 0; height: 12px; }

.desktop-manage-icon-activity {
  border: 2px solid currentColor;
  border-radius: 50%;
}

.desktop-manage-icon-activity::before,
.desktop-manage-icon-activity::after {
  position: absolute;
  left: 6px;
  top: 2px;
  width: 2px;
  height: 5px;
  border-radius: 2px;
  background: currentColor;
  content: '';
  transform-origin: bottom center;
}

.desktop-manage-icon-activity::after { transform: rotate(120deg); }

.desktop-manage-icon-trends {
  border-bottom: 2px solid currentColor;
  border-left: 2px solid currentColor;
}

.desktop-manage-icon-trends::before,
.desktop-manage-icon-trends::after {
  position: absolute;
  bottom: 0;
  width: 3px;
  background: currentColor;
  content: '';
}

.desktop-manage-icon-trends::before { left: 4px; height: 7px; }
.desktop-manage-icon-trends::after { right: 1px; height: 11px; }

.desktop-manage-icon-edit::before {
  position: absolute;
  left: 6px;
  top: 0;
  width: 4px;
  height: 15px;
  border-radius: 2px;
  background: currentColor;
  content: '';
  transform: rotate(45deg);
}

.desktop-manage-icon-done::before {
  position: absolute;
  left: 2px;
  top: 5px;
  width: 10px;
  height: 5px;
  border-bottom: 2px solid currentColor;
  border-left: 2px solid currentColor;
  content: '';
  transform: rotate(-45deg);
}

.desktop-manage-icon-settings {
  border: 2px solid currentColor;
  border-radius: 50%;
}

.desktop-manage-icon-settings::before {
  position: absolute;
  inset: 3px;
  border: 2px solid currentColor;
  border-radius: 50%;
  content: '';
}

.mobile-action-sheet,
.mobile-actions-backdrop {
  display: none;
}

@media (max-width: 600px) {
  .home {
    padding-bottom: calc(38px + env(safe-area-inset-bottom));
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
    display: flex;
    align-items: center;
    gap: 10px;
    min-height: 42px;
    padding: 9px 12px;
    border: 1px solid var(--line);
    border-radius: 9px;
    background: var(--surface-alt);
    color: var(--ink);
    text-align: left;
    touch-action: manipulation;
  }

  .mobile-action-icon {
    position: relative;
    flex: 0 0 18px;
    width: 18px;
    height: 18px;
    color: var(--green);
  }

  .mobile-action-icon-summary {
    border-bottom: 2px solid currentColor;
    border-left: 2px solid currentColor;
  }

  .mobile-action-icon-summary::before,
  .mobile-action-icon-summary::after {
    position: absolute;
    bottom: 1px;
    width: 3px;
    border-radius: 2px;
    background: currentColor;
    content: '';
  }

  .mobile-action-icon-summary::before {
    left: 5px;
    height: 8px;
  }

  .mobile-action-icon-summary::after {
    right: 2px;
    height: 13px;
  }

  .mobile-action-icon-activity {
    border: 2px solid currentColor;
    border-radius: 50%;
  }

  .mobile-action-icon-activity::before,
  .mobile-action-icon-activity::after {
    position: absolute;
    left: 7px;
    top: 3px;
    width: 2px;
    height: 6px;
    border-radius: 2px;
    background: currentColor;
    content: '';
    transform-origin: bottom center;
  }

  .mobile-action-icon-activity::before {
    transform: rotate(0deg);
  }

  .mobile-action-icon-activity::after {
    transform: rotate(120deg);
  }

  .mobile-action-icon-foods {
    border: 2px solid currentColor;
    border-radius: 3px;
  }

  .mobile-action-icon-foods::before,
  .mobile-action-icon-foods::after {
    position: absolute;
    left: 3px;
    width: 8px;
    height: 2px;
    border-radius: 2px;
    background: currentColor;
    content: '';
  }

  .mobile-action-icon-foods::before {
    top: 4px;
  }

  .mobile-action-icon-foods::after {
    bottom: 4px;
  }

  .mobile-action-icon-groups::before,
  .mobile-action-icon-groups::after {
    position: absolute;
    bottom: 1px;
    width: 7px;
    border: 2px solid currentColor;
    border-radius: 2px;
    content: '';
  }

  .mobile-action-icon-groups::before {
    left: 1px;
    height: 11px;
  }

  .mobile-action-icon-groups::after {
    right: 1px;
    height: 15px;
  }

  .mobile-action-icon-settings {
    border: 2px solid currentColor;
    border-radius: 50%;
  }

  .mobile-action-icon-settings::before {
    position: absolute;
    inset: 4px;
    border: 2px solid currentColor;
    border-radius: 50%;
    content: '';
  }
}
</style>