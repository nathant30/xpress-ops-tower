/**
 * API Versioning Middleware for Xpress Ops Tower
 * Ensures consistent API versioning across all endpoints
 */

import { NextRequest, NextResponse } from 'next/server';

export const API_VERSION = 'v1';
export const SUPPORTED_VERSIONS = ['v1'];
export const DEFAULT_VERSION = 'v1';

interface VersionedResponse {
  version: string;
  data?: any;
  error?: any;
  meta?: {
    timestamp: string;
    requestId: string;
    deprecationWarning?: string;
  };
}

/**
 * Extract API version from request
 */
export function extractApiVersion(request: NextRequest): string {
  // 1. Check URL path: /api/v1/...
  const pathMatch = request.nextUrl.pathname.match(/^\/api\/(v\d+)\//);
  if (pathMatch) {
    return pathMatch[1];
  }

  // 2. Check Accept header: Accept: application/vnd.xpress.v1+json
  const acceptHeader = request.headers.get('accept');
  if (acceptHeader) {
    const versionMatch = acceptHeader.match(/application\/vnd\.xpress\.(v\d+)\+json/);
    if (versionMatch) {
      return versionMatch[1];
    }
  }

  // 3. Check custom header: X-API-Version
  const versionHeader = request.headers.get('x-api-version');
  if (versionHeader && SUPPORTED_VERSIONS.includes(versionHeader)) {
    return versionHeader;
  }

  // 4. Default version
  return DEFAULT_VERSION;
}

/**
 * Validate API version
 */
export function validateApiVersion(version: string): boolean {
  return SUPPORTED_VERSIONS.includes(version);
}

/**
 * Create versioned API response
 */
export function createVersionedResponse(
  data: any,
  version: string,
  requestId?: string,
  deprecationWarning?: string
): NextResponse {
  const response: VersionedResponse = {
    version,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      requestId: requestId || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...(deprecationWarning && { deprecationWarning })
    }
  };

  const nextResponse = NextResponse.json(response);
  
  // Add versioning headers
  nextResponse.headers.set('X-API-Version', version);
  nextResponse.headers.set('X-Supported-Versions', SUPPORTED_VERSIONS.join(', '));
  
  if (deprecationWarning) {
    nextResponse.headers.set('X-Deprecation-Warning', deprecationWarning);
  }

  return nextResponse;
}

/**
 * Create versioned error response
 */
export function createVersionedErrorResponse(
  error: any,
  status: number,
  version: string,
  requestId?: string
): NextResponse {
  const response: VersionedResponse = {
    version,
    error: {
      code: error.code || 'UNKNOWN_ERROR',
      message: error.message || 'An error occurred',
      details: error.details || null
    },
    meta: {
      timestamp: new Date().toISOString(),
      requestId: requestId || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    }
  };

  const nextResponse = NextResponse.json(response, { status });
  
  nextResponse.headers.set('X-API-Version', version);
  nextResponse.headers.set('X-Supported-Versions', SUPPORTED_VERSIONS.join(', '));

  return nextResponse;
}

/**
 * API versioning middleware
 */
export function withApiVersioning(
  handler: (request: NextRequest, version: string) => Promise<NextResponse>
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const version = extractApiVersion(request);
    
    // Validate version
    if (!validateApiVersion(version)) {
      return createVersionedErrorResponse(
        {
          code: 'UNSUPPORTED_API_VERSION',
          message: `API version '${version}' is not supported`,
          details: {
            supportedVersions: SUPPORTED_VERSIONS,
            requestedVersion: version
          }
        },
        400,
        DEFAULT_VERSION
      );
    }

    try {
      return await handler(request, version);
    } catch (error) {
      return createVersionedErrorResponse(
        {
          code: 'INTERNAL_ERROR',
          message: 'Internal server error',
          details: process.env.NODE_ENV === 'development' ? error : null
        },
        500,
        version
      );
    }
  };
}

/**
 * Redirect legacy API routes to versioned endpoints
 */
export function redirectToVersionedApi(request: NextRequest): NextResponse | null {
  const path = request.nextUrl.pathname;
  
  // Check if it's a legacy API route (no version)
  if (path.startsWith('/api/') && !path.startsWith('/api/v')) {
    // Skip certain paths that shouldn't be versioned
    const skipPaths = ['/api/health', '/api/status', '/api/auth'];
    if (skipPaths.some(skipPath => path.startsWith(skipPath))) {
      return null;
    }

    // Redirect to versioned endpoint
    const versionedPath = path.replace('/api/', `/api/${DEFAULT_VERSION}/`);
    const versionedUrl = new URL(versionedPath, request.url);
    versionedUrl.search = request.nextUrl.search;

    return NextResponse.redirect(versionedUrl, 301);
  }

  return null;
}

/**
 * API version deprecation handler
 */
export function handleVersionDeprecation(version: string): string | null {
  const deprecationMap: Record<string, string> = {
    // Add deprecation warnings for older versions
    // 'v1': 'v1 will be deprecated on 2024-01-01. Please migrate to v2.'
  };

  return deprecationMap[version] || null;
}

/**
 * Version-aware API route wrapper
 */
export function versionedApiRoute(
  handlers: Record<string, (request: NextRequest) => Promise<NextResponse>>
) {
  return withApiVersioning(async (request: NextRequest, version: string) => {
    const handler = handlers[version];
    
    if (!handler) {
      return createVersionedErrorResponse(
        {
          code: 'VERSION_NOT_IMPLEMENTED',
          message: `Version '${version}' is not implemented for this endpoint`,
          details: {
            availableVersions: Object.keys(handlers),
            requestedVersion: version
          }
        },
        501,
        version
      );
    }

    const deprecationWarning = handleVersionDeprecation(version);
    const response = await handler(request);
    
    // Add deprecation warning to response if needed
    if (deprecationWarning) {
      const responseData = await response.json();
      return createVersionedResponse(
        responseData.data || responseData,
        version,
        undefined,
        deprecationWarning
      );
    }

    return response;
  });
}

export default {
  extractApiVersion,
  validateApiVersion,
  createVersionedResponse,
  createVersionedErrorResponse,
  withApiVersioning,
  redirectToVersionedApi,
  versionedApiRoute,
  API_VERSION,
  SUPPORTED_VERSIONS
};