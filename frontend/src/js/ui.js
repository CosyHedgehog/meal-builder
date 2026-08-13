import { computed, reactive, ref, watch } from 'vue'
import { todayStr } from './date.js'

/* ---- selected log date ---- */
export const view = reactive({ logDate: todayStr() })

export function setLogDate(dateStr) {
  view.logDate = dateStr
}

/* ---- theme ---- */
const initial = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light'

export const theme = ref(initial)
export const isDark = computed(() => theme.value === 'dark')

watch(
  theme,
  (value) => {
    document.documentElement.setAttribute('data-theme', value)
    try {
      localStorage.setItem('theme', value)
    } catch {
      /* private mode */
    }
    const meta = document.getElementById('themeColorMeta')
    if (meta) meta.setAttribute('content', value === 'dark' ? '#10150f' : '#f3f5ee')
  },
  { immediate: true },
)

export function toggleTheme() {
  theme.value = theme.value === 'dark' ? 'light' : 'dark'
}