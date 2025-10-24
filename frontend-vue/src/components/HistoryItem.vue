<template>
  <div class="card p-6 hover:shadow-md transition-shadow">
    <div class="flex items-start justify-between">
      <div class="flex-1">
        <!-- 文件名和狀態 -->
        <div class="flex items-center gap-3 mb-2">
          <h3 class="text-lg font-bold text-gray-900">{{ item.fileName }}</h3>
          
          <!-- 審閱狀態標籤 -->
          <span 
            class="px-2.5 py-0.5 rounded-full text-xs font-medium"
            :class="reviewStatusClass"
          >
            {{ reviewStatusText }}
          </span>
        </div>
        
        <!-- 時間 -->
        <div class="flex items-center gap-2 text-sm text-gray-600 mb-3">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{{ formatTime(item.timestamp) }}</span>
        </div>

        <!-- 統計信息 -->
        <div class="flex items-center gap-6 text-sm">
          <div class="flex items-center gap-2">
            <svg class="w-4 h-4 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span class="text-gray-700">{{ item.metadata.regulationItems || 0 }} 個條文</span>
          </div>

          <div class="flex items-center gap-2">
            <svg class="w-4 h-4 text-success-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
            <span class="text-gray-700">{{ item.metadata.matchedDocuments || 0 }} 個文件</span>
          </div>

          <div class="flex items-center gap-2">
            <svg class="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            <span class="text-gray-700">{{ item.metadata.totalSuggestions || 0 }} 個建議</span>
          </div>
        </div>
      </div>

      <!-- 操作按鈕 -->
      <div class="flex items-center gap-2 ml-4">
        <!-- 切換審閱狀態 -->
        <button 
          @click="$emit('toggle-review', item.id, item.reviewStatus)"
          class="px-3 py-2 rounded-lg transition-colors text-sm font-medium"
          :class="item.reviewStatus === 'reviewed' 
            ? 'bg-gray-100 text-gray-700 hover:bg-gray-200' 
            : 'bg-warning-100 text-warning-700 hover:bg-warning-200'"
          :title="item.reviewStatus === 'reviewed' ? '標記為未審閱' : '標記為已審閱'"
        >
          {{ item.reviewStatus === 'reviewed' ? '✓ 已審閱' : '○ 未審閱' }}
        </button>
        
        <button 
          @click="$emit('view', item)"
          class="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium"
        >
          查看
        </button>
        
        <button 
          @click="$emit('delete', item.id)"
          class="p-2 text-danger-600 hover:bg-danger-50 rounded-lg transition-colors"
          title="刪除"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  item: {
    type: Object,
    required: true
  }
})

defineEmits(['view', 'delete', 'toggle-review'])

const reviewStatusText = computed(() => {
  return props.item.reviewStatus === 'reviewed' ? '已審閱' : '尚未審閱'
})

const reviewStatusClass = computed(() => {
  return props.item.reviewStatus === 'reviewed'
    ? 'bg-success-100 text-success-700 border border-success-300'
    : 'bg-warning-100 text-warning-700 border border-warning-300'
})

function formatTime(timestamp) {
  const date = new Date(timestamp)
  const now = new Date()
  const diff = now - date
  
  if (diff < 60000) return '剛剛'
  if (diff < 3600000) return `${Math.floor(diff / 60000)} 分鐘前`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小時前`
  if (diff < 604800000) return `${Math.floor(diff / 86400000)} 天前`
  
  return date.toLocaleString('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}
</script>
