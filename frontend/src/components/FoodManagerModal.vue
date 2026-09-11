<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import BaseModal from './BaseModal.vue'
import { state as store, deleteFood, foodKcal, archiveFood, restoreFood, UNCATEGORIZED_GROUP_ID } from '../js/data.js'
import { confirmAction } from '../js/confirm.js'
import { openModal, Modals } from '../js/modals.js'

const FOOD_FILTERS_STORAGE_KEY = 'meal-builder-food-filters'

function loadRememberedFoodFilters() {
  try {
    const stored = JSON.parse(localStorage.getItem(FOOD_FILTERS_STORAGE_KEY) || '{}')
    return {
      groupIds: Array.isArray(stored.groupIds) ? stored.groupIds : [],
      types: Array.isArray(stored.types) ? stored.types : [],
      statuses: Array.isArray(stored.statuses) ? stored.statuses : [],
    }
  } catch {
    return { groupIds: [], types: [], statuses: [] }
  }
}

const rememberedFoodFilters = loadRememberedFoodFilters()

const props = defineProps({ groupId: { type: String, default: '' } })
const emit = defineEmits(['close'])
const query = ref('')
const selectedGroupIds = ref(props.groupId ? [props.groupId] : [...rememberedFoodFilters.groupIds])
const sortKey = ref('calories')
const sortOptions = [
  { value: 'calories', label: 'calories' },
  { value: 'name', label: 'name' },
  { value: 'ingredients', label: 'ingredients' },
  { value: 'logs', label: 'logs' },
]
const sortMenuOpen = ref(false)
const filterMenuOpen = ref(false)
const selectedTypes = ref([...rememberedFoodFilters.types])
const selectedStatuses = ref([...rememberedFoodFilters.statuses])
const groups = computed(() => store.groups.filter((group) => group.id !== UNCATEGORIZED_GROUP_ID))
const groupNames = computed(() => new Map(groups.value.map((group) => [group.id, group.name])))
const variantFoodIds = computed(() => new Set(store.foods
  .filter((food) => food.mode === 'family')
  .flatMap((food) => food.variantFoodIds || [])))
const sortLabel = computed(() => sortOptions.find((option) => option.value === sortKey.value)?.label || 'calories')
const filterSummary = computed(() => {
  const count = selectedGroupIds.value.length + selectedTypes.value.length + selectedStatuses.value.length
  return count ? `${count} filter${count === 1 ? '' : 's'}` : 'Filter'
})
const filterFoods = computed(() => {
  const groupsMatch = !selectedGroupIds.value.length || selectedGroupIds.value.includes('uncategorized')
    ? (food) => !selectedGroupIds.value.length || selectedGroupIds.value.includes(food.groupId || 'uncategorized')
    : (food) => selectedGroupIds.value.includes(food.groupId)
  return store.foods.filter((food) => {
    const statusMatch = !selectedStatuses.value.length
      || selectedStatuses.value.includes(food.archived ? 'archived' : 'active')
    const typeMatch = !selectedTypes.value.length
      || selectedTypes.value.includes(food.mode)
      || (selectedTypes.value.includes('variant') && variantFoodIds.value.has(food.id))
    return groupsMatch(food) && statusMatch && typeMatch
  })
})
const filteredFoods = computed(() => {
  const value = query.value.trim().toLowerCase()
  const matchingFoods = value ? filterFoods.value.filter((food) => food.name.toLowerCase().includes(value)) : filterFoods.value
  return [...matchingFoods].sort((first, second) => {
    if (sortKey.value === 'name') return first.name.localeCompare(second.name)
    if (sortKey.value === 'ingredients') return second.items.length - first.items.length
    if (sortKey.value === 'logs') return foodLogCount(second.id) - foodLogCount(first.id)
    return foodKcal(second) - foodKcal(first)
  })
})
const foodCountLabel = computed(() => {
  const visibleCount = filteredFoods.value.length
  const totalCount = filterFoods.value.length
  const foodLabel = totalCount === 1 ? 'food' : 'foods'
  return visibleCount === totalCount
    ? `Showing ${visibleCount} ${foodLabel}`
    : `Showing ${visibleCount} of ${totalCount} ${foodLabel}`
})
const openOptionsFoodId = ref(null)
const foodMenuPlacement = ref('down')
const foodMenuRefs = new Map()
function foodLogCount(foodId) {
  const food = store.foods.find((item) => item.id === foodId)
  const loggedFoodIds = food?.mode === 'family'
    ? new Set([foodId, ...(food.variantFoodIds || [])])
    : new Set([foodId])
  return Object.values(store.logs).reduce((count, log) => count + (log.entries || [])
    .filter((entry) => loggedFoodIds.has(entry.foodId))
    .reduce((total, entry) => total + (Number(entry.qty) || 0), 0), 0)
}
function openEditor(food = null) {
  openModal(Modals.FOOD_EDITOR, food ? { foodId: food.id } : { groupId: selectedGroupIds.value.length === 1 ? selectedGroupIds.value[0] : '' })
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
  const anchorRect = menu.parentElement.getBoundingClientRect()
  const paneRect = scrollPane.getBoundingClientRect()
  const spaceBelow = paneRect.bottom - anchorRect.bottom
  const spaceAbove = anchorRect.top - paneRect.top
  const menuHeight = menuRect.height
  if (spaceBelow < menuHeight + 6 && spaceAbove > spaceBelow) {
    foodMenuPlacement.value = 'up'
  } else {
    foodMenuPlacement.value = 'down'
  }
}
function toggleFoodOptions(foodId) {
  openOptionsFoodId.value = openOptionsFoodId.value === foodId ? null : foodId
  foodMenuPlacement.value = 'down'
  if (openOptionsFoodId.value === foodId) updateFoodMenuPlacement(foodId)
}
function toggleSortMenu() {
  filterMenuOpen.value = false
  sortMenuOpen.value = !sortMenuOpen.value
}
function chooseSort(value) {
  sortKey.value = value
  sortMenuOpen.value = false
}
function toggleFilterMenu() {
  sortMenuOpen.value = false
  filterMenuOpen.value = !filterMenuOpen.value
}
function toggleFilterValue(filterName, value) {
  const filters = {
    groups: selectedGroupIds,
    types: selectedTypes,
    statuses: selectedStatuses,
  }
  const filter = filters[filterName]
  if (!filter) return
  filter.value = filter.value.includes(value)
    ? filter.value.filter((item) => item !== value)
    : [...filter.value, value]
  rememberFoodFilters()
}
function clearFilters() {
  selectedGroupIds.value = []
  selectedTypes.value = []
  selectedStatuses.value = []
  rememberFoodFilters()
}
function clearGroupFilter() {
  selectedGroupIds.value = []
  rememberFoodFilters()
}
function rememberFoodFilters() {
  rememberedFoodFilters.groupIds = [...selectedGroupIds.value]
  rememberedFoodFilters.types = [...selectedTypes.value]
  rememberedFoodFilters.statuses = [...selectedStatuses.value]
  try {
    localStorage.setItem(FOOD_FILTERS_STORAGE_KEY, JSON.stringify(rememberedFoodFilters))
  } catch {
  }
}
function closeFoodOptions(event) {
  if (event.target.closest('.food-options')) return
  if (event.target.closest('.food-sort-control')) return
  openOptionsFoodId.value = null
  sortMenuOpen.value = false
  filterMenuOpen.value = false
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
  foodMenuPlacement.value = 'down'
  openModal(Modals.FOOD_STATS, { foodId: food.id })
}
function openFoodFamily(food) {
  openOptionsFoodId.value = null
  foodMenuPlacement.value = 'down'
  const family = store.foods.find((item) => item.mode === 'family' && (item.variantFoodIds || []).includes(food.id))
  if (family) openModal(Modals.FOOD_EDITOR, { foodId: family.id })
}
function openVariantInfo(food) {
  openOptionsFoodId.value = null
  foodMenuPlacement.value = 'down'
  openModal(Modals.FOOD_VARIANT_INFO, { foodId: food.id })
}
onMounted(() => document.addEventListener('click', closeFoodOptions))
onBeforeUnmount(() => {
  rememberFoodFilters()
  document.removeEventListener('click', closeFoodOptions)
})
async function doArchiveFood(food) {
  openOptionsFoodId.value = null
  foodMenuPlacement.value = 'down'
  const ok = await confirmAction({
    title: 'Hide food?',
    message: `"${food.name}" will be removed from the active food list and be hidden from the dashboard unless it is already selected. Previous log entries will remain intact. Continue?`,
    okLabel: 'Hide',
    okClass: 'btn-primary',
  })
  if (ok) archiveFood(food.id)
}
async function doRestoreFood(food) {
  openOptionsFoodId.value = null
  foodMenuPlacement.value = 'down'
  restoreFood(food.id)
}
async function removeFood(food) {
  openOptionsFoodId.value = null
  foodMenuPlacement.value = 'down'
  const logCount = foodLogCount(food.id)
  const message = logCount
    ? `"${food.name}" is logged ${logCount} time${logCount === 1 ? '' : 's'}. Deleting it permanently will remove those log entries and change your calorie history. Continue?`
    : `Permanently delete "${food.name}"? This cannot be undone.`
  const ok = await confirmAction({ title: 'Delete food', message, okLabel: 'Delete permanently' })
  if (ok) deleteFood(food.id)
}
</script>

<template>
  <BaseModal title="Foods" subtitle="Manage reusable foods shown in the dashboard." panel-class="food-manager-modal" @close="emit('close')">
    <div class="manager-group food-manager-content">
      <div class="food-filters">
        <label class="food-filter-field">
          <span class="sr-only">Search foods</span>
          <input v-model="query" class="manager-search" type="search" placeholder="Search foods" />
        </label>
      </div>
      <div class="food-list-meta">
        <span class="food-list-count" aria-live="polite">{{ foodCountLabel }}</span>
        <div class="food-list-controls">
          <div class="food-sort-control food-filter-control">
              <div class="food-filter-label-row">
                <button v-if="selectedGroupIds.length || selectedTypes.length || selectedStatuses.length" class="filter-clear-button" type="button" aria-label="Clear food filters" title="Clear food filters" @click.stop="clearFilters">×</button>
                <button
                  class="food-sort-label"
                  type="button"
                  aria-haspopup="listbox"
                  :aria-expanded="filterMenuOpen"
                  aria-label="Filter foods"
                  @click.stop="toggleFilterMenu"
                >
                  <svg class="food-filter-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <path d="M4 5h16l-6 7v5l-4 2v-7L4 5Z" />
                  </svg>
                  <span>{{ filterSummary }}</span>
                </button>
              </div>
            <div v-if="filterMenuOpen" class="food-filter-menu" role="dialog" aria-label="Filter foods">
              <div class="food-filter-section">
                <strong>Groups</strong>
                <label class="food-filter-option">
                  <input type="checkbox" :checked="!selectedGroupIds.length" @change="clearGroupFilter" />
                  <span>All groups</span>
                </label>
                <label v-for="group in groups" :key="group.id" class="food-filter-option">
                  <input type="checkbox" :checked="selectedGroupIds.includes(group.id)" @change="toggleFilterValue('groups', group.id)" />
                  <span>{{ group.name }}</span>
                </label>
                <label class="food-filter-option">
                  <input type="checkbox" :checked="selectedGroupIds.includes('uncategorized')" @change="toggleFilterValue('groups', 'uncategorized')" />
                  <span>Uncategorized</span>
                </label>
              </div>
              <div class="food-filter-section">
                <strong>Food type</strong>
                <label v-for="option in [{ value: 'simple', label: 'Simple foods' }, { value: 'ingredients', label: 'Ingredient foods' }, { value: 'family', label: 'Variant groups' }, { value: 'variant', label: 'Variant options' }]" :key="option.value" class="food-filter-option">
                  <input type="checkbox" :checked="selectedTypes.includes(option.value)" @change="toggleFilterValue('types', option.value)" />
                  <span>{{ option.label }}</span>
                </label>
              </div>
              <div class="food-filter-section">
                <strong>Status</strong>
                <label v-for="option in [{ value: 'active', label: 'Visible' }, { value: 'archived', label: 'Hidden' }]" :key="option.value" class="food-filter-option">
                  <input type="checkbox" :checked="selectedStatuses.includes(option.value)" @change="toggleFilterValue('statuses', option.value)" />
                  <span>{{ option.label }}</span>
                </label>
              </div>
              <button class="food-filter-clear" type="button" :disabled="!selectedGroupIds.length && !selectedTypes.length && !selectedStatuses.length" @click.stop="clearFilters">Clear filters</button>
            </div>
          </div>
          <div class="food-sort-control">
            <button
              class="food-sort-label"
              type="button"
              aria-haspopup="listbox"
              :aria-expanded="sortMenuOpen"
              aria-label="Sort foods by"
              @click.stop="toggleSortMenu"
            >
              <svg class="food-sort-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <path d="M4 6h16M4 12h10M4 18h6" />
              </svg>
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
      </div>
      <div v-if="filteredFoods.length" class="manager-list">
        <div v-for="item in filteredFoods" :key="item.id" class="manager-item-row">
          <div class="manager-item-wrap">
            <button class="manager-item" type="button" :class="{ 'is-archived': item.archived }" @click="!item.archived && openEditor(item)">
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
                  <span v-if="!selectedGroupIds.length" class="food-group-chip">
                    {{ groupNames.get(item.groupId) || 'Uncategorized' }}
                  </span>
                  <span v-if="item.mode === 'family'" class="food-variant-chip">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                      <path d="m12 2 9 5-9 5-9-5 9-5Z" />
                      <path d="m3 12 9 5 9-5M3 17l9 5 9-5" />
                    </svg>
                    Variant group
                  </span>
                  <span v-if="variantFoodIds.has(item.id)" class="food-variant-chip" role="button" tabindex="0" @click.stop="openVariantInfo(item)" @keydown.enter.prevent.stop="openVariantInfo(item)" @keydown.space.prevent.stop="openVariantInfo(item)">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                      <path d="M20 12.6V20h-7.4L4 11.4V4h7.4L20 12.6Z" />
                      <circle cx="8" cy="8" r="1.2" />
                    </svg>
                    Variant option
                  </span>
                  <span v-if="item.archived" class="food-archived-icon" role="img" aria-label="Hidden" title="Hidden">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                      <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" />
                      <circle cx="12" cy="12" r="2.5" />
                      <line x1="4" y1="4" x2="20" y2="20" />
                    </svg>
                  </span>
                </strong>
                <small>
                  {{ item.mode === 'family'
                    ? `Variant group · ${item.variantFoodIds?.length || 0} option${item.variantFoodIds?.length === 1 ? '' : 's'}`
                    : `${foodKcal(item).toLocaleString()} kcal · ${item.items.length
                      ? `${item.items.length} ingredient${item.items.length === 1 ? '' : 's'}`
                      : 'simple food'}` }}
                  · <span class="food-stat">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                      <rect x="4" y="5" width="16" height="15" rx="2" />
                      <path d="M8 3v4M16 3v4M4 10h16" />
                    </svg>
                    {{ foodLogCount(item.id) }} log{{ foodLogCount(item.id) === 1 ? '' : 's' }}
                  </span>
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
                :ref="(el) => setFoodMenuRef(item.id, el)"
                class="food-options-menu"
                :class="{ 'food-options-menu-up': foodMenuPlacement === 'up' }"
                role="menu"
              >
                <!-- Active food actions -->
                <template v-if="!item.archived">
                  <button v-if="variantFoodIds.has(item.id)" type="button" role="menuitem" @click.stop="openFoodFamily(item)">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                      <rect x="3" y="4" width="7" height="7" rx="1" />
                      <rect x="14" y="4" width="7" height="7" rx="1" />
                      <rect x="3" y="13" width="7" height="7" rx="1" />
                      <rect x="14" y="13" width="7" height="7" rx="1" />
                    </svg>
                    View family
                  </button>
                  <button type="button" role="menuitem" @click.stop="openFoodStats(item)">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                      <line x1="16" y1="2" x2="16" y2="6" />
                      <line x1="8" y1="2" x2="8" y2="6" />
                      <line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
                    View logs
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
                  <button class="archive-option" type="button" role="menuitem" @click.stop="doArchiveFood(item)">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                      <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" />
                      <circle cx="12" cy="12" r="2.5" />
                      <line x1="4" y1="4" x2="20" y2="20" />
                    </svg>
                    Hide
                  </button>
                </template>
                <!-- Archived food actions -->
                <template v-else>
                  <button type="button" role="menuitem" @click.stop="doRestoreFood(item)">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                      <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" />
                      <circle cx="12" cy="12" r="2.5" />
                    </svg>
                    Unhide
                  </button>
                </template>
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
      <div v-else class="empty-note">
        {{ selectedStatuses.includes('archived') && !selectedStatuses.includes('active') ? 'No hidden foods.' : 'No foods match that search.' }}
      </div>
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
  min-height: 38px;
  padding: 7px 10px;
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

.food-list-count {
  min-width: 0;
  overflow: hidden;
  color: var(--ink-muted);
  font-size: 11px;
  text-align: center;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.food-list-controls {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-left: auto;
}

.food-sort-label {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  color: var(--ink-muted);
  font-size: 12px;
  white-space: nowrap;
}

.food-sort-svg {
  width: 14px;
  height: 14px;
  color: var(--green);
}

.food-filter-svg {
  width: 14px;
  height: 14px;
  color: var(--green);
}

.food-sort-control {
  position: relative;
}

.food-filter-label-row {
  display: inline-flex;
  align-items: center;
  gap: 2px;
}

.filter-clear-button {
  display: inline-flex;
  width: 18px;
  height: 18px;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: var(--ink-muted);
  font-size: 16px;
  line-height: 1;
  cursor: pointer;
}

.filter-clear-button:hover,
.filter-clear-button:focus-visible {
  background: var(--surface-alt);
  color: var(--ink);
  outline: none;
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

.food-filter-menu {
  position: absolute;
  z-index: 3;
  top: calc(100% + 6px);
  right: 0;
  width: min(280px, 75vw);
  max-height: min(390px, 60vh);
  overflow-y: auto;
  padding: 8px;
  border: 1px solid var(--line);
  border-radius: 10px;
  background: var(--surface);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.16);
}

.food-filter-section {
  display: grid;
  gap: 2px;
  padding: 4px 0 8px;
}

.food-filter-section + .food-filter-section {
  border-top: 1px solid var(--line);
  padding-top: 10px;
}

.food-filter-section strong {
  padding: 2px 8px 5px;
  color: var(--ink-muted);
  font-size: 10px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.food-filter-option {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 32px;
  padding: 5px 8px;
  border-radius: 7px;
  color: var(--ink);
  font-size: 12px;
  cursor: pointer;
}

.food-filter-option:hover {
  background: var(--surface-alt);
}

.food-filter-option input {
  width: 14px;
  height: 14px;
  margin: 0;
  accent-color: var(--green);
}

.food-filter-clear {
  width: 100%;
  margin-top: 4px;
  padding: 7px 8px;
  border: 1px solid var(--line);
  border-radius: 7px;
  background: transparent;
  color: var(--ink-muted);
  font-size: 12px;
}

.food-filter-clear:not(:disabled):hover,
.food-filter-clear:not(:disabled):focus-visible {
  background: var(--surface-alt);
  color: var(--ink);
}

.food-filter-clear:disabled {
  cursor: default;
  opacity: 0.5;
}

.food-archive-control .food-sort-menu {
  min-width: 100px;
}

.food-sort-menu button {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  width: 100%;
  border: 0;
  border-radius: 7px;
  padding: 8px 9px;
  background: transparent;
  color: var(--ink);
  font-size: 12px;
  text-align: left;
}

.food-status-icon {
  flex: none;
  width: 14px;
  height: 14px;
  color: var(--green);
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
  margin: 0 -26px -5px;
  padding-right: 26px;
  padding-left: 26px;
  padding-top: 14px;
  border-top: 1px solid var(--line);
}

.food-manager-actions .btn-full {
  margin-top: 0;
  border-radius: 12px;
}

.food-manager-content > .empty-note {
  flex: 1;
  min-height: 0;
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
  font-size: 12px;
  font-weight: 600;
}

.food-manager-content :deep(.manager-item small) {
  margin-top: 3px;
  font-size: 12px;
}

.food-stat {
  display: inline-flex;
  align-items: center;
  gap: 3px;
}

.food-stat svg {
  width: 12px;
  height: 12px;
  flex: none;
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

.food-archived-icon {
  display: inline-flex;
  width: 16px;
  height: 16px;
  align-items: center;
  justify-content: center;
  flex: none;
  color: var(--ink-muted);
}

.food-archived-icon svg {
  width: 14px;
  height: 14px;
}

.food-variant-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  flex: none;
  border: 0;
  padding: 3px 6px;
  border-radius: 6px;
  background: var(--chip-bg);
  color: var(--ink-muted);
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.04em;
  line-height: 1;
  text-transform: uppercase;
  cursor: pointer;
}

.food-variant-chip svg {
  width: 12px;
  height: 12px;
}

.food-variant-chip:hover,
.food-variant-chip:focus-visible {
  background: var(--chip-bg-hover);
  color: var(--ink);
  outline: none;
}

.manager-item.is-archived {
  opacity: 0.6;
  cursor: default;
}

.archive-option {
  color: var(--ink-muted);
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

@media (min-width: 481px) {
  :deep(.modal.food-manager-modal) {
    display: flex;
    height: min(760px, 92vh);
    flex-direction: column;
    overflow: hidden;
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
    overflow-y: auto;
  }
}

@media (max-width: 480px) {
  .food-filters {
    margin-top: 0;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 7px;
  }

  .food-filter-menu {
    right: auto;
    left: 50%;
    width: min(280px, calc(100vw - 32px));
    transform: translateX(-50%);
  }

  .food-list-meta {
    flex-wrap: nowrap;
    gap: 8px;
  }

  .food-list-count {
    flex: 1 1 auto;
    padding-top: 2px;
    text-align: left;
  }

  .food-list-controls {
    flex: none;
    gap: 8px;
  }

  .manager-filter,
  .manager-search {
    min-height: 36px;
    padding: 6px 10px;
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
    margin: 0 -20px -8px;
    padding-right: 20px;
    padding-left: 20px;
  }
}
</style>
