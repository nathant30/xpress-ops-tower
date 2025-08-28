// Authentication Hook
// Secure authentication state management with JWT and MFA support

'use client';

import { useState, useEffect, useContext, createContext, ReactNode } from 'react';
import { jwtDecode } from 'jwt-decode';
import { auditLogger, AuditEventType, SecurityLevel } from '@/lib/security/auditLogger';

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

      const decoded = jwtDecode<any>(token);
      const isExpired = decoded.exp * 1000 < Date.now();

      if (isExpired) {
        await refreshToken();
      } else {
        await validateToken(token);
      }
    } catch (error) {
      console.error('Auth initialization failed:', error);
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

      const { user, permissions } = await response.json();
      const decoded = jwtDecode<any>(token);

      setAuthState({
        user: { ...user, permissions },
        isAuthenticated: true,
        isLoading: false,
        error: null,
        sessionExpiry: decoded.exp * 1000
      });

      auditLogger.logEvent(
        AuditEventType.LOGIN,
        SecurityLevel.LOW,
        'SUCCESS',
        { method: 'token_validation' },
        { userId: user.id, resource: 'auth', action: 'validate' }
      );
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
        throw new Error(data.error || 'Login failed');
      }

      const { token, refreshToken: refresh, user, permissions } = data;
      
      // Store tokens
      localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem(REFRESH_KEY, refresh);

      const decoded = jwtDecode<any>(token);

      setAuthState({
        user: { ...user, permissions },
        isAuthenticated: true,
        isLoading: false,
        error: null,
        sessionExpiry: decoded.exp * 1000
      });

      auditLogger.logEvent(
        AuditEventType.LOGIN,
        SecurityLevel.LOW,
        'SUCCESS',
        { 
          method: mfaCode ? 'password_mfa' : 'password',
          userAgent: navigator.userAgent
        },
        { 
          userId: user.id, 
          resource: 'auth', 
          action: 'login',
          ipAddress: await getClientIP()
        }
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Login failed';
      setAuthState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: errorMessage 
      }));

      auditLogger.logEvent(
        AuditEventType.LOGIN,
        SecurityLevel.MEDIUM,
        'FAILURE',
        { 
          error: errorMessage,
          email,
          userAgent: navigator.userAgent
        },
        { 
          resource: 'auth', 
          action: 'login',
          ipAddress: await getClientIP()
        }
      );
      
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
      auditLogger.logEvent(
        AuditEventType.LOGOUT,
        SecurityLevel.LOW,
        'SUCCESS',
        { method: 'manual' },
        { userId, resource: 'auth', action: 'logout' }
      );
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

      const { token, refreshToken: newRefresh, user, permissions } = await response.json();
      
      localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem(REFRESH_KEY, newRefresh);

      const decoded = jwtDecode<any>(token);

      setAuthState(prev => ({
        ...prev,
        user: { ...user, permissions },
        sessionExpiry: decoded.exp * 1000,
        error: null
      }));
    } catch (error) {
      console.error('Token refresh failed:', error);
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
      console.error('Profile update failed:', error);
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