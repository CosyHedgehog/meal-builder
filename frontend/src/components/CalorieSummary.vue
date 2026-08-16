<script setup>
import { computed } from 'vue'
import { state as store, logGroupKcal, logTotalKcal } from '../js/data.js'

const props = defineProps({ log: { type: Object, required: true } })

const totalK = computed(() => logTotalKcal(props.log))
const deficit = computed(() => store.maintenanceCal - totalK.value)

const barTotal = computed(() => Math.max(store.maintenanceCal, totalK.value, 1))
const loggedPct = computed(() => Math.min(100, (totalK.value / barTotal.value) * 100))
const restPct = computed(() => Math.max(0, 100 - loggedPct.value))
const groupSegments = computed(() => {
  let offset = 0
  return store.groups
    .map((group, index) => {
      const kcal = logGroupKcal(props.log, group.id)
      return { group, index, kcal }
    })
    .filter(({ group, kcal }) => group.visible !== false || kcal > 0)
    .map(({ group, index, kcal }) => {
      const width = Math.min(100 - offset, (kcal / barTotal.value) * 100)
      const segment = { id: group.id, name: group.name, kcal, width, colorIndex: index }
      offset += width
      return segment
    })
})
</script>

<template>
  <div class="today-top">
    <div class="today-kcal">
      <strong>
        {{ totalK.toLocaleString() }}
        <span class="goal-kcal">/ {{ store.maintenanceCal.toLocaleString() }} kcal</span>
      </strong>
    </div>
  </div>

  <div class="today-status">
    <div class="today-status-bar">
      <div v-for="segment in groupSegments" :key="segment.id" class="status-seg"
        :class="`group-${segment.colorIndex % 5}`" :style="{ width: segment.width + '%' }"></div>
      <div class="status-seg deficit" :style="{ width: restPct + '%' }"></div>
    </div>

    <div class="today-status-labels">
      <div v-for="segment in groupSegments" :key="segment.id" class="status-pill">
        <span><i class="group-swatch" :class="`group-${segment.colorIndex % 5}`"></i>{{ segment.name }}</span>
        <strong>{{ segment.kcal.toLocaleString() }} <small>kcal</small></strong>
      </div>
      <div class="status-pill" :class="deficit >= 0 ? 'deficit' : 'surplus'">
        <span>{{ deficit >= 0 ? 'Deficit' : 'Surplus' }}</span>
        <strong>{{ Math.abs(deficit).toLocaleString() }} <small>kcal</small></strong>
      </div>
    </div>
  </div>
</template>

<style scoped>
.today-top {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
}

.today-kcal {
  font-family: 'IBM Plex Mono', monospace;
  color: var(--ink);
  text-align: center;
  white-space: nowrap;
}

.today-kcal strong {
  display: block;
  font-size: 20px;
}

.goal-kcal {
  color: var(--ink-muted);
  font: inherit;
}

.today-status {
  margin-top: 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.today-status-bar {
  height: 20px;
  border-radius: 999px;
  background: var(--surface-alt);
  overflow: hidden;
  display: flex;
}

.status-seg {
  height: 100%;
}

.status-seg.meal {
  background: var(--green);
}

.status-seg.group-0,
.legend-swatch.group-0 { background: var(--group-0); }
.status-seg.group-1,
.legend-swatch.group-1 { background: var(--group-1); }
.status-seg.group-2,
.legend-swatch.group-2 { background: var(--group-2); }
.status-seg.group-3,
.legend-swatch.group-3 { background: var(--group-3); }
.status-seg.group-4,
.legend-swatch.group-4 { background: var(--group-4); }

.status-seg.snack {
  background: var(--green-light);
}

.status-seg.deficit {
  background: transparent;
}

.today-status-labels {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}

.status-pill {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 0 2px;
  font-size: 13px;
  text-align: center;
}

.status-pill span {
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--ink-muted);
}

.group-swatch {
  display: inline-block;
  width: 8px;
  height: 8px;
  margin-right: 5px;
  border-radius: 2px;
  vertical-align: 1px;
}

.group-swatch.group-0 { background: var(--group-0); }
.group-swatch.group-1 { background: var(--group-1); }
.group-swatch.group-2 { background: var(--group-2); }
.group-swatch.group-3 { background: var(--group-3); }
.group-swatch.group-4 { background: var(--group-4); }

.status-pill strong {
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 3px;
  font-family: 'IBM Plex Mono', monospace;
  font-size: 16px;
  color: var(--ink);
}

.status-pill strong small {
  font-family: 'Inter', sans-serif;
  font-size: 10px;
  font-weight: 600;
  color: var(--ink-muted);
}

.status-pill.surplus strong {
  color: var(--red);
}

@media (max-width: 600px) {
  .today-kcal strong {
    font-size: 18px;
  }

  .today-status-labels {
    gap: 4px;
  }

  .status-pill span {
    font-size: 9px;
    letter-spacing: 0.08em;
    white-space: nowrap;
  }

  .status-pill strong {
    font-size: 15px;
  }

  .status-pill strong small {
    font-size: 9px;
  }
}
</style>