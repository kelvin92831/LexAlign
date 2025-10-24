<template>
  <div class="flex items-center gap-2">
    <div class="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
      <div 
        class="h-full rounded-full transition-all duration-500"
        :class="colorClass"
        :style="{ width: percentage + '%' }"
      />
    </div>
    <span class="text-sm font-semibold text-gray-700 w-12 text-right">
      {{ percentage }}%
    </span>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  value: {
    type: Number,
    required: true,
    validator: (value) => value >= 0 && value <= 1
  }
})

const percentage = computed(() => {
  return Math.round(props.value * 100)
})

const colorClass = computed(() => {
  if (props.value >= 0.8) return 'bg-success-500'
  if (props.value >= 0.6) return 'bg-yellow-500'
  return 'bg-red-500'
})
</script>
