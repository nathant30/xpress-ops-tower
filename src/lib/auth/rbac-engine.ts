// RBAC + ABAC Policy Engine - HARDENED VERSION
// Implements canonical 4-step decision flow: RBAC → Region → Sensitivity → Override
// With policy bundle validation and regression protection

import { 
  ABACContext, 
  ABACDecision, 
  PolicyEvaluationRequest, 
  PolicyEvaluationResponse,
  DataClass,
  PIIScope,
  XpressRole,
  XPRESS_ROLES,
  EnhancedUser,
  Permission
} from '@/types/rbac-abac';
import { logger } from '@/lib/security/productionLogger';
import { roleAllows, userAllows, type Role } from './allowed-actions';
import { 
  inRegionScope, 
  sensitivityOK, 
  overrideOK,
  expansionScopeOK,
  actionRequiresMFA,
  isValidPhilippinesRegion,
  type AuthorizationInput
} from './checks';
import { 
  getCurrentPolicyBundle,
  getMFATTL,
  getAuditRequirements,
  validateIncomingBundle,
  PolicyBundle
} from './policy-bundle';

export class RBACEngine {
  private cache = new Map<string, { result: ABACDecision; timestamp: number }>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  // Policy bundle configuration (from xpress_policy_bundle.json)
  private readonly POLICY_CONFIG = {
    denyByDefault: true,
    piiMaskingDefault: true,
    crossRegionOverride: {
      roles: ['support', 'risk_investigator'],
      requires: ['case_id', 'not_expired', 'audit_log'],
      mfaRequiredForPIIUnmask: true
    },
    dualControl: {
      payroll: ['hr_ops:initiate_payroll_run', 'finance_ops:approve_payout_batch'],
      refundsThreshold: 5000
    }
  };

  /**
   * Main policy evaluation entry point - HARDENED VERSION
   */
  async evaluatePolicy(request: PolicyEvaluationRequest): Promise<PolicyEvaluationResponse> {
    const startTime = Date.now();
    const bundle = getCurrentPolicyBundle();
    
    // 🔒 HARDENING: Validate audit requirements upfront
    const auditReqs = getAuditRequirements(request.action);
    if (auditReqs.length > 0) {
      const missingAudit = auditReqs.filter(req => !request.context[req]);
      if (missingAudit.length > 0) {
        return {
          decision: 'deny',
          reasons: [`Missing required audit context: ${missingAudit.join(', ')}`],
          obligations: undefined,
          metadata: {
            evaluationTime: Date.now() - startTime,
            rulesEvaluated: 1,
            cacheHit: false,
            policyHash: bundle.hash,
            policyVersion: bundle.version,
            auditFailure: true
          }
        };
      }
    }

    // 🔒 HARDENING: Enforce MFA TTL requirements
    const mfaTTL = getMFATTL(request.action);
    if (mfaTTL && request.context.mfaPresent) {
      // Validate MFA session age (implementation would check actual session)
      const mfaAge = request.context.mfaVerifiedAt ? Date.now() - request.context.mfaVerifiedAt : Infinity;
      if (mfaAge > mfaTTL * 1000) {
        return {
          decision: 'deny',
          reasons: [`MFA session expired: max ${mfaTTL}s, age ${Math.floor(mfaAge/1000)}s`],
          obligations: { requireMFA: true },
          metadata: {
            evaluationTime: Date.now() - startTime,
            rulesEvaluated: 1,
            cacheHit: false,
            policyHash: bundle.hash,
            policyVersion: bundle.version,
            mfaExpired: true
          }
        };
      }
    }

    const cacheKey = this.generateCacheKey(request);
    
    // Check cache after security validations
    const cached = this.cache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < this.CACHE_TTL) {
      return {
        decision: cached.result.allowed ? 'allow' : 'deny',
        reasons: [cached.result.reason],
        obligations: {
          maskFields: cached.result.maskedFields,
          requireMFA: cached.result.requiresMFA,
          auditLevel: cached.result.auditRequired ? 'enhanced' : 'standard'
        },
        metadata: {
          evaluationTime: Date.now() - startTime,
          rulesEvaluated: 0,
          cacheHit: true,
          policyHash: bundle.hash,
          policyVersion: bundle.version
        }
      };
    }

    // Perform full evaluation
    const result = await this.performFullEvaluation(request);
    
    // Cache the result
    this.cache.set(cacheKey, {
      result,
      timestamp: Date.now()
    });

    // Clean up old cache entries
    this.cleanupCache();

    const response: PolicyEvaluationResponse = {
      decision: result.allowed ? 'allow' : 'deny',
      reasons: [result.reason],
      obligations: result.allowed ? {
        maskFields: result.maskedFields,
        requireMFA: result.requiresMFA,
        auditLevel: result.auditRequired ? 'enhanced' : 'standard'
      } : undefined,
      metadata: {
        evaluationTime: Date.now() - startTime,
        rulesEvaluated: 5, // RBAC + Region + Sensitivity + Override + Expansion
        cacheHit: false,
        policyHash: bundle.hash,
        policyVersion: bundle.version
      }
    };

    return response;
  }

  /**
   * Legacy interface for current system compatibility
   */
  async checkAccess(context: ABACContext): Promise<ABACDecision> {
    const request: PolicyEvaluationRequest = {
      user: {
        id: 'legacy',
        roles: this.inferRolesFromPermissions(context.user.allowedRegions),
        permissions: [], // Would be populated from user context
        allowedRegions: context.user.allowedRegions,
        piiScope: context.user.piiScope,
        domain: context.user.domain
      },
      resource: {
        type: 'unknown',
        regionId: context.resource.regionId,
        dataClass: context.resource.dataClass,
        containsPII: context.resource.containsPII
      },
      action: context.resource.action,
      context: {
        channel: context.context.channel,
        mfaPresent: context.context.mfaPresent,
        ipAddress: context.context.ipASN,
        timestamp: context.context.timestamp
      }
    };

    const result = await this.evaluatePolicy(request);
    
    return {
      allowed: result.decision === 'allow',
      reason: result.reasons[0] || 'Access denied',
      requiresMFA: result.obligations?.requireMFA || false,
      maskedFields: result.obligations?.maskFields,
      auditRequired: result.obligations?.auditLevel === 'enhanced',
      conditions: []
    };
  }

  /**
   * NEW: Canonical 4-step evaluation flow
   * Fixes the permission resolution issues identified in testing
   */
  private async performFullEvaluation(request: PolicyEvaluationRequest): Promise<ABACDecision> {
    const { user, resource, action, context } = request;

    // Convert to standard input format
    const input: AuthorizationInput = {
      user: {
        role: user.roles[0] || 'unknown', // Take primary role
        allowed_regions: user.allowedRegions || [],
        pii_scope: user.piiScope || 'none'
      },
      resource: {
        action,
        region_id: resource.regionId,
        contains_pii: resource.containsPII,
        data_class: resource.dataClass
      },
      context: {
        mfa_present: context.mfaPresent,
        case_id: (context as any).caseId,
        now: Date.now(),
        escalation_expiry_ns: (context as any).escalationExpiryNs
      }
    };

    const decision = this.decide(input);
    
    // Convert back to ABACDecision format
    return {
      allowed: decision === "ALLOW",
      reason: this.getDecisionReason(decision, input),
      requiresMFA: this.shouldRequireMFA(input),
      auditRequired: this.shouldAudit(input),
      maskedFields: this.getMaskedFields(input),
      conditions: []
    };
  }

  /**
   * Core decision logic - the exact 4-step sequence from triage
   */
  private decide(input: AuthorizationInput): "ALLOW" | "DENY" {
    // Step 1: RBAC - Does role allow action?
    if (!roleAllows(input.user.role as Role, input.resource.action)) {
      return "DENY";
    }

    // Step 2: Region - Is user authorized for this region?  
    if (input.resource.region_id && !inRegionScope(input.user.allowed_regions, input.resource.region_id)) {
      // Check if override is possible before denying
      if (!overrideOK(input)) {
        return "DENY";
      }
    }

    // Step 3: Sensitivity - PII/MFA requirements met?
    if (!sensitivityOK(input)) {
      return "DENY";
    }

    // Step 4: Override - Case-bound cross-region access valid?
    if (!overrideOK(input)) {
      return "DENY";
    }

    // Step 5: Expansion Scope - Region state restrictions for expansion_manager
    if (!expansionScopeOK(input)) {
      return "DENY";
    }

    return "ALLOW";
  }

  private getDecisionReason(decision: "ALLOW" | "DENY", input: AuthorizationInput): string {
    if (decision === "ALLOW") {
      const isOverride = (input as any).__audit__?.type === "cross_region_override";
      return isOverride 
        ? `Cross-region override granted for case ${(input as any).__audit__.case_id}`
        : `RBAC permission granted for ${input.user.role} → ${input.resource.action}`;
    }

    // Determine specific denial reason by re-checking each step
    if (!roleAllows(input.user.role as Role, input.resource.action)) {
      return `Missing required permission: ${input.resource.action} not allowed for role ${input.user.role}`;
    }

    if (input.resource.region_id && !inRegionScope(input.user.allowed_regions, input.resource.region_id)) {
      return `Regional access denied: ${input.user.role} not authorized for region ${input.resource.region_id}`;
    }

    if (!sensitivityOK(input)) {
      if (input.resource.contains_pii) {
        if (input.user.pii_scope === "none") {
          return "PII access denied: user has no PII permissions";
        }
        if (input.user.pii_scope === "full" && !input.context.mfa_present) {
          return "MFA required for PII unmasking";
        }
      }
    }

    return "Access denied by authorization policy";
  }

  private shouldRequireMFA(input: AuthorizationInput): boolean {
    return actionRequiresMFA(input.resource.action, input.resource.data_class) ||
           (input.resource.contains_pii && input.user.pii_scope === "full");
  }

  private shouldAudit(input: AuthorizationInput): boolean {
    return !!(input as any).__audit__ || 
           input.resource.contains_pii ||
           input.resource.data_class === "restricted" ||
           input.resource.action.includes("admin") ||
           input.resource.action.includes("manage");
  }

  private getMaskedFields(input: AuthorizationInput): string[] {
    if (!input.resource.contains_pii) return [];
    
    if (input.user.pii_scope === "none") {
      return ["phone_number", "email", "address", "payment_info", "license_number"];
    }
    
    if (input.user.pii_scope === "masked") {
      return ["payment_info", "ssn", "license_number"];
    }
    
    // Full scope with MFA = no masking
    if (input.user.pii_scope === "full" && input.context.mfa_present) {
      return [];
    }
    
    // Full scope without MFA = partial masking
    return ["payment_info", "ssn"];
  }

  /**
   * Step 1: RBAC Evaluation - Check if user's roles allow the action
   */
  private evaluateRBACPermission(userRoles: string[], action: string): ABACDecision {
    const userPermissions = new Set<string>();
    
    // Collect all permissions from user roles
    for (const roleName of userRoles) {
      const role = XPRESS_ROLES[roleName as XpressRole];
      if (role) {
        role.permissions.forEach(permission => userPermissions.add(permission));
      }
    }

    // Check if action is allowed
    const allowed = userPermissions.has(action);
    
    return {
      allowed,
      reason: allowed 
        ? `Action '${action}' allowed by roles: ${userRoles.join(', ')}`
        : `Action '${action}' not permitted for roles: ${userRoles.join(', ')}`,
      requiresMFA: false,
      auditRequired: false,
      maskedFields: []
    };
  }

  /**
   * Step 2: Regional Access Evaluation
   */
  private evaluateRegionalAccess(userRegions: string[], resourceRegion?: string): ABACDecision {
    // Global access (no regional restrictions)
    if (userRegions.length === 0 || !resourceRegion) {
      return {
        allowed: true,
        reason: 'No regional restrictions',
        requiresMFA: false,
        auditRequired: false,
        maskedFields: []
      };
    }

    // Check if user has access to the specific region
    const allowed = userRegions.includes(resourceRegion);
    
    return {
      allowed,
      reason: allowed
        ? `Access granted to region ${resourceRegion}`
        : `Access denied to region ${resourceRegion}. User regions: ${userRegions.join(', ')}`,
      requiresMFA: false,
      auditRequired: !allowed, // Audit failed regional access
      maskedFields: []
    };
  }

  /**
   * Step 3: Data Sensitivity and PII Access Evaluation
   */
  private evaluateSensitivityAccess(
    userPIIScope: PIIScope, 
    dataClass: DataClass, 
    containsPII: boolean,
    mfaPresent: boolean
  ): ABACDecision {
    // Non-PII data - always allowed
    if (!containsPII) {
      return {
        allowed: true,
        reason: 'Resource contains no PII',
        requiresMFA: false,
        auditRequired: false,
        maskedFields: []
      };
    }

    // PII handling based on user scope
    switch (userPIIScope) {
      case 'none':
        return {
          allowed: false,
          reason: 'User has no PII access permissions',
          requiresMFA: false,
          auditRequired: true,
          maskedFields: []
        };

      case 'masked':
        // For restricted data, require MFA even for masked access
        if (dataClass === 'restricted' && !mfaPresent) {
          return {
            allowed: false,
            reason: 'Restricted PII requires MFA even for masked access',
            requiresMFA: true,
            auditRequired: true,
            maskedFields: []
          };
        }
        
        return {
          allowed: true,
          reason: 'Masked PII access granted',
          requiresMFA: false,
          auditRequired: dataClass === 'restricted',
          maskedFields: this.getDefaultMaskedFields(dataClass)
        };

      case 'full':
        // Full PII access for restricted data requires MFA
        if (dataClass === 'restricted' && !mfaPresent) {
          return {
            allowed: false,
            reason: 'Restricted PII unmasking requires MFA verification',
            requiresMFA: true,
            auditRequired: true,
            maskedFields: []
          };
        }
        
        return {
          allowed: true,
          reason: 'Full PII access granted',
          requiresMFA: dataClass === 'restricted',
          auditRequired: dataClass === 'restricted',
          maskedFields: []
        };

      default:
        return {
          allowed: false,
          reason: 'Invalid PII scope',
          requiresMFA: false,
          auditRequired: true,
          maskedFields: []
        };
    }
  }

  /**
   * Step 4: Cross-Region Override Path Evaluation
   * Allows support/risk_investigator roles to access any region with valid case
   */
  private evaluateOverridePath(user: any, context: any): ABACDecision {
    // Check if user has override-eligible role
    const hasOverrideRole = user.roles.some((role: string) => 
      this.POLICY_CONFIG.crossRegionOverride.roles.includes(role)
    );

    if (!hasOverrideRole) {
      return {
        allowed: true,
        reason: 'No override path applicable',
        requiresMFA: false,
        auditRequired: false,
        maskedFields: []
      };
    }

    // For support/risk roles, check for escalation context
    if (user.escalation?.caseId && user.escalation?.expiresAt > new Date()) {
      return {
        allowed: true,
        reason: `Cross-region override granted for case ${user.escalation.caseId}`,
        requiresMFA: true, // Always require MFA for overrides
        auditRequired: true, // Always audit overrides
        maskedFields: []
      };
    }

    // Override role without valid escalation
    return {
      allowed: true,
      reason: 'Override role with standard regional restrictions',
      requiresMFA: false,
      auditRequired: false,
      maskedFields: []
    };
  }

  /**
   * Combine multiple decision results
   */
  private combineDecisions(decisions: ABACDecision[]): ABACDecision {
    // All must be allowed for final allow
    const allAllowed = decisions.every(d => d.allowed);
    
    // Combine requirements
    const requiresMFA = decisions.some(d => d.requiresMFA);
    const auditRequired = decisions.some(d => d.auditRequired);
    const maskedFields = decisions.flatMap(d => d.maskedFields || []);
    
    // Get the first denial reason or success message
    const reason = allAllowed 
      ? 'Access granted by policy evaluation'
      : decisions.find(d => !d.allowed)?.reason || 'Access denied';

    return {
      allowed: allAllowed,
      reason,
      requiresMFA,
      auditRequired,
      maskedFields: [...new Set(maskedFields)], // Remove duplicates
      conditions: []
    };
  }

  /**
   * Get default masked fields based on data classification
   */
  private getDefaultMaskedFields(dataClass: DataClass): string[] {
    switch (dataClass) {
      case 'public':
        return [];
      case 'internal':
        return ['phone', 'email'];
      case 'confidential':
        return ['phone', 'email', 'address', 'ssn'];
      case 'restricted':
        return ['phone', 'email', 'address', 'ssn', 'payment_info', 'biometric_data'];
      default:
        return ['phone', 'email'];
    }
  }

  /**
   * Generate cache key for policy evaluation
   */
  private generateCacheKey(request: PolicyEvaluationRequest): string {
    const keyData = {
      roles: request.user.roles.sort(),
      regions: request.user.allowedRegions.sort(),
      piiScope: request.user.piiScope,
      domain: request.user.domain,
      resourceType: request.resource.type,
      resourceRegion: request.resource.regionId,
      dataClass: request.resource.dataClass,
      containsPII: request.resource.containsPII,
      action: request.action,
      mfaPresent: request.context.mfaPresent
    };
    
    return Buffer.from(JSON.stringify(keyData)).toString('base64');
  }

  /**
   * Clean up expired cache entries
   */
  private cleanupCache(): void {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > this.CACHE_TTL) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Infer roles from permissions (legacy compatibility)
   */
  private inferRolesFromPermissions(regions: string[]): string[] {
    // This is a fallback for legacy compatibility
    // In practice, roles should be explicitly stored
    return regions.length > 0 ? ['regional_manager'] : ['ops_monitor'];
  }

  /**
   * Validate and normalize user permissions
   */
  public validateUserPermissions(user: EnhancedUser): string[] {
    const permissions = new Set<string>();
    
    // Collect permissions from all active roles
    for (const roleAssignment of user.roles) {
      if (!roleAssignment.isActive) continue;
      
      // Check temporal validity
      const now = new Date();
      if (roleAssignment.validUntil && roleAssignment.validUntil < now) continue;
      
      // Add role permissions
      const roleName = roleAssignment.role?.name;
      if (roleName && XPRESS_ROLES[roleName]) {
        XPRESS_ROLES[roleName].permissions.forEach(perm => permissions.add(perm));
      }
    }

    // Add temporary access permissions
    if (user.temporaryAccess) {
      const now = new Date();
      for (const tempAccess of user.temporaryAccess) {
        if (tempAccess.isActive && tempAccess.expiresAt > now) {
          tempAccess.grantedPermissions.forEach(perm => permissions.add(perm));
        }
      }
    }

    return Array.from(permissions);
  }

  /**
   * Get effective regions for user (including temporary access)
   */
  public getEffectiveRegions(user: EnhancedUser): string[] {
    const regions = new Set(user.allowedRegions);
    
    // Add temporary access regions
    if (user.temporaryAccess) {
      const now = new Date();
      for (const tempAccess of user.temporaryAccess) {
        if (tempAccess.isActive && tempAccess.expiresAt > now) {
          tempAccess.grantedRegions.forEach(region => regions.add(region));
        }
      }
    }

    return Array.from(regions);
  }

  /**
   * Get effective PII scope (highest from user and temporary access)
   */
  public getEffectivePIIScope(user: EnhancedUser): PIIScope {
    let effectiveScope = user.piiScope;
    
    // Check temporary access for higher PII scope
    if (user.temporaryAccess) {
      const now = new Date();
      for (const tempAccess of user.temporaryAccess) {
        if (tempAccess.isActive && tempAccess.expiresAt > now && tempAccess.piiScopeOverride) {
          // PII scope hierarchy: none < masked < full
          if (effectiveScope === 'none' && tempAccess.piiScopeOverride !== 'none') {
            effectiveScope = tempAccess.piiScopeOverride;
          } else if (effectiveScope === 'masked' && tempAccess.piiScopeOverride === 'full') {
            effectiveScope = 'full';
          }
        }
      }
    }

    return effectiveScope;
  }

  /**
   * Log security event for audit
   */
  private logSecurityEvent(event: string, context: any): void {
    logger.security(`RBAC_EVENT: ${event}`, {
      ...context,
      timestamp: new Date().toISOString(),
      component: 'rbac-engine'
    });
  }
}

// Singleton instance
export const rbacEngine = new RBACEngine();

// Export utility functions
export function hasPermission(permissions: string[], required: string): boolean {
  return permissions.includes(required);
}

export function hasAnyPermission(permissions: string[], required: string[]): boolean {
  return required.some(perm => permissions.includes(perm));
}

export function hasAllPermissions(permissions: string[], required: string[]): boolean {
  return required.every(perm => permissions.includes(perm));
}

export function canAccessRegion(userRegions: string[], targetRegion: string): boolean {
  return userRegions.length === 0 || userRegions.includes(targetRegion);
}

export function requiresMFA(action: string, dataClass: DataClass): boolean {
  const mfaRequiredActions = [
    'unmask_pii_with_mfa',
    'approve_temp_access_region',
    'manage_users',
    'assign_roles',
    'set_pii_scope'
  ];
  
  return mfaRequiredActions.includes(action) || dataClass === 'restricted';
}