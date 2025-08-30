'use client';

import React, { useState, memo, useCallback } from 'react';
import { 
  ArrowLeft, 
  Phone, 
  Mail, 
  AlertTriangle, 
  X, 
  Shield, 
  Car, 
  CreditCard, 
  Calendar, 
  FileText, 
  GraduationCap, 
  Activity, 
  BarChart3, 
  UserX,
  MessageSquare
} from 'lucide-react';

// Import extracted components
import DriverOverviewTab from '@/components/driver-profile/DriverOverviewTab';
import DriverFraudTab from '@/components/driver-profile/DriverFraudTab';

// Import production logger
import { productionLogger } from '@/lib/security/productionLogger';

interface DriverData {
  name: string;
  id: string;
  phone: string;
  email: string;
  photo: string;
  status: string;
  location: string;
  joinDate: string;
  lastActive: string;
  rating: number;
  completionRate: number;
  acceptanceRate: number;
  cancellationRate: number;
  totalTrips: number;
  tripsToday: number;
  activeHours: string;
  totalHours: string;
  riskLevel: string;
  regionInfo?: {
    name: string;
    type: string;
  };
  trafficCondition?: 'light' | 'moderate' | 'heavy' | 'severe';
  recommendations?: string[];
  currentGeofence?: string;
  routeOptimization?: {
    suggestedRoute: string;
    estimatedTime: string;
    avoidanceTips: string[];
  };
}

interface Tab {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  urgent: boolean;
}

interface RedesignedDriverProfileProps {
  driverId?: string;
  onClose?: () => void;
  initialTab?: string;
}

const RedesignedDriverProfile = memo<RedesignedDriverProfileProps>(({
  driverId = 'DRV001',
  onClose,
  initialTab = 'overview'
}) => {
  // State management
  const [activeTab, setActiveTab] = useState(initialTab);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Mock driver data - in real implementation, this would come from props or API
  const driverData: DriverData = {
    name: 'Juan Carlos Santos',
    id: 'DRV24294',
    phone: '+639566872762',
    email: 'juan.santos@gmail.com',
    photo: '/api/placeholder/150/150',
    status: 'online',
    location: 'Makati Central Business District',
    joinDate: 'March 15, 2023',
    lastActive: '2 hours ago',
    rating: 4.92,
    completionRate: 98,
    acceptanceRate: 95,
    cancellationRate: 2,
    totalTrips: 1247,
    tripsToday: 8,
    activeHours: '7.5',
    totalHours: '2,480',
    riskLevel: 'Medium',
    regionInfo: {
      name: 'Metro Manila',
      type: 'Urban Center'
    },
    trafficCondition: 'heavy',
    recommendations: [
      'Consider EDSA route during off-peak hours',
      'Skyway access available for faster routes',
      'Avoid Ayala Avenue 4-6 PM due to construction'
    ],
    currentGeofence: 'Makati CBD Premium Zone',
    routeOptimization: {
      suggestedRoute: 'Via C5 to avoid EDSA traffic',
      estimatedTime: '25-30 minutes to BGC',
      avoidanceTips: [
        'EDSA northbound heavy traffic until 8 PM',
        'Buendia-Gil Puyat intersection construction ongoing',
        'Alternative: Kalayaan Avenue clearer'
      ]
    }
  };

  // Tab configuration
  const tabs: Tab[] = [
    { id: 'overview', label: 'Overview', icon: BarChart3, urgent: false },
    { id: 'fraud', label: 'Fraud Analysis', icon: Shield, urgent: true },
    { id: 'legal', label: 'Legal Docs', icon: FileText, urgent: false },
    { id: 'disciplinary', label: 'Disciplinary', icon: AlertTriangle, urgent: false },
    { id: 'vehicles', label: 'Vehicles', icon: Car, urgent: false },
    { id: 'commerce', label: 'Commerce', icon: CreditCard, urgent: false },
    { id: 'bookings', label: 'Bookings', icon: Calendar, urgent: false },
    { id: 'wallet', label: 'Wallet', icon: CreditCard, urgent: false },
    { id: 'chat', label: 'Chat', icon: MessageSquare, urgent: false },
    { id: 'history', label: 'History', icon: Activity, urgent: false },
    { id: 'training', label: 'Training', icon: GraduationCap, urgent: false }
  ];

  // Event handlers
  const handleTabChange = useCallback((tabId: string) => {
    productionLogger.info('Tab changed in driver profile', { tabId, driverId });
    setActiveTab(tabId);
  }, [driverId]);

  const handleClose = useCallback(() => {
    productionLogger.info('Driver profile closed', { driverId });
    if (onClose) {
      onClose();
    }
  }, [driverId, onClose]);

  const handleViewInvestigation = useCallback((investigationId: string) => {
    productionLogger.info('Investigation details requested from profile', { investigationId, driverId });
    // Handle investigation modal
  }, [driverId]);

  const handleRunFraudScan = useCallback(() => {
    productionLogger.info('Manual fraud scan initiated from profile', { driverId });
    setLoading(true);
    // Simulate fraud scan
    setTimeout(() => setLoading(false), 2000);
  }, [driverId]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'bg-green-100 text-green-800';
      case 'offline': return 'bg-gray-100 text-gray-800';
      case 'busy': return 'bg-yellow-100 text-yellow-800';
      case 'suspended': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel.toLowerCase()) {
      case 'low': return 'text-green-600';
      case 'medium': return 'text-yellow-600';
      case 'high': return 'text-orange-600';
      case 'critical': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  // Render tab content
  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <DriverOverviewTab
            driverData={driverData}
          />
        );

      case 'fraud':
        return (
          <DriverFraudTab
            driverId={driverData.id}
            onViewInvestigation={handleViewInvestigation}
            onRunFraudScan={handleRunFraudScan}
          />
        );

      case 'legal':
        return (
          <div className="bg-white rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Legal Documents</h3>
            <p className="text-gray-600">Legal documents management panel coming soon...</p>
          </div>
        );

      case 'disciplinary':
        return (
          <div className="bg-white rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Disciplinary Records</h3>
            <p className="text-gray-600">Disciplinary management panel coming soon...</p>
          </div>
        );

      case 'vehicles':
        return (
          <div className="bg-white rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Vehicle Management</h3>
            <p className="text-gray-600">Vehicle management panel coming soon...</p>
          </div>
        );

      case 'commerce':
        return (
          <div className="bg-white rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Commerce & Earnings</h3>
            <p className="text-gray-600">Commerce management panel coming soon...</p>
          </div>
        );

      default:
        return (
          <div className="bg-white rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">{tabs.find(t => t.id === activeTab)?.label}</h3>
            <p className="text-gray-600">This section is under development...</p>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white shadow-sm border-b sticky top-0 z-10">
          <div className="px-6 py-4">
            {/* Header Top */}
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={handleClose}
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
                <span>Back to Drivers</span>
              </button>
              
              <div className="flex items-center space-x-4">
                <div className="text-right">
                  <div className="text-sm text-gray-600">Risk Level</div>
                  <div className={`font-medium ${getRiskColor(driverData.riskLevel)}`}>
                    {driverData.riskLevel}
                  </div>
                </div>
                
                <button
                  onClick={handleClose}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Driver Info */}
            <div className="flex items-center space-x-4 mb-6">
              <img
                src={driverData.photo}
                alt={driverData.name}
                className="w-16 h-16 rounded-full object-cover"
              />
              
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <h1 className="text-2xl font-bold text-gray-900">{driverData.name}</h1>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(driverData.status)}`}>
                    {driverData.status.charAt(0).toUpperCase() + driverData.status.slice(1)}
                  </span>
                </div>
                
                <div className="flex items-center space-x-6 text-sm text-gray-600">
                  <div className="flex items-center space-x-2">
                    <span>ID: {driverData.id}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Phone className="w-4 h-4" />
                    <span>{driverData.phone}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Mail className="w-4 h-4" />
                    <span>{driverData.email}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="border-b">
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
                          ? 'border-blue-500 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{tab.label}</span>
                      {tab.urgent && (
                        <div className="w-2 h-2 bg-red-500 rounded-full"></div>
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

RedesignedDriverProfile.displayName = 'RedesignedDriverProfile';

export default RedesignedDriverProfile;