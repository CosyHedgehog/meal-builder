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
          <svg class="desktop-manage-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2" />
            <path d="M7 2v20" />
            <path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7" />
          </svg>
          Foods
        </button>
        <button class="manage-toggle group-add-button" type="button" @click="openModal(Modals.GROUP_MANAGER)">
          <svg class="desktop-manage-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <rect width="7" height="7" x="3" y="3" rx="1.5" />
            <rect width="7" height="7" x="14" y="3" rx="1.5" />
            <rect width="7" height="7" x="14" y="14" rx="1.5" />
            <rect width="7" height="7" x="3" y="14" rx="1.5" />
          </svg>
          Groups
        </button>
        <button class="manage-toggle group-add-button" type="button" @click="openModal(Modals.ACTIVITY)">
          <svg class="desktop-manage-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
          </svg>
          Activity
        </button>
        <button class="manage-toggle group-add-button" type="button" @click="openModal(Modals.TRENDS)">
          <svg class="desktop-manage-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
            <polyline points="16 7 22 7 22 13" />
          </svg>
          Trends
        </button>
        <button v-if="!view.dashboardEditMode" class="manage-toggle group-add-button" type="button"
          @click="view.dashboardEditMode = true">
          <svg class="desktop-manage-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <rect width="7" height="9" x="3" y="3" rx="1.5" />
            <rect width="7" height="5" x="14" y="3" rx="1.5" />
            <rect width="7" height="9" x="14" y="12" rx="1.5" />
            <rect width="7" height="5" x="3" y="16" rx="1.5" />
          </svg>
          Dashboard
        </button>
        <button v-else-if="view.dashboardEditMode" class="manage-toggle group-add-button" type="button"
          @click="finishDashboardEdit">
          <svg class="desktop-manage-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          Done
        </button>
        <button class="manage-toggle group-add-button" type="button" @click="openModal(Modals.SETTINGS)">
          <svg class="desktop-manage-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
          Settings
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
  display: inline-block;
  width: 15px;
  height: 15px;
  margin-right: 5px;
  vertical-align: -2px;
  flex-shrink: 0;
  color: currentColor;
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
}
</style>