'use client';

import React, { useState } from 'react';
import { ArrowLeft, Phone, Mail, AlertTriangle, CheckCircle, X, Upload, Edit3, Download, MessageSquare, Shield, CreditCard, Calendar, FileText, Activity, Eye, User, MapPin, Clock, Star } from 'lucide-react';

interface PassengerData {
  name: string;
  id: string;
  phone: string;
  email: string;
  photo: string;
  status: string;
  location: string;
  joinDate: string;
  lastBooking: string;
  rating: number;
  completionRate: number;
  cancellationRate: number;
  totalBookings: number;
  bookingsToday: number;
  totalSpent: number;
  avgTripValue: string;
  riskLevel: string;
  paymentMethod: string;
  isVerified: boolean;
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
    type: 'booking' | 'transaction' | 'conversation' | 'rating' | 'activity' | null;
    data: any;
  }>({ type: null, data: null });
  const [confirmDialog, setConfirmDialog] = useState<{show: boolean, title: string, message: string, action: () => void} | null>(null);

  // Helper functions
  const openModal = (type: 'booking' | 'transaction' | 'conversation' | 'rating' | 'activity', data: any) => {
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
    id: '201922',
    phone: '+639069780294',
    email: 'maria.santos1922@gmail.com',
    photo: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIwIiBoZWlnaHQ9IjEyMCIgdmlld0JveD0iMCAwIDEyMCAxMjAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxMjAiIGhlaWdodD0iMTIwIiBmaWxsPSIjRjNGNEY2Ii8+CjxjaXJjbGUgY3g9IjYwIiBjeT0iNDAiIHI9IjE4IiBmaWxsPSIjOUI5QkE1Ii8+CjxwYXRoIGQ9Ik0zMCA5MEM0MCA3NCA1MCA3NCA2MCA3NEg2MEM3MCA3NCA4MCA3NCA5MCA5MEgzMFoiIGZpbGw9IiM5QjlCQTUiLz4KPC9zdmc+',
    status: 'vip',
    location: 'Metro Manila',
    joinDate: 'Jan 15, 2023',
    lastBooking: '2 hours ago',
    rating: 4.9,
    completionRate: 98,
    cancellationRate: 2,
    totalBookings: 1248,
    bookingsToday: 3,
    totalSpent: 85420.50,
    avgTripValue: '₱68.50',
    riskLevel: 'Low',
    paymentMethod: 'Credit Card',
    isVerified: true
  };

  const tabs: Tab[] = [
    { id: 'overview', label: 'Overview', icon: Activity, urgent: false },
    { id: 'fraud', label: 'Risk Profile', icon: Shield, urgent: false },
    { id: 'identity', label: 'Identity', icon: User, urgent: false },
    { id: 'payments', label: 'Payments', icon: CreditCard, urgent: false },
    { id: 'bookings', label: 'Booking History', icon: Calendar, urgent: false },
    { id: 'ratings', label: 'Ratings', icon: Star, urgent: false },
    { id: 'support', label: 'Support', icon: MessageSquare, urgent: false },
    { id: 'activity', label: 'Activity Log', icon: FileText, urgent: false }
  ];

  const QuickActions = () => (
    <div className="flex gap-2">
      <button 
        onClick={() => window.open(`tel:${passengerData.phone}`, '_self')}
        className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm transition-colors"
        title={`Call ${passengerData.name}`}
      >
        <Phone className="w-4 h-4" />
        <span className="hidden sm:inline">Call</span>
      </button>
      <button 
        onClick={() => setActiveTab('support')}
        className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm transition-colors"
        title={`Message ${passengerData.name}`}
      >
        <MessageSquare className="w-4 h-4" />
        <span className="hidden sm:inline">Message</span>
      </button>
      <button 
        onClick={() => showConfirmDialog('Suspend Passenger', 'Are you sure you want to suspend this passenger account?', () => console.log('Suspending passenger'))}
        className="flex items-center gap-2 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm transition-colors"
        title={`Suspend ${passengerData.name}`}
      >
        <AlertTriangle className="w-4 h-4" />
        <span className="hidden sm:inline">Suspend</span>
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
          <img src={doc.url} alt={doc.name} className="max-w-full h-auto rounded-lg" />
        </div>
      </div>
    </div>
  );

  const OverviewTab = () => (
    <div className="space-y-6">
      {/* VIP Status Banner */}
      {passengerData.status === 'vip' && (
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Star className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0 fill-current" />
            <div className="flex-1">
              <h3 className="font-semibold text-purple-800">VIP Customer</h3>
              <p className="text-purple-700 text-sm mt-1">Premium customer with excellent booking history and high lifetime value.</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs bg-purple-600 text-white px-2 py-1 rounded">Lifetime Value: ₱{passengerData.totalSpent.toLocaleString()}</span>
                <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">Since {passengerData.joinDate}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-green-600">{passengerData.completionRate}%</div>
          <div className="text-sm text-green-800">Completion Rate</div>
          <div className="text-xs text-green-600 mt-1">{passengerData.totalBookings.toLocaleString()} bookings</div>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-blue-600">₱{passengerData.totalSpent.toLocaleString()}</div>
          <div className="text-sm text-blue-800">Total Spent</div>
          <div className="text-xs text-blue-600 mt-1">{passengerData.avgTripValue} avg</div>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center gap-1">
            <Star className="w-5 h-5 text-yellow-500 fill-current" />
            <div className="text-2xl font-bold text-yellow-600">{passengerData.rating}</div>
          </div>
          <div className="text-sm text-yellow-800">Average Rating</div>
          <div className="text-xs text-yellow-600 mt-1">Passenger rating</div>
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
          <h3 className="font-semibold text-gray-900">Recent Bookings</h3>
        </div>
        <div className="p-4 space-y-3">
          {[
            { time: '2 hours ago', from: 'Mall of Asia', to: 'BGC', status: 'completed', fare: '₱185.50' },
            { time: '6 hours ago', from: 'Makati CBD', to: 'Ortigas', status: 'completed', fare: '₱125.00' },
            { time: '1 day ago', from: 'Airport', to: 'Quezon City', status: 'completed', fare: '₱280.00' },
            { time: '2 days ago', from: 'Alabang', to: 'Manila', status: 'cancelled', fare: '₱0.00' },
          ].map((booking, idx) => (
            <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex-1">
                <div className="text-sm font-medium">{booking.from} → {booking.to}</div>
                <div className="text-xs text-gray-500">{booking.time}</div>
              </div>
              <div className="text-right">
                <div className="text-sm font-medium">{booking.fare}</div>
                <div className={`text-xs px-2 py-1 rounded-full ${
                  booking.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {booking.status}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900">{passengerData.bookingsToday}</div>
          <div className="text-sm text-gray-600">Today</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900">7</div>
          <div className="text-sm text-gray-600">This Week</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900">32</div>
          <div className="text-sm text-gray-600">This Month</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900">248</div>
          <div className="text-sm text-gray-600">This Year</div>
        </div>
      </div>
    </div>
  );

  const RiskProfileTab = () => (
    <div className="space-y-6">
      <div className="bg-green-50 border border-green-200 rounded-lg p-6">
        <div className="flex items-center gap-3 mb-4">
          <Shield className="w-6 h-6 text-green-600" />
          <h3 className="text-lg font-semibold text-green-800">Risk Assessment: {passengerData.riskLevel}</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h4 className="font-medium text-green-800 mb-2">Positive Indicators</h4>
            <ul className="space-y-1 text-sm text-green-700">
              <li>• Verified identity and payment method</li>
              <li>• High completion rate (98%)</li>
              <li>• Low cancellation rate (2%)</li>
              <li>• Excellent passenger rating (4.9/5)</li>
              <li>• Long-term customer (1+ year)</li>
              <li>• High lifetime value customer</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-green-800 mb-2">Account Security</h4>
            <ul className="space-y-1 text-sm text-green-700">
              <li>• 2FA enabled</li>
              <li>• Email verified</li>
              <li>• Phone verified</li>
              <li>• No suspicious activity</li>
              <li>• Regular payment patterns</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );

  const IdentityTab = () => (
    <div className="space-y-6">
      <div className="bg-white border rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Identity Verification</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium mb-3">Personal Information</h4>
            <div className="space-y-3">
              <div>
                <label className="text-sm text-gray-600">Full Name</label>
                <div className="font-medium">{passengerData.name}</div>
              </div>
              <div>
                <label className="text-sm text-gray-600">Email</label>
                <div className="font-medium flex items-center gap-2">
                  {passengerData.email}
                  <CheckCircle className="w-4 h-4 text-green-600" />
                </div>
              </div>
              <div>
                <label className="text-sm text-gray-600">Phone</label>
                <div className="font-medium flex items-center gap-2">
                  {passengerData.phone}
                  <CheckCircle className="w-4 h-4 text-green-600" />
                </div>
              </div>
              <div>
                <label className="text-sm text-gray-600">Location</label>
                <div className="font-medium">{passengerData.location}</div>
              </div>
            </div>
          </div>
          <div>
            <h4 className="font-medium mb-3">Verification Status</h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <span className="text-sm">Identity Verified</span>
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <span className="text-sm">Email Verified</span>
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <span className="text-sm">Phone Verified</span>
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <span className="text-sm">Payment Method Verified</span>
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const PaymentsTab = () => (
    <div className="space-y-6">
      <div className="bg-white border rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Payment Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium mb-3">Payment Methods</h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <CreditCard className="w-5 h-5 text-blue-600" />
                  <div>
                    <div className="text-sm font-medium">•••• •••• •••• 4532</div>
                    <div className="text-xs text-gray-500">Primary • Expires 12/25</div>
                  </div>
                </div>
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
            </div>
          </div>
          <div>
            <h4 className="font-medium mb-3">Payment Statistics</h4>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Success Rate</span>
                <span className="font-medium">99.2%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Failed Payments</span>
                <span className="font-medium">2</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Refunds</span>
                <span className="font-medium">₱1,250.00</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Average Transaction</span>
                <span className="font-medium">{passengerData.avgTripValue}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="bg-white border rounded-lg">
        <div className="p-4 border-b bg-gray-50">
          <h3 className="font-semibold text-gray-900">Recent Transactions</h3>
        </div>
        <div className="p-4 space-y-3">
          {[
            { date: '2024-08-29', amount: '₱185.50', status: 'completed', booking: 'BOK-123456' },
            { date: '2024-08-29', amount: '₱125.00', status: 'completed', booking: 'BOK-123455' },
            { date: '2024-08-28', amount: '₱280.00', status: 'completed', booking: 'BOK-123454' },
            { date: '2024-08-28', amount: '₱95.00', status: 'refunded', booking: 'BOK-123453' },
            { date: '2024-08-27', amount: '₱150.00', status: 'completed', booking: 'BOK-123452' },
          ].map((transaction, idx) => (
            <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex-1">
                <div className="text-sm font-medium">{transaction.booking}</div>
                <div className="text-xs text-gray-500">{transaction.date}</div>
              </div>
              <div className="text-right">
                <div className="text-sm font-medium">{transaction.amount}</div>
                <div className={`text-xs px-2 py-1 rounded-full ${
                  transaction.status === 'completed' ? 'bg-green-100 text-green-800' : 
                  transaction.status === 'refunded' ? 'bg-orange-100 text-orange-800' : 'bg-red-100 text-red-800'
                }`}>
                  {transaction.status}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview': return <OverviewTab />;
      case 'fraud': return <RiskProfileTab />;
      case 'identity': return <IdentityTab />;
      case 'payments': return <PaymentsTab />;
      case 'bookings': 
        return (
          <div className="text-center py-12">
            <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">Booking history details coming soon...</p>
          </div>
        );
      case 'ratings': 
        return (
          <div className="text-center py-12">
            <Star className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">Ratings and reviews details coming soon...</p>
          </div>
        );
      case 'support': 
        return (
          <div className="text-center py-12">
            <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">Support chat interface coming soon...</p>
          </div>
        );
      case 'activity': 
        return (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">Activity log details coming soon...</p>
          </div>
        );
      default: return <OverviewTab />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => window.history.back()}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-4">
              <img
                src={passengerData.photo}
                alt={passengerData.name}
                className="w-12 h-12 rounded-full border-2 border-gray-200"
              />
              <div>
                <h1 className="text-xl font-semibold text-gray-900">
                  {passengerData.name}
                  {passengerData.isVerified && (
                    <CheckCircle className="w-5 h-5 text-blue-600 inline ml-2" />
                  )}
                </h1>
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <span>PSG-{passengerData.id}</span>
                  <span className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    {passengerData.location}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {passengerData.lastBooking}
                  </span>
                </div>
              </div>
            </div>
          </div>
          <QuickActions />
        </div>
      </div>

      {/* Status Banner */}
      <div className="bg-white border-b border-gray-200 px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className={`px-3 py-1 rounded-full text-sm font-medium ${
              passengerData.status === 'vip' ? 'bg-purple-100 text-purple-800' :
              passengerData.status === 'premium' ? 'bg-yellow-100 text-yellow-800' :
              'bg-green-100 text-green-800'
            }`}>
              {passengerData.status.toUpperCase()} Customer
            </div>
            <div className="text-sm text-gray-600">
              Member since: {passengerData.joinDate}
            </div>
            <div className="text-sm text-gray-600">
              Payment: {passengerData.paymentMethod}
            </div>
          </div>
          <div className={`flex items-center gap-2 text-sm font-medium ${
            passengerData.riskLevel === 'Low' ? 'text-green-600' :
            passengerData.riskLevel === 'Medium' ? 'text-yellow-600' :
            'text-red-600'
          }`}>
            <Shield className="w-4 h-4" />
            Risk: {passengerData.riskLevel}
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white border-b border-gray-200 px-6">
        <nav className="flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 py-4 text-sm font-medium border-b-2 transition-colors relative ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
              {tab.urgent && (
                <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"></div>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Main Content */}
      <div className="px-6 py-6">
        {renderTabContent()}
      </div>

      {/* Document Viewer Modal */}
      {selectedDocument && (
        <DocumentViewer 
          doc={selectedDocument} 
          onClose={() => setSelectedDocument(null)} 
        />
      )}

      {/* Confirm Dialog */}
      {confirmDialog?.show && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold mb-2">{confirmDialog.title}</h3>
            <p className="text-gray-600 mb-4">{confirmDialog.message}</p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setConfirmDialog(null)}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  confirmDialog.action();
                  setConfirmDialog(null);
                }}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
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