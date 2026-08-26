import { computed, reactive, ref, watch } from 'vue'
import { todayStr } from './date.js'

/* ---- selected log date ---- */
export const view = reactive({ logDate: todayStr(), draggedFoodId: '', draggedOverFoodId: '', draggedGroupId: '', draggedOverGroupId: '', draggedEntryId: '', draggedOverEntryId: '', dragType: '' })

const COLLAPSE_STATE_KEY = 'meal-builder-collapse-state'

function readCollapseState() {
  try {
    const parsed = JSON.parse(localStorage.getItem(COLLAPSE_STATE_KEY) || '{}')
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

export function getCollapseState(key, defaultValue = false) {
  const value = readCollapseState()[key]
  return typeof value === 'boolean' ? value : defaultValue
}

export function setCollapseState(key, value) {
  const state = readCollapseState()
  state[key] = value
  try {
    localStorage.setItem(COLLAPSE_STATE_KEY, JSON.stringify(state))
  } catch {
    /* private mode or unavailable storage */
  }
}

export function clearDragState() {
  view.draggedFoodId = ''
  view.draggedOverFoodId = ''
  view.draggedGroupId = ''
  view.draggedOverGroupId = ''
  view.draggedEntryId = ''
  view.draggedOverEntryId = ''
  view.dragType = ''
}

export const dateNavDirection = ref('next')
export const boundaryBounce = ref(false)
let bounceTimer = null

export function triggerDateBoundaryBounce() {
  boundaryBounce.value = true
  if (bounceTimer) clearTimeout(bounceTimer)
  bounceTimer = setTimeout(() => {
    boundaryBounce.value = false
  }, 320)
}

export function setLogDate(dateStr) {
  if (dateStr && dateStr !== view.logDate) {
    dateNavDirection.value = dateStr > view.logDate ? 'next' : 'prev'
    view.logDate = dateStr
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
  }
}

/* ---- theme ---- */
const initial = document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark'

export const theme = ref(initial)
export const isDark = computed(() => theme.value === 'dark')

watch(
  theme,
  (value) => {
    document.documentElement.setAttribute('data-theme', value)
    try {
      localStorage.setItem('theme', value)
    } catch {
      /* private mode */
    }
    const meta = document.getElementById('themeColorMeta')
    if (meta) meta.setAttribute('content', value === 'dark' ? '#12140f' : '#f4f5f0')
  },
  { immediate: true },
)

export function toggleTheme() {
  theme.value = theme.value === 'dark' ? 'light' : 'dark'
}
