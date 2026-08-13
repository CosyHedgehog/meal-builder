import { reactive } from 'vue'
import { dataApi } from './api.js'

function uid(prefix) {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`
}

export const DEFAULT_MAINTENANCE = 2200

const DEFAULT_SNACKS = [
  { id: 'snack-apple', name: 'Apple', kcal: 95 },
  { id: 'snack-banana', name: 'Banana', kcal: 105 },
  { id: 'snack-orange', name: 'Orange', kcal: 62 },
  { id: 'snack-sardines', name: 'Sardines (tin)', kcal: 220 },
]

export const state = reactive({
  ingredients: [],
  meals: [],
  snacks: [],
  logs: {}, // 'YYYY-MM-DD' -> log entry
  maintenanceCal: DEFAULT_MAINTENANCE,
  showKcal: true,
  loaded: false,
  saveState: 'idle', // idle | saving | ok | error
})

export function defaultLogEntry() {
  return {
    mode: 'meal', // 'meal' | 'custom'
    mealId: null,
    mealServings: 1,
    manualMealName: '',
    manualMealKcal: 0,
    snacks: [],
  }
}

/* ===================== Persistence ===================== */

export function snapshot() {
  return {
    ingredients: state.ingredients,
    meals: state.meals,
    snacks: state.snacks,
    logs: state.logs,
    maintenanceCal: state.maintenanceCal,
    showKcal: state.showKcal,
  }
}

function applyDefaults() {
  state.ingredients = []
  state.meals = []
  state.snacks = DEFAULT_SNACKS.map((s) => ({ ...s }))
  state.logs = {}
  state.maintenanceCal = DEFAULT_MAINTENANCE
  state.showKcal = true
}

export async function loadData() {
  try {
    const result = await dataApi.load()
    const parsed = result.data || {}
    state.ingredients = Array.isArray(parsed.ingredients) ? parsed.ingredients : []
    state.meals = Array.isArray(parsed.meals) ? parsed.meals : []
    state.snacks = Array.isArray(parsed.snacks)
      ? parsed.snacks
      : DEFAULT_SNACKS.map((s) => ({ ...s }))
    state.logs = parsed.logs && typeof parsed.logs === 'object' ? parsed.logs : {}
    state.maintenanceCal = parsed.maintenanceCal || DEFAULT_MAINTENANCE
    state.showKcal = parsed.showKcal !== false
  } catch (e) {
    console.error('Load failed', e)
    applyDefaults()
  }
  state.loaded = true
}

export function resetData() {
  applyDefaults()
  state.loaded = false
}

let saveTimer = null

/** Debounced write-through save. Every mutator calls this. */
export function save() {
  if (!state.loaded) return
  clearTimeout(saveTimer)
  saveTimer = setTimeout(flushSave, 300)
}

export async function flushSave() {
  clearTimeout(saveTimer)
  if (!state.loaded) return
  state.saveState = 'saving'
  try {
    await dataApi.save(snapshot())
    state.saveState = 'ok'
  } catch (e) {
    console.error('Save failed', e)
    state.saveState = 'error'
  }
}

/* ===================== Selectors ===================== */

export function getIngredient(id) {
  return state.ingredients.find((i) => i.id === id)
}

export function itemKcal(item) {
  const ing = getIngredient(item.ingredientId)
  if (!ing) return 0
  return ing.unit === 'g' ? (item.amount / 100) * ing.kcal : item.amount * ing.kcal
}

export function mealKcal(meal) {
  if (!meal) return 0
  return Math.round((meal.items || []).reduce((sum, it) => sum + itemKcal(it), 0))
}

export function getLog(dateStr) {
  return state.logs[dateStr] || defaultLogEntry()
}

export function ensureLog(dateStr) {
  if (!state.logs[dateStr]) state.logs[dateStr] = defaultLogEntry()
  return state.logs[dateStr]
}

export function logMealKcal(log) {
  if (!log) return 0
  if (log.mode === 'custom') return Math.round(log.manualMealKcal || 0)
  const meal = state.meals.find((m) => m.id === log.mealId)
  if (!meal) return 0
  return Math.round(mealKcal(meal) * (log.mealServings || 1))
}

export function logSnacksKcal(log) {
  if (!log) return 0
  return Math.round(
    (log.snacks || []).reduce((sum, e) => {
      if (e.custom) return sum + (e.kcal || 0) * e.qty
      const snack = state.snacks.find((s) => s.id === e.snackId)
      return sum + (snack ? snack.kcal * e.qty : 0)
    }, 0),
  )
}

export function logTotalKcal(log) {
  return logMealKcal(log) + logSnacksKcal(log)
}

export function logDeficit(log) {
  return state.maintenanceCal - logTotalKcal(log)
}

export function logHasEntries(log) {
  if (!log) return false
  const hasMeal =
    log.mode === 'custom' ? log.manualMealKcal > 0 || !!log.manualMealName : !!log.mealId
  return hasMeal || (log.snacks || []).length > 0
}

export function ingredientUsage(ingredientId) {
  return state.meals.filter((m) => (m.items || []).some((it) => it.ingredientId === ingredientId))
}

/* ===================== Settings ===================== */

export function setMaintenance(value) {
  const v = parseFloat(value)
  state.maintenanceCal = !Number.isFinite(v) || v <= 0 ? DEFAULT_MAINTENANCE : Math.round(v)
  save()
}

export function setShowKcal(value) {
  state.showKcal = !!value
  save()
}

/* ===================== Ordering ===================== */

export function reorderItems(listName, fromId, toId) {
  const list = state[listName]
  if (!list || !fromId || !toId || fromId === toId) return
  const fromIndex = list.findIndex((x) => x.id === fromId)
  const toIndex = list.findIndex((x) => x.id === toId)
  if (fromIndex === -1 || toIndex === -1) return
  const [moved] = list.splice(fromIndex, 1)
  list.splice(toIndex, 0, moved)
  save()
}

/* ===================== Meals ===================== */

export function createMeal(draft) {
  const meal = {
    id: uid('meal'),
    name: draft.name?.trim() || 'Untitled meal',
    items: (draft.items || []).map((it) => ({ ...it })),
  }
  state.meals.push(meal)
  save()
  return meal.id
}

export function updateMeal(id, draft) {
  const meal = state.meals.find((m) => m.id === id)
  if (!meal) return
  meal.name = draft.name?.trim() || 'Untitled meal'
  meal.items = (draft.items || []).map((it) => ({ ...it }))
  save()
}

export function deleteMeal(id) {
  state.meals = state.meals.filter((m) => m.id !== id)
  save()
}

/* ===================== Snacks ===================== */

export function addSnack(name, kcal) {
  if (!name || !name.trim()) return null
  const snack = {
    id: uid('snack'),
    name: name.trim(),
    kcal: Number.isFinite(kcal) ? Math.round(kcal) : 0,
  }
  state.snacks.push(snack)
  save()
  return snack.id
}

export function updateSnack(id, { name, kcal }) {
  const snack = state.snacks.find((s) => s.id === id)
  if (!snack) return
  if (name !== undefined) snack.name = name.trim() || snack.name
  if (kcal !== undefined && Number.isFinite(kcal)) snack.kcal = Math.round(kcal)
  save()
}

export function deleteSnack(id) {
  state.snacks = state.snacks.filter((s) => s.id !== id)
  // Also drop it from any logged day so totals stay honest.
  Object.values(state.logs).forEach((log) => {
    log.snacks = (log.snacks || []).filter((e) => e.snackId !== id)
  })
  save()
}

/* ===================== Ingredients ===================== */

export function addIngredient({ name, unit, kcal }) {
  if (!name || !name.trim()) return null
  const ingredient = {
    id: uid('ing'),
    name: name.trim(),
    unit: unit || 'g',
    kcal: Number.isFinite(kcal) ? kcal : 0,
  }
  state.ingredients.push(ingredient)
  save()
  return ingredient.id
}

export function updateIngredient(id, { name, unit, kcal }) {
  const ingredient = state.ingredients.find((i) => i.id === id)
  if (!ingredient) return
  ingredient.name = name.trim() || ingredient.name
  ingredient.unit = unit
  if (Number.isFinite(kcal)) ingredient.kcal = kcal
  save()
}

export function deleteIngredient(id) {
  state.ingredients = state.ingredients.filter((i) => i.id !== id)
  save()
}

/* ===================== Daily log mutators ===================== */

export function setLogMode(dateStr, mode) {
  ensureLog(dateStr).mode = mode
  save()
}

export function setLogMeal(dateStr, mealId) {
  ensureLog(dateStr).mealId = mealId || null
  save()
}

export function setManualMeal(dateStr, name, kcal) {
  const log = ensureLog(dateStr)
  log.manualMealName = name
  log.manualMealKcal = Number.isFinite(kcal) ? kcal : 0
  save()
}

export function addLogSnack(dateStr, snackId, qty = 1) {
  if (!snackId) return
  const log = ensureLog(dateStr)
  const q = !Number.isFinite(qty) || qty <= 0 ? 1 : qty
  const existing = log.snacks.find((e) => e.snackId === snackId)
  if (existing) existing.qty += q
  else log.snacks.push({ snackId, qty: q })
  save()
}

export function setLogSnackQty(dateStr, snackId, qty) {
  const log = ensureLog(dateStr)
  const entry = log.snacks.find((e) => e.snackId === snackId)
  if (!entry) return
  if (!Number.isFinite(qty) || qty <= 0) return
  entry.qty = qty
  save()
}

export function removeLogSnack(dateStr, snackId) {
  const log = ensureLog(dateStr)
  log.snacks = log.snacks.filter((e) => e.snackId !== snackId)
  save()
}

export function addCustomLogSnack(dateStr, name, kcal, qty = 1) {
  const log = ensureLog(dateStr)
  log.snacks.push({
    id: uid('logsnack'),
    custom: true,
    name: (name || 'Snack').trim() || 'Snack',
    kcal: !Number.isFinite(kcal) || kcal < 0 ? 0 : kcal,
    qty: !Number.isFinite(qty) || qty <= 0 ? 1 : qty,
  })
  save()
}

export function bumpCustomLogSnack(dateStr, id, delta) {
  const log = ensureLog(dateStr)
  const entry = log.snacks.find((e) => e.custom && e.id === id)
  if (!entry) return
  if (entry.qty + delta <= 0) {
    log.snacks = log.snacks.filter((e) => !(e.custom && e.id === id))
  } else {
    entry.qty += delta
  }
  save()
}

export function clearLogSnacks(dateStr) {
  const log = ensureLog(dateStr)
  if (!log.snacks?.length) return
  log.snacks = []
  save()
}