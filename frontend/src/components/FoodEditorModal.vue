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
  min-height: 0;
  flex: 1;
  flex-direction: column;
  gap: 7px;
}

:deep(.modal.food-editor-modal) {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.food-editor-content::before {
  content: '';
  flex: none;
  margin: 0 -26px;
  border-top: 1px solid var(--line);
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
  margin: auto -26px -5px;
  padding: 14px 26px 0;
  border-top: 1px solid var(--line);
}

.food-actions .primary-wide {
  width: 100%;
  margin-top: 0;
  padding: 9px 14px;
  font-size: 13px;
}

@media (min-width: 601px) {
  :deep(.modal.food-editor-modal) {
    height: min(720px, 92vh);
    min-height: 560px;
  }
}

@media (max-width: 600px) {
  :deep(.modal.food-editor-modal) {
    display: flex;
    flex-direction: column;
  }

  .food-editor-content::before {
    margin-right: -20px;
    margin-left: -20px;
  }

  .food-actions {
    flex: none;
    margin: auto -20px -8px;
    padding: 10px 20px 0;
  }
}
</style>

