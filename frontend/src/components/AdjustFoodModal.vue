<script setup>
import { computed, ref } from 'vue'
import BaseModal from './BaseModal.vue'
import { getFood, getIngredient, getLog, itemKcal, updateLogEntryVariant } from '../js/data.js'
import { view } from '../js/ui.js'

const props = defineProps({ entryId: { type: String, required: true } })
const emit = defineEmits(['close'])

const sourceEntry = getLog(view.logDate).entries.find((entry) => entry.id === props.entryId)
const food = computed(() => getFood(sourceEntry?.foodId))
const rows = ref((food.value?.items || []).map((item) => ({
  ...item,
  amount: sourceEntry?.overrides && Object.prototype.hasOwnProperty.call(sourceEntry.overrides, item.ingredientId)
    ? Number(sourceEntry.overrides[item.ingredientId]) || 0
    : item.amount,
})))
const resetRequested = ref(false)

const baseAmounts = computed(() => new Map((food.value?.items || []).map((item) => [item.ingredientId, Number(item.amount)])))
const totalKcal = computed(() => Math.round(rows.value.reduce((sum, row) => sum + itemKcal(row), 0)))
const hasAdjustment = computed(() => !resetRequested.value && (
  Object.keys(sourceEntry?.overrides || {}).length > 0
  || rows.value.some((row) => Number(row.amount) !== baseAmounts.value.get(row.ingredientId))
))
const hasPendingSave = computed(() => resetRequested.value || hasAdjustment.value)

function resetToDefaults() {
  rows.value.forEach((row) => { row.amount = baseAmounts.value.get(row.ingredientId) || 0 })
  resetRequested.value = true
}

function saveVariant() {
  const overrides = {}
  rows.value.forEach((row) => {
    const amount = Number(row.amount) || 0
    const baseAmount = baseAmounts.value.get(row.ingredientId)
    if (amount === baseAmount) delete overrides[row.ingredientId]
    else overrides[row.ingredientId] = amount
  })
  updateLogEntryVariant(view.logDate, props.entryId, overrides)
  emit('close')
}
</script>

<template>
  <BaseModal :title="food ? `Adjust ${food.name}` : 'Adjust meal'" subtitle="Changes apply to this logged meal only."
    panel-class="adjust-food-modal" @close="emit('close')">
    <div class="adjust-food-content">
      <div class="adjust-food-total"><span>Adjusted calories</span><strong>{{ totalKcal.toLocaleString() }}
          kcal</strong></div>
      <div class="adjust-food-list">
        <div v-for="row in rows" :key="row.ingredientId" class="adjust-food-row">
          <span class="adjust-food-name">{{ getIngredient(row.ingredientId)?.name || 'Unknown ingredient' }}</span>
          <input v-model.number="row.amount" class="adjust-food-qty" type="number" min="0" step="any"
            :aria-label="`${getIngredient(row.ingredientId)?.name || 'Ingredient'} amount`"
            @input="resetRequested = false" />
          <span class="adjust-food-unit">{{ getIngredient(row.ingredientId)?.unit === 'g' ? 'g' : '' }}</span>
        </div>
      </div>
      <div class="adjust-food-reset-slot">
        <button type="button" class="adjust-food-reset" :class="{ invisible: !hasAdjustment }"
          :tabindex="hasAdjustment ? 0 : -1" @click="resetToDefaults">↺ Reset to defaults</button>
      </div>
      <button class="btn btn-primary primary-wide" type="button"
        @click="hasPendingSave ? saveVariant() : emit('close')">{{ hasPendingSave ? 'Save adjustment' : 'Done'
        }}</button>
    </div>
  </BaseModal>
</template>

<style scoped>
.adjust-food-content {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.adjust-food-total {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  color: var(--ink-muted);
  font-size: 12px;
}

.adjust-food-total strong {
  color: var(--green-strong);
  font-family: 'IBM Plex Mono', monospace;
  font-size: 14px;
}

.adjust-food-list {
  max-height: 290px;
  overflow-y: auto;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: var(--surface-alt);
}

.adjust-food-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 72px 32px;
  align-items: center;
  gap: 5px;
  min-height: 42px;
  padding: 5px 7px;
  background: var(--surface);
}

.adjust-food-row+.adjust-food-row {
  border-top: 1px solid var(--line);
}

.adjust-food-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 12px;
}

.adjust-food-qty {
  width: 100%;
  min-height: 30px;
  padding: 4px 5px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--surface);
  font-family: 'IBM Plex Mono', monospace;
  text-align: center;
}

.adjust-food-unit {
  color: var(--ink-muted);
  font-size: 11px;
}

.adjust-food-reset-slot {
  height: 20px;
  text-align: center;
}

.adjust-food-reset {
  align-self: center;
  padding: 2px 5px;
  border: 0;
  background: transparent;
  color: var(--ink-muted);
  font-size: 11px;
}

.adjust-food-reset.invisible {
  visibility: hidden;
  pointer-events: none;
}

.adjust-food-reset:hover,
.adjust-food-reset:focus-visible {
  color: var(--green-strong);
  text-decoration: underline;
  text-underline-offset: 2px;
  outline: none;
}
</style>
