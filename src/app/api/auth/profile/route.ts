// /api/auth/profile - User Profile Management API
import { NextRequest } from 'next/server';
import { 
  createApiResponse, 
  createApiError,
  createValidationError,
  asyncHandler,
  handleOptionsRequest
} from '@/lib/api-utils';
import { withAuth } from '@/lib/auth';
import { MockDataService } from '@/lib/mockData';
import { auditLogger, AuditEventType, SecurityLevel } from '@/lib/security/auditLogger';

// GET /api/auth/profile - Get current user profile
export const GET = withAuth(async (request: NextRequest, user) => {
  const clientIP = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';

  try {
    // Get full user data
    const userData = MockDataService.getUserById(user.userId);
    
    if (!userData) {
      return createApiError(
        'User not found',
        'USER_NOT_FOUND',
        404,
        undefined,
        '/api/auth/profile',
        'GET'
      );
    }

    // Remove sensitive data
    const { password, ...profileData } = userData;

    await auditLogger.logEvent(
      AuditEventType.PROFILE_ACCESS,
      SecurityLevel.LOW,
      'SUCCESS',
      { action: 'view_profile' },
      { userId: user.userId, resource: 'auth', action: 'profile_get', ipAddress: clientIP }
    );

    return createApiResponse(
      profileData,
      'Profile retrieved successfully',
      200
    );

  } catch (error) {
    console.error('Profile retrieval error:', error);
    
    return createApiError(
      'Failed to retrieve profile',
      'PROFILE_ERROR',
      500,
      undefined,
      '/api/auth/profile',
      'GET'
    );
  }
});

// PATCH /api/auth/profile - Update user profile
export const PATCH = withAuth(async (request: NextRequest, user) => {
  const clientIP = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
  const userAgent = request.headers.get('user-agent') || 'unknown';

  try {
    const updates = await request.json();

    // Fields that cannot be updated via profile endpoint
    const restrictedFields = ['id', 'password', 'role', 'permissions', 'isActive', 'createdAt'];
    
    // Remove restricted fields from updates
    for (const field of restrictedFields) {
      if (field in updates) {
        delete updates[field];
      }
    }

    // Validate email format if being updated
    if (updates.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(updates.email)) {
      return createValidationError(
        [{ field: 'email', message: 'Invalid email format', code: 'INVALID_EMAIL' }],
        '/api/auth/profile',
        'PATCH'
      );
    }

    // Check if email is already taken (if being updated)
    if (updates.email) {
      const existingUser = MockDataService.getUserByEmail(updates.email);
      if (existingUser && existingUser.id !== user.userId) {
        return createValidationError(
          [{ field: 'email', message: 'Email already in use', code: 'EMAIL_EXISTS' }],
          '/api/auth/profile',
          'PATCH'
        );
      }
    }

    // Update user profile
    const updatedUser = MockDataService.updateUser(user.userId, updates);
    
    if (!updatedUser) {
      return createApiError(
        'User not found',
        'USER_NOT_FOUND',
        404,
        undefined,
        '/api/auth/profile',
        'PATCH'
      );
    }

    // Remove sensitive data
    const { password, ...profileData } = updatedUser;

    await auditLogger.logEvent(
      AuditEventType.PROFILE_UPDATE,
      SecurityLevel.LOW,
      'SUCCESS',
      { 
        updatedFields: Object.keys(updates),
        userAgent
      },
      { userId: user.userId, resource: 'auth', action: 'profile_update', ipAddress: clientIP }
    );

    return createApiResponse(
      profileData,
      'Profile updated successfully',
      200
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Profile update failed';
    
    await auditLogger.logEvent(
      AuditEventType.PROFILE_UPDATE,
      SecurityLevel.MEDIUM,
      'FAILURE',
      { error: errorMessage, userAgent },
      { userId: user.userId, resource: 'auth', action: 'profile_update', ipAddress: clientIP }
    );

    console.error('Profile update error:', error);
    
    return createApiError(
      'Failed to update profile',
      'PROFILE_UPDATE_ERROR',
      500,
      undefined,
      '/api/auth/profile',
      'PATCH'
    );
  }
});

// OPTIONS handler for CORS
export const OPTIONS = handleOptionsRequest;