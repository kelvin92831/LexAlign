import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

const HISTORY_DIR = path.join(__dirname, '../../../data/history');

async function ensureHistoryDir() {
  try {
    await fs.access(HISTORY_DIR);
  } catch {
    await fs.mkdir(HISTORY_DIR, { recursive: true });
  }
}

/**
 * POST /api/history/save
 */
router.post('/save', async (req, res, next) => {
  try {
    await ensureHistoryDir();

    const { taskId, fileName, suggestions, metadata } = req.body;

    const historyRecord = {
      id: taskId,
      fileName: fileName,
      timestamp: new Date().toISOString(),
      reviewStatus: 'unreviewed', // 新增審閱狀態
      metadata: {
        regulationItems: metadata?.regulationItems || 0,
        matchedDocuments: metadata?.matchedDocuments || 0,
        totalSuggestions: suggestions?.length || 0,
        processingTime: metadata?.processingTime || null,
        ...metadata
      },
      suggestions: suggestions,
      suggestions_by_document: metadata?.suggestions_by_document || []
    };

    const filePath = path.join(HISTORY_DIR, `${taskId}.json`);
    await fs.writeFile(filePath, JSON.stringify(historyRecord, null, 2));

    res.json({
      success: true,
      data: {
        id: taskId,
        savedAt: historyRecord.timestamp
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/history/list
 */
router.get('/list', async (req, res, next) => {
  try {
    await ensureHistoryDir();

    const { status } = req.query; // 支援狀態篩選

    const files = await fs.readdir(HISTORY_DIR);
    const jsonFiles = files.filter(f => f.endsWith('.json'));

    const historyList = [];

    for (const file of jsonFiles) {
      try {
        const filePath = path.join(HISTORY_DIR, file);
        const content = await fs.readFile(filePath, 'utf-8');
        const record = JSON.parse(content);

        // 篩選狀態
        if (status && record.reviewStatus !== status) {
          continue;
        }

        historyList.push({
          id: record.id,
          fileName: record.fileName,
          timestamp: record.timestamp,
          reviewStatus: record.reviewStatus || 'unreviewed',
          metadata: record.metadata
        });
      } catch (error) {
        console.error(`讀取歷史記錄失敗: ${file}`, error);
      }
    }

    historyList.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    res.json({
      success: true,
      data: {
        total: historyList.length,
        items: historyList
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/history/:id
 */
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const filePath = path.join(HISTORY_DIR, `${id}.json`);

    const content = await fs.readFile(filePath, 'utf-8');
    const record = JSON.parse(content);

    res.json({
      success: true,
      data: record
    });
  } catch (error) {
    if (error.code === 'ENOENT') {
      res.status(404).json({
        success: false,
        error: { message: '找不到該歷史記錄' }
      });
    } else {
      next(error);
    }
  }
});

/**
 * PATCH /api/history/:id/review
 * 更新審閱狀態
 */
router.patch('/:id/review', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reviewStatus } = req.body;

    if (!['unreviewed', 'reviewed'].includes(reviewStatus)) {
      return res.status(400).json({
        success: false,
        error: { message: '無效的審閱狀態' }
      });
    }

    const filePath = path.join(HISTORY_DIR, `${id}.json`);
    const content = await fs.readFile(filePath, 'utf-8');
    const record = JSON.parse(content);

    record.reviewStatus = reviewStatus;
    record.reviewedAt = reviewStatus === 'reviewed' ? new Date().toISOString() : null;

    await fs.writeFile(filePath, JSON.stringify(record, null, 2));

    res.json({
      success: true,
      data: {
        id,
        reviewStatus: record.reviewStatus,
        reviewedAt: record.reviewedAt
      }
    });
  } catch (error) {
    if (error.code === 'ENOENT') {
      res.status(404).json({
        success: false,
        error: { message: '找不到該歷史記錄' }
      });
    } else {
      next(error);
    }
  }
});

/**
 * DELETE /api/history/:id
 */
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const filePath = path.join(HISTORY_DIR, `${id}.json`);

    await fs.unlink(filePath);

    res.json({
      success: true,
      data: { message: '歷史記錄已刪除' }
    });
  } catch (error) {
    if (error.code === 'ENOENT') {
      res.status(404).json({
        success: false,
        error: { message: '找不到該歷史記錄' }
      });
    } else {
      next(error);
    }
  }
});

/**
 * DELETE /api/history/clear/all
 */
router.delete('/clear/all', async (req, res, next) => {
  try {
    await ensureHistoryDir();

    const files = await fs.readdir(HISTORY_DIR);
    const jsonFiles = files.filter(f => f.endsWith('.json'));

    for (const file of jsonFiles) {
      await fs.unlink(path.join(HISTORY_DIR, file));
    }

    res.json({
      success: true,
      data: { 
        message: '所有歷史記錄已清空',
        deletedCount: jsonFiles.length
      }
    });
  } catch (error) {
    next(error);
  }
});

export default router;
