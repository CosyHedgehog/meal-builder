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
  }
}
