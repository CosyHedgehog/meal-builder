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
    panel-class="entity-manager-modal"
    :back-label="backLabel"
    @close="emit('close')"
    @back="secondaryActionModal && replaceModal(secondaryActionModal)"
  >
    <div class="manager-group entity-manager-content">
      <div class="entity-manager-header">
        <input v-model="query" class="manager-search" type="search" :placeholder="searchPlaceholder" />
        <div class="manager-list-meta">
          <div class="manager-count">{{ filteredItems.length }} {{ countLabel }}</div>
          <div v-if="query.trim()" class="manager-search-note">
            {{ filteredItems.length }} of {{ items.length }} {{ countLabel }} shown.
          </div>
        </div>
      </div>

      <div v-if="filteredItems.length" class="manager-list">
        <div v-for="item in filteredItems" :key="item.id" class="manager-item-row">
          <div class="manager-item-wrap">
            <button class="manager-item" type="button" @click="openEditor(item)">
              <slot name="item" :item="item" />
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
  min-height: 42px;
  padding: 10px 12px;
  border: 1px solid var(--line);
  border-radius: 12px;
  background-color: var(--surface-alt);
  color: var(--ink);
  font-size: 14px;
  margin: 0;
}

.entity-manager-content {
  display: flex;
  min-height: 0;
  flex-direction: column;
  gap: 0;
}

.entity-manager-header {
  flex: none;
  margin: 0 -26px;
  padding: 0 26px 10px;
  border-bottom: 1px solid var(--line);
}

.manager-search:focus {
  outline: 2px solid var(--green);
  outline-offset: 1px;
}

.manager-search-note {
  font-size: 11px;
  color: var(--ink-muted);
}

.manager-list-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-top: 9px;
}

.manager-count {
  color: var(--ink-muted);
  font-size: 12px;
}

.food-manager-actions {
  flex: none;
  margin: 12px -26px -22px;
  padding: 14px 26px 22px;
  border-top: 1px solid var(--line);
}

.food-manager-actions .btn-full {
  margin-top: 0;
}

.entity-manager-content > .manager-list {
  flex: 1;
  min-height: 0;
  max-height: 52vh;
  margin: 0 -26px;
  padding: 0 26px;
  border: 0;
  border-radius: 0;
  background: transparent;
}

.entity-manager-content :deep(.manager-item-row) {
  border-bottom: 0;
}

.entity-manager-content :deep(.manager-item) {
  min-height: 50px;
  padding: 8px;
  border-radius: 10px;
}

.entity-manager-content :deep(.manager-item strong) {
  font-size: 12px;
  font-weight: 600;
}

.entity-manager-content :deep(.manager-item small) {
  margin-top: 3px;
  font-size: 12px;
}

@media (max-width: 480px) {
  :deep(.modal.entity-manager-modal) {
    display: flex;
    flex-direction: column;
  }

  .entity-manager-content {
    flex: 1;
  }

  .entity-manager-content > .manager-list {
    max-height: none;
    overflow-y: auto;
  }

  .food-manager-actions {
    margin-right: -20px;
    margin-left: -20px;
    padding-right: 20px;
    padding-left: 20px;
  }

  .entity-manager-header {
    margin-right: -20px;
    margin-left: -20px;
    padding-right: 20px;
    padding-left: 20px;
  }

  .entity-manager-content > .manager-list {
    margin-right: -20px;
    margin-left: -20px;
    padding-right: 20px;
    padding-left: 20px;
  }
}
</style>