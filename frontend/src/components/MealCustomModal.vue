<script setup>
import { ref } from 'vue'
import BaseModal from './BaseModal.vue'
import { getLog, setLogMode, setManualMeal } from '../js/data.js'
import { view } from '../js/ui.js'
import { prettyDate } from '../js/date.js'

const emit = defineEmits(['close'])

const log = getLog(view.logDate)
const isEdit = log.mode === 'custom'
const name = ref(log.manualMealName || '')
const kcal = ref(log.manualMealKcal ? String(log.manualMealKcal) : '')

function submit() {
  const value = parseFloat(kcal.value)
  if (!Number.isFinite(value) || value < 0) return
  setLogMode(view.logDate, 'custom')
  setManualMeal(view.logDate, name.value.trim() || 'Custom meal', value)
  emit('close')
}

function remove() {
  setLogMode(view.logDate, 'meal')
  setManualMeal(view.logDate, '', 0)
  emit('close')
}
</script>

<template>
  <BaseModal
    title="Custom meal"
    :subtitle="`A one-off entry for ${prettyDate(view.logDate)} only — it won't be saved to your meals.`"
    @close="emit('close')"
  >
    <div class="input-field">
      <label for="customMealName">Name</label>
      <input id="customMealName" v-model="name" placeholder="e.g. Dinner out" />
    </div>
    <div class="input-field">
      <label for="customMealKcal">Calories</label>
      <input id="customMealKcal" v-model="kcal" type="number" min="0" step="1" placeholder="650" />
    </div>

    <button class="btn btn-primary primary-wide" @click="submit">
      {{ isEdit ? 'Save changes' : 'Add for today' }}
    </button>
    <button
      v-if="isEdit"
      class="btn btn-danger-outline primary-wide delete-action"
      style="margin-top: 8px"
      @click="remove"
    >
      Remove
    </button>
  </BaseModal>
</template>