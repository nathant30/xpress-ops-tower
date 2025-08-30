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

const DriverAdminPortal: React.FC<DriverAdminPortalProps> = ({ 
  driver: propDriver, 
  onClose,
  className = '' 
}) => {
  const [activeTab, setActiveTab] = useState('insights');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isImageEditorOpen, setIsImageEditorOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const driverData = propDriver || {
    id: '24294',
    name: 'Christopher Benedicto',
    phone: '+639566872762',
    email: 'soksikan@gmail.com',
    address: 'Caloocan',
    dateOfBirth: 'August 19, 1965',
    joinDate: 'March 15, 2023',
    lastActive: '2 hours ago',
    rating: 4.92
  };

  const tabs = [
    { id: 'insights', name: 'Insights', icon: TrendingUp },
    { id: 'legal', name: 'Legal Docs', icon: Shield },
    { id: 'vehicles', name: 'Vehicles', icon: Car },
    { id: 'commerce', name: 'Commerce', icon: ShoppingBag },
    { id: 'bookings', name: 'Bookings', icon: Calendar },
    { id: 'disciplinary', name: 'Disciplinary', icon: AlertTriangle },
    { id: 'wallet', name: 'Wallet', icon: CreditCard },
    { id: 'chat', name: 'Chat', icon: MessageCircle },
    { id: 'history', name: 'App History', icon: History },
    { id: 'training', name: 'Training', icon: GraduationCap },
  ];

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setSelectedImage(e.target?.result as string);
        setIsImageEditorOpen(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`w-4 h-4 ${
          i < Math.floor(rating) 
            ? 'text-yellow-400 fill-current' 
            : i < rating 
            ? 'text-yellow-400 fill-current' 
            : 'text-gray-300'
        }`}
      />
    ));
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'insights':
        return (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Metrics (Today)</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-green-50 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-green-600">Completion Rate</p>
                      <p className="text-2xl font-bold text-green-900">100%</p>
                      <p className="text-xs text-green-600">3/3 trips</p>
                    </div>
                    <CheckCircle className="w-8 h-8 text-green-600" />
                  </div>
                  <div className="mt-3 bg-green-200 rounded-full h-2">
                    <div className="bg-green-600 h-2 rounded-full" style={{ width: '100%' }}></div>
                  </div>
                </div>
                
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-blue-600">Acceptance Rate</p>
                      <p className="text-2xl font-bold text-blue-900">100%</p>
                      <p className="text-xs text-blue-600">3/3 requests</p>
                    </div>
                    <Users className="w-8 h-8 text-blue-600" />
                  </div>
                  <div className="mt-3 bg-blue-200 rounded-full h-2">
                    <div className="bg-blue-600 h-2 rounded-full" style={{ width: '100%' }}></div>
                  </div>
                </div>
                
                <div className="bg-red-50 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-red-600">Cancellation Rate</p>
                      <p className="text-2xl font-bold text-red-900">0%</p>
                      <p className="text-xs text-red-600">0/3 trips</p>
                    </div>
                    <XCircle className="w-8 h-8 text-red-600" />
                  </div>
                  <div className="mt-3 bg-red-200 rounded-full h-2">
                    <div className="bg-red-600 h-2 rounded-full" style={{ width: '0%' }}></div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Active Hours</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Average per day</p>
                  <p className="text-xl font-bold text-gray-900">7.68 hrs</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total for period</p>
                  <p className="text-xl font-bold text-gray-900">7.7 hrs</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Achievements</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { emoji: '💎', title: 'Excellent Service', score: 67 },
                  { emoji: '🧭', title: 'Expert Navigation', score: 67 },
                  { emoji: '⚡', title: 'Speed Demon', score: 85 },
                  { emoji: '🛡️', title: 'Safety First', score: 92 }
                ].map((badge, index) => (
                  <div key={index} className="bg-gray-50 rounded-lg p-4 text-center hover:shadow-md transition-shadow">
                    <div className="text-3xl mb-2">{badge.emoji}</div>
                    <h4 className="text-sm font-medium text-gray-900 mb-1">{badge.title}</h4>
                    <p className="text-lg font-bold text-blue-600">{badge.score}%</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Customer Reviews</h3>
              <div className="space-y-4">
                {[
                  { rating: 5.0, comment: "Excellent service and friendly driver!" },
                  { rating: 4.8, comment: "Very professional and punctual." },
                  { rating: 5.0, comment: "Safe driving and clean vehicle." }
                ].map((review, index) => (
                  <div key={index} className="border-l-4 border-yellow-400 bg-yellow-50 p-4">
                    <div className="flex items-center space-x-2 mb-2">
                      {renderStars(review.rating)}
                      <span className="text-sm font-medium text-gray-900">{review.rating}</span>
                    </div>
                    <p className="text-sm text-gray-700">{review.comment}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 'legal':
        return (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Legal Documents</h3>
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Upload className="w-4 h-4" />
                  <span>Upload</span>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageUpload}
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { type: 'Driver License (Front)', expiry: 'Dec 15, 2025', status: 'valid', color: 'green' },
                  { type: 'Driver License (Back)', expiry: 'Dec 15, 2025', status: 'valid', color: 'green' },
                  { type: 'NBI Clearance', expiry: 'Mar 20, 2024', status: 'expired', color: 'red' },
                  { type: 'Vehicle Registration', expiry: 'Aug 30, 2024', status: 'valid', color: 'green' }
                ].map((doc, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-gray-900">{doc.type}</h4>
                      <div className="flex space-x-2">
                        <button className="text-gray-400 hover:text-gray-600">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button className="text-gray-400 hover:text-gray-600">
                          <Download className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">Expires: {doc.expiry}</p>
                    <div className="flex items-center space-x-2">
                      {doc.status === 'valid' ? (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-red-500" />
                      )}
                      <span className={`text-sm font-medium ${
                        doc.status === 'valid' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {doc.status === 'valid' ? 'Valid' : 'Expired'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 'vehicles':
        return (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Vehicle Information</h3>
                <button className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                  <Edit3 className="w-4 h-4" />
                  <span>Edit</span>
                </button>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <div className="relative aspect-video bg-gray-100 rounded-lg mb-4">
                    <img 
                      src="/api/placeholder/400/225" 
                      alt="Vehicle" 
                      className="w-full h-full object-cover rounded-lg"
                    />
                    <button className="absolute top-2 right-2 bg-black bg-opacity-50 text-white p-2 rounded-full">
                      <Camera className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {Array.from({ length: 4 }, (_, i) => (
                      <div key={i} className="aspect-square bg-gray-100 rounded">
                        <img 
                          src={`/api/placeholder/100/100?${i}`}
                          alt={`Vehicle ${i + 1}`}
                          className="w-full h-full object-cover rounded"
                        />
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm text-gray-600">Type</label>
                      <p className="font-medium text-gray-900">Sedan</p>
                    </div>
                    <div>
                      <label className="text-sm text-gray-600">Year</label>
                      <p className="font-medium text-gray-900">2019</p>
                    </div>
                    <div>
                      <label className="text-sm text-gray-600">Make</label>
                      <p className="font-medium text-gray-900">Toyota</p>
                    </div>
                    <div>
                      <label className="text-sm text-gray-600">Model</label>
                      <p className="font-medium text-gray-900">Vios</p>
                    </div>
                    <div>
                      <label className="text-sm text-gray-600">Color</label>
                      <p className="font-medium text-gray-900">White</p>
                    </div>
                    <div>
                      <label className="text-sm text-gray-600">Plate Number</label>
                      <p className="font-medium text-gray-900">ABC-1234</p>
                    </div>
                  </div>
                  
                  <div className="pt-4 border-t">
                    <h4 className="font-medium text-gray-900 mb-2">Features</h4>
                    <div className="flex flex-wrap gap-2">
                      {['Air Conditioning', 'GPS', 'Bluetooth', 'USB Charging'].map((feature, index) => (
                        <span key={index} className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">
                          {feature}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'commerce':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-xl p-6 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-green-100">Today's Earnings</p>
                    <p className="text-2xl font-bold">₱1,250</p>
                  </div>
                  <DollarSign className="w-8 h-8 text-green-200" />
                </div>
              </div>
              
              <div className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600">Week Earnings</p>
                    <p className="text-2xl font-bold text-gray-900">₱8,750</p>
                  </div>
                  <BarChart3 className="w-8 h-8 text-blue-600" />
                </div>
              </div>
              
              <div className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600">Commission Rate</p>
                    <p className="text-2xl font-bold text-gray-900">15%</p>
                  </div>
                  <Target className="w-8 h-8 text-purple-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Transaction History</h3>
              <div className="space-y-3">
                {[
                  { type: 'earning', description: 'Trip to Makati CBD', amount: '+₱450', time: '2:30 PM', status: 'completed' },
                  { type: 'earning', description: 'Trip to BGC', amount: '+₱380', time: '1:15 PM', status: 'completed' },
                  { type: 'deduction', description: 'Platform Commission', amount: '-₱65', time: '1:15 PM', status: 'processed' },
                  { type: 'earning', description: 'Trip to Ortigas', amount: '+₱420', time: '11:45 AM', status: 'completed' }
                ].map((transaction, index) => (
                  <div key={index} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className={`w-2 h-2 rounded-full ${
                        transaction.type === 'earning' ? 'bg-green-500' : 'bg-red-500'
                      }`}></div>
                      <div>
                        <p className="font-medium text-gray-900">{transaction.description}</p>
                        <p className="text-sm text-gray-600">{transaction.time}</p>
                      </div>
                    </div>
                    <span className={`font-medium ${
                      transaction.type === 'earning' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {transaction.amount}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 'bookings':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-lg shadow-sm p-4">
                <p className="text-sm text-gray-600">Total Trips</p>
                <p className="text-2xl font-bold text-gray-900">156</p>
              </div>
              <div className="bg-white rounded-lg shadow-sm p-4">
                <p className="text-sm text-gray-600">Completed</p>
                <p className="text-2xl font-bold text-green-600">152</p>
              </div>
              <div className="bg-white rounded-lg shadow-sm p-4">
                <p className="text-sm text-gray-600">Cancelled</p>
                <p className="text-2xl font-bold text-red-600">4</p>
              </div>
              <div className="bg-white rounded-lg shadow-sm p-4">
                <p className="text-sm text-gray-600">Avg Rating</p>
                <p className="text-2xl font-bold text-yellow-600">5.0</p>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Trips</h3>
              <div className="space-y-3">
                {[
                  { id: 'T001', route: 'Quezon City → Makati', fare: '₱450', time: '2:30 PM', status: 'completed' },
                  { id: 'T002', route: 'Mandaluyong → BGC', fare: '₱380', time: '1:15 PM', status: 'completed' },
                  { id: 'T003', route: 'Pasig → Ortigas', fare: '₱420', time: '11:45 AM', status: 'completed' },
                  { id: 'T004', route: 'Marikina → SM North', fare: '₱320', time: '10:20 AM', status: 'cancelled' }
                ].map((trip, index) => (
                  <div key={index} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className={`w-2 h-2 rounded-full ${
                        trip.status === 'completed' ? 'bg-green-500' : 'bg-red-500'
                      }`}></div>
                      <div>
                        <p className="font-medium text-gray-900">{trip.id}</p>
                        <p className="text-sm text-gray-600">{trip.route}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <span className="font-medium text-gray-900">{trip.fare}</span>
                      <span className="text-sm text-gray-600">{trip.time}</span>
                      <button className="text-gray-400 hover:text-gray-600">
                        <Eye className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 'disciplinary':
        return (
          <div className="space-y-6">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center">
                <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                <p className="text-green-800 font-medium">No active disciplinary actions</p>
              </div>
              <p className="text-green-700 text-sm mt-1">This driver has a clean record with excellent compliance.</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Scores</h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gray-700">Safety Score</span>
                    <span className="text-sm font-bold text-green-600">98/100</span>
                  </div>
                  <div className="bg-gray-200 rounded-full h-2">
                    <div className="bg-green-600 h-2 rounded-full" style={{ width: '98%' }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gray-700">Compliance Score</span>
                    <span className="text-sm font-bold text-blue-600">95/100</span>
                  </div>
                  <div className="bg-gray-200 rounded-full h-2">
                    <div className="bg-blue-600 h-2 rounded-full" style={{ width: '95%' }}></div>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white rounded-lg shadow-sm p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-yellow-600">Minor Violations</p>
                    <p className="text-2xl font-bold text-gray-900">0/3</p>
                  </div>
                  <AlertTriangle className="w-8 h-8 text-yellow-500" />
                </div>
              </div>
              <div className="bg-white rounded-lg shadow-sm p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-red-600">Major Violations</p>
                    <p className="text-2xl font-bold text-gray-900">0/2</p>
                  </div>
                  <Ban className="w-8 h-8 text-red-500" />
                </div>
              </div>
            </div>
          </div>
        );

      case 'wallet':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-6 text-white">
                <div>
                  <p className="text-blue-100">Available Balance</p>
                  <p className="text-3xl font-bold">₱2,450.75</p>
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600">Today's Earnings</p>
                    <p className="text-2xl font-bold text-gray-900">₱1,250</p>
                  </div>
                  <div className="text-green-500">
                    <TrendingUp className="w-6 h-6" />
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600">Pending</p>
                    <p className="text-2xl font-bold text-gray-900">₱385</p>
                  </div>
                  <Clock className="w-6 h-6 text-yellow-500" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Transaction History</h3>
              <div className="space-y-3">
                {[
                  { type: 'earning', icon: DollarSign, description: 'Trip Payment', amount: '+₱450', time: '2:30 PM', color: 'green' },
                  { type: 'cashout', icon: Download, description: 'Cash Out Request', amount: '-₱1,000', time: '1:00 PM', color: 'red' },
                  { type: 'bonus', icon: Award, description: 'Weekly Bonus', amount: '+₱500', time: '12:00 PM', color: 'blue' },
                  { type: 'earning', icon: DollarSign, description: 'Trip Payment', amount: '+₱380', time: '11:15 AM', color: 'green' }
                ].map((transaction, index) => {
                  const IconComponent = transaction.icon;
                  return (
                    <div key={index} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className={`p-2 rounded-full bg-${transaction.color}-100`}>
                          <IconComponent className={`w-4 h-4 text-${transaction.color}-600`} />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{transaction.description}</p>
                          <p className="text-sm text-gray-600">{transaction.time}</p>
                        </div>
                      </div>
                      <span className={`font-medium ${
                        transaction.amount.startsWith('+') ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {transaction.amount}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );

      case 'chat':
        return (
          <div className="bg-white rounded-xl shadow-sm h-full">
            <div className="p-4 border-b">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <Smartphone className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">Support Team</h3>
                  <p className="text-sm text-green-600">Online</p>
                </div>
              </div>
            </div>
            
            <div className="h-96 overflow-y-auto p-4 space-y-4">
              <div className="flex">
                <div className="bg-gray-100 rounded-lg p-3 max-w-xs">
                  <p className="text-sm">Hello! How can we help you today?</p>
                  <span className="text-xs text-gray-500">10:30 AM</span>
                </div>
              </div>
              <div className="flex justify-end">
                <div className="bg-blue-600 text-white rounded-lg p-3 max-w-xs">
                  <p className="text-sm">I have a question about my earnings</p>
                  <span className="text-xs text-blue-100">10:32 AM</span>
                </div>
              </div>
              <div className="flex">
                <div className="bg-gray-100 rounded-lg p-3 max-w-xs">
                  <p className="text-sm">I'd be happy to help you with that. Can you provide more details?</p>
                  <span className="text-xs text-gray-500">10:33 AM</span>
                </div>
              </div>
            </div>
            
            <div className="p-4 border-t">
              <div className="flex space-x-2">
                <input
                  type="text"
                  placeholder="Type a message..."
                  className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        );

      case 'history':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white rounded-lg shadow-sm p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Today's Usage</p>
                    <p className="text-2xl font-bold text-gray-900">7.5 hrs</p>
                  </div>
                  <Clock className="w-8 h-8 text-blue-600" />
                </div>
              </div>
              <div className="bg-white rounded-lg shadow-sm p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Sessions</p>
                    <p className="text-2xl font-bold text-gray-900">4</p>
                  </div>
                  <Smartphone className="w-8 h-8 text-green-600" />
                </div>
              </div>
              <div className="bg-white rounded-lg shadow-sm p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Last Login</p>
                    <p className="text-2xl font-bold text-gray-900">2h ago</p>
                  </div>
                  <History className="w-8 h-8 text-purple-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Activity Timeline</h3>
              <div className="space-y-4">
                {[
                  { action: 'App opened', time: '2 hours ago', status: 'online' },
                  { action: 'Trip completed - #T001', time: '3 hours ago', status: 'completed' },
                  { action: 'Went online', time: '5 hours ago', status: 'active' },
                  { action: 'Profile updated', time: '1 day ago', status: 'updated' },
                  { action: 'Document uploaded', time: '2 days ago', status: 'uploaded' }
                ].map((activity, index) => (
                  <div key={index} className="flex items-center space-x-3">
                    <div className={`w-2 h-2 rounded-full ${
                      activity.status === 'online' ? 'bg-green-500' :
                      activity.status === 'completed' ? 'bg-blue-500' :
                      activity.status === 'active' ? 'bg-yellow-500' :
                      'bg-gray-500'
                    }`}></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{activity.action}</p>
                      <p className="text-xs text-gray-600">{activity.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 'training':
        return (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Training Progress</h3>
              <div className="mb-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-700">Overall Progress</span>
                  <span className="text-sm font-bold text-blue-600">85%</span>
                </div>
                <div className="bg-gray-200 rounded-full h-3">
                  <div className="bg-blue-600 h-3 rounded-full" style={{ width: '85%' }}></div>
                </div>
              </div>
              <p className="text-sm text-gray-600">3 certifications earned</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Available Courses</h3>
              <div className="space-y-4">
                {[
                  { title: 'Defensive Driving', progress: 100, duration: '45 min', status: 'completed' },
                  { title: 'Customer Service Excellence', progress: 75, duration: '30 min', status: 'in_progress' },
                  { title: 'Safety Protocols', progress: 100, duration: '25 min', status: 'completed' },
                  { title: 'Emergency Response', progress: 0, duration: '40 min', status: 'not_started' },
                  { title: 'Vehicle Maintenance', progress: 50, duration: '35 min', status: 'in_progress' }
                ].map((course, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h4 className="font-medium text-gray-900">{course.title}</h4>
                        <p className="text-sm text-gray-600">{course.duration}</p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        course.status === 'completed' ? 'bg-green-100 text-green-800' :
                        course.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {course.status === 'completed' ? 'Completed' :
                         course.status === 'in_progress' ? 'In Progress' : 'Not Started'}
                      </span>
                    </div>
                    
                    {course.progress > 0 && (
                      <div className="mb-3">
                        <div className="bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${
                              course.status === 'completed' ? 'bg-green-500' : 'bg-blue-500'
                            }`}
                            style={{ width: `${course.progress}%` }}
                          ></div>
                        </div>
                        <p className="text-xs text-gray-600 mt-1">{course.progress}% complete</p>
                      </div>
                    )}
                    
                    <div className="flex justify-end">
                      <button className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        course.status === 'completed' ? 'bg-gray-100 text-gray-700 hover:bg-gray-200' :
                        course.status === 'in_progress' ? 'bg-blue-600 text-white hover:bg-blue-700' :
                        'bg-blue-600 text-white hover:bg-blue-700'
                      }`}>
                        {course.status === 'completed' ? 'Review' :
                         course.status === 'in_progress' ? 'Continue' : 'Start'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      default:
        return <div>Tab content not implemented</div>;
    }
  };

  return (
    <div className={`min-h-screen bg-gray-50 ${className}`}>
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-100 px-4 md:px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {onClose && (
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ChevronLeft className="w-5 h-5 text-gray-600" />
              </button>
            )}
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <Car className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Driver Portal</h1>
                <p className="text-sm text-gray-600">Private & Confidential</p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <MoreHorizontal className="w-5 h-5 text-gray-600" />
            </button>
            <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
              <span className="text-sm font-medium text-gray-700">CB</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm p-6 sticky top-6">
              {/* Profile Section */}
              <div className="text-center mb-6">
                <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold text-white">
                    {driverData.name.split(' ').map(n => n[0]).join('')}
                  </span>
                </div>
                <h2 className="text-xl font-bold text-gray-900">{driverData.name}</h2>
                <p className="text-gray-600">ID: {driverData.id}</p>
                <div className="flex items-center justify-center space-x-1 mt-2">
                  {renderStars(driverData.rating)}
                  <span className="text-sm font-medium text-gray-700 ml-1">{driverData.rating}</span>
                </div>
              </div>

              {/* Contact Information */}
              <div className="space-y-3 mb-6">
                <div className="flex items-center space-x-3">
                  <Phone className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-700">{driverData.phone}</span>
                </div>
                <div className="flex items-center space-x-3">
                  <Mail className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-700">{driverData.email}</span>
                </div>
                <div className="flex items-center space-x-3">
                  <MapPin className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-700">{driverData.address}</span>
                </div>
                <div className="flex items-center space-x-3">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-700">{driverData.dateOfBirth}</span>
                </div>
              </div>

              {/* Status Information */}
              <div className="grid grid-cols-1 gap-3 mb-6 text-sm">
                <div>
                  <p className="text-gray-600">Join Date</p>
                  <p className="font-medium text-gray-900">{driverData.joinDate}</p>
                </div>
                <div>
                  <p className="text-gray-600">Last Active</p>
                  <p className="font-medium text-gray-900">{driverData.lastActive}</p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                <button className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors">
                  Send Message
                </button>
                <button className="w-full border border-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-50 transition-colors">
                  More Actions
                </button>
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="lg:col-span-3">
            {/* Tab Navigation */}
            <div className="bg-white rounded-xl shadow-sm mb-6 overflow-x-auto">
              <div className="flex space-x-0 min-w-max">
                {tabs.map((tab) => {
                  const IconComponent = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex items-center space-x-2 px-4 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                        activeTab === tab.id
                          ? 'text-blue-600 border-blue-600 bg-blue-50'
                          : 'text-gray-600 border-transparent hover:text-gray-900 hover:border-gray-300'
                      }`}
                    >
                      <IconComponent className="w-4 h-4" />
                      <span>{tab.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Tab Content */}
            <div className="min-h-[600px]">
              {renderTabContent()}
            </div>
          </div>
        </div>
      </div>

      {/* Image Editor Modal */}
      {isImageEditorOpen && selectedImage && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Edit Image</h3>
                <button
                  onClick={() => {
                    setIsImageEditorOpen(false);
                    setSelectedImage(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>
              
              <div className="aspect-video bg-gray-100 rounded-lg mb-4 flex items-center justify-center">
                <img
                  src={selectedImage}
                  alt="Preview"
                  className="max-w-full max-h-full object-contain rounded-lg"
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex space-x-2">
                  <button className="flex items-center space-x-2 px-3 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
                    <Crop className="w-4 h-4" />
                    <span>Crop</span>
                  </button>
                  <button className="flex items-center space-x-2 px-3 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
                    <RotateCcw className="w-4 h-4" />
                    <span>Rotate</span>
                  </button>
                </div>
                
                <div className="flex space-x-2">
                  <button
                    onClick={() => {
                      setIsImageEditorOpen(false);
                      setSelectedImage(null);
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                    Save
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DriverAdminPortal;