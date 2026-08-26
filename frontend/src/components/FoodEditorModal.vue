<script setup>
import { computed, reactive, ref } from 'vue'
import BaseModal from './BaseModal.vue'
import FoodModeSelector from './FoodModeSelector.vue'
import { state as store, createFood, updateFood } from '../js/data.js'
import { Modals } from '../js/modals.js'
import { confirmAction } from '../js/confirm.js'
import { useDiscardChanges } from '../js/useDiscardChanges.js'
import FoodIngredientsEditor from './FoodIngredientsEditor.vue'

const props = defineProps({
  foodId: { type: String, default: null },
  groupId: { type: String, default: '' },
  duplicate: { type: Boolean, default: false },
})
const emit = defineEmits(['close'])

const source = store.foods.find((food) => food.id === props.foodId)
const isNew = !source
const draft = reactive({
  name: source ? `${source.name}${props.duplicate ? ' copy' : ''}` : '',
  groupId: source ? source.groupId : props.groupId,
  items: source ? source.items.map((item) => ({ ...item })) : [],
  kcal: source ? String(source.kcal || '') : '',
  note: source?.note || '',
})
const foodMode = ref(source?.mode || (source && source.items.length ? 'ingredients' : 'simple'))
const modeSwipeStart = ref(null)
const { isDirty, confirmDiscard: confirmDraftDiscard } = useDiscardChanges(draft)
const isDraftCopy = computed(() => props.duplicate && !isNew)

const totalKcal = computed(() => Math.round(Number(draft.kcal) || 0))
const groups = computed(() => store.groups)
const validationMessage = ref('')

function setFoodMode(mode) {
  foodMode.value = mode
  validationMessage.value = ''
}

function startModeSwipe(event) {
  const touch = event.changedTouches[0]
  modeSwipeStart.value = touch ? { x: touch.clientX, y: touch.clientY } : null
}

function endModeSwipe(event) {
  if (!modeSwipeStart.value) return
  const touch = event.changedTouches[0]
  const deltaX = touch.clientX - modeSwipeStart.value.x
  const deltaY = touch.clientY - modeSwipeStart.value.y
  modeSwipeStart.value = null
  if (Math.abs(deltaX) < 50 || Math.abs(deltaX) <= Math.abs(deltaY)) return
  setFoodMode(deltaX < 0 ? 'simple' : 'ingredients')
}

async function saveFood() {
  if (!draft.groupId) {
    validationMessage.value = 'Select a group before saving.'
    return
  }
  const fixedKcal = parseFloat(draft.kcal)
  if (foodMode.value === 'ingredients' && !draft.items.length) {
    validationMessage.value = 'Add at least one ingredient before saving.'
    return
  }
  if (foodMode.value === 'simple' && (!Number.isFinite(fixedKcal) || fixedKcal <= 0)) {
    validationMessage.value = 'Enter calories per serving before saving.'
    return
  }
  const payload = {
    ...draft,
    items: draft.items,
    mode: foodMode.value,
    kcal: foodMode.value === 'simple' ? fixedKcal : 0,
  }
  if (isNew || isDraftCopy.value) createFood(payload)
  else {
    const hasChanges = source.name !== payload.name?.trim()
      || source.groupId !== payload.groupId
      || source.mode !== payload.mode
      || Number(source.kcal) !== payload.kcal
      || String(source.note || '') !== String(payload.note || '').trim()
      || JSON.stringify(source.items || []) !== JSON.stringify(payload.items || [])
    const loggedCount = Object.values(store.logs).reduce((count, log) => count + (log.entries || [])
      .filter((entry) => entry.foodId === props.foodId).length, 0)
    if (hasChanges && loggedCount) {
      const ok = await confirmAction({
        title: 'Update logged food?',
        message: `This food is used in ${loggedCount} logged meal${loggedCount === 1 ? '' : 's'}.\n\nSaving will update those food logs. Continue?`,
        okLabel: 'Update food',
        okClass: 'btn-primary',
      })
      if (!ok) return
    }
    updateFood(props.foodId, payload)
  }
  emit('close')
}

async function closeEditor() {
  if (isDraftCopy.value && !isDirty.value) {
    const ok = await confirmAction({
      title: 'Discard copied food?',
      message: 'This copied food has not been saved yet. Discard it?',
      okLabel: 'Discard copy',
    })
    if (ok) emit('close')
    return ok
  }
  const ok = await confirmDraftDiscard('Your unsaved food changes will be lost.')
  if (ok) emit('close')
  return ok
}

defineExpose({ requestClose: closeEditor })

</script>

<template>
  <BaseModal :title="isNew ? 'New food' : `Edit ${draft.name}`"
    subtitle="Create or update a food using ingredients or fixed calories."
    panel-class="food-editor-modal"
    :on-touch-start="startModeSwipe"
    :on-touch-end="endModeSwipe"
    @close="closeEditor">
    <div class="food-editor-content">
      <div v-if="isDraftCopy" class="copy-food-badge">COPY OF EXISTING FOOD</div>
      <div class="food-details-row">
        <div class="input-field food-field">
          <input id="foodName" v-model="draft.name" placeholder="New food" aria-label="Food name" />
        </div>
        <div class="input-field food-field">
          <select id="foodGroup" class="food-group-select" v-model="draft.groupId" aria-label="Food group">
            <option value="" disabled hidden>Select a group...</option>
            <option v-for="group in groups" :key="group.id" :value="group.id">{{ group.name }}</option>
          </select>
        </div>
      </div>

      <FoodModeSelector :model-value="foodMode" @update:model-value="setFoodMode" />

      <FoodIngredientsEditor v-if="foodMode === 'ingredients'" :draft="draft" />

      <div v-else class="simple-food-panel">
        <div class="input-field simple-food-field">
          <label for="foodKcal">Calories per serving</label>
          <input id="foodKcal" v-model="draft.kcal" type="number" min="1" step="1" placeholder="e.g. 95" @keydown.enter.prevent="saveFood" />
        </div>
      </div>

      <div v-if="validationMessage" class="food-validation">{{ validationMessage }}</div>
      <div class="food-actions">
        <button class="btn btn-primary primary-wide" type="button" @click="saveFood">{{ isDraftCopy ? 'Create copy' : (isNew ? 'Create food' : 'Save food') }}</button>
      </div>
    </div>
  </BaseModal>
</template>

<style scoped>
.copy-food-badge {
  align-self: flex-start;
  padding: 3px 7px;
  border: 1px solid var(--green-light);
  border-radius: 999px;
  color: var(--green-strong);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.08em;
}

.food-details-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 150px;
  gap: 10px;
}

.food-group-select {
  background-color: var(--surface-alt);
  color: var(--ink);
}

.food-group-select option {
  background-color: var(--surface);
  color: var(--ink);
}

:global(html[data-theme='dark']) .food-group-select {
  color-scheme: dark;
}

.add-item-label-row {
  grid-column: 1 / -1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.add-item-label-row .add-item-label {
  grid-column: auto;
}

.add-item-label-row .create-ingredient-link {
  margin: 0;
  padding: 0;
  font-size: 11px;
}

.manage-ingredients-link {
  margin: 0;
  padding: 0;
  font-size: 11px;
}

.simple-food-panel {
  padding: 4px 0 0;
}

.simple-food-panel .input-field {
  margin-bottom: 0;
}

.simple-food-panel p {
  margin: 8px 0 0;
  color: var(--ink-muted);
  font-size: 12px;
  line-height: 1.4;
}

.food-editor-content {
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.food-validation {
  margin: 2px 0 -4px;
  color: var(--red);
  font-size: 12px;
}

.food-total {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  color: var(--ink-muted);
  font-size: 12px;
}

.food-total strong {
  color: var(--green-strong);
  font-family: 'IBM Plex Mono', monospace;
  font-size: 16px;
  white-space: nowrap;
}

.food-total small {
  font-family: 'Inter', sans-serif;
  font-size: 11px;
  font-weight: 600;
}

.food-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 14px;
}

.food-actions .primary-wide {
  width: 100%;
  margin-top: 0;
}

@media (max-width: 600px) {
  :deep(.modal.food-editor-modal) {
    display: flex;
    flex-direction: column;
  }

  .food-editor-content {
    flex: 1;
    min-height: 0;
  }

  .food-ingredients-section {
    display: contents;
  }

  .food-ingredients-list-container {
    flex: 1;
    max-height: none;
  }

  .food-ingredients-list-container .ingredient-list {
    flex: 1;
  }

  .food-actions {
    flex: none;
    margin-top: 7px;
  }
}

.add-item-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 100px 40px;
  gap: 5px;
  padding: 10px 0 3px;
  align-items: end;
}

.add-item-label {
  grid-column: 1 / -1;
  margin-bottom: 1px;
  color: var(--ink-muted);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.add-item-select,
.add-item-qty {
  width: 100%;
  min-width: 0;
  min-height: 40px;
  padding: 10px 12px;
  border: 1px solid var(--line);
  border-radius: 9px;
  background-color: var(--bg);
  color: var(--ink);
  font-size: 14px;
}

.add-item-select:focus,
.add-item-qty:focus {
  outline: 2px solid var(--green);
  outline-offset: 1px;
}

.ingredient-picker-button {
  position: relative;
  padding-right: 28px;
  overflow: hidden;
  color: var(--ink-muted);
  text-align: left;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ingredient-picker-trigger {
  position: relative;
  min-width: 0;
}

.ingredient-picker-input {
  appearance: none;
  padding-right: 34px;
  cursor: pointer;
}

.ingredient-picker-trigger::after {
  position: absolute;
  top: 50%;
  right: 13px;
  width: 7px;
  height: 7px;
  border-right: 1.5px solid var(--ink-muted);
  border-bottom: 1.5px solid var(--ink-muted);
  content: '';
  pointer-events: none;
  transform: translateY(-65%) rotate(45deg);
}

.ingredient-dropdown {
  position: absolute;
  z-index: 5;
  right: 0;
  left: 0;
  max-height: 120px;
  overflow-y: auto;
  border: 1px solid var(--line);
  border-radius: 9px;
  background: var(--surface);
  box-shadow: 0 8px 18px rgba(var(--backdrop-rgb), 0.18);
}

.ingredient-dropdown.placement-down {
  top: calc(100% + 4px);
}

.ingredient-dropdown.placement-up {
  bottom: calc(100% + 4px);
}

.ingredient-dropdown-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  width: 100%;
  padding: 8px 9px;
  border: 0;
  border-bottom: 1px solid var(--line);
  background: transparent;
  color: var(--ink);
  font-size: 12px;
  text-align: left;
}

.ingredient-dropdown-option:last-child {
  border-bottom: 0;
}

.ingredient-dropdown-option:hover,
.ingredient-dropdown-option:focus-visible {
  background: var(--surface-alt);
  color: var(--green-strong);
  outline: none;
}

.ingredient-dropdown-option small {
  flex: none;
  color: var(--ink-muted);
  font-size: 10px;
}

.ingredient-dropdown-empty {
  display: flex;
  min-height: 72px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 12px;
  color: var(--ink-muted);
  font-size: 12px;
  text-align: center;
}

.ingredient-dropdown-empty strong {
  color: var(--ink);
  font-size: 12px;
}

.ingredient-dropdown-empty span {
  font-size: 11px;
}

.ingredient-picker-button::after {
  position: absolute;
  top: 50%;
  right: 11px;
  width: 6px;
  height: 6px;
  border-right: 1.5px solid currentColor;
  border-bottom: 1.5px solid currentColor;
  content: '';
  transform: translateY(-65%) rotate(45deg);
}

.ingredient-picker-button.has-selection {
  color: var(--ink);
}

.ingredient-picker-button:hover {
  border-color: var(--green-light);
  background: var(--surface-alt);
  color: var(--green-strong);
}

.ingredient-picker-button:focus-visible {
  outline: 2px solid var(--green);
  outline-offset: 1px;
}

.add-item-qty {
  font-family: 'IBM Plex Mono', monospace;
  text-align: center;
}

.add-item-button {
  align-self: center;
  min-height: 40px;
  padding: 8px 4px;
  white-space: nowrap;
}

@media (max-width: 600px) {
  .food-ingredients-list-container {
    max-height: 194px;
  }

  .ingredient-row {
    grid-template-columns: minmax(0, 1fr) 56px 22px 48px 18px;
    gap: 4px;
    min-height: 36px;
    padding: 3px 0;
  }

  .ingredient-row-main {
    display: contents;
  }

  .ingredient-name-wrap {
    grid-column: 1;
    grid-row: 1;
    max-width: 100%;
    min-width: 0;
  }

  .item-name {
    max-width: 100%;
  }

  .item-name > span:last-child {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .quantity-control {
    grid-column: 2 / span 2;
    grid-row: 1;
    width: auto;
    grid-template-columns: 56px 18px;
    gap: 3px;
  }

  .item-kcal {
    grid-column: 4;
    grid-row: 1;
    text-align: right;
  }

  .item-remove {
    grid-column: 5;
    grid-row: 1;
    padding: 2px 0;
  }

  .add-item-row {
    grid-template-columns: minmax(0, 1fr) 70px 40px;
  }

  .add-item-select {
    grid-column: 1;
    min-width: 0;
    padding-right: 12px;
  }

  .add-item-qty {
    grid-column: 2;
  }

  .add-item-button {
    grid-column: 3;
    padding-right: 6px;
    padding-left: 6px;
  }
}
</style>

