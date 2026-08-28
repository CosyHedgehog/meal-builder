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
  setOneClickMode,
  setShareActivity,
  snapshot,
  flushSave,
} from '../js/data.js'
import { isDark, toggleTheme } from '../js/ui.js'
import { auth, signOut } from '../js/auth.js'
import { closeAllModals, Modals, openModal } from '../js/modals.js'
import { confirmAction } from '../js/confirm.js'

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

const oneClickMode = computed({
  get: () => store.oneClickMode,
  set: (value) => setOneClickMode(value),
})

const shareActivity = computed({
  get: () => store.shareActivity,
  set: (value) => setShareActivity(value),
})

function exportData() {
  downloadJSON('meal-builder-export.json', snapshot())
}

async function logOut() {
  await flushSave()
  closeAllModals()
  await signOut()
}

async function requestDeleteAccount() {
  const confirmed = await confirmAction({
    title: 'Delete account?',
    message: 'This permanently deletes your account and all associated data. This cannot be undone.',
    okLabel: 'Continue',
    okClass: 'btn-danger-outline',
  })
  if (confirmed) openModal(Modals.DELETE_ACCOUNT)
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
  <BaseModal title="Settings" subtitle="Personalize your app, data, and account" panel-class="settings-modal" @close="emit('close')">
    <div class="settings-sections">
      <section class="settings-section">
        <div class="section-label">Values</div>
        <div class="settings-card">
          <div class="settings-row">
            <label for="maintenanceInput">Daily maintenance calories</label>
            <input id="maintenanceInput" type="number" min="1" step="10" :value="store.maintenanceCal"
              @change="setMaintenance($event.target.value)" />
          </div>
          <div class="settings-row">
            <span class="settings-row-label">Weight display</span>
            <div class="unit-chips" role="radiogroup" aria-label="Weight display unit">
              <button v-for="unit in ['kg', 'lb']" :key="unit" type="button" role="radio"
                :aria-checked="weightUnit === unit" :class="{ active: weightUnit === unit }"
                @click="weightUnit = unit">
                {{ unit }}
              </button>
            </div>
          </div>
        </div>
      </section>

      <section class="settings-section">
        <div class="section-label">Appearance</div>
        <div class="settings-card">
          <div class="settings-row">
            <label>Dark mode</label>
            <ToggleSwitch v-model="darkMode" label="Toggle dark mode" />
          </div>
          <div class="settings-row">
            <label>Show kcal on chips</label>
            <ToggleSwitch v-model="showKcal" label="Toggle kcal on chips" />
          </div>
        </div>
      </section>

      <section class="settings-section">
        <div class="section-label">Behavior</div>
        <div class="settings-card">
          <div class="settings-option">
            <div class="settings-row">
              <label>Lock past days</label>
              <ToggleSwitch v-model="allowPreviousDayLocking" label="Allow locking previous days" />
            </div>
            <div class="settings-info-note">
              <span aria-hidden="true">ⓘ</span>
              <span>Food items from previous days can't be selected.</span>
            </div>
          </div>
          <div class="settings-option">
            <div class="settings-row">
              <label>One click mode</label>
              <ToggleSwitch v-model="oneClickMode" label="Toggle one click mode" />
            </div>
            <div class="settings-info-note">
              <span aria-hidden="true">ⓘ</span>
              <span>Clicking a food on the dashboard increments it.</span>
            </div>
          </div>
        </div>
      </section>

      <section class="settings-section">
        <div class="section-label">Data</div>
        <div class="settings-card">
          <div class="settings-option">
            <div class="settings-row">
              <label>Share activity</label>
              <ToggleSwitch v-model="shareActivity" label="Allow daily calories in Activity" />
            </div>
            <div class="settings-info-note">
              <span aria-hidden="true">ⓘ</span>
              <span>People who follow you can see your logged activity.</span>
            </div>
          </div>
          <div class="settings-row data-actions">
            <label>Import data</label>
            <button class="settings-action" aria-label="Import data" @click="openModal(Modals.IMPORT_DATA)">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 19V5M5 12l7-7 7 7" /></svg>
              Import
            </button>
          </div>
          <div class="settings-row data-actions">
            <label>Download data</label>
            <button class="settings-action" aria-label="Download data" @click="exportData">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12l7 7 7-7" /></svg>
              Download
            </button>
          </div>
        </div>
      </section>

      <section class="settings-section">
        <div class="section-label">Account</div>
        <div class="settings-card">
          <div class="settings-row account-row">
            <div class="settings-account">
              Signed in as<strong>{{auth.user?.username || 'Unknown user' }}</strong>
            </div>
            <button class="settings-action" type="button" @click="logOut">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" /></svg>
              Log out
            </button>
          </div>
          <div class="settings-option">
            <div class="settings-row account-row account-delete-row">
              <label>Delete account</label>
              <button class="settings-action settings-action-danger" type="button" @click="requestDeleteAccount">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 14h10l1-14M9 7V4h6v3" /></svg>
                Delete
              </button>
            </div>
            <div class="settings-info-note account-delete-note">
              <span aria-hidden="true">ⓘ</span>
              <span>Permanently removes your account, data, and settings. This action cannot be undone.</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  </BaseModal>
</template>
<style scoped>
:deep(.modal.settings-modal) {
  width: 450px;
  max-width: 92vw;
  padding: 20px;
  border-radius: 24px;
  overflow: hidden;
  /* The mockup does not load Inter; on Windows this stack resolves to Arial. */
  font-family: Arial, sans-serif;
}

:deep(.modal.settings-modal h2) {
  padding-right: 42px;
}

:deep(.modal.settings-modal > .subtitle) {
  margin: 4px -20px 0;
  padding: 0 20px 14px;
  border-bottom: 1px solid var(--line);
}

.settings-sections {
  flex: 1;
  min-height: 0;
  height: min(560px, calc(100dvh - 150px));
  max-height: min(560px, calc(100dvh - 150px));
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding-top: 16px;
  margin-right: -20px;
  padding-right: 20px;
  scrollbar-gutter: stable;
}

.settings-section {
  min-width: 0;
}

.settings-section .section-label {
  margin: 0 0 8px;
  color: var(--settings-muted);
  font-size: 12px;
  font-weight: 400;
  letter-spacing: 0.025em;
  text-transform: uppercase;
}

.settings-card {
  overflow: hidden;
  border-radius: 16px;
  background: var(--settings-card-bg);
}

.settings-account {
  display: flex;
  justify-content: space-between;
  gap: 5px;
  padding: 2px 0;
  color: var(--ink);
  font-size: 13px;
}

.settings-account strong {
  color: var(--ink);
  font-size: inherit;
  font-weight: 600;
}

.account-row .settings-action {
  width: auto;
  text-align: center;
}

.settings-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.settings-card > .settings-row,
.settings-option {
  padding: 10px 12px;
}

.settings-card > .settings-row + .settings-row,
.settings-option + .settings-option,
.settings-option + .settings-row,
.settings-row + .settings-option {
  border-top: 1px solid var(--line);
}

.settings-row label,
.settings-row-label {
  font-size: 13px;
  font-weight: 400;
  color: color-mix(in srgb, var(--ink) 80%, transparent);
}

.settings-info-note {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  margin: 7px 0 0;
  padding: 0;
  color: var(--ink-muted);
  font-size: 12px;
  line-height: 1.4;
}

.settings-info-note > span:first-child {
  flex: none;
  color: var(--green);
  font-size: 13px;
  line-height: 1;
}

.account-delete-note > span:first-child {
  color: var(--red);
}

.data-actions {
  min-height: 48px;
}

.settings-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-width: 0;
  padding: 6px 12px;
  border: 1px solid var(--line);
  border-radius: 9px;
  background: var(--settings-control-bg);
  color: var(--ink);
  font: 500 12px/1.1 Arial, sans-serif;
  cursor: pointer;
  transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease;
}

.settings-action:hover {
  background: var(--settings-control-hover);
  border-color: color-mix(in srgb, var(--ink-muted) 45%, transparent);
}

.settings-action svg {
  width: 14px;
  height: 14px;
  fill: none;
  stroke: currentColor;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 2;
}

.settings-action-danger {
  border-color: color-mix(in srgb, var(--red) 42%, transparent);
  background: color-mix(in srgb, var(--red) 11%, transparent);
  color: var(--red);
}

.settings-action-danger:hover {
  border-color: color-mix(in srgb, var(--red) 62%, transparent);
  background: color-mix(in srgb, var(--red) 18%, transparent);
  color: var(--red);
}

.settings-row input {
  width: 80px;
  padding: 5px 5px;
  border: 1px solid var(--line);
  border-radius: 9px;
  background: var(--settings-control-bg);
  color: var(--ink);
  font-family: inherit;
  font-size: 13px;
  text-align: center;
}

#maintenanceInput {
  width: 70px;
  appearance: textfield;
}

#maintenanceInput::-webkit-outer-spin-button,
#maintenanceInput::-webkit-inner-spin-button {
  margin: 0;
  appearance: none;
}

.unit-chips {
  display: inline-flex;
  gap: 3px;
  padding: 3px;
  border-radius: 9px;
  background: var(--settings-control-bg);
}

.unit-chips button {
  min-width: 34px;
  padding: 5px 8px;
  border: 1px solid transparent;
  border-radius: 6px;
  background: transparent;
  color: var(--ink-muted);
  font: 600 12px/1 Arial, sans-serif;
  cursor: pointer;
}

.unit-chips button:hover,
.unit-chips button:focus-visible {
  color: var(--ink);
}

.unit-chips button.active {
  border-color: var(--green);
  background: var(--green);
  color: #fff;
}

@media (max-width: 480px) {
  :deep(.modal.settings-modal) {
    display: flex;
    flex-direction: column;
    width: 100vw;
    max-width: none;
    height: 100dvh;
    max-height: 100dvh;
    border-radius: 0;
    padding: 20px 20px calc(20px + env(safe-area-inset-bottom));
    overflow: hidden;
  }

  .settings-sections {
    flex: 1;
    max-height: none;
    overflow-y: auto;
    padding-top: 16px;
    margin-right: -20px;
    padding-right: 20px;
  }
}
</style>
