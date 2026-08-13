<script setup>
import { onMounted, onUnmounted } from 'vue'
import { auth, initAuth } from './js/auth.js'
import { state as store, flushSave } from './js/data.js'
import AuthView from './components/AuthView.vue'
import DashboardView from './components/DashboardView.vue'
import ModalHost from './components/ModalHost.vue'
import ConfirmModal from './components/ConfirmModal.vue'

function flushOnHide() {
  if (document.visibilityState === 'hidden') flushSave()
}

onMounted(() => {
  initAuth()
  document.addEventListener('visibilitychange', flushOnHide)
})

onUnmounted(() => document.removeEventListener('visibilitychange', flushOnHide))
</script>

<template>
  <div class="app-shell">
    <div v-if="!auth.ready" class="loading-state">Loading your pantry…</div>
    <AuthView v-else-if="!auth.user" />
    <DashboardView v-else-if="store.loaded" />
    <div v-else class="loading-state">Loading your pantry…</div>
  </div>

  <ModalHost />
  <ConfirmModal />
</template>