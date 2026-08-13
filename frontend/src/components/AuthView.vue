<script setup>
import { computed, ref } from 'vue'
import { signIn } from '../js/auth.js'

const mode = ref('login')
const username = ref('')
const password = ref('')
const busy = ref(false)
const message = ref('')
const error = ref(false)

const submitLabel = computed(() => (mode.value === 'login' ? 'Log in' : 'Create account'))

function setMode(next) {
  mode.value = next
  message.value = ''
  error.value = false
}

async function submit() {
  busy.value = true
  error.value = false
  message.value = mode.value === 'login' ? 'Signing in…' : 'Creating account…'
  try {
    await signIn(mode.value, username.value.trim(), password.value)
  } catch (err) {
    console.error(err)
    message.value = err.message || 'Authentication failed.'
    error.value = true
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="auth-shell">
    <div class="auth-card">
      <div class="eyebrow">Pantry to Plate</div>
      <h1>Meal Builder</h1>
      <div class="subtitle">
        Sign in to keep your meals, snacks and history in your SQLite database.
      </div>

      <div class="auth-tabs">
        <button class="auth-tab" :class="{ active: mode === 'login' }" @click="setMode('login')">
          Log in
        </button>
        <button class="auth-tab" :class="{ active: mode === 'signup' }" @click="setMode('signup')">
          Sign up
        </button>
      </div>

      <form @submit.prevent="submit">
        <div class="input-field">
          <label for="authUsername">Username</label>
          <input
            id="authUsername"
            v-model="username"
            type="text"
            autocomplete="username"
            minlength="3"
            placeholder="Choose a username"
            required
          />
        </div>
        <div class="input-field">
          <label for="authPassword">Password</label>
          <input
            id="authPassword"
            v-model="password"
            type="password"
            :autocomplete="mode === 'login' ? 'current-password' : 'new-password'"
            minlength="6"
            placeholder="At least 6 characters"
            required
          />
        </div>
        <button class="btn btn-primary auth-submit" type="submit" :disabled="busy">
          {{ submitLabel }}
        </button>
      </form>

      <div class="auth-message" :class="{ error, ok: !error }">{{ message }}</div>
      <div class="auth-note">
        Your account and Meal Builder data are stored in the local SQLite database on the server.
      </div>
    </div>
  </div>
</template>

<style scoped>
.auth-shell {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.auth-card {
  width: 420px;
  max-width: 100%;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 20px;
  padding: 30px;
  box-shadow: 0 14px 40px rgba(var(--shadow-rgb), 0.08);
}

.auth-card h1 {
  font-size: 30px;
  margin-bottom: 6px;
}

.auth-card .subtitle {
  margin-bottom: 22px;
}

.auth-tabs {
  display: flex;
  gap: 4px;
  background: var(--surface-alt);
  padding: 4px;
  border-radius: 10px;
  margin-bottom: 18px;
}

.auth-tab {
  flex: 1;
  padding: 9px;
  border-radius: 8px;
  background: transparent;
  color: var(--ink-muted);
  font-weight: 600;
  font-size: 13px;
}

.auth-tab.active {
  background: var(--surface);
  color: var(--ink);
  box-shadow: 0 1px 4px rgba(var(--shadow-rgb), 0.08);
}

.auth-submit {
  width: 100%;
  margin-top: 6px;
}

.auth-message {
  font-size: 12px;
  margin-top: 12px;
  min-height: 16px;
}

.auth-message.error {
  color: var(--red);
}

.auth-message.ok {
  color: var(--green);
}

.auth-note {
  font-size: 11px;
  color: var(--ink-muted);
  margin-top: 16px;
  line-height: 1.5;
}
</style>