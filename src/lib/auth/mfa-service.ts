/**
 * MFA Service for Xpress Ops Tower
 * Comprehensive multi-factor authentication with multiple methods
 * Integrates with existing RBAC and approval workflow systems
 */

import { randomBytes, createHmac, timingSafeEqual } from 'crypto';
import * as speakeasy from 'speakeasy';
import { Permission } from '@/hooks/useRBAC';

// =====================================================
// MFA Types and Interfaces
// =====================================================

export type MFAMethod = 'sms' | 'email' | 'totp' | 'backup_code';

export interface MFASettings {
  userId: string;
  smsEnabled: boolean;
  emailEnabled: boolean;
  totpEnabled: boolean;
  backupCodesEnabled: boolean;
  preferredMethod: MFAMethod;
  phoneNumber?: string;
  email?: string;
  totpSecret?: string; // Encrypted
  backupCodes?: string[]; // Hashed
  createdAt: Date;
  updatedAt: Date;
}

export interface MFAChallenge {
  challengeId: string;
  userId: string;
  method: MFAMethod;
  code: string; // Hashed
  expiresAt: Date;
  attempts: number;
  maxAttempts: number;
  verified: boolean;
  createdAt: Date;
  metadata?: {
    phoneNumber?: string;
    email?: string;
    action?: string;
    ipAddress?: string;
    userAgent?: string;
  };
}

export interface MFAVerificationResult {
  success: boolean;
  challengeId?: string;
  remainingAttempts?: number;
  errorCode?: 'INVALID_CODE' | 'EXPIRED' | 'MAX_ATTEMPTS' | 'CHALLENGE_NOT_FOUND' | 'ALREADY_VERIFIED' | 'METHOD_DISABLED';
  errorMessage?: string;
  verifiedAt?: Date;
}

export interface MFAEnrollmentResult {
  success: boolean;
  method: MFAMethod;
  secret?: string; // For TOTP
  backupCodes?: string[]; // For backup codes
  qrCodeUrl?: string; // For TOTP
  errorCode?: string;
  errorMessage?: string;
}

export interface SensitivityConfig {
  permission: Permission;
  sensitivityLevel: number; // 0.0 to 1.0
  requiresMFA: boolean;
  allowedMethods: MFAMethod[];
  maxChallengeAttempts: number;
  challengeExpiryMinutes: number;
}

// =====================================================
// Sensitivity-based MFA Configuration
// =====================================================

export const SENSITIVITY_THRESHOLDS: Record<string, SensitivityConfig> = {
  // Critical Security Operations (0.9+)
  'unmask_pii_with_mfa': {
    permission: 'unmask_pii_with_mfa',
    sensitivityLevel: 0.9,
    requiresMFA: true,
    allowedMethods: ['totp', 'sms'],
    maxChallengeAttempts: 3,
    challengeExpiryMinutes: 5
  },
  
  // Financial Operations (0.8+)
  'approve_payout_batch': {
    permission: 'approve_payout_batch',
    sensitivityLevel: 0.8,
    requiresMFA: true,
    allowedMethods: ['totp', 'email', 'sms'],
    maxChallengeAttempts: 3,
    challengeExpiryMinutes: 5
  },
  
  // Administrative Actions (0.7+)
  'assign_roles': {
    permission: 'assign_roles',
    sensitivityLevel: 0.7,
    requiresMFA: true,
    allowedMethods: ['totp', 'email'],
    maxChallengeAttempts: 3,
    challengeExpiryMinutes: 5
  },
  
  'cross_region_override': {
    permission: 'cross_region_override',
    sensitivityLevel: 0.7,
    requiresMFA: true,
    allowedMethods: ['totp', 'sms'],
    maxChallengeAttempts: 3,
    challengeExpiryMinutes: 5
  },
  
  'manage_users': {
    permission: 'manage_users',
    sensitivityLevel: 0.6,
    requiresMFA: true,
    allowedMethods: ['totp', 'email', 'sms'],
    maxChallengeAttempts: 5,
    challengeExpiryMinutes: 10
  },
  
  // Standard Operations (0.6)
  'configure_alerts': {
    permission: 'configure_alerts',
    sensitivityLevel: 0.6,
    requiresMFA: false, // Optional but recommended
    allowedMethods: ['totp', 'email', 'sms', 'backup_code'],
    maxChallengeAttempts: 5,
    challengeExpiryMinutes: 10
  }
};

// =====================================================
// MFA Service Class
// =====================================================

export class MFAService {
  private static instance: MFAService;
  private readonly secretKey: string;

  constructor() {
    this.secretKey = process.env.MFA_SECRET_KEY || 'fallback-key-for-development';
  }

  public static getInstance(): MFAService {
    if (!MFAService.instance) {
      MFAService.instance = new MFAService();
    }
    return MFAService.instance;
  }

  // =====================================================
  // Sensitivity-based MFA Enforcement
  // =====================================================

  /**
   * Check if action requires MFA based on sensitivity level
   */
  public requiresMFAForAction(permission: Permission, userLevel: number = 0): boolean {
    const config = SENSITIVITY_THRESHOLDS[permission];
    
    if (!config) {
      // Default behavior for unknown permissions
      return userLevel >= 40; // Regional manager and above
    }

    return config.requiresMFA;
  }

  /**
   * Get sensitivity level for a permission
   */
  public getSensitivityLevel(permission: Permission): number {
    const config = SENSITIVITY_THRESHOLDS[permission];
    return config?.sensitivityLevel || 0.5; // Default medium sensitivity
  }

  /**
   * Get allowed MFA methods for a permission
   */
  public getAllowedMethods(permission: Permission): MFAMethod[] {
    const config = SENSITIVITY_THRESHOLDS[permission];
    return config?.allowedMethods || ['totp', 'email', 'sms', 'backup_code'];
  }

  // =====================================================
  // MFA Challenge Management
  // =====================================================

  /**
   * Create MFA challenge for user
   */
  public async createChallenge(
    userId: string,
    method: MFAMethod,
    options: {
      action?: string;
      ipAddress?: string;
      userAgent?: string;
      permission?: Permission;
    } = {}
  ): Promise<{ challengeId: string; expiresAt: Date }> {
    const challengeId = this.generateChallengeId();
    const code = this.generateMFACode(method);
    
    // Get sensitivity configuration
    const sensitivityConfig = options.permission ? 
      SENSITIVITY_THRESHOLDS[options.permission] : null;

    const expiryMinutes = sensitivityConfig?.challengeExpiryMinutes || 5;
    const maxAttempts = sensitivityConfig?.maxChallengeAttempts || 3;
    const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);

    const challenge: MFAChallenge = {
      challengeId,
      userId,
      method,
      code: this.hashCode(code),
      expiresAt,
      attempts: 0,
      maxAttempts,
      verified: false,
      createdAt: new Date(),
      metadata: {
        action: options.action,
        ipAddress: options.ipAddress,
        userAgent: options.userAgent
      }
    };

    // Store challenge (in production, this would be in database)
    await this.storeMFAChallenge(challenge);

    // Send challenge based on method
    await this.sendChallenge(userId, method, code, challenge.metadata);

    // Log MFA challenge creation
    return { challengeId, expiresAt };
  }

  /**
   * Verify MFA challenge
   */
  public async verifyChallenge(
    challengeId: string,
    userCode: string,
    options: {
      ipAddress?: string;
      userAgent?: string;
    } = {}
  ): Promise<MFAVerificationResult> {
    try {
      // Retrieve challenge
      const challenge = await this.getMFAChallenge(challengeId);
      
      if (!challenge) {
        return {
          success: false,
          errorCode: 'CHALLENGE_NOT_FOUND',
          errorMessage: 'Challenge not found or expired'
        };
      }

      // Check if already verified
      if (challenge.verified) {
        return {
          success: false,
          errorCode: 'ALREADY_VERIFIED',
          errorMessage: 'Challenge already verified'
        };
      }

      // Check expiration
      if (new Date() > challenge.expiresAt) {
        await this.expireMFAChallenge(challengeId);
        return {
          success: false,
          errorCode: 'EXPIRED',
          errorMessage: 'Challenge expired'
        };
      }

      // Check max attempts
      if (challenge.attempts >= challenge.maxAttempts) {
        await this.lockMFAChallenge(challengeId);
        return {
          success: false,
          errorCode: 'MAX_ATTEMPTS',
          errorMessage: 'Maximum attempts exceeded'
        };
      }

      // Increment attempt counter
      await this.incrementChallengeAttempts(challengeId);

      // Verify code based on method
      const isValid = await this.validateMFACode(
        challenge.userId,
        challenge.method,
        userCode,
        challenge.code
      );

      if (isValid) {
        // Mark as verified
        const verifiedAt = new Date();
        await this.markChallengeVerified(challengeId, verifiedAt);

        // Log successful MFA verification
        return {
          success: true,
          challengeId,
          verifiedAt
        };
      } else {
        const remainingAttempts = challenge.maxAttempts - (challenge.attempts + 1);
        
        // Log failed verification attempt
        console.warn(`MFA verification failed for challenge ${challengeId}, ${remainingAttempts} attempts remaining`);

        return {
          success: false,
          errorCode: 'INVALID_CODE',
          errorMessage: 'Invalid verification code',
          remainingAttempts
        };
      }

    } catch (error) {
      console.error('MFA verification error:', error);
      return {
        success: false,
        errorCode: 'INVALID_CODE',
        errorMessage: 'Verification failed'
      };
    }
  }

  // =====================================================
  // MFA Method Implementations
  // =====================================================

  /**
   * Generate MFA code based on method
   */
  private generateMFACode(method: MFAMethod): string {
    switch (method) {
      case 'sms':
      case 'email':
        // 6-digit numeric code
        return Math.floor(100000 + Math.random() * 900000).toString();
      
      case 'totp':
        // TOTP codes are generated by authenticator apps
        return '';
      
      case 'backup_code':
        // 8-character alphanumeric backup code
        return randomBytes(4).toString('hex').toUpperCase();
      
      default:
        return Math.floor(100000 + Math.random() * 900000).toString();
    }
  }

  /**
   * Validate MFA code based on method
   */
  private async validateMFACode(
    userId: string,
    method: MFAMethod,
    userCode: string,
    challengeCode: string
  ): Promise<boolean> {
    switch (method) {
      case 'sms':
      case 'email':
        return this.timingSafeCompare(
          this.hashCode(userCode),
          challengeCode
        );

      case 'totp':
        return await this.validateTOTPCode(userId, userCode);

      case 'backup_code':
        return await this.validateBackupCode(userId, userCode);

      default:
        return false;
    }
  }

  /**
   * Validate TOTP code
   */
  private async validateTOTPCode(userId: string, userCode: string): Promise<boolean> {
    try {
      const userSettings = await this.getMFASettings(userId);
      
      if (!userSettings?.totpSecret || !userSettings.totpEnabled) {
        return false;
      }

      // Decrypt TOTP secret (in production, use proper encryption)
      const secret = userSettings.totpSecret;

      // Verify TOTP code with window tolerance
      const verified = speakeasy.totp.verify({
        secret,
        encoding: 'base32',
        token: userCode,
        window: 2 // Allow 2 time steps before/after
      });

      return verified;
    } catch (error) {
      console.error('TOTP validation error:', error);
      return false;
    }
  }

  /**
   * Validate backup code
   */
  private async validateBackupCode(userId: string, userCode: string): Promise<boolean> {
    try {
      const userSettings = await this.getMFASettings(userId);
      
      if (!userSettings?.backupCodes || !userSettings.backupCodesEnabled) {
        return false;
      }

      // Check if code matches any backup code
      const hashedCode = this.hashCode(userCode.toUpperCase());
      const isValid = userSettings.backupCodes.some(backupCode => 
        this.timingSafeCompare(hashedCode, backupCode)
      );

      if (isValid) {
        // Remove used backup code
        await this.consumeBackupCode(userId, hashedCode);
      }

      return isValid;
    } catch (error) {
      console.error('Backup code validation error:', error);
      return false;
    }
  }

  // =====================================================
  // MFA Enrollment Methods
  // =====================================================

  /**
   * Enable TOTP authentication
   */
  public async enableTOTP(userId: string): Promise<MFAEnrollmentResult> {
    try {
      const secret = speakeasy.generateSecret({
        name: `Xpress Ops Tower (${userId})`,
        issuer: 'Xpress Ops Tower',
        length: 32
      });

      // Store encrypted secret (in production, use proper encryption)
      await this.updateMFASettings(userId, {
        totpSecret: secret.base32,
        totpEnabled: true
      });

      return {
        success: true,
        method: 'totp',
        secret: secret.base32,
        qrCodeUrl: secret.otpauth_url
      };
    } catch (error) {
      console.error('TOTP enrollment error:', error);
      return {
        success: false,
        method: 'totp',
        errorMessage: 'Failed to enable TOTP authentication'
      };
    }
  }

  /**
   * Enable SMS authentication
   */
  public async enableSMS(userId: string, phoneNumber: string): Promise<MFAEnrollmentResult> {
    try {
      // Validate phone number format
      if (!this.isValidPhoneNumber(phoneNumber)) {
        return {
          success: false,
          method: 'sms',
          errorMessage: 'Invalid phone number format'
        };
      }

      await this.updateMFASettings(userId, {
        phoneNumber,
        smsEnabled: true
      });

      return {
        success: true,
        method: 'sms'
      };
    } catch (error) {
      console.error('SMS enrollment error:', error);
      return {
        success: false,
        method: 'sms',
        errorMessage: 'Failed to enable SMS authentication'
      };
    }
  }

  /**
   * Enable email authentication
   */
  public async enableEmail(userId: string, email: string): Promise<MFAEnrollmentResult> {
    try {
      // Validate email format
      if (!this.isValidEmail(email)) {
        return {
          success: false,
          method: 'email',
          errorMessage: 'Invalid email address format'
        };
      }

      await this.updateMFASettings(userId, {
        email,
        emailEnabled: true
      });

      return {
        success: true,
        method: 'email'
      };
    } catch (error) {
      console.error('Email enrollment error:', error);
      return {
        success: false,
        method: 'email',
        errorMessage: 'Failed to enable email authentication'
      };
    }
  }

  /**
   * Generate backup codes
   */
  public async generateBackupCodes(userId: string, count: number = 10): Promise<MFAEnrollmentResult> {
    try {
      const backupCodes: string[] = [];
      const hashedCodes: string[] = [];

      // Generate backup codes
      for (let i = 0; i < count; i++) {
        const code = this.generateBackupCode();
        backupCodes.push(code);
        hashedCodes.push(this.hashCode(code));
      }

      // Store hashed codes
      await this.updateMFASettings(userId, {
        backupCodes: hashedCodes,
        backupCodesEnabled: true
      });

      return {
        success: true,
        method: 'backup_code',
        backupCodes // Return plain codes to user (only shown once)
      };
    } catch (error) {
      console.error('Backup codes generation error:', error);
      return {
        success: false,
        method: 'backup_code',
        errorMessage: 'Failed to generate backup codes'
      };
    }
  }

  // =====================================================
  // Helper Methods
  // =====================================================

  /**
   * Generate unique challenge ID
   */
  private generateChallengeId(): string {
    return `mfa_${Date.now()}_${randomBytes(8).toString('hex')}`;
  }

  /**
   * Generate backup code
   */
  private generateBackupCode(): string {
    // Generate 8-character alphanumeric code (excluding confusing characters)
    const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
  }

  /**
   * Hash MFA code
   */
  private hashCode(code: string): string {
    return createHmac('sha256', this.secretKey)
      .update(code)
      .digest('hex');
  }

  /**
   * Timing-safe string comparison
   */
  private timingSafeCompare(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false;
    }
    return timingSafeEqual(Buffer.from(a), Buffer.from(b));
  }

  /**
   * Validate phone number format
   */
  private isValidPhoneNumber(phone: string): boolean {
    const phoneRegex = /^\+[1-9]\d{1,14}$/;
    return phoneRegex.test(phone);
  }

  /**
   * Validate email format
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // =====================================================
  // External Communication Methods
  // =====================================================

  /**
   * Send MFA challenge via appropriate method
   */
  private async sendChallenge(
    userId: string,
    method: MFAMethod,
    code: string,
    metadata?: any
  ): Promise<void> {
    switch (method) {
      case 'sms':
        await this.sendSMSChallenge(userId, code, metadata);
        break;
      
      case 'email':
        await this.sendEmailChallenge(userId, code, metadata);
        break;
      
      case 'totp':
        // TOTP doesn't require sending code
        break;
      
      case 'backup_code':
        // Backup codes don't require sending
        break;
    }
  }

  /**
   * Send SMS challenge (mock implementation)
   */
  private async sendSMSChallenge(userId: string, code: string, metadata?: any): Promise<void> {
    // In production, integrate with SMS service (Twilio, AWS SNS, etc.)
    // This would call external SMS service
    // await smsService.send({
    //   to: userSettings.phoneNumber,
    //   message: `Your Xpress Ops Tower verification code is: ${code}. Valid for 5 minutes.`
    // });
  }

  /**
   * Send email challenge (mock implementation)
   */
  private async sendEmailChallenge(userId: string, code: string, metadata?: any): Promise<void> {
    // In production, integrate with email service (SES, SendGrid, etc.)
    // This would call external email service
    // await emailService.send({
    //   to: userSettings.email,
    //   subject: 'Xpress Ops Tower - Verification Code',
    //   body: `Your verification code is: ${code}. This code expires in 5 minutes.`
    // });
  }

  // =====================================================
  // Database Mock Methods (replace with actual DB calls)
  // =====================================================

  private async storeMFAChallenge(challenge: MFAChallenge): Promise<void> {
    // Mock storage - in production, store in database
    // INSERT INTO mfa_challenges VALUES (...)
    }

  private async getMFAChallenge(challengeId: string): Promise<MFAChallenge | null> {
    // Mock retrieval - in production, query database
    // SELECT * FROM mfa_challenges WHERE challenge_id = ?
    return null; // Placeholder
  }

  private async expireMFAChallenge(challengeId: string): Promise<void> {
    // Mock expiration - in production, update database
    // UPDATE mfa_challenges SET expired = true WHERE challenge_id = ?
    }

  private async lockMFAChallenge(challengeId: string): Promise<void> {
    // Mock locking - in production, update database
    // UPDATE mfa_challenges SET locked = true WHERE challenge_id = ?
    }

  private async incrementChallengeAttempts(challengeId: string): Promise<void> {
    // Mock increment - in production, update database
    // UPDATE mfa_challenges SET attempts = attempts + 1 WHERE challenge_id = ?
    }

  private async markChallengeVerified(challengeId: string, verifiedAt: Date): Promise<void> {
    // Mock verification - in production, update database
    // UPDATE mfa_challenges SET verified = true, verified_at = ? WHERE challenge_id = ?
    }

  private async getMFASettings(userId: string): Promise<MFASettings | null> {
    // Mock settings retrieval - in production, query database
    // SELECT * FROM user_mfa_settings WHERE user_id = ?
    return null; // Placeholder
  }

  private async updateMFASettings(userId: string, updates: Partial<MFASettings>): Promise<void> {
    // Mock settings update - in production, update database
    // UPDATE user_mfa_settings SET ... WHERE user_id = ?
    }

  private async consumeBackupCode(userId: string, hashedCode: string): Promise<void> {
    // Mock backup code consumption - in production, remove from database
    // UPDATE user_mfa_settings SET backup_codes = array_remove(backup_codes, ?) WHERE user_id = ?
    }
}

// Export singleton instance
export const mfaService = MFAService.getInstance();

// Export convenience functions
export const createMFAChallenge = (userId: string, method: MFAMethod, options?: any) =>
  mfaService.createChallenge(userId, method, options);

export const verifyMFAChallenge = (challengeId: string, code: string, options?: any) =>
  mfaService.verifyChallenge(challengeId, code, options);

export const requiresMFAForAction = (permission: Permission, userLevel?: number) =>
  mfaService.requiresMFAForAction(permission, userLevel);

export const getSensitivityLevel = (permission: Permission) =>
  mfaService.getSensitivityLevel(permission);