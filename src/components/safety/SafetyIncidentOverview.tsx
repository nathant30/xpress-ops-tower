'use client';

import React, { memo } from 'react';
import { 
  User, 
  Car, 
  Star, 
  Phone, 
  MapPin, 
  Clock,
  Shield,
  AlertTriangle,
  Calendar
} from 'lucide-react';

interface VehicleInfo {
  plateNumber: string;
  model: string;
  color: string;
  year: string;
}

interface LocationInfo {
  lat: number;
  lng: number;
  address: string;
  timestamp?: Date;
  speed?: number;
  heading?: number;
  accuracy?: number;
}

interface SafetyIncident {
  id: string;
  category: 'SOS' | 'HARASSMENT' | 'ACCIDENT' | 'ROUTE_DEVIATION' | 'MEDICAL' | 'VIOLENCE' | 'FRAUD' | 'PANIC' | 'SUSPICIOUS_BEHAVIOR';
  severity: number;
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  description: string;
  timestamp: Date;
  responseDeadline: Date;
  status: 'ACTIVE' | 'INVESTIGATING' | 'RESOLVED' | 'ESCALATED';
  assignedOperator: string;
  tripId: string;
  tripStatus: string;
  passengerName: string;
  passengerPhone: string;
  passengerId: string;
  passengerRating: number;
  passengerTrips: number;
  driverName: string;
  driverPhone: string;
  driverId: string;
  driverRating: number;
  driverTrips: number;
  vehicleInfo: VehicleInfo;
  currentLocation: LocationInfo;
}

interface SafetyIncidentOverviewProps {
  incident: SafetyIncident;
  onContactPassenger?: () => void;
  onContactDriver?: () => void;
  onViewLocation?: () => void;
}

const SafetyIncidentOverview = memo<SafetyIncidentOverviewProps>(({
  incident,
  onContactPassenger,
  onContactDriver,
  onViewLocation
}) => {
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'CRITICAL': return 'text-red-600 bg-red-100';
      case 'HIGH': return 'text-orange-600 bg-orange-100';
      case 'MEDIUM': return 'text-yellow-600 bg-yellow-100';
      case 'LOW': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'text-red-600 bg-red-100';
      case 'INVESTIGATING': return 'text-blue-600 bg-blue-100';
      case 'RESOLVED': return 'text-green-600 bg-green-100';
      case 'ESCALATED': return 'text-purple-600 bg-purple-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'SOS': return <AlertTriangle className="w-5 h-5 text-red-500" />;
      case 'HARASSMENT': return <Shield className="w-5 h-5 text-orange-500" />;
      case 'ACCIDENT': return <Car className="w-5 h-5 text-red-500" />;
      case 'MEDICAL': return <User className="w-5 h-5 text-blue-500" />;
      default: return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
    }
  };

  return (
    <div className="space-y-4 h-full flex flex-col">
      {/* Incident Header */}
      <div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-3">
            {getCategoryIcon(incident.category)}
            <div>
              <h3 className="text-lg font-semibold text-white">Safety Incident #{incident.id}</h3>
              <p className="text-gray-400 text-sm">{incident.category.replace('_', ' ')}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${getPriorityColor(incident.priority)}`}>
              {incident.priority}
            </span>
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(incident.status)}`}>
              {incident.status}
            </span>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="flex items-center space-x-2 text-gray-300">
            <Clock className="w-4 h-4" />
            <span>Reported: {incident.timestamp.toLocaleString()}</span>
          </div>
          <div className="flex items-center space-x-2 text-gray-300">
            <Calendar className="w-4 h-4" />
            <span>Deadline: {incident.responseDeadline.toLocaleString()}</span>
          </div>
          <div className="flex items-center space-x-2 text-gray-300">
            <User className="w-4 h-4" />
            <span>Operator: {incident.assignedOperator}</span>
          </div>
        </div>
      </div>

      {/* Driver & Passenger Details */}
      <div className="grid grid-cols-2 gap-4">
        {/* Passenger Details */}
        <div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-lg font-semibold text-blue-400 flex items-center gap-2">
              <User className="w-5 h-5" />
              Passenger
            </h4>
            <div className="flex items-center gap-1">
              <Star className="w-4 h-4 text-yellow-400 fill-current" />
              <span className="text-white text-sm">{incident.passengerRating}</span>
            </div>
          </div>
          
          <div className="space-y-2 mb-4">
            <div className="text-white font-semibold">{incident.passengerName}</div>
            <div className="text-blue-300 flex items-center gap-2">
              <Phone className="w-4 h-4" />
              {incident.passengerPhone}
            </div>
            <div className="text-gray-400 text-sm">ID: {incident.passengerId}</div>
            <div className="text-gray-400 text-sm">{incident.passengerTrips} trips completed</div>
          </div>

          <button
            onClick={onContactPassenger}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Contact Passenger
          </button>
        </div>

        {/* Driver Details */}
        <div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-lg font-semibold text-orange-400 flex items-center gap-2">
              <Car className="w-5 h-5" />
              Driver
            </h4>
            <div className="flex items-center gap-1">
              <Star className="w-4 h-4 text-yellow-400 fill-current" />
              <span className="text-white text-sm">{incident.driverRating}</span>
            </div>
          </div>
          
          <div className="space-y-2 mb-4">
            <div className="text-white font-semibold">{incident.driverName}</div>
            <div className="text-orange-300 flex items-center gap-2">
              <Phone className="w-4 h-4" />
              {incident.driverPhone}
            </div>
            <div className="text-gray-400 text-sm">ID: {incident.driverId}</div>
            <div className="text-gray-400 text-sm">{incident.driverTrips} trips completed</div>
          </div>

          <button
            onClick={onContactDriver}
            className="w-full bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Contact Driver
          </button>
        </div>
      </div>

      {/* Vehicle & Location Info */}
      <div className="grid grid-cols-2 gap-4">
        {/* Vehicle Info */}
        <div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
          <h4 className="text-lg font-semibold text-green-400 mb-3 flex items-center gap-2">
            <Car className="w-5 h-5" />
            Vehicle Information
          </h4>
          
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Plate Number:</span>
              <span className="text-white font-medium">{incident.vehicleInfo.plateNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Model:</span>
              <span className="text-white">{incident.vehicleInfo.model}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Color:</span>
              <span className="text-white">{incident.vehicleInfo.color}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Year:</span>
              <span className="text-white">{incident.vehicleInfo.year}</span>
            </div>
          </div>
        </div>

        {/* Current Location */}
        <div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-lg font-semibold text-purple-400 flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Current Location
            </h4>
            <button
              onClick={onViewLocation}
              className="text-purple-300 hover:text-purple-100 text-sm"
            >
              View on Map
            </button>
          </div>
          
          <div className="space-y-2 text-sm">
            <div className="text-white">{incident.currentLocation.address}</div>
            <div className="text-gray-400">
              Lat: {incident.currentLocation.lat.toFixed(6)}
            </div>
            <div className="text-gray-400">
              Lng: {incident.currentLocation.lng.toFixed(6)}
            </div>
            {incident.currentLocation.speed && (
              <div className="text-gray-400">
                Speed: {incident.currentLocation.speed} km/h
              </div>
            )}
            {incident.currentLocation.timestamp && (
              <div className="text-gray-400">
                Updated: {incident.currentLocation.timestamp.toLocaleTimeString()}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Incident Description */}
      <div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
        <h4 className="text-lg font-semibold text-red-400 mb-3 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5" />
          Incident Description
        </h4>
        <p className="text-white">{incident.description}</p>
      </div>

      {/* Trip Information */}
      <div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
        <h4 className="text-lg font-semibold text-yellow-400 mb-3">Trip Information</h4>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-400">Trip ID:</span>
            <span className="text-white font-medium">{incident.tripId}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Trip Status:</span>
            <span className="text-white">{incident.tripStatus}</span>
          </div>
        </div>
      </div>
    </div>
  );
});

SafetyIncidentOverview.displayName = 'SafetyIncidentOverview';

export default SafetyIncidentOverview;