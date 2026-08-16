<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import BaseModal from './BaseModal.vue'
import { activityApi } from '../js/api.js'

const emit = defineEmits(['close'])
const query = ref('')
const users = ref([])
const following = ref([])
const loading = ref(false)
const error = ref('')

const followedIds = computed(() => new Set(following.value.map((user) => user.id)))

async function loadFollowing() {
  const result = await activityApi.following()
  following.value = result.users || []
}

async function search() {
  if (!query.value.trim()) {
    users.value = []
    return
  }
  loading.value = true
  error.value = ''
  try {
    const result = await activityApi.searchUsers(query.value.trim())
    users.value = result.users || []
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

let timer
watch(query, () => {
  clearTimeout(timer)
  timer = setTimeout(search, 250)
})

async function follow(user) {
  try {
    await activityApi.follow(user.id)
    await loadFollowing()
    query.value = ''
    users.value = []
  } catch (e) {
    error.value = e.message
  }
}

async function unfollow(user) {
  try {
    await activityApi.unfollow(user.id)
    await loadFollowing()
  } catch (e) {
    error.value = e.message
  }
}

onMounted(async () => {
  try {
    await loadFollowing()
    await search()
  } catch (e) {
    error.value = e.message
  }
})

onUnmounted(() => clearTimeout(timer))
</script>

<template>
  <BaseModal title="Follow people" subtitle="Search by username to follow someone." @close="emit('close')">
    <div class="manager-group">
      <label class="follow-search-field">
        <span>Search usernames</span>
        <input v-model="query" class="manager-search" type="search" placeholder="Search usernames..." />
      </label>
      <div v-if="error" class="form-error">{{ error }}</div>
      <div v-if="loading" class="empty-note">Searching...</div>
      <div v-else-if="!users.length" class="empty-note">No users found.</div>
      <div v-else-if="users.length" class="manager-list">
        <div v-for="user in users" :key="user.id" class="manager-item-row">
          <div class="manager-item-wrap">
            <div class="user-item">
              <strong>{{ user.username }}</strong>
              <small>{{ user.shareActivity ? 'Activity shared' : 'Activity private' }}</small>
            </div>
            <button v-if="followedIds.has(user.id)" class="btn btn-secondary follow-button" type="button" @click="unfollow(user)">Following</button>
            <button v-else class="btn btn-primary follow-button" type="button" @click="follow(user)">Follow</button>
          </div>
        </div>
      </div>
      <div class="follow-section-title">Following</div>
      <div v-if="following.length" class="manager-list">
        <div v-for="user in following" :key="user.id" class="manager-item-row">
          <div class="manager-item-wrap">
            <div class="user-item">
              <strong>{{ user.username }}</strong>
              <small>{{ user.shareActivity ? 'Activity shared' : 'Activity private' }}</small>
            </div>
            <button class="btn btn-danger-outline follow-button" type="button" @click="unfollow(user)">Unfollow</button>
          </div>
        </div>
      </div>
      <div v-else class="empty-note">You are not following anyone yet.</div>
    </div>
  </BaseModal>
</template>

<style scoped>
.follow-search-field { display: flex; flex-direction: column; gap: 6px; margin: 12px 0 14px; color: var(--ink-muted); font-size: 11px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; }
.manager-search { box-sizing: border-box; width: 100%; min-height: 42px; margin: 0; padding: 10px 12px; border: 1px solid var(--line); border-radius: 9px; background: var(--bg); color: var(--ink); font: inherit; font-size: 14px; letter-spacing: 0; text-transform: none; appearance: none; }
.manager-search:focus { outline: 2px solid var(--green); outline-offset: 1px; }
.manager-search::placeholder { color: var(--ink-muted); opacity: .8; }
.manager-item-wrap { min-width: 0; gap: 10px; padding: 2px 4px 2px 6px; }
.user-item { min-width: 0; flex: 1; padding: 10px 4px; overflow: hidden; color: var(--ink); }
.user-item strong { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.user-item small { display: block; margin-top: 3px; color: var(--ink-muted); font-size: 11px; }
.follow-button { flex: none; min-height: 34px; padding: 7px 12px; font-size: 12px; white-space: nowrap; }
.follow-section-title { margin: 20px 0 8px; color: var(--ink-muted); font-size: 11px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; }
</style>
