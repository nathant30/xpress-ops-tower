'use client';

import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import { logger } from '@/lib/security/productionLogger';

export interface Driver {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  status: 'active' | 'busy' | 'offline' | 'suspended' | 'banned';
  vehicleType: 'motorcycle' | 'car' | 'suv' | 'taxi';
  vehicleId: string;
  location?: {
    lat: number;
    lng: number;
    address: string;
    recordedAt: string;
  };
  rating: number;
  totalRides: number;
  onlineHours: number;
  earnings: number;
  documents: {
    driversLicense: boolean;
    vehicleRegistration: boolean;
    insurance: boolean;
  };
  createdAt: string;
  lastLogin?: string;
}

export interface UseDriversOptions {
  status?: string;
  vehicleType?: string;
  regionId?: string;
  refreshInterval?: number;
  search?: string;
  page?: number;
  limit?: number;
}

export function useDrivers(options: UseDriversOptions = {}) {
  const { user, isAuthenticated } = useAuth();
  const [data, setData] = useState<{
    drivers: Driver[];
    total: number;
    pagination: {
      page: number;
      limit: number;
      totalPages: number;
    };
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    status,
    vehicleType,
    regionId,
    refreshInterval = 30000, // 30 seconds
    search,
    page = 1,
    limit = 50
  } = options;

  const fetchDrivers = async () => {
    if (!isAuthenticated) return;

    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (status) params.append('status', status);
      if (vehicleType) params.append('vehicleType', vehicleType);
      if (regionId) params.append('regionId', regionId);
      if (search) params.append('search', search);
      params.append('page', page.toString());
      params.append('limit', limit.toString());

      const token = localStorage.getItem('xpress_auth_token');
      const response = await fetch(`/api/drivers?${params.toString()}`, {
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
      logger.error('Error fetching drivers', { error: err instanceof Error ? err.message : err });
      setError(err instanceof Error ? err.message : 'Failed to fetch drivers data');
    } finally {
      setLoading(false);
    }
  };

  const updateDriverStatus = async (driverId: string, newStatus: Driver['status']) => {
    if (!isAuthenticated) return;

    try {
      const token = localStorage.getItem('xpress_auth_token');
      const response = await fetch(`/api/drivers/${driverId}/status`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to update driver status');
      }

      // Refresh the data after successful update
      await fetchDrivers();
    } catch (err) {
      logger.error('Error updating driver status', { error: err instanceof Error ? err.message : err, driverId, newStatus });
      throw err;
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchDrivers();
  }, [isAuthenticated, status, vehicleType, regionId, search, page, limit]);

  // Auto-refresh
  useEffect(() => {
    if (!refreshInterval || !isAuthenticated) return;

    const interval = setInterval(fetchDrivers, refreshInterval);
    return () => clearInterval(interval);
  }, [refreshInterval, isAuthenticated, status, vehicleType, regionId, search, page, limit]);

  return {
    data,
    loading,
    error,
    refresh: fetchDrivers,
    updateDriverStatus
  };
}

export default useDrivers;