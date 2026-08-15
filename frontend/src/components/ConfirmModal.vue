<script setup>
import { onMounted, onUnmounted } from 'vue'
import BaseModal from './BaseModal.vue'
import { confirmState, settleConfirm } from '../js/confirm.js'

function onKeydown(e) {
  if (confirmState.open && e.key === 'Escape') settleConfirm(false)
}

onMounted(() => document.addEventListener('keydown', onKeydown))
onUnmounted(() => document.removeEventListener('keydown', onKeydown))
</script>

<template>
  <Transition name="fade">
    <BaseModal
      v-if="confirmState.open"
      :title="confirmState.title"
      :subtitle="confirmState.message"
      panel-class="confirm-modal"
      backdrop-class="is-confirm"
      @close="settleConfirm(false)"
    >
      <div class="modal-footer">
        <button
          v-if="confirmState.cancelLabel"
          class="btn btn-secondary"
          @click="settleConfirm(false)"
        >
          {{ confirmState.cancelLabel }}
        </button>
        <button class="btn" :class="confirmState.okClass" @click="settleConfirm(true)">
          {{ confirmState.okLabel }}
        </button>
      </div>
    </BaseModal>
  </Transition>
</template>
<style scoped>
.confirm-modal {
  width: 460px;
}

.confirm-modal .modal-footer {
  justify-content: flex-end;
  gap: 10px;
}

.confirm-modal .modal-footer .btn {
  min-width: 110px;
}
</style>