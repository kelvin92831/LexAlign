import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs/promises';
import { logger } from './logger.js';

const execAsync = promisify(exec);

// LibreOffice 可能的安装路径
const LIBREOFFICE_PATHS = [
  '/Applications/LibreOffice.app/Contents/MacOS/soffice',
  '/usr/bin/soffice',
  '/usr/local/bin/soffice',
];

/**
 * 查找 LibreOffice 安装路径
 * @returns {Promise<string|null>}
 */
async function findLibreOffice() {
  for (const path of LIBREOFFICE_PATHS) {
    try {
      await fs.access(path);
      return path;
    } catch (error) {
      // 继续尝试下一个路径
    }
  }
  return null;
}

/**
 * 使用 LibreOffice 将 .doc 转换为 .docx
 * @param {string} inputPath - 输入文件路径（.doc）
 * @returns {Promise<string>} 输出文件路径（.docx）
 */
export async function convertDocToDocx(inputPath) {
  const dir = path.dirname(inputPath);
  const filename = path.basename(inputPath, path.extname(inputPath));
  const outputPath = path.join(dir, `${filename}.docx`);

  try {
    logger.info('开始转换 .doc 到 .docx', { inputPath });

    // 查找 LibreOffice
    const libreOfficePath = await findLibreOffice();
    
    if (!libreOfficePath) {
      throw new Error(
        'LibreOffice 未安装。请运行: brew install --cask libreoffice\n' +
        '或者将 .doc 文件转换为 .docx 格式后再上传。'
      );
    }

    // 使用 LibreOffice 转换
    const command = `"${libreOfficePath}" --headless --convert-to docx --outdir "${dir}" "${inputPath}"`;
    
    const { stdout, stderr } = await execAsync(command, { 
      timeout: 60000, // 60秒超时
      maxBuffer: 10 * 1024 * 1024 // 10MB buffer
    });

    logger.debug('LibreOffice 输出', { stdout, stderr });

    // 等待文件生成（有时需要一点时间）
    let retries = 5;
    while (retries > 0) {
      try {
        await fs.access(outputPath);
        break;
      } catch (error) {
        retries--;
        if (retries === 0) throw error;
        await new Promise(resolve => setTimeout(resolve, 500)); // 等待 500ms
      }
    }

    logger.info('文档转换成功', { outputPath });
    return outputPath;
  } catch (error) {
    logger.error('文档转换失败', { error: error.message, inputPath });
    
    if (error.message.includes('timeout')) {
      throw new Error('文档转换超时，文件可能过大或损坏');
    }
    
    throw new Error(`无法转换 .doc 文件：${error.message}`);
  }
}

/**
 * 检测文件是否需要转换
 * @param {string} filePath - 文件路径
 * @returns {boolean}
 */
export function needsConversion(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return ext === '.doc';
}

/**
 * 清理转换后的临时文件
 * @param {string} filePath - 要清理的文件路径
 */
export async function cleanupConvertedFile(filePath) {
  try {
    await fs.unlink(filePath);
    logger.info('清理转换后的临时文件', { filePath });
  } catch (error) {
    logger.warn('清理临时文件失败', { error: error.message, filePath });
  }
}

/**
 * 检查系统是否支持 .doc 转换
 * @returns {Promise<boolean>}
 */
export async function isDocConversionSupported() {
  const libreOfficePath = await findLibreOffice();
  return libreOfficePath !== null;
}

