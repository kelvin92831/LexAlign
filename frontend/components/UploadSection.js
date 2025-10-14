'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api';

export default function UploadSection({ onComplete }) {
  const [regulationFile, setRegulationFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [uploadStats, setUploadStats] = useState(null);
  const [folderInfo, setFolderInfo] = useState(null);
  const [checking, setChecking] = useState(true);

  // 載入時檢查內規資料夾
  useEffect(() => {
    checkFolder();
  }, []);

  const checkFolder = async () => {
    try {
      setChecking(true);
      const result = await apiClient.checkPolicyFolder();
      setFolderInfo(result.data);
    } catch (err) {
      console.error('檢查資料夾失敗:', err);
      setError('無法連接後端服務');
    } finally {
      setChecking(false);
    }
  };

  const handleRegulationChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setRegulationFile(file);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!regulationFile) {
      setError('請上傳法規修正對照表');
      return;
    }

    if (!folderInfo || !folderInfo.exists || folderInfo.fileCount === 0) {
      setError('找不到內規文件資料夾或資料夾為空');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      // 1. 上傳法規文件
      const regulationResult = await apiClient.uploadRegulation(regulationFile);
      const taskId = regulationResult.data.taskId;

      // 2. 自動載入內規文件
      const policyResult = await apiClient.autoLoadPolicies();

      setUploadStats({
        regulationItems: regulationResult.data.itemCount,
        policyDocuments: policyResult.data.succeeded,
        totalChunks: policyResult.data.results.reduce(
          (sum, r) => sum + (r.chunkCount || 0),
          0
        ),
      });

      // 完成，進入下一階段
      setTimeout(() => {
        onComplete(taskId);
      }, 1000);
    } catch (err) {
      setError(err.message || '處理失敗，請重試');
      setUploading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          上傳文件
        </h2>
        <p className="text-gray-600">
          上傳法規修正對照表，系統將自動載入內規文件進行比對
        </p>
      </div>

      {/* 內規資料夾狀態 */}
      {checking ? (
        <div className="rounded-lg p-4 bg-gray-50 border border-gray-200">
          <p className="text-sm text-gray-600">
            🔍 正在檢查內規資料夾...
          </p>
        </div>
      ) : folderInfo ? (
        <div className={`rounded-lg p-4 ${
          folderInfo.exists && folderInfo.fileCount > 0
            ? 'bg-green-50 border border-green-200'
            : 'bg-yellow-50 border border-yellow-200'
        }`}>
          <div className="flex items-start">
            <div className="flex-1">
              <h3 className="text-sm font-semibold mb-2">
                📁 內規文件資料夾狀態
              </h3>
              {folderInfo.exists ? (
                <>
                  <p className="text-sm text-gray-700 mb-1">
                    ✅ 已找到 <span className="font-semibold">{folderInfo.fileCount}</span> 個內規文件
                  </p>
                  <details className="text-xs text-gray-600 mt-2">
                    <summary className="cursor-pointer hover:text-gray-800 font-medium">
                      查看檔案列表 ({folderInfo.files.length} 個檔案)
                    </summary>
                    <ul className="mt-2 space-y-1 pl-4">
                      {folderInfo.files.map((file, index) => (
                        <li key={index} className="list-disc">
                          {file}
                        </li>
                      ))}
                    </ul>
                  </details>
                  {folderInfo.vectorDbDocuments > 0 && (
                    <p className="text-xs text-blue-600 mt-2">
                      💾 向量資料庫已有 {folderInfo.vectorDbDocuments} 個文件片段
                    </p>
                  )}
                </>
              ) : (
                <>
                  <p className="text-sm text-yellow-700 mb-1">
                    ⚠️ 找不到內規資料夾
                  </p>
                  <p className="text-xs text-yellow-600 mt-1">
                    路徑：{folderInfo.path}
                  </p>
                </>
              )}
            </div>
            <button
              onClick={checkFolder}
              disabled={checking}
              className="ml-2 text-xs px-3 py-1 rounded bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors"
            >
              🔄 重新檢查
            </button>
          </div>
        </div>
      ) : null}

      {/* 法規文件上傳 */}
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              法規修正對照表
            </h3>
            <p className="text-sm text-gray-500">
              上傳主管機關公告的法規修正對照表（.docx 格式）
            </p>
          </div>
          {regulationFile && (
            <span className="text-sm text-green-600 font-medium">
              ✓ 已選擇檔案
            </span>
          )}
        </div>
        <input
          type="file"
          accept=".docx"
          onChange={handleRegulationChange}
          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100 cursor-pointer"
        />
        {regulationFile && (
          <p className="mt-2 text-sm text-gray-600">
            📄 {regulationFile.name}
          </p>
        )}
      </div>

      {/* 錯誤訊息 */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-600">❌ {error}</p>
        </div>
      )}

      {/* 上傳統計 */}
      {uploadStats && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-sm text-green-800 font-medium mb-2">
            ✓ 處理成功！
          </p>
          <ul className="text-sm text-green-700 space-y-1">
            <li>• 法規修正項目：{uploadStats.regulationItems} 條</li>
            <li>• 內規文件：{uploadStats.policyDocuments} 份</li>
            <li>• 文件片段：{uploadStats.totalChunks} 個</li>
          </ul>
        </div>
      )}

      {/* 上傳按鈕 */}
      <button
        onClick={handleUpload}
        disabled={uploading || !regulationFile || !folderInfo?.exists || folderInfo?.fileCount === 0}
        className={`w-full py-3 px-4 rounded-lg font-semibold text-white transition-colors ${
          uploading || !regulationFile || !folderInfo?.exists || folderInfo?.fileCount === 0
            ? 'bg-gray-300 cursor-not-allowed'
            : 'bg-primary-600 hover:bg-primary-700'
        }`}
      >
        {uploading ? '處理中...' : '開始分析'}
      </button>

      {!folderInfo?.exists && !checking && (
        <p className="text-xs text-center text-gray-500">
          請確保專案的 <code className="bg-gray-100 px-1 py-0.5 rounded">data/internal_rules</code> 資料夾存在且包含內規文件
        </p>
      )}
    </div>
  );
}
