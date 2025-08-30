import { useState, useCallback, useEffect } from 'react';
import type { KPITile, AIAnomalies } from '@/types/dashboard';

export const useKPIDashboard = () => {
  const [kpiTiles, setKpiTiles] = useState<KPITile[]>([
    {
      id: 'supply-demand',
      title: 'Supply/Demand Balance',
      value: 87,
      status: 'optimal',
      trend: 'up',
      unit: '%',
      description: 'Balanced supply and demand across all zones',
      drillDownData: {
        zones: [
          { name: 'Metro Manila', ratio: 0.92, status: 'optimal' },
          { name: 'Cebu', ratio: 0.85, status: 'optimal' },
          { name: 'Davao', ratio: 0.79, status: 'caution' }
        ]
      }
    },
    {
      id: 'average-eta',
      title: 'Average ETA',
      value: 4.2,
      status: 'optimal',
      trend: 'stable',
      unit: 'min',
      description: 'AI-predicted arrival times across all bookings',
      drillDownData: {
        breakdown: [
          { timeOfDay: 'Peak Hours', eta: 6.1, status: 'caution' },
          { timeOfDay: 'Off-Peak', eta: 3.2, status: 'optimal' },
          { timeOfDay: 'Late Night', eta: 2.8, status: 'optimal' }
        ]
      }
    },
    {
      id: 'cancellation-rate',
      title: 'Cancellation Rate',
      value: 8.3,
      status: 'caution',
      trend: 'down',
      unit: '%',
      description: 'Cancellations trending down from AI interventions',
      drillDownData: {
        reasons: [
          { reason: 'Long Wait Time', percentage: 45, trend: 'down' },
          { reason: 'Driver No-Show', percentage: 30, trend: 'stable' },
          { reason: 'Route Issues', percentage: 25, trend: 'down' }
        ]
      }
    },
    {
      id: 'active-sos',
      title: 'Active SOS',
      value: 2,
      status: 'critical',
      trend: 'stable',
      unit: 'alerts',
      description: 'Critical emergency incidents requiring immediate response',
      drillDownData: {
        incidents: [
          { type: 'Medical Emergency', location: 'BGC', time: '2 min ago', priority: 'critical' },
          { type: 'Vehicle Breakdown', location: 'Makati', time: '5 min ago', priority: 'high' }
        ]
      }
    }
  ]);

  const [kpiDrillDown, setKpiDrillDown] = useState<string | null>(null);

  const [aiAnomalies, setAiAnomalies] = useState<AIAnomalies>({
    predictedHotspots: ['BGC Taguig', 'Makati CBD', 'Ortigas Center'],
    idleDriversOver20Min: 12,
    highCancellationClusters: 3,
    offlineAfterLogin: 8,
    averageBookingETA: 4.2,
    surgeAreas: ['BGC', 'Makati', 'QC Triangle'],
    peakHourPredictions: {
      morning: { start: '07:00', end: '10:00', demandIncrease: 45 },
      evening: { start: '17:00', end: '20:00', demandIncrease: 38 }
    }
  });

  // Simulate real-time KPI updates
  const updateKPIs = useCallback(async () => {
    // Simulate API call to update KPIs
    setKpiTiles(prev => prev.map(tile => {
      const variation = (Math.random() - 0.5) * 0.1; // ±5% variation
      
      if (typeof tile.value === 'number') {
        const newValue = Math.max(0, tile.value * (1 + variation));
        let newStatus = tile.status;
        
        // Update status based on thresholds
        if (tile.id === 'supply-demand') {
          newStatus = newValue >= 80 ? 'optimal' : newValue >= 60 ? 'caution' : 'critical';
        } else if (tile.id === 'cancellation-rate') {
          newStatus = newValue <= 10 ? 'optimal' : newValue <= 15 ? 'caution' : 'critical';
        } else if (tile.id === 'average-eta') {
          newStatus = newValue <= 5 ? 'optimal' : newValue <= 8 ? 'caution' : 'critical';
        }
        
        return {
          ...tile,
          value: Math.round(newValue * 10) / 10,
          status: newStatus,
          trend: newValue > tile.value ? 'up' : newValue < tile.value ? 'down' : 'stable'
        };
      }
      
      return tile;
    }));

    // Update AI anomalies
    setAiAnomalies(prev => ({
      ...prev,
      idleDriversOver20Min: Math.max(0, prev.idleDriversOver20Min + Math.floor((Math.random() - 0.5) * 4)),
      highCancellationClusters: Math.max(0, prev.highCancellationClusters + Math.floor((Math.random() - 0.5) * 2)),
      offlineAfterLogin: Math.max(0, prev.offlineAfterLogin + Math.floor((Math.random() - 0.5) * 3))
    }));
  }, []);

  const handleKPIClick = useCallback((kpiId: string) => {
    setKpiDrillDown(kpiId === kpiDrillDown ? null : kpiId);
  }, [kpiDrillDown]);

  return {
    kpiTiles,
    kpiDrillDown,
    aiAnomalies,
    updateKPIs,
    handleKPIClick
  };
};