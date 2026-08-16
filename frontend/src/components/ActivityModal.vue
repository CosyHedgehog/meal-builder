<script setup>
import { onMounted, ref } from 'vue'
import BaseModal from './BaseModal.vue'
import { activityApi } from '../js/api.js'
import { openModal, Modals } from '../js/modals.js'

const emit = defineEmits(['close'])
const activity = ref([])
const loading = ref(true)
const error = ref('')

function formatDate(value) {
  return new Date(`${value}T12:00:00`).toLocaleDateString(undefined, {
    weekday: 'long', month: 'short', day: 'numeric', year: 'numeric',
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
</script>

<template>
  <BaseModal title="Activity" subtitle="Recent calorie summaries from people you follow." @close="emit('close')">
    <div class="manager-group">
      <div v-if="loading" class="empty-note">Loading activity...</div>
      <div v-else-if="error" class="form-error">{{ error }}</div>
      <div v-else-if="!activity.length" class="activity-empty">
        <p>No activity yet.</p>
        <button class="btn btn-primary" type="button" @click="openModal(Modals.FOLLOW)">Find someone to follow</button>
      </div>
      <div v-else class="manager-list activity-list">
        <article v-for="item in activity" :key="`${item.username}-${item.log_date}`" class="activity-item">
          <strong>{{ item.username }} logged {{ item.calories.toLocaleString() }} calories</strong>
          <span>out of {{ item.maintenance_calories.toLocaleString() }} maintenance · {{ formatDate(item.log_date) }}</span>
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
.activity-empty { padding: 18px 0 4px; text-align: center; }
.follow-activity-button { margin-top: 14px; }
</style>
