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
    <div className="space-y-6">
      {/* System Metrics Overview */}
      {systemHealth && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">System Metrics</h3>
            <button 
              onClick={onRefreshHealth}
              className="flex items-center px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </button>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">CPU Usage</p>
                  <p className={`text-2xl font-bold ${getMetricColor(systemHealth.cpu)}`}>
                    {systemHealth.cpu}%
                  </p>
                </div>
                <Monitor className="w-8 h-8 text-gray-400" />
              </div>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Memory</p>
                  <p className={`text-2xl font-bold ${getMetricColor(systemHealth.memory)}`}>
                    {systemHealth.memory}%
                  </p>
                </div>
                <Database className="w-8 h-8 text-gray-400" />
              </div>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Disk Usage</p>
                  <p className={`text-2xl font-bold ${getMetricColor(systemHealth.disk)}`}>
                    {systemHealth.disk}%
                  </p>
                </div>
                <Database className="w-8 h-8 text-gray-400" />
              </div>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Requests/min</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {systemHealth.requests}
                  </p>
                </div>
                <TrendingUp className="w-8 h-8 text-gray-400" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Services Status */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Service Status</h3>
        
        <div className="space-y-4">
          {systemServices.map((service) => (
            <div 
              key={service.id}
              className={`p-4 rounded-lg border-2 ${getStatusBg(service.status)}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {service.status === 'online' ? (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  ) : service.status === 'degraded' ? (
                    <AlertCircle className="w-5 h-5 text-yellow-600" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-red-600" />
                  )}
                  
                  <div>
                    <h4 className="font-medium text-gray-900">{service.name}</h4>
                    <p className={`text-sm ${getStatusColor(service.status)}`}>
                      {service.status.charAt(0).toUpperCase() + service.status.slice(1)}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-4">
                  <div className="text-right text-sm text-gray-600">
                    <p>Uptime: {Math.round(service.uptime)}%</p>
                    <p>Response: {service.responseTime}ms</p>
                  </div>
                  
                  {service.status !== 'online' && (
                    <button 
                      onClick={() => onRestartService(service.id)}
                      className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                    >
                      Restart
                    </button>
                  )}
                </div>
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