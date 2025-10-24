<template>
  <div 
    class="stat-card"
    :class="{ 'clickable': clickable }"
    @click="handleClick"
  >
    <div class="stat-header">
      <div class="stat-icon">
        <img v-if="imageIcon" :src="imageIcon" alt="" class="stat-img" />
        <component v-else :is="iconComponent" />
      </div>
      <div v-if="trend" class="trend-badge">
        {{ trend }}
      </div>
    </div>
    
    <div class="stat-content">
      <p class="stat-value">{{ displayValue }}</p>
      <p class="stat-label">{{ label }}</p>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  icon: {
    type: String,
    required: true
  },
  label: {
    type: String,
    required: true
  },
  value: {
    type: [String, Number],
    required: true
  },
  color: {
    type: String,
    default: 'primary'
  },
  trend: {
    type: String,
    default: null
  },
  clickable: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['click'])

const displayValue = computed(() => {
  if (typeof props.value === 'number') {
    return props.value.toLocaleString()
  }
  return props.value
})

const iconComponent = computed(() => {
  const icons = {
    'file-text': FileTextIcon,
    'search': SearchIcon,
    'brain': BrainIcon,
    'clock': ClockIcon,
    'download': DownloadIcon
  }
  return icons[props.icon] || FileTextIcon
})

// 支援傳入圖片 URL（public/ 下以根路徑 / 存取）
const imageIcon = computed(() => {
  const val = props.icon || ''
  // 判斷是否為圖片路徑或 URL
  if (/\.(png|jpe?g|gif|svg)$/i.test(val) || val.startsWith('/') || val.startsWith('http')) {
    return val
  }
  return null
})

function handleClick() {
  if (props.clickable) {
    emit('click')
  }
}

// Icon Components
const FileTextIcon = {
  template: `
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  `
}

const SearchIcon = {
  template: `
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  `
}

const BrainIcon = {
  template: `
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
    </svg>
  `
}

const ClockIcon = {
  template: `
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  `
}

const DownloadIcon = {
  template: `
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
  `
}
</script>

<style scoped>
/* 專業簡潔的統計卡片 - 使用新配色 */
.stat-card {
  background: white;
  border: 1px solid #e5e5e5;
  padding: 20px;
  transition: border-color 0.15s ease;
}

.stat-card:hover {
  border-color: #d4d4d4;
}

.stat-card.clickable {
  cursor: pointer;
}

.stat-card.clickable:hover {
  border-color: #5b7c99;
}

/* 頭部區域 */
.stat-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.stat-icon {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #525252;
}

.stat-icon svg {
  width: 40px;
  height: 40px;
}

.stat-img {
  display: block;
  width: 30px;
  height: 30px;
  object-fit: contain;
}

.trend-badge {
  padding: 2px 8px;
  font-size: 11px;
  font-weight: 600;
  color: #525252;
  background-color: #f5f5f5;
  border-radius: 4px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* 內容區域 */
.stat-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.stat-value {
  font-size: 28px;
  font-weight: 700;
  color: #262626;
  line-height: 1;
  letter-spacing: -0.5px;
}

.stat-label {
  font-size: 13px;
  color: #737373;
  font-weight: 500;
}

/* 響應式設計 */
@media (max-width: 768px) {
  .stat-card {
    padding: 16px;
  }
  
  .stat-value {
    font-size: 24px;
  }
  
  .stat-icon {
    width: 36px;
    height: 36px;
  }
  
  .stat-icon svg {
    width: 18px;
    height: 18px;
  }
}
</style>
