<script setup>
import { ref } from 'vue'
import BaseModal from './BaseModal.vue'
import { addCustomLogEntry, updateCustomLogEntry } from '../js/data.js'
import { view } from '../js/ui.js'

const props = defineProps({
  groupId: { type: String, required: true },
  entry: { type: Object, default: null },
})
const emit = defineEmits(['close'])

const QUICK_AMOUNTS = [50, 100, 150, 250, 500, 750, 1000]

const name = ref(props.entry?.name || '')
const kcal = ref(props.entry ? String(props.entry.kcal) : '')
const validationMessage = ref('')

function submit() {
  const value = parseFloat(kcal.value)
  if (!Number.isFinite(value) || value < 0) {
    validationMessage.value = 'Enter a calorie amount.'
    return
  }
  if (props.entry) updateCustomLogEntry(view.logDate, props.entry.id, name.value, value)
  else addCustomLogEntry(view.logDate, props.groupId, name.value, value, 1)
  emit('close')
}
</script>

<template>
  <BaseModal
    :title="props.entry ? `Edit ${props.entry.name || 'custom entry'}` : 'Custom entry'"
    subtitle="A one-off item for today."
    @close="emit('close')"
  >
    <div class="input-field">
      <label for="customEntryName">Name (optional)</label>
      <input id="customEntryName" v-model="name" placeholder="e.g. Bite of cake" />
    </div>
    <div class="input-field">
      <label for="customEntryKcal">Calories</label>
      <input id="customEntryKcal" v-model="kcal" type="number" min="0" step="1" placeholder="80" />
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

    <div v-if="validationMessage" class="food-validation">{{ validationMessage }}</div>
    <button class="btn btn-primary primary-wide" type="button" @click="submit">{{ props.entry ? 'Save changes' : 'Add for today' }}</button>
  </BaseModal>
</template>
