'use client';

import React, { useState, memo } from 'react';
import { 
  TrendingUp, Users, CheckCircle, XCircle, AlertCircle, Eye, Download,
  Smartphone, Shield, MessageCircle, History, DollarSign, Send, Search, 
  BarChart3, Phone, Mail, MapPin, Calendar, Clock, Award, ChevronLeft,
  Star, Plus, FileText, Settings, RefreshCw, Activity, X, CreditCard,
  Heart, ShoppingBag, User, Globe, Bell
} from 'lucide-react';

interface PassengerData {
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

interface PassengerAdminPortalProps {
  passenger?: PassengerData;
  onClose?: () => void;
  className?: string;
}

const PassengerAdminPortal: React.FC<PassengerAdminPortalProps> = ({ 
  passenger: propPassenger, 
  onClose,
  className = '' 
}) => {
  const [activeTab, setActiveTab] = useState('insights');
  const [chatMessage, setChatMessage] = useState('');
  const [notifications, setNotifications] = useState(2);
  
  // Modal system state
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [selectedTrip, setSelectedTrip] = useState<any>(null);
  const [selectedTransaction, setSelectedTransaction] = useState<any>(null);
  const [modalData, setModalData] = useState<any>(null);

  // Default passenger data
  const defaultPassenger: PassengerData = {
    id: 'P200001',
    name: 'Maria Santos',
    phone: '+639171234567',
    email: 'maria.santos@gmail.com',
    address: 'Quezon City, Metro Manila',
    dateOfBirth: '1992-05-15',
    joinDate: '2023-03-15',
    lastActive: '2024-12-28 15:30:00',
    rating: 4.8,
    avatar: 'https://via.placeholder.com/150'
  };

  const passenger = propPassenger || defaultPassenger;

  const tabs = [
    { id: 'insights', name: 'Insights', icon: TrendingUp },
    { id: 'trips', name: 'Trip History', icon: MapPin },
    { id: 'payments', name: 'Payments', icon: CreditCard },
    { id: 'preferences', name: 'Preferences', icon: Settings },
    { id: 'support', name: 'Support', icon: MessageCircle },
    { id: 'history', name: 'App Activity', icon: History },
  ];

  // Sample passenger-specific data
  const [tripsData] = useState([
    {
      id: 'T001',
      bookingReference: 'XPR-2024-001234',
      from: 'Home - Quezon City',
      to: 'Makati Central Business District',
      fare: 450,
      distance: '18.5 km',
      duration: '45 mins',
      driverName: 'Juan Cruz',
      driverRating: 4.9,
      pickupTime: '2024-12-28 14:30:00',
      dropoffTime: '2024-12-28 15:15:00',
      rating: 5,
      feedback: 'Great service! Driver was very professional and arrived on time.',
      paymentMethod: 'GCash',
      serviceType: '4W',
      status: 'Completed'
    },
    {
      id: 'T002', 
      bookingReference: 'XPR-2024-001123',
      from: 'SM Mall of Asia',
      to: 'NAIA Terminal 3',
      fare: 320,
      distance: '12.3 km',
      duration: '35 mins',
      driverName: 'Ana Reyes',
      driverRating: 4.7,
      pickupTime: '2024-12-25 08:15:00',
      dropoffTime: '2024-12-25 08:50:00',
      rating: 4,
      feedback: 'Good trip, but traffic was heavy.',
      paymentMethod: 'Credit Card',
      serviceType: 'TAXI',
      status: 'Completed'
    }
  ]);

  const [paymentsData] = useState([
    {
      id: 'PAY001',
      tripId: 'T001',
      amount: 450,
      method: 'GCash',
      status: 'Completed',
      date: '2024-12-28 15:15:00',
      reference: 'GC-2024122815001',
      fee: 15
    },
    {
      id: 'PAY002',
      tripId: 'T002',
      amount: 320,
      method: 'Credit Card',
      status: 'Completed', 
      date: '2024-12-25 08:50:00',
      reference: 'CC-2024122508002',
      fee: 10
    }
  ]);

  const [supportTickets] = useState([
    {
      id: 'SUP001',
      subject: 'Driver took longer route',
      status: 'Resolved',
      priority: 'Medium',
      date: '2024-12-20 10:30:00',
      lastUpdate: '2024-12-21 14:15:00',
      assignedTo: 'Support Team Alpha'
    },
    {
      id: 'SUP002',
      subject: 'Payment not processed',
      status: 'In Progress',
      priority: 'High',
      date: '2024-12-22 16:45:00',
      lastUpdate: '2024-12-23 09:20:00',
      assignedTo: 'Payment Team Beta'
    }
  ]);

  const openModal = (modalType: string, data?: any) => {
    setActiveModal(modalType);
    setModalData(data);
  };

  const closeModal = () => {
    setActiveModal(null);
    setSelectedTrip(null);
    setSelectedTransaction(null);
    setModalData(null);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'insights':
        return (
          <div className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Total Trips */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-blue-600">Total Trips</p>
                    <p className="text-2xl font-bold text-blue-900">127</p>
                    <p className="text-xs text-blue-600">Last 6 months</p>
                  </div>
                  <MapPin className="w-8 h-8 text-blue-600" />
                </div>
              </div>

              {/* Average Rating */}
              <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-green-600">Average Rating</p>
                    <p className="text-2xl font-bold text-green-900">{passenger.rating}</p>
                    <p className="text-xs text-green-600">High satisfaction</p>
                  </div>
                  <Star className="w-8 h-8 text-green-600" />
                </div>
              </div>

              {/* Total Spent */}
              <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-purple-600">Total Spent</p>
                    <p className="text-2xl font-bold text-purple-900">₱34,560</p>
                    <p className="text-xs text-purple-600">All time</p>
                  </div>
                  <DollarSign className="w-8 h-8 text-purple-600" />
                </div>
              </div>

              {/* Cancellation Rate */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-yellow-600">Cancellation Rate</p>
                    <p className="text-2xl font-bold text-yellow-900">2.3%</p>
                    <p className="text-xs text-yellow-600">Very low</p>
                  </div>
                  <XCircle className="w-8 h-8 text-yellow-600" />
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
              <div className="space-y-3">
                <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">Trip to Makati completed</p>
                    <p className="text-xs text-gray-600">Dec 28, 2024 at 3:15 PM • ₱450.00</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                  <Star className="w-5 h-5 text-yellow-500" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">Rated driver 5 stars</p>
                    <p className="text-xs text-gray-600">Dec 28, 2024 at 3:20 PM</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Preferences Summary */}
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Passenger Preferences</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Preferred Service</p>
                  <p className="font-medium text-gray-900">4W Car</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Payment Method</p>
                  <p className="font-medium text-gray-900">GCash</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Home Location</p>
                  <p className="font-medium text-gray-900">Quezon City</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Work Location</p>
                  <p className="font-medium text-gray-900">Makati CBD</p>
                </div>
              </div>
            </div>
          </div>
        );

      case 'trips':
        return (
          <div className="space-y-6">
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Trips</h3>
              <div className="space-y-4">
                {tripsData.map((trip) => (
                  <div
                    key={trip.id}
                    onClick={() => openModal('trip-details', trip)}
                    className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded">
                            {trip.serviceType}
                          </span>
                          <span className="bg-green-100 text-green-800 text-xs font-medium px-2 py-1 rounded">
                            {trip.status}
                          </span>
                        </div>
                        <p className="font-medium text-gray-900">{trip.from}</p>
                        <p className="text-sm text-gray-600 mb-1">to {trip.to}</p>
                        <p className="text-xs text-gray-500">
                          {formatDate(trip.pickupTime)} • {trip.duration} • {trip.distance}
                        </p>
                        <p className="text-xs text-gray-500">Driver: {trip.driverName}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-gray-900">₱{trip.fare}</p>
                        <div className="flex items-center space-x-1">
                          <Star className="w-4 h-4 text-yellow-500" />
                          <span className="text-sm font-medium">{trip.rating}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 'payments':
        return (
          <div className="space-y-6">
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment History</h3>
              <div className="space-y-4">
                {paymentsData.map((payment) => (
                  <div
                    key={payment.id}
                    onClick={() => openModal('payment-details', payment)}
                    className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">Trip Payment</p>
                        <p className="text-sm text-gray-600">Reference: {payment.reference}</p>
                        <p className="text-xs text-gray-500">{formatDate(payment.date)}</p>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className="bg-gray-100 text-gray-800 text-xs font-medium px-2 py-1 rounded">
                            {payment.method}
                          </span>
                          <span className="bg-green-100 text-green-800 text-xs font-medium px-2 py-1 rounded">
                            {payment.status}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-gray-900">₱{payment.amount}</p>
                        <p className="text-xs text-gray-500">Fee: ₱{payment.fee}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 'support':
        return (
          <div className="space-y-6">
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Support Tickets</h3>
              <div className="space-y-4">
                {supportTickets.map((ticket) => (
                  <div
                    key={ticket.id}
                    onClick={() => openModal('support-ticket', ticket)}
                    className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <span className={`text-xs font-medium px-2 py-1 rounded ${
                            ticket.status === 'Resolved' 
                              ? 'bg-green-100 text-green-800'
                              : ticket.status === 'In Progress'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {ticket.status}
                          </span>
                          <span className={`text-xs font-medium px-2 py-1 rounded ${
                            ticket.priority === 'High'
                              ? 'bg-red-100 text-red-800'
                              : ticket.priority === 'Medium'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {ticket.priority}
                          </span>
                        </div>
                        <p className="font-medium text-gray-900">{ticket.subject}</p>
                        <p className="text-xs text-gray-500">
                          Created: {formatDate(ticket.date)}
                        </p>
                        <p className="text-xs text-gray-500">
                          Updated: {formatDate(ticket.lastUpdate)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-600">#{ticket.id}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 'preferences':
        return (
          <div className="space-y-6">
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Account Preferences</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Preferred Service Type</label>
                    <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option>4W Car</option>
                      <option>TAXI</option>
                      <option>2W Motorcycle</option>
                      <option>TNVS</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Default Payment Method</label>
                    <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option>GCash</option>
                      <option>Credit Card</option>
                      <option>Cash</option>
                      <option>Bank Transfer</option>
                    </select>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <h4 className="font-medium text-gray-900">Notification Preferences</h4>
                  <div className="space-y-2">
                    <label className="flex items-center space-x-3">
                      <input type="checkbox" className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" defaultChecked />
                      <span className="text-sm text-gray-700">Trip notifications</span>
                    </label>
                    <label className="flex items-center space-x-3">
                      <input type="checkbox" className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" defaultChecked />
                      <span className="text-sm text-gray-700">Promotional offers</span>
                    </label>
                    <label className="flex items-center space-x-3">
                      <input type="checkbox" className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                      <span className="text-sm text-gray-700">Driver updates</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'history':
        return (
          <div className="space-y-6">
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">App Activity History</h3>
              <div className="space-y-3">
                <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                  <Activity className="w-5 h-5 text-blue-600" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">Logged into mobile app</p>
                    <p className="text-xs text-gray-600">Dec 28, 2024 at 2:15 PM • Android App v2.1.5</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                  <MapPin className="w-5 h-5 text-green-600" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">Booked trip to Makati</p>
                    <p className="text-xs text-gray-600">Dec 28, 2024 at 2:30 PM • From: Quezon City</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                  <CreditCard className="w-5 h-5 text-purple-600" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">Payment processed</p>
                    <p className="text-xs text-gray-600">Dec 28, 2024 at 3:15 PM • GCash ₱450.00</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return <div className="text-center text-gray-500 p-8">Content not available</div>;
    }
  };

  const ActionModal: React.FC<{
    title: string;
    message: string;
    actionText: string;
    actionColor: 'red' | 'blue' | 'green' | 'yellow';
  }> = ({ title, message, actionText, actionColor }) => {
    const colorClasses = {
      red: 'bg-red-600 hover:bg-red-700 text-white',
      blue: 'bg-blue-600 hover:bg-blue-700 text-white',
      green: 'bg-green-600 hover:bg-green-700 text-white',
      yellow: 'bg-yellow-600 hover:bg-yellow-700 text-white'
    };

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
        <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">{title}</h3>
          <p className="text-gray-600 mb-6">{message}</p>
          <div className="flex space-x-3 justify-end">
            <button 
              onClick={closeModal}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button 
              onClick={closeModal}
              className={`px-4 py-2 rounded-md transition-colors ${colorClasses[actionColor]}`}
            >
              {actionText}
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={`fixed inset-0 bg-gray-900 bg-opacity-50 z-50 ${className}`}>
      <div className="fixed inset-0 overflow-hidden">
        <div className="absolute inset-0 overflow-hidden">
          <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-10">
            <div className="pointer-events-auto relative w-screen max-w-6xl">
              <div className="flex h-full flex-col overflow-y-scroll bg-white shadow-xl">
                
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-6">
                  <div className="flex items-center justify-between">
                    <button 
                      onClick={onClose}
                      className="flex items-center text-white hover:text-blue-200 transition-colors"
                    >
                      <ChevronLeft className="w-5 h-5 mr-1" />
                      Back to Passengers
                    </button>
                    <div className="flex items-center space-x-3">
                      <div className="relative">
                        <Bell className="w-6 h-6 text-white" />
                        {notifications > 0 && (
                          <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                            <span className="text-xs text-white font-medium">{notifications}</span>
                          </div>
                        )}
                      </div>
                      <RefreshCw className="w-6 h-6 text-white" />
                    </div>
                  </div>

                  {/* Passenger Profile Header */}
                  <div className="mt-6 flex items-start space-x-4">
                    <div className="w-20 h-20 rounded-full bg-white flex items-center justify-center">
                      <User className="w-10 h-10 text-blue-600" />
                    </div>
                    <div className="flex-1 text-white">
                      <h1 className="text-2xl font-bold">{passenger.name}</h1>
                      <p className="text-blue-200">Passenger ID: {passenger.id}</p>
                      <div className="mt-2 flex items-center space-x-4 text-sm text-blue-200">
                        <span className="flex items-center">
                          <Phone className="w-4 h-4 mr-1" />
                          {passenger.phone}
                        </span>
                        <span className="flex items-center">
                          <Mail className="w-4 h-4 mr-1" />
                          {passenger.email}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center space-x-4 text-sm text-blue-200">
                        <span className="flex items-center">
                          <MapPin className="w-4 h-4 mr-1" />
                          {passenger.address}
                        </span>
                        <span className="flex items-center">
                          <Calendar className="w-4 h-4 mr-1" />
                          Member since {new Date(passenger.joinDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Tab Navigation */}
                <div className="border-b border-gray-200 bg-white">
                  <nav className="-mb-px flex space-x-8 px-6">
                    {tabs.map((tab) => {
                      const Icon = tab.icon;
                      return (
                        <button
                          key={tab.id}
                          onClick={() => setActiveTab(tab.id)}
                          className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                            activeTab === tab.id
                              ? 'border-blue-500 text-blue-600'
                              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                          <span>{tab.name}</span>
                        </button>
                      );
                    })}
                  </nav>
                </div>

                {/* Tab Content */}
                <div className="flex-1 overflow-y-auto bg-gray-50">
                  <div className="p-6">
                    {renderTabContent()}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {activeModal === 'trip-details' && modalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-96 overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Trip Details</h3>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Booking Reference</p>
                  <p className="font-medium">{modalData.bookingReference}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Service Type</p>
                  <p className="font-medium">{modalData.serviceType}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">From</p>
                  <p className="font-medium">{modalData.from}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">To</p>
                  <p className="font-medium">{modalData.to}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Driver</p>
                  <p className="font-medium">{modalData.driverName}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Fare</p>
                  <p className="font-medium">₱{modalData.fare}</p>
                </div>
              </div>
              {modalData.feedback && (
                <div>
                  <p className="text-sm text-gray-600">Your Feedback</p>
                  <p className="font-medium">{modalData.feedback}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeModal === 'payment-details' && modalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full mx-4">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Payment Details</h3>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Amount</span>
                <span className="font-medium">₱{modalData.amount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Payment Method</span>
                <span className="font-medium">{modalData.method}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Reference</span>
                <span className="font-medium">{modalData.reference}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Processing Fee</span>
                <span className="font-medium">₱{modalData.fee}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Status</span>
                <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-sm font-medium">{modalData.status}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeModal === 'support-ticket' && modalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full mx-4">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Support Ticket #{modalData.id}</h3>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-600">Subject</p>
                <p className="font-medium">{modalData.subject}</p>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Status</span>
                <span className={`px-2 py-1 rounded text-sm font-medium ${
                  modalData.status === 'Resolved' 
                    ? 'bg-green-100 text-green-800'
                    : 'bg-blue-100 text-blue-800'
                }`}>{modalData.status}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Priority</span>
                <span className={`px-2 py-1 rounded text-sm font-medium ${
                  modalData.priority === 'High'
                    ? 'bg-red-100 text-red-800'
                    : 'bg-yellow-100 text-yellow-800'
                }`}>{modalData.priority}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Assigned To</span>
                <span className="font-medium">{modalData.assignedTo}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Add displayName for debugging
PassengerAdminPortal.displayName = 'PassengerAdminPortal';

export default memo(PassengerAdminPortal);