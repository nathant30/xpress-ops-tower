/**
 * MFA-Approval Workflow Integration for Xpress Ops Tower
 * Integrates the MFA system with the approval workflow system for enhanced security
 */

import { Permission } from '@/hooks/useRBAC';
import { mfaService, MFAMethod, MFAVerificationResult } from './mfa-service';
import { 
  ApprovalRequest, 
  TemporaryAccessToken, 
  ApprovalWorkflow,
  WorkflowDefinition 
} from '@/types/approval';
import { WORKFLOW_DEFINITIONS } from '@/lib/approval-workflows';

// =====================================================
// Enhanced Permission Context
// =====================================================

export interface EnhancedPermissionContext {
  permission: Permission;
  userId: string;
  userLevel: number;
  userRole: string;
  action?: string;
  resource?: string;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
}

export interface SecurityEvaluation {
  allowed: boolean;
  requiresMFA: boolean;
  requiresApproval: boolean;
  mfaVerified: boolean;
  approvalStatus: 'none' | 'pending' | 'approved' | 'rejected';
  temporaryAccess: boolean;
  sensitivityLevel: number;
  riskFactors: string[];
  nextActions: SecurityAction[];
}

export interface SecurityAction {
  type: 'mfa_challenge' | 'approval_request' | 'temporary_grant' | 'audit_log';
  method?: MFAMethod;
  approvalWorkflow?: string;
  message: string;
  required: boolean;
}

// =====================================================
// Enhanced Security Evaluator
// =====================================================

export class MFAApprovalIntegration {
  private static instance: MFAApprovalIntegration;

  public static getInstance(): MFAApprovalIntegration {
    if (!MFAApprovalIntegration.instance) {
      MFAApprovalIntegration.instance = new MFAApprovalIntegration();
    }
    return MFAApprovalIntegration.instance;
  }

  /**
   * Comprehensive security evaluation for permission access
   */
  public async evaluatePermissionAccess(
    context: EnhancedPermissionContext,
    options: {
      bypassMFA?: boolean;
      temporaryAccessToken?: string;
      approvalRequestId?: string;
      mfaToken?: string;
    } = {}
  ): Promise<SecurityEvaluation> {
    const sensitivityLevel = mfaService.getSensitivityLevel(context.permission);
    const requiresMFA = mfaService.requiresMFAForAction(context.permission, context.userLevel);
    
    // Check for existing approval workflow
    const workflow = WORKFLOW_DEFINITIONS[context.permission];
    const requiresApproval = !!workflow && workflow.required_level > context.userLevel;
    
    // Initialize evaluation
    const evaluation: SecurityEvaluation = {
      allowed: false,
      requiresMFA,
      requiresApproval,
      mfaVerified: false,
      approvalStatus: 'none',
      temporaryAccess: false,
      sensitivityLevel,
      riskFactors: [],
      nextActions: []
    };

    // Risk factor analysis
    evaluation.riskFactors = this.analyzeRiskFactors(context, sensitivityLevel);

    // Check temporary access token
    if (options.temporaryAccessToken) {
      const tempAccess = await this.validateTemporaryAccess(options.temporaryAccessToken, context);
      if (tempAccess.valid) {
        evaluation.temporaryAccess = true;
        evaluation.allowed = true;
        evaluation.mfaVerified = true; // Temp access assumes MFA was verified during approval
        return evaluation;
      }
    }

    // Check MFA verification status
    if (requiresMFA && !options.bypassMFA) {
      evaluation.mfaVerified = await this.checkMFAStatus(context, options.mfaToken);
      
      if (!evaluation.mfaVerified) {
        evaluation.nextActions.push({
          type: 'mfa_challenge',
          method: this.getPreferredMFAMethod(context.permission),
          message: `MFA verification required for ${context.permission}`,
          required: true
        });
        return evaluation;
      }
    }

    // Check approval workflow status
    if (requiresApproval) {
      const approvalStatus = await this.checkApprovalStatus(context, options.approvalRequestId);
      evaluation.approvalStatus = approvalStatus.status;

      if (approvalStatus.status === 'approved') {
        evaluation.allowed = true;
      } else if (approvalStatus.status === 'none') {
        evaluation.nextActions.push({
          type: 'approval_request',
          approvalWorkflow: context.permission,
          message: `Approval required for ${context.permission}`,
          required: true
        });
      } else if (approvalStatus.status === 'pending') {
        evaluation.nextActions.push({
          type: 'audit_log',
          message: 'Approval request pending review',
          required: false
        });
      }
      return evaluation;
    }

    // If no special requirements, allow access
    evaluation.allowed = !requiresMFA || evaluation.mfaVerified;

    return evaluation;
  }

  /**
   * Create MFA challenge with approval workflow context
   */
  public async createMFAChallengeWithContext(
    userId: string,
    permission: Permission,
    context: {
      action?: string;
      approvalRequestId?: string;
      ipAddress?: string;
      userAgent?: string;
    }
  ): Promise<{
    challengeId: string;
    expiresAt: Date;
    method: MFAMethod;
    sensitivityLevel: number;
    riskAssessment: any;
  } | null> {
    try {
      const method = this.getPreferredMFAMethod(permission);
      const sensitivityLevel = mfaService.getSensitivityLevel(permission);
      
      const challenge = await mfaService.createChallenge(
        userId,
        method,
        {
          action: context.action || permission,
          permission,
          ipAddress: context.ipAddress,
          userAgent: context.userAgent
        }
      );

      if (!challenge) return null;

      // Get risk assessment for this action
      const riskAssessment = await this.getRiskAssessment(permission, userId);

      // Log MFA challenge creation with approval context
      await this.auditSecurityEvent('mfa_challenge_created', {
        userId,
        permission,
        challengeId: challenge.challengeId,
        method,
        sensitivityLevel,
        approvalRequestId: context.approvalRequestId,
        riskLevel: riskAssessment.level,
        ipAddress: context.ipAddress
      });

      return {
        challengeId: challenge.challengeId,
        expiresAt: challenge.expiresAt,
        method,
        sensitivityLevel,
        riskAssessment
      };
    } catch (error) {
      console.error('Failed to create MFA challenge with context:', error);
      return null;
    }
  }

  /**
   * Verify MFA and potentially auto-approve low-risk actions
   */
  public async verifyMFAWithAutoApproval(
    challengeId: string,
    code: string,
    context: {
      userId: string;
      permission: Permission;
      approvalRequestId?: string;
      ipAddress?: string;
      userAgent?: string;
    }
  ): Promise<{
    mfaVerified: boolean;
    autoApproved: boolean;
    temporaryAccessToken?: string;
    approvalRequired: boolean;
    nextSteps: string[];
  }> {
    try {
      // Verify MFA challenge
      const mfaResult = await mfaService.verifyChallenge(challengeId, code, {
        ipAddress: context.ipAddress,
        userAgent: context.userAgent
      });

      if (!mfaResult.success) {
        return {
          mfaVerified: false,
          autoApproved: false,
          approvalRequired: false,
          nextSteps: ['Retry MFA verification']
        };
      }

      // Check if action can be auto-approved after MFA
      const sensitivityLevel = mfaService.getSensitivityLevel(context.permission);
      const workflow = WORKFLOW_DEFINITIONS[context.permission];
      
      let autoApproved = false;
      let temporaryAccessToken: string | undefined;
      let approvalRequired = !!workflow;

      // Auto-approve medium sensitivity actions with successful MFA
      if (sensitivityLevel <= 0.7 && mfaResult.success) {
        autoApproved = true;
        approvalRequired = false;
        
        // Create temporary access token
        temporaryAccessToken = await this.createTemporaryAccessToken(
          context.userId,
          [context.permission],
          workflow?.default_ttl_seconds || 1800, // 30 minutes default
          `Auto-approved after MFA verification for ${context.permission}`
        );
      }

      // Audit the verification and decision
      await this.auditSecurityEvent('mfa_verified_with_decision', {
        userId: context.userId,
        permission: context.permission,
        challengeId,
        mfaVerified: true,
        autoApproved,
        sensitivityLevel,
        approvalRequired,
        temporaryAccessToken: !!temporaryAccessToken,
        ipAddress: context.ipAddress
      });

      const nextSteps: string[] = [];
      if (autoApproved) {
        nextSteps.push('Access granted with temporary token');
      } else if (approvalRequired) {
        nextSteps.push('Submit for approval workflow');
      } else {
        nextSteps.push('Access granted');
      }

      return {
        mfaVerified: true,
        autoApproved,
        temporaryAccessToken,
        approvalRequired,
        nextSteps
      };

    } catch (error) {
      console.error('MFA verification with auto-approval failed:', error);
      return {
        mfaVerified: false,
        autoApproved: false,
        approvalRequired: false,
        nextSteps: ['System error - contact administrator']
      };
    }
  }

  /**
   * Create approval request with MFA pre-verification
   */
  public async createApprovalRequestWithMFA(
    userId: string,
    permission: Permission,
    context: {
      justification: string;
      mfaChallengeId?: string;
      action: string;
      metadata?: Record<string, any>;
    }
  ): Promise<{
    approvalRequestId: string;
    workflow: WorkflowDefinition;
    mfaRequired: boolean;
    estimatedApprovalTime: string;
  } | null> {
    try {
      const workflow = WORKFLOW_DEFINITIONS[permission];
      if (!workflow) {
        throw new Error(`No workflow defined for permission: ${permission}`);
      }

      // Check if MFA is required and verified for this workflow
      const mfaRequired = workflow.mfa_required_for_approval || mfaService.requiresMFAForAction(permission);
      
      // Create approval request
      const approvalRequestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // In production, this would create the request in the database
      await this.createApprovalRequest({
        requestId: approvalRequestId,
        userId,
        workflowAction: permission,
        justification: context.justification,
        requestedAction: {
          action: context.action,
          permission,
          metadata: context.metadata
        },
        mfaChallengeId: context.mfaChallengeId,
        priority: this.calculatePriority(permission),
        sensitivityLevel: mfaService.getSensitivityLevel(permission)
      });

      // Audit approval request creation
      await this.auditSecurityEvent('approval_request_created', {
        userId,
        permission,
        approvalRequestId,
        mfaRequired,
        sensitivityLevel: workflow.sensitivity_level,
        mfaChallengeId: context.mfaChallengeId
      });

      return {
        approvalRequestId,
        workflow,
        mfaRequired,
        estimatedApprovalTime: this.getEstimatedApprovalTime(workflow)
      };

    } catch (error) {
      console.error('Failed to create approval request with MFA:', error);
      return null;
    }
  }

  // =====================================================
  // Private Helper Methods
  // =====================================================

  private analyzeRiskFactors(
    context: EnhancedPermissionContext,
    sensitivityLevel: number
  ): string[] {
    const factors: string[] = [];

    if (sensitivityLevel > 0.8) {
      factors.push('High sensitivity action');
    }

    if (context.permission.includes('pii') || context.permission.includes('unmask')) {
      factors.push('PII data access');
    }

    if (context.permission.includes('financial') || context.permission.includes('payout')) {
      factors.push('Financial operation');
    }

    if (context.permission.includes('cross_region')) {
      factors.push('Cross-region access');
    }

    // Add more risk factors based on context
    if (context.userLevel < 40 && sensitivityLevel > 0.6) {
      factors.push('User level below typical threshold for this action');
    }

    return factors;
  }

  private getPreferredMFAMethod(permission: Permission): MFAMethod {
    const allowedMethods = mfaService.getAllowedMethods(permission);
    
    // Prefer TOTP for high-security operations
    if (allowedMethods.includes('totp')) return 'totp';
    if (allowedMethods.includes('sms')) return 'sms';
    if (allowedMethods.includes('email')) return 'email';
    
    return 'totp'; // Default fallback
  }

  private async checkMFAStatus(
    context: EnhancedPermissionContext,
    mfaToken?: string
  ): Promise<boolean> {
    // In production, this would check the user's current MFA session
    // For now, check if MFA token exists and is valid
    if (mfaToken) {
      try {
        // Decode and validate MFA token
        const payload = JSON.parse(atob(mfaToken.split('.')[1]));
        return payload.mfa_verified && payload.exp * 1000 > Date.now();
      } catch {
        return false;
      }
    }
    return false;
  }

  private async checkApprovalStatus(
    context: EnhancedPermissionContext,
    approvalRequestId?: string
  ): Promise<{ status: 'none' | 'pending' | 'approved' | 'rejected' }> {
    if (!approvalRequestId) {
      return { status: 'none' };
    }

    // In production, query the approval_requests table
    // For now, return mock status
    return { status: 'pending' };
  }

  private async validateTemporaryAccess(
    token: string,
    context: EnhancedPermissionContext
  ): Promise<{ valid: boolean; permissions?: Permission[] }> {
    // In production, validate temporary access token against database
    // For now, return mock validation
    return { valid: false };
  }

  private async getRiskAssessment(
    permission: Permission,
    userId: string
  ): Promise<{ level: 'low' | 'medium' | 'high' | 'critical'; factors: string[] }> {
    const sensitivityLevel = mfaService.getSensitivityLevel(permission);
    
    if (sensitivityLevel > 0.8) return { level: 'critical', factors: ['High sensitivity'] };
    if (sensitivityLevel > 0.6) return { level: 'high', factors: ['Medium-high sensitivity'] };
    if (sensitivityLevel > 0.4) return { level: 'medium', factors: ['Medium sensitivity'] };
    
    return { level: 'low', factors: ['Low sensitivity'] };
  }

  private async createTemporaryAccessToken(
    userId: string,
    permissions: Permission[],
    ttlSeconds: number,
    justification: string
  ): Promise<string> {
    // In production, create temporary access token in database
    return `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async createApprovalRequest(data: {
    requestId: string;
    userId: string;
    workflowAction: string;
    justification: string;
    requestedAction: any;
    mfaChallengeId?: string;
    priority: number;
    sensitivityLevel: number;
  }): Promise<void> {
    // In production, insert into approval_requests table
    }

  private calculatePriority(permission: Permission): number {
    const sensitivityLevel = mfaService.getSensitivityLevel(permission);
    return Math.ceil(sensitivityLevel * 10);
  }

  private getEstimatedApprovalTime(workflow: WorkflowDefinition): string {
    if (workflow.dual_approval_required) {
      return workflow.sensitivity_level === 'critical' ? '8-12 hours' : '4-8 hours';
    }
    return workflow.sensitivity_level === 'critical' ? '4-6 hours' : '2-4 hours';
  }

  private async auditSecurityEvent(
    eventType: string,
    details: Record<string, any>
  ): Promise<void> {
    // In production, log to security audit system
    }
}

// Export singleton instance
export const mfaApprovalIntegration = MFAApprovalIntegration.getInstance();

// Export convenience functions
export const evaluatePermissionAccess = (context: EnhancedPermissionContext, options?: any) =>
  mfaApprovalIntegration.evaluatePermissionAccess(context, options);

export const createMFAChallengeWithContext = (userId: string, permission: Permission, context: any) =>
  mfaApprovalIntegration.createMFAChallengeWithContext(userId, permission, context);

export const verifyMFAWithAutoApproval = (challengeId: string, code: string, context: any) =>
  mfaApprovalIntegration.verifyMFAWithAutoApproval(challengeId, code, context);