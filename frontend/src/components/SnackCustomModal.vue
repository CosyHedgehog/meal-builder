<script setup>
import { onDeactivated, ref } from 'vue'
import BaseModal from './BaseModal.vue'
import { addCustomLogSnack, addLogSnack, addSnack } from '../js/data.js'
import { view } from '../js/ui.js'

const emit = defineEmits(['close'])

const QUICK_AMOUNTS = [50, 100, 150, 250, 500, 750, 1000]

const name = ref('')
const kcal = ref('')
const savePreset = ref(false)

function submit() {
  const value = parseFloat(kcal.value)
  if (!Number.isFinite(value) || value < 0) return
  const label = name.value.trim() || 'Snack'
  if (savePreset.value) {
    const id = addSnack(label, value)
    if (id) addLogSnack(view.logDate, id, 1)
  } else {
    addCustomLogSnack(view.logDate, label, value, 1)
  }
  emit('close')
}
</script>

<template>
  <BaseModal
    title="Custom snack"
    subtitle="A one-off bite for today — logged just this once unless you save it."
    @close="emit('close')"
  >
    <div class="input-field">
      <label for="customSnackName">Name (optional)</label>
      <input id="customSnackName" v-model="name" placeholder="e.g. Bite of cake" />
    </div>
    <div class="input-field">
      <label for="customSnackKcal">Calories</label>
      <input id="customSnackKcal" v-model="kcal" type="number" min="0" step="1" placeholder="80" />
    </div>

    <div class="chip-list quick-amounts">
      <button
        v-for="amount in QUICK_AMOUNTS"
        :key="amount"
        type="button"
        class="today-chip chip-add"
        @click="kcal = String(amount)"
      >
        +{{ amount }}
      </button>
    </div>

    <div class="settings-row custom-snack-save-row">
      <span>Save to My Snacks</span>
      <input v-model="savePreset" type="checkbox" />
    </div>

    <button class="btn btn-primary primary-wide" @click="submit">Add for today</button>
  </BaseModal>
</template>