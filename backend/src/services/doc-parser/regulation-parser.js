import mammoth from 'mammoth';
import * as cheerio from 'cheerio';
import { logger } from '../../utils/logger.js';
import { ValidationError } from '../../utils/errors.js';
import { DiffTypes } from './types.js';

/**
 * 解析法規修正對照表（docx）
 */
export class RegulationParser {
  /**
   * 解析 docx 檔案
   * @param {string} filePath - 檔案路徑
   * @returns {Promise<RegulationDiffDoc>}
   */
  async parse(filePath, filename) {
    try {
      logger.info(`開始解析法規文件: ${filename}`);

      // 使用 mammoth 轉換為 HTML（保留表格結構）
      const result = await mammoth.convertToHtml({ path: filePath });
      const html = result.value;

      if (!html || html.trim().length === 0) {
        throw new ValidationError('文件內容為空');
      }

      // 解析 HTML 表格
      const items = this.parseHtmlTable(html);

      // 如果沒有解析到表格，嘗試純文本解析（備用方案）
      if (items.length === 0) {
        logger.warn('未偵測到表格結構，嘗試純文本解析');
        const textResult = await mammoth.extractRawText({ path: filePath });
        const fallbackItems = this.parseTextContent(textResult.value);
        if (fallbackItems.length > 0) {
          return {
            filename,
            uploadedAt: new Date().toISOString(),
            items: fallbackItems,
          };
        }
      }

      logger.info(`法規文件解析完成，共 ${items.length} 個差異項目`);

      return {
        filename,
        uploadedAt: new Date().toISOString(),
        items,
      };
    } catch (error) {
      logger.error('法規文件解析失敗', { error: error.message });
      throw error;
    }
  }

  /**
   * 解析 HTML 表格
   * @private
   */
  parseHtmlTable(html) {
    const $ = cheerio.load(html);
    const items = [];

    // 尋找所有表格
    $('table').each((tableIndex, table) => {
      const rows = $(table).find('tr');
      
      logger.info(`找到表格，共 ${rows.length} 行`);

      let headerRowIndex = -1;
      let headers = null;
      let foundFirstHeader = false;

      // 尋找表頭行
      rows.each((rowIndex, row) => {
        const cells = $(row).find('td, th');
        const cellTexts = cells.map((i, cell) => $(cell).text().trim()).get();
        
        // 只記錄第一個表頭行
        if (!foundFirstHeader && this.isHeaderRow(cellTexts)) {
          headerRowIndex = rowIndex;
          headers = this.identifyColumns(cellTexts);
          foundFirstHeader = true;
          logger.info(`偵測到表頭行 (第 ${rowIndex} 行)，欄位配置:`, headers);
          return; // continue
        }

        // 如果已找到表頭，開始解析數據行
        if (foundFirstHeader && rowIndex > headerRowIndex) {
          const cellValues = cells.map((i, cell) => $(cell).text().trim()).get();
          
          // 跳過空行或只有一個儲存格的行
          if (cellValues.length === 0 || cellValues.every(v => !v)) {
            return; // continue
          }

          // 確保至少有 3 個欄位（修正條文、現行條文、說明）
          if (cellValues.length < 3) {
            logger.debug(`跳過欄位數不足的行 (第 ${rowIndex} 行)，只有 ${cellValues.length} 個欄位`);
            return; // continue
          }

          const item = this.parseTableRow(cellValues, headers);
          if (item) {
            logger.info(`成功解析第 ${rowIndex} 行: ${item.sectionTitle}`);
            items.push(item);
          }
        }
      });
    });

    return items;
  }

  /**
   * 判斷是否為表頭行
   * @private
   */
  isHeaderRow(cellTexts) {
    const headerKeywords = ['修正條文', '修正後', '現行條文', '修正前', '說明'];
    return cellTexts.some(text => 
      headerKeywords.some(keyword => text.includes(keyword))
    );
  }

  /**
   * 識別各欄位位置
   * @private
   */
  identifyColumns(headerTexts) {
    const columns = {
      newTextCol: -1,
      oldTextCol: -1,
      explanationCol: -1,
    };

    headerTexts.forEach((text, index) => {
      if (text.includes('修正條文') || text.includes('修正後')) {
        columns.newTextCol = index;
      } else if (text.includes('現行條文') || text.includes('修正前')) {
        columns.oldTextCol = index;
      } else if (text.includes('說明')) {
        columns.explanationCol = index;
      }
    });

    return columns;
  }

  /**
   * 解析表格行
   * @private
   */
  parseTableRow(cellValues, columns) {
    const newText = columns.newTextCol >= 0 ? cellValues[columns.newTextCol] || '' : '';
    const oldText = columns.oldTextCol >= 0 ? cellValues[columns.oldTextCol] || '' : '';
    const explanation = columns.explanationCol >= 0 ? cellValues[columns.explanationCol] || '' : '';

    // 從任一欄位提取條文標題
    const sectionTitle = this.extractSectionTitle(newText, oldText, explanation);
    
    if (!sectionTitle) {
      return null; // 無法識別的行
    }

    // 判斷差異類型
    let diffType = DiffTypes.MODIFY;
    if (!oldText && newText) {
      diffType = DiffTypes.NEW;
    } else if (oldText && !newText) {
      diffType = DiffTypes.DELETE;
    }

    return {
      sectionTitle,
      oldText: oldText.trim(),
      newText: newText.trim(),
      explanation: explanation.trim(),
      diffType,
      anchors: [this.extractArticleNumber(sectionTitle)],
    };
  }

  /**
   * 提取條文標題
   * @private
   */
  extractSectionTitle(newText, oldText, explanation) {
    // 優先從修正條文提取
    const texts = [newText, oldText, explanation];
    
    for (const text of texts) {
      if (!text) continue;
      
      // 尋找條文標題（第X條）
      const lines = text.split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (this.isSectionTitle(trimmed)) {
          return trimmed;
        }
      }
    }

    return null;
  }

  /**
   * 純文本解析（備用方案）
   * @private
   */
  parseTextContent(text) {
    const items = [];
    
    // 將文本按段落分割
    const paragraphs = text.split('\n').filter(p => p.trim().length > 0);
    
    let currentItem = null;
    let mode = null; // 'title', 'new', 'old', 'explanation'

    for (let i = 0; i < paragraphs.length; i++) {
      const line = paragraphs[i].trim();

      // 偵測章節標題（例如：第二條、第三條之一）
      if (this.isSectionTitle(line)) {
        // 儲存前一個項目
        if (currentItem) {
          items.push(this.finalizeItem(currentItem));
        }

        // 開始新項目
        currentItem = {
          sectionTitle: line,
          oldText: '',
          newText: '',
          explanation: '',
          diffType: DiffTypes.MODIFY,
          anchors: [this.extractArticleNumber(line)],
        };
        mode = 'title';
        continue;
      }

      // 偵測欄位標籤
      if (line.includes('修正條文') || line.includes('修正後條文')) {
        mode = 'new';
        continue;
      }
      if (line.includes('現行條文') || line.includes('修正前條文')) {
        mode = 'old';
        continue;
      }
      if (line.includes('說明')) {
        mode = 'explanation';
        continue;
      }

      // 根據模式累積內容
      if (currentItem && mode) {
        if (mode === 'new') {
          currentItem.newText += line + '\n';
        } else if (mode === 'old') {
          currentItem.oldText += line + '\n';
        } else if (mode === 'explanation') {
          currentItem.explanation += line + '\n';
        }
      }
    }

    // 儲存最後一個項目
    if (currentItem) {
      items.push(this.finalizeItem(currentItem));
    }

    return items;
  }

  /**
   * 判斷是否為章節標題
   * @private
   */
  isSectionTitle(line) {
    // 匹配：第X條、第X條之一、第X章等
    const patterns = [
      /^第[一二三四五六七八九十百\d]+條/,
      /^第[一二三四五六七八九十百\d]+章/,
      /^第[一二三四五六七八九十百\d]+節/,
    ];

    return patterns.some(pattern => pattern.test(line));
  }

  /**
   * 提取條號
   * @private
   */
  extractArticleNumber(title) {
    const match = title.match(/第[一二三四五六七八九十百\d]+[條章節]/);
    return match ? match[0] : title;
  }

  /**
   * 完成項目處理（判斷差異類型）
   * @private
   */
  finalizeItem(item) {
    // 清理文字
    item.oldText = item.oldText.trim();
    item.newText = item.newText.trim();
    item.explanation = item.explanation.trim();

    // 判斷差異類型
    if (!item.oldText && item.newText) {
      item.diffType = DiffTypes.NEW;
    } else if (item.oldText && !item.newText) {
      item.diffType = DiffTypes.DELETE;
    } else {
      item.diffType = DiffTypes.MODIFY;
    }

    return item;
  }

  /**
   * 從說明欄提取關鍵字
   * @private
   */
  extractKeywords(explanation) {
    const keywords = [];
    
    // 常見關鍵詞模式
    const patterns = [
      /資通安全/g,
      /雲端運算/g,
      /委外/g,
      /風險管理/g,
      /供應鏈/g,
      /資訊服務/g,
    ];

    patterns.forEach(pattern => {
      const matches = explanation.match(pattern);
      if (matches) {
        keywords.push(...matches);
      }
    });

    return [...new Set(keywords)]; // 去重
  }
}

export const regulationParser = new RegulationParser();

