<script setup>
import { onMounted, onUnmounted, watch } from 'vue'
import { closeModal, modalStack, Modals } from '../js/modals.js'
import { confirmState } from '../js/confirm.js'

import SettingsModal from './SettingsModal.vue'
import ImportDataModal from './ImportDataModal.vue'
import FoodEditorModal from './FoodEditorModal.vue'
import IngredientEditorModal from './IngredientEditorModal.vue'
import FoodManagerModal from './FoodManagerModal.vue'
import GroupManagerModal from './GroupManagerModal.vue'
import IngredientModal from './IngredientModal.vue'
import IngredientPickerModal from './IngredientPickerModal.vue'
import CustomEntryModal from './CustomEntryModal.vue'
</script>
<script>
const registry = {
  [Modals.SETTINGS]: SettingsModal,
  [Modals.IMPORT_DATA]: ImportDataModal,
  [Modals.FOOD_EDITOR]: FoodEditorModal,
  [Modals.INGREDIENT_EDITOR]: IngredientEditorModal,
  [Modals.FOOD_MANAGER]: FoodManagerModal,
  [Modals.GROUP_MANAGER]: GroupManagerModal,
  [Modals.INGREDIENT_MANAGER]: IngredientModal,
  [Modals.INGREDIENT_PICKER]: IngredientPickerModal,
  [Modals.CUSTOM_ENTRY]: CustomEntryModal,
}

function onKeydown(e) {
  if (e.key !== 'Escape') return
  if (confirmState.open) return // the confirm dialog handles its own Escape
  if (modalStack.length) closeModal()
}

watch(
  () => modalStack.length,
  (length) => {
    document.body.style.overflow = length ? 'hidden' : ''
  },
)

onMounted(() => document.addEventListener('keydown', onKeydown))
onUnmounted(() => {
  document.removeEventListener('keydown', onKeydown)
  document.body.style.overflow = ''
})
</script>

<template>
  <!-- Lower modals stay mounted (state is preserved) but are hidden. -->
  <div
    v-for="(entry, index) in modalStack"
    :key="entry.key"
    v-show="index === modalStack.length - 1"
  >
    <component :is="registry[entry.name]" v-bind="entry.props" @close="closeModal" />
  </div>
</template>