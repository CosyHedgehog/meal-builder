<script setup>
import { computed, reactive, ref } from 'vue'
import BaseModal from './BaseModal.vue'
import { state as store, createFood, getIngredient, itemKcal, updateFood } from '../js/data.js'
import { Modals, openModal, replaceModal } from '../js/modals.js'
import { confirmAction } from '../js/confirm.js'
import { useDiscardChanges } from '../js/useDiscardChanges.js'

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
})
const foodMode = ref(source?.mode || (source && source.items.length ? 'ingredients' : 'simple'))
const pendingIngredientId = ref('')
const pendingQty = ref('')
const { isDirty, confirmDiscard: confirmDraftDiscard } = useDiscardChanges(draft)
const isDraftCopy = computed(() => props.duplicate && !isNew)

const usedIds = computed(() => new Set(draft.items.map((item) => item.ingredientId)))
const ingredientRows = computed(() => draft.items.map((item) => ({
  item,
  ingredient: getIngredient(item.ingredientId),
  kcal: Math.round(itemKcal(item)),
})))
const totalKcal = computed(() => draft.items.length
  ? Math.round(draft.items.reduce((sum, item) => sum + itemKcal(item), 0))
  : Math.round(Number(draft.kcal) || 0))
const groups = computed(() => store.groups)
const validationMessage = ref('')

function addIngredientRow() {
  if (!pendingIngredientId.value) return
  const amount = parseFloat(pendingQty.value)
  draft.items.push({
    ingredientId: pendingIngredientId.value,
    amount: !Number.isFinite(amount) || amount <= 0 ? 1 : amount,
  })
  pendingIngredientId.value = ''
  pendingQty.value = ''
}

function selectIngredient(ingredientId) {
  pendingIngredientId.value = ingredientId
}

function setFoodMode(mode) {
  foodMode.value = mode
  validationMessage.value = ''
}

async function removeRow(ingredientId) {
  const ingredient = getIngredient(ingredientId)
  const ok = await confirmAction({
    title: 'Remove ingredient',
    message: `Remove "${ingredient?.name || 'this ingredient'}" from this food?`,
    okLabel: 'Remove ingredient',
  })
  if (!ok) return
  draft.items = draft.items.filter((item) => item.ingredientId !== ingredientId)
}

function saveFood() {
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
  else updateFood(props.foodId, payload)
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
    return
  }
  if (await confirmDraftDiscard('Your unsaved food changes will be lost.')) emit('close')
}

</script>

<template>
  <BaseModal :title="isNew ? 'New food' : `Edit ${draft.name}`"
    subtitle="Create or update a food using ingredients or fixed calories." @close="closeEditor">
    <div class="food-editor-content">
      <div v-if="isDraftCopy" class="copy-food-badge">COPY OF EXISTING FOOD</div>
      <div class="input-field food-field">
        <label for="foodName">Name</label>
        <input id="foodName" v-model="draft.name" placeholder="New food" />
      </div>
      <div class="input-field food-field">
        <div class="food-group-label-row">
          <label for="foodGroup">Group</label>
        </div>
        <select id="foodGroup" v-model="draft.groupId">
          <option value="" disabled hidden>Select a group...</option>
          <option v-for="group in groups" :key="group.id" :value="group.id">{{ group.name }}</option>
        </select>
      </div>

      <div class="food-mode-control">
        <span class="food-mode-label">Food type</span>
        <div class="food-mode-tabs" role="group" aria-label="Food type">
          <button type="button" :class="{ active: foodMode === 'ingredients' }" @click="setFoodMode('ingredients')">
            Ingredients
          </button>
          <button type="button" :class="{ active: foodMode === 'simple' }" @click="setFoodMode('simple')">
            Simple food
          </button>
        </div>
      </div>

      <section v-if="foodMode === 'ingredients'" class="food-ingredients-section">
        <div v-if="draft.items.length" class="meal-section-heading">
          <div>
            <div class="meal-section-label">Ingredients <span class="meal-section-note">({{ draft.items.length }} added)</span></div>
          </div>
          <div class="food-total" aria-label="Calculated food calorie total">
            <strong>{{ totalKcal.toLocaleString() }} <small>kcal</small></strong>
          </div>
        </div>
        <div v-if="draft.items.length" class="food-ingredients-list-container">
          <div class="ingredient-list">
            <div
              v-for="row in ingredientRows"
              :key="row.item.ingredientId"
              class="ingredient-row"
            >
              <div class="ingredient-row-main">
                <div class="ingredient-name-wrap">
                  <button
                    type="button"
                    class="item-name"
                    @click="openModal('ingredient-editor', { ingredientId: row.item.ingredientId })"
                  >
                    <span class="item-edit-icon" aria-hidden="true">✎</span>
                    <span>{{ row.ingredient?.name || 'Unknown' }}</span>
                  </button>
                </div>
                <div class="quantity-control">
                  <input v-model.number="row.item.amount" class="item-qty" type="number" step="any" min="0" @click.stop />
                  <span>{{ row.ingredient?.unit === 'g' ? 'g' : '' }}</span>
                </div>
              </div>
              <div class="item-kcal mono">{{ row.kcal.toLocaleString() }} kcal</div>
              <button class="item-remove" :aria-label="`Remove ${row.ingredient?.name || 'ingredient'}`"
                @click.stop="removeRow(row.item.ingredientId)">×</button>
            </div>
          </div>
        </div>
        <div class="add-item-row">
          <div class="add-item-label-row">
            <label class="add-item-label">Add an ingredient</label>
          </div>
          <div class="ingredient-picker-trigger">
            <button
              type="button"
              class="add-item-select ingredient-picker-button"
              :class="{ 'has-selection': pendingIngredientId }"
              @click="openModal(Modals.INGREDIENT_PICKER, { excludedIds: [...usedIds], selectedId: pendingIngredientId, onSelect: selectIngredient })"
            >
              {{ getIngredient(pendingIngredientId)?.name || 'Select...' }}
            </button>
          </div>
          <input
            v-model="pendingQty"
            class="add-item-qty"
            type="number"
            step="any"
            min="0"
            :placeholder="getIngredient(pendingIngredientId)?.unit === 'g' ? 'g' : 'each'"
          />
          <button class="btn btn-primary add-item-button" type="button" @click="addIngredientRow">Add</button>
        </div>
      </section>

      <div v-else class="simple-food-panel">
        <div class="input-field simple-food-field">
          <label for="foodKcal">Calories per serving</label>
          <input id="foodKcal" v-model="draft.kcal" type="number" min="1" step="1" placeholder="e.g. 95" />
        </div>
      </div>

      <div v-if="foodMode === 'simple' && draft.kcal" class="food-total" aria-label="Food calorie total">
        <span>Calories per serving</span>
        <strong>{{ totalKcal.toLocaleString() }} <small>kcal</small></strong>
      </div>

      <div v-if="validationMessage" class="food-validation">{{ validationMessage }}</div>
      <div class="food-actions">
        <button class="btn btn-primary primary-wide" type="button" @click="saveFood">{{ isDraftCopy ? 'Create copy' : (isNew ? 'Create food' : 'Save food') }}</button>
        <button v-if="!isNew && !isDraftCopy" class="btn btn-secondary duplicate-food-button" type="button" @click="replaceModal(Modals.FOOD_EDITOR, { foodId: props.foodId, duplicate: true })">
          ⧉ Duplicate food
        </button>
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

.food-field {
  margin-bottom: 8px;
}

.food-group-label-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 6px;
}

.food-group-label-row label {
  margin-bottom: 0;
}

.create-group-link {
  margin: 0;
  padding: 0;
  font-size: 11px;
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

.food-mode-control {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 3px;
  margin: 2px 0 4px;
}

.food-mode-label {
  color: var(--ink-muted);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.food-mode-tabs {
  display: flex;
  gap: 12px;
}

.food-mode-tabs button {
  position: relative;
  min-height: 28px;
  padding: 4px 0;
  border: 0;
  background: transparent;
  color: var(--ink-muted);
  font-size: 12px;
}

.food-mode-tabs button.active {
  color: var(--green-strong);
  font-weight: 700;
}

.food-mode-tabs button.active::after {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  height: 2px;
  border-radius: 2px;
  background: var(--green);
  content: '';
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

.food-ingredients-section {
  display: flex;
  flex-direction: column;
  margin-top: 2px;
  gap: 7px;
}

.food-ingredients-list-container {
  display: flex;
  flex-direction: column;
  gap: 7px;
  padding: 6px 6px 6px;
  border: 1px solid var(--line);
  border-radius: 12px;
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

.duplicate-food-button {
  width: 100%;
}

.meal-section-heading .meal-section-label {
  color: var(--ink-muted);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.meal-section-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.meal-section-heading .food-total {
  flex: none;
}

.meal-section-heading .meal-section-note {
  color: var(--ink);
  font-size: 12px;
  font-weight: 400;
  letter-spacing: 0;
  text-transform: none;
}

.ingredient-list {
  overflow: hidden;
  border-radius: 8px;
  background: var(--surface);
}

.ingredient-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto 24px;
  align-items: center;
  gap: 8px;
  min-height: 40px;
  padding: 5px 6px;
  border-radius: 8px;
}

.ingredient-row-main {
  display: grid;
  grid-template-columns: 200px auto;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.ingredient-name-wrap {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  min-width: 0;
}

.item-name {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  min-width: 0;
  padding: 0;
  border: 0;
  background: transparent;
  overflow: hidden;
  color: var(--ink);
  font-size: 13px;
  font-weight: 500;
  text-overflow: ellipsis;
  text-align: left;
  white-space: nowrap;
}

.item-edit-icon {
  width: 12px;
  flex: none;
  color: var(--ink-muted);
  font-size: 11px;
  opacity: 0.7;
}

.item-name:hover,
.item-name:focus-visible {
  color: var(--green-strong);
  text-decoration: underline;
  text-underline-offset: 3px;
  outline: none;
}

.quantity-control {
  display: grid;
  grid-template-columns: 62px 30px;
  align-items: center;
  gap: 6px;
  width: 98px;
}

.quantity-control>span {
  color: var(--ink-muted);
  font-size: 11px;
}

.item-qty {
  width: 100%;
  min-height: 28px;
  padding: 4px 6px;
  border: 1px solid var(--line);
  border-radius: 9px;
  background: var(--surface);
  font-family: 'IBM Plex Mono', monospace;
  text-align: center;
}

.item-kcal {
  color: var(--ink-muted);
  font-family: inherit;
  font-size: 13px;
  white-space: nowrap;
}

.item-remove {
  background: none;
  color: var(--ink-muted);
  font-size: 15px;
  padding: 2px 4px;
}

.item-remove:hover {
  color: var(--red);
}

.add-item-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 72px 52px;
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
  min-height: 34px;
  padding: 7px 9px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background-color: var(--surface);
  color: var(--ink);
  font-size: 13px;
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
  min-height: 34px;
  padding: 7px 9px;
}

@media (max-width: 600px) {
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
    grid-template-columns: minmax(0, 1fr) 58px 42px;
  }

  .add-item-select {
    grid-column: 1;
    min-width: 0;
    padding-right: 22px;
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

