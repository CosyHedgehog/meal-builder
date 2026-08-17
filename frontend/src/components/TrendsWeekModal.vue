<script setup>
import BaseModal from './BaseModal.vue'

const props = defineProps({ week: { type: Object, required: true } })
const emit = defineEmits(['close'])

function formatDate(value) {
  return new Date(`${value}T12:00:00`).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
}

function balanceLabel(day) {
  return day.deficit >= 0 ? 'deficit' : 'surplus'
}
</script>

<template>
  <BaseModal title="Weekly details" subtitle="Daily calories and balance" @close="emit('close')">
    <div class="trends-week-detail-list manager-list">
      <div v-for="day in week.days" :key="day.date" class="trends-week-detail-row">
        <div>
          <strong>{{ formatDate(day.date) }}</strong>
          <span v-if="day.hasLog">{{ day.total.toLocaleString() }} kcal logged</span>
          <span v-else>No logged entries</span>
        </div>
        <span v-if="day.hasLog" class="trends-week-detail-balance" :class="{ surplus: day.deficit < 0 }">
          {{ Math.abs(day.deficit).toLocaleString() }} kcal {{ balanceLabel(day) }}
        </span>
      </div>
    </div>
  </BaseModal>
</template>

<style scoped>
.trends-week-detail-list { gap: 0; max-height: 60vh; }
.trends-week-detail-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 11px 13px; border-bottom: 1px solid var(--line); }
.trends-week-detail-row:last-child { border-bottom: 0; }
.trends-week-detail-row > div { display: flex; min-width: 0; flex-direction: column; gap: 3px; }
.trends-week-detail-row strong { color: var(--ink); font-size: 13px; }
.trends-week-detail-row span { color: var(--ink-muted); font-size: 11px; }
.trends-week-detail-balance { color: var(--green) !important; white-space: nowrap; }
.trends-week-detail-balance.surplus { color: var(--red) !important; }
</style>