<script setup>
import EntityManagerModal from './EntityManagerModal.vue'
import { mealKcal } from '../js/data.js'
import { Modals } from '../js/modals.js'
</script>

<template>
  <EntityManagerModal
    title="Meals"
    subtitle="Keep your saved foods tidy. Use this panel to edit meals."
    collection="meals"
    :editor-modal="Modals.MEAL_EDITOR"
    editor-prop="mealId"
    new-label="New meal"
    search-placeholder="Search meals…"
    empty-message="No meals match that search."
    count-label="meals"
    :secondary-action-modal="Modals.INGREDIENT_MANAGER"
    back-label="Ingredients"
  >
    <template #item="{ item }">
      <span>
        <strong>{{ item.name }}</strong>
        <small>
          {{ mealKcal(item).toLocaleString() }} kcal · {{ item.items.length }}
          ingredient{{ item.items.length === 1 ? '' : 's' }}
        </small>
      </span>
    </template>
  </EntityManagerModal>
</template>