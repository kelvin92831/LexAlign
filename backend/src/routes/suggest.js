import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import mammoth from 'mammoth';
import { fileURLToPath } from 'url';
import { config } from '../config/index.js';
import { geminiService } from '../services/llm/gemini-service.js';
import { logger } from '../utils/logger.js';
import { ValidationError } from '../utils/errors.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

/**
 * POST /api/suggest
 * 生成修改建議
 */
router.post('/', async (req, res, next) => {
  try {
    const { taskId, temperature, maxTokens } = req.body;

    if (!taskId) {
      throw new ValidationError('缺少 taskId 參數');
    }

    logger.info('開始生成修改建議', { taskId });

    // 讀取比對結果
    const matchPath = path.join(
      config.upload.uploadPath,
      `match_${taskId}.json`
    );

    let matchData;
    try {
      const content = await fs.readFile(matchPath, 'utf-8');
      matchData = JSON.parse(content);
    } catch (error) {
      throw new ValidationError('找不到比對結果，請先執行比對');
    }

    // 設定 AI 參數（如果有提供）
    if (temperature !== undefined) {
      config.ai.temperature = parseFloat(temperature);
    }
    if (maxTokens !== undefined) {
      config.ai.maxOutputTokens = parseInt(maxTokens);
    }

    // 生成建議
    const suggestions = [];

    for (const match of matchData) {
      try {
        logger.info(`生成建議: ${match.diffItem.sectionTitle}`);

        // === 新增：準備完整文件上下文 ===
        const enhancedContexts = await prepareFullDocumentContexts(match.policyContexts);
        
        const suggestion = await geminiService.generateSuggestion(
          match.diffItem,
          enhancedContexts
        );

        suggestions.push(suggestion);
      } catch (error) {
        logger.error(`生成建議失敗: ${match.diffItem.sectionTitle}`, {
          error: error.message,
        });

        // 加入錯誤記錄
        suggestions.push({
          file: '生成失敗',
          section: match.diffItem.sectionTitle,
          diff_summary: match.diffItem.sectionTitle,
          change_type: match.diffItem.diffType,
          suggestion_text: '（建議生成失敗，請人工處理）',
          reason: error.message,
          trace: {
            regulation_anchor: match.diffItem.sectionTitle,
            policy_anchor: '',
          },
        });
      }
    }

    // === 新增：按文件分組建議 ===
    const suggestionsByDocument = groupSuggestionsByDocument(suggestions);

    // 儲存建議結果（包含兩種格式）
    const suggestPath = path.join(
      config.upload.uploadPath,
      `suggestions_${taskId}.json`
    );
    await fs.writeFile(
      suggestPath,
      JSON.stringify({ 
        suggestions,  // 原始格式（按法規條文）
        suggestions_by_document: suggestionsByDocument,  // 新格式（按內規文件）
      }, null, 2)
    );

    logger.info('建議生成完成', { 
      count: suggestions.length,
      documentCount: suggestionsByDocument.length,
    });

    res.json({
      success: true,
      data: {
        taskId,
        suggestionCount: suggestions.length,
        suggestions,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/suggest/:taskId
 * 取得建議結果
 */
router.get('/:taskId', async (req, res, next) => {
  try {
    const { taskId } = req.params;

    const suggestPath = path.join(
      config.upload.uploadPath,
      `suggestions_${taskId}.json`
    );

    let suggestData;
    try {
      const content = await fs.readFile(suggestPath, 'utf-8');
      suggestData = JSON.parse(content);
    } catch (error) {
      throw new ValidationError('找不到建議結果');
    }

    res.json({
      success: true,
      data: {
        taskId,
        ...suggestData,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * 按文件分組建議
 * @param {Array} suggestions - 建議列表
 * @returns {Array} 按文件分組的建議
 */
function groupSuggestionsByDocument(suggestions) {
  const grouped = {};
  
  suggestions.forEach(suggestion => {
    const docName = suggestion.file;
    
    if (!grouped[docName]) {
      grouped[docName] = {
        document: docName,
        document_type: docName.includes('-F') ? '附件範本' : '主規章',
        total_changes: 0,
        changes: [],
      };
    }
    
    grouped[docName].changes.push({
      regulation_source: suggestion.trace.regulation_anchor,
      target_section: suggestion.section,
      change_type: suggestion.change_type,
      diff_summary: suggestion.diff_summary,
      suggestion_text: suggestion.suggestion_text,
      reason: suggestion.reason,
      trace: suggestion.trace,
    });
    
    grouped[docName].total_changes++;
  });
  
  // 轉換為陣列並排序（按修改數量降序）
  return Object.values(grouped).sort((a, b) => b.total_changes - a.total_changes);
}

/**
 * 準備完整文件上下文（方案A：送完整文件）
 * @param {Array} policyContexts - RAG 檢索到的片段
 * @returns {Promise<Array>} 增強的上下文（包含完整文件）
 */
async function prepareFullDocumentContexts(policyContexts) {
  const contexts = [];
  const rulesDir = path.join(__dirname, '../../../data/internal_rules');
  const processedDocs = new Set();
  
  logger.info('準備完整文件上下文...');
  
  // 1. 識別所有不同的來源文件
  const docGroups = {};
  policyContexts.forEach(ctx => {
    const docName = ctx.meta.doc_name;
    if (!docGroups[docName]) {
      docGroups[docName] = {
        name: docName,
        isMain: !docName.includes('-F'),  // 主規章判斷
        snippets: [],
        bestDistance: ctx.distance,
      };
    }
    docGroups[docName].snippets.push(ctx);
    // 記錄最佳相似度
    docGroups[docName].bestDistance = Math.min(
      docGroups[docName].bestDistance,
      ctx.distance
    );
  });
  
  // 2. 排序：主規章優先，然後按相似度
  const sortedDocs = Object.values(docGroups).sort((a, b) => {
    // 主規章優先
    if (a.isMain && !b.isMain) return -1;
    if (!a.isMain && b.isMain) return 1;
    // 相似度排序
    return a.bestDistance - b.bestDistance;
  });
  
  logger.info(`找到 ${sortedDocs.length} 個不同文件，準備讀取完整內容`);
  
  // 3. 讀取每個文件的完整內容
  for (const doc of sortedDocs) {
    if (processedDocs.has(doc.name)) continue;
    
    const filePath = path.join(rulesDir, doc.name);
    
    try {
      logger.info(`讀取完整文件: ${doc.name} (${doc.isMain ? '主規章' : '附件範本'})`);
      
      // 讀取完整文件
      const result = await mammoth.extractRawText({ path: filePath });
      const fullContent = result.value;
      
      // 提取相關章節（從片段的 metadata）
      const relevantSections = doc.snippets
        .map(s => s.meta.section_path)
        .filter(Boolean)
        .filter((v, i, a) => a.indexOf(v) === i);  // 去重
      
      contexts.push({
        type: 'full_document',
        doc_name: doc.name,
        is_primary: doc.isMain,
        content: fullContent,
        relevant_sections: relevantSections,
        distance: doc.bestDistance,
        snippet_count: doc.snippets.length,
      });
      
      logger.info(`✅ 完整文件載入: ${doc.name}, 長度: ${fullContent.length} 字`);
      
      processedDocs.add(doc.name);
      
    } catch (error) {
      logger.warn(`無法讀取完整文件 ${doc.name}: ${error.message}`);
      
      // 降級方案：使用原始片段
      doc.snippets.forEach((snippet, idx) => {
        if (idx === 0) {  // 只取最相關的片段
          contexts.push({
            type: 'snippet',
            doc_name: doc.name,
            section: snippet.meta.section_path,
            content: snippet.content,
            distance: snippet.distance,
          });
        }
      });
    }
  }
  
  logger.info(`完整文件上下文準備完成: ${contexts.length} 個文件`);
  
  return contexts;
}

export default router;

