'use client';

import React, { useState, memo, useCallback } from 'react';
import { 
  TrendingUp, 
  Users, 
  FileText, 
  Car,
  DollarSign,
  Shield,
  GraduationCap,
  X,
  ChevronLeft
} from 'lucide-react';

// Import extracted components
import DriverInsightsPanel from '@/components/driver-admin/DriverInsightsPanel';
import DriverDocumentsPanel from '@/components/driver-admin/DriverDocumentsPanel';
import DriverTripsPanel from '@/components/driver-admin/DriverTripsPanel';

// Import production logger
import { productionLogger } from '@/lib/security/productionLogger';

// Types
interface DriverData {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  dateOfBirth: string;
  joinDate: string;
  lastActive: string;
  rating: number;
  avatar?: string;
}

interface DriverAdminPortalProps {
  driver?: DriverData;
  onClose?: () => void;
  className?: string;
}

const DriverAdminPortal = memo<DriverAdminPortalProps>(({ 
  driver: propDriver, 
  onClose,
  className = '' 
}) => {
  // State management
  const [activeTab, setActiveTab] = useState('insights');
  const [loading, setLoading] = useState(false);

  // Mock data - in real implementation, this would come from props or API
  const mockPerformanceMetrics = {
    completionRate: 100,
    completedTrips: 3,
    totalTrips: 3,
    acceptanceRate: 100,
    acceptedRequests: 3,
    totalRequests: 3,
    cancellationRate: 0,
    cancelledTrips: 0
  };

  const mockActiveHours = {
    averagePerDay: 7.68,
    totalForPeriod: 7.7
  };

  const mockAchievements = [
    { emoji: '💎', title: 'Excellent Service', score: 67 },
    { emoji: '🧭', title: 'Expert Navigation', score: 67 },
    { emoji: '⚡', title: 'Speed Demon', score: 85 },
    { emoji: '🛡️', title: 'Safety First', score: 92 }
  ];

  const mockReviews = [
    { rating: 5.0, comment: "Excellent service and friendly driver!" },
    { rating: 4.8, comment: "Very professional and punctual." },
    { rating: 5.0, comment: "Safe driving and clean vehicle." }
  ];

  const mockDocuments = [
    {
      id: '1',
      type: 'driver_license_front',
      status: 'valid' as const,
      expiryDate: '2025-12-15',
      uploadDate: '2024-01-15',
      fileUrl: '/documents/license-front.jpg'
    },
    {
      id: '2', 
      type: 'driver_license_back',
      status: 'valid' as const,
      expiryDate: '2025-12-15',
      uploadDate: '2024-01-15',
      fileUrl: '/documents/license-back.jpg'
    },
    {
      id: '3',
      type: 'nbi_clearance',
      status: 'expired' as const,
      expiryDate: '2024-03-20',
      uploadDate: '2023-03-20',
      fileUrl: '/documents/nbi.pdf'
    }
  ];

  const mockTrips = [
    {
      id: 'T001',
      status: 'completed' as const,
      fare: 450,
      distance: '15.2 km',
      duration: '42 mins',
      passengerName: 'Maria Santos',
      passengerPhone: '+639171234567',
      pickupAddress: '123 EDSA, Quezon City',
      dropoffAddress: '456 Ayala Ave, Makati',
      pickupTime: '2024-12-28 14:20:00',
      dropoffTime: '2024-12-28 15:02:00',
      commission: 67.50,
      netEarning: 382.50,
      rating: 5.0,
      feedback: 'Excellent service! Very professional driver.',
      paymentMethod: 'GCash',
      referenceNumber: 'GC-2025082830001',
      vehicleUsed: 'Toyota Vios (ABC-1234)',
      routeNotes: 'Used EDSA for main route'
    },
    {
      id: 'T002',
      status: 'completed' as const,
      fare: 280,
      distance: '8.5 km',
      duration: '25 mins',
      passengerName: 'Juan Dela Cruz',
      passengerPhone: '+639181234567',
      pickupAddress: '789 Ortigas Ave, Pasig',
      dropoffAddress: '321 BGC, Taguig',
      pickupTime: '2024-12-28 12:00:00',
      dropoffTime: '2024-12-28 12:25:00',
      commission: 42.00,
      netEarning: 238.00,
      rating: 4.8,
      feedback: 'Good service, arrived on time.',
      paymentMethod: 'Cash',
      referenceNumber: 'CASH-001234',
      vehicleUsed: 'Toyota Vios (ABC-1234)'
    }
  ];

  // Default driver data
  const driver = propDriver || {
    id: 'DRV001',
    name: 'Juan Dela Cruz',
    phone: '+639566872762',
    email: 'juan.driver@xpress.ops',
    address: '123 Main St, Manila',
    dateOfBirth: '1985-03-15',
    joinDate: '2023-01-15',
    lastActive: '2024-12-28 15:30:00',
    rating: 4.8,
    avatar: undefined
  };

  // Tab configuration
  const tabs = [
    { id: 'insights', label: 'Insights', icon: TrendingUp },
    { id: 'legal', label: 'Documents', icon: FileText },
    { id: 'vehicles', label: 'Vehicles', icon: Car },
    { id: 'trips', label: 'Trip History', icon: Users },
    { id: 'transactions', label: 'Transactions', icon: DollarSign },
    { id: 'fraud', label: 'Fraud Detection', icon: Shield },
    { id: 'learning', label: 'Learning Hub', icon: GraduationCap }
  ];

  // Event handlers
  const handleTabChange = useCallback((tabId: string) => {
    productionLogger.info('Tab changed in driver admin portal', { tabId, driverId: driver.id });
    setActiveTab(tabId);
  }, [driver.id]);

  const handleClose = useCallback(() => {
    productionLogger.info('Driver admin portal closed', { driverId: driver.id });
    if (onClose) {
      onClose();
    }
  }, [driver.id, onClose]);

  const handleAchievementClick = useCallback((achievement: any) => {
    productionLogger.info('Achievement clicked in driver portal', { 
      achievement: achievement.title,
      driverId: driver.id 
    });
    // Handle achievement details modal
  }, [driver.id]);

  const handleDocumentUpload = useCallback((file: File, documentType: string) => {
    productionLogger.info('Document upload initiated', { 
      fileName: file.name,
      fileType: file.type,
      documentType,
      driverId: driver.id
    });
    // Handle document upload
  }, [driver.id]);

  const handleDocumentView = useCallback((documentId: string) => {
    productionLogger.info('Document view requested', { 
      documentId,
      driverId: driver.id 
    });
    // Handle document view
  }, [driver.id]);

  const handleDocumentDownload = useCallback((documentId: string) => {
    productionLogger.info('Document download requested', { 
      documentId,
      driverId: driver.id 
    });
    // Handle document download
  }, [driver.id]);

  const handleTripView = useCallback((trip: any) => {
    productionLogger.info('Trip details requested', { 
      tripId: trip.id,
      driverId: driver.id 
    });
    // Handle trip detail modal
  }, [driver.id]);

  // Render tab content
  const renderTabContent = () => {
    switch (activeTab) {
      case 'insights':
        return (
          <DriverInsightsPanel
            performanceMetrics={mockPerformanceMetrics}
            activeHours={mockActiveHours}
            achievements={mockAchievements}
            reviews={mockReviews}
            onAchievementClick={handleAchievementClick}
          />
        );

      case 'legal':
        return (
          <DriverDocumentsPanel
            documents={mockDocuments}
            onDocumentUpload={handleDocumentUpload}
            onDocumentView={handleDocumentView}
            onDocumentDownload={handleDocumentDownload}
          />
        );

      case 'trips':
        return (
          <DriverTripsPanel
            trips={mockTrips}
            onTripView={handleTripView}
            loading={loading}
          />
        );

      case 'vehicles':
        return (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Vehicle Management</h3>
            <p className="text-gray-600">Vehicle management panel coming soon...</p>
          </div>
        );

      case 'transactions':
        return (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Financial Transactions</h3>
            <p className="text-gray-600">Transactions panel coming soon...</p>
          </div>
        );

      case 'fraud':
        return (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Fraud Detection</h3>
            <p className="text-gray-600">Fraud detection panel coming soon...</p>
          </div>
        );

      case 'learning':
        return (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Learning Hub</h3>
            <p className="text-gray-600">Learning management panel coming soon...</p>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className={`bg-gray-50 min-h-screen ${className}`}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white shadow-sm border-b sticky top-0 z-10">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <button
                  onClick={handleClose}
                  className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  <ChevronLeft className="w-5 h-5" />
                  <span>Back</span>
                </button>
                
                <div className="flex items-center space-x-3">
                  {driver.avatar ? (
                    <img
                      src={driver.avatar}
                      alt={driver.name}
                      className="w-10 h-10 rounded-full"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-medium">
                      {driver.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <h1 className="text-xl font-bold text-gray-900">{driver.name}</h1>
                    <p className="text-sm text-gray-600">Driver ID: {driver.id}</p>
                  </div>
                </div>
              </div>

              <button
                onClick={handleClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Navigation Tabs */}
            <div className="mt-4">
              <nav className="flex space-x-8">
                {tabs.map((tab) => {
                  const isActive = activeTab === tab.id;
                  const Icon = tab.icon;
                  
                  return (
                    <button
                      key={tab.id}
                      onClick={() => handleTabChange(tab.id)}
                      className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                        isActive
                          ? 'border-blue-500 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{tab.label}</span>
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

DriverAdminPortal.displayName = 'DriverAdminPortal';

export default DriverAdminPortal;