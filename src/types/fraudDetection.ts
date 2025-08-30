// Advanced Fraud Detection Types for Xpress Philippines
// Targeting: Rider Incentive Fraud, GPS Spoofing, Multi-accounting

export interface FraudAlert {
  id: string;
  timestamp: Date;
  alertType: FraudAlertType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'active' | 'investigating' | 'resolved' | 'false_positive';
  
  // Subject information
  subjectType: 'rider' | 'driver' | 'transaction' | 'ride';
  subjectId: string;
  
  // Alert details
  title: string;
  description: string;
  fraudScore: number; // 0-100
  confidence: number; // 0-100
  
  // Evidence
  evidence: FraudEvidence[];
  patterns: DetectedPattern[];
  riskFactors: RiskFactor[];
  
  // Geographic context (Philippines-specific)
  location?: PhilippinesLocation;
  
  // Review information
  reviewedBy?: string;
  reviewedAt?: Date;
  reviewNotes?: string;
  actionTaken?: FraudAction;
  
  // Financial impact
  estimatedLoss?: number;
  currency: 'PHP' | 'USD';
}

export type FraudAlertType = 
  | 'rider_incentive_fraud'
  | 'gps_spoofing' 
  | 'multi_accounting'
  | 'fake_rides'
  | 'payment_fraud'
  | 'driver_collusion'
  | 'promo_abuse'
  | 'rating_manipulation'
  | 'identity_theft'
  | 'device_fraud';

export interface FraudEvidence {
  type: 'device' | 'location' | 'behavior' | 'financial' | 'network' | 'temporal';
  description: string;
  data: Record<string, unknown>;
  weight: number; // Impact on fraud score
  timestamp: Date;
}

export interface DetectedPattern {
  patternType: string;
  description: string;
  frequency: number;
  timespan: string;
  examples: string[];
  riskLevel: 'low' | 'medium' | 'high';
}

export interface RiskFactor {
  factor: string;
  value: string | number | boolean;
  riskContribution: number;
  explanation: string;
}

export interface PhilippinesLocation {
  city: string;
  province: string;
  region: string;
  barangay?: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  riskProfile: 'low' | 'medium' | 'high'; // Based on fraud history in area
}

export type FraudAction = 
  | 'account_suspended'
  | 'account_flagged'
  | 'transaction_blocked'
  | 'requires_verification'
  | 'manual_review'
  | 'payment_held'
  | 'no_action';

// Rider Incentive Fraud Detection
export interface RiderIncentiveFraud {
  riderId: string;
  
  // Suspicious patterns
  unusualRideFrequency: boolean;
  shortRidePattern: boolean;
  sameRouteRepeating: boolean;
  unusualTiming: boolean;
  
  // Incentive exploitation
  promoCodeAbuse: number;
  referralFraud: boolean;
  bonusHunting: boolean;
  
  // Behavioral indicators
  rideCompletionRate: number;
  cancelationPattern: string[];
  ratingGiven: number[];
  
  // Geographic anomalies (Philippines context)
  crossRegionRides: boolean;
  remoteAreaTargeting: boolean;
  
  fraudScore: number;
}

// GPS Spoofing Detection
export interface GPSSpoofingDetection {
  rideId: string;
  driverId?: string;
  riderId?: string;
  
  // Location anomalies
  impossibleSpeed: boolean;
  teleportation: boolean;
  locationJumps: GPSJump[];
  
  // Device indicators
  mockLocationApp: boolean;
  rootedDevice: boolean;
  developerOptions: boolean;
  
  // Route analysis
  routeDeviation: number;
  straightLineMovement: boolean;
  unrealisticTraffic: boolean;
  
  // Philippines-specific checks
  outsideServiceArea: boolean;
  restrictedZones: string[];
  
  // Sensor data inconsistencies
  accelerometerMismatch: boolean;
  gyroscopeMismatch: boolean;
  magnetometerAnomaly: boolean;
  
  confidenceScore: number;
}

export interface GPSJump {
  fromLocation: { lat: number; lng: number };
  toLocation: { lat: number; lng: number };
  distance: number; // meters
  timeElapsed: number; // seconds
  impossibleSpeed: number; // km/h
  timestamp: Date;
}

// Multi-accounting Detection
export interface MultiAccountingDetection {
  primaryAccountId: string;
  suspectedAccounts: SuspectedAccount[];
  
  // Device fingerprinting
  sharedDevices: string[];
  deviceSimilarity: number;
  
  // Network analysis
  sharedIPAddresses: string[];
  similarNetworkPatterns: boolean;
  
  // Behavioral patterns
  similarRidePatterns: boolean;
  identicalPreferences: boolean;
  timingCorrelation: number;
  
  // Identity overlap
  sharedPaymentMethods: boolean;
  similarPersonalInfo: PersonalInfoSimilarity;
  sharedContacts: boolean;
  
  // Geographic overlap
  sharedLocations: string[];
  proximityScore: number;
  
  // Philippines-specific indicators
  sharedBarangay: boolean;
  familialConnections: boolean;
  
  riskScore: number;
}

export interface SuspectedAccount {
  accountId: string;
  accountType: 'rider' | 'driver';
  creationDate: Date;
  similarityScore: number;
  sharedAttributes: string[];
  lastActivity: Date;
}

export interface PersonalInfoSimilarity {
  nameMatch: number;
  phoneMatch: boolean;
  emailSimilarity: number;
  addressMatch: number;
}

// Fraud Detection Rules Engine
export interface FraudRule {
  id: string;
  name: string;
  description: string;
  category: FraudAlertType;
  
  // Rule logic
  conditions: RuleCondition[];
  threshold: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  
  // Configuration
  enabled: boolean;
  autoAction: boolean;
  action: FraudAction;
  
  // Performance metrics
  accuracy: number;
  falsePositiveRate: number;
  
  // Philippines-specific settings
  regionSpecific: boolean;
  applicableRegions?: string[];
  
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export interface RuleCondition {
  field: string;
  operator: 'equals' | 'greater_than' | 'less_than' | 'contains' | 'in' | 'not_in' | 'pattern_match';
  value: string | number | boolean | string[] | number[];
  weight: number;
}

// Fraud Analytics and Reporting
export interface FraudAnalytics {
  period: DateRange;
  
  // Alert metrics
  totalAlerts: number;
  alertsByType: Record<FraudAlertType, number>;
  alertsBySeverity: Record<string, number>;
  
  // Geographic distribution (Philippines)
  alertsByRegion: Record<string, number>;
  alertsByCity: Record<string, number>;
  
  // Financial impact
  estimatedLosses: number;
  preventedLosses: number;
  
  // Performance metrics
  falsePositiveRate: number;
  detectionAccuracy: number;
  averageResponseTime: number;
  
  // Trends
  trendData: TrendPoint[];
  topRiskFactors: string[];
  
  // Philippines-specific insights
  peakFraudHours: number[];
  seasonalPatterns: string[];
  regionalRiskProfiles: Record<string, string>;
}

export interface DateRange {
  start: Date;
  end: Date;
}

export interface TrendPoint {
  date: Date;
  alerts: number;
  fraudScore: number;
  losses: number;
}

// Real-time Fraud Monitoring
export interface FraudMonitor {
  id: string;
  name: string;
  description: string;
  
  // Monitoring scope
  entityTypes: ('rider' | 'driver' | 'ride' | 'transaction')[];
  regions: string[];
  
  // Thresholds
  alertThreshold: number;
  criticalThreshold: number;
  
  // Actions
  realTimeBlocking: boolean;
  autoEscalation: boolean;
  notificationChannels: string[];
  
  // Status
  active: boolean;
  lastTriggered?: Date;
  
  // Performance
  alertsGenerated: number;
  accuracy: number;
}

// Fraud Investigation Workflow
export interface FraudInvestigation {
  id: string;
  alertId: string;
  
  // Investigation details
  investigator: string;
  status: 'open' | 'in_progress' | 'awaiting_info' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  
  // Timeline
  createdAt: Date;
  assignedAt?: Date;
  resolvedAt?: Date;
  
  // Investigation data
  findings: string[];
  additionalEvidence: FraudEvidence[];
  interviewNotes?: string;
  
  // Outcome
  conclusion: 'fraud_confirmed' | 'false_positive' | 'inconclusive' | 'legitimate';
  actionTaken: FraudAction;
  preventionMeasures: string[];
  
  // Financial
  actualLoss?: number;
  recoveredAmount?: number;
}

// Device and Behavior Analysis
export interface DeviceFingerprint {
  deviceId: string;
  userId: string;
  userType: 'rider' | 'driver';
  
  // Device information
  platform: string;
  model: string;
  osVersion: string;
  appVersion: string;
  
  // Technical indicators
  isRooted: boolean;
  hasMockLocation: boolean;
  developerOptionsEnabled: boolean;
  
  // Behavioral patterns
  usagePatterns: UsagePattern[];
  networkPatterns: NetworkPattern[];
  
  // Risk assessment
  riskScore: number;
  lastRiskUpdate: Date;
  
  // Philippines-specific
  commonCarriers: string[]; // Globe, Smart, DITO
  locationHistory: PhilippinesLocation[];
}

export interface UsagePattern {
  pattern: string;
  frequency: number;
  lastObserved: Date;
  riskWeight: number;
}

export interface NetworkPattern {
  ipAddress: string;
  carrier: string;
  location: string;
  frequency: number;
  riskLevel: 'low' | 'medium' | 'high';
}