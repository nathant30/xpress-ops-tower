// Enhanced Mock Data with Comprehensive Fraud Detection
import {
  EnhancedPassenger,
  EnhancedDriver,
  PassengerFraudProfile,
  PaymentFraudAnalytics,
  FraudAlert,
  CollusionDetection,
  ChargebackManagement,
  PassengerBehavioralAnalytics,
  DeviceFingerprinting,
  DocumentVerification,
  FraudInvestigation,
  FraudCategory,
  RiskLevel
} from '@/types/fraud';

// =====================================================
// ENHANCED PASSENGERS WITH FRAUD DETECTION
// =====================================================

export const mockEnhancedPassengers: EnhancedPassenger[] = [
  {
    id: 'pass-001',
    passengerId: 'PSG-001',
    firstName: 'Roberto',
    lastName: 'Silva',
    email: 'roberto.silva@example.com',
    phoneNumber: '+639181234567',
    
    // Fraud scoring - Medium Risk Case
    fraudRiskScore: 65.5,
    paymentRiskScore: 70.0,
    behavioralRiskScore: 55.0,
    identityRiskScore: 20.0,
    
    // Verification status
    identityVerified: true,
    documentVerified: true,
    paymentMethodVerified: false, // Red flag
    
    // Activity metrics
    totalBookings: 127,
    totalSpent: 18750.50,
    bookingsToday: 3,
    cancellationRate: 15.5, // Slightly high
    
    // Account status
    accountStatus: 'active',
    tier: 'Regular',
    
    // Investigation flags
    underInvestigation: false,
    investigationCount: 1,
    lastInvestigationDate: new Date('2024-07-15T10:00:00Z'),
    
    // Alert flags
    activeAlerts: 2,
    recentAlerts: [],
    
    createdAt: new Date('2024-03-15T08:00:00Z'),
    updatedAt: new Date('2024-08-27T10:00:00Z'),
    lastActivityAt: new Date('2024-08-27T09:30:00Z'),
  },
  {
    id: 'pass-002',
    passengerId: 'PSG-002',
    firstName: 'Ana',
    lastName: 'Reyes',
    email: 'ana.reyes@example.com',
    phoneNumber: '+639189876543',
    
    // Fraud scoring - Low Risk Case
    fraudRiskScore: 15.2,
    paymentRiskScore: 18.0,
    behavioralRiskScore: 12.5,
    identityRiskScore: 5.0,
    
    // Verification status
    identityVerified: true,
    documentVerified: true,
    paymentMethodVerified: true,
    
    // Activity metrics
    totalBookings: 342,
    totalSpent: 45200.25,
    bookingsToday: 5,
    cancellationRate: 2.1,
    
    // Account status
    accountStatus: 'active',
    tier: 'VIP',
    
    // Investigation flags
    underInvestigation: false,
    investigationCount: 0,
    
    // Alert flags
    activeAlerts: 0,
    recentAlerts: [],
    
    createdAt: new Date('2023-11-20T14:30:00Z'),
    updatedAt: new Date('2024-08-27T11:15:00Z'),
    lastActivityAt: new Date('2024-08-27T11:00:00Z'),
  },
  {
    id: 'pass-003',
    passengerId: 'PSG-003',
    firstName: 'Carlos',
    lastName: 'Martinez',
    email: 'carlos.martinez@example.com',
    phoneNumber: '+639177777777',
    
    // Fraud scoring - High Risk Case
    fraudRiskScore: 87.3,
    paymentRiskScore: 92.0,
    behavioralRiskScore: 78.5,
    identityRiskScore: 95.0, // Very suspicious
    
    // Verification status
    identityVerified: false,
    documentVerified: false,
    paymentMethodVerified: false,
    
    // Activity metrics
    totalBookings: 89,
    totalSpent: 2340.00,
    bookingsToday: 12, // Unusually high
    cancellationRate: 45.2, // Very high
    
    // Account status
    accountStatus: 'under_investigation',
    tier: 'Suspended',
    
    // Investigation flags
    underInvestigation: true,
    investigationCount: 3,
    lastInvestigationDate: new Date('2024-08-25T16:00:00Z'),
    
    // Alert flags
    activeAlerts: 7,
    recentAlerts: [],
    
    createdAt: new Date('2024-08-01T12:00:00Z'),
    updatedAt: new Date('2024-08-27T12:00:00Z'),
    lastActivityAt: new Date('2024-08-27T11:55:00Z'),
  },
  {
    id: 'pass-004',
    passengerId: 'PSG-004',
    firstName: 'Lisa',
    lastName: 'Chen',
    email: 'lisa.chen@example.com',
    phoneNumber: '+639166666666',
    
    // Fraud scoring - Account Sharing Case
    fraudRiskScore: 72.1,
    paymentRiskScore: 35.0,
    behavioralRiskScore: 85.5, // High due to sharing
    identityRiskScore: 25.0,
    
    // Verification status
    identityVerified: true,
    documentVerified: true,
    paymentMethodVerified: true,
    
    // Activity metrics
    totalBookings: 456,
    totalSpent: 23100.75,
    bookingsToday: 8,
    cancellationRate: 8.3,
    
    // Account status
    accountStatus: 'active',
    tier: 'Premium',
    
    // Investigation flags
    underInvestigation: true,
    investigationCount: 1,
    lastInvestigationDate: new Date('2024-08-20T09:00:00Z'),
    
    // Alert flags
    activeAlerts: 3,
    recentAlerts: [],
    
    createdAt: new Date('2024-01-10T10:00:00Z'),
    updatedAt: new Date('2024-08-27T13:00:00Z'),
    lastActivityAt: new Date('2024-08-27T12:45:00Z'),
  }
];

// =====================================================
// PAYMENT FRAUD ANALYTICS
// =====================================================

export const mockPaymentFraudAnalytics: PaymentFraudAnalytics[] = [
  {
    id: 'pfa-001',
    transactionId: 'TXN-20240827-001',
    passengerId: 'PSG-001',
    bookingId: 'bkg-001',
    
    paymentMethod: 'credit_card',
    paymentProcessor: 'stripe',
    cardFingerprint: 'fp_abc123def456',
    amount: 285.50,
    currency: 'PHP',
    
    fraudScore: 75.5, // High risk
    stolenCardProbability: 0.85,
    velocityFraudScore: 60.0,
    
    cardValidationStatus: 'requires_review',
    cvvMatch: false, // Red flag
    avsMatch: true,
    binCountryMatch: false, // Red flag
    
    isChargeback: false,
    isDeclined: true, // Red flag
    isSuspicious: true,
    requiresManualReview: true,
    
    detectionMethods: ['ml_model', 'payment_gateway'],
    fraudIndicators: {
      unusual_velocity: true,
      foreign_card: true,
      failed_cvv: true,
      high_amount: false
    },
    riskFactors: {
      decline_rate: 'high',
      card_country: 'mismatch',
      user_behavior: 'suspicious'
    },
    
    transactionLocation: { latitude: 14.6760, longitude: 121.0437 },
    ipLocation: { latitude: 40.7128, longitude: -74.0060 }, // NYC - suspicious
    locationMismatch: true,
    
    transactionTimestamp: new Date('2024-08-27T09:00:00Z'),
    processedAt: new Date('2024-08-27T09:00:30Z'),
  },
  {
    id: 'pfa-002',
    transactionId: 'TXN-20240827-002',
    passengerId: 'PSG-002',
    bookingId: 'bkg-002',
    
    paymentMethod: 'gcash',
    paymentProcessor: 'gcash',
    amount: 65.00,
    currency: 'PHP',
    
    fraudScore: 8.2, // Low risk
    stolenCardProbability: 0.05,
    velocityFraudScore: 10.0,
    
    cardValidationStatus: 'verified',
    
    isChargeback: false,
    isDeclined: false,
    isSuspicious: false,
    requiresManualReview: false,
    
    detectionMethods: ['behavioral_analysis'],
    fraudIndicators: {},
    riskFactors: {},
    
    transactionLocation: { latitude: 14.6042, longitude: 120.9822 },
    ipLocation: { latitude: 14.6042, longitude: 120.9822 },
    locationMismatch: false,
    
    transactionTimestamp: new Date('2024-08-27T07:28:00Z'),
    processedAt: new Date('2024-08-27T07:28:15Z'),
  }
];

// =====================================================
// FRAUD ALERTS
// =====================================================

export const mockFraudAlerts: FraudAlert[] = [
  {
    id: 'alert-001',
    alertType: 'payment_fraud',
    severity: 'high',
    status: 'active',
    
    passengerId: 'PSG-001',
    transactionId: 'TXN-20240827-001',
    
    title: 'Suspected Stolen Credit Card',
    description: 'Transaction declined with failed CVV and foreign card indicators',
    fraudScore: 85.5,
    confidenceScore: 0.92,
    
    detectionMethod: 'payment_gateway',
    modelUsed: 'payment_fraud_v2.1',
    ruleTriggered: 'HIGH_RISK_CARD_PATTERN',
    
    evidence: {
      declined_transaction: true,
      cvv_mismatch: true,
      foreign_card: true,
      ip_location_mismatch: true
    },
    supportingData: {
      transaction_amount: 285.50,
      card_country: 'US',
      user_location: 'Philippines'
    },
    
    investigationStatus: 'pending',
    
    incidentLocation: { latitude: 14.6760, longitude: 121.0437 },
    locationDescription: 'SM North EDSA, Quezon City',
    
    detectedAt: new Date('2024-08-27T09:01:00Z'),
    
    escalated: false,
    
    createdAt: new Date('2024-08-27T09:01:00Z'),
    updatedAt: new Date('2024-08-27T09:01:00Z'),
  },
  {
    id: 'alert-002',
    alertType: 'account_sharing',
    severity: 'medium',
    status: 'investigating',
    
    passengerId: 'PSG-004',
    
    title: 'Multiple Device Usage Pattern',
    description: 'Account accessed from 5 different devices in 24 hours',
    fraudScore: 68.3,
    confidenceScore: 0.78,
    
    detectionMethod: 'device_fingerprinting',
    modelUsed: 'behavioral_analysis_v1.5',
    ruleTriggered: 'MULTI_DEVICE_SHARING',
    
    evidence: {
      device_count_24h: 5,
      simultaneous_sessions: true,
      different_ip_addresses: true
    },
    supportingData: {
      primary_device: 'iPhone 12',
      detected_devices: ['Android Samsung', 'iPad', 'Windows PC', 'iPhone 13']
    },
    
    assignedTo: 'fraud-analyst-001',
    investigationStatus: 'in_progress',
    
    detectedAt: new Date('2024-08-26T14:30:00Z'),
    acknowledgedAt: new Date('2024-08-26T15:00:00Z'),
    
    escalated: false,
    
    createdAt: new Date('2024-08-26T14:30:00Z'),
    updatedAt: new Date('2024-08-26T15:00:00Z'),
  },
  {
    id: 'alert-003',
    alertType: 'collusion',
    severity: 'critical',
    status: 'investigating',
    
    driverId: 'drv-003',
    passengerId: 'PSG-003',
    
    title: 'Driver-Passenger Collusion Detected',
    description: 'Suspicious pattern: 15 rides between same driver-passenger pair in 3 days',
    fraudScore: 94.2,
    confidenceScore: 0.96,
    
    detectionMethod: 'cross_correlation',
    modelUsed: 'collusion_detection_v1.8',
    ruleTriggered: 'HIGH_FREQUENCY_COLLUSION',
    
    evidence: {
      ride_count_3days: 15,
      fake_route_probability: 0.89,
      payment_manipulation: true,
      rating_manipulation: true
    },
    supportingData: {
      average_rides_per_pair: 1.2,
      suspicious_locations: ['Remote areas', 'Construction sites'],
      inflated_fares: true
    },
    
    assignedTo: 'fraud-analyst-002',
    investigationStatus: 'priority_investigation',
    investigationNotes: 'Escalated to senior investigator - potential organized fraud ring',
    
    detectedAt: new Date('2024-08-25T11:00:00Z'),
    acknowledgedAt: new Date('2024-08-25T11:15:00Z'),
    
    escalated: true,
    escalatedAt: new Date('2024-08-25T12:00:00Z'),
    escalationReason: 'High fraud score and potential network involvement',
    
    createdAt: new Date('2024-08-25T11:00:00Z'),
    updatedAt: new Date('2024-08-25T12:30:00Z'),
  }
];

// =====================================================
// COLLUSION DETECTION
// =====================================================

export const mockCollusionDetection: CollusionDetection[] = [
  {
    id: 'collusion-001',
    driverId: 'drv-003',
    passengerId: 'PSG-003',
    
    collusionScore: 94.2,
    suspiciousRideCount: 15,
    fakeRideProbability: 0.89,
    
    routeManipulationScore: 87.5,
    timingPatternScore: 92.1,
    locationPatternScore: 88.3,
    paymentPatternScore: 95.7,
    
    suspiciousRides: [
      {
        bookingId: 'bkg-suspicious-001',
        suspiciousFactors: ['Remote location', 'Inflated fare', 'Quick completion'],
        fraudScore: 91.2,
        routeDeviation: 78.5,
        timestamp: new Date('2024-08-25T08:00:00Z')
      },
      {
        bookingId: 'bkg-suspicious-002',
        suspiciousFactors: ['Construction site pickup', 'No actual passenger', 'Cash payment'],
        fraudScore: 96.8,
        routeDeviation: 85.2,
        timestamp: new Date('2024-08-25T10:30:00Z')
      }
    ],
    patternIndicators: {
      consistent_timing: true,
      isolated_locations: true,
      above_average_fares: true,
      quick_completions: true
    },
    correlationFactors: {
      driver_passenger_familiarity: 0.95,
      location_coordination: 0.88,
      payment_coordination: 0.92
    },
    
    investigationStatus: 'priority_investigation',
    manualReviewRequired: true,
    evidenceQuality: 0.94,
    
    firstSuspiciousRide: new Date('2024-08-23T06:00:00Z'),
    lastSuspiciousRide: new Date('2024-08-25T16:30:00Z'),
    patternDurationDays: 3,
    
    status: 'active',
    
    createdAt: new Date('2024-08-25T11:00:00Z'),
    updatedAt: new Date('2024-08-25T16:45:00Z'),
  }
];

// =====================================================
// ENHANCED DRIVERS WITH FRAUD DETECTION
// =====================================================

export const mockEnhancedDrivers: EnhancedDriver[] = [
  {
    id: 'drv-001',
    driverCode: 'XPR001',
    firstName: 'Juan',
    lastName: 'dela Cruz',
    email: 'juan.delacruz@example.com',
    phoneNumber: '+639171234567',
    
    // Enhanced fraud properties
    fraudRiskScore: 25.3,
    mlConfidenceScore: 0.82,
    investigationStatus: 'clear',
    lastRiskAssessment: new Date('2024-08-27T06:00:00Z'),
    
    // Cross-system correlation
    operationalRiskScore: 15.2,
    combinedRiskScore: 18.7,
    correlationScore: 0.23,
    
    // Collusion indicators
    collusionSuspected: false,
    suspiciousPassengerCount: 0,
    
    // Investigation flags
    underInvestigation: false,
    investigationCount: 0,
    
    // Alert flags
    activeAlerts: 0,
    recentAlerts: [],
  },
  {
    id: 'drv-002',
    driverCode: 'XPR002',
    firstName: 'Maria',
    lastName: 'Santos',
    email: 'maria.santos@example.com',
    phoneNumber: '+639179876543',
    
    // Enhanced fraud properties
    fraudRiskScore: 45.8,
    mlConfidenceScore: 0.67,
    investigationStatus: 'monitoring',
    lastRiskAssessment: new Date('2024-08-27T06:00:00Z'),
    
    // Cross-system correlation
    operationalRiskScore: 38.5,
    combinedRiskScore: 41.2,
    correlationScore: 0.52,
    
    // Collusion indicators
    collusionSuspected: false,
    suspiciousPassengerCount: 1,
    
    // Investigation flags
    underInvestigation: false,
    investigationCount: 1,
    
    // Alert flags
    activeAlerts: 2,
    recentAlerts: [],
  },
  {
    id: 'drv-003',
    driverCode: 'XPR003',
    employeeId: 'EMP-2024-003',
    firstName: 'Carlos',
    lastName: 'Rodriguez',
    email: 'carlos.rodriguez@example.com',
    phoneNumber: '+639155555555',
    
    // Enhanced fraud properties - High Risk Driver
    fraudRiskScore: 89.7,
    mlConfidenceScore: 0.94,
    investigationStatus: 'investigating',
    lastRiskAssessment: new Date('2024-08-27T06:00:00Z'),
    
    // Cross-system correlation
    operationalRiskScore: 72.3,
    combinedRiskScore: 85.2,
    correlationScore: 0.87,
    
    // Collusion indicators
    collusionSuspected: true,
    suspiciousPassengerCount: 3,
    
    // Investigation flags
    underInvestigation: true,
    investigationCount: 2,
    
    // Alert flags
    activeAlerts: 5,
    recentAlerts: [],
  }
];

// =====================================================
// CHARGEBACK MANAGEMENT
// =====================================================

export const mockChargebackManagement: ChargebackManagement[] = [
  {
    id: 'cb-001',
    transactionId: 'TXN-20240815-001',
    passengerId: 'PSG-001',
    bookingId: 'bkg-historical-001',
    
    chargebackId: 'CB-2024-001',
    chargebackType: 'fraudulent_transaction',
    chargebackReasonCode: '4855',
    chargebackAmount: 450.00,
    
    status: 'received',
    disputeStatus: 'pending',
    
    isFraudulent: true,
    investigationNotes: 'Passenger claims unauthorized transaction. Card reported stolen 2 days after ride.',
    evidenceProvided: [
      { type: 'police_report', status: 'submitted' },
      { type: 'bank_statement', status: 'submitted' }
    ],
    
    recoveryAmount: 0.00,
    
    chargebackDate: new Date('2024-08-20T10:00:00Z'),
    disputeDeadline: new Date('2024-09-20T23:59:59Z'),
    createdAt: new Date('2024-08-20T10:00:00Z'),
  }
];

// =====================================================
// PASSENGER BEHAVIORAL ANALYTICS
// =====================================================

export const mockPassengerBehavioralAnalytics: PassengerBehavioralAnalytics[] = [
  {
    id: 'pba-001',
    passengerId: 'PSG-003',
    analysisDate: new Date('2024-08-27'),
    
    // Booking behavior - Suspicious
    bookingFrequencyScore: 25.3, // Very frequent bookings
    bookingTimePatterns: { unusual_hours: true, consistent_times: false },
    bookingLocationPatterns: { remote_areas: true, construction_sites: true },
    cancellationRate: 45.2,
    
    // Payment behavior
    paymentMethodConsistency: 15.8, // Constantly changing payment methods
    paymentVelocityScore: 35.2,
    unusualPaymentLocations: 8,
    
    // Device and location patterns
    deviceConsistencyScore: 22.1, // Multiple devices
    locationConsistencyScore: 18.7, // Inconsistent locations
    suspiciousLocations: 12,
    
    // Social behavior
    referralAbuseIndicators: { mass_referrals: true, fake_accounts: true },
    accountSharingIndicators: { simultaneous_logins: true, device_sharing: true },
    
    // Overall scoring
    overallBehaviorScore: 22.8, // Very suspicious
    anomalyFlags: [
      'high_cancellation_rate',
      'unusual_booking_patterns',
      'multiple_payment_methods',
      'device_sharing_detected',
      'referral_abuse'
    ],
    
    // Risk assessment
    riskLevel: 'critical',
    recommendedActions: [
      'immediate_investigation',
      'account_suspension',
      'manual_verification',
      'enhanced_monitoring'
    ],
    
    createdAt: new Date('2024-08-27T06:00:00Z'),
  },
  {
    id: 'pba-002',
    passengerId: 'PSG-002',
    analysisDate: new Date('2024-08-27'),
    
    // Booking behavior - Normal
    bookingFrequencyScore: 85.7,
    bookingTimePatterns: { consistent_commute: true, business_hours: true },
    bookingLocationPatterns: { home_work_routine: true, familiar_areas: true },
    cancellationRate: 2.1,
    
    // Payment behavior
    paymentMethodConsistency: 92.3,
    paymentVelocityScore: 88.5,
    unusualPaymentLocations: 0,
    
    // Device and location patterns
    deviceConsistencyScore: 95.8,
    locationConsistencyScore: 91.2,
    suspiciousLocations: 0,
    
    // Social behavior
    referralAbuseIndicators: {},
    accountSharingIndicators: {},
    
    // Overall scoring
    overallBehaviorScore: 91.3, // Excellent
    anomalyFlags: [],
    
    // Risk assessment
    riskLevel: 'low',
    recommendedActions: ['continue_monitoring'],
    
    createdAt: new Date('2024-08-27T06:00:00Z'),
  }
];

// =====================================================
// FRAUD INVESTIGATIONS
// =====================================================

export const mockFraudInvestigations: FraudInvestigation[] = [
  {
    id: 'inv-001',
    caseNumber: 'CO-2024-0001',
    investigationType: 'collusion',
    priority: 'critical',
    status: 'open',
    
    primarySuspectId: 'drv-003',
    suspectType: 'driver',
    secondarySuspects: ['PSG-003'],
    
    caseTitle: 'Driver-Passenger Collusion Ring Investigation',
    caseDescription: 'Investigation into suspected organized fraud involving multiple fake rides and fare manipulation',
    suspectedFraudAmount: 15750.00,
    
    leadInvestigator: 'fraud-analyst-002',
    assignedInvestigators: ['fraud-analyst-001', 'fraud-analyst-003'],
    externalAgencies: [],
    
    evidenceCollected: [
      {
        id: 'ev-001',
        type: 'gps_tracking',
        description: 'GPS logs showing suspicious route patterns',
        metadata: { rides_analyzed: 15, anomaly_score: 0.94 },
        collectedAt: new Date('2024-08-25T14:00:00Z'),
        collectedBy: 'fraud-analyst-002'
      },
      {
        id: 'ev-002',
        type: 'payment_records',
        description: 'Transaction records showing fare manipulation',
        metadata: { transactions_analyzed: 15, inflation_rate: 2.3 },
        collectedAt: new Date('2024-08-25T15:30:00Z'),
        collectedBy: 'fraud-analyst-001'
      }
    ],
    digitalEvidenceUrls: [
      '/evidence/gps-logs-drv003-psg003.json',
      '/evidence/payment-analysis-case-001.pdf'
    ],
    witnessStatements: [],
    
    caseOpened: new Date('2024-08-25T12:00:00Z'),
    lastActivity: new Date('2024-08-27T10:30:00Z'),
    targetResolutionDate: new Date('2024-09-10'),
    
    investigationOutcome: undefined,
    fraudConfirmed: undefined,
    recoveryAmount: 0.00,
    actionsTaken: [
      'Enhanced monitoring activated',
      'Account restrictions applied',
      'Evidence collection in progress'
    ],
    
    legalActionRequired: false,
    lawEnforcementNotified: false,
    
    createdAt: new Date('2024-08-25T12:00:00Z'),
    updatedAt: new Date('2024-08-27T10:30:00Z'),
  }
];

// =====================================================
// UTILITY FUNCTIONS
// =====================================================

export const getFraudRiskLevel = (score: number): RiskLevel => {
  if (score >= 80) return 'critical';
  if (score >= 60) return 'high';
  if (score >= 40) return 'medium';
  return 'low';
};

export const getFraudRiskColor = (score: number): string => {
  const level = getFraudRiskLevel(score);
  switch (level) {
    case 'critical': return 'text-red-600 bg-red-50';
    case 'high': return 'text-orange-600 bg-orange-50';
    case 'medium': return 'text-yellow-600 bg-yellow-50';
    case 'low': return 'text-green-600 bg-green-50';
    default: return 'text-gray-600 bg-gray-50';
  }
};

export const getFraudRiskBadge = (score: number): string => {
  const level = getFraudRiskLevel(score);
  switch (level) {
    case 'critical': return '🔴';
    case 'high': return '🟠';
    case 'medium': return '🟡';
    case 'low': return '🟢';
    default: return '⚪';
  }
};

export const getInvestigationStatusBadge = (status: string): string => {
  switch (status) {
    case 'clear': return '✅';
    case 'monitoring': return '👀';
    case 'investigating': return '🔍';
    case 'suspended': return '⛔';
    default: return '❓';
  }
};

// Export all mock data
export const fraudMockData = {
  passengers: mockEnhancedPassengers,
  drivers: mockEnhancedDrivers,
  paymentFraud: mockPaymentFraudAnalytics,
  alerts: mockFraudAlerts,
  collusion: mockCollusionDetection,
  chargebacks: mockChargebackManagement,
  behavioralAnalytics: mockPassengerBehavioralAnalytics,
  investigations: mockFraudInvestigations,
};