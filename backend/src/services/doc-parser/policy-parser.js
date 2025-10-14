import mammoth from 'mammoth';
import { logger } from '../../utils/logger.js';
import { ValidationError } from '../../utils/errors.js';
import { config } from '../../config/index.js';

/**
 * 解析內規文件（docx）
 */
export class PolicyParser {
  /**
   * 解析內規文件並切片
   * @param {string} filePath - 檔案路徑
   * @param {string} filename - 檔案名稱
   * @returns {Promise<PolicyChunk[]>}
   */
  async parse(filePath, filename) {
    try {
      logger.info(`開始解析內規文件: ${filename}`);

      // 讀取文件
      const result = await mammoth.extractRawText({ path: filePath });
      const text = result.value;

      if (!text || text.trim().length === 0) {
        throw new ValidationError('文件內容為空');
      }

      // 提取元資料
      const metadata = this.extractMetadata(filename, text);

      // 切片
      const chunks = this.chunkText(text, metadata);

      logger.info(`內規文件解析完成，共 ${chunks.length} 個片段`);

      return chunks;
    } catch (error) {
      logger.error('內規文件解析失敗', { error: error.message });
      throw error;
    }
  }

  /**
   * 從檔名和內容提取元資料
   * @private
   */
  extractMetadata(filename, text) {
    const metadata = {
      doc_name: filename,
      doc_id: '',
      version: '',
      issued_at: '',
      keywords: [],
    };

    // 提取文件編號（例如：SO-02-002）
    const docIdMatch = filename.match(/([A-Z]+-\d+-\d+)/);
    if (docIdMatch) {
      metadata.doc_id = docIdMatch[1];
    }

    // 提取版本號（例如：v3.7）
    const versionMatch = filename.match(/[vV](\d+\.\d+)/);
    if (versionMatch) {
      metadata.version = versionMatch[1];
    }

    // 提取發行日期（從內容中尋找）
    const datePatterns = [
      /發行日期[:：]\s*(\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2})/,
      /(\d{4}年\d{1,2}月\d{1,2}日)/,
    ];

    for (const pattern of datePatterns) {
      const match = text.match(pattern);
      if (match) {
        metadata.issued_at = match[1];
        break;
      }
    }

    // 提取關鍵字
    metadata.keywords = this.extractKeywords(text);

    return metadata;
  }

  /**
   * 文本切片
   * @private
   */
  chunkText(text, baseMetadata) {
    const chunks = [];
    const chunkSize = config.rag.chunkSize;
    const overlap = config.rag.chunkOverlap;

    // 先按章節分割
    const sections = this.splitBySections(text);

    sections.forEach((section, sectionIndex) => {
      const { title, content } = section;

      // 如果章節內容小於 chunk size，直接作為一個 chunk
      if (content.length <= chunkSize) {
        chunks.push({
          content: content.trim(),
          metadata: {
            ...baseMetadata,
            section_path: title,
            article_no: this.extractArticleNumber(content),
          },
          index: chunks.length,
        });
      } else {
        // 否則進一步切片
        let start = 0;
        let chunkIndex = 0;

        while (start < content.length) {
          const end = Math.min(start + chunkSize, content.length);
          const chunkContent = content.substring(start, end);

          chunks.push({
            content: chunkContent.trim(),
            metadata: {
              ...baseMetadata,
              section_path: `${title} (片段 ${chunkIndex + 1})`,
              article_no: this.extractArticleNumber(chunkContent),
            },
            index: chunks.length,
          });

          start += chunkSize - overlap;
          chunkIndex++;
        }
      }
    });

    return chunks;
  }

  /**
   * 按章節分割文本
   * @private
   */
  splitBySections(text) {
    const sections = [];
    const lines = text.split('\n');

    let currentSection = { title: '前言', content: '' };

    for (const line of lines) {
      // 偵測章節標題
      if (this.isSectionTitle(line)) {
        // 儲存前一個章節
        if (currentSection.content.trim()) {
          sections.push(currentSection);
        }

        // 開始新章節
        currentSection = {
          title: line.trim(),
          content: '',
        };
      } else {
        currentSection.content += line + '\n';
      }
    }

    // 儲存最後一個章節
    if (currentSection.content.trim()) {
      sections.push(currentSection);
    }

    return sections;
  }

  /**
   * 判斷是否為章節標題
   * @private
   */
  isSectionTitle(line) {
    const patterns = [
      /^第[一二三四五六七八九十百\d]+章/,
      /^第[一二三四五六七八九十百\d]+節/,
      /^第[一二三四五六七八九十百\d]+條/,
      /^[一二三四五六七八九十]+、/,
    ];

    return patterns.some(pattern => pattern.test(line.trim()));
  }

  /**
   * 提取條號
   * @private
   */
  extractArticleNumber(content) {
    const match = content.match(/第[一二三四五六七八九十百\d]+條/);
    return match ? match[0] : '';
  }

  /**
   * 提取關鍵字
   * @private
   */
  extractKeywords(text) {
    const keywords = new Set();

    // 關鍵詞列表
    const keywordPatterns = [
      '資通安全',
      '雲端運算',
      '委外',
      '風險管理',
      '供應鏈',
      '資訊服務',
      '稽核',
      '合約',
      '資安',
      '個資',
      '備援',
      '營運持續',
    ];

    keywordPatterns.forEach(keyword => {
      if (text.includes(keyword)) {
        keywords.add(keyword);
      }
    });

    return Array.from(keywords);
  }
}

export const policyParser = new PolicyParser();

