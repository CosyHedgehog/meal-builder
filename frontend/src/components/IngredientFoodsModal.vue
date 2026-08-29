<script setup>
import { computed } from 'vue'
import BaseModal from './BaseModal.vue'
import { state as store, getIngredient, foodKcal, itemKcal } from '../js/data.js'
import { openModal, Modals } from '../js/modals.js'

const props = defineProps({
  ingredientId: { type: String, required: true },
})
const emit = defineEmits(['close'])

const ingredient = computed(() => getIngredient(props.ingredientId))

const foodsUsingIngredient = computed(() => {
  if (!props.ingredientId) return []
  return store.foods
    .filter((food) => (food.items || []).some((item) => item.ingredientId === props.ingredientId))
    .map((food) => {
      const item = food.items.find((it) => it.ingredientId === props.ingredientId)
      return {
        food,
        amount: item?.amount || 0,
        ingredientKcal: item ? Math.round(itemKcal(item)) : 0,
        totalKcal: Math.round(foodKcal(food)),
      }
    })
})

function openFood(food) {
  openModal(Modals.FOOD_EDITOR, { foodId: food.id })
}
</script>

<template>
  <BaseModal
    :title="ingredient?.name || 'Ingredient foods'"
    :subtitle="`Used in ${foodsUsingIngredient.length} saved food${foodsUsingIngredient.length === 1 ? '' : 's'}.`"
    panel-class="ingredient-foods-modal"
    @close="emit('close')"
  >
    <div class="ingredient-foods-content">
      <div v-if="foodsUsingIngredient.length" class="manager-list">
        <div v-for="entry in foodsUsingIngredient" :key="entry.food.id" class="manager-item-row">
          <div class="manager-item-wrap">
            <button class="manager-item" type="button" @click="openFood(entry.food)">
              <div class="food-entry-body">
                <strong class="food-entry-title">
                  <span>{{ entry.food.name }}</span>
                  <span class="food-total-chip">{{ entry.totalKcal.toLocaleString() }} kcal</span>
                </strong>
                <small class="food-entry-portion">
                  {{ entry.amount }}{{ ingredient?.unit === 'g' ? 'g' : (entry.amount === 1 ? ' item' : ' items') }}
                  ({{ entry.ingredientKcal.toLocaleString() }} kcal)
                  &bull; Click to edit food
                </small>
              </div>
              <svg class="chevron-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
          </div>
        </div>
      </div>
      <div v-else class="empty-note">
        This ingredient is not currently used in any saved foods.
      </div>
    </div>
  </BaseModal>
</template>

<style scoped>
:deep(.modal.ingredient-foods-modal) {
  width: 440px;
}

.ingredient-foods-content {
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.manager-list {
  flex: 1;
  min-height: 0;
  max-height: 52vh;
  margin: 0 -26px;
  padding: 0 26px;
  overflow-y: auto;
  border: 0;
  border-radius: 0;
  background: transparent;
}

.manager-item-row {
  min-height: 54px;
  padding: 3px 0;
}

.manager-item-row + .manager-item-row {
  margin-top: 2px;
}

.manager-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--line);
  border-radius: 10px;
  background: var(--surface);
  color: var(--ink);
  text-align: left;
  cursor: pointer;
  transition: background 0.15s ease, border-color 0.15s ease;
}

.manager-item:hover,
.manager-item:focus-visible {
  background: var(--surface-alt);
  border-color: var(--green-light);
  color: var(--ink);
  outline: none;
}

.food-entry-body {
  display: flex;
  flex-direction: column;
  min-width: 0;
  flex: 1;
}

.food-entry-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  font-size: 13px;
  font-weight: 600;
}

.food-entry-title > span:first-child {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.food-total-chip {
  flex: none;
  font-family: 'IBM Plex Mono', monospace;
  font-size: 11px;
  font-weight: 600;
  color: var(--green-strong);
}

.food-entry-portion {
  margin-top: 3px;
  color: var(--ink-muted);
  font-size: 11px;
}

.chevron-icon {
  width: 16px;
  height: 16px;
  color: var(--ink-muted);
  flex: none;
  opacity: 0.6;
}

.manager-item:hover .chevron-icon {
  color: var(--green-strong);
  opacity: 1;
}

.empty-note {
  padding: 24px 0;
  color: var(--ink-muted);
  text-align: center;
  font-size: 13px;
}

@media (max-width: 480px) {
  :deep(.modal.ingredient-foods-modal) {
    display: flex;
    flex-direction: column;
  }

  .ingredient-foods-content {
    flex: 1;
  }

  .manager-list {
    margin-right: -20px;
    margin-left: -20px;
    padding-right: 20px;
    padding-left: 20px;
  }
}
</style>