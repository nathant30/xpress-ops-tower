// Xpress Ops Tower - Booking Management Interface
// Advanced search, filtering, and real-time booking status management

'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { 
  Search, Filter, Calendar, MapPin, Navigation, User, Clock, 
  DollarSign, Phone, MessageCircle, MoreVertical, RefreshCw,
  CheckCircle, XCircle, AlertTriangle, Eye, Edit, Star
} from 'lucide-react';

import { Button, XpressCard as Card, Badge } from '@/components/xpress';

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
  // Mock booking data - would come from API
  const [bookings] = useState<Booking[]>([
    {
      id: 'BK001',
      passengerName: 'Maria Santos',
      passengerPhone: '+63 917 123 4567',
      passengerRating: 4.8,
      pickup: {
        address: 'Greenbelt Mall, Makati City',
        coordinates: [14.5545, 121.0197],
        landmark: 'Near Starbucks entrance'
      },
      destination: {
        address: 'NAIA Terminal 3, Pasay City',
        coordinates: [14.5086, 121.0198],
        landmark: 'Departure level'
      },
      driverId: 'DR001',
      driverName: 'Juan Cruz',
      driverRating: 4.9,
      status: 'en_route',
      bookingTime: new Date(Date.now() - 1800000), // 30 min ago
      pickupTime: new Date(Date.now() - 900000), // 15 min ago
      estimatedDuration: 45,
      estimatedFare: 450,
      distance: 12.5,
      paymentMethod: 'card',
      paymentStatus: 'paid',
      vehicleType: 'standard',
      specialRequests: ['Air conditioning', 'Child seat'],
      promoCode: 'AIRPORT20',
      discount: 90
    },
    {
      id: 'BK002',
      passengerName: 'Carlos Mendoza',
      passengerPhone: '+63 917 987 6543',
      passengerRating: 4.2,
      pickup: {
        address: 'SM Megamall, Ortigas Center',
        coordinates: [14.6868, 121.0579],
        landmark: 'Main entrance'
      },
      destination: {
        address: 'Bonifacio Global City, Taguig',
        coordinates: [14.5515, 121.0457],
        landmark: 'High Street area'
      },
      driverId: 'DR002',
      driverName: 'Ana Garcia',
      driverRating: 4.7,
      status: 'pickup',
      bookingTime: new Date(Date.now() - 600000), // 10 min ago
      estimatedDuration: 30,
      estimatedFare: 380,
      distance: 8.2,
      paymentMethod: 'cash',
      paymentStatus: 'pending',
      vehicleType: 'standard'
    },
    {
      id: 'BK003',
      passengerName: 'Isabella Reyes',
      passengerPhone: '+63 917 555 0123',
      passengerRating: 4.9,
      pickup: {
        address: 'Ayala Triangle Gardens, Makati',
        coordinates: [14.5579, 121.0292],
        landmark: 'Near fountain'
      },
      destination: {
        address: 'Quezon City Hall, Quezon City',
        coordinates: [14.6760, 121.0437],
        landmark: 'Main building'
      },
      status: 'pending',
      bookingTime: new Date(Date.now() - 300000), // 5 min ago
      estimatedDuration: 55,
      estimatedFare: 520,
      distance: 15.8,
      paymentMethod: 'digital_wallet',
      paymentStatus: 'pending',
      vehicleType: 'premium',
      specialRequests: ['Wi-Fi', 'Quiet ride']
    },
    {
      id: 'BK004',
      passengerName: 'Roberto Torres',
      passengerPhone: '+63 917 444 9876',
      passengerRating: 3.8,
      pickup: {
        address: 'Mall of Asia, Pasay City',
        coordinates: [14.5344, 120.9827],
        landmark: 'North parking area'
      },
      destination: {
        address: 'Alabang Town Center, Muntinlupa',
        coordinates: [14.4198, 121.0390],
        landmark: 'Main entrance'
      },
      driverId: 'DR003',
      driverName: 'Roberto Santos',
      driverRating: 4.1,
      status: 'completed',
      bookingTime: new Date(Date.now() - 3600000), // 1 hour ago
      pickupTime: new Date(Date.now() - 3300000), // 55 min ago
      completionTime: new Date(Date.now() - 1800000), // 30 min ago
      estimatedDuration: 25,
      estimatedFare: 320,
      actualFare: 315,
      distance: 11.2,
      paymentMethod: 'cash',
      paymentStatus: 'paid',
      vehicleType: 'standard',
      rating: 5,
      feedback: 'Great service, very professional driver!'
    }
  ]);

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
  const [refreshing, setRefreshing] = useState(false);

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
          !booking.destination.address.toLowerCase().includes(query) &&
          !booking.driverName?.toLowerCase().includes(query)
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
      const bookingDate = booking.bookingTime;
      
      switch (dateRange) {
        case 'today':
          if (bookingDate.toDateString() !== now.toDateString()) {
            return false;
          }
          break;
        case 'week':
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          if (bookingDate < weekAgo) {
            return false;
          }
          break;
        case 'month':
          const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          if (bookingDate < monthAgo) {
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
          aValue = a[sortField];
          bValue = b[sortField];
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
      setSortDirection('desc'); // Most recent first by default
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
      case 'en_route':
      case 'pickup': return 'warning';
      case 'assigned': return 'info';
      case 'cancelled': return 'danger';
      case 'pending': return 'secondary';
      default: return 'secondary';
    }
  };

  // Get payment status badge variant
  const getPaymentVariant = (status: string) => {
    switch (status) {
      case 'paid': return 'success';
      case 'failed': return 'danger';
      case 'pending': return 'warning';
      default: return 'secondary';
    }
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return `₱${amount.toLocaleString()}`;
  };

  // Format time ago
  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / 60000);
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return date.toLocaleDateString();
  };

  // Handle refresh
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    setRefreshing(false);
  }, []);

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="border-b border-neutral-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-neutral-900">Booking Management</h2>
            <p className="text-neutral-600">
              Managing {bookings.length} bookings • {filteredAndSortedBookings.length} showing
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <Button 
              variant="secondary" 
              leftIcon={<RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />}
              onClick={handleRefresh}
              disabled={refreshing}
            >
              Refresh
            </Button>
            {userRole === 'admin' && (
              <Button variant="primary" leftIcon={<Plus className="h-4 w-4" />}>
                Manual Booking
              </Button>
            )}
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-neutral-400" />
            <input
              type="text"
              placeholder="Search bookings by ID, passenger, driver, or location..."
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
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value as PaymentFilter)}
              className="px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-xpress-500 focus:border-xpress-500"
            >
              <option value="all">All Payments</option>
              <option value="pending">Pending</option>
              <option value="paid">Paid</option>
              <option value="failed">Failed</option>
            </select>

            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as 'today' | 'week' | 'month' | 'custom')}
              className="px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-xpress-500 focus:border-xpress-500"
            >
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="custom">Custom Range</option>
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
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Vehicle Type
                </label>
                <select className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-xpress-500 focus:border-xpress-500">
                  <option value="">All Types</option>
                  <option value="standard">Standard</option>
                  <option value="premium">Premium</option>
                  <option value="suv">SUV</option>
                  <option value="motorcycle">Motorcycle</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Payment Method
                </label>
                <select className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-xpress-500 focus:border-xpress-500">
                  <option value="">All Methods</option>
                  <option value="cash">Cash</option>
                  <option value="card">Card</option>
                  <option value="digital_wallet">Digital Wallet</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Fare Range
                </label>
                <div className="flex space-x-2">
                  <input
                    type="number"
                    placeholder="Min"
                    className="flex-1 px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-xpress-500 focus:border-xpress-500"
                  />
                  <input
                    type="number"
                    placeholder="Max"
                    className="flex-1 px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-xpress-500 focus:border-xpress-500"
                  />
                </div>
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

        {/* Results Summary */}
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-neutral-600">
            Showing {filteredAndSortedBookings.length} of {bookings.length} bookings
            {selectedBookings.size > 0 && (
              <span className="ml-2 font-medium">
                ({selectedBookings.size} selected)
              </span>
            )}
          </p>

          {selectedBookings.size > 0 && (
            <div className="flex items-center space-x-2">
              <Button variant="secondary" size="sm">
                Export Selected
              </Button>
              {userRole === 'admin' && (
                <Button variant="danger" size="sm">
                  Cancel Selected
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
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
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  Booking
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  Passenger
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
                      <div className="text-xs text-neutral-500">
                        {formatTimeAgo(booking.bookingTime)}
                      </div>
                      <div className="text-xs text-neutral-500">
                        {booking.distance.toFixed(1)}km • {booking.estimatedDuration}min
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <User className="h-4 w-4 text-blue-600" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-neutral-900">
                          {booking.passengerName}
                        </div>
                        <div className="flex items-center space-x-1">
                          <Star className="h-3 w-3 text-yellow-400 fill-current" />
                          <span className="text-xs text-neutral-500">
                            {booking.passengerRating}
                          </span>
                        </div>
                        <div className="text-xs text-neutral-400">
                          {booking.passengerPhone}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-1 text-xs text-neutral-600">
                        <MapPin className="h-3 w-3 text-green-500" />
                        <span className="truncate max-w-48">{booking.pickup.address}</span>
                      </div>
                      <div className="flex items-center space-x-1 text-xs text-neutral-600">
                        <Navigation className="h-3 w-3 text-red-500" />
                        <span className="truncate max-w-48">{booking.destination.address}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {booking.driverId ? (
                      <div className="flex items-center space-x-2">
                        <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                          <User className="h-3 w-3 text-green-600" />
                        </div>
                        <div>
                          <div className="text-xs font-medium text-neutral-900">
                            {booking.driverName}
                          </div>
                          <div className="flex items-center space-x-1">
                            <Star className="h-2 w-2 text-yellow-400 fill-current" />
                            <span className="text-xs text-neutral-500">
                              {booking.driverRating}
                            </span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <span className="text-xs text-neutral-400">Not assigned</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant={getStatusVariant(booking.status)} size="sm">
                      {booking.status.replace('_', ' ')}
                    </Badge>
                    {booking.status === 'en_route' && booking.pickupTime && (
                      <div className="text-xs text-neutral-500 mt-1">
                        ETA: {Math.max(0, booking.estimatedDuration - Math.floor((Date.now() - booking.pickupTime.getTime()) / 60000))}min
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-neutral-900">
                      {formatCurrency(booking.actualFare || booking.estimatedFare)}
                    </div>
                    {booking.discount && booking.discount > 0 && (
                      <div className="text-xs text-green-600">
                        -{formatCurrency(booking.discount)} ({booking.promoCode})
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      <Badge variant={getPaymentVariant(booking.paymentStatus)} size="xs">
                        {booking.paymentStatus}
                      </Badge>
                      <div className="text-xs text-neutral-500 capitalize">
                        {booking.paymentMethod.replace('_', ' ')}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2">
                      <Button variant="tertiary" size="sm" onClick={() => setSelectedBooking(booking)}>
                        <Eye className="h-3 w-3" />
                      </Button>
                      <Button variant="tertiary" size="sm">
                        <Phone className="h-3 w-3" />
                      </Button>
                      <Button variant="tertiary" size="sm">
                        <MessageCircle className="h-3 w-3" />
                      </Button>
                      {userRole === 'admin' && (
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
      </div>

      {/* Booking Detail Modal */}
      {selectedBooking && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setSelectedBooking(null)}>
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full m-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-neutral-900">
                Booking Details - #{selectedBooking.id}
              </h3>
              <Button variant="tertiary" size="sm" onClick={() => setSelectedBooking(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-neutral-900 mb-2">Passenger Information</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-neutral-600">Name:</span>
                      <span className="font-medium">{selectedBooking.passengerName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-600">Phone:</span>
                      <span className="font-medium">{selectedBooking.passengerPhone}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-600">Rating:</span>
                      <div className="flex items-center space-x-1">
                        <Star className="h-3 w-3 text-yellow-400 fill-current" />
                        <span className="font-medium">{selectedBooking.passengerRating}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-neutral-900 mb-2">Route Information</h4>
                  <div className="space-y-3 text-sm">
                    <div>
                      <div className="flex items-center space-x-2 text-green-600 mb-1">
                        <MapPin className="h-4 w-4" />
                        <span className="font-medium">Pickup Location</span>
                      </div>
                      <p className="text-neutral-600 ml-6">{selectedBooking.pickup.address}</p>
                      {selectedBooking.pickup.landmark && (
                        <p className="text-neutral-500 text-xs ml-6">
                          Landmark: {selectedBooking.pickup.landmark}
                        </p>
                      )}
                    </div>
                    
                    <div>
                      <div className="flex items-center space-x-2 text-red-600 mb-1">
                        <Navigation className="h-4 w-4" />
                        <span className="font-medium">Destination</span>
                      </div>
                      <p className="text-neutral-600 ml-6">{selectedBooking.destination.address}</p>
                      {selectedBooking.destination.landmark && (
                        <p className="text-neutral-500 text-xs ml-6">
                          Landmark: {selectedBooking.destination.landmark}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-neutral-900 mb-2">Trip Details</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-neutral-600">Status:</span>
                      <Badge variant={getStatusVariant(selectedBooking.status)} size="sm">
                        {selectedBooking.status.replace('_', ' ')}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-600">Distance:</span>
                      <span className="font-medium">{selectedBooking.distance.toFixed(1)} km</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-600">Duration:</span>
                      <span className="font-medium">{selectedBooking.estimatedDuration} min</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-600">Vehicle Type:</span>
                      <span className="font-medium capitalize">{selectedBooking.vehicleType}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-neutral-900 mb-2">Payment Information</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-neutral-600">Method:</span>
                      <span className="font-medium capitalize">{selectedBooking.paymentMethod.replace('_', ' ')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-600">Status:</span>
                      <Badge variant={getPaymentVariant(selectedBooking.paymentStatus)} size="sm">
                        {selectedBooking.paymentStatus}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-600">Fare:</span>
                      <span className="font-medium">{formatCurrency(selectedBooking.estimatedFare)}</span>
                    </div>
                    {selectedBooking.discount && selectedBooking.discount > 0 && (
                      <div className="flex justify-between">
                        <span className="text-neutral-600">Discount:</span>
                        <span className="font-medium text-green-600">
                          -{formatCurrency(selectedBooking.discount)}
                        </span>
                      </div>
                    )}
                    {selectedBooking.actualFare && (
                      <div className="flex justify-between border-t border-neutral-200 pt-2">
                        <span className="text-neutral-900 font-medium">Total Paid:</span>
                        <span className="font-semibold text-green-600">
                          {formatCurrency(selectedBooking.actualFare)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {selectedBooking.specialRequests && selectedBooking.specialRequests.length > 0 && (
                  <div>
                    <h4 className="font-medium text-neutral-900 mb-2">Special Requests</h4>
                    <div className="space-y-1">
                      {selectedBooking.specialRequests.map((request, index) => (
                        <Badge key={index} variant="info" size="sm">
                          {request}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {selectedBooking.feedback && (
              <div className="mt-6 p-4 bg-neutral-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-neutral-900">Customer Feedback</h4>
                  {selectedBooking.rating && (
                    <div className="flex items-center space-x-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`h-4 w-4 ${
                            star <= selectedBooking.rating!
                              ? 'text-yellow-400 fill-current'
                              : 'text-neutral-300'
                          }`}
                        />
                      ))}
                    </div>
                  )}
                </div>
                <p className="text-sm text-neutral-600">{selectedBooking.feedback}</p>
              </div>
            )}

            <div className="flex justify-end space-x-3 mt-6">
              <Button variant="secondary" onClick={() => setSelectedBooking(null)}>
                Close
              </Button>
              <Button variant="tertiary">
                <Phone className="h-4 w-4 mr-2" />
                Contact Passenger
              </Button>
              {selectedBooking.driverId && (
                <Button variant="tertiary">
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Contact Driver
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BookingManagement;