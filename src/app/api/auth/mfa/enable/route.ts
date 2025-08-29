// /api/auth/mfa/enable - MFA Setup API
import { NextRequest } from 'next/server';
import { 
  createApiResponse, 
  createApiError,
  asyncHandler,
  handleOptionsRequest
} from '@/lib/api-utils';
import { withAuth } from '@/lib/auth';
import { MockDataService } from '@/lib/mockData';
import { auditLogger, AuditEventType, SecurityLevel } from '@/lib/security/auditLogger';

interface MFASetupResponse {
  qrCode: string;
  backupCodes: string[];
  secret: string;
}

// POST /api/auth/mfa/enable - Enable MFA for user account
export const POST = withAuth(async (request: NextRequest, user) => {
  const clientIP = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
  const userAgent = request.headers.get('user-agent') || 'unknown';

  try {
    // Get user data
    const userData = MockDataService.getUserById(user.userId);
    
    if (!userData) {
      return createApiError(
        'User not found',
        'USER_NOT_FOUND',
        404,
        undefined,
        '/api/auth/mfa/enable',
        'POST'
      );
    }

    if (userData.mfaEnabled) {
      return createApiError(
        'MFA is already enabled',
        'MFA_ALREADY_ENABLED',
        400,
        undefined,
        '/api/auth/mfa/enable',
        'POST'
      );
    }

    // Generate TOTP secret (mock implementation)
    const secret = generateTOTPSecret();
    
    // Generate QR code data (in real implementation, use qrcode library)
    const qrCode = `otpauth://totp/Xpress%20Ops%20Tower:${encodeURIComponent(userData.email)}?secret=${secret}&issuer=Xpress%20Ops%20Tower`;
    
    // Generate backup codes
    const backupCodes = generateBackupCodes();

    // Store MFA setup data (in real implementation, store secret securely)
    // For mock, we'll just mark as ready for setup
    MockDataService.updateUser(user.userId, {
      mfaSecret: secret, // In real implementation, encrypt this
      mfaBackupCodes: backupCodes.map(code => ({ code, used: false })),
      mfaSetupPending: true
    });

    await auditLogger.logEvent(
      AuditEventType.MFA_SETUP,
      SecurityLevel.MEDIUM,
      'SUCCESS',
      { 
        action: 'mfa_setup_initiated',
        userAgent
      },
      { userId: user.userId, resource: 'auth', action: 'mfa_enable', ipAddress: clientIP }
    );

    const mfaResponse: MFASetupResponse = {
      qrCode,
      backupCodes,
      secret: secret.replace(/(.{4})/g, '$1 ').trim() // Format secret for display
    };

    return createApiResponse(
      mfaResponse,
      'MFA setup initiated. Scan QR code and verify to complete setup.',
      200
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'MFA setup failed';
    
    await auditLogger.logEvent(
      AuditEventType.MFA_SETUP,
      SecurityLevel.HIGH,
      'FAILURE',
      { error: errorMessage, userAgent },
      { userId: user.userId, resource: 'auth', action: 'mfa_enable', ipAddress: clientIP }
    );

    console.error('MFA setup error:', error);
    
    return createApiError(
      'MFA setup failed',
      'MFA_SETUP_ERROR',
      500,
      undefined,
      '/api/auth/mfa/enable',
      'POST'
    );
  }
});

// Helper functions
function generateTOTPSecret(): string {
  // Generate base32 secret (32 characters)
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let secret = '';
  for (let i = 0; i < 32; i++) {
    secret += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return secret;
}

function generateBackupCodes(): string[] {
  const codes: string[] = [];
  for (let i = 0; i < 8; i++) {
    // Generate 8-digit backup codes
    const code = Math.floor(10000000 + Math.random() * 90000000).toString();
    codes.push(code);
  }
  return codes;
}

// OPTIONS handler for CORS
export const OPTIONS = handleOptionsRequest;