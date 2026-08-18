<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import BaseModal from './BaseModal.vue'
import { activityApi } from '../js/api.js'
import { auth } from '../js/auth.js'
import { modalStack, openModal, Modals } from '../js/modals.js'

const emit = defineEmits(['close'])
const activity = ref([])
const loading = ref(true)
const error = ref('')
const expandedActivity = ref(null)

function calorieBalance(item) {
  return item.maintenance_calories - item.calories
}

function formatDate(value) {
  return new Date(`${value}T12:00:00`).toLocaleDateString(undefined, {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
  })
}

function activityItems(item) {
  try {
    return Array.isArray(item.items) ? item.items : JSON.parse(item.items || '[]')
  } catch {
    return []
  }
}

function formatQuantity(value) {
  const quantity = Number(value)
  if (!Number.isFinite(quantity) || quantity === 1) return ''
  return Number.isInteger(quantity) ? ` × ${quantity}` : ` × ${quantity.toFixed(2).replace(/0+$/, '').replace(/\.$/, '')}`
}

function activityKey(item) {
  return `${item.username}-${item.log_date}`
}

function toggleActivity(item) {
  const key = activityKey(item)
  expandedActivity.value = expandedActivity.value === key ? null : key
}

async function loadFeed() {
  loading.value = true
  error.value = ''
  try {
    const result = await activityApi.feed()
    activity.value = result.activity || []
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

onMounted(loadFeed)

watch(
  () => modalStack[modalStack.length - 1]?.name,
  (name, previousName) => {
    if (name === Modals.ACTIVITY && previousName !== Modals.ACTIVITY) loadFeed()
  },
)
</script>

<template>
  <BaseModal title="Activity" subtitle="Recent calorie summaries from you and people you follow."
    panel-class="activity-modal" @close="emit('close')">
    <div class="manager-group activity-modal-content">
      <div v-if="loading" class="empty-note">Loading activity...</div>
      <div v-else-if="error" class="form-error">{{ error }}</div>
      <div v-else-if="!activity.length" class="activity-empty">
        <svg class="activity-empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
          stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
        </svg>
        <strong>No activity yet</strong>
        <p>Follow someone who shares daily calories to see their progress here.</p>
      </div>
      <div v-else class="manager-list activity-list">
        <article v-for="item in activity" :key="activityKey(item)" class="activity-item">
          <button class="activity-item-button" type="button" :aria-expanded="expandedActivity === activityKey(item)"
            @click="toggleActivity(item)">
            <div class="activity-item-header">
              <strong>{{ item.username === auth.user?.username ? 'You' : item.username }}</strong>
              <span class="activity-calories">logged {{ item.calories.toLocaleString() }} kcal</span>
            </div>
            <div class="activity-item-meta">
              <span class="activity-pill" :class="calorieBalance(item) >= 0 ? 'deficit' : 'surplus'">
                {{ Math.abs(calorieBalance(item)).toLocaleString() }} kcal {{ calorieBalance(item) >= 0 ? 'deficit' :
                'surplus' }}
              </span>
              <span class="activity-meta-text">· {{ formatDate(item.log_date) }}</span>
            </div>
            <span class="activity-chevron" aria-hidden="true">›</span>
          </button>
          <div v-if="expandedActivity === activityKey(item)" class="activity-day-content">
            <div v-if="!activityItems(item).length" class="empty-note">No food details were recorded for this day.</div>
            <div v-else class="activity-day-list">
              <div v-for="(food, index) in activityItems(item)" :key="`${food.name}-${index}`"
                class="activity-day-item">
                <span>{{ food.name }}{{ formatQuantity(food.quantity) }}</span>
                <strong>{{ Number(food.calories || 0).toLocaleString() }} kcal</strong>
              </div>
            </div>
          </div>
        </article>
      </div>
      <button class="btn btn-secondary btn-full follow-activity-button" type="button"
        @click="openModal(Modals.FOLLOW)">Find people to follow</button>
    </div>
  </BaseModal>
</template>

<style scoped>
.activity-item {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 0;
  padding: 5px;
}

.activity-item-button {
  position: relative;
  display: flex;
  width: 100%;
  min-height: 48px;
  flex-direction: column;
  gap: 5px;
  justify-content: center;
  padding: 10px 34px 10px 12px;
  border: 1px solid transparent;
  border-radius: 8px;
  background: var(--surface);
  color: inherit;
  text-align: left;
  cursor: pointer;
  transition: background 0.12s ease, border-color 0.12s ease, color 0.12s ease;
}

.activity-item-button:hover,
.activity-item-button:focus-visible {
  background: var(--surface-alt);
  color: var(--green-strong);
}

.activity-item-button[aria-expanded="true"] {
  background: var(--surface-alt);
  border-radius: 8px 8px 0 0;
  border-bottom-color: transparent;
}

.activity-item-button:focus-visible {
  outline-offset: 1px;
}

.activity-chevron {
  position: absolute;
  top: 50%;
  right: 14px;
  color: var(--ink-muted);
  font-size: 22px;
  line-height: 1;
  transform: translateY(-50%);
  transition: color 0.12s ease, transform 0.12s ease;
}

.activity-item-button:hover .activity-chevron,
.activity-item-button:focus-visible .activity-chevron {
  transform: translate(2px, -50%);
}

.activity-item-button[aria-expanded="true"] .activity-chevron {
  transform: translate(0, -50%) rotate(90deg);
}

.activity-item-header {
  display: flex;
  align-items: baseline;
  gap: 6px;
}

.activity-item-header strong {
  color: var(--ink);
  font-size: 14px;
  font-weight: 600;
}

.activity-calories {
  color: var(--ink);
  font-size: 14px;
}

.activity-item-meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
}

.activity-pill {
  display: inline-flex;
  align-items: center;
  padding: 1px 6px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
  line-height: 1.3;
}

.activity-pill.deficit {
  background: color-mix(in srgb, var(--green) 14%, transparent);
  color: var(--green-strong);
}

.activity-pill.surplus {
  background: color-mix(in srgb, var(--red) 14%, transparent);
  color: var(--red);
}

.activity-meta-text {
  color: var(--ink-muted);
  font-size: 12px;
}

.activity-day-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 0 12px 0px 12px;
  border-top: 0;
  border-radius: 0 0 8px 8px;
  background: var(--surface-alt);
}

.activity-day-list {
  max-height: 360px;
  overflow-y: auto;
}

.activity-day-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 0;
}

.activity-day-item {
  border-bottom: 1px solid var(--line);
  color: var(--ink);
  font-size: 12px;
}

.activity-day-item strong {
  color: var(--ink);
  font-weight: 650;
  white-space: nowrap;
}

.activity-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 26px 16px 20px;
  text-align: center;
}

.activity-empty-icon {
  width: 42px;
  height: 42px;
  margin-bottom: 12px;
  color: var(--green);
  opacity: .8;
}

.activity-empty strong {
  color: var(--ink);
  font-size: 16px;
}

.activity-empty p {
  max-width: 300px;
  margin: 6px 0 0;
  color: var(--ink-muted);
  font-size: 13px;
  line-height: 1.45;
}

.follow-activity-button {
  margin-top: 14px;
}

@media (max-width: 480px) {
  :deep(.modal.activity-modal) {
    display: flex;
    flex-direction: column;
  }

  .activity-modal-content {
    display: flex;
    flex: 1;
    min-height: 0;
    flex-direction: column;
  }

  .activity-list {
    flex: 1;
    min-height: 0;
    max-height: none;
  }

  .follow-activity-button {
    flex: none;
    margin-top: 14px;
  }
}
</style>
