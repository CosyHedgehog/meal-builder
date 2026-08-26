<script setup>
import { ref } from 'vue'
import BaseModal from './BaseModal.vue'
import ToggleSwitch from './ToggleSwitch.vue'
import { state as store, createGroup, updateGroup, deleteGroup, toggleGroupVisibility, UNCATEGORIZED_GROUP_ID } from '../js/data.js'
import { confirmAction } from '../js/confirm.js'

const emit = defineEmits(['close'])
const newName = ref('')
const addError = ref('')
const groups = () => store.groups
function addGroup() {
  addError.value = ''
  if (newName.value.trim()) {
    if (!createGroup(newName.value)) {
      addError.value = 'A group with this name already exists.'
      return
    }
    newName.value = ''
  }
}
async function removeGroup(group) {
  const ok = await confirmAction({ title: 'Delete group', message: `Foods in "${group.name}" will become uncategorized and hidden. Continue?`, okLabel: 'Delete group' })
  if (ok) deleteGroup(group.id)
}
</script>

<template>
  <BaseModal title="Groups" subtitle="Organize foods into dashboard sections." panel-class="group-manager-modal"
    @close="emit('close')">
    <div class="group-manager-content">
      <div class="manager-list">
        <div v-for="item in groups()" :key="item.id" class="manager-item-row">
          <div class="manager-item-wrap" :class="{ 'is-protected': item.id === UNCATEGORIZED_GROUP_ID }">
            <div class="manager-item manager-item-editable">
              <input v-if="item.id !== UNCATEGORIZED_GROUP_ID" :value="item.name" aria-label="Group name"
                @change="updateGroup(item.id, $event.target.value)" />
              <span v-else class="protected-group-name">{{ item.name }} <small>Default group</small></span>
            </div>
            <ToggleSwitch :model-value="item.visible !== false"
              :label="`${item.visible !== false ? 'Hide' : 'Show'} ${item.name} on dashboard`"
              @update:model-value="(value) => value !== (item.visible !== false) && toggleGroupVisibility(item.id)" />
            <button v-if="item.id !== UNCATEGORIZED_GROUP_ID" class="manager-delete" type="button"
              aria-label="Delete group" @click="removeGroup(item)">×</button>
            <span v-else class="manager-protected" aria-hidden="true"></span>
          </div>
        </div>
      </div>
      <div class="group-manager-actions input-field">
        <label for="newGroupName">New group</label>
        <div class="inline-form">
          <input id="newGroupName" v-model="newName" placeholder="e.g. Post-workout" :aria-invalid="!!addError"
            aria-describedby="newGroupError" @input="addError = ''" @keyup.enter="addGroup" />
          <button class="btn btn-primary" type="button" @click="addGroup">Add</button>
        </div>
        <div v-if="addError" id="newGroupError" class="group-manager-error" role="alert">{{ addError }}</div>
      </div>
    </div>
  </BaseModal>
</template>

<style scoped>
:deep(.modal.group-manager-modal) {
  width: 420px;
}

.inline-form {
  display: flex;
  gap: 8px;
}

.inline-form input {
  flex: 1;
  min-width: 0;
}

.group-manager-content {
  display: flex;
  flex-direction: column;
  gap: 0;
  margin: 0 -26px -22px;
}

.group-manager-content>.manager-list {
  border-width: 1px 0;
  border-radius: 0;
  padding: 0 16px;
}

.group-manager-content :deep(.manager-item-row) {
  border-bottom: 0;
}

.group-manager-actions {
  margin: 0;
  padding: 14px 16px 16px;
  border-top: 0;
}

.manager-item-editable:hover input,
.manager-item-editable:focus-within input {
  color: var(--green-strong);
}

.manager-item-wrap.is-protected {
  opacity: 0.6;
}

.manager-delete {
  color: color-mix(in srgb, var(--ink-muted) 55%, transparent);
}

.manager-delete:hover,
.manager-delete:focus-visible {
  color: var(--red);
  background: transparent;
  border-color: transparent;
}

.manager-item input {
  width: 100%;
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
}

.group-manager-content :deep(.manager-item) {
  font-family: 'Inter', sans-serif;
  font-size: 14px;
  font-weight: 500;
}

.protected-group-name {
  display: flex;
  flex-direction: column;
  color: inherit;
  font: inherit;
}

.protected-group-name small {
  margin-top: 2px;
  color: var(--ink-muted);
  font-size: 11px;
}

.manager-protected {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  color: var(--ink-muted);
  font-size: 18px;
  cursor: help;
}

@media (max-width: 480px) {
  :deep(.modal.group-manager-modal) {
    display: flex;
    flex-direction: column;
  }

  .group-manager-content {
    margin: 0 -20px calc(-20px - env(safe-area-inset-bottom));
    flex: 1;
    min-height: 0;
  }

  .group-manager-content>.manager-list {
    flex: 1;
    min-height: 0;
    max-height: none;
    overflow-y: auto;
  }

  .group-manager-actions {
    flex: none;
    margin-top: auto;
  }
}
</style>
