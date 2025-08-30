'use client';

import React, { memo } from 'react';
import { Zap } from 'lucide-react';
import type { AIAnomalies } from '@/types/dashboard';

interface AIPredictionsPanelProps {
  aiAnomalies: AIAnomalies;
  lastUpdate: Date;
  refreshInterval: number;
  autoRefresh: boolean;
}

const AIPredictionsPanel = memo<AIPredictionsPanelProps>(({ 
  aiAnomalies, 
  lastUpdate, 
  refreshInterval, 
  autoRefresh 
}) => {
  const getNextUpdateTime = () => {
    return Math.max(0, refreshInterval - Math.floor((Date.now() - lastUpdate.getTime()) / 1000));
  };

  return (
    <div className="absolute top-6 right-6 bg-white rounded-xl shadow-lg p-4 border border-slate-200 w-80 max-w-[calc(100vw-3rem)] max-h-96 overflow-hidden z-30">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-bold text-slate-900 flex items-center">
          <Zap className="w-4 h-4 mr-2 text-blue-600" />
          AI Predictions
        </h4>
        <div className={`w-2 h-2 rounded-full ${autoRefresh ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
      </div>
      <div className="space-y-3">
        <div className="text-xs text-slate-600">
          <strong>Predicted Hotspots:</strong>
        </div>
        {aiAnomalies.predictedHotspots.map((hotspot, index) => (
          <div key={`${hotspot}-${lastUpdate.getTime()}`} className="flex items-center justify-between text-sm transition-all duration-300">
            <span className="text-slate-700 truncate flex-1 mr-2">{hotspot}</span>
            <span className="text-orange-600 font-medium flex-shrink-0">
              +{Math.floor(20 + index * 5 + (Date.now() % 1000) / 100)}%
            </span>
          </div>
        ))}
        <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            Next update in {getNextUpdateTime()}s
          </div>
          <div className="text-xs text-blue-600 font-medium">
            AI Active
          </div>
        </div>
      </div>
    </div>
  );
});

AIPredictionsPanel.displayName = 'AIPredictionsPanel';

export default AIPredictionsPanel;