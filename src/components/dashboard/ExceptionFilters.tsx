'use client';

import React, { memo } from 'react';
import { 
  AlertTriangle, 
  Clock, 
  X, 
  Radio, 
  Users, 
  Shield 
} from 'lucide-react';
import type { UserRole, ExceptionFilters, AIAnomalies, EmergencyIncident } from '@/types/dashboard';

interface ExceptionFiltersProps {
  userRole: UserRole;
  filters: ExceptionFilters;
  aiAnomalies: AIAnomalies;
  emergencyIncidents: EmergencyIncident[];
  onFilterChange: (filters: ExceptionFilters) => void;
}

const ExceptionFiltersComponent = memo<ExceptionFiltersProps>(({ 
  userRole, 
  filters, 
  aiAnomalies, 
  emergencyIncidents, 
  onFilterChange 
}) => {
  const updateFilter = (key: keyof ExceptionFilters) => {
    onFilterChange({
      ...filters,
      [key]: !filters[key]
    });
  };

  const dispatcherFilters = (
    <>
      <button
        onClick={() => updateFilter('sosActive')}
        className={`w-full flex items-center justify-between p-3 rounded-lg border-2 transition-all ${
          filters.sosActive ? 'border-red-300 bg-red-50' : 'border-slate-200 hover:bg-slate-50'
        }`}
      >
        <div className="flex items-center space-x-3">
          <AlertTriangle className="w-4 h-4 text-red-600" />
          <span className="font-medium text-slate-900">🚨 SOS Active</span>
        </div>
        <span className="bg-red-600 text-white text-xs px-2 py-1 rounded-full font-semibold">
          {emergencyIncidents.filter(i => i.status === 'active').length}
        </span>
      </button>

      <button
        onClick={() => updateFilter('idleDrivers')}
        className={`w-full flex items-center justify-between p-3 rounded-lg border-2 transition-all ${
          filters.idleDrivers ? 'border-orange-300 bg-orange-50' : 'border-slate-200 hover:bg-slate-50'
        }`}
      >
        <div className="flex items-center space-x-3">
          <Clock className="w-4 h-4 text-orange-600" />
          <span className="font-medium text-slate-900">🕒 Idle &gt;20min</span>
        </div>
        <span className="bg-orange-600 text-white text-xs px-2 py-1 rounded-full font-semibold">
          {aiAnomalies.idleDriversOver20Min}
        </span>
      </button>

      <button
        onClick={() => updateFilter('highCancellations')}
        className={`w-full flex items-center justify-between p-3 rounded-lg border-2 transition-all ${
          filters.highCancellations ? 'border-yellow-300 bg-yellow-50' : 'border-slate-200 hover:bg-slate-50'
        }`}
      >
        <div className="flex items-center space-x-3">
          <X className="w-4 h-4 text-yellow-600" />
          <span className="font-medium text-slate-900">❌ High Cancellations</span>
        </div>
        <span className="bg-yellow-600 text-white text-xs px-2 py-1 rounded-full font-semibold">
          {aiAnomalies.highCancellationClusters}
        </span>
      </button>

      <button
        onClick={() => updateFilter('offlineAfterLogin')}
        className={`w-full flex items-center justify-between p-3 rounded-lg border-2 transition-all ${
          filters.offlineAfterLogin ? 'border-gray-300 bg-gray-50' : 'border-slate-200 hover:bg-slate-50'
        }`}
      >
        <div className="flex items-center space-x-3">
          <Radio className="w-4 h-4 text-gray-600" />
          <span className="font-medium text-slate-900">⚠️ Offline After Login</span>
        </div>
        <span className="bg-gray-600 text-white text-xs px-2 py-1 rounded-full font-semibold">
          {aiAnomalies.offlineAfterLogin}
        </span>
      </button>
    </>
  );

  const opsManagerFilters = (
    <>
      <button
        onClick={() => updateFilter('laborAttendance')}
        className={`w-full flex items-center justify-between p-3 rounded-lg border-2 transition-all ${
          filters.laborAttendance ? 'border-blue-300 bg-blue-50' : 'border-slate-200 hover:bg-slate-50'
        }`}
      >
        <div className="flex items-center space-x-3">
          <Users className="w-4 h-4 text-blue-600" />
          <span className="font-medium text-slate-900">Labor Attendance</span>
        </div>
        <span className="bg-blue-600 text-white text-xs px-2 py-1 rounded-full font-semibold">
          94%
        </span>
      </button>

      <button
        onClick={() => updateFilter('ltfrbCompliance')}
        className={`w-full flex items-center justify-between p-3 rounded-lg border-2 transition-all ${
          filters.ltfrbCompliance ? 'border-green-300 bg-green-50' : 'border-slate-200 hover:bg-slate-50'
        }`}
      >
        <div className="flex items-center space-x-3">
          <Shield className="w-4 h-4 text-green-600" />
          <span className="font-medium text-slate-900">LTFRB Compliance</span>
        </div>
        <span className="bg-green-600 text-white text-xs px-2 py-1 rounded-full font-semibold">
          98%
        </span>
      </button>

      <button
        onClick={() => updateFilter('cancellationClusters')}
        className={`w-full flex items-center justify-between p-3 rounded-lg border-2 transition-all ${
          filters.cancellationClusters ? 'border-orange-300 bg-orange-50' : 'border-slate-200 hover:bg-slate-50'
        }`}
      >
        <div className="flex items-center space-x-3">
          <AlertTriangle className="w-4 h-4 text-orange-600" />
          <span className="font-medium text-slate-900">Cancellation Clusters</span>
        </div>
        <span className="bg-orange-600 text-white text-xs px-2 py-1 rounded-full font-semibold">
          {aiAnomalies.highCancellationClusters}
        </span>
      </button>
    </>
  );

  return (
    <div className="p-6 border-b border-slate-200">
      <h3 className="text-sm font-bold text-slate-900 mb-4 uppercase tracking-wider">
        {userRole === 'dispatcher' ? 'Dispatcher Filters' : 'Compliance Filters'}
      </h3>
      
      <div className="space-y-3">
        {userRole === 'dispatcher' ? dispatcherFilters : opsManagerFilters}
      </div>
    </div>
  );
});

ExceptionFiltersComponent.displayName = 'ExceptionFilters';

export default ExceptionFiltersComponent;