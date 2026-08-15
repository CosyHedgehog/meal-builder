<script setup>
import { computed, ref } from 'vue'
import BaseModal from './BaseModal.vue'
import { state as store } from '../js/data.js'
import { openModal } from '../js/modals.js'

const props = defineProps({
  excludedIds: { type: Array, default: () => [] },
  selectedId: { type: String, default: '' },
  onSelect: { type: Function, required: true },
})
const emit = defineEmits(['close'])

const query = ref('')
const excluded = computed(() => new Set(props.excludedIds))
const ingredients = computed(() => store.ingredients)

const results = computed(() => {
  const normalized = query.value.trim().toLowerCase()
  return ingredients.value.filter((ingredient) => {
    if (excluded.value.has(ingredient.id)) return false
    return !normalized || ingredient.name.toLowerCase().includes(normalized)
  })
})

function choose(ingredient) {
  props.onSelect(ingredient.id)
  emit('close')
}
</script>

<template>
  <BaseModal title="Choose ingredient" subtitle="Search your ingredients and select one to add to this food." panel-class="ingredient-picker-modal" @close="emit('close')">
    <div class="ingredient-picker-content">
      <input v-model="query" class="ingredient-picker-search" type="search" placeholder="Search ingredients..." autofocus />
      <div class="ingredient-picker-count">
        {{ results.length }} available of {{ ingredients.length }} ingredient{{ ingredients.length === 1 ? '' : 's' }}
      </div>
      <div v-if="results.length" class="ingredient-picker-list">
        <button
          v-for="ingredient in results"
          :key="ingredient.id"
          type="button"
          class="ingredient-picker-option"
          :class="{ selected: ingredient.id === selectedId }"
          @click="choose(ingredient)"
        >
          <span>
            <strong>{{ ingredient.name }}</strong>
            <small>{{ ingredient.kcal }} kcal {{ ingredient.unit === 'g' ? '/ 100g' : '/ item' }}</small>
          </span>
          <span aria-hidden="true">›</span>
        </button>
      </div>
      <div v-else class="empty-note">No matching ingredients.</div>
      <button class="link-btn create-ingredient-link" type="button" @click="openModal('ingredient-editor')">
        <span aria-hidden="true">＋</span> Create ingredient
      </button>
    </div>
  </BaseModal>
</template>

<style scoped>
.ingredient-picker-modal {
  width: 620px;
}

.ingredient-picker-content {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.ingredient-picker-search {
  width: 100%;
  min-height: 42px;
  padding: 10px 12px;
  border: 1px solid var(--line);
  border-radius: 10px;
  background: var(--bg);
  color: var(--ink);
  font-size: 14px;
}

.ingredient-picker-search:focus {
  outline: 2px solid var(--green);
  outline-offset: 1px;
}

.ingredient-picker-count {
  color: var(--ink-muted);
  font-size: 12px;
}

.create-ingredient-link {
  align-self: flex-start;
  margin: 2px 0 0;
  padding: 0;
  font-size: 11px;
}

.ingredient-picker-list {
  display: flex;
  flex-direction: column;
  max-height: 52vh;
  overflow-y: auto;
  border: 1px solid var(--line);
  border-radius: 12px;
}

@media (max-width: 480px) {
  .ingredient-picker-list {
    max-height: 62dvh;
  }
}

.ingredient-picker-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  padding: 11px 13px;
  border: 0;
  border-bottom: 1px solid var(--line);
  background: var(--surface);
  color: var(--ink);
  text-align: left;
}

.ingredient-picker-option:last-child {
  border-bottom: 0;
}

.ingredient-picker-option:hover,
.ingredient-picker-option.selected {
  background: var(--surface-alt);
  color: var(--green-strong);
}

.ingredient-picker-option strong,
.ingredient-picker-option small {
  display: block;
}

.ingredient-picker-option small {
  margin-top: 2px;
  color: var(--ink-muted);
  font-size: 11px;
}
</style>
