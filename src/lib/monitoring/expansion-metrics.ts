/**
 * Expansion Manager Metrics Collection
 * Provides observability for expansion operations and security monitoring
 */

import { createPrometheusRegistry, register } from '../observability/prometheus';
import { Counter, Histogram, Gauge } from 'prom-client';

// Metrics for expansion operations
export const expansionOperationsCounter = new Counter({
  name: 'expansion_operations_total',
  help: 'Total expansion manager operations performed',
  labelNames: [
    'user_id',
    'role', 
    'action',
    'region_id',
    'region_state',
    'result'  // success, failed, blocked
  ],
  registers: [register]
});

// Security violations specific to expansion_manager
export const expansionSecurityViolations = new Counter({
  name: 'security_violations_total',
  help: 'Security boundary violations by expansion_manager',
  labelNames: [
    'user_id',
    'role',
    'violation_type',  // active_region_access, permission_escalation, etc.
    'attempted_action',
    'region_id',
    'region_state'
  ],
  registers: [register]
});

// Handover timing metrics
export const expansionHandoverDuration = new Histogram({
  name: 'expansion_handover_duration_hours',
  help: 'Time taken for expansion to regional manager handover',
  labelNames: [
    'region_id',
    'expansion_user_id',
    'target_role',
    'handover_type'  // pilot_to_active, emergency, etc.
  ],
  buckets: [24, 72, 168, 336, 720, 1440], // 1d, 3d, 1w, 2w, 30d, 60d in hours
  registers: [register]
});

// Dual-control approval workflow metrics
export const dualControlApprovals = new Counter({
  name: 'dual_control_approvals_total', 
  help: 'Dual-control approval workflow events',
  labelNames: [
    'workflow_type',  // prelaunch_pricing, region_promotion, supply_campaigns
    'approval_status', // pending, approved, rejected, expired
    'primary_role',
    'secondary_role',
    'region_id'
  ],
  registers: [register]
});

// Region state distribution
export const regionsByState = new Gauge({
  name: 'regions_by_state_total',
  help: 'Number of regions in each state',
  labelNames: ['region_state'],
  registers: [register]
});

// Dual-control workflow timing
export const dualControlApprovalTime = new Histogram({
  name: 'dual_control_approval_duration_minutes',
  help: 'Time taken for dual-control approvals',
  labelNames: [
    'workflow_type',
    'approval_result'
  ],
  buckets: [5, 15, 30, 60, 120, 240, 480, 1440], // 5m to 24h
  registers: [register]
});

/**
 * Track expansion manager operations with security context
 */
export function recordExpansionOperation(params: {
  userId: string;
  action: string;
  regionId?: string;
  regionState?: 'prospect' | 'pilot' | 'active' | 'suspended';
  result: 'success' | 'failed' | 'blocked';
  metadata?: Record<string, any>;
}) {
  const { userId, action, regionId, regionState, result, metadata } = params;
  
  expansionOperationsCounter
    .labels({
      user_id: userId,
      role: 'expansion_manager',
      action,
      region_id: regionId || 'global',
      region_state: regionState || 'unknown',
      result
    })
    .inc();

  // Log security-relevant operations
  if (['promote_region_stage', 'configure_prelaunch_pricing_flagged'].includes(action)) {
    .toISOString(),
      metadata
    });
  }
}

/**
 * Record security violations for expansion_manager
 */
export function recordExpansionSecurityViolation(params: {
  userId: string;
  violationType: 'active_region_access' | 'permission_escalation' | 'boundary_violation';
  attemptedAction: string;
  regionId?: string;
  regionState?: string;
  context?: Record<string, any>;
}) {
  const { userId, violationType, attemptedAction, regionId, regionState, context } = params;

  expansionSecurityViolations
    .labels({
      user_id: userId,
      role: 'expansion_manager',
      violation_type: violationType,
      attempted_action: attemptedAction,
      region_id: regionId || 'unknown',
      region_state: regionState || 'unknown'
    })
    .inc();

  // Immediate security alert logging  
  console.error('🚨 EXPANSION SECURITY VIOLATION:', {
    type: 'security_violation',
    severity: 'HIGH',
    user_id: userId,
    violation_type: violationType,
    attempted_action: attemptedAction,
    region_id: regionId,
    region_state: regionState,
    timestamp: new Date().toISOString(),
    context
  });
}

/**
 * Record expansion to regional manager handover
 */
export function recordExpansionHandover(params: {
  regionId: string;
  expansionUserId: string;
  targetRole: string;
  handoverType: string;
  durationHours: number;
}) {
  const { regionId, expansionUserId, targetRole, handoverType, durationHours } = params;

  expansionHandoverDuration
    .labels({
      region_id: regionId,
      expansion_user_id: expansionUserId,
      target_role: targetRole,
      handover_type: handoverType
    })
    .observe(durationHours);

  .toISOString()
  });
}

/**
 * Record dual-control approval workflow events
 */
export function recordDualControlApproval(params: {
  workflowType: 'prelaunch_pricing' | 'region_promotion' | 'supply_campaigns';
  approvalStatus: 'pending' | 'approved' | 'rejected' | 'expired';
  primaryRole: string;
  secondaryRole?: string;
  regionId: string;
  durationMinutes?: number;
}) {
  const { workflowType, approvalStatus, primaryRole, secondaryRole, regionId, durationMinutes } = params;

  dualControlApprovals
    .labels({
      workflow_type: workflowType,
      approval_status: approvalStatus,
      primary_role: primaryRole,
      secondary_role: secondaryRole || 'pending',
      region_id: regionId
    })
    .inc();

  if (durationMinutes && ['approved', 'rejected'].includes(approvalStatus)) {
    dualControlApprovalTime
      .labels({
        workflow_type: workflowType,
        approval_result: approvalStatus
      })
      .observe(durationMinutes);
  }
}

/**
 * Update region state distribution metrics
 */
export function updateRegionStateMetrics(regionCounts: Record<string, number>) {
  // Reset all region state gauges
  regionsByState.reset();
  
  // Update with current counts
  Object.entries(regionCounts).forEach(([state, count]) => {
    regionsByState.labels({ region_state: state }).set(count);
  });
}

/**
 * Initialize expansion metrics collection
 */
export function initializeExpansionMetrics() {
  // Set up periodic region state updates
  setInterval(async () => {
    try {
      // This would be replaced with actual database query
      const regionCounts = {
        'prospect': 3,
        'pilot': 2, 
        'active': 8,
        'suspended': 0
      };
      
      updateRegionStateMetrics(regionCounts);
    } catch (error) {
      console.error('Failed to update region state metrics:', error);
    }
  }, 60000); // Update every minute
}

export default {
  recordExpansionOperation,
  recordExpansionSecurityViolation, 
  recordExpansionHandover,
  recordDualControlApproval,
  updateRegionStateMetrics,
  initializeExpansionMetrics
};