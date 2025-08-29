// =====================================================
// COMPREHENSIVE FRAUD DETECTION TYPES
// =====================================================

export type FraudCategory = 
  | 'payment_fraud'
  | 'identity_fraud'
  | 'ride_manipulation'
  | 'rating_fraud'
  | 'referral_fraud'
  | 'account_sharing'
  | 'collusion'
  | 'fake_requests'
  | 'chargeback_fraud'
  | 'document_fraud';

export type DetectionMethod = 
  | 'ml_model'
  | 'behavioral_analysis'
  | 'device_fingerprinting'
  | 'location_analysis'
  | 'payment_gateway'
  | 'document_verification'
  | 'cross_correlation'
  | 'manual_review';

export type VerificationStatus = 
  | 'pending'
  | 'verified'
  | 'rejected'
  | 'requires_review'
  | 'expired'
  | 'fraudulent';

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

// =====================================================
// PASSENGER FRAUD DETECTION INTERFACES
// =====================================================

export interface PassengerFraudProfile {
  id: string;
  passengerId: string;
  
  // Identity verification
  identityVerificationStatus: VerificationStatus;
  identityVerificationDate?: Date;
  documentVerification: Record<string, any>;
  biometricVerification: Record<string, any>;
  
  // Fraud risk scoring
  fraudRiskScore: number;
  paymentRiskScore: number;
  behavioralRiskScore: number;
  identityRiskScore: number;
  
  // Account security flags
  accountSharingDetected: boolean;
  multipleAccountsDetected: boolean;
  stolenIdentitySuspected: boolean;
  
  // Behavioral patterns
  bookingPatterns: BookingPatterns;
  paymentPatterns: PaymentPatterns;
  devicePatterns: DevicePatterns;
  locationPatterns: LocationPatterns;
  
  // ML scores
  mlConfidenceScore: number;
  anomalyScore: number;
  
  // Investigation status
  investigationStatus: string;
  lastInvestigationDate?: Date;
  
  // Fraud flags
  activeFraudFlags: string[];
  resolvedFraudFlags: string[];
  
  createdAt: Date;
  updatedAt: Date;
}

export interface BookingPatterns {
  averageBookingsPerDay: number;
  preferredTimeSlots: string[];
  frequentRoutes: RoutePattern[];
  cancellationRate: number;
  unusualBookingTimes: number;
  locationConsistency: number;
}

export interface PaymentPatterns {
  primaryPaymentMethods: string[];
  paymentMethodChanges: number;
  unusualPaymentTimes: number;
  velocityScore: number;
  chargebackCount: number;
  declinedPaymentCount: number;
}

export interface DevicePatterns {
  primaryDevices: DeviceInfo[];
  deviceChanges: number;
  multipleDevicesDetected: boolean;
  suspiciousDeviceActivity: number;
  emulatorDetected: boolean;
  rootedJailbrokenDetected: boolean;
}

export interface LocationPatterns {
  commonLocations: GeoLocation[];
  locationConsistency: number;
  unusualLocationCount: number;
  vpnProxyDetected: boolean;
  locationSpoofingDetected: boolean;
}

// =====================================================
// PAYMENT FRAUD DETECTION
// =====================================================

export interface PaymentFraudAnalytics {
  id: string;
  transactionId: string;
  passengerId: string;
  bookingId?: string;
  
  // Payment details
  paymentMethod: string;
  paymentProcessor?: string;
  cardFingerprint?: string;
  amount: number;
  currency: string;
  
  // Fraud indicators
  fraudScore: number;
  stolenCardProbability: number;
  velocityFraudScore: number;
  
  // Card validation
  cardValidationStatus: VerificationStatus;
  cvvMatch?: boolean;
  avsMatch?: boolean;
  binCountryMatch?: boolean;
  
  // Fraud flags
  isChargeback: boolean;
  isDeclined: boolean;
  isSuspicious: boolean;
  requiresManualReview: boolean;
  
  // Detection details
  detectionMethods: DetectionMethod[];
  fraudIndicators: Record<string, any>;
  riskFactors: Record<string, any>;
  
  // Geographic analysis
  transactionLocation?: GeoLocation;
  ipLocation?: GeoLocation;
  locationMismatch: boolean;
  
  transactionTimestamp: Date;
  processedAt: Date;
}

export interface ChargebackManagement {
  id: string;
  transactionId: string;
  passengerId: string;
  bookingId?: string;
  
  // Chargeback details
  chargebackId: string;
  chargebackType: string;
  chargebackReasonCode?: string;
  chargebackAmount: number;
  
  // Status tracking
  status: string;
  disputeStatus: string;
  
  // Investigation
  isFraudulent?: boolean;
  investigationNotes?: string;
  evidenceProvided: any[];
  
  // Outcomes
  resolution?: string;
  recoveryAmount: number;
  
  chargebackDate: Date;
  disputeDeadline?: Date;
  resolvedDate?: Date;
  createdAt: Date;
}

// =====================================================
// BEHAVIORAL ANALYTICS
// =====================================================

export interface PassengerBehavioralAnalytics {
  id: string;
  passengerId: string;
  analysisDate: Date;
  
  // Booking behavior
  bookingFrequencyScore: number;
  bookingTimePatterns: Record<string, any>;
  bookingLocationPatterns: Record<string, any>;
  cancellationRate: number;
  
  // Payment behavior
  paymentMethodConsistency: number;
  paymentVelocityScore: number;
  unusualPaymentLocations: number;
  
  // Device and location patterns
  deviceConsistencyScore: number;
  locationConsistencyScore: number;
  suspiciousLocations: number;
  
  // Social behavior
  referralAbuseIndicators: Record<string, any>;
  accountSharingIndicators: Record<string, any>;
  
  // Overall scoring
  overallBehaviorScore: number;
  anomalyFlags: string[];
  
  // Risk assessment
  riskLevel: RiskLevel;
  recommendedActions: string[];
  
  createdAt: Date;
}

// =====================================================
// COLLUSION DETECTION
// =====================================================

export interface CollusionDetection {
  id: string;
  driverId: string;
  passengerId: string;
  
  // Collusion indicators
  collusionScore: number;
  suspiciousRideCount: number;
  fakeRideProbability: number;
  
  // Pattern analysis
  routeManipulationScore: number;
  timingPatternScore: number;
  locationPatternScore: number;
  paymentPatternScore: number;
  
  // Detection details
  suspiciousRides: SuspiciousRide[];
  patternIndicators: Record<string, any>;
  correlationFactors: Record<string, any>;
  
  // Investigation
  investigationStatus: string;
  manualReviewRequired: boolean;
  evidenceQuality: number;
  
  // Timeline analysis
  firstSuspiciousRide?: Date;
  lastSuspiciousRide?: Date;
  patternDurationDays?: number;
  
  status: string;
  resolvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface SuspiciousRide {
  bookingId: string;
  suspiciousFactors: string[];
  fraudScore: number;
  routeDeviation: number;
  timestamp: Date;
}

// =====================================================
// DEVICE AND IDENTITY VERIFICATION
// =====================================================

export interface DeviceFingerprinting {
  id: string;
  userId: string;
  userType: 'driver' | 'passenger';
  
  // Device identification
  deviceFingerprint: string;
  deviceType?: string;
  operatingSystem?: string;
  browserInfo?: string;
  
  // Location tracking
  ipAddress?: string;
  ipLocation?: GeoLocation;
  gpsLocation?: GeoLocation;
  locationAccuracy?: number;
  
  // Fraud indicators
  isEmulator: boolean;
  isRootedJailbroken: boolean;
  isVpnProxy: boolean;
  multipleAccountsSameDevice: boolean;
  
  // Usage patterns
  sessionDuration?: number; // minutes
  actionsPerSession?: number;
  unusualActivityScore: number;
  
  // Risk assessment
  deviceRiskScore: number;
  trustScore: number;
  
  firstSeen: Date;
  lastSeen: Date;
  sessionCount: number;
}

export interface DocumentVerification {
  id: string;
  userId: string;
  userType: 'driver' | 'passenger';
  documentType: string;
  
  // Document analysis
  documentUrl?: string;
  documentHash?: string;
  ocrExtractedData: Record<string, any>;
  
  // Verification results
  verificationStatus: VerificationStatus;
  fraudScore: number;
  authenticityScore: number;
  
  // Fraud indicators
  isFakeDocument: boolean;
  isAlteredDocument: boolean;
  isExpiredDocument: boolean;
  
  // AI analysis
  aiModelResults: Record<string, any>;
  manualReviewRequired: boolean;
  manualReviewNotes?: string;
  
  // Verification details
  verifiedBy?: string;
  verificationDate?: Date;
  expiryDate?: Date;
  
  createdAt: Date;
  updatedAt: Date;
}

// =====================================================
// FRAUD ALERTS AND INVESTIGATIONS
// =====================================================

export interface FraudAlert {
  id: string;
  alertType: FraudCategory;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'active' | 'investigating' | 'resolved' | 'false_positive';
  
  // Entities involved
  driverId?: string;
  passengerId?: string;
  bookingId?: string;
  transactionId?: string;
  
  // Alert details
  title: string;
  description: string;
  fraudScore: number;
  confidenceScore: number;
  
  // Detection information
  detectionMethod: DetectionMethod;
  modelUsed?: string;
  ruleTriggered?: string;
  
  // Evidence
  evidence: Record<string, any>;
  supportingData: Record<string, any>;
  
  // Investigation
  assignedTo?: string;
  investigationStatus: string;
  investigationNotes?: string;
  
  // Location context
  incidentLocation?: GeoLocation;
  locationDescription?: string;
  
  // Timeline
  detectedAt: Date;
  acknowledgedAt?: Date;
  resolvedAt?: Date;
  
  // Escalation
  escalated: boolean;
  escalatedAt?: Date;
  escalationReason?: string;
  
  createdAt: Date;
  updatedAt: Date;
}

export interface FraudInvestigation {
  id: string;
  caseNumber: string;
  investigationType: FraudCategory;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: string;
  
  // Entities under investigation
  primarySuspectId: string;
  suspectType: 'driver' | 'passenger';
  secondarySuspects: string[];
  
  // Case information
  caseTitle: string;
  caseDescription: string;
  suspectedFraudAmount: number;
  
  // Investigation team
  leadInvestigator: string;
  assignedInvestigators: string[];
  externalAgencies: string[];
  
  // Evidence management
  evidenceCollected: Evidence[];
  digitalEvidenceUrls: string[];
  witnessStatements: WitnessStatement[];
  
  // Timeline
  caseOpened: Date;
  lastActivity: Date;
  targetResolutionDate?: Date;
  caseClosed?: Date;
  
  // Outcomes
  investigationOutcome?: string;
  fraudConfirmed?: boolean;
  recoveryAmount: number;
  actionsTaken: string[];
  
  // Legal proceedings
  legalActionRequired: boolean;
  lawEnforcementNotified: boolean;
  courtCaseReference?: string;
  
  createdAt: Date;
  updatedAt: Date;
}

// =====================================================
// SUPPORTING INTERFACES
// =====================================================

export interface RoutePattern {
  startLocation: GeoLocation;
  endLocation: GeoLocation;
  frequency: number;
  averageDuration: number;
  averageFare: number;
}

export interface GeoLocation {
  latitude: number;
  longitude: number;
  address?: string;
  accuracy?: number;
}

export interface DeviceInfo {
  deviceId: string;
  deviceType: string;
  operatingSystem: string;
  firstSeen: Date;
  lastSeen: Date;
  trustScore: number;
}

export interface Evidence {
  id: string;
  type: string;
  description: string;
  fileUrl?: string;
  metadata: Record<string, any>;
  collectedAt: Date;
  collectedBy: string;
}

export interface WitnessStatement {
  id: string;
  witnessName: string;
  contactInfo: string;
  statement: string;
  statementDate: Date;
  verificationStatus: VerificationStatus;
}

// =====================================================
// ENHANCED USER INTERFACES
// =====================================================

export interface EnhancedPassenger {
  id: string;
  passengerId: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  
  // Enhanced fraud properties
  fraudProfile?: PassengerFraudProfile;
  fraudRiskScore: number;
  paymentRiskScore: number;
  behavioralRiskScore: number;
  identityRiskScore: number;
  
  // Verification status
  identityVerified: boolean;
  documentVerified: boolean;
  paymentMethodVerified: boolean;
  
  // Activity metrics
  totalBookings: number;
  totalSpent: number;
  bookingsToday: number;
  cancellationRate: number;
  
  // Account status
  accountStatus: 'active' | 'suspended' | 'banned' | 'under_investigation';
  tier: 'VIP' | 'Premium' | 'Regular' | 'New' | 'Suspended' | 'Banned';
  
  // Investigation flags
  underInvestigation: boolean;
  investigationCount: number;
  lastInvestigationDate?: Date;
  
  // Alert flags
  activeAlerts: number;
  recentAlerts: FraudAlert[];
  
  createdAt: Date;
  updatedAt: Date;
  lastActivityAt?: Date;
}

export interface EnhancedDriver {
  // All existing driver properties
  id: string;
  driverCode: string;
  employeeId?: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  
  // Enhanced fraud properties
  fraudRiskScore: number;
  mlConfidenceScore: number;
  behavioralAnalytics?: any;
  investigationStatus: 'clear' | 'monitoring' | 'investigating';
  lastRiskAssessment: Date;
  
  // Cross-system correlation
  operationalRiskScore: number;
  combinedRiskScore: number;
  correlationScore: number;
  
  // Collusion indicators
  collusionSuspected: boolean;
  suspiciousPassengerCount: number;
  
  // Investigation flags
  underInvestigation: boolean;
  investigationCount: number;
  
  // Alert flags
  activeAlerts: number;
  recentAlerts: FraudAlert[];
}

// =====================================================
// API RESPONSE TYPES
// =====================================================

export interface FraudDetectionResponse {
  success: boolean;
  data: {
    fraudProbability: number;
    riskCategory: RiskLevel;
    confidence: number;
    factors: string[];
    recommendations: string[];
  };
  modelUsed: string;
  timestamp: Date;
}

export interface FraudAnalyticsResponse {
  success: boolean;
  data: {
    totalUsers: number;
    highRiskUsers: number;
    activeCases: number;
    falsePositiveRate: number;
    detectionAccuracy: number;
    trends: FraudTrend[];
  };
  generatedAt: Date;
}

export interface FraudTrend {
  date: Date;
  fraudCount: number;
  falsePositives: number;
  accuracy: number;
  category: FraudCategory;
}

// =====================================================
// FRAUD DASHBOARD CONFIGURATION
// =====================================================

export interface FraudDashboardConfig {
  riskThresholds: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
  autoAlertRules: FraudRule[];
  investigationWorkflow: WorkflowStep[];
  mlModelConfig: MLModelConfig;
}

export interface FraudRule {
  id: string;
  name: string;
  category: FraudCategory;
  conditions: RuleCondition[];
  actions: RuleAction[];
  isActive: boolean;
}

export interface RuleCondition {
  field: string;
  operator: 'gt' | 'lt' | 'eq' | 'contains' | 'in';
  value: any;
}

export interface RuleAction {
  type: 'alert' | 'investigate' | 'suspend' | 'notify';
  parameters: Record<string, any>;
}

export interface WorkflowStep {
  id: string;
  name: string;
  description: string;
  requiredRole: string[];
  timeLimit?: number; // hours
  autoActions: string[];
}

export interface MLModelConfig {
  modelName: string;
  version: string;
  accuracy: number;
  features: string[];
  thresholds: Record<string, number>;
  retrainingSchedule: string;
}