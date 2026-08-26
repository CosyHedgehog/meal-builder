<script setup>
import { computed, ref } from 'vue'
import FoodQuantityStepper from './FoodQuantityStepper.vue'
import { state as store, addLogFood, bumpLogEntry, setLogEntryQty, logEntries, foodsInGroup, foodKcal, entryFoodKcal } from '../js/data.js'
import { view, getCollapseState, setCollapseState } from '../js/ui.js'
import { Modals, openModal } from '../js/modals.js'

const props = defineProps({ group: { type: Object, required: true }, log: { type: Object, required: true }, locked: { type: Boolean, default: false }, activeStepperId: { type: String, default: null } })
const emit = defineEmits(['update:activeStepperId'])
const showAll = ref(false)
const collapsed = ref(getCollapseState(`group:${props.group.id}`))
const foods = computed(() => foodsInGroup(props.group.id))
const entries = computed(() => logEntries(props.log).filter((entry) => entry.groupId === props.group.id))
const displayFoods = computed(() => foods.value)
const visibleFoods = computed(() => showAll.value ? displayFoods.value : displayFoods.value.slice(0, 10))
const hasMore = computed(() => !showAll.value && visibleFoods.value.length < displayFoods.value.length)

function entryFor(foodId) {
  return entries.value.find((entry) => entry.foodId === foodId)
}
function setFoodQuantity(food, quantity) {
  if (props.locked || !Number.isFinite(quantity) || quantity <= 0) return
  const entry = entryFor(food.id)
  if (entry) setLogEntryQty(view.logDate, entry.id, quantity)
  else addLogFood(view.logDate, props.group.id, food.id, quantity)
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
</script>

<template>
  <div class="today-chips">
    <div class="chip-group" :class="{ 'dashboard-locked': locked }">
      <div
        class="chip-group-header"
      >
        <span class="group-header-main">
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
            @click.stop="openModal(Modals.FOOD_EDITOR, { groupId: group.id })"
          >+</button>
        </span>
      </div>
      <div v-if="!collapsed" class="quick-picks-viewport">
        <div class="chip-list" :class="{ 'kcal-hidden': !store.showKcal }">
          <div v-for="entry in entries.filter((item) => !item.foodId)" :key="entry.id" class="dashboard-food-item">
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
            <div class="dashboard-food-item">
              <FoodQuantityStepper
                :name="food.name"
                :quantity="entryFor(food.id)?.qty || 0"
                :kcal="entryFor(food.id)?.overrides ? entryFoodKcal(entryFor(food.id)) : foodKcal(food)"
                :adjusted="!!entryFor(food.id)?.overrides"
                :adjustable="food.mode !== 'simple' && !!entryFor(food.id)"
                :locked="locked"
                :one-click-mode="store.oneClickMode"
                :open="props.activeStepperId === `food-${food.id}`"
                @decrement="entryFor(food.id) && decrement(entryFor(food.id))"
                @increment="!locked && addLogFood(view.logDate, group.id, food.id)"
                @set-quantity="setFoodQuantity(food, $event)"
                @adjust="openModal(Modals.ADJUST_FOOD, { entryId: entryFor(food.id).id })"
                @toggle="(isOpen) => toggleStepper(`food-${food.id}`, isOpen)"
              />
            </div>
          </template>
          <div v-if="!foods.length" class="empty-group-state">
            <span class="empty-note">No foods in this group yet</span>
            <button v-if="!locked" type="button" class="today-chip chip-add"
              @click="openModal(Modals.CUSTOM_ENTRY, { groupId: group.id })">
              + Add custom
            </button>
          </div>
          <button v-else-if="!locked" type="button" class="today-chip chip-add"
            @click="openModal(Modals.CUSTOM_ENTRY, { groupId: group.id })">
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
  width: 22px;
  height: 22px;
  padding: 0;
  border: 0;
  border-radius: 5px;
  background: transparent;
  color: var(--ink-muted);
  font-size: 18px;
  font-weight: 400;
  line-height: 1;
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
}

.group-add-food-button:hover,
.group-add-food-button:focus-visible {
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
