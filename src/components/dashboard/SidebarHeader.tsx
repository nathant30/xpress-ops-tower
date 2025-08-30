'use client';

import React, { memo } from 'react';
import { Target, Minimize2, Maximize2, Activity } from 'lucide-react';
import type { UserRole } from '@/types/dashboard';

interface SidebarHeaderProps {
  userRole: UserRole;
  sidebarCollapsed: boolean;
  autoRefresh: boolean;
  lastUpdate: Date;
  onSidebarToggle: () => void;
}

const SidebarHeader = memo<SidebarHeaderProps>(({
  userRole,
  sidebarCollapsed,
  autoRefresh,
  lastUpdate,
  onSidebarToggle
}) => {
  const getTimeSinceUpdate = () => {
    const seconds = Math.floor((Date.now() - lastUpdate.getTime()) / 1000);
    return seconds < 60 ? `${seconds}s ago` : `${Math.floor(seconds / 60)}m ago`;
  };

  if (sidebarCollapsed) {
    return (
      <div className="p-4 border-b border-slate-200 flex justify-center">
        <button
          onClick={onSidebarToggle}
          className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg"
        >
          <Maximize2 className="w-5 h-5" />
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 border-b border-slate-200">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-600 rounded-xl">
            <Target className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Ops Tower</h1>
            <p className="text-sm text-slate-600">v3.0 - AI Enhanced</p>
          </div>
        </div>
        <button
          onClick={onSidebarToggle}
          className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg"
        >
          <Minimize2 className="w-5 h-5" />
        </button>
      </div>


      {/* Live Status */}
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${autoRefresh ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
          <span className="text-slate-600">
            {autoRefresh ? 'Live Updates' : 'Manual Mode'}
          </span>
        </div>
        <div className="flex items-center space-x-1 text-slate-500">
          <Activity className="w-3 h-3" />
          <span>{getTimeSinceUpdate()}</span>
        </div>
      </div>
    </div>
  );
});

SidebarHeader.displayName = 'SidebarHeader';

export default SidebarHeader;