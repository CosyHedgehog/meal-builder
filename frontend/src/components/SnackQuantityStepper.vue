<script setup>
defineProps({
  name: { type: String, required: true },
  quantity: { type: Number, required: true },
  kcal: { type: Number, required: true },
  oneOff: { type: Boolean, default: false },
})

defineEmits(['decrement', 'increment'])
</script>

<template>
  <div class="snack-stepper" :class="{ 'one-off': oneOff }" role="group" :aria-label="`${name} quantity`">
    <button type="button" class="snack-stepper-control" :aria-label="`Remove one ${name}`" @click="$emit('decrement')">
      −
    </button>
    <span class="snack-stepper-label">
      <span>{{ quantity }} {{ name }}<span v-if="oneOff" class="one-off-badge">1-off</span></span>
      <span class="snack-stepper-kcal">{{ Math.round(kcal * quantity).toLocaleString() }} kcal</span>
    </span>
    <button type="button" class="snack-stepper-control" :aria-label="`Add one ${name}`" @click="$emit('increment')">
      ＋
    </button>
  </div>
</template>