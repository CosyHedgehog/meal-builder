/**
 * Small pure helper functions: ids, date formatting/parsing, calorie
 * math, colour helpers and HTML escaping.
 */

function uid(prefix){ return prefix + '-' + Math.random().toString(36).slice(2,9); }

/* ---- Date helpers (all local-time, avoid UTC shift) ---- */
function formatDateISO(d){
  const y = d.getFullYear();
  const m = String(d.getMonth()+1).padStart(2,'0');
  const day = String(d.getDate()).padStart(2,'0');
  return `${y}-${m}-${day}`;
}
function todayStr(){ return formatDateISO(new Date()); }
function parseISODate(ds){
  const [y,m,d] = ds.split('-').map(Number);
  return new Date(y, m-1, d);
}
function shiftDateStr(ds, days){
  const d = parseISODate(ds);
  d.setDate(d.getDate()+days);
  return formatDateISO(d);
}
function prettyDate(ds){
  const d = parseISODate(ds);
  return d.toLocaleDateString(undefined, {weekday:'short', day:'numeric', month:'short', year:'numeric'});
}
function shortDate(ds){
  const d = parseISODate(ds);
  return d.toLocaleDateString(undefined, {day:'numeric', month:'short'});
}

function getIngredient(id){ return ingredients.find(i => i.id === id); }

function itemKcal(item){
  const ing = getIngredient(item.ingredientId);
  if(!ing) return 0;
  return ing.unit === 'g' ? (item.amount/100)*ing.kcal : item.amount*ing.kcal;
}

function mealKcal(meal){
  return Math.round(meal.items.reduce((sum,it) => sum + itemKcal(it), 0));
}

function kcalColor(kcal){
  const cap = maintenanceCal > 0 ? maintenanceCal : 1800;
  const pct = cap > 0 ? kcal / cap : 0;
  if(pct < 0.5) return {solid:'var(--green)', soft:'var(--green-soft)'};
  if(pct < 0.6) return {solid:'var(--orange)', soft:'var(--orange-soft)'};
  return {solid:'var(--red)', soft:'var(--red-soft)'};
}

function historyHeatColor(deficit, max){
  if(!Number.isFinite(deficit) || max <= 0) return 'var(--surface-alt)';
  const intensity = Math.min(1, Math.abs(deficit) / max);
  const greenShades = ['#edf6ec','#d7ebd7','#bde1bc','#8fcf8d','#5c9f5b'];
  const redShades = ['#f9e5e1','#f3c7be','#eb9b8f','#e16661','#b63d38'];
  const idx = Math.min(greenShades.length - 1, Math.floor(intensity * greenShades.length));
  return deficit >= 0 ? greenShades[idx] : redShades[idx];
}

function dialHTML(kcal, big){
  const cap = maintenanceCal > 0 ? maintenanceCal : 1800;
  const pct = Math.max(0, Math.min(1, kcal/cap));
  const deg = Math.round(pct*360);
  const c = kcalColor(kcal);
  const cls = big ? 'dial drawer-dial' : 'dial';
  return `<div class="${cls}" style="background:conic-gradient(${c.solid} ${deg}deg, var(--surface-alt) ${deg}deg)">
    <div class="dial-inner">
      <div class="dial-kcal" style="color:${c.solid}">${kcal.toLocaleString()}</div>
      <div class="dial-kcal-label">kcal</div>
    </div>
  </div>`;
}

function escapeHtml(s){
  return String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}

/* ===================== Render: single-page home ===================== */
function getHistoryDaysForViewport(){
  return window.innerWidth <= 480 ? 7 : 14;
}

