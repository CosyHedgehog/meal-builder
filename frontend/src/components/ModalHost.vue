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
import HistoryModal from './HistoryModal.vue'
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
  [Modals.HISTORY]: HistoryModal,
}

function onKeydown(e) {
  if (e.key !== 'Escape') return
  if (confirmState.open) return // the confirm dialog handles its own Escape
  if (modalStack.length) closeModal()
}

function onPopState() {
  if (modalStack.length) closeModal()
}

function updateWindowLock() {
  const isLocked = modalStack.length > 0 || confirmState.open
  document.documentElement.style.overflow = isLocked ? 'hidden' : ''
  document.body.style.overflow = isLocked ? 'hidden' : ''
}

watch(
  () => modalStack.length,
  (length, previousLength) => {
    updateWindowLock()
    if (length > (previousLength ?? 0)) history.pushState({ mealBuilderModal: true }, '')
    else if (!length && (previousLength ?? 0)) history.replaceState(null, '', location.href)
  },
)

watch(() => confirmState.open, updateWindowLock)

onMounted(() => document.addEventListener('keydown', onKeydown))
onUnmounted(() => {
  document.removeEventListener('keydown', onKeydown)
  window.removeEventListener('popstate', onPopState)
  document.documentElement.style.overflow = ''
  document.body.style.overflow = ''
})
window.addEventListener('popstate', onPopState)
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