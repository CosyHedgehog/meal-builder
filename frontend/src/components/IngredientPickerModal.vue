<script setup>
import { computed, nextTick, ref } from 'vue'
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
const searchInput = ref(null)
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

async function focusSearch() {
  await nextTick()
  searchInput.value?.focus()
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
        ref="searchInput"
        v-model="query"
        class="ingredient-picker-modal-search"
        type="search"
        placeholder="Search ingredients..."
        aria-label="Search ingredients"
        autofocus
        @vue:mounted="focusSearch"
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
        <button class="link-btn" type="button" @click="openModal(Modals.INGREDIENT_MANAGER)">
          Manage ingredients <span aria-hidden="true">›</span>
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
  text-align: right;
}

.ingredient-picker-modal-actions .link-btn {
  margin: 0;
  padding: 0;
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
