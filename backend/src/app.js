import express from 'express';
import cors from 'cors';
import { config, validateConfig } from './config/index.js';
import { logger } from './utils/logger.js';
import { errorHandler } from './utils/errors.js';

// 路由
import uploadRoutes from './routes/upload.js';
import matchRoutes from './routes/match.js';
import suggestRoutes from './routes/suggest.js';
import downloadRoutes from './routes/download.js';
import historyRoutes from './routes/history.js';

// 初始化 Express
const app = express();

// 中間件
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 請求日誌
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });
  next();
});

// 健康檢查
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: '法規對應比對系統後端服務運行中',
    timestamp: new Date().toISOString(),
  });
});

// API 路由
app.use('/api/upload', uploadRoutes);
app.use('/api/match', matchRoutes);
app.use('/api/suggest', suggestRoutes);
app.use('/api/download', downloadRoutes);
app.use('/api/history', historyRoutes);

// 404 處理
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      message: '找不到該 API 端點',
      path: req.path,
    },
  });
});

// 錯誤處理
app.use(errorHandler);

// 啟動伺服器
const PORT = config.port;

app.listen(PORT, () => {
  logger.info(`🚀 伺服器啟動成功`);
  logger.info(`📍 Port: ${PORT}`);
  logger.info(`🌍 Environment: ${config.nodeEnv}`);
  
  // 驗證設定
  const configValid = validateConfig();
  if (!configValid) {
    logger.warn('⚠️  部分環境變數未設定，某些功能可能無法使用');
  }

  logger.info('✅ 系統就緒');
});

export default app;

