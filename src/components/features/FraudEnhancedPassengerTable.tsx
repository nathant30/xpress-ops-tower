import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Search, RotateCw, ArrowUpDown, MessageCircle, UserX, AlertTriangle, 
  TrendingUp, TrendingDown, Shield, ShieldAlert, ShieldCheck, Eye, 
  CreditCard, MapPin, Clock, FileX, Lock, Unlock, Users, Brain,
  DollarSign, Activity, Zap, Flag, Ban
} from 'lucide-react';
import { EnhancedPassenger, RiskLevel } from '@/types/fraud';
import { fraudMockData, getFraudRiskColor, getFraudRiskBadge, getInvestigationStatusBadge } from '@/lib/fraudMockData';

const FraudEnhancedPassengerTable = () => {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [riskFilter, setRiskFilter] = useState('All');
  const [verificationFilter, setVerificationFilter] = useState('All');
  const [sortField, setSortField] = useState('');
  const [sortDirection, setSortDirection] = useState('asc');
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [recentChanges, setRecentChanges] = useState<{[key: string]: number}>({});

  // Column width state management
  const defaultColumnWidths = {
    passenger: 200,
    tier: 100,
    fraudRisk: 120,
    verification: 140,
    paymentRisk: 110,
    identity: 100,
    activity: 130,
    alerts: 80,
    investigation: 120,
    totalSpent: 110,
    bookingsToday: 90,
    actions: 160
  };

  const [columnWidths, setColumnWidths] = useState(defaultColumnWidths);
  const [isResizing, setIsResizing] = useState<string | null>(null);
  const [resizeStartX, setResizeStartX] = useState(0);
  const [resizeStartWidth, setResizeStartWidth] = useState(0);

  // Load enhanced passengers data
  const passengersData: EnhancedPassenger[] = fraudMockData.passengers;

  // Load saved column widths from localStorage
  useEffect(() => {
    const savedWidths = localStorage.getItem('fraudPassengerTable_columnWidths');
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
    localStorage.setItem('fraudPassengerTable_columnWidths', JSON.stringify(columnWidths));
  }, [columnWidths]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setLastUpdated(new Date());
      // Simulate some changes for high-risk passengers
      if (Math.random() < 0.4) {
        const highRiskPassengers = passengersData.filter(p => p.fraudRiskScore > 60);
        if (highRiskPassengers.length > 0) {
          const randomPassenger = highRiskPassengers[Math.floor(Math.random() * highRiskPassengers.length)];
          setRecentChanges(prev => ({...prev, [randomPassenger.id]: Date.now()}));
        }
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [passengersData]);

  const getRiskLevelFromScore = (score: number): RiskLevel => {
    if (score >= 80) return 'critical';
    if (score >= 60) return 'high';
    if (score >= 40) return 'medium';
    return 'low';
  };

  const getVerificationBadge = (passenger: EnhancedPassenger) => {
    if (passenger.identityVerified && passenger.documentVerified && passenger.paymentMethodVerified) {
      return { icon: ShieldCheck, color: 'text-green-600', bg: 'bg-green-50', label: 'Fully Verified' };
    } else if (passenger.identityVerified) {
      return { icon: Shield, color: 'text-yellow-600', bg: 'bg-yellow-50', label: 'Partially Verified' };
    } else {
      return { icon: ShieldAlert, color: 'text-red-600', bg: 'bg-red-50', label: 'Unverified' };
    }
  };

  const getAccountStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return { icon: Users, color: 'text-green-600', bg: 'bg-green-50', label: 'Active' };
      case 'suspended':
        return { icon: Ban, color: 'text-orange-600', bg: 'bg-orange-50', label: 'Suspended' };
      case 'banned':
        return { icon: UserX, color: 'text-red-600', bg: 'bg-red-50', label: 'Banned' };
      case 'under_investigation':
        return { icon: Eye, color: 'text-purple-600', bg: 'bg-purple-50', label: 'Under Investigation' };
      default:
        return { icon: Users, color: 'text-gray-600', bg: 'bg-gray-50', label: status };
    }
  };

  const getTierBadge = (tier: string) => {
    switch (tier) {
      case 'VIP':
        return '👑';
      case 'Premium':
        return '⭐';
      case 'Regular':
        return '🟢';
      case 'New':
        return '🟠';
      case 'Suspended':
        return '🔴';
      case 'Banned':
        return '⛔';
      default:
        return '⚪';
    }
  };

  // Filtering logic
  const filteredPassengers = passengersData.filter(passenger => {
    const matchesSearch = searchTerm === '' || 
      passenger.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      passenger.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      passenger.passengerId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      passenger.email.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType = selectedType === 'All' || passenger.tier === selectedType;
    const matchesStatus = selectedStatus === 'All' || passenger.accountStatus === selectedStatus;
    
    const riskLevel = getRiskLevelFromScore(passenger.fraudRiskScore);
    const matchesRisk = riskFilter === 'All' || riskLevel === riskFilter;
    
    const verificationStatus = passenger.identityVerified && passenger.documentVerified && passenger.paymentMethodVerified ? 'verified' : 'unverified';
    const matchesVerification = verificationFilter === 'All' || verificationStatus === verificationFilter;

    return matchesSearch && matchesType && matchesStatus && matchesRisk && matchesVerification;
  });

  // Sorting logic
  const sortedPassengers = React.useMemo(() => {
    if (!sortField) return filteredPassengers;

    return [...filteredPassengers].sort((a, b) => {
      let aValue, bValue;

      switch (sortField) {
        case 'name':
          aValue = `${a.firstName} ${a.lastName}`;
          bValue = `${b.firstName} ${b.lastName}`;
          break;
        case 'fraudRisk':
          aValue = a.fraudRiskScore;
          bValue = b.fraudRiskScore;
          break;
        case 'paymentRisk':
          aValue = a.paymentRiskScore;
          bValue = b.paymentRiskScore;
          break;
        case 'totalSpent':
          aValue = a.totalSpent;
          bValue = b.totalSpent;
          break;
        case 'bookings':
          aValue = a.totalBookings;
          bValue = b.totalBookings;
          break;
        case 'alerts':
          aValue = a.activeAlerts;
          bValue = b.activeAlerts;
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredPassengers, sortField, sortDirection]);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleRowClick = (passenger: EnhancedPassenger) => {
    router.push(`/passenger-profile?id=${passenger.id}`);
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
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Passenger Security Management</h1>
          <p className="text-gray-600">Enhanced fraud detection and risk monitoring for all passengers</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setLastUpdated(new Date())}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <RotateCw className="w-4 h-4" />
            Refresh
          </button>
          <div className="text-sm text-gray-500">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </div>
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
              placeholder="Search passengers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Tier Filter */}
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="All">All Tiers</option>
            <option value="VIP">VIP</option>
            <option value="Premium">Premium</option>
            <option value="Regular">Regular</option>
            <option value="New">New</option>
            <option value="Suspended">Suspended</option>
            <option value="Banned">Banned</option>
          </select>

          {/* Account Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="All">All Status</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
            <option value="banned">Banned</option>
            <option value="under_investigation">Under Investigation</option>
          </select>

          {/* Fraud Risk Filter */}
          <select
            value={riskFilter}
            onChange={(e) => setRiskFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="All">All Risk Levels</option>
            <option value="critical">Critical Risk</option>
            <option value="high">High Risk</option>
            <option value="medium">Medium Risk</option>
            <option value="low">Low Risk</option>
          </select>

          {/* Verification Filter */}
          <select
            value={verificationFilter}
            onChange={(e) => setVerificationFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="All">All Verification</option>
            <option value="verified">Fully Verified</option>
            <option value="unverified">Unverified</option>
          </select>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 pt-4 border-t">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{filteredPassengers.length}</div>
            <div className="text-sm text-gray-600">Total Passengers</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">
              {filteredPassengers.filter(p => p.fraudRiskScore >= 80).length}
            </div>
            <div className="text-sm text-gray-600">Critical Risk</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">
              {filteredPassengers.filter(p => p.fraudRiskScore >= 60 && p.fraudRiskScore < 80).length}
            </div>
            <div className="text-sm text-gray-600">High Risk</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">
              {filteredPassengers.filter(p => p.underInvestigation).length}
            </div>
            <div className="text-sm text-gray-600">Under Investigation</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {filteredPassengers.filter(p => p.activeAlerts > 0).length}
            </div>
            <div className="text-sm text-gray-600">Active Alerts</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {filteredPassengers.filter(p => p.identityVerified && p.documentVerified && p.paymentMethodVerified).length}
            </div>
            <div className="text-sm text-gray-600">Fully Verified</div>
          </div>
        </div>
      </div>

      {/* Enhanced Table */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {/* Passenger Info */}
                <th 
                  className="text-left py-4 px-4 font-semibold text-gray-900 border-r border-gray-200 relative"
                  style={{ width: columnWidths.passenger }}
                >
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleSort('name')} className="flex items-center gap-1">
                      Passenger Info
                      <ArrowUpDown className="w-4 h-4" />
                    </button>
                  </div>
                  <div 
                    className="absolute right-0 top-0 w-2 h-full cursor-col-resize hover:bg-blue-200 transition-colors"
                    onMouseDown={(e) => handleMouseDown('passenger', e)}
                  />
                </th>

                {/* Tier */}
                <th 
                  className="text-left py-4 px-4 font-semibold text-gray-900 border-r border-gray-200 relative"
                  style={{ width: columnWidths.tier }}
                >
                  Tier
                  <div 
                    className="absolute right-0 top-0 w-2 h-full cursor-col-resize hover:bg-blue-200 transition-colors"
                    onMouseDown={(e) => handleMouseDown('tier', e)}
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

                {/* Verification */}
                <th 
                  className="text-left py-4 px-4 font-semibold text-gray-900 border-r border-gray-200 relative"
                  style={{ width: columnWidths.verification }}
                >
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4" />
                    Verification
                  </div>
                  <div 
                    className="absolute right-0 top-0 w-2 h-full cursor-col-resize hover:bg-blue-200 transition-colors"
                    onMouseDown={(e) => handleMouseDown('verification', e)}
                  />
                </th>

                {/* Payment Risk */}
                <th 
                  className="text-left py-4 px-4 font-semibold text-gray-900 border-r border-gray-200 relative"
                  style={{ width: columnWidths.paymentRisk }}
                >
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleSort('paymentRisk')} className="flex items-center gap-1">
                      <CreditCard className="w-4 h-4" />
                      Payment Risk
                      <ArrowUpDown className="w-4 h-4" />
                    </button>
                  </div>
                  <div 
                    className="absolute right-0 top-0 w-2 h-full cursor-col-resize hover:bg-blue-200 transition-colors"
                    onMouseDown={(e) => handleMouseDown('paymentRisk', e)}
                  />
                </th>

                {/* Identity Risk */}
                <th 
                  className="text-left py-4 px-4 font-semibold text-gray-900 border-r border-gray-200 relative"
                  style={{ width: columnWidths.identity }}
                >
                  <div className="flex items-center gap-2">
                    <FileX className="w-4 h-4" />
                    Identity
                  </div>
                  <div 
                    className="absolute right-0 top-0 w-2 h-full cursor-col-resize hover:bg-blue-200 transition-colors"
                    onMouseDown={(e) => handleMouseDown('identity', e)}
                  />
                </th>

                {/* Activity */}
                <th 
                  className="text-left py-4 px-4 font-semibold text-gray-900 border-r border-gray-200 relative"
                  style={{ width: columnWidths.activity }}
                >
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4" />
                    Activity
                  </div>
                  <div 
                    className="absolute right-0 top-0 w-2 h-full cursor-col-resize hover:bg-blue-200 transition-colors"
                    onMouseDown={(e) => handleMouseDown('activity', e)}
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

                {/* Total Spent */}
                <th 
                  className="text-left py-4 px-4 font-semibold text-gray-900 border-r border-gray-200 relative"
                  style={{ width: columnWidths.totalSpent }}
                >
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleSort('totalSpent')} className="flex items-center gap-1">
                      <DollarSign className="w-4 h-4" />
                      Total Spent
                      <ArrowUpDown className="w-4 h-4" />
                    </button>
                  </div>
                  <div 
                    className="absolute right-0 top-0 w-2 h-full cursor-col-resize hover:bg-blue-200 transition-colors"
                    onMouseDown={(e) => handleMouseDown('totalSpent', e)}
                  />
                </th>

                {/* Today */}
                <th 
                  className="text-left py-4 px-4 font-semibold text-gray-900 border-r border-gray-200 relative"
                  style={{ width: columnWidths.bookingsToday }}
                >
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Today
                  </div>
                  <div 
                    className="absolute right-0 top-0 w-2 h-full cursor-col-resize hover:bg-blue-200 transition-colors"
                    onMouseDown={(e) => handleMouseDown('bookingsToday', e)}
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
              {sortedPassengers.map((passenger) => {
                const isRecentlyChanged = recentChanges[passenger.id] && 
                  Date.now() - recentChanges[passenger.id] < 5000;
                const verificationBadge = getVerificationBadge(passenger);
                const accountStatusBadge = getAccountStatusBadge(passenger.accountStatus);
                const riskLevel = getRiskLevelFromScore(passenger.fraudRiskScore);
                const fraudRiskColor = getFraudRiskColor(passenger.fraudRiskScore);

                return (
                  <tr 
                    key={passenger.id}
                    className={`hover:bg-gray-50 cursor-pointer transition-colors ${
                      isRecentlyChanged ? 'bg-blue-50 border-l-4 border-l-blue-400' : ''
                    } ${passenger.underInvestigation ? 'bg-purple-25' : ''}`}
                    onClick={() => handleRowClick(passenger)}
                  >
                    {/* Passenger Info */}
                    <td className="py-4 px-4 border-r border-gray-100">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold">
                          {passenger.firstName.charAt(0)}{passenger.lastName.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-gray-900 truncate">
                            {passenger.firstName} {passenger.lastName}
                          </div>
                          <div className="text-sm text-gray-600">
                            {passenger.passengerId}
                          </div>
                          <div className="text-sm text-gray-500">
                            {passenger.email}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Tier */}
                    <td className="py-4 px-4 border-r border-gray-100">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{getTierBadge(passenger.tier)}</span>
                        <div>
                          <div className="font-medium text-gray-900">{passenger.tier}</div>
                          <div className={`text-xs px-2 py-1 rounded-full ${accountStatusBadge.bg} ${accountStatusBadge.color}`}>
                            {accountStatusBadge.label}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Fraud Risk */}
                    <td className="py-4 px-4 border-r border-gray-100">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{getFraudRiskBadge(passenger.fraudRiskScore)}</span>
                          <div className={`px-2 py-1 rounded-full text-xs font-medium ${fraudRiskColor}`}>
                            {passenger.fraudRiskScore.toFixed(1)}%
                          </div>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${
                              riskLevel === 'critical' ? 'bg-red-500' :
                              riskLevel === 'high' ? 'bg-orange-500' :
                              riskLevel === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
                            }`}
                            style={{ width: `${Math.min(passenger.fraudRiskScore, 100)}%` }}
                          />
                        </div>
                        {passenger.underInvestigation && (
                          <div className="flex items-center gap-1 text-purple-600 text-xs">
                            <Eye className="w-3 h-3" />
                            Investigating
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Verification */}
                    <td className="py-4 px-4 border-r border-gray-100">
                      <div className="space-y-2">
                        <div className={`flex items-center gap-2 px-2 py-1 rounded-full text-xs ${verificationBadge.bg} ${verificationBadge.color}`}>
                          <verificationBadge.icon className="w-3 h-3" />
                          {verificationBadge.label}
                        </div>
                        <div className="text-xs text-gray-600 space-y-1">
                          <div className="flex items-center justify-between">
                            <span>Identity:</span>
                            <span className={passenger.identityVerified ? 'text-green-600' : 'text-red-600'}>
                              {passenger.identityVerified ? '✓' : '✗'}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span>Documents:</span>
                            <span className={passenger.documentVerified ? 'text-green-600' : 'text-red-600'}>
                              {passenger.documentVerified ? '✓' : '✗'}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span>Payment:</span>
                            <span className={passenger.paymentMethodVerified ? 'text-green-600' : 'text-red-600'}>
                              {passenger.paymentMethodVerified ? '✓' : '✗'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Payment Risk */}
                    <td className="py-4 px-4 border-r border-gray-100">
                      <div className="space-y-1">
                        <div className="text-sm font-medium text-gray-900">
                          {passenger.paymentRiskScore.toFixed(1)}%
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-1.5">
                          <div 
                            className={`h-1.5 rounded-full ${
                              passenger.paymentRiskScore >= 80 ? 'bg-red-500' :
                              passenger.paymentRiskScore >= 60 ? 'bg-orange-500' :
                              passenger.paymentRiskScore >= 40 ? 'bg-yellow-500' : 'bg-green-500'
                            }`}
                            style={{ width: `${Math.min(passenger.paymentRiskScore, 100)}%` }}
                          />
                        </div>
                        <div className="text-xs text-gray-500">
                          {passenger.paymentMethodVerified ? 'Verified' : 'Unverified'}
                        </div>
                      </div>
                    </td>

                    {/* Identity Risk */}
                    <td className="py-4 px-4 border-r border-gray-100">
                      <div className="space-y-1">
                        <div className="text-sm font-medium text-gray-900">
                          {passenger.identityRiskScore.toFixed(1)}%
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-1.5">
                          <div 
                            className={`h-1.5 rounded-full ${
                              passenger.identityRiskScore >= 80 ? 'bg-red-500' :
                              passenger.identityRiskScore >= 60 ? 'bg-orange-500' :
                              passenger.identityRiskScore >= 40 ? 'bg-yellow-500' : 'bg-green-500'
                            }`}
                            style={{ width: `${Math.min(passenger.identityRiskScore, 100)}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    {/* Activity */}
                    <td className="py-4 px-4 border-r border-gray-100">
                      <div className="space-y-1">
                        <div className="text-sm font-medium text-gray-900">
                          {passenger.totalBookings} rides
                        </div>
                        <div className="text-xs text-gray-600">
                          {passenger.cancellationRate.toFixed(1)}% cancel rate
                        </div>
                        <div className="text-xs text-gray-500">
                          {passenger.lastActivityAt ? 
                            `${Math.floor((Date.now() - passenger.lastActivityAt.getTime()) / (1000 * 60))}m ago` : 
                            'No recent activity'
                          }
                        </div>
                      </div>
                    </td>

                    {/* Alerts */}
                    <td className="py-4 px-4 border-r border-gray-100">
                      <div className="text-center">
                        {passenger.activeAlerts > 0 ? (
                          <div className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-600 rounded-full text-xs font-medium">
                            <AlertTriangle className="w-3 h-3" />
                            {passenger.activeAlerts}
                          </div>
                        ) : (
                          <div className="text-gray-400 text-xs">None</div>
                        )}
                      </div>
                    </td>

                    {/* Investigation */}
                    <td className="py-4 px-4 border-r border-gray-100">
                      <div className="space-y-1">
                        {passenger.underInvestigation ? (
                          <div className="flex items-center gap-1 text-purple-600 text-xs">
                            <Eye className="w-3 h-3" />
                            Active
                          </div>
                        ) : (
                          <div className="text-gray-400 text-xs">None</div>
                        )}
                        {passenger.investigationCount > 0 && (
                          <div className="text-xs text-gray-500">
                            {passenger.investigationCount} past
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Total Spent */}
                    <td className="py-4 px-4 border-r border-gray-100">
                      <div className="text-sm font-medium text-gray-900">
                        ₱{passenger.totalSpent.toLocaleString()}
                      </div>
                      <div className="text-xs text-gray-500">
                        Avg: ₱{(passenger.totalSpent / Math.max(passenger.totalBookings, 1)).toFixed(0)}
                      </div>
                    </td>

                    {/* Bookings Today */}
                    <td className="py-4 px-4 border-r border-gray-100">
                      <div className="text-center">
                        <div className="text-sm font-medium text-gray-900">
                          {passenger.bookingsToday}
                        </div>
                        <div className="text-xs text-gray-500">today</div>
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
                            handleRowClick(passenger);
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
                        {passenger.fraudRiskScore > 60 && (
                          <button 
                            className="p-1 bg-orange-600 text-white rounded hover:bg-orange-700" 
                            title="Investigate"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Shield className="w-3 h-3" />
                          </button>
                        )}
                        {passenger.underInvestigation && (
                          <button 
                            className="p-1 bg-purple-600 text-white rounded hover:bg-purple-700" 
                            title="Case Details"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <FileX className="w-3 h-3" />
                          </button>
                        )}
                        {passenger.fraudRiskScore > 80 && (
                          <button 
                            className="p-1 bg-red-600 text-white rounded hover:bg-red-700" 
                            title="Suspend Account"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Ban className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {sortedPassengers.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-500">No passengers match the current filters</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FraudEnhancedPassengerTable;