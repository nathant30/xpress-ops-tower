'use client';

import React, { memo, useState } from 'react';
import { 
  Eye, 
  MapPin, 
  Clock, 
  DollarSign,
  Star,
  Filter,
  Search,
  Calendar
} from 'lucide-react';
import { productionLogger } from '@/lib/security/productionLogger';

interface TripData {
  id: string;
  status: 'completed' | 'cancelled' | 'in_progress';
  fare: number;
  distance: string;
  duration: string;
  passengerName: string;
  passengerPhone: string;
  pickupAddress: string;
  dropoffAddress: string;
  pickupTime: string;
  dropoffTime?: string;
  commission: number;
  netEarning: number;
  rating?: number;
  feedback?: string;
  paymentMethod: string;
  referenceNumber: string;
  vehicleUsed: string;
  routeNotes?: string;
}

interface DriverTripsPanelProps {
  trips: TripData[];
  onTripView: (trip: TripData) => void;
  loading?: boolean;
}

const DriverTripsPanel = memo<DriverTripsPanelProps>(({
  trips,
  onTripView,
  loading = false
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'cancelled' | 'in_progress'>('all');
  const [dateFilter, setDateFilter] = useState('today');

  const handleTripView = (trip: TripData) => {
    productionLogger.info('Trip details requested', { tripId: trip.id });
    onTripView(trip);
  };

  const filteredTrips = trips.filter(trip => {
    const matchesSearch = searchQuery === '' || 
      trip.passengerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      trip.pickupAddress.toLowerCase().includes(searchQuery.toLowerCase()) ||
      trip.dropoffAddress.toLowerCase().includes(searchQuery.toLowerCase()) ||
      trip.id.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || trip.status === statusFilter;
    
    // For date filter, we'd need proper date comparison in a real implementation
    // This is simplified for the component
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusDisplay = (status: string) => {
    switch (status) {
      case 'completed': return 'Completed';
      case 'cancelled': return 'Cancelled';
      case 'in_progress': return 'In Progress';
      default: return status;
    }
  };

  const renderStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    
    for (let i = 0; i < fullStars; i++) {
      stars.push(<Star key={i} className="w-4 h-4 text-yellow-400 fill-current" />);
    }
    
    const remainingStars = 5 - fullStars;
    for (let i = 0; i < remainingStars; i++) {
      stars.push(<Star key={`empty-${i}`} className="w-4 h-4 text-gray-300" />);
    }
    
    return <div className="flex space-x-1">{stars}</div>;
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/4"></div>
          <div className="space-y-3">
            <div className="h-20 bg-gray-200 rounded"></div>
            <div className="h-20 bg-gray-200 rounded"></div>
            <div className="h-20 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Trip History</h3>
          
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search trips..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
              <option value="in_progress">In Progress</option>
            </select>
            
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="all">All Time</option>
            </select>
          </div>
        </div>

        <div className="space-y-4">
          {filteredTrips.map((trip) => (
            <div key={trip.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h4 className="font-medium text-gray-900">Trip #{trip.id}</h4>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(trip.status)}`}>
                      {getStatusDisplay(trip.status)}
                    </span>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <MapPin className="w-4 h-4 text-green-500" />
                      <span className="font-medium">From:</span>
                      <span>{trip.pickupAddress}</span>
                    </div>
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <MapPin className="w-4 h-4 text-red-500" />
                      <span className="font-medium">To:</span>
                      <span>{trip.dropoffAddress}</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => handleTripView(trip)}
                  className="flex items-center space-x-2 px-3 py-1 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  <Eye className="w-4 h-4" />
                  <span>View</span>
                </button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-3 border-t">
                <div className="text-center">
                  <div className="flex items-center justify-center space-x-1 text-green-600 mb-1">
                    <DollarSign className="w-4 h-4" />
                    <span className="font-bold">₱{trip.fare}</span>
                  </div>
                  <p className="text-xs text-gray-500">Fare</p>
                </div>

                <div className="text-center">
                  <div className="flex items-center justify-center space-x-1 text-blue-600 mb-1">
                    <Clock className="w-4 h-4" />
                    <span className="font-medium">{trip.duration}</span>
                  </div>
                  <p className="text-xs text-gray-500">Duration</p>
                </div>

                <div className="text-center">
                  <div className="text-purple-600 font-medium mb-1">{trip.distance}</div>
                  <p className="text-xs text-gray-500">Distance</p>
                </div>

                {trip.rating && (
                  <div className="text-center">
                    <div className="flex items-center justify-center mb-1">
                      {renderStars(trip.rating)}
                    </div>
                    <p className="text-xs text-gray-500">Rating</p>
                  </div>
                )}
              </div>

              {trip.feedback && (
                <div className="mt-3 pt-3 border-t">
                  <p className="text-sm text-gray-600 italic">"{trip.feedback}"</p>
                  <p className="text-xs text-gray-500 mt-1">- {trip.passengerName}</p>
                </div>
              )}
            </div>
          ))}
        </div>

        {filteredTrips.length === 0 && (
          <div className="text-center py-8">
            <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 mb-2">No trips found</p>
            <p className="text-sm text-gray-400">
              {searchQuery || statusFilter !== 'all' || dateFilter !== 'all' 
                ? 'Try adjusting your filters' 
                : 'Trip history will appear here once you start driving'
              }
            </p>
          </div>
        )}
      </div>
    </div>
  );
});

DriverTripsPanel.displayName = 'DriverTripsPanel';

export default DriverTripsPanel;