<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import BaseModal from './BaseModal.vue'
import { state as store, deleteFood, foodKcal, foodsInGroup } from '../js/data.js'
import { confirmAction } from '../js/confirm.js'
import { openModal, replaceModal, Modals } from '../js/modals.js'

const props = defineProps({ groupId: { type: String, default: '' } })
const emit = defineEmits(['close'])
const query = ref('')
const selectedGroupId = ref(props.groupId)
const sortKey = ref('calories')
const sortOptions = [
  { value: 'calories', label: 'calories' },
  { value: 'name', label: 'name' },
  { value: 'ingredients', label: 'ingredients' },
  { value: 'logs', label: 'logs' },
]
const sortMenuOpen = ref(false)
const groups = computed(() => store.groups)
const groupNames = computed(() => new Map(groups.value.map((group) => [group.id, group.name])))
const sortLabel = computed(() => sortOptions.find((option) => option.value === sortKey.value)?.label || 'calories')
const foods = computed(() => selectedGroupId.value ? foodsInGroup(selectedGroupId.value) : store.foods)
const filteredFoods = computed(() => {
  const value = query.value.trim().toLowerCase()
  const matchingFoods = value ? foods.value.filter((food) => food.name.toLowerCase().includes(value)) : foods.value
  return [...matchingFoods].sort((first, second) => {
    if (sortKey.value === 'name') return first.name.localeCompare(second.name)
    if (sortKey.value === 'ingredients') return second.items.length - first.items.length
    if (sortKey.value === 'logs') return foodLogCount(second.id) - foodLogCount(first.id)
    return foodKcal(second) - foodKcal(first)
  })
})
const openOptionsFoodId = ref(null)
const foodMenuPlacement = ref('down')
const foodMenuRefs = new Map()
function foodLogCount(foodId) {
  return Object.values(store.logs).reduce((count, log) => count + (log.entries || [])
    .filter((entry) => entry.foodId === foodId)
    .reduce((total, entry) => total + (Number(entry.qty) || 0), 0), 0)
}
function openEditor(food = null) {
  openModal(Modals.FOOD_EDITOR, food ? { foodId: food.id } : { groupId: selectedGroupId.value })
}
function setFoodMenuRef(foodId, element) {
  if (element) foodMenuRefs.set(foodId, element)
  else foodMenuRefs.delete(foodId)
}
async function updateFoodMenuPlacement(foodId) {
  await nextTick()
  const menu = foodMenuRefs.get(foodId)
  const scrollPane = menu?.closest('.manager-list')
  if (!menu || !scrollPane) return
  const menuRect = menu.getBoundingClientRect()
  const paneRect = scrollPane.getBoundingClientRect()
  foodMenuPlacement.value = menuRect.bottom > paneRect.bottom - 6 ? 'up' : 'down'
}
function toggleFoodOptions(foodId) {
  openOptionsFoodId.value = openOptionsFoodId.value === foodId ? null : foodId
  foodMenuPlacement.value = 'down'
  if (openOptionsFoodId.value === foodId) updateFoodMenuPlacement(foodId)
}
function toggleSortMenu() {
  sortMenuOpen.value = !sortMenuOpen.value
}
function chooseSort(value) {
  sortKey.value = value
  sortMenuOpen.value = false
}
function closeFoodOptions(event) {
  if (event.target.closest('.food-options')) return
  if (event.target.closest('.food-sort-control')) return
  openOptionsFoodId.value = null
  sortMenuOpen.value = false
  foodMenuPlacement.value = 'down'
}
function duplicateFood(food) {
  openOptionsFoodId.value = null
  foodMenuPlacement.value = 'down'
  openModal(Modals.FOOD_EDITOR, { foodId: food.id, duplicate: true })
}
function openFoodNotes(food) {
  openOptionsFoodId.value = null
  foodMenuPlacement.value = 'down'
  openModal(Modals.FOOD_NOTES, { foodId: food.id })
}
function openFoodStats(food) {
  openOptionsFoodId.value = null
  openModal(Modals.FOOD_STATS, { foodId: food.id })
}
onMounted(() => document.addEventListener('click', closeFoodOptions))
onBeforeUnmount(() => document.removeEventListener('click', closeFoodOptions))
async function removeFood(food) {
  const logCount = foodLogCount(food.id)
  const message = logCount
    ? `"${food.name}" is logged ${logCount} time${logCount === 1 ? '' : 's'}. Deleting it will remove those log entries and change your calorie history. Continue?`
    : `Delete "${food.name}"?`
  const ok = await confirmAction({ title: 'Delete food', message, okLabel: 'Delete food' })
  if (ok) deleteFood(food.id)
}
</script>

<template>
  <BaseModal title="Foods" subtitle="Manage reusable foods shown in the dashboard." panel-class="food-manager-modal" @close="emit('close')" @back="selectedGroupId ? replaceModal(Modals.GROUP_MANAGER) : replaceModal(Modals.INGREDIENT_MANAGER)">
    <div class="manager-group food-manager-content">
      <div class="food-filters">
        <label class="food-filter-field">
          <span class="sr-only">Search foods</span>
          <input v-model="query" class="manager-search" type="search" placeholder="Search foods" />
        </label>
        <label class="food-filter-field">
          <span class="sr-only">Filter foods by group</span>
          <select v-model="selectedGroupId" class="manager-filter" aria-label="Filter foods by group">
            <option value="">All groups</option>
            <option v-for="group in groups" :key="group.id" :value="group.id">{{ group.name }}</option>
          </select>
        </label>
      </div>
      <div class="food-list-meta">
        <div class="food-count">{{ filteredFoods.length }} food{{ filteredFoods.length === 1 ? '' : 's' }}</div>
        <div class="food-sort-control">
          <button
            class="food-sort-label"
            type="button"
            aria-haspopup="listbox"
            :aria-expanded="sortMenuOpen"
            aria-label="Sort foods by"
            @click.stop="toggleSortMenu"
          >
          <span class="food-sort-icon" aria-hidden="true">≡</span>
            <span>Sorted by {{ sortLabel }}</span>
          </button>
          <div v-if="sortMenuOpen" class="food-sort-menu" role="listbox" aria-label="Sort foods by">
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
      <div v-if="filteredFoods.length" class="manager-list">
        <div v-for="item in filteredFoods" :key="item.id" class="manager-item-row">
          <div class="manager-item-wrap">
            <button class="manager-item" type="button" @click="openEditor(item)">
              <span>
                <strong class="food-item-title">
                  {{ item.name }}
                  <span
                    v-if="item.note"
                    class="food-note-indicator"
                    role="button"
                    tabindex="0"
                    :aria-label="`Open notes for ${item.name}`"
                    title="Open notes"
                    @click.stop="openFoodNotes(item)"
                    @keydown.enter.prevent.stop="openFoodNotes(item)"
                    @keydown.space.prevent.stop="openFoodNotes(item)"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                      <path d="M5 5h14v11H8l-3 3V5Z" />
                      <path d="M8 9h8M8 12h5" />
                    </svg>
                  </span>
                  <span v-if="!selectedGroupId" class="food-group-chip">
                    {{ groupNames.get(item.groupId) || 'Uncategorized' }}
                  </span>
                </strong>
                <small>
                  {{ foodKcal(item).toLocaleString() }} kcal · {{ item.items.length ? `${item.items.length} ingredient${item.items.length === 1 ? '' : 's'}` : 'simple food' }}
                  · {{ foodLogCount(item.id) }} log{{ foodLogCount(item.id) === 1 ? '' : 's' }}
                </small>
              </span>
            </button>
            <div class="food-options">
                <button
                class="manager-options"
                type="button"
                :aria-label="`More options for ${item.name}`"
                :aria-expanded="openOptionsFoodId === item.id"
                @click.stop="toggleFoodOptions(item.id)"
              >
                <span aria-hidden="true">⋮</span>
              </button>
              <div
                v-if="openOptionsFoodId === item.id"
                :ref="(element) => setFoodMenuRef(item.id, element)"
                class="food-options-menu"
                :class="{ 'food-options-menu-up': foodMenuPlacement === 'up' }"
                role="menu"
              >
                <button type="button" role="menuitem" @click.stop="openFoodStats(item)">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                    <path d="M4 19V5M4 19h17" />
                    <path d="m7 15 4-4 3 2 5-6" />
                  </svg>
                  Stats
                </button>
                <button type="button" role="menuitem" @click.stop="openFoodNotes(item)">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                    <path d="M5 5h14v11H8l-3 3V5Z" />
                    <path d="M8 9h8M8 12h5" />
                  </svg>
                  {{ item.note ? 'Edit notes' : 'Add notes' }}
                </button>
                <button type="button" role="menuitem" @click.stop="duplicateFood(item)">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                    <rect x="8" y="8" width="11" height="11" rx="2" />
                    <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" />
                  </svg>
                  Duplicate
                </button>
                <button class="delete-option" type="button" role="menuitem" @click.stop="openOptionsFoodId = null; removeFood(item)">
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
      <div v-else class="empty-note">No foods match that search.</div>
      <div class="food-manager-actions">
        <button class="btn btn-primary btn-full" type="button" @click="openEditor()">＋ New food</button>
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

.food-filters {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 8px;
  margin-top: 16px;
}

.food-filter-field {
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

.food-list-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin: 11px -26px 4px;
  padding: 0 26px 10px;
  border-bottom: 1px solid var(--line);
}

.food-count {
  color: var(--ink-muted);
  font-size: 12px;
}

.food-sort-label {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  color: var(--ink-muted);
  font-size: 12px;
  white-space: nowrap;
}

.food-sort-icon {
  color: var(--green);
  font-size: 15px;
  line-height: 1;
  transform: rotate(90deg);
}

.food-sort-control {
  position: relative;
}

.food-sort-label {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  border: 0;
  padding: 2px 0;
  background: transparent;
  color: var(--ink-muted);
  font: inherit;
  font-size: 12px;
  white-space: nowrap;
}

.food-sort-label::after {
  content: '';
  width: 0;
  height: 0;
  margin-left: 2px;
  border-left: 4px solid transparent;
  border-right: 4px solid transparent;
  border-top: 5px solid var(--ink-muted);
}

.food-sort-label:focus-visible {
  outline: 2px solid var(--green);
  outline-offset: 2px;
  border-radius: 3px;
}

.food-sort-menu {
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

.food-sort-menu button {
  display: block;
  width: 100%;
  border: 0;
  border-radius: 7px;
  padding: 8px 9px;
  background: transparent;
  color: var(--ink);
  font-size: 12px;
  text-align: left;
}

.food-sort-menu button:hover,
.food-sort-menu button:focus-visible,
.food-sort-menu button[aria-selected='true'] {
  background: var(--surface-alt);
  color: var(--green-strong);
}

.food-sort-menu button:focus-visible {
  outline: 2px solid var(--green);
  outline-offset: -2px;
}

.food-manager-actions {
  flex: none;
  margin-right: -26px;
  margin-left: -26px;
  padding-right: 26px;
  padding-left: 26px;
  padding-top: 14px;
  border-top: 1px solid var(--line);
}

.food-manager-actions .btn-full {
  min-height: 44px;
  margin-top: 0;
  border-radius: 12px;
  font-size: 14px;
}

.food-options {
  position: relative;
  flex: none;
}

.food-manager-content :deep(.manager-list) {
  max-height: 52vh;
  margin: 0;
  margin-right: -26px;
  padding: 0;
  border: 0 !important;
  border-radius: 0;
  background: transparent;
}

.food-manager-content :deep(.manager-item-row) {
  min-height: 58px;
  padding: 4px 0;
  border-bottom: 0;
}

.food-manager-content :deep(.manager-item-row + .manager-item-row) {
  margin-top: 2px;
}

.food-manager-content :deep(.manager-item) {
  min-height: 50px;
  padding: 8px 8px;
  border-radius: 10px;
}

.food-manager-content :deep(.manager-item:hover),
.food-manager-content :deep(.manager-item:focus-visible) {
  color: var(--ink);
}

.food-manager-content :deep(.manager-item strong) {
  font-size: 15px;
  font-weight: 600;
}

.food-manager-content :deep(.manager-item small) {
  margin-top: 3px;
  font-size: 12px;
}

.food-item-title {
  display: flex !important;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.food-item-title:first-letter {
  color: var(--ink);
}

.food-group-chip {
  flex: none;
  padding: 3px 6px;
  border-radius: 6px;
  background: var(--chip-bg);
  color: var(--ink-muted);
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.04em;
  line-height: 1;
  text-transform: uppercase;
}

.food-note-indicator {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border: 1px solid transparent;
  border-radius: 4px;
  padding: 0;
  background: transparent;
  color: var(--green);
  cursor: pointer;
}

.food-note-indicator:hover,
.food-note-indicator:focus-visible {
  background: var(--surface-alt);
  border-color: var(--line);
}

.food-note-indicator:focus-visible {
  outline: 2px solid var(--green);
  outline-offset: 1px;
}

.food-note-indicator svg {
  width: 16px;
  height: 16px;
}

.manager-options {
  width: 32px;
  height: 32px;
  border: 1px solid transparent;
  border-radius: 8px;
  padding: 0;
  background: transparent;
  color: color-mix(in srgb, var(--ink-muted) 52%, transparent);
  font-size: 21px;
  line-height: 1;
  cursor: pointer;
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

.food-options-menu {
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

.food-options-menu-up {
  top: auto;
  bottom: calc(100% + 4px);
}

.food-options-menu button {
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

.food-options-menu button:hover,
.food-options-menu button:focus-visible {
  background: var(--surface-alt);
}

.food-options-menu svg {
  width: 16px;
  height: 16px;
  flex: none;
}

.food-options-menu .delete-option {
  color: var(--red);
}

@media (max-width: 480px) {
  .food-filters {
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

  .food-sort-label {
    font-size: 11px;
  }

  .food-list-meta {
    margin-right: -20px;
    margin-left: -20px;
    padding-right: 20px;
    padding-left: 20px;
  }
}

@media (max-width: 480px) {
  :deep(.modal.food-manager-modal) {
    display: flex;
    flex-direction: column;
  }

  .food-manager-content {
    display: flex;
    flex: 1;
    min-height: 0;
    flex-direction: column;
  }

  .food-manager-content :deep(.manager-list) {
    flex: 1;
    min-height: 0;
    max-height: none;
    margin-right: -20px;
    overflow-y: auto;
  }

  .food-manager-actions {
    flex: none;
    margin-right: -20px;
    margin-left: -20px;
    padding-right: 20px;
    padding-left: 20px;
  }
}
</style>
