'use client';

import { useState, useEffect } from 'react';
import { useEnhancedAuth } from './useEnhancedAuth';
import { logger } from '@/lib/security/productionLogger';

export interface Booking {
  id: string;
  passengerId: string;
  driverId?: string;
  serviceType: 'ride_4w' | 'ride_2w' | 'send_delivery' | 'eats_delivery' | 'mart_delivery';
  status: 'requested' | 'searching' | 'assigned' | 'accepted' | 'en_route' | 'arrived' | 'in_progress' | 'completed' | 'cancelled';
  pickupLocation: {
    address: string;
    lat: number;
    lng: number;
  };
  dropoffLocation: {
    address: string;
    lat: number;
    lng: number;
  };
  estimatedFare: number;
  actualFare?: number;
  distance: number;
  duration: number;
  requestedAt: string;
  assignedAt?: string;
  acceptedAt?: string;
  completedAt?: string;
  cancelledAt?: string;
  rating?: number;
  feedback?: string;
  paymentMethod: 'cash' | 'gcash' | 'card' | 'wallet';
  paymentStatus: 'pending' | 'paid' | 'failed';
  regionId: string;
}

export interface UseBookingsOptions {
  status?: string[];
  serviceType?: string;
  passengerId?: string;
  driverId?: string;
  regionId?: string;
  refreshInterval?: number;
  search?: string;
  page?: number;
  limit?: number;
  dateRange?: {
    from: Date;
    to: Date;
  };
}

export function useBookings(options: UseBookingsOptions = {}) {
  const { user, isAuthenticated } = useEnhancedAuth();
  const [data, setData] = useState<{
    bookings: Booking[];
    total: number;
    pagination: {
      page: number;
      limit: number;
      totalPages: number;
    };
    summary: {
      active: number;
      completed: number;
      cancelled: number;
      totalRevenue: number;
    };
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    status,
    serviceType,
    passengerId,
    driverId,
    regionId,
    refreshInterval = 15000, // 15 seconds for more real-time updates
    search,
    page = 1,
    limit = 50,
    dateRange
  } = options;

  const fetchBookings = async () => {
    if (!isAuthenticated) return;

    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (status) params.append('status', status.join(','));
      if (serviceType) params.append('serviceType', serviceType);
      if (passengerId) params.append('passengerId', passengerId);
      if (driverId) params.append('driverId', driverId);
      if (regionId) params.append('regionId', regionId);
      if (search) params.append('search', search);
      params.append('page', page.toString());
      params.append('limit', limit.toString());
      if (dateRange) {
        params.append('dateFrom', dateRange.from.toISOString());
        params.append('dateTo', dateRange.to.toISOString());
      }

      const token = localStorage.getItem('xpress_auth_token');
      const response = await fetch(`/api/bookings?${params.toString()}`, {
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
      logger.error('Error fetching bookings', { error: err instanceof Error ? err.message : err });
      setError(err instanceof Error ? err.message : 'Failed to fetch bookings data');
    } finally {
      setLoading(false);
    }
  };

  const updateBookingStatus = async (bookingId: string, newStatus: Booking['status'], notes?: string) => {
    if (!isAuthenticated) return;

    try {
      const token = localStorage.getItem('xpress_auth_token');
      const response = await fetch(`/api/bookings/${bookingId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          status: newStatus,
          notes
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to update booking status');
      }

      // Refresh the data after successful update
      await fetchBookings();
    } catch (err) {
      logger.error('Error updating booking status', { error: err instanceof Error ? err.message : err, bookingId, newStatus });
      throw err;
    }
  };

  const assignDriver = async (bookingId: string, driverId: string) => {
    if (!isAuthenticated) return;

    try {
      const token = localStorage.getItem('xpress_auth_token');
      const response = await fetch(`/api/bookings/${bookingId}/assign`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ driverId })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to assign driver');
      }

      // Refresh the data after successful assignment
      await fetchBookings();
    } catch (err) {
      logger.error('Error assigning driver', { error: err instanceof Error ? err.message : err, bookingId, driverId });
      throw err;
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchBookings();
  }, [isAuthenticated, status, serviceType, passengerId, driverId, regionId, search, page, limit, dateRange]);

  // Auto-refresh for active bookings
  useEffect(() => {
    if (!refreshInterval || !isAuthenticated) return;

    const interval = setInterval(fetchBookings, refreshInterval);
    return () => clearInterval(interval);
  }, [refreshInterval, isAuthenticated, status, serviceType, passengerId, driverId, regionId, search, page, limit, dateRange]);

  return {
    data,
    loading,
    error,
    refresh: fetchBookings,
    updateBookingStatus,
    assignDriver
  };
}

export default useBookings;