const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

/**
 * API 客戶端
 */
class ApiClient {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
  }

  /**
   * 上傳法規文件
   */
  async uploadRegulation(file) {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${this.baseUrl}/api/upload/regulation`, {
      method: 'POST',
      body: formData,
    });

    return this.handleResponse(response);
  }

  /**
   * 上傳內規文件
   */
  async uploadPolicy(file) {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${this.baseUrl}/api/upload/policy`, {
      method: 'POST',
      body: formData,
    });

    return this.handleResponse(response);
  }

  /**
   * 批次上傳內規文件
   */
  async uploadPolicyBatch(files) {
    const formData = new FormData();
    files.forEach(file => {
      formData.append('files', file);
    });

    const response = await fetch(`${this.baseUrl}/api/upload/policy/batch`, {
      method: 'POST',
      body: formData,
    });

    return this.handleResponse(response);
  }

  /**
   * 執行比對
   */
  async match(taskId, topK = 5) {
    const response = await fetch(`${this.baseUrl}/api/match`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ taskId, topK }),
    });

    return this.handleResponse(response);
  }

  /**
   * 取得比對結果
   */
  async getMatch(taskId) {
    const response = await fetch(`${this.baseUrl}/api/match/${taskId}`);
    return this.handleResponse(response);
  }

  /**
   * 生成建議
   */
  async generateSuggestions(taskId, options = {}) {
    const response = await fetch(`${this.baseUrl}/api/suggest`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        taskId,
        ...options,
      }),
    });

    return this.handleResponse(response);
  }

  /**
   * 取得建議結果
   */
  async getSuggestions(taskId) {
    const response = await fetch(`${this.baseUrl}/api/suggest/${taskId}`);
    return this.handleResponse(response);
  }

  /**
   * 下載報告
   */
  async downloadReport(taskId, format = 'docx') {
    const response = await fetch(
      `${this.baseUrl}/api/download/${taskId}?format=${format}`
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || '下載失敗');
    }

    // 下載檔案
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `regulation_suggestions_${taskId}.${format}`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }

  /**
   * 自動載入內規文件
   */
  async autoLoadPolicies() {
    const response = await fetch(`${this.baseUrl}/api/upload/policy/auto-load`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    return this.handleResponse(response);
  }

  /**
   * 檢查內規資料夾狀態
   */
  async checkPolicyFolder() {
    const response = await fetch(`${this.baseUrl}/api/upload/policy/check`);
    return this.handleResponse(response);
  }

  /**
   * 健康檢查
   */
  async healthCheck() {
    const response = await fetch(`${this.baseUrl}/health`);
    return this.handleResponse(response);
  }

  /**
   * 處理回應
   * @private
   */
  async handleResponse(response) {
    if (!response.ok) {
      const error = await response.json().catch(() => ({
        error: { message: '未知錯誤' },
      }));
      throw new Error(error.error?.message || `HTTP ${response.status}`);
    }

    return response.json();
  }
}

export const apiClient = new ApiClient(API_BASE_URL);

