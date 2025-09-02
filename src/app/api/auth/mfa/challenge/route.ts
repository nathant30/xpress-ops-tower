import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth';
import { mfaService, MFAMethod } from '@/lib/auth/mfa-service';
import { Permission } from '@/hooks/useRBAC';
import { 
  createApiResponse, 
  createApiError,
  createValidationError,
  validateRequiredFields,
  handleOptionsRequest
} from '@/lib/api-utils';

interface CreateMFAChallengeRequest {
  method: MFAMethod;
  action?: string;
  permission?: Permission;
  metadata?: {
    phoneNumber?: string;
    email?: string;
  };
}

interface CreateMFAChallengeResponse {
  success: boolean;
  challengeId?: string;
  expiresAt?: string;
  method?: MFAMethod;
  metadata?: {
    maskedPhone?: string;
    maskedEmail?: string;
  };
  error?: {
    code: string;
    message: string;
  };
}

/**
 * POST /api/auth/mfa/challenge
 * Create MFA challenge for authenticated user
 */
export const POST = withAuth(async (request: NextRequest, user) => {
  try {
    const body: CreateMFAChallengeRequest = await request.json();

    // Validate request body
    const validation = validateChallengeRequest(body);
    if (!validation.valid) {
      return createApiError(
        validation.error || 'Invalid request',
        'INVALID_REQUEST',
        400,
        undefined,
        '/api/auth/mfa/challenge',
        'POST'
      );
    }

    const { method, action, permission, metadata } = body;

    // Get client information for audit
    const clientIP = getClientIP(request);
    const userAgent = request.headers.get('user-agent') || '';

    // Check if user has this MFA method enabled (in production, query database)
    const isMethodEnabled = await checkMFAMethodEnabled(user.userId, method);
    if (!isMethodEnabled) {
      return createApiError(
        `${method.toUpperCase()} authentication is not enabled for this account`,
        'METHOD_NOT_ENABLED',
        400,
        undefined,
        '/api/auth/mfa/challenge',
        'POST'
      );
    }

    // Create MFA challenge
    const challengeResult = await mfaService.createChallenge(
      user.userId,
      method,
      {
        action,
        permission,
        ipAddress: clientIP,
        userAgent
      }
    );

    // Get masked contact information for response
    const responseMetadata = await getMaskedContactInfo(user.userId, method);

    // Log MFA challenge creation
    const response: CreateMFAChallengeResponse = {
      success: true,
      challengeId: challengeResult.challengeId,
      expiresAt: challengeResult.expiresAt.toISOString(),
      method,
      metadata: responseMetadata
    };

    return createApiResponse(
      response,
      'MFA challenge created successfully',
      200
    );

  } catch (error) {
    console.error('MFA challenge creation error:', error);
    
    return createApiError(
      'Failed to create MFA challenge',
      'INTERNAL_ERROR',
      500,
      undefined,
      '/api/auth/mfa/challenge',
      'POST'
    );
  }
});

/**
 * GET /api/auth/mfa/challenge/status/:challengeId
 * Get status of existing MFA challenge
 */
async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const url = new URL(request.url);
    const challengeId = url.pathname.split('/').pop();

    if (!challengeId) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'MISSING_CHALLENGE_ID',
          message: 'Challenge ID is required'
        }
      }, { status: 400 });
    }

    // Get challenge status (in production, query database)
    const challengeStatus = await getChallengeStatus(challengeId);

    if (!challengeStatus) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'CHALLENGE_NOT_FOUND',
          message: 'Challenge not found or expired'
        }
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      challengeId,
      method: challengeStatus.method,
      expiresAt: challengeStatus.expiresAt.toISOString(),
      attempts: challengeStatus.attempts,
      maxAttempts: challengeStatus.maxAttempts,
      verified: challengeStatus.verified,
      expired: new Date() > challengeStatus.expiresAt
    });

  } catch (error) {
    console.error('MFA challenge status error:', error);
    
    return NextResponse.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to get challenge status'
      }
    }, { status: 500 });
  }
}

// Helper Functions

function validateChallengeRequest(body: any): { valid: boolean; error?: string } {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Request body is required' };
  }

  if (!body.method) {
    return { valid: false, error: 'MFA method is required' };
  }

  const validMethods: MFAMethod[] = ['sms', 'email', 'totp', 'backup_code'];
  if (!validMethods.includes(body.method)) {
    return { valid: false, error: `Invalid MFA method. Must be one of: ${validMethods.join(', ')}` };
  }

  if (body.action && typeof body.action !== 'string') {
    return { valid: false, error: 'Action must be a string' };
  }

  if (body.permission && typeof body.permission !== 'string') {
    return { valid: false, error: 'Permission must be a string' };
  }

  return { valid: true };
}

function getClientIP(request: NextRequest): string {
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }
  
  const realIP = request.headers.get('x-real-ip');
  if (realIP) return realIP;
  
  return 'unknown';
}

async function checkMFAMethodEnabled(userId: string, method: MFAMethod): Promise<boolean> {
  // In production, this would query the database to check user's MFA settings
  // For now, assume all methods are enabled for demonstration
  
  try {
    // Mock database query
    // const userSettings = await db.query('SELECT * FROM user_mfa_settings WHERE user_id = ?', [userId]);
    
    // For development, return true for common methods
    const enabledMethods: MFAMethod[] = ['sms', 'email', 'totp'];
    return enabledMethods.includes(method);
    
  } catch (error) {
    console.error('Error checking MFA method:', error);
    return false;
  }
}

async function getMaskedContactInfo(userId: string, method: MFAMethod): Promise<{
  maskedPhone?: string;
  maskedEmail?: string;
}> {
  // In production, this would query the database for user contact info
  // and return masked versions
  
  try {
    // Mock masked contact information
    if (method === 'sms') {
      return { maskedPhone: '+1•••••••••34' };
    } else if (method === 'email') {
      return { maskedEmail: 'u••••@••••.com' };
    }
    
    return {};
  } catch (error) {
    console.error('Error getting contact info:', error);
    return {};
  }
}

async function getChallengeStatus(challengeId: string): Promise<{
  method: MFAMethod;
  expiresAt: Date;
  attempts: number;
  maxAttempts: number;
  verified: boolean;
} | null> {
  // In production, this would query the database
  // For now, return null as challenges are not persisted in this demo
  return null;
}

// OPTIONS handler for CORS
export const OPTIONS = handleOptionsRequest;