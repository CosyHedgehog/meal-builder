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

const baseAmounts = computed(() => new Map((food.value?.items || []).map((item) => [item.ingredientId, Number(item.amount)])))
const totalKcal = computed(() => Math.round(rows.value.reduce((sum, row) => sum + itemKcal(row), 0)))
const hasAdjustment = computed(() => (
  Object.keys(sourceEntry?.overrides || {}).length > 0
  || rows.value.some((row) => Number(row.amount) !== baseAmounts.value.get(row.ingredientId))
))

function resetToDefaults(row) {
  row.amount = baseAmounts.value.get(row.ingredientId) || 0
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
      <div class="adjust-food-header">
        <div class="adjust-food-total"><span>Adjusted calories</span><strong>{{ totalKcal.toLocaleString() }}
            kcal</strong></div>
      </div>
      <div class="adjust-food-list">
        <div v-for="row in rows" :key="row.ingredientId" class="adjust-food-row"
          :class="{ adjusted: Number(row.amount) !== baseAmounts.get(row.ingredientId) }">
          <span class="adjust-food-name">
            <span>{{ getIngredient(row.ingredientId)?.name || 'Unknown ingredient' }}</span>
            <small>{{ Math.round(itemKcal({ ...row, amount: 1 })).toLocaleString() }} kcal</small>
          </span>
          <input v-model.number="row.amount" class="adjust-food-qty" type="number" min="0" step="any"
            :aria-label="`${getIngredient(row.ingredientId)?.name || 'Ingredient'} amount`"
          />
          <span class="adjust-food-unit">{{ getIngredient(row.ingredientId)?.unit === 'g' ? 'g' : '' }}</span>
          <button type="button" class="adjust-food-reset" :class="{ invisible: Number(row.amount) === baseAmounts.get(row.ingredientId) }"
            :tabindex="Number(row.amount) !== baseAmounts.get(row.ingredientId) ? 0 : -1"
            :aria-label="`Reset ${getIngredient(row.ingredientId)?.name || 'ingredient'} quantity`"
            @click="resetToDefaults(row)">↺</button>
        </div>
      </div>
      <div class="adjust-food-footer">
        <button class="btn btn-primary primary-wide" type="button"
          @click="hasAdjustment ? saveVariant() : emit('close')">{{ hasAdjustment ? 'Save adjustment' : 'Done'
          }}</button>
      </div>
    </div>
  </BaseModal>
</template>

<style scoped>
.adjust-food-content {
  display: flex;
  flex: 1;
  min-height: 0;
  flex-direction: column;
  gap: 0;
}

.adjust-food-header {
  flex: none;
  margin-right: -26px;
  margin-bottom: 10px;
  margin-left: -26px;
  padding: 0 26px 12px;
  border-bottom: 1px solid var(--line);
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
  flex: 1;
  min-height: 0;
  max-height: 52vh;
  overflow-y: auto;
  margin-right: -26px;
  margin-left: -26px;
  background: transparent;
}

.adjust-food-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 72px 24px 28px;
  align-items: center;
  gap: 6px;
  min-height: 52px;
  padding: 6px 26px;
  border-bottom: 1px solid var(--line);
  background: var(--surface);
  transition: background 0.15s ease;
}

.adjust-food-row:last-child {
  border-bottom: 0;
}

.adjust-food-row:hover {
  background: var(--surface-alt);
}

.adjust-food-name {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 2px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 12px;
}

.adjust-food-name small {
  color: var(--ink-muted);
  font-size: 10px;
}

.adjust-food-qty {
  width: 100%;
  min-height: 28px;
  padding: 3px 4px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--surface);
  font-family: 'IBM Plex Mono', monospace;
  text-align: center;
}

.adjust-food-qty::-webkit-inner-spin-button,
.adjust-food-qty::-webkit-outer-spin-button {
  margin: 0;
  appearance: none;
}

.adjust-food-qty {
  appearance: textfield;
}

.adjust-food-unit {
  width: 24px;
  color: var(--ink-muted);
  font-size: 11px;
  text-align: left;
}

.adjust-food-reset {
  width: 28px;
  height: 28px;
  padding: 0;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--ink-muted);
  font-size: 17px;
  line-height: 1;
  flex: none;
}

.adjust-food-reset:hover,
.adjust-food-reset:focus-visible {
  background: var(--surface);
  color: var(--ink);
  outline: none;
}

.adjust-food-reset.invisible {
  visibility: hidden;
  pointer-events: none;
}

.adjust-food-footer {
  flex: none;
  margin-right: -26px;
  margin-top: 0;
  margin-left: -26px;
  padding: 10px 26px 0;
  border-top: 1px solid var(--line);
}

.adjust-food-footer .primary-wide {
  margin-top: 0;
}

:deep(.modal.adjust-food-modal) {
  display: flex;
  flex-direction: column;
  width: 350px;
  overflow: hidden;
}

@media (max-width: 480px) {
  :deep(.modal.adjust-food-modal) {
    width: 100vw;
    max-width: none;
  }

  .adjust-food-header,
  .adjust-food-list,
  .adjust-food-footer {
    margin-right: -20px;
    margin-left: -20px;
  }

  .adjust-food-header {
    padding-right: 20px;
    padding-left: 20px;
  }

  .adjust-food-list {
    max-height: none;
  }

  .adjust-food-row {
    padding-right: 20px;
    padding-left: 20px;
  }

  .adjust-food-footer {
    padding-right: 20px;
    padding-left: 20px;
  }
}

</style>
