<script setup>
import { onMounted, onUnmounted, ref } from 'vue'
import BaseModal from './BaseModal.vue'
import { state as store, createGroup, updateGroup, deleteGroup, toggleGroupVisibility, reorderGroups, UNCATEGORIZED_GROUP_ID } from '../js/data.js'
import { confirmAction } from '../js/confirm.js'

const emit = defineEmits(['close'])
const newName = ref('')
const addError = ref('')
const draggedGroupId = ref(null)
const draggedOverGroupId = ref(null)
const groupDrag = { id: null, pointerId: null, active: false, startX: 0, startY: 0 }
const groups = () => store.groups

function startGroupDrag(event, groupId) {
  if (event.button !== 0) return
  event.preventDefault()
  event.currentTarget?.setPointerCapture?.(event.pointerId)
  groupDrag.id = groupId
  groupDrag.pointerId = event.pointerId
  groupDrag.active = false
  groupDrag.startX = event.clientX
  groupDrag.startY = event.clientY
}

function handleGroupPointerMove(event) {
  if (event.pointerId !== groupDrag.pointerId || !groupDrag.id) return
  const distance = Math.hypot(event.clientX - groupDrag.startX, event.clientY - groupDrag.startY)
  if (!groupDrag.active && distance < 6) return
  if (!groupDrag.active) {
    groupDrag.active = true
    draggedGroupId.value = groupDrag.id
  }
  event.preventDefault()
  draggedOverGroupId.value = document.elementFromPoint(event.clientX, event.clientY)
    ?.closest('.manager-item-row')?.dataset.groupId || ''
}

function finishGroupDrag(event) {
  if (event.pointerId !== groupDrag.pointerId) return
  if (groupDrag.active && draggedOverGroupId.value && draggedOverGroupId.value !== groupDrag.id) {
    reorderGroups(groupDrag.id, draggedOverGroupId.value)
  }
  cancelGroupDrag()
}

function cancelGroupDrag() {
  groupDrag.id = null
  groupDrag.pointerId = null
  groupDrag.active = false
  draggedGroupId.value = null
  draggedOverGroupId.value = null
}
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

onMounted(() => {
  document.addEventListener('pointermove', handleGroupPointerMove, { passive: false })
  document.addEventListener('pointerup', finishGroupDrag)
  document.addEventListener('pointercancel', cancelGroupDrag)
})

onUnmounted(() => {
  document.removeEventListener('pointermove', handleGroupPointerMove)
  document.removeEventListener('pointerup', finishGroupDrag)
  document.removeEventListener('pointercancel', cancelGroupDrag)
})
</script>

<template>
  <BaseModal title="Groups" subtitle="Organize foods into dashboard sections." panel-class="group-manager-modal"
    @close="emit('close')">
    <div class="group-manager-content">
      <div class="manager-list">
        <div v-for="item in groups()" :key="item.id" class="manager-item-row" :data-group-id="item.id"
          :class="{ dragging: draggedGroupId === item.id, 'drag-over': draggedOverGroupId === item.id && draggedGroupId !== item.id }">
          <div class="manager-item-wrap" :class="{ 'is-protected': item.id === UNCATEGORIZED_GROUP_ID }">
            <button type="button" class="manager-drag" :aria-label="`Reorder ${item.name}`" title="Drag to reorder"
              @pointerdown="startGroupDrag($event, item.id)" @click.stop>
              <svg viewBox="0 0 12 18" aria-hidden="true">
                <rect x="1" y="1" width="3" height="3" rx="0.5" />
                <rect x="8" y="1" width="3" height="3" rx="0.5" />
                <rect x="1" y="7.5" width="3" height="3" rx="0.5" />
                <rect x="8" y="7.5" width="3" height="3" rx="0.5" />
                <rect x="1" y="14" width="3" height="3" rx="0.5" />
                <rect x="8" y="14" width="3" height="3" rx="0.5" />
              </svg>
            </button>
            <div class="manager-item manager-item-editable">
              <input v-if="item.id !== UNCATEGORIZED_GROUP_ID" :value="item.name" aria-label="Group name"
                @change="updateGroup(item.id, $event.target.value)" />
              <span v-else class="protected-group-name">{{ item.name }} <small>Default group</small></span>
            </div>
            <button type="button" class="manager-visibility" :class="{ hidden: item.visible === false }"
              :aria-label="`${item.visible !== false ? 'Hide' : 'Show'} ${item.name} on dashboard`"
              :title="`${item.visible !== false ? 'Hide' : 'Show'} ${item.name} on dashboard`"
              :aria-pressed="item.visible !== false" @click="toggleGroupVisibility(item.id)">
              <svg v-if="item.visible !== false" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"
                stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" />
                <circle cx="12" cy="12" r="2.5" />
              </svg>
              <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"
                stroke-linejoin="round" aria-hidden="true">
                <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" />
                <circle cx="12" cy="12" r="2.5" />
                <path d="m4 4 16 16" />
              </svg>
            </button>
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

.manager-visibility {
  display: inline-flex;
  width: 28px;
  height: 28px;
  align-items: center;
  justify-content: center;
  flex: none;
  padding: 0;
  border: 0;
  border-radius: 7px;
  background: transparent;
  color: var(--green);
}

.manager-visibility svg {
  width: 18px;
  height: 18px;
}

.manager-visibility.hidden {
  color: var(--ink-muted);
}

.manager-visibility:hover,
.manager-visibility:focus-visible {
  background: var(--surface-alt);
  color: var(--green-strong);
  outline: none;
}

.manager-drag {
  width: 20px;
  height: 24px;
  padding: 0;
  border-radius: 6px;
  background: transparent;
  color: color-mix(in srgb, var(--ink-muted) 72%, transparent);
  opacity: 0.8;
  line-height: 1;
}

.manager-drag svg {
  width: 10px;
  height: 15px;
  fill: currentColor;
}

.manager-drag:hover,
.manager-drag:focus-visible {
  background: var(--surface-alt);
  color: var(--green-strong);
  opacity: 1;
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
