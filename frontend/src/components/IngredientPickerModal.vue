<script setup>
import { computed, ref } from 'vue'
import BaseModal from './BaseModal.vue'
import { state as store } from '../js/data.js'
import { Modals, openModal } from '../js/modals.js'

const props = defineProps({
  excludedIds: { type: Array, default: () => [] },
  initialQuery: { type: String, default: '' },
  onSelect: { type: Function, required: true },
})
const emit = defineEmits(['close'])

const query = ref(props.initialQuery)
const excludedIds = computed(() => new Set(props.excludedIds))
const filteredIngredients = computed(() => {
  const normalized = query.value.trim().toLowerCase()
  return store.ingredients.filter((ingredient) => (
    !excludedIds.value.has(ingredient.id)
    && (!normalized || ingredient.name.toLowerCase().includes(normalized))
  ))
})

function selectIngredient(ingredientId) {
  props.onSelect(ingredientId)
  emit('close')
}

</script>

<template>
  <BaseModal
    title="Add an ingredient"
    subtitle="Search and choose an ingredient for this food."
    panel-class="ingredient-picker-modal"
    @close="emit('close')"
  >
    <div class="ingredient-picker-modal-content">
      <input
        v-model="query"
        class="ingredient-picker-modal-search"
        type="search"
        placeholder="Search ingredients..."
        aria-label="Search ingredients"
      />
      <div class="ingredient-picker-modal-list" role="listbox" aria-label="Ingredients">
        <button
          v-for="ingredient in filteredIngredients"
          :key="ingredient.id"
          type="button"
          class="ingredient-picker-modal-option"
          role="option"
          @click="selectIngredient(ingredient.id)"
        >
          <span>{{ ingredient.name }}</span>
          <small>{{ ingredient.kcal }} kcal {{ ingredient.unit === 'g' ? '/ 100g' : '/ item' }}</small>
        </button>
        <div v-if="!filteredIngredients.length" class="ingredient-picker-modal-empty">
          <strong>No matching ingredients</strong>
          <span>Add an ingredient from Manage ingredients first.</span>
        </div>
      </div>
      <div class="ingredient-picker-modal-actions">
        <button class="btn btn-secondary btn-full manage-ingredients-button" type="button"
          @click="openModal(Modals.INGREDIENT_MANAGER)">
          <svg class="manage-ingredients-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"
            stroke-linecap="round" aria-hidden="true">
            <path d="M4 7h16M4 17h16" />
            <circle cx="9" cy="7" r="2" />
            <circle cx="15" cy="17" r="2" />
          </svg>
          Manage ingredients
        </button>
      </div>
    </div>
  </BaseModal>
</template>

<style scoped>
.ingredient-picker-modal-actions {
  flex: none;
  margin: 12px -26px 0;
  padding: 12px 26px 0;
  border-top: 1px solid var(--line);
  text-align: center;
}

.manage-ingredients-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  margin: 0;
  font-weight: 400;
}

.manage-ingredients-icon {
  width: 15px;
  height: 15px;
}

@media (max-width: 480px) {
  .ingredient-picker-modal-actions {
    margin-right: -20px;
    margin-left: -20px;
    padding-right: 20px;
    padding-left: 20px;
  }
}
</style>
