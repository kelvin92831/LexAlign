<template>
  <div class="mt-6 pt-6 border-t border-gray-200 space-y-6">
    <div class="flex items-center justify-between">
      <h3 class="text-lg font-semibold text-gray-900">分析參數設定</h3>
      <button 
        @click="resetToDefaults"
        class="text-sm text-primary-600 hover:text-primary-700 font-medium"
      >
        重置預設值
      </button>
    </div>

    <div class="grid md:grid-cols-2 gap-6">
      <!-- Top-K 設定 -->
      <div class="space-y-3">
        <div class="flex items-center justify-between">
          <label class="text-sm font-medium text-gray-700">
            RAG 檢索數量
          </label>
          <span class="text-lg font-bold text-primary-600">{{ localSettings.topK }}</span>
        </div>
        
        <input 
          type="range" 
          min="1" 
          max="10" 
          v-model="localSettings.topK"
          @input="updateSettings"
          class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
        />
        
        <div class="flex justify-between text-xs text-gray-500">
          <span>1 (最精準)</span>
          <span>10 (最全面)</span>
        </div>
        
        <p class="text-xs text-gray-600 bg-gray-50 p-3 rounded-lg">
          <strong>Top-K</strong>: 每個法規條文檢索的相關內規數量。數值越高,檢索越全面但可能包含較不相關的結果。
        </p>
      </div>

      <!-- Temperature 設定 -->
      <div class="space-y-3">
        <div class="flex items-center justify-between">
          <label class="text-sm font-medium text-gray-700">
            生成創造性
          </label>
          <span class="text-lg font-bold text-primary-600">{{ localSettings.temperature.toFixed(1) }}</span>
        </div>
        
        <input 
          type="range" 
          min="0" 
          max="1" 
          step="0.1"
          v-model="localSettings.temperature"
          @input="updateSettings"
          class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
        />
        
        <div class="flex justify-between text-xs text-gray-500">
          <span>0.0 (嚴謹)</span>
          <span>1.0 (創新)</span>
        </div>
        
        <p class="text-xs text-gray-600 bg-gray-50 p-3 rounded-lg">
          <strong>Temperature</strong>: 控制建議生成的創造性。0 = 嚴謹準確 | 0.5 = 平衡 | 1 = 靈活創新
        </p>
      </div>

      <!-- Max Tokens 設定 -->
      <div class="space-y-3 md:col-span-2">
        <div class="flex items-center justify-between">
          <label class="text-sm font-medium text-gray-700">
            最大輸出長度
          </label>
          <span class="text-lg font-bold text-primary-600">{{ localSettings.maxTokens }}</span>
        </div>
        
        <input 
          type="range" 
          min="2048" 
          max="16384" 
          step="1024"
          v-model="localSettings.maxTokens"
          @input="updateSettings"
          class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
        />
        
        <div class="flex justify-between text-xs text-gray-500">
          <span>2,048 (簡短)</span>
          <span>8,192 (建議)</span>
          <span>16,384 (詳盡)</span>
        </div>
        
        <p class="text-xs text-gray-600 bg-gray-50 p-3 rounded-lg">
          <strong>Max Tokens</strong>: 生成建議的最大長度。建議使用 8192,足以生成詳細的修改建議。
        </p>
      </div>
    </div>

    <!-- 預設值說明 -->
    <div class="flex items-start gap-3 p-4 bg-primary-50 border border-primary-200 rounded-lg">
      <svg class="w-5 h-5 text-primary-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <div class="text-sm text-primary-800">
        <p class="font-medium mb-1">建議設定</p>
        <p>Top-K: <strong>5</strong> · Temperature: <strong>0.3</strong> · Max Tokens: <strong>8192</strong></p>
        <p class="text-xs mt-1 text-primary-700">此設定可在準確性和全面性之間取得良好平衡</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  modelValue: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['update:modelValue'])

const localSettings = ref({ ...props.modelValue })

watch(() => props.modelValue, (newVal) => {
  localSettings.value = { ...newVal }
}, { deep: true })

function updateSettings() {
  localSettings.value.topK = Number(localSettings.value.topK)
  localSettings.value.temperature = Number(localSettings.value.temperature)
  localSettings.value.maxTokens = Number(localSettings.value.maxTokens)
  
  emit('update:modelValue', { ...localSettings.value })
}

function resetToDefaults() {
  localSettings.value = {
    topK: 5,
    temperature: 0.3,
    maxTokens: 8192
  }
  updateSettings()
}
</script>

<style scoped>
.slider::-webkit-slider-thumb {
  appearance: none;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #4f46e5;
  cursor: pointer;
  border: 3px solid white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.slider::-moz-range-thumb {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #4f46e5;
  cursor: pointer;
  border: 3px solid white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.slider::-webkit-slider-thumb:hover {
  background: #4338ca;
  transform: scale(1.1);
}

.slider::-moz-range-thumb:hover {
  background: #4338ca;
  transform: scale(1.1);
}
</style>
