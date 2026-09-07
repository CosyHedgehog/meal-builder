<script setup>
import { computed } from 'vue'
import BaseModal from './BaseModal.vue'
import { state as store, foodKcal, getFoodFamily, getLog, logEntries, selectFoodFamilyVariant, clearFoodFamilyVariant } from '../js/data.js'
import { closeModal, Modals, openModal } from '../js/modals.js'
import { view } from '../js/ui.js'

const props = defineProps({ familyId: { type: String, required: true } })
const family = computed(() => getFoodFamily(props.familyId))
const entries = computed(() => logEntries(getLog(view.logDate)))
const variants = computed(() => (family.value?.variantFoodIds || [])
  .map((id) => store.foods.find((food) => food.id === id))
  .filter((food) => food && !food.archived))
const selectedVariantId = computed(() => view.selectedFamilyVariants[props.familyId]
  || entries.value.find((entry) => variants.value.some((variant) => variant.id === entry.foodId))?.foodId
  || '')

function quantityFor(foodId) {
  return entries.value
    .filter((entry) => entry.foodId === foodId)
    .reduce((total, entry) => total + (Number(entry.qty) || 0), 0)
}

function chooseVariant(food) {
  if (food.archived) return
  view.selectedFamilyVariants[family.value.id] = food.id
  selectFoodFamilyVariant(view.logDate, family.value.id, food.id)
  closeModal()
  setTimeout(() => {
    view.openFoodStepperId = food.id
  }, 0)
}

function chooseNoVariant() {
  delete view.selectedFamilyVariants[family.value.id]
  view.openFoodStepperId = ''
  clearFoodFamilyVariant(view.logDate, family.value.id)
  closeModal()
}

function manageFamilies() {
  closeModal()
  openModal(Modals.FOOD_EDITOR, { foodId: family.value.id })
}
</script>

<template>
  <BaseModal v-if="family" :title="family.name" subtitle="Choose one variant." panel-class="food-family-picker-modal" @close="closeModal">
    <div class="family-picker-list">
      <button type="button" class="family-picker-option family-picker-none-option" :class="{ selected: !selectedVariantId }" :aria-pressed="!selectedVariantId" @click="chooseNoVariant">
        <span class="family-picker-radio" aria-hidden="true">
          <span v-if="!selectedVariantId"></span>
        </span>
        <span class="family-picker-copy">
          <strong>No variant</strong>
          <small>Leave this family unselected</small>
        </span>
      </button>
      <button v-for="food in variants" :key="food.id" type="button" class="family-picker-option" :class="{ selected: selectedVariantId === food.id, archived: food.archived }" :aria-pressed="selectedVariantId === food.id" :disabled="food.archived" @click="chooseVariant(food)">
        <span class="family-picker-radio" aria-hidden="true">
          <span v-if="selectedVariantId === food.id"></span>
        </span>
        <span class="family-picker-copy">
          <strong>{{ food.name }}</strong>
          <small>{{ foodKcal(food).toLocaleString() }} kcal · {{ food.mode === 'simple' ? 'simple food' : 'ingredients' }}<span v-if="food.archived"> · Hidden</span></small>
        </span>
        <span v-if="quantityFor(food.id)" class="family-picker-count">{{ quantityFor(food.id) }} today</span>
      </button>
      <p v-if="!variants.length" class="empty-note">This family has no active variants yet.</p>
    </div>
    <button class="btn btn-secondary btn-full family-picker-manage" type="button" @click="manageFamilies">Edit food variants</button>
  </BaseModal>
</template>

<style scoped>
.family-picker-list {
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.family-picker-option {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  min-height: 58px;
  padding: 10px 11px;
  border: 1px solid var(--line);
  border-radius: 10px;
  background: var(--surface-alt);
  color: var(--ink);
  text-align: left;
}

.family-picker-option:hover,
.family-picker-option:focus-visible {
  border-color: var(--green);
  background: var(--green-soft);
  outline: none;
}

.family-picker-option.selected {
  border-color: var(--green);
  background: var(--green-soft);
}

.family-picker-none-option {
  order: -1;
}

.family-picker-option.archived {
  border-style: dashed;
  cursor: default;
  opacity: 0.7;
}

.family-picker-option.archived:hover,
.family-picker-option.archived:focus-visible {
  border-color: var(--line);
  background: var(--surface-alt);
}

.family-picker-radio {
  display: inline-flex;
  width: 18px;
  height: 18px;
  align-items: center;
  justify-content: center;
  flex: none;
  border: 2px solid var(--ink-muted);
  border-radius: 50%;
}

.family-picker-option.selected .family-picker-radio {
  border-color: var(--green);
}

.family-picker-radio span {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--green);
}

.family-picker-copy {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  gap: 3px;
}

.family-picker-copy strong {
  font-size: 13px;
  font-weight: 650;
}

.family-picker-copy small,
.family-picker-count {
  color: var(--ink-muted);
  font-size: 11px;
}

.family-picker-count {
  white-space: nowrap;
}

.family-picker-manage {
  margin-top: 16px;
}

</style>
