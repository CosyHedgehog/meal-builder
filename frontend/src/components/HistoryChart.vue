<script setup>
import { computed } from 'vue'
import { setLogDate, view } from '../js/ui.js'
import { state as store } from '../js/data.js'
import { useHistoryChart } from '../js/useHistoryChart.js'

const { days, bars, trendPaths, goalLineBottom } = useHistoryChart()
const useHistoryGroups = computed(() => store.groups.filter((group) => group.id !== 'group-uncategorized'))
</script>

<template>
  <section class="section-block history-section">
    <div class="section-head">
      <div>
        <h2>History</h2>
        <div class="muted">Last {{ days }} days</div>
      </div>
    </div>

    <div class="history-grid" :style="{ gridTemplateColumns: `repeat(${days}, minmax(0, 1fr))` }">
      <div class="history-goal-line" :style="{ bottom: goalLineBottom + 'px' }"></div>

      <svg class="history-trend-svg" :viewBox="`0 0 100 ${108}`" preserveAspectRatio="none" aria-hidden="true">
        <path v-for="(d, i) in trendPaths" :key="i" class="history-trend-line" :d="d"></path>
      </svg>

      <button v-for="bar in bars" :key="bar.date" type="button" class="history-day"
        :class="{ active: bar.date === view.logDate, today: bar.isToday }" :title="bar.label"
        :aria-label="`Load ${bar.label}`" @click="setLogDate(bar.date)">
        <span class="history-bar-area">
          <span v-if="bar.hasLog" class="history-bar-stack"
            :style="{ height: bar.barHeight + 'px' }">
            <span v-for="(segment, index) in bar.groupSegments" :key="segment.id"
              class="history-bar-seg group-segment"
              :class="[`group-${segment.colorIndex % 5}`, { 'bottom-cap': index === 0, 'top-cap': index === bar.groupSegments.length - 1 }]"
              :style="{ height: segment.height + 'px' }"></span>
          </span>
          <span v-else class="history-empty-bar"></span>
        </span>
        <span class="history-day-label">{{ bar.weekday }}</span>
      </button>
    </div>

    <div class="history-legend">
      <span v-for="(group, index) in useHistoryGroups" :key="group.id" class="legend-item">
        <span class="legend-swatch" :class="`group-${index % 5}`"></span>{{ group.name }}
      </span>
      <span class="legend-item"><span class="legend-swatch trend"></span>7-day rolling avg</span>
      <span class="legend-item"><span class="legend-swatch maintenance"></span>Maintenance calories</span>
    </div>

  </section>
</template>

<style scoped>
.history-grid {
  display: grid;
  gap: 8px;
  margin-top: 16px;
  position: relative;
}

.history-day {
  width: 100%;
  height: 132px;
  display: grid;
  grid-template-rows: 108px 18px;
  align-items: center;
  padding: 0;
  border: none;
  background: transparent;
  color: var(--ink);
  transition:
    transform 0.18s ease,
    opacity 0.18s ease;
  position: relative;
}

.history-day:hover {
  transform: translateY(-1px);
  z-index: 4;
}

.history-day:focus-visible {
  outline: 2px solid var(--green);
  outline-offset: 2px;
  border-radius: 6px;
  z-index: 4;
}

.history-bar-area {
  width: 100%;
  height: 108px;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.history-bar-stack {
  width: 12px;
  min-height: 5px;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  border-radius: 6px 6px 2px 2px;
  overflow: hidden;
  transition: height 0.2s ease;
  position: relative;
}

.history-bar-seg {
  width: 100%;
  flex: none;
}

.history-bar-seg.meal {
  background: var(--green);
}

.history-bar-seg.group-0 { background: var(--green); }
.history-bar-seg.group-1 { background: var(--green-light); }
.history-bar-seg.group-2 { background: #79a96f; }
.history-bar-seg.group-3 { background: #4f8f58; }
.history-bar-seg.group-4 { background: #a8c98f; }

.history-bar-seg.snack {
  background: var(--green-light);
}

.history-bar-seg.top-cap {
  border-radius: 6px 6px 0 0;
}

.history-bar-seg.bottom-cap {
  border-radius: 0 0 2px 2px;
}

.history-empty-bar {
  width: 6px;
  height: 32px;
  border-radius: 999px;
  background: var(--history-empty);
}

.history-trend-svg {
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 108px;
  z-index: 3;
  pointer-events: none;
  overflow: visible;
}

.history-trend-line {
  fill: none;
  stroke: var(--trend-line, #3a7dd9);
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
  vector-effect: non-scaling-stroke;
  opacity: 0.9;
}

.history-goal-line {
  position: absolute;
  z-index: 1;
  left: 0;
  right: 0;
  height: 0;
  border-top: 2px dashed rgba(var(--shadow-rgb), 0.32);
  pointer-events: none;
}

.history-day-label {
  position: relative;
  margin-top: 8px;
  font-size: 12px;
  font-weight: 600;
  line-height: 12px;
  color: var(--ink-muted);
}

.history-day.today .history-day-label {
  font-weight: 700;
}

.history-day.active .history-day-label {
  color: var(--ink);
  font-weight: 900;
}

.history-legend {
  display: flex;
  gap: 16px;
  margin-top: 12px;
  font-size: 12px;
  color: var(--ink-muted);
  flex-wrap: wrap;
}

.legend-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.legend-swatch {
  width: 10px;
  height: 10px;
  border-radius: 3px;
  display: inline-block;
}

.legend-swatch.meal {
  background: var(--green);
}

.legend-swatch.snack {
  background: var(--green-light);
}

.legend-swatch.group-0 { background: var(--green); }
.legend-swatch.group-1 { background: var(--green-light); }
.legend-swatch.group-2 { background: #79a96f; }
.legend-swatch.group-3 { background: #4f8f58; }
.legend-swatch.group-4 { background: #a8c98f; }

.legend-swatch.trend {
  width: 18px;
  height: 2px;
  border-radius: 2px;
  background: var(--trend-line, #3a7dd9);
}

.legend-swatch.maintenance {
  width: 18px;
  height: 2px;
  border-radius: 2px;
  background: repeating-linear-gradient(90deg,
      var(--ink-muted) 0px,
      var(--ink-muted) 4px,
      transparent 4px,
      transparent 7px);
}

</style>