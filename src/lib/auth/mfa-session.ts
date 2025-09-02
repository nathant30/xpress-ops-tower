// MFA Session Management
// Persistent MFA state validation for the TTL of auth sessions

export interface MFASession {
  present: boolean;
  verifiedAt: number;  // timestamp in ms
  method: 'TOTP' | 'backup_code' | 'hardware_key' | 'sms';
  ttlSeconds: number;  // session duration
  userId: string;
  sessionId?: string;
}

export interface MFAChallenge {
  challengeId: string;
  userId: string;
  method: string;
  createdAt: number;
  expiresAt: number;
  attempts: number;
  maxAttempts: number;
}

// In-memory storage for development/testing
// In production, use Redis or database
const mfaSessions = new Map<string, MFASession>();
const mfaChallenges = new Map<string, MFAChallenge>();

/**
 * Create MFA session after successful verification - HARDENED VERSION
 * Default TTL reduced to 15 minutes for PII access
 */
export function createMFASession(
  userId: string, 
  method: MFASession['method'], 
  ttlSeconds: number = 900  // 15 minutes default (was 3600)
): MFASession {
  const session: MFASession = {
    present: true,
    verifiedAt: Date.now(),
    method,
    ttlSeconds,
    userId
  };
  
  mfaSessions.set(userId, session);
  
  `);
  return session;
}

/**
 * Check if user has valid MFA session
 */
export function validateMFASession(userId: string): boolean {
  const session = mfaSessions.get(userId);
  
  if (!session || !session.present) {
    return false;
  }
  
  // Check if session has expired
  const elapsed = Date.now() - session.verifiedAt;
  const expired = elapsed > (session.ttlSeconds * 1000);
  
  if (expired) {
    // Clean up expired session
    mfaSessions.delete(userId);
    return false;
  }
  
  return true;
}

/**
 * Get MFA session details (for audit/debugging)
 */
export function getMFASession(userId: string): MFASession | null {
  const session = mfaSessions.get(userId);
  
  if (!session) return null;
  
  // Check validity
  if (!validateMFASession(userId)) return null;
  
  return { ...session }; // Return copy
}

/**
 * Invalidate MFA session (logout, role change, etc.)
 */
export function invalidateMFASession(userId: string): boolean {
  const existed = mfaSessions.has(userId);
  mfaSessions.delete(userId);
  
  if (existed) {
    }
  
  return existed;
}

/**
 * Create MFA challenge for step-up authentication
 */
export function createMFAChallenge(
  userId: string, 
  method: string = 'TOTP',
  ttlMinutes: number = 5
): MFAChallenge {
  const challengeId = `mfa-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  const challenge: MFAChallenge = {
    challengeId,
    userId,
    method,
    createdAt: Date.now(),
    expiresAt: Date.now() + (ttlMinutes * 60 * 1000),
    attempts: 0,
    maxAttempts: 3
  };
  
  mfaChallenges.set(challengeId, challenge);
  
  return challenge;
}

/**
 * Verify MFA challenge response
 */
export function verifyMFAChallenge(
  challengeId: string, 
  code: string,
  expectedCode: string = '123456' // Mock TOTP for testing
): { success: boolean; error?: string; session?: MFASession } {
  const challenge = mfaChallenges.get(challengeId);
  
  if (!challenge) {
    return { success: false, error: 'Invalid challenge ID' };
  }
  
  // Check expiry
  if (Date.now() > challenge.expiresAt) {
    mfaChallenges.delete(challengeId);
    return { success: false, error: 'Challenge expired' };
  }
  
  // Check attempt limit
  challenge.attempts++;
  if (challenge.attempts > challenge.maxAttempts) {
    mfaChallenges.delete(challengeId);
    return { success: false, error: 'Too many attempts' };
  }
  
  // Verify code (mock verification for testing)
  if (code !== expectedCode) {
    return { success: false, error: 'Invalid MFA code' };
  }
  
  // Success - create MFA session and cleanup challenge
  mfaChallenges.delete(challengeId);
  const session = createMFASession(challenge.userId, challenge.method as any);
  
  return { success: true, session };
}

/**
 * Get active MFA challenge for user
 */
export function getActiveMFAChallenge(userId: string): MFAChallenge | null {
  for (const [challengeId, challenge] of mfaChallenges.entries()) {
    if (challenge.userId === userId && Date.now() < challenge.expiresAt) {
      return { ...challenge };
    }
  }
  return null;
}

/**
 * Cleanup expired challenges (run periodically)
 */
export function cleanupExpiredChallenges(): number {
  const now = Date.now();
  let cleaned = 0;
  
  for (const [challengeId, challenge] of mfaChallenges.entries()) {
    if (now > challenge.expiresAt) {
      mfaChallenges.delete(challengeId);
      cleaned++;
    }
  }
  
  if (cleaned > 0) {
    }
  
  return cleaned;
}

/**
 * Get MFA statistics (for monitoring)
 */
export function getMFAStats(): {
  activeSessions: number;
  pendingChallenges: number;
  avgSessionAge: number;
} {
  const now = Date.now();
  
  const activeSessions = Array.from(mfaSessions.values()).filter(s => 
    (now - s.verifiedAt) < (s.ttlSeconds * 1000)
  );
  
  const avgSessionAge = activeSessions.length > 0
    ? activeSessions.reduce((sum, s) => sum + (now - s.verifiedAt), 0) / activeSessions.length
    : 0;
    
  return {
    activeSessions: activeSessions.length,
    pendingChallenges: mfaChallenges.size,
    avgSessionAge: Math.round(avgSessionAge / 1000) // seconds
  };
}

// Cleanup timer (run every 5 minutes)
setInterval(cleanupExpiredChallenges, 5 * 60 * 1000);