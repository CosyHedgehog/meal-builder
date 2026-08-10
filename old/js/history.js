/**
 * Full history modal - a heat-mapped grid of every logged day.
 */

function openHistoryModal(){
  historyModalOpen = true;
  renderHistoryModal();
  document.getElementById('historyModalBackdrop').classList.add('open');
}

function closeHistoryModal(){
  historyModalOpen = false;
  document.getElementById('historyModalBackdrop').classList.remove('open');
}

function renderHistoryModal(){
  const modal = document.getElementById('historyModal');
  if(!historyModalOpen){ modal.innerHTML = ''; return; }
  // Build list of all logged days; if none, fall back to last 90 days
  let histAll = [];
  const logDates = Object.keys(logs || {}).sort();
  if(logDates.length){
    histAll = logDates.map(ds => { const log = logs[ds]; return {date: ds, total: log ? logTotalKcal(log) : 0, deficit: log ? logDeficit(log) : 0, hasLog: logHasEntries(log)}; });
  } else {
    histAll = computeHistory(90);
  }
  const maxAll = Math.max(100,...histAll.map(h=>Math.abs(h.deficit)));
  modal.innerHTML = `
    <button class="drawer-close" id="historyCloseBtn" aria-label="Close" style="position:absolute;top:18px;right:18px;">×</button>
    <h2>Full history</h2>
    <div class="subtitle">Last ${histAll.length} days</div>
    <div style="display:grid;grid-template-columns:repeat(12,1fr);gap:8px;margin-top:14px;max-height:60vh;overflow:auto;">
      ${histAll.map(h=>{const color = h.hasLog?historyHeatColor(h.deficit,maxAll):'var(--surface-alt)';const label = h.hasLog?`${prettyDate(h.date)}: ${h.deficit>=0?`${h.deficit} deficit`:`${Math.abs(h.deficit)} surplus`}`:'Not logged'; const v = h.hasLog?(h.deficit>=0?`${h.deficit}`:`-${Math.abs(h.deficit)}`):''; return `<div style="padding:10px;border-radius:8px;background:${color};text-align:center;border:1px solid var(--line);">${v}<div style="font-size:10px;color:var(--ink-muted);margin-top:6px;">${parseISODate(h.date).toLocaleDateString()}</div></div>`}).join('')}
    </div>
  `;
  document.getElementById('historyCloseBtn').addEventListener('click', closeHistoryModal);
}

document.getElementById('historyModalBackdrop').addEventListener('click', e => { if(e.target.id === 'historyModalBackdrop') closeHistoryModal(); });

