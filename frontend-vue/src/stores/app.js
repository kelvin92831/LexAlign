import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useAppStore = defineStore('app', () => {
  // State
  const taskId = ref(null)
  const stage = ref('upload') // upload, processing, results
  const suggestions = ref([])
  const folderInfo = ref(null)
  const error = ref(null)

  // Getters
  const hasTaskId = computed(() => !!taskId.value)
  const hasSuggestions = computed(() => suggestions.value.length > 0)
  const groupedSuggestions = computed(() => {
    if (!suggestions.value.length) return []
    
    const grouped = {}
    suggestions.value.forEach(suggestion => {
      const docName = suggestion.file
      if (!grouped[docName]) {
        grouped[docName] = {
          document: docName,
          document_type: docName.includes('-F') ? '附件範本' : '主規章',
          changes: []
        }
      }
      grouped[docName].changes.push(suggestion)
    })
    
    return Object.values(grouped).sort((a, b) => b.changes.length - a.changes.length)
  })

  // Actions
  function setTaskId(id) {
    taskId.value = id
  }

  function setStage(newStage) {
    stage.value = newStage
  }

  function setSuggestions(data) {
    suggestions.value = data
  }

  function setFolderInfo(info) {
    folderInfo.value = info
  }

  function setError(err) {
    error.value = err
  }

  function clearError() {
    error.value = null
  }

  function reset() {
    taskId.value = null
    stage.value = 'upload'
    suggestions.value = []
    error.value = null
  }

  return {
    // State
    taskId,
    stage,
    suggestions,
    folderInfo,
    error,
    // Getters
    hasTaskId,
    hasSuggestions,
    groupedSuggestions,
    // Actions
    setTaskId,
    setStage,
    setSuggestions,
    setFolderInfo,
    setError,
    clearError,
    reset
  }
})
