'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Car, Clock, DollarSign, CheckCircle, XCircle, AlertTriangle, Users, MapPin, 
  Filter, Search, Calendar, MoreHorizontal, ArrowUpRight, ArrowDownRight, 
  Activity, Navigation, Phone, MessageCircle, UserCheck, Route, Star, 
  ChevronDown, ChevronUp, ChevronRight, RefreshCw, Volume2, MapIcon, Timer, 
  CreditCard, AlertCircle, Eye, Edit, Ban, UserPlus, Zap, PlayCircle,
  PauseCircle, SkipForward, Loader, TrendingUp, Navigation2, Truck, User
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useServiceType } from '@/contexts/ServiceTypeContext';

// Enhanced KPI Card component with consistent spacing
function KpiCard({label, value, trend, up, icon: Icon}: {label: string, value: string, trend: string, up?: boolean, icon?: any}) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow duration-200 p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</div>
        {Icon && <Icon className="w-4 h-4 text-gray-400" />}
      </div>
      <div className="text-2xl font-bold text-gray-900 mb-2">{value}</div>
      <div className={`flex items-center gap-1.5 text-xs font-medium ${
        up ? "text-emerald-600" : trend.includes('-') ? "text-emerald-600" : "text-red-500"
      }`}>
        {up || trend.includes('-') ? 
          <ArrowUpRight className="w-3.5 h-3.5" /> : 
          <ArrowDownRight className="w-3.5 h-3.5" />
        }
        <span>{trend}</span>
      </div>
    </div>
  )
}

// Enhanced booking types with comprehensive real-time data
interface PassengerDetails {
  id: string;
  name: string;
  phone: string;
  rating: number;
  totalTrips: number;
  paymentMethod: 'cash' | 'card' | 'digital_wallet' | 'corporate';
  specialRequests?: string[];
}

interface DriverDetails {
  id: string;
  name: string;
  phone: string;
  rating: number;
  vehicleType: string;
  vehiclePlate: string;
  vehicleModel: string;
  currentLocation?: [number, number];
  eta?: number;
  totalTrips: number;
  acceptanceRate: number;
}

interface TripProgress {
  status: 'requesting' | 'driver_assigned' | 'driver_enroute' | 'arrived' | 'pickup' | 'in_transit' | 'completed' | 'cancelled';
  timeline: {
    timestamp: Date;
    status: string;
  }[];
  estimatedCompletion?: Date;
}

interface FareBreakdown {
  baseFare: number;
  distanceFare: number;
  surgeFare: number;
  fees: number;
  discount: number;
  total: number;
  paymentStatus: 'pending' | 'processing' | 'paid' | 'failed';
  paymentMethod: string;
}

interface BookingDetails {
  id: string;
  bookingId: string;
  passenger: PassengerDetails;
  driver?: DriverDetails;
  pickup: {
    address: string;
    coordinates: [number, number];
    instructions?: string;
  };
  destination: {
    address: string;
    coordinates: [number, number];
    instructions?: string;
  };
  serviceType: 'motorcycle' | 'car' | 'suv' | 'taxi' | 'premium';
  tripProgress: TripProgress;
  fareBreakdown: FareBreakdown;
  estimatedDuration: number;
  actualDuration?: number;
  distance: number;
  scheduledFor?: Date;
  requestedAt: Date;
  assignedAt?: Date;
  completedAt?: Date;
  cancelledAt?: Date;
  rating?: number;
  feedback?: string;
  emergencyFlag?: boolean;
  lastLocationUpdate?: Date;
  requestTimeout?: Date;
  promoCode?: string;
}

// Legacy interface for compatibility
interface Booking {
  id: string;
  bookingId: string;
  passenger: string;
  driver: string;
  pickup: string;
  destination: string;
  status: 'Active' | 'Completed' | 'Cancelled' | 'Scheduled' | 'Requesting';
  serviceType: string;
  fare: number;
  duration: string;
  distance: string;
  createdAt: Date;
  isExpanded?: boolean;
  details?: BookingDetails;
}

const BookingsPage = () => {
  const { selectedServiceType, serviceTypes } = useServiceType();
  const [activeTab, setActiveTab] = useState('requesting'); // Start with requesting tab
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [serviceTypeFilter, setServiceTypeFilter] = useState('all');
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});
  const [expandedBookings, setExpandedBookings] = useState<Set<string>>(new Set());
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [forceAssignModal, setForceAssignModal] = useState<string | null>(null);
  const [lastUpdateTime, setLastUpdateTime] = useState(new Date());
  const [recentChanges, setRecentChanges] = useState<Set<string>>(new Set());
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [autoAssignEnabled, setAutoAssignEnabled] = useState(true);
  
  // Using consistent variable naming throughout
  const [isRealTimeEnabled, setIsRealTimeEnabled] = useState(true);

  // Generate enhanced mock booking data with realistic Metro Manila locations
  const generateMockBookings = useCallback((): Booking[] => {
    const statuses: ('Active' | 'Completed' | 'Cancelled' | 'Scheduled' | 'Requesting')[] = 
      ['Active', 'Completed', 'Cancelled', 'Scheduled', 'Requesting'];
    const serviceTypes = ['Car', 'Motorcycle', 'SUV', 'Taxi', 'Premium'];
    
    const locations = [
      { name: 'BGC Central Plaza, Taguig', coords: [14.5512, 121.0471] as [number, number] },
      { name: 'Ayala Triangle, Makati', coords: [14.5547, 121.0244] as [number, number] },
      { name: 'SM Mall of Asia, Pasay', coords: [14.5354, 120.9827] as [number, number] },
      { name: 'Ortigas Center, Pasig', coords: [14.5866, 121.0636] as [number, number] },
      { name: 'Quezon Memorial Circle', coords: [14.6554, 121.0509] as [number, number] },
      { name: 'Intramuros, Manila', coords: [14.5906, 120.9742] as [number, number] },
      { name: 'Alabang Town Center', coords: [14.4198, 121.0391] as [number, number] },
      { name: 'Eastwood City, QC', coords: [14.6091, 121.0779] as [number, number] },
    ];
    
    const passengerNames = [
      'Maria Santos', 'Juan Dela Cruz', 'Carlos Reyes', 'Ana Garcia', 'Elena Rodriguez',
      'Roberto Silva', 'Jose Martinez', 'Carmen Lopez', 'Pedro Gonzalez', 'Isabel Fernandez',
      'Miguel Torres', 'Rosa Morales', 'Antonio Ramirez', 'Lucia Herrera', 'Francisco Vargas'
    ];
    
    const driverNames = [
      'Carlos Mendoza', 'Maria Santos', 'Juan dela Cruz', 'Ana Villanueva', 'Pedro Castro',
      'Elena Gutierrez', 'Roberto Diaz', 'Carmen Torres', 'Miguel Rodriguez', 'Isabel Garcia'
    ];

    return Array.from({ length: 200 }, (_, i) => {
      const pickup = locations[Math.floor(Math.random() * locations.length)];
      let destination = locations[Math.floor(Math.random() * locations.length)];
      while (destination === pickup) {
        destination = locations[Math.floor(Math.random() * locations.length)];
      }
      
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      const serviceType = serviceTypes[Math.floor(Math.random() * serviceTypes.length)];
      const baseFare = 80 + Math.random() * 420;
      const distance = parseFloat((Math.random() * 20 + 1).toFixed(1));
      const requestedAt = new Date(Date.now() - Math.random() * 86400000 * 3);
      
      const hasDriver = !['Requesting'].includes(status);
      const driverName = hasDriver ? driverNames[Math.floor(Math.random() * driverNames.length)] : 'Unassigned';
      
      // Create detailed booking data
      const detailedData: BookingDetails = {
        id: String(i + 1),
        bookingId: `BK-${String(i + 1).padStart(4, '0')}`,
        passenger: {
          id: `P${String(i + 1).padStart(4, '0')}`,
          name: passengerNames[Math.floor(Math.random() * passengerNames.length)],
          phone: `+63917${Math.floor(Math.random() * 9000000 + 1000000)}`,
          rating: 4.0 + Math.random() * 1.0,
          totalTrips: Math.floor(Math.random() * 100 + 5),
          paymentMethod: ['cash', 'card', 'digital_wallet', 'corporate'][Math.floor(Math.random() * 4)] as any,
          specialRequests: Math.random() > 0.8 ? ['Pet-friendly vehicle'] : undefined
        },
        driver: hasDriver ? {
          id: `DR${String(i % 20 + 1).padStart(3, '0')}`,
          name: driverName,
          phone: `+63917${Math.floor(Math.random() * 9000000 + 1000000)}`,
          rating: 4.2 + Math.random() * 0.8,
          vehicleType: serviceType,
          vehiclePlate: `ABC-${Math.floor(Math.random() * 9000 + 1000)}`,
          vehicleModel: serviceType === 'Motorcycle' ? 'Honda Click 125' : 'Toyota Vios',
          totalTrips: Math.floor(Math.random() * 1000 + 50),
          acceptanceRate: 85 + Math.random() * 15,
          eta: status === 'Active' ? Math.floor(Math.random() * 15 + 2) : undefined,
          currentLocation: status === 'Active' ? [pickup.coords[0] + (Math.random() - 0.5) * 0.01, pickup.coords[1] + (Math.random() - 0.5) * 0.01] as [number, number] : undefined
        } : undefined,
        pickup: {
          address: pickup.name,
          coordinates: pickup.coords,
          instructions: Math.random() > 0.7 ? 'Near the main entrance' : undefined
        },
        destination: {
          address: destination.name,
          coordinates: destination.coords,
          instructions: Math.random() > 0.7 ? 'Drop off at parking area' : undefined
        },
        serviceType: serviceType.toLowerCase() as any,
        tripProgress: {
          status: status === 'Active' ? 'in_transit' : 
                  status === 'Requesting' ? 'requesting' :
                  status === 'Completed' ? 'completed' : 'cancelled',
          timeline: [
            { timestamp: requestedAt, status: 'Trip requested' },
            ...(hasDriver ? [{ timestamp: new Date(requestedAt.getTime() + 120000), status: 'Driver assigned' }] : [])
          ]
        },
        fareBreakdown: {
          baseFare,
          distanceFare: distance * 12,
          surgeFare: Math.random() > 0.8 ? baseFare * 0.3 : 0,
          fees: 10,
          discount: Math.random() > 0.9 ? 25 : 0,
          total: baseFare + distance * 12 + (Math.random() > 0.8 ? baseFare * 0.3 : 0) + 10 - (Math.random() > 0.9 ? 25 : 0),
          paymentStatus: ['pending', 'paid', 'failed'][Math.floor(Math.random() * 3)] as any,
          paymentMethod: ['Cash', 'GCash', 'Credit Card'][Math.floor(Math.random() * 3)]
        },
        estimatedDuration: Math.floor(distance * 3 + Math.random() * 15),
        distance,
        scheduledFor: Math.random() > 0.9 ? new Date(Date.now() + Math.random() * 86400000) : undefined,
        requestedAt,
        assignedAt: hasDriver ? new Date(requestedAt.getTime() + 120000) : undefined,
        completedAt: status === 'Completed' ? new Date(requestedAt.getTime() + Math.random() * 3600000) : undefined,
        cancelledAt: status === 'Cancelled' ? new Date(requestedAt.getTime() + Math.random() * 1800000) : undefined,
        rating: status === 'Completed' ? 3 + Math.random() * 2 : undefined,
        feedback: status === 'Completed' && Math.random() > 0.7 ? 'Great service!' : undefined,
        emergencyFlag: Math.random() > 0.98,
        lastLocationUpdate: hasDriver && status === 'Active' ? new Date(Date.now() - Math.random() * 300000) : undefined,
        requestTimeout: status === 'Requesting' ? new Date(requestedAt.getTime() + 600000) : undefined,
        promoCode: Math.random() > 0.85 ? 'SAVE20' : undefined
      };
      
      // Return legacy format with enhanced data
      return {
        id: String(i + 1),
        bookingId: `BK-${String(i + 1).padStart(4, '0')}`,
        passenger: detailedData.passenger.name,
        driver: driverName,
        pickup: pickup.name.split(',')[0],
        destination: destination.name.split(',')[0],
        status,
        serviceType,
        fare: Math.floor(detailedData.fareBreakdown.total),
        duration: `${detailedData.estimatedDuration} min`,
        distance: `${distance} km`,
        createdAt: requestedAt,
        details: detailedData
      };
    });
  }, []);

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);
  const [sortBy, setSortBy] = useState<'createdAt' | 'fare' | 'duration'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  // Initialize bookings data
  useEffect(() => {
    setBookings(generateMockBookings());
  }, [generateMockBookings]);

  useEffect(() => {
    // Simulate loading
    setTimeout(() => setIsLoading(false), 800);
  }, []);
  
  // Initialize audio for notifications
  useEffect(() => {
    audioRef.current = new Audio('/sounds/notification.mp3');
    audioRef.current.volume = 0.3;
  }, []);

  // Enhanced real-time updates with sound notifications
  useEffect(() => {
    if (!isRealTimeEnabled) return;

    const interval = setInterval(() => {
      setBookings(prevBookings => {
        const updatedBookings = [...prevBookings];
        let hasChanges = false;
        let hasCriticalEvent = false;
        const newRecentChanges = new Set<string>();
        
        // Simulate random booking updates
        if (Math.random() > 0.8) {
          const randomIndex = Math.floor(Math.random() * updatedBookings.length);
          const booking = updatedBookings[randomIndex];
          
          // Simulate status changes
          if (booking.status === 'Requesting' && Math.random() > 0.7) {
            booking.status = 'Active';
            booking.driver = booking.details?.driver?.name || 'Auto-assigned Driver';
            hasChanges = true;
            newRecentChanges.add(booking.id);
          }
          
          // Simulate emergency alerts
          if (Math.random() > 0.99) {
            if (booking.details) {
              booking.details.emergencyFlag = true;
            }
            hasCriticalEvent = true;
            hasChanges = true;
            newRecentChanges.add(booking.id);
          }
        }
        
        // Add new requesting bookings occasionally
        if (Math.random() > 0.95) {
          const newBookingData = generateMockBookings().find(b => b.status === 'Requesting');
          if (newBookingData) {
            newBookingData.id = `${Date.now()}`;
            newBookingData.bookingId = `BK-${String(updatedBookings.length + 1).padStart(4, '0')}`;
            newBookingData.createdAt = new Date();
            updatedBookings.unshift(newBookingData);
            hasChanges = true;
            hasCriticalEvent = true;
            newRecentChanges.add(newBookingData.id);
          }
        }
        
        if (hasChanges) {
          setLastUpdateTime(new Date());
          setRecentChanges(newRecentChanges);
          
          // Play sound for critical events
          if (hasCriticalEvent && soundEnabled && audioRef.current) {
            audioRef.current.play().catch(() => {/* Ignore audio errors */});
          }
          
          // Clear recent changes after 5 seconds
          setTimeout(() => {
            setRecentChanges(prev => {
              const updated = new Set(prev);
              newRecentChanges.forEach(id => updated.delete(id));
              return updated;
            });
          }, 5000);
        }
        
        return hasChanges ? updatedBookings : prevBookings;
      });
    }, 8000); // Update every 8 seconds

    return () => clearInterval(interval);
  }, [isRealTimeEnabled, soundEnabled, generateMockBookings]);

  // Filter and search logic
  const filteredBookings = React.useMemo(() => {
    let filtered = bookings;

    // Filter by tab
    if (activeTab !== 'all') {
      const statusMap = {
        'requesting': 'Requesting',
        'active-trips': 'Active',
        'completed': 'Completed',
        'cancelled': 'Cancelled',
        'scheduled': 'Scheduled'
      };
      filtered = filtered.filter(booking => booking.status === statusMap[activeTab as keyof typeof statusMap]);
    }

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(booking =>
        booking.bookingId.toLowerCase().includes(term) ||
        booking.passenger.toLowerCase().includes(term) ||
        booking.driver.toLowerCase().includes(term) ||
        booking.pickup.toLowerCase().includes(term) ||
        booking.destination.toLowerCase().includes(term)
      );
    }

    // Service type filter
    if (serviceTypeFilter !== 'all') {
      filtered = filtered.filter(booking => booking.serviceType === serviceTypeFilter);
    }

    // Date range filter
    if (dateRange.from || dateRange.to) {
      filtered = filtered.filter(booking => {
        const bookingDate = new Date(booking.createdAt);
        if (dateRange.from && bookingDate < dateRange.from) return false;
        if (dateRange.to && bookingDate > dateRange.to) return false;
        return true;
      });
    }

    // Sort
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (sortBy) {
        case 'createdAt':
          aValue = new Date(a.createdAt).getTime();
          bValue = new Date(b.createdAt).getTime();
          break;
        case 'fare':
          aValue = a.fare;
          bValue = b.fare;
          break;
        case 'duration':
          aValue = parseInt(a.duration);
          bValue = parseInt(b.duration);
          break;
        default:
          return 0;
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return filtered;
  }, [bookings, activeTab, searchTerm, serviceTypeFilter, dateRange, sortBy, sortOrder]);

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchTerm, serviceTypeFilter, dateRange]);

  // Pagination
  const totalPages = Math.ceil(filteredBookings.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentBookings = filteredBookings.slice(startIndex, endIndex);

  // Count by status for tabs
  const statusCounts = React.useMemo(() => {
    return bookings.reduce((acc, booking) => {
      acc[booking.status] = (acc[booking.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }, [bookings]);

  const tabs = [
    { id: 'requesting', name: 'Requesting', icon: Timer, count: statusCounts['Requesting'] || 0, urgent: true },
    { id: 'active-trips', name: 'Active Trips', icon: Activity, count: statusCounts['Active'] || 0 },
    { id: 'completed', name: 'Completed', icon: CheckCircle, count: statusCounts['Completed'] || 0 },
    { id: 'cancelled', name: 'Cancelled', icon: XCircle, count: statusCounts['Cancelled'] || 0 },
    { id: 'scheduled', name: 'Scheduled', icon: Calendar, count: statusCounts['Scheduled'] || 0 }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Requesting':
        return 'bg-orange-100 text-orange-800';
      case 'Active':
        return 'bg-blue-100 text-blue-800';
      case 'Completed':
        return 'bg-green-100 text-green-800';
      case 'Cancelled':
        return 'bg-red-100 text-red-800';
      case 'Scheduled':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getServiceIcon = (serviceType: string) => {
    switch (serviceType.toLowerCase()) {
      case 'motorcycle':
        return '🏍️';
      case 'car':
        return '🚗';
      case 'suv':
        return '🚙';
      case 'taxi':
        return '🚖';
      case 'premium':
        return '✨';
      default:
        return '🚗';
    }
  };
  
  // Get time elapsed for requesting bookings
  const getRequestingTime = useCallback((booking: Booking) => {
    if (booking.status !== 'Requesting') return '';
    const elapsed = Math.floor((Date.now() - booking.createdAt.getTime()) / 1000);
    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;
    return `${minutes}m ${seconds}s`;
  }, []);
  
  // Get requesting color based on elapsed time
  const getRequestingColor = useCallback((booking: Booking) => {
    if (booking.status !== 'Requesting') return '';
    const elapsed = Math.floor((Date.now() - booking.createdAt.getTime()) / 1000);
    if (elapsed < 30) return 'text-green-600 bg-green-50 border-green-200';
    if (elapsed < 120) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-red-600 bg-red-50 border-red-200';
  }, []);
  
  // Toggle booking expansion
  const toggleBookingExpansion = useCallback((bookingId: string) => {
    setExpandedBookings(prev => {
      const newSet = new Set(prev);
      if (newSet.has(bookingId)) {
        newSet.delete(bookingId);
      } else {
        newSet.add(bookingId);
      }
      return newSet;
    });
  }, []);
  
  // Quick actions handlers
  const handleCallPassenger = useCallback((phone: string) => {
    window.open(`tel:${phone}`);
  }, []);
  
  const handleCallDriver = useCallback((phone: string) => {
    window.open(`tel:${phone}`);
  }, []);
  
  const handleForceAssign = useCallback((bookingId: string) => {
    setBookings(prev => prev.map(b => {
      if (b.id === bookingId) {
        return {
          ...b,
          status: 'Active' as any,
          driver: 'Force Assigned Driver'
        };
      }
      return b;
    }));
    setForceAssignModal(null);
    setRecentChanges(prev => new Set([...prev, bookingId]));
  }, []);
  
  const handleSOSAlert = useCallback((bookingId: string) => {
    if (soundEnabled && audioRef.current) {
      audioRef.current.play().catch(() => {/* Ignore audio errors */});
    }
    alert('SOS Alert sent to emergency services!');
  }, [soundEnabled]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-neutral-600">Loading Enhanced Bookings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Modern SaaS Header with Visual Hierarchy */}
      <div className="space-y-4">
        {/* Title Row with Right-aligned Controls */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-gray-900 tracking-tight">Bookings</h1>
            <p className="text-base text-gray-500 mt-1">Trip management and booking analytics</p>
          </div>

          {/* Lightweight Search and Filters */}
          <div className="flex items-center space-x-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search bookings, passengers, drivers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2.5 bg-gray-50 border-0 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors w-80 placeholder-gray-400 h-10"
              />
            </div>
            <select
              value={serviceTypeFilter}
              onChange={(e) => setServiceTypeFilter(e.target.value)}
              className="px-3 py-2.5 bg-gray-50 border-0 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors text-gray-600 h-10 min-w-[140px]"
            >
              <option value="all">All Services</option>
              <option value="Car">🚗 Car</option>
              <option value="Motorcycle">🏍️ Motorcycle</option>
              <option value="SUV">🚙 SUV</option>
              <option value="Taxi">🚖 Taxi</option>
              <option value="Premium">✨ Premium</option>
            </select>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setIsRealTimeEnabled(!isRealTimeEnabled)}
                className={`flex items-center space-x-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors h-10 border ${
                  isRealTimeEnabled
                    ? 'bg-green-50 text-green-700 hover:bg-green-100 border-green-200'
                    : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border-gray-200'
                }`}
              >
                {isRealTimeEnabled ? <PauseCircle className="w-4 h-4" /> : <PlayCircle className="w-4 h-4" />}
                <span>{isRealTimeEnabled ? 'Live' : 'Paused'}</span>
              </button>
              <button
                onClick={() => setSoundEnabled(!soundEnabled)}
                className={`p-2.5 rounded-lg transition-colors h-10 w-10 flex items-center justify-center border ${
                  soundEnabled
                    ? 'bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200'
                    : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border-gray-200'
                }`}
                title={soundEnabled ? 'Sound notifications ON' : 'Sound notifications OFF'}
              >
                <Volume2 className={`w-4 h-4 ${!soundEnabled ? 'opacity-50' : ''}`} />
              </button>
              <button className="flex items-center space-x-2 px-3 py-2.5 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors text-sm text-gray-600 hover:text-gray-900 border border-gray-200 h-10">
                <Filter className="w-4 h-4" />
                <span>Filters</span>
              </button>
            </div>
          </div>
        </div>

        {/* Enhanced Tab Navigation with Better Spacing */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isUrgent = tab.urgent && tab.count > 0;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative flex items-center space-x-2.5 px-4 py-3 rounded-full text-sm font-medium transition-all duration-200 min-h-[44px] ${
                    activeTab === tab.id
                      ? 'bg-blue-50 text-blue-700 border border-blue-200 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50 border border-transparent hover:border-gray-200'
                  }`}
                >
                  <Icon className={`w-4 h-4 flex-shrink-0 ${isUrgent && activeTab !== tab.id ? 'text-orange-600' : ''}`} />
                  <span className="whitespace-nowrap">{tab.name}</span>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium min-w-[28px] text-center ${
                    activeTab === tab.id
                      ? 'bg-blue-100 text-blue-700'
                      : isUrgent
                      ? 'bg-red-100 text-red-700 animate-pulse'
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {tab.count}
                  </span>
                  {isUrgent && activeTab !== tab.id && (
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-ping"></div>
                  )}
                </button>
              );
            })}
          </div>
          {activeTab === 'scheduled' && (
            <label className="flex items-center space-x-2.5 text-sm text-gray-600 bg-gray-50 px-3 py-2 rounded-lg border border-gray-200">
              <input
                type="checkbox"
                checked={autoAssignEnabled}
                onChange={(e) => setAutoAssignEnabled(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
              />
              <span className="font-medium">Auto-assign drivers</span>
            </label>
          )}
        </div>
      </div>

      {/* Main Layout - Sidebar + Content */}
      <div className="flex gap-6">
        {/* Left Sidebar - KPI Cards Stacked */}
        <div className="w-72 space-y-4 flex-shrink-0">
          <KpiCard 
            label={tabs.find(t => t.id === activeTab)?.name || 'Bookings'}
            value={tabs.find(t => t.id === activeTab)?.count.toString() || '0'}
            trend="+8.7%"
            up={true}
            icon={tabs.find(t => t.id === activeTab)?.icon || Activity}
          />
          <KpiCard 
            label="Total Revenue" 
            value="₱127k"
            trend="+15.2%"
            up={true}
            icon={DollarSign}
          />
          <KpiCard 
            label="Avg Rating" 
            value="4.7"
            trend="+0.2"
            up={true}
            icon={Users}
          />
          <KpiCard 
            label="Success Rate" 
            value="96.1%"
            trend="+1.8%"
            up={true}
            icon={CheckCircle}
          />
          <KpiCard 
            label="Avg Fare" 
            value="₱285"
            trend="+12%"
            up={true}
            icon={DollarSign}
          />
        </div>

        {/* Main Content Area - Booking Stream */}
        <div className="flex-1 min-w-0">

        {/* Optimized Bookings Table */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
          <div className="p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="font-semibold text-lg text-gray-900">
                  {tabs.find(t => t.id === activeTab)?.name || 'Bookings'}
                </h2>
                <p className="text-xs text-gray-500">
                  Showing {startIndex + 1}-{Math.min(endIndex, filteredBookings.length)} of {filteredBookings.length} bookings
                  {isRealTimeEnabled && <span className="ml-2 inline-flex items-center">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse mr-1"></span>
                    Live
                  </span>}
                  {filteredBookings.length > 100 && <span className="ml-2 text-xs text-orange-600">
                    ⚡ High-volume mode
                  </span>}
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <select 
                  value={itemsPerPage} 
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="text-xs px-2 py-1 border border-gray-300 rounded"
                >
                  <option value="10">10 per page</option>
                  <option value="25">25 per page</option>
                  <option value="50">50 per page</option>
                  <option value="100">100 per page</option>
                </select>
                <select 
                  value={sortBy} 
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="text-xs px-2 py-1 border border-gray-300 rounded"
                >
                  <option value="createdAt">Sort by Time</option>
                  <option value="fare">Sort by Fare</option>
                  <option value="duration">Sort by Duration</option>
                </select>
                <button 
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                  className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded"
                >
                  {sortOrder === 'asc' ? '↑' : '↓'}
                </button>
                <button 
                  onClick={() => setIsRealTimeEnabled(!isRealTimeEnabled)}
                  className={`text-xs px-2 py-1 rounded transition-colors ${
                    isRealTimeEnabled 
                      ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {isRealTimeEnabled ? 'Live ON' : 'Live OFF'}
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <div className="max-h-[calc(100vh-320px)] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-white z-10">
                    <tr className="text-gray-500 text-xs uppercase tracking-wide border-b border-gray-100">
                      <th className="text-left py-2 font-medium bg-white">Booking ID</th>
                      <th className="text-left py-2 font-medium bg-white">Passenger</th>
                      <th className="text-left py-2 font-medium bg-white">Driver</th>
                      <th className="text-left py-2 font-medium bg-white">Route</th>
                      <th className="text-center py-2 font-medium bg-white">Service</th>
                      <th className="text-center py-2 font-medium bg-white">Status</th>
                      <th className="text-center py-2 font-medium bg-white">Fare</th>
                      <th className="text-center py-2 font-medium bg-white">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {currentBookings.length > 0 ? currentBookings.map((booking, index) => {
                      const isExpanded = expandedBookings.has(booking.id);
                      const isRecent = recentChanges.has(booking.id);
                      const requestingTime = getRequestingTime(booking);
                      const requestingColor = getRequestingColor(booking);
                      
                      return (
                        <React.Fragment key={`${booking.id}-${index}`}>
                          {/* Main booking row - clickable */}
                          <tr 
                            onClick={() => toggleBookingExpansion(booking.id)}
                            className={`cursor-pointer transition-colors text-xs ${
                              isRecent ? 'bg-blue-50' : isExpanded ? 'bg-gray-50' : 'hover:bg-gray-25'
                            }`}
                          >
                            <td className="py-3 font-medium text-blue-600 whitespace-nowrap">
                              <div className="flex items-center space-x-2">
                                {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                                <span>{booking.bookingId}</span>
                                {booking.details?.emergencyFlag && (
                                  <span className="px-1 py-0.5 bg-red-100 text-red-700 text-xs font-bold rounded animate-pulse">
                                    🚨
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-3 text-gray-900 max-w-32 truncate">
                              <div>
                                <div>{booking.passenger}</div>
                                {booking.details?.passenger.rating && (
                                  <div className="flex items-center space-x-1 text-xs text-gray-500">
                                    <Star className="w-2 h-2 text-yellow-400 fill-current" />
                                    <span>{booking.details.passenger.rating.toFixed(1)}</span>
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="py-3 text-gray-700 max-w-32 truncate">
                              <div className="flex items-center justify-between">
                                <span>{booking.driver}</span>
                                {booking.status === 'Requesting' && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setForceAssignModal(booking.id);
                                    }}
                                    className="ml-1 px-1 py-0.5 bg-orange-100 text-orange-700 text-xs rounded hover:bg-orange-200"
                                  >
                                    Assign
                                  </button>
                                )}
                              </div>
                            </td>
                            <td className="py-3">
                              <div className="max-w-44">
                                <div className="text-gray-900 truncate text-xs">{booking.pickup}</div>
                                <div className="text-gray-500 truncate text-xs">→ {booking.destination}</div>
                                <div className="text-gray-400 text-xs">{booking.distance} • {booking.duration}</div>
                              </div>
                            </td>
                            <td className="text-center py-3">
                              <div className="flex items-center justify-center space-x-1">
                                <span className="text-sm">{getServiceIcon(booking.serviceType)}</span>
                                <span className="text-xs hidden sm:inline">{booking.serviceType}</span>
                              </div>
                            </td>
                            <td className="text-center py-3">
                              <div className="flex flex-col items-center space-y-1">
                                <span className={`px-1 py-0.5 rounded text-xs font-medium ${getStatusColor(booking.status)}`}>
                                  {booking.status}
                                </span>
                                {booking.status === 'Requesting' && requestingTime && (
                                  <span className={`px-1 py-0.5 rounded text-xs font-medium border ${requestingColor}`}>
                                    {requestingTime}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="text-center py-3 font-medium whitespace-nowrap">₱{booking.fare}</td>
                            <td className="py-3 whitespace-nowrap">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleBookingExpansion(booking.id);
                                }}
                                className="inline-flex items-center gap-2 h-8 px-3 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-all duration-200 text-sm font-medium"
                              >
                                {expandedBookings.has(booking.id) ? (
                                  <ChevronUp className="w-4 h-4" />
                                ) : (
                                  <ChevronDown className="w-4 h-4" />
                                )}
                                Details
                              </button>
                            </td>
                          </tr>
                          
                          {/* Expandable details row */}
                          {isExpanded && booking.details && (
                            <tr className={`bg-gray-50 transition-all duration-300 ease-in-out ${
                              recentChanges.has(booking.id) ? 'animate-pulse bg-blue-50' : ''
                            }`}>
                              <td colSpan={8} className="px-6 py-8">
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                  {/* Left Column - Trip Details */}
                                  <div className="space-y-6">
                                    <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
                                      <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                        <MapPin className="w-4 h-4 text-blue-600" />
                                        Trip Details
                                      </h4>
                                      <div className="space-y-3 text-sm">
                                        <div className="flex justify-between py-1">
                                          <span className="text-gray-500">Distance:</span>
                                          <span className="font-medium">{booking.details.distance} km</span>
                                        </div>
                                        <div className="flex justify-between py-1">
                                          <span className="text-gray-500">Duration:</span>
                                          <span className="font-medium">{booking.duration}</span>
                                        </div>
                                        <div className="flex justify-between py-1">
                                          <span className="text-gray-500">Service Type:</span>
                                          <span className="font-medium flex items-center gap-1">
                                            {getServiceIcon(booking.serviceType)} {booking.serviceType}
                                          </span>
                                        </div>
                                        <div className="flex justify-between py-1">
                                          <span className="text-gray-500">Fare:</span>
                                          <span className="font-semibold text-green-600">₱{booking.fare}</span>
                                        </div>
                                        {booking.details.promoCode && (
                                          <div className="flex justify-between py-1">
                                            <span className="text-gray-500">Promo Applied:</span>
                                            <span className="font-medium text-orange-600">{booking.details.promoCode}</span>
                                          </div>
                                        )}
                                      </div>
                                    </div>

                                    {/* Passenger Details */}
                                    <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
                                      <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                        <User className="w-4 h-4 text-green-600" />
                                        Passenger Details
                                      </h4>
                                      <div className="space-y-3 text-sm">
                                        <div className="flex justify-between py-1">
                                          <span className="text-gray-500">Name:</span>
                                          <span className="font-medium">{booking.details.passenger.name}</span>
                                        </div>
                                        <div className="flex justify-between py-1">
                                          <span className="text-gray-500">Phone:</span>
                                          <span className="font-medium">{booking.details.passenger.phone}</span>
                                        </div>
                                        <div className="flex justify-between py-1">
                                          <span className="text-gray-500">Rating:</span>
                                          <span className="font-medium flex items-center gap-1">
                                            <Star className="w-3 h-3 fill-current text-yellow-400" />
                                            {booking.details.passenger.rating.toFixed(1)}
                                          </span>
                                        </div>
                                        <div className="flex justify-between py-1">
                                          <span className="text-gray-500">Total Trips:</span>
                                          <span className="font-medium">{booking.details.passenger.totalTrips}</span>
                                        </div>
                                        <div className="flex justify-between py-1">
                                          <span className="text-gray-500">Payment:</span>
                                          <span className="font-medium capitalize">{booking.details.passenger.paymentMethod.replace('_', ' ')}</span>
                                        </div>
                                        {booking.details.passenger.specialRequests && booking.details.passenger.specialRequests.length > 0 && (
                                          <div className="mt-4 p-3 bg-yellow-50 rounded-md border border-yellow-200">
                                            <div className="text-xs font-medium text-yellow-800 mb-2">Special Requests:</div>
                                            <div className="text-xs text-yellow-700">
                                              {booking.details.passenger.specialRequests.join(', ')}
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                    
                                    {booking.details.driver && (
                                      <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
                                        <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                          <UserCheck className="w-4 h-4 text-blue-600" />
                                          Driver Details
                                        </h4>
                                        <div className="space-y-3 text-sm">
                                          <div className="flex justify-between py-1">
                                            <span className="text-gray-500">Phone:</span>
                                            <span className="font-mono font-medium">{booking.details.driver.phone}</span>
                                          </div>
                                          <div className="flex justify-between py-1">
                                            <span className="text-gray-500">Rating:</span>
                                            <div className="flex items-center gap-1">
                                              <Star className="w-3 h-3 text-yellow-400 fill-current" />
                                              <span className="font-medium">{booking.details.driver.rating.toFixed(1)}</span>
                                            </div>
                                          </div>
                                          <div className="flex justify-between py-1">
                                            <span className="text-gray-500">Vehicle:</span>
                                            <span className="font-medium">{booking.details.driver.vehicleModel} - {booking.details.driver.vehiclePlate}</span>
                                          </div>
                                          <div className="flex justify-between py-1">
                                            <span className="text-gray-500">Acceptance Rate:</span>
                                            <span className="font-medium">{booking.details.driver.acceptanceRate.toFixed(0)}%</span>
                                          </div>
                                          {booking.details.driver.eta && (
                                            <div className="flex justify-between py-1">
                                              <span className="text-gray-500">ETA:</span>
                                              <span className="font-semibold text-blue-600">{booking.details.driver.eta} min</span>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                  
                                  {/* Right Column - Fare and timeline */}
                                  <div className="space-y-6">
                                    <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
                                      <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                        <CreditCard className="w-4 h-4 text-purple-600" />
                                        Fare Breakdown
                                      </h4>
                                      <div className="space-y-3 text-sm">
                                        <div className="flex justify-between py-1">
                                          <span className="text-gray-500">Base Fare:</span>
                                          <span className="font-medium">₱{booking.details.fareBreakdown.baseFare.toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between py-1">
                                          <span className="text-gray-500">Distance:</span>
                                          <span className="font-medium">₱{booking.details.fareBreakdown.distanceFare.toFixed(2)}</span>
                                        </div>
                                        {booking.details.fareBreakdown.surgeFare > 0 && (
                                          <div className="flex justify-between py-1 text-orange-600">
                                            <span>Surge:</span>
                                            <span className="font-medium">₱{booking.details.fareBreakdown.surgeFare.toFixed(2)}</span>
                                          </div>
                                        )}
                                        <div className="flex justify-between py-1">
                                          <span className="text-gray-500">Fees:</span>
                                          <span className="font-medium">₱{booking.details.fareBreakdown.fees.toFixed(2)}</span>
                                        </div>
                                        {booking.details.fareBreakdown.discount > 0 && (
                                          <div className="flex justify-between py-1 text-green-600">
                                            <span>Discount:</span>
                                            <span className="font-medium">-₱{booking.details.fareBreakdown.discount.toFixed(2)}</span>
                                          </div>
                                        )}
                                        <hr className="my-3 border-gray-200" />
                                        <div className="flex justify-between py-1 font-semibold text-base">
                                          <span className="text-gray-900">Total:</span>
                                          <span className="text-gray-900">₱{booking.details.fareBreakdown.total.toFixed(2)}</span>
                                        </div>
                                        <div className="text-center mt-4">
                                          <span className={`px-3 py-1.5 rounded-md text-xs font-medium ${
                                            booking.details.fareBreakdown.paymentStatus === 'paid' ? 'bg-green-100 text-green-700 border border-green-200' :
                                            booking.details.fareBreakdown.paymentStatus === 'failed' ? 'bg-red-100 text-red-700 border border-red-200' :
                                            'bg-orange-100 text-orange-700 border border-orange-200'
                                          }`}>
                                            {booking.details.fareBreakdown.paymentStatus.toUpperCase()} via {booking.details.fareBreakdown.paymentMethod}
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                    
                                    <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
                                      <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                        <Route className="w-4 h-4 text-indigo-600" />
                                        Trip Timeline
                                      </h4>
                                      <div className="space-y-3">
                                        {booking.details.tripProgress.timeline.map((event, idx) => (
                                          <div key={idx} className="flex items-center gap-3 text-sm py-1">
                                            <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></div>
                                            <div className="flex-1">
                                              <div className="font-medium text-gray-900">{event.status}</div>
                                              <div className="text-xs text-gray-500 mt-0.5">{event.timestamp.toLocaleString()}</div>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    }) : (
                      <tr>
                        <td colSpan={8} className="py-8 text-center text-gray-500">
                          <div className="flex flex-col items-center">
                            {(() => {
                              const Icon = tabs.find(t => t.id === activeTab)?.icon || Activity;
                              return <Icon className="w-12 h-12 text-gray-400 mb-3 opacity-40" />;
                            })()}
                            <p className="font-medium">No {tabs.find(t => t.id === activeTab)?.name.toLowerCase()} found</p>
                            <p className="text-sm">Try adjusting your search or filters</p>
                            {activeTab === 'requesting' && (
                              <p className="text-xs text-blue-600 mt-2">New ride requests will appear here automatically</p>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                <div className="text-xs text-gray-500">
                  Page {currentPage} of {totalPages}
                </div>
                <div className="flex items-center space-x-2">
                  <button 
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed rounded"
                  >
                    Previous
                  </button>
                  <span className="text-xs text-gray-600">
                    {Math.max(1, currentPage - 2)}-{Math.min(totalPages, currentPage + 2)} of {totalPages}
                  </span>
                  <button 
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed rounded"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
        </div>
      </div>
      
      {/* Force Assignment Modal */}
      {forceAssignModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[80vh] overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Force Assign Driver</h2>
                  <p className="text-sm text-gray-500">Booking #{bookings.find(b => b.id === forceAssignModal)?.bookingId}</p>
                </div>
                <button 
                  onClick={() => setForceAssignModal(null)} 
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <XCircle className="w-5 h-5 text-gray-400" />
                </button>
              </div>
            </div>
            
            <div className="p-6 max-h-96 overflow-y-auto">
              <div className="space-y-3">
                {[
                  { id: 'DR001', name: 'Carlos Mendoza', rating: 4.8, distance: 0.8, eta: 4, plate: 'ABC-1234', vehicle: 'Toyota Vios' },
                  { id: 'DR002', name: 'Maria Santos', rating: 4.9, distance: 1.2, eta: 6, plate: 'XYZ-5678', vehicle: 'Honda Click' },
                  { id: 'DR003', name: 'Juan dela Cruz', rating: 4.7, distance: 2.1, eta: 8, plate: 'DEF-9012', vehicle: 'Toyota Fortuner' }
                ].map((driver) => (
                  <div
                    key={driver.id}
                    onClick={() => handleForceAssign(forceAssignModal)}
                    className="p-4 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-blue-300 hover:bg-blue-50 transition-all"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <UserCheck className="w-5 h-5 text-blue-600" />
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h3 className="font-medium text-gray-900">{driver.name}</h3>
                          <div className="text-sm text-gray-500">
                            {driver.distance} km • {driver.eta} min ETA
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-4 mt-1 text-sm text-gray-600">
                          <div className="flex items-center space-x-1">
                            <Star className="w-3 h-3 text-yellow-400 fill-current" />
                            <span>{driver.rating}</span>
                          </div>
                          <span>{driver.vehicle}</span>
                          <span>{driver.plate}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
              <div className="flex justify-between items-center">
                <p className="text-sm text-gray-500">Select a driver to assign</p>
                <button
                  onClick={() => setForceAssignModal(null)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BookingsPage;