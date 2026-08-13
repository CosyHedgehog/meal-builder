import { computed, onMounted, onUnmounted, ref } from 'vue'
import {
  state as store,
  logDeficit,
  logHasEntries,
  logMealKcal,
  logSnacksKcal,
  logTotalKcal,
} from './data.js'
import { prettyDate, shiftDateStr, todayStr, weekdayNarrow } from './date.js'

const BAR_HEIGHT = 108
const DEFAULT_CEILING = 2400
const KCAL_PER_KG = 7700

function movingAverage(history, windowSize = 7) {
  return history.map((_, index) => {
    const start = Math.max(0, index - windowSize + 1)
    const logged = history.slice(start, index + 1).filter((entry) => entry.hasLog)
    if (!logged.length) return null
    return logged.reduce((sum, entry) => sum + entry.total, 0) / logged.length
  })
}

function smoothLinePaths(points) {
  const segments = []
  let current = []
  points.forEach((point) => {
    if (point === null) {
      if (current.length) segments.push(current)
      current = []
    } else {
      current.push(point)
    }
  })
  if (current.length) segments.push(current)

  return segments.map((segment) => {
    if (segment.length === 1) {
      return `M${segment[0].x},${segment[0].y} L${segment[0].x},${segment[0].y}`
    }
    let path = `M${segment[0].x},${segment[0].y}`
    for (let index = 0; index < segment.length - 1; index += 1) {
      const p0 = segment[index - 1] || segment[index]
      const p1 = segment[index]
      const p2 = segment[index + 1]
      const p3 = segment[index + 2] || p2
      const cp1x = p1.x + (p2.x - p0.x) / 6
      const cp1y = p1.y + (p2.y - p0.y) / 6
      const cp2x = p2.x - (p3.x - p1.x) / 6
      const cp2y = p2.y - (p3.y - p1.y) / 6
      path += ` C${cp1x.toFixed(2)},${cp1y.toFixed(2)} ${cp2x.toFixed(2)},${cp2y.toFixed(2)} ${p2.x.toFixed(2)},${p2.y.toFixed(2)}`
    }
    return path
  })
}

export function useHistoryChart() {
  const days = ref(window.innerWidth <= 480 ? 14 : 30)

  function onResize() {
    days.value = window.innerWidth <= 480 ? 14 : 30
  }

  onMounted(() => window.addEventListener('resize', onResize))
  onUnmounted(() => window.removeEventListener('resize', onResize))

  const history = computed(() => {
    const output = []
    const today = todayStr()
    for (let index = days.value - 1; index >= 0; index -= 1) {
      const date = shiftDateStr(today, -index)
      const log = store.logs[date]
      output.push({
        date,
        total: log ? logTotalKcal(log) : 0,
        mealK: log ? logMealKcal(log) : 0,
        snackK: log ? logSnacksKcal(log) : 0,
        deficit: log ? logDeficit(log) : 0,
        hasLog: logHasEntries(log),
      })
    }
    return output
  })

  const scale = computed(() =>
    Math.max(
      store.maintenanceCal,
      DEFAULT_CEILING,
      1,
      ...history.value.filter((entry) => entry.hasLog).map((entry) => entry.total),
    ),
  )

  const bars = computed(() =>
    history.value.map((entry) => {
      const total = Math.max(0, entry.total || 0)
      const baseKcal = Math.min(total, store.maintenanceCal)
      const overflowKcal = Math.max(0, total - store.maintenanceCal)
      const barHeight = entry.hasLog
        ? Math.max(5, Math.round((total / scale.value) * BAR_HEIGHT))
        : 0
      const baseHeight = entry.hasLog ? Math.round((baseKcal / scale.value) * BAR_HEIGHT) : 0
      const overflowHeight = entry.hasLog
        ? Math.max(0, Math.round((overflowKcal / scale.value) * BAR_HEIGHT))
        : 0
      const mealShare = total > 0 ? Math.min(1, Math.max(0, entry.mealK / total)) : 0
      const mealHeight = entry.hasLog ? Math.round(baseHeight * mealShare) : 0
      const snackHeight = entry.hasLog ? Math.max(0, baseHeight - mealHeight) : 0

      return {
        ...entry,
        barHeight,
        mealHeight,
        snackHeight,
        overflowHeight,
        isOverGoal: overflowKcal > 0 && entry.hasLog,
        weekday: weekdayNarrow(entry.date),
        isToday: entry.date === todayStr(),
        label: entry.hasLog
          ? `${prettyDate(entry.date)}: ${entry.total.toLocaleString()} kcal logged (${entry.mealK.toLocaleString()} meals / ${entry.snackK.toLocaleString()} snacks), ${entry.deficit >= 0 ? `${entry.deficit.toLocaleString()} kcal deficit` : `${Math.abs(entry.deficit).toLocaleString()} kcal surplus`}`
          : `${prettyDate(entry.date)}: Not logged`,
      }
    }),
  )

  const trendPaths = computed(() => {
    const points = movingAverage(history.value, 7).map((value, index) => {
      if (value === null) return null
      const scaled = Math.min(value, scale.value)
      return {
        x: ((index + 0.5) / days.value) * 100,
        y: Math.max(0, BAR_HEIGHT - (scaled / scale.value) * BAR_HEIGHT),
      }
    })
    return smoothLinePaths(points)
  })

  const goalLineBottom = computed(() =>
    Math.round(24 + (store.maintenanceCal / scale.value) * BAR_HEIGHT),
  )
  const loggedDays = computed(() => history.value.filter((entry) => entry.hasLog))
  const avgDeficit = computed(() =>
    loggedDays.value.length
      ? Math.round(loggedDays.value.reduce((sum, entry) => sum + entry.deficit, 0) / loggedDays.value.length)
      : 0,
  )
  const projectedKgPerWeek = computed(() => (avgDeficit.value * 7) / KCAL_PER_KG)
  const windowLoggedDays = computed(() => history.value.filter((entry) => entry.hasLog))
  const windowAverageKcal = computed(() =>
    windowLoggedDays.value.length
      ? Math.round(windowLoggedDays.value.reduce((sum, entry) => sum + entry.total, 0) / windowLoggedDays.value.length)
      : 0,
  )
  const windowAverageDeficit = computed(() =>
    windowLoggedDays.value.length
      ? Math.round(windowLoggedDays.value.reduce((sum, entry) => sum + entry.deficit, 0) / windowLoggedDays.value.length)
      : 0,
  )
  const windowProjectedKgPerWeek = computed(() => (windowAverageDeficit.value * 7) / KCAL_PER_KG)

  return {
    days,
    bars,
    trendPaths,
    goalLineBottom,
    avgDeficit,
    projectedKgPerWeek,
    windowLoggedDays,
    windowAverageKcal,
    windowAverageDeficit,
    windowProjectedKgPerWeek,
  }
}
