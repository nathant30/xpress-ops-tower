// Enhanced User Management API
// RBAC + ABAC compliant user operations

import { NextRequest } from 'next/server';
import { withEnhancedAuth, AuthenticatedRequest } from '@/lib/auth/enhanced-auth';
import { 
  EnhancedUser, 
  UserCreateRequest, 
  UserUpdateRequest,
  UserWithRolesView,
  XpressRole
} from '@/types/rbac-abac';
import { 
  createApiResponse, 
  createApiError,
  createValidationError,
  validateRequiredFields,
  parsePaginationParams,
  parseQueryParams 
} from '@/lib/api-utils';
import { rbacEngine } from '@/lib/auth/rbac-engine';
import { logger } from '@/lib/security/productionLogger';

// GET /api/auth/enhanced/users - List users with RBAC filtering
export const GET = withEnhancedAuth({
  requiredPermissions: ['manage_users', 'view_employee_profile'],
  dataClass: 'confidential'
})(async (request: AuthenticatedRequest, user: EnhancedUser) => {
  try {
    const queryParams = parseQueryParams(request);
    const paginationParams = parsePaginationParams(request);
    
    // Apply regional filtering based on user's allowed regions
    const effectiveRegions = rbacEngine.getEffectiveRegions(user);
    let regionFilter = queryParams.region;
    
    // Non-admin users see only their regions
    if (!user.roles.some(r => ['app_admin', 'iam_admin'].includes(r.role?.name || ''))) {
      regionFilter = effectiveRegions.length > 0 ? effectiveRegions : undefined;
    }
    
    // Build query filters
    const filters = {
      status: queryParams.status,
      role: queryParams.role as XpressRole,
      region: regionFilter,
      search: queryParams.search,
      domain: queryParams.domain,
      piiScope: queryParams.piiScope
    };
    
    // Get users with role information
    const users = await getUsersWithRoles(filters, paginationParams);
    
    // Apply data masking based on user's PII scope
    const effectivePIIScope = rbacEngine.getEffectivePIIScope(user);
    const maskedUsers = maskUserData(users, effectivePIIScope);
    
    return createApiResponse(maskedUsers, 'Users retrieved successfully');
    
  } catch (error) {
    logger.error('Enhanced users GET error:', error);
    return createApiError(
      'Failed to retrieve users',
      'USER_RETRIEVAL_FAILED',
      500,
      {},
      '/api/auth/enhanced/users',
      'GET'
    );
  }
});

// POST /api/auth/enhanced/users - Create new user
export const POST = withEnhancedAuth({
  requiredPermissions: ['manage_users'],
  requireMFA: true,
  dataClass: 'confidential'
})(async (request: AuthenticatedRequest, user: EnhancedUser) => {
  try {
    const body = await request.json() as UserCreateRequest;
    
    // Validate required fields
    const requiredFields = ['email', 'firstName', 'lastName', 'roles'];
    const validationErrors = validateRequiredFields(body, requiredFields);
    
    // Additional validation
    if (!isValidEmail(body.email)) {
      validationErrors.push({
        field: 'email',
        message: 'Invalid email format',
        code: 'INVALID_EMAIL'
      });
    }
    
    // Validate roles exist and user can assign them
    const roleValidation = await validateRoleAssignment(body.roles, user);
    if (!roleValidation.valid) {
      validationErrors.push({
        field: 'roles',
        message: roleValidation.message,
        code: 'INVALID_ROLE_ASSIGNMENT'
      });
    }
    
    // Validate regional restrictions
    if (body.allowedRegions?.length) {
      const regionValidation = validateRegionalAccess(body.allowedRegions, user);
      if (!regionValidation.valid) {
        validationErrors.push({
          field: 'allowedRegions',
          message: regionValidation.message,
          code: 'INVALID_REGION_ACCESS'
        });
      }
    }
    
    if (validationErrors.length > 0) {
      return createValidationError(validationErrors, '/api/auth/enhanced/users', 'POST');
    }
    
    // Check if user already exists
    const existingUser = await findUserByEmail(body.email);
    if (existingUser) {
      return createApiError(
        'User with this email already exists',
        'DUPLICATE_EMAIL',
        409,
        { email: body.email },
        '/api/auth/enhanced/users',
        'POST'
      );
    }
    
    // Create new user
    const newUser = await createUser(body, user.id);
    
    // Audit the creation
    await auditUserAction('user_created', user.id, newUser.id, {
      email: body.email,
      roles: body.roles
    });
    
    return createApiResponse(
      { user: maskUserData([newUser], 'masked')[0] },
      'User created successfully',
      201
    );
    
  } catch (error) {
    logger.error('Enhanced users POST error:', error);
    return createApiError(
      'Failed to create user',
      'USER_CREATION_FAILED',
      500,
      {},
      '/api/auth/enhanced/users',
      'POST'
    );
  }
});

// PUT /api/auth/enhanced/users/[id] - Update user
export const PUT = withEnhancedAuth({
  requiredPermissions: ['manage_users'],
  dataClass: 'confidential'
})(async (request: AuthenticatedRequest, user: EnhancedUser) => {
  try {
    const userId = extractUserIdFromPath(request);
    if (!userId) {
      return createApiError(
        'User ID is required',
        'MISSING_USER_ID',
        400,
        {},
        request.nextUrl.pathname,
        'PUT'
      );
    }
    
    const body = await request.json() as UserUpdateRequest;
    
    // Get existing user
    const existingUser = await findUserById(userId);
    if (!existingUser) {
      return createApiError(
        'User not found',
        'USER_NOT_FOUND',
        404,
        { userId },
        request.nextUrl.pathname,
        'PUT'
      );
    }
    
    // Check if user can modify this target user
    const canModify = await canUserModifyTarget(user, existingUser);
    if (!canModify.allowed) {
      return createApiError(
        canModify.reason,
        'INSUFFICIENT_PRIVILEGES',
        403,
        { userId },
        request.nextUrl.pathname,
        'PUT'
      );
    }
    
    // Validate updates
    const validationErrors = validateUserUpdates(body, user);
    if (validationErrors.length > 0) {
      return createValidationError(validationErrors, request.nextUrl.pathname, 'PUT');
    }
    
    // Apply updates
    const updatedUser = await updateUser(userId, body, user.id);
    
    // Audit the update
    await auditUserAction('user_updated', user.id, userId, {
      changes: body,
      oldValues: {
        status: existingUser.status,
        piiScope: existingUser.piiScope
      }
    });
    
    return createApiResponse(
      { user: maskUserData([updatedUser], rbacEngine.getEffectivePIIScope(user))[0] },
      'User updated successfully'
    );
    
  } catch (error) {
    logger.error('Enhanced users PUT error:', error);
    return createApiError(
      'Failed to update user',
      'USER_UPDATE_FAILED',
      500,
      {},
      request.nextUrl.pathname,
      'PUT'
    );
  }
});

// Helper Functions

async function getUsersWithRoles(
  filters: any, 
  pagination: any
): Promise<UserWithRolesView[]> {
  // Mock implementation - in production this would query the v_users_with_roles view
  return [
    {
      id: 'user-1',
      email: 'john.doe@xpress.ph',
      firstName: 'John',
      lastName: 'Doe',
      displayName: 'John Doe',
      status: 'active',
      allowedRegions: ['ncr-manila', 'cebu'],
      piiScope: 'masked',
      domain: 'fraud',
      mfaEnabled: true,
      lastLoginAt: new Date(),
      lastActiveAt: new Date(),
      roles: [
        {
          roleId: 'role-1',
          roleName: 'ops_manager',
          roleDisplayName: 'Operations Manager',
          roleLevel: 30,
          assignedAt: new Date(),
          validUntil: undefined
        }
      ],
      permissions: ['assign_driver', 'view_live_map', 'manage_queue']
    }
  ];
}

function maskUserData(users: UserWithRolesView[], piiScope: string): UserWithRolesView[] {
  if (piiScope === 'full') return users;
  
  return users.map(user => ({
    ...user,
    email: piiScope === 'none' ? '[MASKED]' : maskEmail(user.email),
    // Additional masking based on PII scope
  }));
}

function maskEmail(email: string): string {
  const [username, domain] = email.split('@');
  const maskedUsername = username.length > 2 
    ? username[0] + '*'.repeat(username.length - 2) + username[username.length - 1]
    : '*'.repeat(username.length);
  return `${maskedUsername}@${domain}`;
}

async function validateRoleAssignment(
  roleNames: string[], 
  assigningUser: EnhancedUser
): Promise<{ valid: boolean; message: string }> {
  // Check if all roles exist
  const validRoles = Object.keys(XPRESS_ROLES);
  const invalidRoles = roleNames.filter(role => !validRoles.includes(role));
  
  if (invalidRoles.length > 0) {
    return {
      valid: false,
      message: `Invalid roles: ${invalidRoles.join(', ')}`
    };
  }
  
  // Check if assigning user can assign these roles (can't assign higher level roles)
  const assigningUserMaxLevel = Math.max(...assigningUser.roles.map(r => r.role?.level || 0));
  const assigningRoleMaxLevel = Math.max(...roleNames.map(role => 
    XPRESS_ROLES[role as XpressRole]?.level || 0
  ));
  
  if (assigningRoleMaxLevel >= assigningUserMaxLevel) {
    return {
      valid: false,
      message: 'Cannot assign roles with equal or higher privilege level'
    };
  }
  
  return { valid: true, message: 'Valid role assignment' };
}

function validateRegionalAccess(
  requestedRegions: string[], 
  assigningUser: EnhancedUser
): { valid: boolean; message: string } {
  const userRegions = rbacEngine.getEffectiveRegions(assigningUser);
  
  // Global admin can assign any regions
  const isGlobalAdmin = assigningUser.roles.some(r => 
    ['app_admin', 'iam_admin'].includes(r.role?.name || '')
  );
  
  if (isGlobalAdmin) {
    return { valid: true, message: 'Global admin can assign any regions' };
  }
  
  // Regional users can only assign their own regions
  if (userRegions.length > 0) {
    const invalidRegions = requestedRegions.filter(region => !userRegions.includes(region));
    if (invalidRegions.length > 0) {
      return {
        valid: false,
        message: `Cannot assign access to regions: ${invalidRegions.join(', ')}`
      };
    }
  }
  
  return { valid: true, message: 'Valid regional assignment' };
}

function validateUserUpdates(
  updates: UserUpdateRequest, 
  updatingUser: EnhancedUser
): any[] {
  const errors = [];
  
  // Validate PII scope changes
  if (updates.piiScope && !['none', 'masked', 'full'].includes(updates.piiScope)) {
    errors.push({
      field: 'piiScope',
      message: 'Invalid PII scope. Must be: none, masked, or full',
      code: 'INVALID_PII_SCOPE'
    });
  }
  
  // Validate status changes
  if (updates.status && !['active', 'inactive', 'suspended', 'locked'].includes(updates.status)) {
    errors.push({
      field: 'status',
      message: 'Invalid status. Must be: active, inactive, suspended, or locked',
      code: 'INVALID_STATUS'
    });
  }
  
  return errors;
}

async function canUserModifyTarget(
  modifyingUser: EnhancedUser, 
  targetUser: any
): Promise<{ allowed: boolean; reason: string }> {
  // Users cannot modify themselves through this endpoint
  if (modifyingUser.id === targetUser.id) {
    return {
      allowed: false,
      reason: 'Cannot modify your own account through this endpoint'
    };
  }
  
  // Check role hierarchy - cannot modify users with equal or higher roles
  const modifierMaxLevel = Math.max(...modifyingUser.roles.map(r => r.role?.level || 0));
  const targetMaxLevel = Math.max(...(targetUser.roles?.map((r: any) => r.roleLevel || 0) || [0]));
  
  if (targetMaxLevel >= modifierMaxLevel) {
    return {
      allowed: false,
      reason: 'Cannot modify users with equal or higher privilege level'
    };
  }
  
  return { allowed: true, reason: 'Modification allowed' };
}

async function createUser(userData: UserCreateRequest, createdBy: string): Promise<any> {
  // Mock implementation - in production this would insert into users table
  // and create role assignments
  return {
    id: 'new-user-' + Date.now(),
    email: userData.email,
    firstName: userData.firstName,
    lastName: userData.lastName,
    status: 'pending',
    allowedRegions: userData.allowedRegions || [],
    piiScope: userData.piiScope || 'none',
    domain: userData.domain,
    mfaEnabled: false,
    createdAt: new Date(),
    createdBy
  };
}

async function updateUser(userId: string, updates: UserUpdateRequest, updatedBy: string): Promise<any> {
  // Mock implementation - in production this would update users table
  return {
    id: userId,
    ...updates,
    updatedAt: new Date(),
    updatedBy
  };
}

async function findUserByEmail(email: string): Promise<any | null> {
  // Mock implementation
  return null;
}

async function findUserById(userId: string): Promise<any | null> {
  // Mock implementation
  return {
    id: userId,
    email: 'user@example.com',
    status: 'active',
    piiScope: 'masked',
    roles: []
  };
}

function extractUserIdFromPath(request: NextRequest): string | null {
  const pathSegments = request.nextUrl.pathname.split('/');
  const userIndex = pathSegments.indexOf('users');
  return userIndex >= 0 && pathSegments[userIndex + 1] ? pathSegments[userIndex + 1] : null;
}

async function auditUserAction(
  action: string, 
  actorId: string, 
  targetUserId: string, 
  details: any
): Promise<void> {
  // In production, this would insert into user_management_audit table
  logger.info(`USER_MANAGEMENT_AUDIT: ${action}`, {
    actorId,
    targetUserId,
    details,
    timestamp: new Date()
  });
}

function isValidEmail(email: string): boolean {
  const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
  return emailRegex.test(email);
}

// Import XPRESS_ROLES from types
import { XPRESS_ROLES } from '@/types/rbac-abac';