<script setup>
import { computed, ref } from 'vue'
import BaseModal from './BaseModal.vue'
import TrendsChart from './TrendsChart.vue'
import { state as store } from '../js/data.js'
import { useTrendsChart } from '../js/useTrendsChart.js'

const emit = defineEmits(['close'])
const { days, windowAverageKcal, windowAverageDeficit, windowProjectedKgPerWeek, weeklyBreakdown, trackingSummary } = useTrendsChart()
const projectedWeightDisplay = computed(() => Math.abs(windowProjectedKgPerWeek.value) * 4)
const activeTab = ref('daily')

function formatWeek(date) {
  return new Date(`${date}T12:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function formatHighlight(entry) {
   return entry ? `${Math.abs(entry).toLocaleString()} kcal · ${formatWeek(entry.date)}` : '—'
}
</script>

<template>
  <BaseModal title="Trends" subtitle="Insights into your calorie data" @close="emit('close')">
    <div class="trends-tabs" role="tablist" aria-label="Trends views">
      <button type="button" role="tab" :aria-selected="activeTab === 'daily'" :class="{ active: activeTab === 'daily' }" @click="activeTab = 'daily'">At a glance</button>
      <button type="button" role="tab" :aria-selected="activeTab === 'weekly'" :class="{ active: activeTab === 'weekly' }" @click="activeTab = 'weekly'">Weekly breakdown</button>
    </div>

    <template v-if="activeTab === 'daily'">
      <div class="trends-section-heading">Daily intake</div>
      <TrendsChart />
      <section class="trends-summary">
      <div class="trends-section-heading">Summary</div>
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
        <span>Logged days only</span>
      </div>
      <div class="trends-weeks-list">
        <div v-for="week in weeklyBreakdown" :key="week.start" class="trends-week-row">
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
        </div>
      </div>
    </section>
  </BaseModal>
</template>

<style scoped>
.trends-section-heading { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 9px; color: var(--ink-muted); font-size: 10px; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; }
.trends-tabs { display: flex; gap: 4px; margin: 2px 0 18px; padding: 3px; border: 1px solid var(--line); border-radius: 10px; background: var(--surface-alt); }
.trends-tabs button { flex: 1; padding: 7px 10px; border: 0; border-radius: 7px; background: transparent; color: var(--ink-muted); font-size: 12px; font-weight: 700; cursor: pointer; }
.trends-tabs button.active { background: var(--surface); color: var(--ink); box-shadow: 0 1px 3px rgba(var(--shadow-rgb), .12); }
.trends-tabs button:focus-visible { outline: 2px solid var(--green); outline-offset: 1px; }
.trends-summary { margin-top: 20px; }
.trends-weeks { margin-top: 0; }
.trends-tracking { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; margin-bottom: 10px; }
.trends-tracking strong { color: var(--ink); font-size: 13px; }
.trends-tracking span { color: var(--green); font-size: 11px; font-weight: 600; }
.trends-summary-stats { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 1px; overflow: hidden; border: 1px solid var(--line); border-radius: 12px; background: var(--line); }
.trends-summary-stats > div { display: flex; min-width: 0; flex-direction: column; align-items: center; gap: 4px; padding: 12px 6px; background: var(--surface); text-align: center; }
.trends-summary-stats strong { color: var(--ink); font-family: 'IBM Plex Mono', monospace; font-size: 16px; }
.trends-summary-stats span { color: var(--ink-muted); font-size: 10px; line-height: 1.2; }
.trends-summary-stats .surplus strong { color: var(--red); }
.trends-weeks-list { max-height: 190px; overflow-y: auto; border: 1px solid var(--line); border-radius: 12px; background: var(--surface); }
.trends-week-row { display: grid; grid-template-columns: minmax(110px, 1.3fr) repeat(2, minmax(68px, .8fr)) minmax(52px, .6fr); align-items: center; gap: 8px; padding: 11px 12px; border-bottom: 1px solid var(--line); }
.trends-week-row:last-child { border-bottom: 0; }
.trends-week-date, .trends-week-days { color: var(--ink-muted); font-size: 11px; }
.trends-week-stat { display: flex; min-width: 0; flex-direction: column; gap: 3px; }
.trends-week-stat strong { color: var(--ink); font-family: 'IBM Plex Mono', monospace; font-size: 13px; }
.trends-week-stat span { color: var(--ink-muted); font-size: 10px; }
.trends-week-stat.surplus strong { color: var(--red); }

@media (max-width: 480px) {
  .trends-weeks-list { max-height: none; overflow: visible; }
  .trends-week-row { grid-template-columns: minmax(100px, 1.25fr) repeat(2, minmax(68px, .8fr)) minmax(52px, .6fr); gap: 7px; padding: 11px 10px; }
  .trends-week-date, .trends-week-days { font-size: 10px; }
  .trends-week-stat strong { font-size: 12px; }
  .trends-week-stat span { font-size: 9px; }
}
</style>
