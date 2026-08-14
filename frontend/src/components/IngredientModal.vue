<script setup>
import EntityManagerModal from './EntityManagerModal.vue'
import { Modals } from '../js/modals.js'
</script>

<template>
  <EntityManagerModal
    title="Ingredients"
    subtitle="Keep your saved foods tidy. Use this panel to edit ingredients."
    collection="ingredients"
    :editor-modal="Modals.INGREDIENT_EDITOR"
    editor-prop="ingredientId"
    new-label="New ingredient"
    search-placeholder="Search ingredients…"
    empty-message="No ingredients match that search."
    count-label="ingredients"
    :secondary-action-modal="Modals.FOOD_MANAGER"
  >
    <template #item="{ item }">
      <span>
        <strong>{{ item.name }}</strong>
        <small>{{ item.kcal }} kcal {{ item.unit === 'g' ? '/ 100g' : '/ item' }}</small>
      </span>
    </template>
  </EntityManagerModal>
</template>