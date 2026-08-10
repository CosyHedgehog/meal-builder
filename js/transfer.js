/**
 * Export/import of all app data as JSON (download, paste, or file
 * upload), rendered inside the transfer modal.
 */

/* ===================== Export / Import ===================== */
function openTransferModal(){
  transferModalOpen = true;
  renderTransferModal();
  document.getElementById('transferModalBackdrop').classList.add('open');
}
function closeTransferModal(){
  transferModalOpen = false;
  document.getElementById('transferModalBackdrop').classList.remove('open');
}

function currentExportJSON(){
  return JSON.stringify({ingredients, meals, snacks, logs, maintenanceCal}, null, 2);
}

function downloadExport(){
  const blob = new Blob([currentExportJSON()], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'meal-builder-export.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

async function importFromText(text, msgEl){
  try{
    const parsed = JSON.parse(text);
    if(!Array.isArray(parsed.ingredients) || !Array.isArray(parsed.meals)){
      throw new Error('File is missing an ingredients or meals list.');
    }
    ingredients = parsed.ingredients;
    meals = parsed.meals;
    snacks = Array.isArray(parsed.snacks) ? parsed.snacks : [];
    logs = (parsed.logs && typeof parsed.logs === 'object') ? parsed.logs : {};
    maintenanceCal = parsed.maintenanceCal || DEFAULT_MAINTENANCE;
    await saveData();
    renderApp();
    if(msgEl){ msgEl.textContent = `Imported ${meals.length} meals, ${ingredients.length} ingredients and ${snacks.length} snacks.`; msgEl.className = 'import-msg ok'; }
  } catch(e){
    console.error(e);
    if(msgEl){ msgEl.textContent = 'Could not import that file — check it\'s a Meal Builder export.'; msgEl.className = 'import-msg err'; }
  }
}

function renderTransferModal(){
  const modal = document.getElementById('transferModal');
  if(!transferModalOpen){ modal.innerHTML = ''; return; }
  modal.innerHTML = `
    <button class="drawer-close" id="transferCloseBtn" aria-label="Close" style="position:absolute;top:18px;right:18px;">×</button>
    <h2>Export &amp; import</h2>
    <div class="subtitle">Move your meals and ingredients to another device, or back them up.</div>

    <div class="section-label" style="margin-top:18px;">Export</div>
    <button class="btn btn-primary" id="downloadBtn">Download .json file</button>
    <textarea class="export-textarea" id="exportText" readonly>${escapeHtml(currentExportJSON())}</textarea>
    <div class="subtitle" style="margin-top:4px;">Or select the text above and copy it directly.</div>

    <div class="section-label">Import</div>
    <div class="import-row">
      <label class="file-label">
        Choose a .json file
        <input type="file" accept="application/json,.json" id="importFile" style="display:none;">
      </label>
      <button class="btn btn-secondary" id="importPasteBtn">Paste JSON instead</button>
    </div>
    <textarea class="export-textarea" id="importText" style="display:none;" placeholder="Paste exported JSON here"></textarea>
    <button class="btn btn-primary" id="importPasteConfirm" style="display:none;margin-top:8px;">Import pasted data</button>
    <div class="import-msg" id="importMsg"></div>

    <div class="modal-footer">
      <span class="subtitle" style="margin:0;">Importing replaces everything currently saved.</span>
      <button class="btn btn-secondary" id="transferDoneBtn">Done</button>
    </div>
  `;

  document.getElementById('transferCloseBtn').addEventListener('click', closeTransferModal);
  document.getElementById('transferDoneBtn').addEventListener('click', closeTransferModal);
  document.getElementById('downloadBtn').addEventListener('click', downloadExport);

  document.getElementById('importFile').addEventListener('change', e => {
    const file = e.target.files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = () => importFromText(reader.result, document.getElementById('importMsg'));
    reader.readAsText(file);
  });

  document.getElementById('importPasteBtn').addEventListener('click', () => {
    document.getElementById('importText').style.display = 'block';
    document.getElementById('importPasteConfirm').style.display = 'inline-flex';
  });
  document.getElementById('importPasteConfirm').addEventListener('click', () => {
    const text = document.getElementById('importText').value;
    importFromText(text, document.getElementById('importMsg'));
  });
}

document.getElementById('transferModalBackdrop').addEventListener('click', e => {
  if(e.target.id === 'transferModalBackdrop') closeTransferModal();
});
