<script setup>
import { computed } from 'vue'
import BaseModal from './BaseModal.vue'
import ToggleSwitch from './ToggleSwitch.vue'
import {
  state as store,
  setMaintenance,
  setShowKcal,
  setWeightUnit,
  snapshot,
  flushSave,
} from '../js/data.js'
import { isDark, toggleTheme } from '../js/ui.js'
import { signOut } from '../js/auth.js'
import { closeAllModals } from '../js/modals.js'

const emit = defineEmits(['close'])

const darkMode = computed({
  get: () => isDark.value,
  set: () => toggleTheme(),
})

const showKcal = computed({
  get: () => store.showKcal,
  set: (value) => setShowKcal(value),
})

const weightUnit = computed({
  get: () => store.weightUnit,
  set: (value) => setWeightUnit(value),
})

function exportData() {
  downloadJSON('meal-builder-export.json', snapshot())
}

async function logOut() {
  await flushSave()
  closeAllModals()
  await signOut()
}

function downloadJSON(filename, payload) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
</script>

<template>
  <BaseModal title="Settings" subtitle="A couple of account and app settings." @close="emit('close')">
    <div class="section-label">Values</div>
    <div class="settings-row">
      <label for="maintenanceInput">Daily maintenance calories</label>
      <input id="maintenanceInput" type="number" min="1" step="10" :value="store.maintenanceCal"
        @change="setMaintenance($event.target.value)" />
    </div>

    <div class="section-label" style="margin-top: 16px">Appearance</div>
    <div class="settings-row">
      <label>Weight display</label>
      <select v-model="weightUnit" class="unit-select">
        <option value="kg">kg</option>
        <option value="lb">lb</option>
      </select>
    </div>
    <div class="settings-row" style="margin-top: 12px">
      <label>Dark mode</label>
      <ToggleSwitch v-model="darkMode" label="Toggle dark mode" :knob="isDark ? '🌙' : '☀️'" />
    </div>
    <div class="settings-row" style="margin-top: 12px">
      <label>Show kcal on chips</label>
      <ToggleSwitch v-model="showKcal" label="Toggle kcal on chips" />
    </div>

    <button class="btn btn-secondary primary-wide" @click="exportData">Download data</button>
    <button class="btn btn-secondary primary-wide" @click="logOut">
      Log out
    </button>
  </BaseModal>
</template>
<style scoped>
.settings-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.settings-row label {
  font-size: 13px;
}

.settings-row input,
.unit-select {
  width: 92px;
  padding: 9px 10px;
  border: 1px solid var(--line);
  border-radius: 9px;
  background: var(--bg);
  font-family: "IBM Plex Mono", monospace;
  text-align: right;
}

.unit-select {
  appearance: none;
  text-align: center;
}
</style>