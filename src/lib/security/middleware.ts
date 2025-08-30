import { NextRequest, NextResponse } from 'next/server';
import { secureLog, validateInput, securityHeaders, getSecurityConfig } from './securityUtils';

// Rate limiting store
const rateLimitStore = new Map<string, { requests: number[]; blocked: boolean }>();

// Security middleware for API routes
export const securityMiddleware = {
  // Apply security headers to all responses
  withSecurityHeaders: (response: NextResponse): NextResponse => {
    Object.entries(securityHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
    return response;
  },

  // Rate limiting middleware
  withRateLimit: (maxRequests = 100, windowMs = 60000) => {
    return (req: NextRequest): NextResponse | null => {
      const clientIP = req.ip || req.headers.get('x-forwarded-for') || 'unknown';
      const now = Date.now();
      const windowStart = now - windowMs;
      
      // Get or create client data
      let clientData = rateLimitStore.get(clientIP);
      if (!clientData) {
        clientData = { requests: [], blocked: false };
        rateLimitStore.set(clientIP, clientData);
      }
      
      // Filter out old requests
      clientData.requests = clientData.requests.filter(time => time > windowStart);
      
      // Check if client is rate limited
      if (clientData.requests.length >= maxRequests) {
        if (!clientData.blocked) {
          secureLog.warn(`Rate limit exceeded for IP: ${clientIP}`);
          clientData.blocked = true;
        }
        
        const response = NextResponse.json(
          { error: 'Too many requests', retryAfter: Math.ceil(windowMs / 1000) },
          { status: 429 }
        );
        
        response.headers.set('Retry-After', Math.ceil(windowMs / 1000).toString());
        return securityMiddleware.withSecurityHeaders(response);
      }
      
      // Add current request
      clientData.requests.push(now);
      clientData.blocked = false;
      
      return null; // Continue to next middleware
    };
  },

  // Input validation middleware
  withInputValidation: (validationRules: Record<string, (value: any) => boolean>) => {
    return async (req: NextRequest): Promise<NextResponse | null> => {
      try {
        let body: any = {};
        
        if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
          const contentType = req.headers.get('content-type') || '';
          
          if (contentType.includes('application/json')) {
            body = await req.json();
          } else if (contentType.includes('multipart/form-data')) {
            const formData = await req.formData();
            body = Object.fromEntries(formData.entries());
          }
        }
        
        // Apply validation rules
        for (const [field, validator] of Object.entries(validationRules)) {
          if (field in body && !validator(body[field])) {
            secureLog.warn(`Validation failed for field: ${field}`, { value: body[field] });
            return securityMiddleware.withSecurityHeaders(
              NextResponse.json(
                { error: `Invalid input for field: ${field}` },
                { status: 400 }
              )
            );
          }
        }
        
        return null; // Validation passed
      } catch (error) {
        secureLog.error('Input validation error:', error);
        return securityMiddleware.withSecurityHeaders(
          NextResponse.json(
            { error: 'Invalid request format' },
            { status: 400 }
          )
        );
      }
    };
  },

  // Authentication middleware
  withAuth: (requiredRoles?: string[]) => {
    return (req: NextRequest): NextResponse | null => {
      const token = req.headers.get('authorization')?.replace('Bearer ', '');
      
      if (!token) {
        secureLog.warn('Unauthorized access attempt - no token');
        return securityMiddleware.withSecurityHeaders(
          NextResponse.json(
            { error: 'Unauthorized - missing token' },
            { status: 401 }
          )
        );
      }
      
      try {
        // In a real implementation, verify JWT token here
        // const payload = verifyJWT(token);
        
        // For now, basic validation
        if (token.length < 10) {
          throw new Error('Invalid token format');
        }
        
        // Role-based access control
        if (requiredRoles && requiredRoles.length > 0) {
          // In real implementation, extract role from token
          // const userRole = payload.role;
          // if (!requiredRoles.includes(userRole)) {
          //   return forbiddenResponse();
          // }
        }
        
        return null; // Authentication passed
      } catch (error) {
        secureLog.warn('Token validation failed:', { error: error instanceof Error ? error.message : 'Unknown error' });
        return securityMiddleware.withSecurityHeaders(
          NextResponse.json(
            { error: 'Unauthorized - invalid token' },
            { status: 401 }
          )
        );
      }
    };
  },

  // CORS middleware
  withCORS: (allowedOrigins: string[] = []) => {
    return (req: NextRequest): NextResponse | null => {
      const origin = req.headers.get('origin');
      
      // Handle preflight requests
      if (req.method === 'OPTIONS') {
        const response = new NextResponse(null, { status: 200 });
        
        if (origin && (allowedOrigins.length === 0 || allowedOrigins.includes(origin))) {
          response.headers.set('Access-Control-Allow-Origin', origin);
        }
        
        response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        response.headers.set('Access-Control-Max-Age', '86400');
        
        return securityMiddleware.withSecurityHeaders(response);
      }
      
      return null; // Not a preflight request
    };
  },

  // Compose multiple middleware functions
  compose: (...middlewares: Array<(req: NextRequest) => NextResponse | Promise<NextResponse> | null>) => {
    return async (req: NextRequest): Promise<NextResponse> => {
      for (const middleware of middlewares) {
        const result = await middleware(req);
        if (result) {
          return result; // Short-circuit on first response
        }
      }
      
      // If no middleware returned a response, continue with default
      return securityMiddleware.withSecurityHeaders(
        NextResponse.json({ error: 'Internal server error' }, { status: 500 })
      );
    };
  }
};

// Predefined middleware combinations
export const apiSecurityMiddleware = securityMiddleware.compose(
  securityMiddleware.withRateLimit(),
  securityMiddleware.withCORS(['http://localhost:3000', 'https://ops-tower.xpress.com'])
);

export const authenticatedApiMiddleware = securityMiddleware.compose(
  securityMiddleware.withRateLimit(),
  securityMiddleware.withCORS(['http://localhost:3000', 'https://ops-tower.xpress.com']),
  securityMiddleware.withAuth()
);

export const adminApiMiddleware = securityMiddleware.compose(
  securityMiddleware.withRateLimit(50, 60000), // Stricter rate limit for admin
  securityMiddleware.withCORS(['http://localhost:3000', 'https://ops-tower.xpress.com']),
  securityMiddleware.withAuth(['admin', 'regional_manager'])
);