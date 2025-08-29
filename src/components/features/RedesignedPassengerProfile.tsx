'use client';

import React, { useState } from 'react';
import { ArrowLeft, Phone, Mail, AlertTriangle, CheckCircle, X, Upload, Edit3, Download, MessageSquare, Shield, MapPin, CreditCard, Calendar, FileText, Star, Activity, Eye } from 'lucide-react';

interface PassengerData {
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
  totalBookings: number;
  bookingsToday: number;
  totalSpent: number;
  avgBookingValue: number;
  cancellationRate: number;
  customerTier: string;
  riskLevel: string;
}

interface Tab {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  urgent: boolean;
}

interface Document {
  id: number;
  name: string;
  status: 'verified' | 'expired' | 'pending';
  expiry: string;
  url: string;
}

interface DocumentViewerProps {
  doc: Document;
  onClose: () => void;
}

const RedesignedPassengerProfile = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [activeModal, setActiveModal] = useState<{
    type: 'booking' | 'transaction' | 'conversation' | 'issue' | 'activity' | null;
    data: any;
  }>({ type: null, data: null });
  const [confirmDialog, setConfirmDialog] = useState<{show: boolean, title: string, message: string, action: () => void} | null>(null);

  // Helper functions
  const openModal = (type: 'booking' | 'transaction' | 'conversation' | 'issue' | 'activity', data: any) => {
    setActiveModal({ type, data });
  };

  const closeModal = () => {
    setActiveModal({ type: null, data: null });
  };

  const showConfirmDialog = (title: string, message: string, action: () => void) => {
    setConfirmDialog({ show: true, title, message, action });
  };

  const passengerData: PassengerData = {
    name: 'Maria Santos',
    id: 'PSG-201922',
    phone: '+639069780294',
    email: 'maria.santos1922@gmail.com',
    photo: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIwIiBoZWlnaHQ9IjEyMCIgdmlld0JveD0iMCAwIDEyMCAxMjAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxMjAiIGhlaWdodD0iMTIwIiBmaWxsPSIjRjNGNEY2Ii8+CjxjaXJjbGUgY3g9IjYwIiBjeT0iNDAiIHI9IjE4IiBmaWxsPSIjOUI5QkE1Ii8+CjxwYXRoIGQ9Ik0zMCA5MEM0MCA3NCA1MCA3NCA2MCA3NEg2MEM3MCA3NCA4MCA3NCA5MCA5MEgzMFoiIGZpbGw9IiM5QjlCQTUiLz4KPC9zdmc+',
    status: 'active',
    location: 'Metro Manila',
    joinDate: 'Jan 15, 2023',
    lastActive: 'Recently booked',
    rating: 4.9,
    completionRate: 98,
    totalBookings: 1248,
    bookingsToday: 3,
    totalSpent: 85420.50,
    avgBookingValue: 68.50,
    cancellationRate: 2,
    customerTier: 'VIP',
    riskLevel: 'Low'
  };

  const tabs: Tab[] = [
    { id: 'overview', label: 'Overview', icon: Activity, urgent: false },
    { id: 'fraud', label: 'Fraud', icon: Shield, urgent: false },
    { id: 'identity', label: 'Identity Docs', icon: FileText, urgent: false },
    { id: 'preferences', label: 'Preferences', icon: MapPin, urgent: false },
    { id: 'commerce', label: 'Commerce', icon: CreditCard, urgent: false },
    { id: 'bookings', label: 'Bookings', icon: Calendar, urgent: false },
    { id: 'complaints', label: 'Complaints', icon: AlertTriangle, urgent: false },
    { id: 'wallet', label: 'Wallet', icon: CreditCard, urgent: false },
    { id: 'chat', label: 'Chat', icon: MessageSquare, urgent: false },
    { id: 'rewards', label: 'Rewards', icon: Star, urgent: false }
  ];

  const documents: Document[] = [
    { id: 1, name: 'Government ID', status: 'verified', expiry: '2029-08-29', url: '#' },
    { id: 2, name: 'Proof of Address', status: 'verified', expiry: '2025-12-31', url: '#' },
    { id: 3, name: 'Payment Verification', status: 'verified', expiry: 'N/A', url: '#' }
  ];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
      case 'vip':
        return 'bg-green-100 text-green-800';
      case 'suspended':
        return 'bg-orange-100 text-orange-800';
      case 'banned':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk.toLowerCase()) {
      case 'low':
        return 'bg-green-100 text-green-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'high':
        return 'bg-orange-100 text-orange-800';
      case 'critical':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Quick Actions Component
  const QuickActions = () => (
    <div className="flex gap-2">
      <button className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm flex items-center gap-2">
        <MessageSquare className="w-4 h-4" />
        <span className="hidden sm:inline">Message</span>
      </button>
      <button 
        onClick={() => showConfirmDialog(
          'Suspend Customer', 
          'Are you sure you want to suspend this customer?',
          () => console.log('Customer suspended')
        )}
        className="px-3 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm"
      >
        <span className="hidden sm:inline">Suspend</span>
        <span className="sm:hidden">Suspend</span>
      </button>
      <button className="px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm flex items-center gap-2">
        <Edit3 className="w-4 h-4" />
        <span className="hidden sm:inline">Edit</span>
      </button>
    </div>
  );

  const DocumentViewer: React.FC<DocumentViewerProps> = ({ doc, onClose }) => (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-auto">
        <div className="p-4 border-b flex justify-between items-center">
          <h3 className="font-semibold">{doc.name}</h3>
          <div className="flex gap-2">
            <button className="p-2 hover:bg-gray-100 rounded transition-colors">
              <Download className="w-4 h-4" />
            </button>
            <button className="p-2 hover:bg-gray-100 rounded transition-colors">
              <Edit3 className="w-4 h-4" />
            </button>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="p-6">
          <div className="text-center">
            <FileText className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-600">Document preview would appear here</p>
            <p className="text-sm text-gray-500 mt-2">Status: {doc.status}</p>
            {doc.expiry !== 'N/A' && <p className="text-sm text-gray-500">Expires: {doc.expiry}</p>}
          </div>
        </div>
      </div>
    </div>
  );

  const renderOverviewTab = () => (
    <div className="space-y-6">
      {/* Low Risk Alert for contrast with driver */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <h3 className="font-semibold text-green-800">Account Status: Excellent</h3>
            <p className="text-green-700 text-sm mt-1">Verified identity documents and consistent payment history.</p>
            <button 
              onClick={() => setActiveTab('fraud')}
              className="mt-2 text-sm bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 transition-colors"
            >
              View Details
            </button>
          </div>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-green-600">{passengerData.completionRate}%</div>
          <div className="text-sm text-green-800">Completion Rate</div>
          <div className="text-xs text-green-600 mt-1">{passengerData.totalBookings.toLocaleString()} bookings</div>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-blue-600">{formatCurrency(passengerData.avgBookingValue)}</div>
          <div className="text-sm text-blue-800">Avg Booking Value</div>
          <div className="text-xs text-blue-600 mt-1">{passengerData.bookingsToday} today</div>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-red-600">{passengerData.cancellationRate}%</div>
          <div className="text-sm text-red-800">Cancellation Rate</div>
          <div className="text-xs text-red-600 mt-1">This month</div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white border rounded-lg">
        <div className="p-4 border-b bg-gray-50">
          <h3 className="font-semibold text-gray-900">Today's Activity</h3>
        </div>
        <div className="p-4 space-y-3">
          <div className="flex items-center gap-4 p-4 bg-green-50 rounded-lg border border-green-200">
            <div className="flex items-center justify-center w-10 h-10 bg-green-500 rounded-full">
              <CheckCircle className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-gray-900">Booking completed</div>
              <div className="text-xs text-gray-500">BGC to NAIA Terminal 3 • 2 hours ago</div>
            </div>
            <div className="text-right">
              <div className="text-lg font-bold text-green-600">₱450</div>
              <div className="text-xs text-gray-500">4.9 ⭐</div>
            </div>
          </div>
          <div className="flex items-center gap-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center justify-center w-10 h-10 bg-blue-500 rounded-full">
              <Calendar className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-gray-900">Payment processed</div>
              <div className="text-xs text-gray-500">Credit Card •••• 4567 • 1 day ago</div>
            </div>
            <div className="text-right">
              <div className="text-sm text-blue-600 font-medium">Successful</div>
              <div className="text-xs text-gray-500">{formatCurrency(280.00)}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderBookingsTab = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Recent Bookings</h3>
        <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
          View All Bookings
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left p-3 text-sm font-medium text-gray-700">Date</th>
              <th className="text-left p-3 text-sm font-medium text-gray-700">Route</th>
              <th className="text-left p-3 text-sm font-medium text-gray-700">Driver</th>
              <th className="text-left p-3 text-sm font-medium text-gray-700">Amount</th>
              <th className="text-left p-3 text-sm font-medium text-gray-700">Status</th>
              <th className="text-left p-3 text-sm font-medium text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {[
              {
                id: 'BK-2024-001234',
                date: 'Aug 29, 2024 14:30',
                from: 'BGC',
                to: 'NAIA Terminal 3',
                driver: 'Juan Cruz',
                amount: 450.00,
                status: 'completed',
                rating: 5
              },
              {
                id: 'BK-2024-001233',
                date: 'Aug 29, 2024 09:15',
                from: 'Makati CBD',
                to: 'Ortigas Center',
                driver: 'Maria Gonzalez',
                amount: 280.00,
                status: 'completed',
                rating: 4
              },
              {
                id: 'BK-2024-001232',
                date: 'Aug 28, 2024 18:45',
                from: 'Quezon City',
                to: 'Mandaluyong',
                driver: 'Roberto Santos',
                amount: 320.00,
                status: 'completed',
                rating: 5
              }
            ].map((booking, index) => (
              <tr key={index} className="hover:bg-gray-50">
                <td className="p-3 text-sm">{booking.date}</td>
                <td className="p-3 text-sm">{booking.from} → {booking.to}</td>
                <td className="p-3 text-sm">{booking.driver}</td>
                <td className="p-3 text-sm font-medium">{formatCurrency(booking.amount)}</td>
                <td className="p-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    booking.status === 'completed' ? 'bg-green-100 text-green-800' :
                    booking.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {booking.status}
                  </span>
                </td>
                <td className="p-3">
                  <button
                    onClick={() => openModal('booking', booking)}
                    className="text-blue-600 hover:text-blue-800 text-sm"
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
  );

  const renderFraudTab = () => (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Fraud Risk Assessment</h3>
        <div className="flex items-center space-x-4 mb-4">
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getRiskColor(passengerData.riskLevel)}`}>
            {passengerData.riskLevel} Risk
          </span>
          <span className="text-sm text-gray-600">Last updated: 2 hours ago</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h4 className="font-medium mb-2">Risk Factors</h4>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>Verified identity documents</span>
              </li>
              <li className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>Consistent payment history</span>
              </li>
              <li className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>Regular booking patterns</span>
              </li>
              <li className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>High customer rating</span>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-medium mb-2">Account Security</h4>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>Two-factor authentication enabled</span>
              </li>
              <li className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>Verified phone number</span>
              </li>
              <li className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>Verified email address</span>
              </li>
              <li className="flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 text-yellow-500" />
                <span>No recent security alerts</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Fraud History</h3>
        <p className="text-gray-600 text-center py-8">No fraud incidents reported</p>
      </div>
    </div>
  );

  const renderIdentityTab = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Identity Documents</h3>
        <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
          <Upload className="w-4 h-4 inline mr-2" />
          Upload Document
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {documents.map((doc) => (
          <div key={doc.id} className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex justify-between items-start mb-3">
              <FileText className="w-8 h-8 text-blue-500" />
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                doc.status === 'verified' ? 'bg-green-100 text-green-800' :
                doc.status === 'expired' ? 'bg-red-100 text-red-800' :
                'bg-yellow-100 text-yellow-800'
              }`}>
                {doc.status}
              </span>
            </div>
            
            <h4 className="font-medium mb-1">{doc.name}</h4>
            {doc.expiry !== 'N/A' && (
              <p className="text-sm text-gray-600 mb-3">Expires: {doc.expiry}</p>
            )}
            
            <div className="flex space-x-2">
              <button
                onClick={() => setSelectedDocument(doc)}
                className="flex-1 bg-blue-100 text-blue-700 px-3 py-2 rounded text-sm hover:bg-blue-200"
              >
                <Eye className="w-4 h-4 inline mr-1" />
                View
              </button>
              <button className="bg-gray-100 text-gray-700 px-3 py-2 rounded text-sm hover:bg-gray-200">
                <Download className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return renderOverviewTab();
      case 'fraud':
        return renderFraudTab();
      case 'identity':
        return renderIdentityTab();
      case 'bookings':
        return renderBookingsTab();
      default:
        return (
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <p className="text-gray-600 text-center py-8">
              Content for {activeTab} tab will be implemented here.
            </p>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <style jsx>{`
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
      
      {/* Header with Passenger Info and Actions */}
      <div className="bg-white border-b shadow-sm">
        <div className="px-4 md:px-6 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => window.history.back()}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
                title="Go back to passengers list"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Back to Passengers</span>
                <span className="sm:hidden">Back</span>
              </button>
              <div className="h-6 w-px bg-gray-300 hidden sm:block"></div>
              <h1 className="text-lg sm:text-xl font-semibold">Passenger Profile</h1>
            </div>
            <QuickActions />
          </div>

          {/* Passenger Summary Card */}
          <div className="flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-6 p-4 bg-gray-50 rounded-lg">
            <div className="relative">
              <img 
                src={passengerData.photo} 
                alt={passengerData.name}
                className="w-16 h-16 rounded-full border-4 border-green-200 object-cover bg-gray-100"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIwIiBoZWlnaHQ9IjEyMCIgdmlld0JveD0iMCAwIDEyMCAxMjAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxMjAiIGhlaWdodD0iMTIwIiBmaWxsPSIjRjNGNEY2Ii8+CjxjaXJjbGUgY3g9IjYwIiBjeT0iNDAiIHI9IjE4IiBmaWxsPSIjOUI5QkE1Ii8+CjxwYXRoIGQ9Ik0zMCA5MEM0MCA3NCA1MCA3NCA2MCA3NEg2MEM3MCA3NCA4MCA3NCA5MCA5MEgzMFoiIGZpbGw9IiM5QjlCQTUiLz4KPC9zdmc+';
                }}
              />
              <div className="absolute bottom-0 right-0 w-5 h-5 bg-green-500 border-2 border-white rounded-full"></div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-2">
                <h2 className="text-lg font-semibold">{passengerData.name}</h2>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-sm text-green-600 font-medium">{passengerData.lastActive}</span>
                </div>
              </div>
              <div className="text-sm text-gray-500 mb-2">ID: {passengerData.id}</div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-gray-400" />
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      window.open(`tel:${passengerData.phone}`, '_self');
                    }}
                    className="text-blue-600 hover:text-blue-800 hover:underline transition-colors"
                  >
                    {passengerData.phone}
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-gray-400" />
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      window.open(`mailto:${passengerData.email}`, '_self');
                    }}
                    className="text-blue-600 hover:text-blue-800 hover:underline transition-colors truncate"
                  >
                    {passengerData.email}
                  </button>
                </div>
              </div>
            </div>
            <div className="flex gap-4 md:gap-6 w-full md:w-auto">
              <div className="text-center flex-1 md:flex-none">
                <div className="text-lg md:text-xl font-bold text-blue-600">{passengerData.bookingsToday}</div>
                <div className="text-xs text-gray-500">Bookings Today</div>
              </div>
              <div className="text-center flex-1 md:flex-none">
                <div className="text-lg md:text-xl font-bold text-green-600">{passengerData.rating}</div>
                <div className="text-xs text-gray-500">Rating</div>
              </div>
              <div className="text-center flex-1 md:flex-none">
                <div className="text-lg md:text-xl font-bold text-purple-600">{passengerData.totalBookings}</div>
                <div className="text-xs text-gray-500">Total Bookings</div>
              </div>
            </div>
          </div>
        </div>

        {/* Horizontal Navigation */}
        <div className="border-t bg-white overflow-hidden">
          <div className="px-4 md:px-6">
            <div 
              className="flex space-x-1 overflow-x-auto pb-px scrollbar-hide"
              style={{
                scrollbarWidth: 'none',
                msOverflowStyle: 'none'
              }}
            >
              {tabs.map(tab => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-3 md:px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap relative flex-shrink-0 ${
                      activeTab === tab.id 
                        ? 'text-blue-600 border-blue-600' 
                        : 'text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="hidden sm:inline">{tab.label}</span>
                    <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
                    {tab.urgent && (
                      <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center shadow-sm border-2 border-white">
                        <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-4 md:p-6 bg-gray-50 min-h-screen">
        <div className="max-w-6xl mx-auto">
          <div className="bg-white rounded-lg shadow-sm border p-6">
            {renderTabContent()}
          </div>
        </div>
      </div>

      {/* Document Viewer Modal */}
      {selectedDocument && (
        <DocumentViewer 
          doc={selectedDocument} 
          onClose={() => setSelectedDocument(null)} 
        />
      )}

      {/* Booking Detail Modal */}
      {activeModal.type === 'booking' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-auto">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Booking Details</h3>
                <button onClick={closeModal} className="text-gray-500 hover:text-gray-700">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              {activeModal.data && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Booking ID</label>
                    <div className="text-sm font-mono">{activeModal.data.id}</div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Status</label>
                    <div className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                      activeModal.data.status === 'completed' ? 'bg-green-100 text-green-800' :
                      activeModal.data.status === 'in-progress' ? 'bg-blue-100 text-blue-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {activeModal.data.status}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Route</label>
                    <div className="text-sm">{activeModal.data.from} → {activeModal.data.to}</div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Driver</label>
                    <div className="text-sm">{activeModal.data.driver}</div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Amount</label>
                    <div className="text-sm font-medium">{formatCurrency(activeModal.data.amount)}</div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Date & Time</label>
                    <div className="text-sm">{activeModal.data.date}</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialog */}
      {confirmDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold mb-2">{confirmDialog.title}</h3>
            <p className="text-gray-600 mb-4">{confirmDialog.message}</p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setConfirmDialog(null)}
                className="px-4 py-2 text-gray-600 border rounded hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  confirmDialog.action();
                  setConfirmDialog(null);
                }}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RedesignedPassengerProfile;