<script setup>
import { setLogDate, view } from '../js/ui.js'
import { useTrendsChart } from '../js/useTrendsChart.js'

const { days, bars, goalLineBottom } = useTrendsChart()
</script>

<template>
  <section class="section-block trends-section">
    <div class="trends-grid" :style="{ gridTemplateColumns: `repeat(${days}, minmax(0, 1fr))` }">
      <div class="trends-goal-line" :style="{ bottom: goalLineBottom + 'px' }"></div>

      <button v-for="bar in bars" :key="bar.date" type="button" class="trends-day"
        :class="{ active: bar.date === view.logDate, today: bar.isToday }" :title="bar.label"
        :aria-label="`Load ${bar.label}`" @click="setLogDate(bar.date)">
        <span class="trends-bar-area">
          <span v-if="bar.hasLog" class="trends-bar-stack" :class="{ 'over-goal': bar.overGoal }"
            :style="{ height: bar.barHeight + 'px' }">
          </span>
          <span v-else class="trends-empty-bar"></span>
        </span>
        <span class="trends-day-label">{{ bar.weekday }}</span>
      </button>
    </div>

    <div class="trends-legend">
      <span class="legend-item"><span class="legend-swatch under-goal"></span>Under maintenance</span>
      <span class="legend-item"><span class="legend-swatch over-goal"></span>Over maintenance</span>
      <span class="legend-item"><span class="legend-swatch maintenance"></span>Maintenance calories</span>
    </div>

  </section>
</template>

<style scoped>
.trends-grid {
  display: grid;
  gap: 8px;
  margin-top: 16px;
  position: relative;
}

.trends-day {
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

.trends-day:hover {
  transform: translateY(-1px);
  z-index: 4;
}

.trends-day:focus-visible {
  outline: 2px solid var(--green);
  outline-offset: 2px;
  border-radius: 6px;
  z-index: 4;
}

.trends-bar-area {
  width: 100%;
  height: 108px;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.trends-bar-stack {
  width: 12px;
  min-height: 5px;
  background: var(--trends-under);
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  border-radius: 6px 6px 2px 2px;
  overflow: hidden;
  transition: height 0.2s ease;
  position: relative;
}

.trends-bar-stack.over-goal {
  background: var(--trends-over);
}

.trends-empty-bar {
  width: 6px;
  height: 32px;
  border-radius: 999px;
  background: var(--trends-empty);
}

.trends-goal-line {
  position: absolute;
  z-index: 1;
  left: 0;
  right: 0;
  height: 0;
  border-top: 2px dashed rgba(var(--shadow-rgb), 0.32);
  pointer-events: none;
}

.trends-day-label {
  position: relative;
  margin-top: 8px;
  font-size: 12px;
  font-weight: 600;
  line-height: 12px;
  color: var(--ink-muted);
}

.trends-day.today .trends-day-label {
  font-weight: 700;
}

.trends-day.active .trends-day-label {
  color: var(--ink);
  font-weight: 900;
}

.trends-legend {
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

.legend-swatch.under-goal {
  background: var(--trends-under);
}

.legend-swatch.over-goal {
  background: var(--trends-over);
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