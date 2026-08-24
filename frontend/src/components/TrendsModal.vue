<script setup>
import { computed, ref } from 'vue'
import BaseModal from './BaseModal.vue'
import TrendsChart from './TrendsChart.vue'
import { state as store } from '../js/data.js'
import { useTrendsChart } from '../js/useTrendsChart.js'

const emit = defineEmits(['close'])
const selectedDailyRange = ref(window.innerWidth <= 480 ? 14 : 30)
const dailyRangeOptions = [7, 14, 30, 90, 'all']
const { days, windowAverageKcal, windowAverageDeficit, windowTotalDeficit, windowProjectedKgPerWeek, weeklyBreakdown, trackingSummary } = useTrendsChart(selectedDailyRange)
const dailyRangeLabel = computed(() => selectedDailyRange.value === 'all' ? 'All time' : `last ${days.value} days`)
const totalWeightChangeDisplay = computed(() => Math.abs(windowTotalDeficit.value) / 7700 * (store.weightUnit === 'lb' ? 2.20462 : 1))
const projectedWeightDisplay = computed(() => Math.abs(windowProjectedKgPerWeek.value) * 4)
const activeTab = ref('daily')
const expandedWeek = ref(null)
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

function formatDate(value) {
  return new Date(`${value}T12:00:00`).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
}

function balanceLabel(day) {
  return day.deficit >= 0 ? 'deficit' : 'surplus'
}

function toggleWeek(week) {
  expandedWeek.value = expandedWeek.value === week.start ? null : week.start
}
</script>

<template>
  <BaseModal title="Trends" subtitle="Insights into your calorie data" panel-class="trends-modal"
    :on-touch-start="startSwipe" :on-touch-end="endSwipe" @close="emit('close')">
    <div class="trends-tabs" role="tablist" aria-label="Trends views">
      <button type="button" role="tab" :aria-selected="activeTab === 'daily'" :class="{ active: activeTab === 'daily' }"
        @click="activeTab = 'daily'">At a glance</button>
      <button type="button" role="tab" :aria-selected="activeTab === 'weekly'"
        :class="{ active: activeTab === 'weekly' }" @click="activeTab = 'weekly'">Weekly breakdown</button>
    </div>

    <template v-if="activeTab === 'daily'">
      <div class="trends-range-selector" role="tablist" aria-label="Daily trends range">
        <button
          v-for="range in dailyRangeOptions"
          :key="range"
          type="button"
          role="tab"
          :aria-selected="selectedDailyRange === range"
          :class="{ active: selectedDailyRange === range }"
          @click="selectedDailyRange = range"
        >{{ range === 'all' ? 'All time' : `${range} days` }}</button>
      </div>
      <div class="trends-section-heading">Daily intake · {{ dailyRangeLabel }}</div>
      <TrendsChart :range="selectedDailyRange" />
      <section class="trends-summary">
        <div class="trends-section-heading">Averages · {{ dailyRangeLabel }}</div>
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
            <strong v-if="totalWeightChangeDisplay / Math.max(days, 1) >= 0.005">{{ (totalWeightChangeDisplay / Math.max(days, 1)).toFixed(2) }} {{ store.weightUnit }}
            </strong>
            <strong v-else>Maintenance</strong>
            <span>estimated {{ windowTotalDeficit >= 0 ? 'loss' : 'gain' }} / day</span>
          </div>
          <div class="trends-summary-stats-item" :class="{ surplus: windowProjectedKgPerWeek < 0 }">
            <strong v-if="projectedWeightDisplay >= 0.05">{{ projectedWeightDisplay.toFixed(1) }} {{ store.weightUnit }}</strong>
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
        <div class="trends-week-header-row" aria-hidden="true">
          <span>Week</span>
          <span>Avg kcal</span>
          <span>Avg kcal deficit / surplus</span>
          <span>Days logged</span>
          <span></span>
        </div>
        <template v-for="(week, index) in weeklyBreakdown" :key="week.start">
          <div v-if="index === 0 || weeklyBreakdown[index - 1].year !== week.year" class="trends-year-heading">{{ week.year }}</div>
          <button class="trends-week-row" type="button" :aria-expanded="expandedWeek === week.start"
            @click="toggleWeek(week)">
            <div class="trends-week-date">{{ formatWeek(week.start) }} – {{ formatWeek(week.end) }}</div>
            <div class="trends-week-stat">
              <strong>{{ week.averageKcal.toLocaleString() }}</strong>
            </div>
            <div class="trends-week-stat" :class="{ surplus: week.averageDeficit < 0 }">
              <strong>{{ Math.abs(week.averageDeficit).toLocaleString() }}</strong>
            </div>
            <div class="trends-week-days">{{ week.loggedDays }}/{{ week.totalDays }}</div>
            <span class="trends-week-chevron" aria-hidden="true">›</span>
          </button>
          <div v-if="expandedWeek === week.start" class="trends-week-detail-list" :id="`week-details-${week.start}`">
            <div v-for="day in week.days" :key="day.date" class="trends-week-detail-row">
              <div class="trends-week-date">
                {{ formatDate(day.date) }}
              </div>
              <span v-if="day.hasLog" class="trends-week-calories">{{ day.total.toLocaleString() }}</span>
              <span v-else class="trends-week-calories">—</span>
              <span v-if="day.hasLog" class="trends-week-detail-balance" :class="{ surplus: day.deficit < 0 }">
                {{ Math.abs(day.deficit).toLocaleString() }}
              </span>
              <span v-else class="trends-week-detail-balance no-log">—</span>
              <span class="trends-week-days-placeholder"></span>
              <span aria-hidden="true"></span>
            </div>
          </div>
        </template>
      </div>
    </section>
  </BaseModal>
</template>

<style scoped>
.trends-section-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 9px;
  color: var(--ink-muted);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: .14em;
  text-transform: uppercase;
}

.trends-modal {
  display: flex;
  flex-direction: column;
}

.trends-tabs {
  display: flex;
  gap: 4px;
  margin: 2px 0 18px;
  padding: 3px;
  border: 1px solid var(--line);
  border-radius: 10px;
  background: var(--surface-alt);
}

.trends-tabs button {
  flex: 1;
  padding: 7px 10px;
  border: 0;
  border-radius: 7px;
  background: transparent;
  color: var(--ink-muted);
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}

.trends-tabs button.active {
  background: var(--surface);
  color: var(--ink);
  box-shadow: 0 1px 3px rgba(var(--shadow-rgb), .12);
}

.trends-tabs button:focus-visible {
  outline: 2px solid var(--green);
  outline-offset: 1px;
}

.trends-summary {
  margin-top: 20px;
}

.trends-weeks {
  display: flex;
  min-height: 0;
  flex: 1;
  flex-direction: column;
  margin-top: 0;
}

.trends-tracking {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 10px;
}

.trends-tracking strong {
  color: var(--ink);
  font-size: 13px;
}

.trends-tracking span {
  color: var(--green);
  font-size: 11px;
  font-weight: 600;
}

.trends-summary-stats {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 1px;
  overflow: hidden;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: var(--line);
}

.trends-summary-stats>div {
  display: flex;
  min-width: 0;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 12px 6px;
  background: var(--surface);
  text-align: center;
}

.trends-summary-stats strong {
  color: var(--ink);
  font-family: 'IBM Plex Mono', monospace;
  font-size: 16px;
}

.trends-summary-stats span {
  color: var(--ink-muted);
  font-size: 10px;
  line-height: 1.2;
}

.trends-summary-stats .surplus strong {
  color: var(--red);
}

.trends-weeks-list {
  min-height: 0;
  flex: 1;
  overflow-y: auto;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: var(--surface);
}

.trends-range-selector {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 4px;
  margin: 2px 0 18px;
  padding: 3px;
  border: 1px solid var(--line);
  border-radius: 10px;
  background: var(--surface-alt);
}

.trends-range-selector button {
  padding: 7px 4px;
  border: 0;
  border-radius: 7px;
  background: transparent;
  color: var(--ink-muted);
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}

.trends-range-selector button.active {
  background: var(--surface);
  color: var(--ink);
  box-shadow: 0 1px 3px rgba(var(--shadow-rgb), .12);
}

.trends-range-selector button:focus-visible {
  outline: 2px solid var(--green);
  outline-offset: 2px;
}

.trends-year-heading {
  padding: 10px 12px 6px;
  border-bottom: 1px solid var(--line);
  background: var(--surface-alt);
  color: var(--green);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: .1em;
  text-transform: uppercase;
}

.trends-week-header-row {
  display: grid;
  grid-template-columns: minmax(110px, 1.3fr) repeat(2, minmax(68px, .8fr)) minmax(52px, .6fr) 18px;
  align-items: center;
  gap: 8px;
  padding: 7px 12px;
  border-bottom: 1px solid var(--line);
  background: transparent;
  color: var(--ink-muted);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: .08em;
  text-transform: uppercase;
}

.trends-week-header-row>span:nth-child(n+2):nth-child(-n+4) {
  justify-self: center;
  text-align: center;
}

.trends-week-header-row>span:nth-child(5) {
  justify-self: end;
}

.trends-week-row {
  display: grid;
  width: 100%;
  grid-template-columns: minmax(110px, 1.3fr) repeat(2, minmax(68px, .8fr)) minmax(52px, .6fr) 18px;
  align-items: center;
  gap: 8px;
  padding: 11px 12px;
  border-top: 0;
  border-right: 0;
  border-left: 0;
  border-bottom: 1px solid color-mix(in srgb, var(--line) 100%, transparent);
  background: transparent;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.trends-week-row:hover {
  background: color-mix(in srgb, var(--surface-alt) 55%, transparent);
}

.trends-week-row[aria-expanded="true"] {
  background: color-mix(in srgb, var(--surface-alt) 100%, transparent);
}

.trends-week-row[aria-expanded="true"]:hover {
  background: color-mix(in srgb, var(--surface-alt) 100%, transparent);
}

.trends-week-chevron {
  display: flex;
  width: 18px;
  height: 1em;
  align-items: center;
  justify-content: center;
  color: var(--ink-muted);
  font-size: 22px;
  line-height: 1;
  text-align: right;
  transform-origin: center center;
  transition: transform 0.15s ease, color 0.15s ease;
}

.trends-week-row:hover .trends-week-chevron {
  color: var(--ink);
}

.trends-week-row[aria-expanded="true"] .trends-week-chevron {
  transform: rotate(90deg);
}

.trends-week-row:last-child {
  border-bottom: 0;
}

.trends-week-date,
.trends-week-days {
  color: var(--ink-muted);
  font-size: 13px;
}

.trends-week-days {
  justify-self: center;
  text-align: center;
}

.trends-week-stat {
  min-width: 0;
  justify-self: center;
  text-align: center;
}

.trends-week-stat strong {
  color: var(--ink);
  font-family: 'IBM Plex Mono', monospace;
  font-size: 13px;
}

.trends-week-stat.surplus strong {
  color: var(--red);
}

.trends-week-detail-list {
  padding-bottom: 4px;
  border-bottom: 1px solid color-mix(in srgb, var(--line) 65%, transparent);
  background: color-mix(in srgb, var(--surface-alt) 100%, transparent);
}

.trends-week-detail-row {
  display: grid;
  grid-template-columns: minmax(110px, 1.3fr) repeat(2, minmax(68px, .8fr)) minmax(52px, .6fr) 18px;
  align-items: center;
  gap: 8px;
  padding: 7px 12px;
}

.trends-week-detail-row>div {
  display: flex;
  min-width: 0;
  align-items: baseline;
  gap: 8px;
  grid-column: 1;
  padding-left:10px;
  font-size: 11px;
}

.trends-week-detail-row strong {
  color: var(--ink);
  font-size: 12px;
}

.trends-week-detail-row span {
  color: var(--ink-muted);
  font-size: 11px;
  justify-self: center;
}

.trends-week-calories {
  grid-column: 2;
  text-align: left;
  white-space: nowrap;
}

.trends-week-detail-balance {
  grid-column: 3;
  color: var(--green) !important;
  white-space: nowrap;
}

.trends-week-detail-balance.surplus {
  color: var(--red) !important;
}

.trends-week-detail-balance.no-log {
  color: var(--ink-muted) !important;
}

@media (max-width: 480px) {
  :deep(.modal.trends-modal) {
    display: flex;
    flex-direction: column;
  }

  .trends-weeks-list {
    overflow-y: auto;
  }

  .trends-range-selector button {
    font-size: 11px;
  }

  .trends-week-header-row {
    grid-template-columns: minmax(82px, 1.25fr) repeat(2, minmax(58px, .8fr)) minmax(48px, .6fr) 14px;
    gap: 5px;
    padding: 8px;
    font-size: 9px;
  }

  .trends-week-row {
    grid-template-columns: minmax(82px, 1.25fr) repeat(2, minmax(58px, .8fr)) minmax(48px, .6fr) 14px;
    gap: 5px;
    padding: 11px 8px;
  }

  .trends-week-detail-row {
    display: grid;
    grid-template-columns: minmax(82px, 1.25fr) repeat(2, minmax(58px, .8fr)) minmax(48px, .6fr) 14px;
    align-items: center;
    gap: 5px;
    padding: 7px 12px;
  }

  .trends-week-date,
  .trends-week-days {
    font-size: 13px;
  }

  .trends-week-stat strong {
    font-size: 12px;
  }
}
</style>
