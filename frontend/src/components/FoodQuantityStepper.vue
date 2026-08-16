<script setup>
import { onMounted, onUnmounted, ref } from 'vue'

const props = defineProps({
  name: { type: String, required: true },
  quantity: { type: Number, required: true },
  kcal: { type: Number, required: true },
  initialOpen: { type: Boolean, default: false },
  open: { type: Boolean, default: false },
  colorIndex: { type: Number, default: 0 },
  oneOff: { type: Boolean, default: false },
  locked: { type: Boolean, default: false },
})

const isOpen = ref(false)
const stepperWrap = ref(null)
const popoverPlacement = ref('center')

const emit = defineEmits(['decrement', 'increment', 'reset', 'toggle'])

function incrementQuantity() {
  if (props.locked) return
  emit('toggle', false)
  emit('increment')
}

function openQuantityPopover(event) {
  event.stopPropagation()
  if (props.locked) return
  updatePopoverPlacement()
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

onMounted(() => document.addEventListener('click', handleDocumentClick))
onUnmounted(() => document.removeEventListener('click', handleDocumentClick))

defineExpose({ closePopover })
</script>

<template>
  <div ref="stepperWrap" class="food-stepper-wrap" :class="{ active: open }">
      <button
        type="button"
        class="food-stepper"
        :class="[`group-${colorIndex}`, { 'one-off': oneOff, 'dashboard-locked': !locked, active: open, selected: quantity > 0 }]"
        :aria-label="`${name}, quantity ${quantity}`"
        @click="incrementQuantity"
      >
        <span class="food-stepper-name">{{ name }}<span v-if="oneOff" class="one-off-badge">1-off</span></span>
        <span class="food-stepper-kcal">{{ Math.round(kcal * (quantity || 1)).toLocaleString() }} kcal</span>
      </button>
      <button
        v-if="quantity > 0"
        type="button"
        class="food-stepper-quantity"
        :aria-label="`Adjust ${name} quantity`"
        @click="openQuantityPopover"
      >{{ quantity }}</button>
      <div v-if="open && !locked" class="food-quantity-popover" :class="`placement-${popoverPlacement}`" role="group" :aria-label="`Adjust ${name} quantity`">
        <button type="button" class="food-stepper-control" :aria-label="`Remove one ${name}`" @click.stop="quantity === 1 && closePopover(); $emit('decrement')">−</button>
        <button type="button" class="food-stepper-reset" :aria-label="`Reset ${name} quantity to zero`" title="Reset quantity" @click.stop="$emit('reset')">↺</button>
        <button type="button" class="food-stepper-control" :aria-label="`Add one ${name}`" @click.stop="$emit('increment')">＋</button>
      </div>
    </div>
</template>