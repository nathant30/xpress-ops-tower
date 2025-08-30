import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search, RotateCw, ArrowUpDown, MessageCircle, UserX, AlertTriangle, TrendingUp, TrendingDown, Shield, Eye, Ban, Clock, DollarSign, Activity } from 'lucide-react';
import { logger } from '@/lib/security/productionLogger';

const EnhancedPassengerTableWithFraud = () => {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('Active');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [sortField, setSortField] = useState('');
  const [sortDirection, setSortDirection] = useState('asc');
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [recentChanges, setRecentChanges] = useState<{[key: number]: number}>({});

  // Column width state management
  const defaultColumnWidths = {
    passenger: 180,
    status: 120,
    activity: 130,
    today: 80,
    total: 100,
    rate: 100,
    payment: 100,
    risk: 100,
    fraudScore: 90,
    paymentRisk: 90,
    alerts: 80,
    investigation: 100,
    actions: 140
  };

  const [columnWidths, setColumnWidths] = useState(defaultColumnWidths);
  const [isResizing, setIsResizing] = useState<string | null>(null);
  const [resizeStartX, setResizeStartX] = useState(0);
  const [resizeStartWidth, setResizeStartWidth] = useState(0);

  // Load saved column widths from localStorage
  useEffect(() => {
    const savedWidths = localStorage.getItem('passengerTableFraud_columnWidths');
    if (savedWidths) {
      try {
        const parsedWidths = JSON.parse(savedWidths);
        setColumnWidths({ ...defaultColumnWidths, ...parsedWidths });
      } catch (error) {
        logger.warn('Failed to parse saved column widths', { component: 'EnhancedPassengerTableWithFraud' });
      }
    }
  }, []);

  // Save column widths to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('passengerTableFraud_columnWidths', JSON.stringify(columnWidths));
  }, [columnWidths]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setLastUpdated(new Date());
      // Simulate some changes
      if (Math.random() < 0.3) {
        const randomId = Math.floor(Math.random() * 8) + 1;
        setRecentChanges(prev => ({...prev, [randomId]: Date.now()}));
      }
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const passengersData = [
    {
      id: 1,
      status: 'vip',
      statusText: 'VIP Active',
      statusTime: '2h ago',
      role: 'VIP Customer',
      name: 'Maria Santos 1922',
      passengerId: 'PSG-201922',
      completedBookings: 1248,
      completionRate: 98,
      completionTrend: 'up',
      cancellationRate: 2,
      totalSpent: 85420.50,
      joinDate: 'Jan 15, 2023',
      region: 'NCR',
      paymentMethod: 'Credit Card',
      fraudRisk: 'Low',
      fraudDetails: 'Excellent customer with verified identity',
      bookingsToday: 3,
      currentActivity: 'Recently booked',
      issues: [],
      // Enhanced fraud detection fields
      fraudRiskScore: 12.5,
      paymentRiskScore: 8.2,
      behavioralRiskScore: 15.3,
      identityRiskScore: 5.8,
      crossSystemRisk: 10.1,
      operationalRisk: 18.7,
      mlConfidence: 0.96,
      deviceRiskScore: 7.4,
      locationRiskScore: 9.2,
      socialNetworkRisk: 6.1,
      timePatternRisk: 11.8,
      paymentPatternRisk: 4.3,
      underInvestigation: false,
      investigationStatus: 'cleared',
      activeAlerts: 0,
      totalAlerts: 2,
      lastAlertTime: '3 weeks ago',
      accountAge: 638,
      verificationStatus: 'verified',
      documentsVerified: true,
      biometricVerified: true,
      paymentMethodsCount: 2,
      deviceCount: 1,
      suspiciousActivityCount: 0,
      chargebackCount: 0,
      refundRate: 0.8,
      accountSharingRisk: 2.1,
      collusionSuspected: false,
      velocityAlerts: 0,
      geoVelocityAlerts: 0,
      unusualPatternAlerts: 0,
      paymentAnomalies: 0,
      identityFlags: [],
      riskFactors: ['Long-term customer', 'Verified identity', 'Consistent patterns'],
      fraudHistory: [],
      investigationHistory: [],
      riskTrend: 'decreasing'
    },
    {
      id: 2,
      status: 'regular',
      statusText: 'Regular',
      statusTime: null,
      role: 'Regular Customer',
      name: 'Carlo Mendoza 1507',
      passengerId: 'PSG-201507',
      completedBookings: 529,
      completionRate: 94,
      completionTrend: 'stable',
      cancellationRate: 6,
      totalSpent: 25730.00,
      joinDate: 'Jun 10, 2024',
      region: 'Davao',
      paymentMethod: 'Digital Wallet',
      fraudRisk: 'Low',
      fraudDetails: 'Good payment history',
      bookingsToday: 1,
      currentActivity: 'Active',
      issues: [],
      // Enhanced fraud detection fields
      fraudRiskScore: 23.8,
      paymentRiskScore: 19.5,
      behavioralRiskScore: 28.2,
      identityRiskScore: 15.7,
      crossSystemRisk: 21.4,
      operationalRisk: 32.1,
      mlConfidence: 0.89,
      deviceRiskScore: 25.3,
      locationRiskScore: 18.6,
      socialNetworkRisk: 12.4,
      timePatternRisk: 31.7,
      paymentPatternRisk: 16.8,
      underInvestigation: false,
      investigationStatus: 'clean',
      activeAlerts: 1,
      totalAlerts: 4,
      lastAlertTime: '2 days ago',
      accountAge: 81,
      verificationStatus: 'verified',
      documentsVerified: true,
      biometricVerified: false,
      paymentMethodsCount: 1,
      deviceCount: 2,
      suspiciousActivityCount: 1,
      chargebackCount: 0,
      refundRate: 3.2,
      accountSharingRisk: 18.7,
      collusionSuspected: false,
      velocityAlerts: 1,
      geoVelocityAlerts: 0,
      unusualPatternAlerts: 0,
      paymentAnomalies: 0,
      identityFlags: ['Multiple devices'],
      riskFactors: ['New customer', 'Multiple devices', 'Account sharing risk'],
      fraudHistory: [],
      investigationHistory: [],
      riskTrend: 'stable'
    },
    {
      id: 3,
      status: 'suspended',
      statusText: 'Suspended',
      statusTime: '6d ago',
      role: 'Payment Issues',
      name: 'Liza Rodriguez 1095',
      passengerId: 'PSG-201095',
      completedBookings: 326,
      completionRate: 76,
      completionTrend: 'down',
      cancellationRate: 24,
      totalSpent: 12450.00,
      joinDate: 'Mar 22, 2024',
      region: 'Bicol',
      paymentMethod: 'Cash',
      fraudRisk: 'Critical',
      fraudDetails: 'Multiple payment failures and suspicious activity',
      bookingsToday: 0,
      currentActivity: 'Suspended',
      issues: ['Payment Failed', 'Suspicious Activity'],
      // Enhanced fraud detection fields
      fraudRiskScore: 89.3,
      paymentRiskScore: 92.8,
      behavioralRiskScore: 87.5,
      identityRiskScore: 76.2,
      crossSystemRisk: 91.4,
      operationalRisk: 85.7,
      mlConfidence: 0.94,
      deviceRiskScore: 88.1,
      locationRiskScore: 82.4,
      socialNetworkRisk: 79.6,
      timePatternRisk: 86.3,
      paymentPatternRisk: 94.7,
      underInvestigation: true,
      investigationStatus: 'investigating',
      activeAlerts: 12,
      totalAlerts: 28,
      lastAlertTime: '1 hour ago',
      accountAge: 159,
      verificationStatus: 'flagged',
      documentsVerified: false,
      biometricVerified: false,
      paymentMethodsCount: 4,
      deviceCount: 7,
      suspiciousActivityCount: 15,
      chargebackCount: 6,
      refundRate: 28.4,
      accountSharingRisk: 91.2,
      collusionSuspected: true,
      velocityAlerts: 8,
      geoVelocityAlerts: 5,
      unusualPatternAlerts: 7,
      paymentAnomalies: 12,
      identityFlags: ['Document fraud suspected', 'Multiple identities', 'Fake verification'],
      riskFactors: ['Payment fraud', 'Identity fraud', 'Device fraud', 'Velocity abuse', 'Collusion'],
      fraudHistory: ['Chargeback fraud', 'Identity theft', 'Payment manipulation'],
      investigationHistory: ['2024-08-15: Payment fraud investigation opened', '2024-08-20: Identity verification failed'],
      riskTrend: 'increasing'
    },
    {
      id: 4,
      status: 'premium',
      statusText: 'Premium',
      statusTime: null,
      role: 'Premium Customer',
      name: 'Ramon Cruz 1021',
      passengerId: 'PSG-201021',
      completedBookings: 892,
      completionRate: 96,
      completionTrend: 'up',
      cancellationRate: 4,
      totalSpent: 67890.25,
      joinDate: 'Sep 08, 2023',
      region: 'Baguio',
      paymentMethod: 'Credit Card',
      fraudRisk: 'Low',
      fraudDetails: 'Excellent customer',
      bookingsToday: 2,
      currentActivity: 'Active',
      issues: [],
      // Enhanced fraud detection fields
      fraudRiskScore: 16.7,
      paymentRiskScore: 12.4,
      behavioralRiskScore: 20.1,
      identityRiskScore: 8.9,
      crossSystemRisk: 14.2,
      operationalRisk: 22.3,
      mlConfidence: 0.93,
      deviceRiskScore: 11.8,
      locationRiskScore: 13.7,
      socialNetworkRisk: 9.4,
      timePatternRisk: 18.6,
      paymentPatternRisk: 7.2,
      underInvestigation: false,
      investigationStatus: 'clean',
      activeAlerts: 0,
      totalAlerts: 1,
      lastAlertTime: '2 months ago',
      accountAge: 356,
      verificationStatus: 'verified',
      documentsVerified: true,
      biometricVerified: true,
      paymentMethodsCount: 2,
      deviceCount: 1,
      suspiciousActivityCount: 0,
      chargebackCount: 0,
      refundRate: 1.2,
      accountSharingRisk: 3.7,
      collusionSuspected: false,
      velocityAlerts: 0,
      geoVelocityAlerts: 0,
      unusualPatternAlerts: 0,
      paymentAnomalies: 0,
      identityFlags: [],
      riskFactors: ['Premium customer', 'Verified identity', 'Stable patterns'],
      fraudHistory: [],
      investigationHistory: [],
      riskTrend: 'stable'
    },
    {
      id: 5,
      status: 'new',
      statusText: 'New User',
      statusTime: null,
      role: 'New Customer (30 days)',
      name: 'Juan Flores 211',
      passengerId: 'PSG-200211',
      completedBookings: 18,
      completionRate: 89,
      completionTrend: 'up',
      cancellationRate: 11,
      totalSpent: 1250.00,
      joinDate: 'Aug 25, 2024',
      region: 'Cebu',
      paymentMethod: 'Digital Wallet',
      fraudRisk: 'Medium',
      fraudDetails: 'New user monitoring',
      bookingsToday: 1,
      currentActivity: 'First week',
      issues: [],
      // Enhanced fraud detection fields
      fraudRiskScore: 45.2,
      paymentRiskScore: 38.7,
      behavioralRiskScore: 52.1,
      identityRiskScore: 41.8,
      crossSystemRisk: 46.3,
      operationalRisk: 48.9,
      mlConfidence: 0.72,
      deviceRiskScore: 39.4,
      locationRiskScore: 44.2,
      socialNetworkRisk: 47.8,
      timePatternRisk: 51.6,
      paymentPatternRisk: 35.9,
      underInvestigation: false,
      investigationStatus: 'monitoring',
      activeAlerts: 2,
      totalAlerts: 3,
      lastAlertTime: '6 hours ago',
      accountAge: 4,
      verificationStatus: 'pending',
      documentsVerified: true,
      biometricVerified: false,
      paymentMethodsCount: 1,
      deviceCount: 1,
      suspiciousActivityCount: 0,
      chargebackCount: 0,
      refundRate: 5.6,
      accountSharingRisk: 12.4,
      collusionSuspected: false,
      velocityAlerts: 2,
      geoVelocityAlerts: 1,
      unusualPatternAlerts: 0,
      paymentAnomalies: 0,
      identityFlags: ['New account', 'Incomplete verification'],
      riskFactors: ['New user', 'Velocity patterns', 'Incomplete verification'],
      fraudHistory: [],
      investigationHistory: [],
      riskTrend: 'monitoring'
    },
    {
      id: 6,
      status: 'regular',
      statusText: 'Regular',
      statusTime: null,
      role: 'Regular Customer',
      name: 'Grace Reyes 325',
      passengerId: 'PSG-200325',
      completedBookings: 756,
      completionRate: 92,
      completionTrend: 'stable',
      cancellationRate: 8,
      totalSpent: 34560.75,
      joinDate: 'Apr 18, 2024',
      region: 'Bicol',
      paymentMethod: 'Bank Transfer',
      fraudRisk: 'Low',
      fraudDetails: 'Clean record',
      bookingsToday: 2,
      currentActivity: 'Active',
      issues: [],
      // Enhanced fraud detection fields
      fraudRiskScore: 19.4,
      paymentRiskScore: 15.8,
      behavioralRiskScore: 23.2,
      identityRiskScore: 12.7,
      crossSystemRisk: 17.5,
      operationalRisk: 25.1,
      mlConfidence: 0.91,
      deviceRiskScore: 14.9,
      locationRiskScore: 16.3,
      socialNetworkRisk: 11.2,
      timePatternRisk: 21.8,
      paymentPatternRisk: 10.6,
      underInvestigation: false,
      investigationStatus: 'clean',
      activeAlerts: 0,
      totalAlerts: 2,
      lastAlertTime: '3 weeks ago',
      accountAge: 133,
      verificationStatus: 'verified',
      documentsVerified: true,
      biometricVerified: true,
      paymentMethodsCount: 1,
      deviceCount: 1,
      suspiciousActivityCount: 0,
      chargebackCount: 0,
      refundRate: 2.1,
      accountSharingRisk: 4.8,
      collusionSuspected: false,
      velocityAlerts: 0,
      geoVelocityAlerts: 0,
      unusualPatternAlerts: 0,
      paymentAnomalies: 0,
      identityFlags: [],
      riskFactors: ['Clean history', 'Verified identity', 'Consistent behavior'],
      fraudHistory: [],
      investigationHistory: [],
      riskTrend: 'stable'
    },
    {
      id: 7,
      status: 'suspended',
      statusText: 'Suspended',
      statusTime: '2d ago',
      role: 'Under Investigation',
      name: 'Maria Cruz 5',
      passengerId: 'PSG-200005',
      completedBookings: 445,
      completionRate: 67,
      completionTrend: 'down',
      cancellationRate: 33,
      totalSpent: 18750.00,
      joinDate: 'Jul 05, 2024',
      region: 'Cebu',
      paymentMethod: 'Digital Wallet',
      fraudRisk: 'High',
      fraudDetails: 'Under investigation for violations',
      bookingsToday: 0,
      currentActivity: 'Suspended',
      issues: ['Violation Report'],
      // Enhanced fraud detection fields
      fraudRiskScore: 78.6,
      paymentRiskScore: 72.3,
      behavioralRiskScore: 84.1,
      identityRiskScore: 69.7,
      crossSystemRisk: 81.2,
      operationalRisk: 76.8,
      mlConfidence: 0.89,
      deviceRiskScore: 75.4,
      locationRiskScore: 73.9,
      socialNetworkRisk: 70.6,
      timePatternRisk: 82.7,
      paymentPatternRisk: 77.3,
      underInvestigation: true,
      investigationStatus: 'investigating',
      activeAlerts: 9,
      totalAlerts: 18,
      lastAlertTime: '30 minutes ago',
      accountAge: 55,
      verificationStatus: 'flagged',
      documentsVerified: false,
      biometricVerified: false,
      paymentMethodsCount: 3,
      deviceCount: 5,
      suspiciousActivityCount: 8,
      chargebackCount: 3,
      refundRate: 15.7,
      accountSharingRisk: 86.4,
      collusionSuspected: true,
      velocityAlerts: 5,
      geoVelocityAlerts: 3,
      unusualPatternAlerts: 4,
      paymentAnomalies: 6,
      identityFlags: ['Document inconsistencies', 'Multiple accounts suspected'],
      riskFactors: ['High cancellation rate', 'Account sharing', 'Payment issues', 'Identity concerns'],
      fraudHistory: ['Account manipulation', 'Payment disputes'],
      investigationHistory: ['2024-08-27: Violation investigation opened'],
      riskTrend: 'increasing'
    },
    {
      id: 8,
      status: 'vip',
      statusText: 'VIP Active',
      statusTime: null,
      role: 'VIP Customer',
      name: 'Ramon Navarro 22',
      passengerId: 'PSG-200022',
      completedBookings: 2187,
      completionRate: 97,
      completionTrend: 'stable',
      cancellationRate: 3,
      totalSpent: 156780.00,
      joinDate: 'May 12, 2022',
      region: 'Cebu',
      paymentMethod: 'Credit Card',
      fraudRisk: 'Low',
      fraudDetails: 'Top tier customer',
      bookingsToday: 4,
      currentActivity: 'Active',
      issues: [],
      // Enhanced fraud detection fields
      fraudRiskScore: 8.9,
      paymentRiskScore: 5.4,
      behavioralRiskScore: 12.7,
      identityRiskScore: 3.2,
      crossSystemRisk: 6.8,
      operationalRisk: 15.3,
      mlConfidence: 0.98,
      deviceRiskScore: 4.7,
      locationRiskScore: 7.1,
      socialNetworkRisk: 2.9,
      timePatternRisk: 9.8,
      paymentPatternRisk: 2.1,
      underInvestigation: false,
      investigationStatus: 'cleared',
      activeAlerts: 0,
      totalAlerts: 0,
      lastAlertTime: 'Never',
      accountAge: 838,
      verificationStatus: 'verified',
      documentsVerified: true,
      biometricVerified: true,
      paymentMethodsCount: 2,
      deviceCount: 1,
      suspiciousActivityCount: 0,
      chargebackCount: 0,
      refundRate: 0.3,
      accountSharingRisk: 1.2,
      collusionSuspected: false,
      velocityAlerts: 0,
      geoVelocityAlerts: 0,
      unusualPatternAlerts: 0,
      paymentAnomalies: 0,
      identityFlags: [],
      riskFactors: ['VIP customer', 'Long history', 'Perfect record'],
      fraudHistory: [],
      investigationHistory: [],
      riskTrend: 'decreasing'
    }
  ];

  const getStatusIcon = (status: string) => {
    if (status === 'vip') return '👑';
    if (status === 'premium') return '⭐';
    if (status === 'regular') return '🟢';
    if (status === 'new') return '🟠';
    if (status === 'suspended') return '🔴';
    if (status === 'banned') return '⛔';
    if (status === 'inactive') return '⚫';
    return '🔵';
  };

  const getCompletionRateColor = (rate: number) => {
    if (rate >= 95) return 'text-green-600 bg-green-50';
    if (rate >= 85) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const getFraudRiskColor = (risk: string) => {
    if (risk === 'Critical') return 'bg-red-100 text-red-800 border border-red-300';
    if (risk === 'High') return 'bg-orange-100 text-orange-800 border border-orange-300';
    if (risk === 'Medium') return 'bg-yellow-100 text-yellow-800 border border-yellow-300';
    return 'bg-green-100 text-green-800 border border-green-300';
  };

  const getFraudScoreColor = (score: number) => {
    if (score >= 80) return 'bg-red-100 text-red-800 border border-red-300';
    if (score >= 60) return 'bg-orange-100 text-orange-800 border border-orange-300';
    if (score >= 40) return 'bg-yellow-100 text-yellow-800 border border-yellow-300';
    return 'bg-green-100 text-green-800 border border-green-300';
  };

  const getInvestigationStatusColor = (status: string) => {
    if (status === 'investigating') return 'bg-red-100 text-red-800 border border-red-300';
    if (status === 'monitoring') return 'bg-yellow-100 text-yellow-800 border border-yellow-300';
    if (status === 'flagged') return 'bg-orange-100 text-orange-800 border border-orange-300';
    if (status === 'cleared') return 'bg-blue-100 text-blue-800 border border-blue-300';
    return 'bg-green-100 text-green-800 border border-green-300';
  };

  const getTrendIcon = (trend: string) => {
    if (trend === 'up') return <TrendingUp className="w-3 h-3 text-green-500 inline ml-1" />;
    if (trend === 'down') return <TrendingDown className="w-3 h-3 text-red-500 inline ml-1" />;
    return null;
  };

  const getStatusTooltip = (statusText: string) => {
    switch (statusText) {
      case 'VIP Active':
        return 'VIP customer with highest priority and benefits';
      case 'Premium':
        return 'Premium customer with enhanced service benefits';
      case 'Regular':
        return 'Standard customer account in good standing';
      case 'New User':
        return 'New customer within first 30 days';
      case 'Suspended':
        return 'Customer temporarily suspended due to violations or issues';
      case 'Banned':
        return 'Customer permanently banned from the platform';
      case 'Inactive':
        return 'Customer hasn\'t booked rides for extended period';
      default:
        return 'Current customer account status';
    }
  };

  const getActivityTooltip = (activity: string) => {
    if (activity.includes('Active')) {
      return 'Customer actively using the platform';
    } else if (activity.includes('Recently booked')) {
      return 'Customer made a recent booking';
    } else if (activity.includes('First week')) {
      return 'New customer in their first week';
    } else if (activity.includes('Inactive')) {
      return 'Customer has been inactive for specified duration';
    } else if (activity.includes('Suspended')) {
      return 'Customer account is temporarily suspended';
    } else if (activity.includes('Banned')) {
      return 'Customer is permanently banned from the platform';
    } else {
      return 'Current customer activity status';
    }
  };

  // Get contextual status options based on selected passenger type
  const getContextualStatusOptions = (passengerType: string) => {
    switch (passengerType) {
      case 'Active':
        return [
          { 
            id: 'All', 
            label: 'All Active', 
            count: passengersData.filter(p => 
              p.status !== 'suspended' && 
              p.status !== 'inactive' && 
              p.status !== 'banned'
            ).length,
            tooltip: 'Show all active customers regardless of tier'
          },
          { 
            id: 'VIP', 
            label: 'VIP', 
            count: passengersData.filter(p => p.status === 'vip').length,
            tooltip: 'VIP customers with highest benefits'
          },
          { 
            id: 'Premium', 
            label: 'Premium', 
            count: passengersData.filter(p => p.status === 'premium').length,
            tooltip: 'Premium customers with enhanced service'
          },
          { 
            id: 'Regular', 
            label: 'Regular', 
            count: passengersData.filter(p => p.status === 'regular').length,
            tooltip: 'Regular customers in good standing'
          },
          { 
            id: 'New Users', 
            label: 'New Users', 
            count: passengersData.filter(p => p.status === 'new').length,
            tooltip: 'New customers within 30 days'
          },
          { 
            id: 'Issues', 
            label: 'Issues', 
            count: passengersData.filter(p => 
              p.issues.length > 0 && 
              p.status !== 'suspended' && p.status !== 'inactive' && 
              p.status !== 'banned'
            ).length,
            tooltip: 'Active customers with minor issues'
          },
          { 
            id: 'High Risk', 
            label: 'High Risk', 
            count: passengersData.filter(p => 
              p.fraudRiskScore >= 60 && 
              p.status !== 'suspended' && p.status !== 'inactive' && 
              p.status !== 'banned'
            ).length,
            tooltip: 'Active customers with high fraud risk scores'
          },
          { 
            id: 'Under Investigation', 
            label: 'Investigating', 
            count: passengersData.filter(p => 
              p.underInvestigation && 
              p.status !== 'suspended' && p.status !== 'inactive' && 
              p.status !== 'banned'
            ).length,
            tooltip: 'Active customers currently under fraud investigation'
          }
        ];
      
      case 'Suspended':
        return [
          { 
            id: 'All', 
            label: 'All Suspended', 
            count: passengersData.filter(p => p.status === 'suspended').length,
            tooltip: 'Show all suspended customers'
          },
          { 
            id: 'Payment Issues', 
            label: 'Payment', 
            count: passengersData.filter(p => 
              p.status === 'suspended' && 
              p.issues.some(issue => issue.includes('Payment'))
            ).length,
            tooltip: 'Customers suspended for payment issues'
          },
          { 
            id: 'High Cancellation', 
            label: 'Cancellation', 
            count: passengersData.filter(p => 
              p.status === 'suspended' && 
              p.issues.some(issue => issue.includes('Cancellation'))
            ).length,
            tooltip: 'Customers suspended for high cancellation rates'
          },
          { 
            id: 'Violations', 
            label: 'Violations', 
            count: passengersData.filter(p => 
              p.status === 'suspended' && 
              p.issues.some(issue => issue.includes('Violation'))
            ).length,
            tooltip: 'Customers suspended for policy violations'
          },
          { 
            id: 'Fraud Investigation', 
            label: 'Fraud', 
            count: passengersData.filter(p => 
              p.status === 'suspended' && 
              p.underInvestigation
            ).length,
            tooltip: 'Customers suspended due to fraud investigations'
          }
        ];
      
      case 'Inactive':
        return [
          { 
            id: 'All', 
            label: 'All Inactive', 
            count: passengersData.filter(p => p.status === 'inactive').length,
            tooltip: 'Show all inactive customers'
          },
          { 
            id: 'Short Term', 
            label: 'Short Term', 
            count: passengersData.filter(p => 
              p.status === 'inactive' && 
              p.currentActivity.includes('14d')
            ).length,
            tooltip: 'Customers inactive for 1-14 days'
          },
          { 
            id: 'Long Term', 
            label: 'Long Term', 
            count: passengersData.filter(p => 
              p.status === 'inactive' && 
              !p.currentActivity.includes('14d')
            ).length,
            tooltip: 'Customers inactive for more than 14 days'
          }
        ];
      
      case 'Banned':
        return [
          { 
            id: 'All', 
            label: 'All Banned', 
            count: passengersData.filter(p => p.status === 'banned').length,
            tooltip: 'Show all permanently banned customers'
          },
          { 
            id: 'Fraud', 
            label: 'Fraud', 
            count: passengersData.filter(p => 
              p.status === 'banned' && 
              p.issues.some(issue => issue.includes('Fraud'))
            ).length,
            tooltip: 'Customers banned for fraudulent activities'
          },
          { 
            id: 'Fake Account', 
            label: 'Fake', 
            count: passengersData.filter(p => 
              p.status === 'banned' && 
              p.issues.some(issue => issue.includes('Fake'))
            ).length,
            tooltip: 'Customers banned for fake account violations'
          }
        ];
      
      default:
        return [
          { 
            id: 'All', 
            label: 'All', 
            count: passengersData.length,
            tooltip: 'Show all customers regardless of status'
          }
        ];
    }
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleRowClick = (passenger: any) => {
    router.push('/passenger-profile');
  };

  const isRecentlyChanged = (id: number) => {
    const changeTime = recentChanges[id];
    return changeTime && (Date.now() - changeTime) < 5000; // 5 seconds
  };

  // Column resize handlers
  const handleResizeStart = (column: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(column);
    setResizeStartX(e.clientX);
    setResizeStartWidth(columnWidths[column as keyof typeof columnWidths]);
  };

  const handleResizeMove = (e: MouseEvent) => {
    if (!isResizing) return;
    
    const deltaX = e.clientX - resizeStartX;
    const newWidth = Math.max(60, resizeStartWidth + deltaX); // Minimum width of 60px
    
    setColumnWidths(prev => ({
      ...prev,
      [isResizing]: newWidth
    }));
  };

  const handleResizeEnd = () => {
    setIsResizing(null);
  };

  // Add global mouse event listeners for resize
  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleResizeMove);
      document.addEventListener('mouseup', handleResizeEnd);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      
      return () => {
        document.removeEventListener('mousemove', handleResizeMove);
        document.removeEventListener('mouseup', handleResizeEnd);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      };
    }
  }, [isResizing, resizeStartX, resizeStartWidth]);

  // Reset column widths to default
  const resetColumnWidths = () => {
    setColumnWidths(defaultColumnWidths);
  };

  // Filter and sort passengers with contextual logic
  const filteredPassengers = passengersData
    .filter(passenger => {
      // Search filter
      const matchesSearch = searchTerm === '' || 
        passenger.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        passenger.passengerId.toLowerCase().includes(searchTerm.toLowerCase());

      // Type filter (primary filter)
      let matchesType = false;
      switch (selectedType) {
        case 'Active':
          matchesType = passenger.status !== 'suspended' && 
                      passenger.status !== 'inactive' && 
                      passenger.status !== 'banned';
          break;
        case 'Suspended':
          matchesType = passenger.status === 'suspended';
          break;
        case 'Inactive':
          matchesType = passenger.status === 'inactive';
          break;
        case 'Banned':
          matchesType = passenger.status === 'banned';
          break;
        default:
          matchesType = true;
      }

      // Contextual status filter (secondary filter based on type)
      let matchesStatus = false;
      if (selectedStatus === 'All') {
        matchesStatus = true;
      } else {
        // Apply contextual status filtering based on selected type
        switch (selectedType) {
          case 'Active':
            if (selectedStatus === 'VIP') {
              matchesStatus = passenger.status === 'vip';
            } else if (selectedStatus === 'Premium') {
              matchesStatus = passenger.status === 'premium';
            } else if (selectedStatus === 'Regular') {
              matchesStatus = passenger.status === 'regular';
            } else if (selectedStatus === 'New Users') {
              matchesStatus = passenger.status === 'new';
            } else if (selectedStatus === 'Issues') {
              matchesStatus = passenger.issues.length > 0;
            } else if (selectedStatus === 'High Risk') {
              matchesStatus = passenger.fraudRiskScore >= 60;
            } else if (selectedStatus === 'Under Investigation') {
              matchesStatus = passenger.underInvestigation;
            }
            break;
          
          case 'Suspended':
            if (selectedStatus === 'Payment Issues') {
              matchesStatus = passenger.issues.some(issue => 
                issue.includes('Payment')
              );
            } else if (selectedStatus === 'High Cancellation') {
              matchesStatus = passenger.issues.some(issue => 
                issue.includes('Cancellation')
              );
            } else if (selectedStatus === 'Violations') {
              matchesStatus = passenger.issues.some(issue => 
                issue.includes('Violation')
              );
            } else if (selectedStatus === 'Fraud Investigation') {
              matchesStatus = passenger.underInvestigation;
            }
            break;
          
          case 'Inactive':
            if (selectedStatus === 'Short Term') {
              matchesStatus = passenger.currentActivity.includes('14d');
            } else if (selectedStatus === 'Long Term') {
              matchesStatus = !passenger.currentActivity.includes('14d');
            }
            break;
          
          case 'Banned':
            if (selectedStatus === 'Fraud') {
              matchesStatus = passenger.issues.some(issue => 
                issue.includes('Fraud')
              );
            } else if (selectedStatus === 'Fake Account') {
              matchesStatus = passenger.issues.some(issue => 
                issue.includes('Fake')
              );
            }
            break;
          
          default:
            matchesStatus = true;
        }
      }

      return matchesSearch && matchesType && matchesStatus;
    })
    .sort((a, b) => {
      if (!sortField) return 0;
      
      let aValue = a[sortField as keyof typeof a];
      let bValue = b[sortField as keyof typeof b];
      
      if (typeof aValue === 'string') aValue = aValue.toLowerCase();
      if (typeof bValue === 'string') bValue = bValue.toLowerCase();
      
      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });



  return (
    <div className="space-y-3">
      {/* Enhanced Filter Section */}
      <div className="bg-white border border-gray-200 rounded-lg p-3 mb-3">
        {/* Search and Date Filters */}
        <div className="flex items-center space-x-4 mb-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search name or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm w-64"
            />
          </div>
          
          <input type="date" className="border border-gray-200 rounded px-3 py-2 text-sm" />
          <span className="text-gray-500">to</span>
          <input type="date" className="border border-gray-200 rounded px-3 py-2 text-sm" />
          
          <div className="ml-auto flex items-center space-x-3">
            <span className="text-xs text-gray-500">
              Updated: {lastUpdated.toLocaleTimeString()}
            </span>
            <button 
              onClick={() => setLastUpdated(new Date())}
              className="flex items-center space-x-1 px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
            >
              <RotateCw className="w-3 h-3" />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Passenger Type Filters */}
        <div className="flex items-center space-x-4 mb-3">
          <span className="text-sm font-medium text-gray-700">Customer Type:</span>
          {[
            { 
              id: 'Active', 
              label: 'Active', 
              count: passengersData.filter(p => 
                p.status !== 'suspended' && 
                p.status !== 'inactive' && 
                p.status !== 'banned'
              ).length,
              tooltip: 'Customers currently active and using the platform'
            },
            { 
              id: 'Suspended', 
              label: 'Suspended', 
              count: passengersData.filter(p => p.status === 'suspended').length,
              tooltip: 'Customers temporarily suspended due to violations or issues'
            },
            { 
              id: 'Inactive', 
              label: 'Inactive', 
              count: passengersData.filter(p => p.status === 'inactive').length,
              tooltip: 'Customers who haven\'t used the platform for extended period'
            },
            { 
              id: 'Banned', 
              label: 'Banned', 
              count: passengersData.filter(p => p.status === 'banned').length,
              tooltip: 'Customers permanently banned from the platform'
            }
          ].map(type => (
            <button
              key={type.id}
              onClick={() => {
                setSelectedType(type.id);
                setSelectedStatus('All'); // Reset status when passenger type changes
              }}
              title={type.tooltip}
              className={`flex items-center space-x-2 px-3 py-1 text-sm rounded transition-colors ${
                selectedType === type.id 
                  ? 'bg-blue-100 text-blue-700 border border-blue-200' 
                  : 'text-gray-600 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              <span>{type.label}</span>
              <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${
                selectedType === type.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-600'
              }`}>
                {type.count}
              </span>
            </button>
          ))}
        </div>

        {/* Status Filter Pills */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4 flex-wrap">
            <span className="text-sm font-medium text-gray-700">Status:</span>
            {getContextualStatusOptions(selectedType).map(status => (
              <button
                key={status.id}
                onClick={() => setSelectedStatus(status.id)}
                title={status.tooltip}
                className={`flex items-center space-x-2 px-3 py-1 text-sm rounded-full transition-colors ${
                  selectedStatus === status.id 
                    ? 'bg-blue-100 text-blue-700 border border-blue-200' 
                    : 'text-gray-600 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                <span>{status.label}</span>
                <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${
                  selectedStatus === status.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-600'
                }`}>
                  {status.count}
                </span>
              </button>
            ))}
          </div>
          
          <div className="flex items-center space-x-4">
            <button 
              onClick={() => {
                setSearchTerm('');
                setSelectedType('Active');
                setSelectedStatus('All');
              }}
              className="text-gray-600 hover:text-gray-900 text-sm"
            >
              Clear
            </button>
            <button 
              onClick={resetColumnWidths}
              className="text-gray-600 hover:text-gray-900 text-sm"
              title="Reset column widths to default"
            >
              Reset Layout
            </button>
            <button 
              onClick={() => {
                // Export functionality
                const csvContent = "data:text/csv;charset=utf-8," + 
                  "Name,Passenger ID,Status,Activity,Bookings Today,Total Bookings,Completion Rate,Payment,Risk,Fraud Score,Payment Risk,Alerts,Investigation\n" +
                  filteredPassengers.map(p => 
                    `"${p.name}","${p.passengerId}","${p.statusText}","${p.currentActivity}","${p.bookingsToday}","${p.completedBookings}","${p.completionRate}%","${p.paymentMethod}","${p.fraudRisk}","${p.fraudRiskScore}","${p.paymentRiskScore}","${p.activeAlerts}","${p.investigationStatus}"`
                  ).join("\n");
                
                const encodedUri = encodeURI(csvContent);
                const link = document.createElement("a");
                link.setAttribute("href", encodedUri);
                link.setAttribute("download", "enhanced_passenger_fraud_data.csv");
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
              }}
              className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700"
            >
              Export all
            </button>
          </div>
        </div>
      </div>

      {/* Enhanced Table with Fixed Headers and Fraud Columns */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto" style={{ maxHeight: 'calc(100vh - 420px)' }}>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
              <tr>
                {[
                  { key: 'passenger', label: 'Passenger', tooltip: 'Customer name and unique passenger ID' },
                  { key: 'status', label: 'Status', tooltip: 'Current account status and customer tier' },
                  { key: 'activity', label: 'Activity', tooltip: 'Current customer activity and engagement' },
                  { key: 'today', label: 'Today', tooltip: 'Number of bookings made today' },
                  { key: 'total', label: 'Total', tooltip: 'Total bookings since joining' },
                  { key: 'rate', label: 'Rate %', tooltip: 'Booking completion rate percentage with trend' },
                  { key: 'payment', label: 'Payment', tooltip: 'Primary payment method used' },
                  { key: 'risk', label: 'Risk', tooltip: 'Fraud risk assessment level' },
                  { key: 'fraudScore', label: 'Fraud Score', tooltip: 'Overall fraud risk score (0-100)' },
                  { key: 'paymentRisk', label: 'Pay Risk', tooltip: 'Payment-specific fraud risk score' },
                  { key: 'alerts', label: 'Alerts', tooltip: 'Number of active fraud alerts' },
                  { key: 'investigation', label: 'Investigation', tooltip: 'Current investigation status' },
                  { key: 'actions', label: 'Actions', tooltip: 'Quick actions available for this customer' }
                ].map((column) => (
                  <th
                    key={column.key}
                    className="text-left py-2 px-3 font-medium text-gray-700 text-xs relative border-r border-gray-200 last:border-r-0"
                    style={{ width: columnWidths[column.key as keyof typeof columnWidths] }}
                    title={column.tooltip}
                  >
                    <div className="flex items-center justify-between">
                      <span>{column.label}</span>
                      <div
                        className="absolute top-0 right-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-400 hover:bg-opacity-50 transition-colors"
                        onMouseDown={(e) => handleResizeStart(column.key, e)}
                        title="Drag to resize column"
                      />
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredPassengers.map(passenger => (
                <tr 
                  key={passenger.id} 
                  className={`border-b border-gray-100 hover:bg-blue-50 cursor-pointer transition-colors ${
                    isRecentlyChanged(passenger.id) ? 'bg-yellow-50' : ''
                  } ${passenger.underInvestigation ? 'bg-red-25' : ''} ${passenger.fraudRiskScore >= 80 ? 'bg-red-25' : ''}`}
                  onClick={() => handleRowClick(passenger)}
                >
                  <td className="py-2 px-3 border-r border-gray-100 last:border-r-0" style={{ width: columnWidths.passenger }}>
                    <div className="font-medium text-gray-900 text-sm truncate">{passenger.name}</div>
                    <div className="text-xs text-gray-500 truncate">{passenger.passengerId}</div>
                  </td>
                  <td className="py-2 px-3 border-r border-gray-100 last:border-r-0" style={{ width: columnWidths.status }}>
                    <div className="flex items-center space-x-1">
                      <span>{getStatusIcon(passenger.status)}</span>
                      <span 
                        className="text-xs cursor-help truncate" 
                        title={getStatusTooltip(passenger.statusText)}
                      >
                        {passenger.statusText}
                      </span>
                    </div>
                  </td>
                  <td className="py-2 px-3 border-r border-gray-100 last:border-r-0" style={{ width: columnWidths.activity }}>
                    <span 
                      className={`text-xs cursor-help truncate ${
                        passenger.currentActivity.includes('Active') ? 'text-green-600' :
                        passenger.currentActivity.includes('Recently booked') ? 'text-blue-600' :
                        passenger.currentActivity.includes('First week') ? 'text-yellow-600' :
                        passenger.currentActivity.includes('New user') ? 'text-orange-600' :
                        passenger.currentActivity.includes('Suspended') ? 'text-red-600' :
                        passenger.currentActivity.includes('Banned') ? 'text-red-800' :
                        passenger.currentActivity.includes('Inactive') ? 'text-gray-600' :
                        'text-gray-600'
                      }`}
                      title={getActivityTooltip(passenger.currentActivity)}
                    >
                      {passenger.currentActivity}
                    </span>
                  </td>
                  <td className="py-2 px-3 border-r border-gray-100 last:border-r-0" style={{ width: columnWidths.today }}>
                    <span className="font-bold text-gray-900">{passenger.bookingsToday}</span>
                  </td>
                  <td className="py-2 px-3 border-r border-gray-100 last:border-r-0 text-xs" style={{ width: columnWidths.total }}>
                    <div>{passenger.completedBookings.toLocaleString()}</div>
                    <div className="text-xs text-gray-500">₱{passenger.totalSpent.toLocaleString()}</div>
                  </td>
                  <td className="py-2 px-3 border-r border-gray-100 last:border-r-0" style={{ width: columnWidths.rate }}>
                    <span className={`px-2 py-1 rounded text-xs ${getCompletionRateColor(passenger.completionRate)}`}>
                      {passenger.completionRate}%
                      {getTrendIcon(passenger.completionTrend)}
                    </span>
                  </td>
                  <td className="py-2 px-3 border-r border-gray-100 last:border-r-0 text-xs" style={{ width: columnWidths.payment }}>
                    <div className="flex items-center space-x-1">
                      <span>{passenger.paymentMethod}</span>
                      {passenger.chargebackCount > 0 && (
                        <AlertTriangle className="w-3 h-3 text-red-500" title={`${passenger.chargebackCount} chargebacks`} />
                      )}
                    </div>
                  </td>
                  <td className="py-2 px-3 border-r border-gray-100 last:border-r-0" style={{ width: columnWidths.risk }}>
                    <span 
                      className={`px-2 py-1 rounded text-xs cursor-help truncate ${getFraudRiskColor(passenger.fraudRisk)}`}
                      title={passenger.fraudDetails}
                    >
                      {passenger.fraudRisk}
                    </span>
                  </td>
                  <td className="py-2 px-3 border-r border-gray-100 last:border-r-0" style={{ width: columnWidths.fraudScore }}>
                    <div className="text-center">
                      <span 
                        className={`px-2 py-1 rounded text-xs font-bold cursor-help ${getFraudScoreColor(passenger.fraudRiskScore)}`}
                        title={`Overall fraud risk: ${passenger.fraudRiskScore.toFixed(1)}% | ML Confidence: ${(passenger.mlConfidence * 100).toFixed(1)}%`}
                      >
                        {passenger.fraudRiskScore.toFixed(1)}
                      </span>
                      <div className="text-xs text-gray-400 mt-1">
                        ML: {(passenger.mlConfidence * 100).toFixed(0)}%
                      </div>
                    </div>
                  </td>
                  <td className="py-2 px-3 border-r border-gray-100 last:border-r-0" style={{ width: columnWidths.paymentRisk }}>
                    <div className="text-center">
                      <span 
                        className={`px-2 py-1 rounded text-xs font-bold cursor-help ${getFraudScoreColor(passenger.paymentRiskScore)}`}
                        title={`Payment fraud risk: ${passenger.paymentRiskScore.toFixed(1)}% | Chargebacks: ${passenger.chargebackCount} | Refund Rate: ${passenger.refundRate}%`}
                      >
                        {passenger.paymentRiskScore.toFixed(1)}
                      </span>
                    </div>
                  </td>
                  <td className="py-2 px-3 border-r border-gray-100 last:border-r-0 text-center" style={{ width: columnWidths.alerts }}>
                    <div className="flex items-center justify-center space-x-1">
                      {passenger.activeAlerts > 0 && (
                        <span className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs font-bold">
                          {passenger.activeAlerts}
                        </span>
                      )}
                      {passenger.activeAlerts === 0 && (
                        <span className="text-gray-400 text-xs">0</span>
                      )}
                      {passenger.collusionSuspected && (
                        <Shield className="w-3 h-3 text-red-500" title="Collusion suspected" />
                      )}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      {passenger.lastAlertTime}
                    </div>
                  </td>
                  <td className="py-2 px-3 border-r border-gray-100 last:border-r-0" style={{ width: columnWidths.investigation }}>
                    <div className="text-center">
                      <span 
                        className={`px-2 py-1 rounded text-xs cursor-help truncate ${getInvestigationStatusColor(passenger.investigationStatus)}`}
                        title={`Investigation Status: ${passenger.investigationStatus} | Account Age: ${passenger.accountAge} days`}
                      >
                        {passenger.investigationStatus}
                      </span>
                      {passenger.underInvestigation && (
                        <div className="text-xs text-red-600 mt-1 flex items-center justify-center space-x-1">
                          <Clock className="w-3 h-3" />
                          <span>Active</span>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="py-2 px-3 border-r border-gray-100 last:border-r-0" style={{ width: columnWidths.actions }}>
                    <div className="flex space-x-1">
                      <button 
                        className="p-1 bg-blue-600 text-white rounded hover:bg-blue-700" 
                        title="Message"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MessageCircle className="w-3 h-3" />
                      </button>
                      <button 
                        className="p-1 bg-purple-600 text-white rounded hover:bg-purple-700" 
                        title="View Profile"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Eye className="w-3 h-3" />
                      </button>
                      {passenger.fraudRiskScore >= 60 && (
                        <button 
                          className="p-1 bg-orange-600 text-white rounded hover:bg-orange-700" 
                          title="Investigate"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Shield className="w-3 h-3" />
                        </button>
                      )}
                      {passenger.underInvestigation || passenger.fraudRiskScore >= 80 ? (
                        <button 
                          className="p-1 bg-red-600 text-white rounded hover:bg-red-700" 
                          title="Suspend"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <UserX className="w-3 h-3" />
                        </button>
                      ) : (
                        <button 
                          className="p-1 bg-gray-400 text-white rounded opacity-50 cursor-not-allowed" 
                          title="Suspend (Risk too low)"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <UserX className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default EnhancedPassengerTableWithFraud;