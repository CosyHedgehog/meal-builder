<script setup>
import { ref } from 'vue'
import BaseModal from './BaseModal.vue'
import { authApi } from '../js/api.js'
import { closeAllModals } from '../js/modals.js'
import { signOut } from '../js/auth.js'

const emit = defineEmits(['close'])
const password = ref('')
const error = ref('')
const submitting = ref(false)

async function deleteAccount() {
  if (!password.value || submitting.value) return
  submitting.value = true
  error.value = ''
  try {
    await authApi.deleteAccount(password.value)
    closeAllModals()
    await signOut()
  } catch (e) {
    error.value = e.message
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <BaseModal title="Delete account" subtitle="This permanently deletes your account, nutrition data, follows, and activity. This cannot be undone." panel-class="delete-account-modal" @close="emit('close')">
    <form class="delete-account-form" @submit.prevent="deleteAccount">
      <label for="deleteAccountPassword">Enter your password to confirm</label>
      <input id="deleteAccountPassword" v-model="password" type="password" autocomplete="current-password" autofocus />
      <div v-if="error" class="form-error">{{ error }}</div>
      <div class="delete-account-actions">
        <button class="btn btn-danger-outline" type="submit" :disabled="submitting">
          {{ submitting ? 'Deleting...' : 'Delete account' }}
        </button>
        <button class="btn btn-secondary" type="button" :disabled="submitting" @click="emit('close')">Cancel</button>
      </div>
    </form>
  </BaseModal>
</template>

<style scoped>
.delete-account-form { display: flex; flex-direction: column; gap: 10px; margin-top: 14px; }
.delete-account-form label { color: var(--ink-muted); font-size: 12px; font-weight: 600; }
.delete-account-form input { width: 100%; min-height: 42px; padding: 10px 12px; border: 1px solid var(--line); border-radius: 9px; background: var(--bg); color: var(--ink); }
.delete-account-form input:focus { outline: 2px solid var(--red); outline-offset: 1px; }
.delete-account-actions { display: flex; gap: 8px; justify-content: flex-end; margin-top: 8px; }
.delete-account-actions .btn { min-width: 120px; }
</style>
