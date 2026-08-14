<script setup>
import { onMounted, onUnmounted, ref } from 'vue'
import { auth, initAuth } from './js/auth.js'
import { state as store, flushSave } from './js/data.js'
import { shiftDateStr, todayStr } from './js/date.js'
import { setLogDate, view } from './js/ui.js'
import AuthView from './components/AuthView.vue'
import DashboardView from './components/DashboardView.vue'
import ModalHost from './components/ModalHost.vue'
import ConfirmModal from './components/ConfirmModal.vue'

const swipeStart = ref(null)

function flushOnHide() {
  if (document.visibilityState === 'hidden') flushSave()
}

onMounted(() => {
  initAuth()
  document.addEventListener('visibilitychange', flushOnHide)
})

onUnmounted(() => document.removeEventListener('visibilitychange', flushOnHide))

function shiftDay(amount) {
  const next = shiftDateStr(view.logDate, amount)
  if (next <= todayStr()) setLogDate(next)
}

function onTouchStart(event) {
  if (!auth.user || !store.loaded) return
  const touch = event.changedTouches[0]
  swipeStart.value = { x: touch.clientX, y: touch.clientY }
}

function onTouchEnd(event) {
  if (!swipeStart.value) return
  const touch = event.changedTouches[0]
  const deltaX = touch.clientX - swipeStart.value.x
  const deltaY = touch.clientY - swipeStart.value.y
  swipeStart.value = null
  if (Math.abs(deltaX) < 50 || Math.abs(deltaX) <= Math.abs(deltaY)) return
  shiftDay(deltaX < 0 ? 1 : -1)
}
</script>

<template>
  <div class="app-shell" @touchstart.passive="onTouchStart" @touchend.passive="onTouchEnd">
    <div v-if="!auth.ready" class="loading-state">Loading your pantry…</div>
    <AuthView v-else-if="!auth.user" />
    <DashboardView v-else-if="store.loaded" />
    <div v-else class="loading-state">Loading your pantry…</div>
  </div>

  <ModalHost />
  <ConfirmModal />
</template>