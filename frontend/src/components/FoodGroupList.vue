<script setup>
import { computed, ref, watch } from 'vue'
import FoodQuantityStepper from './FoodQuantityStepper.vue'
import { state as store, addLogFood, bumpLogEntry, logEntries, foodsInGroup, foodKcal, moveFoodToGroupEnd, insertFood, reorderGroups, deleteGroup, toggleGroupVisibility, UNCATEGORIZED_GROUP_ID } from '../js/data.js'
import { view, clearDragState } from '../js/ui.js'
import { Modals, openModal } from '../js/modals.js'
import { confirmAction } from '../js/confirm.js'

const props = defineProps({ group: { type: Object, required: true }, log: { type: Object, required: true }, editMode: { type: Boolean, default: false }, locked: { type: Boolean, default: false } })
const dragOver = ref(false)
const showAll = ref(false)
const foods = computed(() => foodsInGroup(props.group.id))
const entries = computed(() => logEntries(props.log).filter((entry) => entry.groupId === props.group.id))
const visibleFoods = computed(() => showAll.value ? foods.value : foods.value.slice(0, 10))
const hasMore = computed(() => !showAll.value && visibleFoods.value.length < foods.value.length)

watch(() => props.editMode, (isEditing) => {
  if (!isEditing) {
    dragOver.value = false
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
    insertFood(view.draggedFoodId, view.draggedOverFoodId)
  } else if (view.draggedFoodId) {
    moveFoodToGroupEnd(view.draggedFoodId, targetGroupId)
  }
  view.draggedFoodId = ''
  view.draggedOverFoodId = ''
  dragOver.value = false
}
async function removeGroup() {
  const ok = await confirmAction({
    title: 'Delete group',
    message: `Foods in "${props.group.name}" will become uncategorized and hidden. Continue?`,
    okLabel: 'Delete group',
  })
  if (ok) deleteGroup(props.group.id)
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
  <div class="today-chips">
    <div class="chip-group" :class="{ 'dashboard-drop-target': editMode, 'dashboard-drop-active': dragOver, 'dashboard-locked': locked }"
      @dragover.prevent="editMode && (dragOver = true)" @dragleave="dragOver = false" @drop.prevent="editMode && view.dragType === 'food' && dropFood(group.id)">
      <div class="chip-group-header">
        <span class="chip-group-header">
          <i class="group-header-swatch" :class="`group-${store.groups.findIndex((item) => item.id === group.id) % 5}`"></i>
          <span class="chip-group-header-name" role="button" tabindex="0" @click.stop="openModal(Modals.FOOD_MANAGER, { groupId: group.id })" @keydown.enter.prevent.stop="openModal(Modals.FOOD_MANAGER, { groupId: group.id })" @keydown.space.prevent.stop="openModal(Modals.FOOD_MANAGER, { groupId: group.id })">{{ group.name }}</span>
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
          >Delete</button>
        </span>
        <span class="group-header-actions">
          <button
            type="button"
            class="group-add-food-button"
            :aria-label="`Add food to ${group.name}`"
            :title="`Add food to ${group.name}`"
            @click.stop="openModal(Modals.FOOD_EDITOR, { groupId: group.id })"
          >+</button>
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
        </span>
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

.chip-group-header-name {
  cursor: pointer;
  text-decoration: underline;
  text-decoration-color: transparent;
  text-underline-offset: 3px;
  transition: color 0.15s ease, text-decoration-color 0.15s ease;
}

.chip-group-header-name:hover,
.chip-group-header-name:focus-visible {
  color: var(--green-strong);
  text-decoration-color: currentColor;
  outline: none;
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

.group-add-food-button {
  width: 22px;
  height: 22px;
  padding: 0;
  border: 0;
  border-radius: 5px;
  background: transparent;
  color: var(--green);
  font-size: 18px;
  font-weight: 400;
  line-height: 1;
}

.group-add-food-button:hover,
.group-add-food-button:focus-visible {
  background: var(--surface-alt);
  color: var(--green-strong);
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

.dashboard-drop-target {
  border: 1px dashed var(--green-light);
  border-radius: 14px;
  padding: 6px;
}

.dashboard-drop-active {
  background: var(--green-soft);
  border-color: var(--green);
}

.dashboard-locked .today-chip:hover,
.dashboard-locked .today-chip.active:hover,
.dashboard-locked .food-stepper-control:hover,
.dashboard-locked .food-stepper-label:hover {
  border-color: transparent;
  background: transparent;
  color: inherit;
}

.dashboard-locked .today-chip,
.dashboard-locked .food-stepper-control,
.dashboard-locked .food-stepper-label {
  cursor: default;
}

.dashboard-locked .food-stepper,
.dashboard-locked .food-stepper-control:hover,
.dashboard-locked .food-stepper-label:hover {
  background: var(--surface);
}

.dashboard-locked .quick-picks-viewport {
  pointer-events: none;
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
