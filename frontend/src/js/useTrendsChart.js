import { computed, ref, unref } from 'vue'
import {
  state as store,
  logDeficit,
  logHasEntries,
  logTotalKcal,
} from './data.js'
import { formatDateISO, parseISODate, prettyDate, shiftDateStr, todayStr, weekdayNarrow } from './date.js'

const BAR_HEIGHT = 108
const DEFAULT_CEILING = 2400
const KCAL_PER_KG = 7700

export function useTrendsChart(selectedRange = ref(30)) {
  const allTime = computed(() => unref(selectedRange) === 'all')
  const days = computed(() => {
    if (allTime.value) return history.value.length
    return Number(unref(selectedRange)) || 30
  })

  const history = computed(() => {
    const output = []
    const today = todayStr()
    const logDates = Object.keys(store.logs).sort()
    const rangeDays = Number(unref(selectedRange)) || 30
    const startDate = allTime.value && logDates.length ? logDates[0] : shiftDateStr(today, -(rangeDays - 1))
    let date = startDate
    while (date <= today) {
      const log = store.logs[date]
      output.push({
        date,
        total: log ? logTotalKcal(log) : 0,
        deficit: log ? logDeficit(log) : 0,
        hasLog: logHasEntries(log),
      })
      date = shiftDateStr(date, 1)
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
    history.value.map((entry, index) => {
      const total = Math.max(0, entry.total || 0)
      const barHeight = entry.hasLog
        ? Math.max(5, Math.round((total / scale.value) * BAR_HEIGHT))
        : 0

      return {
        ...entry,
        barHeight,
        overGoal: entry.total > store.maintenanceCal,
        isToday: entry.date === todayStr(),
        showLabel: true,
        weekday: weekdayNarrow(entry.date),
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
  const windowTotalDeficit = computed(() =>
    windowLoggedDays.value.reduce((sum, entry) => sum + entry.deficit, 0),
  )
  const windowProjectedKgPerWeek = computed(() => (windowAverageDeficit.value * 7) / KCAL_PER_KG)

  const weeklyBreakdown = computed(() => {
    const dates = Object.keys(store.logs).filter((date) => logHasEntries(store.logs[date]))
    if (!dates.length) return []
    const today = todayStr()
    const firstMonday = parseISODate(dates.sort()[0])
    const firstDay = firstMonday.getDay() || 7
    firstMonday.setDate(firstMonday.getDate() - firstDay + 1)
    const lastMonday = parseISODate(today)
    const lastDay = lastMonday.getDay() || 7
    lastMonday.setDate(lastMonday.getDate() - lastDay + 1)
    const weeks = []
    for (const monday = new Date(firstMonday); monday <= lastMonday; monday.setDate(monday.getDate() + 7)) {
      const range = []
      for (let offset = 0; offset < 7; offset += 1) {
        const date = new Date(monday)
        date.setDate(date.getDate() + offset)
        const dateStr = formatDateISO(date)
        if (dateStr > today) break
        const log = store.logs[dateStr]
        range.push({ date: dateStr, total: log ? logTotalKcal(log) : 0, deficit: log ? logDeficit(log) : 0, hasLog: logHasEntries(log) })
      }
      const logged = range.filter((entry) => entry.hasLog)
      if (!logged.length) continue
      const average = (field) => Math.round(logged.reduce((sum, entry) => sum + entry[field], 0) / logged.length)
      weeks.push({ start: range[0].date, end: range[range.length - 1].date, year: Number(range[0].date.slice(0, 4)), loggedDays: logged.length, totalDays: range.length, averageKcal: average('total'), averageDeficit: average('deficit'), days: range })
    }
    return weeks.reverse()
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
    windowTotalDeficit,
    windowProjectedKgPerWeek,
    weeklyBreakdown,
    trackingSummary,
  }
}
