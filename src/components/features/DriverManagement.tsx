// Xpress Ops Tower - Driver Management Interface
// Airtable-style grid with advanced filtering and management features

'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { 
  Search, Filter, Download, Plus, MoreVertical, Edit, Trash2, 
  Phone, Mail, MapPin, Star, TrendingUp, TrendingDown, Clock, 
  CheckCircle, XCircle, AlertCircle, User, Car, Shield, Activity
} from 'lucide-react';

import { Button, XpressCard as Card, Badge } from '@/components/xpress';

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
  // Mock driver data - would come from API
  const [drivers] = useState<Driver[]>([
    {
      id: 'DR001',
      name: 'Juan Carlos Cruz',
      email: 'juan.cruz@email.com',
      phone: '+63 917 123 4567',
      status: 'active',
      rating: 4.8,
      totalTrips: 1247,
      completionRate: 98.5,
      revenue: 125430,
      vehicle: {
        make: 'Toyota',
        model: 'Vios',
        plate: 'ABC 1234',
        year: 2020
      },
      location: {
        lat: 14.5995,
        lng: 120.9842,
        address: 'Makati CBD, Metro Manila'
      },
      onlineHours: 8.5,
      lastActive: new Date(Date.now() - 300000),
      joinDate: new Date('2023-03-15'),
      documents: {
        license: true,
        insurance: true,
        registration: true,
        backgroundCheck: true
      },
      performance: {
        avgRating: 4.8,
        avgResponseTime: 2.3,
        cancelationRate: 0.8,
        complaintCount: 2
      }
    },
    {
      id: 'DR002',
      name: 'Ana Maria Garcia',
      email: 'ana.garcia@email.com',
      phone: '+63 917 987 6543',
      status: 'busy',
      rating: 4.9,
      totalTrips: 2103,
      completionRate: 99.2,
      revenue: 186750,
      vehicle: {
        make: 'Honda',
        model: 'City',
        plate: 'XYZ 5678',
        year: 2021
      },
      location: {
        lat: 14.6760,
        lng: 121.0437,
        address: 'Ortigas Center, Pasig'
      },
      onlineHours: 9.2,
      lastActive: new Date(),
      joinDate: new Date('2022-11-08'),
      documents: {
        license: true,
        insurance: true,
        registration: true,
        backgroundCheck: true
      },
      performance: {
        avgRating: 4.9,
        avgResponseTime: 1.8,
        cancelationRate: 0.3,
        complaintCount: 0
      }
    },
    {
      id: 'DR003',
      name: 'Roberto Santos',
      email: 'roberto.santos@email.com',
      phone: '+63 917 555 0123',
      status: 'offline',
      rating: 4.2,
      totalTrips: 856,
      completionRate: 94.7,
      revenue: 89250,
      vehicle: {
        make: 'Mitsubishi',
        model: 'Mirage',
        plate: 'DEF 9012',
        year: 2019
      },
      location: {
        lat: 14.5764,
        lng: 121.0851,
        address: 'BGC, Taguig'
      },
      onlineHours: 0,
      lastActive: new Date(Date.now() - 7200000),
      joinDate: new Date('2023-07-22'),
      documents: {
        license: true,
        insurance: false,
        registration: true,
        backgroundCheck: true
      },
      performance: {
        avgRating: 4.2,
        avgResponseTime: 3.1,
        cancelationRate: 2.1,
        complaintCount: 8
      }
    }
  ]);

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
              Manage your fleet of {drivers.length} drivers
            </p>
          </div>
          <div className="flex items-center space-x-3">
            {userRole === 'admin' && (
              <Button variant="primary" leftIcon={<Plus className="h-4 w-4" />}>
                Add Driver
              </Button>
            )}
            <Button variant="secondary" leftIcon={<Download className="h-4 w-4" />}>
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

        {/* Results Summary */}
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-neutral-600">
            Showing {filteredAndSortedDrivers.length} of {drivers.length} drivers
            {selectedDrivers.size > 0 && (
              <span className="ml-2 font-medium">
                ({selectedDrivers.size} selected)
              </span>
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
        {viewMode === 'table' ? (
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

export default DriverManagement;