<template>
  <div class="card p-8">
    <div class="max-w-3xl mx-auto space-y-8">
      <!-- 標題 -->
      <div class="text-center">
        <div class="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-2xl mb-4">
          <svg class="w-8 h-8 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <h2 class="text-2xl font-semibold text-gray-900 mb-2">
          AI 智能分析中
        </h2>
        <p class="text-gray-600">
          {{ statusText }}
        </p>
      </div>

      <!-- 進度條 -->
      <div class="space-y-2">
        <div class="flex justify-between items-center text-sm">
          <span class="font-medium text-gray-700">{{ currentStepText }}</span>
          <span class="font-semibold text-gray-900">{{ progress }}%</span>
        </div>
        <div class="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div 
            class="h-full bg-gray-900 transition-all duration-500"
            :style="{ width: `${progress}%` }"
          />
        </div>
      </div>

      <!-- 處理步驟 -->
      <div class="space-y-3">
        <ProcessStep
          title="RAG 向量檢索"
          :description="`使用 ChromaDB 搜尋前 ${topK} 個最相似的內規片段`"
          :active="status === 'matching'"
          :completed="status !== 'matching' && status !== 'error'"
        />
        
        <ProcessStep
          title="相似度計算"
          description="計算法規與內規的語意相似度分數"
          :active="status === 'matching'"
          :completed="matchResult !== null"
        />
        
        <ProcessStep
          title="AI 建議生成"
          :description="`使用 Gemini 2.5 Pro (Temperature: ${temperature}) 生成專業建議`"
          :active="status === 'generating'"
          :completed="status === 'completed'"
        />
        
        <ProcessStep
          title="報告整理"
          description="產出完整的對照修改報告"
          :active="status === 'completed'"
          :completed="status === 'completed'"
        />
      </div>

      <!-- 統計資訊 -->
      <div v-if="matchResult" class="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
        <div class="text-center">
          <p class="text-xl font-bold text-gray-900">{{ matchResult.matchCount }}</p>
          <p class="text-xs text-gray-600">法規條文</p>
        </div>
        <div class="text-center">
          <p class="text-xl font-bold text-gray-900">{{ matchResult.matchCount * topK }}</p>
          <p class="text-xs text-gray-600">內規片段</p>
        </div>
        <div class="text-center">
          <p class="text-xl font-bold text-gray-900">{{ topK }}</p>
          <p class="text-xs text-gray-600">每條 Top-K</p>
        </div>
      </div>

      <!-- 錯誤訊息 -->
      <div v-if="error" class="flex items-start space-x-3 p-4 bg-danger-50 border border-danger-200 rounded-lg">
        <svg class="w-5 h-5 text-danger-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
        </svg>
        <div>
          <p class="text-sm font-medium text-danger-900">處理失敗</p>
          <p class="text-sm text-danger-700 mt-1">{{ error }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { api } from '@/services/api'
import ProcessStep from './ProcessStep.vue'

const props = defineProps({
  taskId: {
    type: String,
    required: true
  },
  topK: {
    type: Number,
    default: 5
  },
  temperature: {
    type: Number,
    default: 0.5
  }
})

const emit = defineEmits(['complete'])

const status = ref('matching')
const progress = ref(0)
const error = ref(null)
const matchResult = ref(null)

const statusText = computed(() => {
  switch (status.value) {
    case 'matching':
      return '正在使用 RAG 技術比對法規與內規...'
    case 'generating':
      return '正在使用 AI 生成專業修改建議...'
    case 'completed':
      return '分析完成！準備查看結果'
    case 'error':
      return '處理失敗'
    default:
      return '處理中...'
  }
})

const currentStepText = computed(() => {
  switch (status.value) {
    case 'matching':
      return '步驟 1/3：RAG 檢索與相似度計算'
    case 'generating':
      return '步驟 2/3：AI 建議生成'
    case 'completed':
      return '步驟 3/3：報告整理完成'
    default:
      return '處理中...'
  }
})

onMounted(() => {
  processTask()
})

async function processTask() {
  try {
    // 步驟 1: 比對與相似度計算
    status.value = 'matching'
    progress.value = 10
    await delay(500)

    const matchResultData = await api.match(props.taskId, props.topK)
    matchResult.value = matchResultData.data
    
    progress.value = 50
    await delay(500)

    // 步驟 2: 生成建議
    status.value = 'generating'
    progress.value = 60
    await delay(500)

    const suggestResult = await api.generateSuggestions(props.taskId, {
      temperature: props.temperature
    })
    
    progress.value = 90
    await delay(500)

    // 完成
    status.value = 'completed'
    progress.value = 100
    await delay(1000)

    emit('complete', suggestResult.data.suggestions)
  } catch (err) {
    error.value = err.message || '處理失敗'
    status.value = 'error'
  }
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}
</script>
