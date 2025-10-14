import { ValidationError } from './errors.js';

/**
 * 驗證檔案類型
 */
export function validateDocxFile(file) {
  if (!file) {
    throw new ValidationError('未上傳檔案');
  }

  const allowedMimes = [
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/octet-stream', // 有些系統會回傳這個
  ];

  if (!allowedMimes.includes(file.mimetype) && !file.originalname.endsWith('.docx')) {
    throw new ValidationError('只支援 .docx 格式檔案');
  }

  return true;
}

/**
 * 驗證檔案大小
 */
export function validateFileSize(file, maxSize) {
  if (file.size > maxSize) {
    const maxMB = (maxSize / 1024 / 1024).toFixed(2);
    throw new ValidationError(`檔案大小超過限制（${maxMB}MB）`);
  }
  return true;
}

/**
 * 驗證必要欄位
 */
export function validateRequiredFields(data, fields) {
  const missing = fields.filter(field => !data[field]);

  if (missing.length > 0) {
    throw new ValidationError(`缺少必要欄位：${missing.join(', ')}`);
  }

  return true;
}

/**
 * 驗證數值範圍
 */
export function validateRange(value, min, max, fieldName = '數值') {
  const num = Number(value);

  if (isNaN(num)) {
    throw new ValidationError(`${fieldName} 必須是數字`);
  }

  if (num < min || num > max) {
    throw new ValidationError(`${fieldName} 必須介於 ${min} 到 ${max} 之間`);
  }

  return true;
}

