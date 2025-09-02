// Enhanced Role Management API
// RBAC compliant role operations

import { NextRequest } from 'next/server';
import { withEnhancedAuth, AuthenticatedRequest } from '@/lib/auth/enhanced-auth';
import { 
  EnhancedUser, 
  Role,
  RoleAssignmentRequest
} from '@/types/rbac-abac';
import { 
  createApiResponse, 
  createApiError,
  createValidationError,
  validateRequiredFields 
} from '@/lib/api-utils';
import { XPRESS_ROLES } from '@/types/rbac-abac';
import { logger } from '@/lib/security/productionLogger';

// GET /api/auth/enhanced/roles - List all available roles
export const GET = withEnhancedAuth({
  requiredPermissions: ['manage_users', 'assign_roles'],
  dataClass: 'internal'
})(async (request: AuthenticatedRequest, user: EnhancedUser) => {
  try {
    // Get assignable roles based on user's privilege level
    const userMaxLevel = Math.max(...user.roles.map(r => r.role?.level || 0));
    const assignableRoles = Object.entries(XPRESS_ROLES)
      .filter(([_, roleData]) => roleData.level < userMaxLevel)
      .map(([roleName, roleData]) => ({
        name: roleName,
        displayName: roleData.displayName,
        level: roleData.level,
        permissions: roleData.permissions,
        canAssign: true
      }));

    // Add roles user cannot assign (for reference)
    const nonAssignableRoles = Object.entries(XPRESS_ROLES)
      .filter(([_, roleData]) => roleData.level >= userMaxLevel)
      .map(([roleName, roleData]) => ({
        name: roleName,
        displayName: roleData.displayName,
        level: roleData.level,
        permissions: roleData.permissions,
        canAssign: false
      }));

    const allRoles = [...assignableRoles, ...nonAssignableRoles]
      .sort((a, b) => a.level - b.level);

    return createApiResponse({
      roles: allRoles,
      userMaxLevel,
      assignableCount: assignableRoles.length
    }, 'Roles retrieved successfully');

  } catch (error) {
    logger.error('Enhanced roles GET error:', error);
    return createApiError(
      'Failed to retrieve roles',
      'ROLE_RETRIEVAL_FAILED',
      500,
      {},
      '/api/auth/enhanced/roles',
      'GET'
    );
  }
});

// POST /api/auth/enhanced/roles/assign - Assign roles to user
export const POST = withEnhancedAuth({
  requiredPermissions: ['assign_roles'],
  requireMFA: true,
  dataClass: 'confidential'
})(async (request: AuthenticatedRequest, user: EnhancedUser) => {
  try {
    const body = await request.json();
    const { userId, ...assignmentData } = body;
    
    if (!userId) {
      return createApiError(
        'User ID is required',
        'MISSING_USER_ID',
        400,
        {},
        '/api/auth/enhanced/roles/assign',
        'POST'
      );
    }

    // Validate assignment data
    const validationErrors = validateRoleAssignment(assignmentData as RoleAssignmentRequest, user);
    if (validationErrors.length > 0) {
      return createValidationError(validationErrors, '/api/auth/enhanced/roles/assign', 'POST');
    }

    // Check if target user exists and can be modified
    const targetUser = await findUserById(userId);
    if (!targetUser) {
      return createApiError(
        'Target user not found',
        'USER_NOT_FOUND',
        404,
        { userId },
        '/api/auth/enhanced/roles/assign',
        'POST'
      );
    }

    // Check privilege hierarchy
    const canAssign = await canUserAssignRoles(user, assignmentData.roleIds, targetUser);
    if (!canAssign.allowed) {
      return createApiError(
        canAssign.reason,
        'INSUFFICIENT_PRIVILEGES',
        403,
        { userId },
        '/api/auth/enhanced/roles/assign',
        'POST'
      );
    }

    // Assign roles
    const assignments = await assignRolesToUser(userId, assignmentData, user.id);

    // Audit the assignment
    await auditRoleAction('roles_assigned', user.id, userId, {
      assignedRoles: assignmentData.roleIds,
      allowedRegions: assignmentData.allowedRegions,
      validUntil: assignmentData.validUntil,
      justification: assignmentData.justification
    });

    return createApiResponse({
      assignments,
      message: 'Roles assigned successfully'
    }, 'Roles assigned successfully', 201);

  } catch (error) {
    logger.error('Enhanced roles assignment error:', error);
    return createApiError(
      'Failed to assign roles',
      'ROLE_ASSIGNMENT_FAILED',
      500,
      {},
      '/api/auth/enhanced/roles/assign',
      'POST'
    );
  }
});

// Helper Functions

function validateRoleAssignment(
  assignment: RoleAssignmentRequest, 
  assigningUser: EnhancedUser
): any[] {
  const errors = [];

  // Validate required fields
  const requiredErrors = validateRequiredFields(assignment, ['roleIds', 'justification']);
  errors.push(...requiredErrors);

  // Validate role IDs
  if (assignment.roleIds?.length) {
    const invalidRoles = assignment.roleIds.filter(roleId => !XPRESS_ROLES[roleId as keyof typeof XPRESS_ROLES]);
    if (invalidRoles.length > 0) {
      errors.push({
        field: 'roleIds',
        message: `Invalid role IDs: ${invalidRoles.join(', ')}`,
        code: 'INVALID_ROLE_IDS'
      });
    }

    // Check privilege hierarchy
    const assigningUserMaxLevel = Math.max(...assigningUser.roles.map(r => r.role?.level || 0));
    const assigningRoleMaxLevel = Math.max(...assignment.roleIds.map(roleId => 
      XPRESS_ROLES[roleId as keyof typeof XPRESS_ROLES]?.level || 0
    ));

    if (assigningRoleMaxLevel >= assigningUserMaxLevel) {
      errors.push({
        field: 'roleIds',
        message: 'Cannot assign roles with equal or higher privilege level',
        code: 'INSUFFICIENT_PRIVILEGE_LEVEL'
      });
    }
  }

  // Validate temporal restrictions
  if (assignment.validUntil && assignment.validUntil <= new Date()) {
    errors.push({
      field: 'validUntil',
      message: 'Valid until date must be in the future',
      code: 'INVALID_VALID_UNTIL'
    });
  }

  // Validate regional restrictions
  if (assignment.allowedRegions?.length) {
    // Check if assigning user can grant access to these regions
    const assigningUserRegions = assigningUser.allowedRegions;
    if (assigningUserRegions.length > 0) {
      const invalidRegions = assignment.allowedRegions.filter(region => 
        !assigningUserRegions.includes(region)
      );
      if (invalidRegions.length > 0) {
        errors.push({
          field: 'allowedRegions',
          message: `Cannot grant access to regions: ${invalidRegions.join(', ')}`,
          code: 'INVALID_REGION_ACCESS'
        });
      }
    }
  }

  return errors;
}

async function canUserAssignRoles(
  assigningUser: EnhancedUser, 
  roleIds: string[], 
  targetUser: any
): Promise<{ allowed: boolean; reason: string }> {
  
  // Cannot assign roles to users with equal or higher privilege
  const assigningUserMaxLevel = Math.max(...assigningUser.roles.map(r => r.role?.level || 0));
  const targetUserMaxLevel = Math.max(...(targetUser.roles?.map((r: any) => r.level || 0) || [0]));
  
  if (targetUserMaxLevel >= assigningUserMaxLevel) {
    return {
      allowed: false,
      reason: 'Cannot assign roles to users with equal or higher privilege level'
    };
  }

  // Check if all roles can be assigned
  const maxRoleLevel = Math.max(...roleIds.map(roleId => 
    XPRESS_ROLES[roleId as keyof typeof XPRESS_ROLES]?.level || 0
  ));

  if (maxRoleLevel >= assigningUserMaxLevel) {
    return {
      allowed: false,
      reason: 'Cannot assign roles with equal or higher privilege level than your own'
    };
  }

  return { allowed: true, reason: 'Assignment allowed' };
}

async function assignRolesToUser(
  userId: string, 
  assignment: RoleAssignmentRequest, 
  assignedBy: string
): Promise<any[]> {
  // Mock implementation - in production this would:
  // 1. Deactivate existing role assignments for the user
  // 2. Create new user_roles records
  // 3. Return the created assignments

  const assignments = assignment.roleIds.map(roleId => ({
    id: `assignment-${Date.now()}-${roleId}`,
    userId,
    roleId,
    allowedRegions: assignment.allowedRegions || [],
    validFrom: new Date(),
    validUntil: assignment.validUntil,
    assignedBy,
    assignedAt: new Date(),
    isActive: true
  }));

  // In production: INSERT INTO user_roles (...)
  logger.info('Role assignments created', { userId, assignments });

  return assignments;
}

async function findUserById(userId: string): Promise<any | null> {
  // Mock implementation
  return {
    id: userId,
    email: 'user@example.com',
    roles: []
  };
}

async function auditRoleAction(
  action: string, 
  actorId: string, 
  targetUserId: string, 
  details: any
): Promise<void> {
  // In production, this would insert into user_management_audit table
  logger.info(`ROLE_MANAGEMENT_AUDIT: ${action}`, {
    actorId,
    targetUserId,
    details,
    timestamp: new Date()
  });
}