<script setup>
import { computed, nextTick, ref } from 'vue'
import BaseModal from './BaseModal.vue'
import { state as store } from '../js/data.js'

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
    </div>
  </BaseModal>
</template>
