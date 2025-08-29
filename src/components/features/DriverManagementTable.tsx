'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Search, 
  Download, 
  RefreshCw, 
  X,
  CheckCircle,
  Clock,
  AlertTriangle,
  XCircle,
  Star,
  Eye,
  MoreVertical,
  Car,
  CreditCard,
  MessageSquare,
  Phone
} from 'lucide-react';

// Driver data types
interface Driver {
  id: string;
  appId: string;
  name: string;
  type: 'REG' | 'SAL';
  status: 'available' | 'on_trip' | 'missing' | 'suspended' | 'idle';
  currentState: string;
  performance: {
    rating: number;
    totalTrips: number;
    acceptanceRate: number;
    completionRate: number;
    cancellationRate: number;
  };
  tripsToday: number;
  issue?: 'SOS Active' | 'Suspended' | 'Investigation' | 'Low Rating' | 'Docs Expired' | 'No Show';
  lastActive: string;
  onTripDuration?: string;
  missingSince?: string;
  earnings: {
    today: number;
    week: number;
    month: number;
  };
  vehicle: {
    model: string;
    plateNumber: string;
  };
  location: string;
  phone: string;
  email: string;
}

// Sample driver data with enhanced information
const sampleDrivers: Driver[] = [
  {
    id: '301922',
    appId: 'XPR-001',
    name: 'Maria Navarro',
    type: 'REG',
    status: 'available',
    currentState: 'Available',
    performance: { 
      rating: 4.8, 
      totalTrips: 2484,
      acceptanceRate: 76,
      completionRate: 96,
      cancellationRate: 1.6
    },
    tripsToday: 12,
    lastActive: 'now',
    earnings: { today: 1200, week: 5600, month: 28450 },
    vehicle: { model: 'Toyota Vios', plateNumber: 'ABC-1234' },
    location: 'Metro Manila',
    phone: '+639069780294',
    email: 'maria.navarro1922@gmail.com'
  },
  {
    id: '2',
    appId: 'XPR-002',
    name: 'Juan Santos',
    type: 'REG',
    status: 'available',
    currentState: 'Available',
    performance: { 
      rating: 4.9, 
      totalTrips: 1247,
      acceptanceRate: 82,
      completionRate: 98,
      cancellationRate: 0.8
    },
    tripsToday: 8,
    lastActive: 'now',
    earnings: { today: 950, week: 4200, month: 19800 },
    vehicle: { model: 'Honda City', plateNumber: 'XYZ-5678' },
    location: 'Quezon City',
    phone: '+639171234567',
    email: 'juan.santos@email.com'
  },
  {
    id: '3',
    appId: 'XPR-003',
    name: 'Ana Reyes',
    type: 'SAL',
    status: 'on_trip',
    currentState: 'On trip 8m',
    performance: { 
      rating: 4.8, 
      totalTrips: 2134,
      acceptanceRate: 88,
      completionRate: 95,
      cancellationRate: 1.2
    },
    tripsToday: 12,
    lastActive: '8m ago',
    onTripDuration: '8m',
    earnings: { today: 1450, week: 6800, month: 32400 },
    vehicle: { model: 'Toyota Corolla', plateNumber: 'DEF-9012' },
    location: 'Makati CBD',
    phone: '+639181234567',
    email: 'ana.reyes@email.com'
  },
  {
    id: '4',
    appId: 'XPR-004',
    name: 'Carlos Mendoza',
    type: 'REG',
    status: 'on_trip',
    currentState: 'On trip 15m',
    performance: { 
      rating: 4.2, 
      totalTrips: 567,
      acceptanceRate: 65,
      completionRate: 89,
      cancellationRate: 3.2
    },
    tripsToday: 5,
    lastActive: '15m ago',
    onTripDuration: '15m',
    earnings: { today: 680, week: 2800, month: 14200 },
    vehicle: { model: 'Mitsubishi Mirage', plateNumber: 'GHI-3456' },
    location: 'BGC Taguig',
    phone: '+639191234567',
    email: 'carlos.mendoza@email.com'
  },
  {
    id: '5',
    appId: 'XPR-005',
    name: 'Roberto Dela Cruz',
    type: 'REG',
    status: 'suspended',
    currentState: 'Suspended',
    performance: { 
      rating: 3.2, 
      totalTrips: 234,
      acceptanceRate: 45,
      completionRate: 78,
      cancellationRate: 8.5
    },
    tripsToday: 0,
    issue: 'SOS Active',
    lastActive: '2h ago',
    earnings: { today: 0, week: 0, month: 4500 },
    vehicle: { model: 'Toyota Vios', plateNumber: 'JKL-7890' },
    location: 'Unknown',
    phone: '+639201234567',
    email: 'roberto.delacruz@email.com'
  },
  {
    id: '6',
    appId: 'XPR-006',
    name: 'Lisa Garcia',
    type: 'REG',
    status: 'suspended',
    currentState: 'Under Review',
    performance: { 
      rating: 3.8, 
      totalTrips: 445,
      acceptanceRate: 58,
      completionRate: 82,
      cancellationRate: 5.2
    },
    tripsToday: 0,
    issue: 'Investigation',
    lastActive: '1d ago',
    earnings: { today: 0, week: 850, month: 8900 },
    vehicle: { model: 'Honda Jazz', plateNumber: 'MNO-2345' },
    location: 'Pasig',
    phone: '+639211234567',
    email: 'lisa.garcia@email.com'
  },
  {
    id: '7',
    appId: 'XPR-007',
    name: 'Mark Tan',
    type: 'SAL',
    status: 'available',
    currentState: 'Available',
    performance: { 
      rating: 4.6, 
      totalTrips: 1876,
      acceptanceRate: 79,
      completionRate: 93,
      cancellationRate: 2.1
    },
    tripsToday: 9,
    issue: 'Docs Expired',
    lastActive: '5m ago',
    earnings: { today: 1100, week: 5200, month: 24600 },
    vehicle: { model: 'Nissan Almera', plateNumber: 'PQR-6789' },
    location: 'Manila',
    phone: '+639221234567',
    email: 'mark.tan@email.com'
  },
  {
    id: '8',
    appId: 'XPR-008',
    name: 'Jenny Lim',
    type: 'REG',
    status: 'idle',
    currentState: 'Idle 45m',
    performance: { 
      rating: 3.9, 
      totalTrips: 298,
      acceptanceRate: 52,
      completionRate: 85,
      cancellationRate: 4.8
    },
    tripsToday: 4,
    issue: 'Low Rating',
    lastActive: '45m ago',
    earnings: { today: 420, week: 1800, month: 9200 },
    vehicle: { model: 'Hyundai Accent', plateNumber: 'STU-9012' },
    location: 'Mandaluyong',
    phone: '+639231234567',
    email: 'jenny.lim@email.com'
  },
  {
    id: '9',
    appId: 'XPR-009',
    name: 'David Wong',
    type: 'SAL',
    status: 'idle',
    currentState: 'Idle 2h',
    performance: { 
      rating: 4.4, 
      totalTrips: 1543,
      acceptanceRate: 71,
      completionRate: 91,
      cancellationRate: 2.8
    },
    tripsToday: 3,
    lastActive: '2h ago',
    earnings: { today: 380, week: 3400, month: 18900 },
    vehicle: { model: 'Toyota Wigo', plateNumber: 'VWX-3456' },
    location: 'Ortigas',
    phone: '+639241234567',
    email: 'david.wong@email.com'
  },
  {
    id: '10',
    appId: 'XPR-010',
    name: 'Sarah Kim',
    type: 'REG',
    status: 'missing',
    currentState: 'Missing 3h',
    performance: { 
      rating: 4.1, 
      totalTrips: 789,
      acceptanceRate: 68,
      completionRate: 87,
      cancellationRate: 3.5
    },
    tripsToday: 0,
    issue: 'No Show',
    lastActive: '3h ago',
    missingSince: '3h',
    earnings: { today: 0, week: 2100, month: 12800 },
    vehicle: { model: 'Suzuki Dzire', plateNumber: 'YZA-7890' },
    location: 'Unknown',
    phone: '+639251234567',
    email: 'sarah.kim@email.com'
  }
];

type FilterTab = 'available' | 'on_trip' | 'idle' | 'needs_action' | 'all_active' | 'missing';

const DriverManagementTable: React.FC = () => {
  const router = useRouter();
  const [drivers] = useState<Driver[]>(sampleDrivers);
  const [activeTab, setActiveTab] = useState<FilterTab>('all_active');
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);

  // Filter and search logic
  const filteredDrivers = useMemo(() => {
    let filtered = drivers;

    // Apply tab filter
    switch (activeTab) {
      case 'available':
        filtered = drivers.filter(d => d.status === 'available' && !d.issue);
        break;
      case 'on_trip':
        filtered = drivers.filter(d => d.status === 'on_trip');
        break;
      case 'idle':
        filtered = drivers.filter(d => d.status === 'idle');
        break;
      case 'needs_action':
        filtered = drivers.filter(d => d.issue || d.status === 'suspended');
        break;
      case 'missing':
        filtered = drivers.filter(d => d.status === 'missing');
        break;
      case 'all_active':
      default:
        filtered = drivers.filter(d => d.status !== 'missing');
        break;
    }

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(driver => 
        driver.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        driver.appId.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return filtered;
  }, [drivers, activeTab, searchQuery]);

  // Calculate counts for overview and tabs
  const counts = useMemo(() => {
    const available = drivers.filter(d => d.status === 'available' && !d.issue).length;
    const onTrip = drivers.filter(d => d.status === 'on_trip').length;
    const idle = drivers.filter(d => d.status === 'idle').length;
    const needsAction = drivers.filter(d => d.issue || d.status === 'suspended').length;
    const allActive = drivers.filter(d => d.status !== 'missing').length;
    const missing = drivers.filter(d => d.status === 'missing').length;
    const regular = drivers.filter(d => d.type === 'REG' && d.status !== 'missing').length;
    const salaried = drivers.filter(d => d.type === 'SAL' && d.status !== 'missing').length;
    const totalOnline = available + onTrip + idle;
    const totalIssues = needsAction;

    return {
      available,
      onTrip,
      idle,
      needsAction,
      allActive,
      missing,
      regular,
      salaried,
      totalOnline,
      totalIssues
    };
  }, [drivers]);

  const getStatusIcon = (driver: Driver) => {
    if (driver.issue && (driver.issue === 'SOS Active' || driver.status === 'suspended')) {
      return <AlertTriangle className="w-4 h-4 text-red-500" />;
    }
    if (driver.status === 'missing') {
      return <XCircle className="w-4 h-4 text-gray-500" />;
    }
    if (driver.status === 'on_trip') {
      return <Clock className="w-4 h-4 text-blue-500" />;
    }
    if (driver.status === 'idle') {
      return <Clock className="w-4 h-4 text-yellow-500" />;
    }
    if (driver.status === 'available') {
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    }
    return <XCircle className="w-4 h-4 text-gray-500" />;
  };

  const handleDriverClick = (driverId: string) => {
    router.push('/driver-profile');
  };

  const handleQuickAction = (e: React.MouseEvent, action: string, driver: Driver) => {
    e.stopPropagation();
    switch (action) {
      case 'call':
        window.open(`tel:${driver.phone}`, '_self');
        break;
      case 'message':
        // Would open messaging interface
        break;
      case 'view':
        router.push('/driver-profile');
        break;
    }
  };

  const getIssueColor = (issue: string) => {
    switch (issue) {
      case 'SOS Active':
      case 'Suspended':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'Investigation':
      case 'Low Rating':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'Docs Expired':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'No Show':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsRefreshing(false);
  };

  const handleExport = () => {
    // Export functionality
    const csvContent = "data:text/csv;charset=utf-8," + 
      "Name,APP-ID,Type,Status,Rating,Trips Today,Issue,Last Active\n" +
      filteredDrivers.map(d => 
        `"${d.name}","${d.appId}","${d.type}","${d.currentState}","${d.performance.rating}","${d.tripsToday}","${d.issue || ''}","${d.lastActive}"`
      ).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "driver_management.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const clearSearch = () => {
    setSearchQuery('');
  };

  const tabs = [
    { 
      id: 'available' as FilterTab, 
      name: 'Available Now', 
      count: counts.available, 
      emoji: '🟢' 
    },
    { 
      id: 'on_trip' as FilterTab, 
      name: 'On Trip', 
      count: counts.onTrip, 
      emoji: '🔵' 
    },
    { 
      id: 'idle' as FilterTab, 
      name: 'Idle', 
      count: counts.idle, 
      emoji: '🟡' 
    },
    { 
      id: 'needs_action' as FilterTab, 
      name: 'Needs Action', 
      count: counts.needsAction, 
      emoji: '⚠️' 
    },
    { 
      id: 'all_active' as FilterTab, 
      name: 'All Active', 
      count: counts.allActive, 
      emoji: '📊' 
    },
    { 
      id: 'missing' as FilterTab, 
      name: 'Missing', 
      count: counts.missing, 
      emoji: '🔴' 
    }
  ];

  return (
    <div className="space-y-6">
      {/* Operational Overview Bar */}
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <div className="text-sm font-medium text-gray-900">
          Online: <span className="text-green-600 font-bold">{counts.totalOnline} drivers</span>
          <span className="mx-2 text-gray-400">|</span>
          Regular: <span className="text-blue-600 font-bold">{counts.regular}</span>
          <span className="mx-2 text-gray-400">|</span>
          Salaried: <span className="text-purple-600 font-bold">{counts.salaried}</span>
          <span className="mx-2 text-gray-400">|</span>
          Issues: <span className="text-red-600 font-bold">{counts.totalIssues}</span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <span>{tab.emoji}</span>
              <span>{tab.name}</span>
              <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                activeTab === tab.id 
                  ? 'bg-blue-100 text-blue-600' 
                  : 'bg-gray-100 text-gray-600'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </nav>
      </div>

      {/* Controls Bar */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search by driver name or APP-ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-10 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          {searchQuery && (
            <button
              onClick={clearSearch}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        
        <div className="flex space-x-2">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          
          <button
            onClick={handleExport}
            className="flex items-center space-x-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Results Count */}
      <div className="text-sm text-gray-600">
        Showing {filteredDrivers.length} of {drivers.length} drivers
      </div>

      {/* Enhanced Driver Table */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="overflow-x-auto" style={{ maxHeight: 'calc(100vh - 420px)' }}>
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16">
                  #
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Driver
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Location
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Vehicle
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Performance
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Today
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Earnings
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredDrivers.map((driver, index) => (
                <tr 
                  key={driver.id} 
                  className="hover:bg-blue-50 transition-colors cursor-pointer"
                  onClick={() => handleDriverClick(driver.id)}
                  onMouseEnter={() => setHoveredRow(driver.id)}
                  onMouseLeave={() => setHoveredRow(null)}
                  title={`Click to view ${driver.name}'s profile`}
                >
                  <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-500">
                    {index + 1}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="relative">
                        <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                          <span className="text-sm font-medium text-gray-600">
                            {driver.name.split(' ').map(n => n[0]).join('')}
                          </span>
                        </div>
                        <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border border-white ${
                          driver.status === 'available' ? 'bg-green-400' :
                          driver.status === 'on_trip' ? 'bg-blue-400' :
                          driver.status === 'idle' ? 'bg-yellow-400' :
                          driver.status === 'suspended' ? 'bg-red-400' :
                          'bg-gray-400'
                        }`}></div>
                      </div>
                      <div className="ml-3">
                        <div className="text-sm font-medium text-gray-900">
                          {driver.name}
                        </div>
                        <div className="text-xs text-gray-500">
                          ID: {driver.id} • {driver.appId}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(driver)}
                      <div>
                        <div className={`text-sm font-medium ${
                          driver.status === 'available' ? 'text-green-600' :
                          driver.status === 'on_trip' ? 'text-blue-600' :
                          driver.status === 'idle' ? 'text-yellow-600' :
                          driver.status === 'suspended' ? 'text-red-600' :
                          'text-gray-600'
                        }`}>
                          {driver.currentState}
                        </div>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          driver.type === 'SAL' 
                            ? 'bg-purple-100 text-purple-800' 
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {driver.type}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {driver.location}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <Car className="w-4 h-4 text-gray-400" />
                      <div>
                        <div className="text-sm font-medium text-gray-900">{driver.vehicle.model}</div>
                        <div className="text-xs text-gray-500 font-mono">{driver.vehicle.plateNumber}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="space-y-1">
                      <div className="flex items-center">
                        <Star className="w-3 h-3 text-yellow-400 mr-1" />
                        <span className="text-sm font-medium">{driver.performance.rating}</span>
                        <span className="text-xs text-gray-500 ml-1">({driver.performance.totalTrips})</span>
                      </div>
                      <div className="flex gap-2 text-xs">
                        <span className="text-green-600">{driver.performance.acceptanceRate}% acc</span>
                        <span className="text-blue-600">{driver.performance.completionRate}% comp</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-center">
                      <div className="text-lg font-bold text-blue-600">{driver.tripsToday}</div>
                      <div className="text-xs text-gray-500">trips</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-center">
                      <div className="text-sm font-bold text-green-600">₱{driver.earnings.today.toLocaleString()}</div>
                      <div className="text-xs text-gray-500">today</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      {driver.issue && (
                        <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getIssueColor(driver.issue)}`}>
                          {driver.issue}
                        </span>
                      )}
                      {hoveredRow === driver.id && (
                        <div className="flex gap-1">
                          <button
                            onClick={(e) => handleQuickAction(e, 'call', driver)}
                            className="p-1 hover:bg-blue-100 rounded transition-colors"
                            title={`Call ${driver.name}`}
                          >
                            <Phone className="w-4 h-4 text-blue-600" />
                          </button>
                          <button
                            onClick={(e) => handleQuickAction(e, 'message', driver)}
                            className="p-1 hover:bg-green-100 rounded transition-colors"
                            title={`Message ${driver.name}`}
                          >
                            <MessageSquare className="w-4 h-4 text-green-600" />
                          </button>
                          <button
                            onClick={(e) => handleQuickAction(e, 'view', driver)}
                            className="p-1 hover:bg-gray-100 rounded transition-colors"
                            title={`View ${driver.name}'s profile`}
                          >
                            <Eye className="w-4 h-4 text-gray-600" />
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {filteredDrivers.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-500">
              <Search className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium">No drivers found</p>
              <p className="text-sm">Try adjusting your search or filter criteria</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DriverManagementTable;