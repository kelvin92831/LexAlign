<template>
  <div class="space-y-6">
    <!-- 標題與操作 -->
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-2xl font-semibold text-gray-900 mb-1">分析結果</h2>
        <p class="text-sm text-gray-600">
          共 {{ suggestions.length }} 條建議，涉及 {{ groupedCount }} 個文件
        </p>
      </div>
      
      <div class="flex items-center space-x-3">
        <button
          @click="downloadReport"
          :disabled="downloading"
          class="btn btn-primary"
        >
          <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          {{ downloading ? '下載中...' : '下載報告' }}
        </button>
        
        <button
          @click="handleReset"
          class="btn btn-secondary"
        >
          <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          重新分析
        </button>
      </div>
    </div>

    <!-- 視圖切換 -->
    <div class="card p-1 inline-flex space-x-1">
      <button
        @click="viewMode = 'by_document'"
        class="px-4 py-2 text-sm font-medium rounded-lg transition-colors"
        :class="viewMode === 'by_document' 
          ? 'bg-gray-900 text-white' 
          : 'text-gray-700 hover:bg-gray-100'"
      >
        按文件 ({{ groupedCount }})
      </button>
      
      <button
        @click="viewMode = 'by_regulation'"
        class="px-4 py-2 text-sm font-medium rounded-lg transition-colors"
        :class="viewMode === 'by_regulation' 
          ? 'bg-gray-900 text-white' 
          : 'text-gray-700 hover:bg-gray-100'"
      >
        按法規 ({{ suggestions.length }})
      </button>
    </div>

    <!-- 內容區域 -->
    <Transition name="fade" mode="out-in">
      <DocumentGroupedView 
        v-if="viewMode === 'by_document'"
        key="document"
        :grouped-suggestions="groupedSuggestions"
      />
      
      <RegulationView
        v-else
        key="regulation"
        :suggestions="suggestions"
      />
    </Transition>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useAppStore } from '@/stores/app'
import { api } from '@/services/api'
import DocumentGroupedView from './DocumentGroupedView.vue'
import RegulationView from './RegulationView.vue'

const props = defineProps({
  taskId: String,
  suggestions: Array
})

const emit = defineEmits(['reset'])

const store = useAppStore()
const viewMode = ref('by_document')
const downloading = ref(false)

const groupedSuggestions = computed(() => store.groupedSuggestions)
const groupedCount = computed(() => groupedSuggestions.value.length)

async function downloadReport() {
  downloading.value = true
  try {
    await api.downloadReport(props.taskId, 'docx')
  } catch (err) {
    alert('下載失敗：' + err.message)
  } finally {
    downloading.value = false
  }
}

function handleReset() {
  emit('reset')
}
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
