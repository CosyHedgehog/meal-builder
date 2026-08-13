<script setup>
import { ref } from 'vue'
import BaseModal from './BaseModal.vue'
import DraggableList from './DraggableList.vue'
import { state as store, createGroup, updateGroup, deleteGroup, reorderItems, UNCATEGORIZED_GROUP_ID } from '../js/data.js'
import { confirmAction } from '../js/confirm.js'

const emit = defineEmits(['close'])
const newName = ref('')
const groups = () => store.groups.filter((group) => group.id !== UNCATEGORIZED_GROUP_ID)
function addGroup() {
  if (newName.value.trim()) {
    createGroup(newName.value)
    newName.value = ''
  }
}
async function removeGroup(group) {
  const ok = await confirmAction({ title: 'Delete group', message: `Foods in "${group.name}" will become uncategorized and hidden. Continue?`, okLabel: 'Delete group' })
  if (ok) deleteGroup(group.id)
}
</script>

<template>
  <BaseModal title="Groups" subtitle="Organize foods into dashboard sections." @close="emit('close')">
    <div class="input-field">
      <label for="newGroupName">New group</label>
      <div class="inline-form">
        <input id="newGroupName" v-model="newName" placeholder="e.g. Post-workout" @keyup.enter="addGroup" />
        <button class="btn btn-primary" type="button" @click="addGroup">Add</button>
      </div>
    </div>
    <DraggableList :items="groups()" @reorder="(fromId, toId) => reorderItems('groups', fromId, toId)">
      <template #default="{ item }">
        <div class="manager-item-wrap">
          <div class="manager-item">
            <input :value="item.name" aria-label="Group name" @change="updateGroup(item.id, $event.target.value)" />
          </div>
          <button class="manager-delete" type="button" aria-label="Delete group" @click="removeGroup(item)">×</button>
        </div>
      </template>
    </DraggableList>
  </BaseModal>
</template>

<style scoped>
.inline-form { display: flex; gap: 8px; }
.inline-form input { flex: 1; min-width: 0; }
.manager-item input { width: 100%; border: 0; background: transparent; color: var(--ink); font: inherit; }
</style>
