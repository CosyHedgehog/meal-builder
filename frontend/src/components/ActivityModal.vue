<script setup>
import { onMounted, ref, watch } from 'vue'
import BaseModal from './BaseModal.vue'
import { activityApi } from '../js/api.js'
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
  <BaseModal title="Activity" subtitle="Recent calorie summaries from people you follow." panel-class="activity-modal" @close="emit('close')">
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
          <strong>{{ item.username }} logged {{ item.calories.toLocaleString() }} calories</strong>
          <span>{{ calorieBalance(item) >= 0 ? '-' : '+' }}{{ Math.abs(calorieBalance(item)).toLocaleString() }} kcal · {{ item.maintenance_calories.toLocaleString() }} maintenance · {{ formatDate(item.log_date) }}</span>
          
        </article>
      </div>
      <button class="btn btn-secondary btn-full follow-activity-button" type="button" @click="openModal(Modals.FOLLOW)">Find people to follow</button>
    </div>
  </BaseModal>
</template>

<style scoped>
.activity-list { gap: 0; }
.activity-item { display: flex; flex-direction: column; gap: 4px; padding: 13px 14px; border-bottom: 1px solid var(--line); }
.activity-item:last-child { border-bottom: 0; }
.activity-item strong { color: var(--ink); font-size: 14px; }
.activity-item span { color: var(--ink-muted); font-size: 12px; }
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
