<script setup>
import { reactive } from 'vue'
import BaseModal from './BaseModal.vue'
import {
  state as store,
  addIngredient,
  ingredientUsage,
  updateIngredient,
} from '../js/data.js'
import { confirmAction } from '../js/confirm.js'
import { useDiscardChanges } from '../js/useDiscardChanges.js'

const props = defineProps({ ingredientId: { type: String, default: null } })
const emit = defineEmits(['close'])

const existing = store.ingredients.find((i) => i.id === props.ingredientId)
const isNew = !existing

const draft = reactive({
  name: existing ? existing.name : '',
  unit: existing ? existing.unit : 'g',
  kcal: existing ? String(existing.kcal) : '',
})
const { confirmDiscard } = useDiscardChanges(draft)

async function submit() {
  const value = parseFloat(draft.kcal)
  if (!draft.name.trim() || !Number.isFinite(value) || value < 0) return
  if (isNew) addIngredient({ name: draft.name, unit: draft.unit, kcal: value })
  else {
    const usedIn = ingredientUsage(props.ingredientId)
    const hasChanges = draft.name.trim() !== existing.name
      || draft.unit !== existing.unit
      || value !== existing.kcal
    if (usedIn.length && hasChanges) {
      const foodNames = usedIn.map((food) => food.name).join(', ')
      const ok = await confirmAction({
        title: 'Update used ingredient?',
        message: `Used in ${usedIn.length} saved food${usedIn.length === 1 ? '' : 's'}:\n${foodNames}\n\nSaving will update these foods and logs where they are selected. Continue?`,
        okLabel: 'Update ingredient',
        okClass: 'btn-primary',
      })
      if (!ok) return
    }
    updateIngredient(props.ingredientId, { name: draft.name, unit: draft.unit, kcal: value })
  }
  emit('close')
}

async function closeEditor() {
  if (await confirmDiscard('Your unsaved ingredient changes will be lost.')) emit('close')
}

</script>

<template>
  <BaseModal
    :title="isNew ? 'New ingredient' : 'Edit ingredient'"
    :subtitle="
      isNew
        ? 'Calories per 100g for weighed items, or per item for things you count.'
        : 'Update a saved ingredient.'
    "
    @close="closeEditor"
  >
    <div class="input-field">
      <label for="ingName">Name</label>
      <input id="ingName" v-model="draft.name" placeholder="e.g. Chicken breast" />
    </div>
    <div class="input-field">
      <label for="ingUnit">How is this measured?</label>
      <select id="ingUnit" v-model="draft.unit">
        <option value="g">Weight (per 100g)</option>
        <option value="each">Count (per item)</option>
      </select>
    </div>
    <div class="input-field">
      <label for="ingKcal">Calories {{ draft.unit === 'g' ? 'per 100g' : 'per item' }}</label>
      <input
        id="ingKcal"
        v-model="draft.kcal"
        type="number"
        min="0"
        step="any"
        :placeholder="draft.unit === 'g' ? 'e.g. 165 per 100g' : 'e.g. 95 per item'"
      />
    </div>

    <button class="btn btn-primary primary-wide" @click="submit">
      {{ isNew ? 'Add ingredient' : 'Save ingredient' }}
    </button>
  </BaseModal>
</template>