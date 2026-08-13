<script setup>
import { ref } from 'vue'
import BaseModal from './BaseModal.vue'
import { addCustomLogEntry, getLog, logEntries, removeLogEntry } from '../js/data.js'
import { view } from '../js/ui.js'
import { prettyDate } from '../js/date.js'

const emit = defineEmits(['close'])

const log = getLog(view.logDate)
const existing = logEntries(log).find((entry) => !entry.foodId && entry.groupId === 'group-dinner')
const isEdit = !!existing
const name = ref(existing?.name || '')
const kcal = ref(existing?.kcal ? String(existing.kcal) : '')

function submit() {
  const value = parseFloat(kcal.value)
  if (!Number.isFinite(value) || value < 0) return
  if (existing) removeLogEntry(view.logDate, existing.id)
  addCustomLogEntry(view.logDate, 'group-dinner', name.value.trim() || 'Custom meal', value)
  emit('close')
}

function remove() {
  if (existing) removeLogEntry(view.logDate, existing.id)
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