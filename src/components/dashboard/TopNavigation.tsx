'use client';

import React, { memo } from 'react';
import { RefreshCw, Settings, Layers, Eye, EyeOff, Plus, Minus } from 'lucide-react';
import type { ViewMode } from '@/types/dashboard';

interface TopNavigationProps {
  viewMode: ViewMode;
  currentZoomLevel: 'city' | 'district' | 'street';
  autoRefresh: boolean;
  refreshInterval: number;
  showHeatmap: boolean;
  showDrivers: boolean;
  onViewModeChange: (mode: ViewMode) => void;
  onZoomChange: (level: 'city' | 'district' | 'street') => void;
  onAutoRefreshToggle: () => void;
  onRefreshIntervalChange: (interval: number) => void;
  onHeatmapToggle: () => void;
  onDriverToggle: () => void;
  onManualRefresh: () => void;
}

const TopNavigation = memo<TopNavigationProps>(({
  viewMode,
  currentZoomLevel,
  autoRefresh,
  refreshInterval,
  showHeatmap,
  showDrivers,
  onViewModeChange,
  onZoomChange,
  onAutoRefreshToggle,
  onRefreshIntervalChange,
  onHeatmapToggle,
  onDriverToggle,
  onManualRefresh
}) => {
  const zoomLevels = [
    { key: 'city' as const, label: 'City' },
    { key: 'district' as const, label: 'District' },
    { key: 'street' as const, label: 'Street' }
  ];

  const refreshIntervals = [3, 5, 10, 30];

  return (
    <div className="absolute top-6 left-6 right-6 z-20">
      <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-4">
        <div className="flex items-center justify-between">
          {/* Left: View Controls */}
          <div className="flex items-center space-x-4">
            {/* View Mode Toggle */}
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-slate-700">View:</label>
              <div className="bg-slate-100 p-1 rounded-lg flex">
                <button
                  onClick={() => onViewModeChange('compact')}
                  className={`px-3 py-1 text-xs font-medium rounded transition-all ${
                    viewMode === 'compact' 
                      ? 'bg-white text-slate-900 shadow-sm' 
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Compact
                </button>
                <button
                  onClick={() => onViewModeChange('detailed')}
                  className={`px-3 py-1 text-xs font-medium rounded transition-all ${
                    viewMode === 'detailed' 
                      ? 'bg-white text-slate-900 shadow-sm' 
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Detailed
                </button>
              </div>
            </div>

            {/* Zoom Level Controls */}
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-slate-700">Zoom:</label>
              <div className="flex items-center space-x-1">
                {zoomLevels.map((level) => (
                  <button
                    key={level.key}
                    onClick={() => onZoomChange(level.key)}
                    className={`px-3 py-1 text-xs font-medium rounded border transition-all ${
                      currentZoomLevel === level.key
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {level.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Center: Layer Toggles */}
          <div className="flex items-center space-x-3">
            <button
              onClick={onHeatmapToggle}
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg border transition-all ${
                showHeatmap
                  ? 'bg-orange-50 border-orange-200 text-orange-700'
                  : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span className="text-sm font-medium">Heatmap</span>
            </button>
            <button
              onClick={onDriverToggle}
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg border transition-all ${
                showDrivers
                  ? 'bg-blue-50 border-blue-200 text-blue-700'
                  : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
              }`}
            >
              {showDrivers ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              <span className="text-sm font-medium">Drivers</span>
            </button>
          </div>

          {/* Right: Refresh Controls */}
          <div className="flex items-center space-x-4">
            {/* Auto Refresh Toggle */}
            <div className="flex items-center space-x-2">
              <button
                onClick={onAutoRefreshToggle}
                className={`flex items-center space-x-2 px-3 py-2 rounded-lg border transition-all ${
                  autoRefresh
                    ? 'bg-green-50 border-green-200 text-green-700'
                    : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
              >
                <RefreshCw className={`w-4 h-4 ${autoRefresh ? 'animate-spin' : ''}`} />
                <span className="text-sm font-medium">
                  {autoRefresh ? 'Auto' : 'Manual'}
                </span>
              </button>
            </div>

            {/* Refresh Interval */}
            {autoRefresh && (
              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium text-slate-700">Every:</label>
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => onRefreshIntervalChange(Math.max(3, refreshInterval - 5))}
                    disabled={refreshInterval <= 3}
                    className="p-1 text-slate-600 hover:text-slate-900 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="text-sm font-medium text-slate-900 w-8 text-center">
                    {refreshInterval}s
                  </span>
                  <button
                    onClick={() => onRefreshIntervalChange(Math.min(30, refreshInterval + 5))}
                    disabled={refreshInterval >= 30}
                    className="p-1 text-slate-600 hover:text-slate-900 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              </div>
            )}

            {/* Manual Refresh Button */}
            {!autoRefresh && (
              <button
                onClick={onManualRefresh}
                className="flex items-center space-x-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all"
              >
                <RefreshCw className="w-4 h-4" />
                <span className="text-sm font-medium">Refresh</span>
              </button>
            )}

            {/* Settings Button */}
            <button className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all">
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});

TopNavigation.displayName = 'TopNavigation';

export default TopNavigation;