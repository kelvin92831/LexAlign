<template>
  <div class="grid lg:grid-cols-2 gap-6">
    <!-- 上傳法規文件 -->
    <div class="card p-8">
      <div class="flex items-center gap-3 mb-6">
        <div class="p-3 bg-primary-100 rounded-xl">
          <svg class="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <div>
          <h2 class="text-xl font-bold text-gray-900">上傳法規文件</h2>
          <p class="text-sm text-gray-600">支援 .doc 和 .docx 格式</p>
        </div>
      </div>

      <!-- 拖曳上傳區 -->
      <div 
        @click="triggerFileInput"
        @dragover.prevent="isDragging = true"
        @dragleave.prevent="isDragging = false"
        @drop.prevent="handleDrop"
        :class="[
          'border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all',
          isDragging ? 'border-primary-500 bg-primary-50' : 'border-gray-300 hover:border-primary-500'
        ]"
      >
        <input 
          ref="fileInput"
          type="file"
          accept=".doc,.docx"
          @change="handleFileSelect"
          class="hidden"
        />

        <template v-if="!regulationFile">
          <svg class="mx-auto mb-4 text-gray-400" width="64" height="64" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          <p class="text-gray-600 mb-2 font-medium">點擊或拖曳文件到此處</p>
          <p class="text-sm text-gray-500">支援 DOC / DOCX,最大 10MB</p>
        </template>

        <template v-else>
          <svg class="mx-auto mb-4 text-success-500" width="64" height="64" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p class="text-gray-900 font-semibold mb-1">{{ regulationFile.name }}</p>
          <p class="text-sm text-gray-600">{{ formatFileSize(regulationFile.size) }}</p>
          <button 
            @click.stop="regulationFile = null"
            class="mt-3 text-sm text-danger-600 hover:text-danger-700 font-medium"
          >
            移除文件
          </button>
        </template>
      </div>

      <!-- 上傳進度 -->
      <div v-if="uploading" class="mt-4">
        <div class="flex items-center justify-between text-sm text-gray-600 mb-2">
          <span>上傳中...</span>
          <span>{{ uploadProgress }}%</span>
        </div>
        <div class="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
          <div 
            class="h-full bg-primary-600 transition-all duration-300"
            :style="{ width: uploadProgress + '%' }"
          />
        </div>
      </div>

      <!-- 開始分析按鈕 -->
      <button 
        @click="handleStartAnalysis"
        :disabled="!regulationFile || uploading"
        class="btn-primary w-full mt-6"
      >
        <template v-if="uploading">
          <svg class="animate-spin -ml-1 mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          上傳中...
        </template>
        <template v-else>
          開始智能分析
        </template>
      </button>
    </div>

    <!-- 內規文件庫狀態 -->
    <div class="card p-8">
      <div class="flex items-center gap-3 mb-6">
        <div class="p-3 bg-success-100 rounded-xl">
          <svg class="w-6 h-6 text-success-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
          </svg>
        </div>
        <div>
          <h2 class="text-xl font-bold text-gray-900">內規文件庫</h2>
          <p class="text-sm text-gray-600">系統已載入的內規文件</p>
        </div>
      </div>

      <!-- 載入中 -->
      <div v-if="loadingPolicyStatus" class="flex items-center justify-center py-12">
        <svg class="animate-spin h-8 w-8 text-primary-600" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </div>

      <!-- 統計卡片 -->
      <div v-else class="space-y-4">
        <div class="stat-card">
          <div>
            <p class="stat-label">已載入文件</p>
            <p class="text-sm text-gray-600 mt-1">{{ policyStatus.fileCount }} 個文件</p>
          </div>
          <span class="stat-value text-success-600">{{ policyStatus.fileCount }}</span>
        </div>

        <!-- 文件列表預覽 -->
        <div v-if="dedupedFiles && dedupedFiles.length > 0" class="mt-6">
          <p class="text-sm font-medium text-gray-700 mb-2">文件列表 (部分):</p>
          <div class="space-y-1 max-h-60 overflow-y-auto">
            <div 
              v-for="file in dedupedFiles" 
              :key="file"
              class="text-xs text-gray-600 flex items-center gap-2 p-2 bg-gray-50 rounded"
            >
              <svg class="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              {{ file }}
            </div>
          </div>
          <p v-if="false" class="text-xs text-gray-500 mt-2">
            ...及其他 {{ policyStatus.fileCount - 5 }} 個文件
          </p>
        </div>

        <!-- 操作按鈕 -->
        <div class="mt-6 space-y-2">
          <button 
            @click="handleAutoLoad"
            :disabled="autoLoading"
            class="w-full py-3 border-2 border-primary-500 text-primary-600 font-semibold rounded-xl hover:bg-primary-50 transition-colors disabled:opacity-50"
          >
            <template v-if="autoLoading">
              <svg class="inline animate-spin -ml-1 mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              載入中...
            </template>
            <template v-else>
              📂 建立向量資料庫
            </template>
          </button>

          <button 
            @click="refreshPolicyStatus"
            class="w-full py-2 text-sm text-gray-600 hover:text-gray-800 font-medium transition-colors"
          >
            🔄 重新整理
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { api } from '@/services/api'

const props = defineProps({
  aiSettings: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['start'])

const regulationFile = ref(null)
const isDragging = ref(false)
const uploading = ref(false)
const uploadProgress = ref(0)

const policyStatus = ref({
  fileCount: 0,
  files: [],
  vectorDbDocuments: 0
})
const loadingPolicyStatus = ref(true)
const autoLoading = ref(false)

const fileInput = ref(null)

onMounted(() => {
  fetchPolicyStatus()
})

// 版本去重工具：抽取檔名中的 base 與版本號（如 _v2.8）
function parseVersionInfo(filename) {
  // 去掉副檔名
  let name = filename.replace(/\.(docx|doc)$/i, '')
  // 容忍版本號後方的尾註，如空白 + (x) 或 - 副本 等
  // 例: SC-01-010_營運持續管理_v1.2 (x) -> base=SC-01-010_營運持續管理, version=1.2
  const m = name.match(/^(.*)_v(\d+(?:\.\d+)*)(?:\s*[\-_]?(?:副本|copy|\([^)]+\)))?$/i)
  if (!m) return { base: name, version: null }
  const base = m[1]
  const version = m[2].split('.').map(n => parseInt(n, 10))
  return { base, version }
}

function compareVersions(a, b) {
  const len = Math.max(a.length, b.length)
  for (let i = 0; i < len; i++) {
    const ai = a[i] ?? 0
    const bi = b[i] ?? 0
    if (ai !== bi) return ai - bi
  }
  return 0
}

function dedupePolicyFiles(files) {
  const map = new Map()
  for (const f of files || []) {
    const info = parseVersionInfo(f)
    if (!info.version) {
      const k = `__NOVERSION__::${f}`
      if (!map.has(k)) map.set(k, { file: f })
      continue
    }
    const key = info.base
    const current = map.get(key)
    if (!current) {
      map.set(key, { file: f, version: info.version })
    } else if (current.version && compareVersions(info.version, current.version) < 0) {
      // 保留較舊版本
      map.set(key, { file: f, version: info.version })
    }
  }
  return Array.from(map.values()).map(v => v.file)
}

const dedupedFiles = computed(() => dedupePolicyFiles(policyStatus.value.files))
const dedupedFileCount = computed(() => dedupedFiles.value.length)

async function fetchPolicyStatus() {
  try {
    loadingPolicyStatus.value = true
    const response = await api.checkPolicyFolder()
    const raw = response.data
    const dedup = dedupePolicyFiles(raw?.files || [])
    policyStatus.value = {
      ...raw,
      files: dedup,
      fileCount: dedup.length,
    }
  } catch (error) {
    console.error('獲取內規狀態失敗:', error)
  } finally {
    loadingPolicyStatus.value = false
  }
}

function triggerFileInput() {
  if (regulationFile.value) return
  fileInput.value.click()
}

function handleFileSelect(event) {
  const file = event.target.files[0]
  if (file) {
    regulationFile.value = file
  }
}

function handleDrop(event) {
  isDragging.value = false
  const file = event.dataTransfer.files[0]
  
  if (file && (file.name.endsWith('.doc') || file.name.endsWith('.docx'))) {
    regulationFile.value = file
  } else {
    alert('請上傳 .doc 或 .docx 檔案')
  }
}

async function handleStartAnalysis() {
  if (!regulationFile.value) return

  try {
    uploading.value = true
    uploadProgress.value = 0

    // 上傳法規文件
    const response = await api.uploadRegulation(
      regulationFile.value,
      (progress) => {
        uploadProgress.value = progress
      }
    )

    // 發送任務 ID 和檔案名稱到父組件
    emit('start', {
      taskId: response.data.taskId,
      fileName: regulationFile.value.name
    })
    
  } catch (error) {
    console.error('上傳失敗:', error)
    alert('上傳失敗: ' + error.message)
    uploading.value = false
  }
}

async function handleAutoLoad() {
  try {
    autoLoading.value = true
    
    const response = await api.autoLoadPolicies()
    
    if (response.success) {
      alert(`成功載入 ${response.data.succeeded} 個內規文件！`)
      await fetchPolicyStatus()
    }
  } catch (error) {
    console.error('自動載入失敗:', error)
    alert('自動載入失敗: ' + error.message)
  } finally {
    autoLoading.value = false
  }
}

function refreshPolicyStatus() {
  fetchPolicyStatus()
}

function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}
</script>

<style scoped>
.stat-card {
  @apply flex items-center justify-between p-4 bg-gray-50 rounded-xl;
}

.stat-label {
  @apply font-semibold text-gray-900;
}

.stat-value {
  @apply text-3xl font-bold;
}
</style>
