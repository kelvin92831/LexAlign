<template>
  <div class="space-y-6">
    <!-- 標題和操作 -->
    <div class="card p-6">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-2xl font-bold text-gray-900">歷史記錄</h2>
          <p class="text-sm text-gray-600 mt-1">查看過去的分析結果</p>
        </div>
        
        <div class="flex items-center gap-3">
          <!-- 狀態篩選 -->
          <select 
            v-model="filterStatus"
            @change="refreshHistory"
            class="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
          >
            <option value="">全部記錄</option>
            <option value="unreviewed">尚未審閱</option>
            <option value="reviewed">已審閱</option>
          </select>
          
          <button 
            @click="refreshHistory"
            :disabled="loading"
            class="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            重新整理
          </button>
          
          <button 
            v-if="historyList.length > 0"
            @click="confirmClearAll"
            class="px-4 py-2 text-danger-600 border border-danger-300 rounded-lg hover:bg-danger-50 transition-colors"
          >
            清空全部
          </button>
        </div>
      </div>

      <!-- 統計 -->
      <div v-if="!loading && historyList.length > 0" class="flex items-center gap-6 mt-4 text-sm">
        <div class="flex items-center gap-2">
          <span class="w-2 h-2 rounded-full bg-warning-500"></span>
          <span class="text-gray-600">尚未審閱: <strong>{{ unreviewedCount }}</strong></span>
        </div>
        <div class="flex items-center gap-2">
          <span class="w-2 h-2 rounded-full bg-success-500"></span>
          <span class="text-gray-600">已審閱: <strong>{{ reviewedCount }}</strong></span>
        </div>
        <div class="flex items-center gap-2">
          <span class="text-gray-600">總計: <strong>{{ totalCount }}</strong></span>
        </div>
      </div>
    </div>

    <!-- 載入中 -->
    <div v-if="loading" class="card p-12 text-center">
      <svg class="animate-spin h-8 w-8 text-primary-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      <p class="text-gray-600">載入歷史記錄中...</p>
    </div>

    <!-- 空狀態 -->
    <div v-else-if="historyList.length === 0" class="card p-12 text-center">
      <svg class="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <h3 class="text-lg font-semibold text-gray-900 mb-2">
        {{ filterStatus ? '沒有符合條件的記錄' : '尚無歷史記錄' }}
      </h3>
      <p class="text-gray-600">
        {{ filterStatus ? '試試切換篩選條件' : '完成分析後將自動保存到歷史記錄' }}
      </p>
    </div>

    <!-- 歷史記錄列表 -->
    <div v-else class="space-y-4">
      <HistoryItem
        v-for="item in historyList"
        :key="item.id"
        :item="item"
        @view="handleViewDetail"
        @delete="handleDelete"
        @toggle-review="handleToggleReview"
      />
    </div>

    <!-- 確認對話框 -->
    <Teleport to="body">
      <div v-if="showConfirm" class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
        <div class="bg-white rounded-xl p-6 max-w-md mx-4 shadow-xl">
          <h3 class="text-lg font-bold text-gray-900 mb-2">確認清空</h3>
          <p class="text-gray-600 mb-6">確定要清空所有歷史記錄嗎？此操作無法復原。</p>
          <div class="flex items-center gap-3 justify-end">
            <button 
              @click="showConfirm = false"
              class="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              取消
            </button>
            <button 
              @click="handleClearAll"
              class="px-4 py-2 bg-danger-600 text-white rounded-lg hover:bg-danger-700"
            >
              確認清空
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { api } from '@/services/api'
import HistoryItem from './HistoryItem.vue'

const emit = defineEmits(['view-detail'])

const historyList = ref([])
const loading = ref(true)
const showConfirm = ref(false)
const filterStatus = ref('')

const unreviewedCount = computed(() => {
  return historyList.value.filter(item => item.reviewStatus === 'unreviewed').length
})

const reviewedCount = computed(() => {
  return historyList.value.filter(item => item.reviewStatus === 'reviewed').length
})

const totalCount = computed(() => {
  return historyList.value.length
})

onMounted(() => {
  fetchHistory()
})

async function fetchHistory() {
  try {
    loading.value = true
    const response = await api.getHistoryList(filterStatus.value || null)
    historyList.value = response.data.items
  } catch (error) {
    console.error('獲取歷史記錄失敗:', error)
    alert('獲取歷史記錄失敗: ' + error.message)
  } finally {
    loading.value = false
  }
}

function refreshHistory() {
  fetchHistory()
}

function handleViewDetail(item) {
  emit('view-detail', item)
}

async function handleToggleReview(id, currentStatus) {
  try {
    const newStatus = currentStatus === 'reviewed' ? 'unreviewed' : 'reviewed'
    await api.updateReviewStatus(id, newStatus)
    await fetchHistory()
  } catch (error) {
    console.error('更新審閱狀態失敗:', error)
    alert('更新審閱狀態失敗: ' + error.message)
  }
}

async function handleDelete(id) {
  if (!confirm('確定要刪除此歷史記錄嗎？')) return
  
  try {
    await api.deleteHistory(id)
    await fetchHistory()
  } catch (error) {
    console.error('刪除失敗:', error)
    alert('刪除失敗: ' + error.message)
  }
}

function confirmClearAll() {
  showConfirm.value = true
}

async function handleClearAll() {
  try {
    await api.clearAllHistory()
    showConfirm.value = false
    await fetchHistory()
  } catch (error) {
    console.error('清空失敗:', error)
    alert('清空失敗: ' + error.message)
  }
}
</script>
