/**
 * Reusable 'are you sure?' confirmation modal used by delete actions
 * throughout the app.
 */

function showConfirmModal({title='Confirm', message='Are you sure?', okLabel='Delete', onConfirm}){
  const backdrop = document.getElementById('confirmModalBackdrop');
  const modal = document.getElementById('confirmModal');
  const titleEl = document.getElementById('confirmTitle');
  const messageEl = document.getElementById('confirmMessage');
  const okBtn = document.getElementById('confirmOkBtn');
  const cancelBtn = document.getElementById('confirmCancelBtn');

  titleEl.textContent = title;
  messageEl.textContent = message;
  okBtn.textContent = okLabel;

  const close = () => backdrop.classList.remove('open');
  const cleanup = () => {
    cancelBtn.onclick = null;
    okBtn.onclick = null;
    backdrop.removeEventListener('click', backdropClick);
  };
  const backdropClick = (e) => {
    if(e.target.id === 'confirmModalBackdrop') {
      cleanup();
      close();
    }
  };

  cancelBtn.onclick = () => {
    cleanup();
    close();
  };
  okBtn.onclick = async () => {
    cleanup();
    close();
    if(typeof onConfirm === 'function') await onConfirm();
  };
  backdrop.addEventListener('click', backdropClick);
  backdrop.classList.add('open');
}
