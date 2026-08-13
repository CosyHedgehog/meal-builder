<script setup>
import { computed, reactive, ref } from 'vue'
import BaseModal from './BaseModal.vue'
import {
  state as store,
  createMeal,
  deleteMeal,
  getIngredient,
  itemKcal,
  updateMeal,
} from '../js/data.js'
import { confirmAction } from '../js/confirm.js'
import { openModal } from '../js/modals.js'
import { useDiscardChanges } from '../js/useDiscardChanges.js'

const props = defineProps({ mealId: { type: String, default: null } })
const emit = defineEmits(['close'])

const isNew = !props.mealId
const source = store.meals.find((m) => m.id === props.mealId)

/** Edit a local draft so closing without saving discards the changes. */
const draft = reactive({
  name: source ? source.name : 'New meal',
  items: source ? source.items.map((it) => ({ ...it })) : [],
})

const { confirmDiscard } = useDiscardChanges(draft)

const pendingIngredientId = ref('')
const pendingQty = ref('')

const usedIds = computed(() => new Set(draft.items.map((it) => it.ingredientId)))
const available = computed(() => store.ingredients.filter((i) => !usedIds.value.has(i.id)))
const ingredientRows = computed(() =>
  draft.items.map((item) => ({
    item,
    ingredient: getIngredient(item.ingredientId),
    kcal: Math.round(itemKcal(item)),
  })),
)
const totalKcal = computed(() =>
  Math.round(draft.items.reduce((sum, it) => sum + itemKcal(it), 0)),
)

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

function removeRow(ingredientId) {
  draft.items = draft.items.filter((it) => it.ingredientId !== ingredientId)
}

function saveMeal() {
  if (isNew) createMeal(draft)
  else updateMeal(props.mealId, draft)
  emit('close')
}

async function closeEditor() {
  if (await confirmDiscard('Your unsaved meal changes will be lost.')) emit('close')
}

async function removeMeal() {
  const ok = await confirmAction({
    title: 'Delete meal',
    message: `Delete "${draft.name}"?`,
    okLabel: 'Delete meal',
  })
  if (!ok) return
  deleteMeal(props.mealId)
  emit('close')
}
</script>

<template>
  <BaseModal
    :title="isNew ? 'New meal' : 'Edit meal'"
    subtitle="Add ingredients and adjust the calories for this meal."
    @close="closeEditor"
  >
    <div class="meal-editor-content">
      <section class="meal-section meal-identity">
        <div class="meal-section-label">Meal name</div>
        <input id="mealName" v-model="draft.name" class="meal-name-input" placeholder="e.g. Chicken & rice" />
      </section>

      <section class="meal-total" aria-label="Meal calorie total">
        <div>
          <span class="meal-total-label">Meal total</span>
          <span class="meal-total-note">Based on current ingredients</span>
        </div>
        <strong>{{ totalKcal.toLocaleString() }} <small>kcal</small></strong>
      </section>

      <section class="meal-section">
        <div class="meal-section-heading">
          <div>
            <div class="meal-section-label">Ingredients</div>
            <span class="meal-section-note">{{ draft.items.length }} item{{ draft.items.length === 1 ? '' : 's' }}</span>
          </div>
        </div>

        <div v-if="draft.items.length" class="ingredient-list">
          <div v-for="row in ingredientRows" :key="row.item.ingredientId" class="ingredient-row">
            <div class="ingredient-row-main">
              <div class="item-name">{{ row.ingredient?.name || 'Unknown' }}</div>
              <div class="quantity-control">
                <input v-model.number="row.item.amount" class="item-qty" type="number" step="any" min="0" />
                <span>{{ row.ingredient?.unit === 'g' ? 'g' : 'each' }}</span>
              </div>
            </div>
            <div class="item-kcal mono">{{ row.kcal.toLocaleString() }} kcal</div>
            <button
              class="item-edit"
              :aria-label="`Edit ${row.ingredient?.name || 'ingredient'}`"
              @click="openModal('ingredient-editor', { ingredientId: row.item.ingredientId })"
            >
              ✎
            </button>
            <button
              class="item-remove"
              :aria-label="`Remove ${row.ingredient?.name || 'ingredient'}`"
              @click="removeRow(row.item.ingredientId)"
            >
              ×
            </button>
          </div>
        </div>
        <div v-else class="empty-note meal-empty-note">
          <strong>No ingredients added yet</strong>
          <span>Build the meal by adding ingredients below.</span>
        </div>

        <div class="add-item-row">
          <select v-model="pendingIngredientId" class="add-item-select">
            <option value="">Choose an ingredient…</option>
            <option v-for="i in available" :key="i.id" :value="i.id">
              {{ i.name }} ({{ i.unit === 'g' ? 'g' : 'each' }})
            </option>
          </select>
          <input v-model="pendingQty" class="add-item-qty" type="number" step="any" min="0" placeholder="Qty" />
          <button class="btn btn-primary add-item-button" @click="addIngredientRow">Add</button>
        </div>
        <button class="link-btn create-ingredient-link" @click="openModal('ingredient-editor')">
          ＋ Create a new ingredient
        </button>
      </section>

      <div class="meal-editor-footer">
        <button class="btn btn-primary primary-wide" @click="saveMeal">
          {{ isNew ? 'Create meal' : 'Save meal' }}
        </button>
      </div>
    </div>
  </BaseModal>
</template>

<style scoped>
.meal-editor-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.meal-section {
  display: flex;
  flex-direction: column;
  gap: 9px;
}

.meal-section-label {
  color: var(--ink-muted);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.meal-section-note,
.meal-total-note {
  color: var(--ink-muted);
  font-size: 12px;
}

.meal-name-input {
  width: 100%;
  padding: 12px 13px;
  border: 1px solid var(--line);
  border-radius: 10px;
  background: var(--bg);
  color: var(--ink);
  font-size: 15px;
}

.meal-name-input:focus {
  outline: 2px solid var(--green);
  outline-offset: 1px;
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
  text-transform: uppercase;
  letter-spacing: 0.08em;
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

.meal-section-heading {
  display: flex;
  justify-content: space-between;
}

.meal-section-heading > div {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.ingredient-list {
  overflow: hidden;
  border: 1px solid var(--line);
  border-radius: 14px;
  background: var(--surface);
}

.ingredient-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto 24px 24px;
  align-items: center;
  gap: 12px;
  padding: 12px 13px;
  border-bottom: 1px solid var(--line);
}

.ingredient-row:last-child {
  border-bottom: 0;
}

.ingredient-row-main {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  min-width: 0;
}

.item-name {
  font-size: 14px;
  font-weight: 600;
  line-height: 1.3;
  min-width: 0;
}

.quantity-control {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  flex: none;
}

.quantity-control > span {
  color: var(--ink-muted);
  font-size: 11px;
}

.item-qty {
  width: 100%;
  padding: 9px 7px;
  border: 1px solid var(--line);
  border-radius: 9px;
  background: var(--surface);
  font-family: 'IBM Plex Mono', monospace;
  font-size: 13px;
  min-height: 40px;
}

.item-qty:focus {
  outline: 2px solid var(--green);
  outline-offset: 1px;
}

.item-kcal {
  text-align: right;
  font-size: 12px;
  color: var(--ink-muted);
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

.item-edit {
  width: 24px;
  height: 24px;
  padding: 0;
  border: 1px solid transparent;
  border-radius: 6px;
  background: transparent;
  color: var(--ink-muted);
  font-size: 13px;
}

.item-edit:hover {
  border-color: var(--line);
  background: var(--surface-alt);
  color: var(--green);
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

.add-item-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 72px 52px;
  gap: 8px;
  padding: 10px;
  background: var(--bg);
  border: 1px solid var(--line);
  border-radius: 14px;
}

.add-item-select,
.add-item-qty {
  width: 100%;
  min-width: 0;
  padding: 11px 9px;
  border: 1px solid var(--line);
  border-radius: 9px;
  background: var(--surface);
  font-size: 13px;
  min-height: 40px;
}

.add-item-qty {
  font-family: 'IBM Plex Mono', monospace;
}

.add-item-row .btn {
  padding: 10px 8px;
}

.create-ingredient-link {
  align-self: flex-start;
  margin-top: -2px;
}

.meal-editor-footer {
  padding-top: 2px;
  border-top: 1px solid var(--line);
}

.meal-editor-footer .primary-wide {
  margin-top: 16px;
}

@media (max-width: 600px) {
  .ingredient-row {
    grid-template-columns: minmax(0, 1fr) auto 22px 22px;
    gap: 8px;
    padding: 11px 10px;
  }

  .ingredient-row-main {
    display: contents;
  }

  .ingredient-row .item-name {
    grid-column: 1 / 3;
  }

  .ingredient-row .quantity-control {
    grid-column: 1;
  }

  .ingredient-row .item-kcal {
    grid-column: 2;
    grid-row: 2;
  }

  .ingredient-row .item-remove {
    grid-column: 4;
    grid-row: 1 / 3;
  }

  .ingredient-row .item-edit {
    grid-column: 3;
    grid-row: 1 / 3;
  }
}
</style>