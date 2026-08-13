<script setup>
import { computed, ref } from 'vue'
import SnackQuantityStepper from './SnackQuantityStepper.vue'
import { state as store, addLogFood, bumpLogEntry, logEntries, foodsInGroup, foodKcal } from '../js/data.js'
import { view } from '../js/ui.js'
import { Modals, openModal } from '../js/modals.js'

const props = defineProps({ group: { type: Object, required: true }, log: { type: Object, required: true } })
const showAll = ref(false)
const foods = computed(() => foodsInGroup(props.group.id))
const entries = computed(() => logEntries(props.log).filter((entry) => entry.groupId === props.group.id))
const visibleFoods = computed(() => showAll.value ? foods.value : foods.value.slice(0, 10))
const hasMore = computed(() => !showAll.value && visibleFoods.value.length < foods.value.length)

function entryFor(foodId) {
  return entries.value.find((entry) => entry.foodId === foodId)
}
function decrement(entry) {
  bumpLogEntry(view.logDate, entry.id, -1)
}
</script>

<template>
  <div class="today-chips">
    <div class="chip-group">
      <div class="chip-group-header">
        <span>
          <i class="group-header-swatch" :class="`group-${store.groups.findIndex((item) => item.id === group.id) % 5}`"></i>
          {{ group.name }}
        </span>
      </div>
      <div class="quick-picks-viewport">
        <div class="chip-list" :class="{ 'kcal-hidden': !store.showKcal }">
          <template v-for="food in visibleFoods" :key="food.id">
            <button v-if="!entryFor(food.id)" type="button" class="today-chip" :aria-label="`Add ${food.name}`" @click="addLogFood(view.logDate, group.id, food.id)">
              <span>＋ {{ food.name }}</span><span class="chip-kcal">{{ foodKcal(food).toLocaleString() }} kcal</span>
            </button>
            <SnackQuantityStepper v-else :name="food.name" :quantity="entryFor(food.id).qty" :kcal="foodKcal(food)" @decrement="decrement(entryFor(food.id))" @increment="addLogFood(view.logDate, group.id, food.id)" @edit="openModal(Modals.FOOD_EDITOR, { foodId: food.id })" />
          </template>
          <span v-if="!foods.length" class="empty-note">No foods in this group</span>
          <button type="button" class="today-chip chip-add" @click="openModal(Modals.FOOD_EDITOR, { groupId: group.id })">＋ Add {{ group.name.toLowerCase() }}</button>
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
</style>
