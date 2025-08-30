'use client';

import React, { memo } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { KPITile, KPIStatus } from '@/types/dashboard';

interface KPIDashboardProps {
  tiles: KPITile[];
  drillDown: string | null;
  onKPIClick: (kpiId: string) => void;
}

const KPIDashboard = memo<KPIDashboardProps>(({ tiles, drillDown, onKPIClick }) => {
  const getKPIColor = (status: KPIStatus): string => {
    switch (status) {
      case 'optimal': return 'border-green-300 bg-green-50 text-green-800';
      case 'caution': return 'border-yellow-300 bg-yellow-50 text-yellow-800';
      case 'critical': return 'border-red-300 bg-red-50 text-red-800';
    }
  };

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up': return <TrendingUp className="w-4 h-4 text-green-600" />;
      case 'down': return <TrendingDown className="w-4 h-4 text-red-600" />;
      case 'stable': return <Minus className="w-4 h-4 text-gray-600" />;
    }
  };

  return (
    <div className="p-6 border-b border-slate-200">
      <h3 className="text-sm font-bold text-slate-900 mb-4 uppercase tracking-wider">
        Key Performance Indicators
      </h3>
      <div className="grid grid-cols-2 gap-3">
        {tiles.map((tile) => (
          <div
            key={tile.id}
            onClick={() => onKPIClick(tile.id)}
            className={`p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 hover:scale-105 hover:shadow-md ${getKPIColor(tile.status)}`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold opacity-80">{tile.title}</span>
              {getTrendIcon(tile.trend)}
            </div>
            <div className="text-2xl font-bold mb-1">
              {tile.value}{tile.unit}
            </div>
            <div className="text-xs opacity-70 truncate">
              {tile.description}
            </div>
          </div>
        ))}
      </div>

      {/* KPI Drill-down */}
      {drillDown && (
        <div className="mt-4 p-4 bg-slate-50 rounded-xl border">
          <h4 className="text-sm font-semibold mb-3">
            {tiles.find(t => t.id === drillDown)?.title} Details
          </h4>
          <div className="text-sm text-slate-600">
            Detailed analytics and breakdowns would appear here
          </div>
        </div>
      )}
    </div>
  );
});

KPIDashboard.displayName = 'KPIDashboard';

export default KPIDashboard;