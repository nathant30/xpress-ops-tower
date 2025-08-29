import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search, RotateCw, ArrowUpDown, MessageCircle, UserX, AlertTriangle, TrendingUp, TrendingDown, ArrowLeft, X, Star } from 'lucide-react';

const EnhancedDriverTable = () => {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('Active');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [sortField, setSortField] = useState('');
  const [sortDirection, setSortDirection] = useState('asc');
  const [selectedDriver, setSelectedDriver] = useState<any>(null);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [recentChanges, setRecentChanges] = useState<{[key: number]: number}>({});

  // Column width state management
  const defaultColumnWidths = {
    driver: 180,
    status: 120,
    activity: 130,
    today: 80,
    total: 100,
    rate: 100,
    service: 80,
    risk: 100,
    actions: 120
  };

  const [columnWidths, setColumnWidths] = useState(defaultColumnWidths);
  const [isResizing, setIsResizing] = useState<string | null>(null);
  const [resizeStartX, setResizeStartX] = useState(0);
  const [resizeStartWidth, setResizeStartWidth] = useState(0);

  // Load saved column widths from localStorage
  useEffect(() => {
    const savedWidths = localStorage.getItem('driverTable_columnWidths');
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
    localStorage.setItem('driverTable_columnWidths', JSON.stringify(columnWidths));
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

  const driversData = [
    {
      id: 1,
      status: 'team-leaders',
      statusText: 'Online now',
      statusTime: '3d ago',
      role: 'Team Leaders',
      name: 'Maria Navarro 1922',
      driverId: 'APP-301922',
      completedTrips: 2484,
      completionRate: 96,
      completionTrend: 'up',
      acceptanceRate: 76,
      cancellationRate: 1.6,
      appliedDate: 'Aug 29, 2025',
      region: 'NCR',
      service: 'TNVS',
      fraudRisk: 'Critical',
      fraudDetails: 'Multiple payment disputes',
      tripsToday: 12,
      currentActivity: 'Available',
      issues: ['Payment Dispute']
    },
    {
      id: 2,
      status: 'on-trip',
      statusText: 'On trip',
      statusTime: null,
      role: 'New (30 days)',
      name: 'Carlo Santos 1507',
      driverId: 'APP-301507',
      completedTrips: 529,
      completionRate: 96,
      completionTrend: 'stable',
      acceptanceRate: 77,
      cancellationRate: 5.6,
      appliedDate: 'Aug 29, 2025',
      region: 'Davao',
      service: 'TAXI',
      fraudRisk: 'Critical',
      fraudDetails: 'Suspicious location patterns',
      tripsToday: 8,
      currentActivity: 'On trip (12m)',
      issues: []
    },
    {
      id: 3,
      status: 'salaried',
      statusText: 'Offline',
      statusTime: '6d ago',
      role: 'Salaried',
      name: 'Liza Santos 1095',
      driverId: 'APP-301095',
      completedTrips: 826,
      completionRate: 87,
      completionTrend: 'down',
      acceptanceRate: 82,
      cancellationRate: 0.5,
      appliedDate: 'Aug 29, 2025',
      region: 'Bicol',
      service: '4W',
      fraudRisk: 'Medium',
      fraudDetails: 'Identity verification needed',
      tripsToday: 0,
      currentActivity: 'Offline 6h',
      issues: ['ID Verification']
    },
    {
      id: 4,
      status: 'online',
      statusText: 'Online now',
      statusTime: null,
      role: 'Salaried',
      name: 'Ramon Cruz 1021',
      driverId: 'APP-301021',
      completedTrips: 224,
      completionRate: 90,
      completionTrend: 'up',
      acceptanceRate: 76,
      cancellationRate: 5.9,
      appliedDate: 'Aug 29, 2025',
      region: 'Baguio',
      service: 'TAXI',
      fraudRisk: 'Medium',
      fraudDetails: 'Rate manipulation detected',
      tripsToday: 15,
      currentActivity: 'Available',
      issues: []
    },
    {
      id: 5,
      status: 'team-leaders',
      statusText: 'Just now',
      statusTime: null,
      role: 'Team Leaders',
      name: 'Juan Flores 211',
      driverId: 'APP-300211',
      completedTrips: 1885,
      completionRate: 88,
      completionTrend: 'down',
      acceptanceRate: 77,
      cancellationRate: 3.8,
      appliedDate: 'Aug 29, 2025',
      region: 'Cebu',
      service: 'TNVS',
      fraudRisk: 'Medium',
      fraudDetails: 'Unusual booking patterns',
      tripsToday: 6,
      currentActivity: 'Break (15m)',
      issues: ['Low Rating']
    },
    {
      id: 6,
      status: 'salaried',
      statusText: 'Just now',
      statusTime: null,
      role: 'Salaried',
      name: 'Grace Reyes 325',
      driverId: 'APP-300325',
      completedTrips: 2256,
      completionRate: 94,
      completionTrend: 'stable',
      acceptanceRate: 83,
      cancellationRate: 6.9,
      appliedDate: 'Aug 29, 2025',
      region: 'Bicol',
      service: 'TNVS',
      fraudRisk: 'Low',
      fraudDetails: 'Clean record',
      tripsToday: 11,
      currentActivity: 'Available',
      issues: []
    },
    {
      id: 7,
      status: 'on-trip',
      statusText: 'On trip',
      statusTime: '2d ago',
      role: 'New (30 days)',
      name: 'Maria Cruz 5',
      driverId: 'APP-300005',
      completedTrips: 2586,
      completionRate: 94,
      completionTrend: 'up',
      acceptanceRate: 84,
      cancellationRate: 3.7,
      appliedDate: 'Aug 29, 2025',
      region: 'Cebu',
      service: 'TNVS',
      fraudRisk: 'Medium',
      fraudDetails: 'Document verification pending',
      tripsToday: 4,
      currentActivity: 'On trip (8m)',
      issues: ['Docs Expired']
    },
    {
      id: 8,
      status: 'team-leaders',
      statusText: 'Online now',
      statusTime: null,
      role: 'Team Leaders',
      name: 'Ramon Navarro 22',
      driverId: 'APP-300022',
      completedTrips: 1879,
      completionRate: 86,
      completionTrend: 'stable',
      acceptanceRate: 75,
      cancellationRate: 4.5,
      appliedDate: 'Aug 29, 2025',
      region: 'Cebu',
      service: '4W',
      fraudRisk: 'Low',
      fraudDetails: 'Regular good standing',
      tripsToday: 9,
      currentActivity: 'Available',
      issues: []
    },
    // Additional drivers for expanded table
    {
      id: 9,
      status: 'pending',
      statusText: 'Pending',
      statusTime: '1d ago',
      role: 'New Application',
      name: 'Roberto Dela Cruz 987',
      driverId: 'APP-300987',
      completedTrips: 0,
      completionRate: 0,
      completionTrend: 'stable',
      acceptanceRate: 0,
      cancellationRate: 0,
      appliedDate: 'Aug 28, 2025',
      region: 'NCR',
      service: 'TNVS',
      fraudRisk: 'Low',
      fraudDetails: 'Application under review',
      tripsToday: 0,
      currentActivity: 'Offline',
      issues: ['Pending Verification']
    },
    {
      id: 10,
      status: 'online',
      statusText: 'Online now',
      statusTime: null,
      role: 'Regular',
      name: 'Ana Marie Tan 456',
      driverId: 'APP-301456',
      completedTrips: 1234,
      completionRate: 92,
      completionTrend: 'up',
      acceptanceRate: 89,
      cancellationRate: 2.1,
      appliedDate: 'Jul 15, 2025',
      region: 'Cebu',
      service: 'TAXI',
      fraudRisk: 'Low',
      fraudDetails: 'Good standing',
      tripsToday: 7,
      currentActivity: 'Idle (15m)',
      issues: []
    },
    {
      id: 11,
      status: 'suspended',
      statusText: 'Suspended',
      statusTime: '5d ago',
      role: 'Regular',
      name: 'Mark Anthony Lee 789',
      driverId: 'APP-301789',
      completedTrips: 567,
      completionRate: 75,
      completionTrend: 'down',
      acceptanceRate: 65,
      cancellationRate: 15.8,
      appliedDate: 'Jun 20, 2025',
      region: 'Davao',
      service: '4W',
      fraudRisk: 'Critical',
      fraudDetails: 'Multiple customer complaints',
      tripsToday: 0,
      currentActivity: 'Suspended',
      issues: ['Customer Complaints', 'High Cancellation']
    },
    {
      id: 12,
      status: 'on-trip',
      statusText: 'On trip',
      statusTime: null,
      role: 'Regular',
      name: 'Jenny Rose Garcia 234',
      driverId: 'APP-301234',
      completedTrips: 1789,
      completionRate: 95,
      completionTrend: 'up',
      acceptanceRate: 91,
      cancellationRate: 1.9,
      appliedDate: 'May 10, 2025',
      region: 'NCR',
      service: 'TNVS',
      fraudRisk: 'Low',
      fraudDetails: 'Excellent record',
      tripsToday: 13,
      currentActivity: 'On trip (25m)',
      issues: []
    },
    {
      id: 13,
      status: 'inactive',
      statusText: 'Inactive',
      statusTime: '14d ago',
      role: 'Regular',
      name: 'Carlos Miguel Santos 567',
      driverId: 'APP-300567',
      completedTrips: 2134,
      completionRate: 88,
      completionTrend: 'stable',
      acceptanceRate: 82,
      cancellationRate: 4.2,
      appliedDate: 'Mar 05, 2025',
      region: 'Baguio',
      service: 'TAXI',
      fraudRisk: 'Medium',
      fraudDetails: 'Long inactive period',
      tripsToday: 0,
      currentActivity: 'Offline 14d',
      issues: ['Long Inactive']
    },
    {
      id: 14,
      status: 'online',
      statusText: 'Just now',
      statusTime: null,
      role: 'Regular',
      name: 'Lisa Mae Rodriguez 890',
      driverId: 'APP-301890',
      completedTrips: 934,
      completionRate: 93,
      completionTrend: 'up',
      acceptanceRate: 87,
      cancellationRate: 3.1,
      appliedDate: 'Apr 18, 2025',
      region: 'Cebu',
      service: 'TNVS',
      fraudRisk: 'Low',
      fraudDetails: 'Good performance',
      tripsToday: 9,
      currentActivity: 'Break (8m)',
      issues: []
    },
    {
      id: 15,
      status: 'banned',
      statusText: 'Banned',
      statusTime: '30d ago',
      role: 'Former Driver',
      name: 'David John Cruz 123',
      driverId: 'APP-300123',
      completedTrips: 89,
      completionRate: 45,
      completionTrend: 'down',
      acceptanceRate: 32,
      cancellationRate: 35.6,
      appliedDate: 'Jan 15, 2025',
      region: 'NCR',
      service: 'TAXI',
      fraudRisk: 'Critical',
      fraudDetails: 'Fraudulent activities detected',
      tripsToday: 0,
      currentActivity: 'Banned',
      issues: ['Fraud', 'Safety Violations']
    },
    {
      id: 16,
      status: 'team-leaders',
      statusText: 'Online now',
      statusTime: null,
      role: 'Team Leaders',
      name: 'Michael Angelo Perez 445',
      driverId: 'APP-301445',
      completedTrips: 3421,
      completionRate: 97,
      completionTrend: 'up',
      acceptanceRate: 94,
      cancellationRate: 0.8,
      appliedDate: 'Dec 01, 2024',
      region: 'Davao',
      service: 'TNVS',
      fraudRisk: 'Low',
      fraudDetails: 'Outstanding performance',
      tripsToday: 18,
      currentActivity: 'Available',
      issues: []
    },
    {
      id: 17,
      status: 'online',
      statusText: 'Online now',
      statusTime: null,
      role: 'Regular',
      name: 'Sarah Jane Lim 678',
      driverId: 'APP-301678',
      completedTrips: 1456,
      completionRate: 89,
      completionTrend: 'stable',
      acceptanceRate: 85,
      cancellationRate: 4.5,
      appliedDate: 'Feb 22, 2025',
      region: 'Bicol',
      service: '4W',
      fraudRisk: 'Medium',
      fraudDetails: 'Minor inconsistencies',
      tripsToday: 5,
      currentActivity: 'Idle (32m)',
      issues: ['Route Deviation']
    },
    {
      id: 18,
      status: 'pending',
      statusText: 'Pending',
      statusTime: '2d ago',
      role: 'New Application',
      name: 'Anthony Paul Rivera 912',
      driverId: 'APP-300912',
      completedTrips: 0,
      completionRate: 0,
      completionTrend: 'stable',
      acceptanceRate: 0,
      cancellationRate: 0,
      appliedDate: 'Aug 27, 2025',
      region: 'Cebu',
      service: 'TAXI',
      fraudRisk: 'Low',
      fraudDetails: 'Document verification pending',
      tripsToday: 0,
      currentActivity: 'Offline',
      issues: ['Document Verification']
    },
    {
      id: 19,
      status: 'salaried',
      statusText: 'Offline',
      statusTime: '4h ago',
      role: 'Salaried',
      name: 'Rosa Maria Torres 345',
      driverId: 'APP-301345',
      completedTrips: 2876,
      completionRate: 91,
      completionTrend: 'stable',
      acceptanceRate: 88,
      cancellationRate: 3.4,
      appliedDate: 'Nov 12, 2024',
      region: 'NCR',
      service: 'TNVS',
      fraudRisk: 'Low',
      fraudDetails: 'Consistent performance',
      tripsToday: 14,
      currentActivity: 'Offline 4h',
      issues: []
    },
    {
      id: 20,
      status: 'on-trip',
      statusText: 'On trip',
      statusTime: null,
      role: 'Regular',
      name: 'Jerome Keith Valdez 678',
      driverId: 'APP-301678',
      completedTrips: 1123,
      completionRate: 94,
      completionTrend: 'up',
      acceptanceRate: 90,
      cancellationRate: 2.7,
      appliedDate: 'Mar 28, 2025',
      region: 'Baguio',
      service: 'TAXI',
      fraudRisk: 'Medium',
      fraudDetails: 'GPS tracking anomalies',
      tripsToday: 8,
      currentActivity: 'On trip (18m)',
      issues: ['GPS Issues']
    },
    {
      id: 21,
      status: 'suspended',
      statusText: 'Suspended',
      statusTime: '7d ago',
      role: 'Regular',
      name: 'Patricia Ann Gomez 901',
      driverId: 'APP-300901',
      completedTrips: 678,
      completionRate: 72,
      completionTrend: 'down',
      acceptanceRate: 68,
      cancellationRate: 18.2,
      appliedDate: 'May 05, 2025',
      region: 'Davao',
      service: '4W',
      fraudRisk: 'Critical',
      fraudDetails: 'Safety protocol violations',
      tripsToday: 0,
      currentActivity: 'Suspended',
      issues: ['Safety Violations', 'Customer Safety']
    },
    {
      id: 22,
      status: 'online',
      statusText: 'Just now',
      statusTime: null,
      role: 'Regular',
      name: 'Kenneth Ray Morales 234',
      driverId: 'APP-301234',
      completedTrips: 1567,
      completionRate: 90,
      completionTrend: 'up',
      acceptanceRate: 86,
      cancellationRate: 3.8,
      appliedDate: 'Jan 20, 2025',
      region: 'Cebu',
      service: 'TNVS',
      fraudRisk: 'Low',
      fraudDetails: 'Good track record',
      tripsToday: 11,
      currentActivity: 'Idle (8m)',
      issues: []
    },
    {
      id: 23,
      status: 'inactive',
      statusText: 'Inactive',
      statusTime: '21d ago',
      role: 'Regular',
      name: 'Michelle Joy Reyes 567',
      driverId: 'APP-300567',
      completedTrips: 1789,
      completionRate: 86,
      completionTrend: 'down',
      acceptanceRate: 79,
      cancellationRate: 6.1,
      appliedDate: 'Oct 15, 2024',
      region: 'Bicol',
      service: 'TAXI',
      fraudRisk: 'Medium',
      fraudDetails: 'Extended inactivity',
      tripsToday: 0,
      currentActivity: 'Offline 21d',
      issues: ['Extended Inactive']
    },
    {
      id: 24,
      status: 'team-leaders',
      statusText: 'Online now',
      statusTime: null,
      role: 'Team Leaders',
      name: 'Alexander James Cruz 890',
      driverId: 'APP-301890',
      completedTrips: 4123,
      completionRate: 98,
      completionTrend: 'up',
      acceptanceRate: 96,
      cancellationRate: 0.5,
      appliedDate: 'Sep 10, 2024',
      region: 'NCR',
      service: 'TNVS',
      fraudRisk: 'Low',
      fraudDetails: 'Exemplary performance',
      tripsToday: 20,
      currentActivity: 'Available',
      issues: []
    },
    {
      id: 25,
      status: 'online',
      statusText: 'Online now',
      statusTime: null,
      role: 'Regular',
      name: 'Stephanie Grace Lim 123',
      driverId: 'APP-301123',
      completedTrips: 2345,
      completionRate: 93,
      completionTrend: 'stable',
      acceptanceRate: 91,
      cancellationRate: 2.4,
      appliedDate: 'Dec 18, 2024',
      region: 'Baguio',
      service: '4W',
      fraudRisk: 'Low',
      fraudDetails: 'Reliable driver',
      tripsToday: 12,
      currentActivity: 'Break (12m)',
      issues: []
    },
    {
      id: 26,
      status: 'pending',
      statusText: 'Pending',
      statusTime: '3d ago',
      role: 'New Application',
      name: 'Christopher John Dela Rosa 456',
      driverId: 'APP-300456',
      completedTrips: 0,
      completionRate: 0,
      completionTrend: 'stable',
      acceptanceRate: 0,
      cancellationRate: 0,
      appliedDate: 'Aug 26, 2025',
      region: 'Davao',
      service: 'TAXI',
      fraudRisk: 'Medium',
      fraudDetails: 'Background check in progress',
      tripsToday: 0,
      currentActivity: 'Offline',
      issues: ['Background Check']
    },
    {
      id: 27,
      status: 'salaried',
      statusText: 'Just now',
      statusTime: null,
      role: 'Salaried',
      name: 'Angelica Marie Santos 789',
      driverId: 'APP-301789',
      completedTrips: 3567,
      completionRate: 95,
      completionTrend: 'up',
      acceptanceRate: 93,
      cancellationRate: 1.7,
      appliedDate: 'Aug 15, 2024',
      region: 'Cebu',
      service: 'TNVS',
      fraudRisk: 'Low',
      fraudDetails: 'Top performer',
      tripsToday: 16,
      currentActivity: 'Idle (45m)',
      issues: []
    },
    {
      id: 28,
      status: 'banned',
      statusText: 'Banned',
      statusTime: '45d ago',
      role: 'Former Driver',
      name: 'Richard Paul Moreno 012',
      driverId: 'APP-300012',
      completedTrips: 234,
      completionRate: 58,
      completionTrend: 'down',
      acceptanceRate: 42,
      cancellationRate: 28.9,
      appliedDate: 'Feb 10, 2025',
      region: 'NCR',
      service: '4W',
      fraudRisk: 'Critical',
      fraudDetails: 'Multiple policy violations',
      tripsToday: 0,
      currentActivity: 'Banned',
      issues: ['Policy Violations', 'Fraud']
    },
    {
      id: 29,
      status: 'online',
      statusText: 'Online now',
      statusTime: null,
      role: 'Regular',
      name: 'Marianne Joy Pascual 345',
      driverId: 'APP-301345',
      completedTrips: 1876,
      completionRate: 91,
      completionTrend: 'stable',
      acceptanceRate: 87,
      cancellationRate: 3.9,
      appliedDate: 'Apr 02, 2025',
      region: 'Bicol',
      service: 'TAXI',
      fraudRisk: 'Low',
      fraudDetails: 'Steady performance',
      tripsToday: 6,
      currentActivity: 'Idle (22m)',
      issues: []
    },
    {
      id: 30,
      status: 'suspended',
      statusText: 'Suspended',
      statusTime: '12d ago',
      role: 'Regular',
      name: 'Jonathan Mark Villanueva 678',
      driverId: 'APP-300678',
      completedTrips: 945,
      completionRate: 78,
      completionTrend: 'down',
      acceptanceRate: 71,
      cancellationRate: 12.4,
      appliedDate: 'Jun 08, 2025',
      region: 'Baguio',
      service: 'TNVS',
      fraudRisk: 'Medium',
      fraudDetails: 'Service quality issues',
      tripsToday: 0,
      currentActivity: 'Suspended',
      issues: ['Service Quality', 'Customer Rating']
    },
    {
      id: 31,
      status: 'inactive',
      statusText: 'Inactive',
      statusTime: '28d ago',
      role: 'Regular',
      name: 'Catherine Rose Bautista 901',
      driverId: 'APP-300901',
      completedTrips: 1345,
      completionRate: 84,
      completionTrend: 'stable',
      acceptanceRate: 78,
      cancellationRate: 5.7,
      appliedDate: 'Sep 25, 2024',
      region: 'Davao',
      service: '4W',
      fraudRisk: 'Medium',
      fraudDetails: 'No recent activity',
      tripsToday: 0,
      currentActivity: 'Offline 28d',
      issues: ['No Recent Activity']
    }
  ];

  const getStatusIcon = (status: string) => {
    if (status === 'online' || status === 'team-leaders') return '🟢';
    if (status === 'on-trip') return '🔵';
    if (status === 'salaried') return '🟡';
    if (status === 'new') return '🟠';
    return '🔴';
  };

  const getCompletionRateColor = (rate: number) => {
    if (rate >= 95) return 'text-green-600 bg-green-50';
    if (rate >= 85) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const getFraudRiskColor = (risk: string) => {
    if (risk === 'Critical') return 'bg-red-100 text-red-800 border border-red-300';
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
      case 'Online now':
        return 'Driver is currently active and available for trips';
      case 'On trip':
        return 'Driver is currently on an active trip';
      case 'Offline':
        return 'Driver has been offline for specified duration';
      case 'Just now':
        return 'Driver recently came online or completed activity';
      case 'Pending':
        return 'New driver awaiting approval or document verification';
      case 'Suspended':
        return 'Driver temporarily suspended due to violations or issues';
      case 'Banned':
        return 'Driver permanently banned from the platform';
      case 'Inactive':
        return 'Driver hasn\'t been active for extended period';
      default:
        return 'Current driver operational status';
    }
  };

  const getActivityTooltip = (activity: string) => {
    if (activity.includes('Available')) {
      return 'Driver is online and ready to accept trip requests';
    } else if (activity.includes('trip')) {
      return 'Driver is currently transporting a passenger';
    } else if (activity.includes('Break')) {
      return 'Driver is taking a scheduled break from active driving';
    } else if (activity.includes('Idle')) {
      return 'Driver is online but hasn\'t accepted trips for specified duration - concerning inactivity';
    } else if (activity.includes('Offline')) {
      return 'Driver has been offline and unavailable for trip requests';
    } else if (activity.includes('Suspended')) {
      return 'Driver account is temporarily suspended and cannot accept trips';
    } else if (activity.includes('Banned')) {
      return 'Driver is permanently banned from the platform';
    } else {
      return 'Current driver activity status and duration';
    }
  };

  // Get contextual status options based on selected driver type
  const getContextualStatusOptions = (driverType: string) => {
    switch (driverType) {
      case 'Active':
        return [
          { 
            id: 'All', 
            label: 'All Active', 
            count: driversData.filter(d => 
              d.status !== 'pending' && 
              d.status !== 'suspended' && 
              d.status !== 'inactive' && 
              d.status !== 'banned'
            ).length,
            tooltip: 'Show all active drivers regardless of current status'
          },
          { 
            id: 'Online', 
            label: 'Online', 
            count: driversData.filter(d => 
              (d.status === 'online' || d.status === 'team-leaders') &&
              d.status !== 'pending' && d.status !== 'suspended' && 
              d.status !== 'inactive' && d.status !== 'banned'
            ).length,
            tooltip: 'Active drivers currently available for trips'
          },
          { 
            id: 'On Trip', 
            label: 'On Trip', 
            count: driversData.filter(d => 
              d.status === 'on-trip' &&
              d.status !== 'pending' && d.status !== 'suspended' && 
              d.status !== 'inactive' && d.status !== 'banned'
            ).length,
            tooltip: 'Active drivers currently on trips'
          },
          { 
            id: 'Team Leaders', 
            label: 'Team Leaders', 
            count: driversData.filter(d => d.status === 'team-leaders').length,
            tooltip: 'Senior active drivers with leadership responsibilities'
          },
          { 
            id: 'Salaried', 
            label: 'Salaried', 
            count: driversData.filter(d => d.status === 'salaried').length,
            tooltip: 'Active drivers on fixed salary contracts'
          },
          { 
            id: 'Issues', 
            label: 'Issues', 
            count: driversData.filter(d => 
              d.issues.length > 0 && 
              d.status !== 'pending' && d.status !== 'suspended' && 
              d.status !== 'inactive' && d.status !== 'banned'
            ).length,
            tooltip: 'Active drivers with minor issues or violations'
          }
        ];
      
      case 'Pending':
        return [
          { 
            id: 'All', 
            label: 'All Pending', 
            count: driversData.filter(d => d.status === 'pending').length,
            tooltip: 'Show all pending driver applications'
          },
          { 
            id: 'Document Review', 
            label: 'Doc Review', 
            count: driversData.filter(d => 
              d.status === 'pending' && 
              d.issues.some(issue => issue.includes('Verification') || issue.includes('Document'))
            ).length,
            tooltip: 'Pending drivers awaiting document verification'
          },
          { 
            id: 'Background Check', 
            label: 'Background', 
            count: driversData.filter(d => 
              d.status === 'pending' && 
              d.issues.some(issue => issue.includes('Background'))
            ).length,
            tooltip: 'Pending drivers undergoing background verification'
          },
          { 
            id: 'Training Required', 
            label: 'Training', 
            count: driversData.filter(d => 
              d.status === 'pending' && 
              d.completedTrips === 0
            ).length,
            tooltip: 'Pending drivers who need initial training'
          }
        ];
      
      case 'Suspended':
        return [
          { 
            id: 'All', 
            label: 'All Suspended', 
            count: driversData.filter(d => d.status === 'suspended').length,
            tooltip: 'Show all suspended drivers'
          },
          { 
            id: 'Safety Violations', 
            label: 'Safety', 
            count: driversData.filter(d => 
              d.status === 'suspended' && 
              d.issues.some(issue => issue.includes('Safety'))
            ).length,
            tooltip: 'Drivers suspended for safety violations'
          },
          { 
            id: 'Service Quality', 
            label: 'Service', 
            count: driversData.filter(d => 
              d.status === 'suspended' && 
              d.issues.some(issue => issue.includes('Service') || issue.includes('Rating') || issue.includes('Customer'))
            ).length,
            tooltip: 'Drivers suspended for service quality issues'
          },
          { 
            id: 'Policy Violations', 
            label: 'Policy', 
            count: driversData.filter(d => 
              d.status === 'suspended' && 
              d.issues.some(issue => issue.includes('Policy') || issue.includes('Cancellation'))
            ).length,
            tooltip: 'Drivers suspended for policy violations'
          }
        ];
      
      case 'Inactive':
        return [
          { 
            id: 'All', 
            label: 'All Inactive', 
            count: driversData.filter(d => d.status === 'inactive').length,
            tooltip: 'Show all inactive drivers'
          },
          { 
            id: 'Short Term', 
            label: 'Short Term', 
            count: driversData.filter(d => 
              d.status === 'inactive' && 
              d.currentActivity.includes('14d')
            ).length,
            tooltip: 'Drivers inactive for 1-14 days'
          },
          { 
            id: 'Long Term', 
            label: 'Long Term', 
            count: driversData.filter(d => 
              d.status === 'inactive' && 
              (d.currentActivity.includes('21d') || d.currentActivity.includes('28d'))
            ).length,
            tooltip: 'Drivers inactive for more than 14 days'
          },
          { 
            id: 'No Recent Activity', 
            label: 'No Activity', 
            count: driversData.filter(d => 
              d.status === 'inactive' && 
              d.issues.some(issue => issue.includes('Recent Activity') || issue.includes('Inactive'))
            ).length,
            tooltip: 'Drivers with extended periods of no activity'
          }
        ];
      
      case 'Banned':
        return [
          { 
            id: 'All', 
            label: 'All Banned', 
            count: driversData.filter(d => d.status === 'banned').length,
            tooltip: 'Show all permanently banned drivers'
          },
          { 
            id: 'Fraud', 
            label: 'Fraud', 
            count: driversData.filter(d => 
              d.status === 'banned' && 
              d.issues.some(issue => issue.includes('Fraud'))
            ).length,
            tooltip: 'Drivers banned for fraudulent activities'
          },
          { 
            id: 'Safety Violations', 
            label: 'Safety', 
            count: driversData.filter(d => 
              d.status === 'banned' && 
              d.issues.some(issue => issue.includes('Safety'))
            ).length,
            tooltip: 'Drivers banned for serious safety violations'
          },
          { 
            id: 'Policy Violations', 
            label: 'Policy', 
            count: driversData.filter(d => 
              d.status === 'banned' && 
              d.issues.some(issue => issue.includes('Policy'))
            ).length,
            tooltip: 'Drivers banned for multiple policy violations'
          }
        ];
      
      default:
        return [
          { 
            id: 'All', 
            label: 'All', 
            count: driversData.length,
            tooltip: 'Show all drivers regardless of status'
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

  const handleRowClick = (driver: any) => {
    router.push('/driver-profile');
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

  // Filter and sort drivers with contextual logic
  const filteredDrivers = driversData
    .filter(driver => {
      // Search filter
      const matchesSearch = searchTerm === '' || 
        driver.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        driver.driverId.toLowerCase().includes(searchTerm.toLowerCase());

      // Type filter (primary filter)
      let matchesType = false;
      switch (selectedType) {
        case 'Active':
          matchesType = driver.status !== 'pending' && 
                      driver.status !== 'suspended' && 
                      driver.status !== 'inactive' && 
                      driver.status !== 'banned';
          break;
        case 'Pending':
          matchesType = driver.status === 'pending';
          break;
        case 'Suspended':
          matchesType = driver.status === 'suspended';
          break;
        case 'Inactive':
          matchesType = driver.status === 'inactive';
          break;
        case 'Banned':
          matchesType = driver.status === 'banned';
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
            if (selectedStatus === 'Online') {
              matchesStatus = (driver.status === 'online' || driver.status === 'team-leaders');
            } else if (selectedStatus === 'On Trip') {
              matchesStatus = driver.status === 'on-trip';
            } else if (selectedStatus === 'Team Leaders') {
              matchesStatus = driver.status === 'team-leaders';
            } else if (selectedStatus === 'Salaried') {
              matchesStatus = driver.status === 'salaried';
            } else if (selectedStatus === 'Issues') {
              matchesStatus = driver.issues.length > 0;
            }
            break;
          
          case 'Pending':
            if (selectedStatus === 'Document Review') {
              matchesStatus = driver.issues.some(issue => 
                issue.includes('Verification') || issue.includes('Document')
              );
            } else if (selectedStatus === 'Background Check') {
              matchesStatus = driver.issues.some(issue => 
                issue.includes('Background')
              );
            } else if (selectedStatus === 'Training Required') {
              matchesStatus = driver.completedTrips === 0;
            }
            break;
          
          case 'Suspended':
            if (selectedStatus === 'Safety Violations') {
              matchesStatus = driver.issues.some(issue => 
                issue.includes('Safety')
              );
            } else if (selectedStatus === 'Service Quality') {
              matchesStatus = driver.issues.some(issue => 
                issue.includes('Service') || issue.includes('Rating') || issue.includes('Customer')
              );
            } else if (selectedStatus === 'Policy Violations') {
              matchesStatus = driver.issues.some(issue => 
                issue.includes('Policy') || issue.includes('Cancellation')
              );
            }
            break;
          
          case 'Inactive':
            if (selectedStatus === 'Short Term') {
              matchesStatus = driver.currentActivity.includes('14d');
            } else if (selectedStatus === 'Long Term') {
              matchesStatus = driver.currentActivity.includes('21d') || driver.currentActivity.includes('28d');
            } else if (selectedStatus === 'No Recent Activity') {
              matchesStatus = driver.issues.some(issue => 
                issue.includes('Recent Activity') || issue.includes('Inactive')
              );
            }
            break;
          
          case 'Banned':
            if (selectedStatus === 'Fraud') {
              matchesStatus = driver.issues.some(issue => 
                issue.includes('Fraud')
              );
            } else if (selectedStatus === 'Safety Violations') {
              matchesStatus = driver.issues.some(issue => 
                issue.includes('Safety')
              );
            } else if (selectedStatus === 'Policy Violations') {
              matchesStatus = driver.issues.some(issue => 
                issue.includes('Policy')
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

  const DriverProfile = ({ driver, onClose }: { driver: any, onClose: () => void }) => (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex">
      {/* Left Sidebar */}
      <div className="w-80 bg-white p-6 overflow-y-auto">
        <button onClick={onClose} className="flex items-center text-blue-600 mb-6">
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back
        </button>
        
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-full mx-auto mb-3 bg-gray-200 flex items-center justify-center">
            <span className="text-2xl font-bold text-gray-500">{driver.name.charAt(0)}</span>
          </div>
          <h2 className="font-bold text-lg">{driver.name}</h2>
          <p className="text-gray-500 text-sm">+639069780294</p>
          <div className="flex justify-center items-center space-x-4 mt-2 text-xs text-gray-500">
            <span>ACTIVE DATE: {driver.appliedDate}</span>
            <span>LAST ACTIVE: {driver.currentActivity}</span>
          </div>
        </div>

        <div className="space-y-4 text-sm">
          <div>
            <label className="text-gray-500">Operator:</label>
            <p>Xpress</p>
          </div>
          
          <div>
            <label className="text-gray-500">Xpress Services:</label>
            <span className="inline-flex items-center bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs ml-2">
              🏍️ Ride - Moto
            </span>
          </div>

          <div>
            <label className="text-gray-500">Campaigns:</label>
            <p>Xpress 50 <span className="text-blue-600">ⓘ</span></p>
          </div>

          <div>
            <label className="text-gray-500">Gender:</label>
            <p>Male</p>
          </div>

          <div>
            <label className="text-gray-500">Date of Birth:</label>
            <p>22 February 1978</p>
          </div>

          <div>
            <label className="text-gray-500">Email:</label>
            <p>{driver.name.toLowerCase().replace(' ', '.')}@gmail.com</p>
          </div>

          <div>
            <label className="text-gray-500">Home Address:</label>
            <p>Metro Manila</p>
          </div>

          <div>
            <label className="text-gray-500">Was referred?</label>
            <p>No</p>
          </div>

          <div>
            <label className="text-gray-500">Referrer:</label>
            <p>N/A</p>
          </div>

          <div>
            <label className="text-gray-500">Xpress Gears:</label>
            <p>N/A</p>
          </div>
        </div>

        <div className="mt-6 space-y-2">
          <button className="w-full bg-gray-200 text-gray-700 py-2 px-4 rounded">
            Add to Campaign
          </button>
          <button className="w-full bg-teal-600 text-white py-2 px-4 rounded">
            Send Update Push
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 bg-white p-6 overflow-y-auto">
        <div className="flex justify-between items-start mb-6">
          <div className="flex space-x-8 border-b">
            {['Insights', 'Legal Docs', 'Vehicles', 'Commerce', 'Bookings', 'Disciplinary', 'Wallet', 'Chat', 'App History', 'Training'].map(tab => (
              <button
                key={tab}
                className={`pb-3 px-1 border-b-2 text-sm ${tab === 'Insights' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500'}`}
              >
                {tab}
              </button>
            ))}
          </div>
          <div className="text-sm text-gray-500">Driver ID: {driver.driverId.replace('APP-', '')}</div>
        </div>

        <div className="grid grid-cols-2 gap-8">
          {/* Driver Performance */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold">Driver Performance</h3>
              <input 
                type="date" 
                defaultValue="2023-12-08"
                className="text-sm border rounded px-2 py-1"
              />
            </div>
            
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-blue-100 p-4 rounded text-center">
                <div className="text-2xl font-bold text-blue-600">{driver.completionRate}%</div>
                <div className="text-sm text-gray-600">Completion Rate</div>
                <div className="text-xs text-gray-500">{driver.completedTrips} trips</div>
              </div>
              <div className="bg-blue-100 p-4 rounded text-center">
                <div className="text-2xl font-bold text-blue-600">{driver.acceptanceRate}%</div>
                <div className="text-sm text-gray-600">Acceptance Rate</div>
                <div className="text-xs text-gray-500">{driver.tripsToday} today</div>
              </div>
              <div className="bg-blue-100 p-4 rounded text-center">
                <div className="text-2xl font-bold text-blue-600">{driver.cancellationRate}%</div>
                <div className="text-sm text-gray-600">Cancellation Rate</div>
                <div className="text-xs text-gray-500">This month</div>
              </div>
            </div>

            {/* Performance badges */}
            <div className="grid grid-cols-4 gap-3 mb-6">
              {[
                { icon: '💎', title: 'Excellent Service', value: '0%' },
                { icon: '📍', title: 'Expert Navigation', value: '0%' },
                { icon: '👔', title: 'Neat and Tidy', value: '0%' },
                { icon: '💬', title: 'Great Conversation', value: '0%' },
                { icon: '🎵', title: 'Awesome Music', value: '0%' },
                { icon: '🚗', title: 'Cool Vehicle', value: '0%' },
                { icon: '🌙', title: 'Late Night Hero', value: '0%' },
                { icon: '😄', title: 'Entertaining Driver', value: '0%' }
              ].map(badge => (
                <div key={badge.title} className="text-center">
                  <div className="w-16 h-16 bg-teal-600 rounded-full flex items-center justify-center text-white text-2xl mx-auto mb-1">
                    {badge.icon}
                  </div>
                  <div className="text-xs text-gray-600">{badge.title}</div>
                  <div className="font-semibold">{badge.value}</div>
                </div>
              ))}
            </div>

            {/* Active Hours */}
            <div>
              <h4 className="font-semibold mb-2">Active Hours</h4>
              <div className="flex justify-between text-sm text-gray-600 mb-2">
                <span>Avg for Period: 1.54 hrs per day</span>
                <span>Total for Period: 1.5 hours</span>
              </div>
              <div className="bg-gray-200 h-2 rounded">
                <div className="bg-teal-600 h-2 rounded" style={{width: '20%'}}></div>
              </div>
            </div>
          </div>

          {/* Customer Review */}
          <div>
            <h3 className="font-semibold mb-4">Customer Review</h3>
            <div className="text-center text-gray-500 mt-8">
              <p>No customer reviews available</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Show profile modal if driver is selected
  if (selectedDriver) {
    return <DriverProfile driver={selectedDriver} onClose={() => setSelectedDriver(null)} />;
  }

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

        {/* Driver Type Filters */}
        <div className="flex items-center space-x-4 mb-3">
          <span className="text-sm font-medium text-gray-700">Driver Type:</span>
          {[
            { 
              id: 'Active', 
              label: 'Active', 
              count: driversData.filter(d => 
                d.status !== 'pending' && 
                d.status !== 'suspended' && 
                d.status !== 'inactive' && 
                d.status !== 'banned'
              ).length,
              tooltip: 'Drivers currently working and available for dispatch'
            },
            { 
              id: 'Pending', 
              label: 'Pending', 
              count: driversData.filter(d => d.status === 'pending').length,
              tooltip: 'New drivers awaiting approval or document verification'
            },
            { 
              id: 'Suspended', 
              label: 'Suspended', 
              count: driversData.filter(d => d.status === 'suspended').length,
              tooltip: 'Drivers temporarily suspended due to violations or issues'
            },
            { 
              id: 'Inactive', 
              label: 'Inactive', 
              count: driversData.filter(d => d.status === 'inactive').length,
              tooltip: 'Drivers who haven\'t been active for extended period'
            },
            { 
              id: 'Banned', 
              label: 'Banned', 
              count: driversData.filter(d => d.status === 'banned').length,
              tooltip: 'Drivers permanently banned from the platform'
            }
          ].map(type => (
            <button
              key={type.id}
              onClick={() => {
                setSelectedType(type.id);
                setSelectedStatus('All'); // Reset status when driver type changes
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
                  "Name,Driver ID,Status,Activity,Trips Today,Total Trips,Completion Rate,Service,Risk\n" +
                  filteredDrivers.map(d => 
                    `"${d.name}","${d.driverId}","${d.statusText}","${d.currentActivity}","${d.tripsToday}","${d.completedTrips}","${d.completionRate}%","${d.service}","${d.fraudRisk}"`
                  ).join("\n");
                
                const encodedUri = encodeURI(csvContent);
                const link = document.createElement("a");
                link.setAttribute("href", encodedUri);
                link.setAttribute("download", "enhanced_driver_data.csv");
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
                  { key: 'driver', label: 'Driver', tooltip: 'Driver name and unique application ID' },
                  { key: 'status', label: 'Status', tooltip: 'Current operational status and role designation' },
                  { key: 'activity', label: 'Activity', tooltip: 'Current driver activity and time duration' },
                  { key: 'today', label: 'Today', tooltip: 'Number of completed trips today' },
                  { key: 'total', label: 'Total', tooltip: 'Total completed trips since joining' },
                  { key: 'rate', label: 'Rate %', tooltip: 'Trip completion rate percentage with trend indicator' },
                  { key: 'service', label: 'Service', tooltip: 'Type of service provided (TNVS, TAXI, 4W)' },
                  { key: 'risk', label: 'Risk', tooltip: 'Fraud risk assessment level' },
                  { key: 'actions', label: 'Actions', tooltip: 'Quick actions available for this driver' }
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
              {filteredDrivers.map(driver => (
                <tr 
                  key={driver.id} 
                  className={`border-b border-gray-100 hover:bg-blue-50 cursor-pointer transition-colors ${
                    isRecentlyChanged(driver.id) ? 'bg-yellow-50' : ''
                  }`}
                  onClick={() => handleRowClick(driver)}
                >
                  <td className="py-2 px-3 border-r border-gray-100 last:border-r-0" style={{ width: columnWidths.driver }}>
                    <div className="font-medium text-gray-900 text-sm truncate">{driver.name}</div>
                    <div className="text-xs text-gray-500 truncate">{driver.driverId}</div>
                  </td>
                  <td className="py-2 px-3 border-r border-gray-100 last:border-r-0" style={{ width: columnWidths.status }}>
                    <div className="flex items-center space-x-1">
                      <span>{getStatusIcon(driver.status)}</span>
                      <span 
                        className="text-xs cursor-help truncate" 
                        title={getStatusTooltip(driver.statusText)}
                      >
                        {driver.statusText}
                      </span>
                    </div>
                  </td>
                  <td className="py-2 px-3 border-r border-gray-100 last:border-r-0" style={{ width: columnWidths.activity }}>
                    <span 
                      className={`text-xs cursor-help truncate ${
                        driver.currentActivity.includes('Available') ? 'text-green-600' :
                        driver.currentActivity.includes('trip') ? 'text-blue-600' :
                        driver.currentActivity.includes('Break') ? 'text-yellow-600' :
                        driver.currentActivity.includes('Idle') ? 'text-orange-600' :
                        driver.currentActivity.includes('Suspended') ? 'text-red-600' :
                        driver.currentActivity.includes('Banned') ? 'text-red-800' :
                        'text-gray-600'
                      }`}
                      title={getActivityTooltip(driver.currentActivity)}
                    >
                      {driver.currentActivity}
                    </span>
                  </td>
                  <td className="py-2 px-3 border-r border-gray-100 last:border-r-0" style={{ width: columnWidths.today }}>
                    <span className="font-bold text-gray-900">{driver.tripsToday}</span>
                  </td>
                  <td className="py-2 px-3 border-r border-gray-100 last:border-r-0 text-xs" style={{ width: columnWidths.total }}>
                    {driver.completedTrips.toLocaleString()}
                  </td>
                  <td className="py-2 px-3 border-r border-gray-100 last:border-r-0" style={{ width: columnWidths.rate }}>
                    <span className={`px-2 py-1 rounded text-xs ${getCompletionRateColor(driver.completionRate)}`}>
                      {driver.completionRate}%
                      {getTrendIcon(driver.completionTrend)}
                    </span>
                  </td>
                  <td className="py-2 px-3 border-r border-gray-100 last:border-r-0 text-xs" style={{ width: columnWidths.service }}>
                    {driver.service}
                  </td>
                  <td className="py-2 px-3 border-r border-gray-100 last:border-r-0" style={{ width: columnWidths.risk }}>
                    <span 
                      className={`px-2 py-1 rounded text-xs cursor-help truncate ${getFraudRiskColor(driver.fraudRisk)}`}
                      title={driver.fraudDetails}
                    >
                      {driver.fraudRisk}
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

export default EnhancedDriverTable;