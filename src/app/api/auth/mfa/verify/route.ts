// /api/auth/mfa/verify - MFA Verification API
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
import { MockDataService } from '@/lib/mockData';
import { auditLogger, AuditEventType, SecurityLevel } from '@/lib/security/auditLogger';
import { logger } from '@/lib/security/productionLogger';

interface MFAVerifyRequest {
  code: string;
  backupCode?: string;
}

interface MFAVerifyResponse {
  verified: boolean;
  mfaEnabled: boolean;
  message: string;
}

// POST /api/auth/mfa/verify - Verify MFA code to complete setup or authenticate
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

    let verificationSuccess = false;
    let isBackupCode = false;

    // Check backup code first if provided
    if (body.backupCode) {
      verificationSuccess = verifyBackupCode(userData, body.backupCode);
      isBackupCode = true;
    } 
    // Otherwise verify TOTP code
    else if (body.code) {
      verificationSuccess = verifyTOTPCode(userData, body.code);
    }

    if (!verificationSuccess) {
      await auditLogger.logEvent(
        AuditEventType.MFA_VERIFICATION,
        SecurityLevel.HIGH,
        'FAILURE',
        { 
          error: 'Invalid MFA code',
          codeType: isBackupCode ? 'backup_code' : 'totp',
          userAgent
        },
        { userId: user.userId, resource: 'auth', action: 'mfa_verify', ipAddress: clientIP }
      );

      return createApiError(
        'Invalid MFA code',
        'INVALID_MFA_CODE',
        400,
        undefined,
        '/api/auth/mfa/verify',
        'POST'
      );
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
        codeType: isBackupCode ? 'backup_code' : 'totp',
        userAgent
      },
      { userId: user.userId, resource: 'auth', action: 'mfa_verify', ipAddress: clientIP }
    );

    const mfaResponse: MFAVerifyResponse = {
      verified: true,
      mfaEnabled,
      message: userData.mfaSetupPending ? 'MFA setup completed successfully' : 'MFA verified successfully'
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
      { error: errorMessage, userAgent },
      { userId: user.userId, resource: 'auth', action: 'mfa_verify', ipAddress: clientIP }
    );

    logger.error('MFA verification error', { error });
    
    return createApiError(
      'MFA verification failed',
      'MFA_VERIFICATION_ERROR',
      500,
      undefined,
      '/api/auth/mfa/verify',
      'POST'
    );
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