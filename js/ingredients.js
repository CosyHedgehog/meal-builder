/**
 * Ingredients modal: list/search, add/edit/delete ingredients, and
 * reordering ingredients.
 */

async function reorderIngredients(fromId, toId){
  if(!fromId || !toId || fromId === toId) return;
  const fromIndex = ingredients.findIndex(i => i.id === fromId);
  const toIndex = ingredients.findIndex(i => i.id === toId);
  if(fromIndex === -1 || toIndex === -1) return;
  const [moved] = ingredients.splice(fromIndex, 1);
  ingredients.splice(toIndex, 0, moved);
  await saveData();
  renderApp();
  renderIngredientsModal();
  if(openMealId) renderDrawer();
}


/* ===================== Ingredients modal ===================== */
function openIngredientsModal(){
  ingModalOpen = true;
  ingModalView = 'list';
  ingEditorId = null;
  ingEditorReturnTo = 'ingredientsModal';
  ingModalView = 'list';
  ingEditorId = null;
  ingEditorReturnTo = 'ingredientsModal';
  ingSearchTerm = '';
  const modal = document.getElementById('ingModal');
  modal.innerHTML = '';
  renderIngredientsModal();
  document.getElementById('ingModalBackdrop').classList.add('open');
}
function closeIngredientsModal(){
  ingModalOpen = false;
  document.getElementById('ingModalBackdrop').classList.remove('open');
}

async function deleteIngredient(id, returnTo='ingredientsModal'){
  const usedIn = meals.filter(m => m.items.some(it => it.ingredientId === id));
  if(usedIn.length){
    showConfirmModal({
      title:'Unable to delete',
      message:`This ingredient is used in: ${usedIn.map(m=>m.name).join(', ')}. Remove it from those meals first.`,
      okLabel:'Okay',
      onConfirm: async () => {}
    });
    return;
  }
  showConfirmModal({
    title:'Delete ingredient',
    message:'Delete this ingredient?',
    okLabel:'Delete ingredient',
    onConfirm: async () => {
      ingredients = ingredients.filter(i => i.id !== id);
      await saveData();
      renderApp();
      if(openMealId) renderDrawer();
      if(returnTo==='foodManager'){
        closeIngredientsModal();
        openFoodManager('ingredients');
      } else {
        renderIngredientsModal();
      }
    }
  });
}

async function addIngredient(name, unit, kcal, skipRender=false){
  if(!name || !name.trim()) return;
  ingredients.push({id: uid('ing'), name: name.trim(), unit: unit || 'g', kcal: isNaN(kcal) ? 0 : kcal});
  await saveData();
  renderApp();
  if(openMealId) renderDrawer();
  if(!skipRender) renderIngredientsModal();
}

function openIngredientEditor(editId, returnTo='ingredientsModal'){
  ingModalOpen = true;
  ingModalView = 'editor';
  ingEditorId = editId || null;
  ingEditorReturnTo = returnTo;
  renderIngredientsModal();
  document.getElementById('ingModalBackdrop').classList.add('open');
}

function renderIngredientsModal(){
  const modal = document.getElementById('ingModal');
  if(!ingModalOpen){ modal.innerHTML = ''; return; }

  if(ingModalView === 'editor'){
    const ingredient = ingredients.find(i => i.id === ingEditorId) || {name:'', unit:'g', kcal:0};
    modal.innerHTML = `
      <button class="drawer-close" id="ingModalCloseBtn" aria-label="Close">×</button>
      <h2>${ingredient.id ? 'Edit ingredient' : 'New ingredient'}</h2>
      <div class="subtitle">${ingredient.id ? 'Update a saved ingredient.' : 'Add a new ingredient to your pantry.'}</div>
      <div class="auth-field"><label>Name</label><input id="editIngName" value="${escapeHtml(ingredient.name)}" placeholder="e.g. Chicken breast"></div>
      <div class="auth-field"><label>Unit</label><select id="editIngUnit"><option value="g" ${ingredient.unit==='g'?'selected':''}>g</option><option value="each" ${ingredient.unit==='each'?'selected':''}>each</option></select></div>
      <div class="auth-field"><label>Calories</label><input id="editIngKcal" type="number" min="0" step="any" value="${ingredient.kcal || ''}" placeholder="kcal"></div>
      <button class="btn btn-primary primary-wide" id="saveIngredientBtn">${ingredient.id ? 'Save ingredient' : 'Add ingredient'}</button>
      ${ingredient.id ? '<button class="btn btn-secondary primary-wide" id="deleteIngredientBtn" style="margin-top:8px;">Delete ingredient</button>' : ''}
    `;

    const closeButton = document.getElementById('ingModalCloseBtn');
    if(closeButton){
      closeButton.addEventListener('click', () => {
        if(ingEditorReturnTo === 'foodManager'){
          closeIngredientsModal();
          openFoodManager('ingredients');
        } else {
          openIngredientsModal();
        }
      });
    }

    document.getElementById('saveIngredientBtn').addEventListener('click', async () => {
      const name = document.getElementById('editIngName').value.trim();
      const unit = document.getElementById('editIngUnit').value;
      const kcal = parseFloat(document.getElementById('editIngKcal').value);
      if(!name || !Number.isFinite(kcal) || kcal < 0) return;
      if(ingredient.id){
        ingredient.name = name;
        ingredient.unit = unit;
        ingredient.kcal = kcal;
        await saveData();
        renderApp();
        if(openMealId) renderDrawer();
        if(ingEditorReturnTo === 'foodManager'){
          closeIngredientsModal();
          openFoodManager('ingredients');
        } else {
          openIngredientsModal();
        }
      } else {
        await addIngredient(name, unit, kcal, ingEditorReturnTo === 'foodManager');
        if(ingEditorReturnTo === 'foodManager'){
          closeIngredientsModal();
          openFoodManager('ingredients');
        } else {
          openIngredientsModal();
        }
      }
    });

    if(ingredient.id){
      document.getElementById('deleteIngredientBtn').addEventListener('click', async () => {
        await deleteIngredient(ingredient.id, ingEditorReturnTo);
      });
    }
    return;
  }

  const term = ingSearchTerm.trim().toLowerCase();
  const filtered = term ? ingredients.filter(i => i.name.toLowerCase().includes(term)) : ingredients;

  modal.innerHTML = `
    <button class="drawer-close" id="ingModalCloseBtn" aria-label="Close" style="position:absolute;top:18px;right:18px;">×</button>
    <h2>Ingredients</h2>
    <div class="subtitle">Calories per 100g for weighed items, or per item for things you count.</div>
    <input class="ing-search" id="ingSearchInput" type="search" placeholder="Search ingredients…" value="${escapeHtml(ingSearchTerm)}" />
    ${term ? `<div class="ing-search-note">${filtered.length} of ${ingredients.length} shown.</div>` : ''}
    <div class="manager-list">${filtered.length
      ? filtered.map(i=>`<button class="manager-item" data-manager-ingredient="${i.id}"><span><strong>${escapeHtml(i.name)}</strong><small>${i.kcal} kcal ${i.unit==='g'?'/ 100g':'/ item'}</small></span><span>›</span></button>`).join('')
      : '<div class="empty-note">No ingredients match that search.</div>'}
    </div>
    <div class="section-label">Add new</div>
    <button class="btn btn-primary primary-wide" id="addIngBtn">＋ New ingredient</button>
    <div class="modal-footer">
      <span class="subtitle" style="margin:0;">${ingredients.length} ingredients on file</span>
      <button class="btn btn-secondary" id="ingDoneBtn">Done</button>
    </div>
  `;

  const closeButton = document.getElementById('ingModalCloseBtn');
  if(closeButton){
    closeButton.addEventListener('click', closeIngredientsModal);
  }
  const doneButton = document.getElementById('ingDoneBtn');
  if(doneButton){
    doneButton.addEventListener('click', closeIngredientsModal);
  }
  const searchInput = document.getElementById('ingSearchInput');
  if(searchInput){
    searchInput.addEventListener('input', e => {
      ingSearchTerm = e.target.value;
      renderIngredientsModal();
      const el = document.getElementById('ingSearchInput');
      if(el){ el.focus(); el.selectionStart = el.selectionEnd = el.value.length; }
    });
  }
  const addBtn = document.getElementById('addIngBtn');
  if(addBtn){
    addBtn.addEventListener('click', () => openIngredientEditor());
  }
  document.querySelectorAll('[data-manager-ingredient]').forEach(btn => {
    btn.addEventListener('click', e => openIngredientEditor(e.currentTarget.dataset.managerIngredient));
  });
}

document.getElementById('ingModalBackdrop').addEventListener('click', e => {
  if(e.target.id === 'ingModalBackdrop') closeIngredientsModal();
});
