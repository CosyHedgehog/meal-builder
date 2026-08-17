<script setup>
import { onMounted, ref, watch } from 'vue'
import BaseModal from './BaseModal.vue'
import { activityApi } from '../js/api.js'
import { auth } from '../js/auth.js'
import { modalStack, openModal, Modals } from '../js/modals.js'

const emit = defineEmits(['close'])
const activity = ref([])
const loading = ref(true)
const error = ref('')

function calorieBalance(item) {
  return item.maintenance_calories - item.calories
}

function formatDate(value) {
  return new Date(`${value}T12:00:00`).toLocaleDateString(undefined, {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
  })
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
  <BaseModal title="Activity" subtitle="Recent calorie summaries from you and people you follow." panel-class="activity-modal" @close="emit('close')">
    <div class="manager-group activity-modal-content">
      <div v-if="loading" class="empty-note">Loading activity...</div>
      <div v-else-if="error" class="form-error">{{ error }}</div>
      <div v-else-if="!activity.length" class="activity-empty">
        <div class="activity-empty-icon" aria-hidden="true"></div>
        <strong>No activity yet</strong>
        <p>Follow someone who shares daily calories to see their progress here.</p>
      </div>
      <div v-else class="manager-list activity-list">
        <article v-for="item in activity" :key="`${item.username}-${item.log_date}`" class="activity-item">
          <button class="activity-item-button" type="button" @click="openModal(Modals.ACTIVITY_DAY, { item })">
          <div class="activity-item-header">
            <strong>{{ item.username === auth.user?.username ? 'You' : item.username }}</strong>
            <span class="activity-calories">logged {{ item.calories.toLocaleString() }} kcal</span>
          </div>
          <div class="activity-item-meta">
            <span
              class="activity-pill"
              :class="calorieBalance(item) >= 0 ? 'deficit' : 'surplus'"
            >
              {{ Math.abs(calorieBalance(item)).toLocaleString() }} kcal {{ calorieBalance(item) >= 0 ? 'deficit' : 'surplus' }}
            </span>
            <span class="activity-meta-text">
              of {{ item.maintenance_calories.toLocaleString() }} maintenance · {{ formatDate(item.log_date) }}
            </span>
          </div>
          </button>
        </article>
      </div>
      <button class="btn btn-secondary btn-full follow-activity-button" type="button" @click="openModal(Modals.FOLLOW)">Find people to follow</button>
    </div>
  </BaseModal>
</template>

<style scoped>
.activity-list { gap: 0; }
.activity-item {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 7px;
  padding: 12px 14px;
  border-bottom: 1px solid var(--line);
}
.activity-item:last-child { border-bottom: 0; }
.activity-item-button {
  display: flex;
  width: 100%;
  min-height: 50px;
  flex-direction: column;
  gap: 7px;
  justify-content: center;
  padding: 9px 10px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: inherit;
  text-align: left;
  cursor: pointer;
  transition: background 0.12s ease, color 0.12s ease;
}
.activity-item-button:hover,
.activity-item-button:focus-visible {
  background: var(--surface-alt);
  color: var(--green-strong);
}
.activity-item-button:focus-visible { outline: 2px solid var(--green); outline-offset: 1px; }
.activity-item-button::after {
  position: absolute;
  right: 12px;
  color: var(--ink-muted);
  content: '›';
  font-size: 22px;
  line-height: 1;
}

.activity-item-header {
  display: flex;
  align-items: baseline;
  gap: 6px;
  padding-right: 22px;
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
  gap: 8px;
}

.activity-pill {
  display: inline-flex;
  align-items: center;
  padding: 2px 7px;
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

.activity-empty { display: flex; flex-direction: column; align-items: center; padding: 26px 16px 20px; text-align: center; }
.activity-empty-icon { position: relative; width: 42px; height: 42px; margin-bottom: 12px; border: 2px solid var(--green); border-radius: 50%; opacity: .8; }
.activity-empty-icon::before { position: absolute; left: 19px; top: 8px; width: 2px; height: 13px; border-radius: 2px; background: var(--green); content: ''; transform-origin: bottom center; }
.activity-empty-icon::after { position: absolute; left: 19px; top: 8px; width: 2px; height: 11px; border-radius: 2px; background: var(--green); content: ''; transform-origin: bottom center; transform: rotate(125deg); }
.activity-empty strong { color: var(--ink); font-size: 16px; }
.activity-empty p { max-width: 300px; margin: 6px 0 0; color: var(--ink-muted); font-size: 13px; line-height: 1.45; }
.follow-activity-button { margin-top: 14px; }

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
