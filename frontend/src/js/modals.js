import { reactive } from 'vue'

export const Modals = Object.freeze({
  SETTINGS: 'settings',
  HISTORY: 'history',
  IMPORT_DATA: 'import-data',
  INGREDIENT_EDITOR: 'ingredient-editor',
  INGREDIENT_MANAGER: 'ingredient-manager',
  INGREDIENT_PICKER: 'ingredient-picker',
  FOOD_EDITOR: 'food-editor',
  FOOD_MANAGER: 'food-manager',
  GROUP_MANAGER: 'group-manager',
  CUSTOM_ENTRY: 'custom-entry',
  ACTIVITY: 'activity',
  FOLLOW: 'follow',
})

/**
 * Modal stack: only the top entry is visible, but lower ones stay mounted so
 * their state survives (e.g. Food manager -> Food editor -> Ingredient editor).
 */
export const modalStack = reactive([])

let seq = 0

export function openModal(name, props = {}) {
  modalStack.push({ name, props, key: ++seq })
}

export function replaceModal(name, props = {}) {
  if (modalStack.length) modalStack.pop()
  openModal(name, props)
}

export function closeModal() {
  modalStack.pop()
}

export function closeAllModals() {
  modalStack.splice(0)
}