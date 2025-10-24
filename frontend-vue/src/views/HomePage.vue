<template>
  <div class="page-container">
    <!-- 頁面標題 -->
    <div class="card header-card">
      <div class="header-content">
        <div>
          <h1 class="page-title">法規對應比對系統</h1>
          <p class="page-subtitle">智能法規對應分析 · 語意檢索 · 建議生成</p>
        </div>
        
        <div class="header-actions">
          <!-- 系統狀態 -->
          <div class="status-badge" :class="{ 'active': backendConnected }">
            <div class="status-dot" />
            <span class="status-text">
              {{ backendConnected ? '系統正常' : '連接中...' }}
            </span>
          </div>

          <!-- 首頁按鈕 -->
          <button @click="goHome" class="btn-icon" title="返回上傳頁面">
            <svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span>首頁</span>
          </button>

          <!-- 歷史記錄按鈕 -->
          <button @click="toggleHistory" class="btn-icon">
            <svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>歷史記錄</span>
          </button>

          <!-- 設定按鈕 -->
          <button @click="showSettings = !showSettings" class="btn-icon-only" title="分析參數設定">
            <svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>
      </div>

      <!-- 參數設定面板 -->
      <Transition name="slide-down">
        <AISettings v-if="showSettings" v-model="aiSettings" />
      </Transition>
    </div>

    <!-- 內容區域 -->
    <Transition name="fade" mode="out-in">
      <!-- 歷史記錄視圖 -->
      <HistoryList
        v-if="showHistory"
        @view-detail="handleViewHistory"
      />

      <!-- 分析流程 -->
      <div v-else>
        <!-- 進度指示器 -->
        <div class="card progress-card">
          <div class="progress-steps">
            <StepIndicator
              :number="1"
              label="上傳文件"
              :active="stage === 'upload'"
              :completed="stage !== 'upload'"
            />
            
            <div class="progress-line">
              <div 
                class="progress-line-fill"
                :style="{ width: stage !== 'upload' ? '100%' : '0%' }"
              />
            </div>
            
            <StepIndicator
              :number="2"
              label="智能分析"
              :active="stage === 'processing'"
              :completed="stage === 'results'"
            />
            
            <div class="progress-line">
              <div 
                class="progress-line-fill"
                :style="{ width: stage === 'results' ? '100%' : '0%' }"
              />
            </div>
            
            <StepIndicator
              :number="3"
              label="查看結果"
              :active="stage === 'results'"
              :completed="false"
            />
          </div>
        </div>

        <!-- 內容區域 -->
        <Transition name="fade" mode="out-in">
          <UploadStage 
            v-if="stage === 'upload'"
            :ai-settings="aiSettings"
            @start="handleStartAnalysis"
          />

          <ProcessingStage
            v-else-if="stage === 'processing'"
            :task-id="taskId"
            :ai-settings="aiSettings"
            @complete="handleAnalysisComplete"
            @error="handleAnalysisError"
          />

          <ResultsStage
            v-else-if="stage === 'results'"
            :task-id="taskId"
            :results="results"
            @reset="handleReset"
          />
        </Transition>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { api } from '@/services/api'
import StepIndicator from '@/components/StepIndicator.vue'
import AISettings from '@/components/AISettings.vue'
import UploadStage from '@/components/UploadStage.vue'
import ProcessingStage from '@/components/ProcessingStage.vue'
import ResultsStage from '@/components/ResultsStage.vue'
import HistoryList from '@/components/HistoryList.vue'

const stage = ref('upload')
const taskId = ref(null)
const results = ref(null)
const currentFileName = ref('')
const showSettings = ref(false)
const showHistory = ref(false)
const backendConnected = ref(false)

const aiSettings = ref({
  topK: 5,
  temperature: 0.3,
  maxTokens: 8192
})

onMounted(async () => {
  try {
    await api.healthCheck()
    backendConnected.value = true
  } catch (error) {
    console.error('後端連接失敗:', error)
  }
})

function goHome() {
  showHistory.value = false
  stage.value = 'upload'
  taskId.value = null
  results.value = null
  currentFileName.value = ''
}

function toggleHistory() {
  showHistory.value = !showHistory.value
  if (showHistory.value) {
    stage.value = 'upload'
  }
}

function handleStartAnalysis(data) {
  taskId.value = data.taskId
  currentFileName.value = data.fileName
  stage.value = 'processing'
  showHistory.value = false
}

async function handleAnalysisComplete(analysisResults) {
  results.value = analysisResults
  stage.value = 'results'
  
  try {
    await api.saveToHistory(
      taskId.value,
      currentFileName.value,
      analysisResults.suggestions,
      {
        regulationItems: analysisResults.suggestions?.length || 0,
        matchedDocuments: analysisResults.suggestions_by_document?.length || 0,
        totalSuggestions: analysisResults.suggestions?.length || 0,
        suggestions_by_document: analysisResults.suggestions_by_document,
        processingTime: analysisResults.processingTime || null
      }
    )
    console.log('已自動保存到歷史記錄')
  } catch (error) {
    console.error('保存歷史記錄失敗:', error)
  }
}

function handleAnalysisError(error) {
  console.error('分析失敗:', error)
  alert('分析失敗: ' + error.message)
  stage.value = 'upload'
}

function handleReset() {
  stage.value = 'upload'
  taskId.value = null
  results.value = null
  currentFileName.value = ''
}

async function handleViewHistory(item) {
  try {
    const response = await api.getHistoryDetail(item.id)
    const historyData = response.data
    
    taskId.value = historyData.id
    currentFileName.value = historyData.fileName
    results.value = {
      suggestions: historyData.suggestions,
      suggestions_by_document: historyData.suggestions_by_document,
      processingTime: historyData.metadata?.processingTime || null
    }
    
    showHistory.value = false
    stage.value = 'results'
    
    if (historyData.reviewStatus === 'unreviewed') {
      try {
        await api.updateReviewStatus(item.id, 'reviewed')
        console.log('已自動標記為已審閱')
      } catch (error) {
        console.error('更新審閱狀態失敗:', error)
      }
    }
  } catch (error) {
    console.error('載入歷史記錄失敗:', error)
    alert('載入歷史記錄失敗: ' + error.message)
  }
}
</script>

<style scoped>
/* 頁面容器 */
.page-container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 24px;
}

/* 標題卡片 */
.header-card {
  padding: 24px;
  margin-bottom: 24px;
}

.header-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 20px;
}

.page-title {
  font-size: 24px;
  font-weight: 700;
  color: #1e293b;
  margin-bottom: 4px;
}

.page-subtitle {
  font-size: 14px;
  color: #64748b;
}

/* 按鈕組 */
.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.status-badge {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  background-color: #f1f5f9;
  border: 1px solid #e2e8f0;
  font-size: 13px;
  font-weight: 500;
  color: #64748b;
}

.status-badge.active {
  background-color: #f0f7f4;
  border-color: #e1f0e9;
  color: #6b9080;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: #94a3b8;
}

.status-badge.active .status-dot {
  background-color: #6b9080;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.btn-icon,
.btn-icon-only {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  background: white;
  border: 1px solid #cbd5e1;
  font-size: 13px;
  font-weight: 500;
  color: #475569;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-icon-only {
  padding: 8px;
}

.btn-icon:hover,
.btn-icon-only:hover {
  background-color: #f8fafc;
  border-color: #94a3b8;
}

.icon {
  width: 22px;
  height: 22px;
}

/* 進度卡片 */
.progress-card {
  padding: 20px;
  margin-bottom: 24px;
}

.progress-steps {
  display: flex;
  align-items: center;
}

.progress-line {
  flex: 1;
  height: 2px;
  background-color: #e2e8f0;
  margin: 0 16px;
  position: relative;
  overflow: hidden;
}

.progress-line-fill {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  background-color: #5b7c99;
  transition: width 0.3s ease;
}

/* 過渡動畫 */
.slide-down-enter-active,
.slide-down-leave-active {
  transition: all 0.2s ease;
  max-height: 500px;
  overflow: hidden;
}

.slide-down-enter-from,
.slide-down-leave-to {
  max-height: 0;
  opacity: 0;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* 響應式設計 */
@media (max-width: 768px) {
  .page-container {
    padding: 16px;
  }
  
  .header-card {
    padding: 16px;
  }
  
  .header-content {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .header-actions {
    width: 100%;
    flex-wrap: wrap;
  }
  
  .btn-icon {
    flex: 1;
    justify-content: center;
  }
}
</style>
