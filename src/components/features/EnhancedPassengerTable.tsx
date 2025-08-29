import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search, RotateCw, ArrowUpDown, MessageCircle, UserX, AlertTriangle, TrendingUp, TrendingDown, ArrowLeft, X, Star, CreditCard, Shield } from 'lucide-react';

const EnhancedPassengerTable = () => {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('Active');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [sortField, setSortField] = useState('');
  const [sortDirection, setSortDirection] = useState('asc');
  const [selectedPassenger, setSelectedPassenger] = useState<any>(null);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [recentChanges, setRecentChanges] = useState<{[key: number]: number}>({});

  // Column width state management
  const defaultColumnWidths = {
    passenger: 180,
    status: 120,
    activity: 130,
    bookings: 80,
    total: 100,
    rate: 100,
    payment: 100,
    risk: 100,
    actions: 120
  };

  const [columnWidths, setColumnWidths] = useState(defaultColumnWidths);
  const [isResizing, setIsResizing] = useState<string | null>(null);
  const [resizeStartX, setResizeStartX] = useState(0);
  const [resizeStartWidth, setResizeStartWidth] = useState(0);

  // Load saved column widths from localStorage
  useEffect(() => {
    const savedWidths = localStorage.getItem('passengerTable_columnWidths');
    if (savedWidths) {
      try {
        const parsedWidths = JSON.parse(savedWidths);
        setColumnWidths({ ...defaultColumnWidths, ...parsedWidths });
      } catch (error) {
        console.warn('Failed to parse saved column widths:', error);
      }
    }
  }, []);

  // Save column widths to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('passengerTable_columnWidths', JSON.stringify(columnWidths));
  }, [columnWidths]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setLastUpdated(new Date());
      // Simulate some changes
      if (Math.random() < 0.3) {
        const randomId = Math.floor(Math.random() * 8) + 1;
        setRecentChanges(prev => ({...prev, [randomId]: Date.now()}));
      }
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const passengersData = [
    {
      id: 1,
      status: 'vip',
      statusText: 'VIP',
      statusTime: '2d ago',
      type: 'VIP',
      name: 'Maria Santos',
      passengerId: 'PSG-201922',
      completedBookings: 1248,
      completionRate: 98,
      completionTrend: 'up',
      cancellationRate: 2,
      averageRating: 4.9,
      totalSpent: 85420.50,
      joinDate: 'Jan 15, 2023',
      region: 'NCR',
      paymentMethod: 'Credit Card',
      riskLevel: 'Low',
      riskDetails: 'Verified premium customer',
      bookingsToday: 3,
      currentActivity: 'Active',
      issues: []
    },
    {
      id: 2,
      status: 'regular',
      statusText: 'Regular',
      statusTime: null,
      type: 'Regular',
      name: 'Juan dela Cruz',
      passengerId: 'PSG-201507',
      completedBookings: 529,
      completionRate: 94,
      completionTrend: 'stable',
      cancellationRate: 8,
      averageRating: 4.3,
      totalSpent: 25730.00,
      joinDate: 'Jun 10, 2024',
      region: 'Davao',
      paymentMethod: 'Digital Wallet',
      riskLevel: 'Low',
      riskDetails: 'Good payment history',
      bookingsToday: 1,
      currentActivity: 'Booking now',
      issues: []
    },
    {
      id: 3,
      status: 'suspended',
      statusText: 'Suspended',
      statusTime: '6d ago',
      type: 'Payment Issues',
      name: 'Ana Rodriguez',
      passengerId: 'PSG-201095',
      completedBookings: 326,
      completionRate: 76,
      completionTrend: 'down',
      cancellationRate: 25,
      averageRating: 3.2,
      totalSpent: 12450.00,
      joinDate: 'Mar 22, 2024',
      region: 'Bicol',
      paymentMethod: 'Cash',
      riskLevel: 'High',
      riskDetails: 'Multiple payment failures',
      bookingsToday: 0,
      currentActivity: 'Suspended',
      issues: ['Payment Failed', 'High Cancellation']
    },
    {
      id: 4,
      status: 'premium',
      statusText: 'Premium',
      statusTime: null,
      type: 'Premium',
      name: 'Carlos Mendoza',
      passengerId: 'PSG-201021',
      completedBookings: 892,
      completionRate: 96,
      completionTrend: 'up',
      cancellationRate: 4,
      averageRating: 4.7,
      totalSpent: 67890.25,
      joinDate: 'Sep 08, 2023',
      region: 'Baguio',
      paymentMethod: 'Credit Card',
      riskLevel: 'Low',
      riskDetails: 'Excellent customer',
      bookingsToday: 2,
      currentActivity: 'Recently booked',
      issues: []
    },
    {
      id: 5,
      status: 'new',
      statusText: 'New User',
      statusTime: '1h ago',
      type: 'New User (30 days)',
      name: 'Sofia Garcia',
      passengerId: 'PSG-202001',
      completedBookings: 12,
      completionRate: 92,
      completionTrend: 'up',
      cancellationRate: 8,
      averageRating: 4.5,
      totalSpent: 1250.00,
      joinDate: 'Aug 25, 2024',
      region: 'Cebu',
      paymentMethod: 'Digital Wallet',
      riskLevel: 'Medium',
      riskDetails: 'New user monitoring',
      bookingsToday: 1,
      currentActivity: 'First week',
      issues: []
    },
    {
      id: 6,
      status: 'banned',
      statusText: 'Banned',
      statusTime: '30d ago',
      type: 'Multiple Violations',
      name: 'Ricardo Tan',
      passengerId: 'PSG-200845',
      completedBookings: 156,
      completionRate: 45,
      completionTrend: 'down',
      cancellationRate: 55,
      averageRating: 2.1,
      totalSpent: 8900.00,
      joinDate: 'Nov 12, 2023',
      region: 'Iloilo',
      paymentMethod: 'Cash',
      riskLevel: 'Critical',
      riskDetails: 'Fraud detected, multiple violations',
      bookingsToday: 0,
      currentActivity: 'Banned',
      issues: ['Fraud Alert', 'Abuse Report', 'Fake Account']
    },
    {
      id: 7,
      status: 'regular',
      statusText: 'Regular',
      statusTime: '5m ago',
      type: 'Regular',
      name: 'Elena Reyes',
      passengerId: 'PSG-201345',
      completedBookings: 678,
      completionRate: 89,
      completionTrend: 'stable',
      cancellationRate: 11,
      averageRating: 4.1,
      totalSpent: 34560.75,
      joinDate: 'Apr 18, 2024',
      region: 'NCR',
      paymentMethod: 'Bank Transfer',
      riskLevel: 'Low',
      riskDetails: 'Regular customer',
      bookingsToday: 2,
      currentActivity: 'Just booked',
      issues: []
    },
    {
      id: 8,
      status: 'suspended',
      statusText: 'Suspended',
      statusTime: '12d ago',
      type: 'Under Investigation',
      name: 'Miguel Santos',
      passengerId: 'PSG-201678',
      completedBookings: 445,
      completionRate: 67,
      completionTrend: 'down',
      cancellationRate: 33,
      averageRating: 3.4,
      totalSpent: 18750.00,
      joinDate: 'Jul 05, 2024',
      region: 'Davao',
      paymentMethod: 'Digital Wallet',
      riskLevel: 'High',
      riskDetails: 'Under investigation for violations',
      bookingsToday: 0,
      currentActivity: 'Suspended',
      issues: ['Violation Report', 'Poor Rating']
    }
  ];

  const filteredPassengers = passengersData.filter(passenger => {
    const matchesSearch = 
      passenger.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      passenger.passengerId.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = selectedType === 'All' || 
      (selectedType === 'Active' && ['vip', 'premium', 'regular', 'new'].includes(passenger.status)) ||
      (selectedType === 'Suspended' && passenger.status === 'suspended') ||
      (selectedType === 'Banned' && passenger.status === 'banned') ||
      (selectedType === 'VIP' && passenger.status === 'vip') ||
      (selectedType === 'Premium' && passenger.status === 'premium') ||
      (selectedType === 'New Users' && passenger.status === 'new');

    const matchesStatus = selectedStatus === 'All' || 
      passenger.currentActivity.toLowerCase().includes(selectedStatus.toLowerCase());

    return matchesSearch && matchesType && matchesStatus;
  });

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleRowClick = (passenger: any) => {
    router.push('/passenger-profile');
  };

  const handleMouseDown = (e: React.MouseEvent, column: string) => {
    e.preventDefault();
    setIsResizing(column);
    setResizeStartX(e.clientX);
    setResizeStartWidth(columnWidths[column as keyof typeof columnWidths]);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isResizing) return;
    
    const deltaX = e.clientX - resizeStartX;
    const newWidth = Math.max(80, resizeStartWidth + deltaX);
    
    setColumnWidths(prev => ({
      ...prev,
      [isResizing]: newWidth
    }));
  };

  const handleMouseUp = () => {
    setIsResizing(null);
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'vip': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'premium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'regular': return 'bg-green-100 text-green-800 border-green-200';
      case 'new': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'suspended': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'banned': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk.toLowerCase()) {
      case 'low': return 'text-green-600';
      case 'medium': return 'text-yellow-600';
      case 'high': return 'text-orange-600';
      case 'critical': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="p-6 bg-white">
      {/* Header Section */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Passenger Management</h1>
          <p className="text-gray-600 mt-1">Monitor and manage passenger accounts across all regions</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <RotateCw className="w-4 h-4" />
          Last updated: {lastUpdated.toLocaleTimeString()}
        </div>
      </div>

      {/* Controls Section */}
      <div className="space-y-4 mb-6">
        {/* Search and Filters */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative flex-1 min-w-[300px]">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search passengers by name or ID..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <select
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
          >
            <option value="All">All Passengers</option>
            <option value="Active">Active</option>
            <option value="VIP">VIP</option>
            <option value="Premium">Premium</option>
            <option value="New Users">New Users</option>
            <option value="Suspended">Suspended</option>
            <option value="Banned">Banned</option>
          </select>

          <select
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
          >
            <option value="All">All Status</option>
            <option value="Active">Active</option>
            <option value="Booking">Booking</option>
            <option value="Suspended">Suspended</option>
            <option value="Banned">Banned</option>
          </select>
        </div>

        {/* Results Summary */}
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>Showing {filteredPassengers.length} of {passengersData.length} passengers</span>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              Active: {passengersData.filter(p => ['vip', 'premium', 'regular', 'new'].includes(p.status)).length}
            </span>
            <span className="flex items-center gap-1">
              <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
              Suspended: {passengersData.filter(p => p.status === 'suspended').length}
            </span>
            <span className="flex items-center gap-1">
              <div className="w-2 h-2 bg-red-500 rounded-full"></div>
              Banned: {passengersData.filter(p => p.status === 'banned').length}
            </span>
          </div>
        </div>
      </div>

      {/* Table Container */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th 
                  className="relative text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider select-none border-r border-gray-200"
                  style={{ width: columnWidths.passenger }}
                >
                  <div className="flex items-center gap-1 cursor-pointer" onClick={() => handleSort('name')}>
                    Passenger
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                  <div
                    className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-500 hover:opacity-50"
                    onMouseDown={(e) => handleMouseDown(e, 'passenger')}
                  />
                </th>
                <th 
                  className="relative text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider select-none border-r border-gray-200"
                  style={{ width: columnWidths.status }}
                >
                  <div className="flex items-center gap-1 cursor-pointer" onClick={() => handleSort('status')}>
                    Status
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                  <div
                    className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-500 hover:opacity-50"
                    onMouseDown={(e) => handleMouseDown(e, 'status')}
                  />
                </th>
                <th 
                  className="relative text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider select-none border-r border-gray-200"
                  style={{ width: columnWidths.activity }}
                >
                  <div className="flex items-center gap-1 cursor-pointer" onClick={() => handleSort('currentActivity')}>
                    Activity
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                  <div
                    className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-500 hover:opacity-50"
                    onMouseDown={(e) => handleMouseDown(e, 'activity')}
                  />
                </th>
                <th 
                  className="relative text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider select-none border-r border-gray-200"
                  style={{ width: columnWidths.bookings }}
                >
                  <div className="flex items-center gap-1 cursor-pointer" onClick={() => handleSort('bookingsToday')}>
                    Today
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                  <div
                    className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-500 hover:opacity-50"
                    onMouseDown={(e) => handleMouseDown(e, 'bookings')}
                  />
                </th>
                <th 
                  className="relative text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider select-none border-r border-gray-200"
                  style={{ width: columnWidths.total }}
                >
                  <div className="flex items-center gap-1 cursor-pointer" onClick={() => handleSort('completedBookings')}>
                    Total
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                  <div
                    className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-500 hover:opacity-50"
                    onMouseDown={(e) => handleMouseDown(e, 'total')}
                  />
                </th>
                <th 
                  className="relative text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider select-none border-r border-gray-200"
                  style={{ width: columnWidths.rate }}
                >
                  <div className="flex items-center gap-1 cursor-pointer" onClick={() => handleSort('completionRate')}>
                    Rate
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                  <div
                    className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-500 hover:opacity-50"
                    onMouseDown={(e) => handleMouseDown(e, 'rate')}
                  />
                </th>
                <th 
                  className="relative text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider select-none border-r border-gray-200"
                  style={{ width: columnWidths.payment }}
                >
                  <div className="flex items-center gap-1 cursor-pointer" onClick={() => handleSort('paymentMethod')}>
                    Payment
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                  <div
                    className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-500 hover:opacity-50"
                    onMouseDown={(e) => handleMouseDown(e, 'payment')}
                  />
                </th>
                <th 
                  className="relative text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider select-none border-r border-gray-200"
                  style={{ width: columnWidths.risk }}
                >
                  <div className="flex items-center gap-1 cursor-pointer" onClick={() => handleSort('riskLevel')}>
                    Risk
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                  <div
                    className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-500 hover:opacity-50"
                    onMouseDown={(e) => handleMouseDown(e, 'risk')}
                  />
                </th>
                <th 
                  className="relative text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider select-none"
                  style={{ width: columnWidths.actions }}
                >
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredPassengers.map((passenger) => (
                <tr 
                  key={passenger.id}
                  className={`hover:bg-gray-50 cursor-pointer transition-colors ${
                    recentChanges[passenger.id] ? 'bg-blue-50' : ''
                  }`}
                  onClick={() => handleRowClick(passenger)}
                >
                  {/* Passenger Info */}
                  <td className="px-4 py-3 border-r border-gray-200">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-blue-800">
                          {passenger.name.split(' ').map(n => n[0]).join('')}
                        </span>
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{passenger.name}</div>
                        <div className="text-sm text-gray-500">{passenger.passengerId}</div>
                      </div>
                    </div>
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3 border-r border-gray-200">
                    <div className="space-y-1">
                      <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(passenger.status)}`}>
                        {passenger.statusText}
                      </span>
                      {passenger.statusTime && (
                        <div className="text-xs text-gray-500">{passenger.statusTime}</div>
                      )}
                    </div>
                  </td>

                  {/* Activity */}
                  <td className="px-4 py-3 border-r border-gray-200">
                    <div className="text-sm text-gray-900">{passenger.currentActivity}</div>
                    <div className="text-xs text-gray-500">{passenger.region}</div>
                  </td>

                  {/* Today's Bookings */}
                  <td className="px-4 py-3 border-r border-gray-200">
                    <div className="text-sm font-medium text-gray-900">{passenger.bookingsToday}</div>
                  </td>

                  {/* Total Bookings */}
                  <td className="px-4 py-3 border-r border-gray-200">
                    <div className="text-sm font-medium text-gray-900">{passenger.completedBookings.toLocaleString()}</div>
                    <div className="text-xs text-gray-500">₱{passenger.totalSpent.toLocaleString()}</div>
                  </td>

                  {/* Completion Rate */}
                  <td className="px-4 py-3 border-r border-gray-200">
                    <div className="flex items-center gap-1">
                      <span className="text-sm font-medium text-gray-900">{passenger.completionRate}%</span>
                      {passenger.completionTrend === 'up' && <TrendingUp className="w-3 h-3 text-green-500" />}
                      {passenger.completionTrend === 'down' && <TrendingDown className="w-3 h-3 text-red-500" />}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                      {passenger.averageRating}
                    </div>
                  </td>

                  {/* Payment Method */}
                  <td className="px-4 py-3 border-r border-gray-200">
                    <div className="flex items-center gap-1 text-sm text-gray-900">
                      <CreditCard className="w-3 h-3" />
                      {passenger.paymentMethod}
                    </div>
                  </td>

                  {/* Risk Level */}
                  <td className="px-4 py-3 border-r border-gray-200">
                    <div className="flex items-center gap-1">
                      <Shield className={`w-3 h-3 ${getRiskColor(passenger.riskLevel)}`} />
                      <span className={`text-sm font-medium ${getRiskColor(passenger.riskLevel)}`}>
                        {passenger.riskLevel}
                      </span>
                    </div>
                    {passenger.issues.length > 0 && (
                      <div className="text-xs text-red-600 mt-1">
                        {passenger.issues[0]}
                        {passenger.issues.length > 1 && ` +${passenger.issues.length - 1} more`}
                      </div>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded">
                        <MessageCircle className="w-4 h-4" />
                      </button>
                      {passenger.issues.length > 0 && (
                        <button className="p-1 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded">
                          <AlertTriangle className="w-4 h-4" />
                        </button>
                      )}
                      {passenger.status === 'banned' && (
                        <button className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded">
                          <UserX className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer Stats */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
          <div className="text-2xl font-semibold text-green-800">
            {passengersData.filter(p => ['vip', 'premium', 'regular', 'new'].includes(p.status)).length}
          </div>
          <div className="text-sm text-green-600">Active Passengers</div>
        </div>
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <div className="text-2xl font-semibold text-blue-800">
            ₱{passengersData.reduce((sum, p) => sum + p.totalSpent, 0).toLocaleString()}
          </div>
          <div className="text-sm text-blue-600">Total Revenue</div>
        </div>
        <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
          <div className="text-2xl font-semibold text-yellow-800">
            {Math.round(passengersData.reduce((sum, p) => sum + p.averageRating, 0) / passengersData.length * 10) / 10}
          </div>
          <div className="text-sm text-yellow-600">Average Rating</div>
        </div>
        <div className="bg-red-50 p-4 rounded-lg border border-red-200">
          <div className="text-2xl font-semibold text-red-800">
            {passengersData.filter(p => p.riskLevel === 'High' || p.riskLevel === 'Critical').length}
          </div>
          <div className="text-sm text-red-600">High Risk</div>
        </div>
      </div>
    </div>
  );
};

export default EnhancedPassengerTable;