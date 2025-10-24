<template>
  <div v-if="hasMatches" class="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
    <div class="flex items-center gap-2 mb-3">
      <svg class="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
      </svg>
      <h4 class="text-sm font-semibold text-gray-700">關鍵字匹配分析</h4>
    </div>

    <!-- 相似度總覽 -->
    <div class="mb-3">
      <div class="flex items-center justify-between mb-1">
        <span class="text-xs text-gray-600">綜合相似度</span>
        <span class="text-sm font-bold" :class="similarityColor">{{ similarityPercentage }}</span>
      </div>
      <div class="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
        <div 
          class="h-full rounded-full transition-all duration-500"
          :class="similarityBarColor"
          :style="{ width: similarityPercentage }"
        />
      </div>
    </div>

    <!-- 匹配摘要 -->
    <p v-if="matchSummary" class="text-xs text-gray-600 mb-3 italic">
      {{ matchSummary }}
    </p>

    <!-- 關鍵字分類 -->
    <div class="space-y-2">
      <!-- 高相關 -->
      <div v-if="keywordMatches.high && keywordMatches.high.length > 0">
        <div class="flex items-center gap-2 mb-1">
          <span class="text-xs font-medium text-success-700">高相關</span>
          <span class="text-xs text-gray-500">(完全匹配)</span>
        </div>
        <div class="flex flex-wrap gap-1">
          <span 
            v-for="(keyword, index) in keywordMatches.high"
            :key="'high-' + index"
            class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-success-100 text-success-800 border border-success-300"
          >
            {{ keyword }}
          </span>
        </div>
      </div>

      <!-- 中相關 -->
      <div v-if="keywordMatches.medium && keywordMatches.medium.length > 0">
        <div class="flex items-center gap-2 mb-1">
          <span class="text-xs font-medium text-warning-700">中相關</span>
          <span class="text-xs text-gray-500">(部分匹配)</span>
        </div>
        <div class="flex flex-wrap gap-1">
          <span 
            v-for="(keyword, index) in keywordMatches.medium"
            :key="'medium-' + index"
            class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-warning-100 text-warning-800 border border-warning-300"
          >
            {{ keyword }}
          </span>
        </div>
      </div>

      <!-- 低相關 -->
      <div v-if="keywordMatches.low && keywordMatches.low.length > 0">
        <div class="flex items-center gap-2 mb-1">
          <span class="text-xs font-medium text-gray-700">低相關</span>
          <span class="text-xs text-gray-500">(相關概念)</span>
        </div>
        <div class="flex flex-wrap gap-1">
          <span 
            v-for="(keyword, index) in keywordMatches.low"
            :key="'low-' + index"
            class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700 border border-gray-300"
          >
            {{ keyword }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  keywordMatches: {
    type: Object,
    default: () => ({ high: [], medium: [], low: [] })
  },
  similarity: {
    type: Number,
    default: 0
  },
  matchSummary: {
    type: String,
    default: ''
  }
})

const hasMatches = computed(() => {
  const { high, medium, low } = props.keywordMatches
  return (high && high.length > 0) || (medium && medium.length > 0) || (low && low.length > 0)
})

const similarityPercentage = computed(() => {
  return Math.round(props.similarity * 100) + '%'
})

const similarityColor = computed(() => {
  if (props.similarity >= 0.8) return 'text-success-600'
  if (props.similarity >= 0.6) return 'text-warning-600'
  return 'text-gray-600'
})

const similarityBarColor = computed(() => {
  if (props.similarity >= 0.8) return 'bg-success-500'
  if (props.similarity >= 0.6) return 'bg-warning-500'
  return 'bg-gray-400'
})
</script>
