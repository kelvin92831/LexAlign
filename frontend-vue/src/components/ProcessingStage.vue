<template>
  <div class="card p-12">
    <div class="max-w-3xl mx-auto">
      <div class="text-center mb-8">
        <div class="inline-flex items-center justify-center w-20 h-20 mb-6 rounded-full" :class="statusColor">
          <svg v-if="currentStage === 'completed'" class="w-10 h-10 text-success-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <svg v-else-if="currentStage === 'error'" class="w-10 h-10 text-danger-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <svg v-else class="w-10 h-10 text-primary-600 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
        
        <h2 class="text-3xl font-bold text-gray-900 mb-3">
          {{ statusTitle }}
        </h2>
        
        <p class="text-gray-600">
          {{ statusDescription }}
        </p>
      </div>

      <div class="space-y-4 mb-8">
        <ProcessStep
          v-for="(step, index) in steps"
          :key="index"
          :title="step.title"
          :description="step.description"
          :status="step.status"
          :detail="step.detail"
        />
      </div>

      <div class="space-y-2">
        <div class="flex items-center justify-between text-sm text-gray-600">
          <span>整體進度</span>
          <span class="font-semibold">{{ overallProgress }}%</span>
        </div>
        <div class="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
          <div 
            class="h-full bg-gradient-to-r from-primary-500 to-primary-600 transition-all duration-500 rounded-full"
            :style="{ width: overallProgress + '%' }"
          />
        </div>
        <p class="text-xs text-gray-500 text-center">
          {{ timeDisplay }}
        </p>
      </div>

      <div v-if="error" class="mt-6 p-4 bg-danger-50 border border-danger-200 rounded-xl">
        <div class="flex items-start gap-3">
          <svg class="w-5 h-5 text-danger-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <p class="text-sm font-medium text-danger-900">處理失敗</p>
            <p class="text-sm text-danger-700 mt-1">{{ error }}</p>
          </div>
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
  aiSettings: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['complete', 'error'])

const currentStage = ref('matching')
const matchResult = ref(null)
const error = ref(null)
const startTime = ref(Date.now())
const elapsedTime = ref(0)

const steps = ref([
  {
    title: 'RAG 語意檢索',
    description: '使用向量資料庫比對法規與內規',
    status: 'processing',
    detail: null
  },
  {
    title: '建議生成',
    description: '使用 Gemini 生成專業修改建議',
    status: 'pending',
    detail: null
  },
  {
    title: '報告整理',
    description: '按文件分組並計算相似度',
    status: 'pending',
    detail: null
  }
])

const statusTitle = computed(() => {
  switch (currentStage.value) {
    case 'matching':
      return 'RAG 檢索比對中...'
    case 'generating':
      return '建議生成中...'
    case 'completed':
      return '分析完成!'
    case 'error':
      return '處理失敗'
    default:
      return '處理中...'
  }
})

const statusDescription = computed(() => {
  switch (currentStage.value) {
    case 'matching':
      return `正在使用 Top-${props.aiSettings.topK} 檢索相關內規文件`
    case 'generating':
      return `使用 Temperature ${props.aiSettings.temperature} 生成建議（此步驟可能需要 5-15 分鐘）`
    case 'completed':
      return '準備查看詳細分析結果'
    case 'error':
      return '分析過程中發生錯誤'
    default:
      return '請稍候...'
  }
})

const statusColor = computed(() => {
  switch (currentStage.value) {
    case 'completed':
      return 'bg-success-100'
    case 'error':
      return 'bg-danger-100'
    default:
      return 'bg-primary-100'
  }
})

const overallProgress = computed(() => {
  const completedSteps = steps.value.filter(s => s.status === 'completed').length
  return Math.round((completedSteps / steps.value.length) * 100)
})

const timeDisplay = computed(() => {
  const seconds = Math.floor(elapsedTime.value / 1000)
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  
  if (currentStage.value === 'completed') {
    return `總耗時: ${minutes}分 ${remainingSeconds}秒`
  }
  
  return `已處理: ${minutes}分 ${remainingSeconds}秒`
})

// 更新計時器
let timer = null
onMounted(() => {
  timer = setInterval(() => {
    elapsedTime.value = Date.now() - startTime.value
  }, 1000)
  
  processAnalysis()
})

async function processAnalysis() {
  try {
    await performMatching()
    await delay(500)
    await performSuggestionGeneration()
    await delay(500)
    
    steps.value[2].status = 'processing'
    steps.value[2].detail = '整理分析報告...'
    await delay(1000)
    
    steps.value[2].status = 'completed'
    steps.value[2].detail = '報告整理完成'
    
    currentStage.value = 'completed'
    
    // 停止計時器
    if (timer) {
      clearInterval(timer)
      timer = null
    }
    
    await delay(1000)
    
    const finalResult = await api.getSuggestions(props.taskId)
    
    // 調試：檢查 API 響應
    console.log('API 響應結構:', {
      hasData: !!finalResult.data,
      suggestionsCount: finalResult.data?.suggestions?.length || 0,
      suggestionsByDocCount: finalResult.data?.suggestions_by_document?.length || 0,
      taskId: finalResult.data?.taskId
    })
    
    // 傳遞處理時間到結果頁面
    emit('complete', {
      ...finalResult.data,
      processingTime: formatProcessingTime(elapsedTime.value)
    })
    
  } catch (err) {
    console.error('分析失敗:', err)
    error.value = err.message
    currentStage.value = 'error'
    
    if (timer) {
      clearInterval(timer)
      timer = null
    }
    
    const processingStep = steps.value.find(s => s.status === 'processing')
    if (processingStep) {
      processingStep.status = 'error'
      processingStep.detail = err.message
    }
    
    emit('error', err)
  }
}

function formatProcessingTime(milliseconds) {
  const seconds = Math.floor(milliseconds / 1000)
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${minutes}分 ${remainingSeconds}秒`
}

async function performMatching() {
  steps.value[0].status = 'processing'
  steps.value[0].detail = '正在檢索相關內規...'
  
  currentStage.value = 'matching'
  
  const response = await api.match(props.taskId, props.aiSettings.topK)
  matchResult.value = response.data
  
  steps.value[0].status = 'completed'
  steps.value[0].detail = `匹配條文檢索完成`
}

async function performSuggestionGeneration() {
  steps.value[1].status = 'processing'
  steps.value[1].detail = '正在讀取完整文件內容...'
  
  currentStage.value = 'generating'
  
  // 更新進度提示
  setTimeout(() => {
    if (steps.value[1].status === 'processing') {
      steps.value[1].detail = '正在調用 AI 生成建議...'
    }
  }, 30000) // 30秒後更新提示
  
  setTimeout(() => {
    if (steps.value[1].status === 'processing') {
      steps.value[1].detail = 'AI 正在處理中，請耐心等待...'
    }
  }, 120000) // 2分鐘後更新提示
  
  const response = await api.generateSuggestions(props.taskId, {
    temperature: props.aiSettings.temperature,
    maxTokens: props.aiSettings.maxTokens
  })
  
  steps.value[1].status = 'completed'
  steps.value[1].detail = `生成 ${response.data.suggestionCount} 個建議`
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}
</script>
