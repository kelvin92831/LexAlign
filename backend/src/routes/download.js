import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import { Document, Packer, Paragraph, Table, TableRow, TableCell, WidthType, BorderStyle } from 'docx';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';
import { ValidationError } from '../utils/errors.js';

const router = express.Router();

/**
 * GET /api/download/:taskId
 * 下載修改建議報告
 */
router.get('/:taskId', async (req, res, next) => {
  try {
    const { taskId } = req.params;
    const { format = 'docx' } = req.query;

    logger.info('生成下載報告', { taskId, format });

    // 讀取建議結果
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

    const { suggestions, suggestions_by_document } = suggestData;

    if (format === 'docx') {
      // 生成 Word 文件（使用分組格式，如果有的話）
      const doc = await generateWordReport(
        suggestions_by_document || suggestions, 
        taskId,
        !!suggestions_by_document  // 是否為分組格式
      );

      // 匯出為 buffer
      const buffer = await Packer.toBuffer(doc);

      // 設定回應標頭
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      );
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="regulation_suggestions_${taskId}.docx"`
      );

      res.send(buffer);
    } else if (format === 'json') {
      // JSON 格式
      res.json({
        success: true,
        data: suggestData,
      });
    } else {
      throw new ValidationError('不支援的格式，請使用 docx 或 json');
    }
  } catch (error) {
    next(error);
  }
});

/**
 * 生成 Word 報告
 * @private
 */
async function generateWordReport(data, taskId, isGrouped = false) {
  const sections = [];

  // 標題
  sections.push(
    new Paragraph({
      text: '法規對應比對系統 - 修改建議報告',
      heading: 'Heading1',
      spacing: { after: 300 },
    })
  );

  sections.push(
    new Paragraph({
      text: `報告編號：${taskId}`,
      spacing: { after: 150 },
    })
  );

  sections.push(
    new Paragraph({
      text: `生成時間：${new Date().toLocaleString('zh-TW')}`,
      spacing: { after: 150 },
    })
  );

  sections.push(
    new Paragraph({
      text: `報告格式：${isGrouped ? '按內規文件分組' : '按法規條文排列'}`,
      spacing: { after: 300 },
    })
  );

  if (isGrouped) {
    // === 按文件分組格式 ===
    sections.push(
      new Paragraph({
        text: `總計：${data.length} 個內規文件需要修改`,
        spacing: { after: 200 },
      })
    );

    for (let docIndex = 0; docIndex < data.length; docIndex++) {
      const docGroup = data[docIndex];

      // 文件標題
      sections.push(
        new Paragraph({
          text: `文件 ${docIndex + 1}：${docGroup.document}`,
          heading: 'Heading1',
          spacing: { before: 600, after: 300 },
        })
      );

      sections.push(
        new Paragraph({
          text: `文件類型：${docGroup.document_type}`,
          spacing: { after: 100 },
        })
      );

      sections.push(
        new Paragraph({
          text: `修改數量：${docGroup.total_changes} 個`,
          spacing: { after: 300 },
        })
      );

      // 該文件的所有修改建議
      for (let changeIndex = 0; changeIndex < docGroup.changes.length; changeIndex++) {
        const change = docGroup.changes[changeIndex];

        sections.push(
          new Paragraph({
            text: `修改建議 ${changeIndex + 1}`,
            heading: 'Heading2',
            spacing: { before: 400, after: 200 },
          })
        );

        // 建立表格
        const table = new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            // 對應法規修正
            new TableRow({
              children: [
                new TableCell({
                  children: [new Paragraph({ text: '對應法規修正', bold: true })],
                  width: { size: 25, type: WidthType.PERCENTAGE },
                  shading: { fill: 'E3F2FD' },
                }),
                new TableCell({
                  children: [
                    new Paragraph({ 
                      text: change.regulation_source?.substring(0, 200) || '' 
                    }),
                  ],
                  width: { size: 75, type: WidthType.PERCENTAGE },
                }),
              ],
            }),
            // 修改位置
            new TableRow({
              children: [
                new TableCell({
                  children: [new Paragraph({ text: '修改位置', bold: true })],
                  shading: { fill: 'F5F5F5' },
                }),
                new TableCell({
                  children: [
                    new Paragraph({ text: change.target_section || '' }),
                  ],
                }),
              ],
            }),
            // 差異類型
            new TableRow({
              children: [
                new TableCell({
                  children: [new Paragraph({ text: '差異類型', bold: true })],
                  shading: { fill: 'F5F5F5' },
                }),
                new TableCell({
                  children: [
                    new Paragraph({ text: `${change.change_type}` }),
                  ],
                }),
              ],
            }),
            // 修改摘要
            new TableRow({
              children: [
                new TableCell({
                  children: [new Paragraph({ text: '修改摘要', bold: true })],
                  shading: { fill: 'F5F5F5' },
                }),
                new TableCell({
                  children: [
                    new Paragraph({ text: change.diff_summary || '' }),
                  ],
                }),
              ],
            }),
            // 建議修正文
            new TableRow({
              children: [
                new TableCell({
                  children: [new Paragraph({ text: '建議修正文', bold: true })],
                  shading: { fill: 'FFF9C4' },
                }),
                new TableCell({
                  children: [
                    new Paragraph({ text: change.suggestion_text || '' }),
                  ],
                }),
              ],
            }),
            // 理由與依據
            new TableRow({
              children: [
                new TableCell({
                  children: [new Paragraph({ text: '理由與依據', bold: true })],
                  shading: { fill: 'F5F5F5' },
                }),
                new TableCell({
                  children: [
                    new Paragraph({ text: change.reason || '' }),
                  ],
                }),
              ],
            }),
          ],
        });

        sections.push(table);
      }
    }
  } else {
    // === 按法規條文格式（原始格式，保留向後兼容）===
    sections.push(
      new Paragraph({
        text: `總計：${data.length} 條建議`,
        spacing: { after: 300 },
      })
    );

    for (let i = 0; i < data.length; i++) {
      const suggestion = data[i];

      sections.push(
        new Paragraph({
          text: `建議 ${i + 1}`,
          heading: 'Heading2',
          spacing: { before: 400, after: 200 },
        })
      );

      // 建立表格
      const table = new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          // 標題行
          new TableRow({
            children: [
              new TableCell({
                children: [new Paragraph({ text: '項目' })],
                width: { size: 25, type: WidthType.PERCENTAGE },
              }),
              new TableCell({
                children: [new Paragraph({ text: '內容' })],
                width: { size: 75, type: WidthType.PERCENTAGE },
              }),
            ],
          }),
          // 關聯內規文件
          new TableRow({
            children: [
              new TableCell({
                children: [new Paragraph({ text: '關聯內規文件' })],
              }),
              new TableCell({
                children: [
                  new Paragraph({ text: suggestion.file }),
                  new Paragraph({ text: `章節：${suggestion.section}` }),
                ],
              }),
            ],
          }),
          // 對應法規修正
          new TableRow({
            children: [
              new TableCell({
                children: [new Paragraph({ text: '對應法規修正' })],
              }),
              new TableCell({
                children: [
                  new Paragraph({
                    text: `條號：${suggestion.trace?.regulation_anchor || ''}`,
                  }),
                  new Paragraph({ text: `摘要：${suggestion.diff_summary}` }),
                ],
              }),
            ],
          }),
          // 差異辨識
          new TableRow({
            children: [
              new TableCell({
                children: [new Paragraph({ text: '差異辨識' })],
              }),
              new TableCell({
                children: [
                  new Paragraph({ text: `類型：${suggestion.change_type}` }),
                ],
              }),
            ],
          }),
          // 建議修正文
          new TableRow({
            children: [
              new TableCell({
                children: [new Paragraph({ text: '建議修正文' })],
              }),
              new TableCell({
                children: [new Paragraph({ text: suggestion.suggestion_text })],
              }),
            ],
          }),
          // 理由與依據
          new TableRow({
            children: [
              new TableCell({
                children: [new Paragraph({ text: '理由與依據' })],
              }),
              new TableCell({
                children: [new Paragraph({ text: suggestion.reason })],
              }),
            ],
          }),
        ],
      });

      sections.push(table);
    }
  }

  // 建立文件
  const doc = new Document({
    sections: [
      {
        properties: {},
        children: sections,
      },
    ],
  });

  return doc;
}

export default router;

