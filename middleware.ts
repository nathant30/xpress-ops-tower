/**
 * Next.js Middleware - Production Security Configuration
 * Applies comprehensive security headers and HTTPS enforcement
 */

import { NextRequest } from 'next/server';
import { securityHeaders } from './src/middleware/security';

export function middleware(request: NextRequest) {
  // Apply security headers to all requests
  return securityHeaders(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};