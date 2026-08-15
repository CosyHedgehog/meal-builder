<script setup>
defineProps({
  title: String,
  subtitle: String,
  panelClass: String,
  backdropClass: String,
  backLabel: String,
  onTouchStart: Function,
  onTouchEnd: Function,
})
const emit = defineEmits(['close', 'back'])
</script>

<template>
  <div class="modal-backdrop" :class="backdropClass" @click.self="emit('close')">
    <div
      class="modal"
      :class="panelClass"
      role="dialog"
      aria-modal="true"
      @touchstart.passive="onTouchStart"
      @touchend.passive="onTouchEnd"
    >
      <button class="modal-close" aria-label="Close" @click="emit('close')">×</button>
      <button v-if="backLabel" class="modal-back" type="button" @click="emit('back')">
        ‹ {{ backLabel }}
      </button>
      <h2 v-if="title">{{ title }}</h2>
      <div v-if="subtitle" class="subtitle" :class="{ 'subtitle-preserve-lines': subtitle.includes('\n') }">{{ subtitle }}</div>
      <slot />
    </div>
  </div>
</template>