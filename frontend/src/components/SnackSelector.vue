<script setup>
import { computed, ref } from 'vue'
import ChipGroupMenu from './ChipGroupMenu.vue'
import SnackQuantityStepper from './SnackQuantityStepper.vue'
import {
  state as store,
  addLogSnack,
  bumpCustomLogSnack,
  clearLogSnacks,
  removeLogSnack,
  setLogSnackQty,
} from '../js/data.js'
import { view } from '../js/ui.js'
import { Modals, openModal } from '../js/modals.js'

const props = defineProps({ log: { type: Object, required: true } })

const entries = computed(() => props.log.snacks || [])
const entryFor = (snackId) => entries.value.find((e) => e.snackId === snackId)
const customEntries = computed(() => entries.value.filter((e) => e.custom))
const showAllSnacks = ref(false)
const visibleSnacks = computed(() => {
  if (showAllSnacks.value) return store.snacks
  const activeIndexes = store.snacks
    .map((snack, index) => (entryFor(snack.id) ? index : -1))
    .filter((index) => index >= 0)
  const end = Math.max(10, ...activeIndexes.map((index) => index + 1))
  return store.snacks.slice(0, end)
})
const hasMoreSnacks = computed(() => !showAllSnacks.value && visibleSnacks.value.length < store.snacks.length)
const hasAnything = computed(() => store.snacks.length > 0 || customEntries.value.length > 0)

function decrement(snack) {
  const entry = entryFor(snack.id)
  if (!entry) return
  if (entry.qty <= 1) removeLogSnack(view.logDate, snack.id)
  else setLogSnackQty(view.logDate, snack.id, entry.qty - 1)
}
</script>

<template>
  <div class="today-chips">
    <div class="chip-group">
      <div class="chip-group-header">
        <span>Snacks</span>
        <ChipGroupMenu label="Snack options">
          <button type="button" @click="openModal(Modals.SNACK_MANAGER)">
            ✎ Edit snacks
          </button>
          <button type="button" @click="openModal(Modals.SNACK_EDITOR)">+ Add snack</button>
          <button type="button" @click="clearLogSnacks(view.logDate)">× Clear all</button>
        </ChipGroupMenu>
      </div>

      <div class="quick-picks-viewport">
        <div class="chip-list snack-quick-picks" :class="{ 'kcal-hidden': !store.showKcal }">
        <template v-for="snack in visibleSnacks" :key="snack.id">
          <button
            v-if="!entryFor(snack.id)"
            type="button"
            class="today-chip"
            :aria-label="`Add ${snack.name}`"
            @click="addLogSnack(view.logDate, snack.id, 1)"
          >
            <span>＋ {{ snack.name }}</span>
            <span class="chip-kcal">{{ snack.kcal.toLocaleString() }} kcal</span>
          </button>
          <SnackQuantityStepper
            v-else
            :name="snack.name"
            :quantity="entryFor(snack.id).qty"
            :kcal="snack.kcal"
            @decrement="decrement(snack)"
            @increment="addLogSnack(view.logDate, snack.id, 1)"
          />
        </template>

        <SnackQuantityStepper
          v-for="entry in customEntries"
          :key="entry.id"
          :name="entry.name"
          :quantity="entry.qty"
          :kcal="entry.kcal"
          one-off
          @decrement="bumpCustomLogSnack(view.logDate, entry.id, -1)"
          @increment="bumpCustomLogSnack(view.logDate, entry.id, 1)"
        />

        <span v-if="!hasAnything" class="empty-note">No snacks yet</span>

        <button type="button" class="today-chip chip-add" @click="openModal('custom-snack')">
          ＋ Custom
        </button>
        <button
          v-if="hasMoreSnacks"
          type="button"
          class="chip-more"
          @click="showAllSnacks = true"
        >
          More…
        </button>
        </div>
      </div>
    </div>
  </div>
</template>