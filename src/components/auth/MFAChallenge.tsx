'use client';

import { useState, useEffect, useRef } from 'react';
import { MFAMethod, MFAVerificationResult } from '@/lib/auth/mfa-service';

interface MFAChallengeProps {
  challengeId: string;
  method: MFAMethod;
  expiresAt: Date;
  action?: string;
  onSuccess: (result: MFAVerificationResult) => void;
  onCancel: () => void;
  onError: (error: string) => void;
  onResend?: () => void;
  metadata?: {
    phoneNumber?: string;
    email?: string;
    maskedPhone?: string;
    maskedEmail?: string;
  };
}

interface CountdownState {
  minutes: number;
  seconds: number;
  isExpired: boolean;
}

const MFA_METHOD_CONFIG = {
  sms: {
    title: 'SMS Verification',
    description: 'Enter the 6-digit code sent to your phone',
    icon: '📱',
    inputLength: 6,
    inputType: 'numeric' as const,
    resendable: true
  },
  email: {
    title: 'Email Verification', 
    description: 'Enter the 6-digit code sent to your email',
    icon: '📧',
    inputLength: 6,
    inputType: 'numeric' as const,
    resendable: true
  },
  totp: {
    title: 'Authenticator App',
    description: 'Enter the 6-digit code from your authenticator app',
    icon: '🔐',
    inputLength: 6,
    inputType: 'numeric' as const,
    resendable: false
  },
  backup_code: {
    title: 'Backup Code',
    description: 'Enter one of your backup codes',
    icon: '🔑',
    inputLength: 8,
    inputType: 'alphanumeric' as const,
    resendable: false
  }
};

export default function MFAChallenge({
  challengeId,
  method,
  expiresAt,
  action,
  onSuccess,
  onCancel,
  onError,
  onResend,
  metadata
}: MFAChallengeProps) {
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [countdown, setCountdown] = useState<CountdownState>({ minutes: 0, seconds: 0, isExpired: false });
  const [attempts, setAttempts] = useState(0);
  const [error, setError] = useState<string>('');
  const [canResend, setCanResend] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const config = MFA_METHOD_CONFIG[method];

  // Auto-focus input on mount
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  // Countdown timer effect
  useEffect(() => {
    const updateCountdown = () => {
      const now = Date.now();
      const expiryTime = expiresAt.getTime();
      const timeLeft = expiryTime - now;

      if (timeLeft <= 0) {
        setCountdown({ minutes: 0, seconds: 0, isExpired: true });
        return;
      }

      const minutes = Math.floor(timeLeft / (1000 * 60));
      const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
      setCountdown({ minutes, seconds, isExpired: false });
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  // Resend countdown effect
  useEffect(() => {
    if (resendCountdown > 0) {
      const timer = setTimeout(() => {
        setResendCountdown(resendCountdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (config.resendable) {
      setCanResend(true);
    }
  }, [resendCountdown, config.resendable]);

  // Initialize resend cooldown
  useEffect(() => {
    if (config.resendable) {
      setResendCountdown(60); // 60 second cooldown
    }
  }, [config.resendable]);

  const handleCodeChange = (value: string) => {
    // Clear error when user starts typing
    if (error) {
      setError('');
    }

    // Filter input based on method type
    let filteredValue = value;
    if (config.inputType === 'numeric') {
      filteredValue = value.replace(/[^0-9]/g, '');
    } else {
      filteredValue = value.replace(/[^A-Z0-9]/g, '').toUpperCase();
    }

    // Limit to expected length
    filteredValue = filteredValue.slice(0, config.inputLength);
    setCode(filteredValue);

    // Auto-submit when full code is entered for numeric codes
    if (config.inputType === 'numeric' && filteredValue.length === config.inputLength) {
      setTimeout(() => handleVerify(filteredValue), 100);
    }
  };

  const handleVerify = async (codeToVerify = code) => {
    if (countdown.isExpired) {
      setError('Verification code has expired');
      return;
    }

    if (codeToVerify.length !== config.inputLength) {
      setError(`Please enter a ${config.inputLength}-character code`);
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/mfa/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('rbac_token')}`
        },
        body: JSON.stringify({
          challengeId,
          code: codeToVerify
        })
      });

      const result = await response.json();

      if (result.success) {
        onSuccess(result);
      } else {
        setAttempts(prev => prev + 1);
        
        switch (result.errorCode) {
          case 'INVALID_CODE':
            setError(`Invalid code. ${result.remainingAttempts || 0} attempts remaining.`);
            break;
          case 'EXPIRED':
            setError('Verification code has expired. Please request a new one.');
            break;
          case 'MAX_ATTEMPTS':
            setError('Maximum attempts exceeded. Please request a new verification code.');
            break;
          case 'ALREADY_VERIFIED':
            setError('This verification code has already been used.');
            break;
          default:
            setError(result.errorMessage || 'Verification failed. Please try again.');
        }
        
        // Clear code on error for security
        setCode('');
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }
    } catch (err) {
      console.error('MFA verification error:', err);
      setError('Network error. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (!onResend || !canResend) return;

    setCanResend(false);
    setResendCountdown(60);
    setError('');
    
    try {
      await onResend();
    } catch (err) {
      setError('Failed to resend code. Please try again.');
      setCanResend(true);
      setResendCountdown(0);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && code.length === config.inputLength && !isLoading) {
      handleVerify();
    } else if (e.key === 'Escape') {
      onCancel();
    }
  };

  const getDestinationDisplay = () => {
    if (method === 'sms' && metadata?.maskedPhone) {
      return metadata.maskedPhone;
    }
    if (method === 'email' && metadata?.maskedEmail) {
      return metadata.maskedEmail;
    }
    return '';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="text-2xl">{config.icon}</div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{config.title}</h3>
                {action && (
                  <p className="text-sm text-gray-500">Required for: {action}</p>
                )}
              </div>
            </div>
            <button
              onClick={onCancel}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Cancel verification"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-4">
          <div className="text-center mb-6">
            <p className="text-gray-600 mb-2">{config.description}</p>
            {getDestinationDisplay() && (
              <p className="text-sm text-gray-500">
                Sent to: <span className="font-mono">{getDestinationDisplay()}</span>
              </p>
            )}
          </div>

          {/* Countdown Timer */}
          {!countdown.isExpired && (
            <div className="text-center mb-4">
              <div className="inline-flex items-center px-3 py-1 rounded-full bg-blue-100 text-blue-800 text-sm">
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {countdown.minutes}:{countdown.seconds.toString().padStart(2, '0')} remaining
              </div>
            </div>
          )}

          {countdown.isExpired && (
            <div className="text-center mb-4">
              <div className="inline-flex items-center px-3 py-1 rounded-full bg-red-100 text-red-800 text-sm">
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                Code expired
              </div>
            </div>
          )}

          {/* Code Input */}
          <div className="mb-4">
            <label htmlFor="mfa-code" className="sr-only">
              Verification code
            </label>
            <input
              ref={inputRef}
              id="mfa-code"
              type="text"
              value={code}
              onChange={(e) => handleCodeChange(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={config.inputType === 'numeric' ? '000000' : 'XXXXXXXX'}
              disabled={isLoading || countdown.isExpired}
              className={`
                w-full px-4 py-3 text-center text-2xl tracking-widest font-mono
                border rounded-lg focus:outline-none focus:ring-2 transition-colors
                ${error 
                  ? 'border-red-300 focus:border-red-500 focus:ring-red-200' 
                  : 'border-gray-300 focus:border-blue-500 focus:ring-blue-200'
                }
                ${(isLoading || countdown.isExpired) ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}
              `}
              maxLength={config.inputLength}
              autoComplete="one-time-code"
              inputMode={config.inputType === 'numeric' ? 'numeric' : 'text'}
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200">
              <div className="flex items-center">
                <svg className="w-4 h-4 text-red-500 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          )}

          {/* Progress Indicator */}
          {config.inputType === 'numeric' && (
            <div className="mb-4">
              <div className="flex justify-center space-x-1">
                {Array.from({ length: config.inputLength }).map((_, index) => (
                  <div
                    key={index}
                    className={`w-3 h-1 rounded-full transition-colors ${
                      index < code.length ? 'bg-blue-500' : 'bg-gray-200'
                    }`}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col space-y-3">
            {/* Verify Button (for non-auto-submit methods) */}
            {(config.inputType !== 'numeric' || code.length < config.inputLength) && (
              <button
                onClick={() => handleVerify()}
                disabled={code.length !== config.inputLength || isLoading || countdown.isExpired}
                className={`
                  w-full py-3 px-4 rounded-lg font-medium transition-colors
                  ${code.length === config.inputLength && !isLoading && !countdown.isExpired
                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }
                `}
              >
                {isLoading ? (
                  <div className="flex items-center justify-center">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Verifying...
                  </div>
                ) : (
                  'Verify Code'
                )}
              </button>
            )}

            {/* Resend Button */}
            {config.resendable && onResend && (
              <button
                onClick={handleResend}
                disabled={!canResend}
                className={`
                  w-full py-2 px-4 rounded-lg font-medium border transition-colors
                  ${canResend
                    ? 'border-blue-300 text-blue-600 hover:bg-blue-50'
                    : 'border-gray-300 text-gray-400 cursor-not-allowed'
                  }
                `}
              >
                {canResend ? 'Resend Code' : `Resend in ${resendCountdown}s`}
              </button>
            )}

            {/* Cancel Button */}
            <button
              onClick={onCancel}
              className="w-full py-2 px-4 rounded-lg font-medium border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>

        {/* Footer */}
        {attempts > 0 && (
          <div className="px-6 py-3 bg-gray-50 rounded-b-lg border-t border-gray-200">
            <p className="text-xs text-gray-500 text-center">
              Failed attempts: {attempts}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// Export type for external use
export type { MFAChallengeProps };