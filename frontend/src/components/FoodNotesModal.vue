<script setup>
import { ref } from 'vue'
import BaseModal from './BaseModal.vue'
import { state as store, updateFoodNote } from '../js/data.js'

const props = defineProps({
  foodId: { type: String, required: true },
})
const emit = defineEmits(['close'])

const food = store.foods.find((item) => item.id === props.foodId)
const note = ref(food?.note || '')

function saveNote() {
  updateFoodNote(props.foodId, note.value)
  emit('close')
}
</script>

<template>
  <BaseModal
    :title="`Notes for ${food?.name || 'food'}`"
    subtitle="Keep recipe details and serving reminders with this food."
    panel-class="food-notes-modal"
    @close="emit('close')"
  >
    <div class="food-notes-content">
      <label class="input-field">
        <textarea
          v-model="note"
          rows="7"
          maxlength="1000"
          placeholder="Recipe details, serving suggestions, or reminders…"
        ></textarea>
        <small class="food-notes-count">{{ note.length }}/1000</small>
      </label>
      <button class="btn btn-primary primary-wide" type="button" @click="saveNote">Save notes</button>
    </div>
  </BaseModal>
</template>

<style scoped>
.food-notes-content {
  display: flex;
  flex: 1;
  min-height: 0;
  flex-direction: column;
  gap: 12px;
}

:deep(.modal.food-notes-modal) {
  display: flex;
  flex-direction: column;
  height: min(450px, calc(100dvh - 32px));
  overflow: hidden;
}

.food-notes-content .input-field {
  display: flex;
  flex: 1;
  min-height: 0;
  flex-direction: column;
  margin-bottom: 0;
}

.food-notes-content textarea {
  width: 100%;
  flex: 1;
  min-height: 0;
  padding: 10px 12px;
  border: 1px solid var(--line);
  border-radius: 9px;
  background: var(--bg);
  font-size: 14px;
  resize: none;
}

.food-notes-content textarea:focus {
  outline: 2px solid var(--green);
  outline-offset: 1px;
}

.food-notes-count {
  display: block;
  margin-top: 5px;
  color: var(--ink-muted);
  font-size: 11px;
  text-align: right;
}

.food-notes-content > .btn {
  flex: none;
  margin-top: auto;
}

@media (max-width: 480px) {
  :deep(.modal.food-notes-modal) {
    height: 100dvh;
    max-height: 100dvh;
  }
}
</style>
