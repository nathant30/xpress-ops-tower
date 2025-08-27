// Real-time data hooks for Xpress Ops Tower
// Provides auto-refreshing data from API endpoints with caching and error handling

import { useState, useEffect, useCallback, useRef } from 'react';
import { driversApi, bookingsApi, analyticsApi, alertsApi, locationsApi, apiUtils } from '@/lib/api-client';
import { ApiResponse } from '@/types/api';

interface UseApiDataOptions {
  autoRefresh?: boolean;
  refreshInterval?: number; // in milliseconds
  enabled?: boolean;
  retryOnError?: boolean;
  maxRetries?: number;
}

interface UseApiDataResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  refresh: () => Promise<void>;
  refetch: () => Promise<void>;
}

// Generic hook for API data with auto-refresh
function useApiData<T>(
  fetcher: () => Promise<ApiResponse<T>>,
  options: UseApiDataOptions = {}
): UseApiDataResult<T> {
  const {
    autoRefresh = true,
    refreshInterval = 30000, // 30 seconds default
    enabled = true,
    retryOnError = true,
    maxRetries = 3
  } = options;

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const retryCountRef = useRef(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchData = useCallback(async (isRetry = false) => {
    if (!enabled) return;

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    
    if (!isRetry) {
      setLoading(true);
      setError(null);
    }

    try {
      const response = await fetcher();
      
      if (apiUtils.isSuccess(response)) {
        setData(response.data);
        setLastUpdated(new Date());
        setError(null);
        retryCountRef.current = 0;
      } else {
        throw new Error('API response indicates failure');
      }
    } catch (err) {
      const errorMessage = apiUtils.formatError(err);
      setError(errorMessage);
      
      // Retry logic
      if (retryOnError && retryCountRef.current < maxRetries) {
        retryCountRef.current++;
        setTimeout(() => fetchData(true), Math.pow(2, retryCountRef.current) * 1000);
      }
    } finally {
      setLoading(false);
    }
  }, [fetcher, enabled, retryOnError, maxRetries]);

  // Manual refresh function
  const refresh = useCallback(() => {
    retryCountRef.current = 0;
    return fetchData();
  }, [fetchData]);

  // Alias for refresh
  const refetch = refresh;

  // Setup auto-refresh
  useEffect(() => {
    if (!enabled) return;

    // Initial fetch
    fetchData();

    // Setup interval for auto-refresh
    if (autoRefresh && refreshInterval > 0) {
      intervalRef.current = setInterval(fetchData, refreshInterval);
    }

    // Cleanup
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [enabled, autoRefresh, refreshInterval, fetchData]);

  return {
    data,
    loading,
    error,
    lastUpdated,
    refresh,
    refetch
  };
}

// Specific hooks for different data types

// Hook for drivers data
export function useDriversData(params?: {
  status?: string;
  region?: string;
  search?: string;
  services?: string[];
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}, options?: UseApiDataOptions) {
  return useApiData(
    () => driversApi.getAll(params),
    { refreshInterval: 15000, ...options } // Refresh every 15 seconds
  );
}

// Hook for single driver data
export function useDriverData(id: string, options?: UseApiDataOptions) {
  return useApiData(
    () => driversApi.getById(id),
    { refreshInterval: 10000, ...options } // Refresh every 10 seconds
  );
}

// Hook for bookings data
export function useBookingsData(params?: {
  status?: string;
  serviceType?: string;
  driverId?: string;
  customerId?: string;
  regionId?: string;
  createdFrom?: string;
  createdTo?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}, options?: UseApiDataOptions) {
  return useApiData(
    () => bookingsApi.getAll(params),
    { refreshInterval: 10000, ...options } // Refresh every 10 seconds
  );
}

// Hook for single booking data
export function useBookingData(id: string, options?: UseApiDataOptions) {
  return useApiData(
    () => bookingsApi.getById(id),
    { refreshInterval: 5000, ...options } // Refresh every 5 seconds
  );
}

// Hook for driver locations
export function useLocationsData(params?: {
  regionId?: string;
  isAvailable?: boolean;
  status?: string;
  bounds?: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
}, options?: UseApiDataOptions) {
  return useApiData(
    () => locationsApi.getAll(params),
    { refreshInterval: 5000, ...options } // Refresh every 5 seconds for real-time tracking
  );
}

// Hook for analytics data
export function useAnalyticsData(params?: {
  timeRange?: '1h' | '24h' | '7d' | '30d';
  regionId?: string;
}, options?: UseApiDataOptions) {
  return useApiData(
    () => analyticsApi.getMetrics(params),
    { refreshInterval: 60000, ...options } // Refresh every minute
  );
}

// Hook for alerts/emergency data
export function useAlertsData(params?: {
  priority?: string;
  status?: string;
  regionId?: string;
  driverId?: string;
  incidentType?: string;
  createdFrom?: string;
  createdTo?: string;
  page?: number;
  limit?: number;
}, options?: UseApiDataOptions) {
  return useApiData(
    () => alertsApi.getAll(params),
    { refreshInterval: 5000, ...options } // Refresh every 5 seconds for emergency situations
  );
}

// Hook for single alert data
export function useAlertData(id: string, options?: UseApiDataOptions) {
  return useApiData(
    () => alertsApi.getById(id),
    { refreshInterval: 3000, ...options } // Refresh every 3 seconds for active incidents
  );
}

// Mutation hooks for creating/updating data
export function useDriverMutations() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createDriver = async (driver: any) => {
    setLoading(true);
    setError(null);
    try {
      const response = await driversApi.create(driver);
      if (apiUtils.isSuccess(response)) {
        return response.data;
      } else {
        throw new Error('Failed to create driver');
      }
    } catch (err) {
      const errorMessage = apiUtils.formatError(err);
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateDriver = async (id: string, updates: any) => {
    setLoading(true);
    setError(null);
    try {
      const response = await driversApi.patch(id, updates);
      if (apiUtils.isSuccess(response)) {
        return response.data;
      } else {
        throw new Error('Failed to update driver');
      }
    } catch (err) {
      const errorMessage = apiUtils.formatError(err);
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const deleteDriver = async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await driversApi.delete(id);
      if (apiUtils.isSuccess(response)) {
        return response.data;
      } else {
        throw new Error('Failed to delete driver');
      }
    } catch (err) {
      const errorMessage = apiUtils.formatError(err);
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    createDriver,
    updateDriver,
    deleteDriver,
    loading,
    error
  };
}

export function useBookingMutations() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createBooking = async (booking: any) => {
    setLoading(true);
    setError(null);
    try {
      const response = await bookingsApi.create(booking);
      if (apiUtils.isSuccess(response)) {
        return response.data;
      } else {
        throw new Error('Failed to create booking');
      }
    } catch (err) {
      const errorMessage = apiUtils.formatError(err);
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateBooking = async (id: string, updates: any) => {
    setLoading(true);
    setError(null);
    try {
      const response = await bookingsApi.patch(id, updates);
      if (apiUtils.isSuccess(response)) {
        return response.data;
      } else {
        throw new Error('Failed to update booking');
      }
    } catch (err) {
      const errorMessage = apiUtils.formatError(err);
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const cancelBooking = async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await bookingsApi.delete(id);
      if (apiUtils.isSuccess(response)) {
        return response.data;
      } else {
        throw new Error('Failed to cancel booking');
      }
    } catch (err) {
      const errorMessage = apiUtils.formatError(err);
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    createBooking,
    updateBooking,
    cancelBooking,
    loading,
    error
  };
}

export function useAlertMutations() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createAlert = async (alert: any) => {
    setLoading(true);
    setError(null);
    try {
      const response = await alertsApi.create(alert);
      if (apiUtils.isSuccess(response)) {
        return response.data;
      } else {
        throw new Error('Failed to create alert');
      }
    } catch (err) {
      const errorMessage = apiUtils.formatError(err);
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateAlert = async (id: string, updates: any) => {
    setLoading(true);
    setError(null);
    try {
      const response = await alertsApi.patch(id, updates);
      if (apiUtils.isSuccess(response)) {
        return response.data;
      } else {
        throw new Error('Failed to update alert');
      }
    } catch (err) {
      const errorMessage = apiUtils.formatError(err);
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const closeAlert = async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await alertsApi.delete(id);
      if (apiUtils.isSuccess(response)) {
        return response.data;
      } else {
        throw new Error('Failed to close alert');
      }
    } catch (err) {
      const errorMessage = apiUtils.formatError(err);
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    createAlert,
    updateAlert,
    closeAlert,
    loading,
    error
  };
}

// Combined hook for dashboard-level data
export function useDashboardData(regionId?: string, options?: UseApiDataOptions) {
  const driversResult = useDriversData({ region: regionId, limit: 50 }, options);
  const bookingsResult = useBookingsData({ regionId, status: 'active', limit: 20 }, options);
  const alertsResult = useAlertsData({ regionId, status: 'open', limit: 10 }, options);
  const analyticsResult = useAnalyticsData({ regionId, timeRange: '24h' }, options);
  const locationsResult = useLocationsData({ regionId }, options);

  const loading = driversResult.loading || bookingsResult.loading || 
                  alertsResult.loading || analyticsResult.loading || 
                  locationsResult.loading;
  
  const error = driversResult.error || bookingsResult.error || 
                alertsResult.error || analyticsResult.error || 
                locationsResult.error;

  const refresh = useCallback(async () => {
    await Promise.all([
      driversResult.refresh(),
      bookingsResult.refresh(),
      alertsResult.refresh(),
      analyticsResult.refresh(),
      locationsResult.refresh()
    ]);
  }, [driversResult, bookingsResult, alertsResult, analyticsResult, locationsResult]);

  return {
    drivers: driversResult.data,
    bookings: bookingsResult.data,
    alerts: alertsResult.data,
    analytics: analyticsResult.data,
    locations: locationsResult.data,
    loading,
    error,
    lastUpdated: new Date(), // Most recent update
    refresh
  };
}

export default {
  useDriversData,
  useDriverData,
  useBookingsData,
  useBookingData,
  useLocationsData,
  useAnalyticsData,
  useAlertsData,
  useAlertData,
  useDriverMutations,
  useBookingMutations,
  useAlertMutations,
  useDashboardData
};