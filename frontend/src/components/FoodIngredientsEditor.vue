<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue'
import { state as store, getIngredient, itemKcal } from '../js/data.js'
import { Modals, openModal } from '../js/modals.js'
import { confirmAction } from '../js/confirm.js'

const props = defineProps({
    draft: { type: Object, required: true },
})

const ingredientQuantityInputs = new Map()
const searchQuery = ref('')
const isDropdownOpen = ref(false)
const highlightedIndex = ref(-1)
const searchInputRef = ref(null)
const comboboxRef = ref(null)
const draggedIngredientId = ref(null)
const draggedOverIngredientId = ref(null)
const ingredientDrag = { id: null, pointerId: null, active: false, startX: 0, startY: 0 }

const usedIds = computed(() => new Set(props.draft.items.map((item) => item.ingredientId)))
const ingredientRows = computed(() => props.draft.items.map((item) => ({
    item,
    ingredient: getIngredient(item.ingredientId),
    kcal: Math.round(itemKcal(item)),
})))
const totalKcal = computed(() => props.draft.items.length
    ? Math.round(props.draft.items.reduce((sum, item) => sum + itemKcal(item), 0))
    : Math.round(Number(props.draft.kcal) || 0))

const filteredIngredients = computed(() => {
    const q = searchQuery.value.trim().toLowerCase()
    return store.ingredients.filter((ingredient) => (
        !usedIds.value.has(ingredient.id)
        && (!q || ingredient.name.toLowerCase().includes(q))
    ))
})

const canCreateNew = computed(() => {
    const q = searchQuery.value.trim()
    if (!q) return false
    const lower = q.toLowerCase()
    return !store.ingredients.some((i) => i.name.toLowerCase() === lower)
})

// Options for keyboard navigation: filtered ingredients + (optional create new)
const dropdownOptions = computed(() => {
    const items = filteredIngredients.value.map((ing) => ({ type: 'ingredient', item: ing }))
    if (canCreateNew.value) {
        items.push({ type: 'create', name: searchQuery.value.trim() })
    }
    return items
})

async function selectIngredient(ingredientId) {
    if (!props.draft.items.some((item) => item.ingredientId === ingredientId)) {
        props.draft.items.push({ ingredientId, amount: 1 })
    }
    searchQuery.value = ''
    isDropdownOpen.value = false
    highlightedIndex.value = -1
    await nextTick()
    ingredientQuantityInputs.get(ingredientId)?.focus()
}

function createNewIngredient(name = searchQuery.value.trim()) {
    isDropdownOpen.value = false
    openModal(Modals.INGREDIENT_EDITOR, {
        initialName: name,
        onCreated: (createdId) => {
            selectIngredient(createdId)
        },
    })
}

function handleOptionSelect(opt) {
    if (!opt) return
    if (opt.type === 'ingredient') {
        selectIngredient(opt.item.id)
    } else if (opt.type === 'create') {
        createNewIngredient(opt.name)
    }
}

function onSearchFocus() {
    isDropdownOpen.value = true
}

function onSearchInput() {
    isDropdownOpen.value = true
    highlightedIndex.value = 0
}

function onSearchKeydown(e) {
    if (!isDropdownOpen.value && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
        isDropdownOpen.value = true
        return
    }
    if (!isDropdownOpen.value) return

    if (e.key === 'ArrowDown') {
        e.preventDefault()
        if (dropdownOptions.value.length > 0) {
            highlightedIndex.value = (highlightedIndex.value + 1) % dropdownOptions.value.length
        }
    } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        if (dropdownOptions.value.length > 0) {
            highlightedIndex.value = (highlightedIndex.value - 1 + dropdownOptions.value.length) % dropdownOptions.value.length
        }
    } else if (e.key === 'Enter') {
        e.preventDefault()
        if (highlightedIndex.value >= 0 && highlightedIndex.value < dropdownOptions.value.length) {
            handleOptionSelect(dropdownOptions.value[highlightedIndex.value])
        } else if (dropdownOptions.value.length > 0) {
            handleOptionSelect(dropdownOptions.value[0])
        }
    } else if (e.key === 'Escape') {
        isDropdownOpen.value = false
    }
}

function handleClickOutside(event) {
    if (comboboxRef.value && !comboboxRef.value.contains(event.target)) {
        isDropdownOpen.value = false
    }
}

onMounted(() => {
    document.addEventListener('pointerdown', handleClickOutside)
    document.addEventListener('pointermove', handleIngredientPointerMove, { passive: false })
    document.addEventListener('pointerup', finishIngredientDrag)
    document.addEventListener('pointercancel', cancelIngredientDrag)
})

onUnmounted(() => {
    document.removeEventListener('pointerdown', handleClickOutside)
    document.removeEventListener('pointermove', handleIngredientPointerMove)
    document.removeEventListener('pointerup', finishIngredientDrag)
    document.removeEventListener('pointercancel', cancelIngredientDrag)
})

function setIngredientQuantityInput(ingredientId, element) {
    if (element) ingredientQuantityInputs.set(ingredientId, element)
    else ingredientQuantityInputs.delete(ingredientId)
}

function startIngredientDrag(event, ingredientId) {
    if (event.button !== 0) return
    event.preventDefault()
    event.stopPropagation()
    ingredientDrag.id = ingredientId
    ingredientDrag.pointerId = event.pointerId
    ingredientDrag.active = false
    ingredientDrag.startX = event.clientX
    ingredientDrag.startY = event.clientY
}

function handleIngredientPointerMove(event) {
    if (event.pointerId !== ingredientDrag.pointerId || !ingredientDrag.id) return
    const distance = Math.hypot(event.clientX - ingredientDrag.startX, event.clientY - ingredientDrag.startY)
    if (!ingredientDrag.active && distance < 6) return
    if (!ingredientDrag.active) {
        ingredientDrag.active = true
        draggedIngredientId.value = ingredientDrag.id
    }
    event.preventDefault()
    draggedOverIngredientId.value = event.target?.closest('.ingredient-row')?.dataset.ingredientId || ''
}

function finishIngredientDrag(event) {
    if (event.pointerId !== ingredientDrag.pointerId) return
    if (ingredientDrag.active && draggedOverIngredientId.value && draggedOverIngredientId.value !== ingredientDrag.id) {
        const fromIndex = props.draft.items.findIndex((item) => item.ingredientId === ingredientDrag.id)
        const targetIndex = props.draft.items.findIndex((item) => item.ingredientId === draggedOverIngredientId.value)
        if (fromIndex !== -1 && targetIndex !== -1) {
            const items = [...props.draft.items]
            const moved = items[fromIndex]
            items[fromIndex] = items[targetIndex]
            items[targetIndex] = moved
            props.draft.items = items
        }
    }
    cancelIngredientDrag()
}

function cancelIngredientDrag() {
    ingredientDrag.id = null
    ingredientDrag.pointerId = null
    ingredientDrag.active = false
    draggedIngredientId.value = null
    draggedOverIngredientId.value = null
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
                <strong>No ingredients added</strong>
                <span>Search or type an ingredient below to add it.</span>
            </div>
            <div class="ingredient-list">
                <div v-for="row in ingredientRows" :key="row.item.ingredientId" class="ingredient-row"
                    :data-ingredient-id="row.item.ingredientId"
                    :class="{ dragging: draggedIngredientId === row.item.ingredientId, 'drag-over': draggedOverIngredientId === row.item.ingredientId && draggedIngredientId !== row.item.ingredientId }">
                    <button type="button" class="ingredient-drag-handle"
                        :aria-label="`Reorder ${row.ingredient?.name || 'ingredient'}`"
                        title="Drag to reorder"
                        @pointerdown="startIngredientDrag($event, row.item.ingredientId)"
                        @click.stop>
                        <svg viewBox="0 0 12 18" aria-hidden="true">
                            <rect x="1" y="1" width="3" height="3" rx="0.5" />
                            <rect x="8" y="1" width="3" height="3" rx="0.5" />
                            <rect x="1" y="7.5" width="3" height="3" rx="0.5" />
                            <rect x="8" y="7.5" width="3" height="3" rx="0.5" />
                            <rect x="1" y="14" width="3" height="3" rx="0.5" />
                            <rect x="8" y="14" width="3" height="3" rx="0.5" />
                        </svg>
                    </button>
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

        <div ref="comboboxRef" class="ingredient-combobox">
            <div class="combobox-input-wrap">
                <span class="combobox-search-icon" aria-hidden="true">🔍</span>
                <input
                    ref="searchInputRef"
                    v-model="searchQuery"
                    type="text"
                    class="combobox-input"
                    placeholder="Search or add ingredient..."
                    autocomplete="off"
                    @focus="onSearchFocus"
                    @input="onSearchInput"
                    @keydown="onSearchKeydown"
                />
                <button
                    v-if="searchQuery"
                    type="button"
                    class="combobox-clear-btn"
                    aria-label="Clear search"
                    @click="searchQuery = ''; searchInputRef?.focus()"
                >×</button>
            </div>

            <div v-if="isDropdownOpen" class="combobox-dropdown" role="listbox">
                <div v-if="dropdownOptions.length === 0" class="combobox-empty">
                    <span>No ingredients found</span>
                </div>

                <template v-for="(opt, idx) in dropdownOptions" :key="opt.type === 'ingredient' ? opt.item.id : 'create-new'">
                    <button
                        v-if="opt.type === 'ingredient'"
                        type="button"
                        class="combobox-option"
                        :class="{ 'is-highlighted': highlightedIndex === idx }"
                        role="option"
                        @click="handleOptionSelect(opt)"
                        @mouseenter="highlightedIndex = idx"
                    >
                        <span class="option-name">{{ opt.item.name }}</span>
                        <span class="option-meta">{{ opt.item.kcal }} kcal {{ opt.item.unit === 'g' ? '/ 100g' : '/ item' }}</span>
                    </button>

                    <button
                        v-else-if="opt.type === 'create'"
                        type="button"
                        class="combobox-option combobox-create-option"
                        :class="{ 'is-highlighted': highlightedIndex === idx }"
                        role="option"
                        @click="handleOptionSelect(opt)"
                        @mouseenter="highlightedIndex = idx"
                    >
                        <span class="option-name">
                            <strong class="create-badge">＋ Create</strong> "{{ opt.name }}"
                        </span>
                        <span class="option-meta">New ingredient</span>
                    </button>
                </template>

                <div class="combobox-dropdown-footer">
                    <button
                        type="button"
                        class="combobox-footer-action"
                        @click="createNewIngredient(searchQuery.trim())"
                    >
                        <span class="footer-action-icon">＋</span>
                        New ingredient
                    </button>
                    <button
                        type="button"
                        class="combobox-footer-action"
                        @click="isDropdownOpen = false; openModal(Modals.INGREDIENT_MANAGER)"
                    >
                        <svg class="manage-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">
                            <path d="M4 7h16M4 17h16" />
                            <circle cx="9" cy="7" r="2" />
                            <circle cx="15" cy="17" r="2" />
                        </svg>
                        Manage ingredients
                    </button>
                </div>
            </div>
        </div>
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
    grid-template-columns: 22px minmax(0, 1fr) auto;
    align-items: center;
    gap: 8px;
    min-height: 40px;
    padding: 5px 6px;
}

.ingredient-row.dragging {
    opacity: 0.45;
}

.ingredient-row.drag-over {
    outline: 2px dashed var(--green);
    outline-offset: -2px;
    background: color-mix(in srgb, var(--green-soft) 45%, var(--surface));
}

.ingredient-drag-handle {
    display: inline-flex;
    width: 20px;
    height: 24px;
    align-items: center;
    justify-content: center;
    padding: 0;
    border: 0;
    border-radius: 6px;
    background: transparent;
    color: color-mix(in srgb, var(--ink-muted) 72%, transparent);
    opacity: 0.8;
    line-height: 1;
    cursor: grab;
    touch-action: none;
}

.ingredient-drag-handle svg {
    width: 10px;
    height: 15px;
    fill: currentColor;
}

.ingredient-drag-handle:hover,
.ingredient-drag-handle:focus-visible {
    background: var(--surface-alt);
    color: var(--green-strong);
    opacity: 1;
}

.ingredient-drag-handle:active {
    cursor: grabbing;
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

.ingredient-combobox {
    position: relative;
    width: 100%;
    margin-top: 4px;
}

.combobox-input-wrap {
    position: relative;
    display: flex;
    align-items: center;
    width: 100%;
}

.combobox-search-icon {
    position: absolute;
    left: 12px;
    font-size: 13px;
    opacity: 0.6;
    pointer-events: none;
}

.combobox-input {
    width: 100%;
    min-height: 40px;
    padding: 9px 34px 9px 34px;
    border: 1px dashed var(--line);
    border-radius: 10px;
    background: var(--surface);
    color: var(--ink);
    font-size: 13px;
    transition: border-color 0.15s ease, background-color 0.15s ease, box-shadow 0.15s ease;
}

.combobox-input:focus {
    border-style: solid;
    border-color: var(--green-light);
    background: var(--surface-alt);
    outline: none;
    box-shadow: 0 0 0 2px rgba(var(--green-rgb, 76, 175, 80), 0.15);
}

.combobox-clear-btn {
    position: absolute;
    right: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    padding: 0;
    border: 0;
    border-radius: 50%;
    background: var(--surface-alt);
    color: var(--ink-muted);
    font-size: 14px;
    line-height: 1;
    cursor: pointer;
}

.combobox-clear-btn:hover {
    color: var(--ink);
    background: var(--line);
}

.combobox-dropdown {
    position: absolute;
    bottom: calc(100% + 6px);
    left: 0;
    right: 0;
    z-index: 20;
    max-height: 220px;
    overflow-y: auto;
    border: 1px solid var(--line);
    border-radius: 10px;
    background: var(--surface);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
    display: flex;
    flex-direction: column;
}

.combobox-empty {
    padding: 12px;
    color: var(--ink-muted);
    font-size: 12px;
    text-align: center;
}

.combobox-option {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    width: 100%;
    padding: 9px 12px;
    border: 0;
    border-bottom: 1px solid var(--line);
    background: transparent;
    color: var(--ink);
    font-size: 12px;
    text-align: left;
    cursor: pointer;
    transition: background-color 0.1s ease;
}

.combobox-option:last-of-type {
    border-bottom: 0;
}

.combobox-option:hover,
.combobox-option.is-highlighted {
    background: var(--surface-alt);
    color: var(--green-strong);
}

.combobox-option .option-name {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.combobox-option .option-meta {
    flex: none;
    color: var(--ink-muted);
    font-size: 11px;
}

.combobox-create-option {
    background: color-mix(in srgb, var(--green) 6%, transparent);
}

.combobox-create-option:hover,
.combobox-create-option.is-highlighted {
    background: color-mix(in srgb, var(--green) 14%, transparent);
}

.create-badge {
    color: var(--green-strong);
    font-weight: 700;
}

.combobox-dropdown-footer {
    position: sticky;
    bottom: 0;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 6px;
    background: var(--surface);
    border-top: 1px solid var(--line);
    padding: 6px;
    z-index: 2;
}

.combobox-footer-action {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 5px;
    width: 100%;
    padding: 6px 8px;
    border: 0;
    border-radius: 6px;
    background: var(--surface-alt);
    color: var(--ink-muted);
    font-size: 11px;
    cursor: pointer;
    white-space: nowrap;
}

.combobox-footer-action:hover {
    color: var(--ink);
    background: color-mix(in srgb, var(--surface-alt) 80%, var(--line));
}

.footer-action-icon {
    font-size: 13px;
    line-height: 1;
    color: var(--green-strong);
}

.manage-icon {
    width: 13px;
    height: 13px;
}

@media (max-width: 600px) {
    .ingredient-row {
        grid-template-columns: 22px minmax(0, 1fr) 22px;
    }

    .ingredient-row-main {
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto;
        grid-column: 2;
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
