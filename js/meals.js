/**
 * Meal CRUD, the meal-editing drawer, and reordering of meals/items
 * within a meal.
 */

async function reorderMeals(fromIndex, toIndex){
  if(fromIndex === toIndex || fromIndex == null || toIndex == null) return;
  const [moved] = meals.splice(fromIndex, 1);
  meals.splice(toIndex, 0, moved);
  await saveData();
  renderApp();
}

async function reorderMealItems(mealId, fromId, toId){
  if(!fromId || !toId || fromId === toId) return;
  const meal = meals.find(m => m.id === mealId);
  if(!meal) return;
  const fromIndex = meal.items.findIndex(it => it.ingredientId === fromId);
  const toIndex = meal.items.findIndex(it => it.ingredientId === toId);
  if(fromIndex === -1 || toIndex === -1) return;
  const [moved] = meal.items.splice(fromIndex, 1);
  meal.items.splice(toIndex, 0, moved);
  await saveData();
  renderDrawer();
}

/* ===================== Helpers ===================== */

/* ===================== Meal CRUD ===================== */
async function addMeal(){
  const meal = {id: uid('meal'), name:'New meal', items:[]};
  meals.push(meal);
  await saveData();
  renderApp();
  openMealEditor(meal.id);
}

async function copyMeal(id){
  const original = meals.find(m => m.id === id);
  if(!original) return;
  const idx = meals.findIndex(m => m.id === id);
  const copy = {
    id: uid('meal'),
    name: original.name + ' (copy)',
    items: original.items.map(it => ({ingredientId: it.ingredientId, amount: it.amount})),
  };
  meals.splice(idx + 1, 0, copy);
  await saveData();
  renderApp();
  openMealEditor(copy.id);
}

async function openMealEditor(editId){
  let meal = meals.find(m => m.id === editId);
  const isNew = !meal;
  if(!meal){
    meal = {id: uid('meal'), name:'New meal', items:[]};
    meals.push(meal);
    await saveData();
    renderApp();
  }
  transferModalOpen = true;
  const modal = document.getElementById('transferModal');
  const kcal = mealKcal(meal);
  const usedIds = new Set(meal.items.map(it => it.ingredientId));
  const available = ingredients.filter(i => !usedIds.has(i.id));
  const rows = meal.items.map(it => {
    const ing = getIngredient(it.ingredientId);
    if(!ing) return '';
    return `
      <div class="item-row">
        <div></div>
        <div class="item-name">${escapeHtml(ing.name)}</div>
        <input class="item-qty" type="number" step="any" min="0" value="${it.amount}"
          data-amount-for="${ing.id}" />
        <div class="item-unit">${ing.unit === 'g' ? 'g' : ''}</div>
        <div class="item-kcal mono">${Math.round(itemKcal(it))}</div>
        <button class="item-remove" data-remove="${ing.id}" aria-label="Remove ${escapeHtml(ing.name)}">×</button>
      </div>`;
  }).join('');

  modal.innerHTML = `
    <button class="drawer-close" id="mealEditorClose" aria-label="Close" style="position:absolute;top:18px;right:18px;">×</button>
    <h2>${isNew ? 'New meal' : 'Edit meal'}</h2>
    <div class="subtitle">Add ingredients and adjust the calories for this meal.</div>
    <div class="auth-field"><label>Name</label><input id="editMealName" value="${escapeHtml(meal.name)}"></div>
    <div class="section-label">Calories</div>
    <div class="subtitle" style="margin-top:0;">${kcal.toLocaleString()} kcal total</div>
    <div class="section-label">Ingredients</div>
    ${meal.items.length ? `<div class="item-head"><span></span><span>Name</span><span>Qty</span><span></span><span>Kcal</span><span></span></div>${rows}` : '<div class="empty-note">No ingredients yet — add one below.</div>'}
    <div class="add-item-row" style="margin-top:16px;">
      <select class="add-item-select" id="mealAddIngredientSelect">
        <option value="">Add an ingredient…</option>
        ${available.map(i => `<option value="${i.id}">${escapeHtml(i.name)} (${i.unit==='g'?'g':'each'})</option>`).join('')}
      </select>
      <input class="add-item-qty" type="number" step="any" min="0" placeholder="qty" id="mealAddIngredientQty" />
      <button class="btn btn-primary" id="mealAddIngredientBtn">Add</button>
    </div>
    <button class="btn btn-primary primary-wide" id="saveMealBtn" style="margin-top:8px;">${isNew ? 'Create meal' : 'Save meal'}</button>
    ${!isNew ? '<button class="btn btn-secondary primary-wide" id="deleteMealBtn" style="margin-top:8px;">Delete meal</button>' : ''}
  `;

  document.getElementById('transferModalBackdrop').classList.add('open');
  document.getElementById('mealEditorClose').onclick = async () => {
    if(isNew && meal.items.length === 0){
      meals = meals.filter(m => m.id !== meal.id);
      await saveData();
      renderApp();
    }
    openFoodManager('meals');
  };
  document.getElementById('editMealName').addEventListener('change', e => {
    meal.name = e.target.value.trim() || 'Untitled meal';
    saveData().then(() => renderApp());
  });
  document.getElementById('mealAddIngredientBtn').addEventListener('click', async () => {
    const sel = document.getElementById('mealAddIngredientSelect');
    const qty = parseFloat(document.getElementById('mealAddIngredientQty').value);
    await addItemToMeal(meal.id, sel.value, qty);
    openMealEditor(meal.id);
  });
  modal.querySelectorAll('[data-amount-for]').forEach(inp => {
    inp.addEventListener('change', async e => {
      await updateItemAmount(meal.id, e.target.getAttribute('data-amount-for'), parseFloat(e.target.value));
      openMealEditor(meal.id);
    });
  });
  modal.querySelectorAll('[data-remove]').forEach(btn => {
    btn.addEventListener('click', async e => {
      await removeItem(meal.id, e.target.getAttribute('data-remove'));
      openMealEditor(meal.id);
    });
  });
  document.getElementById('saveMealBtn').addEventListener('click', async () => {
    await saveData();
    renderApp();
    openFoodManager('meals');
  });
  const deleteBtn = modal.querySelector('#deleteMealBtn');
  if(deleteBtn) deleteBtn.addEventListener('click', async () => {
    showConfirmModal({
      title:'Delete meal',
      message:'Delete this meal?',
      okLabel:'Delete meal',
      onConfirm: async () => {
        meals = meals.filter(m => m.id !== meal.id);
        await saveData();
        renderApp();
        openFoodManager('meals');
      }
    });
  });
}

async function deleteMeal(id){
  showConfirmModal({
    title:'Delete meal',
    message:'Delete this meal?',
    okLabel:'Delete meal',
    onConfirm: async () => {
      meals = meals.filter(m => m.id !== id);
      await saveData();
      closeDrawer();
      renderApp();
    }
  });
}

async function renameMeal(id, name){
  const meal = meals.find(m => m.id === id);
  if(meal){ meal.name = name || 'Untitled meal'; await saveData(); renderApp(); }
}

async function updateItemAmount(mealId, ingredientId, amount){
  const meal = meals.find(m => m.id === mealId);
  const item = meal.items.find(it => it.ingredientId === ingredientId);
  if(item){
    item.amount = isNaN(amount) ? 0 : amount;
    await saveData();
    renderApp();
    renderDrawer();
  }
}

async function removeItem(mealId, ingredientId){
  const meal = meals.find(m => m.id === mealId);
  meal.items = meal.items.filter(it => it.ingredientId !== ingredientId);
  await saveData();
  renderApp();
  renderDrawer();
}

async function addItemToMeal(mealId, ingredientId, amount){
  if(!ingredientId) return;
  const meal = meals.find(m => m.id === mealId);
  if(meal.items.some(it => it.ingredientId === ingredientId)) return;
  meal.items.push({ingredientId, amount: isNaN(amount)||amount<=0 ? 1 : amount});
  await saveData();
  renderApp();
  renderDrawer();
}

/* ===================== Render: drawer ===================== */
function openDrawer(mealId){
  openMealId = mealId;
  renderDrawer();
  document.getElementById('drawer').classList.add('open');
  document.getElementById('drawerBackdrop').classList.add('open');
}

function closeDrawer(){
  document.getElementById('drawer').classList.remove('open');
  document.getElementById('drawerBackdrop').classList.remove('open');
  openMealId = null;
}

function renderDrawer(){
  const drawer = document.getElementById('drawer');
  if(!openMealId){ drawer.innerHTML = ''; return; }
  const meal = meals.find(m => m.id === openMealId);
  if(!meal){ closeDrawer(); return; }

  const kcal = mealKcal(meal);
  const usedIds = new Set(meal.items.map(it => it.ingredientId));
  const available = ingredients.filter(i => !usedIds.has(i.id));

  const rows = meal.items.map(it => {
    const ing = getIngredient(it.ingredientId);
    if(!ing) return '';
    return `
      <div class="item-row" draggable="false" data-item-id="${ing.id}">
        <div class="item-drag" data-item-drag title="Drag to reorder">⠿</div>
        <div class="item-name">${escapeHtml(ing.name)}</div>
        <input class="item-qty" type="number" step="any" min="0" value="${it.amount}"
          data-amount-for="${ing.id}" />
        <div class="item-unit">${ing.unit === 'g' ? 'g' : ''}</div>
        <div class="item-kcal mono">${Math.round(itemKcal(it))}</div>
        <button class="item-remove" data-remove="${ing.id}" aria-label="Remove ${escapeHtml(ing.name)}">×</button>
      </div>`;
  }).join('');

  drawer.innerHTML = `
    <div class="drawer-topbar"><span class="drawer-kicker">MEAL</span><button class="drawer-close" id="drawerCloseBtn" aria-label="Close">×</button></div>
    <input class="meal-name-input" id="mealNameInput" value="${escapeHtml(meal.name)}" />

    <div class="drawer-dial-wrap">${dialHTML(kcal, true)}</div>

    ${meal.items.length ? `<div class="item-head"><span></span><span>Name</span><span>Qty</span><span></span><span>Kcal</span><span></span></div>${rows}` : '<div class="empty-note">No ingredients yet — add one below.</div>'}

    <div class="add-item-row">
      <select class="add-item-select" id="addItemSelect">
        <option value="">Add an ingredient…</option>
        ${available.map(i => `<option value="${i.id}">${escapeHtml(i.name)} (${i.unit==='g'?'g':'each'})</option>`).join('')}
      </select>
      <input class="add-item-qty" type="number" step="any" min="0" placeholder="qty" id="addItemQty" />
      <button class="btn btn-primary" id="addItemBtn">Add</button>
    </div>

    <div class="drawer-footer">
      <button class="btn btn-danger" id="deleteMealBtn">Delete meal</button>
    </div>
  `;

  document.getElementById('drawerCloseBtn').addEventListener('click', closeDrawer);
  document.getElementById('mealNameInput').addEventListener('change', e => renameMeal(meal.id, e.target.value.trim()));
  document.getElementById('deleteMealBtn').addEventListener('click', () => deleteMeal(meal.id));
  document.getElementById('addItemBtn').addEventListener('click', () => {
    const sel = document.getElementById('addItemSelect');
    const qty = parseFloat(document.getElementById('addItemQty').value);
    addItemToMeal(meal.id, sel.value, qty);
  });
  drawer.querySelectorAll('[data-amount-for]').forEach(inp => {
    inp.addEventListener('change', e => updateItemAmount(meal.id, e.target.getAttribute('data-amount-for'), parseFloat(e.target.value)));
  });
  drawer.querySelectorAll('[data-remove]').forEach(btn => {
    btn.addEventListener('click', e => removeItem(meal.id, e.target.getAttribute('data-remove')));
  });
  drawer.querySelectorAll('.item-row').forEach(row => {
    const handle = row.querySelector('[data-item-drag]');
    if(handle){
      handle.addEventListener('mousedown', () => row.setAttribute('draggable', 'true'));
      handle.addEventListener('touchstart', () => row.setAttribute('draggable', 'true'), {passive:true});
    }
    row.addEventListener('dragstart', e => {
      itemDragFromId = row.getAttribute('data-item-id');
      row.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
    });
    row.addEventListener('dragend', () => {
      row.classList.remove('dragging');
      row.setAttribute('draggable', 'false');
      drawer.querySelectorAll('.item-row').forEach(r => r.classList.remove('drag-over'));
      setTimeout(() => { itemDragFromId = null; }, 0);
    });
    row.addEventListener('dragover', e => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      row.classList.add('drag-over');
    });
    row.addEventListener('dragleave', () => row.classList.remove('drag-over'));
    row.addEventListener('drop', e => {
      e.preventDefault();
      row.classList.remove('drag-over');
      reorderMealItems(meal.id, itemDragFromId, row.getAttribute('data-item-id'));
    });
  });
}

document.getElementById('drawerBackdrop').addEventListener('click', closeDrawer);
