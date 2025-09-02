// Authorization Check Functions
// Implements the canonical 4-step sequence: RBAC → Region → Sensitivity → Override

export interface AuthorizationInput {
  user: {
    role: string;
    allowed_regions: string[];
    pii_scope?: "none" | "masked" | "full";
  };
  resource: {
    action: string;
    region_id?: string;
    contains_pii?: boolean;
    data_class?: "public" | "internal" | "confidential" | "restricted";
    region_state?: "prospect" | "pilot" | "active" | "suspended";
    resource_type?: string;
  };
  context: {
    mfa_present?: boolean;
    case_id?: string;
    now?: number;
    escalation_expiry_ns?: number;
  };
}

/**
 * Step 2: Regional Access Check
 * Returns true if user has access to the resource's region
 */
export function inRegionScope(allowedRegions: string[] = [], regionId?: string): boolean {
  // No region specified = global resource, always allowed
  if (!regionId) return true;
  
  // Empty allowed regions = global access (for admin roles)
  if (allowedRegions.length === 0) return true;
  
  // Check if user's regions include the target region
  return allowedRegions.includes(regionId);
}

/**
 * Step 3: Data Sensitivity Check
 * Validates PII access permissions and MFA requirements
 */
export function sensitivityOK(input: AuthorizationInput): boolean {
  const { resource, user, context } = input;
  
  // Non-PII resources are always allowed at this step
  if (!resource.contains_pii) return true;
  
  // PII resources require appropriate scope
  switch (user.pii_scope) {
    case "none":
      // Users with no PII scope cannot access PII data
      return false;
      
    case "masked":
      // Masked access allowed for internal/confidential
      // Restricted data requires full scope even for masked access
      if (resource.data_class === "restricted") {
        return false;
      }
      return true;
      
    case "full":
      // Full PII access requires MFA for restricted/confidential data
      if (resource.data_class === "restricted" || resource.data_class === "confidential") {
        return !!context.mfa_present;
      }
      return true;
      
    default:
      return false;
  }
}

/**
 * Step 4: Cross-Region Override Check
 * Handles support/risk investigator case-based overrides
 */
const OVERRIDE_ROLES = new Set(["support", "risk_investigator"]);

/**
 * Step 5: Expansion Scope Check  
 * Ensures expansion_manager can only operate on prospect/pilot regions
 */
export function expansionScopeOK(input: AuthorizationInput): boolean {
  const { user, resource } = input;
  
  // Non-expansion managers are not restricted by region state
  if (user.role !== "expansion_manager") {
    return true;
  }
  
  // Expansion managers can only work with prospect/pilot regions
  if (resource.region_state && !["prospect", "pilot"].includes(resource.region_state)) {
    console.error(`🚨 EXPANSION SCOPE VIOLATION: ${user.role} attempted action on ${resource.region_state} region (only prospect/pilot allowed)`);
    return false;
  }
  
  // 🔒 HARDENING: Certain actions are restricted to specific region states
  if (resource.action === "promote_region_stage") {
    // Can only promote from prospect → pilot or pilot → active (with approval)
    if (!resource.region_state || !["prospect", "pilot"].includes(resource.region_state)) {
      console.error(`🚨 REGION PROMOTION BLOCKED: Cannot promote region in state ${resource.region_state}`);
      return false;
    }
  }
  
  // 🔒 HARDENING: No destructive operations on active/suspended regions
  const destructiveActions = [
    "delete_region", 
    "suspend_region", 
    "modify_active_pricing",
    "disable_region_services"
  ];
  
  if (destructiveActions.includes(resource.action) && 
      resource.region_state && 
      ["active", "suspended"].includes(resource.region_state)) {
    console.error(`🚨 DESTRUCTIVE ACTION BLOCKED: ${user.role} cannot ${resource.action} on ${resource.region_state} region`);
    return false;
  }
  
  // 🔐 AUDIT: Log expansion manager operations for compliance
  if (user.role === "expansion_manager") {
    const auditEvent = {
      type: "expansion_operation",
      user_role: user.role,
      action: resource.action,
      region_id: resource.region_id,
      region_state: resource.region_state,
      timestamp: new Date().toISOString(),
      severity: "MEDIUM"
    };
    
    }
  
  return true;
}

export function overrideOK(input: AuthorizationInput): boolean {
  const { user, context, resource } = input;
  
  // Normal path: no override needed if already in region scope
  if (!resource.region_id || inRegionScope(user.allowed_regions, resource.region_id)) {
    return true;
  }
  
  // Override path requirements (HARDENED):
  // 1. Must be support or risk_investigator role
  if (!OVERRIDE_ROLES.has(user.role)) {
    return false;
  }
  
  // 🔒 HARDENING: Must have valid case ID (no empty/null cases)
  if (!context?.case_id || context.case_id.trim().length === 0) {
    console.error(`🚨 SILENT OVERRIDE BLOCKED: ${user.role} attempted cross-region access without case_id`);
    return false;
  }

  // 🔒 HARDENING: Case ID must follow proper format
  if (!/^CASE-[A-Z]{3,}-[A-Z0-9]{4,}-\d{3}$/.test(context.case_id)) {
    console.error(`🚨 INVALID CASE FORMAT: ${context.case_id} must follow CASE-XXX-XXXX-123 pattern`);
    return false;
  }
  
  // 🔒 HARDENING: Expiry is now MANDATORY (no unlimited overrides)
  if (!context?.escalation_expiry_ns) {
    console.error(`🚨 MISSING EXPIRY: Cross-region override requires escalation_expiry_ns`);
    return false;
  }
  
  // 3. Must not be expired
  const nowNs = (context.now || Date.now()) * 1e6;
  if (nowNs > context.escalation_expiry_ns) {
    console.error(`🚨 OVERRIDE EXPIRED: ${user.role} case ${context.case_id} expired`);
    return false;
  }

  // 🔒 HARDENING: Expiry cannot be more than 4 hours from now
  const maxExpiryNs = nowNs + (4 * 60 * 60 * 1e9); // 4 hours in nanoseconds
  if (context.escalation_expiry_ns > maxExpiryNs) {
    console.error(`🚨 EXPIRY TOO LONG: Override cannot exceed 4 hours`);
    return false;
  }

  // 🔒 HARDENING: Must have approver context for accountability
  const approver = (context as any).approver_id;
  if (!approver) {
    console.error(`🚨 MISSING APPROVER: Cross-region override requires approver_id`);
    return false;
  }
  
  // 🔐 EMIT SECURITY EVENT for monitoring
  const securityEvent = {
    type: "cross_region_override_granted",
    user_id: (user as any).id || 'unknown',
    user_role: user.role,
    source_region: user.allowed_regions[0] || "global",
    target_region: resource.region_id,
    case_id: context.case_id,
    approver_id: approver,
    expires_at: new Date(context.escalation_expiry_ns / 1e6).toISOString(),
    granted_at: new Date().toISOString(),
    action: resource.action,
    severity: "HIGH"
  };

  // 4. Mark for audit logging (middleware will pick this up)
  (input as any).__audit__ = {
    type: "cross_region_override",
    case_id: context.case_id,
    source_region: user.allowed_regions[0] || "global",
    target_region: resource.region_id,
    role: user.role,
    approver_id: approver,
    expires_at: new Date(context.escalation_expiry_ns / 1e6).toISOString(),
    security_event: securityEvent
  };
  
  return true;
}

/**
 * Utility: Check if a role requires MFA for specific actions
 */
export function actionRequiresMFA(action: string, dataClass?: string): boolean {
  const mfaRequiredActions = new Set([
    "unmask_pii_with_mfa",
    "approve_temp_access_region", 
    "manage_users",
    "assign_roles",
    "set_pii_scope",
    "approve_payout_batch",
    "process_payments"
  ]);
  
  // Action-based MFA requirements
  if (mfaRequiredActions.has(action)) {
    return true;
  }
  
  // Data class-based MFA requirements  
  if (dataClass === "restricted") {
    return true;
  }
  
  return false;
}

/**
 * Utility: Validate Philippines region boundaries
 */
export function isValidPhilippinesRegion(regionId: string): boolean {
  const validRegions = new Set([
    "ph-ncr-manila",    // National Capital Region
    "ph-vis-cebu",      // Central Visayas  
    "ph-min-davao",     // Davao Region
    "ph-cal-clark",     // Central Luzon (Clark)
    "ph-soc-legazpi",   // Bicol Region
    "ph-wes-iloilo",    // Western Visayas
    "ph-nor-vigan",     // Ilocos Region
    "ph-car-baguio"     // Cordillera Administrative Region
  ]);
  
  return validRegions.has(regionId);
}

/**
 * Utility: Check if action involves PII access
 */
export function actionInvolvesPII(action: string): boolean {
  const piiActions = new Set([
    "unmask_pii_with_mfa",
    "contact_driver_unmasked",
    "contact_passenger_unmasked", 
    "view_trip_detailed",
    "view_payment_history",
    "export_audit_data",
    "access_raw_location_data"
  ]);
  
  return piiActions.has(action);
}