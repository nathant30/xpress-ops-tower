// Enhanced Authentication Hook
// Provides RBAC + ABAC context and utilities

'use client';

import { useState, useEffect, useContext, createContext, ReactNode } from 'react';
import { jwtDecode } from 'jwt-decode';
import { 
  EnhancedUser, 
  AuthenticationRequest, 
  AuthenticationResponse,
  PIIScope,
  XpressRole,
  TemporaryAccess
} from '@/types/rbac-abac';
import { rbacEngine } from '@/lib/auth/rbac-engine';
import { logger } from '@/lib/security/productionLogger';

interface EnhancedJWTPayload {
  sub: string;
  exp: number;
  iat: number;
  sessionId: string;
  roles: string[];
  permissions: string[];
  allowedRegions: string[];
  piiScope: PIIScope;
  domain?: string;
}

export interface EnhancedAuthState {
  user: EnhancedUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  sessionExpiry: number | null;
  mfaRequired: boolean;
}

export interface EnhancedAuthContextType extends EnhancedAuthState {
  login: (credentials: AuthenticationRequest) => Promise<void>;
  logout: () => void;
  refreshToken: () => Promise<void>;
  
  // Permission checking
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
  hasAllPermissions: (permissions: string[]) => boolean;
  hasRole: (role: XpressRole) => boolean;
  
  // Regional access
  canAccessRegion: (regionId: string) => boolean;
  getEffectiveRegions: () => string[];
  
  // PII access
  canUnmaskPII: (dataClass?: string) => boolean;
  getEffectivePIIScope: () => PIIScope;
  
  // MFA
  enableMFA: () => Promise<{ qrCode: string; backupCodes: string[] }>;
  verifyMFA: (code: string) => Promise<void>;
  
  // Temporary access
  requestTemporaryAccess: (request: any) => Promise<void>;
  getActiveTemporaryAccess: () => TemporaryAccess[];
  
  // Session management
  isSessionExpiringSoon: (minutes?: number) => boolean;
  extendSession: () => Promise<void>;
}

const EnhancedAuthContext = createContext<EnhancedAuthContextType | null>(null);

const TOKEN_KEY = 'xpress_auth_token';
const REFRESH_KEY = 'xpress_refresh_token';
const SESSION_WARNING_MINUTES = 10; // Warn when session expires in 10 minutes

export function EnhancedAuthProvider({ children }: { children: ReactNode }) {
  const [authState, setAuthState] = useState<EnhancedAuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
    error: null,
    sessionExpiry: null,
    mfaRequired: false
  });

  // Initialize auth state from stored tokens
  useEffect(() => {
    initializeAuth();
  }, []);

  // Setup session expiry warning
  useEffect(() => {
    if (authState.sessionExpiry) {
      const checkInterval = setInterval(() => {
        if (isSessionExpiringSoon()) {
          logger.warn('Session expiring soon', {
            expiresAt: new Date(authState.sessionExpiry!),
            minutesLeft: Math.floor((authState.sessionExpiry! - Date.now()) / 60000)
          });
        }
      }, 60000); // Check every minute

      return () => clearInterval(checkInterval);
    }
  }, [authState.sessionExpiry]);

  const initializeAuth = async (): Promise<void> => {
    try {
      const token = localStorage.getItem(TOKEN_KEY);
      if (!token) {
        setAuthState(prev => ({ ...prev, isLoading: false }));
        return;
      }

      const decoded = jwtDecode<EnhancedJWTPayload>(token);
      const isExpired = decoded.exp * 1000 < Date.now();

      if (isExpired) {
        await refreshToken();
      } else {
        await validateToken(token);
      }
    } catch (error) {
      logger.error('Enhanced auth initialization failed:', error);
      clearTokens();
      setAuthState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: 'Authentication failed' 
      }));
    }
  };

  const validateToken = async (token: string): Promise<void> => {
    try {
      const response = await fetch('/api/auth/enhanced/validate', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Token validation failed');
      }

      const { data } = await response.json();
      const { user } = data;
      const decoded = jwtDecode<EnhancedJWTPayload>(token);

      // Validate and normalize user permissions
      const validatedPermissions = rbacEngine.validateUserPermissions(user);
      const effectiveRegions = rbacEngine.getEffectiveRegions(user);
      const effectivePIIScope = rbacEngine.getEffectivePIIScope(user);

      setAuthState({
        user: {
          ...user,
          permissions: validatedPermissions,
          allowedRegions: effectiveRegions,
          piiScope: effectivePIIScope
        },
        isAuthenticated: true,
        isLoading: false,
        error: null,
        sessionExpiry: decoded.exp * 1000,
        mfaRequired: false
      });

      logger.info('Enhanced auth validation successful', {
        userId: user.id,
        permissions: validatedPermissions.length,
        regions: effectiveRegions.length,
        piiScope: effectivePIIScope
      });

    } catch (error) {
      logger.warn('Token validation failed:', error);
      clearTokens();
      setAuthState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: 'Session expired' 
      }));
    }
  };

  const login = async (credentials: AuthenticationRequest): Promise<void> => {
    setAuthState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await fetch('/api/auth/enhanced/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials)
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 202 && data.requiresMFA) {
          setAuthState(prev => ({
            ...prev,
            isLoading: false,
            mfaRequired: true,
            error: null
          }));
          return;
        }
        throw new Error(data.error?.message || data.message || 'Login failed');
      }

      const authResponse: AuthenticationResponse = data.data;
      
      // Store tokens
      localStorage.setItem(TOKEN_KEY, authResponse.tokens.accessToken);
      localStorage.setItem(REFRESH_KEY, authResponse.tokens.refreshToken);

      const decoded = jwtDecode<EnhancedJWTPayload>(authResponse.tokens.accessToken);

      setAuthState({
        user: authResponse.user,
        isAuthenticated: true,
        isLoading: false,
        error: null,
        sessionExpiry: decoded.exp * 1000,
        mfaRequired: false
      });

      logger.info('Enhanced login successful', {
        userId: authResponse.user.id,
        sessionId: authResponse.sessionId,
        method: credentials.mfaCode ? 'password_mfa' : 'password'
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Login failed';
      setAuthState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: errorMessage,
        mfaRequired: false
      }));
      
      logger.warn('Enhanced login failed', {
        error: errorMessage,
        email: credentials.email
      });
      
      throw error;
    }
  };

  const logout = (): void => {
    const userId = authState.user?.id;
    
    clearTokens();
    setAuthState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      sessionExpiry: null,
      mfaRequired: false
    });

    if (userId) {
      logger.info('Enhanced logout successful', {
        userId,
        timestamp: new Date()
      });
    }
  };

  const refreshToken = async (): Promise<void> => {
    try {
      const refreshToken = localStorage.getItem(REFRESH_KEY);
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await fetch('/api/auth/enhanced/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken })
      });

      if (!response.ok) {
        throw new Error('Token refresh failed');
      }

      const { data } = await response.json();
      const authResponse: AuthenticationResponse = data;
      
      localStorage.setItem(TOKEN_KEY, authResponse.tokens.accessToken);
      localStorage.setItem(REFRESH_KEY, authResponse.tokens.refreshToken);

      const decoded = jwtDecode<EnhancedJWTPayload>(authResponse.tokens.accessToken);

      setAuthState(prev => ({
        ...prev,
        user: authResponse.user,
        sessionExpiry: decoded.exp * 1000,
        error: null
      }));

    } catch (error) {
      logger.error('Token refresh failed:', error);
      logout();
    }
  };

  const enableMFA = async (): Promise<{ qrCode: string; backupCodes: string[] }> => {
    if (!authState.user) throw new Error('Not authenticated');

    const token = localStorage.getItem(TOKEN_KEY);
    const response = await fetch('/api/auth/enhanced/mfa/enable', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) {
      throw new Error('MFA setup failed');
    }

    return response.json();
  };

  const verifyMFA = async (code: string): Promise<void> => {
    const token = localStorage.getItem(TOKEN_KEY);
    const response = await fetch('/api/auth/enhanced/mfa/verify', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ code })
    });

    if (!response.ok) {
      throw new Error('MFA verification failed');
    }

    setAuthState(prev => ({
      ...prev,
      user: prev.user ? { ...prev.user, mfaEnabled: true } : null,
      mfaRequired: false
    }));
  };

  const requestTemporaryAccess = async (request: any): Promise<void> => {
    const token = localStorage.getItem(TOKEN_KEY);
    const response = await fetch('/api/auth/enhanced/temporary-access', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(request)
    });

    if (!response.ok) {
      throw new Error('Temporary access request failed');
    }

    // Refresh user context to include new temporary access
    await validateToken(localStorage.getItem(TOKEN_KEY)!);
  };

  // Permission checking functions
  const hasPermission = (permission: string): boolean => {
    return authState.user?.permissions.includes(permission) ?? false;
  };

  const hasAnyPermission = (permissions: string[]): boolean => {
    return permissions.some(perm => hasPermission(perm));
  };

  const hasAllPermissions = (permissions: string[]): boolean => {
    return permissions.every(perm => hasPermission(perm));
  };

  const hasRole = (role: XpressRole): boolean => {
    return authState.user?.roles.some(r => r.role?.name === role && r.isActive) ?? false;
  };

  // Regional access functions
  const canAccessRegion = (regionId: string): boolean => {
    if (!authState.user) return false;
    const regions = rbacEngine.getEffectiveRegions(authState.user);
    return regions.length === 0 || regions.includes(regionId);
  };

  const getEffectiveRegions = (): string[] => {
    return authState.user ? rbacEngine.getEffectiveRegions(authState.user) : [];
  };

  // PII access functions
  const canUnmaskPII = (dataClass: string = 'internal'): boolean => {
    if (!authState.user) return false;
    const effectiveScope = rbacEngine.getEffectivePIIScope(authState.user);
    
    if (effectiveScope === 'none') return false;
    if (effectiveScope === 'full') return true;
    if (dataClass === 'restricted') return false; // Masked access not allowed for restricted
    
    return effectiveScope === 'masked';
  };

  const getEffectivePIIScope = (): PIIScope => {
    return authState.user ? rbacEngine.getEffectivePIIScope(authState.user) : 'none';
  };

  const getActiveTemporaryAccess = (): TemporaryAccess[] => {
    if (!authState.user?.temporaryAccess) return [];
    
    const now = new Date();
    return authState.user.temporaryAccess.filter(ta => 
      ta.isActive && ta.expiresAt > now
    );
  };

  const isSessionExpiringSoon = (minutes: number = SESSION_WARNING_MINUTES): boolean => {
    if (!authState.sessionExpiry) return false;
    const warningTime = minutes * 60 * 1000; // Convert to milliseconds
    return (authState.sessionExpiry - Date.now()) <= warningTime;
  };

  const extendSession = async (): Promise<void> => {
    await refreshToken();
  };

  const clearTokens = (): void => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
  };

  return (
    <EnhancedAuthContext.Provider value={{
      ...authState,
      login,
      logout,
      refreshToken,
      hasPermission,
      hasAnyPermission,
      hasAllPermissions,
      hasRole,
      canAccessRegion,
      getEffectiveRegions,
      canUnmaskPII,
      getEffectivePIIScope,
      enableMFA,
      verifyMFA,
      requestTemporaryAccess,
      getActiveTemporaryAccess,
      isSessionExpiringSoon,
      extendSession
    }}>
      {children}
    </EnhancedAuthContext.Provider>
  );
}

export const useEnhancedAuth = (): EnhancedAuthContextType => {
  const context = useContext(EnhancedAuthContext);
  if (!context) {
    throw new Error('useEnhancedAuth must be used within an EnhancedAuthProvider');
  }
  return context;
};

// Utility hook for checking multiple permissions
export const usePermissions = (permissions: string[]) => {
  const { hasPermission, hasAnyPermission, hasAllPermissions } = useEnhancedAuth();
  
  return {
    hasAny: hasAnyPermission(permissions),
    hasAll: hasAllPermissions(permissions),
    individual: permissions.reduce((acc, perm) => {
      acc[perm] = hasPermission(perm);
      return acc;
    }, {} as Record<string, boolean>)
  };
};

// Utility hook for regional access
export const useRegionalAccess = () => {
  const { canAccessRegion, getEffectiveRegions } = useEnhancedAuth();
  const userRegions = getEffectiveRegions();
  
  return {
    canAccessRegion,
    userRegions,
    hasGlobalAccess: userRegions.length === 0,
    isRegionallyRestricted: userRegions.length > 0
  };
};

export default useEnhancedAuth;