'use client';

import React, { useState, useEffect } from 'react';
import { 
  MapPin, 
  TrendingUp, 
  Clock, 
  Users, 
  Car, 
  Zap, 
  AlertTriangle, 
  Target,
  Activity,
  ChevronRight
} from 'lucide-react';
import { useServiceType } from '@/contexts/ServiceTypeContext';

interface DemandArea {
  id: string;
  name: string;
  demandLevel: 'Very High' | 'High' | 'Medium' | 'Low';
  activeDrivers: number;
  pendingRequests: number;
  avgWaitTime: string;
  surgeMultiplier: number;
  coordinates?: [number, number];
}

interface DemandPrediction {
  id: string;
  area: string;
  predictedLevel: 'Very High' | 'High' | 'Medium' | 'Low';
  timeToStart: string;
  confidence: number;
  factors: string[];
}

const DemandTab: React.FC = () => {
  const { selectedServiceType, serviceTypes } = useServiceType();
  const [loading, setLoading] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);

  const getServiceTypeInfo = () => {
    return serviceTypes.find(s => s.id === selectedServiceType) || serviceTypes[0];
  };

  // Mock real-time data
  const [currentDemandAreas] = useState<DemandArea[]>([
    {
      id: 'makati-cbd',
      name: 'Makati CBD',
      demandLevel: 'Very High',
      activeDrivers: 21,
      pendingRequests: 46,
      avgWaitTime: '3.2min',
      surgeMultiplier: 1.8
    },
    {
      id: 'bgc',
      name: 'Bonifacio Global City',
      demandLevel: 'Very High', 
      activeDrivers: 18,
      pendingRequests: 38,
      avgWaitTime: '2.8min',
      surgeMultiplier: 1.6
    },
    {
      id: 'ortigas',
      name: 'Ortigas Center',
      demandLevel: 'High',
      activeDrivers: 15,
      pendingRequests: 29,
      avgWaitTime: '4.1min',
      surgeMultiplier: 1.4
    },
    {
      id: 'manila',
      name: 'Manila City Center',
      demandLevel: 'High',
      activeDrivers: 12,
      pendingRequests: 24,
      avgWaitTime: '3.9min',
      surgeMultiplier: 1.3
    },
    {
      id: 'quezon-city',
      name: 'Quezon City Triangle',
      demandLevel: 'Medium',
      activeDrivers: 9,
      pendingRequests: 16,
      avgWaitTime: '5.2min',
      surgeMultiplier: 1.1
    },
    {
      id: 'alabang',
      name: 'Alabang Town Center',
      demandLevel: 'Medium',
      activeDrivers: 8,
      pendingRequests: 13,
      avgWaitTime: '4.7min',
      surgeMultiplier: 1.2
    }
  ]);

  const [demandPredictions] = useState<DemandPrediction[]>([
    {
      id: 'ortigas-prediction',
      area: 'Ortigas Center',
      predictedLevel: 'High',
      timeToStart: '30 minutes',
      confidence: 85,
      factors: ['End of work day', 'Weather conditions', 'Event at Robinsons Galleria']
    },
    {
      id: 'manila-prediction',
      area: 'Manila Bay Area',
      predictedLevel: 'Very High',
      timeToStart: '45 minutes',
      confidence: 78,
      factors: ['Concert at MOA Arena', 'Weekend traffic', 'Airport transfers']
    },
    {
      id: 'bgc-prediction',
      area: 'Bonifacio Global City',
      predictedLevel: 'High',
      timeToStart: '1 hour 15 minutes',
      confidence: 72,
      factors: ['Dinner rush', 'Mall closing hours', 'Weekend nightlife']
    },
    {
      id: 'makati-prediction',
      area: 'Makati Ayala',
      predictedLevel: 'Medium',
      timeToStart: '2 hours',
      confidence: 68,
      factors: ['Late night demand', 'Reduced driver availability', 'Weather forecast']
    }
  ]);

  useEffect(() => {
    // Simulate loading
    setTimeout(() => setLoading(false), 1200);

    // Set up auto-refresh every 30 seconds
    const interval = setInterval(() => {
      // In real app, would refresh data here
      console.log('Refreshing demand data...');
    }, 30000);

    setRefreshInterval(interval);

    return () => {
      if (interval) clearInterval(interval);
    };
  }, []);

  const getDemandColor = (level: string) => {
    switch (level) {
      case 'Very High':
        return {
          bg: 'bg-red-50 border-red-200',
          text: 'text-red-700',
          badge: 'bg-red-100 text-red-800',
          border: 'border-l-red-500'
        };
      case 'High':
        return {
          bg: 'bg-orange-50 border-orange-200',
          text: 'text-orange-700',
          badge: 'bg-orange-100 text-orange-800',
          border: 'border-l-orange-500'
        };
      case 'Medium':
        return {
          bg: 'bg-yellow-50 border-yellow-200',
          text: 'text-yellow-700',
          badge: 'bg-yellow-100 text-yellow-800',
          border: 'border-l-yellow-500'
        };
      case 'Low':
        return {
          bg: 'bg-green-50 border-green-200',
          text: 'text-green-700',
          badge: 'bg-green-100 text-green-800',
          border: 'border-l-green-500'
        };
      default:
        return {
          bg: 'bg-gray-50 border-gray-200',
          text: 'text-gray-700',
          badge: 'bg-gray-100 text-gray-800',
          border: 'border-l-gray-500'
        };
    }
  };

  const getSurgeColor = (multiplier: number) => {
    if (multiplier >= 1.8) return 'text-red-600 font-bold';
    if (multiplier >= 1.5) return 'text-orange-600 font-semibold';
    if (multiplier >= 1.2) return 'text-yellow-600 font-medium';
    return 'text-green-600 font-medium';
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'text-green-600';
    if (confidence >= 70) return 'text-yellow-600';
    return 'text-orange-600';
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-40 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
          <div className="h-6 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Service Type Context Header */}
      <div className="bg-white rounded-xl border-l-4 border-orange-500 p-4">
        <div className="flex items-center space-x-3">
          <span className="text-2xl">{getServiceTypeInfo().icon}</span>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Demand Analytics</h2>
            <p className="text-sm text-gray-500">
              {selectedServiceType === 'ALL' ? 'All service types demand patterns' : `${getServiceTypeInfo().name} demand patterns only`}
            </p>
          </div>
        </div>
      </div>

      {/* Current High Demand Areas */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Current High Demand Areas</h2>
            <p className="text-gray-600 mt-1">Real-time hotspots requiring immediate attention</p>
          </div>
          <div className="flex items-center space-x-2 px-3 py-2 bg-blue-50 rounded-lg">
            <Activity className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-700">Live Updates</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {currentDemandAreas.map((area) => {
            const colors = getDemandColor(area.demandLevel);
            return (
              <div
                key={area.id}
                className={`p-6 rounded-xl border-2 transition-all hover:shadow-lg cursor-pointer ${colors.bg} border-l-4 ${colors.border}`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{area.name}</h3>
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${colors.badge}`}>
                      {area.demandLevel} Demand
                    </span>
                  </div>
                  <MapPin className={`w-6 h-6 ${colors.text}`} />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Car className="w-4 h-4 text-gray-500" />
                      <span className="text-sm text-gray-600">Drivers</span>
                    </div>
                    <span className="font-semibold text-gray-900">{area.activeDrivers}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Users className="w-4 h-4 text-gray-500" />
                      <span className="text-sm text-gray-600">Requests</span>
                    </div>
                    <span className="font-semibold text-gray-900">{area.pendingRequests}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Clock className="w-4 h-4 text-gray-500" />
                      <span className="text-sm text-gray-600">Wait Time</span>
                    </div>
                    <span className="font-semibold text-gray-900">{area.avgWaitTime}</span>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                    <div className="flex items-center space-x-2">
                      <Zap className="w-4 h-4 text-purple-500" />
                      <span className="text-sm text-gray-600">Surge</span>
                    </div>
                    <span className={`font-bold ${getSurgeColor(area.surgeMultiplier)}`}>
                      {area.surgeMultiplier}x
                    </span>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-gray-200">
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>Supply/Demand Ratio</span>
                    <span className="font-medium">
                      {(area.activeDrivers / area.pendingRequests * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                    <div 
                      className={`h-1.5 rounded-full ${
                        area.activeDrivers / area.pendingRequests > 0.8 ? 'bg-green-500' :
                        area.activeDrivers / area.pendingRequests > 0.5 ? 'bg-yellow-500' :
                        'bg-red-500'
                      }`}
                      style={{ width: `${Math.min((area.activeDrivers / area.pendingRequests * 100), 100)}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Predicted Demand */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Predicted Demand (Next 1hr)</h2>
            <p className="text-gray-600 mt-1">AI-powered predictions to optimize driver positioning</p>
          </div>
          <div className="flex items-center space-x-2 px-3 py-2 bg-purple-50 rounded-lg">
            <Target className="w-4 h-4 text-purple-600" />
            <span className="text-sm font-medium text-purple-700">Predictive Analytics</span>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="divide-y divide-gray-100">
            {demandPredictions.map((prediction, index) => {
              const colors = getDemandColor(prediction.predictedLevel);
              return (
                <div key={prediction.id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">{prediction.area}</h3>
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${colors.badge}`}>
                          {prediction.predictedLevel} demand
                        </span>
                        <span className="text-sm text-gray-500">in {prediction.timeToStart}</span>
                      </div>
                      
                      <div className="flex items-center space-x-4 mb-3">
                        <div className="flex items-center space-x-2">
                          <TrendingUp className={`w-4 h-4 ${getConfidenceColor(prediction.confidence)}`} />
                          <span className="text-sm font-medium text-gray-600">
                            {prediction.confidence}% confidence
                          </span>
                        </div>
                        <div className="w-24 bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${
                              prediction.confidence >= 80 ? 'bg-green-500' :
                              prediction.confidence >= 70 ? 'bg-yellow-500' :
                              'bg-orange-500'
                            }`}
                            style={{ width: `${prediction.confidence}%` }}
                          ></div>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <span className="text-sm text-gray-600 mr-2">Factors:</span>
                        {prediction.factors.map((factor, factorIndex) => (
                          <span key={factorIndex} className="inline-flex items-center px-2 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-full">
                            {factor}
                          </span>
                        ))}
                      </div>
                    </div>
                    
                    <div className="flex items-center ml-4">
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    </div>
                  </div>

                  {/* Action suggestions */}
                  <div className="mt-4 pt-3 border-t border-gray-100">
                    <div className="flex items-start space-x-2">
                      <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                      <div className="text-sm text-gray-600">
                        <span className="font-medium">Suggested Actions:</span>
                        {prediction.predictedLevel === 'Very High' && (
                          <span className="ml-1">Alert nearby drivers, increase surge pricing, activate bonus incentives</span>
                        )}
                        {prediction.predictedLevel === 'High' && (
                          <span className="ml-1">Notify available drivers, monitor surge pricing, prepare incentives</span>
                        )}
                        {prediction.predictedLevel === 'Medium' && (
                          <span className="ml-1">Keep drivers informed, monitor demand patterns</span>
                        )}
                        {prediction.predictedLevel === 'Low' && (
                          <span className="ml-1">Standard operations, encourage driver breaks</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DemandTab;