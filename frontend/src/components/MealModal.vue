<script setup>
import EntityManagerModal from './EntityManagerModal.vue'
import { foodKcal } from '../js/data.js'
import { Modals } from '../js/modals.js'
</script>

<template>
  <EntityManagerModal
    title="Meals"
    subtitle="Keep your saved foods tidy. Use this panel to edit meals."
    collection="foods"
    :editor-modal="Modals.FOOD_EDITOR"
    editor-prop="foodId"
    new-label="New food"
    search-placeholder="Search foods…"
    empty-message="No foods match that search."
    count-label="foods"
    :secondary-action-modal="Modals.INGREDIENT_MANAGER"
    back-label="Ingredients"
  >
    <template #item="{ item }">
      <span>
        <strong>{{ item.name }}</strong>
        <small>
          {{ foodKcal(item).toLocaleString() }} kcal · {{ item.items.length }}
          ingredient{{ item.items.length === 1 ? '' : 's' }}
        </small>
      </span>
    </template>
  </EntityManagerModal>
</template>