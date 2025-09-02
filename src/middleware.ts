// Next.js Middleware - Security & RBAC Integration
import { NextRequest } from 'next/server';
import { securityHeaders } from './middleware/security';

export function middleware(request: NextRequest) {
  // Apply security headers to all requests
  const response = securityHeaders(request);
  
  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}