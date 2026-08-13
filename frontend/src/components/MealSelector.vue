<script setup>
import { computed, ref } from 'vue'
import ChipGroupMenu from './ChipGroupMenu.vue'
import { state as store, mealKcal, setLogMeal, setLogMode } from '../js/data.js'
import { view } from '../js/ui.js'
import { Modals, openModal } from '../js/modals.js'

const props = defineProps({ log: { type: Object, required: true } })

const isSelected = (id) => props.log.mode === 'meal' && props.log.mealId === id

function toggleMeal(id) {
  if (isSelected(id)) {
    setLogMeal(view.logDate, '')
    return
  }
  setLogMode(view.logDate, 'meal')
  setLogMeal(view.logDate, id)
}

const customKcal = computed(() => Math.round(props.log.manualMealKcal || 0))
const showAllMeals = ref(false)
const visibleMeals = computed(() => {
  if (showAllMeals.value) return store.meals
  const selectedIndex = store.meals.findIndex((meal) => isSelected(meal.id))
  const end = Math.max(10, selectedIndex + 1)
  return store.meals.slice(0, end)
})
const hasMoreMeals = computed(() => !showAllMeals.value && visibleMeals.value.length < store.meals.length)
</script>

<template>
  <div class="today-chips">
    <div class="chip-group">
      <div class="chip-group-header">
        <span>Meal for today</span>
        <ChipGroupMenu label="Meal options">
          <button type="button" @click="openModal(Modals.MEAL_MANAGER)">
            ✎ Edit meals
          </button>
          <button type="button" @click="openModal(Modals.MEAL_EDITOR)">+ Add meal</button>
        </ChipGroupMenu>
      </div>

      <div class="quick-picks-viewport">
        <div class="chip-list meal-quick-picks" :class="{ 'kcal-hidden': !store.showKcal }">
        <template v-if="store.meals.length">
          <button
            v-for="meal in visibleMeals"
            :key="meal.id"
            type="button"
            class="today-chip"
            :class="{ active: isSelected(meal.id) }"
            @click="toggleMeal(meal.id)"
          >
            <span>{{ meal.name }}</span>
            <span class="chip-kcal">{{ mealKcal(meal).toLocaleString() }} kcal</span>
          </button>
        </template>
        <span v-else class="empty-note">No meals yet</span>

        <button
          v-if="log.mode === 'custom'"
          type="button"
          class="today-chip active one-off"
          @click="openModal('custom-meal')"
        >
          <span>
            {{ log.manualMealName || 'Custom' }}<span class="one-off-badge">1-off</span>
          </span>
          <span class="chip-kcal">· {{ customKcal.toLocaleString() }} kcal</span>
        </button>
        <button v-else type="button" class="today-chip chip-add" @click="openModal('custom-meal')">
          ＋ Custom meal
        </button>
        <button
          v-if="hasMoreMeals"
          type="button"
          class="chip-more"
          @click="showAllMeals = true"
        >
          More…
        </button>
        </div>
      </div>
    </div>
  </div>
</template>