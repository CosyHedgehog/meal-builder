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
  <div v-if="mobileActionsOpen && !props.hasOpenModal" class="mobile-actions-backdrop" @click="closeMobileActions"
    @touchmove.prevent></div>
  <section v-show="!props.hasOpenModal" class="mobile-action-sheet" :class="{ open: mobileActionsOpen }"
    aria-label="Dashboard actions" @touchstart="startMobileActionSwipe" @touchmove.prevent
    @touchend="endMobileActionSwipe">
    <button class="mobile-action-handle" type="button" aria-label="Show dashboard actions" @click="toggleMobileActions">
    </button>
    <div class="mobile-action-list" :aria-hidden="!mobileActionsOpen">
      <button type="button" :tabindex="mobileActionsOpen ? 0 : -1" @click="openAction(Modals.FOOD_MANAGER)">
        <span class="mobile-action-icon-chip">
        <svg class="mobile-action-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
          stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2" />
          <path d="M7 2v20" />
          <path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7" />
        </svg>
        </span>
        Foods
        <span class="mobile-action-chevron" aria-hidden="true">›</span>
      </button>
      <button type="button" :tabindex="mobileActionsOpen ? 0 : -1" @click="openAction(Modals.GROUP_MANAGER)">
        <span class="mobile-action-icon-chip">
        <svg class="mobile-action-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
          stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <rect width="7" height="7" x="3" y="3" rx="1.5" />
          <rect width="7" height="7" x="14" y="3" rx="1.5" />
          <rect width="7" height="7" x="14" y="14" rx="1.5" />
          <rect width="7" height="7" x="3" y="14" rx="1.5" />
        </svg>
        </span>
        Groups
        <span class="mobile-action-chevron" aria-hidden="true">›</span>
      </button>
      <button type="button" :tabindex="mobileActionsOpen ? 0 : -1" @click="openAction(Modals.TRENDS)">
        <span class="mobile-action-icon-chip">
        <svg class="mobile-action-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
          stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
          <polyline points="16 7 22 7 22 13" />
        </svg>
        </span>
        Trends
        <span class="mobile-action-chevron" aria-hidden="true">›</span>
      </button>
      <button type="button" :tabindex="mobileActionsOpen ? 0 : -1" @click="openAction(Modals.ACTIVITY)">
        <span class="mobile-action-icon-chip">
        <svg class="mobile-action-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
          stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
        </svg>
        </span>
        Activity
        <span class="mobile-action-chevron" aria-hidden="true">›</span>
      </button>
      <button type="button" :tabindex="mobileActionsOpen ? 0 : -1" @click="openAction(Modals.SETTINGS)">
        <span class="mobile-action-icon-chip">
        <svg class="mobile-action-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
          stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path
            d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
        </span>
        Settings
        <span class="mobile-action-chevron" aria-hidden="true">›</span>
      </button>
    </div>
  </section>
</template>

<style scoped>
.mobile-actions-backdrop {
  display: none;
}

.mobile-action-sheet {
  position: fixed;
  right: max(12px, calc((100vw - 632px) / 2));
  bottom: 0;
  left: max(12px, calc((100vw - 632px) / 2));
  display: block;
  padding-bottom: env(safe-area-inset-bottom);
  border: 1px solid var(--line);
  border-bottom: 0;
  border-radius: 14px 14px 0 0;
  background: var(--surface);
  transform: translateY(calc(100% - 48px));
  transition: transform 0.2s ease;
  z-index: 25;
}

.mobile-action-sheet.open {
  transform: translateY(0);
}

.mobile-action-handle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 20px;
  padding: 8px 0 4px;
  border: 0;
  background: transparent;
  color: var(--ink);
  font-weight: 700;
}

.mobile-action-handle::before {
  content: '';
  width: 36px;
  height: 4px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--ink) 15%, transparent);
}

.mobile-action-handle:focus-visible {
  outline: none;
}

.mobile-action-list {
  display: grid;
  gap: 0;
  padding: 0 12px 10px;
}

.mobile-action-list button {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 56px;
  padding: 10px 12px;
  border: 0;
  border-radius: 12px;
  background: transparent;
  color: var(--ink);
  text-align: left;
  touch-action: manipulation;
}

.mobile-action-list button:hover,
.mobile-action-list button:focus-visible {
  background: color-mix(in srgb, var(--ink) 5%, transparent);
}

.mobile-action-icon-chip {
  display: inline-flex;
  flex: 0 0 36px;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: color-mix(in srgb, var(--green) 12%, transparent);
  color: var(--green);
}

.mobile-action-chevron {
  margin-left: auto;
  color: color-mix(in srgb, var(--ink) 22%, transparent);
  font-size: 22px;
  line-height: 1;
}

@media (min-width: 601px) {
  .mobile-action-sheet {
    display: none;
  }
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

  .mobile-action-handle {
    pointer-events: auto;
    touch-action: none;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 20px;
    padding: 8px 0 4px;
    margin: 0;
    border-radius: 12px;
    background: rgba(255, 255, 255, 0.05);
    border: 0;
    background: transparent;
    color: var(--green);
    font-weight: 700;
  }

  .mobile-action-sheet {
    right: 18px;
    left: 18px;
    padding: 0 8px env(safe-area-inset-bottom);
    border-radius: 12px 12px 0 0;
    transform: translateY(calc(100% - 28px));
  }

  .mobile-action-list {
    gap: 0;
    padding: 0 12px 10px;
  }

  .mobile-action-list button {
    display: flex;
    align-items: center;
    gap: 12px;
    min-height: 56px;
    padding: 10px 12px;
    border: 0;
    border-radius: 12px;
    background: transparent;
  }

  .mobile-action-icon {
    width: 17px;
    height: 17px;
    color: var(--green);
  }
}
</style>
