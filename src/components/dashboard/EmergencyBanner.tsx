'use client';

import React, { memo } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import type { EmergencyIncident, SafetyStage } from '@/types/dashboard';

interface EmergencyBannerProps {
  emergencyIncidents: EmergencyIncident[];
  onRespond: (incident: EmergencyIncident) => void;
  onClose: () => void;
}

const EmergencyBanner = memo<EmergencyBannerProps>(({ emergencyIncidents, onRespond, onClose }) => {
  const criticalIncidents = emergencyIncidents.filter(i => i.status === 'active' && i.priority === 'critical');
  
  if (criticalIncidents.length === 0) {
    return null;
  }

  const primaryIncident = criticalIncidents[0];

  return (
    <div className="fixed top-0 left-0 right-0 bg-red-600 text-white z-50 px-4 py-3 shadow-lg">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5 animate-pulse" />
            <span className="font-bold text-base">CRITICAL EMERGENCY</span>
            <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full font-semibold">
              {criticalIncidents.length}
            </span>
          </div>
          <div className="text-sm">
            {primaryIncident.description} - {primaryIncident.location.address}
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button 
            onClick={() => onRespond(primaryIncident)}
            className="bg-red-500 hover:bg-red-400 px-4 py-1 rounded-md text-sm font-semibold transition-colors"
          >
            RESPOND
          </button>
          <button 
            onClick={onClose}
            className="text-red-100 hover:text-white p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
});

EmergencyBanner.displayName = 'EmergencyBanner';

export default EmergencyBanner;