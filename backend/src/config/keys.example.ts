/**
 * 環境變數範本
 * 使用方式：
 * 1. 複製此檔案為 .env（放在 backend/ 根目錄）
 * 2. 填入實際金鑰與設定
 * 3. 切勿將實際 .env 提交至版控
 */

export const CONFIG_TEMPLATE = {
  // 伺服器設定
  PORT: 3001,
  NODE_ENV: 'development',

  // Google Gemini API
  GOOGLE_API_KEY: 'YOUR_GOOGLE_API_KEY_HERE',
  GEMINI_MODEL: 'models/gemini-2.5-pro-latest',

  // Firebase Admin SDK
  FIREBASE_PROJECT_ID: 'YOUR_PROJECT_ID',
  FIREBASE_CLIENT_EMAIL: 'YOUR_CLIENT_EMAIL',
  FIREBASE_PRIVATE_KEY: 'YOUR_PRIVATE_KEY',
  FIREBASE_STORAGE_BUCKET: 'YOUR_BUCKET_NAME',

  // RAG 設定
  RAG_DB_TYPE: 'chroma', // 'chroma' or 'faiss'
  CHROMA_HOST: 'http://localhost:8000', // ChromaDB 服務器位址
  CHUNK_SIZE: 700,
  CHUNK_OVERLAP: 200,
  TOP_K: 5,
  
  // 優先文件設定
  PRIORITY_DOC_ID: 'SO-02-002', // 優先文件 ID
  PRIORITY_WEIGHT: 0.85, // 權重係數（越小優先級越高）
  
  // 作弊模式設定
  CHEAT_MODE: false, // 設定為 true 時，只檢索 PRIORITY_DOC_ID 相關文檔

  // 檔案上傳設定
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  UPLOAD_PATH: './tmp/uploads',

  // AI 生成設定
  TEMPERATURE: 0.3,
  MAX_OUTPUT_TOKENS: 2048,
};

/**
 * .env 檔案格式範例：
 * 
 * PORT=3001
 * NODE_ENV=development
 * 
 * GOOGLE_API_KEY=your_actual_key
 * GEMINI_MODEL=models/gemini-2.5-pro-latest
 * 
 * FIREBASE_PROJECT_ID=your_project
 * FIREBASE_CLIENT_EMAIL=your_email
 * FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."
 * FIREBASE_STORAGE_BUCKET=your_bucket
 * 
 * RAG_DB_TYPE=chroma
 * CHROMA_HOST=http://localhost:8000
 * CHUNK_SIZE=700
 * CHUNK_OVERLAP=200
 * TOP_K=5
 * 
 * # 優先文件設定
 * PRIORITY_DOC_ID=SO-02-002
 * PRIORITY_WEIGHT=0.85
 * 
 * # 作弊模式設定
 * CHEAT_MODE=false
 * 
 * MAX_FILE_SIZE=10485760
 * UPLOAD_PATH=./tmp/uploads
 * 
 * TEMPERATURE=0.3
 * MAX_OUTPUT_TOKENS=2048
 */

