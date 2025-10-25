<template>
  <div class="space-y-6">
    <!-- 相似度統計 -->
    <div class="card p-6">
      <h3 class="section-title">相似度分析</h3>
      <div class="similarity-grid">
        <div class="similarity-item">
          <div class="similarity-value high">{{ highSimilarityCount }}</div>
          <div class="similarity-label">高相似度 (≥80%)</div>
        </div>
        <div class="similarity-item">
          <div class="similarity-value medium">{{ mediumSimilarityCount }}</div>
          <div class="similarity-label">中相似度 (60-79%)</div>
        </div>
        <div class="similarity-item">
          <div class="similarity-value low">{{ lowSimilarityCount }}</div>
          <div class="similarity-label">低相似度 (<60%)</div>
        </div>
      </div>
    </div>

    <!-- 統計卡片 -->
    <div class="stats-grid">
      <StatCard
        icon="/gavel.png"
        label="法規條文"
        :value="stats.regulationItems"
      />
      <StatCard
        icon="/document.png"
        label="匹配文件"
        :value="stats.matchedDocuments"
      />
      <StatCard
        icon="/artificial-intelligence.png"
        label="AI 建議"
        :value="stats.totalSuggestions"
      />
      <StatCard
        icon="/clock.png"
        label="分析時間"
        :value="displayProcessingTime"
        clickable
        @click="handleDownload"
      />
    </div>

    <!-- 分析結果 -->
    <div class="card p-6">
      <div class="results-header">
        <div>
          <h2 class="results-title">分析結果</h2>
          <p class="results-subtitle">共 {{ sortedDocuments.length }} 份內規文件</p>
        </div>
        
        <div class="results-actions">
          <select 
            v-model="sortBy"
            class="sort-select"
          >
            <option value="similarity">按相似度排序</option>
            <option value="changes">按修改數排序</option>
            <option value="name">按文件名排序</option>
          </select>
        </div>
      </div>

      <!-- 文件列表 -->
      <div class="documents-list">
        <DocumentCard
          v-for="(doc, index) in sortedDocuments"
          :key="index"
          :document="doc"
          :is-expanded="expandedDoc === index"
          @toggle="expandedDoc = expandedDoc === index ? null : index"
        />
      </div>
    </div>

    <!-- 操作按鈕 -->
    <div class="action-buttons">
      <button 
        @click="$emit('reset')"
        class="btn-secondary"
      >
        ← 返回上傳
      </button>

      <button 
        @click="handleDownload"
        class="btn-primary"
      >
        下載完整報告
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { api } from '@/services/api'
import StatCard from './StatCard.vue'
import DocumentCard from './DocumentCard.vue'

const props = defineProps({
  taskId: {
    type: String,
    required: true
  },
  results: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['reset'])

const expandedDoc = ref(0)
const sortBy = ref('similarity')

const stats = computed(() => {
  const suggestions = props.results.suggestions || []
  const suggestionsByDoc = props.results.suggestions_by_document || []
  
  return {
    regulationItems: new Set(suggestions.map(s => s.trace?.regulation_anchor)).size,
    matchedDocuments: suggestionsByDoc.length,
    totalSuggestions: suggestions.length,
  }
})

const displayProcessingTime = computed(() => {
  if (props.results.processingTime) {
    return props.results.processingTime
  }
  // 如果沒有記錄處理時間（舊數據），顯示更合適的訊息
  return '無記錄'
})

const highSimilarityCount = computed(() => {
  return sortedDocuments.value.filter(doc => doc.avgSimilarity >= 0.8).length
})

const mediumSimilarityCount = computed(() => {
  return sortedDocuments.value.filter(doc => doc.avgSimilarity >= 0.6 && doc.avgSimilarity < 0.8).length
})

const lowSimilarityCount = computed(() => {
  return sortedDocuments.value.filter(doc => doc.avgSimilarity < 0.6).length
})

const sortedDocuments = computed(() => {
  const docs = [...(props.results.suggestions_by_document || [])]
  
  docs.forEach(doc => {
    const similarities = doc.changes
      .map(c => c.similarity)
      .filter(s => s !== undefined && s !== null && s > 0)
    
    if (similarities.length > 0) {
      doc.avgSimilarity = similarities.reduce((sum, s) => sum + s, 0) / similarities.length
    } else {
      // 如果沒有相似度數據，嘗試從其他來源計算
      doc.avgSimilarity = 0
    }
  })
  
  switch (sortBy.value) {
    case 'similarity':
      return docs.sort((a, b) => (b.avgSimilarity || 0) - (a.avgSimilarity || 0))
    case 'changes':
      return docs.sort((a, b) => b.total_changes - a.total_changes)
    case 'name':
      return docs.sort((a, b) => a.document.localeCompare(b.document))
    default:
      return docs
  }
})

async function handleDownload() {
  try {
    await api.downloadReport(props.taskId)
  } catch (error) {
    console.error('下載失敗:', error)
    alert('下載失敗: ' + error.message)
  }
}
</script>

<style scoped>
/* 區塊標題 */
.section-title {
  font-size: 16px;
  font-weight: 600;
  color: #262626;
  margin-bottom: 16px;
}

/* 相似度網格 - 使用更柔和的顏色 */
.similarity-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

.similarity-item {
  text-align: center;
  padding: 20px;
  background-color: #fafafa;
  border: 1px solid #e5e5e5;
}

.similarity-value {
  font-size: 36px;
  font-weight: 700;
  line-height: 1;
  margin-bottom: 8px;
}

/* 柔和的顏色 */
.similarity-value.high {
  color: #6b9080;
}

.similarity-value.medium {
  color: #d4a574;
}

.similarity-value.low {
  color: #737373;
}

.similarity-label {
  font-size: 13px;
  color: #737373;
  font-weight: 500;
}

/* 統計卡片網格 */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
}

/* 結果區域 */
.results-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid #e5e5e5;
  flex-wrap: wrap;
  gap: 16px;
}

.results-title {
  font-size: 20px;
  font-weight: 700;
  color: #262626;
  line-height: 1.2;
  margin-bottom: 4px;
}

.results-subtitle {
  font-size: 13px;
  color: #737373;
}

.results-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.sort-select {
  padding: 8px 12px;
  border: 1px solid #d4d4d4;
  font-size: 13px;
  font-weight: 500;
  color: #525252;
  background: white;
  cursor: pointer;
  transition: border-color 0.15s ease;
}

.sort-select:hover {
  border-color: #a3a3a3;
}

.sort-select:focus {
  outline: none;
  border-color: #5b7c99;
  box-shadow: 0 0 0 1px #5b7c99;
}

/* 文件列表 */
.documents-list {
  display: flex;
  flex-direction: column;
  gap: 0;
}

/* 操作按鈕 */
.action-buttons {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.btn-secondary,
.btn-primary {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* 響應式設計 */
@media (max-width: 768px) {
  .similarity-grid {
    grid-template-columns: 1fr;
  }
  
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .results-header {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .action-buttons {
    flex-direction: column;
  }
  
  .btn-secondary,
  .btn-primary {
    width: 100%;
    justify-content: center;
  }
}
</style>
