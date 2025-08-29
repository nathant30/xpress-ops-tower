// /api/auth/client-ip - Client IP Detection API
import { NextRequest } from 'next/server';
import { 
  createApiResponse, 
  createApiError,
  asyncHandler,
  handleOptionsRequest
} from '@/lib/api-utils';

interface ClientIPResponse {
  ip: string;
  forwardedFor?: string;
  realIP?: string;
  userAgent?: string;
  timestamp: string;
}

// GET /api/auth/client-ip - Get client IP address for security logging
export const GET = asyncHandler(async (request: NextRequest) => {
  try {
    // Get IP from various headers (prioritized order)
    const forwardedFor = request.headers.get('x-forwarded-for');
    const realIP = request.headers.get('x-real-ip');
    const cfConnectingIP = request.headers.get('cf-connecting-ip'); // Cloudflare
    const xClientIP = request.headers.get('x-client-ip');
    const userAgent = request.headers.get('user-agent');

    // Determine the most reliable IP address
    let clientIP = 'unknown';
    
    if (cfConnectingIP) {
      // Cloudflare provides reliable client IP
      clientIP = cfConnectingIP;
    } else if (realIP) {
      // Real IP header (often set by reverse proxies)
      clientIP = realIP;
    } else if (forwardedFor) {
      // X-Forwarded-For can contain multiple IPs, take the first one
      const ips = forwardedFor.split(',').map(ip => ip.trim());
      clientIP = ips[0];
    } else if (xClientIP) {
      // X-Client-IP header
      clientIP = xClientIP;
    }

    // Basic IP validation and cleaning
    if (clientIP && clientIP !== 'unknown') {
      // Remove any port numbers
      clientIP = clientIP.split(':')[0];
      
      // Basic IPv4 validation (simple check)
      const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
      const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
      
      if (!ipv4Regex.test(clientIP) && !ipv6Regex.test(clientIP)) {
        // If IP doesn't match basic patterns, mark as unknown
        clientIP = 'unknown';
      }
    }

    const response: ClientIPResponse = {
      ip: clientIP,
      forwardedFor: forwardedFor || undefined,
      realIP: realIP || undefined,
      userAgent: userAgent || undefined,
      timestamp: new Date().toISOString()
    };

    return createApiResponse(
      response,
      'Client IP detected successfully',
      200
    );

  } catch (error) {
    console.error('Client IP detection error:', error);
    
    return createApiError(
      'Failed to detect client IP',
      'IP_DETECTION_ERROR',
      500,
      undefined,
      '/api/auth/client-ip',
      'GET'
    );
  }
});

// POST /api/auth/client-ip - Alternative method for IP detection (same functionality)
export const POST = GET;

// OPTIONS handler for CORS
export const OPTIONS = handleOptionsRequest;