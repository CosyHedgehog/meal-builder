/**
 * Snack CRUD and reordering of saved snacks.
 */

async function reorderSnacks(fromId, toId){
  if(!fromId || !toId || fromId === toId) return;
  const fromIndex = snacks.findIndex(s => s.id === fromId);
  const toIndex = snacks.findIndex(s => s.id === toId);
  if(fromIndex === -1 || toIndex === -1) return;
  const [moved] = snacks.splice(fromIndex, 1);
  const adjustedTo = fromIndex < toIndex ? toIndex - 1 : toIndex;
  snacks.splice(adjustedTo, 0, moved);
  await saveData();
  renderApp();
}


/* ===================== Snacks tab ===================== */
async function addSnack(name, kcal){
  if(!name || !name.trim()) return;
  snacks.push({id: uid('snack'), name: name.trim(), kcal: isNaN(kcal) ? 0 : kcal});
  await saveData();
  renderApp();
}

async function updateSnackField(id, field, value){
  const snack = snacks.find(s => s.id === id);
  if(!snack) return;
  if(field === 'name') snack.name = value || snack.name;
  if(field === 'kcal') snack.kcal = isNaN(value) ? snack.kcal : value;
  await saveData();
  renderApp();
}

async function deleteSnack(id){
  showConfirmModal({
    title:'Delete snack',
    message:'Delete this snack? It will be removed from any past logged days too.',
    okLabel:'Delete snack',
    onConfirm: async () => {
      snacks = snacks.filter(s => s.id !== id);
      Object.values(logs).forEach(log => { log.snacks = log.snacks.filter(e => e.snackId !== id); });
      await saveData();
      renderApp();
    }
  });
}

