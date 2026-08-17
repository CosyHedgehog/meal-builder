<script setup>
import { computed, nextTick, ref } from 'vue'
import { state as store, getIngredient, itemKcal } from '../js/data.js'
import { Modals, openModal } from '../js/modals.js'
import { confirmAction } from '../js/confirm.js'

const props = defineProps({
    draft: { type: Object, required: true },
})

const pendingIngredientId = ref('')
const pendingQty = ref('')
const ingredientQuery = ref('')
const ingredientQuantityInput = ref(null)

const usedIds = computed(() => new Set(props.draft.items.map((item) => item.ingredientId)))
const availableIngredients = computed(() => store.ingredients.filter((ingredient) => !usedIds.value.has(ingredient.id)))
const filteredIngredients = computed(() => {
    const normalized = ingredientQuery.value.trim().toLowerCase()
    return availableIngredients.value.filter((ingredient) => !normalized || ingredient.name.toLowerCase().includes(normalized))
})
const ingredientRows = computed(() => props.draft.items.map((item) => ({
    item,
    ingredient: getIngredient(item.ingredientId),
    kcal: Math.round(itemKcal(item)),
})))
const totalKcal = computed(() => props.draft.items.length
    ? Math.round(props.draft.items.reduce((sum, item) => sum + itemKcal(item), 0))
    : Math.round(Number(props.draft.kcal) || 0))

async function selectIngredient(ingredientId) {
    pendingIngredientId.value = ingredientId
    ingredientQuery.value = getIngredient(ingredientId)?.name || ''
    await nextTick()
    ingredientQuantityInput.value?.focus()
}

function openIngredientPicker() {
    openModal(Modals.INGREDIENT_PICKER, {
        excludedIds: [...usedIds.value],
        initialQuery: ingredientQuery.value,
        onSelect: selectIngredient,
    })
}

function addIngredientRow() {
    if (!pendingIngredientId.value) return
    const amount = parseFloat(pendingQty.value)
    props.draft.items.push({
        ingredientId: pendingIngredientId.value,
        amount: !Number.isFinite(amount) || amount <= 0 ? 1 : amount,
    })
    pendingIngredientId.value = ''
    pendingQty.value = ''
    ingredientQuery.value = ''
}

async function removeRow(ingredientId) {
    const ingredient = getIngredient(ingredientId)
    const ok = await confirmAction({
        title: 'Remove ingredient',
        message: `Remove "${ingredient?.name || 'this ingredient'}" from this food?`,
        okLabel: 'Remove ingredient',
    })
    if (!ok) return
    props.draft.items = props.draft.items.filter((item) => item.ingredientId !== ingredientId)
}
</script>

<template>
    <section class="food-ingredients-section">
        <div class="meal-section-heading">
            <div>
                <div class="meal-section-label">Ingredients <span class="meal-section-note">({{ draft.items.length }}
                        added)</span></div>
            </div>
            <div class="food-total" aria-label="Calculated food calorie total">
                <strong>{{ totalKcal.toLocaleString() }} <small>kcal</small></strong>
            </div>
        </div>
        <div class="food-ingredients-list-container" :class="{ empty: !draft.items.length }">
            <div v-if="!draft.items.length" class="food-ingredients-empty" aria-live="polite">
                <strong>No ingredients selected</strong>
                <span>Choose an ingredient below to build this food.</span>
            </div>
            <div class="ingredient-list">
                <div v-for="row in ingredientRows" :key="row.item.ingredientId" class="ingredient-row">
                    <div class="ingredient-row-main">
                        <div class="ingredient-name-wrap">
                            <button type="button" class="item-name"
                                @click="openModal(Modals.INGREDIENT_EDITOR, { ingredientId: row.item.ingredientId })">
                                <span class="item-edit-icon" aria-hidden="true">✎</span>
                                <span>{{ row.ingredient?.name || 'Unknown' }}</span>
                            </button>
                        </div>
                        <div class="quantity-control">
                            <input v-model.number="row.item.amount" class="item-qty" type="number" step="any" min="0"
                                @click.stop />
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
                <button class="link-btn manage-ingredients-link" type="button"
                    @click="openModal(Modals.INGREDIENT_MANAGER)">
                    Manage ingredients
                </button>
            </div>
            <div class="ingredient-picker-trigger" role="button" tabindex="0" aria-label="Open ingredient chooser"
                @keydown.enter="openIngredientPicker" @keydown.space.prevent="openIngredientPicker">
                <input readonly v-model="ingredientQuery" class="add-item-select ingredient-picker-input" type="text"
                    placeholder="Choose an ingredient..." aria-label="Choose an ingredient"
                    @click="openIngredientPicker" />
            </div>
            <input ref="ingredientQuantityInput" v-model="pendingQty" class="add-item-qty" type="number" step="any"
                min="0" :placeholder="getIngredient(pendingIngredientId)?.unit === 'g' ? 'g' : 'each'"
                @keydown.enter.prevent="addIngredientRow" />
            <button class="link-btn add-item-button" type="button" @click="addIngredientRow">＋ Add</button>
        </div>
    </section>
</template>

<style scoped>
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
    min-height: 0;
    max-height: 194px;
    padding: 5px;
    border: 1px solid var(--line);
    border-radius: 12px;
    background: color-mix(in srgb, var(--surface) 92%, var(--surface-alt));
    overflow: hidden;
}

.food-ingredients-list-container.empty {
    min-height: 82px;
    align-items: center;
    justify-content: center;
}

.food-ingredients-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    color: var(--ink-muted);
    font-size: 11px;
    text-align: center;
}

.food-ingredients-empty strong {
    color: var(--ink);
    font-size: 12px;
}

.food-ingredients-list-container .ingredient-list {
    min-height: 0;
    overflow-y: auto;
}

.meal-section-heading {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 0 2px;
}

.meal-section-heading .meal-section-label {
    color: var(--ink-muted);
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
}

.meal-section-heading .meal-section-note {
    color: var(--ink);
    font-size: 12px;
    font-weight: 400;
    letter-spacing: 0;
    text-transform: none;
}

.meal-section-heading .food-total {
    flex: none;
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
}

.ingredient-row+.ingredient-row {
    border-top: 1px solid var(--line);
}

.ingredient-row:hover {
    background: var(--surface-alt);
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

.item-name:focus-visible {
    border-radius: 4px;
    outline: 2px solid var(--green);
    outline-offset: 2px;
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
    width: 64px;
    min-width: 64px;
    overflow: hidden;
    color: var(--ink-muted);
    font-size: 13px;
    font-variant-numeric: tabular-nums;
    text-align: right;
    white-space: nowrap;
}

.item-remove {
    width: 22px;
    min-width: 22px;
    padding: 2px 4px;
    border: 0;
    background: none;
    color: var(--ink-muted);
    font-size: 15px;
    text-align: center;
}

.item-remove:hover {
    color: var(--red);
}

.item-remove:focus-visible {
    border-radius: 4px;
    outline: 2px solid var(--green);
    outline-offset: 1px;
}

.add-item-row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 100px 40px;
    gap: 5px;
    padding: 10px 0 3px;
    align-items: end;
}

.add-item-label-row {
    grid-column: 1 / -1;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
}

.add-item-label {
    margin-bottom: 1px;
    color: var(--ink-muted);
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
}

.manage-ingredients-link {
    margin: 0;
    padding: 0;
    font-size: 11px;
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
    margin: 0;
    padding: 8px 4px;
    white-space: nowrap;
}

@media (max-width: 600px) {
    .food-ingredients-section {
        display: contents;
    }

    .food-ingredients-list-container {
        flex: 1;
        min-height: 0;
    }

    .ingredient-row {
        grid-template-columns: minmax(0, 1fr) 56px 22px 64px 22px;
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

    .item-name>span:last-child {
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

    .add-item-label-row {
        grid-column: 1 / -1;
    }

    .ingredient-picker-trigger {
        grid-column: 1;
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
