<script setup>
import { onMounted, onUnmounted, watch } from 'vue'
import { closeModal, modalStack, Modals } from '../js/modals.js'
import { confirmState, settleConfirm } from '../js/confirm.js'

import SettingsModal from './SettingsModal.vue'
import ImportDataModal from './ImportDataModal.vue'
import FoodEditorModal from './FoodEditorModal.vue'
import IngredientEditorModal from './IngredientEditorModal.vue'
import FoodManagerModal from './FoodManagerModal.vue'
import GroupManagerModal from './GroupManagerModal.vue'
import IngredientModal from './IngredientModal.vue'
import IngredientPickerModal from './IngredientPickerModal.vue'
import CustomEntryModal from './CustomEntryModal.vue'
import TrendsModal from './TrendsModal.vue'
import ActivityModal from './ActivityModal.vue'
import ActivityDayModal from './ActivityDayModal.vue'
import TrendsWeekModal from './TrendsWeekModal.vue'
import FollowModal from './FollowModal.vue'
import DeleteAccountModal from './DeleteAccountModal.vue'

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
  [Modals.TRENDS]: TrendsModal,
  [Modals.ACTIVITY]: ActivityModal,
  [Modals.ACTIVITY_DAY]: ActivityDayModal,
  [Modals.TRENDS_WEEK]: TrendsWeekModal,
  [Modals.FOLLOW]: FollowModal,
  [Modals.DELETE_ACCOUNT]: DeleteAccountModal,
}

const modalInstances = new Map()

function setModalInstance(key, el) {
  if (el) {
    modalInstances.set(key, el)
  } else {
    modalInstances.delete(key)
  }
}

async function handleCloseTopModal() {
  if (!modalStack.length) return false
  const topEntry = modalStack[modalStack.length - 1]
  const instance = modalInstances.get(topEntry.key)
  if (instance && typeof instance.requestClose === 'function') {
    const result = await instance.requestClose()
    return result !== false
  }
  closeModal()
  return true
}

async function onKeydown(e) {
  if (e.key !== 'Escape') return
  if (confirmState.open) return // the confirm dialog handles its own Escape
  if (modalStack.length) {
    await handleCloseTopModal()
  }
}

async function onPopState() {
  if (confirmState.open) {
    settleConfirm(false)
    history.pushState({ mealBuilderModal: true }, '')
    return
  }
  if (!modalStack.length) return
  const closed = await handleCloseTopModal()
  if (!closed) {
    history.pushState({ mealBuilderModal: true }, '')
  }
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

onMounted(() => {
  document.addEventListener('keydown', onKeydown)
  window.addEventListener('popstate', onPopState)
})

onUnmounted(() => {
  document.removeEventListener('keydown', onKeydown)
  window.removeEventListener('popstate', onPopState)
  document.documentElement.style.overflow = ''
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
    <component
      :is="registry[entry.name]"
      :ref="(el) => setModalInstance(entry.key, el)"
      v-bind="entry.props"
      @close="closeModal"
    />
  </div>
</template>