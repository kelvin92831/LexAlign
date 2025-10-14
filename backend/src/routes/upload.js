import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { config } from '../config/index.js';
import { regulationParser } from '../services/doc-parser/regulation-parser.js';
import { policyParser } from '../services/doc-parser/policy-parser.js';
import { chromaService } from '../services/rag/chroma-service.js';
import { logger } from '../utils/logger.js';
import { validateDocxFile, validateFileSize } from '../utils/validators.js';
import { ValidationError } from '../utils/errors.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// 設定 multer
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = config.upload.uploadPath;
    await fs.mkdir(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    // 處理中文檔名編碼
    const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
    cb(null, uniqueSuffix + '-' + originalName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: config.upload.maxFileSize },
  fileFilter: (req, file, cb) => {
    try {
      validateDocxFile(file);
      cb(null, true);
    } catch (error) {
      cb(error, false);
    }
  },
});

/**
 * POST /api/upload/regulation
 * 上傳法規修正對照表
 */
router.post('/regulation', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: { message: '未上傳檔案' },
      });
    }

    // 處理檔名編碼
    const filename = Buffer.from(req.file.originalname, 'latin1').toString('utf8');

    logger.info('收到法規文件上傳請求', {
      filename: filename,
      size: req.file.size,
    });

    // 解析文件
    const result = await regulationParser.parse(
      req.file.path,
      filename
    );

    // 儲存解析結果（暫存在記憶體或檔案系統）
    const taskId = Date.now().toString();
    const resultPath = path.join(
      config.upload.uploadPath,
      `regulation_${taskId}.json`
    );
    await fs.writeFile(resultPath, JSON.stringify(result, null, 2));

    // 清理上傳的檔案
    await fs.unlink(req.file.path);

    res.json({
      success: true,
      data: {
        taskId,
        filename: result.filename,
        itemCount: result.items.length,
        uploadedAt: result.uploadedAt,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/upload/policy
 * 上傳內規文件
 */
router.post('/policy', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: { message: '未上傳檔案' },
      });
    }

    // 處理檔名編碼
    const filename = Buffer.from(req.file.originalname, 'latin1').toString('utf8');

    logger.info('收到內規文件上傳請求', {
      filename: filename,
      size: req.file.size,
    });

    // 解析文件
    const chunks = await policyParser.parse(
      req.file.path,
      filename
    );

    // 新增到向量資料庫
    await chromaService.addDocuments(chunks);

    // 清理上傳的檔案
    await fs.unlink(req.file.path);

    // 取得資料庫統計
    const stats = await chromaService.getStats();

    res.json({
      success: true,
      data: {
        filename: req.file.originalname,
        chunkCount: chunks.length,
        totalDocuments: stats.documentCount,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/upload/policy/batch
 * 批次上傳內規文件
 */
router.post('/policy/batch', upload.array('files', 50), async (req, res, next) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        error: { message: '未上傳檔案' },
      });
    }

    logger.info(`收到批次上傳請求，共 ${req.files.length} 個檔案`);

    const results = [];

    for (const file of req.files) {
      try {
        // 處理檔名編碼
        const filename = Buffer.from(file.originalname, 'latin1').toString('utf8');
        
        logger.info(`處理檔案: ${filename}`);
        
        // 解析文件
        const chunks = await policyParser.parse(file.path, filename);

        // 新增到向量資料庫
        await chromaService.addDocuments(chunks);

        results.push({
          filename: filename,
          success: true,
          chunkCount: chunks.length,
        });

        logger.info(`✅ 檔案處理成功: ${filename} (${chunks.length} 個片段)`);

        // 清理上傳的檔案
        await fs.unlink(file.path);
      } catch (error) {
        const filename = Buffer.from(file.originalname, 'latin1').toString('utf8');
        logger.error(`❌ 處理檔案失敗: ${filename}`, {
          error: error.message,
          stack: error.stack,
        });
        results.push({
          filename: filename,
          success: false,
          error: error.message,
        });
        
        // 即使失敗也清理檔案
        try {
          await fs.unlink(file.path);
        } catch (e) {
          // 忽略清理錯誤
        }
      }
    }

    // 取得資料庫統計
    const stats = await chromaService.getStats();

    res.json({
      success: true,
      data: {
        total: req.files.length,
        succeeded: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        results,
        totalDocuments: stats.documentCount,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/upload/policy/auto-load
 * 自動載入 data/internal_rules 資料夾的所有內規文件
 */
router.post('/policy/auto-load', async (req, res, next) => {
  try {
    logger.info('開始自動載入內規文件...');

    // 內規文件資料夾路徑（從專案根目錄）
    const rulesDir = path.join(__dirname, '../../../data/internal_rules');
    
    logger.info(`內規資料夾路徑: ${rulesDir}`);
    
    // 檢查資料夾是否存在
    try {
      await fs.access(rulesDir);
    } catch (error) {
      throw new ValidationError('找不到內規文件資料夾：' + rulesDir);
    }

    // 讀取資料夾內所有 .docx 檔案
    const files = await fs.readdir(rulesDir);
    const docxFiles = files.filter(file => 
      file.endsWith('.docx') || file.endsWith('.doc')
    );

    if (docxFiles.length === 0) {
      throw new ValidationError('資料夾內沒有找到任何文件');
    }

    logger.info(`找到 ${docxFiles.length} 個內規文件`);

    const results = [];

    // 逐個處理文件
    for (const filename of docxFiles) {
      try {
        const filePath = path.join(rulesDir, filename);
        
        logger.info(`處理檔案: ${filename}`);
        
        // 解析文件
        const chunks = await policyParser.parse(filePath, filename);

        // 新增到向量資料庫
        await chromaService.addDocuments(chunks);

        results.push({
          filename: filename,
          success: true,
          chunkCount: chunks.length,
        });

        logger.info(`✅ 檔案處理成功: ${filename} (${chunks.length} 個片段)`);

      } catch (error) {
        logger.error(`❌ 處理檔案失敗: ${filename}`, {
          error: error.message,
          stack: error.stack,
        });
        results.push({
          filename: filename,
          success: false,
          error: error.message,
        });
      }
    }

    // 取得資料庫統計
    const stats = await chromaService.getStats();

    res.json({
      success: true,
      data: {
        total: docxFiles.length,
        succeeded: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        results,
        totalDocuments: stats.documentCount,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/upload/policy/check
 * 檢查內規資料夾狀態
 */
router.get('/policy/check', async (req, res, next) => {
  try {
    const rulesDir = path.join(__dirname, '../../../data/internal_rules');
    
    // 檢查資料夾是否存在
    let exists = false;
    try {
      await fs.access(rulesDir);
      exists = true;
    } catch (error) {
      // 資料夾不存在
    }

    if (!exists) {
      return res.json({
        success: true,
        data: {
          exists: false,
          path: rulesDir,
          fileCount: 0,
          files: [],
        },
      });
    }

    // 讀取檔案列表
    const files = await fs.readdir(rulesDir);
    const docxFiles = files.filter(file => 
      file.endsWith('.docx') || file.endsWith('.doc')
    );

    // 取得向量資料庫統計
    const stats = await chromaService.getStats();

    res.json({
      success: true,
      data: {
        exists: true,
        path: rulesDir,
        fileCount: docxFiles.length,
        files: docxFiles,
        vectorDbDocuments: stats.documentCount,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;

