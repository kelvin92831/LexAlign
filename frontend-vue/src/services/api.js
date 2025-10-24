import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 300000, // 5分鐘基本超時
  headers: {
    'Content-Type': 'application/json'
  }
})

apiClient.interceptors.request.use(
  config => {
    console.log(`[API] ${config.method.toUpperCase()} ${config.url}`, config.data || '')
    return config
  },
  error => {
    return Promise.reject(error)
  }
)

apiClient.interceptors.response.use(
  response => {
    console.log(`[API] Response:`, response.data)
    return response.data
  },
  error => {
    const message = error.response?.data?.error?.message || error.message || '請求失敗'
    console.error('[API] Error:', message)
    return Promise.reject(new Error(message))
  }
)

export const api = {
  async healthCheck() {
    return apiClient.get('/health')
  },

  async uploadRegulation(file, onProgress) {
    const formData = new FormData()
    formData.append('file', file)
    return apiClient.post('/api/upload/regulation', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: onProgress ? (e) => {
        onProgress(Math.round((e.loaded * 100) / e.total))
      } : undefined
    })
  },

  async uploadPolicy(file, onProgress) {
    const formData = new FormData()
    formData.append('file', file)
    return apiClient.post('/api/upload/policy', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: onProgress ? (e) => {
        onProgress(Math.round((e.loaded * 100) / e.total))
      } : undefined
    })
  },

  async uploadPolicyBatch(files, onProgress) {
    const formData = new FormData()
    files.forEach(file => {
      formData.append('files', file)
    })
    return apiClient.post('/api/upload/policy/batch', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: onProgress ? (e) => {
        onProgress(Math.round((e.loaded * 100) / e.total))
      } : undefined
    })
  },

  async autoLoadPolicies() {
    return apiClient.post('/api/upload/policy/auto-load', {}, {
      timeout: 600000 // 10分鐘超時，因為需要處理多個文件
    })
  },

  async checkPolicyFolder() {
    return apiClient.get('/api/upload/policy/check')
  },

  async match(taskId, topK = 5) {
    return apiClient.post('/api/match', { taskId, topK }, {
      timeout: 600000 // 10分鐘超時，因為RAG檢索可能涉及大量文件
    })
  },

  async getMatch(taskId) {
    return apiClient.get(`/api/match/${taskId}`)
  },

  async generateSuggestions(taskId, options = {}) {
    return apiClient.post('/api/suggest', { 
      taskId, 
      temperature: options.temperature,
      maxTokens: options.maxTokens
    }, {
      timeout: 900000 // 15分鐘超時，因為建議生成需要讀取完整文件並調用AI
    })
  },

  async getSuggestions(taskId) {
    return apiClient.get(`/api/suggest/${taskId}`)
  },

  async downloadReport(taskId, format = 'docx') {
    const response = await axios({
      method: 'get',
      url: `${API_BASE_URL}/api/download/${taskId}`,
      params: { format },
      responseType: 'blob'
    })
    
    const blob = new Blob([response.data])
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `法規建議報告_${taskId}.${format}`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  },

  // 歷史記錄 API
  async saveToHistory(taskId, fileName, suggestions, metadata) {
    return apiClient.post('/api/history/save', {
      taskId,
      fileName,
      suggestions,
      metadata
    })
  },

  async getHistoryList(status = null) {
    const params = status ? { status } : {}
    return apiClient.get('/api/history/list', { params })
  },

  async getHistoryDetail(id) {
    return apiClient.get(`/api/history/${id}`)
  },

  async updateReviewStatus(id, reviewStatus) {
    return apiClient.patch(`/api/history/${id}/review`, { reviewStatus })
  },

  async deleteHistory(id) {
    return apiClient.delete(`/api/history/${id}`)
  },

  async clearAllHistory() {
    return apiClient.delete('/api/history/clear/all')
  }
}

export default api
