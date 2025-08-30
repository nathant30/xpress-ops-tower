// Authentication Hook
// Secure authentication state management with JWT and MFA support

'use client';

import { useState, useEffect, useContext, createContext, ReactNode } from 'react';
import { jwtDecode } from 'jwt-decode';
import { secureLog, validateInput } from '@/lib/security/securityUtils';

interface JWTPayload {
  sub: string;
  exp: number;
  iat: number;
  role: string;
  permissions: string[];
  sessionId: string;
}
// Import types only, not the implementation
export enum AuditEventType {
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  TOKEN_REFRESH = 'TOKEN_REFRESH',
  PROFILE_UPDATE = 'PROFILE_UPDATE',
  MFA_SETUP = 'MFA_SETUP',
  MFA_VERIFICATION = 'MFA_VERIFICATION'
}

export enum SecurityLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM', 
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'dispatcher' | 'analyst' | 'safety_monitor' | 'regional_manager';
  permissions: string[];
  regionId?: string;
  lastLogin?: string;
  mfaEnabled: boolean;
  sessionId: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  sessionExpiry: number | null;
}

export interface AuthContextType extends AuthState {
  login: (email: string, password: string, mfaCode?: string) => Promise<void>;
  logout: () => void;
  refreshToken: () => Promise<void>;
  updateProfile: (updates: Partial<User>) => Promise<void>;
  checkPermission: (permission: string) => boolean;
  enableMFA: () => Promise<{ qrCode: string; backupCodes: string[] }>;
  verifyMFA: (code: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

const TOKEN_KEY = 'xpress_auth_token';
const REFRESH_KEY = 'xpress_refresh_token';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
    error: null,
    sessionExpiry: null
  });

  // Initialize auth state from stored tokens
  useEffect(() => {
    initializeAuth();
  }, []);

  const initializeAuth = async (): Promise<void> => {
    try {
      const token = localStorage.getItem(TOKEN_KEY);
      if (!token) {
        setAuthState(prev => ({ ...prev, isLoading: false }));
        return;
      }

      const decoded = jwtDecode<JWTPayload>(token);
      const isExpired = decoded.exp * 1000 < Date.now();

      if (isExpired) {
        await refreshToken();
      } else {
        await validateToken(token);
      }
    } catch (error) {
      secureLog.error('Auth initialization failed:', error);
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
      const response = await fetch('/api/auth/validate', {
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
      const { user, permissions } = data;
      const decoded = jwtDecode<JWTPayload>(token);

      setAuthState({
        user: { ...user, permissions },
        isAuthenticated: true,
        isLoading: false,
        error: null,
        sessionExpiry: decoded.exp * 1000
      });

      // Client-side audit logging
      secureLog.info('AUTH_EVENT:', {
        type: AuditEventType.LOGIN,
        level: SecurityLevel.LOW,
        outcome: 'SUCCESS',
        userId: user.id,
        method: 'token_validation'
      });
    } catch (error) {
      clearTokens();
      setAuthState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: 'Session expired' 
      }));
    }
  };

  const login = async (email: string, password: string, mfaCode?: string): Promise<void> => {
    setAuthState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, mfaCode })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || data.message || 'Login failed');
      }

      const { token, refreshToken: refresh, user, permissions } = data.data;
      
      // Store tokens
      localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem(REFRESH_KEY, refresh);

      const decoded = jwtDecode<JWTPayload>(token);

      setAuthState({
        user: { ...user, permissions },
        isAuthenticated: true,
        isLoading: false,
        error: null,
        sessionExpiry: decoded.exp * 1000
      });

      secureLog.info('Login successful', {
        type: AuditEventType.LOGIN,
        level: SecurityLevel.LOW,
        method: mfaCode ? 'password_mfa' : 'password',
        userId: user.id
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Login failed';
      setAuthState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: errorMessage 
      }));

      secureLog.warn('Login failed', {
        type: AuditEventType.LOGIN,
        level: SecurityLevel.MEDIUM,
        error: errorMessage,
        email: email
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
      sessionExpiry: null
    });

    if (userId) {
      secureLog.info('Logout successful', {
        type: AuditEventType.LOGOUT,
        level: SecurityLevel.LOW,
        method: 'manual',
        userId: userId
      });
    }
  };

  const refreshToken = async (): Promise<void> => {
    try {
      const refreshToken = localStorage.getItem(REFRESH_KEY);
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken })
      });

      if (!response.ok) {
        throw new Error('Token refresh failed');
      }

      const { data } = await response.json();
      const { token, refreshToken: newRefresh, user, permissions } = data;
      
      localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem(REFRESH_KEY, newRefresh);

      const decoded = jwtDecode<JWTPayload>(token);

      setAuthState(prev => ({
        ...prev,
        user: { ...user, permissions },
        sessionExpiry: decoded.exp * 1000,
        error: null
      }));
    } catch (error) {
      secureLog.error('Token refresh failed:', error);
      logout();
    }
  };

  const updateProfile = async (updates: Partial<User>): Promise<void> => {
    if (!authState.user) return;

    try {
      const token = localStorage.getItem(TOKEN_KEY);
      const response = await fetch('/api/auth/profile', {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updates)
      });

      if (!response.ok) {
        throw new Error('Profile update failed');
      }

      const updatedUser = await response.json();
      setAuthState(prev => ({
        ...prev,
        user: { ...prev.user!, ...updatedUser }
      }));
    } catch (error) {
      secureLog.error('Profile update failed:', error);
      throw error;
    }
  };

  const checkPermission = (permission: string): boolean => {
    return authState.user?.permissions.includes(permission) ?? false;
  };

  const enableMFA = async (): Promise<{ qrCode: string; backupCodes: string[] }> => {
    if (!authState.user) throw new Error('Not authenticated');

    const token = localStorage.getItem(TOKEN_KEY);
    const response = await fetch('/api/auth/mfa/enable', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) {
      throw new Error('MFA setup failed');
    }

    return response.json();
  };

  const verifyMFA = async (code: string): Promise<void> => {
    if (!authState.user) throw new Error('Not authenticated');

    const token = localStorage.getItem(TOKEN_KEY);
    const response = await fetch('/api/auth/mfa/verify', {
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
      user: prev.user ? { ...prev.user, mfaEnabled: true } : null
    }));
  };

  const clearTokens = (): void => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
  };

  const getClientIP = async (): Promise<string> => {
    try {
      const response = await fetch('/api/auth/client-ip');
      const { ip } = await response.json();
      return ip;
    } catch {
      return 'unknown';
    }
  };

  return (
    <AuthContext.Provider value={{
      ...authState,
      login,
      logout,
      refreshToken,
      updateProfile,
      checkPermission,
      enableMFA,
      verifyMFA
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default useAuth;