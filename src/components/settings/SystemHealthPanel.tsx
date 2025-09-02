'use client';

import React, { memo } from 'react';
import { 
  Activity, 
  CheckCircle, 
  AlertCircle, 
  RefreshCw, 
  Database,
  Monitor,
  TrendingUp
} from 'lucide-react';

interface SystemService {
  id: string;
  name: string;
  status: 'online' | 'offline' | 'degraded';
  uptime: number;
  responseTime: number;
  lastCheck: Date;
}

interface SystemHealthMetrics {
  cpu: number;
  memory: number;
  disk: number;
  network: number;
  requests: number;
  errors: number;
  uptime: number;
}

interface SystemHealthPanelProps {
  systemHealth: SystemHealthMetrics | null;
  systemServices: SystemService[];
  loading: boolean;
  onRefreshHealth: () => void;
  onRestartService: (serviceId: string) => void;
}

const SystemHealthPanel = memo<SystemHealthPanelProps>(({
  systemHealth,
  systemServices,
  loading,
  onRefreshHealth,
  onRestartService
}) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'text-green-600';
      case 'offline': return 'text-red-600';
      case 'degraded': return 'text-yellow-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusBg = (status: string) => {
    switch (status) {
      case 'online': return 'bg-green-50 border-green-200';
      case 'offline': return 'bg-red-50 border-red-200';
      case 'degraded': return 'bg-yellow-50 border-yellow-200';
      default: return 'bg-gray-50 border-gray-200';
    }
  };

  const getMetricColor = (value: number, threshold: number = 80) => {
    if (value >= threshold) return 'text-red-600';
    if (value >= threshold * 0.7) return 'text-yellow-600';
    return 'text-green-600';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
        <span className="ml-2">Loading system health...</span>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header with refresh */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">System Health</h2>
        <button
          onClick={onRefreshHealth}
          disabled={loading}
          className="flex items-center px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* System Metrics - Compact Cards */}
      {systemHealth && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-3 bg-gray-50/50 rounded-lg">
            <p className="text-xs font-medium text-gray-600 mb-1">CPU Usage</p>
            <p className={`text-lg font-bold ${getMetricColor(systemHealth.cpu)}`}>{systemHealth.cpu}%</p>
          </div>
          
          <div className="p-3 bg-gray-50/50 rounded-lg">
            <p className="text-xs font-medium text-gray-600 mb-1">Memory</p>
            <p className={`text-lg font-bold ${getMetricColor(systemHealth.memory)}`}>{systemHealth.memory}%</p>
          </div>

          <div className="p-3 bg-gray-50/50 rounded-lg">
            <p className="text-xs font-medium text-gray-600 mb-1">Disk Usage</p>
            <p className={`text-lg font-bold ${getMetricColor(systemHealth.disk)}`}>{systemHealth.disk}%</p>
          </div>

          <div className="p-3 bg-gray-50/50 rounded-lg">
            <p className="text-xs font-medium text-gray-600 mb-1">Requests</p>
            <p className="text-lg font-bold text-blue-600">{systemHealth.requests.toLocaleString()}</p>
          </div>
        </div>
      )}

      {/* System Services - Minimal List */}
      <div>
        <h3 className="text-sm font-medium text-gray-900 mb-3">System Services</h3>
        <div className="space-y-2">
          {systemServices.map((service) => (
            <div key={service.id} className="flex items-center justify-between p-4 bg-gray-50/50 hover:bg-gray-100/50 rounded-lg transition-colors">
              <div className="flex items-center gap-3 flex-1">
                <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center">
                  {service.status === 'online' ? (
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  ) : service.status === 'degraded' ? (
                    <AlertCircle className="w-4 h-4 text-yellow-600" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-red-600" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900 truncate">{service.name}</p>
                  <p className="text-xs text-gray-500">
                    {service.uptime}% uptime • {service.responseTime}ms
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  service.status === 'online' 
                    ? 'bg-green-100 text-green-700' 
                    : service.status === 'degraded'
                    ? 'bg-yellow-100 text-yellow-700'
                    : 'bg-red-100 text-red-700'
                }`}>
                  {service.status}
                </span>
                
                {service.status !== 'online' && (
                  <button
                    onClick={() => onRestartService(service.id)}
                    className="px-2 py-1 text-xs text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 transition-colors"
                  >
                    Restart
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});

SystemHealthPanel.displayName = 'SystemHealthPanel';

export default SystemHealthPanel;