'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Car, Clock, DollarSign, CheckCircle, XCircle, AlertTriangle, Users, MapPin, 
  Filter, Search, Calendar, MoreHorizontal, ArrowUpRight, ArrowDownRight, 
  Activity, Navigation, Phone, MessageCircle, UserCheck, Route, Star, 
  ChevronDown, ChevronUp, ChevronRight, RefreshCw, Volume2, MapIcon, Timer, 
  CreditCard, AlertCircle, Eye, Edit, Ban, UserPlus, Zap, PlayCircle,
  PauseCircle, SkipForward, Loader, TrendingUp, Navigation2, Truck, User,
  History, Shield, Settings, Gift, TrendingDown, Percent, Flag, Download, Copy, RotateCcw, List,
  ChevronLeft
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useServiceType } from '@/contexts/ServiceTypeContext';

// Calendar helper functions
const getDaysInMonth = (date: Date) => {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
};

const getFirstDayOfMonth = (date: Date) => {
  return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
};

const isSameDay = (date1: Date, date2: Date) => {
  return date1.getFullYear() === date2.getFullYear() &&
         date1.getMonth() === date2.getMonth() &&
         date1.getDate() === date2.getDate();
};

const isDateInRange = (date: Date, from?: Date, to?: Date) => {
  if (!from || !to) return false;
  return date >= from && date <= to;
};

// Enhanced KPI Card component with consistent spacing
function KpiCard({label, value, trend, up, icon: Icon}: {label: string, value: string, trend: string, up?: boolean, icon?: any}) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow duration-200 p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</div>
        {Icon && <Icon className="w-3 h-3 text-gray-400" />}
      </div>
      <div className="text-xl font-bold text-gray-900 mb-2">{value}</div>
      <div className={`flex items-center gap-1 text-xs font-medium ${
        up ? "text-emerald-600" : trend.includes('-') ? "text-emerald-600" : "text-red-500"
      }`}>
        {up || trend.includes('-') ? 
          <ArrowUpRight className="w-3 h-3" /> : 
          <ArrowDownRight className="w-3 h-3" />
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
  appliedPromo?: {
    code: string;
    discount: number;
    type: 'percentage' | 'fixed';
    description: string;
  };
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
  costOfSale?: {
    driverEarnings: number;
    platformFee: number;
    commissionRate: number;
    operatingCosts: number;
    netRevenue: number;
    profitMargin: number;
  };
  promotions?: {
    passengerPromo?: {
      code: string;
      discount: number;
      type: 'percentage' | 'fixed';
    };
    driverIncentive?: {
      type: 'surge_bonus' | 'completion_bonus' | 'loyalty_bonus';
      amount: number;
      description: string;
    };
  };
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
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectingRange, setSelectingRange] = useState(false);
  const [showSearchGuide, setShowSearchGuide] = useState(false);
  // Modal system - no longer using expandedBookings
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [forceAssignModal, setForceAssignModal] = useState<string | null>(null);
  const [lastUpdateTime, setLastUpdateTime] = useState(new Date());
  const [recentChanges, setRecentChanges] = useState<Set<string>>(new Set());
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [autoAssignEnabled, setAutoAssignEnabled] = useState(true);
  
  // Modal state for booking details
  const [selectedBookingModal, setSelectedBookingModal] = useState<string | null>(null);
  const [activeModalTab, setActiveModalTab] = useState('overview');
  
  // Date picker outside click handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (showDatePicker && !target.closest('.date-picker-container')) {
        setShowDatePicker(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showDatePicker]);
  
  // Modal tab configuration
  const modalTabs = [
    { id: 'overview', name: 'Overview', icon: Eye },
    { id: 'timeline', name: 'Trip Timeline', icon: History },
    { id: 'financials', name: 'Fare & Financials', icon: CreditCard },
    { id: 'passenger', name: 'Passenger', icon: User },
    { id: 'driver', name: 'Driver & Vehicle', icon: UserCheck },
    { id: 'compliance', name: 'Risk & Compliance', icon: Shield },
    { id: 'audit', name: 'Audit & Actions', icon: Settings }
  ];

  // Mock user role for RBAC - in real app this comes from auth context
  const [userRole] = useState<'admin' | 'finance' | 'operations' | 'support'>('admin'); // Change to test RBAC
  const hasFinanceAccess = useCallback(() => {
    return ['admin', 'finance'].includes(userRole);
  }, [userRole]);
  
  // Using consistent variable naming throughout
  const [isRealTimeEnabled, setIsRealTimeEnabled] = useState(true);

  // Column width state for resizable columns
  const [columnWidths, setColumnWidths] = useState({
    bookingId: 140,
    pickupDateTime: 160,
    passenger: 160,
    driver: 160,
    pickup: 180,
    dropoff: 180,
    service: 120,
    status: 140, // Increased width to accommodate date/time in scheduled tab
    fare: 100
  });

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
          paymentMethod: ['Cash', 'GCash', 'Credit Card'][Math.floor(Math.random() * 3)],
          costOfSale: {
            driverEarnings: baseFare * 0.75,
            platformFee: baseFare * 0.15,
            commissionRate: 15,
            operatingCosts: baseFare * 0.08,
            netRevenue: baseFare * 0.07,
            profitMargin: 7.2
          },
          promotions: {
            ...(Math.random() > 0.7 ? {
              passengerPromo: {
                code: ['SAVE20', 'NEWUSER', 'WEEKEND'][Math.floor(Math.random() * 3)],
                discount: Math.random() > 0.5 ? 20 : 15,
                type: Math.random() > 0.5 ? 'percentage' : 'fixed' as any
              }
            } : {}),
            ...(Math.random() > 0.8 ? {
              driverIncentive: {
                type: ['surge_bonus', 'completion_bonus', 'loyalty_bonus'][Math.floor(Math.random() * 3)] as any,
                amount: 15 + Math.random() * 35,
                description: 'Peak hour completion bonus'
              }
            } : {})
          }
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
    const statusMap = {
      'requesting': 'Requesting',
      'active-trips': 'Active',
      'completed': 'Completed',
      'cancelled': 'Cancelled',
      'scheduled': 'Scheduled'
    };
    filtered = filtered.filter(booking => booking.status === statusMap[activeTab as keyof typeof statusMap]);

    // Enhanced smart search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase().trim();
      
      // Check for field-specific searches
      if (term.includes(':')) {
        const [field, value] = term.split(':', 2);
        const searchValue = value.trim();
        
        filtered = filtered.filter(booking => {
          switch (field.toLowerCase()) {
            case 'pickup':
            case 'pick':
            case 'from':
              return booking.pickup.toLowerCase().includes(searchValue);
            case 'dropoff':
            case 'drop':
            case 'destination':
            case 'to':
              return booking.destination.toLowerCase().includes(searchValue);
            case 'passenger':
            case 'pax':
            case 'customer':
              return booking.passenger.toLowerCase().includes(searchValue);
            case 'driver':
              return booking.driver.toLowerCase().includes(searchValue);
            case 'booking':
            case 'id':
              return booking.bookingId.toLowerCase().includes(searchValue);
            case 'status':
              return booking.status.toLowerCase().includes(searchValue);
            case 'service':
              return getServiceDisplayName(booking.serviceType).toLowerCase().includes(searchValue);
            default:
              // If field not recognized, fall back to general search
              return booking.bookingId.toLowerCase().includes(term) ||
                     booking.passenger.toLowerCase().includes(term) ||
                     booking.driver.toLowerCase().includes(term) ||
                     booking.pickup.toLowerCase().includes(term) ||
                     booking.destination.toLowerCase().includes(term);
          }
        });
      } else {
        // General search (original behavior)
        filtered = filtered.filter(booking =>
          booking.bookingId.toLowerCase().includes(term) ||
          booking.passenger.toLowerCase().includes(term) ||
          booking.driver.toLowerCase().includes(term) ||
          booking.pickup.toLowerCase().includes(term) ||
          booking.destination.toLowerCase().includes(term)
        );
      }
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

  // Close search guide when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.search-container')) {
        setShowSearchGuide(false);
      }
    };

    if (showSearchGuide) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showSearchGuide]);

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
    { id: 'cancelled', name: 'Cancelled', icon: XCircle, count: statusCounts['Cancelled'] || 0 },
    { id: 'scheduled', name: 'Scheduled', icon: Calendar, count: statusCounts['Scheduled'] || 0 },
    { id: 'completed', name: 'Completed', icon: CheckCircle, count: statusCounts['Completed'] || 0 }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Requesting':
        return 'bg-[#FFF7ED] text-[#D97706]';
      case 'Pending':
        return 'bg-[#FEFCE8] text-[#CA8A04]';
      case 'Assigned':
        return 'bg-[#F0F9FF] text-[#0369A1]';
      case 'Active':
        return 'bg-[#EFF6FF] text-[#2563EB]';
      case 'OTW PICK':
        return 'bg-[#DBEAFE] text-[#1D4ED8]'; // Blue for on the way to pickup
      case 'OTW DROP':
        return 'bg-[#DCFCE7] text-[#16A34A]'; // Green for on the way to dropoff
      case 'Completed':
        return 'bg-[#F0FDF4] text-[#16A34A]';
      case 'Cancelled':
        return 'bg-[#FEF2F2] text-[#DC2626]';
      case 'Scheduled':
        return 'bg-[#F3E8FF] text-[#7C3AED]';
      // Trip types for non-scheduled tabs
      case 'Regular':
        return 'bg-[#F8FAFC] text-[#475569]'; // Gray for regular rides
      case 'ScanRide':
        return 'bg-[#EFF6FF] text-[#2563EB]'; // Blue for scan rides
      case 'Concierge':
        return 'bg-[#FEF3C7] text-[#D97706]'; // Amber for concierge service
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

  // Service type display name mapping
  const getServiceDisplayName = (serviceType: string) => {
    const serviceTypeMap: { [key: string]: string } = {
      'motorcycle': 'MC Taxi',
      'car': 'TNVS 4 Seat', 
      'suv': 'TNVS 6 Seat',
      'premium': 'TNVS Premium',
      'taxi': 'Taxi',
      'premium taxi': 'Premium Taxi',
      'twg': 'TWG',
      'etrike': 'Etrike'
    };
    return serviceTypeMap[serviceType.toLowerCase()] || serviceType;
  };

  // Get display status - show pickup date/time for scheduled tab, type for others
  const getDisplayStatus = (booking: Booking, currentTab: string) => {
    if (currentTab === 'scheduled') {
      // For scheduled tab, show pickup date/time
      return getPickupDateTime(booking);
    } else {
      // For other tabs (requesting, active-trips, cancelled, completed), show trip type
      return getTripType(booking);
    }
  };

  // Get pickup date/time for scheduled tab
  const getPickupDateTime = (booking: Booking) => {
    const pickupDate = new Date(booking.createdAt.getTime() + (Math.random() * 24 * 60 * 60 * 1000)); // Add random hours for scheduled time
    return `${pickupDate.toLocaleDateString()} ${pickupDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
  };

  // Get trip type for non-scheduled tabs
  const getTripType = (booking: Booking) => {
    const bookingNum = parseInt(booking.bookingId.replace(/\D/g, '')) || 0;
    const typeIndex = bookingNum % 4;
    
    switch (typeIndex) {
      case 0:
        return 'Regular';
      case 1:
        return 'ScanRide';
      case 2:
        return 'Scheduled';
      case 3:
        return 'Concierge';
      default:
        return 'Regular';
    }
  };

  // Calculate dynamic KPIs based on filtered results
  const calculateFilteredKPIs = (filteredBookings: Booking[]) => {
    const total = filteredBookings.length;
    
    // Count by status
    const requesting = filteredBookings.filter(b => b.status === 'Requesting').length;
    const active = filteredBookings.filter(b => b.status === 'Active').length;
    const completed = filteredBookings.filter(b => b.status === 'Completed').length;
    const cancelled = filteredBookings.filter(b => b.status === 'Cancelled').length;
    const scheduled = filteredBookings.filter(b => b.status === 'Scheduled').length;
    
    // Calculate rates
    const totalRequests = total;
    const acceptanceRate = total > 0 ? ((active + completed + scheduled) / total * 100).toFixed(1) : '0.0';
    const cancelRate = total > 0 ? (cancelled / total * 100).toFixed(1) : '0.0';
    const completionRate = total > 0 ? (completed / total * 100).toFixed(1) : '0.0';
    
    // Calculate average fare
    const totalFare = filteredBookings.reduce((sum, booking) => sum + booking.fare, 0);
    const avgFare = total > 0 ? Math.round(totalFare / total) : 0;
    
    return {
      totalRequests,
      acceptanceRate: `${acceptanceRate}%`,
      cancelRate: `${cancelRate}%`,
      completionRate: `${completionRate}%`,
      avgFare: `₱${avgFare}`
    };
  };
  
  // Get time elapsed for requesting bookings with 3-minute timeout
  const getRequestingTime = useCallback((booking: Booking) => {
    if (booking.status !== 'Requesting') return '';
    const elapsed = Math.floor((Date.now() - booking.createdAt.getTime()) / 1000);
    if (elapsed >= 180) return 'TIMED OUT';
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
    setSelectedBookingModal(bookingId);
    setActiveModalTab('overview');
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

  // Column resize handlers
  const handleMouseDown = useCallback((e: React.MouseEvent, columnKey: string) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = columnWidths[columnKey as keyof typeof columnWidths];

    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = Math.max(80, startWidth + (e.clientX - startX));
      setColumnWidths(prev => ({ ...prev, [columnKey]: newWidth }));
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [columnWidths]);

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
            <h1 className="text-3xl font-semibold text-gray-900 tracking-tight font-[Inter]">Bookings</h1>
            <p className="text-base text-gray-500 mt-1 font-[Inter]">Trip management and booking analytics</p>
          </div>

          {/* Lightweight Search and Filters */}
          <div className="flex items-center space-x-3">
            <div className="relative search-container">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Click for search tips..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onFocus={() => setShowSearchGuide(true)}
                className="pl-10 pr-4 py-2.5 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 w-80 placeholder-gray-500 h-10 shadow-sm hover:shadow-md"
              />
              
              {/* Search Guide Dropdown */}
              {showSearchGuide && (
                <div className="absolute top-full left-0 mt-2 w-full bg-white border border-gray-200 rounded-lg shadow-lg z-50 p-4">
                  <div className="text-sm font-medium text-gray-900 mb-3">Smart Search Guide</div>
                  <div className="space-y-3">
                    <div>
                      <div className="text-xs text-gray-500 mb-1">Search by specific fields:</div>
                      <div className="space-y-2 text-xs">
                        <div className="flex items-center gap-2">
                          <code className="px-2 py-1 bg-blue-50 text-blue-700 rounded font-mono">pickup:ortigas</code>
                          <span className="text-gray-600">Search pickup locations</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <code className="px-2 py-1 bg-green-50 text-green-700 rounded font-mono">passenger:maria</code>
                          <span className="text-gray-600">Search passenger names</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <code className="px-2 py-1 bg-purple-50 text-purple-700 rounded font-mono">driver:carlos</code>
                          <span className="text-gray-600">Search driver names</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <code className="px-2 py-1 bg-orange-50 text-orange-700 rounded font-mono">dropoff:bgc</code>
                          <span className="text-gray-600">Search destinations</span>
                        </div>
                      </div>
                    </div>
                    <div className="border-t border-gray-100 pt-3">
                      <div className="text-xs text-gray-500">
                        Or search normally across all fields without using colons
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
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
          <div className="flex items-center space-x-3">
            {/* Date picker - only show for Completed tab */}
            {activeTab === 'completed' && (
              <div className="relative date-picker-container">
                <button
                  className="flex items-center space-x-2 px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors text-gray-700 h-10 min-w-[200px] shadow-sm"
                  onClick={() => setShowDatePicker(!showDatePicker)}
                >
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <span>
                    {dateRange.from && dateRange.to ? 
                      `${dateRange.from.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: '2-digit' })} - ${dateRange.to.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: '2-digit' })}` : 
                      'Select date range'
                    }
                  </span>
                  <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showDatePicker ? 'rotate-180' : ''}`} />
                </button>
                
                {/* Enhanced Date Range Picker Dropdown */}
                {showDatePicker && (
                  <div className="absolute top-12 right-0 z-50 bg-white border border-gray-200 rounded-lg shadow-lg min-w-[600px] flex">
                    {/* Quick Select Options */}
                    <div className="w-40 p-4 border-r border-gray-200">
                      <div className="space-y-2 mb-4">
                        <button
                          onClick={() => {
                            const today = new Date();
                            setDateRange({ from: today, to: today });
                            setShowDatePicker(false);
                          }}
                          className="block w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded"
                        >
                          Today
                        </button>
                        <button
                          onClick={() => {
                            const yesterday = new Date();
                            yesterday.setDate(yesterday.getDate() - 1);
                            setDateRange({ from: yesterday, to: yesterday });
                            setShowDatePicker(false);
                          }}
                          className="block w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded"
                        >
                          Yesterday
                        </button>
                        <button
                          onClick={() => {
                            const today = new Date();
                            const lastWeek = new Date();
                            lastWeek.setDate(today.getDate() - 7);
                            setDateRange({ from: lastWeek, to: today });
                            setShowDatePicker(false);
                          }}
                          className="block w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded"
                        >
                          Last week
                        </button>
                        <button
                          onClick={() => {
                            const today = new Date();
                            const lastMonth = new Date();
                            lastMonth.setMonth(today.getMonth() - 1);
                            setDateRange({ from: lastMonth, to: today });
                            setShowDatePicker(false);
                          }}
                          className="block w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded"
                        >
                          Last month
                        </button>
                        <button
                          onClick={() => {
                            const today = new Date();
                            const lastQuarter = new Date();
                            lastQuarter.setMonth(today.getMonth() - 3);
                            setDateRange({ from: lastQuarter, to: today });
                            setShowDatePicker(false);
                          }}
                          className="block w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded"
                        >
                          Last quarter
                        </button>
                      </div>
                      
                      {/* Reset Button */}
                      <button
                        onClick={() => {
                          setDateRange({});
                          setShowDatePicker(false);
                        }}
                        className="text-blue-600 text-sm hover:text-blue-700 font-medium"
                      >
                        Reset
                      </button>
                    </div>
                    
                    {/* Calendar */}
                    <div className="flex-1 p-4">
                      {/* Month Navigation */}
                      <div className="flex items-center justify-between mb-4">
                        <button
                          onClick={() => {
                            const newMonth = new Date(currentMonth);
                            newMonth.setMonth(currentMonth.getMonth() - 1);
                            setCurrentMonth(newMonth);
                          }}
                          className="p-1 hover:bg-gray-100 rounded"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <h3 className="text-lg font-semibold">
                          {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                        </h3>
                        <button
                          onClick={() => {
                            const newMonth = new Date(currentMonth);
                            newMonth.setMonth(currentMonth.getMonth() + 1);
                            setCurrentMonth(newMonth);
                          }}
                          className="p-1 hover:bg-gray-100 rounded"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                      
                      {/* Day Headers */}
                      <div className="grid grid-cols-7 gap-1 mb-2">
                        {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map(day => (
                          <div key={day} className="text-center text-sm font-medium text-gray-500 p-2">
                            {day}
                          </div>
                        ))}
                      </div>
                      
                      {/* Calendar Days */}
                      <div className="grid grid-cols-7 gap-1">
                        {(() => {
                          const daysInMonth = getDaysInMonth(currentMonth);
                          const firstDay = getFirstDayOfMonth(currentMonth);
                          const adjustedFirstDay = firstDay === 0 ? 6 : firstDay - 1; // Convert Sunday=0 to Monday=0
                          const days = [];
                          
                          // Empty cells for days before the first day of month
                          for (let i = 0; i < adjustedFirstDay; i++) {
                            const prevMonth = new Date(currentMonth);
                            prevMonth.setMonth(currentMonth.getMonth() - 1);
                            const daysInPrevMonth = getDaysInMonth(prevMonth);
                            const dayNum = daysInPrevMonth - adjustedFirstDay + i + 1;
                            days.push(
                              <div key={`prev-${i}`} className="text-center p-2 text-gray-300 text-sm">
                                {dayNum}
                              </div>
                            );
                          }
                          
                          // Days of current month
                          for (let day = 1; day <= daysInMonth; day++) {
                            const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
                            const isToday = isSameDay(date, new Date());
                            const isSelected = (dateRange.from && isSameDay(date, dateRange.from)) || 
                                            (dateRange.to && isSameDay(date, dateRange.to));
                            const isInRange = isDateInRange(date, dateRange.from, dateRange.to);
                            
                            days.push(
                              <button
                                key={day}
                                onClick={() => {
                                  if (!dateRange.from || (dateRange.from && dateRange.to)) {
                                    setDateRange({ from: date, to: undefined });
                                    setSelectingRange(true);
                                  } else {
                                    const from = dateRange.from;
                                    const to = date;
                                    setDateRange({ 
                                      from: from < to ? from : to, 
                                      to: from < to ? to : from 
                                    });
                                    setSelectingRange(false);
                                  }
                                }}
                                className={`text-center p-2 text-sm rounded-full hover:bg-blue-100 transition-colors ${
                                  isToday ? 'bg-blue-500 text-white font-semibold' : 
                                  isSelected ? 'bg-blue-500 text-white' :
                                  isInRange ? 'bg-blue-100 text-blue-600' :
                                  'text-gray-700 hover:text-blue-600'
                                }`}
                              >
                                {day}
                              </button>
                            );
                          }
                          
                          // Fill remaining cells with next month days
                          const totalCells = Math.ceil((adjustedFirstDay + daysInMonth) / 7) * 7;
                          const remainingCells = totalCells - adjustedFirstDay - daysInMonth;
                          for (let day = 1; day <= remainingCells; day++) {
                            days.push(
                              <div key={`next-${day}`} className="text-center p-2 text-gray-300 text-sm">
                                {day}
                              </div>
                            );
                          }
                          
                          return days;
                        })()}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
            
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
      </div>

      {/* Main Layout - Sidebar + Content */}
      <div className="flex gap-6">
        {/* Left Sidebar - KPI Cards Stacked */}
        <div className="w-56 space-y-4 flex-shrink-0">
          {(() => {
            const kpis = calculateFilteredKPIs(filteredBookings);
            return (
              <>
                <KpiCard 
                  label="Total Requests"
                  value={kpis.totalRequests.toString()}
                  trend="+8.7%"
                  up={true}
                  icon={Activity}
                />
                <KpiCard 
                  label="Acceptance Rate" 
                  value={kpis.acceptanceRate}
                  trend="+5.2%"
                  up={true}
                  icon={CheckCircle}
                />
                <KpiCard 
                  label="Cancel Rate" 
                  value={kpis.cancelRate}
                  trend="-2.1%"
                  up={false}
                  icon={XCircle}
                />
                <KpiCard 
                  label="Completion Rate" 
                  value={kpis.completionRate}
                  trend="+2.4%"
                  up={true}
                  icon={CheckCircle}
                />
                <KpiCard 
                  label="Avg Fare" 
                  value={kpis.avgFare}
                  trend="+12%"
                  up={true}
                  icon={DollarSign}
                />
              </>
            );
          })()}
        </div>

        {/* Main Content Area - Booking Stream */}
        <div className="flex-1 min-w-0">

        {/* Optimized Bookings Table */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
          <div className="p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="font-semibold text-lg text-gray-900 font-[Inter]">
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
                <table className="w-full text-base">
                  <thead className="sticky top-0 bg-white z-10">
                    <tr className="text-gray-500 text-xs uppercase tracking-wide border-b border-gray-100">
                      <th className="text-left py-2 font-medium bg-white relative" style={{width: `${columnWidths.bookingId}px`}}>
                        Booking ID
                        <div 
                          className="absolute right-0 top-0 w-1 h-full cursor-col-resize hover:bg-gray-300 transition-colors"
                          onMouseDown={(e) => handleMouseDown(e, 'bookingId')}
                        />
                      </th>
                      <th className="text-left py-2 font-medium bg-white relative" style={{width: `${columnWidths.pickupDateTime}px`}}>
                        Pickup Date/Time
                        <div 
                          className="absolute right-0 top-0 w-1 h-full cursor-col-resize hover:bg-gray-300 transition-colors"
                          onMouseDown={(e) => handleMouseDown(e, 'pickupDateTime')}
                        />
                      </th>
                      <th className="text-left py-2 font-medium bg-white relative" style={{width: `${columnWidths.passenger}px`}}>
                        Passenger
                        <div 
                          className="absolute right-0 top-0 w-1 h-full cursor-col-resize hover:bg-gray-300 transition-colors"
                          onMouseDown={(e) => handleMouseDown(e, 'passenger')}
                        />
                      </th>
                      <th className="text-left py-2 font-medium bg-white relative" style={{width: `${columnWidths.driver}px`}}>
                        Driver
                        <div 
                          className="absolute right-0 top-0 w-1 h-full cursor-col-resize hover:bg-gray-300 transition-colors"
                          onMouseDown={(e) => handleMouseDown(e, 'driver')}
                        />
                      </th>
                      <th className="text-left py-2 font-medium bg-white relative" style={{width: `${columnWidths.pickup}px`}}>
                        Pickup
                        <div 
                          className="absolute right-0 top-0 w-1 h-full cursor-col-resize hover:bg-gray-300 transition-colors"
                          onMouseDown={(e) => handleMouseDown(e, 'pickup')}
                        />
                      </th>
                      <th className="text-left py-2 font-medium bg-white relative" style={{width: `${columnWidths.dropoff}px`}}>
                        Drop off
                        <div 
                          className="absolute right-0 top-0 w-1 h-full cursor-col-resize hover:bg-gray-300 transition-colors"
                          onMouseDown={(e) => handleMouseDown(e, 'dropoff')}
                        />
                      </th>
                      <th className="text-center py-2 font-medium bg-white relative" style={{width: `${columnWidths.service}px`}}>
                        Service
                        <div 
                          className="absolute right-0 top-0 w-1 h-full cursor-col-resize hover:bg-gray-300 transition-colors"
                          onMouseDown={(e) => handleMouseDown(e, 'service')}
                        />
                      </th>
                      <th className="text-center py-2 font-medium bg-white relative" style={{width: `${columnWidths.status}px`}}>
                        {activeTab === 'scheduled' ? 'Pickup Date/Time' : 'Type'}
                        <div 
                          className="absolute right-0 top-0 w-1 h-full cursor-col-resize hover:bg-gray-300 transition-colors"
                          onMouseDown={(e) => handleMouseDown(e, 'status')}
                        />
                      </th>
                      <th className="text-center py-2 font-medium bg-white" style={{width: `${columnWidths.fare}px`}}>
                        Fare
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {currentBookings.length > 0 ? currentBookings.map((booking, index) => {
                      // Using modal system now
                      const isRecent = recentChanges.has(booking.id);
                      const requestingTime = getRequestingTime(booking);
                      const requestingColor = getRequestingColor(booking);
                      
                      return (
                        <React.Fragment key={`${booking.id}-${index}`}>
                          {/* Main booking row - clickable */}
                          <tr 
                            onClick={() => toggleBookingExpansion(booking.id)}
                            className={`cursor-pointer transition-colors text-xs ${
                              isRecent ? 'bg-blue-50' : 'hover:bg-gray-25'
                            }`}
                          >
                            <td className="py-3 font-medium text-blue-600 whitespace-nowrap">
                              <div className="flex items-center space-x-2">
                                <Eye className="w-3 h-3" />
                                <span>{booking.bookingId}</span>
                                {booking.details?.emergencyFlag && (
                                  <span className="px-1 py-0.5 bg-red-100 text-red-700 text-xs font-bold rounded animate-pulse">
                                    🚨
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-3 text-gray-700 text-sm">
                              <div>
                                <div className="font-medium">
                                  {(() => {
                                    const pickupDate = new Date(booking.createdAt);
                                    const now = new Date();
                                    const timeDiff = Math.round((pickupDate.getTime() - now.getTime()) / (1000 * 60));
                                    
                                    if (booking.status === 'Scheduled') {
                                      // For scheduled rides, show future pickup time
                                      const scheduledTime = new Date(booking.createdAt.getTime() + (Math.random() * 24 * 60 * 60 * 1000)); // Add random hours for demo
                                      const timeToPickup = Math.round((scheduledTime.getTime() - now.getTime()) / (1000 * 60));
                                      return (
                                        <>
                                          <div>{scheduledTime.toLocaleDateString()} {scheduledTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                                          <div className="text-xs text-blue-600">({timeToPickup > 0 ? `in ${Math.round(timeToPickup/60)}h ${timeToPickup%60}m` : 'now'})</div>
                                        </>
                                      );
                                    } else {
                                      // For other statuses, show request time
                                      return (
                                        <>
                                          <div>{pickupDate.toLocaleDateString()} {pickupDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                                          <div className="text-xs text-gray-500">requested</div>
                                        </>
                                      );
                                    }
                                  })()}
                                </div>
                              </div>
                            </td>
                            <td className="py-3 text-gray-900 max-w-32 truncate">
                              <div>
                                <div className="text-sm">{booking.passenger}</div>
                                {booking.details?.passenger.rating && (
                                  <div className="flex items-center space-x-1 text-xs text-gray-500">
                                    <Star className="w-2 h-2 text-yellow-400 fill-current" />
                                    <span>{booking.details.passenger.rating.toFixed(1)}</span>
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="py-3 text-gray-700 max-w-32">
                              <div>
                                <div className="text-sm">{booking.driver}</div>
                                {booking.details?.driver?.rating && booking.driver !== 'Unassigned' && (
                                  <div className="flex items-center space-x-1 text-xs text-gray-500">
                                    <Star className="w-2 h-2 text-yellow-400 fill-current" />
                                    <span>{booking.details.driver.rating.toFixed(1)}</span>
                                  </div>
                                )}
                                {booking.status === 'Requesting' && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setForceAssignModal(booking.id);
                                    }}
                                    className="mt-1 px-2 py-1 bg-orange-100 text-orange-700 text-xs rounded hover:bg-orange-200"
                                  >
                                    Assign
                                  </button>
                                )}
                              </div>
                            </td>
                            <td className="py-3">
                              <div>
                                <div className="text-gray-900 truncate text-sm">{booking.pickup}</div>
                                {(() => {
                                  const demandPercentage = Math.floor(Math.random() * 120 + 20); // 20% to 140%
                                  const getColorClass = (percentage: number) => {
                                    if (percentage <= 60) return 'text-green-600';
                                    if (percentage <= 80) return 'text-orange-600';
                                    return 'text-red-600';
                                  };
                                  const getIndicator = (percentage: number) => {
                                    if (percentage <= 60) return '●';
                                    if (percentage <= 80) return '●';
                                    return '●';
                                  };
                                  return (
                                    <div className={`text-xs flex items-center space-x-1 ${getColorClass(demandPercentage)}`}>
                                      <span>{getIndicator(demandPercentage)}</span>
                                      <span>{demandPercentage}%</span>
                                    </div>
                                  );
                                })()}
                              </div>
                            </td>
                            <td className="py-3">
                              <div>
                                <div className="text-gray-900 truncate text-sm">{booking.destination}</div>
                                <div className="text-gray-400 text-xs">{booking.distance} • {booking.duration}</div>
                              </div>
                            </td>
                            <td className="text-center py-3">
                              <div className="flex flex-col items-center justify-center space-y-1">
                                <span className="text-sm">{getServiceIcon(booking.serviceType)}</span>
                                <span className="text-xs font-medium text-center leading-tight max-w-[80px]">
                                  {getServiceDisplayName(booking.serviceType).split(' ').map((word, index, array) => (
                                    <React.Fragment key={index}>
                                      {word}
                                      {index < array.length - 1 && array.length > 2 && index === 0 ? <br /> : 
                                       index < array.length - 1 ? ' ' : ''}
                                    </React.Fragment>
                                  ))}
                                </span>
                              </div>
                            </td>
                            <td className="text-center py-3">
                              {activeTab === 'scheduled' ? (
                                <div className="text-sm text-gray-700 font-medium">
                                  {getDisplayStatus(booking, activeTab)}
                                </div>
                              ) : (
                                <span className={`px-2 py-1 rounded-full text-sm font-medium ${getStatusColor(getDisplayStatus(booking, activeTab))}`}>
                                  {getDisplayStatus(booking, activeTab)}
                                </span>
                              )}
                            </td>
                            <td className="text-center py-3 font-medium whitespace-nowrap">
                              <div className="flex items-center justify-center space-x-1">
                                <span className="text-sm">₱{booking.fare}</span>
                                {(() => {
                                  const hasSurge = Math.random() > 0.7; // 30% chance of surge
                                  return hasSurge ? (
                                    <Zap className="w-3 h-3 text-yellow-500" title="Surge pricing active" />
                                  ) : null;
                                })()}
                              </div>
                            </td>
                          </tr>
                          
                          {/* Expandable details row */}
                        </React.Fragment>
                      );
                    }) : (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-gray-500">
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
      
      {/* Enhanced Force Assignment Modal */}
      {forceAssignModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
            <div className="bg-gradient-to-r from-orange-500 to-red-500 px-6 py-4 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold font-[Inter]">🚨 Force Assign Driver</h2>
                  <p className="text-orange-100 text-sm">Booking #{bookings.find(b => b.id === forceAssignModal)?.bookingId} - Urgent Assignment Required</p>
                </div>
                <button 
                  onClick={() => setForceAssignModal(null)} 
                  className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                <div className="flex items-center gap-2 text-orange-800 text-sm">
                  <AlertTriangle className="w-4 h-4" />
                  <span>This booking has been waiting for {getRequestingTime(bookings.find(b => b.id === forceAssignModal)!)}. Select a driver below:</span>
                </div>
              </div>
              
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {[
                  { id: 'DR001', name: 'Carlos Mendoza', rating: 4.8, distance: 0.8, eta: 4, plate: 'ABC-1234', vehicle: 'Toyota Vios', status: 'Available', trips: 847 },
                  { id: 'DR002', name: 'Maria Santos', rating: 4.9, distance: 1.2, eta: 6, plate: 'XYZ-5678', vehicle: 'Honda Click', status: 'Available', trips: 1205 },
                  { id: 'DR003', name: 'Juan dela Cruz', rating: 4.7, distance: 2.1, eta: 8, plate: 'DEF-9012', vehicle: 'Toyota Fortuner', status: 'Available', trips: 632 }
                ].map((driver) => (
                  <div
                    key={driver.id}
                    onClick={() => handleForceAssign(forceAssignModal)}
                    className="group p-4 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-orange-300 hover:bg-orange-50 transition-all duration-200 hover:shadow-md"
                  >
                    <div className="flex items-center gap-4">
                      {/* Driver Avatar */}
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center flex-shrink-0 text-white font-semibold">
                        {driver.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      
                      {/* Driver Info */}
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <h3 className="font-semibold text-gray-900">{driver.name}</h3>
                          <div className="text-right">
                            <div className="text-sm font-medium text-orange-600">{driver.distance} km away</div>
                            <div className="text-xs text-gray-500">ETA: {driver.eta} minutes</div>
                          </div>
                        </div>
                        
                        {/* Rating & Stats */}
                        <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                          <div className="flex items-center gap-1">
                            {Array.from({ length: 5 }, (_, i) => (
                              <Star 
                                key={i} 
                                className={`w-3 h-3 ${
                                  i < Math.floor(driver.rating) 
                                    ? 'text-yellow-400 fill-current' 
                                    : 'text-gray-300'
                                }`} 
                              />
                            ))}
                            <span className="font-medium ml-1">{driver.rating}</span>
                          </div>
                          <span>•</span>
                          <span>{driver.trips} trips</span>
                          <span>•</span>
                          <span className="text-green-600 font-medium">{driver.status}</span>
                        </div>
                        
                        {/* Vehicle Info */}
                        <div className="flex items-center justify-between">
                          <div className="text-sm text-gray-600">
                            🚗 {driver.vehicle} - <span className="font-mono">{driver.plate}</span>
                          </div>
                          <button className="group-hover:bg-orange-500 group-hover:text-white px-3 py-1.5 bg-gray-100 text-gray-700 rounded-md text-sm font-medium transition-colors">
                            Assign Now
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-between items-center">
              <div className="text-sm text-gray-600">
                💡 <strong>Tip:</strong> Choose the closest driver for fastest pickup
              </div>
              <button
                onClick={() => setForceAssignModal(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Clean Booking Details Modal */}
      {selectedBookingModal && (() => {
        const booking = bookings.find(b => b.id === selectedBookingModal);
        if (!booking || !booking.details) return null;
        
        return (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl h-[80vh] overflow-hidden flex flex-col">
              {/* Clean Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-white">
                <div className="flex items-center gap-4">
                  <h2 className="text-xl font-semibold text-gray-900 font-[Inter]">Booking Details – {booking.bookingId}</h2>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(booking.status)}`}>
                    {booking.status}
                  </span>
                </div>
                <button 
                  onClick={() => setSelectedBookingModal(null)} 
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <XCircle className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              
              {/* Flat Tabs */}
              <div className="border-b border-gray-200 bg-gray-50">
                <div className="flex px-6">
                  {modalTabs.map((tab) => {
                    const Icon = tab.icon;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveModalTab(tab.id)}
                        className={`flex items-center px-4 py-3 text-sm font-medium transition-colors relative ${
                          activeModalTab === tab.id
                            ? 'text-[#7C3AED] bg-white'
                            : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
                        }`}
                      >
                        <Icon className="w-4 h-4 mr-2" />
                        {tab.name}
                        {activeModalTab === tab.id && (
                          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#7C3AED]"></div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
              
              {/* Modal Content */}
              <div className="flex-1 p-6 overflow-y-auto bg-white">
                {activeModalTab === 'overview' && (
                  <div className="space-y-8">
                    {/* Emergency Alert Banner - Show when emergency flag is active */}
                    {booking.details?.emergencyFlag && (
                      <div className="p-4 bg-red-100 border-2 border-red-500 rounded-lg">
                        <div className="flex items-center gap-3">
                          <AlertTriangle className="w-6 h-6 text-red-600 animate-pulse" />
                          <div>
                            <h4 className="text-lg font-bold text-red-900">🚨 EMERGENCY ALERT</h4>
                            <p className="text-sm text-red-800">SOS has been activated for this trip. Emergency services have been notified.</p>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* Trip Summary Section */}
                    <div className="bg-white">
                      <div className="flex items-center gap-3 mb-6">
                        <MapPin className="w-5 h-5 text-gray-400" />
                        <h3 className="text-lg font-semibold text-gray-900 font-[Inter]">Trip Summary</h3>
                      </div>
                      
                      {/* Field Groups */}
                      <div className="space-y-6">
                        <div className="grid grid-cols-1 gap-6">
                          {/* Pickup */}
                          <div className="grid grid-cols-3 gap-4 items-start">
                            <label className="text-sm text-gray-500 font-medium">Pickup Location</label>
                            <div className="col-span-2">
                              <p className="font-medium text-gray-900">{booking.pickup}</p>
                              <p className="text-xs text-gray-500 mt-1">Requested {new Date(booking.createdAt).toLocaleTimeString()}</p>
                            </div>
                          </div>
                          
                          {/* Destination */}
                          <div className="grid grid-cols-3 gap-4 items-start">
                            <label className="text-sm text-gray-500 font-medium">Destination</label>
                            <div className="col-span-2">
                              <p className="font-medium text-gray-900">{booking.destination}</p>
                              <p className="text-xs text-gray-500 mt-1">Distance: {booking.distance}</p>
                            </div>
                          </div>
                        </div>
                        
                        <div className="border-t border-gray-100 pt-6">
                          <div className="space-y-4">
                            <div className="grid grid-cols-3 gap-4 items-center">
                              <label className="text-sm text-gray-500 font-medium">Duration</label>
                              <p className="font-medium text-gray-900 col-span-2">{booking.duration}</p>
                            </div>
                            <div className="grid grid-cols-3 gap-4 items-center">
                              <label className="text-sm text-gray-500 font-medium">Service Type</label>
                              <p className="font-medium text-gray-900 col-span-2">{getServiceDisplayName(booking.serviceType)}</p>
                            </div>
                            <div className="grid grid-cols-3 gap-4 items-center">
                              <label className="text-sm text-gray-500 font-medium">Total Fare</label>
                              <p className="font-semibold text-gray-900 text-lg col-span-2">₱{booking.fare}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Passenger Section */}
                    <div className="bg-white border-t border-gray-100 pt-8">
                      <div className="flex items-center gap-3 mb-6">
                        <User className="w-5 h-5 text-gray-400" />
                        <h3 className="text-lg font-semibold text-gray-900 font-[Inter]">Passenger</h3>
                      </div>
                      
                      {/* Field Groups */}
                      <div className="space-y-6">
                        <div className="space-y-4">
                          <div className="grid grid-cols-3 gap-4 items-center">
                            <label className="text-sm text-gray-500 font-medium">Name</label>
                            <p className="font-medium text-gray-900 col-span-2">{booking.details.passenger.name}</p>
                          </div>
                          
                          <div className="grid grid-cols-3 gap-4 items-center">
                            <label className="text-sm text-gray-500 font-medium">Phone</label>
                            <p className="font-medium text-gray-900 col-span-2">{booking.details.passenger.phone}</p>
                          </div>
                          
                          <div className="grid grid-cols-3 gap-4 items-center">
                            <label className="text-sm text-gray-500 font-medium">Rating</label>
                            <div className="flex items-center gap-2 col-span-2">
                              <Star className="w-4 h-4 text-yellow-400 fill-current" />
                              <span className="font-medium text-gray-900">{booking.details.passenger.rating.toFixed(1)}</span>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-3 gap-4 items-center">
                            <label className="text-sm text-gray-500 font-medium">Total Trips</label>
                            <p className="font-medium text-gray-900 col-span-2">{booking.details.passenger.totalTrips}</p>
                          </div>
                          
                          <div className="grid grid-cols-3 gap-4 items-center">
                            <label className="text-sm text-gray-500 font-medium">Payment Method</label>
                            <p className="font-medium text-gray-900 capitalize col-span-2">{booking.details.passenger.paymentMethod.replace('_', ' ')}</p>
                          </div>
                        </div>
                        
                        <div className="border-t border-gray-100 pt-6">
                          <div className="flex gap-3">
                            <button className="bg-[#3B82F6] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#2563EB] transition-colors flex items-center gap-2">
                              <Phone className="w-4 h-4" />
                              Call
                            </button>
                            <button className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors flex items-center gap-2">
                              <MessageCircle className="w-4 h-4" />
                              Message
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Driver Assignment Section */}
                    <div className="bg-white border-t border-gray-100 pt-8">
                      <div className="flex items-center gap-3 mb-6">
                        <UserCheck className="w-5 h-5 text-gray-400" />
                        <h3 className="text-lg font-semibold text-gray-900 font-[Inter]">Driver Assignment</h3>
                      </div>
                      
                      {booking.details.driver ? (
                        <div className="space-y-6">
                          <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-1">
                              <label className="text-sm text-gray-500">Driver Name</label>
                              <p className="font-medium text-gray-900">{booking.details.driver.name}</p>
                            </div>
                            
                            <div className="space-y-1">
                              <label className="text-sm text-gray-500">Phone</label>
                              <p className="font-medium text-gray-900">{booking.details.driver.phone}</p>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-3 gap-6">
                            <div className="space-y-1">
                              <label className="text-sm text-gray-500">Rating</label>
                              <div className="flex items-center gap-2">
                                <Star className="w-4 h-4 text-yellow-400 fill-current" />
                                <span className="font-medium text-gray-900">{booking.details.driver.rating.toFixed(1)}</span>
                              </div>
                            </div>
                            
                            <div className="space-y-1">
                              <label className="text-sm text-gray-500">Vehicle</label>
                              <p className="font-medium text-gray-900">{booking.details.driver.vehicleModel}</p>
                            </div>
                            
                            <div className="space-y-1">
                              <label className="text-sm text-gray-500">Plate Number</label>
                              <p className="font-mono font-medium text-gray-900">{booking.details.driver.vehiclePlate}</p>
                            </div>
                          </div>
                          
                          {booking.details.driver.eta && (
                            <div className="grid grid-cols-1 gap-6">
                              <div className="space-y-1">
                                <label className="text-sm text-gray-500">Estimated Arrival</label>
                                <p className="font-semibold text-gray-900">{booking.details.driver.eta} minutes</p>
                              </div>
                            </div>
                          )}
                          
                          <div className="flex gap-3 pt-2">
                            <button className="bg-[#3B82F6] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#2563EB] transition-colors flex items-center gap-2">
                              <Phone className="w-4 h-4" />
                              Call Driver
                            </button>
                            <button className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors flex items-center gap-2">
                              <MapPin className="w-4 h-4" />
                              Track Location
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div className="flex items-center gap-3">
                            <span className="px-3 py-1 bg-[#FFF7ED] text-[#D97706] rounded-full text-sm font-medium">
                              Unassigned
                            </span>
                            <span className="text-sm text-gray-600">Waiting for driver assignment</span>
                          </div>
                          
                          <div className="pt-2">
                            <button className="bg-[#3B82F6] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#2563EB] transition-colors">
                              Force Assign Driver
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                {activeModalTab === 'timeline' && (
                  <div className="space-y-8">
                    {/* Trip Timeline Section */}
                    <div className="bg-white">
                      <div className="flex items-center gap-3 mb-6">
                        <History className="w-5 h-5 text-gray-400" />
                        <h3 className="text-lg font-semibold text-gray-900 font-[Inter]">Trip Timeline</h3>
                      </div>
                      
                      {/* Timeline Events */}
                      <div className="space-y-6">
                        <div className="space-y-4">
                          <div className="flex items-start gap-4">
                            <div className="flex flex-col items-center">
                              <div className="w-3 h-3 bg-[#22C55E] rounded-full"></div>
                              <div className="w-0.5 h-8 bg-gray-200 mt-2"></div>
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center justify-between mb-1">
                                <span className="font-medium text-gray-900">Ride Requested</span>
                                <span className="text-sm text-gray-500">{new Date(booking.createdAt).toLocaleTimeString()}</span>
                              </div>
                              <p className="text-sm text-gray-600">Passenger requested ride from {booking.pickup}</p>
                            </div>
                          </div>
                          
                          {booking.details?.driver && (
                            <div className="flex items-start gap-4">
                              <div className="flex flex-col items-center">
                                <div className="w-3 h-3 bg-[#3B82F6] rounded-full"></div>
                                <div className="w-0.5 h-8 bg-gray-200 mt-2"></div>
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="font-medium text-gray-900">Driver Assigned</span>
                                  <span className="text-sm text-gray-500">{new Date(Date.now() - 120000).toLocaleTimeString()}</span>
                                </div>
                                <p className="text-sm text-gray-600">{booking.details.driver.name} accepted the ride</p>
                              </div>
                            </div>
                          )}
                          
                          <div className="flex items-start gap-4">
                            <div className="flex flex-col items-center">
                              <div className="w-3 h-3 bg-[#F59E0B] rounded-full animate-pulse"></div>
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center justify-between mb-1">
                                <span className="font-medium text-gray-900">Current Status</span>
                                <span className="text-sm text-gray-500">Now</span>
                              </div>
                              <p className="text-sm text-gray-600">{booking.status === 'Active' ? 'Driver en route to pickup location' : booking.status}</p>
                            </div>
                          </div>
                        </div>
                        
                        <div className="border-t border-gray-100 pt-4">
                          <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-1">
                              <label className="text-sm text-gray-500">Request Time</label>
                              <p className="font-medium text-gray-900">{new Date(booking.createdAt).toLocaleString()}</p>
                            </div>
                            
                            <div className="space-y-1">
                              <label className="text-sm text-gray-500">Estimated Duration</label>
                              <p className="font-medium text-gray-900">{booking.duration}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                {activeModalTab === 'financials' && (
                  <div className="space-y-8">
                    {/* Fare Breakdown */}
                    <div className="bg-white">
                      <div className="flex items-center gap-3 mb-6">
                        <CreditCard className="w-5 h-5 text-gray-400" />
                        <h3 className="text-lg font-semibold text-gray-900 font-[Inter]">Fare Breakdown</h3>
                      </div>
                        
                      <div className="space-y-6">
                        <div className="space-y-4">
                          <div className="grid grid-cols-3 gap-4 items-center">
                            <label className="text-sm text-gray-500 font-medium">Base Fare</label>
                            <p className="font-medium text-gray-900 col-span-2">₱{booking.details.fareBreakdown.baseFare.toFixed(2)}</p>
                          </div>
                          
                          <div className="grid grid-cols-3 gap-4 items-center">
                            <label className="text-sm text-gray-500 font-medium">Distance Fee ({booking.distance})</label>
                            <p className="font-medium text-gray-900 col-span-2">₱{booking.details.fareBreakdown.distanceFare.toFixed(2)}</p>
                          </div>
                          
                          <div className="grid grid-cols-3 gap-4 items-center">
                            <label className="text-sm text-gray-500 font-medium">Service Fees</label>
                            <p className="font-medium text-gray-900 col-span-2">₱{booking.details.fareBreakdown.fees.toFixed(2)}</p>
                          </div>
                          
                          {booking.details.fareBreakdown.surgeFare > 0 && (
                            <div className="grid grid-cols-3 gap-4 items-center">
                              <label className="text-sm text-gray-500 font-medium">Surge Multiplier (1.5x)</label>
                              <p className="font-medium text-[#EF4444] col-span-2">₱{booking.details.fareBreakdown.surgeFare.toFixed(2)}</p>
                            </div>
                          )}
                          
                          {booking.details.fareBreakdown.discount > 0 && (
                            <div className="grid grid-cols-3 gap-4 items-center">
                              <label className="text-sm text-gray-500 font-medium">Discount Applied</label>
                              <p className="font-medium text-[#22C55E] col-span-2">-₱{booking.details.fareBreakdown.discount.toFixed(2)}</p>
                            </div>
                          )}
                        </div>
                        
                        <div className="border-t border-gray-100 pt-6">
                          <div className="space-y-4">
                            <div className="grid grid-cols-3 gap-4 items-center">
                              <label className="text-sm text-gray-500 font-medium">Payment Method</label>
                              <p className="font-medium text-gray-900 capitalize col-span-2">
                                {booking.details.passenger.paymentMethod.replace('_', ' ')}
                              </p>
                            </div>
                            
                            <div className="grid grid-cols-3 gap-4 items-center">
                              <label className="text-sm text-gray-500 font-medium">Total Fare</label>
                              <p className="font-semibold text-gray-900 text-lg col-span-2">₱{booking.details.fareBreakdown.total.toFixed(2)}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                      
                    {/* Promotions & Incentives */}
                    {booking.details.fareBreakdown.promotions && (
                      <div className="bg-white border-t border-gray-100 pt-8">
                        <div className="flex items-center gap-3 mb-6">
                          <Gift className="w-5 h-5 text-gray-400" />
                          <h3 className="text-lg font-semibold text-gray-900 font-[Inter]">Promotions & Incentives</h3>
                        </div>
                        
                        <div className="space-y-6">
                          {booking.details.fareBreakdown.promotions.passengerPromo && (
                            <div className="space-y-4">
                              <div className="space-y-1">
                                <label className="text-sm text-gray-500">Passenger Promo Code</label>
                                <div className="flex items-center gap-3">
                                  <p className="font-medium text-gray-900">{booking.details.fareBreakdown.promotions.passengerPromo.code}</p>
                                  <span className="px-2 py-1 bg-[#FFF7ED] text-[#D97706] text-xs font-medium rounded">
                                    Active
                                  </span>
                                </div>
                              </div>
                              
                              <div className="space-y-1">
                                <label className="text-sm text-gray-500">Discount Amount</label>
                                <p className="font-medium text-gray-900">
                                  {booking.details.fareBreakdown.promotions.passengerPromo.type === 'percentage' 
                                    ? `${booking.details.fareBreakdown.promotions.passengerPromo.discount}% off` 
                                    : `₱${booking.details.fareBreakdown.promotions.passengerPromo.discount} off`
                                  }
                                </p>
                              </div>
                            </div>
                          )}
                          
                          {booking.details.fareBreakdown.promotions.driverIncentive && (
                            <div className="space-y-4 border-t border-gray-100 pt-4">
                              <div className="space-y-1">
                                <label className="text-sm text-gray-500">Driver Incentive</label>
                                <p className="font-medium text-gray-900 capitalize">
                                  {booking.details.fareBreakdown.promotions.driverIncentive.type.replace('_', ' ')}
                                </p>
                              </div>
                              
                              <div className="space-y-1">
                                <label className="text-sm text-gray-500">Bonus Amount</label>
                                <p className="font-medium text-gray-900">
                                  ₱{booking.details.fareBreakdown.promotions.driverIncentive.amount.toFixed(2)}
                                </p>
                                <p className="text-xs text-gray-600">
                                  {booking.details.fareBreakdown.promotions.driverIncentive.description}
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    
                    {/* Cost of Sale - RBAC Controlled */}
                    {hasFinanceAccess() && booking.details.fareBreakdown.costOfSale && (
                      <div className="bg-white border-t border-gray-100 pt-8">
                        <div className="flex items-center justify-between mb-6">
                          <div className="flex items-center gap-3">
                            <TrendingDown className="w-5 h-5 text-gray-400" />
                            <h3 className="text-lg font-semibold text-gray-900 font-[Inter]">Cost of Sale</h3>
                          </div>
                          <span className="px-3 py-1 bg-[#FEF2F2] text-[#DC2626] text-xs font-medium rounded-full flex items-center gap-1">
                            <Shield className="w-3 h-3" />
                            Finance Only
                          </span>
                        </div>
                        <div className="space-y-6">
                          <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-1">
                              <label className="text-sm text-gray-500">Driver Earnings (75%)</label>
                              <p className="font-medium text-gray-900">₱{booking.details.fareBreakdown.costOfSale.driverEarnings.toFixed(2)}</p>
                            </div>
                            
                            <div className="space-y-1">
                              <label className="text-sm text-gray-500">Platform Fee (15%)</label>
                              <p className="font-medium text-gray-900">₱{booking.details.fareBreakdown.costOfSale.platformFee.toFixed(2)}</p>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-1">
                              <label className="text-sm text-gray-500">Operating Costs (8%)</label>
                              <p className="font-medium text-gray-900">₱{booking.details.fareBreakdown.costOfSale.operatingCosts.toFixed(2)}</p>
                            </div>
                            
                            <div className="space-y-1">
                              <label className="text-sm text-gray-500">Commission Rate</label>
                              <p className="font-medium text-gray-900">{booking.details.fareBreakdown.costOfSale.commissionRate}%</p>
                            </div>
                          </div>
                          
                          <div className="border-t border-gray-100 pt-4">
                            <div className="grid grid-cols-2 gap-6">
                              <div className="space-y-1">
                                <label className="text-sm text-gray-500">Net Revenue</label>
                                <p className={`font-semibold text-lg ${booking.details.fareBreakdown.costOfSale.netRevenue > 0 ? 'text-gray-900' : 'text-[#EF4444]'}`}>
                                  ₱{booking.details.fareBreakdown.costOfSale.netRevenue.toFixed(2)}
                                </p>
                              </div>
                              
                              <div className="space-y-1">
                                <label className="text-sm text-gray-500">Profit Margin</label>
                                <p className={`font-semibold text-lg ${booking.details.fareBreakdown.costOfSale.profitMargin > 0 ? 'text-gray-900' : 'text-[#EF4444]'}`}>
                                  {booking.details.fareBreakdown.costOfSale.profitMargin.toFixed(1)}%
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                        </div>
                      )}
                      
                    {!hasFinanceAccess() && (
                      <div className="bg-white border-t border-gray-100 pt-8">
                        <div className="flex items-center gap-3 mb-6">
                          <Shield className="w-5 h-5 text-gray-400" />
                          <h3 className="text-lg font-semibold text-gray-900 font-[Inter]">Cost of Sale</h3>
                        </div>
                        
                        <div className="space-y-4">
                          <div className="flex items-center gap-3">
                            <span className="px-3 py-1 bg-[#F3F4F6] text-[#6B7280] rounded-full text-sm font-medium">
                              Restricted
                            </span>
                            <span className="text-sm text-gray-600">Finance team access required</span>
                          </div>
                          
                          <p className="text-sm text-gray-500">
                            Current role: <span className="font-medium">{userRole}</span> • Contact finance team for access
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                
                {activeModalTab === 'passenger' && (
                  <div className="space-y-8">
                    {/* Passenger Information */}
                    <div className="bg-white">
                      <div className="flex items-center gap-3 mb-6">
                        <User className="w-5 h-5 text-gray-400" />
                        <h3 className="text-lg font-semibold text-gray-900 font-[Inter]">Passenger Information</h3>
                      </div>
                      
                      <div className="space-y-6">
                        <div className="space-y-4">
                          <div className="grid grid-cols-3 gap-4 items-center">
                            <label className="text-sm text-gray-500 font-medium">Full Name</label>
                            <p className="font-medium text-gray-900 col-span-2">{booking.details.passenger.name}</p>
                          </div>
                          
                          <div className="grid grid-cols-3 gap-4 items-center">
                            <label className="text-sm text-gray-500 font-medium">Phone Number</label>
                            <p className="font-medium text-gray-900 col-span-2">{booking.details.passenger.phone}</p>
                          </div>
                          
                          <div className="grid grid-cols-3 gap-4 items-center">
                            <label className="text-sm text-gray-500 font-medium">Rating</label>
                            <div className="flex items-center gap-2 col-span-2">
                              <Star className="w-4 h-4 text-yellow-400 fill-current" />
                              <span className="font-medium text-gray-900">{booking.details.passenger.rating.toFixed(1)}</span>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-3 gap-4 items-center">
                            <label className="text-sm text-gray-500 font-medium">Total Trips</label>
                            <p className="font-medium text-gray-900 col-span-2">{booking.details.passenger.totalTrips}</p>
                          </div>
                          
                          <div className="grid grid-cols-3 gap-4 items-center">
                            <label className="text-sm text-gray-500 font-medium">Payment Method</label>
                            <p className="font-medium text-gray-900 capitalize col-span-2">{booking.details.passenger.paymentMethod.replace('_', ' ')}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Special Requests */}
                    <div className="bg-white border-t border-gray-100 pt-8">
                      <div className="flex items-center gap-3 mb-6">
                        <MessageCircle className="w-5 h-5 text-gray-400" />
                        <h3 className="text-lg font-semibold text-gray-900 font-[Inter]">Special Requests</h3>
                      </div>
                      
                      <div className="space-y-4">
                        {booking.details.passenger.specialRequests && booking.details.passenger.specialRequests.length > 0 ? (
                          booking.details.passenger.specialRequests.map((request, index) => (
                            <div key={index} className="p-3 bg-gray-50 rounded-lg">
                              <p className="text-sm text-gray-700">{request}</p>
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-gray-500">No special requests for this trip</p>
                        )}
                      </div>
                    </div>
                    
                    {/* Contact Actions */}
                    <div className="bg-white border-t border-gray-100 pt-8">
                      <div className="flex items-center gap-3 mb-6">
                        <Phone className="w-5 h-5 text-gray-400" />
                        <h3 className="text-lg font-semibold text-gray-900 font-[Inter]">Contact Actions</h3>
                      </div>
                      
                      <div className="flex gap-3">
                        <button className="bg-[#3B82F6] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#2563EB] transition-colors flex items-center gap-2">
                          <Phone className="w-4 h-4" />
                          Call Passenger
                        </button>
                        <button className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors flex items-center gap-2">
                          <MessageCircle className="w-4 h-4" />
                          Send Message
                        </button>
                      </div>
                    </div>
                  </div>
                )}
                
                {activeModalTab === 'driver' && (
                  <div className="space-y-8">
                    {booking.details.driver ? (
                      <>
                        {/* Driver Information */}
                        <div className="bg-white">
                          <div className="flex items-center gap-3 mb-6">
                            <UserCheck className="w-5 h-5 text-gray-400" />
                            <h3 className="text-lg font-semibold text-gray-900 font-[Inter]">Driver Information</h3>
                          </div>
                          
                          <div className="space-y-6">
                            <div className="space-y-4">
                              <div className="grid grid-cols-3 gap-4 items-center">
                                <label className="text-sm text-gray-500 font-medium">Driver Name</label>
                                <p className="font-medium text-gray-900 col-span-2">{booking.details.driver.name}</p>
                              </div>
                              
                              <div className="grid grid-cols-3 gap-4 items-center">
                                <label className="text-sm text-gray-500 font-medium">Phone Number</label>
                                <p className="font-medium text-gray-900 col-span-2">{booking.details.driver.phone}</p>
                              </div>
                              
                              <div className="grid grid-cols-3 gap-4 items-center">
                                <label className="text-sm text-gray-500 font-medium">Rating</label>
                                <div className="flex items-center gap-2 col-span-2">
                                  <Star className="w-4 h-4 text-yellow-400 fill-current" />
                                  <span className="font-medium text-gray-900">{booking.details.driver.rating.toFixed(1)}</span>
                                </div>
                              </div>
                              
                              <div className="grid grid-cols-3 gap-4 items-center">
                                <label className="text-sm text-gray-500 font-medium">Total Trips</label>
                                <p className="font-medium text-gray-900 col-span-2">{booking.details.driver.totalTrips}</p>
                              </div>
                              
                              <div className="grid grid-cols-3 gap-4 items-center">
                                <label className="text-sm text-gray-500 font-medium">Acceptance Rate</label>
                                <p className="font-medium text-gray-900 col-span-2">{booking.details.driver.acceptanceRate}%</p>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        {/* Vehicle Information */}
                        <div className="bg-white border-t border-gray-100 pt-8">
                          <div className="flex items-center gap-3 mb-6">
                            <Car className="w-5 h-5 text-gray-400" />
                            <h3 className="text-lg font-semibold text-gray-900 font-[Inter]">Vehicle Information</h3>
                          </div>
                          
                          <div className="space-y-6">
                            <div className="space-y-4">
                              <div className="grid grid-cols-3 gap-4 items-center">
                                <label className="text-sm text-gray-500 font-medium">Vehicle Model</label>
                                <p className="font-medium text-gray-900 col-span-2">{booking.details.driver.vehicleModel}</p>
                              </div>
                              
                              <div className="grid grid-cols-3 gap-4 items-center">
                                <label className="text-sm text-gray-500 font-medium">Plate Number</label>
                                <p className="font-mono font-medium text-gray-900 col-span-2">{booking.details.driver.vehiclePlate}</p>
                              </div>
                              
                              <div className="grid grid-cols-3 gap-4 items-center">
                                <label className="text-sm text-gray-500 font-medium">Vehicle Type</label>
                                <p className="font-medium text-gray-900 capitalize col-span-2">{booking.details.driver.vehicleType}</p>
                              </div>
                              
                              {booking.details.driver.eta && (
                                <div className="grid grid-cols-3 gap-4 items-center">
                                  <label className="text-sm text-gray-500 font-medium">ETA</label>
                                  <p className="font-semibold text-gray-900 col-span-2">{booking.details.driver.eta} minutes</p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        {/* Driver Actions */}
                        <div className="bg-white border-t border-gray-100 pt-8">
                          <div className="flex items-center gap-3 mb-6">
                            <Phone className="w-5 h-5 text-gray-400" />
                            <h3 className="text-lg font-semibold text-gray-900 font-[Inter]">Driver Actions</h3>
                          </div>
                          
                          <div className="flex gap-3">
                            <button className="bg-[#3B82F6] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#2563EB] transition-colors flex items-center gap-2">
                              <Phone className="w-4 h-4" />
                              Call Driver
                            </button>
                            <button className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors flex items-center gap-2">
                              <MapPin className="w-4 h-4" />
                              Track Location
                            </button>
                            <button className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors flex items-center gap-2">
                              <MessageCircle className="w-4 h-4" />
                              Message
                            </button>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="bg-white">
                        <div className="flex items-center gap-3 mb-6">
                          <UserCheck className="w-5 h-5 text-gray-400" />
                          <h3 className="text-lg font-semibold text-gray-900 font-[Inter]">Driver Assignment</h3>
                        </div>
                        
                        <div className="space-y-4">
                          <div className="flex items-center gap-3">
                            <span className="px-3 py-1 bg-[#FFF7ED] text-[#D97706] rounded-full text-sm font-medium">
                              Unassigned
                            </span>
                            <span className="text-sm text-gray-600">No driver assigned to this booking</span>
                          </div>
                          
                          <div className="pt-2">
                            <button className="bg-[#3B82F6] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#2563EB] transition-colors">
                              Force Assign Driver
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                
                {activeModalTab === 'compliance' && (
                  <div className="space-y-6">
                    {/* Risk Assessment Section */}
                    <div className="grid md:grid-cols-2 gap-6">
                      {/* Risk Flags */}
                      <div className="bg-gradient-to-br from-red-50 to-orange-50 rounded-lg p-6 border border-red-200">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                            <AlertTriangle className="w-5 h-5 text-red-600" />
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900 font-[Inter]">Risk Assessment</h3>
                            <p className="text-sm text-gray-600">Automated flags and alerts</p>
                          </div>
                        </div>
                        
                        <div className="space-y-3">
                          {booking.details.passenger.totalTrips < 5 && (
                            <div className="flex items-center justify-between p-3 bg-yellow-100 rounded-md border border-yellow-200">
                              <div className="flex items-center gap-2">
                                <AlertCircle className="w-4 h-4 text-yellow-600" />
                                <span className="text-sm font-medium text-yellow-800">New User</span>
                              </div>
                              <span className="px-2 py-1 bg-yellow-200 text-yellow-800 text-xs rounded">LOW</span>
                            </div>
                          )}
                          
                          {booking.fare > 500 && (
                            <div className="flex items-center justify-between p-3 bg-orange-100 rounded-md border border-orange-200">
                              <div className="flex items-center gap-2">
                                <TrendingUp className="w-4 h-4 text-orange-600" />
                                <span className="text-sm font-medium text-orange-800">High Value Trip</span>
                              </div>
                              <span className="px-2 py-1 bg-orange-200 text-orange-800 text-xs rounded">MEDIUM</span>
                            </div>
                          )}
                          
                          {booking.details.passenger.rating < 4.0 && (
                            <div className="flex items-center justify-between p-3 bg-red-100 rounded-md border border-red-200">
                              <div className="flex items-center gap-2">
                                <Star className="w-4 h-4 text-red-600" />
                                <span className="text-sm font-medium text-red-800">Low Rating</span>
                              </div>
                              <span className="px-2 py-1 bg-red-200 text-red-800 text-xs rounded">HIGH</span>
                            </div>
                          )}
                          
                          {/* No risks scenario */}
                          {booking.details.passenger.totalTrips >= 5 && booking.fare <= 500 && booking.details.passenger.rating >= 4.0 && (
                            <div className="flex items-center justify-center p-4 bg-green-100 rounded-md border border-green-200">
                              <div className="text-center">
                                <CheckCircle className="w-6 h-6 text-green-600 mx-auto mb-2" />
                                <span className="text-sm font-medium text-green-800">No Risk Flags Detected</span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* LTFRB Compliance */}
                      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-200">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <Shield className="w-5 h-5 text-blue-600" />
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900 font-[Inter]">LTFRB Compliance</h3>
                            <p className="text-sm text-gray-600">Philippine transport regulation</p>
                          </div>
                        </div>
                        
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">Service Type:</span>
                            <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded">
                              {getServiceDisplayName(booking.serviceType)}
                            </span>
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">Fare Compliance:</span>
                            <div className="flex items-center gap-1">
                              <CheckCircle className="w-4 h-4 text-green-600" />
                              <span className="text-sm font-medium text-green-700">Compliant</span>
                            </div>
                          </div>
                          
                          {booking.details.driver && (
                            <>
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-600">Driver License:</span>
                                <div className="flex items-center gap-1">
                                  <CheckCircle className="w-4 h-4 text-[#22C55E]" />
                                  <span className="text-sm font-medium text-green-700">Valid</span>
                                </div>
                              </div>
                              
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-600">Vehicle Registration:</span>
                                <div className="flex items-center gap-1">
                                  <CheckCircle className="w-4 h-4 text-[#22C55E]" />
                                  <span className="text-sm font-medium text-green-700">Active</span>
                                </div>
                              </div>
                              
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-600">Insurance Status:</span>
                                <div className="flex items-center gap-1">
                                  <CheckCircle className="w-4 h-4 text-[#22C55E]" />
                                  <span className="text-sm font-medium text-green-700">Current</span>
                                </div>
                              </div>
                            </>
                          )}
                          
                          <div className="mt-4 pt-3 border-t border-blue-200">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-gray-700">Overall Compliance:</span>
                              <div className="flex items-center gap-1">
                                <CheckCircle className="w-4 h-4 text-[#22C55E]" />
                                <span className="text-sm font-semibold text-[#16A34A]">PASSED</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Safety & Security Section */}
                    <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-6 border border-purple-200">
                      <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                          <AlertTriangle className="w-5 h-5 text-purple-600" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 font-[Inter]">Safety & Security</h3>
                          <p className="text-sm text-gray-600">Emergency protocols and safety measures</p>
                        </div>
                      </div>
                      
                      {/* Emergency Alert Banner - Show when emergency flag is active */}
                      {booking.details?.emergencyFlag && (
                        <div className="mb-6 p-4 bg-red-100 border-2 border-red-500 rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="flex items-center">
                              <AlertTriangle className="w-6 h-6 text-red-600 animate-pulse mr-2" />
                              <span className="text-lg font-bold text-red-900">🚨 ACTIVE EMERGENCY</span>
                            </div>
                          </div>
                          <p className="text-sm text-red-800 mt-2">
                            Emergency assistance has been requested for this trip. Immediate attention required.
                          </p>
                        </div>
                      )}

                      <div className="grid md:grid-cols-3 gap-4">
                        <div className="bg-white rounded-md p-4 border border-gray-100">
                          <div className="flex items-center gap-2 mb-2">
                            <MapPin className="w-4 h-4 text-green-600" />
                            <span className="text-sm font-medium text-gray-900">GPS Tracking</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                            <span className="text-xs text-green-700">Active</span>
                          </div>
                        </div>
                        
                        <div className="bg-white rounded-md p-4 border border-gray-100">
                          <div className="flex items-center gap-2 mb-2">
                            <Phone className="w-4 h-4 text-blue-600" />
                            <span className="text-sm font-medium text-gray-900">Emergency Contact</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <CheckCircle className="w-3 h-3 text-green-600" />
                            <span className="text-xs text-green-700">Available</span>
                          </div>
                        </div>
                        
                        <div className={`rounded-md p-4 border ${booking.details?.emergencyFlag ? 'bg-red-50 border-red-300' : 'bg-white border-gray-100'}`}>
                          <div className="flex items-center gap-2 mb-2">
                            <AlertTriangle className={`w-4 h-4 ${booking.details?.emergencyFlag ? 'text-red-600' : 'text-orange-600'}`} />
                            <span className="text-sm font-medium text-gray-900">SOS Button</span>
                          </div>
                          <div className="flex items-center gap-1">
                            {booking.details?.emergencyFlag ? (
                              <>
                                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                                <span className="text-xs text-red-700 font-bold">EMERGENCY ACTIVE</span>
                              </>
                            ) : (
                              <>
                                <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                                <span className="text-xs text-orange-700">Standby</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="mt-4 p-3 bg-blue-100 rounded-md border border-blue-200">
                        <div className="flex items-center gap-2 text-sm text-blue-800">
                          <Clock className="w-4 h-4" />
                          <span className="font-medium">Last Safety Check: </span>
                          <span>{new Date(Date.now() - 1000 * 60 * 15).toLocaleTimeString()}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                {activeModalTab === 'audit' && (
                  <div className="space-y-6">
                    {/* Quick Actions Section */}
                    <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-6 border border-green-200">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                          <Settings className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 font-[Inter]">Quick Actions</h3>
                          <p className="text-sm text-gray-600">Available actions for this booking</p>
                        </div>
                      </div>
                      
                      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-3">
                        <button className="flex items-center justify-center gap-2 p-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium">
                          <Phone className="w-4 h-4 text-blue-600" />
                          Contact Passenger
                        </button>
                        
                        {booking.details.driver && (
                          <button className="flex items-center justify-center gap-2 p-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium">
                            <MessageCircle className="w-4 h-4 text-green-600" />
                            Contact Driver
                          </button>
                        )}
                        
                        <button className="flex items-center justify-center gap-2 p-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium">
                          <MapPin className="w-4 h-4 text-purple-600" />
                          Track Location
                        </button>
                        
                        <button className="flex items-center justify-center gap-2 p-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium">
                          <AlertTriangle className="w-4 h-4 text-red-600" />
                          Emergency Support
                        </button>
                        
                        <button className="flex items-center justify-center gap-2 p-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium">
                          <CreditCard className="w-4 h-4 text-orange-600" />
                          Process Refund
                        </button>
                        
                        <button className="flex items-center justify-center gap-2 p-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium">
                          <Flag className="w-4 h-4 text-yellow-600" />
                          Flag Issue
                        </button>
                        
                        <button className="flex items-center justify-center gap-2 p-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium">
                          <Download className="w-4 h-4 text-indigo-600" />
                          Export Data
                        </button>
                        
                        <button className="flex items-center justify-center gap-2 p-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium">
                          <Copy className="w-4 h-4 text-gray-600" />
                          Copy Details
                        </button>
                      </div>
                    </div>
                    
                    {/* Audit Trail Section */}
                    <div className="bg-gradient-to-r from-gray-50 to-slate-50 rounded-lg p-6 border border-gray-200">
                      <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                          <Clock className="w-5 h-5 text-gray-600" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 font-[Inter]">Audit Trail</h3>
                          <p className="text-sm text-gray-600">System and user actions for this booking</p>
                        </div>
                      </div>
                      
                      <div className="space-y-4">
                        {/* Generate mock audit entries */}
                        {[
                          {
                            timestamp: new Date(Date.now() - 1000 * 60 * 5),
                            action: 'Booking Status Updated',
                            user: 'System',
                            details: `Status changed to "${booking.status}"`,
                            type: 'system'
                          },
                          {
                            timestamp: new Date(Date.now() - 1000 * 60 * 15),
                            action: 'Fare Calculated',
                            user: 'System',
                            details: `Fare set to ₱${booking.fare}`,
                            type: 'system'
                          },
                          {
                            timestamp: new Date(Date.now() - 1000 * 60 * 25),
                            action: 'Booking Created',
                            user: booking.details.passenger.name,
                            details: `Trip requested from ${booking.pickup} to ${booking.destination}`,
                            type: 'user'
                          },
                          {
                            timestamp: new Date(Date.now() - 1000 * 60 * 30),
                            action: 'Risk Assessment',
                            user: 'Security System',
                            details: 'Automated security checks completed - No flags',
                            type: 'security'
                          }
                        ].map((entry, index) => (
                          <div key={index} className="flex items-start gap-4 p-4 bg-white rounded-lg border border-gray-100">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                              entry.type === 'system' ? 'bg-blue-100' :
                              entry.type === 'user' ? 'bg-green-100' :
                              entry.type === 'security' ? 'bg-red-100' : 'bg-gray-100'
                            }`}>
                              {entry.type === 'system' ? (
                                <Settings className={`w-4 h-4 ${
                                  entry.type === 'system' ? 'text-blue-600' :
                                  entry.type === 'user' ? 'text-green-600' :
                                  entry.type === 'security' ? 'text-red-600' : 'text-gray-600'
                                }`} />
                              ) : entry.type === 'user' ? (
                                <User className="w-4 h-4 text-green-600" />
                              ) : entry.type === 'security' ? (
                                <Shield className="w-4 h-4 text-red-600" />
                              ) : (
                                <Clock className="w-4 h-4 text-gray-600" />
                              )}
                            </div>
                            
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-1">
                                <h4 className="font-medium text-gray-900 text-sm">{entry.action}</h4>
                                <span className="text-xs text-gray-500">
                                  {entry.timestamp.toLocaleTimeString()}
                                </span>
                              </div>
                              <p className="text-sm text-gray-600 mb-2">{entry.details}</p>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-500">by</span>
                                <span className="text-xs font-medium text-gray-700">{entry.user}</span>
                                <span className={`px-2 py-0.5 text-xs rounded-full ${
                                  entry.type === 'system' ? 'bg-blue-100 text-blue-700' :
                                  entry.type === 'user' ? 'bg-green-100 text-green-700' :
                                  entry.type === 'security' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'
                                }`}>
                                  {entry.type}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      <div className="mt-6 pt-4 border-t border-gray-200">
                        <div className="flex items-center justify-between text-sm text-gray-600">
                          <span>Total Events: 4</span>
                          <button className="text-blue-600 hover:text-blue-700 font-medium">
                            View Full History
                          </button>
                        </div>
                      </div>
                    </div>
                    
                    {/* Role-based Administrative Actions */}
                    <div className="bg-gradient-to-r from-orange-50 to-red-50 rounded-lg p-6 border border-orange-200">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                          <AlertTriangle className="w-5 h-5 text-orange-600" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 font-[Inter]">Administrative Actions</h3>
                          <p className="text-sm text-gray-600">Advanced actions requiring elevated permissions</p>
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        <div className="flex items-center justify-between p-3 bg-white rounded-md border border-gray-200">
                          <div className="flex items-center gap-3">
                            <XCircle className="w-4 h-4 text-red-600" />
                            <span className="text-sm font-medium text-gray-900">Cancel Booking</span>
                          </div>
                          <button className="px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 transition-colors">
                            Cancel
                          </button>
                        </div>
                        
                        <div className="flex items-center justify-between p-3 bg-white rounded-md border border-gray-200">
                          <div className="flex items-center gap-3">
                            <DollarSign className="w-4 h-4 text-yellow-600" />
                            <span className="text-sm font-medium text-gray-900">Adjust Fare</span>
                          </div>
                          <button className="px-3 py-1 bg-yellow-600 text-white text-xs rounded hover:bg-yellow-700 transition-colors">
                            Adjust
                          </button>
                        </div>
                        
                        <div className="flex items-center justify-between p-3 bg-white rounded-md border border-gray-200">
                          <div className="flex items-center gap-3">
                            <RotateCcw className="w-4 h-4 text-blue-600" />
                            <span className="text-sm font-medium text-gray-900">Reassign Driver</span>
                          </div>
                          <button className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors">
                            Reassign
                          </button>
                        </div>
                        
                        <div className="flex items-center justify-between p-3 bg-white rounded-md border border-gray-200">
                          <div className="flex items-center gap-3">
                            <Ban className="w-4 h-4 text-purple-600" />
                            <span className="text-sm font-medium text-gray-900">Flag Account</span>
                          </div>
                          <button className="px-3 py-1 bg-purple-600 text-white text-xs rounded hover:bg-purple-700 transition-colors">
                            Flag
                          </button>
                        </div>
                      </div>
                      
                      <div className="mt-4 p-3 bg-yellow-100 rounded-md border border-yellow-200">
                        <div className="flex items-center gap-2 text-sm text-yellow-800">
                          <Shield className="w-4 h-4" />
                          <span className="font-medium">Current Role: {userRole}</span>
                          <span className="text-yellow-600">• Access Level: {userRole === 'admin' ? 'Full' : 'Limited'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Modal Footer */}
              <div className="border-t border-gray-200 px-4 py-3 bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-600">
                    Booking ID: {booking.bookingId} • Status: {booking.status}
                  </div>
                  <div className="flex items-center space-x-2">
                    <button className="px-3 py-1 text-gray-700 bg-white border border-gray-300 rounded text-sm hover:bg-gray-50">
                      Export
                    </button>
                    <button className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">
                      Take Action
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default BookingsPage;
