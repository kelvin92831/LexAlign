'use client';

import { useState } from 'react';
import { apiClient } from '@/lib/api';

export default function ResultsSection({ taskId, suggestions, onReset }) {
  const [downloading, setDownloading] = useState(false);
  const [viewMode, setViewMode] = useState('by_document'); // 'by_regulation' or 'by_document'
  const [expandedDoc, setExpandedDoc] = useState(0); // 預設展開第一個文件

  // 按文件分組
  const groupedSuggestions = groupByDocument(suggestions);

  const handleDownload = async (format = 'docx') => {
    setDownloading(true);
    try {
      await apiClient.downloadReport(taskId, format);
    } catch (err) {
      alert('下載失敗：' + err.message);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 標題與操作 */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              修改建議報告
            </h2>
            <p className="text-gray-600">
              共 {suggestions.length} 條建議，涉及 {groupedSuggestions.length} 個內規文件
            </p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={() => handleDownload('docx')}
              disabled={downloading}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:bg-gray-300"
            >
              {downloading ? '下載中...' : '📥 下載 Word'}
            </button>
            <button
              onClick={onReset}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              🔄 重新分析
            </button>
          </div>
        </div>

        {/* 視圖切換 */}
        <div className="flex space-x-2 border-b border-gray-200">
          <button
            onClick={() => setViewMode('by_document')}
            className={`px-4 py-2 font-medium transition-colors ${
              viewMode === 'by_document'
                ? 'border-b-2 border-primary-600 text-primary-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            📁 按文件分組（{groupedSuggestions.length} 個文件）
          </button>
          <button
            onClick={() => setViewMode('by_regulation')}
            className={`px-4 py-2 font-medium transition-colors ${
              viewMode === 'by_regulation'
                ? 'border-b-2 border-primary-600 text-primary-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            📋 按法規條文（{suggestions.length} 條）
          </button>
        </div>
      </div>

      {/* 內容區域 */}
      {viewMode === 'by_document' ? (
        <DocumentGroupedView 
          groupedSuggestions={groupedSuggestions}
          expandedDoc={expandedDoc}
          setExpandedDoc={setExpandedDoc}
        />
      ) : (
        <RegulationView 
          suggestions={suggestions}
        />
      )}
    </div>
  );
}

/**
 * 按文件分組
 */
function groupByDocument(suggestions) {
  const grouped = {};
  
  suggestions.forEach(suggestion => {
    const docName = suggestion.file;
    
    if (!grouped[docName]) {
      grouped[docName] = {
        document: docName,
        document_type: docName.includes('-F') ? '附件範本' : '主規章',
        changes: [],
      };
    }
    
    grouped[docName].changes.push(suggestion);
  });
  
  // 轉換為陣列並排序（修改最多的在前）
  return Object.values(grouped).sort((a, b) => b.changes.length - a.changes.length);
}

/**
 * 按文件分組的視圖
 */
function DocumentGroupedView({ groupedSuggestions, expandedDoc, setExpandedDoc }) {
  return (
    <div className="space-y-4">
      {groupedSuggestions.map((group, groupIndex) => (
        <DocumentCard
          key={groupIndex}
          group={group}
          groupIndex={groupIndex}
          expanded={expandedDoc === groupIndex}
          onToggle={() => setExpandedDoc(expandedDoc === groupIndex ? null : groupIndex)}
        />
      ))}
    </div>
  );
}

/**
 * 文件卡片
 */
function DocumentCard({ group, groupIndex, expanded, onToggle }) {
  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden border-2 border-primary-100">
      {/* 文件標題 */}
      <div
        className="p-5 cursor-pointer hover:bg-gray-50 transition-colors bg-gradient-to-r from-primary-50 to-white"
        onClick={onToggle}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-2">
              <span className="text-lg font-bold text-gray-900">
                📄 {group.document}
              </span>
              <span className="px-3 py-1 text-xs font-semibold rounded-full bg-primary-600 text-white">
                {group.changes.length} 個修改
              </span>
              <span className={`px-2 py-1 text-xs font-medium rounded ${
                group.document_type === '主規章' 
                  ? 'bg-blue-100 text-blue-700' 
                  : 'bg-gray-100 text-gray-700'
              }`}>
                {group.document_type}
              </span>
            </div>
            <p className="text-sm text-gray-600">
              點擊展開查看所有修改建議
            </p>
          </div>
          <button className="ml-4 text-2xl text-gray-400 hover:text-gray-600">
            {expanded ? '▲' : '▼'}
          </button>
        </div>
      </div>

      {/* 展開：修改建議列表 */}
      {expanded && (
        <div className="border-t border-gray-200 bg-gray-50 p-6">
          <div className="space-y-6">
            {group.changes.map((change, index) => (
              <ChangeItem key={index} change={change} index={index} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * 單個修改建議
 */
function ChangeItem({ change, index }) {
  const changeTypeColors = {
    新增: 'bg-green-100 text-green-800 border-green-300',
    修正: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    刪除: 'bg-red-100 text-red-800 border-red-300',
  };

  return (
    <div className="bg-white rounded-lg p-5 border-2 border-gray-200 shadow-sm">
      {/* 標題 */}
      <div className="flex items-center space-x-3 mb-4 pb-3 border-b border-gray-200">
        <span className="text-lg font-semibold text-gray-900">
          修改建議 {index + 1}
        </span>
        <span
          className={`px-3 py-1 text-xs font-semibold rounded border ${
            changeTypeColors[change.change_type] || 'bg-gray-100 text-gray-800 border-gray-300'
          }`}
        >
          {change.change_type}
        </span>
      </div>

      {/* 對應法規 */}
      <div className="mb-4">
        <p className="text-sm font-semibold text-gray-700 mb-2">
          📜 對應法規條文
        </p>
        <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-sm text-blue-900">
            {change.trace?.regulation_anchor?.substring(0, 150)}
            {change.trace?.regulation_anchor?.length > 150 ? '...' : ''}
          </p>
        </div>
      </div>

      {/* 目標章節 */}
      <div className="mb-4">
        <p className="text-sm font-semibold text-gray-700 mb-1">
          🎯 修改位置
        </p>
        <p className="text-sm text-gray-800 font-medium">
          {change.section}
        </p>
      </div>

      {/* 修改摘要 */}
      <div className="mb-4">
        <p className="text-sm font-semibold text-gray-700 mb-2">
          📝 修改摘要
        </p>
        <p className="text-sm text-gray-800 leading-relaxed">
          {change.diff_summary}
        </p>
      </div>

      {/* 建議修正文 */}
      <div className="mb-4">
        <p className="text-sm font-semibold text-gray-700 mb-2">
          ✏️ 建議修正文
        </p>
        <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
          <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
            {change.suggestion_text}
          </p>
        </div>
      </div>

      {/* 理由與依據 */}
      <div>
        <p className="text-sm font-semibold text-gray-700 mb-2">
          💡 理由與依據
        </p>
        <div className="bg-gray-100 rounded-lg p-4">
          <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
            {change.reason}
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * 按法規的視圖（原始格式）
 */
function RegulationView({ suggestions }) {
  const [expandedIndex, setExpandedIndex] = useState(null);

  const toggleExpand = (index) => {
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  return (
    <div className="space-y-4">
      {suggestions.map((suggestion, index) => (
        <RegulationCard
          key={index}
          index={index}
          suggestion={suggestion}
          expanded={expandedIndex === index}
          onToggle={() => toggleExpand(index)}
        />
      ))}
    </div>
  );
}

/**
 * 法規卡片（原始格式）
 */
function RegulationCard({ index, suggestion, expanded, onToggle }) {
  const changeTypeColors = {
    新增: 'bg-green-100 text-green-800',
    修正: 'bg-yellow-100 text-yellow-800',
    刪除: 'bg-red-100 text-red-800',
  };

  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
      {/* 卡片標題 */}
      <div
        className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={onToggle}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-2">
              <span className="text-lg font-semibold text-gray-900">
                建議 {index + 1}
              </span>
              <span
                className={`px-2 py-1 text-xs font-medium rounded ${
                  changeTypeColors[suggestion.change_type] || 'bg-gray-100 text-gray-800'
                }`}
              >
                {suggestion.change_type}
              </span>
            </div>
            <p className="text-sm text-gray-600 mb-1">
              📄 {suggestion.file}
            </p>
            <p className="text-sm text-gray-700 font-medium">
              {suggestion.diff_summary?.substring(0, 100)}
              {suggestion.diff_summary?.length > 100 ? '...' : ''}
            </p>
          </div>
          <button className="ml-4 text-gray-400 hover:text-gray-600">
            {expanded ? '▲' : '▼'}
          </button>
        </div>
      </div>

      {/* 展開內容 */}
      {expanded && (
        <div className="border-t border-gray-200 p-6 space-y-4 bg-gray-50">
          {/* 目標位置 */}
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-2">
              🎯 修改位置
            </h4>
            <p className="text-sm text-gray-800">{suggestion.section}</p>
          </div>

          {/* 建議修正文 */}
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-2">
              📝 建議修正文
            </h4>
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <p className="text-sm text-gray-800 whitespace-pre-wrap">
                {suggestion.suggestion_text}
              </p>
            </div>
          </div>

          {/* 理由與依據 */}
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-2">
              💡 理由與依據
            </h4>
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <p className="text-sm text-gray-700 whitespace-pre-wrap">
                {suggestion.reason}
              </p>
            </div>
          </div>

          {/* 追溯資訊 */}
          <div className="pt-3 border-t border-gray-200">
            <div className="flex items-center space-x-6 text-xs text-gray-500">
              <span>
                🔗 法規錨點：{suggestion.trace?.regulation_anchor?.substring(0, 30)}...
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
