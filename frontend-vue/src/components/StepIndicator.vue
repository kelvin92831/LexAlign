<template>
  <div class="flex flex-col items-center">
    <div 
      class="w-12 h-12 rounded-full flex items-center justify-center font-semibold text-lg transition-all duration-300"
      :class="circleClass"
    >
      <svg v-if="completed" class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
      </svg>
      <span v-else>{{ number }}</span>
    </div>
    
    <span 
      class="mt-2 text-sm font-medium transition-colors"
      :class="labelClass"
    >
      {{ label }}
    </span>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  number: {
    type: Number,
    required: true
  },
  label: {
    type: String,
    required: true
  },
  active: {
    type: Boolean,
    default: false
  },
  completed: {
    type: Boolean,
    default: false
  }
})

const circleClass = computed(() => {
  if (props.completed) {
    return 'bg-success-600 text-white'
  }
  if (props.active) {
    return 'bg-primary-600 text-white'
  }
  return 'bg-gray-200 text-gray-500'
})

const labelClass = computed(() => {
  if (props.active) {
    return 'text-primary-600'
  }
  return 'text-gray-500'
})
</script>
