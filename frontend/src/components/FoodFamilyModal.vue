<script setup>
import { computed, ref } from 'vue'
import BaseModal from './BaseModal.vue'
import { state as store, createFoodFamily, deleteFoodFamily } from '../js/data.js'
import { closeModal, Modals, openModal } from '../js/modals.js'

const name = ref('')
const groupId = ref('')
const query = ref('')
const selectedFoodIds = ref([])
const showStandalone = ref(false)
const validationMessage = ref('')

const groups = computed(() => store.groups.filter((group) => group.visible !== false))
const families = computed(() => store.foodFamilies)
const availableFoods = computed(() => {
  const search = query.value.trim().toLowerCase()
  return store.foods
    .filter((food) => !food.archived && (!groupId.value || food.groupId === groupId.value))
    .filter((food) => !search || food.name.toLowerCase().includes(search))
})

function toggleFood(foodId) {
  selectedFoodIds.value = selectedFoodIds.value.includes(foodId)
    ? selectedFoodIds.value.filter((id) => id !== foodId)
    : [...selectedFoodIds.value, foodId]
}

function saveFamily() {
  if (!name.value.trim()) {
    validationMessage.value = 'Enter a family name.'
    return
  }
  if (!groupId.value) {
    validationMessage.value = 'Select a group.'
    return
  }
  if (!selectedFoodIds.value.length) {
    validationMessage.value = 'Select at least one food variant.'
    return
  }
  createFoodFamily({
    name: name.value,
    groupId: groupId.value,
    variantFoodIds: selectedFoodIds.value,
    showStandalone: showStandalone.value,
  })
  name.value = ''
  query.value = ''
  selectedFoodIds.value = []
  validationMessage.value = ''
}

function removeFamily(family) {
  deleteFoodFamily(family.id)
}

function createVariant(family) {
  openModal(Modals.FOOD_EDITOR, { groupId: family.groupId, familyId: family.id })
}
</script>

<template>
  <BaseModal title="Food families" subtitle="Group existing foods behind one dashboard choice." panel-class="food-family-modal" @close="closeModal">
    <div class="food-family-content">
      <section class="food-family-create">
        <div class="family-form-grid">
          <label class="input-field">
            <span>Family name</span>
            <input v-model="name" placeholder="e.g. Dark chocolate" />
          </label>
          <label class="input-field">
            <span>Group</span>
            <select v-model="groupId">
              <option value="" disabled>Select a group...</option>
              <option v-for="group in groups" :key="group.id" :value="group.id">{{ group.name }}</option>
            </select>
          </label>
        </div>
        <label class="family-search">
          <span class="sr-only">Search foods</span>
          <input v-model="query" type="search" placeholder="Search foods to add as variants" />
        </label>
        <div class="family-food-list">
          <label v-for="food in availableFoods" :key="food.id" class="family-food-option">
            <input type="checkbox" :checked="selectedFoodIds.includes(food.id)" @change="toggleFood(food.id)" />
            <span>
              <strong>{{ food.name }}</strong>
              <small>{{ food.kcal || 0 }} kcal · {{ food.mode === 'simple' ? 'simple food' : 'ingredients' }}</small>
            </span>
          </label>
          <p v-if="!availableFoods.length" class="empty-note">No matching foods.</p>
        </div>
        <label class="family-standalone-option">
          <input v-model="showStandalone" type="checkbox" />
          <span>Keep variants visible as separate dashboard foods</span>
        </label>
        <div v-if="validationMessage" class="food-validation">{{ validationMessage }}</div>
        <button class="btn btn-primary btn-full" type="button" @click="saveFamily">Create family</button>
      </section>

      <section v-if="families.length" class="food-family-existing">
        <h3>Existing families</h3>
        <div v-for="family in families" :key="family.id" class="family-existing-row">
          <span>
            <strong>{{ family.name }}</strong>
            <small>{{ family.variantFoodIds?.length || 0 }} variant{{ family.variantFoodIds?.length === 1 ? '' : 's' }}</small>
          </span>
          <span class="family-existing-actions">
            <button class="text-button" type="button" @click="createVariant(family)">Add food</button>
            <button class="text-button danger-text" type="button" @click="removeFamily(family)">Remove</button>
          </span>
        </div>
      </section>
    </div>
  </BaseModal>
</template>

<style scoped>
.food-family-content {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.family-form-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 150px;
  gap: 9px;
}

.input-field span,
.family-standalone-option,
.family-food-option small,
.family-existing-row small {
  color: var(--ink-muted);
  font-size: 11px;
}

.family-search input,
.input-field input,
.input-field select {
  width: 100%;
  min-height: 40px;
  padding: 9px 10px;
  border: 1px solid var(--line);
  border-radius: 9px;
  background: var(--surface-alt);
  color: var(--ink);
}

.input-field {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.family-food-list {
  display: flex;
  max-height: 210px;
  flex-direction: column;
  overflow-y: auto;
  border: 1px solid var(--line);
  border-radius: 10px;
}

.family-food-option,
.family-existing-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 9px 10px;
  border-bottom: 1px solid var(--line);
}

.family-food-option:last-child,
.family-existing-row:last-child {
  border-bottom: 0;
}

.family-food-option {
  justify-content: flex-start;
  cursor: pointer;
}

.family-food-option input,
.family-standalone-option input {
  accent-color: var(--green);
}

.family-food-option span,
.family-existing-row span {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 2px;
}

.family-food-option strong,
.family-existing-row strong {
  font-size: 13px;
  font-weight: 600;
}

.family-food-option small,
.family-existing-row small {
  font-size: 11px;
}

.family-standalone-option {
  display: flex;
  align-items: center;
  gap: 7px;
}

.food-family-existing {
  padding-top: 14px;
  border-top: 1px solid var(--line);
}

.food-family-existing h3 {
  margin: 0 0 7px;
  color: var(--ink-muted);
  font-family: inherit;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.family-existing-row {
  padding-right: 0;
  padding-left: 0;
}

.text-button {
  border: 0;
  padding: 4px 0;
  background: transparent;
  color: var(--green);
  font-size: 12px;
  font-weight: 600;
}

.danger-text {
  color: var(--red);
}

.family-existing-actions {
  display: inline-flex !important;
  flex-direction: row !important;
  align-items: center;
  gap: 12px;
}

@media (max-width: 480px) {
  .family-form-grid {
    grid-template-columns: 1fr;
  }
}
</style>
