// /api/auth/mfa/verify - Enhanced MFA Verification API
import { NextRequest } from 'next/server';
import { 
  createApiResponse, 
  createApiError,
  createValidationError,
  validateRequiredFields,
  asyncHandler,
  handleOptionsRequest
} from '@/lib/api-utils';
import { withAuth } from '@/lib/auth';
import { withRBAC } from '@/middleware/rbacMiddleware';
import { MockDataService } from '@/lib/mockData';
import { auditLogger, AuditEventType, SecurityLevel } from '@/lib/security/auditLogger';
import { logger } from '@/lib/security/productionLogger';
import { mfaService, MFAVerificationResult } from '@/lib/auth/mfa-service';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'test-secret-for-local-development-only';

interface MFAVerifyRequest {
  challengeId?: string; // For new MFA challenge-based verification
  code: string;
  backupCode?: string;
  // Legacy support
  method?: 'totp' | 'sms' | 'email' | 'backup_code';
}

interface MFAVerifyResponse {
  success: boolean;
  verified: boolean;
  mfaEnabled: boolean;
  message: string;
  challengeId?: string;
  verifiedAt?: string;
  remainingAttempts?: number;
  mfaToken?: string; // Enhanced JWT token with MFA verification flag
}

// POST /api/auth/mfa/verify - Enhanced MFA verification with challenge support
export const POST = withAuth(async (request: NextRequest, user) => {
  const body = await request.json() as MFAVerifyRequest;
  const clientIP = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
  const userAgent = request.headers.get('user-agent') || 'unknown';

  // Validate required fields
  const validationErrors = validateRequiredFields(body, ['code']);
  
  if (validationErrors.length > 0 && !body.backupCode) {
    return createValidationError(validationErrors, '/api/auth/mfa/verify', 'POST');
  }

  try {
    // Get user data
    const userData = MockDataService.getUserById(user.userId);
    
    if (!userData) {
      return createApiError(
        'User not found',
        'USER_NOT_FOUND',
        404,
        undefined,
        '/api/auth/mfa/verify',
        'POST'
      );
    }

    let verificationResult: MFAVerificationResult;
    let isBackupCode = false;
    let mfaToken: string | undefined;

    // Enhanced challenge-based verification
    if (body.challengeId) {
      // Use new MFA service for challenge-based verification
      verificationResult = await mfaService.verifyChallenge(
        body.challengeId,
        body.code || body.backupCode || '',
        {
          ipAddress: clientIP,
          userAgent
        }
      );

      if (verificationResult.success && verificationResult.verifiedAt) {
        // Create MFA-verified token
        mfaToken = await createMFAVerifiedToken(user, body.challengeId, verificationResult.verifiedAt);
      }
    } else {
      // Legacy verification support
      let verificationSuccess = false;

      // Check backup code first if provided
      if (body.backupCode) {
        verificationSuccess = verifyBackupCode(userData, body.backupCode);
        isBackupCode = true;
      } 
      // Otherwise verify TOTP code
      else if (body.code) {
        verificationSuccess = verifyTOTPCode(userData, body.code);
      }

      // Create legacy verification result
      verificationResult = {
        success: verificationSuccess,
        verifiedAt: verificationSuccess ? new Date() : undefined,
        errorCode: verificationSuccess ? undefined : 'INVALID_CODE',
        errorMessage: verificationSuccess ? undefined : 'Invalid MFA code'
      };
    }

    if (!verificationResult.success) {
      await auditLogger.logEvent(
        AuditEventType.MFA_VERIFICATION,
        SecurityLevel.HIGH,
        'FAILURE',
        { 
          error: verificationResult.errorMessage || 'Invalid MFA code',
          challengeId: body.challengeId,
          codeType: isBackupCode ? 'backup_code' : (body.method || 'totp'),
          userAgent
        },
        { userId: user.userId, resource: 'auth', action: 'mfa_verify', ipAddress: clientIP }
      );

      const mfaResponse: MFAVerifyResponse = {
        success: false,
        verified: false,
        mfaEnabled: userData.mfaEnabled || false,
        message: verificationResult.errorMessage || 'Invalid MFA code',
        challengeId: body.challengeId,
        remainingAttempts: verificationResult.remainingAttempts
      };

      return createApiResponse(mfaResponse, mfaResponse.message, 400);
    }

    // If MFA setup was pending, complete it
    let mfaEnabled = userData.mfaEnabled;
    if (userData.mfaSetupPending) {
      MockDataService.updateUser(user.userId, {
        mfaEnabled: true,
        mfaSetupPending: false
      });
      mfaEnabled = true;
    }

    await auditLogger.logEvent(
      AuditEventType.MFA_VERIFICATION,
      SecurityLevel.LOW,
      'SUCCESS',
      { 
        action: userData.mfaSetupPending ? 'mfa_setup_completed' : 'mfa_verified',
        challengeId: body.challengeId,
        codeType: isBackupCode ? 'backup_code' : (body.method || 'totp'),
        userAgent
      },
      { userId: user.userId, resource: 'auth', action: 'mfa_verify', ipAddress: clientIP }
    );

    const mfaResponse: MFAVerifyResponse = {
      success: true,
      verified: true,
      mfaEnabled,
      message: userData.mfaSetupPending ? 'MFA setup completed successfully' : 'MFA verified successfully',
      challengeId: body.challengeId,
      verifiedAt: verificationResult.verifiedAt?.toISOString(),
      mfaToken
    };

    return createApiResponse(
      mfaResponse,
      mfaResponse.message,
      200
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'MFA verification failed';
    
    await auditLogger.logEvent(
      AuditEventType.MFA_VERIFICATION,
      SecurityLevel.HIGH,
      'FAILURE',
      { error: errorMessage, challengeId: body.challengeId, userAgent },
      { userId: user.userId, resource: 'auth', action: 'mfa_verify', ipAddress: clientIP }
    );

    logger.error('MFA verification error', { error });
    
    const mfaResponse: MFAVerifyResponse = {
      success: false,
      verified: false,
      mfaEnabled: false,
      message: 'MFA verification failed'
    };
    
    return createApiResponse(mfaResponse, mfaResponse.message, 500);
  }
});

// Helper functions
interface UserDataWithMFA {
  id: string;
  mfaEnabled: boolean;
  mfaSetupPending?: boolean;
  mfaBackupCodes?: Array<{
    code: string;
    used: boolean;
  }>;
}

interface MFATokenPayload {
  user_id: string;
  email: string;
  mfa_verified: boolean;
  mfa_challenge_id: string;
  mfa_verified_at: number;
  mfa_method: string;
  exp: number;
  iat: number;
}

async function createMFAVerifiedToken(
  user: any,
  challengeId: string,
  verifiedAt: Date
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const mfaTokenPayload: MFATokenPayload = {
    user_id: user.userId,
    email: user.email || 'user@example.com',
    mfa_verified: true,
    mfa_challenge_id: challengeId,
    mfa_verified_at: Math.floor(verifiedAt.getTime() / 1000),
    mfa_method: 'totp', // In production, get from challenge data
    exp: now + (30 * 60), // 30 minutes MFA session
    iat: now
  };

  return jwt.sign(mfaTokenPayload, JWT_SECRET);
}

function verifyTOTPCode(userData: UserDataWithMFA, code: string): boolean {
  // Mock TOTP verification - in real implementation, use libraries like speakeasy
  // For demo purposes, accept any 6-digit code that matches simple pattern
  if (!/^\d{6}$/.test(code)) return false;
  
  // Simple mock: accept codes that end with the last two digits of the user ID
  const userIdSuffix = userData.id.slice(-2);
  const codeSuffix = code.slice(-2);
  
  // In real implementation, verify against time-based TOTP using the secret
  return codeSuffix === userIdSuffix || code === '123456'; // Allow demo code
}

function verifyBackupCode(userData: UserDataWithMFA, backupCode: string): boolean {
  // Check if user has backup codes
  if (!userData.mfaBackupCodes || !Array.isArray(userData.mfaBackupCodes)) {
    return false;
  }

  // Find and mark backup code as used
  const codeIndex = userData.mfaBackupCodes.findIndex((bc) => 
    bc.code === backupCode && !bc.used
  );

  if (codeIndex === -1) {
    return false;
  }

  // Mark backup code as used
  userData.mfaBackupCodes[codeIndex].used = true;
  MockDataService.updateUser(userData.id, {
    mfaBackupCodes: userData.mfaBackupCodes
  });

  return true;
}

// OPTIONS handler for CORS
export const OPTIONS = handleOptionsRequest;