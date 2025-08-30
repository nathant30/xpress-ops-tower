import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Search, RotateCw, ArrowUpDown, MessageCircle, UserX, AlertTriangle, 
  TrendingUp, TrendingDown, Shield, ShieldAlert, ShieldCheck, Eye, 
  CreditCard, MapPin, Clock, FileX, Lock, Unlock, Users, Brain,
  DollarSign, Activity, Zap, Flag, Ban, Car, Navigation, UserCheck
} from 'lucide-react';
import { EnhancedDriver, RiskLevel } from '@/types/fraud';
import { fraudMockData, getFraudRiskColor, getFraudRiskBadge, getInvestigationStatusBadge } from '@/lib/fraudMockData';
import { logger } from '@/lib/security/productionLogger';

const FraudEnhancedDriverTable = () => {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [riskFilter, setRiskFilter] = useState('All');
  const [investigationFilter, setInvestigationFilter] = useState('All');
  const [sortField, setSortField] = useState('');
  const [sortDirection, setSortDirection] = useState('asc');
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [recentChanges, setRecentChanges] = useState<{[key: string]: number}>({});

  // Column width state management
  const defaultColumnWidths = {
    driver: 200,
    status: 120,
    fraudRisk: 130,
    crossSystem: 140,
    operational: 120,
    collusion: 110,
    investigation: 120,
    mlConfidence: 100,
    alerts: 80,
    performance: 130,
    earnings: 110,
    actions: 160
  };

  const [columnWidths, setColumnWidths] = useState(defaultColumnWidths);
  const [isResizing, setIsResizing] = useState<string | null>(null);
  const [resizeStartX, setResizeStartX] = useState(0);
  const [resizeStartWidth, setResizeStartWidth] = useState(0);

  // Load enhanced drivers data
  const driversData: EnhancedDriver[] = fraudMockData.drivers;

  // Load saved column widths from localStorage
  useEffect(() => {
    const savedWidths = localStorage.getItem('fraudDriverTable_columnWidths');
    if (savedWidths) {
      try {
        const parsedWidths = JSON.parse(savedWidths);
        setColumnWidths({ ...defaultColumnWidths, ...parsedWidths });
      } catch (error) {
        logger.warn('Failed to parse saved column widths', { component: 'FraudEnhancedDriverTable' });
      }
    }
  }, []);

  // Save column widths to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('fraudDriverTable_columnWidths', JSON.stringify(columnWidths));
  }, [columnWidths]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setLastUpdated(new Date());
      // Simulate some changes for high-risk drivers
      if (Math.random() < 0.4) {
        const highRiskDrivers = driversData.filter(d => d.fraudRiskScore > 60);
        if (highRiskDrivers.length > 0) {
          const randomDriver = highRiskDrivers[Math.floor(Math.random() * highRiskDrivers.length)];
          setRecentChanges(prev => ({...prev, [randomDriver.id]: Date.now()}));
        }
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [driversData]);

  const getRiskLevelFromScore = (score: number): RiskLevel => {
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

  const getCorrelationBadge = (score: number) => {
    if (score >= 0.8) return { color: 'text-red-600', bg: 'bg-red-50', label: 'High Correlation' };
    if (score >= 0.5) return { color: 'text-orange-600', bg: 'bg-orange-50', label: 'Medium Correlation' };
    if (score >= 0.3) return { color: 'text-yellow-600', bg: 'bg-yellow-50', label: 'Low Correlation' };
    return { color: 'text-green-600', bg: 'bg-green-50', label: 'No Correlation' };
  };

  // Filtering logic
  const filteredDrivers = driversData.filter(driver => {
    const matchesSearch = searchTerm === '' || 
      driver.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      driver.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      driver.driverCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      driver.email.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType = selectedType === 'All' || selectedType === 'active'; // Simplified for now
    const matchesStatus = selectedStatus === 'All' || selectedStatus === 'active'; // Simplified for now
    
    const riskLevel = getRiskLevelFromScore(driver.fraudRiskScore);
    const matchesRisk = riskFilter === 'All' || riskLevel === riskFilter;
    
    const matchesInvestigation = investigationFilter === 'All' || driver.investigationStatus === investigationFilter;

    return matchesSearch && matchesType && matchesStatus && matchesRisk && matchesInvestigation;
  });

  // Sorting logic
  const sortedDrivers = React.useMemo(() => {
    if (!sortField) return filteredDrivers;

    return [...filteredDrivers].sort((a, b) => {
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
        case 'combinedRisk':
          aValue = a.combinedRiskScore;
          bValue = b.combinedRiskScore;
          break;
        case 'correlation':
          aValue = a.correlationScore;
          bValue = b.correlationScore;
          break;
        case 'mlConfidence':
          aValue = a.mlConfidenceScore;
          bValue = b.mlConfidenceScore;
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
  }, [filteredDrivers, sortField, sortDirection]);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleRowClick = (driver: EnhancedDriver) => {
    router.push(`/driver-profile?id=${driver.id}`);
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
          <h1 className="text-2xl font-bold text-gray-900">Driver Security Management</h1>
          <p className="text-gray-600">Enhanced fraud detection and cross-system risk monitoring for all drivers</p>
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
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

          {/* Investigation Filter */}
          <select
            value={investigationFilter}
            onChange={(e) => setInvestigationFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="All">All Investigation Status</option>
            <option value="clear">Clear</option>
            <option value="monitoring">Monitoring</option>
            <option value="investigating">Investigating</option>
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="All">All Status</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
            <option value="offline">Offline</option>
          </select>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 pt-4 border-t">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{filteredDrivers.length}</div>
            <div className="text-sm text-gray-600">Total Drivers</div>
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
            <div className="text-2xl font-bold text-green-600">
              {filteredDrivers.filter(d => d.correlationScore > 0.7).length}
            </div>
            <div className="text-sm text-gray-600">High Correlation</div>
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
                    <button onClick={() => handleSort('combinedRisk')} className="flex items-center gap-1">
                      <Activity className="w-4 h-4" />
                      Combined Risk
                      <ArrowUpDown className="w-4 h-4" />
                    </button>
                  </div>
                  <div 
                    className="absolute right-0 top-0 w-2 h-full cursor-col-resize hover:bg-blue-200 transition-colors"
                    onMouseDown={(e) => handleMouseDown('crossSystem', e)}
                  />
                </th>

                {/* Operational Risk */}
                <th 
                  className="text-left py-4 px-4 font-semibold text-gray-900 border-r border-gray-200 relative"
                  style={{ width: columnWidths.operational }}
                >
                  <div className="flex items-center gap-2">
                    <Car className="w-4 h-4" />
                    Operations
                  </div>
                  <div 
                    className="absolute right-0 top-0 w-2 h-full cursor-col-resize hover:bg-blue-200 transition-colors"
                    onMouseDown={(e) => handleMouseDown('operational', e)}
                  />
                </th>

                {/* Collusion */}
                <th 
                  className="text-left py-4 px-4 font-semibold text-gray-900 border-r border-gray-200 relative"
                  style={{ width: columnWidths.collusion }}
                >
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Collusion
                  </div>
                  <div 
                    className="absolute right-0 top-0 w-2 h-full cursor-col-resize hover:bg-blue-200 transition-colors"
                    onMouseDown={(e) => handleMouseDown('collusion', e)}
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

                {/* ML Confidence */}
                <th 
                  className="text-left py-4 px-4 font-semibold text-gray-900 border-r border-gray-200 relative"
                  style={{ width: columnWidths.mlConfidence }}
                >
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleSort('mlConfidence')} className="flex items-center gap-1">
                      <Brain className="w-4 h-4" />
                      ML Score
                      <ArrowUpDown className="w-4 h-4" />
                    </button>
                  </div>
                  <div 
                    className="absolute right-0 top-0 w-2 h-full cursor-col-resize hover:bg-blue-200 transition-colors"
                    onMouseDown={(e) => handleMouseDown('mlConfidence', e)}
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

                {/* Performance */}
                <th 
                  className="text-left py-4 px-4 font-semibold text-gray-900 border-r border-gray-200 relative"
                  style={{ width: columnWidths.performance }}
                >
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" />
                    Performance
                  </div>
                  <div 
                    className="absolute right-0 top-0 w-2 h-full cursor-col-resize hover:bg-blue-200 transition-colors"
                    onMouseDown={(e) => handleMouseDown('performance', e)}
                  />
                </th>

                {/* Earnings */}
                <th 
                  className="text-left py-4 px-4 font-semibold text-gray-900 border-r border-gray-200 relative"
                  style={{ width: columnWidths.earnings }}
                >
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4" />
                    Earnings
                  </div>
                  <div 
                    className="absolute right-0 top-0 w-2 h-full cursor-col-resize hover:bg-blue-200 transition-colors"
                    onMouseDown={(e) => handleMouseDown('earnings', e)}
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
                const correlationBadge = getCorrelationBadge(driver.correlationScore);

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
                          {driver.firstName.charAt(0)}{driver.lastName.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-gray-900 truncate">
                            {driver.firstName} {driver.lastName}
                          </div>
                          <div className="text-sm text-gray-600">
                            {driver.driverCode}
                          </div>
                          <div className="text-sm text-gray-500">
                            {driver.email}
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
                          {driver.investigationCount > 0 ? `${driver.investigationCount} investigations` : 'Clean record'}
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
                        {driver.underInvestigation && (
                          <div className="flex items-center gap-1 text-purple-600 text-xs">
                            <Eye className="w-3 h-3" />
                            Under Investigation
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Cross-System Combined Risk */}
                    <td className="py-4 px-4 border-r border-gray-100">
                      <div className="space-y-2">
                        <div className="text-sm font-medium text-gray-900">
                          {driver.combinedRiskScore.toFixed(1)}%
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-1.5">
                          <div 
                            className={`h-1.5 rounded-full ${
                              driver.combinedRiskScore >= 80 ? 'bg-red-500' :
                              driver.combinedRiskScore >= 60 ? 'bg-orange-500' :
                              driver.combinedRiskScore >= 40 ? 'bg-yellow-500' : 'bg-green-500'
                            }`}
                            style={{ width: `${Math.min(driver.combinedRiskScore, 100)}%` }}
                          />
                        </div>
                        <div className={`text-xs px-2 py-1 rounded-full ${correlationBadge.bg} ${correlationBadge.color}`}>
                          Correlation: {(driver.correlationScore * 100).toFixed(0)}%
                        </div>
                      </div>
                    </td>

                    {/* Operational Risk */}
                    <td className="py-4 px-4 border-r border-gray-100">
                      <div className="space-y-1">
                        <div className="text-sm font-medium text-gray-900">
                          {driver.operationalRiskScore.toFixed(1)}%
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-1.5">
                          <div 
                            className={`h-1.5 rounded-full ${
                              driver.operationalRiskScore >= 80 ? 'bg-red-500' :
                              driver.operationalRiskScore >= 60 ? 'bg-orange-500' :
                              driver.operationalRiskScore >= 40 ? 'bg-yellow-500' : 'bg-green-500'
                            }`}
                            style={{ width: `${Math.min(driver.operationalRiskScore, 100)}%` }}
                          />
                        </div>
                        <div className="text-xs text-gray-500">
                          Ops incidents, violations
                        </div>
                      </div>
                    </td>

                    {/* Collusion */}
                    <td className="py-4 px-4 border-r border-gray-100">
                      <div className="space-y-1">
                        {driver.collusionSuspected ? (
                          <div className="flex items-center gap-1 text-red-600 text-xs">
                            <AlertTriangle className="w-3 h-3" />
                            Suspected
                          </div>
                        ) : (
                          <div className="text-gray-400 text-xs">None</div>
                        )}
                        {driver.suspiciousPassengerCount > 0 && (
                          <div className="text-xs text-orange-600">
                            {driver.suspiciousPassengerCount} suspicious passengers
                          </div>
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
                        {driver.investigationCount > 0 && (
                          <div className="text-xs text-gray-500">
                            {driver.investigationCount} past investigations
                          </div>
                        )}
                      </div>
                    </td>

                    {/* ML Confidence */}
                    <td className="py-4 px-4 border-r border-gray-100">
                      <div className="space-y-1">
                        <div className="text-sm font-medium text-gray-900">
                          {(driver.mlConfidenceScore * 100).toFixed(1)}%
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-1.5">
                          <div 
                            className="h-1.5 rounded-full bg-blue-500"
                            style={{ width: `${driver.mlConfidenceScore * 100}%` }}
                          />
                        </div>
                        <div className="text-xs text-gray-500">
                          AI confidence
                        </div>
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

                    {/* Performance */}
                    <td className="py-4 px-4 border-r border-gray-100">
                      <div className="space-y-1">
                        <div className="text-sm font-medium text-gray-900">
                          4.8 ⭐
                        </div>
                        <div className="text-xs text-gray-600">
                          2,450 trips
                        </div>
                        <div className="text-xs text-gray-500">
                          98% completion
                        </div>
                      </div>
                    </td>

                    {/* Earnings */}
                    <td className="py-4 px-4 border-r border-gray-100">
                      <div className="space-y-1">
                        <div className="text-sm font-medium text-gray-900">
                          ₱38,900
                        </div>
                        <div className="text-xs text-gray-500">
                          This month
                        </div>
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

export default FraudEnhancedDriverTable;