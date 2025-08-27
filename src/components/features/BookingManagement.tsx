// Xpress Ops Tower - Booking Management Interface
// Advanced search, filtering, and real-time booking status management

'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { 
  Search, Filter, Calendar, MapPin, Navigation, User, Clock, 
  DollarSign, Phone, MessageCircle, MoreVertical, RefreshCw,
  CheckCircle, XCircle, AlertTriangle, Eye, Edit, Star, Loader
} from 'lucide-react';

import { Button, XpressCard as Card, Badge } from '@/components/xpress';
import { useBookingsData, useBookingMutations } from '@/hooks/useApiData';

interface Booking {
  id: string;
  passengerName: string;
  passengerPhone: string;
  passengerRating: number;
  pickup: {
    address: string;
    coordinates: [number, number];
    landmark?: string;
  };
  destination: {
    address: string;
    coordinates: [number, number];
    landmark?: string;
  };
  driverId?: string;
  driverName?: string;
  driverRating?: number;
  status: 'pending' | 'assigned' | 'pickup' | 'en_route' | 'completed' | 'cancelled';
  bookingTime: Date;
  pickupTime?: Date;
  completionTime?: Date;
  estimatedDuration: number; // in minutes
  estimatedFare: number;
  actualFare?: number;
  distance: number; // in kilometers
  paymentMethod: 'cash' | 'card' | 'digital_wallet';
  paymentStatus: 'pending' | 'paid' | 'failed';
  vehicleType: 'standard' | 'premium' | 'suv' | 'motorcycle';
  specialRequests?: string[];
  rating?: number;
  feedback?: string;
  promoCode?: string;
  discount?: number;
}

interface BookingManagementProps {
  regionId?: string;
  userRole?: 'admin' | 'operator' | 'supervisor';
}

type StatusFilter = 'all' | 'pending' | 'assigned' | 'pickup' | 'en_route' | 'completed' | 'cancelled';
type PaymentFilter = 'all' | 'pending' | 'paid' | 'failed';
type SortField = 'bookingTime' | 'estimatedFare' | 'distance' | 'status' | 'passengerName';
type SortDirection = 'asc' | 'desc';

export const BookingManagement: React.FC<BookingManagementProps> = ({
  regionId,
  userRole = 'operator'
}) => {
  // API data integration
  const [currentPage, setCurrentPage] = useState(1);
  const [limit] = useState(25);

  // Fetch bookings data with real-time updates  
  const {
    data: bookingsResponse,
    loading: bookingsLoading,
    error: bookingsError,
    lastUpdated,
    refresh: refreshBookings
  } = useBookingsData({
    regionId,
    page: currentPage,
    limit,
    sortBy: 'bookingTime',
    sortOrder: 'desc'
  }, {
    autoRefresh: true,
    refreshInterval: 10000 // Refresh every 10 seconds for active bookings
  });

  // Booking mutations for status updates
  const {
    updateBooking,
    cancelBooking,
    loading: mutationLoading,
    error: mutationError
  } = useBookingMutations();

  // Extract bookings from API response
  const bookings = bookingsResponse?.data || [];
  const totalBookings = bookingsResponse?.total || 0;

  // Status update handler
  const handleStatusUpdate = useCallback(async (bookingId: string, newStatus: string) => {
    try {
      await updateBooking(bookingId, { status: newStatus });
      refreshBookings(); // Refresh data after update
    } catch (error) {
      console.error('Failed to update booking status:', error);
    }
  }, [updateBooking, refreshBookings]);

  // Booking cancellation handler
  const handleCancelBooking = useCallback(async (bookingId: string) => {
    try {
      await cancelBooking(bookingId);
      refreshBookings(); // Refresh data after cancellation
    } catch (error) {
      console.error('Failed to cancel booking:', error);
    }
  }, [cancelBooking, refreshBookings]);

  // UI State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>('all');
  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month' | 'custom'>('today');
  const [sortField, setSortField] = useState<SortField>('bookingTime');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [selectedBookings, setSelectedBookings] = useState<Set<string>>(new Set());
  const [showFilters, setShowFilters] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  // Filter and sort bookings
  const filteredAndSortedBookings = useMemo(() => {
    let filtered = bookings.filter(booking => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (
          !booking.id.toLowerCase().includes(query) &&
          !booking.passengerName.toLowerCase().includes(query) &&
          !booking.passengerPhone.includes(query) &&
          !booking.pickup.address.toLowerCase().includes(query) &&
          !booking.destination.address.toLowerCase().includes(query)
        ) {
          return false;
        }
      }

      // Status filter
      if (statusFilter !== 'all' && booking.status !== statusFilter) {
        return false;
      }

      // Payment filter
      if (paymentFilter !== 'all' && booking.paymentStatus !== paymentFilter) {
        return false;
      }

      // Date range filter (simplified)
      const now = new Date();
      switch (dateRange) {
        case 'today':
          if (booking.bookingTime.toDateString() !== now.toDateString()) {
            return false;
          }
          break;
        case 'week':
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          if (booking.bookingTime < weekAgo) {
            return false;
          }
          break;
        case 'month':
          const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          if (booking.bookingTime < monthAgo) {
            return false;
          }
          break;
      }

      return true;
    });

    // Sort
    filtered.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortField) {
        case 'bookingTime':
          aValue = a.bookingTime.getTime();
          bValue = b.bookingTime.getTime();
          break;
        case 'estimatedFare':
          aValue = a.estimatedFare;
          bValue = b.estimatedFare;
          break;
        case 'distance':
          aValue = a.distance;
          bValue = b.distance;
          break;
        case 'status':
          aValue = a.status;
          bValue = b.status;
          break;
        case 'passengerName':
          aValue = a.passengerName;
          bValue = b.passengerName;
          break;
        default:
          return 0;
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      if (sortDirection === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

    return filtered;
  }, [bookings, searchQuery, statusFilter, paymentFilter, dateRange, sortField, sortDirection]);

  // Handle sorting
  const handleSort = useCallback((field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  }, [sortField]);

  // Handle booking selection
  const handleBookingSelect = useCallback((bookingId: string) => {
    setSelectedBookings(prev => {
      const newSet = new Set(prev);
      if (newSet.has(bookingId)) {
        newSet.delete(bookingId);
      } else {
        newSet.add(bookingId);
      }
      return newSet;
    });
  }, []);

  // Select all bookings
  const handleSelectAll = useCallback(() => {
    if (selectedBookings.size === filteredAndSortedBookings.length) {
      setSelectedBookings(new Set());
    } else {
      setSelectedBookings(new Set(filteredAndSortedBookings.map(b => b.id)));
    }
  }, [selectedBookings.size, filteredAndSortedBookings]);

  // Get status badge variant
  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'completed': return 'success';
      case 'en_route': case 'pickup': return 'warning';
      case 'assigned': return 'info';
      case 'pending': return 'secondary';
      case 'cancelled': return 'danger';
      default: return 'secondary';
    }
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return `₱${amount.toLocaleString()}`;
  };

  // Format duration
  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="border-b border-neutral-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-neutral-900">Booking Management</h2>
            <p className="text-neutral-600">
              Manage {totalBookings} bookings and track trip status
              {lastUpdated && (
                <span className="text-neutral-400 text-sm ml-2">
                  • Updated {lastUpdated.toLocaleTimeString()}
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <Button 
              variant="tertiary" 
              size="sm"
              leftIcon={bookingsLoading ? <Loader className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              onClick={() => refreshBookings()}
              disabled={bookingsLoading}
            >
              Refresh
            </Button>
            <Button 
              variant="secondary" 
              leftIcon={<Calendar className="h-4 w-4" />}
              disabled={bookingsLoading}
            >
              Export
            </Button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-neutral-400" />
            <input
              type="text"
              placeholder="Search by booking ID, passenger name, phone, or address..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-xpress-500 focus:border-xpress-500"
            />
          </div>

          {/* Quick Filters */}
          <div className="flex items-center space-x-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              className="px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-xpress-500 focus:border-xpress-500"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="assigned">Assigned</option>
              <option value="pickup">Pickup</option>
              <option value="en_route">En Route</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>

            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as any)}
              className="px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-xpress-500 focus:border-xpress-500"
            >
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="custom">Custom</option>
            </select>

            <Button
              variant={showFilters ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-4 w-4" />
              Filters
            </Button>
          </div>
        </div>

        {/* Advanced Filters */}
        {showFilters && (
          <div className="mt-4 p-4 bg-neutral-50 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Payment Status
                </label>
                <select
                  value={paymentFilter}
                  onChange={(e) => setPaymentFilter(e.target.value as PaymentFilter)}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-xpress-500 focus:border-xpress-500"
                >
                  <option value="all">All Payments</option>
                  <option value="pending">Pending</option>
                  <option value="paid">Paid</option>
                  <option value="failed">Failed</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Sort By
                </label>
                <select
                  value={sortField}
                  onChange={(e) => setSortField(e.target.value as SortField)}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-xpress-500 focus:border-xpress-500"
                >
                  <option value="bookingTime">Booking Time</option>
                  <option value="estimatedFare">Fare Amount</option>
                  <option value="distance">Distance</option>
                  <option value="status">Status</option>
                  <option value="passengerName">Passenger Name</option>
                </select>
              </div>

              <div className="flex items-end">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setStatusFilter('all');
                    setPaymentFilter('all');
                    setDateRange('today');
                    setSearchQuery('');
                  }}
                >
                  Clear Filters
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Error Display */}
        {(bookingsError || mutationError) && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <XCircle className="h-5 w-5 text-red-600" />
              <div>
                <h4 className="font-medium text-red-900">Error Loading Data</h4>
                <p className="text-sm text-red-700">
                  {bookingsError || mutationError}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Results Summary */}
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-neutral-600">
            {bookingsLoading ? (
              <span className="flex items-center space-x-2">
                <Loader className="h-4 w-4 animate-spin" />
                <span>Loading bookings...</span>
              </span>
            ) : (
              <>
                Showing {filteredAndSortedBookings.length} of {totalBookings} bookings
                {selectedBookings.size > 0 && (
                  <span className="ml-2 font-medium">
                    ({selectedBookings.size} selected)
                  </span>
                )}
              </>
            )}
          </p>

          {selectedBookings.size > 0 && (
            <div className="flex items-center space-x-2">
              <Button variant="secondary" size="sm" disabled={mutationLoading}>
                Bulk Actions
              </Button>
              {userRole === 'admin' && (
                <Button 
                  variant="danger" 
                  size="sm" 
                  disabled={mutationLoading}
                  onClick={() => {
                    // Implement bulk cancellation
                  }}
                >
                  Cancel Selected
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {bookingsLoading && bookings.length === 0 ? (
          /* Loading State */
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <Loader className="h-8 w-8 animate-spin mx-auto text-xpress-600 mb-4" />
              <p className="text-neutral-600">Loading bookings...</p>
            </div>
          </div>
        ) : bookings.length === 0 && !bookingsLoading ? (
          /* Empty State */
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <Calendar className="h-12 w-12 mx-auto text-neutral-400 mb-4" />
              <h3 className="text-lg font-medium text-neutral-900 mb-2">No bookings found</h3>
              <p className="text-neutral-600">
                {searchQuery || statusFilter !== 'all' ? 
                  'No bookings match your current filters.' : 
                  'No bookings available for the selected time period.'
                }
              </p>
            </div>
          </div>
        ) : (
          /* Table View */
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-neutral-50 border-b border-neutral-200">
                <tr>
                  <th className="px-6 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedBookings.size === filteredAndSortedBookings.length}
                      onChange={handleSelectAll}
                      className="rounded border-neutral-300 text-xpress-600 focus:ring-xpress-500"
                    />
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider cursor-pointer hover:bg-neutral-100"
                    onClick={() => handleSort('bookingTime')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Booking</span>
                      {sortField === 'bookingTime' && (
                        <span className="text-xpress-600">
                          {sortDirection === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider cursor-pointer hover:bg-neutral-100"
                    onClick={() => handleSort('passengerName')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Passenger</span>
                      {sortField === 'passengerName' && (
                        <span className="text-xpress-600">
                          {sortDirection === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    Route
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    Driver
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider cursor-pointer hover:bg-neutral-100"
                    onClick={() => handleSort('estimatedFare')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Fare</span>
                      {sortField === 'estimatedFare' && (
                        <span className="text-xpress-600">
                          {sortDirection === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    Payment
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-neutral-200">
                {filteredAndSortedBookings.map((booking) => (
                  <tr key={booking.id} className="hover:bg-neutral-50">
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={selectedBookings.has(booking.id)}
                        onChange={() => handleBookingSelect(booking.id)}
                        className="rounded border-neutral-300 text-xpress-600 focus:ring-xpress-500"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-neutral-900">
                          #{booking.id}
                        </div>
                        <div className="text-sm text-neutral-500">
                          {booking.bookingTime.toLocaleString()}
                        </div>
                        <div className="text-xs text-neutral-400">
                          {formatDuration(booking.estimatedDuration)}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-xpress-100 rounded-full flex items-center justify-center">
                          <User className="h-4 w-4 text-xpress-600" />
                        </div>
                        <div>
                          <div className="text-sm font-medium text-neutral-900">
                            {booking.passengerName}
                          </div>
                          <div className="text-sm text-neutral-500">
                            {booking.passengerPhone}
                          </div>
                          <div className="flex items-center space-x-1">
                            <Star className="h-3 w-3 text-yellow-400 fill-current" />
                            <span className="text-xs text-neutral-500">
                              {booking.passengerRating}
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-1 text-sm">
                          <MapPin className="h-3 w-3 text-green-600" />
                          <span className="text-neutral-900 truncate max-w-[200px]">
                            {booking.pickup.address}
                          </span>
                        </div>
                        <div className="flex items-center space-x-1 text-sm">
                          <Navigation className="h-3 w-3 text-red-600" />
                          <span className="text-neutral-900 truncate max-w-[200px]">
                            {booking.destination.address}
                          </span>
                        </div>
                        <div className="text-xs text-neutral-500">
                          {booking.distance.toFixed(1)} km
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {booking.driverName ? (
                        <div>
                          <div className="text-sm font-medium text-neutral-900">
                            {booking.driverName}
                          </div>
                          <div className="flex items-center space-x-1">
                            <Star className="h-3 w-3 text-yellow-400 fill-current" />
                            <span className="text-xs text-neutral-500">
                              {booking.driverRating}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <span className="text-sm text-neutral-500">Unassigned</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={getStatusVariant(booking.status)} size="sm">
                        {booking.status.replace('_', ' ')}
                      </Badge>
                      {booking.pickupTime && booking.status === 'en_route' && (
                        <div className="text-xs text-neutral-500 mt-1">
                          Started {booking.pickupTime.toLocaleTimeString()}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-green-600">
                          {formatCurrency(booking.actualFare || booking.estimatedFare)}
                        </div>
                        {booking.discount && booking.discount > 0 && (
                          <div className="text-xs text-orange-600">
                            -{formatCurrency(booking.discount)} discount
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <Badge 
                          variant={booking.paymentStatus === 'paid' ? 'success' : 
                                 booking.paymentStatus === 'failed' ? 'danger' : 'warning'} 
                          size="xs"
                        >
                          {booking.paymentStatus}
                        </Badge>
                        <div className="text-xs text-neutral-500 capitalize">
                          {booking.paymentMethod.replace('_', ' ')}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <Button variant="tertiary" size="sm">
                          <Eye className="h-3 w-3" />
                        </Button>
                        <Button variant="tertiary" size="sm">
                          <Phone className="h-3 w-3" />
                        </Button>
                        <Button variant="tertiary" size="sm">
                          <MessageCircle className="h-3 w-3" />
                        </Button>
                        {(userRole === 'admin' || userRole === 'supervisor') && (
                          <Button variant="tertiary" size="sm">
                            <Edit className="h-3 w-3" />
                          </Button>
                        )}
                        <Button variant="tertiary" size="sm">
                          <MoreVertical className="h-3 w-3" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default BookingManagement;