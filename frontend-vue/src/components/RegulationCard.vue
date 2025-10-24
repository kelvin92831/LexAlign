<template>
  <div class="card transition-all duration-200" :class="expanded && 'shadow'">
    <!-- 卡片標題 -->
    <div
      @click="toggleExpand"
      class="p-5 cursor-pointer hover:bg-gray-50 transition-colors"
    >
      <div class="flex items-center justify-between">
        <div class="flex-1 min-w-0 space-y-2">
          <div class="flex items-center space-x-3">
            <span class="flex items-center justify-center w-6 h-6 bg-gray-900 text-white text-xs font-semibold rounded">
              {{ index + 1 }}
            </span>
            <span class="badge text-xs px-3 py-1" :class="changeTypeBadge">
              {{ suggestion.change_type }}
            </span>
          </div>
          
          <p class="text-sm text-gray-600">{{ suggestion.file }}</p>
          
          <p class="text-sm text-gray-900 line-clamp-2">
            {{ truncateText(formatValue(suggestion.diff_summary), 150) }}
          </p>
        </div>
        
        <svg 
          class="w-5 h-5 text-gray-400 transition-transform duration-200 flex-shrink-0 ml-4"
          :class="expanded && 'rotate-180'"
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </div>

    <!-- 展開內容 -->
    <Transition
      name="expand"
      @enter="onEnter"
      @after-enter="onAfterEnter"
      @leave="onLeave"
    >
      <div v-if="expanded" class="border-t border-gray-200">
        <div class="p-5 space-y-4 bg-gray-50">
          <!-- 目標位置 -->
          <div>
            <div class="flex items-center space-x-2 mb-2">
              <div class="w-1 h-4 bg-gray-900 rounded-full"></div>
              <h4 class="text-sm font-medium text-gray-900">修改位置</h4>
            </div>
            <p class="text-sm text-gray-700 pl-3">{{ formatValue(suggestion.section) }}</p>
          </div>

          <!-- 建議修正文 -->
          <div>
            <div class="flex items-center space-x-2 mb-2">
              <div class="w-1 h-4 bg-gray-900 rounded-full"></div>
              <h4 class="text-sm font-medium text-gray-900">建議修正文</h4>
            </div>
            <div class="pl-3">
              <div class="card p-4 bg-white">
                <p class="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                  {{ formatValue(suggestion.suggestion_text) }}
                </p>
              </div>
            </div>
          </div>

          <!-- 理由與依據 -->
          <div>
            <div class="flex items-center space-x-2 mb-2">
              <div class="w-1 h-4 bg-gray-900 rounded-full"></div>
              <h4 class="text-sm font-medium text-gray-900">理由與依據</h4>
            </div>
            <div class="pl-3">
              <div class="card p-4 bg-white">
                <p class="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                  {{ formatValue(suggestion.reason) }}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  suggestion: Object,
  index: Number
})

const expanded = ref(false)

const changeTypeBadge = computed(() => {
  const types = {
    '新增': 'badge-success',
    '修正': 'badge-warning',
    '刪除': 'badge-danger'
  }
  return types[props.suggestion.change_type] || 'badge-primary'
})

function toggleExpand() {
  expanded.value = !expanded.value
}

function formatValue(value) {
  if (value === null || value === undefined) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'object') {
    if (value.修改前 && value.修改後) {
      return `修改前：${value.修改前}\n\n修改後：${value.修改後}`
    }
    return JSON.stringify(value, null, 2)
  }
  return String(value)
}

function truncateText(text, maxLength) {
  if (!text) return ''
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength) + '...'
}

function onEnter(el) {
  el.style.height = '0'
  el.style.opacity = '0'
}

function onAfterEnter(el) {
  el.style.height = 'auto'
  el.style.opacity = '1'
}

function onLeave(el) {
  el.style.height = el.scrollHeight + 'px'
  setTimeout(() => {
    el.style.height = '0'
    el.style.opacity = '0'
  }, 0)
}
</script>

<style scoped>
.expand-enter-active,
.expand-leave-active {
  transition: all 0.3s ease;
  overflow: hidden;
}

.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
