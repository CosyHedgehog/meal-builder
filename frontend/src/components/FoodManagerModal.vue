<script setup>
import { computed, ref } from 'vue'
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
function foodLogCount(foodId) {
  return Object.values(store.logs).reduce((count, log) => count + (log.entries || [])
    .filter((entry) => entry.foodId === foodId)
    .reduce((total, entry) => total + (Number(entry.qty) || 0), 0), 0)
}
const dragDisabled = computed(() => !selectedGroupId.value || !!query.value.trim() || filteredFoods.value.length < 2)

function openEditor(food = null) {
  openModal(Modals.FOOD_EDITOR, food ? { foodId: food.id } : { groupId: selectedGroupId.value })
}
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
  <BaseModal title="Foods" subtitle="Manage reusable foods shown in the dashboard." @close="emit('close')" @back="selectedGroupId ? replaceModal(Modals.GROUP_MANAGER) : replaceModal(Modals.INGREDIENT_MANAGER)">
    <div class="manager-group">
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
                <strong>{{ item.name }}</strong>
                <small>
                  {{ foodKcal(item).toLocaleString() }} kcal · {{ item.items.length ? `${item.items.length} ingredient${item.items.length === 1 ? '' : 's'}` : 'simple food' }}
                  · {{ foodLogCount(item.id) }} log{{ foodLogCount(item.id) === 1 ? '' : 's' }}
                  <template v-if="!selectedGroupId"> · {{ groupNames.get(item.groupId) || 'Uncategorized' }}</template>
                </small>
              </span>
              <span>›</span>
            </button>
            <button class="manager-delete" type="button" aria-label="Delete food" @click.stop="removeFood(item)">×</button>
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
</style>
