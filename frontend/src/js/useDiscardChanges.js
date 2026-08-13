import { computed } from 'vue'
import { confirmAction } from './confirm.js'

function snapshot(value) {
  return JSON.stringify(value)
}

export function useDiscardChanges(draft) {
  const initial = snapshot(draft)
  const isDirty = computed(() => snapshot(draft) !== initial)

  async function confirmDiscard(message = 'Your unsaved changes will be lost.') {
    if (!isDirty.value) return true
    return confirmAction({
      title: 'Discard changes?',
      message,
      okLabel: 'Discard',
    })
  }

  return { isDirty, confirmDiscard }
}
