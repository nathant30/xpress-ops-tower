'use client';

import React, { useState } from 'react';
import { LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface MetricTrend {
  direction: 'up' | 'down' | 'neutral';
  value: string;
  timeframe?: string;
}

interface MetricDetails {
  description: string;
  breakdown?: {
    label: string;
    value: string | number;
  }[];
  additionalInfo?: string;
}

interface CleanMetricsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  color: 'green' | 'blue' | 'yellow' | 'purple' | 'red' | 'indigo';
  trend?: MetricTrend;
  details?: MetricDetails;
  className?: string;
}

const colorVariants = {
  green: {
    bg: 'bg-green-50',
    border: 'border-green-200',
    icon: 'text-green-600',
    value: 'text-green-600',
    trend: 'text-green-600',
    hover: 'hover:bg-green-100'
  },
  blue: {
    bg: 'bg-blue-50',
    border: 'border-blue-200', 
    icon: 'text-blue-600',
    value: 'text-blue-600',
    trend: 'text-blue-600',
    hover: 'hover:bg-blue-100'
  },
  yellow: {
    bg: 'bg-yellow-50',
    border: 'border-yellow-200',
    icon: 'text-yellow-600',
    value: 'text-yellow-600',
    trend: 'text-yellow-600',
    hover: 'hover:bg-yellow-100'
  },
  purple: {
    bg: 'bg-purple-50',
    border: 'border-purple-200',
    icon: 'text-purple-600',
    value: 'text-purple-600',
    trend: 'text-purple-600',
    hover: 'hover:bg-purple-100'
  },
  red: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    icon: 'text-red-600',
    value: 'text-red-600',
    trend: 'text-red-600',
    hover: 'hover:bg-red-100'
  },
  indigo: {
    bg: 'bg-indigo-50',
    border: 'border-indigo-200',
    icon: 'text-indigo-600',
    value: 'text-indigo-600',
    trend: 'text-indigo-600',
    hover: 'hover:bg-indigo-100'
  }
};

export const CleanMetricsCard: React.FC<CleanMetricsCardProps> = ({
  title,
  value,
  icon: Icon,
  color = 'blue',
  trend,
  details,
  className = ''
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const colors = colorVariants[color];

  const getTrendIcon = () => {
    if (!trend) return null;
    
    switch (trend.direction) {
      case 'up':
        return <TrendingUp className="w-4 h-4" />;
      case 'down':
        return <TrendingDown className="w-4 h-4" />;
      default:
        return <Minus className="w-4 h-4" />;
    }
  };

  const getTrendColor = () => {
    if (!trend) return '';
    
    switch (trend.direction) {
      case 'up':
        return 'text-green-600';
      case 'down':
        return 'text-red-600';
      default:
        return 'text-gray-500';
    }
  };

  return (
    <div className={`relative ${className}`}>
      {/* Main Card */}
      <div
        className={`
          ${colors.bg} ${colors.border} ${colors.hover}
          border rounded-2xl p-8 transition-all duration-300 cursor-pointer
          transform hover:scale-[1.02] hover:shadow-lg
        `}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={() => details && setShowDetails(!showDetails)}
      >
        {/* Icon and Value Row */}
        <div className="flex items-start justify-between mb-6">
          <div className={`${colors.icon} p-3 rounded-xl bg-white/50`}>
            <Icon className="w-8 h-8" />
          </div>
          <div className="text-right">
            <div className={`text-4xl font-bold ${colors.value} leading-none`}>
              {value}
            </div>
          </div>
        </div>

        {/* Title */}
        <div className="mb-4">
          <h3 className="text-xl font-semibold text-gray-900 leading-tight">
            {title}
          </h3>
        </div>

        {/* Trend Indicator */}
        {trend && (
          <div className={`flex items-center space-x-2 ${getTrendColor()}`}>
            {getTrendIcon()}
            <span className="text-sm font-medium">{trend.value}</span>
            {trend.timeframe && (
              <span className="text-sm text-gray-500">
                {trend.timeframe}
              </span>
            )}
          </div>
        )}

        {/* Hover Indicator */}
        {details && isHovered && (
          <div className="absolute top-4 right-4 text-gray-400">
            <span className="text-xs">Click for details</span>
          </div>
        )}
      </div>

      {/* Details Tooltip/Modal */}
      {details && showDetails && (
        <div className="absolute top-full left-0 right-0 mt-2 z-50">
          <div className="bg-white rounded-xl shadow-xl border p-6">
            <div className="space-y-4">
              <p className="text-gray-700 text-sm">
                {details.description}
              </p>
              
              {details.breakdown && (
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-gray-900">Breakdown:</h4>
                  {details.breakdown.map((item, index) => (
                    <div key={index} className="flex justify-between text-sm">
                      <span className="text-gray-600">{item.label}</span>
                      <span className="font-medium text-gray-900">{item.value}</span>
                    </div>
                  ))}
                </div>
              )}
              
              {details.additionalInfo && (
                <p className="text-xs text-gray-500 pt-2 border-t">
                  {details.additionalInfo}
                </p>
              )}
              
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowDetails(false);
                }}
                className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
              >
                Close details
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CleanMetricsCard;