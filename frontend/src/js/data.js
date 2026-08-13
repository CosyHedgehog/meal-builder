import { reactive } from 'vue'
import { dataApi } from './api.js'

function uid(prefix) {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`
}

export const DEFAULT_MAINTENANCE = 2200
export const DEFAULT_WEIGHT_UNIT = 'kg'

/* ===================== Groups ===================== */

// Fixed ids so migrated data and future logic can reference them directly.
export const BREAKFAST_GROUP_ID = 'group-breakfast'
export const LUNCH_GROUP_ID = 'group-lunch'
export const DINNER_GROUP_ID = 'group-dinner'
export const SNACKS_GROUP_ID = 'group-snacks'
// Foods land here when their group is deleted. Never shown on the dashboard.
export const UNCATEGORIZED_GROUP_ID = 'group-uncategorized'

function defaultGroups() {
  return [
    { id: BREAKFAST_GROUP_ID, name: 'Breakfast' },
    { id: LUNCH_GROUP_ID, name: 'Lunch' },
    { id: DINNER_GROUP_ID, name: 'Dinner' },
    { id: SNACKS_GROUP_ID, name: 'Snacks' },
  ]
}

export const state = reactive({
  ingredients: [],
  foods: [],
  groups: [],
  logs: {}, // 'YYYY-MM-DD' -> { entries: [...] }
  maintenanceCal: DEFAULT_MAINTENANCE,
  showKcal: true,
  weightUnit: DEFAULT_WEIGHT_UNIT,
  loaded: false,
  saveState: 'idle', // idle | saving | ok | error
})

export function defaultLogEntry() {
  return {
    entries: [],
  }
}

/* ===================== Legacy migration ===================== */

/** True if the loaded payload still uses the old meals/snacks shape. */
function isLegacyPayload(parsed) {
  return Array.isArray(parsed.meals) || Array.isArray(parsed.snacks)
}

function hasRecoverableLegacyData(parsed) {
  return isLegacyPayload(parsed) && (parsed.meals?.length || parsed.snacks?.length)
}

function hasNewData(parsed) {
  return Array.isArray(parsed.foods) || Array.isArray(parsed.groups)
}

/**
 * Converts the old { meals, snacks, logs.mode/mealId/snacks[] } shape into
 * the new { ingredients, foods, groups, logs.entries[] } shape. Legacy
 * snacks (flat kcal, no ingredients) become foods backed by a synthetic
 * ingredient carrying their kcal, so every food stays ingredient-based.
 */
function migrateLegacyPayload(parsed) {
  const ingredients = Array.isArray(parsed.ingredients) ? [...parsed.ingredients] : []
  const foods = []

  const legacyMeals = Array.isArray(parsed.meals) ? parsed.meals : []
  legacyMeals.forEach((meal) => {
    foods.push({
      id: meal.id || uid('food'),
      name: meal.name || 'Untitled meal',
      items: (meal.items || []).map((it) => ({ ...it })),
      groupId: DINNER_GROUP_ID,
    })
  })

  const legacySnacks = Array.isArray(parsed.snacks) ? parsed.snacks : []
  legacySnacks.forEach((snack) => {
    const ingredientId = uid('ing')
    ingredients.push({
      id: ingredientId,
      name: snack.name || 'Snack',
      unit: 'each',
      kcal: Number.isFinite(snack.kcal) ? snack.kcal : 0,
    })
    foods.push({
      id: snack.id || uid('food'),
      name: snack.name || 'Snack',
      items: [{ ingredientId, amount: 1 }],
      groupId: SNACKS_GROUP_ID,
    })
  })

  const legacyLogs = parsed.logs && typeof parsed.logs === 'object' ? parsed.logs : {}
  const logs = {}
  Object.entries(legacyLogs).forEach(([dateStr, legacyLog]) => {
    const entries = []

    if (legacyLog.mode === 'custom') {
      if (legacyLog.manualMealKcal > 0 || legacyLog.manualMealName) {
        entries.push({
          id: uid('entry'),
          groupId: DINNER_GROUP_ID,
          foodId: null,
          name: legacyLog.manualMealName || 'Custom',
          kcal: Number.isFinite(legacyLog.manualMealKcal) ? legacyLog.manualMealKcal : 0,
          qty: 1,
        })
      }
    } else if (legacyLog.mealId) {
      entries.push({
        id: uid('entry'),
        groupId: DINNER_GROUP_ID,
        foodId: legacyLog.mealId,
        qty:
          Number.isFinite(legacyLog.mealServings) && legacyLog.mealServings > 0
            ? legacyLog.mealServings
            : 1,
      })
    }

    ;(legacyLog.snacks || []).forEach((snackEntry) => {
      if (snackEntry.custom) {
        entries.push({
          id: snackEntry.id || uid('entry'),
          groupId: SNACKS_GROUP_ID,
          foodId: null,
          name: snackEntry.name || 'Snack',
          kcal: Number.isFinite(snackEntry.kcal) ? snackEntry.kcal : 0,
          qty: Number.isFinite(snackEntry.qty) && snackEntry.qty > 0 ? snackEntry.qty : 1,
        })
      } else {
        entries.push({
          id: uid('entry'),
          groupId: SNACKS_GROUP_ID,
          foodId: snackEntry.snackId,
          qty: Number.isFinite(snackEntry.qty) && snackEntry.qty > 0 ? snackEntry.qty : 1,
        })
      }
    })

    logs[dateStr] = { entries }
  })

  return {
    ingredients,
    foods,
    groups: defaultGroups(),
    logs,
    maintenanceCal: parsed.maintenanceCal || DEFAULT_MAINTENANCE,
    showKcal: parsed.showKcal !== false,
    weightUnit: parsed.weightUnit === 'lb' ? 'lb' : DEFAULT_WEIGHT_UNIT,
  }
}

/* ===================== Persistence ===================== */

export function snapshot() {
  return {
    ingredients: state.ingredients,
    foods: state.foods,
    groups: state.groups,
    logs: state.logs,
    maintenanceCal: state.maintenanceCal,
    showKcal: state.showKcal,
    weightUnit: state.weightUnit,
  }
}

function applyDefaults() {
  state.ingredients = []
  state.foods = []
  state.groups = defaultGroups()
  state.logs = {}
  state.maintenanceCal = DEFAULT_MAINTENANCE
  state.showKcal = true
  state.weightUnit = DEFAULT_WEIGHT_UNIT
}

export async function loadData() {
  try {
    const result = await dataApi.load()
    const parsed = result.data || {}
    const normalized = hasRecoverableLegacyData(parsed) ? migrateLegacyPayload(parsed) : parsed

    state.ingredients = Array.isArray(normalized.ingredients) ? normalized.ingredients : []
    state.foods = Array.isArray(normalized.foods) ? normalized.foods : []
    state.groups =
      Array.isArray(normalized.groups) && normalized.groups.length
        ? normalized.groups
        : defaultGroups()
    state.logs = normalized.logs && typeof normalized.logs === 'object' ? normalized.logs : {}
    Object.values(state.logs).forEach((log) => {
      if (Array.isArray(log?.entries)) log.entries = log.entries.map(normalizeLogEntry).filter(Boolean)
    })
    state.maintenanceCal = normalized.maintenanceCal || DEFAULT_MAINTENANCE
    state.showKcal = normalized.showKcal !== false
    state.weightUnit = normalized.weightUnit === 'lb' ? 'lb' : DEFAULT_WEIGHT_UNIT

    // Persist normalized logs so stale food group IDs are repaired permanently.
    state.loaded = true
    await flushSave()
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

export function getFood(id) {
  return state.foods.find((f) => f.id === id)
}

export function foodKcal(food) {
  if (!food) return 0
  return Math.round((food.items || []).reduce((sum, it) => sum + itemKcal(it), 0))
}

export function visibleGroups() {
  return state.groups.filter((g) => g.id !== UNCATEGORIZED_GROUP_ID)
}

export function foodsInGroup(groupId) {
  return state.foods.filter((f) => f.groupId === groupId)
}

export function getLog(dateStr) {
  return state.logs[dateStr] || defaultLogEntry()
}

export function ensureLog(dateStr) {
  if (!state.logs[dateStr]) state.logs[dateStr] = defaultLogEntry()
  return state.logs[dateStr]
}

export function logEntries(log) {
  return (log && log.entries) || []
}

function isValidLogEntry(entry) {
  return !entry.foodId || !!getFood(entry.foodId)
}

function normalizeLogEntry(entry) {
  if (entry.foodId) {
    const food = getFood(entry.foodId)
    if (!food) return null
    entry.groupId = food.groupId
  }
  return entry
}

export function entryKcal(entry) {
  if (!entry || !isValidLogEntry(entry)) return 0
  const qty = Number.isFinite(entry.qty) && entry.qty > 0 ? entry.qty : 1
  if (entry.foodId) return Math.round(foodKcal(getFood(entry.foodId)) * qty)
  return Math.round((entry.kcal || 0) * qty)
}

export function logTotalKcal(log) {
  return logEntries(log).reduce((sum, entry) => sum + entryKcal(entry), 0)
}

export function logGroupKcal(log, groupId) {
  return logEntries(log)
    .filter((entry) => entry.groupId === groupId)
    .reduce((sum, entry) => sum + entryKcal(entry), 0)
}

export function logDeficit(log) {
  return state.maintenanceCal - logTotalKcal(log)
}

export function logHasEntries(log) {
  return logEntries(log).length > 0
}

export function ingredientUsage(ingredientId) {
  return state.foods.filter((f) => (f.items || []).some((it) => it.ingredientId === ingredientId))
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

export function setWeightUnit(value) {
  state.weightUnit = value === 'lb' ? 'lb' : DEFAULT_WEIGHT_UNIT
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

/* ===================== Groups ===================== */

export function createGroup(name) {
  if (!name || !name.trim()) return null
  const group = { id: uid('group'), name: name.trim() }
  state.groups.push(group)
  save()
  return group.id
}

export function updateGroup(id, name) {
  const group = state.groups.find((g) => g.id === id)
  if (!group) return
  group.name = name?.trim() || group.name
  save()
}

/** Reassigns foods and log entries pointing at this group to "uncategorized" instead of deleting them. */
export function deleteGroup(id) {
  if (id === UNCATEGORIZED_GROUP_ID) return
  state.groups = state.groups.filter((g) => g.id !== id)
  state.foods.forEach((food) => {
    if (food.groupId === id) food.groupId = UNCATEGORIZED_GROUP_ID
  })
  Object.values(state.logs).forEach((log) => {
    logEntries(log).forEach((entry) => {
      if (entry.groupId === id) entry.groupId = UNCATEGORIZED_GROUP_ID
    })
  })
  save()
}

/* ===================== Foods ===================== */

export function createFood(draft) {
  const food = {
    id: uid('food'),
    name: draft.name?.trim() || 'Untitled food',
    items: (draft.items || []).map((it) => ({ ...it })),
    groupId: draft.groupId || UNCATEGORIZED_GROUP_ID,
  }
  state.foods.push(food)
  save()
  return food.id
}

export function updateFood(id, draft) {
  const food = state.foods.find((f) => f.id === id)
  if (!food) return
  const previousGroupId = food.groupId
  food.name = draft.name?.trim() || 'Untitled food'
  food.items = (draft.items || []).map((it) => ({ ...it }))
  if (draft.groupId) food.groupId = draft.groupId
  if (food.groupId !== previousGroupId) {
    Object.values(state.logs).forEach((log) => {
      logEntries(log).forEach((entry) => {
        if (entry.foodId === id && entry.groupId === previousGroupId) entry.groupId = food.groupId
      })
    })
  }
  save()
}

export function deleteFood(id) {
  state.foods = state.foods.filter((f) => f.id !== id)
  // Also drop it from any logged day so totals stay honest.
  Object.values(state.logs).forEach((log) => {
    log.entries = logEntries(log).filter((e) => e.foodId !== id)
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

/** Adds qty to the matching food entry for that group, or creates one. */
export function addLogFood(dateStr, groupId, foodId, qty = 1) {
  if (!foodId) return
  const log = ensureLog(dateStr)
  const q = !Number.isFinite(qty) || qty <= 0 ? 1 : qty
  const existing = log.entries.find((e) => e.groupId === groupId && e.foodId === foodId)
  if (existing) existing.qty += q
  else log.entries.push({ id: uid('entry'), groupId, foodId, qty: q })
  save()
}

export function setLogEntryQty(dateStr, entryId, qty) {
  const log = ensureLog(dateStr)
  const entry = log.entries.find((e) => e.id === entryId)
  if (!entry) return
  if (!Number.isFinite(qty) || qty <= 0) return
  entry.qty = qty
  save()
}

export function bumpLogEntry(dateStr, entryId, delta) {
  const log = ensureLog(dateStr)
  const entry = log.entries.find((e) => e.id === entryId)
  if (!entry) return
  if (entry.qty + delta <= 0) {
    log.entries = log.entries.filter((e) => e.id !== entryId)
  } else {
    entry.qty += delta
  }
  save()
}

export function removeLogEntry(dateStr, entryId) {
  const log = ensureLog(dateStr)
  log.entries = log.entries.filter((e) => e.id !== entryId)
  save()
}

export function addCustomLogEntry(dateStr, groupId, name, kcal, qty = 1) {
  const log = ensureLog(dateStr)
  log.entries.push({
    id: uid('entry'),
    groupId,
    foodId: null,
    name: (name || 'Custom').trim() || 'Custom',
    kcal: !Number.isFinite(kcal) || kcal < 0 ? 0 : kcal,
    qty: !Number.isFinite(qty) || qty <= 0 ? 1 : qty,
  })
  save()
}

export function clearLogGroup(dateStr, groupId) {
  const log = ensureLog(dateStr)
  if (!log.entries.length) return
  log.entries = log.entries.filter((e) => e.groupId !== groupId)
  save()
}