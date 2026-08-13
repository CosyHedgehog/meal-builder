<script setup>
import EntityManagerModal from './EntityManagerModal.vue'
import { Modals } from '../js/modals.js'
</script>

<template>
  <EntityManagerModal
    title="Snacks"
    subtitle="Keep your saved foods tidy. Use this panel to edit snacks."
    collection="snacks"
    :editor-modal="Modals.SNACK_EDITOR"
    editor-prop="snackId"
    new-label="New snack"
    search-placeholder="Search snacks…"
    empty-message="No snacks match that search."
    count-label="snacks"
  >
    <template #item="{ item }">
      <span>
        <strong>{{ item.name }}</strong>
        <small>{{ item.kcal }} kcal</small>
      </span>
    </template>
  </EntityManagerModal>
</template>