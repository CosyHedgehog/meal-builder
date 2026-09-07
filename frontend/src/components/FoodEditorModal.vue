<script setup>
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue'
import BaseModal from './BaseModal.vue'
import FoodModeSelector from './FoodModeSelector.vue'
import { state as store, createFood, updateFood, addFoodToFamily, foodKcal } from '../js/data.js'
import { Modals, openModal } from '../js/modals.js'
import { confirmAction } from '../js/confirm.js'
import { useDiscardChanges } from '../js/useDiscardChanges.js'
import FoodIngredientsEditor from './FoodIngredientsEditor.vue'

const props = defineProps({
  foodId: { type: String, default: null },
  groupId: { type: String, default: '' },
  familyId: { type: String, default: null },
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
  variantFoodIds: source?.variantFoodIds ? [...source.variantFoodIds] : [],
})
const sourceFamily = computed(() => source && store.foodFamilies.find((family) => family.variantFoodIds?.includes(source.id)))
const foodMode = ref(source?.mode || (source && source.items.length ? 'ingredients' : 'simple'))
const foodPurpose = ref(source?.mode === 'family' || props.familyId || sourceFamily.value ? 'variant' : 'simple')
const nutritionMode = ref(source?.mode || (source && source.items.length ? 'ingredients' : 'simple'))
const selectedFamilyId = ref(props.familyId || sourceFamily.value?.id || '')
const selectedVariantIds = computed({
  get: () => draft.variantFoodIds,
  set: (value) => { draft.variantFoodIds = value },
})
const variantQuery = ref('')
const isVariantDropdownOpen = ref(false)
const variantSearchRef = ref(null)
const modeSwipeStart = ref(null)
const { isDirty, confirmDiscard: confirmDraftDiscard } = useDiscardChanges(draft)
const isDraftCopy = computed(() => props.duplicate && !isNew)
const canChangeFoodType = isNew || isDraftCopy.value

const groups = computed(() => store.groups)
const assignedVariantIds = computed(() => new Set(store.foods
  .filter((food) => food.mode === 'family' && (!source?.id || props.duplicate || food.id !== source.id))
  .flatMap((food) => food.variantFoodIds || [])
  .concat(store.foodFamilies
    .filter((family) => !source?.id || props.duplicate || family.id !== source.id)
    .flatMap((family) => family.variantFoodIds || []))))
const availableVariants = computed(() => {
  const query = variantQuery.value.trim().toLowerCase()
  return store.foods
    .filter((food) => food.id !== source?.id && food.mode !== 'family')
    .filter((food) => !selectedVariantIds.value.includes(food.id))
    .filter((food) => !query || food.name.toLowerCase().includes(query))
})
const selectedVariants = computed(() => selectedVariantIds.value
  .map((id) => store.foods.find((food) => food.id === id))
  .filter(Boolean))
const validationMessage = ref('')

function setFoodMode(mode) {
  if (!canChangeFoodType) return
  foodPurpose.value = mode === 'variant' ? 'variant' : 'simple'
  if (mode !== 'variant') {
    foodMode.value = mode
    nutritionMode.value = mode
  }
  validationMessage.value = ''
}

function selectVariant(foodId) {
  if (!selectedVariantIds.value.includes(foodId)) {
    selectedVariantIds.value = [...selectedVariantIds.value, foodId]
  }
  validationMessage.value = ''
  variantSearchRef.value?.focus()
}

function removeVariant(foodId) {
  selectedVariantIds.value = selectedVariantIds.value.filter((id) => id !== foodId)
  validationMessage.value = ''
}

function openVariantEditor(foodId) {
  openModal(Modals.FOOD_EDITOR, { foodId })
}

function handleVariantSearchFocus() {
  isVariantDropdownOpen.value = true
}

function handleVariantSearchInput() {
  isVariantDropdownOpen.value = true
}

function handleVariantClickOutside(event) {
  if (variantSearchRef.value && !variantSearchRef.value.contains(event.target)) {
    isVariantDropdownOpen.value = false
  }
}

function setNutritionMode(mode) {
  nutritionMode.value = mode
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
  if (foodPurpose.value === 'variant' && !selectedVariantIds.value.length) {
    validationMessage.value = 'Select at least one food for this variant list.'
    return
  }
  if (foodPurpose.value === 'variant' && selectedVariantIds.value.some((id) => assignedVariantIds.value.has(id))) {
    validationMessage.value = 'A food can only belong to one variant family.'
    return
  }
  if (foodPurpose.value !== 'variant' && nutritionMode.value === 'ingredients' && !draft.items.length) {
    validationMessage.value = 'Add at least one ingredient before saving.'
    return
  }
  if (foodPurpose.value !== 'variant' && nutritionMode.value === 'simple' && (!Number.isFinite(fixedKcal) || fixedKcal <= 0)) {
    validationMessage.value = 'Enter calories per serving before saving.'
    return
  }
  const payload = {
    ...draft,
    items: draft.items,
    mode: foodPurpose.value === 'variant' ? 'family' : nutritionMode.value,
    kcal: foodPurpose.value === 'variant' ? 0 : nutritionMode.value === 'simple' ? fixedKcal : 0,
    variantFoodIds: foodPurpose.value === 'variant' ? selectedVariantIds.value : [],
  }
  if (isNew || isDraftCopy.value) {
    const createdFoodId = createFood(payload)
    if (foodPurpose.value === 'variant' && props.familyId) addFoodToFamily(props.familyId, createdFoodId)
  }
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

onMounted(() => document.addEventListener('pointerdown', handleVariantClickOutside))
onUnmounted(() => document.removeEventListener('pointerdown', handleVariantClickOutside))

</script>

<template>
  <BaseModal :title="isNew ? 'New food' : `Edit ${draft.name}`"
    subtitle="Create or update a food using fixed calories, ingredients, or a variant group."
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

        <FoodModeSelector v-if="canChangeFoodType" :model-value="foodPurpose === 'variant' ? 'variant' : foodMode" @update:model-value="setFoodMode" />

      <div v-if="foodPurpose === 'variant'" class="variant-food-panel">
        <div class="variant-section-heading">
          <div class="variant-nutrition-heading">Selected variant options</div>
          <span>{{ selectedVariants.length }} selected</span>
        </div>
        <div v-if="selectedVariants.length" class="selected-variant-list">
          <div v-for="food in selectedVariants" :key="food.id" class="selected-variant-row">
            <span class="selected-variant-copy">
              <button type="button" class="selected-variant-name" @click="openVariantEditor(food.id)">{{ food.name }}</button>
              <small>{{ foodKcal(food).toLocaleString() }} kcal · {{ food.mode === 'simple' ? 'simple food' : 'ingredients' }}<span v-if="food.archived"> · currently hidden</span></small>
            </span>
            <button type="button" class="variant-remove-button" :aria-label="`Remove ${food.name}`" :title="`Remove ${food.name}`" @click="removeVariant(food.id)">
              <span aria-hidden="true">×</span>
            </button>
          </div>
        </div>
        <div v-else class="variant-empty-state">No variant options selected yet.</div>
        <div class="variant-add-heading">
          <div class="variant-nutrition-heading">Add variant option</div>
          <span>Search your foods</span>
        </div>
        <div ref="variantSearchRef" class="family-search">
          <div class="variant-search-input-wrap">
            <span class="variant-search-icon" aria-hidden="true">⌕</span>
            <input v-model="variantQuery" type="search" aria-label="Search foods to add" placeholder="Search foods to add" @focus="handleVariantSearchFocus" @input="handleVariantSearchInput" />
            <button v-if="variantQuery" type="button" class="variant-search-clear" aria-label="Clear search" @click="variantQuery = ''; variantSearchRef?.querySelector('input')?.focus()">×</button>
          </div>
          <div v-if="isVariantDropdownOpen" class="family-food-list">
            <button v-for="food in availableVariants" :key="food.id" type="button" class="family-food-option" @click="selectVariant(food.id)">
              <span>
                <strong>{{ food.name }}</strong>
                <small>{{ foodKcal(food).toLocaleString() }} kcal · {{ food.mode === 'simple' ? 'simple food' : 'ingredients' }}<span v-if="food.archived"> · currently hidden</span></small>
              </span>
              <span class="variant-add-button" aria-hidden="true">+</span>
            </button>
            <p v-if="!availableVariants.length" class="variant-search-empty">No foods match this search.</p>
          </div>
        </div>
      </div>

      <FoodIngredientsEditor v-if="foodPurpose !== 'variant' && nutritionMode === 'ingredients'" :draft="draft" />

      <div v-else-if="foodPurpose !== 'variant' && nutritionMode === 'simple'" class="simple-food-panel">
        <div class="input-field simple-food-field">
          <label for="foodKcal">Calories per serving</label>
          <input id="foodKcal" v-model="draft.kcal" type="number" min="1" step="1" placeholder="e.g. 95" @keydown.enter.prevent="saveFood" />
        </div>
      </div>

      <div v-if="validationMessage" class="food-validation">{{ validationMessage }}</div>
      <div class="food-actions">
        <button class="btn btn-primary primary-wide" type="button" @click="saveFood">{{ isDraftCopy ? 'Create copy' : (isNew ? (foodPurpose === 'variant' ? 'Create variant group' : 'Create food') : 'Save food') }}</button>
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

.variant-food-panel {
  display: flex;
  min-height: 0;
  flex: 1;
  flex-direction: column;
  gap: 8px;
  padding: 4px 0 0;
}

.variant-section-heading,
.variant-add-heading {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
}

.variant-section-heading > span,
.variant-add-heading > span {
  color: var(--ink-muted);
  font-size: 11px;
}

.variant-add-heading {
  margin-top: auto;
}

.selected-variant-list {
  display: flex;
  min-height: 0;
  flex: 1;
  flex-direction: column;
  overflow-y: auto;
  border: 1px solid var(--line);
  border-radius: 10px;
}

.selected-variant-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 9px 10px;
  border-bottom: 1px solid var(--line);
}

.selected-variant-row:last-child {
  border-bottom: 0;
}

.selected-variant-copy {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 2px;
}

.selected-variant-copy strong {
  font-size: 13px;
  font-weight: 600;
}

.selected-variant-name {
  width: fit-content;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--ink);
  font: inherit;
  font-size: 13px;
  font-weight: 600;
  text-align: left;
}

.selected-variant-name:hover,
.selected-variant-name:focus-visible {
  color: var(--green-strong);
  text-decoration: underline;
  outline: none;
}

.selected-variant-copy small {
  color: var(--ink-muted);
  font-size: 11px;
}

.variant-remove-button,
.variant-add-button {
  display: inline-flex;
  width: 24px;
  height: 24px;
  align-items: center;
  justify-content: center;
  flex: none;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: var(--ink-muted);
  font-size: 20px;
  line-height: 1;
}

.variant-remove-button:hover,
.variant-remove-button:focus-visible {
  color: var(--red);
  outline: none;
}

.variant-empty-state {
  padding: 10px;
  border: 1px dashed var(--line);
  border-radius: 10px;
  color: var(--ink-muted);
  font-size: 12px;
  text-align: center;
}

.variant-food-panel > .variant-empty-state {
  display: flex;
  min-height: 0;
  flex: 1;
  align-items: center;
  justify-content: center;
}

.family-search input {
  width: 100%;
  min-height: 40px;
  padding: 9px 10px;
  border: 1px solid var(--line);
  border-radius: 9px;
  background: var(--surface-alt);
  color: var(--ink);
}

.family-search {
  position: relative;
}

.variant-search-input-wrap {
  position: relative;
}

.variant-search-input-wrap input {
  padding-right: 34px;
  padding-left: 32px;
}

.variant-search-icon {
  position: absolute;
  top: 50%;
  left: 11px;
  z-index: 1;
  color: var(--ink-muted);
  font-size: 20px;
  line-height: 1;
  pointer-events: none;
  transform: translateY(-52%);
}

.variant-search-clear {
  position: absolute;
  top: 50%;
  right: 8px;
  width: 24px;
  height: 24px;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: var(--ink-muted);
  font-size: 18px;
  line-height: 1;
  transform: translateY(-50%);
}

.variant-search-clear:hover,
.variant-search-clear:focus-visible {
  background: var(--surface-alt);
  color: var(--ink);
  outline: none;
}

.family-food-list {
  position: absolute;
  z-index: 3;
  bottom: calc(100% + 5px);
  right: 0;
  left: 0;
  display: flex;
  max-height: 190px;
  flex-direction: column;
  overflow-y: auto;
  border: 1px solid var(--line);
  border-radius: 10px;
  background: var(--surface-alt);
  box-shadow: 0 10px 24px rgb(0 0 0 / 22%);
}

.family-food-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  width: 100%;
  padding: 9px 10px;
  border: 0;
  border-bottom: 1px solid var(--line);
  background: transparent;
  color: var(--ink);
  cursor: pointer;
  text-align: left;
}

.family-food-option:last-child {
  border-bottom: 0;
}

.family-food-option span {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 2px;
}

.family-food-option strong {
  font-size: 13px;
  font-weight: 600;
}

.family-food-option small {
  color: var(--ink-muted);
  font-size: 11px;
}

.family-food-option:hover,
.family-food-option:focus-visible {
  background: color-mix(in srgb, var(--surface-alt) 82%, var(--line));
  outline: none;
}

.variant-add-button {
  background: var(--surface-alt);
  color: var(--green-strong);
  font-size: 18px;
}

.variant-search-empty {
  margin: 0;
  padding: 13px 10px;
  color: var(--ink-muted);
  font-size: 12px;
  text-align: center;
}

.variant-nutrition-heading {
  color: var(--ink-muted);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.food-family-select {
  width: 100%;
  min-height: 40px;
  padding: 9px 10px;
  border: 1px solid var(--line);
  border-radius: 9px;
  background: var(--surface-alt);
  color: var(--ink);
}

.variant-nutrition-tabs {
  display: flex;
  gap: 4px;
  padding: 3px;
  border-radius: 9px;
  background: var(--surface-alt);
}

.variant-nutrition-tabs button {
  flex: 1;
  min-height: 29px;
  padding: 5px 8px;
  border: 0;
  border-radius: 7px;
  background: transparent;
  color: var(--ink-muted);
  font-size: 12px;
}

.variant-nutrition-tabs button.active {
  background: var(--surface);
  color: var(--ink);
  font-weight: 700;
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

