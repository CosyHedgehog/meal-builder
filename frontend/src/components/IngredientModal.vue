<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import BaseModal from './BaseModal.vue'
import { state as store, deleteIngredient, ingredientUsage } from '../js/data.js'
import { confirmAction } from '../js/confirm.js'
import { openModal, replaceModal, Modals } from '../js/modals.js'

const emit = defineEmits(['close'])
const query = ref('')
const usageFilter = ref('all') // 'all', 'in-use', 'unused'
const sortKey = ref('name')
const sortOptions = [
  { value: 'name', label: 'name' },
  { value: 'calories', label: 'calories' },
  { value: 'usage', label: 'usage' },
]
const sortMenuOpen = ref(false)
const sortLabel = computed(() => sortOptions.find((option) => option.value === sortKey.value)?.label || 'name')

const ingredientsWithMeta = computed(() => {
  return store.ingredients.map((ing) => {
    const usedIn = ingredientUsage(ing.id)
    return {
      ...ing,
      usedIn,
      usedCount: usedIn.length,
    }
  })
})

const filteredIngredients = computed(() => {
  const q = query.value.trim().toLowerCase()
  let list = ingredientsWithMeta.value

  if (usageFilter.value === 'in-use') {
    list = list.filter((ing) => ing.usedCount > 0)
  } else if (usageFilter.value === 'unused') {
    list = list.filter((ing) => ing.usedCount === 0)
  }

  if (q) {
    list = list.filter((ing) => ing.name.toLowerCase().includes(q))
  }

  return [...list].sort((a, b) => {
    if (sortKey.value === 'calories') return b.kcal - a.kcal
    if (sortKey.value === 'usage') return b.usedCount - a.usedCount
    return a.name.localeCompare(b.name)
  })
})

const openOptionsIngredientId = ref(null)
const ingredientMenuPlacement = ref('down')
const ingredientMenuRefs = new Map()

function openEditor(ingredient = null) {
  openModal(Modals.INGREDIENT_EDITOR, ingredient ? { ingredientId: ingredient.id } : {})
}

function setIngredientMenuRef(id, element) {
  if (element) ingredientMenuRefs.set(id, element)
  else ingredientMenuRefs.delete(id)
}

async function updateIngredientMenuPlacement(id) {
  await nextTick()
  const menu = ingredientMenuRefs.get(id)
  const scrollPane = menu?.closest('.manager-list')
  if (!menu || !scrollPane) return
  const menuRect = menu.getBoundingClientRect()
  const paneRect = scrollPane.getBoundingClientRect()
  ingredientMenuPlacement.value = menuRect.bottom > paneRect.bottom - 6 ? 'up' : 'down'
}

function toggleIngredientOptions(id) {
  openOptionsIngredientId.value = openOptionsIngredientId.value === id ? null : id
  ingredientMenuPlacement.value = 'down'
  if (openOptionsIngredientId.value === id) updateIngredientMenuPlacement(id)
}

function toggleSortMenu() {
  sortMenuOpen.value = !sortMenuOpen.value
}

function chooseSort(value) {
  sortKey.value = value
  sortMenuOpen.value = false
}

function closeOptions(event) {
  if (event.target.closest('.ingredient-options')) return
  if (event.target.closest('.ingredient-sort-control')) return
  openOptionsIngredientId.value = null
  sortMenuOpen.value = false
  ingredientMenuPlacement.value = 'down'
}

onMounted(() => document.addEventListener('click', closeOptions))
onBeforeUnmount(() => document.removeEventListener('click', closeOptions))

async function removeIngredient(item) {
  const usedIn = item.usedIn || ingredientUsage(item.id)
  const message = usedIn.length
    ? `"${item.name}" is used in ${usedIn.length} saved food${usedIn.length === 1 ? '' : 's'}:\n${usedIn
      .map((food) => food.name)
      .join(', ')}.\n\nDeleting it will remove it from those foods, reduce their calories, and change logged meal history. Continue?`
    : `Delete "${item.name}"?`
  const ok = await confirmAction({
    title: 'Delete ingredient',
    message,
    okLabel: 'Delete ingredient',
  })
  if (!ok) return
  deleteIngredient(item.id)
}
</script>

<template>
  <BaseModal
    title="Ingredients"
    subtitle="Manage reusable ingredients and their calories."
    panel-class="ingredient-manager-modal"
    @close="emit('close')"
    @back="replaceModal(Modals.FOOD_MANAGER)"
  >
    <div class="manager-group ingredient-manager-content">
      <div class="ingredient-filters">
        <label class="ingredient-filter-field">
          <span class="sr-only">Search ingredients</span>
          <input v-model="query" class="manager-search" type="search" placeholder="Search ingredients" />
        </label>
        <label class="ingredient-filter-field">
          <span class="sr-only">Filter ingredients by usage</span>
          <select v-model="usageFilter" class="manager-filter" aria-label="Filter ingredients by usage">
            <option value="all">All</option>
            <option value="in-use">In use</option>
            <option value="unused">Unused</option>
          </select>
        </label>
      </div>

      <div class="ingredient-list-meta">
        <div class="ingredient-count">
          {{ filteredIngredients.length }} ingredient{{ filteredIngredients.length === 1 ? '' : 's' }}
        </div>
        <div class="ingredient-sort-control">
          <button
            class="ingredient-sort-label"
            type="button"
            aria-haspopup="listbox"
            :aria-expanded="sortMenuOpen"
            aria-label="Sort ingredients by"
            @click.stop="toggleSortMenu"
          >
            <svg class="ingredient-sort-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <path d="M4 6h16M4 12h10M4 18h6" />
            </svg>
            <span>Sorted by {{ sortLabel }}</span>
          </button>
          <div v-if="sortMenuOpen" class="ingredient-sort-menu" role="listbox" aria-label="Sort ingredients by">
            <button
              v-for="option in sortOptions"
              :key="option.value"
              type="button"
              role="option"
              :aria-selected="sortKey === option.value"
              @click.stop="chooseSort(option.value)"
            >
              Sorted by {{ option.label }}
            </button>
          </div>
        </div>
      </div>

      <div v-if="filteredIngredients.length" class="manager-list">
        <div v-for="item in filteredIngredients" :key="item.id" class="manager-item-row">
          <div class="manager-item-wrap">
            <button class="manager-item" type="button" @click="openEditor(item)">
              <div class="ingredient-item-body">
                <strong class="ingredient-item-title">
                  <span class="ingredient-item-name">{{ item.name }}</span>
                  <span v-if="item.usedCount > 0" class="ingredient-usage-chip">
                    {{ item.usedCount }} food{{ item.usedCount === 1 ? '' : 's' }}
                  </span>
                  <span v-else class="ingredient-unused-chip">Unused</span>
                </strong>
                <small class="ingredient-item-meta">
                  <span class="ingredient-kcal-text">{{ item.kcal.toLocaleString() }} kcal {{ item.unit === 'g' ? '/ 100g' : '/ item' }}</span>
                  <span v-if="item.usedCount > 0" class="ingredient-used-in-names">
                    <span class="meta-bullet">&bull;</span>
                    <span class="names-text">{{ item.usedIn.map((f) => f.name).join(', ') }}</span>
                  </span>
                </small>
              </div>
            </button>

            <div class="ingredient-options">
              <button
                class="manager-options"
                type="button"
                :aria-label="`More options for ${item.name}`"
                :aria-expanded="openOptionsIngredientId === item.id"
                @click.stop="toggleIngredientOptions(item.id)"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
                  <circle cx="12" cy="5" r="1" fill="currentColor" />
                  <circle cx="12" cy="12" r="1" fill="currentColor" />
                  <circle cx="12" cy="19" r="1" fill="currentColor" />
                </svg>
              </button>
              <div
                v-if="openOptionsIngredientId === item.id"
                :ref="(element) => setIngredientMenuRef(item.id, element)"
                class="ingredient-options-menu"
                :class="{ 'ingredient-options-menu-up': ingredientMenuPlacement === 'up' }"
                role="menu"
              >
                <button type="button" role="menuitem" @click.stop="openOptionsIngredientId = null; openEditor(item)">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                    <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                  </svg>
                  Edit
                </button>
                <button
                  v-if="item.usedCount > 0"
                  type="button"
                  role="menuitem"
                  @click.stop="openOptionsIngredientId = null; openModal(Modals.INGREDIENT_FOODS, { ingredientId: item.id })"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                    <path d="M18 8h1a4 4 0 0 1 0 8h-1M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8zM6 1v3M10 1v3M14 1v3" />
                  </svg>
                  Used in foods ({{ item.usedCount }})
                </button>
                <button
                  class="delete-option"
                  type="button"
                  role="menuitem"
                  @click.stop="openOptionsIngredientId = null; removeIngredient(item)"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                    <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />
                  </svg>
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div v-else class="empty-note">No ingredients match that search.</div>

      <div class="ingredient-manager-actions">
        <button class="btn btn-primary btn-full" type="button" @click="openEditor()">+ New ingredient</button>
      </div>
    </div>
  </BaseModal>
</template>

<style scoped>
.manager-filter,
.manager-search {
  width: 100%;
  min-width: 0;
  min-height: 42px;
  padding: 10px 12px;
  border: 1px solid var(--line);
  border-radius: 12px;
  background-color: var(--surface-alt);
  color: var(--ink);
  font-size: 14px;
  margin: 0;
}

.ingredient-filters {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 8px;
  margin-top: 16px;
}

.ingredient-filter-field {
  min-width: 0;
}

.manager-filter {
  width: 110px;
  appearance: none;
  background-image: linear-gradient(45deg, transparent 50%, var(--ink-muted) 50%),
    linear-gradient(135deg, var(--ink-muted) 50%, transparent 50%);
  background-repeat: no-repeat;
  background-position: calc(100% - 15px) 50%, calc(100% - 10px) 50%;
  background-size: 5px 5px;
}

.manager-filter:focus,
.manager-search:focus {
  outline: 2px solid color-mix(in srgb, var(--green) 70%, transparent);
  outline-offset: 1px;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.ingredient-list-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin: 11px -26px 4px;
  padding: 0 26px 10px;
  border-bottom: 1px solid var(--line);
}

.ingredient-count {
  color: var(--ink-muted);
  font-size: 12px;
}

.ingredient-sort-control {
  position: relative;
}

.ingredient-sort-label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: 0;
  padding: 2px 0;
  background: transparent;
  color: var(--ink-muted);
  font: inherit;
  font-size: 12px;
  white-space: nowrap;
  cursor: pointer;
}

.ingredient-sort-svg {
  width: 14px;
  height: 14px;
  color: var(--green);
  flex: none;
}

.ingredient-sort-label::after {
  content: '';
  width: 0;
  height: 0;
  margin-left: 2px;
  border-left: 4px solid transparent;
  border-right: 4px solid transparent;
  border-top: 5px solid var(--ink-muted);
}

.ingredient-sort-label:focus-visible {
  outline: 2px solid var(--green);
  outline-offset: 2px;
  border-radius: 3px;
}

.ingredient-sort-menu {
  position: absolute;
  z-index: 3;
  top: calc(100% + 6px);
  right: 0;
  min-width: 158px;
  padding: 4px;
  border: 1px solid var(--line);
  border-radius: 10px;
  background: var(--surface);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.16);
}

.ingredient-sort-menu button {
  display: block;
  width: 100%;
  border: 0;
  border-radius: 7px;
  padding: 8px 9px;
  background: transparent;
  color: var(--ink);
  font-size: 12px;
  text-align: left;
  cursor: pointer;
}

.ingredient-sort-menu button:hover,
.ingredient-sort-menu button:focus-visible,
.ingredient-sort-menu button[aria-selected='true'] {
  background: var(--surface-alt);
  color: var(--green-strong);
}

.ingredient-sort-menu button:focus-visible {
  outline: 2px solid var(--green);
  outline-offset: -2px;
}

.ingredient-manager-actions {
  flex: none;
  margin: 0 -26px -5px;
  padding-right: 26px;
  padding-left: 26px;
  padding-top: 14px;
  border-top: 1px solid var(--line);
}

.ingredient-manager-actions .btn-full {
  margin-top: 0;
  border-radius: 12px;
}

.ingredient-manager-content > .empty-note {
  flex: 1;
  min-height: 0;
}

.ingredient-options {
  position: relative;
  flex: none;
}

.ingredient-manager-content :deep(.manager-list) {
  max-height: 52vh;
  margin: 0;
  margin-right: -26px;
  padding: 0;
  border: 0 !important;
  border-radius: 0;
  background: transparent;
}

.ingredient-manager-content :deep(.manager-item-row) {
  min-height: 58px;
  padding: 4px 0;
  border-bottom: 0;
}

.ingredient-manager-content :deep(.manager-item-row + .manager-item-row) {
  margin-top: 2px;
}

.ingredient-manager-content :deep(.manager-item) {
  min-height: 50px;
  padding: 8px 8px;
  border-radius: 10px;
}

.ingredient-manager-content :deep(.manager-item:hover),
.ingredient-manager-content :deep(.manager-item:focus-visible) {
  color: var(--ink);
}

.ingredient-item-body {
  display: flex;
  flex-direction: column;
  min-width: 0;
  width: 100%;
  text-align: left;
}

.ingredient-item-title {
  display: flex !important;
  align-items: center;
  gap: 6px;
  min-width: 0;
  font-size: 12px;
  font-weight: 600;
}

.ingredient-item-name {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ingredient-usage-chip {
  flex: none;
  padding: 3px 6px;
  border-radius: 6px;
  background: color-mix(in srgb, var(--green) 12%, transparent);
  color: var(--green-strong);
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.04em;
  line-height: 1;
}

.ingredient-unused-chip {
  flex: none;
  padding: 3px 6px;
  border-radius: 6px;
  background: var(--chip-bg);
  color: var(--ink-muted);
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.04em;
  line-height: 1;
}

.ingredient-item-meta {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 3px;
  font-size: 12px;
  min-width: 0;
  width: 100%;
  color: var(--ink-muted);
  overflow: hidden;
  white-space: nowrap;
}

.ingredient-kcal-text {
  flex: none;
}

.meta-bullet {
  flex: none;
  font-size: 10px;
  opacity: 0.7;
}

.ingredient-used-in-names {
  display: flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
  overflow: hidden;
  color: var(--ink-muted);
  opacity: 0.85;
}

.names-text {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.manager-options {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: 1px solid transparent;
  border-radius: 8px;
  padding: 0;
  background: transparent;
  color: color-mix(in srgb, var(--ink-muted) 52%, transparent);
  cursor: pointer;
}

.manager-options svg {
  width: 18px;
  height: 18px;
}

.manager-options:hover,
.manager-options:focus-visible {
  background: var(--surface-alt);
  border-color: var(--line);
  color: var(--ink);
}

.manager-options:focus-visible {
  outline: 2px solid var(--green);
  outline-offset: 1px;
}

.ingredient-options-menu {
  position: absolute;
  z-index: 2;
  top: calc(100% + 4px);
  right: 0;
  min-width: 132px;
  padding: 4px;
  border: 1px solid var(--line);
  border-radius: 10px;
  background: var(--surface);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.12);
}

.ingredient-options-menu-up {
  top: auto;
  bottom: calc(100% + 4px);
}

.ingredient-options-menu button {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  border: 0;
  border-radius: 7px;
  padding: 8px 9px;
  background: transparent;
  color: var(--ink);
  text-align: left;
  cursor: pointer;
}

.ingredient-options-menu button:hover,
.ingredient-options-menu button:focus-visible {
  background: var(--surface-alt);
}

.ingredient-options-menu svg {
  width: 16px;
  height: 16px;
  flex: none;
}

.ingredient-options-menu .delete-option {
  color: var(--red);
}

@media (min-width: 481px) {
  :deep(.modal.ingredient-manager-modal) {
    display: flex;
    height: min(760px, 92vh);
    flex-direction: column;
    overflow: hidden;
  }

  .ingredient-manager-content {
    display: flex;
    flex: 1;
    min-height: 0;
    flex-direction: column;
  }

  .ingredient-manager-content :deep(.manager-list) {
    flex: 1;
    min-height: 0;
    max-height: none;
    overflow-y: auto;
  }
}

@media (max-width: 480px) {
  .ingredient-filters {
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 7px;
  }

  .manager-filter,
  .manager-search {
    min-height: 40px;
    padding: 8px 10px;
  }

  .manager-filter {
    width: 104px;
    padding-right: 24px;
    background-position: calc(100% - 12px) 50%, calc(100% - 7px) 50%;
  }

  .ingredient-sort-label {
    font-size: 11px;
  }

  .ingredient-list-meta {
    margin-right: -20px;
    margin-left: -20px;
    padding-right: 20px;
    padding-left: 20px;
  }

  :deep(.modal.ingredient-manager-modal) {
    display: flex;
    flex-direction: column;
  }

  .ingredient-manager-content {
    display: flex;
    flex: 1;
    min-height: 0;
    flex-direction: column;
  }

  .ingredient-manager-content :deep(.manager-list) {
    flex: 1;
    min-height: 0;
    max-height: none;
    margin-right: -20px;
    overflow-y: auto;
  }

  .ingredient-manager-actions {
    flex: none;
    margin: 0 -20px -8px;
    padding-right: 20px;
    padding-left: 20px;
  }
}
</style>