<script setup>
import { reactive } from 'vue'
import BaseModal from './BaseModal.vue'
import { state as store, addSnack, deleteSnack, updateSnack } from '../js/data.js'
import { confirmAction } from '../js/confirm.js'
import { useDiscardChanges } from '../js/useDiscardChanges.js'

const props = defineProps({ snackId: { type: String, default: null } })
const emit = defineEmits(['close'])

const existing = store.snacks.find((s) => s.id === props.snackId)
const isNew = !existing

const draft = reactive({
  name: existing ? existing.name : '',
  kcal: existing ? String(existing.kcal) : '',
})
const { confirmDiscard } = useDiscardChanges(draft)

function submit() {
  const value = parseFloat(draft.kcal)
  if (!draft.name.trim() || !Number.isFinite(value) || value < 0) return
  if (isNew) addSnack(draft.name, value)
  else updateSnack(props.snackId, { name: draft.name, kcal: value })
  emit('close')
}

async function closeEditor() {
  if (await confirmDiscard('Your unsaved snack changes will be lost.')) emit('close')
}

async function remove() {
  const ok = await confirmAction({
    title: 'Delete snack',
    message: `Delete "${existing.name}"? It will be removed from any past logged days too.`,
    okLabel: 'Delete snack',
  })
  if (!ok) return
  deleteSnack(props.snackId)
  emit('close')
}
</script>

<template>
  <BaseModal
    :title="isNew ? 'New snack' : 'Edit snack'"
    :subtitle="isNew ? 'Save a snack you eat often.' : 'Update this saved snack.'"
    @close="closeEditor"
  >
    <div class="input-field">
      <label for="snackName">Name</label>
      <input id="snackName" v-model="draft.name" placeholder="e.g. Apple" />
    </div>
    <div class="input-field">
      <label for="snackKcal">Calories</label>
      <input id="snackKcal" v-model="draft.kcal" type="number" min="0" step="1" placeholder="95" />
    </div>

    <button class="btn btn-primary primary-wide" @click="submit">
      {{ isNew ? 'Add snack' : 'Save changes' }}
    </button>
    <button
      v-if="!isNew"
      class="btn btn-danger-outline primary-wide delete-action"
      style="margin-top: 8px"
      @click="remove"
    >
      Delete snack
    </button>
  </BaseModal>
</template>