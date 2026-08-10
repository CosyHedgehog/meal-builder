/**
 * Home dashboard: today's summary, history strip, food manager entry
 * points, snack editor and the settings modal (incl. maintenance calories).
 */

async function updateMaintenance(value){
  const v = parseFloat(value);
  maintenanceCal = isNaN(v) || v <= 0 ? DEFAULT_MAINTENANCE : Math.round(v);
  await saveData();
  renderApp();
}

function renderApp(){
  const log=getLog(logDate), deficit=logDeficit(log);
  const historyDays = getHistoryDaysForViewport();
  const gridColumns = historyDays;
  const hist=computeHistory(historyDays), max=Math.max(100,...hist.map(h=>Math.abs(h.deficit)));
  const mealK=logMealKcal(log), snackK=logSnacksKcal(log), totalK=mealK+snackK;
  const barTotal=Math.max(maintenanceCal, totalK, 1);
  const mealPct=Math.min(100, mealK/barTotal*100);
  const snackPct=Math.min(100-mealPct, snackK/barTotal*100);
  const isSurplus=totalK>maintenanceCal;
  const maintenancePct=Math.min(100, maintenanceCal/barTotal*100);
  document.getElementById('app').innerHTML=`
    <div class="home">
      <header class="home-header"><div><div class="eyebrow">Pantry to Plate</div></div><div class="header-actions"><button class="header-profile-btn" id="openSettingsBtn" aria-label="Open settings"><span class="header-profile-name">${escapeHtml(currentUser?.username || 'Settings')}</span><span class="header-profile-icon" aria-hidden="true">⚙</span></button></div></header>
      <section class="today-card">
        <div class="today-top">
          <div class="today-date-row">
            <div class="today-date">${prettyDate(logDate).replace(/, \d{4}$/,'')}<small>${logDate===todayStr()?'Today':'Selected day'}</small></div>
          </div>
          <div class="today-kcal"><strong>${totalK.toLocaleString()}</strong></div>
        </div>
        <div class="today-bar" role="img" aria-label="${mealK.toLocaleString()} kcal from your meal, ${snackK.toLocaleString()} kcal from snacks, against a ${maintenanceCal.toLocaleString()} kcal maintenance target">
          <div class="today-bar-seg meal" style="width:${mealPct}%"></div>
          <div class="today-bar-seg snack" style="width:${snackPct}%"></div>
          ${isSurplus ? `<div class="today-bar-marker" style="left:${maintenancePct}%" title="Maintenance: ${maintenanceCal.toLocaleString()} kcal"></div>` : ''}
        </div>
        <div class="today-status">
          <div class="today-status-bar${deficit<0 ? ' surplus' : ''}">
            <div class="status-seg meal" style="width:${mealPct}%"></div>
            <div class="status-seg snack" style="width:${snackPct}%"></div>
            <div class="status-seg deficit" style="width:${Math.max(0, 100 - mealPct - snackPct)}%"></div>
          </div>
          <div class="today-status-labels">
            <div class="status-pill meal"><span>Meal</span><strong>${mealK.toLocaleString()}</strong></div>
            <div class="status-pill snack"><span>Snacks</span><strong>${snackK.toLocaleString()}</strong></div>
            <div class="status-pill ${deficit>=0 ? 'deficit' : 'surplus'}"><span>${deficit>=0?'Deficit':'Surplus'}</span><strong>${Math.abs(deficit).toLocaleString()}</strong></div>
          </div>
        </div>
        <div class="today-chips">
          <div class="chip-group">
            <div class="chip-group-header">Meal</div>
            <div class="chip-list">
              ${meals.length ? meals.map(m => {
                const isActive = log.mode==='meal' && log.mealId===m.id;
                return `<button type="button" class="today-chip${isActive ? ' active' : ''}" data-select-meal="${m.id}">${escapeHtml(m.name)}</button>`;
              }).join('') : '<span class="empty-note">No meals yet</span>'}
              ${log.mode==='custom' ? `<button type="button" class="today-chip active" data-select-meal="custom">${escapeHtml(log.manualMealName||'Custom')} ${log.manualMealKcal ? `(${Math.round(log.manualMealKcal)} kcal)` : ''}</button>` : ''}
            </div>
          </div>
          <div class="chip-group">
            <div class="chip-group-header">Snacks</div>
            <div class="chip-list">
              ${snacks.length ? snacks.map(s => {
                const entry = (log.snacks || []).find(e => e.snackId === s.id);
                const qtyLabel = entry && entry.qty > 1 ? ` ×${entry.qty}` : '';
                return `<button type="button" class="today-chip${entry ? ' active' : ''}" data-log-snack="${s.id}">${escapeHtml(s.name)}${qtyLabel}</button>`;
              }).join('') : '<span class="empty-note">No snacks yet</span>'}
              ${(log.snacks && log.snacks.length) ? '<button type="button" class="today-chip reset" id="resetSnacksBtn">Reset snacks</button>' : ''}
            </div>
          </div>
        </div>
        <div class="day-nav"><button class="date-arrow" id="homePrevDay">‹</button><input class="log-date-input" type="date" id="homeDateInput" value="${logDate}" max="${todayStr()}"><button class="date-arrow" id="homeNextDay" ${logDate===todayStr()?'disabled':''}>›</button></div>
      </section>

      <section class="section-block history-section">
        <div class="section-head">
          <div><h2>History</h2><div class="muted">Last ${historyDays} days</div></div>
        </div>
        <div class="history-grid" style="grid-template-columns:repeat(${gridColumns},minmax(0,1fr));">
          ${hist.map(h => {
            const color = h.hasLog ? historyHeatColor(h.deficit, max) : 'var(--surface-alt)';
            const label = h.hasLog
              ? `${prettyDate(h.date)}: ${h.deficit >= 0 ? `${h.deficit} deficit` : `${Math.abs(h.deficit)} surplus`}`
              : 'Not logged';
            const valueText = h.hasLog ? (h.deficit >= 0 ? `${h.deficit}` : `-${Math.abs(h.deficit)}`) : '';
            const isActive = h.date === logDate;
            return `<button type="button" class="history-day${isActive ? ' active' : ''}" title="${escapeHtml(label)}" data-history-day="${h.date}" data-has-log="${h.hasLog ? 'true' : 'false'}" style="background:${color};" aria-label="Load ${escapeHtml(prettyDate(h.date))}">` +
              `${valueText ? `<span class="history-day-value">${valueText}</span>` : ''}` +
            `</button>`;
          }).join('')}
        </div>
        <div class="history-footer">
          <span>${hist.filter(h=>h.hasLog).length} days logged</span>
          <span>${(()=>{const a=hist.filter(h=>h.hasLog),d=a.length?Math.round(a.reduce((s,h)=>s+h.deficit,0)/a.length):0;return `${d>=0?'−':'+'}${Math.abs(d).toLocaleString()} avg / day`;})()}</span>
          <button class="btn btn-secondary" id="showAllHistoryBtn">Show all</button>
        </div>
      </section>

      <section class="section-block manage-section">
        <div class="manage-actions">
          <button class="manage-toggle" id="manageMealsBtn"><span><strong>Meals</strong><small>Manage meals</small></span><span class="manage-chevron">›</span></button>
          <button class="manage-toggle" id="manageSnacksBtn"><span><strong>Snacks</strong><small>Manage snacks</small></span><span class="manage-chevron">›</span></button>
          <button class="manage-toggle" id="manageIngredientsBtn"><span><strong>Ingredients</strong><small>Manage ingredients</small></span><span class="manage-chevron">›</span></button>
        </div>
      </section>

      
      
    </div>`;
  document.getElementById('homePrevDay').onclick=()=>setLogDateView(shiftDateStr(logDate,-1));
  document.getElementById('homeNextDay').onclick=()=>{if(logDate!==todayStr())setLogDateView(shiftDateStr(logDate,1))};
  const homeDateInput = document.getElementById('homeDateInput');
  if(homeDateInput){ homeDateInput.onchange = e => { if(e.target.value) setLogDateView(e.target.value); }; }
  document.getElementById('openSettingsBtn').onclick=openSettingsModal;
  document.getElementById('manageMealsBtn').onclick=()=>openFoodManager('meals');
  document.getElementById('manageSnacksBtn').onclick=()=>openFoodManager('snacks');
  document.getElementById('manageIngredientsBtn').onclick=()=>openFoodManager('ingredients');
  const showAllBtn = document.getElementById('showAllHistoryBtn');
  if(showAllBtn) showAllBtn.onclick = openHistoryModal;
  document.querySelectorAll('[data-history-day]').forEach(btn => {
    btn.onclick = () => setLogDateView(btn.dataset.historyDay);
  });
  document.querySelectorAll('[data-select-meal]').forEach(btn => {
    btn.onclick = async () => {
      const mealId = btn.dataset.selectMeal;
      if(mealId === 'custom'){
        const name = prompt('Custom meal name', log.manualMealName || 'Custom meal');
        if(name === null) return;
        const kcal = parseFloat(prompt('Custom meal calories', log.manualMealKcal || 0));
        if(Number.isFinite(kcal)) await setManualMeal(logDate, name.trim(), kcal);
        return;
      }
      if(log.mode==='meal' && log.mealId===mealId){
        await setLogMeal(logDate, '');
      } else {
        await setLogMode(logDate, 'meal');
        await setLogMeal(logDate, mealId);
      }
    };
  });
  document.querySelectorAll('[data-log-snack]').forEach(btn => {
    btn.onclick = () => addLogSnack(logDate, btn.dataset.logSnack, 1);
  });
  const resetSnacksBtn = document.getElementById('resetSnacksBtn');
  if(resetSnacksBtn) resetSnacksBtn.onclick = () => resetLogSnacks(logDate);
  setSaveStatus('ok');
}

function openFoodManager(tab='meals'){
  foodManagerTab = tab;
  transferModalOpen=true;
  const modal=document.getElementById('transferModal');
  modal.innerHTML=`
    <button class="drawer-close" id="foodMgrClose" aria-label="Close">×</button>
    <h2>${tab==='meals' ? 'Meals' : tab==='snacks' ? 'Snacks' : 'Ingredients'}</h2>
    <div class="subtitle">Keep your saved foods tidy. Use this panel to edit meals, snacks, and ingredients.</div>
    <div class="manager-group" style="display:${tab==='meals' ? 'flex' : 'none'};flex-direction:column;gap:0;">
      <button class="btn btn-primary btn-full" id="foodMgrAddMeal">＋ New meal</button>
      <input class="ing-search" id="foodMgrMealsSearch" type="search" placeholder="Search meals…" value="${escapeHtml(managerMealSearchTerm)}" />
      <div class="manager-list" id="foodMgrMeals"></div>
    </div>
    <div class="manager-group" style="display:${tab==='snacks' ? 'flex' : 'none'};flex-direction:column;gap:0;">
      <button class="btn btn-secondary btn-full" id="foodMgrAddSnack">＋ New snack</button>
      <input class="ing-search" id="foodMgrSnacksSearch" type="search" placeholder="Search snacks…" value="${escapeHtml(managerSnackSearchTerm)}" />
      <div class="manager-list" id="foodMgrSnacks"></div>
    </div>
    <div class="manager-group" style="display:${tab==='ingredients' ? 'flex' : 'none'};flex-direction:column;gap:0;">
      <button class="btn btn-secondary btn-full" id="foodMgrAddIngredient">＋ New ingredient</button>
      <input class="ing-search" id="foodMgrIngredientsSearch" type="search" placeholder="Search ingredients…" value="${escapeHtml(managerIngredientSearchTerm)}" />
      <div class="manager-list" id="foodMgrIngredients"></div>
    </div>`;
  document.getElementById('transferModalBackdrop').classList.add('open');
  const render=()=>{
    const mealsHost=document.getElementById('foodMgrMeals');
    const snacksHost=document.getElementById('foodMgrSnacks');
    const ingredientsHost=document.getElementById('foodMgrIngredients');
    if(!mealsHost || !snacksHost || !ingredientsHost) return;
    const mealTerm = managerMealSearchTerm.trim().toLowerCase();
    const snackTerm = managerSnackSearchTerm.trim().toLowerCase();
    const ingredientTerm = managerIngredientSearchTerm.trim().toLowerCase();
    const filteredMeals = mealTerm ? meals.filter(m => m.name.toLowerCase().includes(mealTerm)) : meals;
    const filteredSnacks = snackTerm ? snacks.filter(s => s.name.toLowerCase().includes(snackTerm)) : snacks;
    const filteredIngredients = ingredientTerm ? ingredients.filter(i => i.name.toLowerCase().includes(ingredientTerm)) : ingredients;
    mealsHost.innerHTML=(mealTerm ? `<div class="ing-search-note">${filteredMeals.length} of ${meals.length} meals shown.</div>` : '') +
      (filteredMeals.length
        ? filteredMeals.map(m=>`<button class="manager-item" data-manager-meal="${m.id}"><span><strong>${escapeHtml(m.name)}</strong><small>${mealKcal(m).toLocaleString()} kcal · ${m.items.length} ingredient${m.items.length===1?'':'s'}</small></span><span>›</span></button>`).join('')
        : '<div class="empty-note">No meals match that search.</div>');
    snacksHost.innerHTML=(snackTerm ? `<div class="ing-search-note">${filteredSnacks.length} of ${snacks.length} snacks shown.</div>` : '') +
      (filteredSnacks.length
        ? filteredSnacks.map(s=>`<button class="manager-item manager-snack-edit" data-manager-edit-snack="${s.id}"><span><strong>${escapeHtml(s.name)}</strong><small>${s.kcal} kcal</small></span><span>›</span></button>`).join('')
        : '<div class="empty-note">No snacks match that search.</div>');
    ingredientsHost.innerHTML=(ingredientTerm ? `<div class="ing-search-note">${filteredIngredients.length} of ${ingredients.length} ingredients shown.</div>` : '') +
      (filteredIngredients.length
        ? filteredIngredients.map(i=>`<button class="manager-item" data-manager-ingredient="${i.id}"><span><strong>${escapeHtml(i.name)}</strong><small>${i.kcal} kcal ${i.unit==='g'?'/ 100g':'/ item'}</small></span><span>›</span></button>`).join('')
        : '<div class="empty-note">No ingredients match that search.</div>');
    document.querySelectorAll('[data-manager-meal]').forEach(b=>b.onclick=()=>openMealEditor(b.dataset.managerMeal));
    document.querySelectorAll('[data-manager-edit-snack]').forEach(b=>b.onclick=()=>openSnackEditor(b.dataset.managerEditSnack));
    document.querySelectorAll('[data-manager-ingredient]').forEach(b=>b.onclick=()=>{closeTransferModal();openIngredientEditor(b.dataset.managerIngredient,'foodManager');});
  };
  document.getElementById('foodMgrClose').onclick=closeTransferModal;
  document.getElementById('foodMgrAddMeal').onclick=()=>openMealEditor();
  document.getElementById('foodMgrAddIngredient').onclick=()=>{closeTransferModal();openIngredientEditor(undefined,'foodManager');};
  const mealsSearchInput = document.getElementById('foodMgrMealsSearch');
  if(mealsSearchInput){ mealsSearchInput.addEventListener('input', e => { managerMealSearchTerm = e.target.value; render(); }); }
  const snacksSearchInput = document.getElementById('foodMgrSnacksSearch');
  if(snacksSearchInput){ snacksSearchInput.addEventListener('input', e => { managerSnackSearchTerm = e.target.value; render(); }); }
  const ingredientsSearchInput = document.getElementById('foodMgrIngredientsSearch');
  if(ingredientsSearchInput){ ingredientsSearchInput.addEventListener('input', e => { managerIngredientSearchTerm = e.target.value; render(); }); }
  document.getElementById('foodMgrAddSnack').onclick=()=>{
    modal.innerHTML=`<button class="drawer-close" id="snackCreateClose" aria-label="Close">×</button><h2>New snack</h2><div class="auth-field"><label>Name</label><input id="newSnackMgrName" placeholder="e.g. Apple"></div><div class="auth-field"><label>Calories</label><input id="newSnackMgrKcal" type="number" min="0" step="1" placeholder="95"></div><button class="btn btn-primary primary-wide" id="saveNewSnackMgr">Add snack</button>`;
    document.getElementById('snackCreateClose').onclick=()=>openFoodManager(foodManagerTab);
    document.getElementById('saveNewSnackMgr').onclick=async()=>{
      const name=document.getElementById('newSnackMgrName').value.trim();
      const kcal=parseFloat(document.getElementById('newSnackMgrKcal').value);
      if(!name || !Number.isFinite(kcal) || kcal<0) return;
      await addSnack(name,kcal);
      openFoodManager(foodManagerTab);
    };
  };
  render();
}

function openSnackEditor(editId){
  const snack=snacks.find(s=>s.id===editId);
  if(!snack) return;
  transferModalOpen=true;
  const modal=document.getElementById('transferModal');
  modal.innerHTML=`<button class="drawer-close" id="snackEditClose" aria-label="Close">×</button><h2>Edit snack</h2><div class="subtitle">Update this saved snack.</div><div class="auth-field"><label>Name</label><input id="editSnackName" value="${escapeHtml(snack.name)}"></div><div class="auth-field"><label>Calories</label><input id="editSnackKcal" type="number" min="0" step="1" value="${snack.kcal}"></div><button class="btn btn-primary primary-wide" id="saveSnackEdit">Save changes</button><button class="btn btn-secondary primary-wide" id="deleteSnackEdit" style="margin-top:8px;">Delete snack</button>`;
  document.getElementById('transferModalBackdrop').classList.add('open');
  document.getElementById('snackEditClose').onclick=()=>openFoodManager(foodManagerTab);
  document.getElementById('saveSnackEdit').onclick=async()=>{
    const name=document.getElementById('editSnackName').value.trim();
    const kcal=parseFloat(document.getElementById('editSnackKcal').value);
    if(!name || !Number.isFinite(kcal) || kcal<0) return;
    snack.name=name; snack.kcal=Math.round(kcal);
    await saveData(); renderApp(); openFoodManager(foodManagerTab);
  };
  document.getElementById('deleteSnackEdit').onclick=async()=>{
    showConfirmModal({
      title:'Delete snack',
      message:`Delete "${snack.name}"?`,
      okLabel:'Delete snack',
      onConfirm: async () => {
        snacks=snacks.filter(s=>s.id!==snack.id);
        await saveData(); renderApp(); closeTransferModal();
      }
    });
  };
}

function openSettingsModal(){
  transferModalOpen=true;
  const modal=document.getElementById('transferModal');
  modal.innerHTML=`<button class="drawer-close" id="settingsClose" aria-label="Close">×</button><h2>Settings</h2><div class="subtitle">A couple of account and app settings.</div><div class="section-label">Daily maintenance</div><div class="settings-row"><label>Calories</label><input id="settingsMaintenanceInput" type="number" min="1" step="10" value="${maintenanceCal}"></div><button class="btn btn-primary primary-wide" id="settingsSave">Save settings</button><button class="btn btn-secondary primary-wide" id="transferDataBtn" style="margin-top:10px;">Import / export data</button><button class="btn btn-secondary primary-wide" id="signOutBtnInSettings" style="margin-top:10px;">Log out</button>`;
  document.getElementById('transferModalBackdrop').classList.add('open');
  document.getElementById('settingsClose').onclick=closeTransferModal;
  document.getElementById('settingsSave').onclick=async()=>{await updateMaintenance(document.getElementById('settingsMaintenanceInput').value);closeTransferModal();};
  document.getElementById('transferDataBtn').onclick=()=>{closeTransferModal();openTransferModal();};
  document.getElementById('signOutBtnInSettings').onclick=async()=>{closeTransferModal(); await signOut();};
}
