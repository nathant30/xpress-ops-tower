'use client';

import React from 'react';
import { Users, Car, Clock, DollarSign, TrendingUp, TrendingDown } from 'lucide-react';

interface ServiceData {
  activeDrivers: Record<string, { count: number; available: number; change: number; trend: 'up' | 'down' }>;
  activeRides: Record<string, { count: number; change: number; trend: 'up' | 'down' }>;
  avgWaitTime: Record<string, { minutes: number; change: number; trend: 'up' | 'down' }>;
  revenue: Record<string, { amount: number; change: number; trend: 'up' | 'down' }>;
}

interface ServiceTypeBreakdownProps {
  data: ServiceData;
}

const serviceTypeIcons: Record<string, string> = {
  '2W': '🏍️',
  '4W_CAR': '🚗',
  '4W_SUV': '🚙',
  '4W_TAXI': '🚖'
};

const serviceTypeNames: Record<string, string> = {
  '2W': 'Motorcycle',
  '4W_CAR': 'Car',
  '4W_SUV': 'SUV',
  '4W_TAXI': 'Taxi'
};

const ServiceTypeBreakdown: React.FC<ServiceTypeBreakdownProps> = ({ data }) => {
  const serviceTypes = ['2W', '4W_CAR', '4W_SUV', '4W_TAXI'];

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-semibold text-gray-900">Service Type Breakdown</h3>
        <div className="text-sm text-gray-500">Real-time Metro Manila data</div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {serviceTypes.map((serviceId) => {
          const driversData = data.activeDrivers[serviceId];
          const ridesData = data.activeRides[serviceId];
          const utilizationRate = (driversData.available / driversData.count) * 100;

          return (
            <div
              key={serviceId}
              className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <span className="text-2xl">{serviceTypeIcons[serviceId]}</span>
                  <span className="font-semibold text-gray-900">
                    {serviceTypeNames[serviceId]}
                  </span>
                </div>
                {driversData.trend === 'up' ? (
                  <TrendingUp className="w-4 h-4 text-green-600" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-red-600" />
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center space-x-1">
                    <Users className="w-3 h-3 text-gray-500" />
                    <span className="text-gray-600">Active Drivers</span>
                  </div>
                  <span className="font-medium text-gray-900">
                    {driversData.available}/{driversData.count}
                  </span>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center space-x-1">
                    <Car className="w-3 h-3 text-gray-500" />
                    <span className="text-gray-600">Active Rides</span>
                  </div>
                  <span className="font-medium text-gray-900">{ridesData.count}</span>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Utilization</span>
                  <span className="font-medium text-gray-900">
                    {utilizationRate.toFixed(1)}%
                  </span>
                </div>

                {/* Progress bar for utilization */}
                <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${
                      utilizationRate > 75
                        ? 'bg-green-500'
                        : utilizationRate > 50
                        ? 'bg-yellow-500'
                        : 'bg-red-500'
                    }`}
                    style={{ width: `${Math.min(utilizationRate, 100)}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 pt-4 border-t border-gray-200">
        <div className="grid grid-cols-2 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-blue-600">
              {data.activeDrivers.ALL.count}
            </div>
            <div className="text-sm text-gray-600">Total Active Drivers</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-green-600">
              {data.activeRides.ALL.count}
            </div>
            <div className="text-sm text-gray-600">Total Active Rides</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ServiceTypeBreakdown;