import { ChromaClient, TransformersEmbeddingFunction } from 'chromadb';
import { logger } from '../../utils/logger.js';
import { config } from '../../config/index.js';
import { InternalError } from '../../utils/errors.js';

/**
 * Chroma 向量資料庫服務
 */
export class ChromaService {
  constructor() {
    this.client = null;
    this.collection = null;
    this.collectionName = 'policy_documents';
    const embeddingConfig = config.rag?.embedding || {};
    this.embeddingFunction = new TransformersEmbeddingFunction({
      model: embeddingConfig.model,
      revision: embeddingConfig.revision,
      quantized: embeddingConfig.quantized,
    });
  }

  /**
   * 初始化 Chroma 客戶端
   */
  async initialize() {
    try {
      logger.info('初始化 Chroma 資料庫...');

      // 連接到 ChromaDB 服務器（需要先啟動 Chroma 服務）
      // 預設連接 http://localhost:8000
      const chromaHost = process.env.CHROMA_HOST || 'http://localhost:8000';
      
      this.client = new ChromaClient({
        path: chromaHost,
      });

      // 測試連線
      await this.client.heartbeat();
      logger.info(`成功連接到 ChromaDB: ${chromaHost}`);
      logger.info(`使用向量嵌入模型: ${config.rag.embedding.model} (revision: ${config.rag.embedding.revision}, quantized: ${config.rag.embedding.quantized})`);

      // 取得或建立集合
      try {
        this.collection = await this.client.getOrCreateCollection({
          name: this.collectionName,
          metadata: { description: '公司內規文件向量庫' },
          embeddingFunction: this.embeddingFunction,
        });
      } catch (error) {
        // 如果集合已存在，直接取得
        this.collection = await this.client.getCollection({
          name: this.collectionName,
          embeddingFunction: this.embeddingFunction,
        });
      }

      logger.info('Chroma 資料庫初始化完成');
    } catch (error) {
      logger.error('Chroma 初始化失敗', { error: error.message });
      logger.warn('請確認 ChromaDB 服務器已啟動（參考 backend/CHROMA_SETUP.md）');
      throw new InternalError('向量資料庫初始化失敗：' + error.message);
    }
  }

  /**
   * 新增文件片段到向量庫
   * @param {PolicyChunk[]} chunks - 文件片段陣列
   */
  async addDocuments(chunks) {
    try {
      if (!this.collection) {
        await this.initialize();
      }

      logger.info(`新增 ${chunks.length} 個文件片段到向量庫`);

      const ids = chunks.map((_, i) => `chunk_${Date.now()}_${i}`);
      const documents = chunks.map(chunk => chunk.content);
      
      // 清理並格式化 metadata
      const metadatas = chunks.map(chunk => {
        const cleanMeta = {};
        
        // 只保留簡單類型的字段
        if (chunk.metadata.doc_id) cleanMeta.doc_id = String(chunk.metadata.doc_id);
        if (chunk.metadata.doc_name) cleanMeta.doc_name = String(chunk.metadata.doc_name);
        if (chunk.metadata.version) cleanMeta.version = String(chunk.metadata.version);
        if (chunk.metadata.issued_at) cleanMeta.issued_at = String(chunk.metadata.issued_at);
        if (chunk.metadata.section_path) cleanMeta.section_path = String(chunk.metadata.section_path);
        if (chunk.metadata.article_no) cleanMeta.article_no = String(chunk.metadata.article_no);
        if (chunk.index !== undefined) cleanMeta.index = Number(chunk.index);
        
        // 陣列轉為 JSON 字串
        if (chunk.metadata.keywords) {
          cleanMeta.keywords = JSON.stringify(chunk.metadata.keywords);
        }
        if (chunk.metadata.form_ids) {
          cleanMeta.form_ids = JSON.stringify(chunk.metadata.form_ids);
        }
        
        return cleanMeta;
      });

      logger.debug('準備新增文件', {
        chunkCount: chunks.length,
        sampleId: ids[0],
        sampleDocLength: documents[0]?.length,
        sampleMeta: metadatas[0],
      });

      await this.collection.add({
        ids,
        documents,
        metadatas,
      });

      logger.info('文件片段新增完成');
    } catch (error) {
      logger.error('新增文件片段失敗', { 
        error: error.message,
        stack: error.stack,
        chunkCount: chunks.length,
      });
      throw new InternalError('新增文件到向量庫失敗：' + error.message);
    }
  }

  /**
   * 搜尋相關文件片段
   * @param {string} query - 查詢文字
   * @param {number} topK - 回傳前 K 個結果
   * @param {string} priorityDocId - 優先文件 ID（作弊模式用）
   * @returns {Promise<Array>}
   */
  async search(query, topK = null, priorityDocId = null) {
    try {
      if (!this.collection) {
        await this.initialize();
      }

      const k = topK || config.rag.topK;
      const isCheatMode = config.rag.cheatMode;
      const targetDocId = priorityDocId || config.rag.priorityDocId;

      logger.info(`搜尋相關文件，query: ${query.substring(0, 50)}...`);
      
      if (isCheatMode) {
        logger.info(`🎯 作弊模式已開啟，只檢索 ${targetDocId} 相關文檔`);
      }

      // 如果開啟作弊模式，使用 where 條件過濾
      const queryOptions = {
        queryTexts: [query],
        nResults: isCheatMode ? k * 3 : k, // 作弊模式時獲取更多結果以便過濾
      };

      // 作弊模式：添加文檔過濾條件
      if (isCheatMode && targetDocId) {
        queryOptions.where = {
          $or: [
            { doc_id: targetDocId },
            { doc_id: { $regex: `^${targetDocId}-` } }, // 匹配前綴，如 SO-02-002-F06
            { doc_name: { $regex: targetDocId } }, // 文件名包含目標 ID
          ]
        };
        
        logger.debug('作弊模式過濾條件:', queryOptions.where);
      }

      const results = await this.collection.query(queryOptions);

      // 轉換格式
      const formattedResults = [];
      
      if (results.documents && results.documents[0]) {
        for (let i = 0; i < results.documents[0].length; i++) {
          const metadata = results.metadatas[0][i];
          
          formattedResults.push({
            content: results.documents[0][i],
            metadata: {
              ...metadata,
              keywords: JSON.parse(metadata.keywords || '[]'),
              form_ids: JSON.parse(metadata.form_ids || '[]'),
            },
            distance: results.distances ? results.distances[0][i] : null,
          });
        }
      }

      // 作弊模式：額外過濾確保只返回目標文檔
      let finalResults = formattedResults;
      if (isCheatMode && targetDocId) {
        finalResults = formattedResults.filter(result => {
          const docId = result.metadata?.doc_id;
          const docName = result.metadata?.doc_name;
          
          const isTargetDoc = docId === targetDocId ||
                            docId?.startsWith(targetDocId + '-') ||
                            docName?.includes(targetDocId);
          
          if (isTargetDoc) {
            logger.debug(`✅ 作弊模式匹配: ${docName} (${docId})`);
          }
          
          return isTargetDoc;
        });
        
        // 限制返回數量
        finalResults = finalResults.slice(0, k);
        
        logger.info(`作弊模式過濾完成: ${formattedResults.length} -> ${finalResults.length} 個結果`);
      }

      logger.info(`搜尋完成，找到 ${finalResults.length} 個相關片段`);

      return finalResults;
    } catch (error) {
      logger.error('搜尋文件失敗', { error: error.message });
      throw new InternalError('搜尋向量庫失敗');
    }
  }

  /**
   * 刪除集合（重建索引用）
   */
  async deleteCollection() {
    try {
      if (!this.client) {
        await this.initialize();
      }

      await this.client.deleteCollection({ name: this.collectionName });
      this.collection = null;

      logger.info('集合已刪除');
    } catch (error) {
      logger.error('刪除集合失敗', { error: error.message });
      throw new InternalError('刪除向量庫集合失敗');
    }
  }

  /**
   * 取得集合統計資訊
   */
  async getStats() {
    try {
      if (!this.collection) {
        await this.initialize();
      }

      const count = await this.collection.count();

      return {
        collectionName: this.collectionName,
        documentCount: count,
      };
    } catch (error) {
      logger.warn('取得統計資訊失敗（可能集合尚未建立）', { error: error.message });
      // 回傳預設值而不是拋出錯誤
      return {
        collectionName: this.collectionName,
        documentCount: 0,
      };
    }
  }
}

export const chromaService = new ChromaService();

