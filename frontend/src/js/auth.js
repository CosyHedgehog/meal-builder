import { reactive } from 'vue'
import { authApi } from './api.js'
import { loadData, resetData } from './data.js'

export const auth = reactive({ user: null, ready: false })

export async function initAuth() {
  try {
    const result = await authApi.me()
    auth.user = result.user || null
  } catch {
    auth.user = null
  }
  if (auth.user) await loadData()
  auth.ready = true
}

export async function signIn(mode, username, password) {
  const result = mode === 'signup'
    ? await authApi.signup(username, password)
    : await authApi.login(username, password)
  auth.user = result.user
  await loadData()
}

export async function signOut() {
  try {
    await authApi.logout()
  } catch {
    /* sign out locally regardless */
  }
  auth.user = null
  resetData()
}