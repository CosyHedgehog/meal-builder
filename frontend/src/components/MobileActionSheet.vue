<script setup>
import { onMounted, onUnmounted, ref } from 'vue'
import { Modals, openModal } from '../js/modals.js'

const props = defineProps({
  hasOpenModal: { type: Boolean, default: false },
})

const mobileActionsOpen = ref(false)
const mobileActionStartY = ref(null)

function openMobileActions() {
  if (mobileActionsOpen.value) return
  mobileActionsOpen.value = true
  history.pushState({ mealBuilderActions: true }, '')
}

function closeMobileActions() {
  mobileActionsOpen.value = false
}

function toggleMobileActions() {
  if (mobileActionsOpen.value) closeMobileActions()
  else openMobileActions()
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

function openAction(modal) {
  openModal(modal)
  closeMobileActions()
}

onMounted(() => window.addEventListener('popstate', onMobileActionsPopState))
onUnmounted(() => window.removeEventListener('popstate', onMobileActionsPopState))
</script>

<template>
  <div v-if="mobileActionsOpen && !props.hasOpenModal" class="mobile-actions-backdrop" @click="closeMobileActions" @touchmove.prevent></div>
  <section v-show="!props.hasOpenModal" class="mobile-action-sheet" :class="{ open: mobileActionsOpen }" aria-label="Dashboard actions"
    @touchstart="startMobileActionSwipe" @touchmove.prevent @touchend="endMobileActionSwipe">
    <button class="mobile-action-handle" type="button" aria-label="Show dashboard actions" @click="toggleMobileActions">
      <span aria-hidden="true">{{ mobileActionsOpen ? '↓' : '↑' }}</span> Manage
    </button>
    <div class="mobile-action-list" :aria-hidden="!mobileActionsOpen">
      <button type="button" :tabindex="mobileActionsOpen ? 0 : -1" @click="openAction(Modals.TRENDS)">
        <span class="mobile-action-icon mobile-action-icon-summary" aria-hidden="true"></span> Summary
      </button>
      <button type="button" :tabindex="mobileActionsOpen ? 0 : -1" @click="openAction(Modals.FOOD_MANAGER)">
        <span class="mobile-action-icon mobile-action-icon-foods" aria-hidden="true"></span> Foods
      </button>
      <button type="button" :tabindex="mobileActionsOpen ? 0 : -1" @click="openAction(Modals.GROUP_MANAGER)">
        <span class="mobile-action-icon mobile-action-icon-groups" aria-hidden="true"></span> Groups
      </button>
      <button type="button" :tabindex="mobileActionsOpen ? 0 : -1" @click="openAction(Modals.ACTIVITY)">
        <span class="mobile-action-icon mobile-action-icon-activity" aria-hidden="true"></span> Activity
      </button>
      <button type="button" :tabindex="mobileActionsOpen ? 0 : -1" @click="openAction(Modals.SETTINGS)">
        <span class="mobile-action-icon mobile-action-icon-settings" aria-hidden="true"></span> Settings
      </button>
    </div>
  </section>
</template>

<style scoped>
.mobile-action-sheet,
.mobile-actions-backdrop {
  display: none;
}

@media (max-width: 600px) {
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
    transform: translateY(calc(100% - 37px));
    transition: transform 0.2s ease;
    z-index: 25;
  }

  .mobile-action-sheet.open {
    transform: translateY(0);
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

  .mobile-action-icon-summary::before { left: 5px; height: 8px; }
  .mobile-action-icon-summary::after { right: 2px; height: 13px; }

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

  .mobile-action-icon-activity::after { transform: rotate(120deg); }

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

  .mobile-action-icon-foods::before { top: 4px; }
  .mobile-action-icon-foods::after { bottom: 4px; }

  .mobile-action-icon-groups::before,
  .mobile-action-icon-groups::after {
    position: absolute;
    bottom: 1px;
    width: 7px;
    border: 2px solid currentColor;
    border-radius: 2px;
    content: '';
  }

  .mobile-action-icon-groups::before { left: 1px; height: 11px; }
  .mobile-action-icon-groups::after { right: 1px; height: 15px; }

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
