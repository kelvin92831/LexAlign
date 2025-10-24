<template>
  <div class="border border-gray-200 rounded-lg p-5 hover:border-primary-300 transition-colors">
    <!-- 頂部:類型和相似度 -->
    <div class="flex items-start justify-between mb-3">
      <div class="flex items-center gap-3">
        <span 
          class="px-2 py-1 rounded text-xs font-semibold"
          :class="changeTypeBadgeClass"
        >
          {{ changeTypeLabel }}
        </span>
        
        <span class="text-sm font-medium text-gray-600">
          {{ change.regulation_source }} ??{{ change.target_section }}
        </span>
      </div>
      
      <div v-if="false" class="w-32"></div>
    </div>

    <!-- 修改摘要 -->
    <div class="mb-3 mt-3">
      <p class="text-sm font-semibold text-gray-700 mb-1">修改摘要</p>
      <p class="text-gray-900">{{ change.diff_summary }}</p>
    </div>

    <!-- 建議內容 -->
    <div class="mb-3">
      <p class="text-sm font-semibold text-gray-700 mb-2">修改建議</p>
      <div class="bg-primary-50 border-l-4 border-primary-600 p-4 rounded">
        <p class="text-gray-900 leading-relaxed whitespace-pre-wrap">{{ change.suggestion_text }}</p>
      </div>
    </div>

    <!-- 修改原因 -->
    <div class="mb-3">
      <p class="text-sm font-semibold text-gray-700 mb-2">修改原因</p>
      <p class="text-sm text-gray-600 italic">{{ change.reason }}</p>
    </div>

    <!-- 原始關鍵詞(如果有) -->
    <div v-if="change.keywords && change.keywords.length > 0">
      <p class="text-sm font-semibold text-gray-700 mb-2">相關標籤</p>
      <div class="flex flex-wrap gap-2">
        <span 
          v-for="(keyword, index) in change.keywords"
          :key="index"
          class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800"
        >
          {{ keyword }}
        </span>
      </div>
    </div>

    <!-- 追蹤信息 -->
    <details v-if="change.trace" class="mt-3">
      <summary class="text-xs text-gray-500 cursor-pointer hover:text-gray-700">
        檢索追蹤信息
      </summary>
      <div class="mt-2 p-3 bg-gray-50 rounded text-xs space-y-1">
        <p><strong>法規來源:</strong> {{ change.trace.regulation_anchor }}</p>
        <p v-if="change.trace.policy_anchor"><strong>內規定位:</strong> {{ change.trace.policy_anchor }}</p>
      </div>
    </details>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  change: {
    type: Object,
    required: true
  }
})

const changeTypeBadgeClass = computed(() => {
  switch (props.change.change_type) {
    case '修正':
      return 'bg-blue-100 text-blue-700'
    case '新增':
      return 'bg-green-100 text-green-700'
    case '刪除':
      return 'bg-red-100 text-red-700'
    default:
      return 'bg-gray-100 text-gray-700'
  }
})

// 顯示變更類型標籤：外部修正或內部修正
const changeTypeLabel = computed(() => {
  return props.change.change_type === '修正' ? '外部修正' : props.change.change_type
})
</script>
