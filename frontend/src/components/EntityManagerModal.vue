<script setup>
import { computed, ref } from 'vue'
import BaseModal from './BaseModal.vue'
import DraggableList from './DraggableList.vue'
import { state as store, reorderItems } from '../js/data.js'
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
const dragDisabled = computed(() => !!query.value.trim() || filteredItems.value.length < 2)

function openEditor(item = null) {
  openModal(props.editorModal, item ? { [props.editorProp]: item.id } : {})
}

function reorder(fromId, toId) {
  reorderItems(props.collection, fromId, toId)
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
      <button class="btn btn-primary btn-full" @click="openEditor()">＋ {{ newLabel }}</button>
      <input v-model="query" class="manager-search" type="search" :placeholder="searchPlaceholder" />

      <div v-if="query.trim()" class="manager-search-note">
        {{ filteredItems.length }} of {{ items.length }} {{ countLabel }} shown.
      </div>

      <DraggableList
        v-if="filteredItems.length"
        :items="filteredItems"
        :disabled="dragDisabled"
        @reorder="reorder"
      >
        <template #default="{ item }">
          <button class="manager-item" @click="openEditor(item)">
            <slot name="item" :item="item" />
            <span>›</span>
          </button>
        </template>
      </DraggableList>
      <div v-else class="empty-note">{{ emptyMessage }}</div>
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
  margin: 14px 0 12px;
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
</style>