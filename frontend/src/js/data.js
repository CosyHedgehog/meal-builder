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
    { id: BREAKFAST_GROUP_ID, name: 'Breakfast', visible: true },
    { id: LUNCH_GROUP_ID, name: 'Lunch', visible: true },
    { id: DINNER_GROUP_ID, name: 'Dinner', visible: true },
    { id: SNACKS_GROUP_ID, name: 'Snacks', visible: true },
    { id: UNCATEGORIZED_GROUP_ID, name: 'Uncategorized', visible: false },
  ]
}

function ensureUncategorizedGroup(groups) {
  return groups.some((group) => group.id === UNCATEGORIZED_GROUP_ID)
    ? groups
    : [...groups, { id: UNCATEGORIZED_GROUP_ID, name: 'Uncategorized', visible: false }]
}

export const state = reactive({
  ingredients: [],
  foods: [],
  groups: [],
  logs: {}, // 'YYYY-MM-DD' -> { entries: [...] }
  maintenanceCal: DEFAULT_MAINTENANCE,
  showKcal: true,
  weightUnit: DEFAULT_WEIGHT_UNIT,
  allowPreviousDayLocking: false,
  oneClickMode: false,
  shareActivity: false,
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
    allowPreviousDayLocking: false,
    oneClickMode: false,
    shareActivity: false,
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
    allowPreviousDayLocking: state.allowPreviousDayLocking,
    oneClickMode: state.oneClickMode,
    shareActivity: state.shareActivity,
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
  state.allowPreviousDayLocking = false
  state.oneClickMode = false
  state.shareActivity = false
}

export async function loadData() {
  try {
    const result = await dataApi.load()
    const parsed = result.data || {}
    const normalized = hasRecoverableLegacyData(parsed) ? migrateLegacyPayload(parsed) : parsed

    state.ingredients = Array.isArray(normalized.ingredients) ? normalized.ingredients : []
    state.foods = Array.isArray(normalized.foods) ? normalized.foods : []
    state.groups = ensureUncategorizedGroup(
      Array.isArray(normalized.groups) && normalized.groups.length
        ? normalized.groups
        : defaultGroups(),
    )
    state.groups.forEach((group) => {
      if (group.visible === undefined) group.visible = group.id !== UNCATEGORIZED_GROUP_ID
    })
    state.logs = normalized.logs && typeof normalized.logs === 'object' ? normalized.logs : {}
    Object.values(state.logs).forEach((log) => {
      if (Array.isArray(log?.entries)) log.entries = log.entries.map(normalizeLogEntry).filter(Boolean)
    })
    state.maintenanceCal = normalized.maintenanceCal || DEFAULT_MAINTENANCE
    state.showKcal = normalized.showKcal !== false
    state.weightUnit = normalized.weightUnit === 'lb' ? 'lb' : DEFAULT_WEIGHT_UNIT
    state.allowPreviousDayLocking = normalized.allowPreviousDayLocking === true
    state.oneClickMode = normalized.oneClickMode === true
    state.shareActivity = normalized.shareActivity === true

    // Persist normalized logs so stale food group IDs are repaired permanently.
    state.loaded = true
    await flushSave()
  } catch (e) {
    console.error('Load failed', e)
    applyDefaults()
  }
  state.loaded = true
}

export async function importData(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw new Error('Invalid data file')
  const normalized = hasRecoverableLegacyData(payload) ? migrateLegacyPayload(payload) : payload
  state.ingredients = Array.isArray(normalized.ingredients) ? normalized.ingredients : []
  state.foods = Array.isArray(normalized.foods) ? normalized.foods : []
  state.groups = ensureUncategorizedGroup(
    Array.isArray(normalized.groups) && normalized.groups.length ? normalized.groups : defaultGroups(),
  )
  state.groups.forEach((group) => {
    if (group.visible === undefined) group.visible = group.id !== UNCATEGORIZED_GROUP_ID
  })
  state.logs = normalized.logs && typeof normalized.logs === 'object' ? normalized.logs : {}
  Object.values(state.logs).forEach((log) => {
    if (Array.isArray(log?.entries)) log.entries = log.entries.map(normalizeLogEntry).filter(Boolean)
  })
  state.maintenanceCal = normalized.maintenanceCal || DEFAULT_MAINTENANCE
  state.showKcal = normalized.showKcal !== false
  state.weightUnit = normalized.weightUnit === 'lb' ? 'lb' : DEFAULT_WEIGHT_UNIT
  state.allowPreviousDayLocking = normalized.allowPreviousDayLocking === true
  state.oneClickMode = normalized.oneClickMode === true
  state.shareActivity = normalized.shareActivity === true
  state.loaded = true
  await flushSave()
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
  if (food.mode === 'simple') return Math.round(Number(food.kcal) || 0)
  if (!(food.items || []).length) return Math.round(Number(food.kcal) || 0)
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

export function setAllowPreviousDayLocking(value) {
  state.allowPreviousDayLocking = !!value
  save()
}

export function setOneClickMode(value) {
  state.oneClickMode = !!value
  save()
}

export async function setShareActivity(value) {
  state.shareActivity = !!value
  await flushSave()
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
    mode: draft.mode === 'simple' ? 'simple' : 'ingredients',
    kcal: Number.isFinite(draft.kcal) ? Math.round(draft.kcal) : 0,
    note: String(draft.note || '').trim(),
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
  food.mode = draft.mode === 'simple' ? 'simple' : 'ingredients'
  food.kcal = Number.isFinite(draft.kcal) ? Math.round(draft.kcal) : 0
  food.note = String(draft.note || '').trim()
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

export function updateFoodNote(id, note) {
  const food = state.foods.find((f) => f.id === id)
  if (!food) return
  food.note = String(note || '').trim()
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
  state.foods.forEach((food) => {
    if (!(food.items || []).some((item) => item.ingredientId === id)) return
    food.items = food.items.filter((item) => item.ingredientId !== id)
    if (food.mode !== 'simple') food.kcal = 0
  })
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

export function updateCustomLogEntry(dateStr, entryId, name, kcal) {
  const log = ensureLog(dateStr)
  const entry = log.entries.find((item) => item.id === entryId && !item.foodId)
  if (!entry) return
  entry.name = (name || 'Custom').trim() || 'Custom'
  entry.kcal = !Number.isFinite(kcal) || kcal < 0 ? 0 : kcal
  save()
}

export function clearLogGroup(dateStr, groupId) {
  const log = ensureLog(dateStr)
  if (!log.entries.length) return
  log.entries = log.entries.filter((e) => e.groupId !== groupId)
  save()
}

export function toggleGroupVisibility(id) {
  const group = state.groups.find((item) => item.id === id)
  if (!group) return
  group.visible = group.visible !== false ? false : true
  save()
}

export function moveFoodToGroup(foodId, groupId) {
  const food = getFood(foodId)
  if (!food || !groupId || food.groupId === groupId) return
  const previousGroupId = food.groupId
  food.groupId = groupId
  Object.values(state.logs).forEach((log) => {
    logEntries(log).forEach((entry) => {
      if (entry.foodId === foodId && entry.groupId === previousGroupId) entry.groupId = groupId
    })
  })
  save()
}

export function moveFoodToGroupEnd(foodId, groupId) {
  const food = getFood(foodId)
  if (!food || !groupId) return
  const previousGroupId = food.groupId
  if (previousGroupId === groupId) return
  food.groupId = groupId
  const index = state.foods.findIndex((item) => item.id === foodId)
  if (index !== -1) {
    const [moved] = state.foods.splice(index, 1)
    state.foods.push(moved)
  }
  Object.values(state.logs).forEach((log) => {
    logEntries(log).forEach((entry) => {
      if (entry.foodId === foodId && entry.groupId === previousGroupId) entry.groupId = groupId
    })
  })
  save()
}

export function reorderFood(foodId, targetFoodId) {
  if (!foodId || !targetFoodId || foodId === targetFoodId) return
  const fromIndex = state.foods.findIndex((food) => food.id === foodId)
  const targetIndex = state.foods.findIndex((food) => food.id === targetFoodId)
  if (fromIndex === -1 || targetIndex === -1) return
  const moved = state.foods[fromIndex]
  state.foods[fromIndex] = state.foods[targetIndex]
  state.foods[targetIndex] = moved
  save()
}

export function insertFood(foodId, targetFoodId) {
  if (!foodId || !targetFoodId || foodId === targetFoodId) return
  const fromIndex = state.foods.findIndex((food) => food.id === foodId)
  const targetIndex = state.foods.findIndex((food) => food.id === targetFoodId)
  if (fromIndex === -1 || targetIndex === -1) return
  const [moved] = state.foods.splice(fromIndex, 1)
  const adjustedTargetIndex = fromIndex < targetIndex ? targetIndex - 1 : targetIndex
  state.foods.splice(adjustedTargetIndex, 0, moved)
  save()
}

export function reorderGroups(fromId, toId) {
  if (!fromId || !toId || fromId === toId) return
  const fromIndex = state.groups.findIndex((group) => group.id === fromId)
  const toIndex = state.groups.findIndex((group) => group.id === toId)
  if (fromIndex === -1 || toIndex === -1) return
  const moved = state.groups[fromIndex]
  state.groups[fromIndex] = state.groups[toIndex]
  state.groups[toIndex] = moved
  save()
}

export function moveLogEntryToGroup(dateStr, entryId, groupId) {
  const log = ensureLog(dateStr)
  const entry = log.entries.find((item) => item.id === entryId && !item.foodId)
  if (!entry || !groupId) return
  entry.groupId = groupId
  const index = log.entries.findIndex((item) => item.id === entryId)
  if (index !== -1) {
    const [moved] = log.entries.splice(index, 1)
    log.entries.push(moved)
  }
  save()
}

export function reorderLogEntry(dateStr, entryId, targetEntryId) {
  if (!entryId || !targetEntryId || entryId === targetEntryId) return
  const log = ensureLog(dateStr)
  const fromIndex = log.entries.findIndex((entry) => entry.id === entryId && !entry.foodId)
  const targetIndex = log.entries.findIndex((entry) => entry.id === targetEntryId && !entry.foodId)
  if (fromIndex === -1 || targetIndex === -1) return
  const moved = log.entries[fromIndex]
  log.entries[fromIndex] = log.entries[targetIndex]
  log.entries[targetIndex] = moved
  save()
}

export function updateGroupColor(id, color) {
  const group = state.groups.find((g) => g.id === id)
  if (!group) return
  if (typeof color === 'string' && /^#[0-9a-f]{6}$/i.test(color)) group.color = color
  else delete group.color
  save()
}
