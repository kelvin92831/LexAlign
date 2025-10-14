'use client';

import { useState } from 'react';
import UploadSection from '@/components/UploadSection';
import ProcessingSection from '@/components/ProcessingSection';
import ResultsSection from '@/components/ResultsSection';

export default function Home() {
  const [taskId, setTaskId] = useState(null);
  const [stage, setStage] = useState('upload'); // upload, processing, results
  const [suggestions, setSuggestions] = useState([]);

  const handleUploadComplete = (newTaskId) => {
    setTaskId(newTaskId);
    setStage('processing');
  };

  const handleProcessingComplete = (results) => {
    setSuggestions(results);
    setStage('results');
  };

  const handleReset = () => {
    setTaskId(null);
    setStage('upload');
    setSuggestions([]);
  };

  return (
    <div className="space-y-8">
      {/* 進度指示器 */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between">
          <Step 
            number={1} 
            title="上傳文件" 
            active={stage === 'upload'} 
            completed={stage !== 'upload'}
          />
          <div className="flex-1 h-1 bg-gray-200 mx-4">
            <div 
              className={`h-full transition-all duration-500 ${
                stage !== 'upload' ? 'bg-primary-500' : 'bg-gray-200'
              }`}
            />
          </div>
          <Step 
            number={2} 
            title="比對分析" 
            active={stage === 'processing'} 
            completed={stage === 'results'}
          />
          <div className="flex-1 h-1 bg-gray-200 mx-4">
            <div 
              className={`h-full transition-all duration-500 ${
                stage === 'results' ? 'bg-primary-500' : 'bg-gray-200'
              }`}
            />
          </div>
          <Step 
            number={3} 
            title="查看結果" 
            active={stage === 'results'} 
            completed={false}
          />
        </div>
      </div>

      {/* 內容區域 */}
      {stage === 'upload' && (
        <UploadSection onComplete={handleUploadComplete} />
      )}

      {stage === 'processing' && (
        <ProcessingSection 
          taskId={taskId} 
          onComplete={handleProcessingComplete}
        />
      )}

      {stage === 'results' && (
        <ResultsSection 
          taskId={taskId}
          suggestions={suggestions}
          onReset={handleReset}
        />
      )}
    </div>
  );
}

function Step({ number, title, active, completed }) {
  return (
    <div className="flex items-center">
      <div
        className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-colors ${
          completed
            ? 'bg-primary-500 text-white'
            : active
            ? 'bg-primary-500 text-white'
            : 'bg-gray-200 text-gray-500'
        }`}
      >
        {completed ? '✓' : number}
      </div>
      <span
        className={`ml-3 text-sm font-medium ${
          active || completed ? 'text-gray-900' : 'text-gray-500'
        }`}
      >
        {title}
      </span>
    </div>
  );
}

