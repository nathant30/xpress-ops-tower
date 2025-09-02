// Security Headers Middleware
// Implements comprehensive security headers for production deployment

import { NextRequest, NextResponse } from 'next/server';

export function securityHeaders(request: NextRequest) {
  // HTTPS Enforcement in production
  if (process.env.NODE_ENV === 'production' && request.nextUrl.protocol === 'http:') {
    const httpsUrl = new URL(request.url);
    httpsUrl.protocol = 'https:';
    return NextResponse.redirect(httpsUrl, 301);
  }

  const response = NextResponse.next();

  // Security Headers Implementation
  const securityHeadersConfig = {
    // Strict Transport Security - Enforce HTTPS
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
    
    // Content Security Policy - Prevent XSS
    'Content-Security-Policy': [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline'", // Next.js requires unsafe-eval
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      "connect-src 'self' wss: ws:",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'"
    ].join('; '),
    
    // X-Frame-Options - Prevent clickjacking
    'X-Frame-Options': 'DENY',
    
    // X-Content-Type-Options - Prevent MIME sniffing
    'X-Content-Type-Options': 'nosniff',
    
    // Referrer Policy - Control referrer information
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    
    // Permissions Policy - Control browser features
    'Permissions-Policy': [
      'geolocation=(self)',
      'microphone=()',
      'camera=()',
      'payment=(self)',
      'usb=()',
      'magnetometer=()',
      'gyroscope=()',
      'accelerometer=()'
    ].join(', '),
    
    // X-XSS-Protection - Legacy XSS protection
    'X-XSS-Protection': '1; mode=block',
    
    // X-DNS-Prefetch-Control - Control DNS prefetching
    'X-DNS-Prefetch-Control': 'off'
  };

  // Apply all security headers
  Object.entries(securityHeadersConfig).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  // CORS Headers for API routes
  if (request.nextUrl.pathname.startsWith('/api/')) {
    const allowedOrigins = process.env.CORS_ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:4002'];
    const origin = request.headers.get('origin');
    
    if (origin && allowedOrigins.includes(origin)) {
      response.headers.set('Access-Control-Allow-Origin', origin);
    }
    
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    response.headers.set('Access-Control-Allow-Credentials', 'true');
    response.headers.set('Access-Control-Max-Age', '86400'); // 24 hours
  }

  return response;
}

// Rate Limiting Configuration
export const rateLimitConfig = {
  // API Rate Limits
  api: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: 'Too many API requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false
  },
  
  // Authentication Rate Limits
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Limit each IP to 5 auth attempts per windowMs
    message: 'Too many authentication attempts, please try again later.',
    skipSuccessfulRequests: true
  },
  
  // MFA Rate Limits
  mfa: {
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 3, // Limit each IP to 3 MFA attempts per windowMs
    message: 'Too many MFA attempts, please wait before trying again.'
  }
};

export default securityHeaders;