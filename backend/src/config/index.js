import dotenv from 'dotenv';

dotenv.config();

export const config = {
  // 伺服器設定
  port: process.env.PORT || 3001,
  nodeEnv: process.env.NODE_ENV || 'development',

  // Google Gemini API
  googleApiKey: process.env.GOOGLE_API_KEY,
  geminiModel: process.env.GEMINI_MODEL || 'models/gemini-2.5-pro-latest',

  // Firebase Admin SDK
  firebase: {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  },

  // RAG 設定
  rag: {
    dbType: process.env.RAG_DB_TYPE || 'chroma',
    chromaHost: process.env.CHROMA_HOST || 'http://localhost:8000',
    chunkSize: parseInt(process.env.CHUNK_SIZE) || 700,
    chunkOverlap: parseInt(process.env.CHUNK_OVERLAP) || 200,
    topK: parseInt(process.env.TOP_K) || 5,
  },

  // 檔案上傳設定
  upload: {
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024,
    uploadPath: process.env.UPLOAD_PATH || './tmp/uploads',
  },

  // AI 生成設定
  ai: {
    temperature: parseFloat(process.env.TEMPERATURE) || 0.3,
    maxOutputTokens: parseInt(process.env.MAX_OUTPUT_TOKENS) || 2048,
  },
};

// 驗證必要的環境變數
export function validateConfig() {
  const required = [
    'googleApiKey',
  ];

  const missing = required.filter(key => !config[key] && !config.firebase[key]);

  if (missing.length > 0) {
    console.warn(`警告：缺少以下環境變數：${missing.join(', ')}`);
    console.warn('請參考 src/config/keys.example.ts 設定 .env 檔案');
  }

  return missing.length === 0;
}

