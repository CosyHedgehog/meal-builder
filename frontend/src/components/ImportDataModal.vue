<script setup>
import { ref } from 'vue'
import BaseModal from './BaseModal.vue'
import { importData } from '../js/data.js'
import { confirmAction } from '../js/confirm.js'

const emit = defineEmits(['close'])
const selectedFile = ref(null)
const fileInput = ref(null)
const errorMessage = ref('')

function chooseFile() {
  fileInput.value?.click()
}

function setFile(event) {
  selectedFile.value = event.target.files?.[0] || null
  errorMessage.value = ''
}

async function importFile() {
  if (!selectedFile.value) return
  const ok = await confirmAction({
    title: 'Replace all data?',
    message: 'This will replace everything currently in Meal Builder. Download your existing data first if you want a backup. Are you sure?',
    okLabel: 'Replace data',
  })
  if (!ok) return

  try {
    await importData(JSON.parse(await selectedFile.value.text()))
    emit('close')
  } catch {
    errorMessage.value = 'That file could not be imported. Choose a valid Meal Builder data export.'
  }
}
</script>

<template>
  <BaseModal title="Import data" subtitle="Choose a Meal Builder data export to restore." @close="emit('close')">
    <div class="import-data-content">
      <div class="import-data-note">
        Importing will replace all current foods, ingredients, groups, logs, and settings. Download your existing data first if you want a backup.
      </div>
      <input ref="fileInput" class="visually-hidden" type="file" accept="application/json,.json" @change="setFile" />
      <div class="import-file-picker">
        <button class="btn btn-secondary" type="button" @click="chooseFile">Choose file</button>
        <span class="import-file-name">{{ selectedFile?.name || 'No file chosen' }}</span>
      </div>
      <div v-if="errorMessage" class="import-data-error">{{ errorMessage }}</div>
      <button class="btn btn-primary primary-wide" type="button" :disabled="!selectedFile" @click="importFile">
        Import data
      </button>
    </div>
  </BaseModal>
</template>

<style scoped>
.import-data-content > input[type='file'] {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}

.import-data-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.import-data-note {
  color: var(--ink-muted);
  font-size: 13px;
  line-height: 1.45;
}

.import-data-error {
  color: var(--red);
  font-size: 12px;
}

.import-file-picker {
  display: flex;
  align-items: center;
  gap: 10px;
}

.import-file-name {
  min-width: 0;
  overflow: hidden;
  color: var(--ink-muted);
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
