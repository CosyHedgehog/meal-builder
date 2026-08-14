<script setup>
import { computed, reactive, ref } from 'vue'
import BaseModal from './BaseModal.vue'
import { state as store, createFood, getIngredient, itemKcal, updateFood } from '../js/data.js'
import { Modals, openModal } from '../js/modals.js'
import { confirmAction } from '../js/confirm.js'
import { useDiscardChanges } from '../js/useDiscardChanges.js'

const props = defineProps({
  foodId: { type: String, default: null },
  groupId: { type: String, default: '' },
})
const emit = defineEmits(['close'])

const source = store.foods.find((food) => food.id === props.foodId)
const isNew = !source
const draft = reactive({
  name: source ? source.name : 'New food',
  groupId: source ? source.groupId : props.groupId,
  items: source ? source.items.map((item) => ({ ...item })) : [],
})
const pendingIngredientId = ref('')
const pendingQty = ref('')
const { confirmDiscard } = useDiscardChanges(draft)

const usedIds = computed(() => new Set(draft.items.map((item) => item.ingredientId)))
const available = computed(() => store.ingredients.filter((ingredient) => !usedIds.value.has(ingredient.id)))
const ingredientRows = computed(() => draft.items.map((item) => ({
  item,
  ingredient: getIngredient(item.ingredientId),
  kcal: Math.round(itemKcal(item)),
})))
const totalKcal = computed(() => Math.round(draft.items.reduce((sum, item) => sum + itemKcal(item), 0)))
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
  if (!draft.items.length) {
    validationMessage.value = 'Add at least one ingredient before saving.'
    return
  }
  if (isNew) createFood(draft)
  else updateFood(props.foodId, draft)
  emit('close')
}

async function closeEditor() {
  if (await confirmDiscard('Your unsaved food changes will be lost.')) emit('close')
}

</script>

<template>
  <BaseModal :title="isNew ? 'New food' : `Edit ${draft.name}`"
    subtitle="Build a reusable food from ingredients and place it in a group." @close="closeEditor">
    <div class="food-editor-content">
      <div class="input-field food-field">
        <label for="foodName">Name</label>
        <input id="foodName" v-model="draft.name" placeholder="e.g. Protein pancakes" />
      </div>
      <div class="input-field food-field">
        <label for="foodGroup">Group</label>
        <select id="foodGroup" v-model="draft.groupId">
          <option value="" disabled hidden>Select a group...</option>
          <option v-for="group in groups" :key="group.id" :value="group.id">{{ group.name }}</option>
        </select>
      </div>

      <section class="meal-total" aria-label="Food calorie total">
        <div>
          <span class="meal-total-label">Food total</span>
          <span class="meal-total-note">Based on current ingredients</span>
        </div>
        <strong>{{ totalKcal.toLocaleString() }} <small>kcal</small></strong>
      </section>

      <section class="meal-section food-ingredients-section">
        <div class="meal-section-heading">
          <div>
            <div class="meal-section-label">Ingredients <span class="meal-section-note">{{ draft.items.length }} item{{
              draft.items.length === 1 ? '' : 's' }}</span></div>
          </div>
        </div>
        <div v-if="draft.items.length" class="ingredient-list">
          <div
            v-for="row in ingredientRows"
            :key="row.item.ingredientId"
            class="ingredient-row"
            role="button"
            tabindex="0"
            @click="openModal('ingredient-editor', { ingredientId: row.item.ingredientId })"
            @keydown.enter="openModal('ingredient-editor', { ingredientId: row.item.ingredientId })"
            @keydown.space.prevent="openModal('ingredient-editor', { ingredientId: row.item.ingredientId })"
          >
            <div class="ingredient-row-main">
              <div class="ingredient-name-wrap">
                <div class="item-name">{{ row.ingredient?.name || 'Unknown' }}</div>
              </div>
              <div class="quantity-control">
                <input v-model.number="row.item.amount" class="item-qty" type="number" step="any" min="0" @click.stop />
                <span>{{ row.ingredient?.unit === 'g' ? 'g' : 'each' }}</span>
              </div>
            </div>
            <div class="item-kcal mono">{{ row.kcal.toLocaleString() }} kcal</div>
            <button class="item-remove" :aria-label="`Remove ${row.ingredient?.name || 'ingredient'}`"
              @click.stop="removeRow(row.item.ingredientId)">×</button>
          </div>
        </div>
        <div v-else class="empty-note meal-empty-note">
          <strong>No ingredients added yet</strong>
          <span>Build the food by adding ingredients below.</span>
        </div>
        <div class="add-item-row">
          <label class="add-item-label">Select an ingredient</label>
          <div class="ingredient-picker-trigger">
            <button
              type="button"
              class="add-item-select ingredient-picker-button"
              @click="openModal(Modals.INGREDIENT_PICKER, { excludedIds: [...usedIds], selectedId: pendingIngredientId, onSelect: selectIngredient })"
            >
              {{ getIngredient(pendingIngredientId)?.name || '🔎︎ Choose an ingredient...' }}
            </button>
          </div>
          <input v-model="pendingQty" class="add-item-qty" type="number" step="any" min="0" placeholder="Qty" />
          <button class="btn btn-primary add-item-button" type="button" @click="addIngredientRow">Add</button>
        </div>
        <div class="ingredient-actions">
          <button class="link-btn create-ingredient-link" type="button" @click="openModal('ingredient-editor')">＋ Create a new ingredient</button>
          <button class="link-btn ingredient-manager-link" type="button" aria-label="Edit ingredients" @click="openModal(Modals.INGREDIENT_MANAGER)">
            ✎ Edit ingredients
          </button>
        </div>
      </section>

      <div v-if="validationMessage" class="food-validation">{{ validationMessage }}</div>
      <button class="btn btn-primary primary-wide" type="button" @click="saveFood">{{ isNew ? 'Create food' : 'Save food' }}</button>
    </div>
  </BaseModal>
</template>

<style scoped>
.food-field {
  margin-bottom: 8px;
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

.food-validation {
  margin: 2px 0 -4px;
  color: var(--red);
  font-size: 12px;
}

.meal-total {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 16px;
  border: 1px solid var(--green-light);
  border-radius: 14px;
  background: var(--green-soft);
}

.meal-total-label,
.meal-total-note {
  display: block;
}

.meal-total-label {
  color: var(--green-strong);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.meal-total-note {
  color: var(--ink-muted);
  font-size: 12px;
}

.meal-total strong {
  color: var(--green-strong);
  font-family: 'IBM Plex Mono', monospace;
  font-size: 21px;
  white-space: nowrap;
}

.meal-total small {
  font-family: 'Inter', sans-serif;
  font-size: 11px;
  font-weight: 600;
}

.meal-section-heading .meal-section-label {
  color: var(--ink-muted);
}

.meal-section-heading .meal-section-note {
  color: var(--ink-muted);
  font-size: 12px;
  font-weight: 400;
  letter-spacing: 0;
  text-transform: none;
}

.meal-empty-note {
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 16px;
  border: 1px dashed var(--line);
  border-radius: 12px;
  background: var(--bg);
}

.meal-empty-note strong {
  color: var(--ink);
  font-size: 13px;
}

.meal-empty-note span {
  color: var(--ink-muted);
  font-size: 12px;
}

.ingredient-list {
  overflow: hidden;
  border: 1px solid var(--line);
  border-radius: 14px;
  background: var(--surface);
}

.ingredient-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto 24px;
  align-items: center;
  gap: 8px;
  padding: 7px 12px;
  border-bottom: 1px solid var(--line);
  cursor: pointer;
  transition: background 0.12s ease, color 0.12s ease;
}

.ingredient-row:hover,
.ingredient-row:focus-visible {
  background: var(--surface-alt);
  color: var(--green-strong);
  outline: none;
}

.ingredient-row:last-child {
  border-bottom: 0;
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
  font-size: 14px;
  font-weight: 600;
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
  min-height: 32px;
  padding: 7px 6px;
  border: 1px solid var(--line);
  border-radius: 9px;
  background: var(--surface);
  font-family: 'IBM Plex Mono', monospace;
}

.item-kcal {
  color: var(--ink-muted);
  font-size: 12px;
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

.ingredient-actions {
  display: flex;
  align-items: center;
  gap: 5px;
}

.ingredient-manager-link {
  margin-left: 1px;
}

.add-item-row {
  display: grid;
  grid-template-columns: 200px auto;
  grid-template-columns: minmax(0, 1fr) 72px 52px;
  gap: 6px;
  padding: 7px 10px;
  align-items: end;
  background: var(--bg);
  border: 1px solid var(--line);
  border-radius: 14px;
}

.add-item-label {
  grid-column: 1 / -1;
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
  min-height: 38px;
  padding: 8px 9px;
  border: 1px solid var(--line);
  border-radius: 9px;
  background-color: var(--surface);
  color: var(--ink);
  font-size: 13px;
}

.add-item-qty {
  font-family: 'IBM Plex Mono', monospace;
}

.add-item-button {
  min-height: 38px;
  padding: 8px;
}

@media (max-width: 600px) {
  .ingredient-row {
    grid-template-columns: minmax(0, 1fr) 22px;
    gap: 8px;
  }

  .ingredient-row-main {
    display: contents;
  }

  .ingredient-name-wrap {
    grid-column: 1;
    grid-row: 1;
  }

  .quantity-control {
    grid-column: 1;
    grid-row: 2;
    width: 104px;
    grid-template-columns: 56px 24px;
    gap: 4px;
  }

  .item-kcal {
    grid-column: 1;
    grid-row: 2;
    justify-self: end;
  }

  .item-remove {
    grid-column: 2;
    grid-row: 1 / span 2;
  }

  .add-item-row {
    grid-template-columns: minmax(0, 1fr) 72px;
  }

  .add-item-select {
    grid-column: 1 / -1;
  }

  .add-item-button {
    grid-column: 2;
  }
}
</style>
