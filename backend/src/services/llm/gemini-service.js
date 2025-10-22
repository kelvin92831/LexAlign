import { GoogleGenerativeAI } from '@google/generative-ai';
import { logger } from '../../utils/logger.js';
import { config } from '../../config/index.js';
import { InternalError } from '../../utils/errors.js';

/**
 * Gemini LLM 服務
 */
export class GeminiService {
  constructor() {
    this.genAI = null;
    this.model = null;
  }

  /**
   * 初始化 Gemini 客戶端
   */
  initialize() {
    try {
      if (!config.googleApiKey) {
        throw new Error('缺少 GOOGLE_API_KEY 環境變數');
      }

      logger.info('初始化 Gemini 服務...');

      this.genAI = new GoogleGenerativeAI(config.googleApiKey);
      this.model = this.genAI.getGenerativeModel({
        model: 'gemini-2.5-pro',  // 使用正確的模型名稱
      });

      logger.info('Gemini 服務初始化完成');
    } catch (error) {
      logger.error('Gemini 初始化失敗', { error: error.message });
      throw new InternalError('AI 服務初始化失敗');
    }
  }

  /**
   * 生成修改建議
   * @param {RegulationDiffItem} diffItem - 法規修正項目
   * @param {Array} policyContexts - 相關內規片段
   * @returns {Promise<SuggestionItem>}
   */
  async generateSuggestion(diffItem, policyContexts) {
    try {
      if (!this.model) {
        this.initialize();
      }

      logger.info(`生成建議：${diffItem.sectionTitle}`);

      // 建構 prompt
      const prompt = this.buildPrompt(diffItem, policyContexts);

      // 呼叫 Gemini API
      const result = await this.model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: config.ai.temperature,
          maxOutputTokens: 8192,  // 增加輸出限制（完整文件模式需要更多）
        },
      });

      const response = result.response;
      const text = response.text();

      // 解析回應
      const suggestion = this.parseResponse(text, diffItem, policyContexts);

      logger.info('建議生成完成');

      return suggestion;
    } catch (error) {
      logger.error('生成建議失敗', { error: error.message });
      throw new InternalError('AI 建議生成失敗');
    }
  }

  /**
   * 批次生成建議
   * @param {Array<{diffItem, policyContexts}>} items
   */
  async generateBatchSuggestions(items) {
    const suggestions = [];

    for (const item of items) {
      try {
        const suggestion = await this.generateSuggestion(
          item.diffItem,
          item.policyContexts
        );
        suggestions.push(suggestion);
      } catch (error) {
        logger.error('批次生成建議失敗', {
          item: item.diffItem.sectionTitle,
          error: error.message,
        });
        // 繼續處理其他項目
      }
    }

    return suggestions;
  }

  /**
   * 建構 prompt（支援完整文件）
   * @private
   */
  buildPrompt(diffItem, enhancedContexts) {
    // 構造上下文文字
    const contextText = enhancedContexts
      .map((ctx, i) => {
        if (ctx.type === 'full_document') {
          // 完整文件格式
          return `【完整內規文件 ${i + 1}】${i === 0 ? '🎯 修改目標文件' : '📖 參考文件'}
文件：${ctx.doc_name}
文件類型：${ctx.is_primary ? '主規章' : '附件範本'}
相似度分數：${ctx.distance?.toFixed(3) || 'N/A'}（距離越小越相關）
文件長度：${ctx.content?.length || 0} 字
最相關章節：${ctx.relevant_sections?.join('、') || '(整份文件)'}
檢索到片段數：${ctx.snippet_count || 0} 個
${i === 0 ? '\n⚠️ 請為此文件生成修改建議' : ''}

📄 完整文件內容：
${ctx.content}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;
        } else {
          // 片段格式（備用）
          return `【補充參考片段 ${i + 1}】
文件：${ctx.doc_name}
章節：${ctx.section || ''}
相似度分數：${ctx.distance?.toFixed(3) || 'N/A'}

內容：
${ctx.content}

---
`;
        }
      })
      .join('\n');

    const targetDoc = enhancedContexts[0];  // 第一個文件是目標文件
    const hasReference = enhancedContexts.length > 1;

    return `你是一位專業的法規遵循顧問，協助公司依據最新法規修訂內部規章。

# 任務
請根據以下法規修正內容，分析對應的公司內規文件，並提供修改建議。

⚠️ **重要**: 你的任務是為【${targetDoc.doc_name}】這份文件生成修改建議。
${hasReference ? '其他文件僅供參考，不需要為它們生成建議。' : ''}

# 法規修正資訊
條文標題：${diffItem.sectionTitle}
修正類型：${diffItem.diffType}

${diffItem.newText ? `修正後條文：\n${diffItem.newText}\n` : ''}
${diffItem.oldText ? `修正前條文：\n${diffItem.oldText}\n` : ''}
${diffItem.explanation ? `說明：\n${diffItem.explanation}\n` : ''}

# 相關內規文件
${contextText}

# 分析指引
1. **你的建議目標是「完整內規文件 1」：${targetDoc.doc_name}**
2. 仔細閱讀目標文件的「最相關章節」標記的部分，但也要縱觀整份文件
3. ${hasReference ? '如有其他文件，僅作為參考理解，不要為它們生成建議' : ''}
4. 請在目標文件中定位需要修改的具體位置（章、節、條、款、項）
5. 建議修改應基於目標文件中的實際條文內容
6. 如果目標文件已符合法規要求，可建議「無需修改」並說明理由

# 輸出要求
請以 JSON 格式回應，包含以下欄位：

{
  "file": "${targetDoc.doc_name}",
  "section": "需要修改的具體章節或條號（字符串，例如：第二章第三條第一款）",
  "diff_summary": "法規修正重點摘要（字符串，50字內）",
  "change_type": "${diffItem.diffType}",
  "suggestion_text": "建議的修正文句或段落（字符串，請直接引用文件中的現有條文，並提出具體修改）",
  "reason": "修改理由與依據（字符串，說明法規修訂與現行內規的落差，明確指出需要在哪個位置修改什麼內容）"
}

⚠️ 重要格式要求：
1. **所有字段值必须是字符串类型**，不要使用嵌套对象或数组
2. 如需表达修改前后，请在 suggestion_text 中用文字描述，例如：
   "建議將「資訊系統」修改為「資通系統」"
   或
   "修改前：...（現行條文）\n修改後：...（建議條文）"
3. 不要返回 {"修改前": "...", "修改後": "..."} 这样的对象格式
4. 建議修正文應該是可直接使用的具體文字，基於完整文件的實際內容
5. 明確指出修改位置（例如：在第二章「名詞定義」新增第X條）
6. 理由中應引用完整文件的現行條文，說明與法規的差異
7. 如果完整文件中已有符合法規的條文，可建議「無需修改」並說明理由
8. 回應必須是有效的 JSON 格式，不要包含其他文字

請開始分析並提供建議：`;
  }

  /**
   * 解析 Gemini 回應（增強版）
   * @private
   */
  parseResponse(text, diffItem, enhancedContexts) {
    try {
      // 記錄原始回應的前 500 字以供調試
      logger.debug('Gemini 原始回應預覽', { 
        preview: text.substring(0, 500),
        length: text.length 
      });

      let jsonText = text;
      
      // 1. 移除 markdown code block 標記
      jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      
      // 2. 尋找第一個 { 和最後一個 } （更寬容的提取）
      const firstBrace = jsonText.indexOf('{');
      const lastBrace = jsonText.lastIndexOf('}');
      
      if (firstBrace >= 0 && lastBrace > firstBrace) {
        jsonText = jsonText.substring(firstBrace, lastBrace + 1);
      }
      
      // 3. 嘗試解析 JSON
      const parsed = JSON.parse(jsonText.trim());

      // 從增強上下文中提取預設值
      const defaultDoc = enhancedContexts[0]?.doc_name || '';
      const defaultSection = enhancedContexts[0]?.relevant_sections?.[0] || 
                             enhancedContexts[0]?.section || '';

      logger.info('✅ JSON 解析成功', {
        file: parsed.file,
        section: parsed.section?.substring(0, 30),
      });

      // === 辅助函数：确保字段是字符串 ===
      const ensureString = (value, fallback = '') => {
        if (typeof value === 'string') {
          return value;
        }
        if (typeof value === 'object' && value !== null) {
          // 如果是对象，尝试转换为字符串格式
          if (value.修改前 && value.修改後) {
            return `修改前：${value.修改前}\n\n修改後：${value.修改後}`;
          }
          // 其他对象格式，转为 JSON 字符串
          return JSON.stringify(value, null, 2);
        }
        return String(value || fallback);
      };

      // 確保必要欄位存在且为字符串
      return {
        file: ensureString(parsed.file, defaultDoc),
        section: ensureString(parsed.section, defaultSection),
        diff_summary: ensureString(parsed.diff_summary, diffItem.sectionTitle),
        change_type: ensureString(parsed.change_type, diffItem.diffType),
        suggestion_text: ensureString(parsed.suggestion_text, ''),
        reason: ensureString(parsed.reason, ''),
        trace: {
          regulation_anchor: diffItem.sectionTitle,
          policy_anchor: ensureString(parsed.section, ''),
        },
      };
    } catch (error) {
      logger.warn('JSON 解析失敗，嘗試正則表達式提取', {
        error: error.message,
        responsePreview: text.substring(0, 200),
      });

      // === 備用方案：使用正則表達式提取關鍵欄位 ===
      try {
        const extracted = this.extractFieldsWithRegex(text);
        
        if (extracted.file || extracted.section || extracted.suggestion_text) {
          logger.info('✅ 使用正則表達式成功提取欄位');
          
          const defaultDoc = enhancedContexts[0]?.doc_name || '未指定';
          const defaultSection = enhancedContexts[0]?.relevant_sections?.[0] || 
                                 enhancedContexts[0]?.section || '未指定';
          
          // 辅助函数：确保字段是字符串
          const ensureString = (value, fallback = '') => {
            if (typeof value === 'string') return value;
            if (typeof value === 'object' && value !== null) {
              if (value.修改前 && value.修改後) {
                return `修改前：${value.修改前}\n\n修改後：${value.修改後}`;
              }
              return JSON.stringify(value, null, 2);
            }
            return String(value || fallback);
          };
          
          return {
            file: ensureString(extracted.file, defaultDoc),
            section: ensureString(extracted.section, defaultSection),
            diff_summary: ensureString(extracted.diff_summary, diffItem.sectionTitle),
            change_type: ensureString(extracted.change_type, diffItem.diffType),
            suggestion_text: ensureString(extracted.suggestion_text, ''),
            reason: ensureString(extracted.reason, ''),
            trace: {
              regulation_anchor: diffItem.sectionTitle,
              policy_anchor: ensureString(extracted.section, ''),
            },
          };
        }
      } catch (regexError) {
        logger.error('正則表達式提取也失敗', { error: regexError.message });
      }

      // === 完全失敗：記錄原始回應並回傳基本結構 ===
      const defaultDoc = enhancedContexts[0]?.doc_name || '未指定';
      const defaultSection = enhancedContexts[0]?.relevant_sections?.[0] || 
                             enhancedContexts[0]?.section || '未指定';

      // 記錄完整的原始回應以供調試
      logger.error('無法解析 Gemini 回應', { 
        rawResponse: text,
        diffItem: diffItem.sectionTitle.substring(0, 50),
      });

      return {
        file: defaultDoc,
        section: defaultSection,
        diff_summary: diffItem.sectionTitle,
        change_type: diffItem.diffType,
        suggestion_text: text.substring(0, 500),
        reason: '（AI 回應格式異常，請查看日誌）',
        trace: {
          regulation_anchor: diffItem.sectionTitle,
          policy_anchor: '',
        },
      };
    }
  }

  /**
   * 使用正則表達式提取欄位（備用方案）
   * @private
   */
  extractFieldsWithRegex(text) {
    const extracted = {};
    
    // 提取各個欄位（支援中文引號）
    const patterns = {
      file: /"file":\s*["']([^"']+)["']/,
      section: /"section":\s*["']([^"']+)["']/,
      diff_summary: /"diff_summary":\s*["']([^"']+)["']/,
      change_type: /"change_type":\s*["']([^"']+)["']/,
      suggestion_text: /"suggestion_text":\s*["']([^"']+)["']/,
      reason: /"reason":\s*["']([^"']+)["']/,
    };
    
    Object.entries(patterns).forEach(([key, pattern]) => {
      const match = text.match(pattern);
      if (match) {
        extracted[key] = match[1];
      }
    });
    
    // 處理可能包含換行的長文本欄位
    const multilinePatterns = {
      suggestion_text: /"suggestion_text":\s*"([\s\S]*?)"/,
      reason: /"reason":\s*"([\s\S]*?)"/,
    };
    
    Object.entries(multilinePatterns).forEach(([key, pattern]) => {
      if (!extracted[key]) {
        const match = text.match(pattern);
        if (match) {
          // 清理轉義字元
          extracted[key] = match[1]
            .replace(/\\n/g, '\n')
            .replace(/\\"/g, '"')
            .replace(/\\\\/g, '\\');
        }
      }
    });
    
    return extracted;
  }
}

export const geminiService = new GeminiService();

