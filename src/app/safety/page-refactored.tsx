'use client';

import React, { useState, memo, useCallback, useMemo } from 'react';
import { 
  AlertTriangle, 
  FileText, 
  Clock, 
  Shield, 
  MapPin,
  Phone,
  Video,
  MessageCircle
} from 'lucide-react';

// Import extracted components
import SafetyIncidentOverview from '@/components/safety/SafetyIncidentOverview';

// Import production logger
import { productionLogger } from '@/lib/security/productionLogger';

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
  vehicleInfo: {
    plateNumber: string;
    model: string;
    color: string;
    year: string;
  };
  currentLocation: {
    lat: number;
    lng: number;
    address: string;
    timestamp?: Date;
    speed?: number;
    heading?: number;
    accuracy?: number;
  };
}

interface Tab {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  urgent?: boolean;
}

const SafetyPage = memo(() => {
  // State management
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedIncident, setSelectedIncident] = useState<string | null>('INC-001');
  const [loading, setLoading] = useState(false);

  // Mock incident data - in real implementation, this would come from API
  const mockIncident: SafetyIncident = useMemo(() => ({
    id: 'INC-001',
    category: 'SOS',
    severity: 9,
    priority: 'CRITICAL',
    description: 'Passenger reported feeling unsafe during trip. Driver behavior concerning according to passenger.',
    timestamp: new Date('2024-08-30T14:30:00'),
    responseDeadline: new Date('2024-08-30T15:00:00'),
    status: 'ACTIVE',
    assignedOperator: 'Sarah Chen',
    tripId: 'TRIP-789456',
    tripStatus: 'IN_PROGRESS',
    passengerName: 'Maria Santos',
    passengerPhone: '+639171234567',
    passengerId: 'PASS-12345',
    passengerRating: 4.8,
    passengerTrips: 127,
    driverName: 'Juan Dela Cruz',
    driverPhone: '+639181234567',
    driverId: 'DRV-67890',
    driverRating: 4.2,
    driverTrips: 892,
    vehicleInfo: {
      plateNumber: 'ABC-1234',
      model: 'Toyota Vios',
      color: 'White',
      year: '2020'
    },
    currentLocation: {
      lat: 14.5995,
      lng: 120.9842,
      address: 'EDSA Corner Ayala Avenue, Makati City',
      timestamp: new Date(),
      speed: 25,
      heading: 45,
      accuracy: 5
    }
  }), []);

  // Tab configuration
  const tabs: Tab[] = useMemo(() => [
    { id: 'overview', label: 'Overview', icon: AlertTriangle, urgent: true },
    { id: 'communication', label: 'Communications', icon: MessageCircle },
    { id: 'evidence', label: 'Evidence', icon: FileText },
    { id: 'timeline', label: 'Timeline', icon: Clock },
    { id: 'location', label: 'Live Location', icon: MapPin },
    { id: 'video', label: 'Live Video', icon: Video },
    { id: 'protocols', label: 'Safety Protocols', icon: Shield }
  ], []);

  // Event handlers
  const handleTabChange = useCallback((tabId: string) => {
    productionLogger.info('Safety tab changed', { tabId, incidentId: selectedIncident });
    setActiveTab(tabId);
  }, [selectedIncident]);

  const handleContactPassenger = useCallback(() => {
    productionLogger.info('Contacting passenger from safety incident', { 
      incidentId: selectedIncident,
      passengerPhone: mockIncident.passengerPhone 
    });
    // Handle passenger contact
  }, [selectedIncident, mockIncident.passengerPhone]);

  const handleContactDriver = useCallback(() => {
    productionLogger.info('Contacting driver from safety incident', { 
      incidentId: selectedIncident,
      driverPhone: mockIncident.driverPhone 
    });
    // Handle driver contact  
  }, [selectedIncident, mockIncident.driverPhone]);

  const handleViewLocation = useCallback(() => {
    productionLogger.info('Viewing location from safety incident', { 
      incidentId: selectedIncident,
      location: mockIncident.currentLocation 
    });
    setActiveTab('location');
  }, [selectedIncident, mockIncident.currentLocation]);

  // Render tab content
  const renderTabContent = useCallback(() => {
    switch (activeTab) {
      case 'overview':
        return (
          <SafetyIncidentOverview
            incident={mockIncident}
            onContactPassenger={handleContactPassenger}
            onContactDriver={handleContactDriver}
            onViewLocation={handleViewLocation}
          />
        );

      case 'communication':
        return (
          <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <MessageCircle className="w-5 h-5" />
              Communications Log
            </h3>
            <p className="text-gray-400">Communication history and call logs will be displayed here...</p>
          </div>
        );

      case 'evidence':
        return (
          <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Evidence Collection
            </h3>
            <p className="text-gray-400">Photos, audio recordings, and other evidence will be displayed here...</p>
          </div>
        );

      case 'timeline':
        return (
          <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Incident Timeline
            </h3>
            <p className="text-gray-400">Detailed timeline of incident events will be displayed here...</p>
          </div>
        );

      case 'location':
        return (
          <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Live Location Tracking
            </h3>
            <p className="text-gray-400">Real-time location map will be displayed here...</p>
          </div>
        );

      case 'video':
        return (
          <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Video className="w-5 h-5" />
              Live Video Feed
            </h3>
            <p className="text-gray-400">Live video streams from vehicle cameras will be displayed here...</p>
          </div>
        );

      case 'protocols':
        return (
          <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Safety Protocols
            </h3>
            <p className="text-gray-400">Emergency response protocols and procedures will be displayed here...</p>
          </div>
        );

      default:
        return null;
    }
  }, [activeTab, mockIncident, handleContactPassenger, handleContactDriver, handleViewLocation]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-white">Loading safety incident...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-slate-800 border-b border-slate-700 sticky top-0 z-10">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-2xl font-bold text-white">Safety Response Center</h1>
                <p className="text-gray-400">Emergency incident management and response</p>
              </div>
              
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                  <span className="text-red-400 font-medium">CRITICAL INCIDENT ACTIVE</span>
                </div>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="border-b border-slate-700">
              <nav className="flex space-x-8 overflow-x-auto">
                {tabs.map((tab) => {
                  const isActive = activeTab === tab.id;
                  const Icon = tab.icon;
                  
                  return (
                    <button
                      key={tab.id}
                      onClick={() => handleTabChange(tab.id)}
                      className={`flex items-center space-x-2 py-3 px-1 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
                        isActive
                          ? 'border-red-500 text-red-400'
                          : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-600'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{tab.label}</span>
                      {tab.urgent && (
                        <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                      )}
                    </button>
                  );
                })}
              </nav>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="p-6">
          {renderTabContent()}
        </div>
      </div>
    </div>
  );
});

SafetyPage.displayName = 'SafetyPage';

export default SafetyPage;