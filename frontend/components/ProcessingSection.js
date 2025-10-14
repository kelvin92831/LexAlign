'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api';

export default function ProcessingSection({ taskId, onComplete }) {
  const [status, setStatus] = useState('matching'); // matching, generating, completed
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (taskId) {
      processTask();
    }
  }, [taskId]);

  const processTask = async () => {
    try {
      // 步驟 1: 比對
      setStatus('matching');
      setProgress(10);

      await new Promise(resolve => setTimeout(resolve, 500));
      const matchResult = await apiClient.match(taskId, 5);
      
      setProgress(50);
      await new Promise(resolve => setTimeout(resolve, 500));

      // 步驟 2: 生成建議
      setStatus('generating');
      setProgress(60);

      await new Promise(resolve => setTimeout(resolve, 500));
      const suggestResult = await apiClient.generateSuggestions(taskId);
      
      setProgress(90);
      await new Promise(resolve => setTimeout(resolve, 500));

      // 完成
      setStatus('completed');
      setProgress(100);

      await new Promise(resolve => setTimeout(resolve, 1000));
      onComplete(suggestResult.data.suggestions);

    } catch (err) {
      setError(err.message || '處理失敗');
      setStatus('error');
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-8">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            正在分析比對
          </h2>
          <p className="text-gray-600">
            系統正在使用 AI 技術分析法規修訂與內規差異
          </p>
        </div>

        {/* 進度條 */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-700">
              {status === 'matching' && '正在比對內規文件...'}
              {status === 'generating' && '正在生成修改建議...'}
              {status === 'completed' && '分析完成！'}
              {status === 'error' && '處理失敗'}
            </span>
            <span className="text-sm font-medium text-gray-700">
              {progress}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className="bg-primary-600 h-3 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* 處理步驟 */}
        <div className="space-y-4">
          <ProcessStep
            title="RAG 檢索比對"
            description="使用向量資料庫搜尋相關內規段落"
            active={status === 'matching'}
            completed={status !== 'matching' && status !== 'error'}
          />
          <ProcessStep
            title="AI 建議生成"
            description="透過 Gemini 2.5 Pro 生成具體修改建議"
            active={status === 'generating'}
            completed={status === 'completed'}
          />
          <ProcessStep
            title="報告產出"
            description="整理結果並生成可下載的報告"
            active={status === 'completed'}
            completed={status === 'completed'}
          />
        </div>

        {/* 錯誤訊息 */}
        {error && (
          <div className="mt-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-600">❌ {error}</p>
          </div>
        )}

        {/* 載入動畫 */}
        {status !== 'completed' && status !== 'error' && (
          <div className="mt-8 flex justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          </div>
        )}
      </div>
    </div>
  );
}

function ProcessStep({ title, description, active, completed }) {
  return (
    <div className="flex items-start">
      <div className="flex-shrink-0">
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center ${
            completed
              ? 'bg-green-500'
              : active
              ? 'bg-primary-500 animate-pulse'
              : 'bg-gray-300'
          }`}
        >
          {completed ? (
            <span className="text-white text-sm">✓</span>
          ) : (
            <span className="text-white text-sm">•</span>
          )}
        </div>
      </div>
      <div className="ml-4">
        <p className={`font-medium ${active || completed ? 'text-gray-900' : 'text-gray-500'}`}>
          {title}
        </p>
        <p className="text-sm text-gray-500">{description}</p>
      </div>
    </div>
  );
}

