import { reactive } from 'vue'

export const confirmState = reactive({
  open: false,
  title: 'Confirm',
  message: 'Are you sure?',
  okLabel: 'Delete',
  cancelLabel: 'Cancel',
  resolve: null,
})

/** Returns a promise that resolves to true (confirmed) or false (cancelled). */
export function confirmAction({ title, message, okLabel, cancelLabel } = {}) {
  return new Promise((resolve) => {
    Object.assign(confirmState, {
      open: true,
      title: title || 'Confirm',
      message: message || 'Are you sure?',
      okLabel: okLabel || 'Delete',
      cancelLabel: cancelLabel === undefined ? 'Cancel' : cancelLabel,
      resolve,
    })
  })
}

export function settleConfirm(value) {
  const resolve = confirmState.resolve
  confirmState.open = false
  confirmState.resolve = null
  if (resolve) resolve(value)
}