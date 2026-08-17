import { computed, onMounted, onUnmounted, ref } from 'vue'
import {
  state as store,
  logDeficit,
  logHasEntries,
  logTotalKcal,
} from './data.js'
import { prettyDate, shiftDateStr, todayStr, weekdayNarrow } from './date.js'

const BAR_HEIGHT = 108
const DEFAULT_CEILING = 2400
const KCAL_PER_KG = 7700

export function useTrendsChart() {
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
      const barHeight = entry.hasLog
        ? Math.max(5, Math.round((total / scale.value) * BAR_HEIGHT))
        : 0

      return {
        ...entry,
        barHeight,
        overGoal: entry.total > store.maintenanceCal,
        weekday: weekdayNarrow(entry.date),
        isToday: entry.date === todayStr(),
        label: entry.hasLog
          ? `${prettyDate(entry.date)}: ${entry.total.toLocaleString()} kcal logged, ${entry.deficit.toLocaleString()} kcal deficit`
          : `${prettyDate(entry.date)}: Not logged`,
      }
    }),
  )

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
  const windowLoggedDays = computed(() => history.value.filter((entry) => entry.date < todayStr() && entry.hasLog))
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

  const weeklyBreakdown = computed(() => {
    const firstLoggedIndex = history.value.findIndex((entry) => entry.hasLog)
    if (firstLoggedIndex < 0) return []
    const entries = history.value.slice(firstLoggedIndex)
    const weeks = []
    for (let end = entries.length - 1; end >= 0; end -= 7) {
      const start = Math.max(0, end - 6)
      const range = entries.slice(start, end + 1)
      const logged = range.filter((entry) => entry.hasLog)
      const average = (field) => logged.length
        ? Math.round(logged.reduce((sum, entry) => sum + entry[field], 0) / logged.length)
        : 0
      weeks.push({
        start: range[0].date,
        end: range[range.length - 1].date,
        loggedDays: logged.length,
        totalDays: range.length,
        averageKcal: average('total'),
        averageDeficit: average('deficit'),
      })
    }
    return weeks
  })

  const trackingSummary = computed(() => {
    const entries = history.value
    const firstLoggedIndex = entries.findIndex((entry) => entry.hasLog)
    if (firstLoggedIndex < 0) return { loggedDays: 0, totalDays: 0, consistency: 0, bestDeficit: null, largestSurplus: null }
    const tracked = entries.slice(firstLoggedIndex)
    const logged = tracked.filter((entry) => entry.hasLog)
    return {
      loggedDays: logged.length,
      totalDays: tracked.length,
      consistency: Math.round((logged.length / tracked.length) * 100),
      bestDeficit: logged.reduce((best, entry) => entry.deficit > (best?.deficit ?? -Infinity) ? entry : best, null),
      largestSurplus: logged.reduce((worst, entry) => entry.deficit < (worst?.deficit ?? Infinity) ? entry : worst, null),
    }
  })

  return {
    days,
    bars,
    goalLineBottom,
    avgDeficit,
    projectedKgPerWeek,
    windowLoggedDays,
    windowAverageKcal,
    windowAverageDeficit,
    windowProjectedKgPerWeek,
    weeklyBreakdown,
    trackingSummary,
  }
}
