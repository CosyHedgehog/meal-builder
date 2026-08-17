<script setup>
import { computed } from 'vue'
import BaseModal from './BaseModal.vue'

const props = defineProps({ item: { type: Object, required: true } })
const emit = defineEmits(['close'])

const items = computed(() => {
  try {
    return Array.isArray(props.item.items) ? props.item.items : JSON.parse(props.item.items || '[]')
  } catch {
    return []
  }
})

function formatQuantity(value) {
  const quantity = Number(value)
  if (!Number.isFinite(quantity) || quantity === 1) return ''
  return Number.isInteger(quantity) ? ` × ${quantity}` : ` × ${quantity.toFixed(2).replace(/0+$/, '').replace(/\.$/, '')}`
}

function formatDate(value) {
  return new Date(`${value}T12:00:00`).toLocaleDateString(undefined, {
    weekday: 'long', month: 'short', day: 'numeric', year: 'numeric',
  })
}
</script>

<template>
  <BaseModal
    :title="item.username"
    :subtitle="`${formatDate(item.log_date)} · Logged food items`"
    panel-class="activity-day-modal"
    @close="emit('close')"
  >
    <div class="activity-day-content">
      <div v-if="!items.length" class="empty-note">No food details were recorded for this day.</div>
      <div v-else class="manager-list activity-day-list">
        <div v-for="(food, index) in items" :key="`${food.name}-${index}`" class="activity-day-item">
          <span>{{ food.name }}{{ formatQuantity(food.quantity) }}</span>
          <strong>{{ Number(food.calories || 0).toLocaleString() }} kcal</strong>
        </div>
      </div>
      <div class="activity-day-total section-block">
        <span>Total logged</span>
        <strong>{{ Number(item.calories).toLocaleString() }} kcal</strong>
      </div>
    </div>
  </BaseModal>
</template>

<style scoped>
.activity-day-content { display: flex; flex-direction: column; gap: 12px; }
.activity-day-list { gap: 0; max-height: 360px; }
.activity-day-item, .activity-day-total { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 11px 13px; }
.activity-day-item { border-bottom: 1px solid var(--line); color: var(--ink); font-size: 13px; }
.activity-day-item strong, .activity-day-total strong { font-family: 'IBM Plex Mono', monospace; white-space: nowrap; }
.activity-day-total { border-top: 1px solid var(--line); color: var(--ink-muted); font-size: 13px; }
.activity-day-total strong { color: var(--ink); font-size: 15px; }
</style>
