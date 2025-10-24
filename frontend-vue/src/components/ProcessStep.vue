<template>
  <div class="flex items-start gap-4 p-4 rounded-xl transition-all" :class="containerClass">
    <!-- 狀態圖示 -->
    <div class="flex-shrink-0 mt-0.5">
      <div class="w-8 h-8 rounded-full flex items-center justify-center" :class="iconClass">
        <!-- Pending -->
        <svg v-if="status === 'pending'" class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none" />
        </svg>

        <!-- Processing -->
        <svg v-else-if="status === 'processing'" class="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>

        <!-- Completed -->
        <svg v-else-if="status === 'completed'" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
        </svg>

        <!-- Error -->
        <svg v-else-if="status === 'error'" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </div>
    </div>

    <!-- 內容 -->
    <div class="flex-1 min-w-0">
      <div class="flex items-center justify-between mb-1">
        <h3 class="font-semibold text-gray-900">{{ title }}</h3>
        <span v-if="statusBadge" class="text-xs font-medium px-2 py-0.5 rounded-full" :class="badgeClass">
          {{ statusBadge }}
        </span>
      </div>
      
      <p class="text-sm text-gray-600">{{ description }}</p>
      
      <!-- 詳細信息 -->
      <p v-if="detail" class="text-xs text-gray-500 mt-2 flex items-center gap-1">
        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        {{ detail }}
      </p>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  status: {
    type: String,
    required: true,
    validator: (value) => ['pending', 'processing', 'completed', 'error'].includes(value)
  },
  detail: {
    type: String,
    default: null
  }
})

const containerClass = computed(() => {
  switch (props.status) {
    case 'processing':
      return 'bg-primary-50 border-2 border-primary-200'
    case 'completed':
      return 'bg-success-50 border-2 border-success-200'
    case 'error':
      return 'bg-danger-50 border-2 border-danger-200'
    default:
      return 'bg-gray-50 border-2 border-gray-200'
  }
})

const iconClass = computed(() => {
  switch (props.status) {
    case 'processing':
      return 'bg-primary-600 text-white'
    case 'completed':
      return 'bg-success-600 text-white'
    case 'error':
      return 'bg-danger-600 text-white'
    default:
      return 'bg-gray-300 text-gray-500'
  }
})

const statusBadge = computed(() => {
  switch (props.status) {
    case 'processing':
      return '進行中'
    case 'completed':
      return '已完成'
    case 'error':
      return '失敗'
    default:
      return null
  }
})

const badgeClass = computed(() => {
  switch (props.status) {
    case 'processing':
      return 'bg-primary-100 text-primary-700'
    case 'completed':
      return 'bg-success-100 text-success-700'
    case 'error':
      return 'bg-danger-100 text-danger-700'
    default:
      return ''
  }
})
</script>
