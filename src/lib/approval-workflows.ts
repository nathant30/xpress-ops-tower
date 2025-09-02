// Approval Workflows Library for Xpress Ops Tower
// Provides predefined workflow configurations and utility functions

import type { Permission } from '@/hooks/useRBAC';
import type { 
  WorkflowDefinition, 
  ApprovalWorkflow,
  ApprovalRequest,
  CreateApprovalRequestBody 
} from '@/types/approval';

// =====================================================
// Predefined Workflow Configurations
// =====================================================

export const WORKFLOW_DEFINITIONS: Record<string, WorkflowDefinition> = {
  // Operations Management Workflows
  'configure_alerts': {
    action: 'configure_alerts',
    display_name: 'Configure System Alerts',
    description: 'Configure system alerts and notification thresholds',
    required_roles: ['ops_manager', 'regional_manager', 'executive'],
    required_permissions: ['approve_requests'],
    required_level: 25,
    auto_grant_permissions: ['configure_alerts'],
    default_ttl_seconds: 3600, // 1 hour
    max_ttl_seconds: 7200, // 2 hours
    sensitivity_level: 'low',
    dual_approval_required: false,
    mfa_required_for_approval: false
  },
  
  // Privacy & Security Workflows
  'unmask_pii_with_mfa': {
    action: 'unmask_pii_with_mfa',
    display_name: 'Unmask PII Data with MFA',
    description: 'Access unmasked personally identifiable information with MFA verification',
    required_roles: ['risk_investigator', 'executive'],
    required_permissions: ['approve_requests'],
    required_level: 50,
    auto_grant_permissions: ['unmask_pii_with_mfa', 'view_audit_logs'],
    default_ttl_seconds: 1800, // 30 minutes
    max_ttl_seconds: 3600, // 1 hour
    sensitivity_level: 'critical',
    dual_approval_required: true,
    mfa_required_for_approval: true
  },
  
  // Regional Operations Workflows
  'cross_region_override': {
    action: 'cross_region_override',
    display_name: 'Cross-Region Access Override',
    description: 'Override regional access restrictions for emergency operations',
    required_roles: ['executive'],
    required_permissions: ['approve_requests'],
    required_level: 60,
    auto_grant_permissions: ['cross_region_override'],
    default_ttl_seconds: 7200, // 2 hours
    max_ttl_seconds: 14400, // 4 hours
    sensitivity_level: 'high',
    dual_approval_required: false,
    mfa_required_for_approval: true
  },
  
  // Financial Operations Workflows
  'approve_payout_batch': {
    action: 'approve_payout_batch',
    display_name: 'Approve Payout Batch',
    description: 'Approve batch payout processing for drivers',
    required_roles: ['regional_manager', 'executive'],
    required_permissions: ['approve_requests'],
    required_level: 40,
    auto_grant_permissions: ['approve_payout_batch', 'view_financial_reports'],
    default_ttl_seconds: 1800, // 30 minutes
    max_ttl_seconds: 3600, // 1 hour
    sensitivity_level: 'critical',
    dual_approval_required: true,
    mfa_required_for_approval: true
  },
  
  // User Management Workflows
  'manage_users': {
    action: 'manage_users',
    display_name: 'Manage User Accounts',
    description: 'Create, modify, or deactivate user accounts',
    required_roles: ['regional_manager', 'executive'],
    required_permissions: ['approve_requests'],
    required_level: 40,
    auto_grant_permissions: ['manage_users', 'view_audit_logs'],
    default_ttl_seconds: 3600, // 1 hour
    max_ttl_seconds: 7200, // 2 hours
    sensitivity_level: 'medium',
    dual_approval_required: false,
    mfa_required_for_approval: false
  },
  
  'assign_roles': {
    action: 'assign_roles',
    display_name: 'Assign User Roles',
    description: 'Assign or modify user roles and permissions',
    required_roles: ['regional_manager', 'executive'],
    required_permissions: ['approve_requests'],
    required_level: 40,
    auto_grant_permissions: ['assign_roles', 'manage_permissions'],
    default_ttl_seconds: 3600, // 1 hour
    max_ttl_seconds: 7200, // 2 hours
    sensitivity_level: 'high',
    dual_approval_required: false,
    mfa_required_for_approval: true
  },
  
  // System Administration Workflows
  'revoke_access': {
    action: 'revoke_access',
    display_name: 'Revoke User Access',
    description: 'Revoke user access in emergency situations',
    required_roles: ['regional_manager', 'executive'],
    required_permissions: ['approve_requests'],
    required_level: 40,
    auto_grant_permissions: ['revoke_access'],
    default_ttl_seconds: 1800, // 30 minutes
    max_ttl_seconds: 3600, // 1 hour
    sensitivity_level: 'medium',
    dual_approval_required: false,
    mfa_required_for_approval: false
  },
  
  'manage_api_keys': {
    action: 'manage_api_keys',
    display_name: 'Manage API Keys',
    description: 'Create, revoke, or modify API access keys',
    required_roles: ['executive'],
    required_permissions: ['approve_requests'],
    required_level: 60,
    auto_grant_permissions: ['manage_api_keys'],
    default_ttl_seconds: 1800, // 30 minutes
    max_ttl_seconds: 3600, // 1 hour
    sensitivity_level: 'high',
    dual_approval_required: false,
    mfa_required_for_approval: true
  },
  
  // Audit & Compliance Workflows
  'export_audit_data': {
    action: 'export_audit_data',
    display_name: 'Export Audit Data',
    description: 'Export audit logs and compliance data',
    required_roles: ['risk_investigator', 'executive'],
    required_permissions: ['approve_requests'],
    required_level: 50,
    auto_grant_permissions: ['export_audit_data', 'view_audit_logs'],
    default_ttl_seconds: 900, // 15 minutes
    max_ttl_seconds: 1800, // 30 minutes
    sensitivity_level: 'high',
    dual_approval_required: false,
    mfa_required_for_approval: true
  },
  
  'access_raw_location_data': {
    action: 'access_raw_location_data',
    display_name: 'Access Raw Location Data',
    description: 'Access unprocessed location tracking data',
    required_roles: ['risk_investigator', 'executive'],
    required_permissions: ['approve_requests'],
    required_level: 50,
    auto_grant_permissions: ['access_raw_location_data', 'view_audit_logs'],
    default_ttl_seconds: 600, // 10 minutes
    max_ttl_seconds: 1800, // 30 minutes
    sensitivity_level: 'critical',
    dual_approval_required: true,
    mfa_required_for_approval: true
  },
  
  // Expansion Management Workflows
  'configure_prelaunch_pricing_flagged': {
    action: 'configure_prelaunch_pricing_flagged',
    display_name: 'Configure Pre-launch Pricing',
    description: 'Configure pricing for pre-launch expansion regions',
    required_roles: ['expansion_manager', 'executive'],
    required_permissions: ['approve_requests'],
    required_level: 45,
    auto_grant_permissions: ['configure_prelaunch_pricing_flagged'],
    default_ttl_seconds: 7200, // 2 hours
    max_ttl_seconds: 14400, // 4 hours
    sensitivity_level: 'medium',
    dual_approval_required: false,
    mfa_required_for_approval: false
  },
  
  'promote_region_stage': {
    action: 'promote_region_stage',
    display_name: 'Promote Region Stage',
    description: 'Promote region from prospect to pilot or pilot to active',
    required_roles: ['executive'],
    required_permissions: ['approve_requests'],
    required_level: 60,
    auto_grant_permissions: ['promote_region_stage'],
    default_ttl_seconds: 3600, // 1 hour
    max_ttl_seconds: 7200, // 2 hours
    sensitivity_level: 'high',
    dual_approval_required: false,
    mfa_required_for_approval: true
  }
};

// =====================================================
// Workflow Utility Functions
// =====================================================

/**
 * Get workflow definition by action name
 */
export function getWorkflowDefinition(action: string): WorkflowDefinition | null {
  return WORKFLOW_DEFINITIONS[action] || null;
}

/**
 * Get all available workflow definitions
 */
export function getAllWorkflowDefinitions(): WorkflowDefinition[] {
  return Object.values(WORKFLOW_DEFINITIONS);
}

/**
 * Check if user can approve a specific workflow
 */
export function canUserApproveWorkflow(
  userLevel: number,
  userRole: string,
  userPermissions: Permission[],
  workflowAction: string
): boolean {
  const definition = getWorkflowDefinition(workflowAction);
  if (!definition) return false;
  
  // Check minimum level
  if (definition.required_level && userLevel < definition.required_level) {
    return false;
  }
  
  // Check required roles
  if (definition.required_roles && !definition.required_roles.includes(userRole)) {
    return false;
  }
  
  // Check required permissions
  if (definition.required_permissions) {
    const hasRequiredPerms = definition.required_permissions.every(perm => 
      userPermissions.includes(perm) || userPermissions.includes('*' as Permission)
    );
    if (!hasRequiredPerms) {
      return false;
    }
  }
  
  return true;
}

/**
 * Get workflows that a user can approve
 */
export function getUserApprovableWorkflows(
  userLevel: number,
  userRole: string,
  userPermissions: Permission[]
): WorkflowDefinition[] {
  return getAllWorkflowDefinitions().filter(workflow => 
    canUserApproveWorkflow(userLevel, userRole, userPermissions, workflow.action)
  );
}

/**
 * Validate approval request against workflow definition
 */
export function validateApprovalRequest(
  requestBody: CreateApprovalRequestBody,
  definition: WorkflowDefinition
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Validate TTL if provided
  if (requestBody.ttl_hours) {
    const ttlSeconds = requestBody.ttl_hours * 3600;
    if (ttlSeconds > definition.max_ttl_seconds) {
      errors.push(`TTL cannot exceed ${definition.max_ttl_seconds / 3600} hours for ${definition.display_name}`);
    }
  }
  
  // Validate justification length
  if (!requestBody.justification || requestBody.justification.trim().length < 10) {
    errors.push('Justification must be at least 10 characters long');
  }
  
  if (requestBody.justification && requestBody.justification.length > 1000) {
    errors.push('Justification cannot exceed 1000 characters');
  }
  
  // Validate requested_action structure
  if (!requestBody.requested_action || typeof requestBody.requested_action !== 'object') {
    errors.push('requested_action must be a valid object');
  } else {
    // Specific validation based on workflow type
    switch (definition.action) {
      case 'unmask_pii_with_mfa':
        if (!requestBody.requested_action.user_ids || 
            !Array.isArray(requestBody.requested_action.user_ids) ||
            requestBody.requested_action.user_ids.length === 0) {
          errors.push('user_ids array is required for PII unmasking requests');
        }
        if (!requestBody.requested_action.investigation_case) {
          errors.push('investigation_case is required for PII unmasking requests');
        }
        break;
        
      case 'approve_payout_batch':
        if (!requestBody.requested_action.batch_id) {
          errors.push('batch_id is required for payout batch approval');
        }
        if (typeof requestBody.requested_action.amount !== 'number' || 
            requestBody.requested_action.amount <= 0) {
          errors.push('amount must be a positive number for payout batch approval');
        }
        break;
        
      case 'cross_region_override':
        if (!requestBody.requested_action.source_region || !requestBody.requested_action.target_region) {
          errors.push('source_region and target_region are required for cross-region override');
        }
        break;
        
      case 'configure_alerts':
        if (!requestBody.requested_action.alert_types || 
            !Array.isArray(requestBody.requested_action.alert_types)) {
          errors.push('alert_types array is required for alert configuration');
        }
        break;
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Generate approval request template based on workflow
 */
export function generateApprovalRequestTemplate(action: string): Partial<CreateApprovalRequestBody> | null {
  const definition = getWorkflowDefinition(action);
  if (!definition) return null;
  
  const templates: Record<string, any> = {
    'configure_alerts': {
      action,
      justification: 'Please provide detailed justification for alert configuration changes...',
      requested_action: {
        action,
        region: 'specify-region',
        alert_types: ['specify', 'alert', 'types']
      }
    },
    
    'unmask_pii_with_mfa': {
      action,
      justification: 'Investigation case requiring PII access. Provide case details and data protection compliance notes...',
      requested_action: {
        action,
        user_ids: ['user-id-1', 'user-id-2'],
        investigation_case: 'CASE-YYYY-NNN',
        data_retention_days: 30
      }
    },
    
    'cross_region_override': {
      action,
      justification: 'Emergency cross-region access needed. Specify incident details and urgency level...',
      requested_action: {
        action,
        source_region: 'current-region',
        target_region: 'target-region',
        duration_hours: 2,
        emergency_level: 'high'
      }
    },
    
    'approve_payout_batch': {
      action,
      justification: 'Monthly/weekly payout batch approval. Include financial review summary...',
      requested_action: {
        action,
        batch_id: 'BATCH-YYYY-MM-NNN',
        region: 'specify-region',
        amount: 0,
        driver_count: 0,
        review_completed: true
      }
    }
  };
  
  return templates[action] || {
    action,
    justification: `Please provide justification for ${definition.display_name}...`,
    requested_action: { action }
  };
}

/**
 * Calculate estimated approval time based on workflow complexity
 */
export function getEstimatedApprovalTime(definition: WorkflowDefinition): string {
  if (definition.dual_approval_required) {
    switch (definition.sensitivity_level) {
      case 'critical': return '8-12 hours';
      case 'high': return '4-8 hours';
      case 'medium': return '2-6 hours';
      default: return '2-4 hours';
    }
  } else {
    switch (definition.sensitivity_level) {
      case 'critical': return '4-6 hours';
      case 'high': return '2-4 hours';
      case 'medium': return '1-3 hours';
      default: return '1-2 hours';
    }
  }
}

/**
 * Get workflow risk assessment
 */
export function getWorkflowRiskAssessment(action: string): {
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  risk_factors: string[];
  mitigation_measures: string[];
} {
  const definition = getWorkflowDefinition(action);
  if (!definition) {
    return {
      risk_level: 'medium',
      risk_factors: ['Unknown workflow'],
      mitigation_measures: ['Verify workflow definition']
    };
  }
  
  const riskAssessments: Record<string, any> = {
    'unmask_pii_with_mfa': {
      risk_level: 'critical',
      risk_factors: [
        'Access to personally identifiable information',
        'Privacy compliance requirements',
        'Data protection regulations'
      ],
      mitigation_measures: [
        'Dual approval required',
        'MFA verification mandatory',
        'Short access duration (30 minutes)',
        'Comprehensive audit logging',
        'Access purpose documentation'
      ]
    },
    
    'approve_payout_batch': {
      risk_level: 'critical',
      risk_factors: [
        'Large financial transactions',
        'Driver payment integrity',
        'Financial audit compliance'
      ],
      mitigation_measures: [
        'Dual approval from finance and executive',
        'Batch amount verification',
        'Driver count validation',
        'Financial reconciliation required'
      ]
    },
    
    'access_raw_location_data': {
      risk_level: 'critical',
      risk_factors: [
        'Sensitive location tracking data',
        'Privacy implications',
        'Surveillance concerns'
      ],
      mitigation_measures: [
        'Dual approval required',
        'Very short access window (10 minutes)',
        'Specific investigation case required',
        'Location data anonymization when possible'
      ]
    },
    
    'cross_region_override': {
      risk_level: 'high',
      risk_factors: [
        'Bypass of regional access controls',
        'Potential data jurisdiction issues',
        'Operational scope expansion'
      ],
      mitigation_measures: [
        'Executive approval required',
        'Time-limited access (2 hours)',
        'Emergency justification required',
        'Cross-region activity monitoring'
      ]
    }
  };
  
  return riskAssessments[action] || {
    risk_level: definition.sensitivity_level as any,
    risk_factors: [`${definition.sensitivity_level} sensitivity workflow`],
    mitigation_measures: [
      definition.dual_approval_required ? 'Dual approval required' : 'Single approval required',
      definition.mfa_required_for_approval ? 'MFA required' : 'Standard authentication',
      `Time-limited access (${definition.default_ttl_seconds / 60} minutes)`
    ]
  };
}

/**
 * Get workflow notification settings
 */
export function getWorkflowNotificationSettings(action: string): {
  notify_on_request: boolean;
  notify_on_approval: boolean;
  notify_on_rejection: boolean;
  escalation_hours: number;
  notification_channels: string[];
} {
  const definition = getWorkflowDefinition(action);
  if (!definition) {
    return {
      notify_on_request: true,
      notify_on_approval: true,
      notify_on_rejection: true,
      escalation_hours: 4,
      notification_channels: ['email']
    };
  }
  
  // High sensitivity workflows get more aggressive notifications
  if (definition.sensitivity_level === 'critical') {
    return {
      notify_on_request: true,
      notify_on_approval: true,
      notify_on_rejection: true,
      escalation_hours: 2,
      notification_channels: ['email', 'sms', 'slack']
    };
  } else if (definition.sensitivity_level === 'high') {
    return {
      notify_on_request: true,
      notify_on_approval: true,
      notify_on_rejection: true,
      escalation_hours: 4,
      notification_channels: ['email', 'slack']
    };
  } else {
    return {
      notify_on_request: true,
      notify_on_approval: true,
      notify_on_rejection: false,
      escalation_hours: 8,
      notification_channels: ['email']
    };
  }
}

export default {
  WORKFLOW_DEFINITIONS,
  getWorkflowDefinition,
  getAllWorkflowDefinitions,
  canUserApproveWorkflow,
  getUserApprovableWorkflows,
  validateApprovalRequest,
  generateApprovalRequestTemplate,
  getEstimatedApprovalTime,
  getWorkflowRiskAssessment,
  getWorkflowNotificationSettings
};