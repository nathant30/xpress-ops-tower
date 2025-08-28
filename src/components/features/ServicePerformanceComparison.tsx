'use client';

import React from 'react';
import { Users, Car, Clock, DollarSign, TrendingUp, TrendingDown } from 'lucide-react';

interface ServiceData {
  activeDrivers: Record<string, { count: number; available: number; change: number; trend: 'up' | 'down' }>;
  activeRides: Record<string, { count: number; change: number; trend: 'up' | 'down' }>;
  avgWaitTime: Record<string, { minutes: number; change: number; trend: 'up' | 'down' }>;
  revenue: Record<string, { amount: number; change: number; trend: 'up' | 'down' }>;
}

interface ServiceType {
  id: string;
  name: string;
  icon: string;
}

interface ServicePerformanceComparisonProps {
  data: ServiceData;
  serviceTypes: ServiceType[];
}

const ServicePerformanceComparison: React.FC<ServicePerformanceComparisonProps> = ({ data, serviceTypes }) => {
  const services = serviceTypes.filter(s => s.id !== 'ALL');

  const TrendIcon: React.FC<{ trend: 'up' | 'down'; className?: string }> = ({ trend, className }) => {
    return trend === 'up' ? (
      <TrendingUp className={`w-3 h-3 text-green-600 ${className}`} />
    ) : (
      <TrendingDown className={`w-3 h-3 text-red-600 ${className}`} />
    );
  };

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-semibold text-gray-900">Service Performance Comparison</h3>
        <div className="text-sm text-gray-500">Live comparison across service types</div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-3 px-2 text-sm font-semibold text-gray-700">Service Type</th>
              <th className="text-center py-3 px-2 text-sm font-semibold text-gray-700">
                <div className="flex items-center justify-center space-x-1">
                  <Users className="w-4 h-4" />
                  <span>Drivers</span>
                </div>
              </th>
              <th className="text-center py-3 px-2 text-sm font-semibold text-gray-700">
                <div className="flex items-center justify-center space-x-1">
                  <Car className="w-4 h-4" />
                  <span>Rides</span>
                </div>
              </th>
              <th className="text-center py-3 px-2 text-sm font-semibold text-gray-700">
                <div className="flex items-center justify-center space-x-1">
                  <Clock className="w-4 h-4" />
                  <span>Wait Time</span>
                </div>
              </th>
              <th className="text-center py-3 px-2 text-sm font-semibold text-gray-700">
                <div className="flex items-center justify-center space-x-1">
                  <DollarSign className="w-4 h-4" />
                  <span>Revenue</span>
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {services.map((service) => {
              const driversData = data.activeDrivers[service.id];
              const ridesData = data.activeRides[service.id];
              const waitTimeData = data.avgWaitTime[service.id];
              const revenueData = data.revenue[service.id];

              return (
                <tr key={service.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-2">
                    <div className="flex items-center space-x-2">
                      <span className="text-lg">{service.icon}</span>
                      <span className="font-medium text-gray-900">{service.name}</span>
                    </div>
                  </td>
                  <td className="py-3 px-2 text-center">
                    <div className="flex items-center justify-center space-x-1">
                      <span className="font-semibold text-gray-900">
                        {driversData.available}/{driversData.count}
                      </span>
                      <TrendIcon trend={driversData.trend} />
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {driversData.trend === 'up' ? '+' : ''}{driversData.change}%
                    </div>
                  </td>
                  <td className="py-3 px-2 text-center">
                    <div className="flex items-center justify-center space-x-1">
                      <span className="font-semibold text-gray-900">{ridesData.count}</span>
                      <TrendIcon trend={ridesData.trend} />
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {ridesData.trend === 'up' ? '+' : ''}{ridesData.change}%
                    </div>
                  </td>
                  <td className="py-3 px-2 text-center">
                    <div className="flex items-center justify-center space-x-1">
                      <span className="font-semibold text-gray-900">{waitTimeData.minutes}m</span>
                      <TrendIcon trend={waitTimeData.trend} />
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {waitTimeData.trend === 'up' ? '+' : ''}{waitTimeData.change}%
                    </div>
                  </td>
                  <td className="py-3 px-2 text-center">
                    <div className="flex items-center justify-center space-x-1">
                      <span className="font-semibold text-gray-900">
                        ₱{Math.floor(revenueData.amount / 1000)}k
                      </span>
                      <TrendIcon trend={revenueData.trend} />
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {revenueData.trend === 'up' ? '+' : ''}{revenueData.change}%
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Summary Statistics */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-center">
          <div className="bg-blue-50 rounded-lg p-3">
            <div className="text-lg font-bold text-blue-600">
              {((data.activeDrivers.ALL.available / data.activeDrivers.ALL.count) * 100).toFixed(1)}%
            </div>
            <div className="text-xs text-gray-600">Overall Utilization</div>
          </div>
          <div className="bg-green-50 rounded-lg p-3">
            <div className="text-lg font-bold text-green-600">
              {data.avgWaitTime.ALL.minutes}m
            </div>
            <div className="text-xs text-gray-600">Avg Wait Time</div>
          </div>
          <div className="bg-yellow-50 rounded-lg p-3">
            <div className="text-lg font-bold text-yellow-600">
              ₱{Math.floor(data.revenue.ALL.amount / 1000)}k
            </div>
            <div className="text-xs text-gray-600">Total Revenue</div>
          </div>
          <div className="bg-purple-50 rounded-lg p-3">
            <div className="text-lg font-bold text-purple-600">
              {Math.floor(data.revenue.ALL.amount / data.activeRides.ALL.count)}
            </div>
            <div className="text-xs text-gray-600">Revenue/Ride</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ServicePerformanceComparison;