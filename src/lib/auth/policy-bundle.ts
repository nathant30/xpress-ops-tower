// Policy Bundle Management with Version Control and Hash Validation
// Prevents authorization regression by enforcing policy parity across services

import crypto from 'crypto';
import allowedActionsConfig from '../../../config/allowed-actions.json';

export interface PolicyBundle {
  version: string;
  hash: string;
  timestamp: number;
  policies: {
    allowed_actions: typeof allowedActionsConfig;
    schema_version: string;
    audit_requirements: Record<string, string[]>;
    mfa_requirements: Record<string, number>; // TTL in seconds
  };
  metadata: {
    generated_by: string;
    environment: string;
    deployment_id?: string;
  };
}

// Current policy version - increment on breaking changes
const POLICY_VERSION = '1.2.0';
const SCHEMA_VERSION = '2024-08-31';

// MFA TTL requirements (in seconds)
const MFA_REQUIREMENTS = {
  'unmask_pii_with_mfa': 900,      // 15 minutes
  'cross_region_override': 1800,   // 30 minutes  
  'emergency_override': 600,       // 10 minutes
  'export_pii_data': 900,          // 15 minutes
  'admin_user_modify': 3600        // 1 hour
};

// Dual-control requirements - actions requiring two-person approval
const DUAL_CONTROL_REQUIREMENTS = {
  'prelaunch_pricing': [
    'expansion_manager:configure_prelaunch_pricing_flagged',
    'app_admin:activate_feature_flag'
  ],
  'supply_campaigns': [
    'expansion_manager:configure_supply_campaign_flagged', 
    'regional_manager:approve_campaign'
  ],
  'region_promotion': [
    'expansion_manager:promote_region_stage',
    'executive:approve_region_stage'
  ]
};

// Audit requirements - actions that MUST have audit context
const AUDIT_REQUIREMENTS = {
  'unmask_pii_with_mfa': ['audit_id', 'case_id', 'justification'],
  'cross_region_override': ['case_id', 'expiry_timestamp', 'approver_id'],
  'emergency_override': ['incident_id', 'justification', 'duration_hours'],
  'export_pii_data': ['export_id', 'data_class', 'recipient'],
  'admin_user_modify': ['change_type', 'target_user_id', 'approval_id'],
  'create_region_request': ['market_analysis', 'business_case', 'target_launch_date'],
  'promote_region_stage': ['stage_from', 'stage_to', 'readiness_checklist'],
  'configure_prelaunch_pricing_flagged': ['pricing_strategy', 'market_segment', 'approval_required'],
  'configure_supply_campaign_flagged': ['campaign_type', 'budget_range', 'approval_required'],
  'request_temp_access_region': ['case_id', 'expiry_timestamp', 'business_justification'],
  'handover_to_regional_manager': ['handover_checklist', 'regional_manager_id', 'effective_date']
};

/**
 * Generate policy bundle hash for integrity validation
 */
function generatePolicyHash(policies: PolicyBundle['policies']): string {
  const hashInput = JSON.stringify(policies, Object.keys(policies).sort());
  return crypto.createHash('sha256').update(hashInput).digest('hex').substring(0, 16);
}

/**
 * Create current policy bundle
 */
export function createPolicyBundle(): PolicyBundle {
  const policies = {
    allowed_actions: allowedActionsConfig,
    schema_version: SCHEMA_VERSION,
    audit_requirements: AUDIT_REQUIREMENTS,
    mfa_requirements: MFA_REQUIREMENTS,
    dual_control_requirements: DUAL_CONTROL_REQUIREMENTS
  };

  const hash = generatePolicyHash(policies);
  
  return {
    version: POLICY_VERSION,
    hash,
    timestamp: Date.now(),
    policies,
    metadata: {
      generated_by: 'auth-policy-bundler',
      environment: process.env.NODE_ENV || 'development',
      deployment_id: process.env.DEPLOYMENT_ID
    }
  };
}

/**
 * Validate policy bundle integrity
 */
export function validatePolicyBundle(bundle: PolicyBundle): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Check version format
  if (!/^\d+\.\d+\.\d+$/.test(bundle.version)) {
    errors.push(`Invalid version format: ${bundle.version}`);
  }

  // Validate hash
  const expectedHash = generatePolicyHash(bundle.policies);
  if (bundle.hash !== expectedHash) {
    errors.push(`Policy hash mismatch: expected ${expectedHash}, got ${bundle.hash}`);
  }

  // Check timestamp (not too old)
  const age = Date.now() - bundle.timestamp;
  if (age > 24 * 60 * 60 * 1000) { // 24 hours
    errors.push(`Policy bundle too old: ${Math.floor(age / 1000 / 60 / 60)} hours`);
  }

  // Validate required fields
  if (!bundle.policies.allowed_actions) {
    errors.push('Missing allowed_actions in policy bundle');
  }

  if (!bundle.policies.audit_requirements) {
    errors.push('Missing audit_requirements in policy bundle');
  }

  if (!bundle.policies.mfa_requirements) {
    errors.push('Missing mfa_requirements in policy bundle');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Compare two policy bundles for compatibility
 */
export function areBundlesCompatible(bundle1: PolicyBundle, bundle2: PolicyBundle): boolean {
  // Major version must match
  const version1Major = bundle1.version.split('.')[0];
  const version2Major = bundle2.version.split('.')[0];
  
  if (version1Major !== version2Major) {
    return false;
  }

  // Hashes should match for exact compatibility
  return bundle1.hash === bundle2.hash;
}

// Global policy bundle instance
let currentBundle: PolicyBundle | null = null;

/**
 * Initialize policy bundle (call on service startup)
 */
export function initializePolicyBundle(): PolicyBundle {
  currentBundle = createPolicyBundle();
  return currentBundle;
}

/**
 * Get current policy bundle
 */
export function getCurrentPolicyBundle(): PolicyBundle {
  if (!currentBundle) {
    currentBundle = createPolicyBundle();
  }
  return currentBundle;
}

/**
 * Validate incoming policy bundle against current
 */
export function validateIncomingBundle(incomingBundle: PolicyBundle): {
  compatible: boolean;
  shouldReject: boolean;
  reason?: string;
} {
  const current = getCurrentPolicyBundle();
  
  const validation = validatePolicyBundle(incomingBundle);
  if (!validation.valid) {
    return {
      compatible: false,
      shouldReject: true,
      reason: `Invalid bundle: ${validation.errors.join(', ')}`
    };
  }

  if (!areBundlesCompatible(current, incomingBundle)) {
    return {
      compatible: false,
      shouldReject: true,
      reason: `Incompatible bundle: current v${current.version}:${current.hash}, incoming v${incomingBundle.version}:${incomingBundle.hash}`
    };
  }

  return {
    compatible: true,
    shouldReject: false
  };
}

/**
 * Get MFA TTL requirement for action
 */
export function getMFATTL(action: string): number | null {
  const bundle = getCurrentPolicyBundle();
  return bundle.policies.mfa_requirements[action] || null;
}

/**
 * Get audit requirements for action
 */
export function getAuditRequirements(action: string): string[] {
  const bundle = getCurrentPolicyBundle();
  return bundle.policies.audit_requirements[action] || [];
}

/**
 * Middleware to enforce policy bundle validation
 */
export function policyBundleMiddleware() {
  return (req: any, res: any, next: any) => {
    const bundle = getCurrentPolicyBundle();
    
    // Add policy hash to response headers
    res.set('X-Policy-Hash', bundle.hash);
    res.set('X-Policy-Version', bundle.version);
    
    // Check if client sent policy hash for validation
    const clientHash = req.headers['x-expected-policy-hash'];
    if (clientHash && clientHash !== bundle.hash) {
      return res.status(409).json({
        error: 'policy_hash_mismatch',
        message: 'Client and server policy bundles out of sync',
        server_hash: bundle.hash,
        client_hash: clientHash,
        details: 'Update your client or wait for deployment sync'
      });
    }

    next();
  };
}

/**
 * Export for testing
 */
export const testExports = {
  generatePolicyHash,
  POLICY_VERSION,
  MFA_REQUIREMENTS,
  AUDIT_REQUIREMENTS
};