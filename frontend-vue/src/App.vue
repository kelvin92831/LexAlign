<template>
  <div class="min-h-screen bg-gray-50 flex flex-col">
    <!-- 頂部導航欄 -->
    <header class="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-200">
      <div class="max-w-7xl mx-auto px-6 lg:px-8">
        <div class="flex items-center justify-between h-16">
          <!-- Logo -->
          <div class="flex items-center space-x-3">
            <div class="w-8 h-8 rounded-lg flex items-center justify-center">
              <img src="/Capital_logo.jpg" alt="Logo" class="w-5 h-5" />
            </div>
            <div>
              <h1 class="text-lg font-semibold text-gray-900">法規比對系統</h1>
              <p class="text-xs text-gray-500 -mt-0.5">智能分析平台</p>
            </div>
          </div>
          
          <!-- 右側信息 -->
          <div class="flex items-center space-x-4">
            <div class="hidden sm:flex items-center space-x-2 px-3 py-1.5 bg-gray-100 rounded-lg">
              <div class="w-1.5 h-1.5 rounded-full bg-success-500"></div>
              <span class="text-xs font-medium text-gray-700">系統運行中</span>
            </div>
          </div>
        </div>
      </div>
    </header>

    <!-- 主要內容 -->
    <main class="flex-1 max-w-7xl w-full mx-auto px-6 lg:px-8 py-8">
      <HomePage />
    </main>

    <!-- 底部 -->
    <footer class="border-t border-gray-200 bg-white mt-auto">
      <div class="max-w-7xl mx-auto px-6 lg:px-8 py-6">
        <div class="flex flex-col sm:flex-row justify-between items-center space-y-2 sm:space-y-0 text-sm text-gray-500">
          <p>© 2025 法規比對系統. All rights reserved.</p>
          <div class="flex items-center space-x-4">
            <span>v2.0.0</span>
            <span class="text-gray-300">•</span>
            <span>Powered by Vue 3</span>
          </div>
        </div>
      </div>
    </footer>
  </div>
</template>

<script setup>
import HomePage from './views/HomePage.vue'
</script>

<style scoped>
header {
  backdrop-filter: blur(12px);
}
</style>
