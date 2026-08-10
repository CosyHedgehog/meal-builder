/**
 * Daily log data model: reading/writing a day's log entry and
 * computing calorie totals/history.
 */

/* ===================== Daily log: data + compute ===================== */
function getLog(dateStr){
  return logs[dateStr] || defaultLogEntry();
}
function ensureLog(dateStr){
  if(!logs[dateStr]) logs[dateStr] = defaultLogEntry();
  return logs[dateStr];
}

function logMealKcal(log){
  if(log.mode === 'custom') return Math.round(log.manualMealKcal || 0);
  const meal = meals.find(m => m.id === log.mealId);
  if(!meal) return 0;
  return Math.round(mealKcal(meal) * (log.mealServings || 1));
}
function logSnacksKcal(log){
  return Math.round((log.snacks || []).reduce((sum, e) => {
    const snack = snacks.find(s => s.id === e.snackId);
    return sum + (snack ? snack.kcal * e.qty : 0);
  }, 0));
}
function logTotalKcal(log){ return logMealKcal(log) + logSnacksKcal(log); }
function logDeficit(log){ return maintenanceCal - logTotalKcal(log); }
function logHasEntries(log){ return !!log && (log.mode === 'custom' ? (log.manualMealKcal > 0 || !!log.manualMealName) : !!log.mealId) || (log && log.snacks && log.snacks.length > 0); }

/* ===================== Daily log: mutators ===================== */
function refreshLog(){
  renderApp();
}
async function setLogMode(dateStr, mode){
  const log = ensureLog(dateStr);
  log.mode = mode;
  await saveData();
  refreshLog();
}
async function setLogMeal(dateStr, mealId){
  const log = ensureLog(dateStr);
  log.mealId = mealId || null;
  await saveData();
  refreshLog();
}
async function setLogMealServings(dateStr, servings){
  const log = ensureLog(dateStr);
  log.mealServings = isNaN(servings) || servings <= 0 ? 1 : servings;
  await saveData();
  refreshLog();
}
async function setManualMeal(dateStr, name, kcal){
  const log = ensureLog(dateStr);
  log.manualMealName = name;
  log.manualMealKcal = isNaN(kcal) ? 0 : kcal;
  await saveData();
  refreshLog();
}
async function addLogSnack(dateStr, snackId, qty){
  if(!snackId) return;
  const log = ensureLog(dateStr);
  const q = (isNaN(qty) || qty <= 0) ? 1 : qty;
  const existing = log.snacks.find(e => e.snackId === snackId);
  if(existing) existing.qty += q;
  else log.snacks.push({snackId, qty: q});
  await saveData();
  refreshLog();
}
async function resetLogSnacks(dateStr){
  const log = ensureLog(dateStr);
  if(!log.snacks || !log.snacks.length) return;
  log.snacks = [];
  await saveData();
  refreshLog();
}
async function updateLogSnackQty(dateStr, snackId, qty){
  const log = ensureLog(dateStr);
  const entry = log.snacks.find(e => e.snackId === snackId);
  if(entry){
    entry.qty = isNaN(qty) || qty <= 0 ? entry.qty : qty;
    await saveData();
    refreshLog();
  }
}
async function removeLogSnack(dateStr, snackId){
  const log = ensureLog(dateStr);
  log.snacks = log.snacks.filter(e => e.snackId !== snackId);
  await saveData();
  refreshLog();
}
async function clearLogDay(dateStr){
  showConfirmModal({
    title:'Clear day',
    message:'Clear everything logged for this day?',
    okLabel:'Clear day',
    onConfirm: async () => {
      delete logs[dateStr];
      await saveData();
      refreshLog();
    }
  });
}
async function setLogDateView(dateStr){
  logDate = dateStr;
  renderApp();
}

/* ===================== Daily log: render (main tab) ===================== */
function computeHistory(days){
  const arr = [];
  for(let i = days - 1; i >= 0; i--){
    const ds = shiftDateStr(todayStr(), -i);
    const log = logs[ds];
    const has = logHasEntries(log);
    arr.push({date: ds, total: log ? logTotalKcal(log) : 0, deficit: log ? logDeficit(log) : 0, hasLog: has});
  }
  return arr;
}

