<script setup>
import { ref } from 'vue'

const props = defineProps({
  items: { type: Array, required: true },
  /** Disable dragging (e.g. while a search filter is active). */
  disabled: { type: Boolean, default: false },
})

const emit = defineEmits(['reorder'])

const dragId = ref(null)
const overId = ref(null)

/** Rows are only draggable once the handle is pressed, so text stays selectable. */
function arm(e) {
  e.currentTarget.closest('.manager-item-row')?.setAttribute('draggable', 'true')
}

function onDragStart(item, e) {
  dragId.value = item.id
  e.dataTransfer.effectAllowed = 'move'
}

function onDragEnd(e) {
  e.currentTarget.setAttribute('draggable', 'false')
  dragId.value = null
  overId.value = null
}

function onDragOver(item, e) {
  e.dataTransfer.dropEffect = 'move'
  overId.value = item.id
}

function onDrop(item) {
  overId.value = null
  if (dragId.value && dragId.value !== item.id) emit('reorder', dragId.value, item.id)
}
</script>

<template>
  <div class="manager-list">
    <div
      v-for="item in items"
      :key="item.id"
      class="manager-item-row"
      :class="{ dragging: dragId === item.id, 'drag-over': overId === item.id }"
      draggable="false"
      @dragstart="onDragStart(item, $event)"
      @dragend="onDragEnd"
      @dragover.prevent="onDragOver(item, $event)"
      @dragleave="overId = null"
      @drop.prevent="onDrop(item)"
    >
      <span
        class="manager-drag"
        :class="{ disabled: props.disabled }"
        title="Drag to reorder"
        @mousedown="arm"
        @touchstart.passive="arm"
      >
        ⠿
      </span>
      <slot :item="item" />
    </div>
  </div>
</template>