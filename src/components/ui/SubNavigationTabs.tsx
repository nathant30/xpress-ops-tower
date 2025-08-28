'use client';

import React from 'react';
import { LucideIcon } from 'lucide-react';

interface SubNavigationTab {
  id: string;
  name: string;
  icon?: LucideIcon;
  count?: number;
  color?: 'default' | 'red' | 'blue' | 'green' | 'yellow' | 'purple' | 'orange';
}

interface SubNavigationTabsProps {
  tabs: SubNavigationTab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  className?: string;
}

const SubNavigationTabs: React.FC<SubNavigationTabsProps> = ({
  tabs,
  activeTab,
  onTabChange,
  className = ''
}) => {
  const getCountColor = (color: string) => {
    switch (color) {
      case 'red':
        return 'bg-red-100 text-red-800';
      case 'blue':
        return 'bg-blue-100 text-blue-800';
      case 'green':
        return 'bg-green-100 text-green-800';
      case 'yellow':
        return 'bg-yellow-100 text-yellow-800';
      case 'purple':
        return 'bg-purple-100 text-purple-800';
      case 'orange':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className={`border-b border-gray-100 ${className}`}>
      <nav className="-mb-px flex space-x-8">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {Icon && <Icon className="w-4 h-4" />}
              <span>{tab.name}</span>
              {tab.count !== undefined && tab.count > 0 && (
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getCountColor(tab.color || 'default')}`}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
};

export default SubNavigationTabs;