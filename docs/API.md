# API 文件

## 基本資訊

- **Base URL**: `http://localhost:3001`
- **Content-Type**: `application/json` (除檔案上傳外)
- **回應格式**: JSON

---

## 回應格式

### 成功回應

```json
{
  "success": true,
  "data": {
    // 實際資料
  }
}
```

### 錯誤回應

```json
{
  "success": false,
  "error": {
    "message": "錯誤訊息",
    "statusCode": 400,
    "timestamp": "2025-10-11T00:00:00.000Z"
  }
}
```

---

## API 端點

### 1. 健康檢查

```http
GET /health
```

**回應**

```json
{
  "success": true,
  "message": "法規對應比對系統後端服務運行中",
  "timestamp": "2025-10-11T00:00:00.000Z"
}
```

---

### 2. 上傳法規修正對照表

```http
POST /api/upload/regulation
Content-Type: multipart/form-data
```

**參數**

| 欄位 | 類型 | 必填 | 說明 |
|------|------|------|------|
| file | File | ✅ | .docx 格式的法規修正對照表 |

**回應**

```json
{
  "success": true,
  "data": {
    "taskId": "1697000000000",
    "filename": "法規修正對照表.docx",
    "itemCount": 15,
    "uploadedAt": "2025-10-11T00:00:00.000Z"
  }
}
```

---

### 3. 自動載入內規文件

```http
POST /api/upload/policy/auto-load
```

**說明**

自動從 `data/internal_rules` 資料夾載入所有內規文件（.docx）並建立向量索引。

**回應**

```json
{
  "success": true,
  "data": {
    "total": 10,
    "succeeded": 10,
    "failed": 0,
    "results": [
      {
        "filename": "SO-02-002_資訊服務供應商委外風險管理作業程序_v3.7.docx",
        "success": true,
        "chunkCount": 45
      }
    ],
    "totalDocuments": 500
  }
}
```

---

### 4. 檢查內規資料夾

```http
GET /api/upload/policy/check
```

**說明**

檢查 `data/internal_rules` 資料夾的狀態和文件清單。

**回應**

```json
{
  "success": true,
  "data": {
    "exists": true,
    "path": "/path/to/data/internal_rules",
    "fileCount": 10,
    "files": [
      "SO-02-002_資訊服務供應商委外風險管理作業程序_v3.7.docx",
      "SO-02-002-F06_系統委外開發合約書範本_v2.6.docx"
    ]
  }
}
```

---

### 5. 執行比對

```http
POST /api/match
Content-Type: application/json
```

**參數**

| 欄位 | 類型 | 必填 | 說明 |
|------|------|------|------|
| taskId | string | ✅ | 上傳法規文件後取得的任務 ID |
| topK | number | ❌ | 回傳前 K 個相關片段（預設 5） |

**請求範例**

```json
{
  "taskId": "1697000000000",
  "topK": 5
}
```

**回應**

```json
{
  "success": true,
  "data": {
    "taskId": "1697000000000",
    "matchCount": 15,
    "results": [
      {
        "diffItem": {
          "sectionTitle": "第二條",
          "oldText": "...",
          "newText": "...",
          "explanation": "...",
          "diffType": "修正",
          "anchors": ["第二條"]
        },
        "policyContexts": [
          {
            "content": "內規相關內容...",
            "meta": {
              "doc_id": "SO-02-002",
              "doc_name": "內規文件.docx",
              "version": "3.7",
              "section_path": "第六章/第一節",
              "article_no": "第三條"
            },
            "distance": 0.123
          }
        ]
      }
    ]
  }
}
```

---

### 6. 取得比對結果

```http
GET /api/match/:taskId
```

**參數**

| 欄位 | 類型 | 必填 | 說明 |
|------|------|------|------|
| taskId | string | ✅ | 任務 ID（URL 參數） |

**回應**

與「執行比對」相同

---

### 7. 生成建議

```http
POST /api/suggest
Content-Type: application/json
```

**參數**

| 欄位 | 類型 | 必填 | 說明 |
|------|------|------|------|
| taskId | string | ✅ | 任務 ID |
| temperature | number | ❌ | AI 生成溫度（0.0-1.0，預設 0.3） |
| maxTokens | number | ❌ | 最大輸出 token 數（預設 2048） |

**請求範例**

```json
{
  "taskId": "1697000000000",
  "temperature": 0.3,
  "maxTokens": 2048
}
```

**回應**

```json
{
  "success": true,
  "data": {
    "taskId": "1697000000000",
    "suggestionCount": 15,
    "suggestions": [
      {
        "file": "SO-02-002_資訊服務供應商委外風險管理作業程序_v3.7.docx",
        "section": "第六章 第一節",
        "diff_summary": "新增雲端運算服務相關規範",
        "change_type": "修正",
        "suggestion_text": "建議修正文字...",
        "reason": "修改理由與依據...",
        "trace": {
          "regulation_anchor": "第二條",
          "policy_anchor": "第三條"
        }
      }
    ],
    "suggestions_by_document": [
      {
        "doc_name": "SO-02-002_資訊服務供應商委外風險管理作業程序_v3.7.docx",
        "doc_type": "主規章",
        "changes": [
          {
            "diff_summary": "新增雲端運算服務相關規範",
            "change_type": "修正",
            "section": "第六章 第一節",
            "suggestion_text": "建議修正文字...",
            "reason": "修改理由與依據...",
            "trace": {
              "regulation_anchor": "第二條",
              "policy_anchor": "第三條"
            }
          }
        ]
      }
    ]
  }
}
```

---

### 8. 取得建議結果

```http
GET /api/suggest/:taskId
```

**參數**

| 欄位 | 類型 | 必填 | 說明 |
|------|------|------|------|
| taskId | string | ✅ | 任務 ID（URL 參數） |

**回應**

與「生成建議」相同

---

### 9. 下載報告

```http
GET /api/download/:taskId?format=docx
```

**參數**

| 欄位 | 類型 | 必填 | 說明 |
|------|------|------|------|
| taskId | string | ✅ | 任務 ID（URL 參數） |
| format | string | ❌ | 格式（docx 或 json，預設 docx） |

**回應**

- `format=docx`: 回傳 Word 檔案（binary）
- `format=json`: 回傳 JSON 格式的建議資料

---

## 錯誤碼

| 狀態碼 | 說明 |
|--------|------|
| 200 | 成功 |
| 400 | 參數錯誤（ValidationError） |
| 401 | 未授權（UnauthorizedError） |
| 404 | 找不到資源（NotFoundError） |
| 500 | 伺服器內部錯誤（InternalError） |

---

## 使用流程範例

### 完整流程

```javascript
// 1. 上傳法規文件
const regulationRes = await fetch('/api/upload/regulation', {
  method: 'POST',
  body: formData, // 包含法規 docx
});
const { taskId } = regulationRes.data;

// 2. 自動載入內規文件（從 data/internal_rules 資料夾）
await fetch('/api/upload/policy/auto-load', {
  method: 'POST',
});

// 3. 執行比對
await fetch('/api/match', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ taskId, topK: 5 }),
});

// 4. 生成建議
const suggestRes = await fetch('/api/suggest', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ taskId }),
});
const { suggestions, suggestions_by_document } = suggestRes.data;

// 5. 下載報告（按文件分組）
window.location.href = `/api/download/${taskId}?format=docx`;
```

---

## 注意事項

1. **檔案大小限制**：預設 10MB，可在環境變數調整
2. **檔案格式**：僅支援 `.docx` 格式
3. **內規文件位置**：所有內規文件必須放在 `data/internal_rules` 資料夾
4. **taskId 有效期**：建議在上傳後 24 小時內完成流程
5. **併發限制**：建議單一 taskId 依序執行流程，避免併發
6. **建議格式**：API 同時返回 `suggestions`（按法規）和 `suggestions_by_document`（按文件）兩種格式

---

## 開發工具

### cURL 測試範例

```bash
# 健康檢查
curl http://localhost:3001/health

# 上傳法規文件
curl -X POST http://localhost:3001/api/upload/regulation \
  -F "file=@法規修正對照表.docx"

# 執行比對
curl -X POST http://localhost:3001/api/match \
  -H "Content-Type: application/json" \
  -d '{"taskId":"1697000000000","topK":5}'
```

### Postman Collection

可匯入 Postman 進行測試（待建立）

---

## 版本歷史

- **v1.0.0** (2025-10-11): 初始版本