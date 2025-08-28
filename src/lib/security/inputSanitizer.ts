// Input Sanitization and Validation Library
// Comprehensive security input handling for Xpress Ops Tower

import DOMPurify from 'isomorphic-dompurify';
import { z } from 'zod';

// Common input validation schemas
export const ValidationSchemas = {
  regionId: z.string().regex(/^[a-z_]+$/).max(50),
  driverId: z.string().uuid(),
  bookingId: z.string().uuid(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  phoneNumber: z.string().regex(/^\+?[1-9]\d{1,14}$/),
  email: z.string().email().max(255),
  emergencyType: z.enum(['medical', 'accident', 'security', 'vehicle', 'harassment', 'kidnapping']),
  priority: z.enum(['critical', 'high', 'medium', 'low'])
};

// Sanitization functions
export const sanitizeInput = (input: unknown): string => {
  if (typeof input !== 'string') {
    return '';
  }
  
  // Remove potential XSS payloads
  const cleaned = DOMPurify.sanitize(input, { 
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: []
  });
  
  // Remove SQL injection patterns
  return cleaned
    .replace(/['";\\]/g, '')
    .replace(/--/g, '')
    .replace(/\/\*/g, '')
    .replace(/\*\//g, '')
    .replace(/xp_/gi, '')
    .replace(/sp_/gi, '')
    .trim();
};

export const sanitizeHtml = (input: string): string => {
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br'],
    ALLOWED_ATTR: []
  });
};

export const sanitizeFileName = (fileName: string): string => {
  return fileName
    .replace(/[^a-zA-Z0-9.-]/g, '_')
    .replace(/\.{2,}/g, '.')
    .substring(0, 255);
};

// Validation helpers
export const validateRegionId = (regionId: string): boolean => {
  return ValidationSchemas.regionId.safeParse(regionId).success;
};

export const validateCoordinates = (lat: number, lng: number): boolean => {
  return ValidationSchemas.latitude.safeParse(lat).success &&
         ValidationSchemas.longitude.safeParse(lng).success;
};

export const validateEmergencyData = (data: {
  type: string;
  priority: string;
  location?: { lat: number; lng: number };
}): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (!ValidationSchemas.emergencyType.safeParse(data.type).success) {
    errors.push('Invalid emergency type');
  }
  
  if (!ValidationSchemas.priority.safeParse(data.priority).success) {
    errors.push('Invalid priority level');
  }
  
  if (data.location && !validateCoordinates(data.location.lat, data.location.lng)) {
    errors.push('Invalid coordinates');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// Rate limiting validation
export const validateRateLimit = (
  identifier: string,
  limit: number,
  windowMs: number,
  store: Map<string, { count: number; resetTime: number }>
): boolean => {
  const now = Date.now();
  const record = store.get(identifier);
  
  if (!record || now > record.resetTime) {
    store.set(identifier, { count: 1, resetTime: now + windowMs });
    return true;
  }
  
  if (record.count >= limit) {
    return false;
  }
  
  record.count++;
  return true;
};

// Content security validation
export const validateContentSecurity = (content: string): {
  isSecure: boolean;
  risks: string[];
} => {
  const risks: string[] = [];
  
  // Check for script injections
  if (/<script/i.test(content)) {
    risks.push('Script injection detected');
  }
  
  // Check for event handlers
  if (/on\w+\s*=/i.test(content)) {
    risks.push('Event handler injection detected');
  }
  
  // Check for data URIs
  if (/data:(?!image\/(?:png|jpg|jpeg|gif|svg\+xml))/i.test(content)) {
    risks.push('Suspicious data URI detected');
  }
  
  // Check for external links
  if (/https?:\/\/(?!localhost|127\.0\.0\.1)/i.test(content)) {
    risks.push('External link detected');
  }
  
  return {
    isSecure: risks.length === 0,
    risks
  };
};

export default {
  sanitizeInput,
  sanitizeHtml,
  sanitizeFileName,
  validateRegionId,
  validateCoordinates,
  validateEmergencyData,
  validateRateLimit,
  validateContentSecurity,
  ValidationSchemas
};