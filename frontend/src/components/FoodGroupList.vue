<script setup>
import { computed, ref, watch } from 'vue'
import FoodQuantityStepper from './FoodQuantityStepper.vue'
import { state as store, addLogFood, bumpLogEntry, logEntries, foodsInGroup, foodKcal, moveFoodToGroupEnd, reorderFood, insertFood, reorderGroups, updateGroup, deleteGroup, toggleGroupVisibility, UNCATEGORIZED_GROUP_ID } from '../js/data.js'
import { view, clearDragState } from '../js/ui.js'
import { Modals, openModal } from '../js/modals.js'
import { confirmAction } from '../js/confirm.js'

const props = defineProps({ group: { type: Object, required: true }, log: { type: Object, required: true }, editMode: { type: Boolean, default: false }, locked: { type: Boolean, default: false } })
const dragOver = ref(false)
const showAll = ref(false)
const editingGroupName = ref(false)
const groupNameDraft = ref('')
const foods = computed(() => foodsInGroup(props.group.id))
const entries = computed(() => logEntries(props.log).filter((entry) => entry.groupId === props.group.id))
const visibleFoods = computed(() => showAll.value ? foods.value : foods.value.slice(0, 10))
const hasMore = computed(() => !showAll.value && visibleFoods.value.length < foods.value.length)

watch(() => props.editMode, (isEditing) => {
  if (!isEditing) {
    dragOver.value = false
    editingGroupName.value = false
  }
})

function entryFor(foodId) {
  return entries.value.find((entry) => entry.foodId === foodId)
}
function decrement(entry) {
  if (props.locked) return
  bumpLogEntry(view.logDate, entry.id, -1)
}
function startDrag(foodId, event) {
  if (props.locked) return
  view.draggedFoodId = foodId
  view.dragType = 'food'
  view.draggedGroupId = ''
  event.dataTransfer.effectAllowed = 'move'
}
function dropFood(targetGroupId = props.group.id) {
  const draggedFood = store.foods.find((food) => food.id === view.draggedFoodId)
  if (view.draggedFoodId && view.draggedOverFoodId && draggedFood?.groupId === targetGroupId) {
    if (view.foodOrderMode === 'insert') insertFood(view.draggedFoodId, view.draggedOverFoodId)
    else reorderFood(view.draggedFoodId, view.draggedOverFoodId)
  } else if (view.draggedFoodId) {
    moveFoodToGroupEnd(view.draggedFoodId, targetGroupId)
  }
  view.draggedFoodId = ''
  view.draggedOverFoodId = ''
  dragOver.value = false
}
function beginGroupNameEdit() {
  if (props.group.id === 'group-uncategorized') return
  groupNameDraft.value = props.group.name
  editingGroupName.value = true
}
function saveGroupName() {
  if (!editingGroupName.value) return
  updateGroup(props.group.id, groupNameDraft.value)
  editingGroupName.value = false
}
async function removeGroup() {
  const ok = await confirmAction({
    title: 'Delete group',
    message: `Foods in "${props.group.name}" will become uncategorized and hidden. Continue?`,
    okLabel: 'Delete group',
  })
  if (ok) deleteGroup(props.group.id)
}
function handleHeaderClick(event) {
  if (editingGroupName.value && event.target.tagName !== 'INPUT') saveGroupName()
}
function endDrag() {
  view.draggedFoodId = ''
  view.draggedOverFoodId = ''
  dragOver.value = false
}
function moveGroup(direction) {
  const index = store.groups.findIndex((item) => item.id === props.group.id)
  const target = store.groups[index + direction]
  if (target) reorderGroups(props.group.id, target.id)
}
</script>

<template>
  <div class="today-chips" @click="handleHeaderClick">
    <div class="chip-group" :class="{ 'dashboard-drop-target': editMode, 'dashboard-drop-active': dragOver }"
      @dragover.prevent="editMode && (dragOver = true)" @dragleave="dragOver = false" @drop.prevent="editMode && view.dragType === 'food' && dropFood(group.id)">
      <div class="chip-group-header">
        <span>
          <i class="group-header-swatch" :class="`group-${store.groups.findIndex((item) => item.id === group.id) % 5}`"></i>
          <input
            v-if="editingGroupName"
            v-model="groupNameDraft"
            class="group-name-input"
            aria-label="Group name"
            @click.stop
            @keydown.enter.prevent="saveGroupName"
            @keydown.esc="editingGroupName = false"
            @blur="saveGroupName"
          />
          <span v-else>{{ group.name }}</span>
          <button
            v-if="editMode && group.id !== 'group-uncategorized'"
            type="button"
            class="group-edit-button"
            :aria-label="`Edit ${group.name} name`"
            title="Edit group name"
            @click.stop="beginGroupNameEdit"
          >
            ✎
          </button>
          <button
            v-if="editMode"
            type="button"
            class="group-visibility-button"
            :aria-label="`${group.visible !== false ? 'Hide' : 'Show'} ${group.name} on dashboard`"
            :title="`${group.visible !== false ? 'Hide' : 'Show'} group on dashboard`"
            @click.stop="toggleGroupVisibility(group.id)"
          >{{ group.visible !== false ? '◉ Shown' : '○ Hidden' }}</button>
          <button
            v-if="editMode && group.id !== UNCATEGORIZED_GROUP_ID"
            type="button"
            class="group-delete-button"
            :aria-label="`Delete ${group.name}`"
            title="Delete group"
            @click.stop="removeGroup"
          >× Delete group</button>
        </span>
        <span v-if="editMode" class="dashboard-group-order-controls">
          <button
            type="button"
            class="dashboard-group-order-button"
            :disabled="store.groups.findIndex((item) => item.id === group.id) === 0"
            :aria-label="`Move ${group.name} up`"
            title="Move group up"
            @click.stop="moveGroup(-1)"
          >↑</button>
          <button
            type="button"
            class="dashboard-group-order-button"
            :disabled="store.groups.findIndex((item) => item.id === group.id) === store.groups.length - 1"
            :aria-label="`Move ${group.name} down`"
            title="Move group down"
            @click.stop="moveGroup(1)"
          >↓</button>
        </span>
        <!-- <span class="group-header-actions">
          <button type="button" class="group-add-button" @click="openModal(Modals.FOOD_EDITOR, { groupId: group.id })">
            Add {{ group.name.toLowerCase() }}
          </button>
        </span> -->
      </div>
      <div class="quick-picks-viewport">
        <div class="chip-list" :class="{ 'kcal-hidden': !store.showKcal }">
          <div v-if="!editMode" v-for="entry in entries.filter((item) => !item.foodId)" :key="entry.id" class="dashboard-food-item">
            <FoodQuantityStepper
              :name="entry.name || 'Custom'"
              :quantity="entry.qty"
              :kcal="entry.kcal || 0"
              :color-index="store.groups.findIndex((item) => item.id === group.id) % 5"
              one-off
              @decrement="decrement(entry)"
              @increment="!locked && bumpLogEntry(view.logDate, entry.id, 1)"
              @edit="!locked && openModal(Modals.CUSTOM_ENTRY, { groupId: group.id, entry })"
            />
          </div>
          <template v-for="food in visibleFoods" :key="food.id">
            <div
              class="dashboard-food-item"
              :class="{ 'dashboard-food-drop-target': editMode, 'dashboard-food-drop-active': view.draggedOverFoodId === food.id }"
              @dragover.prevent="editMode && (view.draggedOverFoodId = food.id)"
              @drop.prevent="editMode && dropFood(group.id)"
            >
              <span v-if="editMode" class="dashboard-drag-handle" draggable="true" title="Drag food to another group" @dragstart="startDrag(food.id, $event)" @dragend="endDrag">⠿</span>
              <button v-if="!entryFor(food.id)" type="button" class="today-chip" :aria-label="`Add ${food.name}`" @click="!locked && addLogFood(view.logDate, group.id, food.id)">
                <span>{{ food.name }}</span><span class="chip-kcal">{{ foodKcal(food).toLocaleString() }} kcal</span>
              </button>
              <FoodQuantityStepper v-else :name="food.name" :quantity="entryFor(food.id).qty" :kcal="foodKcal(food)" @decrement="decrement(entryFor(food.id))" @increment="!locked && addLogFood(view.logDate, group.id, food.id)" @edit="!locked && openModal(Modals.FOOD_EDITOR, { foodId: food.id })" />
            </div>
          </template>
          <span v-if="!foods.length" class="empty-note">No foods in this group</span>
          <button v-if="!editMode" type="button" class="today-chip chip-add" :disabled="locked" @click="!locked && openModal(Modals.CUSTOM_ENTRY, { groupId: group.id })">
            + Custom
          </button>
          <button v-if="hasMore" type="button" class="chip-more" @click="showAll = true">More…</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.group-header-swatch {
  display: inline-block;
  width: 8px;
  height: 8px;
  margin-right: 5px;
  border-radius: 2px;
  vertical-align: 1px;
}

.group-header-swatch.group-0 { background: var(--green); }
.group-header-swatch.group-1 { background: var(--green-light); }
.group-header-swatch.group-2 { background: #79a96f; }
.group-header-swatch.group-3 { background: #4f8f58; }
.group-header-swatch.group-4 { background: #a8c98f; }

.group-edit-button {
  margin-left: 4px;
  padding: 2px 4px;
  border: 0;
  border-radius: 5px;
  background: transparent;
  color: var(--ink-muted);
  font-size: 12px;
  line-height: 1;
}

.group-edit-button:hover {
  background: var(--surface-alt);
  color: var(--green);
}

.group-visibility-button {
  margin-left: 4px;
  padding: 2px 4px;
  border: 0;
  border-radius: 5px;
  background: transparent;
  color: var(--ink-muted);
  font-size: 12px;
  line-height: 1;
}

.group-visibility-button:hover {
  background: var(--surface-alt);
  color: var(--green);
}

.group-delete-button {
  margin-left: 4px;
  padding: 2px 5px;
  border: 0;
  border-radius: 5px;
  background: transparent;
  color: var(--ink-muted);
  font-size: 12px;
  line-height: 1;
}

.group-delete-button:hover {
  background: var(--red-soft);
  color: var(--red);
}

.dashboard-group-drag-handle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  flex: none;
  color: var(--ink-muted);
  cursor: grab;
  font-size: 14px;
  letter-spacing: 1px;
  touch-action: none;
}

.dashboard-group-order-controls {
  display: inline-flex;
  gap: 2px;
}

.dashboard-group-order-button {
  width: 22px;
  height: 22px;
  padding: 0;
  border: 0;
  border-radius: 5px;
  background: transparent;
  color: var(--ink-muted);
  font-size: 15px;
  line-height: 1;
}

.dashboard-group-order-button:hover:not(:disabled) {
  background: var(--surface-alt);
  color: var(--green);
}

.dashboard-group-order-button:disabled {
  opacity: 0.25;
  cursor: default;
}

.dashboard-group-drag-handle:hover {
  color: var(--green);
}

.dashboard-group-drag-handle:active {
  cursor: grabbing;
}

.dashboard-group-drag-active {
  background: var(--surface-alt);
}

.group-name-input {
  width: min(220px, 60vw);
  padding: 3px 6px;
  border: 1px solid var(--green-light);
  border-radius: 6px;
  background: var(--surface);
  color: var(--ink);
  font: inherit;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.group-name-input:focus {
  outline: 2px solid var(--green);
  outline-offset: 1px;
}

.dashboard-drop-target {
  border: 1px dashed var(--green-light);
  border-radius: 14px;
  padding: 6px;
}

.dashboard-drop-active {
  background: var(--green-soft);
  border-color: var(--green);
}

.dashboard-food-item {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.dashboard-food-drop-target {
  border-radius: 999px;
}

.dashboard-food-drop-active {
  background: var(--surface-alt);
}

.dashboard-drag-handle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  color: var(--ink-muted);
  cursor: grab;
  font-size: 14px;
  touch-action: none;
}

.dashboard-drag-handle:hover {
  color: var(--green);
}

</style>
