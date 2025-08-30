/**
 * Security utilities for Ops Tower
 * Provides secure logging, input validation, and sanitization
 */

import { logger } from './productionLogger';

// Secure logging that filters sensitive data
export const secureLog = {
  info: (message: string, data?: any) => {
    logger.info(message, sanitizeForLogging(data));
  },
  
  warn: (message: string, data?: any) => {
    logger.warn(message, sanitizeForLogging(data));
  },
  
  error: (message: string, error?: any) => {
    // Always log errors, but sanitize them
    logger.error(message, sanitizeForLogging(error));
  }
};

// Sanitize data for logging (remove sensitive fields)
const sanitizeForLogging = (data: any): any => {
  if (!data) return data;
  
  const sensitiveFields = [
    'password', 'token', 'secret', 'key', 'authorization',
    'phone', 'email', 'driverPhone', 'driverEmail', 
    'ssn', 'license', 'passport', 'creditcard'
  ];
  
  if (typeof data === 'object') {
    const sanitized = { ...data };
    
    for (const field of sensitiveFields) {
      if (field in sanitized) {
        sanitized[field] = '[REDACTED]';
      }
    }
    
    // Recursively sanitize nested objects
    for (const key in sanitized) {
      if (typeof sanitized[key] === 'object') {
        sanitized[key] = sanitizeForLogging(sanitized[key]);
      }
    }
    
    return sanitized;
  }
  
  return data;
};

// Input validation and sanitization
export const validateInput = {
  // Sanitize string input to prevent XSS
  sanitizeString: (input: string): string => {
    return input
      .replace(/[<>]/g, '') // Remove potential HTML tags
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/on\w+\s*=/gi, '') // Remove event handlers
      .trim();
  },
  
  // Validate and sanitize coordinates
  validateCoordinates: (lat: number, lng: number): boolean => {
    return (
      typeof lat === 'number' && 
      typeof lng === 'number' &&
      lat >= -90 && lat <= 90 &&
      lng >= -180 && lng <= 180 &&
      !isNaN(lat) && !isNaN(lng)
    );
  },
  
  // Validate phone number (Philippine format)
  validatePhoneNumber: (phone: string): boolean => {
    const phoneRegex = /^(\+63|63|0)[0-9]{10}$/;
    return phoneRegex.test(phone.replace(/\s|-/g, ''));
  },
  
  // Validate driver/user ID
  validateId: (id: string): boolean => {
    return /^[a-zA-Z0-9_-]+$/.test(id) && id.length <= 50;
  },
  
  // Rate limiting helper
  createRateLimiter: (maxRequests: number, windowMs: number) => {
    const requests = new Map<string, number[]>();
    
    return (clientId: string): boolean => {
      const now = Date.now();
      const windowStart = now - windowMs;
      
      // Get or create request history for this client
      const clientRequests = requests.get(clientId) || [];
      
      // Filter out requests outside the window
      const recentRequests = clientRequests.filter(time => time > windowStart);
      
      // Check if client has exceeded the limit
      if (recentRequests.length >= maxRequests) {
        return false; // Rate limit exceeded
      }
      
      // Add current request and update the map
      recentRequests.push(now);
      requests.set(clientId, recentRequests);
      
      return true; // Request allowed
    };
  }
};

// Security headers for API responses
export const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:;"
};

// Environment-specific configuration
export const getSecurityConfig = () => {
  const isProduction = process.env.NODE_ENV === 'production';
  
  return {
    logLevel: isProduction ? 'error' : 'debug',
    enableAuditLogging: isProduction,
    strictValidation: isProduction,
    rateLimitEnabled: true,
    maxRequestsPerMinute: isProduction ? 60 : 1000,
    sessionTimeout: isProduction ? 30 * 60 * 1000 : 60 * 60 * 1000, // 30min prod, 1hr dev
  };
};

// Emergency incident data validation
export const validateEmergencyData = (incident: any): boolean => {
  try {
    // Basic structure validation
    if (!incident || typeof incident !== 'object') return false;
    
    // Required fields validation
    const requiredFields = ['id', 'type', 'priority', 'driverId', 'location', 'timestamp'];
    for (const field of requiredFields) {
      if (!(field in incident)) return false;
    }
    
    // Validate coordinates if present
    if (incident.location && incident.location.lat && incident.location.lng) {
      if (!validateInput.validateCoordinates(incident.location.lat, incident.location.lng)) {
        return false;
      }
    }
    
    // Validate incident type
    const validTypes = ['sos', 'accident', 'breakdown', 'safety', 'medical'];
    if (!validTypes.includes(incident.type)) return false;
    
    // Validate priority
    const validPriorities = ['critical', 'high', 'medium', 'low'];
    if (!validPriorities.includes(incident.priority)) return false;
    
    return true;
  } catch (error) {
    secureLog.error('Emergency data validation failed:', error);
    return false;
  }
};