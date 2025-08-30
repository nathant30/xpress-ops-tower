'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  MapPin, 
  Navigation, 
  Clock, 
  User, 
  Phone, 
  Shield, 
  AlertCircle,
  CheckCircle,
  Car,
  Timer,
  DollarSign,
  Star,
  MoreVertical,
  RefreshCw
} from 'lucide-react';
import { logger } from '@/lib/security/productionLogger';

interface Trip {
  id: string;
  tripNumber: string;
  status: 'requested' | 'assigned' | 'en_route_pickup' | 'arrived_pickup' | 'in_progress' | 'completed' | 'cancelled';
  passenger: {
    name: string;
    phone: string;
    rating: number;
    isVip: boolean;
  };
  driver: {
    id: string;
    name: string;
    phone: string;
    rating: number;
    vehiclePlate: string;
    vehicleType: string;
  } | null;
  pickup: {
    address: string;
    lat: number;
    lng: number;
    estimatedTime?: number; // minutes until driver arrives
  };
  dropoff: {
    address: string;
    lat: number;
    lng: number;
    estimatedTime?: number; // minutes for trip completion
  };
  fare: {
    estimated: number;
    final?: number;
    currency: string;
    paymentMethod: string;
  };
  timing: {
    requested: Date;
    assigned?: Date;
    pickedUp?: Date;
    completed?: Date;
  };
  distance: number; // in kilometers
  duration: number; // estimated minutes
  surgeMultiplier?: number;
  specialRequests?: string[];
  emergencyContacts?: {
    name: string;
    phone: string;
    relationship: string;
  }[];
  fraudAlert?: {
    level: 'low' | 'medium' | 'high';
    type: 'payment' | 'route' | 'identity' | 'behavior';
    message: string;
    confidence: number;
    timestamp: Date;
  };
}

interface LiveRidesPanelProps {
  className?: string;
  maxRides?: number;
  refreshInterval?: number; // milliseconds
  onTripSelect?: (trip: Trip) => void;
  onEmergencyAlert?: (tripId: string) => void;
  onDispatchDriver?: (tripId: string, driverId: string) => void;
}

export const LiveRidesPanel: React.FC<LiveRidesPanelProps> = ({
  className = '',
  maxRides = 50,
  refreshInterval = 5000, // 5 seconds
  onTripSelect,
  onEmergencyAlert,
  onDispatchDriver
}) => {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [filter, setFilter] = useState<'all' | 'active' | 'pending' | 'emergency'>('active');
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Mock data for demonstration
  const mockTrips: Trip[] = [
    {
      id: 'trip_001',
      tripNumber: 'TR-2025-001',
      status: 'in_progress',
      passenger: {
        name: 'Maria Santos',
        phone: '+63 917 123 4567',
        rating: 4.8,
        isVip: false
      },
      driver: {
        id: 'driver_001',
        name: 'Juan Cruz',
        phone: '+63 917 987 6543',
        rating: 4.9,
        vehiclePlate: 'ABC-1234',
        vehicleType: 'Toyota Vios'
      },
      pickup: {
        address: 'Makati Central Business District, Makati City',
        lat: 14.5547,
        lng: 121.0244,
        estimatedTime: 2
      },
      dropoff: {
        address: 'NAIA Terminal 3, Pasay City',
        lat: 14.5086,
        lng: 121.0198,
        estimatedTime: 25
      },
      fare: {
        estimated: 450,
        currency: 'PHP',
        paymentMethod: 'Cash'
      },
      timing: {
        requested: new Date(Date.now() - 15 * 60000),
        assigned: new Date(Date.now() - 12 * 60000),
        pickedUp: new Date(Date.now() - 8 * 60000)
      },
      distance: 18.5,
      duration: 35,
      surgeMultiplier: 1.2,
      specialRequests: ['Airport Drop-off', 'Help with Luggage']
    },
    {
      id: 'trip_002',
      tripNumber: 'TR-2025-002',
      status: 'en_route_pickup',
      passenger: {
        name: 'Carlos Mendoza',
        phone: '+63 917 234 5678',
        rating: 4.5,
        isVip: true
      },
      driver: {
        id: 'driver_002',
        name: 'Ana Garcia',
        phone: '+63 917 876 5432',
        rating: 4.7,
        vehiclePlate: 'XYZ-5678',
        vehicleType: 'Honda City'
      },
      pickup: {
        address: 'Ortigas Center, Pasig City',
        lat: 14.5866,
        lng: 121.0630,
        estimatedTime: 5
      },
      dropoff: {
        address: 'SM Mall of Asia, Pasay City',
        lat: 14.5362,
        lng: 120.9822,
        estimatedTime: 40
      },
      fare: {
        estimated: 380,
        currency: 'PHP',
        paymentMethod: 'Card'
      },
      timing: {
        requested: new Date(Date.now() - 8 * 60000),
        assigned: new Date(Date.now() - 5 * 60000)
      },
      distance: 22.3,
      duration: 45,
      fraudAlert: {
        level: 'medium',
        type: 'payment',
        message: 'Multiple failed payment attempts detected',
        confidence: 85,
        timestamp: new Date(Date.now() - 3 * 60000)
      }
    },
    {
      id: 'trip_003',
      tripNumber: 'TR-2025-003',
      status: 'requested',
      passenger: {
        name: 'Isabella Reyes',
        phone: '+63 917 345 6789',
        rating: 4.9,
        isVip: false
      },
      driver: null,
      pickup: {
        address: 'Bonifacio Global City, Taguig',
        lat: 14.5515,
        lng: 121.0497
      },
      dropoff: {
        address: 'Quezon City Circle, Quezon City',
        lat: 14.6507,
        lng: 121.0494
      },
      fare: {
        estimated: 520,
        currency: 'PHP',
        paymentMethod: 'GCash'
      },
      timing: {
        requested: new Date(Date.now() - 3 * 60000)
      },
      distance: 25.8,
      duration: 50,
      surgeMultiplier: 1.5
    }
  ];

  // Simulate real-time data fetching
  const fetchTrips = useCallback(async () => {
    try {
      setError(null);
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // In a real app, this would fetch from your API
      // const response = await fetch('/api/trips/active');
      // const data = await response.json();
      
      // For demo, we'll use mock data with some random updates
      const updatedTrips = mockTrips.map(trip => ({
        ...trip,
        // Simulate some dynamic updates
        pickup: {
          ...trip.pickup,
          estimatedTime: trip.pickup.estimatedTime ? Math.max(0, trip.pickup.estimatedTime - 1) : undefined
        },
        dropoff: {
          ...trip.dropoff,
          estimatedTime: trip.dropoff.estimatedTime ? Math.max(5, trip.dropoff.estimatedTime - 1) : undefined
        }
      }));

      setTrips(updatedTrips);
      setLastUpdated(new Date());
    } catch (err) {
      setError('Failed to fetch trip data');
      logger.error('Error fetching live trips', { component: 'LiveRidesPanel' });
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchTrips();
  }, [fetchTrips]);

  // Auto refresh
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchTrips();
      }
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, fetchTrips]);

  // Filter trips based on selected filter
  const filteredTrips = trips.filter(trip => {
    switch (filter) {
      case 'active':
        return ['assigned', 'en_route_pickup', 'arrived_pickup', 'in_progress'].includes(trip.status);
      case 'pending':
        return trip.status === 'requested';
      case 'emergency':
        // In a real app, you'd have emergency flags
        return trip.passenger.isVip || (trip.surgeMultiplier && trip.surgeMultiplier > 2);
      default:
        return true;
    }
  }).slice(0, maxRides);

  const getStatusColor = (status: Trip['status']) => {
    switch (status) {
      case 'requested':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'assigned':
      case 'en_route_pickup':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'arrived_pickup':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'in_progress':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'completed':
        return 'bg-gray-100 text-gray-800 border-gray-300';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getStatusText = (status: Trip['status']) => {
    switch (status) {
      case 'requested':
        return 'Requested';
      case 'assigned':
        return 'Assigned';
      case 'en_route_pickup':
        return 'En Route to Pickup';
      case 'arrived_pickup':
        return 'Arrived at Pickup';
      case 'in_progress':
        return 'In Progress';
      case 'completed':
        return 'Completed';
      case 'cancelled':
        return 'Cancelled';
      default:
        return 'Unknown';
    }
  };

  const getStatusIcon = (status: Trip['status']) => {
    switch (status) {
      case 'requested':
        return <Clock className="w-4 h-4" />;
      case 'assigned':
        return <Car className="w-4 h-4" />;
      case 'en_route_pickup':
        return <Navigation className="w-4 h-4" />;
      case 'arrived_pickup':
        return <MapPin className="w-4 h-4" />;
      case 'in_progress':
        return <Timer className="w-4 h-4" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4" />;
      case 'cancelled':
        return <AlertCircle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const handleTripClick = (trip: Trip) => {
    setSelectedTrip(trip);
    onTripSelect?.(trip);
  };

  const handleEmergency = (tripId: string) => {
    onEmergencyAlert?.(tripId);
  };

  const handleRefresh = () => {
    fetchTrips();
  };

  if (loading && trips.length === 0) {
    return (
      <div className={`bg-white rounded-lg shadow-sm p-6 ${className}`}>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <RefreshCw className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
            <p className="text-gray-600">Loading active rides...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-2xl shadow-sm border border-gray-100 ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-semibold text-gray-900 flex items-center">
              <Car className="w-6 h-6 mr-3 text-blue-600" />
              Live Rides
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Real-time trip monitoring
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`p-2 rounded-lg text-sm font-medium transition-colors ${
                autoRefresh 
                  ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
              title={autoRefresh ? 'Auto-refresh ON' : 'Auto-refresh OFF'}
            >
              <RefreshCw className={`w-4 h-4 ${autoRefresh ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="mt-4 flex space-x-1 bg-gray-50 rounded-xl p-1">
          {[
            { key: 'active', label: 'Active', count: trips.filter(t => ['assigned', 'en_route_pickup', 'arrived_pickup', 'in_progress'].includes(t.status)).length },
            { key: 'pending', label: 'Pending', count: trips.filter(t => t.status === 'requested').length },
            { key: 'emergency', label: 'Priority', count: trips.filter(t => t.passenger.isVip || (t.surgeMultiplier && t.surgeMultiplier > 2)).length }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key as any)}
              className={`flex-1 flex items-center justify-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === tab.key
                  ? 'bg-white text-blue-700 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <span>{tab.label}</span>
              {tab.count > 0 && (
                <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                  filter === tab.key 
                    ? 'bg-blue-100 text-blue-700' 
                    : 'bg-gray-200 text-gray-600'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Trip List */}
      <div className="max-h-96 overflow-y-auto">
        {error && (
          <div className="p-4 bg-red-50 border-l-4 border-red-500 text-red-700">
            <div className="flex">
              <AlertCircle className="w-5 h-5 mr-2" />
              <p className="text-sm">{error}</p>
            </div>
          </div>
        )}

        {filteredTrips.length === 0 ? (
          <div className="p-8 text-center">
            <Car className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h4 className="text-lg font-medium text-gray-900 mb-2">No {filter} rides</h4>
            <p className="text-gray-600">
              {filter === 'pending' 
                ? 'All ride requests have been assigned drivers' 
                : filter === 'active'
                ? 'No rides currently in progress'
                : 'No rides match the current filter'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredTrips.map(trip => (
              <div 
                key={trip.id} 
                className={`p-5 hover:bg-gray-50 cursor-pointer transition-colors group ${
                  selectedTrip?.id === trip.id ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                }`}
                onClick={() => handleTripClick(trip)}
              >
                {/* Essential Info Only - Single Line */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-3">
                    <span className="font-semibold text-gray-900">#{trip.tripNumber}</span>
                    <span className="text-gray-700">{trip.passenger.name}</span>
                    {trip.passenger.isVip && (
                      <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs font-medium rounded-full">
                        VIP
                      </span>
                    )}
                    {trip.fraudAlert && (
                      <span className={`px-2 py-1 text-xs font-medium rounded-full flex items-center space-x-1 ${
                        trip.fraudAlert.level === 'high' ? 'bg-red-100 text-red-800' :
                        trip.fraudAlert.level === 'medium' ? 'bg-orange-100 text-orange-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        <AlertCircle className="w-3 h-3" />
                        <span>FRAUD ALERT</span>
                      </span>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(trip.status)}`}>
                      {getStatusIcon(trip.status)}
                      <span className="ml-1.5">{getStatusText(trip.status)}</span>
                    </span>
                  </div>
                </div>

                {/* Key Route Info - Simplified */}
                <div className="space-y-2 text-sm mb-3">
                  <div className="flex items-center space-x-2 text-gray-600">
                    <MapPin className="w-4 h-4 text-green-500 flex-shrink-0" />
                    <span className="truncate font-medium">{trip.pickup.address.split(',')[0]}</span>
                    {trip.pickup.estimatedTime && (
                      <span className="text-blue-600 text-xs bg-blue-50 px-2 py-0.5 rounded-full ml-auto flex-shrink-0">
                        {trip.pickup.estimatedTime}m
                      </span>
                    )}
                  </div>
                  <div className="flex items-center space-x-2 text-gray-600">
                    <Navigation className="w-4 h-4 text-red-500 flex-shrink-0" />
                    <span className="truncate font-medium">{trip.dropoff.address.split(',')[0]}</span>
                    {trip.dropoff.estimatedTime && (
                      <span className="text-blue-600 text-xs bg-blue-50 px-2 py-0.5 rounded-full ml-auto flex-shrink-0">
                        {trip.dropoff.estimatedTime}m
                      </span>
                    )}
                  </div>
                </div>

                {/* Bottom Row - Compact Info */}
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-3 text-gray-500">
                    {trip.driver ? (
                      <span className="font-medium text-gray-700">{trip.driver.name}</span>
                    ) : (
                      <span className="text-yellow-600 font-medium">Awaiting Driver</span>
                    )}
                    <span>{trip.fare.currency} {trip.fare.estimated}</span>
                    {trip.surgeMultiplier && trip.surgeMultiplier > 1 && (
                      <span className="text-orange-600 font-medium">{trip.surgeMultiplier}x</span>
                    )}
                  </div>
                  
                  {/* Actions - Only show on hover or for pending trips */}
                  <div className={`flex items-center space-x-2 ${trip.status === 'requested' || trip.fraudAlert ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity`}>
                    {trip.status === 'requested' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          // Handle driver assignment
                        }}
                        className="px-3 py-1 bg-blue-600 text-white rounded-full text-xs hover:bg-blue-700 transition-colors font-medium"
                      >
                        Assign
                      </button>
                    )}
                    {trip.fraudAlert && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          // Handle fraud investigation
                        }}
                        className="px-3 py-1 bg-orange-600 text-white rounded-full text-xs hover:bg-orange-700 transition-colors font-medium"
                      >
                        Investigate
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEmergency(trip.id);
                      }}
                      className="p-1.5 text-red-600 hover:bg-red-50 rounded-full transition-colors"
                      title="Emergency"
                    >
                      <Shield className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
        <div className="flex items-center justify-between text-xs text-gray-600">
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${autoRefresh ? 'bg-green-400' : 'bg-gray-400'}`} />
            <span>Updated: {lastUpdated.toLocaleTimeString()}</span>
          </div>
          <div>
            {filteredTrips.length} of {trips.length} rides
          </div>
        </div>
      </div>
    </div>
  );
};

export default LiveRidesPanel;