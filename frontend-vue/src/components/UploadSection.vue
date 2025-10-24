<template>
  <div class="space-y-6">
    <!-- 內規資料夾狀態 -->
    <div class="card p-6">
      <div class="flex items-start justify-between">
        <div class="flex-1">
          <div class="flex items-center space-x-2 mb-3">
            <svg class="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
            <h3 class="text-base font-semibold text-gray-900">內規文件資料夾</h3>
          </div>

          <div v-if="checking" class="flex items-center space-x-2 text-sm text-gray-600">
            <div class="w-4 h-4 border-2 border-gray-300 border-t-gray-900 rounded-full animate-spin"></div>
            <span>檢查中...</span>
          </div>

          <div v-else-if="folderInfo" class="space-y-3">
            <div v-if="folderInfo.exists && folderInfo.fileCount > 0">
              <div class="flex items-center space-x-4 mb-3">
                <div class="text-center">
                  <p class="text-2xl font-bold text-gray-900">{{ folderInfo.fileCount }}</p>
                  <p class="text-xs text-gray-600">內規文件</p>
                </div>
                <div class="text-center">
                  <p class="text-2xl font-bold text-gray-900">{{ folderInfo.vectorDbDocuments }}</p>
                  <p class="text-xs text-gray-600">向量片段</p>
                </div>
              </div>
              <details class="text-sm text-gray-600">
                <summary class="cursor-pointer hover:text-gray-900 font-medium mb-2">
                  查看檔案列表 (支援 .doc 和 .docx)
                </summary>
                <ul class="space-y-1 pl-4 max-h-32 overflow-y-auto">
                  <li v-for="(file, index) in folderInfo.files" :key="index" class="text-xs flex items-center space-x-2">
                    <svg class="w-3 h-3 flex-shrink-0" :class="file.endsWith('.doc') ? 'text-warning-600' : 'text-success-600'" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clip-rule="evenodd" />
                    </svg>
                    <span>{{ file }}</span>
                  </li>
                </ul>
              </details>
            </div>
            <div v-else class="text-sm text-warning-700">
              ⚠ 找不到內規資料夾或資料夾為空
            </div>
          </div>
        </div>

        <button
          @click="checkFolder"
          :disabled="checking"
          class="btn btn-ghost text-xs"
        >
          <svg class="w-4 h-4" :class="{ 'animate-spin': checking }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>
    </div>

    <!-- 上傳模式選擇 -->
    <div class="card p-6">
      <h3 class="text-base font-semibold text-gray-900 mb-4">上傳模式</h3>
      <div class="grid grid-cols-2 gap-4">
        <button
          @click="uploadMode = 'single'"
          class="p-4 border-2 rounded-xl transition-all"
          :class="uploadMode === 'single' 
            ? 'border-gray-900 bg-gray-50' 
            : 'border-gray-200 hover:border-gray-300'"
        >
          <svg class="w-8 h-8 mx-auto mb-2" :class="uploadMode === 'single' ? 'text-gray-900' : 'text-gray-400'" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          <p class="text-sm font-medium" :class="uploadMode === 'single' ? 'text-gray-900' : 'text-gray-600'">
            單一檔案上傳
          </p>
          <p class="text-xs text-gray-500 mt-1">上傳法規修正對照表</p>
        </button>

        <button
          @click="uploadMode = 'batch'"
          class="p-4 border-2 rounded-xl transition-all"
          :class="uploadMode === 'batch' 
            ? 'border-gray-900 bg-gray-50' 
            : 'border-gray-200 hover:border-gray-300'"
        >
          <svg class="w-8 h-8 mx-auto mb-2" :class="uploadMode === 'batch' ? 'text-gray-900' : 'text-gray-400'" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p class="text-sm font-medium" :class="uploadMode === 'batch' ? 'text-gray-900' : 'text-gray-600'">
            批次上傳
          </p>
          <p class="text-xs text-gray-500 mt-1">同時上傳多個內規文件</p>
        </button>
      </div>
    </div>

    <!-- 單一檔案上傳 -->
    <div v-if="uploadMode === 'single'" class="card p-8">
      <div class="space-y-6">
        <div>
          <h3 class="text-base font-semibold text-gray-900 mb-2">上傳法規修正對照表</h3>
          <p class="text-sm text-gray-600">支援 .doc 和 .docx 格式</p>
        </div>

        <div
          class="border-2 border-dashed rounded-xl p-8 transition-colors"
          :class="regulationFile ? 'border-gray-900 bg-gray-50' : 'border-gray-300 hover:border-gray-400'"
        >
          <label class="cursor-pointer">
            <input
              ref="fileInput"
              type="file"
              accept=".docx,.doc"
              @change="handleFileChange"
              class="hidden"
            />
            <div v-if="!regulationFile" class="text-center">
              <svg class="w-12 h-12 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <p class="text-sm font-medium text-gray-700 mb-1">點擊上傳或拖拽文件</p>
              <p class="text-xs text-gray-500">支援 .doc 和 .docx 格式</p>
            </div>
            <div v-else class="flex items-center justify-between">
              <div class="flex items-center space-x-3">
                <div class="w-10 h-10 bg-gray-900 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div class="min-w-0 flex-1">
                  <p class="text-sm font-medium text-gray-900 truncate">{{ regulationFile.name }}</p>
                  <p class="text-xs text-gray-500">{{ formatFileSize(regulationFile.size) }}</p>
                </div>
              </div>
              <button
                @click.stop="clearFile"
                class="btn btn-ghost p-2"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </label>
        </div>

        <!-- 處理選項 -->
        <div class="space-y-4 p-4 bg-gray-50 rounded-lg">
          <h4 class="text-sm font-semibold text-gray-900">分析選項</h4>
          
          <div>
            <label class="label">相似度檢索數量 (Top K)</label>
            <input
              v-model.number="topK"
              type="number"
              min="1"
              max="20"
              class="input"
            />
            <p class="hint mt-1">為每條法規修正檢索最相似的 K 個內規片段（建議: 5-10）</p>
          </div>

          <div>
            <label class="label">AI 創造性參數 (Temperature)</label>
            <input
              v-model.number="temperature"
              type="number"
              min="0"
              max="1"
              step="0.1"
              class="input"
            />
            <p class="hint mt-1">較低值更保守，較高值更創意（建議: 0.3-0.7）</p>
          </div>
        </div>

        <!-- 錯誤訊息 -->
        <div v-if="error" class="flex items-start space-x-3 p-4 bg-danger-50 border border-danger-200 rounded-lg">
          <svg class="w-5 h-5 text-danger-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
          </svg>
          <p class="text-sm text-danger-900">{{ error }}</p>
        </div>

        <!-- 上傳統計 -->
        <div v-if="uploadStats" class="p-4 bg-success-50 border border-success-200 rounded-lg">
          <p class="text-sm font-medium text-success-900 mb-3">✓ 處理成功</p>
          <div class="grid grid-cols-3 gap-4">
            <div class="text-center">
              <p class="text-2xl font-semibold text-success-700">{{ uploadStats.regulationItems }}</p>
              <p class="text-xs text-success-600 mt-1">法規修正項目</p>
            </div>
            <div class="text-center">
              <p class="text-2xl font-semibold text-success-700">{{ uploadStats.policyDocuments }}</p>
              <p class="text-xs text-success-600 mt-1">內規文件</p>
            </div>
            <div class="text-center">
              <p class="text-2xl font-semibold text-success-700">{{ uploadStats.totalChunks }}</p>
              <p class="text-xs text-success-600 mt-1">文件片段</p>
            </div>
          </div>
        </div>

        <!-- 上傳按鈕 -->
        <button
          @click="handleUpload"
          :disabled="!canUpload || uploading"
          class="btn btn-primary w-full py-3"
        >
          <span v-if="uploading" class="flex items-center justify-center space-x-2">
            <svg class="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span>處理中...</span>
          </span>
          <span v-else>開始分析</span>
        </button>
      </div>
    </div>

    <!-- 批次上傳 -->
    <div v-else class="card p-8">
      <div class="space-y-6">
        <div>
          <h3 class="text-base font-semibold text-gray-900 mb-2">批次上傳內規文件</h3>
          <p class="text-sm text-gray-600">一次上傳多個內規文件建立向量資料庫（支援 .doc 和 .docx）</p>
        </div>

        <div
          class="border-2 border-dashed rounded-xl p-8 transition-colors"
          :class="batchFiles.length > 0 ? 'border-gray-900 bg-gray-50' : 'border-gray-300 hover:border-gray-400'"
        >
          <label class="cursor-pointer">
            <input
              ref="batchFileInput"
              type="file"
              accept=".docx,.doc"
              multiple
              @change="handleBatchFileChange"
              class="hidden"
            />
            <div v-if="batchFiles.length === 0" class="text-center">
              <svg class="w-12 h-12 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p class="text-sm font-medium text-gray-700 mb-1">點擊選擇多個文件</p>
              <p class="text-xs text-gray-500">支援 .doc 和 .docx，最多 50 個文件</p>
            </div>
            <div v-else class="space-y-2">
              <div v-for="(file, index) in batchFiles" :key="index" class="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200">
                <div class="flex items-center space-x-3 flex-1 min-w-0">
                  <svg class="w-8 h-8 text-gray-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <div class="flex-1 min-w-0">
                    <p class="text-sm font-medium text-gray-900 truncate">{{ file.name }}</p>
                    <p class="text-xs text-gray-500">{{ formatFileSize(file.size) }}</p>
                  </div>
                </div>
                <button
                  @click.stop="removeBatchFile(index)"
                  class="btn btn-ghost p-1.5 flex-shrink-0"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          </label>
        </div>

        <!-- 批次上傳統計 -->
        <div v-if="batchUploadStats" class="p-4 bg-success-50 border border-success-200 rounded-lg">
          <p class="text-sm font-medium text-success-900 mb-3">✓ 批次上傳完成</p>
          <div class="grid grid-cols-3 gap-4">
            <div class="text-center">
              <p class="text-2xl font-semibold text-success-700">{{ batchUploadStats.succeeded }}</p>
              <p class="text-xs text-success-600 mt-1">成功</p>
            </div>
            <div class="text-center">
              <p class="text-2xl font-semibold text-danger-700">{{ batchUploadStats.failed }}</p>
              <p class="text-xs text-danger-600 mt-1">失敗</p>
            </div>
            <div class="text-center">
              <p class="text-2xl font-semibold text-gray-900">{{ batchUploadStats.totalDocuments }}</p>
              <p class="text-xs text-gray-600 mt-1">總向量片段</p>
            </div>
          </div>
        </div>

        <!-- 批次上傳按鈕 -->
        <button
          @click="handleBatchUpload"
          :disabled="batchFiles.length === 0 || batchUploading"
          class="btn btn-primary w-full py-3"
        >
          <span v-if="batchUploading" class="flex items-center justify-center space-x-2">
            <svg class="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span>上傳中... ({{ batchUploadProgress }}/{{ batchFiles.length }})</span>
          </span>
          <span v-else>上傳 {{ batchFiles.length }} 個文件</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { api } from '@/services/api'

const emit = defineEmits(['complete'])

const uploadMode = ref('single')
const regulationFile = ref(null)
const batchFiles = ref([])
const uploading = ref(false)
const batchUploading = ref(false)
const batchUploadProgress = ref(0)
const error = ref(null)
const uploadStats = ref(null)
const batchUploadStats = ref(null)
const folderInfo = ref(null)
const checking = ref(true)
const fileInput = ref(null)
const batchFileInput = ref(null)

// 分析選項
const topK = ref(5)
const temperature = ref(0.5)

const canUpload = computed(() => {
  return regulationFile.value && 
         folderInfo.value?.exists && 
         folderInfo.value?.fileCount > 0
})

onMounted(() => {
  checkFolder()
})

async function checkFolder() {
  try {
    checking.value = true
    error.value = null
    const response = await api.checkPolicyFolder()
    folderInfo.value = response.data
  } catch (err) {
    error.value = '無法連接後端服務'
    console.error('檢查資料夾失敗:', err)
  } finally {
    checking.value = false
  }
}

function handleFileChange(event) {
  const file = event.target.files[0]
  if (file) {
    regulationFile.value = file
    error.value = null
  }
}

function handleBatchFileChange(event) {
  const files = Array.from(event.target.files)
  batchFiles.value = [...batchFiles.value, ...files]
}

function removeBatchFile(index) {
  batchFiles.value.splice(index, 1)
}

function clearFile() {
  regulationFile.value = null
  if (fileInput.value) {
    fileInput.value.value = ''
  }
}

function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
}

async function handleUpload() {
  if (!canUpload.value) return

  uploading.value = true
  error.value = null
  uploadStats.value = null

  try {
    const regulationResult = await api.uploadRegulation(regulationFile.value)
    const taskId = regulationResult.data.taskId

    const policyResult = await api.autoLoadPolicies()

    uploadStats.value = {
      regulationItems: regulationResult.data.itemCount,
      policyDocuments: policyResult.data.succeeded,
      totalChunks: policyResult.data.results.reduce(
        (sum, r) => sum + (r.chunkCount || 0),
        0
      )
    }

    setTimeout(() => {
      emit('complete', { taskId, topK: topK.value, temperature: temperature.value })
    }, 1500)
  } catch (err) {
    error.value = err.message || '處理失敗，請重試'
    uploading.value = false
  }
}

async function handleBatchUpload() {
  if (batchFiles.value.length === 0) return

  batchUploading.value = true
  batchUploadProgress.value = 0

  try {
    const result = await api.uploadPolicyBatch(batchFiles.value)
    
    batchUploadStats.value = {
      succeeded: result.data.succeeded,
      failed: result.data.failed,
      totalDocuments: result.data.totalDocuments
    }

    // 刷新資料夾狀態
    await checkFolder()

    // 清空選擇的檔案
    batchFiles.value = []
    if (batchFileInput.value) {
      batchFileInput.value.value = ''
    }
  } catch (err) {
    error.value = err.message || '批次上傳失敗'
  } finally {
    batchUploading.value = false
  }
}
</script>
