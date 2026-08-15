<script setup>
defineProps({
  name: { type: String, required: true },
  quantity: { type: Number, required: true },
  kcal: { type: Number, required: true },
  colorIndex: { type: Number, default: 0 },
  oneOff: { type: Boolean, default: false },
  locked: { type: Boolean, default: false },
})

defineEmits(['decrement', 'increment', 'edit'])
</script>

<template>
  <div class="food-stepper" :class="[`group-${colorIndex}`, { 'one-off': oneOff }]" role="group" :aria-label="`${name} quantity`">
      <button v-if="!locked" type="button" class="food-stepper-control" :aria-label="`Remove one ${name}`" @click="$emit('decrement')">
      −
    </button>
    <button type="button" class="food-stepper-label" @click="$emit('edit')">
      <span>{{ quantity }} {{ name }}<span v-if="oneOff" class="one-off-badge">1-off</span></span>
      <span class="food-stepper-kcal">{{ Math.round(kcal * quantity).toLocaleString() }} kcal</span>
    </button>
      <button v-if="!locked" type="button" class="food-stepper-control" :aria-label="`Add one ${name}`" @click="$emit('increment')">
      ＋
    </button>
  </div>
</template>