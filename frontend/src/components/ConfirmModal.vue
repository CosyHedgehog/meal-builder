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

:deep(.modal.confirm-modal) {
  padding-bottom: 14px;
}

.confirm-modal h2,
.confirm-modal > .subtitle {
  text-align: center;
}

.confirm-modal .modal-footer {
  margin-right: -26px;
  margin-left: -26px;
  padding-right: 26px;
  padding-left: 26px;
  justify-content: center;
  gap: 10px;
}

.confirm-modal .modal-footer .btn {
  min-width: 110px;
}

@media (max-width: 480px) {
  :deep(.modal.confirm-modal) {
    padding-bottom: 8px;
  }

  .confirm-modal .modal-footer {
    margin-right: -18px;
    margin-left: -18px;
    padding-right: 18px;
    padding-left: 18px;
  }
}
</style>