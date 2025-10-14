/**
 * 文件解析相關型別定義
 */

/**
 * @typedef {'新增' | '修正' | '刪除'} DiffType
 */

/**
 * @typedef {Object} RegulationDiffItem
 * @property {string} sectionTitle - 例：第二條 名詞定義
 * @property {string} [oldText] - 現行條文
 * @property {string} [newText] - 修正後條文
 * @property {string} [explanation] - 對照表「說明」欄
 * @property {DiffType} diffType - 新增/修正/刪除
 * @property {string[]} [anchors] - 條號/款目
 */

/**
 * @typedef {Object} RegulationDiffDoc
 * @property {string} filename - 檔案名稱
 * @property {string} uploadedAt - 上傳時間
 * @property {RegulationDiffItem[]} items - 差異項目列表
 */

/**
 * @typedef {Object} PolicyMetadata
 * @property {string} doc_id - 例：SO-02-002
 * @property {string} doc_name - 檔名（含中文）
 * @property {string} [version] - 例：V3.7
 * @property {string} [issued_at] - 發行日期（YYYY/MM/DD）
 * @property {string} [section_path] - 例：第六章/第一節
 * @property {string} [article_no] - 例：第三條、第七條
 * @property {string[]} [form_ids] - 例：["F06", "F07", "F11"]
 * @property {string[]} [keywords] - 例：["雲端運算服務", "集中度", "核心系統"]
 */

/**
 * @typedef {Object} PolicyChunk
 * @property {string} content - 內容文字
 * @property {PolicyMetadata} metadata - 元資料
 * @property {number} [index] - 片段索引
 */

export const DiffTypes = {
  NEW: '新增',
  MODIFY: '修正',
  DELETE: '刪除',
};

