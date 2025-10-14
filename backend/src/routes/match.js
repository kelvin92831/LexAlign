import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import { config } from '../config/index.js';
import { chromaService } from '../services/rag/chroma-service.js';
import { logger } from '../utils/logger.js';
import { ValidationError } from '../utils/errors.js';

const router = express.Router();

/**
 * POST /api/match
 * 比對法規修正與內規文件
 */
router.post('/', async (req, res, next) => {
  try {
    const { taskId, topK } = req.body;

    if (!taskId) {
      throw new ValidationError('缺少 taskId 參數');
    }

    logger.info('開始比對法規與內規', { taskId, topK });

    // 讀取法規解析結果
    const resultPath = path.join(
      config.upload.uploadPath,
      `regulation_${taskId}.json`
    );

    let regulationData;
    try {
      const content = await fs.readFile(resultPath, 'utf-8');
      regulationData = JSON.parse(content);
    } catch (error) {
      throw new ValidationError('找不到法規解析結果，請先上傳法規文件');
    }

    const { items } = regulationData;
    const matchResults = [];

    // 逐條比對
    for (const item of items) {
      logger.info(`比對條文: ${item.sectionTitle}`);

      // 建構查詢文字（使用修正後條文 + 說明）
      const query = [
        item.sectionTitle,
        item.newText || item.oldText || '',
        item.explanation || '',
      ]
        .filter(Boolean)
        .join('\n');

      // 搜尋相關內規
      const contexts = await chromaService.search(query, topK);

      matchResults.push({
        diffItem: item,
        policyContexts: contexts.map(ctx => ({
          content: ctx.content,
          meta: ctx.metadata,
          distance: ctx.distance,
        })),
      });
    }

    // 儲存比對結果
    const matchPath = path.join(
      config.upload.uploadPath,
      `match_${taskId}.json`
    );
    await fs.writeFile(matchPath, JSON.stringify(matchResults, null, 2));

    logger.info('比對完成', { itemCount: matchResults.length });

    res.json({
      success: true,
      data: {
        taskId,
        matchCount: matchResults.length,
        results: matchResults,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/match/:taskId
 * 取得比對結果
 */
router.get('/:taskId', async (req, res, next) => {
  try {
    const { taskId } = req.params;

    const matchPath = path.join(
      config.upload.uploadPath,
      `match_${taskId}.json`
    );

    let matchData;
    try {
      const content = await fs.readFile(matchPath, 'utf-8');
      matchData = JSON.parse(content);
    } catch (error) {
      throw new ValidationError('找不到比對結果');
    }

    res.json({
      success: true,
      data: {
        taskId,
        matchCount: matchData.length,
        results: matchData,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;

