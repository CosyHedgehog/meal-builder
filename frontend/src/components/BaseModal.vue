<script setup>
import { ref } from 'vue'

defineProps({
  title: String,
  subtitle: String,
  panelClass: String,
  backdropClass: String,
  backLabel: String,
  mobileHelp: { type: Boolean, default: true },
  onTouchStart: Function,
  onTouchEnd: Function,
})
const emit = defineEmits(['close', 'back'])
const helpOpen = ref(false)
</script>

<template>
  <div class="modal-backdrop" :class="backdropClass" @click.self="emit('close')">
    <div
      class="modal"
      :class="panelClass"
      role="dialog"
      aria-modal="true"
        @click="helpOpen = false"
      @touchstart.passive="onTouchStart"
      @touchend.passive="onTouchEnd"
    >
      <div class="modal-mobile-header">
        <button class="modal-mobile-back" type="button" :aria-label="backLabel ? `Back to ${backLabel}` : 'Close'"
          @click="backLabel ? emit('back') : emit('close')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
            stroke-linejoin="round" aria-hidden="true">
            <path d="m15 18-6-6 6-6" />
          </svg>
        </button>
        <h2 v-if="title">{{ title }}</h2>
        <button v-if="subtitle && mobileHelp" class="modal-mobile-help-toggle" type="button"
            aria-label="Show more information" :aria-expanded="helpOpen" @click.stop="helpOpen = !helpOpen">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 11v5" />
            <path d="M12 8h.01" stroke-linecap="round" />
          </svg>
        </button>
        <div v-if="subtitle && mobileHelp && helpOpen" class="modal-mobile-help-popover" role="dialog"
          aria-label="More information" @click.stop>
          <p>{{ subtitle }}</p>
          <button type="button" aria-label="Close information" @click="helpOpen = false">×</button>
        </div>
      </div>
      <button class="modal-close" aria-label="Close" @click="emit('close')">×</button>
      <h2 v-if="title">{{ title }}</h2>
      <div v-if="subtitle" class="subtitle" :class="{ 'subtitle-preserve-lines': subtitle.includes('\n'), 'mobile-help-subtitle': mobileHelp }">{{ subtitle }}</div>
      <slot />
    </div>
  </div>
</template>