<script setup>
import { computed, ref, watch } from 'vue'
import { state as store, getLog, logEntries } from '../js/data.js'
import { view, dateNavDirection, boundaryBounce } from '../js/ui.js'
import { Modals, modalStack, openModal } from '../js/modals.js'
import { confirmState } from '../js/confirm.js'
import DateNav from './DateNav.vue'
import CalorieSummary from './CalorieSummary.vue'
import FoodGroupList from './FoodGroupList.vue'
import MobileActionSheet from './MobileActionSheet.vue'

const log = computed(() => getLog(view.logDate))
const groups = computed(() => store.groups.filter((group) => group.visible !== false))
const hiddenLoggedGroups = computed(() => {
  const hiddenIds = new Set(store.groups.filter((group) => group.visible === false).map((group) => group.id))
  const ids = new Set(logEntries(log.value).filter((entry) => hiddenIds.has(entry.groupId)).map((entry) => entry.groupId))
  return store.groups.filter((group) => ids.has(group.id))
})

const dayLocked = computed(() => store.allowPreviousDayLocking && view.logDate < new Date().toISOString().slice(0, 10))
const hasOpenModal = computed(() => modalStack.length > 0 || confirmState.open)
const activeStepperId = ref(null)
watch(dayLocked, (locked) => {
  if (locked) activeStepperId.value = null
})

function setActiveStepper(stepperId) {
  activeStepperId.value = stepperId
}

</script>

<template>
  <div class="home">
    <section class="manage-section legacy-manage-section desktop-nav">
      <div class="desktop-nav-inner">
        <div class="manage-actions desktop-manage-actions">
        <button class="desktop-nav-button" type="button" @click="openModal(Modals.FOOD_MANAGER)">
          <svg class="desktop-manage-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
            stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2" />
            <path d="M7 2v20" />
            <path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7" />
          </svg>
          Foods
        </button>
        <button class="desktop-nav-button" type="button" @click="openModal(Modals.GROUP_MANAGER)">
          <svg class="desktop-manage-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
            stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <rect width="7" height="7" x="3" y="3" rx="1.5" />
            <rect width="7" height="7" x="14" y="3" rx="1.5" />
            <rect width="7" height="7" x="14" y="14" rx="1.5" />
            <rect width="7" height="7" x="3" y="14" rx="1.5" />
          </svg>
          Groups
        </button>
        <button class="desktop-nav-button" type="button" @click="openModal(Modals.TRENDS)">
          <svg class="desktop-manage-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
            stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
            <polyline points="16 7 22 7 22 13" />
          </svg>
          Trends
        </button>
        <button class="desktop-nav-button" type="button" @click="openModal(Modals.ACTIVITY)">
          <svg class="desktop-manage-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
            stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
          </svg>
          Activity
        </button>
        <button class="desktop-nav-button" type="button" @click="openModal(Modals.SETTINGS)">
          <svg class="desktop-manage-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
            stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path
              d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
          Settings
        </button>
        </div>
      </div>
    </section>
    <DateNav />

    <Transition :name="`day-slide-${dateNavDirection}`" mode="out-in">
      <div :key="view.logDate" class="day-flow" :class="{ 'boundary-bounce': boundaryBounce }">
        <section class="today-card">
          <CalorieSummary :log="log" />
        </section>

        <div class="day-scroll">
          <div v-if="hiddenLoggedGroups.length" class="hidden-food-note">
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
            <FoodGroupList :group="group" :log="log" :locked="dayLocked"
              :active-stepper-id="activeStepperId" @update:active-stepper-id="setActiveStepper" />
          </section>
        </div>
      </div>
    </Transition>
    <MobileActionSheet :has-open-modal="hasOpenModal" />

  </div>
</template>

<style scoped>
.home {
  display: flex;
  flex-direction: column;
  --desktop-nav-height: 40px;
  overflow: visible;
  border: 0;
  border-radius: 24px;
  background: var(--bg);
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
  background: transparent;
  border: 0;
  border-radius: 18px;
  padding: 9px;
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

.legacy-manage-section {
  display: block;
}

.desktop-nav {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  margin-left: 0;
  border-bottom: 1px solid var(--line);
  background: var(--surface);
  z-index: 30;
}

.desktop-nav-inner {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 20px;
  max-width: 760px;
  margin: 0 auto;
}

@media (min-width: 601px) {
  .desktop-nav + .today-date-row {
    margin-top: var(--desktop-nav-height);
  }
}

.desktop-manage-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 4px;
  padding: 0;
}

.desktop-nav-button {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 32px;
  padding: 6px 10px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: color-mix(in srgb, var(--ink) 60%, transparent);
  font: inherit;
  font-size: 13px;
  white-space: nowrap;
  transition: background 0.15s ease, color 0.15s ease;
}

.desktop-nav-button:hover,
.desktop-nav-button:focus-visible {
  background: color-mix(in srgb, var(--ink) 5%, transparent);
  color: var(--ink);
  outline: none;
}

.desktop-nav-button.active {
  background: var(--green);
  color: #062119;
  font-weight: 600;
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
    height: 100dvh;
    min-height: 0;
    overflow: hidden;
    gap: 0;
    padding-bottom: 28px;
  }

  .day-flow {
    min-height: 0;
    flex: 1;
    gap: 0;
  }

  .today-date-row {
    flex: none;
    min-height: 36px;
    margin-bottom: 0;
  }

  .today-card {
    flex: none;
    padding: 5px 3px 8px;
  }

  .day-scroll {
    min-height: 0;
    flex: 1;
    overflow-y: auto;
    overscroll-behavior: contain;
    scrollbar-width: thin;
    padding-bottom: 10px;
  }

  .home {
    overflow: hidden;
    padding-bottom: calc(28px + env(safe-area-inset-bottom));
  }

  .today-card {
    border-right: 0;
    border-left: 0;
  }

  .today-group-card {
    width: 100%;
  }

  .desktop-manage-actions {
    display: none;
  }
  .legacy-manage-section {
    display: none;
  }
}
</style>
