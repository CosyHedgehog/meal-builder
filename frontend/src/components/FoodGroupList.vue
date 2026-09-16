<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue'
import FoodQuantityStepper from './FoodQuantityStepper.vue'
import { state as store, addLogFood, bumpLogEntry, setLogEntryQty, logEntries, foodFamiliesInGroup, foodKcal, entryFoodKcal, reorderFoodWithinGroup, moveFoodToGroupEnd, reorderGroups, setGroupFoodSort } from '../js/data.js'
import { view, getCollapseState, setCollapseState, clearDragState } from '../js/ui.js'
import { Modals, openModal } from '../js/modals.js'

const props = defineProps({ group: { type: Object, required: true }, log: { type: Object, required: true }, locked: { type: Boolean, default: false }, activeStepperId: { type: String, default: null } })
const emit = defineEmits(['update:activeStepperId'])
const showAll = ref(false)
const collapsed = ref(getCollapseState(`group:${props.group.id}`))
const sortMenuOpen = ref(false)
const sortButton = ref(null)
const sortMenuStyle = ref({})
const groupSort = computed(() => props.group.foodSort || 'chosen')
const sortOptions = [
  { value: 'chosen', label: 'Chosen order' },
  { value: 'name', label: 'Name' },
  { value: 'kcal', label: 'Calories' },
]
const families = computed(() => foodFamiliesInGroup(props.group.id))
const entries = computed(() => logEntries(props.log).filter((entry) => entry.groupId === props.group.id))
const hiddenVariantIds = computed(() => new Set(families.value
  .filter((family) => family.showStandalone !== true)
  .flatMap((family) => family.variantFoodIds || [])))
const dashboardItems = computed(() => {
  const items = store.foods.filter((food) => (
    food.groupId === props.group.id
    && (!food.archived || entries.value.some((entry) => entry.foodId === food.id))
    && (food.mode === 'family' || !hiddenVariantIds.value.has(food.id))
  ))
  if (groupSort.value === 'name') return [...items].sort((first, second) => first.name.localeCompare(second.name))
  if (groupSort.value === 'kcal') return [...items].sort((first, second) => foodKcal(second) - foodKcal(first) || first.name.localeCompare(second.name))
  return items
})
const visibleDashboardItems = computed(() => showAll.value ? dashboardItems.value : dashboardItems.value.slice(0, 20))
const hasMore = computed(() => !showAll.value && visibleDashboardItems.value.length < dashboardItems.value.length)
const pendingDrag = { type: '', id: '', pointerId: null, startX: 0, startY: 0, active: false }
const mobileDragDelay = 450
let mobileDragTimer = null
let mobileDragReady = false
let suppressClickCleanup = null

function entryFor(foodId) {
  return entries.value.find((entry) => entry.foodId === foodId)
}
function clearFamilySelectionForFood(foodId) {
  const family = families.value.find((item) => (item.variantFoodIds || []).includes(foodId))
  if (family) delete view.selectedFamilyVariants[family.id]
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
  if (quantity === 0) clearFamilySelectionForFood(food.id)
}
function decrement(entry) {
  if (props.locked) return
  const reachesZero = (Number(entry.qty) || 0) <= 1
  bumpLogEntry(view.logDate, entry.id, -1)
  if (reachesZero) clearFamilySelectionForFood(entry.foodId)
}
function toggleCollapsed() {
  collapsed.value = !collapsed.value
  setCollapseState(`group:${props.group.id}`, collapsed.value)
}

async function toggleSortMenu() {
  sortMenuOpen.value = !sortMenuOpen.value
  if (!sortMenuOpen.value || !sortButton.value || window.innerWidth > 600) return
  await nextTick()
  const buttonRect = sortButton.value.getBoundingClientRect()
  const menuWidth = Math.min(150, window.innerWidth - 16)
  const left = Math.max(8, Math.min(buttonRect.right - menuWidth, window.innerWidth - menuWidth - 8))
  sortMenuStyle.value = {
    position: 'fixed',
    top: `${buttonRect.bottom + 5}px`,
    left: `${left}px`,
    right: 'auto',
    width: `${menuWidth}px`,
  }
}

function chooseSort(sortMode) {
  setGroupFoodSort(props.group.id, sortMode)
  sortMenuOpen.value = false
  sortMenuStyle.value = {}
}

function closeSortMenu(event) {
  if (!event.target.closest('.group-sort-control')) {
    sortMenuOpen.value = false
    sortMenuStyle.value = {}
  }
}

function closeSortMenuOnScroll() {
  if (!sortMenuOpen.value) return
  sortMenuOpen.value = false
  sortMenuStyle.value = {}
}

function toggleStepper(stepperId, isOpen) {
  if (!isOpen && view.openFoodStepperId === stepperId.replace('food-', '')) view.openFoodStepperId = ''
  emit('update:activeStepperId', isOpen ? stepperId : null)
}

function familyQuantity(family) {
  const variantIds = new Set(family.variantFoodIds || [])
  return entries.value
    .filter((entry) => variantIds.has(entry.foodId))
    .reduce((total, entry) => total + (Number(entry.qty) || 0), 0)
}

function selectedFamilyFood(family) {
  const selectedId = view.selectedFamilyVariants[family.id]
  if (selectedId) return store.foods.find((food) => food.id === selectedId) || null
  const variantIds = new Set(family.variantFoodIds || [])
  const loggedVariant = entries.value.find((entry) => variantIds.has(entry.foodId))
  return loggedVariant ? store.foods.find((food) => food.id === loggedVariant.foodId) || null : null
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
    const targetGroupId = target?.closest('[data-group-id]')?.dataset.groupId || ''
    if (targetGroupId && targetGroupId !== view.draggedOverGroupId && targetGroupId !== pendingDrag.id) {
      reorderGroups(pendingDrag.id, targetGroupId)
    }
    view.draggedOverGroupId = targetGroupId
  } else {
    const targetFoodId = target?.closest('[data-food-id]')?.dataset.foodId || ''
    const targetGroupId = target?.closest('[data-group-id]')?.dataset.groupId || ''
    const draggedFood = store.foods.find((item) => item.id === pendingDrag.id)
    if (targetGroupId && draggedFood?.groupId !== targetGroupId) {
      moveFoodToGroupEnd(pendingDrag.id, targetGroupId)
    }
    const targetFood = store.foods.find((item) => item.id === targetFoodId)
    if (targetFoodId && targetFoodId !== view.draggedOverFoodId && targetFoodId !== pendingDrag.id && draggedFood?.groupId === targetFood?.groupId) {
      reorderFoodWithinGroup(pendingDrag.id, targetFoodId)
    }
    view.draggedOverFoodId = targetFoodId
    view.draggedOverGroupId = targetGroupId
  }
}

function handlePointerUp(event) {
  if (event.pointerId !== pendingDrag.pointerId) return
  clearTimeout(mobileDragTimer)
  mobileDragTimer = null
  if (pendingDrag.active) {
    if (pendingDrag.type === 'food') {
      const food = store.foods.find((item) => item.id === pendingDrag.id)
      if (food && view.draggedOverGroupId && food.groupId !== view.draggedOverGroupId) {
        moveFoodToGroupEnd(pendingDrag.id, view.draggedOverGroupId)
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
  document.addEventListener('click', closeSortMenu)
  document.addEventListener('scroll', closeSortMenuOnScroll, true)
})

onUnmounted(() => {
  clearTimeout(mobileDragTimer)
  suppressClickCleanup?.()
  document.removeEventListener('pointermove', handlePointerMove)
  document.removeEventListener('pointerup', handlePointerUp)
  document.removeEventListener('pointercancel', cancelPointerDrag)
  document.removeEventListener('click', closeSortMenu)
  document.removeEventListener('scroll', closeSortMenuOnScroll, true)
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
          <div class="group-sort-control">
            <button
              ref="sortButton"
              type="button"
              class="group-sort-button"
              aria-haspopup="menu"
              :aria-expanded="sortMenuOpen"
              :aria-label="`Sort ${group.name} foods`"
              :title="`Sort ${group.name} foods`"
              @pointerdown.stop
              @click.stop="toggleSortMenu"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M4 6h16M4 12h10M4 18h6" />
              </svg>
            </button>
            <div v-if="sortMenuOpen" class="group-sort-menu" :style="sortMenuStyle" role="menu" :aria-label="`Sort ${group.name} foods`">
              <button
                v-for="option in sortOptions"
                :key="option.value"
                type="button"
                role="menuitemradio"
                :aria-checked="groupSort === option.value"
                @click.stop="chooseSort(option.value)"
              >
                <svg v-if="option.value === 'chosen'" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M8 6h12M8 12h12M8 18h12" />
                  <path d="M3 6h.01M3 12h.01M3 18h.01" />
                </svg>
                <svg v-else-if="option.value === 'name'" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M5 4v16M5 4l-3 3M5 4l3 3M12 7h9M12 12h6M12 17h3" />
                </svg>
                <svg v-else viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M4 19V5M4 5l-2 2M4 5l2 2M10 7h10M10 12h7M10 17h4" />
                </svg>
                <span>{{ option.label }}</span>
                <span v-if="groupSort === option.value" class="group-sort-check" aria-hidden="true">✓</span>
              </button>
            </div>
          </div>
        </span>
      </div>
      <div v-if="!collapsed" class="quick-picks-viewport">
        <div class="chip-list" :class="{ 'kcal-hidden': !store.showKcal, 'chips-large': store.chipSize === 'large' }">
          <div v-for="entry in entries.filter((item) => !item.foodId && (!locked || (Number(item.qty) || 0) > 0))" :key="entry.id" class="dashboard-food-item"
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
          <TransitionGroup name="food-chip" tag="div" class="food-chip-transition">
            <template v-for="item in visibleDashboardItems" :key="item.id">
              <div v-if="item.mode === 'family'" class="dashboard-food-family" :data-food-id="item.id"
                :class="{ dragging: view.draggedFoodId === item.id, 'drag-over': isSameGroupFoodTarget(item.id) }"
                @pointerdown="groupSort === 'chosen' && startPointerDrag($event, 'food', item.id)">
                <template v-if="selectedFamilyFood(item)">
                  <div class="dashboard-food-item family-selected-food">
                    <FoodQuantityStepper
                      :name="`${selectedFamilyFood(item).name}${selectedFamilyFood(item).archived ? ' (Hidden)' : ''}`"
                      :quantity="entryFor(selectedFamilyFood(item).id)?.qty || 0"
                      :kcal="entryFor(selectedFamilyFood(item).id)?.overrides ? entryFoodKcal(entryFor(selectedFamilyFood(item).id)) : foodKcal(selectedFamilyFood(item))"
                      :kcal-adjustment="entryFor(selectedFamilyFood(item).id)?.overrides ? entryFoodKcal(entryFor(selectedFamilyFood(item).id)) - foodKcal(selectedFamilyFood(item)) : 0"
                      :adjusted="!!entryFor(selectedFamilyFood(item).id)?.overrides"
                      :color-index="store.groups.findIndex((groupItem) => groupItem.id === group.id) % 5"
                      :locked="locked"
                      :one-click-mode="store.oneClickMode"
                      :adjustable="selectedFamilyFood(item).mode !== 'simple' && !!entryFor(selectedFamilyFood(item).id)"
                      family-changeable
                      editable
                      :open="props.activeStepperId === `food-${selectedFamilyFood(item).id}` || view.openFoodStepperId === selectedFamilyFood(item).id"
                      @decrement="entryFor(selectedFamilyFood(item).id) && decrement(entryFor(selectedFamilyFood(item).id))"
                      @increment="!locked && addLogFood(view.logDate, group.id, selectedFamilyFood(item).id)"
                      @set-quantity="setFoodQuantity(selectedFamilyFood(item), $event)"
                      @edit="openModal(Modals.FOOD_EDITOR, { foodId: selectedFamilyFood(item).id })"
                      @adjust="openModal(Modals.ADJUST_FOOD, { entryId: entryFor(selectedFamilyFood(item).id)?.id })"
                      @family-change="openModal(Modals.FOOD_FAMILY_PICKER, { familyId: item.id })"
                      @toggle="(isOpen) => toggleStepper(`food-${selectedFamilyFood(item).id}`, isOpen)"
                    />
                  </div>
                </template>
                <button v-else type="button" class="family-chip" :disabled="locked" @click="!locked && openModal(Modals.FOOD_FAMILY_PICKER, { familyId: item.id })">
                  <span class="family-chip-name">{{ item.name }}</span>
                  <span class="family-chip-meta">
                    <svg v-if="!familyQuantity(item)" class="family-chip-variant-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                      <path d="m12 2 9 5-9 5-9-5 9-5Z" />
                      <path d="m3 12 9 5 9-5M3 17l9 5 9-5" />
                    </svg>
                    {{ familyQuantity(item) ? `${familyQuantity(item)} today` : 'Variant' }}
                  </span>
                </button>
              </div>
              <div v-else class="dashboard-food-item" :data-food-id="item.id" :class="{ active: props.activeStepperId === `food-${item.id}`, dragging: view.draggedFoodId === item.id, 'drag-over': isSameGroupFoodTarget(item.id) }"
                @pointerdown="groupSort === 'chosen' && startPointerDrag($event, 'food', item.id)">
                <FoodQuantityStepper
                  :name="item.name"
                  :quantity="entryFor(item.id)?.qty || 0"
                  :kcal="entryFor(item.id)?.overrides ? entryFoodKcal(entryFor(item.id)) : foodKcal(item)"
                  :kcal-adjustment="entryFor(item.id)?.overrides ? entryFoodKcal(entryFor(item.id)) - foodKcal(item) : 0"
                  :adjusted="!!entryFor(item.id)?.overrides"
                  :adjustable="item.mode !== 'simple' && !!entryFor(item.id)"
                  :locked="locked"
                  :one-click-mode="store.oneClickMode"
                  editable
                  :open="props.activeStepperId === `food-${item.id}`"
                  @decrement="entryFor(item.id) && decrement(entryFor(item.id))"
                  @increment="!locked && addLogFood(view.logDate, group.id, item.id)"
                  @set-quantity="setFoodQuantity(item, $event)"
                  @edit="openModal(Modals.FOOD_EDITOR, { foodId: item.id })"
                  @adjust="openModal(Modals.ADJUST_FOOD, { entryId: entryFor(item.id).id })"
                  @toggle="(isOpen) => toggleStepper(`food-${item.id}`, isOpen)"
                />
              </div>
            </template>
          </TransitionGroup>
          <div v-if="!dashboardItems.length && !families.length" class="empty-group-state">
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

.dashboard-food-family {
  display: inline-flex;
}

.dashboard-food-family.dragging {
  opacity: 0.45;
}

.dashboard-food-family.drag-over {
  position: relative;
  z-index: 7;
}

.dashboard-food-family.drag-over .family-chip,
.dashboard-food-family.drag-over :deep(.food-stepper) {
  background: color-mix(in srgb, var(--green-soft) 70%, transparent);
  box-shadow: 0 0 10px color-mix(in srgb, var(--green) 28%, transparent);
  cursor: grabbing;
}

.family-selected-food {
  display: inline-flex;
  align-items: center;
}

.family-chip:disabled {
  cursor: default;
  opacity: 0.65;
}

.family-chip {
  display: inline-flex;
  min-height: 34px;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 5px;
  padding: 6px 9px;
  border: 1px solid transparent;
  border-radius: 8px;
  background: var(--chip-bg);
  color: var(--ink);
  font-size: 12px;
  text-align: left;
  transition: background 0.15s ease, border-color 0.15s ease;
}

.family-chip:hover,
.family-chip:focus-visible {
  border-color: color-mix(in srgb, var(--ink) 12%, transparent);
  background: var(--chip-bg-hover);
  outline: none;
}

.family-chip-name {
  font-size: inherit;
  font-weight: 400;
  line-height: 1.2;
}

.family-chip-meta {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  margin-top: 0;
  color: var(--ink-muted);
  font-size: 11px;
  line-height: 1;
}

.family-chip-variant-icon {
  width: 12px;
  height: 12px;
  flex: none;
}

@media (max-width: 600px) {
  .family-chip {
    min-height: 34px;
    padding: 6px 8px;
  }
}

.group-header-main {
  display: inline-flex;
  align-items: center;
  cursor: pointer;
}

.group-header-main.dashboard-draggable,
.dashboard-food-item {
  /* cursor: grab; */
  touch-action: pan-y;
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

.chip-group.food-move-over {
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

.group-sort-control {
  position: relative;
}

.group-sort-button {
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
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
}

.group-sort-button svg {
  width: 14px;
  height: 14px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.8;
  stroke-linecap: round;
}

.group-sort-button:hover,
.group-sort-button:focus-visible {
  background: var(--surface-alt);
  color: var(--green-strong);
  outline: none;
}

.group-sort-menu {
  position: absolute;
  top: calc(100% + 5px);
  right: 0;
  z-index: 20;
  display: grid;
  min-width: 150px;
  padding: 4px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--surface);
  box-shadow: 0 6px 18px rgba(var(--shadow-rgb), 0.18);
}

.group-sort-menu button {
  display: grid;
  grid-template-columns: 18px 1fr 14px;
  align-items: center;
  gap: 7px;
  min-height: 30px;
  padding: 5px 7px;
  border: 0;
  border-radius: 5px;
  background: transparent;
  color: var(--ink);
  font: inherit;
  font-size: 11px;
  text-align: left;
  cursor: pointer;
}

.group-sort-menu button:hover,
.group-sort-menu button:focus-visible {
  background: var(--surface-alt);
  color: var(--green-strong);
  outline: none;
}

.group-sort-menu svg {
  width: 15px;
  height: 15px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.7;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.group-sort-check {
  color: var(--green-strong);
  font-weight: 700;
  text-align: center;
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

.dashboard-locked :deep(.food-stepper),
.dashboard-locked :deep(.food-stepper-control:hover),
.dashboard-locked :deep(.food-stepper-label:hover) {
  background: var(--chip-bg);
}

.dashboard-locked :deep(.food-stepper.selected) {
  background: var(--green-soft);
}

.dashboard-locked .today-chip,
.dashboard-locked :deep(.food-stepper) {
  pointer-events: none;
  opacity: 0.65;
}

.dashboard-food-item {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.food-chip-transition {
  display: contents;
}

.food-chip-move {
  transition: transform 180ms cubic-bezier(0.2, 0.8, 0.2, 1);
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
