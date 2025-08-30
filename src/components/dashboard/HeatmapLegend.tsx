'use client';

import React, { memo } from 'react';
import { TrendingUp, TrendingDown, MapPin, Users, Clock } from 'lucide-react';

interface HeatmapZone {
  id: string;
  name: string;
  level: 'city' | 'district' | 'street';
  coordinates: Array<{lat: number, lng: number}>;
  supplyDemandRatio: number;
  activeDrivers: number;
  activeRequests: number;
  averageETA: number;
  surgeFactor: number;
  color: 'green' | 'yellow' | 'red' | 'blue';
}

interface HeatmapLegendProps {
  heatmapZones: HeatmapZone[];
  currentZoomLevel: 'city' | 'district' | 'street';
  showLegend: boolean;
  onZoneClick?: (zoneId: string) => void;
}

const HeatmapLegend = memo<HeatmapLegendProps>(({
  heatmapZones,
  currentZoomLevel,
  showLegend,
  onZoneClick
}) => {
  if (!showLegend) return null;

  const getColorIndicator = (color: string) => {
    const colorMap = {
      green: 'bg-green-500',
      yellow: 'bg-yellow-500', 
      red: 'bg-red-500',
      blue: 'bg-blue-500'
    };
    return colorMap[color as keyof typeof colorMap] || 'bg-gray-500';
  };

  const getStatusText = (color: string) => {
    const statusMap = {
      green: 'Optimal',
      yellow: 'Moderate',
      red: 'High Demand',
      blue: 'Low Activity'
    };
    return statusMap[color as keyof typeof statusMap] || 'Unknown';
  };

  const visibleZones = heatmapZones
    .filter(zone => zone.level === currentZoomLevel)
    .slice(0, 6); // Limit to 6 zones for space

  return (
    <div className="absolute bottom-6 left-6 bg-white rounded-xl shadow-lg p-4 border border-slate-200 w-80 max-w-[calc(100vw-3rem)] max-h-96 overflow-hidden z-30">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-bold text-slate-900 flex items-center">
          <MapPin className="w-4 h-4 mr-2 text-blue-600" />
          Heatmap Legend - {currentZoomLevel.charAt(0).toUpperCase() + currentZoomLevel.slice(1)}
        </h4>
      </div>

      <div className="space-y-2">
        {/* Legend Key */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span className="text-slate-600">Optimal (0.8-1.0)</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
            <span className="text-slate-600">Moderate (0.6-0.8)</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
            <span className="text-slate-600">High Demand (&lt;0.6)</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
            <span className="text-slate-600">Low Activity</span>
          </div>
        </div>

        <div className="border-t border-slate-200 pt-3">
          <h5 className="text-xs font-semibold text-slate-700 mb-2">Active Zones</h5>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {visibleZones.map((zone) => (
              <div
                key={zone.id}
                className={`p-2 rounded-lg border transition-all cursor-pointer hover:shadow-sm ${
                  onZoneClick ? 'hover:bg-slate-50' : ''
                }`}
                onClick={() => onZoneClick?.(zone.id)}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center space-x-2">
                    <div className={`w-2 h-2 rounded-full ${getColorIndicator(zone.color)}`}></div>
                    <span className="text-xs font-medium text-slate-900 truncate">
                      {zone.name}
                    </span>
                  </div>
                  <span className="text-xs text-slate-500">
                    {getStatusText(zone.color)}
                  </span>
                </div>
                
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="flex items-center space-x-1">
                    <Users className="w-3 h-3 text-slate-400" />
                    <span className="text-slate-600">{zone.activeDrivers}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Clock className="w-3 h-3 text-slate-400" />
                    <span className="text-slate-600">{zone.averageETA}m</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    {zone.supplyDemandRatio >= 0.8 ? (
                      <TrendingUp className="w-3 h-3 text-green-500" />
                    ) : (
                      <TrendingDown className="w-3 h-3 text-red-500" />
                    )}
                    <span className="text-slate-600">
                      {(zone.supplyDemandRatio * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>

                {zone.surgeFactor > 1 && (
                  <div className="mt-1 text-xs">
                    <span className="bg-orange-100 text-orange-800 px-2 py-0.5 rounded-full font-semibold">
                      {zone.surgeFactor}x Surge
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {heatmapZones.filter(z => z.level === currentZoomLevel).length > 6 && (
          <div className="text-xs text-slate-500 text-center pt-2 border-t border-slate-200">
            +{heatmapZones.filter(z => z.level === currentZoomLevel).length - 6} more zones
          </div>
        )}
      </div>
    </div>
  );
});

HeatmapLegend.displayName = 'HeatmapLegend';

export default HeatmapLegend;