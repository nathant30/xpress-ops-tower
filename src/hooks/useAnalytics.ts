'use client';

import { useState, useEffect } from 'react';
import { useEnhancedAuth } from './useEnhancedAuth';
import { logger } from '@/lib/security/productionLogger';

export interface AnalyticsData {
  metrics: {
    totalDrivers: number;
    activeDrivers: number;
    busyDrivers: number;
    offlineDrivers: number;
    totalBookings: number;
    activeBookings: number;
    completedBookings: number;
    cancelledBookings: number;
    driverUtilization: number;
    bookingFulfillmentRate: number;
    averageResponseTime: number;
    averageRating: number;
  };
  rideshareKPIs: {
    averageWaitTime: number;
    averageDriverOnlineTime: number;
    demandSupplyRatio: number;
    averageTripDuration: number;
    totalRevenue: number;
    revenuePerDriver: number;
    completionRate: number;
    cancellationRate: number;
  };
  servicePerformance: Array<{
    service: string;
    totalBookings: number;
    completedBookings: number;
    completionRate: number;
    averageRating: number;
    revenue: number;
  }>;
  alerts: {
    lowDriverUtilization: boolean;
    highIncidentRate: boolean;
    lowFulfillmentRate: boolean;
    locationTrackingIssues: boolean;
    longWaitTimes: boolean;
    lowDriverOnlineTime: boolean;
    surgeNeeded: boolean;
  };
  lastUpdated: string;
}

export interface UseAnalyticsOptions {
  timeRange?: string;
  regionId?: string;
  refreshInterval?: number;
  serviceType?: string;
}

export function useAnalytics(options: UseAnalyticsOptions = {}) {
  const { user, isAuthenticated } = useEnhancedAuth();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    timeRange = '24h',
    regionId,
    refreshInterval = 30000, // 30 seconds
    serviceType
  } = options;

  const fetchAnalytics = async () => {
    if (!isAuthenticated) return;

    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (timeRange) params.append('timeRange', timeRange);
      if (regionId) params.append('regionId', regionId);
      if (serviceType && serviceType !== 'ALL') params.append('serviceType', serviceType);

      const token = localStorage.getItem('xpress_auth_token');
      const response = await fetch(`/api/analytics?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      setData(result.data);
    } catch (err) {
      logger.error('Error fetching analytics', { error: err instanceof Error ? err.message : err });
      setError(err instanceof Error ? err.message : 'Failed to fetch analytics data');
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchAnalytics();
  }, [isAuthenticated, timeRange, regionId, serviceType]);

  // Auto-refresh
  useEffect(() => {
    if (!refreshInterval || !isAuthenticated) return;

    const interval = setInterval(fetchAnalytics, refreshInterval);
    return () => clearInterval(interval);
  }, [refreshInterval, isAuthenticated, timeRange, regionId, serviceType]);

  return {
    data,
    loading,
    error,
    refresh: fetchAnalytics,
    lastUpdated: data?.lastUpdated
  };
}

export default useAnalytics;