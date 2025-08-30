import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Search, RotateCw, ArrowUpDown, MessageCircle, UserX, AlertTriangle, 
  TrendingUp, TrendingDown, ArrowLeft, X, Star, Shield, ShieldAlert, 
  ShieldCheck, Eye, Brain, Users, Flag, Ban, Car, Navigation, UserCheck,
  Clock, DollarSign, Activity, Zap, MapPin, FileX
} from 'lucide-react';
import { fraudMockData, getFraudRiskColor, getFraudRiskBadge, getInvestigationStatusBadge } from '@/lib/fraudMockData';
import { logger } from '@/lib/security/productionLogger';

const EnhancedDriverTable = () => {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('Active');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [riskFilter, setRiskFilter] = useState('All');
  const [investigationFilter, setInvestigationFilter] = useState('All');
  const [sortField, setSortField] = useState('');
  const [sortDirection, setSortDirection] = useState('asc');
  const [selectedDriver, setSelectedDriver] = useState<any>(null);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [recentChanges, setRecentChanges] = useState<{[key: number]: number}>({});

  // Column width state management with fraud columns
  const defaultColumnWidths = {
    driver: 180,
    status: 120,
    fraudRisk: 110,
    crossSystem: 120,
    activity: 130,
    today: 80,
    total: 100,
    rate: 100,
    service: 80,
    alerts: 70,
    investigation: 90,
    actions: 140
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
        logger.warn('Failed to parse saved column widths', { component: 'EnhancedDriverTableWithFraud' });
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
      // Simulate changes focusing on high-risk drivers
      if (Math.random() < 0.3) {
        const randomId = Math.floor(Math.random() * 15) + 1;
        setRecentChanges(prev => ({...prev, [randomId]: Date.now()}));
      }
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // Enhanced drivers data with fraud detection integration
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
      fraudRiskScore: 87.3,
      crossSystemRisk: 85.2,
      operationalRisk: 72.3,
      mlConfidence: 0.94,
      collusionSuspected: true,
      activeAlerts: 5,
      underInvestigation: true,
      investigationStatus: 'investigating',
      fraudDetails: 'Multiple payment disputes, collusion suspected',
      tripsToday: 12,
      currentActivity: 'Available',
      issues: ['Payment Dispute', 'Collusion Alert']
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
      fraudRisk: 'Medium',
      fraudRiskScore: 45.8,
      crossSystemRisk: 41.2,
      operationalRisk: 38.5,
      mlConfidence: 0.67,
      collusionSuspected: false,
      activeAlerts: 2,
      underInvestigation: false,
      investigationStatus: 'monitoring',
      fraudDetails: 'Regular monitoring - medium risk patterns',
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
      fraudRisk: 'Low',
      fraudRiskScore: 25.3,
      crossSystemRisk: 18.7,
      operationalRisk: 15.2,
      mlConfidence: 0.82,
      collusionSuspected: false,
      activeAlerts: 0,
      underInvestigation: false,
      investigationStatus: 'clear',
      fraudDetails: 'Clean record - low risk profile',
      tripsToday: 0,
      currentActivity: 'Offline 6h',
      issues: []
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
      fraudRisk: 'High',
      fraudRiskScore: 72.1,
      crossSystemRisk: 68.4,
      operationalRisk: 55.2,
      mlConfidence: 0.78,
      collusionSuspected: true,
      activeAlerts: 3,
      underInvestigation: true,
      investigationStatus: 'investigating',
      fraudDetails: 'Route manipulation detected, suspicious passenger patterns',
      tripsToday: 15,
      currentActivity: 'Available',
      issues: ['Route Manipulation']
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
      fraudRiskScore: 52.3,
      crossSystemRisk: 48.7,
      operationalRisk: 45.1,
      mlConfidence: 0.71,
      collusionSuspected: false,
      activeAlerts: 1,
      underInvestigation: false,
      investigationStatus: 'monitoring',
      fraudDetails: 'Unusual booking patterns, rating inconsistencies',
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
      fraudRiskScore: 18.7,
      crossSystemRisk: 22.1,
      operationalRisk: 25.8,
      mlConfidence: 0.89,
      collusionSuspected: false,
      activeAlerts: 0,
      underInvestigation: false,
      investigationStatus: 'clear',
      fraudDetails: 'Clean record, excellent performance',
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
      fraudRiskScore: 38.9,
      crossSystemRisk: 35.2,
      operationalRisk: 31.5,
      mlConfidence: 0.65,
      collusionSuspected: false,
      activeAlerts: 1,
      underInvestigation: false,
      investigationStatus: 'monitoring',
      fraudDetails: 'Document verification pending, monitoring required',
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
      fraudRiskScore: 12.4,
      crossSystemRisk: 15.8,
      operationalRisk: 19.2,
      mlConfidence: 0.91,
      collusionSuspected: false,
      activeAlerts: 0,
      underInvestigation: false,
      investigationStatus: 'clear',
      fraudDetails: 'Regular good standing, trusted driver',
      tripsToday: 9,
      currentActivity: 'Available',
      issues: []
    }
  ];

  const getRiskLevelFromScore = (score: number): string => {
    if (score >= 80) return 'critical';
    if (score >= 60) return 'high';
    if (score >= 40) return 'medium';
    return 'low';
  };

  const getStatusBadge = (investigationStatus: string) => {
    switch (investigationStatus) {
      case 'clear':
        return { icon: ShieldCheck, color: 'text-green-600', bg: 'bg-green-50', label: 'Clear' };
      case 'monitoring':
        return { icon: Eye, color: 'text-yellow-600', bg: 'bg-yellow-50', label: 'Monitoring' };
      case 'investigating':
        return { icon: ShieldAlert, color: 'text-red-600', bg: 'bg-red-50', label: 'Investigating' };
      default:
        return { icon: Shield, color: 'text-gray-600', bg: 'bg-gray-50', label: investigationStatus };
    }
  };

  // Filtering logic with fraud filters
  const filteredDrivers = driversData.filter(driver => {
    const matchesSearch = searchTerm === '' || 
      driver.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      driver.driverId.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType = selectedType === 'All' || 
      (selectedType === 'Active' && ['team-leaders', 'online', 'on-trip', 'salaried'].includes(driver.status)) ||
      (selectedType === 'Inactive' && ['suspended', 'inactive', 'pending'].includes(driver.status));

    const matchesStatus = selectedStatus === 'All' || driver.status === selectedStatus.toLowerCase();
    
    const riskLevel = getRiskLevelFromScore(driver.fraudRiskScore);
    const matchesRisk = riskFilter === 'All' || riskLevel === riskFilter.toLowerCase();
    
    const matchesInvestigation = investigationFilter === 'All' || driver.investigationStatus === investigationFilter.toLowerCase();

    return matchesSearch && matchesType && matchesStatus && matchesRisk && matchesInvestigation;
  });

  // Sorting logic
  const sortedDrivers = React.useMemo(() => {
    if (!sortField) return filteredDrivers;

    return [...filteredDrivers].sort((a, b) => {
      let aValue, bValue;

      switch (sortField) {
        case 'name':
          aValue = a.name;
          bValue = b.name;
          break;
        case 'fraudRisk':
          aValue = a.fraudRiskScore;
          bValue = b.fraudRiskScore;
          break;
        case 'crossSystemRisk':
          aValue = a.crossSystemRisk;
          bValue = b.crossSystemRisk;
          break;
        case 'alerts':
          aValue = a.activeAlerts;
          bValue = b.activeAlerts;
          break;
        case 'completedTrips':
          aValue = a.completedTrips;
          bValue = b.completedTrips;
          break;
        case 'completionRate':
          aValue = a.completionRate;
          bValue = b.completionRate;
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredDrivers, sortField, sortDirection]);

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

  // Column resize handlers
  const handleMouseDown = (column: string, e: React.MouseEvent) => {
    setIsResizing(column);
    setResizeStartX(e.clientX);
    setResizeStartWidth(columnWidths[column as keyof typeof columnWidths]);
    e.preventDefault();
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isResizing) {
      const diff = e.clientX - resizeStartX;
      const newWidth = Math.max(50, resizeStartWidth + diff);
      setColumnWidths(prev => ({
        ...prev,
        [isResizing]: newWidth
      }));
    }
  };

  const handleMouseUp = () => {
    setIsResizing(null);
  };

  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isResizing, resizeStartX, resizeStartWidth]);

  return (
    <div className="space-y-6">
      {/* Enhanced Header with Fraud Insights */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Enhanced Driver Management</h1>
          <p className="text-gray-600">Comprehensive fraud detection and performance monitoring</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-sm text-gray-500">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </div>
          <button 
            onClick={() => setLastUpdated(new Date())}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <RotateCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Enhanced Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          {/* Search */}
          <div className="lg:col-span-2 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search drivers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Type Filter */}
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="All">All Types</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="All">All Status</option>
            <option value="Online">Online</option>
            <option value="On-trip">On Trip</option>
            <option value="Offline">Offline</option>
            <option value="Suspended">Suspended</option>
          </select>

          {/* Fraud Risk Filter */}
          <select
            value={riskFilter}
            onChange={(e) => setRiskFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="All">All Risk Levels</option>
            <option value="Critical">Critical Risk</option>
            <option value="High">High Risk</option>
            <option value="Medium">Medium Risk</option>
            <option value="Low">Low Risk</option>
          </select>

          {/* Investigation Filter */}
          <select
            value={investigationFilter}
            onChange={(e) => setInvestigationFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="All">All Investigation Status</option>
            <option value="Clear">Clear</option>
            <option value="Monitoring">Monitoring</option>
            <option value="Investigating">Under Investigation</option>
          </select>
        </div>

        {/* Enhanced Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4 pt-4 border-t">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{filteredDrivers.length}</div>
            <div className="text-sm text-gray-600">Total Drivers</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {filteredDrivers.filter(d => ['team-leaders', 'online', 'on-trip'].includes(d.status)).length}
            </div>
            <div className="text-sm text-gray-600">Online</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">
              {filteredDrivers.filter(d => d.fraudRiskScore >= 80).length}
            </div>
            <div className="text-sm text-gray-600">Critical Risk</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">
              {filteredDrivers.filter(d => d.fraudRiskScore >= 60 && d.fraudRiskScore < 80).length}
            </div>
            <div className="text-sm text-gray-600">High Risk</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">
              {filteredDrivers.filter(d => d.underInvestigation).length}
            </div>
            <div className="text-sm text-gray-600">Under Investigation</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {filteredDrivers.filter(d => d.activeAlerts > 0).length}
            </div>
            <div className="text-sm text-gray-600">Active Alerts</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">
              {filteredDrivers.filter(d => d.collusionSuspected).length}
            </div>
            <div className="text-sm text-gray-600">Collusion Suspected</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-emerald-600">
              {filteredDrivers.filter(d => d.investigationStatus === 'clear').length}
            </div>
            <div className="text-sm text-gray-600">Clear Status</div>
          </div>
        </div>
      </div>

      {/* Enhanced Table */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {/* Driver Info */}
                <th 
                  className="text-left py-4 px-4 font-semibold text-gray-900 border-r border-gray-200 relative"
                  style={{ width: columnWidths.driver }}
                >
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleSort('name')} className="flex items-center gap-1">
                      Driver Info
                      <ArrowUpDown className="w-4 h-4" />
                    </button>
                  </div>
                  <div 
                    className="absolute right-0 top-0 w-2 h-full cursor-col-resize hover:bg-blue-200 transition-colors"
                    onMouseDown={(e) => handleMouseDown('driver', e)}
                  />
                </th>

                {/* Status */}
                <th 
                  className="text-left py-4 px-4 font-semibold text-gray-900 border-r border-gray-200 relative"
                  style={{ width: columnWidths.status }}
                >
                  Status
                  <div 
                    className="absolute right-0 top-0 w-2 h-full cursor-col-resize hover:bg-blue-200 transition-colors"
                    onMouseDown={(e) => handleMouseDown('status', e)}
                  />
                </th>

                {/* Fraud Risk */}
                <th 
                  className="text-left py-4 px-4 font-semibold text-gray-900 border-r border-gray-200 relative"
                  style={{ width: columnWidths.fraudRisk }}
                >
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleSort('fraudRisk')} className="flex items-center gap-1">
                      <Shield className="w-4 h-4" />
                      Fraud Risk
                      <ArrowUpDown className="w-4 h-4" />
                    </button>
                  </div>
                  <div 
                    className="absolute right-0 top-0 w-2 h-full cursor-col-resize hover:bg-blue-200 transition-colors"
                    onMouseDown={(e) => handleMouseDown('fraudRisk', e)}
                  />
                </th>

                {/* Cross-System */}
                <th 
                  className="text-left py-4 px-4 font-semibold text-gray-900 border-r border-gray-200 relative"
                  style={{ width: columnWidths.crossSystem }}
                >
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleSort('crossSystemRisk')} className="flex items-center gap-1">
                      <Activity className="w-4 h-4" />
                      Cross-System
                      <ArrowUpDown className="w-4 h-4" />
                    </button>
                  </div>
                  <div 
                    className="absolute right-0 top-0 w-2 h-full cursor-col-resize hover:bg-blue-200 transition-colors"
                    onMouseDown={(e) => handleMouseDown('crossSystem', e)}
                  />
                </th>

                {/* Activity */}
                <th 
                  className="text-left py-4 px-4 font-semibold text-gray-900 border-r border-gray-200 relative"
                  style={{ width: columnWidths.activity }}
                >
                  <div className="flex items-center gap-2">
                    <Car className="w-4 h-4" />
                    Activity
                  </div>
                  <div 
                    className="absolute right-0 top-0 w-2 h-full cursor-col-resize hover:bg-blue-200 transition-colors"
                    onMouseDown={(e) => handleMouseDown('activity', e)}
                  />
                </th>

                {/* Today */}
                <th 
                  className="text-left py-4 px-4 font-semibold text-gray-900 border-r border-gray-200 relative"
                  style={{ width: columnWidths.today }}
                >
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Today
                  </div>
                  <div 
                    className="absolute right-0 top-0 w-2 h-full cursor-col-resize hover:bg-blue-200 transition-colors"
                    onMouseDown={(e) => handleMouseDown('today', e)}
                  />
                </th>

                {/* Total */}
                <th 
                  className="text-left py-4 px-4 font-semibold text-gray-900 border-r border-gray-200 relative"
                  style={{ width: columnWidths.total }}
                >
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleSort('completedTrips')} className="flex items-center gap-1">
                      Total
                      <ArrowUpDown className="w-4 h-4" />
                    </button>
                  </div>
                  <div 
                    className="absolute right-0 top-0 w-2 h-full cursor-col-resize hover:bg-blue-200 transition-colors"
                    onMouseDown={(e) => handleMouseDown('total', e)}
                  />
                </th>

                {/* Rate */}
                <th 
                  className="text-left py-4 px-4 font-semibold text-gray-900 border-r border-gray-200 relative"
                  style={{ width: columnWidths.rate }}
                >
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleSort('completionRate')} className="flex items-center gap-1">
                      Rate
                      <ArrowUpDown className="w-4 h-4" />
                    </button>
                  </div>
                  <div 
                    className="absolute right-0 top-0 w-2 h-full cursor-col-resize hover:bg-blue-200 transition-colors"
                    onMouseDown={(e) => handleMouseDown('rate', e)}
                  />
                </th>

                {/* Service */}
                <th 
                  className="text-left py-4 px-4 font-semibold text-gray-900 border-r border-gray-200 relative"
                  style={{ width: columnWidths.service }}
                >
                  Service
                  <div 
                    className="absolute right-0 top-0 w-2 h-full cursor-col-resize hover:bg-blue-200 transition-colors"
                    onMouseDown={(e) => handleMouseDown('service', e)}
                  />
                </th>

                {/* Alerts */}
                <th 
                  className="text-left py-4 px-4 font-semibold text-gray-900 border-r border-gray-200 relative"
                  style={{ width: columnWidths.alerts }}
                >
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleSort('alerts')} className="flex items-center gap-1">
                      <Flag className="w-4 h-4" />
                      Alerts
                      <ArrowUpDown className="w-4 h-4" />
                    </button>
                  </div>
                  <div 
                    className="absolute right-0 top-0 w-2 h-full cursor-col-resize hover:bg-blue-200 transition-colors"
                    onMouseDown={(e) => handleMouseDown('alerts', e)}
                  />
                </th>

                {/* Investigation */}
                <th 
                  className="text-left py-4 px-4 font-semibold text-gray-900 border-r border-gray-200 relative"
                  style={{ width: columnWidths.investigation }}
                >
                  <div className="flex items-center gap-2">
                    <Eye className="w-4 h-4" />
                    Investigation
                  </div>
                  <div 
                    className="absolute right-0 top-0 w-2 h-full cursor-col-resize hover:bg-blue-200 transition-colors"
                    onMouseDown={(e) => handleMouseDown('investigation', e)}
                  />
                </th>

                {/* Actions */}
                <th 
                  className="text-left py-4 px-4 font-semibold text-gray-900"
                  style={{ width: columnWidths.actions }}
                >
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {sortedDrivers.map((driver) => {
                const isRecentlyChanged = recentChanges[driver.id] && 
                  Date.now() - recentChanges[driver.id] < 5000;
                const statusBadge = getStatusBadge(driver.investigationStatus);
                const riskLevel = getRiskLevelFromScore(driver.fraudRiskScore);
                const fraudRiskColor = getFraudRiskColor(driver.fraudRiskScore);

                return (
                  <tr 
                    key={driver.id}
                    className={`hover:bg-gray-50 cursor-pointer transition-colors ${
                      isRecentlyChanged ? 'bg-blue-50 border-l-4 border-l-blue-400' : ''
                    } ${driver.underInvestigation ? 'bg-purple-25' : ''}`}
                    onClick={() => handleRowClick(driver)}
                  >
                    {/* Driver Info */}
                    <td className="py-4 px-4 border-r border-gray-100">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-r from-green-500 to-blue-600 flex items-center justify-center text-white font-semibold">
                          {driver.name.split(' ')[0].charAt(0)}{driver.name.split(' ')[1].charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-gray-900 truncate">
                            {driver.name}
                          </div>
                          <div className="text-sm text-gray-600">
                            {driver.driverId}
                          </div>
                          <div className="text-sm text-gray-500">
                            {driver.region}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="py-4 px-4 border-r border-gray-100">
                      <div className="space-y-1">
                        <div className={`flex items-center gap-2 px-2 py-1 rounded-full text-xs ${statusBadge.bg} ${statusBadge.color}`}>
                          <statusBadge.icon className="w-3 h-3" />
                          {statusBadge.label}
                        </div>
                        <div className="text-xs text-gray-500">
                          {driver.statusText}
                        </div>
                      </div>
                    </td>

                    {/* Fraud Risk */}
                    <td className="py-4 px-4 border-r border-gray-100">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{getFraudRiskBadge(driver.fraudRiskScore)}</span>
                          <div className={`px-2 py-1 rounded-full text-xs font-medium ${fraudRiskColor}`}>
                            {driver.fraudRiskScore.toFixed(1)}%
                          </div>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${
                              riskLevel === 'critical' ? 'bg-red-500' :
                              riskLevel === 'high' ? 'bg-orange-500' :
                              riskLevel === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
                            }`}
                            style={{ width: `${Math.min(driver.fraudRiskScore, 100)}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    {/* Cross-System */}
                    <td className="py-4 px-4 border-r border-gray-100">
                      <div className="space-y-1">
                        <div className="text-sm font-medium text-gray-900">
                          {driver.crossSystemRisk.toFixed(1)}%
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-1.5">
                          <div 
                            className={`h-1.5 rounded-full ${
                              driver.crossSystemRisk >= 80 ? 'bg-red-500' :
                              driver.crossSystemRisk >= 60 ? 'bg-orange-500' :
                              driver.crossSystemRisk >= 40 ? 'bg-yellow-500' : 'bg-green-500'
                            }`}
                            style={{ width: `${Math.min(driver.crossSystemRisk, 100)}%` }}
                          />
                        </div>
                        <div className="text-xs text-gray-500">
                          ML: {(driver.mlConfidence * 100).toFixed(0)}%
                        </div>
                      </div>
                    </td>

                    {/* Activity */}
                    <td className="py-4 px-4 border-r border-gray-100">
                      <div className="space-y-1">
                        <div className="text-sm text-gray-900">
                          {driver.currentActivity}
                        </div>
                        <div className="flex items-center gap-1">
                          {driver.completionTrend === 'up' && <TrendingUp className="w-3 h-3 text-green-500" />}
                          {driver.completionTrend === 'down' && <TrendingDown className="w-3 h-3 text-red-500" />}
                          {driver.completionTrend === 'stable' && <div className="w-3 h-3 rounded-full bg-gray-400"></div>}
                          <span className="text-xs text-gray-600">{driver.completionRate}%</span>
                        </div>
                      </div>
                    </td>

                    {/* Today */}
                    <td className="py-4 px-4 border-r border-gray-100">
                      <div className="text-center">
                        <div className="text-lg font-semibold text-gray-900">
                          {driver.tripsToday}
                        </div>
                        <div className="text-xs text-gray-500">trips</div>
                      </div>
                    </td>

                    {/* Total */}
                    <td className="py-4 px-4 border-r border-gray-100">
                      <div className="text-center">
                        <div className="text-sm font-medium text-gray-900">
                          {driver.completedTrips.toLocaleString()}
                        </div>
                        <div className="text-xs text-gray-500">completed</div>
                      </div>
                    </td>

                    {/* Rate */}
                    <td className="py-4 px-4 border-r border-gray-100">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1">
                          <div className="text-sm font-medium text-gray-900">
                            {driver.completionRate}%
                          </div>
                          {driver.completionTrend === 'up' && <TrendingUp className="w-3 h-3 text-green-500" />}
                          {driver.completionTrend === 'down' && <TrendingDown className="w-3 h-3 text-red-500" />}
                        </div>
                        <div className="text-xs text-gray-500">
                          {driver.acceptanceRate}% accept
                        </div>
                      </div>
                    </td>

                    {/* Service */}
                    <td className="py-4 px-4 border-r border-gray-100">
                      <div className="text-sm text-gray-900">
                        {driver.service}
                      </div>
                    </td>

                    {/* Alerts */}
                    <td className="py-4 px-4 border-r border-gray-100">
                      <div className="text-center">
                        {driver.activeAlerts > 0 ? (
                          <div className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-600 rounded-full text-xs font-medium">
                            <AlertTriangle className="w-3 h-3" />
                            {driver.activeAlerts}
                          </div>
                        ) : (
                          <div className="text-gray-400 text-xs">None</div>
                        )}
                      </div>
                    </td>

                    {/* Investigation */}
                    <td className="py-4 px-4 border-r border-gray-100">
                      <div className="space-y-1">
                        {driver.underInvestigation ? (
                          <div className="flex items-center gap-1 text-purple-600 text-xs">
                            <Eye className="w-3 h-3" />
                            Active
                          </div>
                        ) : (
                          <div className="text-gray-400 text-xs">None</div>
                        )}
                        {driver.collusionSuspected && (
                          <div className="flex items-center gap-1 text-orange-600 text-xs">
                            <Users className="w-3 h-3" />
                            Collusion
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-1">
                        <button 
                          className="p-1 bg-blue-600 text-white rounded hover:bg-blue-700" 
                          title="View Profile"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRowClick(driver);
                          }}
                        >
                          <Eye className="w-3 h-3" />
                        </button>
                        <button 
                          className="p-1 bg-green-600 text-white rounded hover:bg-green-700" 
                          title="Message"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MessageCircle className="w-3 h-3" />
                        </button>
                        {driver.fraudRiskScore > 60 && (
                          <button 
                            className="p-1 bg-orange-600 text-white rounded hover:bg-orange-700" 
                            title="Investigate"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Shield className="w-3 h-3" />
                          </button>
                        )}
                        {driver.collusionSuspected && (
                          <button 
                            className="p-1 bg-purple-600 text-white rounded hover:bg-purple-700" 
                            title="Collusion Analysis"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Users className="w-3 h-3" />
                          </button>
                        )}
                        {driver.underInvestigation && (
                          <button 
                            className="p-1 bg-red-600 text-white rounded hover:bg-red-700" 
                            title="Case Details"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <FileX className="w-3 h-3" />
                          </button>
                        )}
                        <button 
                          className="p-1 bg-gray-600 text-white rounded hover:bg-gray-700" 
                          title="Location"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MapPin className="w-3 h-3" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {sortedDrivers.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-500">No drivers match the current filters</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EnhancedDriverTable;