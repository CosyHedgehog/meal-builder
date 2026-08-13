<script setup>
import { reactive } from 'vue'
import BaseModal from './BaseModal.vue'
import {
  state as store,
  addIngredient,
  deleteIngredient,
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

function submit() {
  const value = parseFloat(draft.kcal)
  if (!draft.name.trim() || !Number.isFinite(value) || value < 0) return
  if (isNew) addIngredient({ name: draft.name, unit: draft.unit, kcal: value })
  else updateIngredient(props.ingredientId, { name: draft.name, unit: draft.unit, kcal: value })
  emit('close')
}

async function closeEditor() {
  if (await confirmDiscard('Your unsaved ingredient changes will be lost.')) emit('close')
}

async function remove() {
  const usedIn = ingredientUsage(props.ingredientId)
  if (usedIn.length) {
    await confirmAction({
      title: 'Unable to delete',
      message: `This ingredient is used in: ${usedIn
        .map((m) => m.name)
        .join(', ')}. Remove it from those meals first.`,
      okLabel: 'Okay',
      cancelLabel: '',
    })
    return
  }
  const ok = await confirmAction({
    title: 'Delete ingredient',
    message: `Delete "${existing.name}"?`,
    okLabel: 'Delete ingredient',
  })
  if (!ok) return
  deleteIngredient(props.ingredientId)
  emit('close')
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
      <label for="ingUnit">Unit</label>
      <select id="ingUnit" v-model="draft.unit">
        <option value="g">g</option>
        <option value="each">each</option>
      </select>
    </div>
    <div class="input-field">
      <label for="ingKcal">Calories</label>
      <input id="ingKcal" v-model="draft.kcal" type="number" min="0" step="any" placeholder="kcal" />
    </div>

    <button class="btn btn-primary primary-wide" @click="submit">
      {{ isNew ? 'Add ingredient' : 'Save ingredient' }}
    </button>
    <button
      v-if="!isNew"
      class="btn btn-danger-outline primary-wide delete-action"
      style="margin-top: 8px"
      @click="remove"
    >
      Delete ingredient
    </button>
  </BaseModal>
</template>