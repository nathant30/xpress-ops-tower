// API Utilities for Xpress Ops Tower
import { NextRequest, NextResponse } from 'next/server';
import { ApiResponse, ApiError } from '@/types';
import { logger } from '@/lib/security/productionLogger';

// Standard API response wrapper
export function createApiResponse<T>(
  data: T, 
  message?: string, 
  status: number = 200
): NextResponse<ApiResponse<T>> {
  const response: ApiResponse<T> = {
    success: true,
    data,
    message,
    timestamp: new Date(),
    requestId: generateRequestId(),
  };
  
  return NextResponse.json(response, { status });
}

// Standard API error response
export function createApiError(
  message: string,
  code: string = 'INTERNAL_ERROR',
  status: number = 500,
  details?: Record<string, unknown>,
  path?: string,
  method?: string
): NextResponse<ApiError> {
  const error: ApiError = {
    success: false,
    error: {
      code,
      message,
      details,
    },
    timestamp: new Date(),
    requestId: generateRequestId(),
    path: path || '',
    method: method || 'UNKNOWN',
  };
  
  return NextResponse.json(error, { status });
}

// Generate unique request ID
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Validation error handler
export function createValidationError(
  errors: Array<{ field: string; message: string; code?: string }>,
  path?: string,
  method?: string
): NextResponse<ApiError> {
  return createApiError(
    'Validation failed',
    'VALIDATION_ERROR',
    400,
    { errors },
    path,
    method
  );
}

// Not found error
export function createNotFoundError(
  resource: string = 'Resource',
  path?: string,
  method?: string
): NextResponse<ApiError> {
  return createApiError(
    `${resource} not found`,
    'NOT_FOUND',
    404,
    undefined,
    path,
    method
  );
}

// Unauthorized error
export function createUnauthorizedError(
  path?: string,
  method?: string
): NextResponse<ApiError> {
  return createApiError(
    'Unauthorized access',
    'UNAUTHORIZED',
    401,
    undefined,
    path,
    method
  );
}

// Rate limit error
export function createRateLimitError(
  path?: string,
  method?: string
): NextResponse<ApiError> {
  return createApiError(
    'Rate limit exceeded',
    'RATE_LIMIT_EXCEEDED',
    429,
    undefined,
    path,
    method
  );
}

// Method not allowed error
export function createMethodNotAllowedError(
  allowedMethods: string[],
  path?: string,
  method?: string
): NextResponse<ApiError> {
  return createApiError(
    `Method ${method} not allowed`,
    'METHOD_NOT_ALLOWED',
    405,
    { allowedMethods },
    path,
    method
  );
}

// Parse query parameters with type conversion
export function parseQueryParams(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const params: Record<string, unknown> = {};
  
  searchParams.forEach((value, key) => {
    // Handle arrays (comma-separated values)
    if (value.includes(',')) {
      params[key] = value.split(',').map(v => v.trim());
    }
    // Handle booleans
    else if (value === 'true' || value === 'false') {
      params[key] = value === 'true';
    }
    // Handle numbers
    else if (!isNaN(Number(value)) && value !== '') {
      params[key] = Number(value);
    }
    // Handle dates (ISO format)
    else if (value.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/)) {
      params[key] = new Date(value);
    }
    // Handle strings
    else {
      params[key] = value;
    }
  });
  
  return params;
}

// Parse pagination parameters
export function parsePaginationParams(request: NextRequest) {
  const params = parseQueryParams(request);
  
  return {
    page: Math.max(1, Number(params.page) || 1),
    limit: Math.min(100, Math.max(1, Number(params.limit) || 10)),
    sortBy: typeof params.sortBy === 'string' ? params.sortBy : undefined,
    sortOrder: params.sortOrder === 'desc' ? 'desc' : 'asc' as 'asc' | 'desc',
  };
}

// Apply pagination to data
export function applyPagination<T>(
  data: T[],
  page: number,
  limit: number
) {
  const offset = (page - 1) * limit;
  const paginatedData = data.slice(offset, offset + limit);
  
  return {
    data: paginatedData,
    pagination: {
      page,
      limit,
      total: data.length,
      pages: Math.ceil(data.length / limit),
      hasNext: page < Math.ceil(data.length / limit),
      hasPrev: page > 1,
    },
  };
}

// Validate required fields
export function validateRequiredFields(
  data: Record<string, unknown>,
  requiredFields: string[]
): Array<{ field: string; message: string; code: string }> {
  const errors: Array<{ field: string; message: string; code: string }> = [];
  
  requiredFields.forEach(field => {
    if (data[field] === undefined || data[field] === null || data[field] === '') {
      errors.push({
        field,
        message: `${field} is required`,
        code: 'REQUIRED_FIELD_MISSING',
      });
    }
  });
  
  return errors;
}

// Sanitize data for response (remove sensitive fields)
export function sanitizeData<T extends Record<string, unknown>>(
  data: T,
  sensitiveFields: string[] = []
): Partial<T> {
  const sanitized = { ...data };
  
  // Default sensitive fields
  const defaultSensitiveFields = ['password', 'secret', 'token', 'key'];
  const allSensitiveFields = [...defaultSensitiveFields, ...sensitiveFields];
  
  allSensitiveFields.forEach(field => {
    delete sanitized[field];
  });
  
  return sanitized;
}

// Rate limiting helper (simple in-memory implementation)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

export function checkRateLimit(
  identifier: string,
  limit: number = 100,
  windowMs: number = 60 * 1000 // 1 minute
): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const key = identifier;
  
  const record = rateLimitStore.get(key);
  
  if (!record || now > record.resetTime) {
    // First request or window expired
    const resetTime = now + windowMs;
    rateLimitStore.set(key, { count: 1, resetTime });
    return { allowed: true, remaining: limit - 1, resetTime };
  }
  
  if (record.count >= limit) {
    // Rate limit exceeded
    return { allowed: false, remaining: 0, resetTime: record.resetTime };
  }
  
  // Increment count
  record.count++;
  rateLimitStore.set(key, record);
  
  return { allowed: true, remaining: limit - record.count, resetTime: record.resetTime };
}

// CORS headers helper
export function setCorsHeaders(response: NextResponse) {
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  return response;
}

// Handle OPTIONS request for CORS
export function handleOptionsRequest(): NextResponse {
  const response = new NextResponse(null, { status: 200 });
  return setCorsHeaders(response);
}

// Async error handler wrapper
export function asyncHandler(
  handler: (request: NextRequest, params?: { params: Record<string, string> }) => Promise<NextResponse>
) {
  return async (request: NextRequest, params?: { params: Record<string, string> }) => {
    try {
      const response = await handler(request, params);
      return setCorsHeaders(response);
    } catch (error: unknown) {
      logger.error('API Error', error instanceof Error ? error.message : error);
      
      if (error instanceof Error) {
        return createApiError(
          error.message || 'Internal server error',
          'INTERNAL_ERROR',
          500,
          { stack: process.env.NODE_ENV === 'development' ? error.stack : undefined },
          new URL(request.url).pathname,
          request.method
        );
      }
      
      return createApiError(
        'Unknown error occurred',
        'UNKNOWN_ERROR',
        500,
        undefined,
        new URL(request.url).pathname,
        request.method
      );
    }
  };
}

// Environment-based database mock checker
export function isDatabaseConnected(): boolean {
  // In a real app, this would check actual database connection
  // For demo purposes, we'll always use mock data
  return process.env.NODE_ENV === 'production' ? false : false;
}

// Log API request for monitoring
export function logApiRequest(request: NextRequest, responseStatus: number, responseTime?: number) {
  const logData = {
    method: request.method,
    url: request.url,
    userAgent: request.headers.get('user-agent'),
    timestamp: new Date().toISOString(),
    responseStatus,
    responseTime,
  };
  
  // In production, this would go to a proper logging service
  if (process.env.NODE_ENV === 'development') {
    logger.debug('API Request', logData);
  }
}