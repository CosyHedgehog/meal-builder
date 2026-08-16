<script setup>
import { computed, ref } from 'vue'
import BaseModal from './BaseModal.vue'
import { state as store, deleteIngredient, ingredientUsage } from '../js/data.js'
import { confirmAction } from '../js/confirm.js'
import { openModal, replaceModal } from '../js/modals.js'

const props = defineProps({
  title: { type: String, required: true },
  subtitle: { type: String, required: true },
  collection: { type: String, required: true },
  editorModal: { type: String, required: true },
  editorProp: { type: String, required: true },
  newLabel: { type: String, required: true },
  searchPlaceholder: { type: String, required: true },
  emptyMessage: { type: String, required: true },
  countLabel: { type: String, required: true },
  secondaryActionLabel: { type: String, default: '' },
  secondaryActionModal: { type: String, default: '' },
  backLabel: { type: String, default: '' },
})

const emit = defineEmits(['close'])
const query = ref('')

const items = computed(() => store[props.collection] || [])
const filteredItems = computed(() => {
  const normalized = query.value.trim().toLowerCase()
  return normalized
    ? items.value.filter((item) => item.name.toLowerCase().includes(normalized))
    : items.value
})
function openEditor(item = null) {
  openModal(props.editorModal, item ? { [props.editorProp]: item.id } : {})
}

async function deleteItem(item) {
  if (props.collection === 'ingredients') {
    const usedIn = ingredientUsage(item.id)
    const message = usedIn.length
      ? `"${item.name}" is used in ${usedIn.length} saved food${usedIn.length === 1 ? '' : 's'}: ${usedIn
        .map((food) => food.name)
        .join(', ')}. Deleting it will remove it from those foods, reduce their calories, and change any logged history that uses them. Continue?`
      : `Delete "${item.name}"?`
    const ok = await confirmAction({
      title: 'Delete ingredient',
      message,
      okLabel: 'Delete ingredient',
    })
    if (!ok) return
    deleteIngredient(item.id)
  }
}
</script>

<template>
  <BaseModal
    :title="title"
    :subtitle="subtitle"
    :back-label="backLabel"
    @close="emit('close')"
    @back="secondaryActionModal && replaceModal(secondaryActionModal)"
  >
    <div class="manager-group">
      <div class="manager-browse-label">Browse {{ countLabel }}</div>
      <input v-model="query" class="manager-search" type="search" :placeholder="searchPlaceholder" />

      <div class="manager-count">{{ filteredItems.length }} {{ countLabel }}</div>
      <div v-if="query.trim()" class="manager-search-note">
        {{ filteredItems.length }} of {{ items.length }} {{ countLabel }} shown.
      </div>

      <div v-if="filteredItems.length" class="manager-list">
        <div v-for="item in filteredItems" :key="item.id" class="manager-item-row">
          <div class="manager-item-wrap">
            <button class="manager-item" type="button" @click="openEditor(item)">
              <slot name="item" :item="item" />
              <span>›</span>
            </button>
            <button
              class="manager-delete"
              type="button"
              :aria-label="`Delete ${item.name}`"
              :title="props.collection === 'ingredients' && ingredientUsage(item.id).length ? 'Remove this ingredient from its foods before deleting it' : `Delete ${item.name}`"
              @click.stop="deleteItem(item)"
            >×</button>
          </div>
        </div>
      </div>
      <div v-else class="empty-note">{{ emptyMessage }}</div>
      <div class="food-manager-actions">
        <button class="btn btn-primary btn-full" @click="openEditor()">＋ {{ newLabel }}</button>
      </div>
    </div>
  </BaseModal>
</template>

<style scoped>
.manager-search {
  width: 100%;
  padding: 9px 12px;
  border: 1px solid var(--line);
  border-radius: 10px;
  background: var(--bg);
  color: var(--ink);
  font-size: 13px;
  margin: 5px 0 5px;
}

.manager-browse-label {
  margin-top: 18px;
  color: var(--ink-muted);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.manager-count {
  margin: 8px 0 6px;
  color: var(--ink-muted);
  font-size: 12px;
}

.manager-search:focus {
  outline: 2px solid var(--green);
  outline-offset: 1px;
}

.manager-search-note {
  font-size: 11px;
  color: var(--ink-muted);
  margin: -6px 0 10px;
}

.food-manager-actions {
  padding-top: 14px;
}
</style>