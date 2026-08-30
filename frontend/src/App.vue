<script setup>
import { onMounted, onUnmounted, ref } from 'vue'
import { auth, initAuth } from './js/auth.js'
import { state as store, flushSave } from './js/data.js'
import { shiftDateStr, todayStr } from './js/date.js'
import { setLogDate, triggerDateBoundaryBounce, view } from './js/ui.js'
import AuthView from './components/AuthView.vue'
import DashboardView from './components/DashboardView.vue'
import ModalHost from './components/ModalHost.vue'
import ConfirmModal from './components/ConfirmModal.vue'

const swipeStart = ref(null)
let normalViewportHeight = 0

function flushOnHide() {
  if (document.visibilityState === 'hidden') flushSave()
}

onMounted(() => {
  initAuth()
  document.addEventListener('visibilitychange', flushOnHide)
  normalViewportHeight = window.visualViewport?.height || window.innerHeight
  window.visualViewport?.addEventListener('resize', onViewportResize)
})

onUnmounted(() => {
  document.removeEventListener('visibilitychange', flushOnHide)
  window.visualViewport?.removeEventListener('resize', onViewportResize)
})

function onViewportResize() {
  const viewportHeight = window.visualViewport?.height || window.innerHeight
  if (viewportHeight > normalViewportHeight) normalViewportHeight = viewportHeight
  if (viewportHeight < normalViewportHeight * 0.9) return
  if (window.scrollY > 0) window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
}

function shiftDay(amount) {
  const next = shiftDateStr(view.logDate, amount)
  if (next <= todayStr()) {
    setLogDate(next)
  } else {
    triggerDateBoundaryBounce()
  }
}

function onTouchStart(event) {
  if (!auth.user || !store.loaded) return
  if (event.target.closest('.mobile-action-sheet, .modal, .modal-backdrop, .mobile-actions-backdrop')) return
  const touch = event.changedTouches[0]
  view.dragConsumedSwipe = false
  swipeStart.value = { x: touch.clientX, y: touch.clientY }
}

function onTouchEnd(event) {
  if (!swipeStart.value) return
  const touch = event.changedTouches[0]
  const deltaX = touch.clientX - swipeStart.value.x
  const deltaY = touch.clientY - swipeStart.value.y
  swipeStart.value = null
  if (view.dragConsumedSwipe) {
    view.dragConsumedSwipe = false
    return
  }
  if (Math.abs(deltaX) < 50 || Math.abs(deltaX) <= Math.abs(deltaY)) return
  shiftDay(deltaX < 0 ? 1 : -1)
}
</script>

<template>
  <div class="app-touch-surface" @touchstart.passive="onTouchStart" @touchend.passive="onTouchEnd">
    <div class="app-shell">
      <div v-if="!auth.ready" class="loading-state">Loading your pantry…</div>
      <AuthView v-else-if="!auth.user" />
      <DashboardView v-else-if="store.loaded" />
      <div v-else class="loading-state">Loading your pantry…</div>
    </div>
  </div>

  <ModalHost />
  <ConfirmModal />
</template>