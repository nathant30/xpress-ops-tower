'use client';

import React, { useState, useRef } from 'react';
import { 
  TrendingUp, Users, CheckCircle, XCircle, AlertCircle, Eye, Download,
  Smartphone, Shield, Camera, Crop, RotateCcw, ShoppingBag, AlertTriangle,
  MessageCircle, History, GraduationCap, DollarSign, Send, Search, Filter,
  BarChart3, Target, BookOpen, Video, Ban, AlertOctagon, Phone, Mail, MapPin,
  Calendar, Clock, Award, Upload, Edit3, ChevronLeft, MoreHorizontal, Star,
  Plus, FileText, Settings, Trash2, Copy, RefreshCw, Brain, UserCheck,
  Activity, Zap, Cpu, Database, TrendingDown, X
} from 'lucide-react';

const Car = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
          d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
          d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
  </svg>
);

const CreditCard = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
          d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
  </svg>
);

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
  const [chatMessage, setChatMessage] = useState('');
  const [notifications, setNotifications] = useState(3);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDocumentUploaded, setIsDocumentUploaded] = useState(false);
  
  // Modal system state
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<any>(null);
  const [selectedTrip, setSelectedTrip] = useState<any>(null);
  const [selectedTransaction, setSelectedTransaction] = useState<any>(null);
  const [modalData, setModalData] = useState<any>(null);
  const [fraudScanProgress, setFraudScanProgress] = useState(0);
  const [fraudScanComplete, setFraudScanComplete] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState([
    { id: 1, type: 'GCash', number: '+639*******762', primary: true },
    { id: 2, type: 'BPI Bank', number: '****-****-1234', primary: false }
  ]);
  const [courses] = useState([
    { id: 1, title: 'Defensive Driving', progress: 100, duration: '45 min', status: 'completed', score: 95 },
    { id: 2, title: 'Customer Service Excellence', progress: 75, duration: '30 min', status: 'in_progress', score: null },
    { id: 3, title: 'Safety Protocols', progress: 100, duration: '25 min', status: 'completed', score: 88 },
    { id: 4, title: 'Emergency Response', progress: 0, duration: '40 min', status: 'not_started', score: null },
    { id: 5, title: 'Vehicle Maintenance', progress: 50, duration: '35 min', status: 'in_progress', score: null }
  ]);

  // Fraud detection state
  const [fraudData] = useState({
    riskLevel: 'Low',
    riskScore: 12,
    mlScore: 0.89,
    aiConfidence: 94,
    cases: [
      { id: 'F001', type: 'Payment Anomaly', status: 'Resolved', date: '2024-01-15', severity: 'Low' },
      { id: 'F002', type: 'Route Deviation', status: 'Under Review', date: '2024-02-03', severity: 'Medium' }
    ],
    behaviorFlags: [],
    lastScan: '2024-12-28 10:30:00'
  });

  // Team management state
  const [teamData] = useState({
    currentTeam: {
      id: 'T001',
      name: 'Metro Manila Fleet Alpha',
      leader: 'Maria Santos',
      region: 'NCR',
      members: 15,
      performance: 94
    },
    teamHistory: [
      { teamId: 'T002', name: 'Quezon City Riders', period: 'Jan 2023 - Mar 2023', role: 'Member' },
      { teamId: 'T003', name: 'BGC Express Team', period: 'Mar 2023 - Present', role: 'Senior Driver' }
    ],
    leadership: {
      isLeader: false,
      hasTrainingCerts: true,
      mentorshipActive: false
    }
  });

  // Sample data for modals
  const [documentsData] = useState([
    {
      id: 'dl_front',
      type: 'Driver License (Front)',
      expiry: 'December 15, 2025',
      status: 'valid',
      imageUrl: 'https://via.placeholder.com/600x400/f0fdf4/16a34a?text=Driver+License+Front',
      licenseNumber: 'N02-18-019976',
      issuedBy: 'Land Transportation Office',
      issuedDate: 'December 15, 2020',
      restrictions: 'NONE',
      conditions: 'MUST WEAR CORRECTIVE LENS',
      bloodType: 'O+',
      address: 'Caloocan City, Metro Manila'
    },
    {
      id: 'dl_back',
      type: 'Driver License (Back)',
      expiry: 'December 15, 2025',
      status: 'valid',
      imageUrl: 'https://via.placeholder.com/600x400/f0fdf4/16a34a?text=Driver+License+Back',
      licenseNumber: 'N02-18-019976',
      issuedBy: 'Land Transportation Office',
      emergencyContact: 'Maria Benedicto - 09123456789'
    },
    {
      id: 'nbi',
      type: 'NBI Clearance',
      expiry: 'March 20, 2024',
      status: 'expired',
      imageUrl: 'https://via.placeholder.com/600x400/fef2f2/dc2626?text=NBI+Clearance',
      controlNumber: 'NBI-24-00012345',
      issuedBy: 'National Bureau of Investigation',
      purpose: 'Employment',
      findings: 'NO CRIMINAL RECORD'
    },
    {
      id: 'orcr',
      type: 'Vehicle Registration',
      expiry: 'August 30, 2024',
      status: 'valid',
      imageUrl: 'https://via.placeholder.com/600x400/f0fdf4/16a34a?text=Vehicle+Registration+ORCR',
      plateNumber: 'ABC-1234',
      make: 'Toyota',
      model: 'Vios',
      year: '2019',
      engineNumber: '2NR-123456',
      chassisNumber: 'NHTV12345678901234'
    }
  ]);

  const [tripsData] = useState([
    {
      id: 'T001',
      bookingReference: 'XPR-2024-001234',
      from: 'Quezon City',
      to: 'Makati',
      fare: 450,
      distance: '18.5 km',
      duration: '45 mins',
      passengerName: 'Maria Santos',
      passengerPhone: '+639171234567',
      pickupAddress: '123 Commonwealth Ave, Quezon City',
      dropoffAddress: '456 Ayala Ave, Makati City',
      pickupTime: '2024-12-28 14:30:00',
      dropoffTime: '2024-12-28 15:15:00',
      commission: 67.50,
      netEarning: 382.50,
      rating: 5,
      feedback: 'Excellent service! Very professional and safe driver. Arrived on time and drove carefully.',
      paymentMethod: 'GCash',
      referenceNumber: 'GC-2025082830001',
      status: 'completed',
      vehicleUsed: 'Toyota Vios (ABC-1234)',
      routeNotes: 'Took EDSA route to avoid traffic in C5'
    },
    {
      id: 'T002',
      bookingReference: 'XPR-2024-001235',
      from: 'Mandaluyong',
      to: 'BGC',
      fare: 380,
      distance: '12.3 km',
      duration: '35 mins',
      passengerName: 'Juan Cruz',
      passengerPhone: '+639181234567',
      pickupAddress: '789 Shaw Blvd, Mandaluyong',
      dropoffAddress: '321 26th St, BGC, Taguig',
      pickupTime: '2024-12-28 13:15:00',
      dropoffTime: '2024-12-28 13:50:00',
      commission: 57.00,
      netEarning: 323.00,
      rating: 4.8,
      feedback: 'Good driver, clean car. Would book again.',
      paymentMethod: 'Cash',
      referenceNumber: 'CASH-001235',
      status: 'completed',
      vehicleUsed: 'Toyota Vios (ABC-1234)',
      routeNotes: 'Used C5 flyover for faster route'
    }
  ]);

  const [transactionsData] = useState([
    {
      id: 'TXN001',
      type: 'trip_payment',
      amount: 450,
      netAmount: 382.50,
      commission: 67.50,
      description: 'Trip Payment - Quezon City to Makati',
      referenceNumber: 'GC-2025082830001',
      tripId: 'T001',
      paymentMethod: 'GCash',
      status: 'completed',
      timestamp: '2024-12-28 15:20:00',
      processingFee: 0,
      tax: 0,
      customerName: 'Maria Santos'
    },
    {
      id: 'TXN002',
      type: 'cashout',
      amount: -1000,
      netAmount: -1000,
      commission: 0,
      description: 'Cash Out to GCash',
      referenceNumber: 'CO-2024122801',
      paymentMethod: 'GCash',
      status: 'completed',
      timestamp: '2024-12-28 13:00:00',
      processingFee: 15,
      recipientAccount: '+639566872762'
    },
    {
      id: 'TXN003',
      type: 'bonus',
      amount: 500,
      netAmount: 500,
      commission: 0,
      description: 'Weekly Performance Bonus',
      referenceNumber: 'BONUS-W52-2024',
      status: 'completed',
      timestamp: '2024-12-23 00:00:00',
      bonusType: 'Performance',
      criteria: 'Completed 25+ trips with 4.8+ rating'
    }
  ]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatInputRef = useRef<HTMLInputElement>(null);

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
    { id: 'fraud', name: 'Fraud', icon: Brain },
    { id: 'team', name: 'Team', icon: Users },
    { id: 'wallet', name: 'Wallet', icon: CreditCard },
    { id: 'chat', name: 'Chat', icon: MessageCircle },
    { id: 'history', name: 'App History', icon: History },
    { id: 'training', name: 'Training', icon: GraduationCap },
  ];

  // Interactive handlers
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

  const handleDocumentUpload = () => {
    fileInputRef.current?.click();
  };

  const handleDocumentView = (docId: string) => {
    const document = documentsData.find(doc => doc.id === docId || doc.type === docId);
    if (document) {
      openModal('document', document);
    }
  };

  const handleDocumentDownload = (docType: string) => {
    openModal('confirm-download', { docType });
  };

  const handleSendMessage = () => {
    if (chatMessage.trim()) {
      openModal('message-sent', { message: chatMessage.trim() });
      setChatMessage('');
    }
  };

  const handleImageSave = () => {
    if (selectedImage) {
      openModal('image-saved');
      setIsImageEditorOpen(false);
      setSelectedImage(null);
    }
  };

  const handleImageCrop = () => {
    openModal('crop-tool');
  };

  const handleImageRotate = () => {
    openModal('rotate-image');
  };

  const handleSendDriverMessage = () => {
    openModal('message-composer', { driverName: driverData.name });
  };

  const handleMoreActions = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const handleAddPaymentMethod = () => {
    const newMethod = {
      id: Date.now(),
      type: 'New Payment Method',
      number: '****-****-0000',
      primary: false
    };
    setPaymentMethods([...paymentMethods, newMethod]);
    openModal('payment-method-added');
  };

  const handleCourseAction = (courseId: number, action: string) => {
    const course = courses.find(c => c.id === courseId);
    if (course) {
      switch (action) {
        case 'start':
          openModal('course-start', { course });
          break;
        case 'continue':
          openModal('course-continue', { course });
          break;
        case 'review':
          openModal('course-review', { course });
          break;
      }
    }
  };

  const handleDownloadStatement = () => {
    openModal('download-statement');
  };

  const handleEditVehicle = () => {
    openModal('vehicle-editor');
  };

  const handleAddVehicle = () => {
    openModal('add-vehicle');
  };

  const handleCashOut = () => {
    openModal('cash-out');
  };

  // Fraud-related handlers
  const handleRunFraudScan = () => {
    openModal('fraud-scan');
  };

  const handleViewFraudCase = (caseId: string) => {
    openModal('fraud-case', { caseId });
  };

  const handleReportFraud = () => {
    openModal('report-fraud');
  };

  const handleFlagBehavior = () => {
    openModal('flag-behavior');
  };

  // Team-related handlers
  const handleJoinTeam = () => {
    openModal('join-team');
  };

  const handleLeaveTeam = () => {
    openModal('leave-team');
  };

  const handleContactTeamLeader = () => {
    openModal('contact-leader');
  };

  const handleViewTeamPerformance = () => {
    openModal('team-performance');
  };

  const handleApplyForLeadership = () => {
    openModal('apply-leadership');
  };

  const handleStartMentorship = () => {
    openModal('start-mentorship');
  };

  // Modal system handlers
  const openModal = (modalType: string, data: any = null) => {
    setActiveModal(modalType);
    setModalData(data);
    if (modalType === 'document') setSelectedDocument(data);
    if (modalType === 'trip') setSelectedTrip(data);
    if (modalType === 'transaction') setSelectedTransaction(data);
    if (modalType === 'fraud-scan') {
      setFraudScanProgress(0);
      setFraudScanComplete(false);
      simulateFraudScan();
    }
  };

  const closeModal = () => {
    setActiveModal(null);
    setSelectedDocument(null);
    setSelectedTrip(null);
    setSelectedTransaction(null);
    setModalData(null);
    setFraudScanProgress(0);
    setFraudScanComplete(false);
  };

  const simulateFraudScan = () => {
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 20 + 10;
      if (progress >= 100) {
        progress = 100;
        setFraudScanComplete(true);
        clearInterval(interval);
      }
      setFraudScanProgress(progress);
    }, 800);
  };

  const viewRelatedTrip = (tripId: string) => {
    const trip = tripsData.find(t => t.id === tripId);
    if (trip) {
      closeModal();
      setTimeout(() => openModal('trip', trip), 100);
    }
  };

  const viewRelatedTransaction = (transactionId: string) => {
    const transaction = transactionsData.find(t => t.id === transactionId);
    if (transaction) {
      closeModal();
      setTimeout(() => openModal('transaction', transaction), 100);
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
                  <div key={index} className="bg-gray-50 rounded-lg p-4 text-center hover:shadow-md transition-shadow cursor-pointer"
                       onClick={() => openModal('achievement-detail', badge)}>
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
                  onClick={handleDocumentUpload}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Upload className="w-4 h-4" />
                  <span>Upload</span>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,.pdf"
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
                        <button 
                          onClick={() => handleDocumentView(doc.type)}
                          className="text-gray-400 hover:text-gray-600 transition-colors"
                          title="View document"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDocumentDownload(doc.type)}
                          className="text-gray-400 hover:text-gray-600 transition-colors"
                          title="Download document"
                        >
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
                <div className="flex space-x-2">
                  <button 
                    onClick={handleEditVehicle}
                    className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <Edit3 className="w-4 h-4" />
                    <span>Edit</span>
                  </button>
                  <button 
                    onClick={handleAddVehicle}
                    className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Vehicle</span>
                  </button>
                </div>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <div className="relative aspect-video bg-gray-100 rounded-lg mb-4">
                    <img 
                      src="https://via.placeholder.com/400x225/f3f4f6/374151?text=Vehicle+Photo" 
                      alt="Vehicle" 
                      className="w-full h-full object-cover rounded-lg"
                    />
                    <button 
                      onClick={() => openModal('vehicle-camera')}
                      className="absolute top-2 right-2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70 transition-opacity"
                    >
                      <Camera className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {Array.from({ length: 4 }, (_, i) => (
                      <button
                        key={i}
                        onClick={() => openModal('vehicle-image', { imageIndex: i + 1 })}
                        className="aspect-square bg-gray-100 rounded hover:bg-gray-200 transition-colors"
                      >
                        <img 
                          src={`https://via.placeholder.com/100x100/f3f4f6/6b7280?text=Photo+${i + 1}`}
                          alt={`Vehicle ${i + 1}`}
                          className="w-full h-full object-cover rounded"
                        />
                      </button>
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

            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="sticky top-0 bg-white z-10 border-b border-gray-200 p-6 pb-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold text-gray-900">Transaction History</h3>
                  <button 
                    onClick={handleDownloadStatement}
                    className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    <span>Export</span>
                  </button>
                </div>
              </div>
              <div className="max-h-96 overflow-y-auto p-6 pt-4 space-y-3">
                {[
                  { type: 'earning', description: 'Trip to Makati CBD', amount: '+₱450', time: '2:30 PM', status: 'completed' },
                  { type: 'earning', description: 'Trip to BGC', amount: '+₱380', time: '1:15 PM', status: 'completed' },
                  { type: 'deduction', description: 'Platform Commission', amount: '-₱65', time: '1:15 PM', status: 'processed' },
                  { type: 'earning', description: 'Trip to Ortigas', amount: '+₱420', time: '11:45 AM', status: 'completed' }
                ].map((transaction, index) => (
                  <button
                    key={index}
                    onClick={() => openModal('transaction', transaction)}
                    className="w-full flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors text-left"
                  >
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
                  </button>
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

            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="sticky top-0 bg-white z-10 border-b border-gray-200 p-6 pb-4">
                <h3 className="text-lg font-semibold text-gray-900">Recent Trips</h3>
              </div>
              <div className="max-h-96 overflow-y-auto p-6 pt-4 space-y-3">
                {[
                  { id: 'T001', route: 'Quezon City → Makati', fare: '₱450', time: '2:30 PM', status: 'completed' },
                  { id: 'T002', route: 'Mandaluyong → BGC', fare: '₱380', time: '1:15 PM', status: 'completed' },
                  { id: 'T003', route: 'Pasig → Ortigas', fare: '₱420', time: '11:45 AM', status: 'completed' },
                  { id: 'T004', route: 'Marikina → SM North', fare: '₱320', time: '10:20 AM', status: 'cancelled' }
                ].map((trip, index) => (
                  <button
                    key={index}
                    onClick={() => openModal('trip', trip)}
                    className="w-full flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors text-left"
                  >
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
                      <Eye className="w-4 h-4 text-gray-400" />
                    </div>
                  </button>
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
                <div>
                  <p className="text-green-800 font-medium">No active disciplinary actions</p>
                  <p className="text-green-700 text-sm mt-1">This driver has a clean record with excellent compliance.</p>
                </div>
              </div>
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
                  <button 
                    onClick={handleCashOut}
                    className="mt-2 px-4 py-2 bg-white bg-opacity-20 rounded-lg hover:bg-opacity-30 transition-colors"
                  >
                    Cash Out
                  </button>
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600">Today's Earnings</p>
                    <p className="text-2xl font-bold text-gray-900">₱1,250</p>
                  </div>
                  <TrendingUp className="w-6 h-6 text-green-500" />
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

            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="sticky top-0 bg-white z-10 border-b border-gray-200 p-6 pb-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold text-gray-900">Transaction History</h3>
                  <button 
                    onClick={handleDownloadStatement}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Download Statement
                  </button>
                </div>
              </div>
              
              <div className="max-h-96 overflow-y-auto p-6 pt-4 space-y-3">
                {[
                  { type: 'earning', icon: DollarSign, description: 'Trip Payment', amount: '+₱450', time: '2:30 PM', color: 'green' },
                  { type: 'cashout', icon: Download, description: 'Cash Out Request', amount: '-₱1,000', time: '1:00 PM', color: 'red' },
                  { type: 'bonus', icon: Award, description: 'Weekly Bonus', amount: '+₱500', time: '12:00 PM', color: 'blue' },
                  { type: 'earning', icon: DollarSign, description: 'Trip Payment', amount: '+₱380', time: '11:15 AM', color: 'green' }
                ].map((transaction, index) => {
                  const IconComponent = transaction.icon;
                  return (
                    <button
                      key={index}
                      onClick={() => openModal('transaction', transaction)}
                      className="w-full flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors text-left"
                    >
                      <div className="flex items-center space-x-3">
                        <div className={`p-2 rounded-full ${
                          transaction.color === 'green' ? 'bg-green-100' :
                          transaction.color === 'red' ? 'bg-red-100' :
                          transaction.color === 'yellow' ? 'bg-yellow-100' :
                          'bg-blue-100'
                        }`}>
                          <IconComponent className={`w-4 h-4 ${
                            transaction.color === 'green' ? 'text-green-600' :
                            transaction.color === 'red' ? 'text-red-600' :
                            transaction.color === 'yellow' ? 'text-yellow-600' :
                            'text-blue-600'
                          }`} />
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
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="sticky top-0 bg-white z-10 border-b border-gray-200 p-6 pb-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold text-gray-900">Payment Methods</h3>
                  <button 
                    onClick={handleAddPaymentMethod}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Add Method
                  </button>
                </div>
              </div>
              
              <div className="max-h-96 overflow-y-auto p-6 pt-4 space-y-3">
                {paymentMethods.map((method) => (
                  <div key={method.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <span className="font-bold text-blue-600">{method.type[0]}</span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{method.type}</p>
                        <p className="text-sm text-gray-600">{method.number}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {method.primary && (
                        <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">Primary</span>
                      )}
                      <button 
                        onClick={() => openModal('manage-payment', method)}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        <Settings className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 'chat':
        return (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden" style={{ height: '600px' }}>
            <div className="bg-gray-50 px-6 py-4 border-b">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <Smartphone className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">Support Team</h3>
                  <p className="text-sm text-green-600">Online now</p>
                </div>
              </div>
            </div>
            
            <div className="flex-1 p-6 space-y-4 overflow-y-auto" style={{ height: '400px' }}>
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                  <span className="text-xs font-medium text-gray-600">ST</span>
                </div>
                <div className="bg-gray-100 rounded-lg p-3 max-w-xs">
                  <p className="text-sm text-gray-900">Hello! How can we help you today?</p>
                  <span className="text-xs text-gray-500 mt-1 block">10:30 AM</span>
                </div>
              </div>
              
              <div className="flex items-start space-x-3 justify-end">
                <div className="bg-blue-600 text-white rounded-lg p-3 max-w-xs">
                  <p className="text-sm">I have a question about my recent trip earnings</p>
                  <span className="text-xs text-blue-100 mt-1 block">10:32 AM</span>
                </div>
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-xs font-medium text-blue-600">{driverData.name[0]}</span>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                  <span className="text-xs font-medium text-gray-600">ST</span>
                </div>
                <div className="bg-gray-100 rounded-lg p-3 max-w-xs">
                  <p className="text-sm text-gray-900">I'd be happy to help you with that. Can you provide the trip ID or booking reference?</p>
                  <span className="text-xs text-gray-500 mt-1 block">10:33 AM</span>
                </div>
              </div>
            </div>
            
            <div className="border-t bg-white p-4">
              <div className="flex space-x-3">
                <input
                  ref={chatInputRef}
                  type="text"
                  value={chatMessage}
                  onChange={(e) => setChatMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Type your message..."
                  className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button 
                  onClick={handleSendMessage}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
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
                  <button
                    key={index}
                    onClick={() => openModal('activity-detail', activity)}
                    className="w-full flex items-center space-x-3 p-2 hover:bg-gray-50 rounded-lg transition-colors text-left"
                  >
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
                  </button>
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
                  <span className="text-sm font-bold text-blue-600">75%</span>
                </div>
                <div className="bg-gray-200 rounded-full h-3">
                  <div className="bg-blue-600 h-3 rounded-full" style={{ width: '75%' }}></div>
                </div>
              </div>
              <p className="text-sm text-gray-600">3 of 5 courses completed</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="sticky top-0 bg-white z-10 border-b border-gray-200 p-6 pb-4">
                <h3 className="text-lg font-semibold text-gray-900">Available Courses</h3>
              </div>
              <div className="max-h-96 overflow-y-auto p-6 pt-4 space-y-4">
                {courses.map((course) => (
                  <div key={course.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h4 className="font-medium text-gray-900">{course.title}</h4>
                        <p className="text-sm text-gray-600">{course.duration}</p>
                      </div>
                      <div className="flex items-center space-x-3">
                        {course.score && (
                          <span className="text-sm font-medium text-green-600">Score: {course.score}%</span>
                        )}
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                          course.status === 'completed' ? 'bg-green-100 text-green-800' :
                          course.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {course.status === 'completed' ? 'Completed' :
                           course.status === 'in_progress' ? 'In Progress' : 'Not Started'}
                        </span>
                      </div>
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
                      <button 
                        onClick={() => handleCourseAction(course.id, 
                          course.status === 'completed' ? 'review' :
                          course.status === 'in_progress' ? 'continue' : 'start'
                        )}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          course.status === 'completed' ? 'bg-gray-100 text-gray-700 hover:bg-gray-200' :
                          course.status === 'in_progress' ? 'bg-blue-600 text-white hover:bg-blue-700' :
                          'bg-blue-600 text-white hover:bg-blue-700'
                        }`}
                      >
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

      case 'fraud':
        return (
          <div className="space-y-6">
            {/* Fraud Risk Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Risk Level</h3>
                  <Brain className="w-6 h-6 text-blue-600" />
                </div>
                <div className="text-center">
                  <div className={`text-4xl font-bold mb-2 ${
                    fraudData.riskLevel === 'Low' ? 'text-green-600' :
                    fraudData.riskLevel === 'Medium' ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    {fraudData.riskLevel}
                  </div>
                  <div className="text-sm text-gray-600">Risk Score: {fraudData.riskScore}/100</div>
                  <div className={`mt-2 w-full bg-gray-200 rounded-full h-2 ${
                    fraudData.riskLevel === 'Low' ? 'bg-green-200' :
                    fraudData.riskLevel === 'Medium' ? 'bg-yellow-200' : 'bg-red-200'
                  }`}>
                    <div 
                      className={`h-2 rounded-full ${
                        fraudData.riskLevel === 'Low' ? 'bg-green-600' :
                        fraudData.riskLevel === 'Medium' ? 'bg-yellow-600' : 'bg-red-600'
                      }`}
                      style={{ width: `${fraudData.riskScore}%` }}
                    ></div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">ML/AI Scoring</h3>
                  <Cpu className="w-6 h-6 text-purple-600" />
                </div>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">ML Score</span>
                      <span className="font-bold text-purple-600">{fraudData.mlScore}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                      <div className="bg-purple-600 h-2 rounded-full" style={{ width: `${fraudData.mlScore * 100}%` }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">AI Confidence</span>
                      <span className="font-bold text-blue-600">{fraudData.aiConfidence}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                      <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${fraudData.aiConfidence}%` }}></div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Quick Actions</h3>
                  <Zap className="w-6 h-6 text-yellow-600" />
                </div>
                <div className="space-y-2">
                  <button 
                    onClick={handleRunFraudScan}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                  >
                    Run Fraud Scan
                  </button>
                  <button 
                    onClick={handleReportFraud}
                    className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
                  >
                    Report Fraud
                  </button>
                  <button 
                    onClick={handleFlagBehavior}
                    className="w-full px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors text-sm"
                  >
                    Flag Behavior
                  </button>
                </div>
              </div>
            </div>

            {/* Fraud Cases */}
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="sticky top-0 bg-white z-10 border-b border-gray-200 p-6 pb-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold text-gray-900">Fraud Cases</h3>
                  <span className="text-sm text-gray-600">
                    Last scan: {new Date(fraudData.lastScan).toLocaleString()}
                  </span>
                </div>
              </div>
              
              <div className="max-h-96 overflow-y-auto p-6 pt-4 space-y-3">
                {fraudData.cases.length > 0 ? (
                  fraudData.cases.map((fraudCase) => (
                    <button
                      key={fraudCase.id}
                      onClick={() => handleViewFraudCase(fraudCase.id)}
                      className="w-full flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors text-left"
                    >
                      <div className="flex items-center space-x-3">
                        <div className={`w-3 h-3 rounded-full ${
                          fraudCase.severity === 'Low' ? 'bg-green-500' :
                          fraudCase.severity === 'Medium' ? 'bg-yellow-500' : 'bg-red-500'
                        }`}></div>
                        <div>
                          <p className="font-medium text-gray-900">{fraudCase.type}</p>
                          <p className="text-sm text-gray-600">Case ID: {fraudCase.id}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-medium ${
                          fraudCase.status === 'Resolved' ? 'text-green-600' :
                          fraudCase.status === 'Under Review' ? 'text-yellow-600' : 'text-red-600'
                        }`}>
                          {fraudCase.status}
                        </p>
                        <p className="text-xs text-gray-500">{fraudCase.date}</p>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-2" />
                    <p className="text-gray-600">No fraud cases detected</p>
                    <p className="text-sm text-gray-500">Driver maintains clean fraud record</p>
                  </div>
                )}
              </div>
            </div>

            {/* Behavioral Analysis */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Behavioral Analysis</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Pattern Recognition</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Route Consistency</span>
                      <span className="font-medium text-green-600">Normal</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Payment Patterns</span>
                      <span className="font-medium text-green-600">Normal</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Driver Behavior</span>
                      <span className="font-medium text-green-600">Normal</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Trip Frequency</span>
                      <span className="font-medium text-green-600">Normal</span>
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Risk Indicators</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Account Age</span>
                      <span className="font-medium text-green-600">10+ months</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Document Verification</span>
                      <span className="font-medium text-green-600">Verified</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Rating History</span>
                      <span className="font-medium text-green-600">Consistent</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Complaint Ratio</span>
                      <span className="font-medium text-green-600">Below 1%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'team':
        return (
          <div className="space-y-6">
            {/* Current Team Overview */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Current Team</h3>
                <div className="flex space-x-2">
                  <button 
                    onClick={handleViewTeamPerformance}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                  >
                    View Performance
                  </button>
                  <button 
                    onClick={handleLeaveTeam}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
                  >
                    Leave Team
                  </button>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="col-span-2">
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6">
                    <div className="flex items-center space-x-4 mb-4">
                      <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
                        <Users className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h4 className="text-xl font-bold text-gray-900">{teamData.currentTeam.name}</h4>
                        <p className="text-sm text-gray-600">Team ID: {teamData.currentTeam.id}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-600">Team Leader</p>
                        <p className="font-medium text-gray-900">{teamData.currentTeam.leader}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Region</p>
                        <p className="font-medium text-gray-900">{teamData.currentTeam.region}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Total Members</p>
                        <p className="font-medium text-gray-900">{teamData.currentTeam.members}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Performance</p>
                        <p className="font-medium text-green-600">{teamData.currentTeam.performance}%</p>
                      </div>
                    </div>
                  </div>
                </div>
                <div>
                  <div className="space-y-3">
                    <button 
                      onClick={handleContactTeamLeader}
                      className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Contact Leader
                    </button>
                    <button 
                      onClick={handleJoinTeam}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Switch Team
                    </button>
                    <button 
                      onClick={() => openModal('team-chat')}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Team Chat
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Team Performance Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-lg shadow-sm p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Team Rank</p>
                    <p className="text-2xl font-bold text-blue-600">#3</p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-blue-600" />
                </div>
              </div>
              <div className="bg-white rounded-lg shadow-sm p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Avg Rating</p>
                    <p className="text-2xl font-bold text-yellow-600">4.8</p>
                  </div>
                  <Star className="w-8 h-8 text-yellow-600" />
                </div>
              </div>
              <div className="bg-white rounded-lg shadow-sm p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Trips</p>
                    <p className="text-2xl font-bold text-green-600">2,340</p>
                  </div>
                  <Activity className="w-8 h-8 text-green-600" />
                </div>
              </div>
              <div className="bg-white rounded-lg shadow-sm p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Team Bonus</p>
                    <p className="text-2xl font-bold text-purple-600">₱450</p>
                  </div>
                  <Award className="w-8 h-8 text-purple-600" />
                </div>
              </div>
            </div>

            {/* Team History */}
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="sticky top-0 bg-white z-10 border-b border-gray-200 p-6 pb-4">
                <h3 className="text-lg font-semibold text-gray-900">Team History</h3>
              </div>
              <div className="max-h-96 overflow-y-auto p-6 pt-4">
                <div className="space-y-3">
                {teamData.teamHistory.map((team, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <h4 className="font-medium text-gray-900">{team.name}</h4>
                      <p className="text-sm text-gray-600">Team ID: {team.teamId}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-blue-600">{team.role}</p>
                      <p className="text-xs text-gray-500">{team.period}</p>
                    </div>
                  </div>
                ))}
                </div>
              </div>
            </div>

            {/* Leadership & Mentorship */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Leadership & Development</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Leadership Status</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Team Leadership Role</span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        teamData.leadership.isLeader 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {teamData.leadership.isLeader ? 'Team Leader' : 'Team Member'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Training Certifications</span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        teamData.leadership.hasTrainingCerts 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {teamData.leadership.hasTrainingCerts ? 'Certified' : 'Pending'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Mentorship Program</span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        teamData.leadership.mentorshipActive 
                          ? 'bg-blue-100 text-blue-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {teamData.leadership.mentorshipActive ? 'Active' : 'Available'}
                      </span>
                    </div>
                  </div>
                  
                  <div className="mt-4 space-y-2">
                    {!teamData.leadership.isLeader && (
                      <button 
                        onClick={handleApplyForLeadership}
                        className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                      >
                        Apply for Leadership
                      </button>
                    )}
                    {!teamData.leadership.mentorshipActive && (
                      <button 
                        onClick={handleStartMentorship}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                      >
                        Start Mentorship
                      </button>
                    )}
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Team Achievements</h4>
                  <div className="space-y-3">
                    {[
                      { title: 'Top Performer Q3 2024', date: 'Sep 2024', icon: '🏆' },
                      { title: 'Safety Champion', date: 'Aug 2024', icon: '🛡️' },
                      { title: 'Customer Service Award', date: 'Jul 2024', icon: '⭐' },
                      { title: 'Team Spirit Award', date: 'Jun 2024', icon: '🤝' }
                    ].map((achievement, index) => (
                      <div key={index} className="flex items-center space-x-3 p-2 bg-gray-50 rounded-lg">
                        <span className="text-2xl">{achievement.icon}</span>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{achievement.title}</p>
                          <p className="text-xs text-gray-600">{achievement.date}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return <div>Tab content not implemented</div>;
    }
  };

  // Modal rendering functions
  const renderDocumentModal = () => {
    if (!selectedDocument) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl max-w-4xl w-full max-h-[95vh] overflow-hidden">
          <div className="p-6 border-b flex justify-between items-center">
            <h2 className="text-xl font-bold text-gray-900">{selectedDocument.type}</h2>
            <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
              <XCircle className="w-6 h-6" />
            </button>
          </div>
          
          <div className="max-h-[calc(95vh-120px)] overflow-y-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6">
              {/* Document Image */}
              <div className="space-y-4">
                <img 
                  src={selectedDocument.imageUrl} 
                  alt={selectedDocument.type}
                  className="w-full rounded-lg border shadow-sm"
                />
                <div className="flex space-x-2">
                  <button 
                    onClick={() => handleDocumentDownload(selectedDocument.type)}
                    className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download</span>
                  </button>
                  <button 
                    onClick={() => openModal('replace-document', selectedDocument)}
                    className="flex-1 border border-gray-300 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Replace
                  </button>
                </div>
              </div>

              {/* Document Information */}
              <div className="space-y-4">
                <div className={`p-4 rounded-lg ${
                  selectedDocument.status === 'valid' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                }`}>
                  <div className="flex items-center space-x-2 mb-2">
                    {selectedDocument.status === 'valid' ? (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-red-600" />
                    )}
                    <span className={`font-medium ${
                      selectedDocument.status === 'valid' ? 'text-green-800' : 'text-red-800'
                    }`}>
                      {selectedDocument.status === 'valid' ? 'Valid Document' : 'Expired Document'}
                    </span>
                  </div>
                  <p className={`text-sm ${
                    selectedDocument.status === 'valid' ? 'text-green-700' : 'text-red-700'
                  }`}>
                    Expires: {selectedDocument.expiry}
                  </p>
                </div>

                {/* Document-specific information */}
                {selectedDocument.type.includes('License') && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="font-medium text-gray-900 mb-3">License Information</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">License Number:</span>
                        <span className="text-sm font-medium">{selectedDocument.licenseNumber}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Issued By:</span>
                        <span className="text-sm font-medium">{selectedDocument.issuedBy}</span>
                      </div>
                      {selectedDocument.issuedDate && (
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Issue Date:</span>
                          <span className="text-sm font-medium">{selectedDocument.issuedDate}</span>
                        </div>
                      )}
                      {selectedDocument.restrictions && (
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Restrictions:</span>
                          <span className="text-sm font-medium">{selectedDocument.restrictions}</span>
                        </div>
                      )}
                      {selectedDocument.conditions && (
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Conditions:</span>
                          <span className="text-sm font-medium">{selectedDocument.conditions}</span>
                        </div>
                      )}
                      {selectedDocument.bloodType && (
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Blood Type:</span>
                          <span className="text-sm font-medium">{selectedDocument.bloodType}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {selectedDocument.type.includes('NBI') && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="font-medium text-gray-900 mb-3">NBI Clearance Details</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Control Number:</span>
                        <span className="text-sm font-medium">{selectedDocument.controlNumber}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Purpose:</span>
                        <span className="text-sm font-medium">{selectedDocument.purpose}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Findings:</span>
                        <span className="text-sm font-medium text-green-600">{selectedDocument.findings}</span>
                      </div>
                    </div>
                  </div>
                )}

                {selectedDocument.type.includes('Vehicle') && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="font-medium text-gray-900 mb-3">Vehicle Details</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Plate Number:</span>
                        <span className="text-sm font-medium">{selectedDocument.plateNumber}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Make/Model:</span>
                        <span className="text-sm font-medium">{selectedDocument.make} {selectedDocument.model}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Year:</span>
                        <span className="text-sm font-medium">{selectedDocument.year}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Engine Number:</span>
                        <span className="text-sm font-medium">{selectedDocument.engineNumber}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Chassis Number:</span>
                        <span className="text-sm font-medium">{selectedDocument.chassisNumber}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderTripModal = () => {
    if (!selectedTrip) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl max-w-4xl w-full max-h-[95vh] overflow-hidden">
          <div className="p-6 border-b flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Trip Details</h2>
              <p className="text-sm text-gray-600">{selectedTrip.bookingReference}</p>
            </div>
            <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
              <XCircle className="w-6 h-6" />
            </button>
          </div>
          
          <div className="max-h-[calc(95vh-120px)] overflow-y-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6">
              {/* Route & Financial Info */}
              <div className="space-y-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="font-medium text-gray-900 mb-3">Route Information</h3>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <MapPin className="w-4 h-4 text-green-600" />
                      <div>
                        <p className="font-medium text-gray-900">{selectedTrip.from}</p>
                        <p className="text-sm text-gray-600">{selectedTrip.pickupAddress}</p>
                        <p className="text-xs text-gray-500">{selectedTrip.pickupTime}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 pl-6">
                      <div className="w-0.5 h-6 bg-gray-300"></div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <MapPin className="w-4 h-4 text-red-600" />
                      <div>
                        <p className="font-medium text-gray-900">{selectedTrip.to}</p>
                        <p className="text-sm text-gray-600">{selectedTrip.dropoffAddress}</p>
                        <p className="text-xs text-gray-500">{selectedTrip.dropoffTime}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-green-50 p-4 rounded-lg">
                  <h3 className="font-medium text-gray-900 mb-3">Financial Breakdown</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Total Fare:</span>
                      <span className="font-medium">₱{selectedTrip.fare}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Platform Commission (15%):</span>
                      <span className="font-medium text-red-600">-₱{selectedTrip.commission}</span>
                    </div>
                    <div className="border-t pt-2 flex justify-between">
                      <span className="font-medium text-gray-900">Net Earning:</span>
                      <span className="font-bold text-green-600">₱{selectedTrip.netEarning}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-medium text-gray-900 mb-3">Trip Details</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Distance:</span>
                      <span className="text-sm font-medium">{selectedTrip.distance}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Duration:</span>
                      <span className="text-sm font-medium">{selectedTrip.duration}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Vehicle:</span>
                      <span className="text-sm font-medium">{selectedTrip.vehicleUsed}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Payment Method:</span>
                      <span className="text-sm font-medium">{selectedTrip.paymentMethod}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Passenger Info & Feedback */}
              <div className="space-y-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="font-medium text-gray-900 mb-3">Passenger Information</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Name:</span>
                      <span className="font-medium">{selectedTrip.passengerName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Phone:</span>
                      <span className="font-medium">{selectedTrip.passengerPhone}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Reference:</span>
                      <span className="text-sm font-medium">{selectedTrip.referenceNumber}</span>
                    </div>
                  </div>
                  <button 
                    onClick={() => window.open(`tel:${selectedTrip.passengerPhone}`)}
                    className="w-full mt-3 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Contact Passenger
                  </button>
                </div>

                <div className="bg-yellow-50 p-4 rounded-lg">
                  <h3 className="font-medium text-gray-900 mb-3">Rating & Feedback</h3>
                  <div className="flex items-center space-x-2 mb-2">
                    {renderStars(selectedTrip.rating)}
                    <span className="font-bold text-gray-900">{selectedTrip.rating}</span>
                  </div>
                  <p className="text-sm text-gray-700 italic">"{selectedTrip.feedback}"</p>
                </div>

                {selectedTrip.routeNotes && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="font-medium text-gray-900 mb-3">Route Notes</h3>
                    <p className="text-sm text-gray-700">{selectedTrip.routeNotes}</p>
                  </div>
                )}

                <div className="flex space-x-2">
                  <button 
                    onClick={() => viewRelatedTransaction('TXN001')}
                    className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                  >
                    View Transaction
                  </button>
                  <button 
                    onClick={() => openModal('report-issue', selectedTrip)}
                    className="flex-1 border border-gray-300 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Report Issue
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderTransactionModal = () => {
    if (!selectedTransaction) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl max-w-2xl w-full max-h-[95vh] overflow-hidden">
          <div className="p-6 border-b flex justify-between items-center">
            <h2 className="text-xl font-bold text-gray-900">Transaction Details</h2>
            <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
              <XCircle className="w-6 h-6" />
            </button>
          </div>
          
          <div className="max-h-[calc(95vh-120px)] overflow-y-auto p-6">
            {/* Transaction Amount */}
            <div className="text-center mb-6">
              <div className={`text-4xl font-bold mb-2 ${
                selectedTransaction.amount > 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {selectedTransaction.amount > 0 ? '+' : ''}₱{Math.abs(selectedTransaction.amount)}
              </div>
              <p className="text-gray-600">{selectedTransaction.description}</p>
              <p className="text-sm text-gray-500">{selectedTransaction.timestamp}</p>
            </div>

            {/* Transaction Details */}
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-medium text-gray-900 mb-3">Transaction Information</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Transaction ID:</span>
                    <span className="text-sm font-medium">{selectedTransaction.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Reference Number:</span>
                    <span className="text-sm font-medium">{selectedTransaction.referenceNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Payment Method:</span>
                    <span className="text-sm font-medium">{selectedTransaction.paymentMethod}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Status:</span>
                    <span className={`text-sm font-medium ${
                      selectedTransaction.status === 'completed' ? 'text-green-600' : 'text-yellow-600'
                    }`}>
                      {selectedTransaction.status.charAt(0).toUpperCase() + selectedTransaction.status.slice(1)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Type-specific information */}
              {selectedTransaction.type === 'trip_payment' && (
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="font-medium text-gray-900 mb-3">Trip Payment Breakdown</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Gross Amount:</span>
                      <span className="text-sm font-medium">₱{selectedTransaction.amount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Platform Commission:</span>
                      <span className="text-sm font-medium text-red-600">-₱{selectedTransaction.commission}</span>
                    </div>
                    <div className="border-t pt-2 flex justify-between">
                      <span className="font-medium text-gray-900">Net Amount:</span>
                      <span className="font-bold text-green-600">₱{selectedTransaction.netAmount}</span>
                    </div>
                    {selectedTransaction.customerName && (
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Customer:</span>
                        <span className="text-sm font-medium">{selectedTransaction.customerName}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {selectedTransaction.type === 'cashout' && (
                <div className="bg-red-50 p-4 rounded-lg">
                  <h3 className="font-medium text-gray-900 mb-3">Cash Out Details</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Amount Requested:</span>
                      <span className="text-sm font-medium">₱{Math.abs(selectedTransaction.amount)}</span>
                    </div>
                    {selectedTransaction.processingFee > 0 && (
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Processing Fee:</span>
                        <span className="text-sm font-medium text-red-600">₱{selectedTransaction.processingFee}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Recipient Account:</span>
                      <span className="text-sm font-medium">{selectedTransaction.recipientAccount}</span>
                    </div>
                  </div>
                </div>
              )}

              {selectedTransaction.type === 'bonus' && (
                <div className="bg-green-50 p-4 rounded-lg">
                  <h3 className="font-medium text-gray-900 mb-3">Bonus Details</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Bonus Type:</span>
                      <span className="text-sm font-medium">{selectedTransaction.bonusType}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Criteria:</span>
                      <span className="text-sm font-medium">{selectedTransaction.criteria}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Cross-linking */}
              {selectedTransaction.tripId && (
                <button 
                  onClick={() => viewRelatedTrip(selectedTransaction.tripId)}
                  className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  View Related Trip
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Professional Modal Components
  const FraudScanModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-lg w-full">
        <div className="flex justify-between items-center p-6 border-b">
          <h3 className="text-xl font-semibold text-gray-900">AI Fraud Detection Scan</h3>
          <button onClick={closeModal} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-6 h-6" />
          </button>
        </div>
        <div className="p-6">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Shield className="w-8 h-8 text-blue-600" />
            </div>
            <h4 className="text-lg font-semibold text-gray-900 mb-2">
              {fraudScanComplete ? 'Scan Complete' : 'Running Comprehensive Fraud Scan'}
            </h4>
            <p className="text-gray-600">
              {fraudScanComplete 
                ? 'Analysis complete. Risk assessment ready.' 
                : 'Analyzing driver activity patterns, transaction history, and behavioral indicators...'
              }
            </p>
          </div>
          
          {!fraudScanComplete && (
            <>
              <div className="w-full bg-gray-200 rounded-full h-3 mb-6">
                <div 
                  className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                  style={{ width: `${fraudScanProgress}%` }}
                />
              </div>
              
              <div className="space-y-3 mb-6">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Payment Verification</span>
                  <CheckCircle className="w-5 h-5 text-green-500" />
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Route Analysis</span>
                  <CheckCircle className="w-5 h-5 text-green-500" />
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Behavior Pattern Check</span>
                  <CheckCircle className="w-5 h-5 text-green-500" />
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">ML Risk Assessment</span>
                  {fraudScanProgress > 80 ? (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  ) : (
                    <Clock className="w-5 h-5 text-blue-500 animate-spin" />
                  )}
                </div>
              </div>
            </>
          )}

          {fraudScanComplete && (
            <div className="bg-green-50 rounded-lg p-4 mb-6">
              <div className="flex items-center space-x-3">
                <CheckCircle className="w-6 h-6 text-green-600" />
                <div>
                  <p className="font-semibold text-green-800">Risk Level: LOW (12/100)</p>
                  <p className="text-sm text-green-700">No suspicious activity detected. ML confidence: 94.7%</p>
                </div>
              </div>
            </div>
          )}

          <button 
            onClick={closeModal}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 font-medium"
          >
            {fraudScanComplete ? 'Continue' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );

  const ActionModal = ({ title, message, actionText, actionColor = "blue", onConfirm }: any) => (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-md w-full">
        <div className="flex justify-between items-center p-6 border-b">
          <h3 className="text-xl font-semibold text-gray-900">{title}</h3>
          <button onClick={closeModal} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-6 h-6" />
          </button>
        </div>
        <div className="p-6">
          <p className="text-gray-600 mb-6">{message}</p>
          <div className="flex space-x-3">
            <button 
              onClick={closeModal}
              className="flex-1 border border-gray-300 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-50 font-medium"
            >
              Cancel
            </button>
            <button 
              onClick={() => {
                onConfirm?.();
                closeModal();
              }}
              className={`flex-1 text-white py-3 px-4 rounded-lg font-medium ${
                actionColor === 'red' ? 'bg-red-600 hover:bg-red-700' :
                actionColor === 'yellow' ? 'bg-yellow-600 hover:bg-yellow-700' :
                actionColor === 'green' ? 'bg-green-600 hover:bg-green-700' :
                'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {actionText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const GenericModal = ({ title, content, icon: Icon }: any) => (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-md w-full">
        <div className="flex justify-between items-center p-6 border-b">
          <h3 className="text-xl font-semibold text-gray-900">{title}</h3>
          <button onClick={closeModal} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-6 h-6" />
          </button>
        </div>
        <div className="p-6">
          <div className="text-center mb-6">
            {Icon && (
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Icon className="w-8 h-8 text-blue-600" />
              </div>
            )}
            <p className="text-gray-600">{content}</p>
          </div>
          <button 
            onClick={closeModal}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 font-medium"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );

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
                title="Back to drivers list"
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
            <div className="relative">
              <button 
                onClick={handleMoreActions}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors relative"
                title="More actions"
              >
                <MoreHorizontal className="w-5 h-5 text-gray-600" />
                {notifications > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                    {notifications}
                  </span>
                )}
              </button>
              {isMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                  <button 
                    onClick={() => { openModal('export-profile'); setIsMenuOpen(false); }}
                    className="w-full text-left px-4 py-2 hover:bg-gray-50 transition-colors"
                  >
                    Export Profile
                  </button>
                  <button 
                    onClick={() => { openModal('generate-report'); setIsMenuOpen(false); }}
                    className="w-full text-left px-4 py-2 hover:bg-gray-50 transition-colors"
                  >
                    Generate Report
                  </button>
                  <button 
                    onClick={() => { openModal('audit-log'); setIsMenuOpen(false); }}
                    className="w-full text-left px-4 py-2 hover:bg-gray-50 transition-colors"
                  >
                    View Audit Log
                  </button>
                </div>
              )}
            </div>
            <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
              <span className="text-sm font-medium text-gray-700">
                {driverData.name.split(' ').map(n => n[0]).join('')}
              </span>
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
                <button 
                  onClick={() => window.open(`tel:${driverData.phone}`)}
                  className="w-full flex items-center space-x-3 p-2 hover:bg-gray-50 rounded-lg transition-colors text-left"
                >
                  <Phone className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-700">{driverData.phone}</span>
                </button>
                <button 
                  onClick={() => window.open(`mailto:${driverData.email}`)}
                  className="w-full flex items-center space-x-3 p-2 hover:bg-gray-50 rounded-lg transition-colors text-left"
                >
                  <Mail className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-700">{driverData.email}</span>
                </button>
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
                <button 
                  onClick={handleSendDriverMessage}
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Send Message
                </button>
                <button 
                  onClick={() => openModal('more-actions')}
                  className="w-full border border-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-50 transition-colors"
                >
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

            {/* Tab Content - Enhanced Scrolling */}
            <div className="h-[calc(100vh-220px)] sm:h-[calc(100vh-260px)] lg:h-[calc(100vh-280px)] overflow-y-auto scroll-smooth" style={{ WebkitOverflowScrolling: 'touch' }}>
              <div className="p-6">
                <div className="space-y-6 max-h-full overflow-y-auto">
                  {renderTabContent()}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal System */}
      {activeModal === 'document' && renderDocumentModal()}
      {activeModal === 'trip' && renderTripModal()}
      {activeModal === 'transaction' && renderTransactionModal()}
      {activeModal === 'fraud-scan' && <FraudScanModal />}
      
      {/* Action Modals */}
      {activeModal === 'report-fraud' && <ActionModal title="Report Fraud" message="Are you sure you want to report this driver for fraudulent activity? This action will trigger an investigation." actionText="Report" actionColor="red" />}
      {activeModal === 'flag-behavior' && <ActionModal title="Flag Behavior" message="This will flag unusual behavior patterns for review. The driver will be notified of the review." actionText="Flag" actionColor="yellow" />}
      {activeModal === 'leave-team' && <ActionModal title="Leave Team" message="Are you sure you want to leave the Metro Manila Fleet Alpha team? This action cannot be undone immediately." actionText="Leave Team" actionColor="red" />}
      {activeModal === 'contact-leader' && <ActionModal title="Contact Team Leader" message="Send a message to Maria Santos, your team leader. She will receive your message immediately." actionText="Send Message" actionColor="blue" />}
      {activeModal === 'team-chat' && <ActionModal title="Team Chat" message="Open the team chat to communicate with all Metro Manila Fleet Alpha members." actionText="Open Chat" actionColor="blue" />}
      
      {/* Generic Modals */}
      {activeModal === 'confirm-download' && <GenericModal title="Download Document" content={`Downloading ${modalData?.docType}...`} icon={Download} />}
      {activeModal === 'message-sent' && <GenericModal title="Message Sent" content={`Message sent successfully: "${modalData?.message}"`} icon={Send} />}
      {activeModal === 'image-saved' && <GenericModal title="Image Saved" content="Image has been saved successfully!" icon={CheckCircle} />}
      {activeModal === 'crop-tool' && <GenericModal title="Crop Tool" content="Opening advanced crop tool..." icon={Crop} />}
      {activeModal === 'rotate-image' && <GenericModal title="Rotate Image" content="Rotating image..." icon={RotateCcw} />}
      {activeModal === 'message-composer' && <GenericModal title="Message Composer" content={`Opening message composer for ${modalData?.driverName}...`} icon={MessageCircle} />}
      {activeModal === 'payment-method-added' && <GenericModal title="Payment Method Added" content="New payment method has been added successfully!" icon={CreditCard} />}
      {activeModal === 'course-start' && <GenericModal title="Start Course" content={`Starting course: ${modalData?.course?.title}`} icon={GraduationCap} />}
      {activeModal === 'course-continue' && <GenericModal title="Continue Course" content={`Continuing course: ${modalData?.course?.title}`} icon={GraduationCap} />}
      {activeModal === 'course-review' && <GenericModal title="Review Course" content={`Reviewing course: ${modalData?.course?.title}`} icon={GraduationCap} />}
      {activeModal === 'download-statement' && <GenericModal title="Download Statement" content="Downloading transaction statement..." icon={Download} />}
      {activeModal === 'vehicle-editor' && <GenericModal title="Vehicle Editor" content="Opening vehicle editor..." icon={Car} />}
      {activeModal === 'add-vehicle' && <GenericModal title="Add Vehicle" content="Opening add vehicle form..." icon={Car} />}
      {activeModal === 'cash-out' && <GenericModal title="Cash Out" content="Opening cash out form..." icon={DollarSign} />}
      {activeModal === 'fraud-case' && <GenericModal title="Fraud Case Details" content={`Opening fraud case details: ${modalData?.caseId}`} icon={AlertTriangle} />}
      {activeModal === 'join-team' && <GenericModal title="Join Team" content="Opening team application form..." icon={Users} />}
      {activeModal === 'team-performance' && <GenericModal title="Team Performance" content="Opening team performance dashboard..." icon={BarChart3} />}
      {activeModal === 'apply-leadership' && <GenericModal title="Apply for Leadership" content="Opening leadership application..." icon={Award} />}
      {activeModal === 'start-mentorship' && <GenericModal title="Start Mentorship" content="Starting mentorship program..." icon={GraduationCap} />}
      {activeModal === 'achievement-detail' && <GenericModal title="Achievement Details" content={`${modalData?.title}: ${modalData?.score}%`} icon={Award} />}
      {activeModal === 'vehicle-camera' && <GenericModal title="Vehicle Camera" content="Opening camera for vehicle photo..." icon={Camera} />}
      {activeModal === 'vehicle-image' && <GenericModal title="Vehicle Image" content={`Viewing vehicle image ${modalData?.imageIndex}`} icon={Eye} />}
      {activeModal === 'manage-payment' && <GenericModal title="Manage Payment Method" content={`Managing ${modalData?.type} payment method...`} icon={CreditCard} />}
      {activeModal === 'activity-detail' && <GenericModal title="Activity Details" content={`Activity: ${modalData?.action}`} icon={Activity} />}
      {activeModal === 'replace-document' && <GenericModal title="Replace Document" content="Replace document functionality..." icon={Upload} />}
      {activeModal === 'report-issue' && <GenericModal title="Report Issue" content="Report issue functionality..." icon={AlertTriangle} />}
      {activeModal === 'export-profile' && <GenericModal title="Export Profile" content="Exporting driver profile..." icon={Download} />}
      {activeModal === 'generate-report' && <GenericModal title="Generate Report" content="Generating report..." icon={FileText} />}
      {activeModal === 'audit-log' && <GenericModal title="Audit Log" content="Opening audit log..." icon={History} />}
      {activeModal === 'more-actions' && <GenericModal title="More Actions" content="More actions coming soon..." icon={MoreHorizontal} />}

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
                  className="text-gray-400 hover:text-gray-600 transition-colors"
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
                  <button 
                    onClick={handleImageCrop}
                    className="flex items-center space-x-2 px-3 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    <Crop className="w-4 h-4" />
                    <span>Crop</span>
                  </button>
                  <button 
                    onClick={handleImageRotate}
                    className="flex items-center space-x-2 px-3 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
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
                  <button 
                    onClick={handleImageSave}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
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