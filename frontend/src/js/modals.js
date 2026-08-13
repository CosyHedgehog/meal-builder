import { reactive } from 'vue'

export const Modals = Object.freeze({
  SETTINGS: 'settings',
  MEAL_EDITOR: 'meal-editor',
  SNACK_EDITOR: 'snack-editor',
  INGREDIENT_EDITOR: 'ingredient-editor',
  CUSTOM_MEAL: 'custom-meal',
  CUSTOM_SNACK: 'custom-snack',
  MEAL_MANAGER: 'meal-manager',
  SNACK_MANAGER: 'snack-manager',
  INGREDIENT_MANAGER: 'ingredient-manager',
})

/**
 * Modal stack: only the top entry is visible, but lower ones stay mounted so
 * their state survives (e.g. Food manager -> Meal editor -> Ingredient editor).
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