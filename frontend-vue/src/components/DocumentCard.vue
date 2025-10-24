<template>
  <div class="document-card">
    <!-- 文件標題區域 -->
    <div 
      class="document-header"
      @click="$emit('toggle')"
    >
      <div class="header-left">
        <!-- 文件類型標籤 -->
        <span class="document-type-badge">
          {{ document.document_type }}
        </span>
        
        <!-- 文件名稱 -->
        <div class="document-info">
          <h3 class="document-title">{{ document.document }}</h3>
          
          <!-- 統計資訊 -->
          <div class="document-stats">
            <span class="stat-item">
              <span class="stat-value">{{ document.total_changes }}</span>
              <span class="stat-text">個建議修改</span>
            </span>
            <span class="stat-divider">|</span>
            <span class="stat-item">
              <span class="stat-text">相似度</span>
              <span class="stat-value" :class="similarityClass">{{ formatSimilarity }}</span>
            </span>
          </div>
        </div>
      </div>
      
      <!-- 展開圖標 -->
      <div class="header-right">
        <svg 
          class="expand-icon"
          :class="{ 'expanded': isExpanded }"
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </div>

    <!-- 詳細修改列表 -->
    <Transition name="expand">
      <div v-if="isExpanded" class="changes-container">
        <ChangeItem
          v-for="(change, index) in document.changes"
          :key="index"
          :change="change"
        />
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import ChangeItem from './ChangeItem.vue'

const props = defineProps({
  document: {
    type: Object,
    required: true
  },
  isExpanded: {
    type: Boolean,
    default: false
  }
})

defineEmits(['toggle'])

const avgSimilarity = computed(() => {
  const changes = props.document.changes || []
  if (changes.length === 0) return null
  
  const similarities = changes
    .map(c => c.similarity)
    .filter(s => s !== undefined && s !== null)
  
  if (similarities.length > 0) {
    return similarities.reduce((sum, s) => sum + s, 0) / similarities.length
  }
  
  return props.document.avgSimilarity || null
})

const formatSimilarity = computed(() => {
  if (avgSimilarity.value === null) return 'N/A'
  return `${(avgSimilarity.value * 100).toFixed(1)}%`
})

const similarityClass = computed(() => {
  if (avgSimilarity.value === null) return ''
  if (avgSimilarity.value >= 0.8) return 'high'
  if (avgSimilarity.value >= 0.6) return 'medium'
  return 'low'
})
</script>

<style scoped>
/* 專業文件卡片 */
.document-card {
  background: white;
  border: 1px solid #e5e5e5;
  margin-bottom: 12px;
  transition: border-color 0.15s ease;
}

.document-card:hover {
  border-color: #d4d4d4;
}

/* 標題區域 */
.document-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px;
  cursor: pointer;
  gap: 20px;
}

.document-header:hover {
  background-color: #fafafa;
}

.header-left {
  flex: 1;
  min-width: 0;
}

.header-right {
  flex-shrink: 0;
}

/* 文件類型標籤 */
.document-type-badge {
  display: inline-block;
  padding: 4px 10px;
  font-size: 11px;
  font-weight: 600;
  color: #525252;
  background-color: #f5f5f5;
  border: 1px solid #e5e5e5;
  border-radius: 2px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 10px;
}

/* 文件資訊 */
.document-info {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.document-title {
  font-size: 15px;
  font-weight: 600;
  color: #262626;
  line-height: 1.4;
  margin: 0;
}

/* 統計資訊 */
.document-stats {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 13px;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 6px;
}

.stat-text {
  color: #737373;
  font-weight: 500;
}

.stat-value {
  font-weight: 700;
  color: #262626;
}

/* 柔和的相似度顏色 */
.stat-value.high {
  color: #6b9080;
}

.stat-value.medium {
  color: #d4a574;
}

.stat-value.low {
  color: #737373;
}

.stat-divider {
  color: #d4d4d4;
}

/* 展開圖標 */
.expand-icon {
  width: 20px;
  height: 20px;
  color: #a3a3a3;
  transition: transform 0.2s ease;
}

.expand-icon.expanded {
  transform: rotate(180deg);
}

.document-header:hover .expand-icon {
  color: #737373;
}

/* 修改列表容器 */
.changes-container {
  padding: 0 20px 20px 20px;
  border-top: 1px solid #f5f5f5;
}

.changes-container > *:not(:last-child) {
  margin-bottom: 12px;
}

/* 展開動畫 */
.expand-enter-active,
.expand-leave-active {
  transition: all 0.2s ease;
  max-height: 3000px;
  overflow: hidden;
}

.expand-enter-from,
.expand-leave-to {
  max-height: 0;
  opacity: 0;
}

/* 響應式設計 */
@media (max-width: 768px) {
  .document-header {
    padding: 16px;
  }
  
  .document-stats {
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }
  
  .stat-divider {
    display: none;
  }
  
  .changes-container {
    padding: 0 16px 16px 16px;
  }
}
</style>
