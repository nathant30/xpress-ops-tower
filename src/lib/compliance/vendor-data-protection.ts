/**
 * Vendor Data Protection Implementation for NPC Compliance
 * Ensures expansion_manager role complies with Philippines Data Privacy Act 2012
 */

import { createPrometheusRegistry, register } from '../observability/prometheus';
import { Counter, Histogram } from 'prom-client';

// Compliance metrics
const vendorDataAccessCounter = new Counter({
  name: 'vendor_data_access_total',
  help: 'Total vendor data access by expansion_manager',
  labelNames: [
    'user_id',
    'data_category',  // business_info, financial, performance, market_intel
    'processing_purpose', // vendor_assessment, market_analysis, partnership_evaluation
    'legal_basis',    // legitimate_interest, contract_performance
    'access_result'   // granted, denied, masked
  ],
  registers: [register]
});

const dataSubjectRequestCounter = new Counter({
  name: 'data_subject_requests_total', 
  help: 'Data subject requests related to vendor data',
  labelNames: [
    'request_type',   // access, rectification, erasure, portability
    'subject_type',   // vendor_contact, business_entity
    'response_time_hours',
    'request_result'  // fulfilled, rejected, partial
  ],
  registers: [register]
});

const complianceViolationCounter = new Counter({
  name: 'npc_compliance_violations_total',
  help: 'NPC compliance violations in vendor data processing',
  labelNames: [
    'violation_type', // unauthorized_access, purpose_limitation, retention_breach
    'user_id',
    'data_category',
    'severity'        // low, medium, high, critical
  ],
  registers: [register]
});

/**
 * Vendor data categories as defined in NPC registry
 */
export enum VendorDataCategory {
  BUSINESS_INFO = 'business_info',           // Contact info, registration details
  FINANCIAL = 'financial',                  // Bank details, credit references  
  PERFORMANCE = 'performance',              // Service metrics, ratings
  MARKET_INTEL = 'market_intel'             // Competitor analysis, market data
}

/**
 * Legal bases for processing under Philippines DPA 2012
 */
export enum ProcessingLegalBasis {
  LEGITIMATE_INTEREST = 'legitimate_interest',  // Section 12 DPA 2012
  CONTRACT_PERFORMANCE = 'contract_performance', // Vendor SLA compliance
  LEGAL_OBLIGATION = 'legal_obligation',        // Regulatory requirements
  CONSENT = 'consent'                          // Explicit vendor consent
}

/**
 * Processing purposes for expansion_manager
 */
export enum ProcessingPurpose {
  VENDOR_ASSESSMENT = 'vendor_assessment',      // Initial partner evaluation
  MARKET_ANALYSIS = 'market_analysis',          // Regional feasibility study  
  PARTNERSHIP_EVALUATION = 'partnership_evaluation', // Performance review
  ONBOARDING_TASK = 'onboarding_task'          // Task creation and management
}

/**
 * Validate vendor data access compliance
 */
export function validateVendorDataAccess(request: {
  userId: string;
  userRole: string;
  dataCategory: VendorDataCategory;
  processingPurpose: ProcessingPurpose;
  legalBasis: ProcessingLegalBasis;
  vendorId?: string;
  businessJustification?: string;
}): { allowed: boolean; reason?: string; safeguards?: string[] } {
  
  const { userId, userRole, dataCategory, processingPurpose, legalBasis, businessJustification } = request;
  
  // Only expansion_manager can access vendor data
  if (userRole !== 'expansion_manager') {
    recordComplianceViolation({
      violationType: 'unauthorized_role_access',
      userId,
      dataCategory,
      severity: 'high',
      details: `Role ${userRole} attempted vendor data access`
    });
    
    return {
      allowed: false,
      reason: 'Vendor data access restricted to expansion_manager role only'
    };
  }

  // Business justification required for all access
  if (!businessJustification || businessJustification.trim().length < 10) {
    recordComplianceViolation({
      violationType: 'missing_justification',
      userId,
      dataCategory,
      severity: 'medium',
      details: 'Vendor data access attempted without business justification'
    });
    
    return {
      allowed: false,
      reason: 'Business justification required for vendor data access (NPC compliance)'
    };
  }

  // Validate legal basis alignment with purpose
  const validCombinations = {
    [ProcessingPurpose.VENDOR_ASSESSMENT]: [ProcessingLegalBasis.LEGITIMATE_INTEREST],
    [ProcessingPurpose.MARKET_ANALYSIS]: [ProcessingLegalBasis.LEGITIMATE_INTEREST],
    [ProcessingPurpose.PARTNERSHIP_EVALUATION]: [ProcessingLegalBasis.CONTRACT_PERFORMANCE, ProcessingLegalBasis.LEGITIMATE_INTEREST],
    [ProcessingPurpose.ONBOARDING_TASK]: [ProcessingLegalBasis.CONTRACT_PERFORMANCE]
  };

  if (!validCombinations[processingPurpose]?.includes(legalBasis)) {
    return {
      allowed: false,
      reason: `Legal basis ${legalBasis} not valid for purpose ${processingPurpose}`
    };
  }

  // Data category-specific restrictions
  const safeguards: string[] = [];
  
  switch (dataCategory) {
    case VendorDataCategory.FINANCIAL:
      // Financial data requires additional safeguards
      safeguards.push('pii_masking_required', 'enhanced_audit_logging', 'time_limited_access');
      if (legalBasis !== ProcessingLegalBasis.CONTRACT_PERFORMANCE) {
        return {
          allowed: false,
          reason: 'Financial vendor data requires contract performance legal basis'
        };
      }
      break;
      
    case VendorDataCategory.PERFORMANCE:
      safeguards.push('aggregated_data_only', 'no_individual_metrics');
      break;
      
    case VendorDataCategory.MARKET_INTEL:
      safeguards.push('public_sources_only', 'competitor_anonymization');
      break;
      
    case VendorDataCategory.BUSINESS_INFO:
      safeguards.push('purpose_limitation', 'retention_policy_enforced');
      break;
  }

  // Record successful access
  vendorDataAccessCounter
    .labels({
      user_id: userId,
      data_category: dataCategory,
      processing_purpose: processingPurpose,
      legal_basis: legalBasis,
      access_result: 'granted'
    })
    .inc();

  // Audit log for NPC compliance
  .toISOString(),
    npc_compliance: true
  });

  return {
    allowed: true,
    safeguards
  };
}

/**
 * Apply data masking for vendor data based on sensitivity
 */
export function maskVendorData<T>(data: T, dataCategory: VendorDataCategory, userRole: string): Partial<T> {
  if (userRole !== 'expansion_manager') {
    throw new Error('Unauthorized access to vendor data masking function');
  }

  let maskedData = { ...data };

  switch (dataCategory) {
    case VendorDataCategory.FINANCIAL:
      // Mask sensitive financial details
      maskedData = {
        ...maskedData,
        bankAccount: '[MASKED]',
        creditScore: '[MASKED]', 
        financialReferences: '[MASKED]'
      };
      break;
      
    case VendorDataCategory.BUSINESS_INFO:
      // Keep business info but mask personal details
      maskedData = {
        ...maskedData,
        personalPhone: '[MASKED]',
        personalEmail: '[MASKED]',
        homeAddress: '[MASKED]'
      };
      break;
      
    case VendorDataCategory.PERFORMANCE:
      // Provide aggregated metrics only
      maskedData = {
        ...maskedData,
        individualRatings: '[AGGREGATED]',
        specificFeedback: '[AGGREGATED]'
      };
      break;
      
    case VendorDataCategory.MARKET_INTEL:
      // Anonymize competitor data
      maskedData = {
        ...maskedData,
        competitorNames: '[ANONYMIZED]',
        specificPricing: '[ANONYMIZED]'
      };
      break;
  }

  return maskedData;
}

/**
 * Record NPC compliance violation
 */
export function recordComplianceViolation(params: {
  violationType: 'unauthorized_access' | 'purpose_limitation' | 'retention_breach' | 'unauthorized_role_access' | 'missing_justification';
  userId: string;
  dataCategory: VendorDataCategory;
  severity: 'low' | 'medium' | 'high' | 'critical';
  details: string;
}) {
  const { violationType, userId, dataCategory, severity, details } = params;

  complianceViolationCounter
    .labels({
      violation_type: violationType,
      user_id: userId,
      data_category: dataCategory,
      severity
    })
    .inc();

  // Immediate security logging for high/critical violations
  if (['high', 'critical'].includes(severity)) {
    console.error('🚨 NPC COMPLIANCE VIOLATION:', {
      type: 'npc_compliance_violation',
      severity: severity.toUpperCase(),
      violation_type: violationType,
      user_id: userId,
      data_category: dataCategory,
      details,
      timestamp: new Date().toISOString(),
      requires_dpo_notification: true
    });
  } else {
    console.warn('⚠️ NPC Compliance Issue:', {
      type: 'npc_compliance_issue',
      violation_type: violationType,
      user_id: userId,
      data_category: dataCategory,
      details,
      timestamp: new Date().toISOString()
    });
  }
}

/**
 * Handle data subject requests for vendor data
 */
export function handleDataSubjectRequest(request: {
  requestType: 'access' | 'rectification' | 'erasure' | 'portability';
  subjectType: 'vendor_contact' | 'business_entity';
  vendorId: string;
  requestorEmail: string;
  requestDetails: string;
}) {
  const { requestType, subjectType, vendorId, requestorEmail, requestDetails } = request;
  
  // expansion_manager cannot handle data subject requests directly
  const dpoNotification = {
    type: 'data_subject_request',
    request_id: `DSR-${Date.now()}`,
    request_type: requestType,
    subject_type: subjectType,
    vendor_id: vendorId,
    requestor_email: requestorEmail,
    details: requestDetails,
    submitted_at: new Date().toISOString(),
    npc_compliance: true,
    forwarded_to: 'dpo@xpress.ph',
    response_deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days
  };

  dataSubjectRequestCounter
    .labels({
      request_type: requestType,
      subject_type: subjectType,
      response_time_hours: '0', // Just submitted
      request_result: 'forwarded_to_dpo'
    })
    .inc();

  // In real implementation, this would send email to DPO
  return {
    requestId: dpoNotification.request_id,
    status: 'forwarded_to_dpo',
    expectedResponse: '30 days',
    contact: 'dpo@xpress.ph'
  };
}

/**
 * Validate data retention compliance for vendor data
 */
export function validateDataRetention(params: {
  dataCategory: VendorDataCategory;
  collectionDate: Date;
  contractEndDate?: Date;
  businessPurpose: string;
}): { retentionValid: boolean; actionRequired?: string; deleteBy?: Date } {
  
  const { dataCategory, collectionDate, contractEndDate, businessPurpose } = params;
  const now = new Date();
  
  // Define retention periods per NPC registry
  const retentionPeriods = {
    [VendorDataCategory.BUSINESS_INFO]: { years: 10, basis: 'legal_requirement' },
    [VendorDataCategory.FINANCIAL]: { years: 7, basis: 'regulatory_requirement' }, 
    [VendorDataCategory.PERFORMANCE]: { years: 3, basis: 'operational_necessity' },
    [VendorDataCategory.MARKET_INTEL]: { years: 2, basis: 'business_intelligence' }
  };
  
  const retention = retentionPeriods[dataCategory];
  const retentionEndDate = new Date(collectionDate);
  retentionEndDate.setFullYear(retentionEndDate.getFullYear() + retention.years);
  
  // For contract-based data, use contract end + retention period
  if (contractEndDate && [VendorDataCategory.FINANCIAL, VendorDataCategory.PERFORMANCE].includes(dataCategory)) {
    const contractBasedEnd = new Date(contractEndDate);
    contractBasedEnd.setFullYear(contractBasedEnd.getFullYear() + retention.years);
    
    if (contractBasedEnd > retentionEndDate) {
      retentionEndDate.setTime(contractBasedEnd.getTime());
    }
  }
  
  const retentionValid = now <= retentionEndDate;
  
  if (!retentionValid) {
    recordComplianceViolation({
      violationType: 'retention_breach',
      userId: 'system',
      dataCategory,
      severity: 'high',
      details: `Data retained beyond ${retention.years} year limit`
    });
    
    return {
      retentionValid: false,
      actionRequired: 'immediate_deletion_required',
      deleteBy: now // Should have been deleted already
    };
  }
  
  // Warn if approaching retention limit (30 days before)
  const warningDate = new Date(retentionEndDate);
  warningDate.setDate(warningDate.getDate() - 30);
  
  if (now >= warningDate) {
    return {
      retentionValid: true,
      actionRequired: 'deletion_scheduled',
      deleteBy: retentionEndDate
    };
  }
  
  return { retentionValid: true };
}

/**
 * Generate NPC compliance report for vendor data processing
 */
export function generateNPCComplianceReport(period: { startDate: Date; endDate: Date }) {
  const { startDate, endDate } = period;
  
  const report = {
    reporting_period: {
      start: startDate.toISOString(),
      end: endDate.toISOString()
    },
    vendor_data_processing: {
      total_access_events: 0, // Would query from metrics
      data_categories_accessed: [], 
      legal_bases_used: [],
      compliance_violations: 0,
      data_subject_requests: 0
    },
    security_measures: {
      encryption_status: 'active',
      access_controls: 'rbac_enforced', 
      audit_logging: 'complete',
      data_masking: 'implemented'
    },
    retention_compliance: {
      on_schedule_deletions: 0,
      overdue_deletions: 0,
      upcoming_deletions: 0
    },
    recommendations: [
      'Continue quarterly access reviews',
      'Update privacy training materials',
      'Enhance automated retention enforcement'
    ]
  };
  
  .toISOString()
  });
  
  return report;
}

export default {
  validateVendorDataAccess,
  maskVendorData,
  recordComplianceViolation,
  handleDataSubjectRequest,
  validateDataRetention,
  generateNPCComplianceReport
};