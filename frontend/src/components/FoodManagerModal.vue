<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import BaseModal from './BaseModal.vue'
import DraggableList from './DraggableList.vue'
import { state as store, reorderItems, deleteFood, foodKcal, foodsInGroup, UNCATEGORIZED_GROUP_ID } from '../js/data.js'
import { confirmAction } from '../js/confirm.js'
import { openModal, replaceModal, Modals } from '../js/modals.js'

const props = defineProps({ groupId: { type: String, default: '' } })
const emit = defineEmits(['close'])
const query = ref('')
const selectedGroupId = ref(props.groupId)
const groups = computed(() => store.groups)
const groupNames = computed(() => new Map(groups.value.map((group) => [group.id, group.name])))
const foods = computed(() => selectedGroupId.value ? foodsInGroup(selectedGroupId.value) : store.foods)
const filteredFoods = computed(() => {
  const value = query.value.trim().toLowerCase()
  return value ? foods.value.filter((food) => food.name.toLowerCase().includes(value)) : foods.value
})
const openOptionsFoodId = ref(null)
const foodMenuPlacement = ref('down')
const foodMenuRefs = new Map()
function foodLogCount(foodId) {
  return Object.values(store.logs).reduce((count, log) => count + (log.entries || [])
    .filter((entry) => entry.foodId === foodId)
    .reduce((total, entry) => total + (Number(entry.qty) || 0), 0), 0)
}
const dragDisabled = computed(() => !selectedGroupId.value || !!query.value.trim() || filteredFoods.value.length < 2)

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
function closeFoodOptions(event) {
  if (event.target.closest('.food-options')) return
  openOptionsFoodId.value = null
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
function reorder(fromId, toId) {
  reorderItems('foods', fromId, toId)
}
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
          <span>Filter</span>
          <select v-model="selectedGroupId" class="manager-filter" aria-label="Filter foods by group">
            <option value="">All groups</option>
            <option v-for="group in groups" :key="group.id" :value="group.id">{{ group.name }}</option>
          </select>
        </label>
        <label class="food-filter-field">
          <span>Search</span>
          <input v-model="query" class="manager-search" type="search" placeholder="Search foods..." />
        </label>
      </div>
      <div class="food-list-meta">
        <div class="food-count">{{ filteredFoods.length }} food{{ filteredFoods.length === 1 ? '' : 's' }}</div>
      </div>
      <div v-if="selectedGroupId && !query.trim()" class="food-order-note">
        <span class="order-note-icon" aria-hidden="true">ⓘ</span>
        <span>Drag foods to change the order they appear on the dashboard.</span>
      </div>
      <DraggableList
        v-if="filteredFoods.length"
        :items="filteredFoods"
        :disabled="dragDisabled"
        :show-drag-handle="!!selectedGroupId && !query.trim()"
        @reorder="reorder"
      >
        <template #default="{ item }">
          <div class="manager-item-wrap">
            <button class="manager-item" type="button" @click="openEditor(item)">
              <span>
                <strong>
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
                </strong>
                <small>
                  {{ foodKcal(item).toLocaleString() }} kcal · {{ item.items.length ? `${item.items.length} ingredient${item.items.length === 1 ? '' : 's'}` : 'simple food' }}
                  · {{ foodLogCount(item.id) }} log{{ foodLogCount(item.id) === 1 ? '' : 's' }}
                  <template v-if="!selectedGroupId"> · {{ groupNames.get(item.groupId) || 'Uncategorized' }}</template>
                </small>
              </span>
              <span>›</span>
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
        </template>
      </DraggableList>
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
  width: auto;
  min-width: 0;
  min-height: 40px;
  padding: 9px 12px;
  border: 1px solid var(--line);
  border-radius: 10px;
  background-color: var(--bg);
  color: var(--ink);
  font-size: 13px;
  margin: 0;
}

.food-filters {
  display: grid;
  grid-template-columns: minmax(130px, 0.7fr) minmax(0, 1.3fr);
  gap: 8px;
  margin-top: 12px;
}

.food-filter-field {
  display: flex;
  flex-direction: column;
  gap: 5px;
  min-width: 0;
  color: var(--ink-muted);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.food-browse-label {
  margin-top: 18px;
  color: var(--ink-muted);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.manager-filter {
  appearance: none;
  background-image: linear-gradient(45deg, transparent 50%, var(--ink-muted) 50%),
    linear-gradient(135deg, var(--ink-muted) 50%, transparent 50%);
  background-repeat: no-repeat;
  background-position: calc(100% - 15px) 50%, calc(100% - 10px) 50%;
  background-size: 5px 5px;
}

.manager-filter:focus,
.manager-search:focus {
  outline: 2px solid var(--green);
  outline-offset: 1px;
}

.food-count {
  margin: 8px 0 6px;
  color: var(--ink-muted);
  font-size: 12px;
}

.food-order-note {
  display: flex;
  align-items: center;
  gap: 5px;
  margin: -2px 0 8px;
  color: var(--ink-muted);
  font-size: 11px;
}

.food-manager-actions {
  padding-top: 14px;
}

.order-note-icon {
  color: var(--green);
  font-size: 13px;
  line-height: 1;
}

.food-options {
  position: relative;
  flex: none;
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
  color: var(--ink-muted);
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
    grid-template-columns: minmax(112px, 0.75fr) minmax(0, 1.25fr);
    gap: 6px;
  }

  .manager-filter,
  .manager-search {
    min-height: 36px;
    padding: 7px 9px;
  }

  .manager-filter {
    padding-right: 24px;
    background-position: calc(100% - 12px) 50%, calc(100% - 7px) 50%;
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
    overflow-y: auto;
  }

  .food-manager-actions {
    flex: none;
  }
}
</style>
