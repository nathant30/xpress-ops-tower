'use client';

import React, { useState, useMemo } from 'react';
import { 
  AlertTriangle, FileText, Clock, User, Play, Pause, Download,
  Zap, Heart, AlertCircle, Route, DollarSign, Volume2,
  Filter, Search, X, Video, Image, Shield, Ban,
  CheckCircle, XCircle, Calendar, ArrowUpRight, ArrowDownRight,
  Eye, Lock, Hash, Shield as ShieldIcon, MapPin
} from 'lucide-react';

// Define interfaces first
interface LocationData {
  lat: number;
  lng: number;
  address: string;
  timestamp: Date;
  speed?: number;
  heading?: number;
  accuracy?: number;
}

interface SafetyIncident {
  id: string;
  category: 'PASSENGER_SAFETY' | 'DRIVER_SAFETY' | 'VEHICLE_INCIDENT' | 'MEDICAL_EMERGENCY' | 'SECURITY_THREAT';
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  status: 'ACTIVE' | 'RESPONDING' | 'RESOLVED' | 'ESCALATED';
  severity: number;
  timestamp: Date;
  description: string;
  tripId: string;
  passengerName: string;
  passengerPhone: string;
  driverName: string;
  driverPhone: string;
  vehicleInfo: {
    model: string;
    plateNumber: string;
  };
  currentLocation: LocationData;
  reportedBy: 'PASSENGER' | 'DRIVER' | 'SYSTEM' | 'THIRD_PARTY';
  responseTime?: number;
  assignedOperator?: string;
  notes: string[];
  evidence: any[];
}

// Mock data
const mockIncidents: SafetyIncident[] = [
  {
    id: 'INC-2024-001',
    category: 'PASSENGER_SAFETY',
    priority: 'CRITICAL',
    status: 'ACTIVE',
    severity: 5,
    timestamp: new Date(Date.now() - 15 * 60 * 1000), // 15 minutes ago
    description: 'Passenger reports feeling unsafe - driver behavior concerning',
    tripId: 'TRP-789456',
    passengerName: 'Maria Santos',
    passengerPhone: '+63 917 555 0123',
    driverName: 'Juan Cruz',
    driverPhone: '+63 917 555 0456',
    vehicleInfo: {
      model: 'Toyota Vios',
      plateNumber: 'ABC-1234'
    },
    currentLocation: {
      lat: 14.5995,
      lng: 120.9842,
      address: 'Makati Avenue, Makati City',
      timestamp: new Date(),
      speed: 35
    },
    reportedBy: 'PASSENGER',
    responseTime: 2,
    assignedOperator: 'Sarah Chen',
    notes: [
      'Initial report received via panic button',
      'Driver contacted - no response',
      'Emergency services notified'
    ],
    evidence: []
  }
];

const SafetyPage = () => {
  const [incidents] = useState<SafetyIncident[]>(mockIncidents);
  const [selectedIncident, setSelectedIncident] = useState<SafetyIncident | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [filterPriority, setFilterPriority] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredIncidents = useMemo(() => {
    return incidents.filter(incident => {
      const matchesCategory = filterCategory === 'ALL' || incident.category === filterCategory;
      const matchesPriority = filterPriority === 'ALL' || incident.priority === filterPriority;
      const matchesSearch = searchTerm === '' || 
        incident.passengerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        incident.driverName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        incident.id.toLowerCase().includes(searchTerm.toLowerCase());
      
      return matchesCategory && matchesPriority && matchesSearch;
    });
  }, [incidents, filterCategory, filterPriority, searchTerm]);

  const formatElapsedTime = (incident: SafetyIncident) => {
    const timeDiff = Date.now() - incident.timestamp.getTime();
    const minutes = Math.floor(timeDiff / 60000);
    const seconds = Math.floor((timeDiff % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  };

  const getCategoryIcon = (category: SafetyIncident['category']) => {
    switch (category) {
      case 'PASSENGER_SAFETY': return <User className="w-4 h-4" />;
      case 'DRIVER_SAFETY': return <Shield className="w-4 h-4" />;
      case 'VEHICLE_INCIDENT': return <AlertTriangle className="w-4 h-4" />;
      case 'MEDICAL_EMERGENCY': return <Heart className="w-4 h-4" />;
      case 'SECURITY_THREAT': return <ShieldIcon className="w-4 h-4" />;
      default: return <AlertCircle className="w-4 h-4" />;
    }
  };

  const getPriorityColor = (priority: SafetyIncident['priority']) => {
    switch (priority) {
      case 'CRITICAL': return 'bg-red-100 text-red-800';
      case 'HIGH': return 'bg-orange-100 text-orange-800';
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-800';
      case 'LOW': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: SafetyIncident['status']) => {
    switch (status) {
      case 'ACTIVE': return 'bg-red-100 text-red-800';
      case 'RESPONDING': return 'bg-blue-100 text-blue-800';
      case 'RESOLVED': return 'bg-green-100 text-green-800';
      case 'ESCALATED': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Safety & Security Console</h1>
              <p className="mt-2 text-gray-600">Real-time incident monitoring and emergency response management</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 bg-white px-4 py-2 rounded-lg shadow-sm border">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium text-gray-700">System Online</span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Active Incidents</p>
                <p className="text-2xl font-bold text-gray-900">
                  {incidents.filter(i => i.status === 'ACTIVE').length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Clock className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Responding</p>
                <p className="text-2xl font-bold text-gray-900">
                  {incidents.filter(i => i.status === 'RESPONDING').length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Resolved Today</p>
                <p className="text-2xl font-bold text-gray-900">247</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <ArrowUpRight className="w-6 h-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Avg Response</p>
                <p className="text-2xl font-bold text-gray-900">2.3m</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="Search incidents, passengers, drivers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">All Categories</option>
              <option value="PASSENGER_SAFETY">Passenger Safety</option>
              <option value="DRIVER_SAFETY">Driver Safety</option>
              <option value="VEHICLE_INCIDENT">Vehicle Incident</option>
              <option value="MEDICAL_EMERGENCY">Medical Emergency</option>
              <option value="SECURITY_THREAT">Security Threat</option>
            </select>
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">All Priorities</option>
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>
          </div>
        </div>

        {/* Incidents Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Active Incidents</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Incident
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Details
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Location
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredIncidents.map((incident) => (
                  <tr key={incident.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          {getCategoryIcon(incident.category)}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {incident.id}
                          </div>
                          <div className="text-sm text-gray-500">
                            {incident.category.replace(/_/g, ' ')}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">
                        {incident.description}
                      </div>
                      <div className="text-sm text-gray-500 mt-1">
                        Trip: {incident.tripId} • {formatElapsedTime(incident)} ago
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex items-center">
                        <MapPin className="w-4 h-4 text-gray-400 mr-1" />
                        {incident.currentLocation.address}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPriorityColor(incident.priority)}`}>
                        {incident.priority}
                      </span>
                      <div className="text-xs text-gray-500 mt-1">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(incident.status)}`}>
                          {incident.status}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => setSelectedIncident(incident)}
                        className="text-blue-600 hover:text-blue-900 mr-3"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Incident Detail Modal */}
        {selectedIncident && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-gray-900">
                    Incident Details: {selectedIncident.id}
                  </h2>
                  <button
                    onClick={() => setSelectedIncident(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X size={24} />
                  </button>
                </div>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      Trip Information
                    </h3>
                    <div className="space-y-3">
                      <div>
                        <span className="text-sm font-medium text-gray-500">Trip ID:</span>
                        <div className="text-sm text-gray-900">{selectedIncident.tripId}</div>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-500">Passenger:</span>
                        <div className="text-sm text-gray-900">{selectedIncident.passengerName}</div>
                        <div className="text-xs text-gray-500">{selectedIncident.passengerPhone}</div>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-500">Driver:</span>
                        <div className="text-sm text-gray-900">{selectedIncident.driverName}</div>
                        <div className="text-xs text-gray-500">{selectedIncident.driverPhone}</div>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      Incident Details
                    </h3>
                    <div className="space-y-3">
                      <div>
                        <span className="text-sm font-medium text-gray-500">Description:</span>
                        <div className="text-sm text-gray-900">{selectedIncident.description}</div>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-500">Priority:</span>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ml-2 ${getPriorityColor(selectedIncident.priority)}`}>
                          {selectedIncident.priority}
                        </span>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-500">Status:</span>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ml-2 ${getStatusColor(selectedIncident.status)}`}>
                          {selectedIncident.status}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SafetyPage;