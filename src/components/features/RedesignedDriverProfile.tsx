'use client';

import React, { useState } from 'react';
import { ArrowLeft, Phone, Mail, AlertTriangle, CheckCircle, X, Upload, Edit3, Download, MessageSquare, Shield, Car, CreditCard, Calendar, FileText, GraduationCap, Activity, Eye } from 'lucide-react';

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

const RedesignedDriverProfile = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [activeModal, setActiveModal] = useState<{
    type: 'booking' | 'transaction' | 'conversation' | 'training' | 'activity' | null;
    data: any;
  }>({ type: null, data: null });
  const [confirmDialog, setConfirmDialog] = useState<{show: boolean, title: string, message: string, action: () => void} | null>(null);

  // Helper functions
  const openModal = (type: 'booking' | 'transaction' | 'conversation' | 'training' | 'activity', data: any) => {
    setActiveModal({ type, data });
  };

  const closeModal = () => {
    setActiveModal({ type: null, data: null });
  };

  const showConfirmDialog = (title: string, message: string, action: () => void) => {
    setConfirmDialog({ show: true, title, message, action });
  };

  const driverData: DriverData = {
    name: 'Maria Navarro',
    id: '301922',
    phone: '+639069780294',
    email: 'maria.navarro1922@gmail.com',
    photo: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIwIiBoZWlnaHQ9IjEyMCIgdmlld0JveD0iMCAwIDEyMCAxMjAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxMjAiIGhlaWdodD0iMTIwIiBmaWxsPSIjRjNGNEY2Ii8+CjxjaXJjbGUgY3g9IjYwIiBjeT0iNDAiIHI9IjE4IiBmaWxsPSIjOUI5QkE1Ii8+CjxwYXRoIGQ9Ik0zMCA5MEM0MCA3NCA1MCA3NCA2MCA3NEg2MEM3MCA3NCA4MCA3NCA5MCA5MEgzMFoiIGZpbGw9IiM5QjlCQTUiLz4KPC9zdmc+',
    status: 'online',
    location: 'Metro Manila',
    joinDate: 'Aug 29, 2025',
    lastActive: 'Available',
    rating: 4.8,
    completionRate: 96,
    acceptanceRate: 76,
    cancellationRate: 1.6,
    totalTrips: 2484,
    tripsToday: 12,
    activeHours: '1.54 hrs/day',
    totalHours: '1.5 hours',
    riskLevel: 'Critical'
  };

  const tabs: Tab[] = [
    { id: 'overview', label: 'Overview', icon: Activity, urgent: false },
    { id: 'fraud', label: 'Fraud', icon: Shield, urgent: true },
    { id: 'legal', label: 'Legal Docs', icon: FileText, urgent: false },
    { id: 'vehicles', label: 'Vehicles', icon: Car, urgent: false },
    { id: 'commerce', label: 'Commerce', icon: CreditCard, urgent: false },
    { id: 'bookings', label: 'Bookings', icon: Calendar, urgent: false },
    { id: 'disciplinary', label: 'Disciplinary', icon: AlertTriangle, urgent: true },
    { id: 'wallet', label: 'Wallet', icon: CreditCard, urgent: false },
    { id: 'chat', label: 'Chat', icon: MessageSquare, urgent: false },
    { id: 'history', label: 'App History', icon: FileText, urgent: false },
    { id: 'training', label: 'Training', icon: GraduationCap, urgent: false }
  ];

  const QuickActions = () => (
    <div className="flex gap-2">
      <button 
        onClick={() => window.open(`tel:${driverData.phone}`, '_self')}
        className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm transition-colors"
        title={`Call ${driverData.name}`}
      >
        <Phone className="w-4 h-4" />
        <span className="hidden sm:inline">Call</span>
      </button>
      <button 
        onClick={() => setActiveTab('chat')}
        className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm transition-colors"
        title={`Message ${driverData.name}`}
      >
        <MessageSquare className="w-4 h-4" />
        <span className="hidden sm:inline">Message</span>
      </button>
      <button 
        onClick={() => setActiveTab('disciplinary')}
        className="flex items-center gap-2 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm transition-colors"
        title={`Suspend ${driverData.name}`}
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
      {/* Critical Alerts */}
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <h3 className="font-semibold text-red-800">Critical Risk Alert</h3>
            <p className="text-red-700 text-sm mt-1">Multiple payment disputes detected. Requires immediate investigation.</p>
            <button 
              onClick={() => setActiveTab('fraud')}
              className="mt-2 text-sm bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 transition-colors"
            >
              Review Details
            </button>
          </div>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-green-600">96%</div>
          <div className="text-sm text-green-800">Completion Rate</div>
          <div className="text-xs text-green-600 mt-1">2,484 trips</div>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-blue-600">76%</div>
          <div className="text-sm text-blue-800">Acceptance Rate</div>
          <div className="text-xs text-blue-600 mt-1">12 today</div>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-red-600">1.6%</div>
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
              <div className="text-sm font-medium text-gray-900">Trip completed</div>
              <div className="text-xs text-gray-500">Makati to BGC • 15 mins ago</div>
            </div>
            <div className="text-right">
              <div className="text-lg font-bold text-green-600">₱245</div>
              <div className="text-xs text-gray-500">4.8 ⭐</div>
            </div>
          </div>
          <div className="flex items-center gap-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center justify-center w-10 h-10 bg-blue-500 rounded-full">
              <Car className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-gray-900">Trip in progress</div>
              <div className="text-xs text-gray-500">Quezon City to Manila • Started 32 mins ago</div>
            </div>
            <div className="text-right">
              <div className="text-sm text-blue-600 font-medium">Active</div>
              <div className="text-xs text-gray-500">Est. ₱180</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const FraudTab = () => (
    <div className="space-y-6">
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-center gap-3 mb-4">
          <Shield className="w-6 h-6 text-red-600 flex-shrink-0" />
          <div>
            <h2 className="text-lg font-semibold text-red-800">Critical Risk Level</h2>
            <p className="text-sm text-red-600">Last updated: 2 hours ago</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div className="bg-white p-4 rounded-lg border">
            <div className="text-2xl font-bold text-red-600">4</div>
            <div className="text-sm text-gray-700">Payment Disputes</div>
          </div>
          <div className="bg-white p-4 rounded-lg border">
            <div className="text-2xl font-bold text-orange-600">2</div>
            <div className="text-sm text-gray-700">Suspicious Patterns</div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="bg-white p-4 rounded-lg border">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
              <div className="flex-1">
                <div className="font-medium text-red-800">Multiple Payment Cards</div>
                <div className="text-sm text-gray-600">5 different cards used in 24 hours</div>
              </div>
              <button 
                onClick={() => showConfirmDialog(
                  'Start Fraud Investigation',
                  'This will flag the driver account and initiate a payment card investigation. Continue?',
                  () => {
                    // Actual investigation logic would go here
                    setActiveTab('disciplinary');
                  }
                )}
                className="text-sm bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 transition-colors self-start"
              >
                Investigate
              </button>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg border">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
              <div className="flex-1">
                <div className="font-medium text-orange-800">Location Anomaly</div>
                <div className="text-sm text-gray-600">Unusual pickup patterns detected</div>
              </div>
              <button 
                onClick={() => showConfirmDialog(
                  'Schedule Location Review',
                  'This will create a task for location pattern analysis. A notification will be sent to the investigation team.',
                  () => {
                    setActiveTab('disciplinary');
                  }
                )}
                className="text-sm bg-orange-600 text-white px-3 py-1 rounded hover:bg-orange-700 transition-colors self-start"
              >
                Review
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const LegalDocsTab = () => {
    const documents: Document[] = [
      { 
        id: 1, 
        name: 'Driver\'s License', 
        status: 'verified', 
        expiry: '2025-12-31', 
        url: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgdmlld0JveD0iMCAwIDQwMCAzMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI0MDAiIGhlaWdodD0iMzAwIiBmaWxsPSIjRkJGQkZCIi8+CjxyZWN0IHg9IjIwIiB5PSI0MCIgd2lkdGg9IjM2MCIgaGVpZ2h0PSIyMjAiIHJ4PSI4IiBmaWxsPSIjRkZGRkZGIiBzdHJva2U9IiNEMUQ1REIiLz4KPHN2ZyB4PSIzMCIgeT0iNjAiIHdpZHRoPSI4MCIgaGVpZ2h0PSI2MCIgZmlsbD0iI0Y5RkFGQiI+CjxyZWN0IHdpZHRoPSI4MCIgaGVpZ2h0PSI2MCIgZmlsbD0iI0Y5RkFGQiIvPgo8Y2lyY2xlIGN4PSI0MCIgY3k9IjI1IiByPSIxMCIgZmlsbD0iIzlCOUJBNSIvPgo8cGF0aCBkPSJNMjAgNDVDMjUgMzggMzAgMzggNDAgMzhINDBDNTAgMzggNTUgMzggNjAgNDVIMjBaIiBmaWxsPSIjOUI5QkE1Ii8+Cjwvc3ZnPgo8dGV4dCB4PSIxMzAiIHk9IjgwIiBmaWxsPSIjMzc0MTUxIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIGZvbnQtd2VpZ2h0PSJib2xkIj5EUklWRVIncyBMSUNFTlNFPC90ZXh0Pgo8dGV4dCB4PSIxMzAiIHk9IjEwMCIgZmlsbD0iIzZCNzI4MCIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjEyIj5NYXJpYSBOYXZhcnJvPC90ZXh0Pgo8dGV4dCB4PSIxMzAiIHk9IjEyMCIgZmlsbD0iIzZCNzI4MCIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjEyIj5MaWNlbnNlICMzMDE5MjI8L3RleHQ+CjxyZWN0IHg9IjMwIiB5PSIxODAiIHdpZHRoPSIzNDAiIGhlaWdodD0iMiIgZmlsbD0iIzEwQjk4MSIvPgo8dGV4dCB4PSIzMCIgeT0iMjEwIiBmaWxsPSIjMTA5OTgxIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTIiIGZvbnQtd2VpZ2h0PSJib2xkIj5WRVJJRklFRDwvdGV4dD4KPC9zdmc+' 
      },
      { 
        id: 2, 
        name: 'Vehicle Registration', 
        status: 'expired', 
        expiry: '2023-11-15', 
        url: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgdmlld0JveD0iMCAwIDQwMCAzMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI0MDAiIGhlaWdodD0iMzAwIiBmaWxsPSIjRkJGQkZCIi8+CjxyZWN0IHg9IjIwIiB5PSI0MCIgd2lkdGg9IjM2MCIgaGVpZ2h0PSIyMjAiIHJ4PSI4IiBmaWxsPSIjRkZGRkZGIiBzdHJva2U9IiNEMUQ1REIiLz4KPHN2ZyB4PSIzMCIgeT0iNjAiIHdpZHRoPSI4MCIgaGVpZ2h0PSI2MCIgZmlsbD0iI0Y5RkFGQiI+CjxyZWN0IHdpZHRoPSI4MCIgaGVpZ2h0PSI2MCIgZmlsbD0iI0Y5RkFGQiIvPgo8cmVjdCB4PSIxNSIgeT0iMjAiIHdpZHRoPSI1MCIgaGVpZ2h0PSIyNSIgcng9IjMiIGZpbGw9IiM5QjlCQTUiLz4KPGNpcmNsZSBjeD0iMjIiIGN5PSI0NSIgcj0iMyIgZmlsbD0iIzlCOUJBNSIvPgo8Y2lyY2xlIGN4PSI1OCIgY3k9IjQ1IiByPSIzIiBmaWxsPSIjOUI5QkE1Ii8+Cjwvc3ZnPgo8dGV4dCB4PSIxMzAiIHk9IjgwIiBmaWxsPSIjMzc0MTUxIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIGZvbnQtd2VpZ2h0PSJib2xkIj5WRWHIQ0xFIFJFR0lTVFJBVElPTjwvdGV4dD4KPHRleHQgeD0iMTMwIiB5PSIxMDAiIGZpbGw9IiM2QjcyODAiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxMiI+UGxhdGUgIzogQUJDMTIzPC90ZXh0Pgo8dGV4dCB4PSIxMzAiIHk9IjEyMCIgZmlsbD0iIzZCNzI4MCIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjEyIj5Ub3lvdGEgVmlvczwvdGV4dD4KPHJlY3QgeD0iMzAiIHk9IjE4MCIgd2lkdGg9IjM0MCIgaGVpZ2h0PSIyIiBmaWxsPSIjRUY0NDQ0Ii8+Cjx0ZXh0IHg9IjMwIiB5PSIyMTAiIGZpbGw9IiNFRjQ0NDQiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxMiIgZm9udC13ZWlnaHQ9ImJvbGQiPkVYUElSRUQ8L3RleHQ+Cjwvc3ZnPg==' 
      },
      { 
        id: 3, 
        name: 'Insurance Certificate', 
        status: 'pending', 
        expiry: '2024-06-30', 
        url: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgdmlld0JveD0iMCAwIDQwMCAzMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI0MDAiIGhlaWdodD0iMzAwIiBmaWxsPSIjRkJGQkZCIi8+CjxyZWN0IHg9IjIwIiB5PSI0MCIgd2lkdGg9IjM2MCIgaGVpZ2h0PSIyMjAiIHJ4PSI4IiBmaWxsPSIjRkZGRkZGIiBzdHJva2U9IiNEMUQ1REIiLz4KPHN2ZyB4PSIzMCIgeT0iNjAiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgZmlsbD0iI0Y5RkFGQiI+CjxwYXRoIGQ9Ik0zMCAzMEwzNSAyMEw0MCAzMEwzNSA0MEwzMCAzMFoiIGZpbGw9IiM5QjlCQTUiLz4KPHBhdGggZD0iTTMwIDMwSDQwVjM1SDMwVjMwWiIgZmlsbD0iIzlCOUJBNSIvPgo8L3N2Zz4KPHRleHQgeD0iMTEwIiB5PSI4MCIgZmlsbD0iIzM3NDE1MSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjE0IiBmb250LXdlaWdodD0iYm9sZCI+SU5TVVJBQ0NFIENFUlRJRklDQVRFPC90ZXh0Pgo8dGV4dCB4PSIxMTAiIHk9IjEwMCIgZmlsbD0iIzZCNzI4MCIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjEyIj5Qb2xpY3kgIzogSU5TMTIzNDU2PC90ZXh0Pgo8dGV4dCB4PSIxMTAiIHk9IjEyMCIgZmlsbD0iIzZCNzI4MCIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjEyIj5QaGlsaXBwaW5lIEluc3VyYW5jZTwvdGV4dD4KPHJlY3QgeD0iMzAiIHk9IjE4MCIgd2lkdGg9IjM0MCIgaGVpZ2h0PSIyIiBmaWxsPSIjRjU5RTBCIi8+Cjx0ZXh0IHg9IjMwIiB5PSIyMTAiIGZpbGw9IiNGNTlFMEIiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxMiIgZm9udC13ZWlnaHQ9ImJvbGQiPlBFTkRJTkc8L3RleHQ+Cjwvc3ZnPg==' 
      }
    ];

    return (
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <h3 className="font-semibold">Legal Documents</h3>
          <button 
            onClick={() => {
              const input = document.createElement('input');
              input.type = 'file';
              input.accept = '.pdf,.jpg,.jpeg,.png';
              input.multiple = true;
              input.onchange = () => {
                if (input.files) {
                  showConfirmDialog(
                    'Upload Documents',
                    `Upload ${input.files.length} document(s) for review and verification?`,
                    () => {
                      // File upload logic would go here
                      setActiveTab('legal');
                    }
                  );
                }
              };
              input.click();
            }}
            className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors"
          >
            <Upload className="w-4 h-4" />
            Upload New
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {documents.map(doc => (
            <div key={doc.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors bg-white">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className="relative flex-shrink-0">
                    <img 
                      src={doc.url} 
                      alt={doc.name}
                      className="w-16 h-12 object-cover rounded border bg-gray-100"
                    />
                    <div className="absolute inset-0 bg-black bg-opacity-10 rounded flex items-center justify-center">
                      <FileText className="w-6 h-6 text-white drop-shadow-md" />
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium truncate mb-1">{doc.name}</div>
                    <div className="text-sm text-gray-500">Expires: {doc.expiry}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        doc.status === 'verified' ? 'bg-green-100 text-green-800' :
                        doc.status === 'expired' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {doc.status === 'verified' && <CheckCircle className="w-3 h-3 mr-1" />}
                        {doc.status === 'expired' && <AlertTriangle className="w-3 h-3 mr-1" />}
                        {doc.status === 'pending' && <Upload className="w-3 h-3 mr-1" />}
                        {doc.status.toUpperCase()}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button 
                    onClick={() => setSelectedDocument(doc)}
                    className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                    title="View document"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button className="p-2 hover:bg-gray-200 rounded-lg transition-colors" title="Download">
                    <Download className="w-4 h-4" />
                  </button>
                  <button className="p-2 hover:bg-gray-200 rounded-lg transition-colors" title="Edit document">
                    <Edit3 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const DisciplinaryTab = () => (
    <div className="space-y-6">
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-center gap-3 mb-4">
          <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0" />
          <div>
            <h2 className="text-lg font-semibold text-red-800">Active Disciplinary Actions</h2>
            <p className="text-sm text-red-600">2 pending reviews requiring immediate attention</p>
          </div>
        </div>
        
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-lg border border-red-200">
            <div className="flex justify-between items-start gap-4">
              <div className="flex-1">
                <div className="font-medium text-red-800 mb-2">Customer Complaint - Rude Behavior</div>
                <div className="text-sm text-gray-600 mb-2">Reported on Aug 25, 2025 • Passenger: John Santos</div>
                <div className="text-sm text-gray-700">"Driver was unprofessional and used inappropriate language during the trip."</div>
                <div className="mt-2 text-xs text-gray-500">Case #DC-2025-0825-001</div>
              </div>
              <div className="flex flex-col gap-2">
                <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">High Priority</span>
                <button 
                  onClick={() => showConfirmDialog(
                    'Review Disciplinary Case', 
                    'This will open the case review interface. Continue?',
                    () => {
                      // Case review logic would go here
                      setActiveTab('disciplinary');
                    }
                  )}
                  className="text-sm bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 transition-colors"
                >
                  Review Case
                </button>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg border border-orange-200">
            <div className="flex justify-between items-start gap-4">
              <div className="flex-1">
                <div className="font-medium text-orange-800 mb-2">Late Pickup Pattern</div>
                <div className="text-sm text-gray-600 mb-2">Detected on Aug 28, 2025 • 5 incidents this week</div>
                <div className="text-sm text-gray-700">Driver has been consistently late for pickups, affecting service quality.</div>
                <div className="mt-2 text-xs text-gray-500">Case #DC-2025-0828-002</div>
              </div>
              <div className="flex flex-col gap-2">
                <span className="px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">Medium Priority</span>
                <button className="text-sm bg-orange-600 text-white px-3 py-1 rounded hover:bg-orange-700 transition-colors">
                  Schedule Review
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-gray-50 border rounded-lg p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Previous Actions</h3>
        <div className="space-y-3">
          <div className="flex items-center gap-3 p-3 bg-white rounded border">
            <CheckCircle className="w-5 h-5 text-green-500" />
            <div className="flex-1">
              <div className="text-sm font-medium">Verbal Warning - Completed</div>
              <div className="text-xs text-gray-500">Aug 20, 2025 • Navigation issues resolved</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const VehiclesTab = () => {
    const vehicles = [
      {
        id: 'VHC-001',
        plateNumber: 'ABC-1234',
        make: 'Toyota',
        model: 'Vios',
        year: 2020,
        color: 'Silver',
        class: 'Economy',
        status: 'active',
        lastUsed: '2 hours ago',
        totalKm: 45230,
        monthlyKm: 3540,
        health: 98,
        ltfrbDocuments: [
          {
            type: 'Vehicle Registration',
            status: 'verified',
            expiry: '2025-12-31',
            image: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDMwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIzMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRkZGRkZGIiBzdHJva2U9IiNEMUQ1REIiLz4KPHRleHQgeD0iMTUwIiB5PSI0MCIgZmlsbD0iIzM3NDE1MSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjE0IiBmb250LXdlaWdodD0iYm9sZCIgdGV4dC1hbmNob3I9Im1pZGRsZSI+VkVISUNMRSBSRUdJU1RSQVRJT048L3RleHQ+Cjx0ZXh0IHg9IjIwIiB5PSI3MCIgZmlsbD0iIzZCNzI4MCIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjEyIj5QbGF0ZSAjOiBBQkMtMTIzNDwvdGV4dD4KPHRleHQgeD0iMjAiIHk9IjkwIiBmaWxsPSIjNkI3MjgwIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTIiPlRveW90YSBWaW9zIDIwMjA8L3RleHQ+Cjx0ZXh0IHg9IjIwIiB5PSIxMTAiIGZpbGw9IiM2QjcyODAiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxMiI+T3duZXI6IE1hcmlhIE5hdmFycm88L3RleHQ+CjxyZWN0IHg9IjIwIiB5PSIxNDAiIHdpZHRoPSIyNjAiIGhlaWdodD0iMiIgZmlsbD0iIzEwQjk4MSIvPgo8dGV4dCB4PSIyMCIgeT0iMTY1IiBmaWxsPSIjMTA5OTgxIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTIiIGZvbnQtd2VpZ2h0PSJib2xkIj5WRVJJRklFRCAtIExURlJCPC90ZXh0Pgo8L3N2Zz4='
          },
          {
            type: 'Vehicle Front',
            status: 'verified',
            expiry: '2025-12-31',
            image: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDMwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIzMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxyZWN0IHg9IjUwIiB5PSI2MCIgd2lkdGg9IjIwMCIgaGVpZ2h0PSI4MCIgcng9IjEwIiBmaWxsPSIjQzBDNENDIiBzdHJva2U9IiM5QjlCQTUiLz4KPGNpcmNsZSBjeD0iODAiIGN5PSIxNTAiIHI9IjE1IiBmaWxsPSIjMzc0MTUxIi8+CjxjaXJjbGUgY3g9IjIyMCIgY3k9IjE1MCIgcj0iMTUiIGZpbGw9IiMzNzQxNTEiLz4KPHJlY3QgeD0iMTIwIiB5PSI1MCIgd2lkdGg9IjYwIiBoZWlnaHQ9IjIwIiByeD0iMyIgZmlsbD0iI0ZGRkZGRiIgc3Ryb2tlPSIjRDFENURCIi8+Cjx0ZXh0IHg9IjE1MCIgeT0iNjUiIGZpbGw9IiMzNzQxNTEiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxMCIgZm9udC13ZWlnaHQ9ImJvbGQiIHRleHQtYW5jaG9yPSJtaWRkbGUiPkFCQy0xMjM0PC90ZXh0Pgo8dGV4dCB4PSIxNTAiIHk9IjE4NSIgZmlsbD0iIzM3NDE1MSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjEyIiBmb250LXdlaWdodD0iYm9sZCIgdGV4dC1hbmNob3I9Im1pZGRsZSI+VkVISUNMRSBGUk9OVDwvdGV4dD4KPC9zdmc+'
          },
          {
            type: 'Vehicle Side',
            status: 'verified',
            expiry: '2025-12-31',
            image: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDMwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIzMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxyZWN0IHg9IjMwIiB5PSI3MCIgd2lkdGg9IjI0MCIgaGVpZ2h0PSI2MCIgcng9IjgiIGZpbGw9IiNDMEM0Q0MiIHN0cm9rZT0iIzlCOUJBNSIvPgo8cmVjdCB4PSI1MCIgeT0iODAiIHdpZHRoPSI2MCIgaGVpZ2h0PSI0MCIgcng9IjQiIGZpbGw9IiM2QjcyODAiLz4KPHJlY3QgeD0iMTQwIiB5PSI4MCIgd2lkdGg9IjgwIiBoZWlnaHQ9IjQwIiByeD0iNCIgZmlsbD0iIzZCNzI4MCIvPgo8Y2lyY2xlIGN4PSI3MCIgY3k9IjE0NSIgcj0iMTgiIGZpbGw9IiMzNzQxNTEiLz4KPGNpcmNsZSBjeD0iMjMwIiBjeT0iMTQ1IiByPSIxOCIgZmlsbD0iIzM3NDE1MSIvPgo8Y2lyY2xlIGN4PSI3MCIgY3k9IjE0NSIgcj0iOCIgZmlsbD0iIzlCOUJBNSIvPgo8Y2lyY2xlIGN4PSIyMzAiIGN5PSIxNDUiIHI9IjgiIGZpbGw9IiM5QjlCQTUiLz4KPHR4ZXQgeD0iMTUwIiB5PSIxODAiIGZpbGw9IiMzNzQxNTEiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxMiIgZm9udC13ZWlnaHQ9ImJvbGQiIHRleHQtYW5jaG9yPSJtaWRkbGUiPlZFSElDTEUgU0lERTwvdGV4dD4KPC9zdmc+'
          },
          {
            type: 'Interior View',
            status: 'verified',
            expiry: '2025-12-31',
            image: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDMwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIzMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxyZWN0IHg9IjQwIiB5PSI0MCIgd2lkdGg9IjIyMCIgaGVpZ2h0PSIxMDAiIHJ4PSI4IiBmaWxsPSIjRkZGRkZGIiBzdHJva2U9IiNEMUQ1REIiLz4KPHJlY3QgeD0iNjAiIHk9IjYwIiB3aWR0aD0iNDAiIGhlaWdodD0iMjQiIHJ4PSI0IiBmaWxsPSIjMzczRTQ2Ii8+CjxyZWN0IHg9IjEyMCIgeT0iNjAiIHdpZHRoPSI0MCIgaGVpZ2h0PSIyNCIgcng9IjQiIGZpbGw9IiMzNzNFNDYiLz4KPHJlY3QgeD0iMTgwIiB5PSI2MCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjI0IiByeD0iNCIgZmlsbD0iIzM3M0U0NiIvPgo8cmVjdCB4PSI2MCIgeT0iMTAwIiB3aWR0aD0iNDAiIGhlaWdodD0iMjQiIHJ4PSI0IiBmaWxsPSIjMzczRTQ2Ii8+CjxyZWN0IHg9IjEyMCIgeT0iMTAwIiB3aWR0aD0iNDAiIGhlaWdodD0iMjQiIHJ4PSI0IiBmaWxsPSIjMzczRTQ2Ii8+CjxyZWN0IHg9IjE4MCIgeT0iMTAwIiB3aWR0aD0iNDAiIGhlaWdodD0iMjQiIHJ4PSI0IiBmaWxsPSIjMzczRTQ2Ii8+Cjx0ZXh0IHg9IjE1MCIgeT0iMTc1IiBmaWxsPSIjMzc0MTUxIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTIiIGZvbnQtd2VpZ2h0PSJib2xkIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5JTlRFUklPUiBWSUVXPC90ZXh0Pgo8L3N2Zz4='
          }
        ],
        trainingRequired: ['Economy Class', 'Sedan Operation'],
        trainingCompleted: ['Economy Class', 'Sedan Operation', 'Customer Service']
      },
      {
        id: 'VHC-002',
        plateNumber: 'XYZ-5678',
        make: 'Honda',
        model: 'City',
        year: 2019,
        color: 'White',
        class: 'Premium',
        status: 'maintenance',
        lastUsed: '3 days ago',
        totalKm: 62480,
        monthlyKm: 2100,
        health: 85,
        ltfrbDocuments: [
          {
            type: 'Vehicle Registration',
            status: 'expired',
            expiry: '2024-10-15',
            image: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDMwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIzMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRkZGRkZGIiBzdHJva2U9IiNEMUQ1REIiLz4KPHRleHQgeD0iMTUwIiB5PSI0MCIgZmlsbD0iIzM3NDE1MSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjE0IiBmb250LXdlaWdodD0iYm9sZCIgdGV4dC1hbmNob3I9Im1pZGRsZSI+VkVISUNMRSBSRUdJU1RSQVRJT048L3RleHQ+Cjx0ZXh0IHg9IjIwIiB5PSI3MCIgZmlsbD0iIzZCNzI4MCIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjEyIj5QbGF0ZSAjOiBYWVotNTY3ODwvdGV4dD4KPHRleHQgeD0iMjAiIHk9IjkwIiBmaWxsPSIjNkI3MjgwIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTIiPkhvbmRhIENpdHkgMjAxOTwvdGV4dD4KPHRleHQgeD0iMjAiIHk9IjExMCIgZmlsbD0iIzZCNzI4MCIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjEyIj5Pd25lcjogTWFyaWEgTmF2YXJybzwvdGV4dD4KPHJlY3QgeD0iMjAiIHk9IjE0MCIgd2lkdGg9IjI2MCIgaGVpZ2h0PSIyIiBmaWxsPSIjRUY0NDQ0Ii8+Cjx0ZXh0IHg9IjIwIiB5PSIxNjUiIGZpbGw9IiNFRjQ0NDQiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxMiIgZm9udC13ZWlnaHQ9ImJvbGQiPkVYUElSRUQgLSBSRU5FV0FMIE5FRURFRDwvdGV4dD4KPC9zdmc+'
          },
          {
            type: 'Vehicle Front',
            status: 'verified',
            expiry: '2025-12-31',
            image: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDMwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIzMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxyZWN0IHg9IjUwIiB5PSI2MCIgd2lkdGg9IjIwMCIgaGVpZ2h0PSI4MCIgcng9IjEwIiBmaWxsPSIjRkZGRkZGIiBzdHJva2U9IiM5QjlCQTUiLz4KPGNpcmNsZSBjeD0iODAiIGN5PSIxNTAiIHI9IjE1IiBmaWxsPSIjMzc0MTUxIi8+CjxjaXJjbGUgY3g9IjIyMCIgY3k9IjE1MCIgcj0iMTUiIGZpbGw9IiMzNzQxNTEiLz4KPHJlY3QgeD0iMTIwIiB5PSI1MCIgd2lkdGg9IjYwIiBoZWlnaHQ9IjIwIiByeD0iMyIgZmlsbD0iI0ZGRkZGRiIgc3Ryb2tlPSIjRDFENURCIi8+Cjx0ZXh0IHg9IjE1MCIgeT0iNjUiIGZpbGw9IiMzNzQxNTEiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxMCIgZm9udC13ZWlnaHQ9ImJvbGQiIHRleHQtYW5jaG9yPSJtaWRkbGUiPlhZWi01Njc4PC90ZXh0Pgo8dGV4dCB4PSIxNTAiIHk9IjE4NSIgZmlsbD0iIzM3NDE1MSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjEyIiBmb250LXdlaWdodD0iYm9sZCIgdGV4dC1hbmNob3I9Im1pZGRsZSI+VkVISUNMRSBGUk9OVDwvdGV4dD4KPC9zdmc+'
          },
          {
            type: 'Vehicle Side',
            status: 'pending',
            expiry: 'Pending',
            image: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDMwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIzMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRkJGQkZCIi8+CjxjaXJjbGUgY3g9IjE1MCIgY3k9IjEwMCIgcj0iMzAiIGZpbGw9Im5vbmUiIHN0cm9rZT0iI0Y1OUUwQiIgc3Ryb2tlLXdpZHRoPSIzIiBzdHJva2UtZGFzaGFycmF5PSI1LDUiLz4KPHR4ZXQgeD0iMTUwIiB5PSIxMDYiIGZpbGw9IiNGNTlFMEIiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZm9udC13ZWlnaHQ9ImJvbGQiIHRleHQtYW5jaG9yPSJtaWRkbGUiPj88L3RleHQ+Cjx0ZXh0IHg9IjE1MCIgeT0iMTU1IiBmaWxsPSIjRjU5RTBCIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTIiIGZvbnQtd2VpZ2h0PSJib2xkIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5QRU5ESU5HIFVQTE9BRDwvdGV4dD4KPC9zdmc+'
          },
          {
            type: 'Interior View',
            status: 'verified',
            expiry: '2025-12-31',
            image: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDMwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIzMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxyZWN0IHg9IjQwIiB5PSI0MCIgd2lkdGg9IjIyMCIgaGVpZ2h0PSIxMDAiIHJ4PSI4IiBmaWxsPSIjRkZGRkZGIiBzdHJva2U9IiNEMUQ1REIiLz4KPHJlY3QgeD0iNjAiIHk9IjYwIiB3aWR0aD0iNDAiIGhlaWdodD0iMjQiIHJ4PSI0IiBmaWxsPSIjNkI3MjgwIi8+CjxyZWN0IHg9IjEyMCIgeT0iNjAiIHdpZHRoPSI0MCIgaGVpZ2h0PSIyNCIgcng9IjQiIGZpbGw9IiM2QjcyODAiLz4KPHJlY3QgeD0iMTgwIiB5PSI2MCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjI0IiByeD0iNCIgZmlsbD0iIzZCNzI4MCIvPgo8cmVjdCB4PSI2MCIgeT0iMTAwIiB3aWR0aD0iNDAiIGhlaWdodD0iMjQiIHJ4PSI0IiBmaWxsPSIjNkI3MjgwIi8+CjxyZWN0IHg9IjEyMCIgeT0iMTAwIiB3aWR0aD0iNDAiIGhlaWdodD0iMjQiIHJ4PSI0IiBmaWxsPSIjNkI3MjgwIi8+CjxyZWN0IHg9IjE4MCIgeT0iMTAwIiB3aWR0aD0iNDAiIGhlaWdodD0iMjQiIHJ4PSI0IiBmaWxsPSIjNkI3MjgwIi8+Cjx0ZXh0IHg9IjE1MCIgeT0iMTc1IiBmaWxsPSIjMzc0MTUxIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTIiIGZvbnQtd2VpZ2h0PSJib2xkIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5JTlRFUklPUiBWSUVXPC90ZXh0Pgo8L3N2Zz4='
          }
        ],
        trainingRequired: ['Premium Class', 'Sedan Operation', 'Luxury Service'],
        trainingCompleted: ['Premium Class', 'Customer Service']
      },
      {
        id: 'VHC-003',
        plateNumber: 'DEF-9012',
        make: 'Mitsubishi',
        model: 'Mirage G4',
        year: 2021,
        color: 'Black',
        class: 'Economy',
        status: 'inactive',
        lastUsed: '2 weeks ago',
        totalKm: 28950,
        monthlyKm: 0,
        health: 92,
        ltfrbDocuments: [
          {
            type: 'Vehicle Registration',
            status: 'verified',
            expiry: '2025-08-30',
            image: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDMwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIzMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRkZGRkZGIiBzdHJva2U9IiNEMUQ1REIiLz4KPHRleHQgeD0iMTUwIiB5PSI0MCIgZmlsbD0iIzM3NDE1MSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjE0IiBmb250LXdlaWdodD0iYm9sZCIgdGV4dC1hbmNob3I9Im1pZGRsZSI+VkVISUNMRSBSRUdJU1RSQVRJT048L3RleHQ+Cjx0ZXh0IHg9IjIwIiB5PSI3MCIgZmlsbD0iIzZCNzI4MCIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjEyIj5QbGF0ZSAjOiBERUYtOTAxMjwvdGV4dD4KPHRleHQgeD0iMjAiIHk9IjkwIiBmaWxsPSIjNkI3MjgwIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTIiPk1pdHN1YmlzaGkgTWlyYWdlIEc0IDIwMjE8L3RleHQ+Cjx0ZXh0IHg9IjIwIiB5PSIxMTAiIGZpbGw9IiM2QjcyODAiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxMiI+T3duZXI6IE1hcmlhIE5hdmFycm88L3RleHQ+CjxyZWN0IHg9IjIwIiB5PSIxNDAiIHdpZHRoPSIyNjAiIGhlaWdodD0iMiIgZmlsbD0iIzEwQjk4MSIvPgo8dGV4dCB4PSIyMCIgeT0iMTY1IiBmaWxsPSIjMTA5OTgxIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTIiIGZvbnQtd2VpZ2h0PSJib2xkIj5WRVJJRklFRCAtIExURlJCPC90ZXh0Pgo8L3N2Zz4='
          },
          {
            type: 'Vehicle Front',
            status: 'verified',
            expiry: '2025-08-30',
            image: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDMwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIzMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxyZWN0IHg9IjUwIiB5PSI2MCIgd2lkdGg9IjIwMCIgaGVpZ2h0PSI4MCIgcng9IjEwIiBmaWxsPSIjMzczRTQ2IiBzdHJva2U9IiM5QjlCQTUiLz4KPGNpcmNsZSBjeD0iODAiIGN5PSIxNTAiIHI9IjE1IiBmaWxsPSIjMzc0MTUxIi8+CjxjaXJjbGUgY3g9IjIyMCIgY3k9IjE1MCIgcj0iMTUiIGZpbGw9IiMzNzQxNTEiLz4KPHJlY3QgeD0iMTIwIiB5PSI1MCIgd2lkdGg9IjYwIiBoZWlnaHQ9IjIwIiByeD0iMyIgZmlsbD0iI0ZGRkZGRiIgc3Ryb2tlPSIjRDFENURCIi8+Cjx0ZXh0IHg9IjE1MCIgeT0iNjUiIGZpbGw9IiMzNzQxNTEiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxMCIgZm9udC13ZWlnaHQ9ImJvbGQiIHRleHQtYW5jaG9yPSJtaWRkbGUiPkRFRi05MDEyPC90ZXh0Pgo8dGV4dCB4PSIxNTAiIHk9IjE4NSIgZmlsbD0iIzM3NDE1MSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjEyIiBmb250LXdlaWdodD0iYm9sZCIgdGV4dC1hbmNob3I9Im1pZGRsZSI+VkVISUNMRSBGUk9OVDwvdGV4dD4KPC9zdmc+'
          },
          {
            type: 'Vehicle Side',
            status: 'verified',
            expiry: '2025-08-30',
            image: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDMwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIzMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxyZWN0IHg9IjMwIiB5PSI3MCIgd2lkdGg9IjI0MCIgaGVpZ2h0PSI2MCIgcng9IjgiIGZpbGw9IiMzNzNFNDYiIHN0cm9rZT0iIzlCOUJBNSIvPgo8cmVjdCB4PSI1MCIgeT0iODAiIHdpZHRoPSI2MCIgaGVpZ2h0PSI0MCIgcng9IjQiIGZpbGw9IiM2QjcyODAiLz4KPHJlY3QgeD0iMTQwIiB5PSI4MCIgd2lkdGg9IjgwIiBoZWlnaHQ9IjQwIiByeD0iNCIgZmlsbD0iIzZCNzI4MCIvPgo8Y2lyY2xlIGN4PSI3MCIgY3k9IjE0NSIgcj0iMTgiIGZpbGw9IiMzNzQxNTEiLz4KPGNpcmNsZSBjeD0iMjMwIiBjeT0iMTQ1IiByPSIxOCIgZmlsbD0iIzM3NDE1MSIvPgo8Y2lyY2xlIGN4PSI3MCIgY3k9IjE0NSIgcj0iOCIgZmlsbD0iIzlCOUJBNSIvPgo8Y2lyY2xlIGN4PSIyMzAiIGN5PSIxNDUiIHI9IjgiIGZpbGw9IiM5QjlCQTUiLz4KPHR4ZXQgeD0iMTUwIiB5PSIxODAiIGZpbGw9IiMzNzQxNTEiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxMiIgZm9udC13ZWlnaHQ9ImJvbGQiIHRleHQtYW5jaG9yPSJtaWRkbGUiPlZFSElDTEUgU0lERTwvdGV4dD4KPC9zdmc+'
          },
          {
            type: 'Interior View',
            status: 'verified',
            expiry: '2025-08-30',
            image: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDMwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIzMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxyZWN0IHg9IjQwIiB5PSI0MCIgd2lkdGg9IjIyMCIgaGVpZ2h0PSIxMDAiIHJ4PSI4IiBmaWxsPSIjRkZGRkZGIiBzdHJva2U9IiNEMUQ1REIiLz4KPHJlY3QgeD0iNjAiIHk9IjYwIiB3aWR0aD0iNDAiIGhlaWdodD0iMjQiIHJ4PSI0IiBmaWxsPSIjMzczRTQ2Ii8+CjxyZWN0IHg9IjEyMCIgeT0iNjAiIHdpZHRoPSI0MCIgaGVpZ2h0PSIyNCIgcng9IjQiIGZpbGw9IiMzNzNFNDYiLz4KPHJlY3QgeD0iMTgwIiB5PSI2MCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjI0IiByeD0iNCIgZmlsbD0iIzM3M0U0NiIvPgo8cmVjdCB4PSI2MCIgeT0iMTAwIiB3aWR0aD0iNDAiIGhlaWdodD0iMjQiIHJ4PSI0IiBmaWxsPSIjMzczRTQ2Ii8+CjxyZWN0IHg9IjEyMCIgeT0iMTAwIiB3aWR0aD0iNDAiIGhlaWdodD0iMjQiIHJ4PSI0IiBmaWxsPSIjMzczRTQ2Ii8+CjxyZWN0IHg9IjE4MCIgeT0iMTAwIiB3aWR0aD0iNDAiIGhlaWdodD0iMjQiIHJ4PSI0IiBmaWxsPSIjMzczRTQ2Ii8+Cjx0ZXh0IHg9IjE1MCIgeT0iMTc1IiBmaWxsPSIjMzc0MTUxIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTIiIGZvbnQtd2VpZ2h0PSJib2xkIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5JTlRFUklPUiBWSUVXPC90ZXh0Pgo8L3N2Zz4='
          }
        ],
        trainingRequired: ['Economy Class', 'Sedan Operation'],
        trainingCompleted: ['Economy Class', 'Sedan Operation', 'Customer Service', 'Safety Training']
      }
    ];

    return (
      <div className="space-y-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="text-2xl font-bold text-green-600">{vehicles.length}</div>
            <div className="text-sm text-green-800">Assigned Vehicles</div>
            <div className="text-xs text-green-600 mt-1">TNVS Certified</div>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="text-2xl font-bold text-blue-600">{vehicles.filter(v => v.status === 'active').length}</div>
            <div className="text-sm text-blue-800">Currently Active</div>
            <div className="text-xs text-blue-600 mt-1">In operation</div>
          </div>
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <div className="text-2xl font-bold text-orange-600">
              {Math.round(vehicles.reduce((sum, v) => sum + v.health, 0) / vehicles.length)}%
            </div>
            <div className="text-sm text-orange-800">Avg. Health</div>
            <div className="text-xs text-orange-600 mt-1">Fleet condition</div>
          </div>
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <div className="text-2xl font-bold text-purple-600">
              {vehicles.reduce((sum, v) => sum + v.monthlyKm, 0).toLocaleString()}
            </div>
            <div className="text-sm text-purple-800">Monthly KM</div>
            <div className="text-xs text-purple-600 mt-1">This month</div>
          </div>
        </div>

        {/* Vehicle Cards */}
        <div className="space-y-6">
          {vehicles.map((vehicle) => (
            <div key={vehicle.id} className="bg-white border rounded-lg overflow-hidden">
              {/* Vehicle Header */}
              <div className="p-6 border-b bg-gray-50">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
                        vehicle.status === 'active' ? 'bg-green-100' :
                        vehicle.status === 'maintenance' ? 'bg-orange-100' :
                        'bg-gray-100'
                      }`}>
                        <Car className={`w-8 h-8 ${
                          vehicle.status === 'active' ? 'text-green-600' :
                          vehicle.status === 'maintenance' ? 'text-orange-600' :
                          'text-gray-600'
                        }`} />
                      </div>
                      <div className={`absolute bottom-0 right-0 w-5 h-5 rounded-full border-2 border-white ${
                        vehicle.status === 'active' ? 'bg-green-500' :
                        vehicle.status === 'maintenance' ? 'bg-orange-500' :
                        'bg-gray-400'
                      }`}></div>
                    </div>
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="text-lg font-semibold">{vehicle.make} {vehicle.model} {vehicle.year}</h3>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          vehicle.status === 'active' ? 'bg-green-100 text-green-800' :
                          vehicle.status === 'maintenance' ? 'bg-orange-100 text-orange-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {vehicle.status.toUpperCase()}
                        </span>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          vehicle.class === 'Premium' ? 'bg-purple-100 text-purple-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {vehicle.class}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600">
                        Plate: <span className="font-mono font-medium">{vehicle.plateNumber}</span> • 
                        Color: {vehicle.color} • 
                        Last used: {vehicle.lastUsed}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="text-center">
                      <div className="text-lg font-bold text-blue-600">{vehicle.totalKm.toLocaleString()}</div>
                      <div className="text-xs text-gray-500">Total KM</div>
                    </div>
                    <div className="text-center">
                      <div className={`text-lg font-bold ${
                        vehicle.health >= 95 ? 'text-green-600' :
                        vehicle.health >= 85 ? 'text-orange-600' :
                        'text-red-600'
                      }`}>
                        {vehicle.health}%
                      </div>
                      <div className="text-xs text-gray-500">Health</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-purple-600">{vehicle.monthlyKm.toLocaleString()}</div>
                      <div className="text-xs text-gray-500">Monthly KM</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Training Requirements */}
              <div className="p-6 border-b bg-blue-50">
                <div className="flex items-center gap-3 mb-3">
                  <GraduationCap className="w-5 h-5 text-blue-600" />
                  <h4 className="font-medium text-blue-800">Vehicle Class Training Requirements</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm font-medium text-gray-700 mb-2">Required Training:</div>
                    <div className="flex flex-wrap gap-1">
                      {vehicle.trainingRequired.map((training, idx) => (
                        <span 
                          key={idx}
                          className={`px-2 py-1 rounded text-xs ${
                            vehicle.trainingCompleted.includes(training)
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {training}
                          {vehicle.trainingCompleted.includes(training) ? ' ✓' : ' ✗'}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-700 mb-2">Additional Training:</div>
                    <div className="flex flex-wrap gap-1">
                      {vehicle.trainingCompleted
                        .filter(training => !vehicle.trainingRequired.includes(training))
                        .map((training, idx) => (
                        <span 
                          key={idx}
                          className="px-2 py-1 rounded text-xs bg-blue-100 text-blue-800"
                        >
                          {training} ✓
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                {vehicle.trainingRequired.some(req => !vehicle.trainingCompleted.includes(req)) && (
                  <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <div className="text-sm text-red-800">
                      <AlertTriangle className="w-4 h-4 inline mr-1" />
                      Missing required training for this vehicle class. Driver cannot operate until training is completed.
                    </div>
                  </div>
                )}
              </div>

              {/* LTFRB Required Documents */}
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-gray-600" />
                    <h4 className="font-medium text-gray-800">LTFRB Required Documentation</h4>
                  </div>
                  <div className="text-sm text-gray-500">
                    {vehicle.ltfrbDocuments.filter(doc => doc.status === 'verified').length} of {vehicle.ltfrbDocuments.length} verified
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {vehicle.ltfrbDocuments.map((doc, idx) => (
                    <div 
                      key={idx} 
                      className="border rounded-lg p-3 hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() => {
                        setSelectedDocument({
                          id: idx,
                          name: `${vehicle.plateNumber} - ${doc.type}`,
                          status: doc.status as 'verified' | 'expired' | 'pending',
                          expiry: doc.expiry,
                          url: doc.image
                        });
                      }}
                    >
                      <div className="relative mb-3">
                        <img 
                          src={doc.image} 
                          alt={doc.type}
                          className="w-full h-24 object-cover rounded border bg-gray-100"
                        />
                        <div className="absolute top-2 right-2">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            doc.status === 'verified' ? 'bg-green-100 text-green-800' :
                            doc.status === 'expired' ? 'bg-red-100 text-red-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {doc.status === 'verified' && <CheckCircle className="w-3 h-3 mr-1" />}
                            {doc.status === 'expired' && <AlertTriangle className="w-3 h-3 mr-1" />}
                            {doc.status === 'pending' && <Upload className="w-3 h-3 mr-1" />}
                            {doc.status.toUpperCase()}
                          </span>
                        </div>
                      </div>
                      <div className="text-sm font-medium mb-1">{doc.type}</div>
                      <div className="text-xs text-gray-500">Expires: {doc.expiry}</div>
                    </div>
                  ))}
                </div>

                {vehicle.ltfrbDocuments.some(doc => doc.status !== 'verified') && (
                  <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="text-sm text-yellow-800">
                      <AlertTriangle className="w-4 h-4 inline mr-1" />
                      Some LTFRB documents require attention. Vehicle may not be compliant for operations.
                    </div>
                    <button className="mt-2 text-sm bg-yellow-600 text-white px-3 py-1 rounded hover:bg-yellow-700 transition-colors">
                      Review Documents
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const CommerceTab = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-green-600">₱28,450</div>
          <div className="text-sm text-green-800">Total Earnings</div>
          <div className="text-xs text-green-600 mt-1">This month</div>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-blue-600">₱1,200</div>
          <div className="text-sm text-blue-800">Today's Earnings</div>
          <div className="text-xs text-blue-600 mt-1">12 trips</div>
        </div>
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-purple-600">18.5%</div>
          <div className="text-sm text-purple-800">Commission Rate</div>
          <div className="text-xs text-purple-600 mt-1">Standard</div>
        </div>
      </div>
    </div>
  );

  const BookingsTab = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-blue-600">2,484</div>
          <div className="text-sm text-blue-800">Total Trips</div>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-green-600">2,386</div>
          <div className="text-sm text-green-800">Completed</div>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-red-600">40</div>
          <div className="text-sm text-red-800">Cancelled</div>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-yellow-600">58</div>
          <div className="text-sm text-yellow-800">No Show</div>
        </div>
      </div>

      <div className="bg-white border rounded-lg">
        <div className="p-4 border-b bg-gray-50">
          <h3 className="font-semibold text-gray-900">Recent Bookings</h3>
        </div>
        <div className="divide-y">
          {[
            { id: 'BK-2025-0829-001', from: 'Makati CBD', to: 'BGC Taguig', time: '2:30 PM', status: 'completed', amount: '₱245', rating: 5 },
            { id: 'BK-2025-0829-002', from: 'Quezon City', to: 'Manila', time: '1:45 PM', status: 'in-progress', amount: '₱180', rating: null },
            { id: 'BK-2025-0829-003', from: 'Pasig', to: 'Ortigas', time: '12:20 PM', status: 'completed', amount: '₱95', rating: 4 },
            { id: 'BK-2025-0829-004', from: 'Manila', to: 'Airport', time: '11:00 AM', status: 'completed', amount: '₱420', rating: 5 },
            { id: 'BK-2025-0829-005', from: 'BGC', to: 'Alabang', time: '9:30 AM', status: 'cancelled', amount: '₱0', rating: null }
          ].map(booking => (
            <div 
              key={booking.id} 
              className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => openModal('booking', booking)}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="text-sm font-medium">{booking.from} → {booking.to}</div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      booking.status === 'completed' ? 'bg-green-100 text-green-800' :
                      booking.status === 'in-progress' ? 'bg-blue-100 text-blue-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {booking.status}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500">{booking.id} • {booking.time}</div>
                </div>
                <div className="text-right">
                  <div className="font-medium">{booking.amount}</div>
                  {booking.rating && (
                    <div className="text-xs text-yellow-600">{'★'.repeat(booking.rating)}</div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const WalletTab = () => (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold">Driver Wallet</h2>
            <p className="text-blue-100 text-sm">Available Balance</p>
          </div>
          <CreditCard className="w-8 h-8 text-blue-200" />
        </div>
        <div className="text-3xl font-bold mb-2">₱5,240.50</div>
        <div className="text-sm text-blue-100">Last updated: Today 3:15 PM</div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
              <Download className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="text-lg font-bold text-green-600">₱1,200</div>
              <div className="text-sm text-green-800">Today's Earnings</div>
            </div>
          </div>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
              <Upload className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="text-lg font-bold text-blue-600">₱850</div>
              <div className="text-sm text-blue-800">Weekly Withdraw</div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white border rounded-lg">
        <div className="p-4 border-b bg-gray-50">
          <h3 className="font-semibold text-gray-900">Recent Transactions</h3>
        </div>
        <div className="divide-y">
          {[
            { type: 'earning', desc: 'Trip Payment - BGC to Makati', amount: '+₱245', time: '2:30 PM', status: 'completed' },
            { type: 'earning', desc: 'Trip Payment - QC to Manila', amount: '+₱180', time: '1:45 PM', status: 'processing' },
            { type: 'withdrawal', desc: 'Bank Transfer - BDO ***1234', amount: '-₱500', time: 'Yesterday', status: 'completed' },
            { type: 'earning', desc: 'Trip Payment - Pasig to Ortigas', amount: '+₱95', time: 'Yesterday', status: 'completed' },
            { type: 'fee', desc: 'Platform Commission (18.5%)', amount: '-₱45', time: 'Yesterday', status: 'completed' }
          ].map((tx, index) => (
            <div 
              key={index} 
              className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => openModal('transaction', tx)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    tx.type === 'earning' ? 'bg-green-100' :
                    tx.type === 'withdrawal' ? 'bg-red-100' : 'bg-gray-100'
                  }`}>
                    {tx.type === 'earning' ? <Download className="w-4 h-4 text-green-600" /> :
                     tx.type === 'withdrawal' ? <Upload className="w-4 h-4 text-red-600" /> :
                     <CreditCard className="w-4 h-4 text-gray-600" />}
                  </div>
                  <div>
                    <div className="text-sm font-medium">{tx.desc}</div>
                    <div className="text-xs text-gray-500">{tx.time}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`font-medium ${
                    tx.amount.startsWith('+') ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {tx.amount}
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    tx.status === 'completed' ? 'bg-green-100 text-green-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {tx.status}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const ChatTab = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-blue-600">156</div>
          <div className="text-sm text-blue-800">Total Messages</div>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-green-600">98.5%</div>
          <div className="text-sm text-green-800">Response Rate</div>
        </div>
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-purple-600">2.3min</div>
          <div className="text-sm text-purple-800">Avg Response</div>
        </div>
      </div>

      <div className="bg-white border rounded-lg">
        <div className="p-4 border-b bg-gray-50">
          <h3 className="font-semibold text-gray-900">Recent Conversations</h3>
        </div>
        <div className="divide-y">
          {[
            { from: 'Support Team', message: 'Thank you for reporting the issue. We have processed your request.', time: '10 mins ago', unread: false, type: 'support' },
            { from: 'Maria Santos (Passenger)', message: 'Thank you for the smooth ride! 5 stars ⭐', time: '2 hours ago', unread: false, type: 'passenger' },
            { from: 'Operations Center', message: 'High demand area detected near BGC. Consider heading there for better trips.', time: '4 hours ago', unread: true, type: 'ops' },
            { from: 'John Cruz (Passenger)', message: 'Im at the lobby of the building. Blue shirt.', time: 'Yesterday', unread: false, type: 'passenger' },
            { from: 'Safety Team', message: 'Safety reminder: Always verify passenger identity before starting trip.', time: '2 days ago', unread: false, type: 'safety' }
          ].map((chat, index) => (
            <div 
              key={index} 
              className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => openModal('conversation', chat)}
            >
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  chat.type === 'support' ? 'bg-blue-100' :
                  chat.type === 'passenger' ? 'bg-green-100' :
                  chat.type === 'ops' ? 'bg-purple-100' :
                  'bg-orange-100'
                }`}>
                  <MessageSquare className={`w-5 h-5 ${
                    chat.type === 'support' ? 'text-blue-600' :
                    chat.type === 'passenger' ? 'text-green-600' :
                    chat.type === 'ops' ? 'text-purple-600' :
                    'text-orange-600'
                  }`} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm">{chat.from}</span>
                    {chat.unread && <div className="w-2 h-2 bg-blue-500 rounded-full"></div>}
                  </div>
                  <div className="text-sm text-gray-700 mb-1">{chat.message}</div>
                  <div className="text-xs text-gray-500">{chat.time}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const AppHistoryTab = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-green-600">156</div>
          <div className="text-sm text-green-800">Days Active</div>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-blue-600">8.5hrs</div>
          <div className="text-sm text-blue-800">Avg Daily Hours</div>
        </div>
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-purple-600">245</div>
          <div className="text-sm text-purple-800">App Opens/Day</div>
        </div>
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-orange-600">v2.4.1</div>
          <div className="text-sm text-orange-800">App Version</div>
        </div>
      </div>

      <div className="bg-white border rounded-lg">
        <div className="p-4 border-b bg-gray-50">
          <h3 className="font-semibold text-gray-900">Activity Log</h3>
        </div>
        <div className="divide-y max-h-96 overflow-y-auto">
          {[
            { action: 'App Opened', details: 'Location: Makati CBD', time: '3:25 PM', type: 'app' },
            { action: 'Trip Completed', details: 'BGC to Makati • ₱245', time: '3:20 PM', type: 'trip' },
            { action: 'Trip Started', details: 'Pickup: BGC Central Square', time: '2:45 PM', type: 'trip' },
            { action: 'Trip Accepted', details: 'Auto-accept enabled', time: '2:40 PM', type: 'trip' },
            { action: 'Location Updated', details: 'BGC Area • High Demand', time: '2:35 PM', type: 'location' },
            { action: 'App Resumed', details: 'From background', time: '2:30 PM', type: 'app' },
            { action: 'Settings Changed', details: 'Auto-accept: ON', time: '1:45 PM', type: 'settings' },
            { action: 'Trip Completed', details: 'QC to Manila • ₱180', time: '1:40 PM', type: 'trip' },
            { action: 'Payment Received', details: 'GCash • ₱180', time: '1:38 PM', type: 'payment' },
            { action: 'Trip Rating', details: '5 stars from passenger', time: '1:37 PM', type: 'rating' }
          ].map((log, index) => (
            <div 
              key={index} 
              className="p-3 cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => openModal('activity', log)}
            >
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  log.type === 'trip' ? 'bg-green-100' :
                  log.type === 'app' ? 'bg-blue-100' :
                  log.type === 'location' ? 'bg-purple-100' :
                  log.type === 'payment' ? 'bg-yellow-100' :
                  log.type === 'rating' ? 'bg-orange-100' :
                  'bg-gray-100'
                }`}>
                  {log.type === 'trip' ? <Car className="w-4 h-4 text-green-600" /> :
                   log.type === 'app' ? <Activity className="w-4 h-4 text-blue-600" /> :
                   log.type === 'location' ? <Eye className="w-4 h-4 text-purple-600" /> :
                   log.type === 'payment' ? <CreditCard className="w-4 h-4 text-yellow-600" /> :
                   log.type === 'rating' ? <CheckCircle className="w-4 h-4 text-orange-600" /> :
                   <FileText className="w-4 h-4 text-gray-600" />}
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium">{log.action}</div>
                  <div className="text-xs text-gray-500">{log.details}</div>
                </div>
                <div className="text-xs text-gray-400">{log.time}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const TrainingTab = () => (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <div className="flex items-center gap-3 mb-4">
          <GraduationCap className="w-6 h-6 text-blue-600" />
          <div>
            <h2 className="text-lg font-semibold text-blue-800">Training Progress</h2>
            <p className="text-sm text-blue-600">8 of 12 modules completed</p>
          </div>
        </div>
        <div className="w-full bg-blue-200 rounded-full h-3">
          <div className="bg-blue-600 h-3 rounded-full" style={{ width: '66.67%' }}></div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-green-600">8/12</div>
          <div className="text-sm text-green-800">Modules Complete</div>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-blue-600">85%</div>
          <div className="text-sm text-blue-800">Overall Score</div>
        </div>
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-purple-600">24hrs</div>
          <div className="text-sm text-purple-800">Training Time</div>
        </div>
      </div>

      <div className="bg-white border rounded-lg">
        <div className="p-4 border-b bg-gray-50">
          <h3 className="font-semibold text-gray-900">Training Modules</h3>
        </div>
        <div className="divide-y">
          {[
            { name: 'Driver Safety & Security', status: 'completed', score: 92, duration: '2 hours', date: 'Aug 15, 2025' },
            { name: 'Customer Service Excellence', status: 'completed', score: 88, duration: '1.5 hours', date: 'Aug 18, 2025' },
            { name: 'Navigation & Route Optimization', status: 'completed', score: 78, duration: '3 hours', date: 'Aug 20, 2025' },
            { name: 'Emergency Procedures', status: 'completed', score: 95, duration: '2 hours', date: 'Aug 22, 2025' },
            { name: 'Vehicle Maintenance Basics', status: 'completed', score: 82, duration: '2.5 hours', date: 'Aug 24, 2025' },
            { name: 'Financial Management for Drivers', status: 'in-progress', score: null, duration: '2 hours', date: 'In Progress' },
            { name: 'Advanced Communication Skills', status: 'pending', score: null, duration: '1.5 hours', date: 'Not Started' },
            { name: 'Technology & App Features', status: 'pending', score: null, duration: '2 hours', date: 'Not Started' }
          ].map((module, index) => (
            <div 
              key={index} 
              className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => openModal('training', module)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    module.status === 'completed' ? 'bg-green-100' :
                    module.status === 'in-progress' ? 'bg-blue-100' :
                    'bg-gray-100'
                  }`}>
                    {module.status === 'completed' ? <CheckCircle className="w-5 h-5 text-green-600" /> :
                     module.status === 'in-progress' ? <Activity className="w-5 h-5 text-blue-600" /> :
                     <GraduationCap className="w-5 h-5 text-gray-600" />}
                  </div>
                  <div>
                    <div className="font-medium text-sm">{module.name}</div>
                    <div className="text-xs text-gray-500">{module.duration} • {module.date}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {module.score && (
                    <div className={`text-sm font-medium ${
                      module.score >= 90 ? 'text-green-600' :
                      module.score >= 80 ? 'text-blue-600' :
                      'text-yellow-600'
                    }`}>
                      {module.score}%
                    </div>
                  )}
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    module.status === 'completed' ? 'bg-green-100 text-green-800' :
                    module.status === 'in-progress' ? 'bg-blue-100 text-blue-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {module.status === 'completed' ? 'Completed' :
                     module.status === 'in-progress' ? 'In Progress' :
                     'Pending'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderTabContent = () => {
    switch(activeTab) {
      case 'overview': return <OverviewTab />;
      case 'fraud': return <FraudTab />;
      case 'legal': return <LegalDocsTab />;
      case 'disciplinary': return <DisciplinaryTab />;
      case 'vehicles': return <VehiclesTab />;
      case 'commerce': return <CommerceTab />;
      case 'bookings': return <BookingsTab />;
      case 'wallet': return <WalletTab />;
      case 'chat': return <ChatTab />;
      case 'history': return <AppHistoryTab />;
      case 'training': return <TrainingTab />;
      default: return (
        <div className="text-center py-12 text-gray-500">
          <div className="mb-4">
            {tabs.find(t => t.id === activeTab)?.icon && 
              React.createElement(tabs.find(t => t.id === activeTab)!.icon, { className: "w-12 h-12 mx-auto mb-2 text-gray-400" })
            }
          </div>
          <div className="text-lg font-medium mb-2">{tabs.find(t => t.id === activeTab)?.label}</div>
          <div className="text-sm">Content for this section will be implemented here</div>
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
      {/* Header with Driver Info and Actions */}
      <div className="bg-white border-b shadow-sm">
        <div className="px-4 md:px-6 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => window.history.back()}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
                title="Go back to drivers list"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Back to Drivers</span>
                <span className="sm:hidden">Back</span>
              </button>
              <div className="h-6 w-px bg-gray-300 hidden sm:block"></div>
              <h1 className="text-lg sm:text-xl font-semibold">Driver Profile</h1>
            </div>
            <QuickActions />
          </div>

          {/* Driver Summary Card */}
          <div className="flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-6 p-4 bg-gray-50 rounded-lg">
            <div className="relative">
              <img 
                src={driverData.photo} 
                alt={driverData.name}
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
                <h2 className="text-lg font-semibold">{driverData.name}</h2>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-sm text-green-600 font-medium">{driverData.lastActive}</span>
                </div>
              </div>
              <div className="text-sm text-gray-500 mb-2">ID: {driverData.id}</div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-gray-400" />
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      window.open(`tel:${driverData.phone}`, '_self');
                    }}
                    className="text-blue-600 hover:text-blue-800 hover:underline transition-colors"
                  >
                    {driverData.phone}
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-gray-400" />
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      window.open(`mailto:${driverData.email}`, '_self');
                    }}
                    className="text-blue-600 hover:text-blue-800 hover:underline transition-colors truncate"
                  >
                    {driverData.email}
                  </button>
                </div>
              </div>
            </div>
            <div className="flex gap-4 md:gap-6 w-full md:w-auto">
              <div className="text-center flex-1 md:flex-none">
                <div className="text-lg md:text-xl font-bold text-blue-600">{driverData.tripsToday}</div>
                <div className="text-xs text-gray-500">Trips Today</div>
              </div>
              <div className="text-center flex-1 md:flex-none">
                <div className="text-lg md:text-xl font-bold text-green-600">{driverData.rating}</div>
                <div className="text-xs text-gray-500">Rating</div>
              </div>
              <div className="text-center flex-1 md:flex-none">
                <div className="text-lg md:text-xl font-bold text-purple-600">{driverData.totalTrips}</div>
                <div className="text-xs text-gray-500">Total Trips</div>
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

      {/* Data Modals */}
      {activeModal.type === 'booking' && activeModal.data && (
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
                  <label className="text-sm font-medium text-gray-500">Time</label>
                  <div className="text-sm">{activeModal.data.time}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Amount</label>
                  <div className="text-sm font-medium">{activeModal.data.amount}</div>
                </div>
                {activeModal.data.rating && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Rating</label>
                    <div className="text-sm">{'★'.repeat(activeModal.data.rating)} ({activeModal.data.rating}/5)</div>
                  </div>
                )}
              </div>
              <div className="flex gap-2 pt-4">
                <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors">
                  View Map
                </button>
                <button className="px-4 py-2 border rounded hover:bg-gray-50 transition-colors">
                  Contact Passenger
                </button>
                {activeModal.data.status === 'cancelled' && (
                  <button className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors">
                    Review Cancellation
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeModal.type === 'transaction' && activeModal.data && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-lg w-full">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Transaction Details</h3>
                <button onClick={closeModal} className="text-gray-500 hover:text-gray-700">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-500">Description</label>
                  <div className="text-sm">{activeModal.data.desc}</div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Amount</label>
                    <div className={`text-lg font-bold ${
                      activeModal.data.amount.startsWith('+') ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {activeModal.data.amount}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Time</label>
                    <div className="text-sm">{activeModal.data.time}</div>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Status</label>
                  <div className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                    activeModal.data.status === 'completed' ? 'bg-green-100 text-green-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {activeModal.data.status}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Type</label>
                  <div className="text-sm capitalize">{activeModal.data.type}</div>
                </div>
              </div>
              {activeModal.data.type === 'earning' && (
                <div className="flex gap-2 pt-4">
                  <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors">
                    View Trip Details
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeModal.type === 'conversation' && activeModal.data && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-lg w-full max-h-[90vh] overflow-auto">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">{activeModal.data.from}</h3>
                  <div className="text-sm text-gray-500">{activeModal.data.time}</div>
                </div>
                <button onClick={closeModal} className="text-gray-500 hover:text-gray-700">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-sm">{activeModal.data.message}</div>
              </div>
              <div className="flex gap-2">
                <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors">
                  Reply
                </button>
                <button className="px-4 py-2 border rounded hover:bg-gray-50 transition-colors">
                  Mark as Read
                </button>
                {activeModal.data.type === 'passenger' && (
                  <button className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors">
                    Call Passenger
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Dialog */}
      {confirmDialog?.show && (
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

export default RedesignedDriverProfile;