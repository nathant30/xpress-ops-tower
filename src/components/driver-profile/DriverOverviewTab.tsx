'use client';

import React, { memo } from 'react';
import { CheckCircle, Car } from 'lucide-react';

interface DriverData {
  name: string;
  id: string;
  phone: string;
  email: string;
  photo: string;
  status: string;
  location: string;
  joinDate: string;
  lastActive: string;
  rating: number;
  completionRate: number;
  acceptanceRate: number;
  cancellationRate: number;
  totalTrips: number;
  tripsToday: number;
  activeHours: string;
  totalHours: string;
  riskLevel: string;
  regionInfo?: {
    name: string;
    type: string;
  };
  trafficCondition?: 'light' | 'moderate' | 'heavy' | 'severe';
  recommendations?: string[];
  currentGeofence?: string;
  routeOptimization?: {
    suggestedRoute: string;
    estimatedTime: string;
    avoidanceTips: string[];
  };
}

interface RecentActivity {
  id: string;
  type: 'trip_completed' | 'trip_in_progress';
  description: string;
  details: string;
  amount?: number;
  rating?: number;
  status?: string;
  estimated?: number;
}

interface DriverOverviewTabProps {
  driverData: DriverData;
  recentActivities?: RecentActivity[];
}

const DriverOverviewTab = memo<DriverOverviewTabProps>(({
  driverData,
  recentActivities = []
}) => {
  const getTrafficColor = (condition?: string) => {
    switch (condition) {
      case 'light': return 'text-green-600';
      case 'moderate': return 'text-yellow-600';
      case 'heavy': return 'text-orange-600';
      case 'severe': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const defaultActivities: RecentActivity[] = [
    {
      id: '1',
      type: 'trip_completed',
      description: 'Trip completed',
      details: 'Makati to BGC • 15 mins ago',
      amount: 245,
      rating: 4.8
    },
    {
      id: '2', 
      type: 'trip_in_progress',
      description: 'Trip in progress',
      details: 'Quezon City to Manila • Started 32 mins ago',
      status: 'Active',
      estimated: 180
    }
  ];

  const activities = recentActivities.length > 0 ? recentActivities : defaultActivities;

  return (
    <div className="space-y-6">
      {/* Performance Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border rounded-lg p-4">
          <div className="text-2xl font-bold text-green-600">{driverData.rating}</div>
          <div className="text-sm text-gray-600">Rating</div>
          <div className="text-xs text-gray-500 mt-1">Based on {driverData.totalTrips} trips</div>
        </div>
        
        <div className="bg-white border rounded-lg p-4">
          <div className="text-2xl font-bold text-blue-600">{driverData.completionRate}%</div>
          <div className="text-sm text-gray-600">Completion</div>
          <div className="text-xs text-gray-500 mt-1">{driverData.tripsToday} trips today</div>
        </div>
        
        <div className="bg-white border rounded-lg p-4">
          <div className="text-2xl font-bold text-purple-600">{driverData.acceptanceRate}%</div>
          <div className="text-sm text-gray-600">Acceptance</div>
          <div className="text-xs text-gray-500 mt-1">Last 30 days</div>
        </div>
        
        <div className="bg-white border rounded-lg p-4">
          <div className="text-2xl font-bold text-orange-600">{driverData.cancellationRate}%</div>
          <div className="text-sm text-gray-600">Cancellation</div>
          <div className="text-xs text-gray-500 mt-1">Below 5% target</div>
        </div>
      </div>

      {/* Driver Hours */}
      <div className="bg-white border rounded-lg p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Active Hours</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-sm text-gray-600">Today</div>
            <div className="text-xl font-bold text-gray-900">{driverData.activeHours}</div>
          </div>
          <div>
            <div className="text-sm text-gray-600">Total</div>
            <div className="text-xl font-bold text-gray-900">{driverData.totalHours}</div>
          </div>
        </div>
      </div>

      {/* Location & Traffic Info */}
      <div className="bg-white border rounded-lg p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Current Location</h3>
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <div className="font-medium text-gray-900">{driverData.location}</div>
              {driverData.regionInfo && (
                <div className="text-sm text-gray-600">
                  {driverData.regionInfo.name} • {driverData.regionInfo.type}
                </div>
              )}
            </div>
            {driverData.trafficCondition && (
              <div className={`text-sm font-medium ${getTrafficColor(driverData.trafficCondition)}`}>
                {driverData.trafficCondition.charAt(0).toUpperCase() + driverData.trafficCondition.slice(1)} Traffic
              </div>
            )}
          </div>

          {driverData.currentGeofence && (
            <div className="text-sm text-gray-600">
              Geofence: {driverData.currentGeofence}
            </div>
          )}
        </div>

        {/* Route Recommendations */}
        {driverData.recommendations && driverData.recommendations.length > 0 && (
          <div className="mt-6">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="text-sm font-medium text-green-800 mb-3">💡 Recommendations</div>
              <div className="space-y-2">
                {driverData.recommendations.map((rec, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                    <div className="text-sm text-green-700">{rec}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Route Avoidance Tips */}
        {driverData.routeOptimization?.avoidanceTips && driverData.routeOptimization.avoidanceTips.length > 0 && (
          <div className="mt-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="text-sm font-medium text-red-800 mb-3">⚠️ Current Avoidances</div>
              <div className="space-y-2">
                {driverData.routeOptimization.avoidanceTips.map((tip, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 bg-red-500 rounded-full mt-2 flex-shrink-0"></div>
                    <div className="text-sm text-red-700">{tip}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Recent Activity */}
      <div className="bg-white border rounded-lg">
        <div className="p-4 border-b bg-gray-50">
          <h3 className="font-semibold text-gray-900">Today's Activity</h3>
        </div>
        <div className="p-4 space-y-3">
          {activities.map((activity) => (
            <div 
              key={activity.id} 
              className={`flex items-center gap-4 p-4 rounded-lg border ${
                activity.type === 'trip_completed' 
                  ? 'bg-green-50 border-green-200' 
                  : 'bg-blue-50 border-blue-200'
              }`}
            >
              <div className={`flex items-center justify-center w-10 h-10 rounded-full ${
                activity.type === 'trip_completed' ? 'bg-green-500' : 'bg-blue-500'
              }`}>
                {activity.type === 'trip_completed' ? (
                  <CheckCircle className="w-5 h-5 text-white" />
                ) : (
                  <Car className="w-5 h-5 text-white" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-900">{activity.description}</div>
                <div className="text-xs text-gray-500">{activity.details}</div>
              </div>
              <div className="text-right">
                {activity.amount && (
                  <>
                    <div className={`text-lg font-bold ${
                      activity.type === 'trip_completed' ? 'text-green-600' : 'text-blue-600'
                    }`}>
                      ₱{activity.amount}
                    </div>
                    {activity.rating && (
                      <div className="text-xs text-gray-500">{activity.rating} ⭐</div>
                    )}
                  </>
                )}
                {activity.status && (
                  <>
                    <div className="text-sm text-blue-600 font-medium">{activity.status}</div>
                    {activity.estimated && (
                      <div className="text-xs text-gray-500">Est. ₱{activity.estimated}</div>
                    )}
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});

DriverOverviewTab.displayName = 'DriverOverviewTab';

export default DriverOverviewTab;