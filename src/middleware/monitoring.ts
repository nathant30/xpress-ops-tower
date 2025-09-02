// Monitoring Middleware for API endpoints

import { NextRequest, NextResponse } from 'next/server';
import { metricsCollector } from '../lib/monitoring/metrics-collector';
import { logger } from '../lib/security/productionLogger';

export interface MonitoringConfig {
  trackPerformance: boolean;
  trackErrors: boolean;
  trackSecurity: boolean;
  slowQueryThreshold: number; // milliseconds
  excludePaths?: string[];
}

const defaultConfig: MonitoringConfig = {
  trackPerformance: true,
  trackErrors: true,
  trackSecurity: true,
  slowQueryThreshold: 2000,
  excludePaths: ['/api/health', '/favicon.ico', '/_next/']
};

export function createMonitoringMiddleware(config: Partial<MonitoringConfig> = {}) {
  const finalConfig = { ...defaultConfig, ...config };

  return async function monitoringMiddleware(
    request: NextRequest,
    handler: () => Promise<NextResponse>
  ): Promise<NextResponse> {
    const startTime = Date.now();
    const requestId = crypto.randomUUID();
    const path = request.nextUrl.pathname;
    const method = request.method;
    
    // Skip monitoring for excluded paths
    if (finalConfig.excludePaths?.some(excludePath => path.startsWith(excludePath))) {
      return handler();
    }

    // Extract user context
    const userAgent = request.headers.get('user-agent') || '';
    const ipAddress = getClientIP(request);
    const userId = extractUserId(request);
    const region = extractRegion(request);

    // Set request context
    request.headers.set('x-request-id', requestId);

    let response: NextResponse;
    let error: Error | null = null;
    let statusCode = 200;

    try {
      response = await handler();
      statusCode = response.status;
    } catch (err) {
      error = err as Error;
      statusCode = 500;
      
      // Create error response
      response = NextResponse.json(
        {
          success: false,
          error: {
            code: 'INTERNAL_SERVER_ERROR',
            message: 'An internal server error occurred',
            details: process.env.NODE_ENV === 'development' ? err : undefined
          },
          timestamp: new Date(),
          requestId
        },
        { status: 500 }
      );
    }

    const duration = Date.now() - startTime;
    const success = statusCode < 400;

    // Record performance metrics
    if (finalConfig.trackPerformance) {
      metricsCollector.recordPerformanceMetric({
        duration,
        success,
        endpoint: path,
        method,
        statusCode,
        errorType: error ? getErrorType(error) : undefined,
        userAgent,
        userId,
        region
      });
    }

    // Track security events
    if (finalConfig.trackSecurity) {
      trackSecurityEvents(request, response, {
        requestId,
        ipAddress,
        userAgent,
        userId,
        path,
        method,
        statusCode,
        duration
      });
    }

    // Log request details
    const logLevel = success ? 'info' : 'error';
    const logMessage = `${method} ${path} ${statusCode} ${duration}ms`;
    
    logger[logLevel](logMessage, {
      requestId,
      method,
      path,
      statusCode,
      duration,
      userAgent: userAgent.substring(0, 100),
      ipAddress,
      userId,
      region,
      error: error ? {
        message: error.message,
        stack: error.stack?.substring(0, 500)
      } : undefined
    }, {
      component: 'MonitoringMiddleware',
      action: 'handleRequest'
    });

    // Add monitoring headers to response
    response.headers.set('X-Request-ID', requestId);
    response.headers.set('X-Response-Time', `${duration}ms`);

    return response;
  };
}

// Extract client IP address
function getClientIP(request: NextRequest): string {
  // Check various headers that might contain the real IP
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  const realIP = request.headers.get('x-real-ip');
  if (realIP) {
    return realIP;
  }

  const cfConnectingIP = request.headers.get('cf-connecting-ip');
  if (cfConnectingIP) {
    return cfConnectingIP;
  }

  // Fallback to connection remote address
  return request.ip || 'unknown';
}

// Extract user ID from request (JWT token, session, etc.)
function extractUserId(request: NextRequest): string | undefined {
  try {
    // Check Authorization header
    const auth = request.headers.get('authorization');
    if (auth?.startsWith('Bearer ')) {
      const token = auth.substring(7);
      // In a real app, you'd decode the JWT token
      // For now, we'll just check if it exists
      return token ? 'authenticated-user' : undefined;
    }

    // Check session cookie
    const sessionCookie = request.cookies.get('session')?.value;
    if (sessionCookie) {
      return 'session-user';
    }

    return undefined;
  } catch (error) {
    return undefined;
  }
}

// Extract region from request
function extractRegion(request: NextRequest): string | undefined {
  // Check custom header
  const regionHeader = request.headers.get('x-region');
  if (regionHeader) {
    return regionHeader;
  }

  // Check CloudFlare headers
  const cfRegion = request.headers.get('cf-ipcountry');
  if (cfRegion) {
    return cfRegion.toLowerCase();
  }

  // Default region
  return 'default';
}

// Categorize errors by type
function getErrorType(error: Error): string {
  const message = error.message.toLowerCase();
  
  if (message.includes('timeout')) {
    return 'TIMEOUT';
  }
  
  if (message.includes('connection') || message.includes('network')) {
    return 'CONNECTION_ERROR';
  }
  
  if (message.includes('validation') || message.includes('invalid')) {
    return 'VALIDATION_ERROR';
  }
  
  if (message.includes('permission') || message.includes('unauthorized')) {
    return 'AUTHORIZATION_ERROR';
  }
  
  if (message.includes('not found')) {
    return 'NOT_FOUND';
  }
  
  return 'UNKNOWN_ERROR';
}

// Track security-related events
function trackSecurityEvents(
  request: NextRequest,
  response: NextResponse,
  context: {
    requestId: string;
    ipAddress: string;
    userAgent: string;
    userId?: string;
    path: string;
    method: string;
    statusCode: number;
    duration: number;
  }
) {
  // Track authentication failures
  if (context.statusCode === 401) {
    metricsCollector.recordMetric('security_auth_failures', 1, 'count', {
      endpoint: context.path,
      ip_address: context.ipAddress,
      user_agent: context.userAgent.substring(0, 50)
    });
  }

  // Track suspicious activity patterns
  if (context.duration > 10000 || context.statusCode >= 500) {
    metricsCollector.recordMetric('security_suspicious_requests', 1, 'count', {
      endpoint: context.path,
      status_code: context.statusCode.toString(),
      duration_bucket: getDurationBucket(context.duration)
    });
  }

  // Track potential attack patterns
  const suspiciousPatterns = [
    /\/\.\.\//,  // Directory traversal
    /<script/i,  // XSS attempts
    /union.*select/i,  // SQL injection
    /javascript:/i,  // JavaScript injection
    /onload=/i,  // Event handler injection
  ];

  const fullUrl = `${context.path}?${request.nextUrl.searchParams.toString()}`;
  const hasSuspiciousPattern = suspiciousPatterns.some(pattern => pattern.test(fullUrl));
  
  if (hasSuspiciousPattern) {
    metricsCollector.recordMetric('security_attack_attempts', 1, 'count', {
      endpoint: context.path,
      ip_address: context.ipAddress,
      attack_type: 'INJECTION_ATTEMPT'
    });

    logger.warn('Suspicious request pattern detected', {
      requestId: context.requestId,
      path: context.path,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      fullUrl: fullUrl.substring(0, 200)
    }, {
      component: 'SecurityMonitoring',
      action: 'detectSuspiciousPattern'
    });
  }

  // Track rate limiting violations
  if (context.statusCode === 429) {
    metricsCollector.recordMetric('security_rate_limit_violations', 1, 'count', {
      endpoint: context.path,
      ip_address: context.ipAddress
    });
  }
}

// Get duration bucket for analysis
function getDurationBucket(duration: number): string {
  if (duration < 100) return '0-100ms';
  if (duration < 500) return '100-500ms';
  if (duration < 1000) return '500ms-1s';
  if (duration < 5000) return '1s-5s';
  if (duration < 10000) return '5s-10s';
  return '10s+';
}

// Create request context for downstream handlers
export function createRequestContext(request: NextRequest) {
  return {
    requestId: request.headers.get('x-request-id') || crypto.randomUUID(),
    userId: extractUserId(request),
    ipAddress: getClientIP(request),
    userAgent: request.headers.get('user-agent') || '',
    region: extractRegion(request),
    timestamp: new Date()
  };
}

// Export default monitoring middleware
export const monitoringMiddleware = createMonitoringMiddleware();