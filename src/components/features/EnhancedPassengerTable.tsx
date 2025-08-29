import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search, RotateCw, ArrowUpDown, MessageCircle, UserX, AlertTriangle, TrendingUp, TrendingDown, ArrowLeft, X, Star } from 'lucide-react';

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
    today: 80,
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
      statusText: 'VIP Active',
      statusTime: '2h ago',
      role: 'VIP Customer',
      name: 'Maria Santos 1922',
      passengerId: 'PSG-201922',
      completedBookings: 1248,
      completionRate: 98,
      completionTrend: 'up',
      cancellationRate: 2,
      totalSpent: 85420.50,
      joinDate: 'Jan 15, 2023',
      region: 'NCR',
      paymentMethod: 'Credit Card',
      fraudRisk: 'Low',
      fraudDetails: 'Excellent customer with verified identity',
      bookingsToday: 3,
      currentActivity: 'Recently booked',
      issues: []
    },
    {
      id: 2,
      status: 'regular',
      statusText: 'Regular',
      statusTime: null,
      role: 'Regular Customer',
      name: 'Carlo Mendoza 1507',
      passengerId: 'PSG-201507',
      completedBookings: 529,
      completionRate: 94,
      completionTrend: 'stable',
      cancellationRate: 6,
      totalSpent: 25730.00,
      joinDate: 'Jun 10, 2024',
      region: 'Davao',
      paymentMethod: 'Digital Wallet',
      fraudRisk: 'Low',
      fraudDetails: 'Good payment history',
      bookingsToday: 1,
      currentActivity: 'Active',
      issues: []
    },
    {
      id: 3,
      status: 'suspended',
      statusText: 'Suspended',
      statusTime: '6d ago',
      role: 'Payment Issues',
      name: 'Liza Rodriguez 1095',
      passengerId: 'PSG-201095',
      completedBookings: 326,
      completionRate: 76,
      completionTrend: 'down',
      cancellationRate: 24,
      totalSpent: 12450.00,
      joinDate: 'Mar 22, 2024',
      region: 'Bicol',
      paymentMethod: 'Cash',
      fraudRisk: 'High',
      fraudDetails: 'Multiple payment failures',
      bookingsToday: 0,
      currentActivity: 'Suspended',
      issues: ['Payment Failed']
    },
    {
      id: 4,
      status: 'premium',
      statusText: 'Premium',
      statusTime: null,
      role: 'Premium Customer',
      name: 'Ramon Cruz 1021',
      passengerId: 'PSG-201021',
      completedBookings: 892,
      completionRate: 96,
      completionTrend: 'up',
      cancellationRate: 4,
      totalSpent: 67890.25,
      joinDate: 'Sep 08, 2023',
      region: 'Baguio',
      paymentMethod: 'Credit Card',
      fraudRisk: 'Low',
      fraudDetails: 'Excellent customer',
      bookingsToday: 2,
      currentActivity: 'Active',
      issues: []
    },
    {
      id: 5,
      status: 'new',
      statusText: 'New User',
      statusTime: null,
      role: 'New Customer (30 days)',
      name: 'Juan Flores 211',
      passengerId: 'PSG-200211',
      completedBookings: 18,
      completionRate: 89,
      completionTrend: 'up',
      cancellationRate: 11,
      totalSpent: 1250.00,
      joinDate: 'Aug 25, 2024',
      region: 'Cebu',
      paymentMethod: 'Digital Wallet',
      fraudRisk: 'Medium',
      fraudDetails: 'New user monitoring',
      bookingsToday: 1,
      currentActivity: 'First week',
      issues: []
    },
    {
      id: 6,
      status: 'regular',
      statusText: 'Regular',
      statusTime: null,
      role: 'Regular Customer',
      name: 'Grace Reyes 325',
      passengerId: 'PSG-200325',
      completedBookings: 756,
      completionRate: 92,
      completionTrend: 'stable',
      cancellationRate: 8,
      totalSpent: 34560.75,
      joinDate: 'Apr 18, 2024',
      region: 'Bicol',
      paymentMethod: 'Bank Transfer',
      fraudRisk: 'Low',
      fraudDetails: 'Clean record',
      bookingsToday: 2,
      currentActivity: 'Active',
      issues: []
    },
    {
      id: 7,
      status: 'suspended',
      statusText: 'Suspended',
      statusTime: '2d ago',
      role: 'Under Investigation',
      name: 'Maria Cruz 5',
      passengerId: 'PSG-200005',
      completedBookings: 445,
      completionRate: 67,
      completionTrend: 'down',
      cancellationRate: 33,
      totalSpent: 18750.00,
      joinDate: 'Jul 05, 2024',
      region: 'Cebu',
      paymentMethod: 'Digital Wallet',
      fraudRisk: 'High',
      fraudDetails: 'Under investigation for violations',
      bookingsToday: 0,
      currentActivity: 'Suspended',
      issues: ['Violation Report']
    },
    {
      id: 8,
      status: 'vip',
      statusText: 'VIP Active',
      statusTime: null,
      role: 'VIP Customer',
      name: 'Ramon Navarro 22',
      passengerId: 'PSG-200022',
      completedBookings: 2187,
      completionRate: 97,
      completionTrend: 'stable',
      cancellationRate: 3,
      totalSpent: 156780.00,
      joinDate: 'May 12, 2022',
      region: 'Cebu',
      paymentMethod: 'Credit Card',
      fraudRisk: 'Low',
      fraudDetails: 'Top tier customer',
      bookingsToday: 4,
      currentActivity: 'Active',
      issues: []
    },
    {
      id: 9,
      status: 'new',
      statusText: 'New User',
      statusTime: '1d ago',
      role: 'New Customer',
      name: 'Roberto Dela Cruz 987',
      passengerId: 'PSG-200987',
      completedBookings: 3,
      completionRate: 100,
      completionTrend: 'stable',
      cancellationRate: 0,
      totalSpent: 350.00,
      joinDate: 'Aug 28, 2024',
      region: 'NCR',
      paymentMethod: 'Digital Wallet',
      fraudRisk: 'Medium',
      fraudDetails: 'New customer verification',
      bookingsToday: 1,
      currentActivity: 'New user',
      issues: []
    },
    {
      id: 10,
      status: 'premium',
      statusText: 'Premium',
      statusTime: null,
      role: 'Premium Customer',
      name: 'Ana Marie Tan 456',
      passengerId: 'PSG-201456',
      completedBookings: 1134,
      completionRate: 94,
      completionTrend: 'up',
      cancellationRate: 6,
      totalSpent: 78650.25,
      joinDate: 'Feb 15, 2023',
      region: 'Cebu',
      paymentMethod: 'Credit Card',
      fraudRisk: 'Low',
      fraudDetails: 'Premium customer',
      bookingsToday: 2,
      currentActivity: 'Active',
      issues: []
    },
    {
      id: 11,
      status: 'suspended',
      statusText: 'Suspended',
      statusTime: '5d ago',
      role: 'High Cancellation',
      name: 'Mark Anthony Lee 789',
      passengerId: 'PSG-201789',
      completedBookings: 234,
      completionRate: 58,
      completionTrend: 'down',
      cancellationRate: 42,
      totalSpent: 8900.00,
      joinDate: 'Dec 20, 2023',
      region: 'Davao',
      paymentMethod: 'Cash',
      fraudRisk: 'Critical',
      fraudDetails: 'High cancellation rate',
      bookingsToday: 0,
      currentActivity: 'Suspended',
      issues: ['High Cancellation', 'Customer Complaints']
    },
    {
      id: 12,
      status: 'regular',
      statusText: 'Regular',
      statusTime: null,
      role: 'Regular Customer',
      name: 'Jenny Rose Garcia 234',
      passengerId: 'PSG-201234',
      completedBookings: 678,
      completionRate: 91,
      completionTrend: 'up',
      cancellationRate: 9,
      totalSpent: 32450.50,
      joinDate: 'Jan 10, 2024',
      region: 'NCR',
      paymentMethod: 'Digital Wallet',
      fraudRisk: 'Low',
      fraudDetails: 'Good customer',
      bookingsToday: 1,
      currentActivity: 'Active',
      issues: []
    },
    {
      id: 13,
      status: 'inactive',
      statusText: 'Inactive',
      statusTime: '14d ago',
      role: 'Inactive Customer',
      name: 'Carlos Miguel Santos 567',
      passengerId: 'PSG-200567',
      completedBookings: 445,
      completionRate: 84,
      completionTrend: 'stable',
      cancellationRate: 16,
      totalSpent: 23450.00,
      joinDate: 'Nov 05, 2023',
      region: 'Baguio',
      paymentMethod: 'Credit Card',
      fraudRisk: 'Medium',
      fraudDetails: 'Long inactive period',
      bookingsToday: 0,
      currentActivity: 'Inactive 14d',
      issues: ['Long Inactive']
    },
    {
      id: 14,
      status: 'regular',
      statusText: 'Regular',
      statusTime: null,
      role: 'Regular Customer',
      name: 'Lisa Mae Rodriguez 890',
      passengerId: 'PSG-201890',
      completedBookings: 556,
      completionRate: 89,
      completionTrend: 'up',
      cancellationRate: 11,
      totalSpent: 28750.75,
      joinDate: 'Jun 18, 2024',
      region: 'Cebu',
      paymentMethod: 'Bank Transfer',
      fraudRisk: 'Low',
      fraudDetails: 'Good performance',
      bookingsToday: 1,
      currentActivity: 'Active',
      issues: []
    },
    {
      id: 15,
      status: 'banned',
      statusText: 'Banned',
      statusTime: '30d ago',
      role: 'Banned Customer',
      name: 'David John Cruz 123',
      passengerId: 'PSG-200123',
      completedBookings: 89,
      completionRate: 42,
      completionTrend: 'down',
      cancellationRate: 58,
      totalSpent: 3450.00,
      joinDate: 'Mar 15, 2024',
      region: 'NCR',
      paymentMethod: 'Cash',
      fraudRisk: 'Critical',
      fraudDetails: 'Fraudulent activities detected',
      bookingsToday: 0,
      currentActivity: 'Banned',
      issues: ['Fraud', 'Fake Account']
    },
    // Additional passengers...
    {
      id: 16,
      status: 'vip',
      statusText: 'VIP Active',
      statusTime: null,
      role: 'VIP Customer',
      name: 'Michael Angelo Perez 445',
      passengerId: 'PSG-201445',
      completedBookings: 2156,
      completionRate: 98,
      completionTrend: 'up',
      cancellationRate: 2,
      totalSpent: 189750.00,
      joinDate: 'Aug 01, 2022',
      region: 'Davao',
      paymentMethod: 'Credit Card',
      fraudRisk: 'Low',
      fraudDetails: 'Outstanding customer',
      bookingsToday: 5,
      currentActivity: 'Active',
      issues: []
    }
  ];

  const getStatusIcon = (status: string) => {
    if (status === 'vip') return '👑';
    if (status === 'premium') return '⭐';
    if (status === 'regular') return '🟢';
    if (status === 'new') return '🟠';
    if (status === 'suspended') return '🔴';
    if (status === 'banned') return '⛔';
    if (status === 'inactive') return '⚫';
    return '🔵';
  };

  const getCompletionRateColor = (rate: number) => {
    if (rate >= 95) return 'text-green-600 bg-green-50';
    if (rate >= 85) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const getFraudRiskColor = (risk: string) => {
    if (risk === 'Critical') return 'bg-red-100 text-red-800 border border-red-300';
    if (risk === 'High') return 'bg-orange-100 text-orange-800 border border-orange-300';
    if (risk === 'Medium') return 'bg-yellow-100 text-yellow-800 border border-yellow-300';
    return 'bg-green-100 text-green-800 border border-green-300';
  };

  const getTrendIcon = (trend: string) => {
    if (trend === 'up') return <TrendingUp className="w-3 h-3 text-green-500 inline ml-1" />;
    if (trend === 'down') return <TrendingDown className="w-3 h-3 text-red-500 inline ml-1" />;
    return null;
  };

  const getStatusTooltip = (statusText: string) => {
    switch (statusText) {
      case 'VIP Active':
        return 'VIP customer with highest priority and benefits';
      case 'Premium':
        return 'Premium customer with enhanced service benefits';
      case 'Regular':
        return 'Standard customer account in good standing';
      case 'New User':
        return 'New customer within first 30 days';
      case 'Suspended':
        return 'Customer temporarily suspended due to violations or issues';
      case 'Banned':
        return 'Customer permanently banned from the platform';
      case 'Inactive':
        return 'Customer hasn\'t booked rides for extended period';
      default:
        return 'Current customer account status';
    }
  };

  const getActivityTooltip = (activity: string) => {
    if (activity.includes('Active')) {
      return 'Customer actively using the platform';
    } else if (activity.includes('Recently booked')) {
      return 'Customer made a recent booking';
    } else if (activity.includes('First week')) {
      return 'New customer in their first week';
    } else if (activity.includes('Inactive')) {
      return 'Customer has been inactive for specified duration';
    } else if (activity.includes('Suspended')) {
      return 'Customer account is temporarily suspended';
    } else if (activity.includes('Banned')) {
      return 'Customer is permanently banned from the platform';
    } else {
      return 'Current customer activity status';
    }
  };

  // Get contextual status options based on selected passenger type
  const getContextualStatusOptions = (passengerType: string) => {
    switch (passengerType) {
      case 'Active':
        return [
          { 
            id: 'All', 
            label: 'All Active', 
            count: passengersData.filter(p => 
              p.status !== 'suspended' && 
              p.status !== 'inactive' && 
              p.status !== 'banned'
            ).length,
            tooltip: 'Show all active customers regardless of tier'
          },
          { 
            id: 'VIP', 
            label: 'VIP', 
            count: passengersData.filter(p => p.status === 'vip').length,
            tooltip: 'VIP customers with highest benefits'
          },
          { 
            id: 'Premium', 
            label: 'Premium', 
            count: passengersData.filter(p => p.status === 'premium').length,
            tooltip: 'Premium customers with enhanced service'
          },
          { 
            id: 'Regular', 
            label: 'Regular', 
            count: passengersData.filter(p => p.status === 'regular').length,
            tooltip: 'Regular customers in good standing'
          },
          { 
            id: 'New Users', 
            label: 'New Users', 
            count: passengersData.filter(p => p.status === 'new').length,
            tooltip: 'New customers within 30 days'
          },
          { 
            id: 'Issues', 
            label: 'Issues', 
            count: passengersData.filter(p => 
              p.issues.length > 0 && 
              p.status !== 'suspended' && p.status !== 'inactive' && 
              p.status !== 'banned'
            ).length,
            tooltip: 'Active customers with minor issues'
          }
        ];
      
      case 'Suspended':
        return [
          { 
            id: 'All', 
            label: 'All Suspended', 
            count: passengersData.filter(p => p.status === 'suspended').length,
            tooltip: 'Show all suspended customers'
          },
          { 
            id: 'Payment Issues', 
            label: 'Payment', 
            count: passengersData.filter(p => 
              p.status === 'suspended' && 
              p.issues.some(issue => issue.includes('Payment'))
            ).length,
            tooltip: 'Customers suspended for payment issues'
          },
          { 
            id: 'High Cancellation', 
            label: 'Cancellation', 
            count: passengersData.filter(p => 
              p.status === 'suspended' && 
              p.issues.some(issue => issue.includes('Cancellation'))
            ).length,
            tooltip: 'Customers suspended for high cancellation rates'
          },
          { 
            id: 'Violations', 
            label: 'Violations', 
            count: passengersData.filter(p => 
              p.status === 'suspended' && 
              p.issues.some(issue => issue.includes('Violation'))
            ).length,
            tooltip: 'Customers suspended for policy violations'
          }
        ];
      
      case 'Inactive':
        return [
          { 
            id: 'All', 
            label: 'All Inactive', 
            count: passengersData.filter(p => p.status === 'inactive').length,
            tooltip: 'Show all inactive customers'
          },
          { 
            id: 'Short Term', 
            label: 'Short Term', 
            count: passengersData.filter(p => 
              p.status === 'inactive' && 
              p.currentActivity.includes('14d')
            ).length,
            tooltip: 'Customers inactive for 1-14 days'
          },
          { 
            id: 'Long Term', 
            label: 'Long Term', 
            count: passengersData.filter(p => 
              p.status === 'inactive' && 
              !p.currentActivity.includes('14d')
            ).length,
            tooltip: 'Customers inactive for more than 14 days'
          }
        ];
      
      case 'Banned':
        return [
          { 
            id: 'All', 
            label: 'All Banned', 
            count: passengersData.filter(p => p.status === 'banned').length,
            tooltip: 'Show all permanently banned customers'
          },
          { 
            id: 'Fraud', 
            label: 'Fraud', 
            count: passengersData.filter(p => 
              p.status === 'banned' && 
              p.issues.some(issue => issue.includes('Fraud'))
            ).length,
            tooltip: 'Customers banned for fraudulent activities'
          },
          { 
            id: 'Fake Account', 
            label: 'Fake', 
            count: passengersData.filter(p => 
              p.status === 'banned' && 
              p.issues.some(issue => issue.includes('Fake'))
            ).length,
            tooltip: 'Customers banned for fake account violations'
          }
        ];
      
      default:
        return [
          { 
            id: 'All', 
            label: 'All', 
            count: passengersData.length,
            tooltip: 'Show all customers regardless of status'
          }
        ];
    }
  };

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

  const isRecentlyChanged = (id: number) => {
    const changeTime = recentChanges[id];
    return changeTime && (Date.now() - changeTime) < 5000; // 5 seconds
  };

  // Column resize handlers
  const handleResizeStart = (column: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(column);
    setResizeStartX(e.clientX);
    setResizeStartWidth(columnWidths[column as keyof typeof columnWidths]);
  };

  const handleResizeMove = (e: MouseEvent) => {
    if (!isResizing) return;
    
    const deltaX = e.clientX - resizeStartX;
    const newWidth = Math.max(60, resizeStartWidth + deltaX); // Minimum width of 60px
    
    setColumnWidths(prev => ({
      ...prev,
      [isResizing]: newWidth
    }));
  };

  const handleResizeEnd = () => {
    setIsResizing(null);
  };

  // Add global mouse event listeners for resize
  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleResizeMove);
      document.addEventListener('mouseup', handleResizeEnd);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      
      return () => {
        document.removeEventListener('mousemove', handleResizeMove);
        document.removeEventListener('mouseup', handleResizeEnd);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      };
    }
  }, [isResizing, resizeStartX, resizeStartWidth]);

  // Reset column widths to default
  const resetColumnWidths = () => {
    setColumnWidths(defaultColumnWidths);
  };

  // Filter and sort passengers with contextual logic
  const filteredPassengers = passengersData
    .filter(passenger => {
      // Search filter
      const matchesSearch = searchTerm === '' || 
        passenger.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        passenger.passengerId.toLowerCase().includes(searchTerm.toLowerCase());

      // Type filter (primary filter)
      let matchesType = false;
      switch (selectedType) {
        case 'Active':
          matchesType = passenger.status !== 'suspended' && 
                      passenger.status !== 'inactive' && 
                      passenger.status !== 'banned';
          break;
        case 'Suspended':
          matchesType = passenger.status === 'suspended';
          break;
        case 'Inactive':
          matchesType = passenger.status === 'inactive';
          break;
        case 'Banned':
          matchesType = passenger.status === 'banned';
          break;
        default:
          matchesType = true;
      }

      // Contextual status filter (secondary filter based on type)
      let matchesStatus = false;
      if (selectedStatus === 'All') {
        matchesStatus = true;
      } else {
        // Apply contextual status filtering based on selected type
        switch (selectedType) {
          case 'Active':
            if (selectedStatus === 'VIP') {
              matchesStatus = passenger.status === 'vip';
            } else if (selectedStatus === 'Premium') {
              matchesStatus = passenger.status === 'premium';
            } else if (selectedStatus === 'Regular') {
              matchesStatus = passenger.status === 'regular';
            } else if (selectedStatus === 'New Users') {
              matchesStatus = passenger.status === 'new';
            } else if (selectedStatus === 'Issues') {
              matchesStatus = passenger.issues.length > 0;
            }
            break;
          
          case 'Suspended':
            if (selectedStatus === 'Payment Issues') {
              matchesStatus = passenger.issues.some(issue => 
                issue.includes('Payment')
              );
            } else if (selectedStatus === 'High Cancellation') {
              matchesStatus = passenger.issues.some(issue => 
                issue.includes('Cancellation')
              );
            } else if (selectedStatus === 'Violations') {
              matchesStatus = passenger.issues.some(issue => 
                issue.includes('Violation')
              );
            }
            break;
          
          case 'Inactive':
            if (selectedStatus === 'Short Term') {
              matchesStatus = passenger.currentActivity.includes('14d');
            } else if (selectedStatus === 'Long Term') {
              matchesStatus = !passenger.currentActivity.includes('14d');
            }
            break;
          
          case 'Banned':
            if (selectedStatus === 'Fraud') {
              matchesStatus = passenger.issues.some(issue => 
                issue.includes('Fraud')
              );
            } else if (selectedStatus === 'Fake Account') {
              matchesStatus = passenger.issues.some(issue => 
                issue.includes('Fake')
              );
            }
            break;
          
          default:
            matchesStatus = true;
        }
      }

      return matchesSearch && matchesType && matchesStatus;
    })
    .sort((a, b) => {
      if (!sortField) return 0;
      
      let aValue = a[sortField as keyof typeof a];
      let bValue = b[sortField as keyof typeof b];
      
      if (typeof aValue === 'string') aValue = aValue.toLowerCase();
      if (typeof bValue === 'string') bValue = bValue.toLowerCase();
      
      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

  return (
    <div className="space-y-3">
      {/* Enhanced Filter Section */}
      <div className="bg-white border border-gray-200 rounded-lg p-3 mb-3">
        {/* Search and Date Filters */}
        <div className="flex items-center space-x-4 mb-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search name or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm w-64"
            />
          </div>
          
          <input type="date" className="border border-gray-200 rounded px-3 py-2 text-sm" />
          <span className="text-gray-500">to</span>
          <input type="date" className="border border-gray-200 rounded px-3 py-2 text-sm" />
          
          <div className="ml-auto flex items-center space-x-3">
            <span className="text-xs text-gray-500">
              Updated: {lastUpdated.toLocaleTimeString()}
            </span>
            <button 
              onClick={() => setLastUpdated(new Date())}
              className="flex items-center space-x-1 px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
            >
              <RotateCw className="w-3 h-3" />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Passenger Type Filters */}
        <div className="flex items-center space-x-4 mb-3">
          <span className="text-sm font-medium text-gray-700">Customer Type:</span>
          {[
            { 
              id: 'Active', 
              label: 'Active', 
              count: passengersData.filter(p => 
                p.status !== 'suspended' && 
                p.status !== 'inactive' && 
                p.status !== 'banned'
              ).length,
              tooltip: 'Customers currently active and using the platform'
            },
            { 
              id: 'Suspended', 
              label: 'Suspended', 
              count: passengersData.filter(p => p.status === 'suspended').length,
              tooltip: 'Customers temporarily suspended due to violations or issues'
            },
            { 
              id: 'Inactive', 
              label: 'Inactive', 
              count: passengersData.filter(p => p.status === 'inactive').length,
              tooltip: 'Customers who haven\'t used the platform for extended period'
            },
            { 
              id: 'Banned', 
              label: 'Banned', 
              count: passengersData.filter(p => p.status === 'banned').length,
              tooltip: 'Customers permanently banned from the platform'
            }
          ].map(type => (
            <button
              key={type.id}
              onClick={() => {
                setSelectedType(type.id);
                setSelectedStatus('All'); // Reset status when passenger type changes
              }}
              title={type.tooltip}
              className={`flex items-center space-x-2 px-3 py-1 text-sm rounded transition-colors ${
                selectedType === type.id 
                  ? 'bg-blue-100 text-blue-700 border border-blue-200' 
                  : 'text-gray-600 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              <span>{type.label}</span>
              <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${
                selectedType === type.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-600'
              }`}>
                {type.count}
              </span>
            </button>
          ))}
        </div>

        {/* Status Filter Pills */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <span className="text-sm font-medium text-gray-700">Status:</span>
            {getContextualStatusOptions(selectedType).map(status => (
              <button
                key={status.id}
                onClick={() => setSelectedStatus(status.id)}
                title={status.tooltip}
                className={`flex items-center space-x-2 px-3 py-1 text-sm rounded-full transition-colors ${
                  selectedStatus === status.id 
                    ? 'bg-blue-100 text-blue-700 border border-blue-200' 
                    : 'text-gray-600 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                <span>{status.label}</span>
                <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${
                  selectedStatus === status.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-600'
                }`}>
                  {status.count}
                </span>
              </button>
            ))}
          </div>
          
          <div className="flex items-center space-x-4">
            <button 
              onClick={() => {
                setSearchTerm('');
                setSelectedType('Active');
                setSelectedStatus('All');
              }}
              className="text-gray-600 hover:text-gray-900 text-sm"
            >
              Clear
            </button>
            <button 
              onClick={resetColumnWidths}
              className="text-gray-600 hover:text-gray-900 text-sm"
              title="Reset column widths to default"
            >
              Reset Layout
            </button>
            <button 
              onClick={() => {
                // Export functionality
                const csvContent = "data:text/csv;charset=utf-8," + 
                  "Name,Passenger ID,Status,Activity,Bookings Today,Total Bookings,Completion Rate,Payment,Risk\n" +
                  filteredPassengers.map(p => 
                    `"${p.name}","${p.passengerId}","${p.statusText}","${p.currentActivity}","${p.bookingsToday}","${p.completedBookings}","${p.completionRate}%","${p.paymentMethod}","${p.fraudRisk}"`
                  ).join("\n");
                
                const encodedUri = encodeURI(csvContent);
                const link = document.createElement("a");
                link.setAttribute("href", encodedUri);
                link.setAttribute("download", "enhanced_passenger_data.csv");
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
              }}
              className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700"
            >
              Export all
            </button>
          </div>
        </div>
      </div>

      {/* Enhanced Table with Fixed Headers */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto" style={{ maxHeight: 'calc(100vh - 420px)' }}>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
              <tr>
                {[
                  { key: 'passenger', label: 'Passenger', tooltip: 'Customer name and unique passenger ID' },
                  { key: 'status', label: 'Status', tooltip: 'Current account status and customer tier' },
                  { key: 'activity', label: 'Activity', tooltip: 'Current customer activity and engagement' },
                  { key: 'today', label: 'Today', tooltip: 'Number of bookings made today' },
                  { key: 'total', label: 'Total', tooltip: 'Total bookings since joining' },
                  { key: 'rate', label: 'Rate %', tooltip: 'Booking completion rate percentage with trend' },
                  { key: 'payment', label: 'Payment', tooltip: 'Primary payment method used' },
                  { key: 'risk', label: 'Risk', tooltip: 'Fraud risk assessment level' },
                  { key: 'actions', label: 'Actions', tooltip: 'Quick actions available for this customer' }
                ].map((column) => (
                  <th
                    key={column.key}
                    className="text-left py-2 px-3 font-medium text-gray-700 text-xs relative border-r border-gray-200 last:border-r-0"
                    style={{ width: columnWidths[column.key as keyof typeof columnWidths] }}
                    title={column.tooltip}
                  >
                    <div className="flex items-center justify-between">
                      <span>{column.label}</span>
                      <div
                        className="absolute top-0 right-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-400 hover:bg-opacity-50 transition-colors"
                        onMouseDown={(e) => handleResizeStart(column.key, e)}
                        title="Drag to resize column"
                      />
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredPassengers.map(passenger => (
                <tr 
                  key={passenger.id} 
                  className={`border-b border-gray-100 hover:bg-blue-50 cursor-pointer transition-colors ${
                    isRecentlyChanged(passenger.id) ? 'bg-yellow-50' : ''
                  }`}
                  onClick={() => handleRowClick(passenger)}
                >
                  <td className="py-2 px-3 border-r border-gray-100 last:border-r-0" style={{ width: columnWidths.passenger }}>
                    <div className="font-medium text-gray-900 text-sm truncate">{passenger.name}</div>
                    <div className="text-xs text-gray-500 truncate">{passenger.passengerId}</div>
                  </td>
                  <td className="py-2 px-3 border-r border-gray-100 last:border-r-0" style={{ width: columnWidths.status }}>
                    <div className="flex items-center space-x-1">
                      <span>{getStatusIcon(passenger.status)}</span>
                      <span 
                        className="text-xs cursor-help truncate" 
                        title={getStatusTooltip(passenger.statusText)}
                      >
                        {passenger.statusText}
                      </span>
                    </div>
                  </td>
                  <td className="py-2 px-3 border-r border-gray-100 last:border-r-0" style={{ width: columnWidths.activity }}>
                    <span 
                      className={`text-xs cursor-help truncate ${
                        passenger.currentActivity.includes('Active') ? 'text-green-600' :
                        passenger.currentActivity.includes('Recently booked') ? 'text-blue-600' :
                        passenger.currentActivity.includes('First week') ? 'text-yellow-600' :
                        passenger.currentActivity.includes('New user') ? 'text-orange-600' :
                        passenger.currentActivity.includes('Suspended') ? 'text-red-600' :
                        passenger.currentActivity.includes('Banned') ? 'text-red-800' :
                        passenger.currentActivity.includes('Inactive') ? 'text-gray-600' :
                        'text-gray-600'
                      }`}
                      title={getActivityTooltip(passenger.currentActivity)}
                    >
                      {passenger.currentActivity}
                    </span>
                  </td>
                  <td className="py-2 px-3 border-r border-gray-100 last:border-r-0" style={{ width: columnWidths.today }}>
                    <span className="font-bold text-gray-900">{passenger.bookingsToday}</span>
                  </td>
                  <td className="py-2 px-3 border-r border-gray-100 last:border-r-0 text-xs" style={{ width: columnWidths.total }}>
                    <div>{passenger.completedBookings.toLocaleString()}</div>
                    <div className="text-xs text-gray-500">₱{passenger.totalSpent.toLocaleString()}</div>
                  </td>
                  <td className="py-2 px-3 border-r border-gray-100 last:border-r-0" style={{ width: columnWidths.rate }}>
                    <span className={`px-2 py-1 rounded text-xs ${getCompletionRateColor(passenger.completionRate)}`}>
                      {passenger.completionRate}%
                      {getTrendIcon(passenger.completionTrend)}
                    </span>
                  </td>
                  <td className="py-2 px-3 border-r border-gray-100 last:border-r-0 text-xs" style={{ width: columnWidths.payment }}>
                    {passenger.paymentMethod}
                  </td>
                  <td className="py-2 px-3 border-r border-gray-100 last:border-r-0" style={{ width: columnWidths.risk }}>
                    <span 
                      className={`px-2 py-1 rounded text-xs cursor-help truncate ${getFraudRiskColor(passenger.fraudRisk)}`}
                      title={passenger.fraudDetails}
                    >
                      {passenger.fraudRisk}
                    </span>
                  </td>
                  <td className="py-2 px-3 border-r border-gray-100 last:border-r-0" style={{ width: columnWidths.actions }}>
                    <div className="flex space-x-1">
                      <button className="p-1 bg-blue-600 text-white rounded hover:bg-blue-700" title="Message">
                        <MessageCircle className="w-3 h-3" />
                      </button>
                      <button className="p-1 bg-red-600 text-white rounded hover:bg-red-700" title="Suspend">
                        <UserX className="w-3 h-3" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default EnhancedPassengerTable;