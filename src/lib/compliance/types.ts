// ========================================
// XPRESS OPS TOWER - COMPLIANCE TYPE DEFINITIONS
// ========================================
// TypeScript interfaces for automated compliance data pipeline
// Philippine Regulatory Compliance: NPC | LTFRB | DOLE
// ========================================

// ========================================
// 1. NPC DATA PRIVACY (RA 10173) TYPES
// ========================================

export interface DataProcessingRegistry {
  id?: number;
  tableName: string;
  schemaName: string;
  dataType: 'PII' | 'Financial' | 'Location' | 'Biometric';
  dataCategory: string;
  recordCount: number;
  sensitiveFields: string[];
  processingPurpose: string;
  legalBasis: 'consent' | 'contract' | 'legitimate_interest' | 'legal_obligation';
  retentionPeriod: string;
  lastUpdated: Date;
  createdAt: Date;
}

export interface ConsentLog {
  id?: number;
  userId: number;
  userType: 'rider' | 'driver' | 'admin';
  consentType: 'data_processing' | 'marketing' | 'location_tracking' | 'analytics';
  consentVersion: string;
  consentGiven: boolean;
  previousConsent?: boolean;
  consentMethod: 'checkbox' | 'verbal' | 'implied' | 'opt_out';
  timestamp: Date;
  expiresAt?: Date;
  ipAddress?: string;
  userAgent?: string;
  appVersion?: string;
  geolocation?: { lat: number; lng: number };
  withdrawalReason?: string;
}

export interface PIIAccessLog {
  id?: number;
  accessorId: number;
  accessorType: 'admin' | 'system' | 'api';
  accessedTable: string;
  accessedRecordId?: number;
  accessType: 'read' | 'write' | 'delete' | 'export';
  dataFields: string[];
  accessReason?: string;
  sessionId: string;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
  durationMs: number;
}

export interface BreachMonitoring {
  id?: number;
  incidentType: 'mass_export' | 'unauthorized_access' | 'data_leak' | 'system_breach';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  affectedRecords: number;
  affectedDataTypes: string[];
  detectionMethod: 'automated' | 'manual' | 'reported';
  detectedBy?: number;
  detectedAt: Date;
  resolvedAt?: Date;
  resolutionNotes?: string;
  npcReported: boolean;
  npcReportDate?: Date;
}

export interface DataSubjectRequest {
  id?: number;
  requestId: string;
  userId: number;
  requestType: 'access' | 'correction' | 'deletion' | 'portability';
  status: 'pending' | 'processing' | 'completed' | 'rejected';
  submittedAt: Date;
  completedAt?: Date;
  completionNotes?: string;
  processedBy?: number;
}

// ========================================
// 2. LTFRB TRANSPORT OPERATIONS TYPES
// ========================================

export interface TripComplianceLog {
  tripId: string;
  driverId: number;
  riderId: number;
  vehicleId: number;
  tripStartTime: Date;
  tripEndTime?: Date;
  pickupLocation: { lat: number; lng: number };
  dropoffLocation?: { lat: number; lng: number };
  routeCoordinates: Array<{ lat: number; lng: number; timestamp: Date }>;
  
  // Fare Compliance
  fareCharged: number;
  fareMandated: number;
  fareVariance: number;
  fareCompliant: boolean;
  fareOverrideReason?: string;
  fareOverrideBy?: number;
  
  // Route Compliance
  authorizedRoutes: string[];
  routeViolations: Array<{ lat: number; lng: number; timestamp: Date }>;
  boundaryCompliant: boolean;
  
  // Vehicle Compliance
  cctvActive: boolean;
  cctvRecordingId?: string;
  vehiclePermitValid: boolean;
  
  // Driver Compliance
  driverRating?: number;
  driverDeclined: boolean;
  declineReason?: string;
  conductViolations: string[];
  
  createdAt: Date;
  updatedAt: Date;
}

export interface CCTVHealthLog {
  id?: number;
  vehicleId: number;
  deviceId: string;
  status: 'active' | 'inactive' | 'maintenance' | 'tampered';
  healthScore: number; // 0-100
  lastRecording?: Date;
  storageCapacityGb: number;
  storageUsedGb: number;
  firmwareVersion: string;
  checkTimestamp: Date;
  alertTriggered: boolean;
  maintenanceDue?: Date;
}

export interface DriverConductLog {
  id?: number;
  driverId: number;
  incidentDate: Date;
  incidentType: 'excessive_decline' | 'late_arrival' | 'route_deviation' | 'customer_complaint' | 'safety_violation';
  severity: 'minor' | 'major' | 'critical';
  description: string;
  tripId?: string;
  reportedBy?: number;
  evidence: Array<{ type: string; url: string; description?: string }>;
  strikePoints: number;
  totalStrikes: number;
  actionTaken?: string;
  resolved: boolean;
  resolvedAt?: Date;
  notes?: string;
}

export interface FranchiseBoundary {
  id?: number;
  franchiseId: string;
  driverId: number;
  areaName: string;
  boundaryCoordinates: {
    type: 'Polygon';
    coordinates: number[][][];
  };
  permitNumber: string;
  validFrom: Date;
  validUntil: Date;
  specialConditions?: string;
  createdAt: Date;
}

export interface LTFRBReportSubmission {
  id?: number;
  reportType: 'daily_trips' | 'monthly_summary' | 'incident_report' | 'driver_conduct';
  reportPeriodStart: Date;
  reportPeriodEnd: Date;
  submissionDate: Date;
  filePath?: string;
  recordCount: number;
  status: 'draft' | 'submitted' | 'acknowledged' | 'rejected';
  ltfrbReferenceNumber?: string;
  acknowledgmentDate?: Date;
}

// ========================================
// 3. DOLE LABOR STANDARDS TYPES
// ========================================

export interface DriverAttendance {
  id?: number;
  driverId: number;
  attendanceDate: Date;
  
  // Shift Times
  scheduledStart?: string; // HH:MM format
  scheduledEnd?: string;
  actualStart?: string;
  actualEnd?: string;
  
  // Hours Calculation
  regularHours: number;
  overtimeHours: number;
  nightDifferentialHours: number;
  restDayHours: number;
  holidayHours: number;
  
  // Attendance Status
  status: 'present' | 'absent' | 'late' | 'undertime' | 'overtime';
  absenceType?: 'sick_leave' | 'vacation_leave' | 'emergency_leave' | 'awol';
  lateMinutes: number;
  undertimeMinutes: number;
  
  // Location Verification
  checkinLocation?: { lat: number; lng: number };
  checkoutLocation?: { lat: number; lng: number };
  gpsVerified: boolean;
  
  // Approvals
  approvedBy?: number;
  approvedAt?: Date;
  notes?: string;
  
  createdAt: Date;
}

export interface BenefitsRemittance {
  id?: number;
  driverId: number;
  payrollPeriodStart: Date;
  payrollPeriodEnd: Date;
  
  // Contribution Amounts
  philhealthEmployee: number;
  philhealthEmployer: number;
  sssEmployee: number;
  sssEmployer: number;
  sssEc: number; // Employees Compensation
  pagibigEmployee: number;
  pagibigEmployer: number;
  
  // Remittance Status
  philhealthRemitted: boolean;
  sssRemitted: boolean;
  pagibigRemitted: boolean;
  
  // Remittance Dates
  philhealthRemittanceDate?: Date;
  sssRemittanceDate?: Date;
  pagibigRemittanceDate?: Date;
  
  // Reference Numbers
  philhealthReference?: string;
  sssReference?: string;
  pagibigReference?: string;
  
  createdAt: Date;
}

export interface DeemedSalaryContract {
  id?: number;
  driverId: number;
  contractNumber: string;
  effectiveDate: Date;
  expirationDate?: Date;
  
  // Salary Structure
  monthlyDeemedSalary: number;
  dailyEquivalent: number;
  hourlyEquivalent: number;
  
  // Coverage Details
  overtimeCovered: boolean;
  nightDifferentialCovered: boolean;
  restDayCovered: boolean;
  holidayPayCovered: boolean;
  
  // Working Time Limits
  maxDailyHours: number;
  maxWeeklyDays: number;
  requiredRestHours: number;
  
  // Contract Status
  status: 'draft' | 'active' | 'expired' | 'terminated';
  signedDate?: Date;
  signedByDriver: boolean;
  signedByCompany: boolean;
  
  createdAt: Date;
}

export interface LaborInspectionReadiness {
  id?: number;
  inspectionArea: 'payroll' | 'attendance' | 'benefits' | 'contracts' | 'safety';
  complianceItem: string;
  requirementDescription: string;
  currentStatus: 'compliant' | 'non_compliant' | 'needs_attention';
  complianceScore: number; // 0-100
  lastUpdated: Date;
  nextReviewDue?: Date;
  responsiblePerson?: number;
  documentationPath?: string;
  notes?: string;
}

// ========================================
// 4. COMMON COMPLIANCE TYPES
// ========================================

export interface ComplianceAuditTrail {
  id?: number;
  complianceArea: 'npc_privacy' | 'ltfrb_transport' | 'dole_labor';
  action: string;
  entityType?: string;
  entityId?: string;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  performedBy: number;
  performedAt: Date;
  ipAddress?: string;
  userAgent?: string;
  reason?: string;
}

export interface ComplianceAlert {
  id?: number;
  alertType: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  title: string;
  description?: string;
  complianceArea?: 'npc_privacy' | 'ltfrb_transport' | 'dole_labor';
  entityType?: string;
  entityId?: string;
  thresholdValue?: number;
  actualValue?: number;
  triggeredAt: Date;
  acknowledged: boolean;
  acknowledgedBy?: number;
  acknowledgedAt?: Date;
  resolved: boolean;
  resolvedAt?: Date;
  autoResolved: boolean;
}

// ========================================
// 5. PIPELINE EVENT TYPES
// ========================================

export interface ComplianceEvent {
  id: string;
  type: string;
  source: 'mobile_app' | 'web_app' | 'admin_panel' | 'api' | 'system';
  timestamp: Date;
  userId?: number;
  sessionId?: string;
  data: Record<string, any>;
  metadata?: {
    ipAddress?: string;
    userAgent?: string;
    appVersion?: string;
    location?: { lat: number; lng: number };
  };
}

// Trip Events
export interface TripStartEvent extends ComplianceEvent {
  type: 'trip_start';
  data: {
    tripId: string;
    driverId: number;
    riderId: number;
    vehicleId: number;
    pickupLocation: { lat: number; lng: number };
    estimatedFare: number;
    cctvStatus: boolean;
  };
}

export interface TripEndEvent extends ComplianceEvent {
  type: 'trip_end';
  data: {
    tripId: string;
    dropoffLocation: { lat: number; lng: number };
    actualFare: number;
    driverRating?: number;
    routeCoordinates: Array<{ lat: number; lng: number; timestamp: Date }>;
  };
}

// Consent Events
export interface ConsentEvent extends ComplianceEvent {
  type: 'consent_given' | 'consent_withdrawn';
  data: {
    userId: number;
    consentType: string;
    consentGiven: boolean;
    consentVersion: string;
    method: string;
  };
}

// Access Events
export interface DataAccessEvent extends ComplianceEvent {
  type: 'data_access';
  data: {
    accessorId: number;
    table: string;
    recordId?: number;
    action: 'read' | 'write' | 'delete' | 'export';
    fields: string[];
    reason?: string;
  };
}

// Attendance Events
export interface AttendanceEvent extends ComplianceEvent {
  type: 'check_in' | 'check_out';
  data: {
    driverId: number;
    timestamp: Date;
    location: { lat: number; lng: number };
    method: 'gps' | 'manual' | 'biometric';
  };
}

// ========================================
// 6. COMPLIANCE METRICS & REPORTING
// ========================================

export interface NPCComplianceSummary {
  registeredDataSystems: number;
  totalPersonalRecords: number;
  consentCaptureRate: number;
  authorizedAccessors: number;
  criticalBreaches: number;
  pendingSubjectRequests: number;
  lastUpdated: Date;
}

export interface LTFRBComplianceSummary {
  totalTrips: number;
  fareComplianceRate: number;
  routeComplianceRate: number;
  cctvActiveRate: number;
  avgDriverRating: number;
  declineRate: number;
  conductViolations: number;
  reportingPeriod: { start: Date; end: Date };
}

export interface DOLEComplianceSummary {
  totalDrivers: number;
  attendanceRate: number;
  avgDailyHours: number;
  overtimeViolations: number;
  benefitsComplianceRate: number;
  laborInspectionScore: number;
  reportingPeriod: { start: Date; end: Date };
}

export interface ComplianceDashboard {
  npc: NPCComplianceSummary;
  ltfrb: LTFRBComplianceSummary;
  dole: DOLEComplianceSummary;
  totalAlerts: number;
  criticalAlerts: number;
  lastRefreshed: Date;
}

// ========================================
// 7. API RESPONSE TYPES
// ========================================

export interface APIResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  timestamp: Date;
}

export interface PaginatedResponse<T> extends APIResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ComplianceReportRequest {
  complianceArea: 'npc_privacy' | 'ltfrb_transport' | 'dole_labor';
  reportType: string;
  periodStart: Date;
  periodEnd: Date;
  format: 'pdf' | 'excel' | 'csv' | 'json';
  includeCharts: boolean;
  filters?: Record<string, any>;
}

export interface ComplianceReportResponse extends APIResponse<null> {
  reportId: string;
  downloadUrl: string;
  expiresAt: Date;
}