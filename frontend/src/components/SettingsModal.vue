<script setup>
import { computed } from 'vue'
import BaseModal from './BaseModal.vue'
import ToggleSwitch from './ToggleSwitch.vue'
import {
  state as store,
  setMaintenance,
  setShowKcal,
  setWeightUnit,
  setAllowPreviousDayLocking,
  snapshot,
  flushSave,
} from '../js/data.js'
import { isDark, toggleTheme } from '../js/ui.js'
import { auth, signOut } from '../js/auth.js'
import { closeAllModals, Modals, openModal } from '../js/modals.js'

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

const allowPreviousDayLocking = computed({
  get: () => store.allowPreviousDayLocking,
  set: (value) => setAllowPreviousDayLocking(value),
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
  <BaseModal title="Settings" subtitle="Personalize your app, data, and account settings." panel-class="settings-modal" @close="emit('close')">
    <div class="settings-sections">
      <section class="settings-section">
        <div class="section-label">Values</div>
        <div class="settings-row">
          <label for="maintenanceInput">Daily maintenance calories</label>
          <input id="maintenanceInput" type="number" min="1" step="10" :value="store.maintenanceCal"
            @change="setMaintenance($event.target.value)" />
        </div>
        <div class="settings-row">
          <label>Weight display</label>
          <select v-model="weightUnit" class="unit-select">
            <option value="kg">kg</option>
            <option value="lb">lb</option>
          </select>
        </div>
      </section>

      <section class="settings-section">
        <div class="section-label">Appearance</div>
        <div class="settings-row">
          <label>Dark mode</label>
          <ToggleSwitch v-model="darkMode" label="Toggle dark mode" :knob="isDark ? '🌙' : '☀️'" />
        </div>
        <div class="settings-row">
          <label>Show kcal on chips</label>
          <ToggleSwitch v-model="showKcal" label="Toggle kcal on chips" />
        </div>
      </section>

      <section class="settings-section">
        <div class="section-label">Behavior</div>
        <div class="settings-row">
          <label>Lock past days</label>
          <ToggleSwitch v-model="allowPreviousDayLocking" label="Allow locking previous days" />
        </div>
        <div class="settings-info-note">
          <span aria-hidden="true">ⓘ</span>
          <span>Food items from previous days can't be selected. Helps prevent accidental changes. Updates still apply to logged food.</span>
        </div>
      </section>

      <section class="settings-section">
        <div class="section-label">Data</div>
        <div class="settings-row data-actions">
          <label>Import data</label>
          <button class="btn btn-secondary" aria-label="Import data" @click="openModal(Modals.IMPORT_DATA)">↑</button>
        </div>
        <div class="settings-row data-actions">
          <label>Download data</label>
          <button class="btn btn-secondary" aria-label="Download data" @click="exportData">↓</button>
        </div>
      </section>

      <section class="settings-section">
        <div class="section-label">Account</div>
        <div class="settings-row account-row">
          <div class="settings-account">
            <span>Signed in as <strong>{{ auth.user?.username || 'Unknown user' }}</strong></span>
          </div>
          <button class="btn btn-danger-outline" @click="logOut">
            ↪ Log out
          </button>
        </div>
      </section>
    </div>
  </BaseModal>
</template>
<style scoped>
.settings-sections {
  min-height: 0;
  max-height: min(560px, 100vh);
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-right: 4px;
}

.settings-section {
  padding: 12px 10px;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: color-mix(in srgb, var(--surface) 88%, var(--surface-alt));
}

.settings-section > :not(.section-label) {
  margin-right: 0;
  margin-left: 0;
}

.settings-section .section-label {
  padding: 0;
}

.settings-section + .settings-section {
  padding-top: 12px;
}

.settings-section .section-label {
  margin: 0 0 10px;
  color: var(--ink);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.settings-account {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 2px 0;
  color: var(--ink-muted);
  font-size: 13px;
}

.settings-account strong {
  color: var(--ink);
  font-family: 'IBM Plex Mono', monospace;
  font-size: 12px;
}

.settings-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.settings-row + .settings-row {
  margin-top: 12px;
}

.settings-row label {
  font-size: 13px;
  color: var(--ink-muted);
}

.settings-info-note {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  margin: 9px 0 0;
  padding-top: 8px;
  border-top: 1px solid var(--line);
  color: var(--ink-muted);
  font-size: 11px;
  line-height: 1.4;
}

.settings-info-note > span:first-child {
  flex: none;
  color: var(--green);
  font-size: 13px;
  line-height: 1;
}

.data-actions {
  min-height: 42px;
}

.data-actions+.data-actions {
  margin-top: 8px;
}

.settings-row input,
.unit-select {
  width: 92px;
  padding: 9px 10px;
  border: 1px solid var(--line);
  border-radius: 9px;
  background: var(--bg);
  font-family: "IBM Plex Mono", monospace;
  text-align: center;
}

.unit-select {
  appearance: none;
  -webkit-appearance: none;
  -moz-appearance: none;
  padding-right: 26px;
  background-image: linear-gradient(45deg, transparent 50%, var(--ink-muted) 50%),
    linear-gradient(135deg, var(--ink-muted) 50%, transparent 50%);
  background-repeat: no-repeat;
  background-position: calc(100% - 15px) 50%, calc(100% - 10px) 50%;
  background-size: 5px 5px, 5px 5px;
  text-align: center;
}
</style>