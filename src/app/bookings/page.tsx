'use client';

import React, { useState, useEffect } from 'react';
import { 
  Car, 
  Clock, 
  DollarSign, 
  CheckCircle, 
  XCircle,
  AlertTriangle,
  Users,
  MapPin,
  Filter,
  Search,
  Calendar,
  MoreHorizontal,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  Navigation
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useServiceType } from '@/contexts/ServiceTypeContext';

// KPI Card component
function KpiCard({label, value, trend, up, icon: Icon}: {label: string, value: string, trend: string, up?: boolean, icon?: any}) {
  return (
    <Card className="hover:shadow-md transition-shadow duration-200">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</div>
          {Icon && <Icon className="w-4 h-4 text-gray-400" />}
        </div>
        <div className="text-2xl font-bold text-gray-900 mb-1">{value}</div>
        <div className={`flex items-center gap-1 text-xs font-medium ${
          up ? "text-emerald-600" : trend.includes('-') ? "text-emerald-600" : "text-red-500"
        }`}>
          {up || trend.includes('-') ? 
            <ArrowUpRight className="w-3 h-3" /> : 
            <ArrowDownRight className="w-3 h-3" />
          }
          <span>{trend}</span>
        </div>
      </CardContent>
    </Card>
  )
}

interface Booking {
  id: string;
  bookingId: string;
  passenger: string;
  driver: string;
  pickup: string;
  destination: string;
  status: 'Active' | 'Completed' | 'Cancelled' | 'Scheduled';
  serviceType: string;
  fare: number;
  duration: string;
  distance: string;
  createdAt: Date;
}

const BookingsPage = () => {
  const { selectedServiceType, serviceTypes } = useServiceType();
  const [activeTab, setActiveTab] = useState('active-trips');
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [serviceTypeFilter, setServiceTypeFilter] = useState('all');
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});

  // Mock booking data - Generate more realistic data for testing
  const generateMockBookings = (count: number): Booking[] => {
    const statuses: ('Active' | 'Completed' | 'Cancelled' | 'Scheduled')[] = ['Active', 'Completed', 'Cancelled', 'Scheduled'];
    const serviceTypes = ['Car', 'Motorcycle', 'SUV', 'Taxi'];
    const locations = [
      'BGC, Taguig', 'Makati CBD', 'Quezon City', 'Ortigas Center', 'Alabang', 
      'Mall of Asia', 'Pasig City', 'Mandaluyong', 'Manila', 'Bonifacio Global City',
      'Eastwood City', 'Greenhills', 'Ayala Center', 'SM Mall of Asia', 'Rockwell Center'
    ];
    const names = [
      'Maria Santos', 'Juan Dela Cruz', 'Carlos Reyes', 'Ana Garcia', 'Elena Rodriguez',
      'Roberto Silva', 'Jose Martinez', 'Carmen Lopez', 'Pedro Gonzalez', 'Isabel Fernandez',
      'Miguel Torres', 'Rosa Morales', 'Antonio Ramirez', 'Lucia Herrera', 'Francisco Vargas'
    ];

    return Array.from({ length: count }, (_, i) => ({
      id: (i + 1).toString(),
      bookingId: `BK-${String(i + 1).padStart(4, '0')}`,
      passenger: names[Math.floor(Math.random() * names.length)],
      driver: names[Math.floor(Math.random() * names.length)],
      pickup: locations[Math.floor(Math.random() * locations.length)],
      destination: locations[Math.floor(Math.random() * locations.length)],
      status: statuses[Math.floor(Math.random() * statuses.length)],
      serviceType: serviceTypes[Math.floor(Math.random() * serviceTypes.length)],
      fare: Math.floor(Math.random() * 500) + 80,
      duration: `${Math.floor(Math.random() * 45) + 5} min`,
      distance: `${(Math.random() * 20 + 1).toFixed(1)} km`,
      createdAt: new Date(Date.now() - Math.floor(Math.random() * 86400000 * 7)) // Last 7 days
    }));
  };

  const [bookings] = useState<Booking[]>(generateMockBookings(500));
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);
  const [sortBy, setSortBy] = useState<'createdAt' | 'fare' | 'duration'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [isRealTimeEnabled, setIsRealTimeEnabled] = useState(true);

  useEffect(() => {
    // Simulate loading
    setTimeout(() => setIsLoading(false), 800);
  }, []);

  // Real-time updates simulation
  useEffect(() => {
    if (!isRealTimeEnabled) return;

    const interval = setInterval(() => {
      // In a real app, this would fetch new data from an API
      // For demo, we just trigger a re-render to simulate live updates
      if (Math.random() > 0.7) {
        // Simulate occasional data changes
        setCurrentPage(prev => prev); // Trigger re-render
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [isRealTimeEnabled]);

  // Filter and search logic
  const filteredBookings = React.useMemo(() => {
    let filtered = bookings;

    // Filter by tab
    if (activeTab !== 'all') {
      const statusMap = {
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
    { id: 'active-trips', name: 'Active Trips', icon: Activity, count: statusCounts['Active'] || 0 },
    { id: 'completed', name: 'Completed', icon: CheckCircle, count: statusCounts['Completed'] || 0 },
    { id: 'cancelled', name: 'Cancelled', icon: XCircle, count: statusCounts['Cancelled'] || 0 },
    { id: 'scheduled', name: 'Scheduled', icon: Calendar, count: statusCounts['Scheduled'] || 0 }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
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
      default:
        return '🚗';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-neutral-600">Loading Bookings...</p>
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
                placeholder="Search bookings..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2.5 bg-gray-50 border-0 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors w-72 placeholder-gray-400"
              />
            </div>
            <select
              value={serviceTypeFilter}
              onChange={(e) => setServiceTypeFilter(e.target.value)}
              className="px-3 py-2.5 bg-gray-50 border-0 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors text-gray-600"
            >
              <option value="all">All Services</option>
              <option value="Car">🚗 Car</option>
              <option value="Motorcycle">🏍️ Motorcycle</option>
              <option value="SUV">🚙 SUV</option>
              <option value="Taxi">🚖 Taxi</option>
            </select>
            <button className="flex items-center space-x-2 px-3 py-2.5 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors text-sm text-gray-600 hover:text-gray-900">
              <Filter className="w-4 h-4" />
              <span>Filters</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation - Clean Pills */}
        <div className="flex items-center space-x-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-4 py-2.5 rounded-full text-sm font-medium transition-all duration-200 ${
                  activeTab === tab.id
                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50 border border-transparent'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.name}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  activeTab === tab.id
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Layout - Sidebar + Content */}
      <div className="flex gap-6">
        {/* Left Sidebar - KPI Cards Stacked */}
        <div className="w-72 space-y-3 flex-shrink-0">
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
        <div className="flex-1">

        {/* Optimized Bookings Table */}
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
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
                      <th className="text-center py-2 font-medium bg-white">Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {currentBookings.length > 0 ? currentBookings.map((booking, index) => (
                      <tr key={`${booking.id}-${index}`} className="hover:bg-gray-25 transition-colors text-xs">
                        <td className="py-1.5 font-medium text-blue-600 whitespace-nowrap">{booking.bookingId}</td>
                        <td className="py-1.5 text-gray-900 max-w-32 truncate">{booking.passenger}</td>
                        <td className="py-1.5 text-gray-700 max-w-32 truncate">{booking.driver}</td>
                        <td className="py-1.5">
                          <div className="max-w-44">
                            <div className="text-gray-900 truncate text-xs">{booking.pickup}</div>
                            <div className="text-gray-500 truncate text-xs">→ {booking.destination}</div>
                            <div className="text-gray-400 text-xs">{booking.distance} • {booking.duration}</div>
                          </div>
                        </td>
                        <td className="text-center py-1.5">
                          <div className="flex items-center justify-center space-x-1">
                            <span className="text-sm">{getServiceIcon(booking.serviceType)}</span>
                            <span className="text-xs hidden sm:inline">{booking.serviceType}</span>
                          </div>
                        </td>
                        <td className="text-center py-1.5">
                          <span className={`px-1 py-0.5 rounded text-xs font-medium ${getStatusColor(booking.status)}`}>
                            {booking.status}
                          </span>
                        </td>
                        <td className="text-center py-1.5 font-medium whitespace-nowrap">₱{booking.fare}</td>
                        <td className="text-center py-1.5 text-gray-500 whitespace-nowrap text-xs">
                          {new Date(booking.createdAt).toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={8} className="py-8 text-center text-gray-500">
                          <div className="flex flex-col items-center">
                            {React.createElement(tabs.find(t => t.id === activeTab)?.icon || Activity, { 
                              className: "w-12 h-12 text-gray-400 mb-3 opacity-40" 
                            })}
                            <p className="font-medium">No {tabs.find(t => t.id === activeTab)?.name.toLowerCase()} found</p>
                            <p className="text-sm">Try adjusting your search or filters</p>
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
          </CardContent>
        </Card>
        </div>
      </div>
    </div>
  );
};

export default BookingsPage;