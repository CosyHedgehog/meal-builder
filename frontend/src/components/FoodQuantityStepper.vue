<script setup>
import { nextTick, onMounted, onUnmounted, ref, watch } from 'vue'

const props = defineProps({
  name: { type: String, required: true },
  quantity: { type: Number, required: true },
  kcal: { type: Number, required: true },
  initialOpen: { type: Boolean, default: false },
  open: { type: Boolean, default: false },
  colorIndex: { type: Number, default: 0 },
  oneOff: { type: Boolean, default: false },
  oneClickMode: { type: Boolean, default: false },
  locked: { type: Boolean, default: false },
  adjusted: { type: Boolean, default: false },
  adjustable: { type: Boolean, default: false },
})

const stepperWrap = ref(null)
const popoverPlacement = ref('center')

const emit = defineEmits(['decrement', 'increment', 'set-quantity', 'toggle', 'adjust'])

function openQuantityPopover(event, addOne = false) {
  event.stopPropagation()
  if (props.locked) return
  if (props.oneClickMode && addOne) emit('increment')
  emit('toggle', true)
}

function updatePopoverPlacement() {
  const rect = stepperWrap.value?.getBoundingClientRect()
  if (!rect) return
  const panelWidth = 112
  const viewportPadding = 8
  const center = rect.left + rect.width / 2
  popoverPlacement.value = center - panelWidth / 2 < viewportPadding
    ? 'start'
    : center + panelWidth / 2 > window.innerWidth - viewportPadding
      ? 'end'
      : 'center'
}

function closePopover() {
  emit('toggle', false)
}

function handleDocumentClick(event) {
  if (!event.target.closest('.food-stepper-wrap')) emit('toggle', false)
}

watch(
  () => props.open,
  async (isOpen) => {
    if (isOpen) {
      await nextTick()
      updatePopoverPlacement()
    }
  },
  { immediate: true }
)

onMounted(() => {
  document.addEventListener('click', handleDocumentClick)
  window.addEventListener('resize', updatePopoverPlacement)
})

onUnmounted(() => {
  document.removeEventListener('click', handleDocumentClick)
  window.removeEventListener('resize', updatePopoverPlacement)
})

defineExpose({ closePopover })
</script>

<template>
  <div ref="stepperWrap" class="food-stepper-wrap" :class="{ active: open }">
    <button type="button" class="food-stepper"
      :class="[`group-${colorIndex}`, { 'one-off': oneOff, 'dashboard-locked': !locked, active: open, selected: quantity > 0 }]"
      :aria-label="`${name}, quantity ${quantity}`" @click="openQuantityPopover($event, true)">
      <span class="food-stepper-name">{{ name }}<span v-if="oneOff" class="one-off-badge">1-off</span><span
          v-if="adjusted" class="one-off-badge">adjusted</span></span>
      <span class="food-stepper-kcal">{{ Math.round(kcal * (quantity || 1)).toLocaleString() }} kcal</span>
    </button>
    <button v-if="quantity > 0" type="button" class="food-stepper-quantity" :aria-label="`Adjust ${name} quantity`"
      @click="openQuantityPopover">{{ quantity }}</button>
    <div v-if="open && !locked && adjustable" class="food-adjust-popover" :class="`placement-${popoverPlacement}`">
      <button type="button" class="food-stepper-adjust" aria-label="Adjust today's quantities"
        title="Adjust today's quantities" @click.stop="$emit('adjust'); closePopover()">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
          stroke-linejoin="round" aria-hidden="true">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
          <path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
        <span>Adjust</span>
      </button>
    </div>
    <div v-if="open && !locked" class="food-quantity-popover" :class="`placement-${popoverPlacement}`" role="group"
      :aria-label="`Adjust ${name} quantity`">
      <div class="food-quantity-controls">
        <button type="button" class="food-stepper-control" :disabled="quantity <= 0" :aria-label="`Remove one ${name}`"
          @click.stop="quantity === 1 && closePopover(); $emit('decrement')">−</button>
        <input class="food-stepper-quantity-input" type="number" min="1" step="any" :value="quantity"
          :aria-label="`${name} quantity`" @click.stop @change="$emit('set-quantity', Number($event.target.value))" />
        <button type="button" class="food-stepper-control" :aria-label="`Add one ${name}`"
          @click.stop="$emit('increment')">＋</button>
      </div>
    </div>
  </div>
</template>
