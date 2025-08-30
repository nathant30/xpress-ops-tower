// Xpress Ops Tower - Driver Management Interface
// Airtable-style grid with advanced filtering and management features

'use client';

import React, { useState, useMemo, useCallback, memo } from 'react';
import { 
  Search, Filter, Download, Plus, MoreVertical, Edit, Trash2, 
  Phone, Mail, MapPin, Star, TrendingUp, TrendingDown, Clock, 
  CheckCircle, XCircle, AlertCircle, User, Car, Shield, Activity,
  RefreshCw, Loader
} from 'lucide-react';

import { Button, XpressCard as Card, Badge } from '@/components/xpress';
import { useDriversData, useDriverMutations } from '@/hooks/useApiData';

interface Driver {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: 'active' | 'inactive' | 'busy' | 'break' | 'offline';
  rating: number;
  totalTrips: number;
  completionRate: number;
  revenue: number;
  vehicle: {
    make: string;
    model: string;
    plate: string;
    year: number;
  };
  location: {
    lat: number;
    lng: number;
    address: string;
  };
  onlineHours: number;
  lastActive: Date;
  joinDate: Date;
  documents: {
    license: boolean;
    insurance: boolean;
    registration: boolean;
    backgroundCheck: boolean;
  };
  performance: {
    avgRating: number;
    avgResponseTime: number;
    cancelationRate: number;
    complaintCount: number;
  };
}

interface DriverManagementProps {
  regionId?: string;
  userRole?: 'admin' | 'operator' | 'supervisor';
}

type SortField = keyof Driver | 'rating' | 'totalTrips' | 'revenue' | 'onlineHours';
type SortDirection = 'asc' | 'desc';
type FilterStatus = 'all' | 'active' | 'inactive' | 'busy' | 'break' | 'offline';

export const DriverManagement: React.FC<DriverManagementProps> = ({
  regionId,
  userRole = 'operator'
}) => {
  // API data integration
  const [currentPage, setCurrentPage] = useState(1);
  const [limit] = useState(50);

  // Fetch drivers data with real-time updates
  const {
    data: driversResponse,
    loading: driversLoading,
    error: driversError,
    lastUpdated,
    refresh: refreshDrivers
  } = useDriversData({
    region: regionId,
    page: currentPage,
    limit,
    sortBy: 'name',
    sortOrder: 'asc'
  }, {
    autoRefresh: true,
    refreshInterval: 15000 // Refresh every 15 seconds
  });

  // Driver mutations for CRUD operations
  const {
    createDriver,
    updateDriver,
    deleteDriver,
    loading: mutationLoading,
    error: mutationError
  } = useDriverMutations();

  // Extract drivers from API response
  const drivers = driversResponse?.data || [];
  const totalDrivers = driversResponse?.total || 0;

  // UI State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [selectedDrivers, setSelectedDrivers] = useState<Set<string>>(new Set());
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);

  // Advanced filters
  const [ratingFilter, setRatingFilter] = useState<number | null>(null);
  const [revenueFilter, setRevenueFilter] = useState<[number, number] | null>(null);
  const [documentsFilter, setDocumentsFilter] = useState<boolean | null>(null);

  // Filter and sort drivers
  const filteredAndSortedDrivers = useMemo(() => {
    let filtered = drivers.filter(driver => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (
          !driver.name.toLowerCase().includes(query) &&
          !driver.email.toLowerCase().includes(query) &&
          !driver.phone.includes(query) &&
          !driver.vehicle.plate.toLowerCase().includes(query)
        ) {
          return false;
        }
      }

      // Status filter
      if (statusFilter !== 'all' && driver.status !== statusFilter) {
        return false;
      }

      // Rating filter
      if (ratingFilter && driver.rating < ratingFilter) {
        return false;
      }

      // Revenue filter
      if (revenueFilter && (driver.revenue < revenueFilter[0] || driver.revenue > revenueFilter[1])) {
        return false;
      }

      // Documents filter
      if (documentsFilter !== null) {
        const hasAllDocs = Object.values(driver.documents).every(Boolean);
        if (documentsFilter && !hasAllDocs) return false;
        if (!documentsFilter && hasAllDocs) return false;
      }

      return true;
    });

    // Sort
    filtered.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortField) {
        case 'name':
          aValue = a.name;
          bValue = b.name;
          break;
        case 'rating':
          aValue = a.rating;
          bValue = b.rating;
          break;
        case 'totalTrips':
          aValue = a.totalTrips;
          bValue = b.totalTrips;
          break;
        case 'revenue':
          aValue = a.revenue;
          bValue = b.revenue;
          break;
        case 'onlineHours':
          aValue = a.onlineHours;
          bValue = b.onlineHours;
          break;
        default:
          aValue = a[sortField as keyof Driver];
          bValue = b[sortField as keyof Driver];
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      if (sortDirection === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

    return filtered;
  }, [drivers, searchQuery, statusFilter, ratingFilter, revenueFilter, documentsFilter, sortField, sortDirection]);

  // Handle sorting
  const handleSort = useCallback((field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  }, [sortField]);

  // Handle driver selection
  const handleDriverSelect = useCallback((driverId: string) => {
    setSelectedDrivers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(driverId)) {
        newSet.delete(driverId);
      } else {
        newSet.add(driverId);
      }
      return newSet;
    });
  }, []);

  // Select all drivers
  const handleSelectAll = useCallback(() => {
    if (selectedDrivers.size === filteredAndSortedDrivers.length) {
      setSelectedDrivers(new Set());
    } else {
      setSelectedDrivers(new Set(filteredAndSortedDrivers.map(d => d.id)));
    }
  }, [selectedDrivers.size, filteredAndSortedDrivers]);

  // Get status badge variant
  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'active': return 'success';
      case 'busy': return 'warning';
      case 'break': return 'info';
      case 'inactive':
      case 'offline': return 'secondary';
      default: return 'secondary';
    }
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return `₱${amount.toLocaleString()}`;
  };

  // Get document compliance status
  const getDocumentCompliance = (documents: Driver['documents']) => {
    const completed = Object.values(documents).filter(Boolean).length;
    const total = Object.keys(documents).length;
    return { completed, total, percentage: (completed / total) * 100 };
  };

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="border-b border-neutral-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-neutral-900">Driver Management</h2>
            <p className="text-neutral-600">
              Manage your fleet of {totalDrivers} drivers
              {lastUpdated && (
                <span className="text-neutral-400 text-sm ml-2">
                  • Updated {lastUpdated.toLocaleTimeString()}
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <Button 
              variant="tertiary" 
              size="sm"
              leftIcon={driversLoading ? <Loader className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              onClick={() => refreshDrivers()}
              disabled={driversLoading}
            >
              Refresh
            </Button>
            {userRole === 'admin' && (
              <Button 
                variant="primary" 
                leftIcon={<Plus className="h-4 w-4" />}
                disabled={driversLoading}
              >
                Add Driver
              </Button>
            )}
            <Button 
              variant="secondary" 
              leftIcon={<Download className="h-4 w-4" />}
              disabled={driversLoading}
            >
              Export
            </Button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-neutral-400" />
            <input
              type="text"
              placeholder="Search drivers by name, email, phone, or plate number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-xpress-500 focus:border-xpress-500"
            />
          </div>

          {/* Quick Filters */}
          <div className="flex items-center space-x-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as FilterStatus)}
              className="px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-xpress-500 focus:border-xpress-500"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="busy">Busy</option>
              <option value="break">On Break</option>
              <option value="inactive">Inactive</option>
              <option value="offline">Offline</option>
            </select>

            <Button
              variant={showFilters ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-4 w-4" />
              Filters
            </Button>

            <div className="flex border border-neutral-300 rounded-lg">
              <button
                onClick={() => setViewMode('table')}
                className={`px-3 py-2 text-sm ${viewMode === 'table' ? 'bg-xpress-600 text-white' : 'text-neutral-600 hover:bg-neutral-50'}`}
              >
                Table
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`px-3 py-2 text-sm border-l border-neutral-300 ${viewMode === 'grid' ? 'bg-xpress-600 text-white' : 'text-neutral-600 hover:bg-neutral-50'}`}
              >
                Grid
              </button>
            </div>
          </div>
        </div>

        {/* Advanced Filters */}
        {showFilters && (
          <div className="mt-4 p-4 bg-neutral-50 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Minimum Rating
                </label>
                <select
                  value={ratingFilter || ''}
                  onChange={(e) => setRatingFilter(e.target.value ? Number(e.target.value) : null)}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-xpress-500 focus:border-xpress-500"
                >
                  <option value="">Any Rating</option>
                  <option value="4.5">4.5+</option>
                  <option value="4.0">4.0+</option>
                  <option value="3.5">3.5+</option>
                  <option value="3.0">3.0+</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Document Status
                </label>
                <select
                  value={documentsFilter === null ? '' : documentsFilter.toString()}
                  onChange={(e) => {
                    if (e.target.value === '') {
                      setDocumentsFilter(null);
                    } else {
                      setDocumentsFilter(e.target.value === 'true');
                    }
                  }}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-xpress-500 focus:border-xpress-500"
                >
                  <option value="">All Documents</option>
                  <option value="true">Complete</option>
                  <option value="false">Incomplete</option>
                </select>
              </div>

              <div className="flex items-end">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setRatingFilter(null);
                    setRevenueFilter(null);
                    setDocumentsFilter(null);
                    setStatusFilter('all');
                    setSearchQuery('');
                  }}
                >
                  Clear Filters
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Error Display */}
        {(driversError || mutationError) && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <XCircle className="h-5 w-5 text-red-600" />
              <div>
                <h4 className="font-medium text-red-900">Error Loading Data</h4>
                <p className="text-sm text-red-700">
                  {driversError || mutationError}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Results Summary */}
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-neutral-600">
            {driversLoading ? (
              <span className="flex items-center space-x-2">
                <Loader className="h-4 w-4 animate-spin" />
                <span>Loading drivers...</span>
              </span>
            ) : (
              <>
                Showing {filteredAndSortedDrivers.length} of {totalDrivers} drivers
                {selectedDrivers.size > 0 && (
                  <span className="ml-2 font-medium">
                    ({selectedDrivers.size} selected)
                  </span>
                )}
              </>
            )}
          </p>

          {selectedDrivers.size > 0 && (
            <div className="flex items-center space-x-2">
              <Button variant="secondary" size="sm">
                Bulk Actions
              </Button>
              {userRole === 'admin' && (
                <Button variant="danger" size="sm" leftIcon={<Trash2 className="h-3 w-3" />}>
                  Deactivate Selected
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {driversLoading && drivers.length === 0 ? (
          /* Loading State */
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <Loader className="h-8 w-8 animate-spin mx-auto text-xpress-600 mb-4" />
              <p className="text-neutral-600">Loading drivers...</p>
            </div>
          </div>
        ) : drivers.length === 0 && !driversLoading ? (
          /* Empty State */
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <Users className="h-12 w-12 mx-auto text-neutral-400 mb-4" />
              <h3 className="text-lg font-medium text-neutral-900 mb-2">No drivers found</h3>
              <p className="text-neutral-600 mb-4">
                {searchQuery || statusFilter !== 'all' ? 
                  'No drivers match your current filters.' : 
                  'Get started by adding your first driver.'
                }
              </p>
              {userRole === 'admin' && !searchQuery && statusFilter === 'all' && (
                <Button variant="primary" leftIcon={<Plus className="h-4 w-4" />}>
                  Add Driver
                </Button>
              )}
            </div>
          </div>
        ) : viewMode === 'table' ? (
          /* Table View */
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-neutral-50 border-b border-neutral-200">
                <tr>
                  <th className="px-6 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedDrivers.size === filteredAndSortedDrivers.length}
                      onChange={handleSelectAll}
                      className="rounded border-neutral-300 text-xpress-600 focus:ring-xpress-500"
                    />
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider cursor-pointer hover:bg-neutral-100"
                    onClick={() => handleSort('name')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Driver</span>
                      {sortField === 'name' && (
                        <span className="text-xpress-600">
                          {sortDirection === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider cursor-pointer hover:bg-neutral-100"
                    onClick={() => handleSort('rating')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Rating</span>
                      {sortField === 'rating' && (
                        <span className="text-xpress-600">
                          {sortDirection === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider cursor-pointer hover:bg-neutral-100"
                    onClick={() => handleSort('totalTrips')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Trips</span>
                      {sortField === 'totalTrips' && (
                        <span className="text-xpress-600">
                          {sortDirection === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider cursor-pointer hover:bg-neutral-100"
                    onClick={() => handleSort('revenue')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Revenue</span>
                      {sortField === 'revenue' && (
                        <span className="text-xpress-600">
                          {sortDirection === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    Vehicle
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    Documents
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-neutral-200">
                {filteredAndSortedDrivers.map((driver) => {
                  const docCompliance = getDocumentCompliance(driver.documents);
                  
                  return (
                    <tr key={driver.id} className="hover:bg-neutral-50">
                      <td className="px-6 py-4">
                        <input
                          type="checkbox"
                          checked={selectedDrivers.has(driver.id)}
                          onChange={() => handleDriverSelect(driver.id)}
                          className="rounded border-neutral-300 text-xpress-600 focus:ring-xpress-500"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-xpress-100 rounded-full flex items-center justify-center">
                            <User className="h-5 w-5 text-xpress-600" />
                          </div>
                          <div>
                            <div className="text-sm font-medium text-neutral-900">
                              {driver.name}
                            </div>
                            <div className="text-sm text-neutral-500">
                              {driver.email}
                            </div>
                            <div className="text-xs text-neutral-400">
                              {driver.phone}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant={getStatusVariant(driver.status)} size="sm">
                          {driver.status}
                        </Badge>
                        {driver.onlineHours > 0 && (
                          <div className="text-xs text-neutral-500 mt-1">
                            {driver.onlineHours}h online
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-1">
                          <Star className="h-4 w-4 text-yellow-400 fill-current" />
                          <span className="text-sm font-medium">{driver.rating}</span>
                        </div>
                        <div className="text-xs text-neutral-500">
                          {driver.completionRate}% completion
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-neutral-900">
                          {driver.totalTrips.toLocaleString()}
                        </div>
                        <div className="text-xs text-neutral-500">
                          Avg {driver.performance.avgResponseTime}min response
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-green-600">
                          {formatCurrency(driver.revenue)}
                        </div>
                        <div className="text-xs text-neutral-500">
                          This month
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-neutral-900">
                          {driver.vehicle.make} {driver.vehicle.model}
                        </div>
                        <div className="text-xs text-neutral-500">
                          {driver.vehicle.plate} • {driver.vehicle.year}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-1">
                          {docCompliance.percentage === 100 ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : docCompliance.percentage >= 75 ? (
                            <AlertCircle className="h-4 w-4 text-yellow-500" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-500" />
                          )}
                          <span className="text-xs text-neutral-600">
                            {docCompliance.completed}/{docCompliance.total}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2">
                          <Button variant="tertiary" size="sm">
                            <Phone className="h-3 w-3" />
                          </Button>
                          <Button variant="tertiary" size="sm">
                            <Mail className="h-3 w-3" />
                          </Button>
                          {userRole === 'admin' && (
                            <Button variant="tertiary" size="sm">
                              <Edit className="h-3 w-3" />
                            </Button>
                          )}
                          <Button variant="tertiary" size="sm">
                            <MoreVertical className="h-3 w-3" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          /* Grid View */
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredAndSortedDrivers.map((driver) => {
                const docCompliance = getDocumentCompliance(driver.documents);
                
                return (
                  <Card key={driver.id} variant="default" padding="md" className="relative">
                    <div className="absolute top-4 right-4">
                      <input
                        type="checkbox"
                        checked={selectedDrivers.has(driver.id)}
                        onChange={() => handleDriverSelect(driver.id)}
                        className="rounded border-neutral-300 text-xpress-600 focus:ring-xpress-500"
                      />
                    </div>

                    <div className="flex flex-col items-center text-center space-y-3">
                      <div className="w-16 h-16 bg-xpress-100 rounded-full flex items-center justify-center">
                        <User className="h-8 w-8 text-xpress-600" />
                      </div>

                      <div>
                        <h3 className="font-semibold text-neutral-900">{driver.name}</h3>
                        <p className="text-sm text-neutral-600">#{driver.id}</p>
                      </div>

                      <Badge variant={getStatusVariant(driver.status)} size="sm">
                        {driver.status}
                      </Badge>

                      <div className="w-full space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-neutral-600">Rating:</span>
                          <div className="flex items-center space-x-1">
                            <Star className="h-3 w-3 text-yellow-400 fill-current" />
                            <span className="font-medium">{driver.rating}</span>
                          </div>
                        </div>

                        <div className="flex justify-between text-sm">
                          <span className="text-neutral-600">Trips:</span>
                          <span className="font-medium">{driver.totalTrips}</span>
                        </div>

                        <div className="flex justify-between text-sm">
                          <span className="text-neutral-600">Revenue:</span>
                          <span className="font-medium text-green-600">
                            {formatCurrency(driver.revenue)}
                          </span>
                        </div>

                        <div className="flex justify-between text-sm">
                          <span className="text-neutral-600">Vehicle:</span>
                          <span className="font-medium">{driver.vehicle.plate}</span>
                        </div>

                        <div className="flex justify-between text-sm">
                          <span className="text-neutral-600">Docs:</span>
                          <div className="flex items-center space-x-1">
                            {docCompliance.percentage === 100 ? (
                              <CheckCircle className="h-3 w-3 text-green-500" />
                            ) : docCompliance.percentage >= 75 ? (
                              <AlertCircle className="h-3 w-3 text-yellow-500" />
                            ) : (
                              <XCircle className="h-3 w-3 text-red-500" />
                            )}
                            <span className="text-xs">{docCompliance.completed}/{docCompliance.total}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex space-x-2 w-full">
                        <Button variant="secondary" size="sm" fullWidth>
                          <Phone className="h-3 w-3" />
                        </Button>
                        <Button variant="secondary" size="sm" fullWidth>
                          <Mail className="h-3 w-3" />
                        </Button>
                        <Button variant="tertiary" size="sm" fullWidth>
                          <MoreVertical className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Add displayName for debugging
DriverManagement.displayName = 'DriverManagement';

export default memo(DriverManagement);