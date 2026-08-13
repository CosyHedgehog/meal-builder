<script setup>
import { onMounted, onUnmounted, watch } from 'vue'
import { closeModal, modalStack, Modals } from '../js/modals.js'
import { confirmState } from '../js/confirm.js'

import SettingsModal from './SettingsModal.vue'
import MealEditorModal from './MealEditorModal.vue'
import SnackEditorModal from './SnackEditorModal.vue'
import IngredientEditorModal from './IngredientEditorModal.vue'
import MealCustomModal from './MealCustomModal.vue'
import SnackCustomModal from './SnackCustomModal.vue'
import MealModal from './MealModal.vue'
import SnackModal from './SnackModal.vue'
import IngredientModal from './IngredientModal.vue'
</script>
<script>
const registry = {
  [Modals.SETTINGS]: SettingsModal,
  [Modals.MEAL_EDITOR]: MealEditorModal,
  [Modals.SNACK_EDITOR]: SnackEditorModal,
  [Modals.INGREDIENT_EDITOR]: IngredientEditorModal,
  [Modals.CUSTOM_MEAL]: MealCustomModal,
  [Modals.CUSTOM_SNACK]: SnackCustomModal,
  [Modals.MEAL_MANAGER]: MealModal,
  [Modals.SNACK_MANAGER]: SnackModal,
  [Modals.INGREDIENT_MANAGER]: IngredientModal,
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