<script setup>
import { computed, ref } from 'vue'
import BaseModal from './BaseModal.vue'
import TrendsChart from './TrendsChart.vue'
import { state as store } from '../js/data.js'
import { openModal, Modals } from '../js/modals.js'
import { useTrendsChart } from '../js/useTrendsChart.js'

const emit = defineEmits(['close'])
const { days, windowAverageKcal, windowAverageDeficit, windowProjectedKgPerWeek, weeklyBreakdown, trackingSummary } = useTrendsChart()
const projectedWeightDisplay = computed(() => Math.abs(windowProjectedKgPerWeek.value) * 4)
const activeTab = ref('daily')
const swipeStart = ref(null)

function startSwipe(event) {
  const touch = event.touches[0]
  swipeStart.value = { x: touch.clientX, y: touch.clientY }
}

function endSwipe(event) {
  if (!swipeStart.value) return
  const touch = event.changedTouches[0]
  const deltaX = touch.clientX - swipeStart.value.x
  const deltaY = touch.clientY - swipeStart.value.y
  swipeStart.value = null
  if (Math.abs(deltaX) < 55 || Math.abs(deltaX) < Math.abs(deltaY) * 1.25) return
  if (deltaX < 0) activeTab.value = 'weekly'
  else activeTab.value = 'daily'
}

function formatWeek(date) {
  return new Date(`${date}T12:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function formatHighlight(entry) {
   return entry ? `${Math.abs(entry).toLocaleString()} kcal · ${formatWeek(entry.date)}` : '—'
}
</script>

<template>
  <BaseModal title="Trends" subtitle="Insights into your calorie data" panel-class="trends-modal" :on-touch-start="startSwipe" :on-touch-end="endSwipe" @close="emit('close')">
    <div class="trends-tabs" role="tablist" aria-label="Trends views">
      <button type="button" role="tab" :aria-selected="activeTab === 'daily'" :class="{ active: activeTab === 'daily' }" @click="activeTab = 'daily'">At a glance</button>
      <button type="button" role="tab" :aria-selected="activeTab === 'weekly'" :class="{ active: activeTab === 'weekly' }" @click="activeTab = 'weekly'">Weekly breakdown</button>
    </div>

    <template v-if="activeTab === 'daily'">
      <div class="trends-section-heading">Daily intake · last {{ days }} days</div>
      <TrendsChart />
      <section class="trends-summary">
      <div class="trends-section-heading">Averages · last {{ days }} days</div>
      <div class="trends-summary-stats">
        <div class="trends-summary-stats-item">
          <strong>{{ windowAverageKcal.toLocaleString() }}</strong>
          <span>kcal / day</span>
        </div>
        <div class="trends-summary-stats-item" :class="{ surplus: windowAverageDeficit < 0 }">
          <strong>{{ Math.abs(windowAverageDeficit).toLocaleString() }}</strong>
          <span>kcal {{ windowAverageDeficit >= 0 ? 'deficit' : 'surplus' }} / day</span>
        </div>
        <div class="trends-summary-stats-item" :class="{ surplus: windowProjectedKgPerWeek < 0 }">
          <strong v-if="projectedWeightDisplay >= 0.05">{{ projectedWeightDisplay.toFixed(1) }} {{ store.weightUnit }} </strong>
          <strong v-else>Maintenance</strong>
          <span>{{ windowProjectedKgPerWeek >= 0 ? 'loss' : 'gain' }} per month</span>
        </div>
      </div>
      </section>
    </template>

    <section v-else class="trends-weeks">
      <div class="trends-section-heading">
        <span>Weekly breakdown</span>
      </div>
      <div class="trends-weeks-list">
          <button v-for="week in weeklyBreakdown" :key="week.start" class="trends-week-row" type="button" @click="openModal(Modals.TRENDS_WEEK, { week })">
          <div class="trends-week-date">{{ formatWeek(week.start) }} – {{ formatWeek(week.end) }}</div>
          <div class="trends-week-stat">
            <strong>{{ week.averageKcal.toLocaleString() }}</strong>
            <span>avg kcal</span>
          </div>
          <div class="trends-week-stat" :class="{ surplus: week.averageDeficit < 0 }">
            <strong>{{ Math.abs(week.averageDeficit).toLocaleString() }}</strong>
            <span>avg {{ week.averageDeficit >= 0 ? 'deficit' : 'surplus' }}</span>
          </div>
          <div class="trends-week-days">{{ week.loggedDays }}/{{ week.totalDays }} days</div>
          <span class="trends-week-chevron" aria-hidden="true">›</span>
        </button>
      </div>
    </section>
  </BaseModal>
</template>

<style scoped>
.trends-section-heading { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 9px; color: var(--ink-muted); font-size: 10px; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; }
.trends-modal { display: flex; flex-direction: column; }
.trends-tabs { display: flex; gap: 4px; margin: 2px 0 18px; padding: 3px; border: 1px solid var(--line); border-radius: 10px; background: var(--surface-alt); }
.trends-tabs button { flex: 1; padding: 7px 10px; border: 0; border-radius: 7px; background: transparent; color: var(--ink-muted); font-size: 12px; font-weight: 700; cursor: pointer; }
.trends-tabs button.active { background: var(--surface); color: var(--ink); box-shadow: 0 1px 3px rgba(var(--shadow-rgb), .12); }
.trends-tabs button:focus-visible { outline: 2px solid var(--green); outline-offset: 1px; }
.trends-summary { margin-top: 20px; }
.trends-weeks { display: flex; min-height: 0; flex: 1; flex-direction: column; margin-top: 0; }
.trends-tracking { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; margin-bottom: 10px; }
.trends-tracking strong { color: var(--ink); font-size: 13px; }
.trends-tracking span { color: var(--green); font-size: 11px; font-weight: 600; }
.trends-summary-stats { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 1px; overflow: hidden; border: 1px solid var(--line); border-radius: 12px; background: var(--line); }
.trends-summary-stats > div { display: flex; min-width: 0; flex-direction: column; align-items: center; gap: 4px; padding: 12px 6px; background: var(--surface); text-align: center; }
.trends-summary-stats strong { color: var(--ink); font-family: 'IBM Plex Mono', monospace; font-size: 16px; }
.trends-summary-stats span { color: var(--ink-muted); font-size: 10px; line-height: 1.2; }
.trends-summary-stats .surplus strong { color: var(--red); }
.trends-weeks-list { min-height: 0; flex: 1; overflow-y: auto; border: 1px solid var(--line); border-radius: 12px; background: var(--surface); }
.trends-week-row { display: grid; width: 100%; grid-template-columns: minmax(110px, 1.3fr) repeat(2, minmax(68px, .8fr)) minmax(52px, .6fr) 18px; align-items: center; gap: 8px; padding: 11px 12px; border-top: 0; border-right: 0; border-left: 0; border-bottom: 1px solid var(--line); background: transparent; color: inherit; font: inherit; text-align: left; cursor: pointer; }
.trends-week-row:hover, .trends-week-row:focus-visible { background: var(--surface-alt); }
.trends-week-row:focus-visible { outline: 2px solid var(--green); outline-offset: -2px; }
.trends-week-chevron { color: var(--ink-muted); font-size: 22px; line-height: 1; text-align: right; }
.trends-week-row:last-child { border-bottom: 0; }
.trends-week-date, .trends-week-days { color: var(--ink-muted); font-size: 11px; }
.trends-week-stat { display: flex; min-width: 0; flex-direction: column; gap: 3px; }
.trends-week-stat strong { color: var(--ink); font-family: 'IBM Plex Mono', monospace; font-size: 13px; }
.trends-week-stat span { color: var(--ink-muted); font-size: 10px; }
.trends-week-stat.surplus strong { color: var(--red); }

@media (max-width: 480px) {
  :deep(.modal.trends-modal) { display: flex; flex-direction: column; }
  .trends-weeks-list { overflow-y: auto; }
  .trends-week-row { grid-template-columns: minmax(82px, 1.25fr) repeat(2, minmax(58px, .8fr)) minmax(48px, .6fr) 14px; gap: 5px; padding: 11px 8px; }
  .trends-week-date, .trends-week-days { font-size: 10px; }
  .trends-week-stat strong { font-size: 12px; }
  .trends-week-stat span { font-size: 9px; }
}
</style>
