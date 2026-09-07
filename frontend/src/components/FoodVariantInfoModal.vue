<script setup>
import { computed } from 'vue'
import BaseModal from './BaseModal.vue'
import { state as store } from '../js/data.js'
import { closeModal, Modals, openModal } from '../js/modals.js'

const props = defineProps({ foodId: { type: String, required: true } })
const food = computed(() => store.foods.find((item) => item.id === props.foodId))
const family = computed(() => store.foods.find((item) => item.mode === 'family' && (item.variantFoodIds || []).includes(props.foodId)))

function viewFamily() {
  if (!family.value) return
  closeModal()
  openModal(Modals.FOOD_EDITOR, { foodId: family.value.id })
}
</script>

<template>
  <BaseModal v-if="food" :title="food.name" subtitle="Family variant" panel-class="food-variant-info-modal" @close="closeModal">
    <div class="variant-info-content">
      <span class="food-variant-info-chip">VARIANT</span>
      <p>This food is part of <strong>{{ family?.name || 'a food family' }}</strong>, so it is hidden from the dashboard food list. Choose it from the family chip instead.</p>
    </div>
    <button v-if="family" class="btn btn-primary btn-full" type="button" @click="viewFamily">View family</button>
  </BaseModal>
</template>

<style scoped>
.variant-info-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
  color: var(--ink-muted);
  font-size: 13px;
  line-height: 1.45;
}

.variant-info-content p {
  margin: 0;
}

.variant-info-content strong {
  color: var(--ink);
}

.food-variant-info-chip {
  align-self: flex-start;
  padding: 4px 7px;
  border-radius: 6px;
  background: var(--chip-bg);
  color: var(--ink-muted);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.06em;
}
</style>
