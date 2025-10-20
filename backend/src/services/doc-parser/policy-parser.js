import mammoth from 'mammoth';
import { logger } from '../../utils/logger.js';
import { ValidationError } from '../../utils/errors.js';
import { config } from '../../config/index.js';
import { convertDocToDocx, needsConversion, cleanupConvertedFile } from '../../utils/doc-converter.js';

/**
 * 解析內規文件（docx 和 doc）
 */
export class PolicyParser {
  /**
   * 解析內規文件並切片
   * @param {string} filePath - 檔案路徑
   * @param {string} filename - 檔案名稱
   * @returns {Promise<PolicyChunk[]>}
   */
  async parse(filePath, filename) {
    let actualFilePath = filePath;
    let needsCleanup = false;

    try {
      logger.info(`開始解析內規文件: ${filename}`);

      // 如果是 .doc 文件，先转换为 .docx
      if (needsConversion(filePath)) {
        logger.info('檢測到 .doc 文件，開始自動轉換為 .docx...');
        actualFilePath = await convertDocToDocx(filePath);
        needsCleanup = true;
        logger.info('轉換完成，繼續解析');
      }

      // 讀取文件
      const result = await mammoth.extractRawText({ path: actualFilePath });
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
    } finally {
      // 清理转换后的临时文件
      if (needsCleanup && actualFilePath !== filePath) {
        await cleanupConvertedFile(actualFilePath);
      }
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
   * 文本切片（语义切块策略）
   * @private
   */
  chunkText(text, baseMetadata) {
    const chunks = [];
    const MAX_CHUNK_SIZE = 1200;  // 增加最大块大小，支持完整条文
    const SMALL_SECTION_SIZE = 800; // 小章节阈值

    logger.info('开始语义切块...', { doc: baseMetadata.doc_name });

    // 先按章节分割
    const sections = this.splitBySections(text);
    logger.debug(`文档分为 ${sections.length} 个章节`);

    sections.forEach((section, sectionIndex) => {
      const { title, content, level } = section;

      // 策略 1：小章节保持完整（包含标题增强语义）
      if (content.length <= SMALL_SECTION_SIZE) {
        chunks.push({
          content: `${title}\n\n${content}`.trim(),
          metadata: {
            ...baseMetadata,
            section_path: title,
            section_level: level,
            article_no: this.extractArticleNumber(content),
            is_complete_section: true,  // 标记完整章节
          },
          index: chunks.length,
        });
        logger.debug(`完整章节: ${title} (${content.length}字)`);
      }
      // 策略 2：大章节按条文切分
      else {
        const articles = this.splitByArticles(content);
        
        if (articles.length > 1) {
          // 有多个条文，按条文切分
          articles.forEach((article, articleIndex) => {
            chunks.push({
              content: `${title} > ${article.title}\n\n${article.content}`.trim(),
              metadata: {
                ...baseMetadata,
                section_path: `${title} > ${article.title}`,
                section_level: level,
                article_level: 'article',
                article_no: article.title,
                article_index: articleIndex,
                is_complete_article: true,  // 标记完整条文
              },
              index: chunks.length,
            });
            logger.debug(`条文切块: ${title} > ${article.title} (${article.content.length}字)`);
          });
        } else {
          // 没有明确条文，按子章节切分
          const subSections = this.splitBySubSections(content);
          
          if (subSections.length > 1) {
            subSections.forEach((subSection, subIndex) => {
              chunks.push({
                content: `${title} > ${subSection.title}\n\n${subSection.content}`.trim(),
                metadata: {
                  ...baseMetadata,
                  section_path: `${title} > ${subSection.title}`,
                  section_level: level,
                  sub_section_index: subIndex,
                },
                index: chunks.length,
              });
            });
          } else {
            // 仍然很大但无法进一步语义切分，使用智能段落切分
            const paragraphs = this.splitByParagraphs(content, title, MAX_CHUNK_SIZE);
            paragraphs.forEach(para => {
              chunks.push({
                content: para.content,
                metadata: {
                  ...baseMetadata,
                  section_path: para.section_path,
                  section_level: level,
                },
                index: chunks.length,
              });
            });
          }
        }
      }
    });

    logger.info(`语义切块完成: ${chunks.length} 个片段`, {
      avgSize: Math.round(chunks.reduce((sum, c) => sum + c.content.length, 0) / chunks.length),
      complete_sections: chunks.filter(c => c.metadata.is_complete_section).length,
      complete_articles: chunks.filter(c => c.metadata.is_complete_article).length,
    });

    return chunks;
  }

  /**
   * 按章節分割文本（改进版，包含层级信息）
   * @private
   */
  splitBySections(text) {
    const sections = [];
    const lines = text.split('\n');

    let currentSection = { title: '前言', content: '', level: 'intro' };

    for (const line of lines) {
      // 偵測章節標題
      const sectionInfo = this.getSectionInfo(line);
      if (sectionInfo) {
        // 儲存前一個章節
        if (currentSection.content.trim()) {
          sections.push(currentSection);
        }

        // 開始新章節
        currentSection = {
          title: line.trim(),
          content: '',
          level: sectionInfo.level,
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
   * 获取章节信息（改进版，返回层级）
   * @private
   */
  getSectionInfo(line) {
    const trimmed = line.trim();
    
    if (/^第[一二三四五六七八九十百\d]+章/.test(trimmed)) {
      return { level: 'chapter', type: 'chapter' };
    }
    if (/^第[一二三四五六七八九十百\d]+節/.test(trimmed)) {
      return { level: 'section', type: 'section' };
    }
    if (/^第[一二三四五六七八九十百\d]+條/.test(trimmed)) {
      return { level: 'article', type: 'article' };
    }
    if (/^[一二三四五六七八九十]+、/.test(trimmed)) {
      return { level: 'item', type: 'item' };
    }
    
    return null;
  }

  /**
   * 判斷是否為章節標題（向后兼容）
   * @private
   */
  isSectionTitle(line) {
    return this.getSectionInfo(line) !== null;
  }

  /**
   * 按条文切分内容
   * @private
   */
  splitByArticles(content) {
    const articles = [];
    const lines = content.split('\n');
    let currentArticle = null;

    for (const line of lines) {
      const trimmed = line.trim();
      
      // 检测条文标题（第X条）
      if (/^第[一二三四五六七八九十百\d]+條/.test(trimmed)) {
        if (currentArticle && currentArticle.content.trim()) {
          articles.push(currentArticle);
        }
        currentArticle = {
          title: trimmed,
          content: '',
        };
      } else if (currentArticle) {
        currentArticle.content += line + '\n';
      } else {
        // 条文之前的内容（如果有）
        if (!currentArticle && trimmed) {
          currentArticle = {
            title: '说明',
            content: line + '\n',
          };
        }
      }
    }

    // 保存最后一个条文
    if (currentArticle && currentArticle.content.trim()) {
      articles.push(currentArticle);
    }

    return articles.length > 0 ? articles : [{ title: '内容', content }];
  }

  /**
   * 按子章节切分（款、项等）
   * @private
   */
  splitBySubSections(content) {
    const subSections = [];
    const lines = content.split('\n');
    let currentSubSection = null;

    for (const line of lines) {
      const trimmed = line.trim();
      
      // 检测子章节标题（一、二、三、）
      if (/^[一二三四五六七八九十]+、/.test(trimmed)) {
        if (currentSubSection && currentSubSection.content.trim()) {
          subSections.push(currentSubSection);
        }
        currentSubSection = {
          title: trimmed,
          content: '',
        };
      } else if (currentSubSection) {
        currentSubSection.content += line + '\n';
      } else {
        // 子章节之前的内容
        if (!currentSubSection && trimmed) {
          currentSubSection = {
            title: '说明',
            content: line + '\n',
          };
        }
      }
    }

    // 保存最后一个子章节
    if (currentSubSection && currentSubSection.content.trim()) {
      subSections.push(currentSubSection);
    }

    return subSections.length > 0 ? subSections : [];
  }

  /**
   * 智能段落切分（当无法语义切分时的备用方案）
   * @private
   */
  splitByParagraphs(content, sectionTitle, maxSize) {
    const paragraphs = [];
    const lines = content.split('\n');
    let currentPara = '';
    let paraIndex = 0;

    for (const line of lines) {
      // 空行表示段落结束
      if (!line.trim()) {
        if (currentPara.trim() && currentPara.length > 50) {
          paragraphs.push({
            content: `${sectionTitle}\n\n${currentPara}`.trim(),
            section_path: `${sectionTitle} (段落 ${paraIndex + 1})`,
          });
          paraIndex++;
          currentPara = '';
        }
      } else {
        // 如果当前段落太大，强制切分
        if (currentPara.length + line.length > maxSize) {
          if (currentPara.trim()) {
            paragraphs.push({
              content: `${sectionTitle}\n\n${currentPara}`.trim(),
              section_path: `${sectionTitle} (段落 ${paraIndex + 1})`,
            });
            paraIndex++;
          }
          currentPara = line + '\n';
        } else {
          currentPara += line + '\n';
        }
      }
    }

    // 保存最后一个段落
    if (currentPara.trim()) {
      paragraphs.push({
        content: `${sectionTitle}\n\n${currentPara}`.trim(),
        section_path: `${sectionTitle} (段落 ${paraIndex + 1})`,
      });
    }

    return paragraphs.length > 0 ? paragraphs : [{
      content: `${sectionTitle}\n\n${content}`.trim(),
      section_path: sectionTitle,
    }];
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

