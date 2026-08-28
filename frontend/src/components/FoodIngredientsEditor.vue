<script setup>
import { computed, nextTick } from 'vue'
import { getIngredient, itemKcal } from '../js/data.js'
import { Modals, openModal } from '../js/modals.js'
import { confirmAction } from '../js/confirm.js'

const props = defineProps({
    draft: { type: Object, required: true },
})

const ingredientQuantityInputs = new Map()

const usedIds = computed(() => new Set(props.draft.items.map((item) => item.ingredientId)))
const ingredientRows = computed(() => props.draft.items.map((item) => ({
    item,
    ingredient: getIngredient(item.ingredientId),
    kcal: Math.round(itemKcal(item)),
})))
const totalKcal = computed(() => props.draft.items.length
    ? Math.round(props.draft.items.reduce((sum, item) => sum + itemKcal(item), 0))
    : Math.round(Number(props.draft.kcal) || 0))

async function selectIngredient(ingredientId) {
    props.draft.items.push({ ingredientId, amount: 1 })
    await nextTick()
    ingredientQuantityInputs.get(ingredientId)?.focus()
}

function openIngredientPicker() {
    openModal(Modals.INGREDIENT_PICKER, {
        excludedIds: [...usedIds.value],
        onSelect: selectIngredient,
    })
}

function setIngredientQuantityInput(ingredientId, element) {
    if (element) ingredientQuantityInputs.set(ingredientId, element)
    else ingredientQuantityInputs.delete(ingredientId)
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
                <div class="meal-section-label">{{ draft.items.length }} ingredients</div>
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
                                <span>{{ row.ingredient?.name || 'Unknown' }}</span>
                            </button>
                            <div class="item-kcal">{{ row.kcal.toLocaleString() }} kcal</div>
                        </div>
                        <div class="quantity-control">
                            <input :ref="(element) => setIngredientQuantityInput(row.item.ingredientId, element)"
                                v-model.number="row.item.amount" class="item-qty" type="number" step="any" min="0"
                                @click.stop />
                            <span>{{ row.ingredient?.unit === 'g' ? 'g' : '' }}</span>
                        </div>
                    </div>
                    <button class="item-remove" :aria-label="`Remove ${row.ingredient?.name || 'ingredient'}`"
                        @click.stop="removeRow(row.item.ingredientId)">×</button>
                </div>
            </div>
        </div>
        <button class="add-ingredient-trigger" type="button" @click="openIngredientPicker">
            <span aria-hidden="true">＋</span> Add ingredient
        </button>
    </section>
</template>

<style scoped>
.food-ingredients-section {
    display: flex;
    min-height: 0;
    flex: 1;
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
    font-size: 14px;
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
    grid-template-columns: minmax(0, 1fr) auto;
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
    font-size: 11px;
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

}

.food-ingredients-section {
    gap: 10px;
}

.food-ingredients-list-container {
    flex: 1;
    max-height: none;
    padding: 0;
    border: 0;
    border-radius: 0;
    background: transparent;
    overflow: visible;
}

.ingredient-list {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    border-radius: 0;
    background: transparent;
}

.ingredient-row {
    min-height: 50px;
    padding: 7px 4px;
    border-top: 0;
    border-radius: 10px;
    background: transparent;
}

.ingredient-row + .ingredient-row {
    border-top: 0;
}

.ingredient-row:hover {
    background: var(--surface-alt);
}

.ingredient-row-main {
    grid-template-columns: minmax(0, 1fr) auto;
}

.ingredient-name-wrap {
    display: block;
}

.item-name {
    font-family: -apple-system, BlinkMacSystemFont, 'Inter', sans-serif;
    font-size: 12px;
    font-weight: 500;
    color: var(--ink);
}

.item-kcal {
    width: auto;
    min-width: 0;
    margin-top: 3px;
    color: color-mix(in srgb, var(--ink) 40%, transparent);
    font-family: -apple-system, BlinkMacSystemFont, 'Inter', sans-serif;
    font-size: 12px;
    text-align: left;
}

.quantity-control {
    grid-template-columns: 64px 24px;
    width: 94px;
}

.item-qty {
    min-height: 34px;
    background: var(--surface-alt);
    font-family: -apple-system, BlinkMacSystemFont, 'Inter', sans-serif;
    font-size: 12px;
    font-weight: 400;
    appearance: textfield;
}

.item-qty::-webkit-outer-spin-button,
.item-qty::-webkit-inner-spin-button,
.add-item-qty::-webkit-outer-spin-button,
.add-item-qty::-webkit-inner-spin-button {
    margin: 0;
    appearance: none;
}

.add-item-qty {
    font-family: -apple-system, BlinkMacSystemFont, 'Inter', sans-serif;
    font-size: 14px;
    font-weight: 400;
    appearance: textfield;
}

.add-ingredient-trigger {
    width: 100%;
    border: 1px dashed var(--line);
    border-radius: 10px;
    background: transparent;
}

.add-ingredient-trigger {
    padding: 11px 10px;
    color: var(--ink-muted);
    font-size: 13px;
    text-align: left;
}

.add-ingredient-trigger:hover {
    border-color: var(--green-light);
    color: var(--green-strong);
}

.add-ingredient-trigger span {
    margin-right: 5px;
    font-size: 18px;
    line-height: 0;
    vertical-align: -2px;
}

@media (max-width: 600px) {
    .ingredient-row {
        grid-template-columns: minmax(0, 1fr) 56px 22px;
    }

    .ingredient-row-main {
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto;
        grid-column: 1 / span 2;
    }

    .ingredient-name-wrap {
        grid-column: 1;
        grid-row: 1;
    }

    .quantity-control {
        grid-column: 2;
        grid-row: 1;
        width: 80px;
        grid-template-columns: 56px 18px;
    }

    .item-remove {
        grid-column: 3;
        grid-row: 1;
    }
}
</style>
