<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import FoodQuantityStepper from './FoodQuantityStepper.vue'
import { state as store, addLogFood, bumpLogEntry, setLogEntryQty, logEntries, foodsInGroup, foodKcal, entryFoodKcal, reorderFoodWithinGroup, moveFoodToGroupEnd, reorderGroups } from '../js/data.js'
import { view, getCollapseState, setCollapseState, clearDragState } from '../js/ui.js'
import { Modals, openModal } from '../js/modals.js'

const props = defineProps({ group: { type: Object, required: true }, log: { type: Object, required: true }, locked: { type: Boolean, default: false }, activeStepperId: { type: String, default: null } })
const emit = defineEmits(['update:activeStepperId'])
const showAll = ref(false)
const collapsed = ref(getCollapseState(`group:${props.group.id}`))
const foods = computed(() => foodsInGroup(props.group.id))
const entries = computed(() => logEntries(props.log).filter((entry) => entry.groupId === props.group.id))
// Also show archived foods that are already logged today so the user can still see/adjust them
const loggedFoodIds = computed(() => new Set(entries.value.map((e) => e.foodId)))
const displayFoods = computed(() => {
  const active = foods.value
  const archivedButLogged = store.foods.filter(
    (f) => f.archived && f.groupId === props.group.id && loggedFoodIds.value.has(f.id)
  )
  return [...active, ...archivedButLogged]
})
const visibleFoods = computed(() => showAll.value ? displayFoods.value : displayFoods.value.slice(0, 20))
const hasMore = computed(() => !showAll.value && visibleFoods.value.length < displayFoods.value.length)
const pendingDrag = { type: '', id: '', pointerId: null, startX: 0, startY: 0, active: false }
const mobileDragDelay = 450
let mobileDragTimer = null
let mobileDragReady = false
let suppressClickCleanup = null

function entryFor(foodId) {
  return entries.value.find((entry) => entry.foodId === foodId)
}
function isSameGroupFoodTarget(foodId) {
  if (view.dragType !== 'food' || view.draggedOverFoodId !== foodId) return false
  const draggedFood = store.foods.find((item) => item.id === view.draggedFoodId)
  const targetFood = store.foods.find((item) => item.id === foodId)
  return draggedFood?.groupId === targetFood?.groupId
}
function setFoodQuantity(food, quantity) {
  if (props.locked || !Number.isFinite(quantity) || quantity < 0) return
  const entry = entryFor(food.id)
  if (entry) setLogEntryQty(view.logDate, entry.id, quantity)
  else if (quantity > 0) addLogFood(view.logDate, props.group.id, food.id, quantity)
}
function decrement(entry) {
  if (props.locked) return
  bumpLogEntry(view.logDate, entry.id, -1)
}
function toggleCollapsed() {
  collapsed.value = !collapsed.value
  setCollapseState(`group:${props.group.id}`, collapsed.value)
}

function toggleStepper(stepperId, isOpen) {
  emit('update:activeStepperId', isOpen ? stepperId : null)
}

function startPointerDrag(event, type, id) {
  if (event.button !== 0) return
  clearTimeout(mobileDragTimer)
  mobileDragTimer = null
  mobileDragReady = event.pointerType !== 'touch'
  pendingDrag.type = type
  pendingDrag.id = id
  pendingDrag.pointerId = event.pointerId
  pendingDrag.startX = event.clientX
  pendingDrag.startY = event.clientY
  pendingDrag.active = false
  if (!mobileDragReady) {
    const pointerId = event.pointerId
    mobileDragTimer = setTimeout(() => {
      if (pendingDrag.pointerId === pointerId && pendingDrag.type) mobileDragReady = true
      mobileDragTimer = null
    }, mobileDragDelay)
  }
}

function handlePointerMove(event) {
  if (event.pointerId !== pendingDrag.pointerId || !pendingDrag.type) return
  const distance = Math.hypot(event.clientX - pendingDrag.startX, event.clientY - pendingDrag.startY)
  if (!pendingDrag.active && distance >= 8 && !mobileDragReady) {
    cancelPointerDrag()
    return
  }
  if (!pendingDrag.active && (distance < 8 || !mobileDragReady)) return
  if (!pendingDrag.active) {
    pendingDrag.active = true
    view.dragConsumedSwipe = true
    view.dragType = pendingDrag.type
    if (pendingDrag.type === 'group') view.draggedGroupId = pendingDrag.id
    else view.draggedFoodId = pendingDrag.id
  }
  event.preventDefault()
  const target = document.elementFromPoint(event.clientX, event.clientY)
  if (pendingDrag.type === 'group') {
    view.draggedOverGroupId = target?.closest('[data-group-id]')?.dataset.groupId || ''
  } else {
    view.draggedOverFoodId = target?.closest('[data-food-id]')?.dataset.foodId || ''
    view.draggedOverGroupId = target?.closest('[data-group-id]')?.dataset.groupId || ''
  }
}

function handlePointerUp(event) {
  if (event.pointerId !== pendingDrag.pointerId) return
  clearTimeout(mobileDragTimer)
  mobileDragTimer = null
  if (pendingDrag.active) {
    const targetId = pendingDrag.type === 'group' ? view.draggedOverGroupId : view.draggedOverFoodId
    if (pendingDrag.type === 'group') reorderGroups(pendingDrag.id, targetId)
    else {
      const food = store.foods.find((item) => item.id === pendingDrag.id)
      if (food && view.draggedOverGroupId && food.groupId !== view.draggedOverGroupId) {
        moveFoodToGroupEnd(pendingDrag.id, view.draggedOverGroupId)
      } else {
        reorderFoodWithinGroup(pendingDrag.id, targetId)
      }
    }
    suppressClickCleanup?.()
    const suppressClick = (clickEvent) => {
      const dashboardTarget = clickEvent.target.closest?.('.dashboard-food-item, .group-header-main')
      if (!dashboardTarget) {
        suppressClickCleanup?.()
        return
      }
      clickEvent.preventDefault()
      clickEvent.stopPropagation()
      suppressClickCleanup?.()
    }
    const timeoutId = setTimeout(() => suppressClickCleanup?.(), 0)
    suppressClickCleanup = () => {
      clearTimeout(timeoutId)
      document.removeEventListener('click', suppressClick, true)
      suppressClickCleanup = null
    }
    document.addEventListener('click', suppressClick, true)
  }
  pendingDrag.type = ''
  pendingDrag.id = ''
  pendingDrag.pointerId = null
  pendingDrag.active = false
  mobileDragReady = false
  clearDragState()
}

function cancelPointerDrag() {
  clearTimeout(mobileDragTimer)
  mobileDragTimer = null
  if (pendingDrag.active) {
    view.dragConsumedSwipe = true
    clearDragState()
  }
  pendingDrag.type = ''
  pendingDrag.id = ''
  pendingDrag.pointerId = null
  pendingDrag.active = false
  mobileDragReady = false
}

onMounted(() => {
  document.addEventListener('pointermove', handlePointerMove, { passive: false })
  document.addEventListener('pointerup', handlePointerUp)
  document.addEventListener('pointercancel', cancelPointerDrag)
})

onUnmounted(() => {
  clearTimeout(mobileDragTimer)
  suppressClickCleanup?.()
  document.removeEventListener('pointermove', handlePointerMove)
  document.removeEventListener('pointerup', handlePointerUp)
  document.removeEventListener('pointercancel', cancelPointerDrag)
})
</script>

<template>
  <div class="today-chips">
    <div class="chip-group" :data-group-id="group.id" :class="{ 'dashboard-locked': locked, dragging: view.draggedGroupId === group.id, 'drag-over': view.draggedOverGroupId === group.id && view.draggedGroupId !== group.id && view.dragType === 'group', 'food-move-over': view.draggedOverGroupId === group.id && view.dragType === 'food' && store.foods.find((item) => item.id === view.draggedFoodId)?.groupId !== group.id }">
      <div
        class="chip-group-header"
      >
        <span class="group-header-main" :class="{ 'dashboard-draggable': !locked }" @pointerdown="!locked && startPointerDrag($event, 'group', group.id)">
          <i class="group-header-swatch" :class="`group-${store.groups.findIndex((item) => item.id === group.id) % 5}`"></i>
          <span
            class="chip-group-header-name"
            role="button"
            tabindex="0"
            :aria-expanded="!collapsed"
            :aria-label="`${collapsed ? 'Expand' : 'Collapse'} ${group.name}`"
            @click="toggleCollapsed"
            @keydown.enter.prevent="toggleCollapsed"
            @keydown.space.prevent="toggleCollapsed"
          >
            <span>{{ group.name }}</span>
            <svg class="group-header-chevron" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path :d="collapsed ? 'M9 6l6 6-6 6' : 'M6 9l6 6 6-6'" />
            </svg>
          </span>
          <button
            v-if="!locked"
            type="button"
            class="group-add-food-button"
            :aria-label="`Add food to ${group.name}`"
            :title="`Add food to ${group.name}`"
            @pointerdown.stop
            @click.stop="openModal(Modals.FOOD_EDITOR, { groupId: group.id })"
          >
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <path d="M8 3v10M3 8h10" />
            </svg>
          </button>
          <button
            v-if="!locked"
            type="button"
            class="group-edit-foods-button"
            :aria-label="`Edit foods in ${group.name}`"
            :title="`Edit foods in ${group.name}`"
            @pointerdown.stop
            @click.stop="openModal(Modals.FOOD_MANAGER, { groupId: group.id })"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"
              stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <circle cx="5" cy="6" r="1" fill="currentColor" />
              <circle cx="5" cy="12" r="1" fill="currentColor" />
              <circle cx="5" cy="18" r="1" fill="currentColor" />
              <path d="M9 6h10M9 12h10M9 18h10" />
            </svg>
          </button>
        </span>
      </div>
      <div v-if="!collapsed" class="quick-picks-viewport">
        <div class="chip-list" :class="{ 'kcal-hidden': !store.showKcal }">
          <div v-for="entry in entries.filter((item) => !item.foodId)" :key="entry.id" class="dashboard-food-item"
            :class="{ active: props.activeStepperId === `custom-${entry.id}` }">
            <FoodQuantityStepper
              :name="entry.name || 'Custom'"
              :quantity="entry.qty"
              :kcal="entry.kcal || 0"
              :color-index="store.groups.findIndex((item) => item.id === group.id) % 5"
              :locked="locked"
              :open="props.activeStepperId === `custom-${entry.id}`"
              one-off
              @decrement="decrement(entry)"
              @increment="!locked && bumpLogEntry(view.logDate, entry.id, 1)"
              @set-quantity="!locked && setLogEntryQty(view.logDate, entry.id, $event)"
              @toggle="(isOpen) => toggleStepper(`custom-${entry.id}`, isOpen)"
            />
          </div>
          <template v-for="food in visibleFoods" :key="food.id">
            <div class="dashboard-food-item" :data-food-id="food.id" :class="{ active: props.activeStepperId === `food-${food.id}`, dragging: view.draggedFoodId === food.id, 'drag-over': isSameGroupFoodTarget(food.id) }"
              @pointerdown="startPointerDrag($event, 'food', food.id)">
              <FoodQuantityStepper
                :name="food.name"
                :quantity="entryFor(food.id)?.qty || 0"
                :kcal="entryFor(food.id)?.overrides ? entryFoodKcal(entryFor(food.id)) : foodKcal(food)"
                :kcal-adjustment="entryFor(food.id)?.overrides ? entryFoodKcal(entryFor(food.id)) - foodKcal(food) : 0"
                :adjusted="!!entryFor(food.id)?.overrides"
                :adjustable="food.mode !== 'simple' && !!entryFor(food.id)"
                :locked="locked"
                :one-click-mode="store.oneClickMode"
                editable
                :open="props.activeStepperId === `food-${food.id}`"
                @decrement="entryFor(food.id) && decrement(entryFor(food.id))"
                @increment="!locked && addLogFood(view.logDate, group.id, food.id)"
                @set-quantity="setFoodQuantity(food, $event)"
                @edit="openModal(Modals.FOOD_EDITOR, { foodId: food.id })"
                @adjust="openModal(Modals.ADJUST_FOOD, { entryId: entryFor(food.id).id })"
                @toggle="(isOpen) => toggleStepper(`food-${food.id}`, isOpen)"
              />
            </div>
          </template>
          <div v-if="!foods.length" class="empty-group-state">
            <span class="empty-note">No foods in this group yet</span>
            <button v-if="!locked" type="button" class="today-chip chip-add"
              @click="openModal(Modals.FOOD_EDITOR, { groupId: group.id })">
              + Add
            </button>
          </div>
          <button v-if="hasMore" type="button" class="chip-more" @click="showAll = true">More…</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.group-header-swatch {
  display: inline-block;
  width: 6px;
  height: 6px;
  margin-right: 4px;
  border-radius: 50%;
  vertical-align: 1px;
}

.group-header-swatch.group-0 { background: var(--group-0); }
.group-header-swatch.group-1 { background: var(--group-1); }
.group-header-swatch.group-2 { background: var(--group-2); }
.group-header-swatch.group-3 { background: var(--group-3); }
.group-header-swatch.group-4 { background: var(--group-4); }

.group-header-main {
  display: inline-flex;
  align-items: center;
  cursor: pointer;
}

.group-header-main.dashboard-draggable,
.dashboard-food-item {
  /* cursor: grab; */
  touch-action: none;
}

.group-header-main.dashboard-draggable,
.dashboard-food-item,
.dashboard-food-item .today-chip,
.today-chip.chip-add {
  user-select: none;
  -webkit-user-select: none;
}

.chip-group.dragging .group-header-main,
.dashboard-food-item.dragging {
  cursor: grabbing;
}

.chip-group.dragging,
.dashboard-food-item.dragging {
  opacity: 0.45;
}

.chip-group.drag-over .chip-group-header {
  color: var(--green-strong);
}

.chip-group.drag-over .chip-group-header::after {
  content: 'Swap group here';
  position: absolute;
  top: 50%;
  right: 0;
  z-index: 2;
  padding: 4px 8px;
  border: 1px solid var(--green);
  border-radius: 999px;
  background: var(--surface);
  color: var(--green);
  font-size: 10px;
  font-weight: 700;
  line-height: 1;
  transform: translateY(-50%);
  box-shadow: 0 2px 8px rgba(var(--shadow-rgb), 0.45);
  pointer-events: none;
}

.dashboard-food-item.drag-over::after {
  content: 'Swap with';
  position: absolute;
  top: -24px;
  right: -5px;
  z-index: 2;
  padding: 4px 7px;
  border: 1px solid var(--green);
  border-radius: 999px;
  background: var(--surface);
  color: var(--green);
  font-size: 10px;
  font-weight: 700;
  line-height: 1;
  box-shadow: 0 2px 8px rgba(var(--shadow-rgb), 0.45);
  pointer-events: none;
}

.chip-group.food-move-over {
  outline: 2px dashed var(--green);
  outline-offset: 0;
  background: color-mix(in srgb, var(--green-soft) 32%, transparent);
}

.chip-group.food-move-over .chip-group-header {
  color: var(--green-strong);
}

.chip-group.food-move-over .chip-group-header::after {
  content: 'Move to this group';
  position: absolute;
  top: 50%;
  right: 0;
  z-index: 2;
  padding: 4px 8px;
  border: 1px solid var(--green);
  border-radius: 999px;
  background: var(--surface);
  color: var(--green);
  font-size: 10px;
  font-weight: 700;
  line-height: 1;
  transform: translateY(-50%);
  box-shadow: 0 2px 8px rgba(var(--shadow-rgb), 0.45);
  pointer-events: none;
}

.dashboard-food-item.drag-over {
  position: relative;
  z-index: 7;
}

.dashboard-food-item.drag-over :deep(.food-stepper) {
  outline: 2px dashed var(--green);
  outline-offset: 0;
  background: color-mix(in srgb, var(--green-soft) 70%, transparent);
  box-shadow: 0 0 10px color-mix(in srgb, var(--green) 28%, transparent);
  cursor: grabbing;
}

.chip-group-header-name {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  transition: color 0.15s ease, text-decoration-color 0.15s ease;
}

.group-header-chevron {
  color: var(--ink-muted);
  width: 12px;
  height: 12px;
  flex: none;
  stroke: currentColor;
  stroke-width: 2.5;
  stroke-linecap: round;
  stroke-linejoin: round;
  transition: color 0.15s ease;
}

.chip-group-header-name:hover,
.chip-group-header-name:focus-visible {
  color: var(--green-strong);
  outline: none;
}

.chip-group-header-name:hover .group-header-chevron,
.chip-group-header-name:focus-visible .group-header-chevron {
  color: var(--green-strong);
}

.group-add-food-button {
  display: inline-flex;
  width: 22px;
  height: 22px;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: 0;
  border-radius: 5px;
  background: transparent;
  color: var(--ink-muted);
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
}

.group-add-food-button svg {
  width: 14px;
  height: 14px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.8;
  stroke-linecap: round;
}

.group-add-food-button:hover,
.group-add-food-button:focus-visible {
  background: var(--surface-alt);
  color: var(--green-strong);
}

.group-edit-foods-button {
  display: inline-flex;
  width: 22px;
  height: 22px;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: 0;
  border-radius: 5px;
  background: transparent;
  color: var(--ink-muted);
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
}

.group-edit-foods-button svg {
  width: 14px;
  height: 14px;
}

.group-edit-foods-button:hover,
.group-edit-foods-button:focus-visible {
  background: var(--surface-alt);
  color: var(--green-strong);
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

.dashboard-locked .today-chip,
.dashboard-locked .food-stepper {
  pointer-events: none;
}

.dashboard-food-item {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.dashboard-food-item.active {
  position: relative;
  z-index: 7;
}

.empty-group-state {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 58px;
  padding: 10px 14px;
  border: 1px dashed color-mix(in srgb, var(--ink) 15%, transparent);
  border-radius: 12px;
}

@media (min-width: 601px) {
  .empty-group-state .empty-note {
    color: color-mix(in srgb, var(--ink) 30%, transparent);
    font-size: 13px;
  }
}

</style>
