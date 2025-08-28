'use client';

import React, { useState, useEffect } from 'react';
import { CheckCircle, Target, XCircle, TrendingUp, Star, Car, DollarSign, User, ChevronDown, ChevronUp } from 'lucide-react';
import { useServiceType } from '@/contexts/ServiceTypeContext';
import { Card, CardContent } from '@/components/ui/card';

interface DriverRanking {
  rank: number;
  name: string;
  rating: number;
  completionRate: number;
  acceptanceRate: number;
  trips: number;
  earnings: number;
  avatar?: string;
}

interface PerformanceMetric {
  title: string;
  value: string;
  icon: React.ElementType;
  color: 'green' | 'blue' | 'red' | 'yellow';
  trend?: {
    direction: 'up' | 'down';
    value: string;
  };
}

interface SortConfig {
  key: keyof DriverRanking;
  direction: 'asc' | 'desc';
}

const PerformanceTab: React.FC = () => {
  const { selectedServiceType, serviceTypes } = useServiceType();
  const [loading, setLoading] = useState(true);
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'rank', direction: 'asc' });
  
  const getServiceTypeInfo = () => {
    return serviceTypes.find(s => s.id === selectedServiceType) || serviceTypes[0];
  };
  
  // Mock data - in real app would come from API
  const [driverRankings, setDriverRankings] = useState<DriverRanking[]>([
    {
      rank: 1,
      name: 'Juan Santos',
      rating: 4.9,
      completionRate: 98.5,
      acceptanceRate: 94.2,
      trips: 28,
      earnings: 3420
    },
    {
      rank: 2,
      name: 'Maria Rodriguez',
      rating: 4.8,
      completionRate: 97.3,
      acceptanceRate: 91.5,
      trips: 25,
      earnings: 3180
    },
    {
      rank: 3,
      name: 'Carlos Mendoza',
      rating: 4.8,
      completionRate: 96.8,
      acceptanceRate: 89.7,
      trips: 24,
      earnings: 2950
    },
    {
      rank: 4,
      name: 'Ana Garcia',
      rating: 4.7,
      completionRate: 95.2,
      acceptanceRate: 88.3,
      trips: 22,
      earnings: 2740
    },
    {
      rank: 5,
      name: 'Roberto Silva',
      rating: 4.7,
      completionRate: 94.8,
      acceptanceRate: 87.1,
      trips: 21,
      earnings: 2620
    },
    {
      rank: 6,
      name: 'Elena Lopez',
      rating: 4.6,
      completionRate: 93.5,
      acceptanceRate: 85.9,
      trips: 19,
      earnings: 2480
    },
    {
      rank: 7,
      name: 'Miguel Torres',
      rating: 4.6,
      completionRate: 92.7,
      acceptanceRate: 84.2,
      trips: 18,
      earnings: 2350
    },
    {
      rank: 8,
      name: 'Sofia Herrera',
      rating: 4.5,
      completionRate: 91.3,
      acceptanceRate: 82.8,
      trips: 17,
      earnings: 2210
    }
  ]);

  // Service-specific performance metrics
  const performanceData = {
    ALL: {
      completionRate: '94.2%',
      acceptanceRate: '89.7%',
      cancellationRate: '5.8%',
      completionTrend: '↑ 2.1%',
      acceptanceTrend: '↑ 1.5%',
      cancellationTrend: '↓ 0.8%'
    },
    '2W': {
      completionRate: '96.1%',
      acceptanceRate: '91.3%',
      cancellationRate: '4.2%',
      completionTrend: '↑ 2.8%',
      acceptanceTrend: '↑ 2.1%',
      cancellationTrend: '↓ 1.2%'
    },
    '4W_CAR': {
      completionRate: '93.8%',
      acceptanceRate: '88.9%',
      cancellationRate: '6.1%',
      completionTrend: '↑ 1.9%',
      acceptanceTrend: '↑ 1.2%',
      cancellationTrend: '↓ 0.6%'
    },
    '4W_SUV': {
      completionRate: '92.5%',
      acceptanceRate: '87.4%',
      cancellationRate: '7.3%',
      completionTrend: '↑ 1.4%',
      acceptanceTrend: '↑ 0.8%',
      cancellationTrend: '↓ 0.3%'
    },
    '4W_TAXI': {
      completionRate: '95.7%',
      acceptanceRate: '92.1%',
      cancellationRate: '4.8%',
      completionTrend: '↑ 3.2%',
      acceptanceTrend: '↑ 2.6%',
      cancellationTrend: '↓ 1.5%'
    }
  };

  const getCurrentPerformanceData = () => {
    return performanceData[selectedServiceType as keyof typeof performanceData] || performanceData.ALL;
  };

  const performanceMetrics: PerformanceMetric[] = [
    {
      title: 'Completion Rate',
      value: getCurrentPerformanceData().completionRate,
      icon: CheckCircle,
      color: 'green',
      trend: { direction: 'up', value: getCurrentPerformanceData().completionTrend }
    },
    {
      title: 'Acceptance Rate', 
      value: getCurrentPerformanceData().acceptanceRate,
      icon: Target,
      color: 'blue',
      trend: { direction: 'up', value: getCurrentPerformanceData().acceptanceTrend }
    },
    {
      title: 'Cancellation Rate',
      value: getCurrentPerformanceData().cancellationRate,
      icon: XCircle,
      color: 'red',
      trend: { direction: 'down', value: getCurrentPerformanceData().cancellationTrend }
    }
  ];

  useEffect(() => {
    // Simulate loading
    setTimeout(() => setLoading(false), 1000);
  }, []);

  const handleSort = (key: keyof DriverRanking) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });

    const sortedData = [...driverRankings].sort((a, b) => {
      if (direction === 'asc') {
        return a[key] > b[key] ? 1 : -1;
      }
      return a[key] < b[key] ? 1 : -1;
    });

    setDriverRankings(sortedData);
  };

  const getMetricColor = (color: string) => {
    const colors = {
      green: 'bg-green-50 border-green-200 text-green-700',
      blue: 'bg-blue-50 border-blue-200 text-blue-700',
      red: 'bg-red-50 border-red-200 text-red-700',
      yellow: 'bg-yellow-50 border-yellow-200 text-yellow-700'
    };
    return colors[color as keyof typeof colors];
  };

  const getMetricIconColor = (color: string) => {
    const colors = {
      green: 'text-green-600',
      blue: 'text-blue-600', 
      red: 'text-red-600',
      yellow: 'text-yellow-600'
    };
    return colors[color as keyof typeof colors];
  };

  const getRankBadge = (rank: number) => {
    if (rank === 1) return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    if (rank === 2) return 'bg-gray-100 text-gray-800 border-gray-300';
    if (rank === 3) return 'bg-orange-100 text-orange-800 border-orange-300';
    return 'bg-blue-50 text-blue-700 border-blue-200';
  };

  const SortIcon: React.FC<{ column: keyof DriverRanking }> = ({ column }) => {
    if (sortConfig.key !== column) {
      return <ChevronDown className="w-4 h-4 text-gray-400" />;
    }
    return sortConfig.direction === 'asc' 
      ? <ChevronUp className="w-4 h-4 text-blue-600" />
      : <ChevronDown className="w-4 h-4 text-blue-600" />;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
          <div className="h-96 bg-gray-200 rounded-lg"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Performance KPI Cards - Matching Overview Layout */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {performanceMetrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <div
              key={metric.title}
              className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow duration-200"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">{metric.title}</div>
                <Icon className="w-4 h-4 text-gray-400" />
              </div>
              <div className="text-2xl font-bold text-gray-900 mb-1">{metric.value}</div>
              {metric.trend && (
                <div className={`flex items-center gap-1 text-xs font-medium ${
                  metric.trend.direction === 'up' ? 'text-emerald-600' : 'text-red-500'
                }`}>
                  <span>{metric.trend.value}</span>
                </div>
              )}
            </div>
          );
        })}
        
        {/* Additional metrics to fill 5 columns */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow duration-200">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">Avg Rating</div>
            <Star className="w-4 h-4 text-gray-400" />
          </div>
          <div className="text-2xl font-bold text-gray-900 mb-1">4.7</div>
          <div className="flex items-center gap-1 text-xs font-medium text-emerald-600">
            <span>↑ +0.2</span>
          </div>
        </div>
        
        <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow duration-200">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">Response Time</div>
            <TrendingUp className="w-4 h-4 text-gray-400" />
          </div>
          <div className="text-2xl font-bold text-gray-900 mb-1">45s</div>
          <div className="flex items-center gap-1 text-xs font-medium text-emerald-600">
            <span>↓ -12%</span>
          </div>
        </div>
      </div>

      {/* Driver Rankings Table */}
      <Card className="mb-6">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-lg text-gray-900">Driver Performance Rankings</h2>
            <div className="flex items-center space-x-2 text-xs text-gray-500">
              <TrendingUp className="w-4 h-4" />
              <span>Live data • Updated now</span>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-500 text-xs uppercase tracking-wide border-b border-gray-100">
                  <th 
                    className="text-left py-3 font-medium cursor-pointer hover:text-gray-700 transition-colors"
                    onClick={() => handleSort('rank')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Rank</span>
                      <SortIcon column="rank" />
                    </div>
                  </th>
                  <th 
                    className="text-left py-3 font-medium cursor-pointer hover:text-gray-700 transition-colors"
                    onClick={() => handleSort('name')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Driver</span>
                      <SortIcon column="name" />
                    </div>
                  </th>
                  <th 
                    className="text-center py-3 font-medium cursor-pointer hover:text-gray-700 transition-colors"
                    onClick={() => handleSort('rating')}
                  >
                    <div className="flex items-center justify-center space-x-1">
                      <span>Rating</span>
                      <SortIcon column="rating" />
                    </div>
                  </th>
                  <th 
                    className="text-center py-3 font-medium cursor-pointer hover:text-gray-700 transition-colors"
                    onClick={() => handleSort('completionRate')}
                  >
                    <div className="flex items-center justify-center space-x-1">
                      <span>Completion</span>
                      <SortIcon column="completionRate" />
                    </div>
                  </th>
                  <th 
                    className="text-center py-3 font-medium cursor-pointer hover:text-gray-700 transition-colors"
                    onClick={() => handleSort('acceptanceRate')}
                  >
                    <div className="flex items-center justify-center space-x-1">
                      <span>Acceptance</span>
                      <SortIcon column="acceptanceRate" />
                    </div>
                  </th>
                  <th 
                    className="text-center py-3 font-medium cursor-pointer hover:text-gray-700 transition-colors"
                    onClick={() => handleSort('trips')}
                  >
                    <div className="flex items-center justify-center space-x-1">
                      <span>Trips</span>
                      <SortIcon column="trips" />
                    </div>
                  </th>
                  <th 
                    className="text-center py-3 font-medium cursor-pointer hover:text-gray-700 transition-colors"
                    onClick={() => handleSort('earnings')}
                  >
                    <div className="flex items-center justify-center space-x-1">
                      <span>Earnings</span>
                      <SortIcon column="earnings" />
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {driverRankings.map((driver, index) => (
                  <tr key={driver.name} className="hover:bg-gray-25 transition-colors">
                    <td className="py-3">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-bold ${getRankBadge(driver.rank)}`}>
                        #{driver.rank}
                      </span>
                    </td>
                    <td className="py-3">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-xs">
                          {driver.name.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{driver.name}</div>
                          <div className="text-xs text-gray-500">DRV{1000 + index}</div>
                        </div>
                      </div>
                    </td>
                    <td className="text-center py-3">
                      <div className="flex items-center justify-center">
                        <Star className="w-3 h-3 text-yellow-400 mr-1 fill-current" />
                        <span className="font-semibold text-gray-900">{driver.rating}</span>
                      </div>
                    </td>
                    <td className="text-center py-3">
                      <div className="flex items-center justify-center space-x-2">
                        <div className="w-12 bg-gray-200 rounded-full h-1.5">
                          <div 
                            className="bg-green-500 h-1.5 rounded-full"
                            style={{ width: `${driver.completionRate}%` }}
                          ></div>
                        </div>
                        <span className="text-xs font-medium text-gray-700">{driver.completionRate}%</span>
                      </div>
                    </td>
                    <td className="text-center py-3">
                      <div className="flex items-center justify-center space-x-2">
                        <div className="w-12 bg-gray-200 rounded-full h-1.5">
                          <div 
                            className="bg-blue-500 h-1.5 rounded-full"
                            style={{ width: `${driver.acceptanceRate}%` }}
                          ></div>
                        </div>
                        <span className="text-xs font-medium text-gray-700">{driver.acceptanceRate}%</span>
                      </div>
                    </td>
                    <td className="text-center py-3 font-semibold text-gray-900">{driver.trips}</td>
                    <td className="text-center py-3 font-semibold text-gray-900">₱{driver.earnings.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PerformanceTab;