// API Error Handling Utilities for Xpress Ops Tower
// Comprehensive error management with plain English messages

import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

// Error codes and categories
export enum ErrorCode {
  // Authentication & Authorization
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  INVALID_TOKEN = 'INVALID_TOKEN',
  SESSION_EXPIRED = 'SESSION_EXPIRED',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
  REGIONAL_ACCESS_DENIED = 'REGIONAL_ACCESS_DENIED',

  // Validation Errors
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',
  INVALID_FORMAT = 'INVALID_FORMAT',
  INVALID_VALUE = 'INVALID_VALUE',
  DUPLICATE_VALUE = 'DUPLICATE_VALUE',

  // Resource Errors
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',
  RESOURCE_CONFLICT = 'RESOURCE_CONFLICT',
  RESOURCE_LOCKED = 'RESOURCE_LOCKED',
  RESOURCE_LIMIT_EXCEEDED = 'RESOURCE_LIMIT_EXCEEDED',

  // Driver Management Errors
  DRIVER_NOT_FOUND = 'DRIVER_NOT_FOUND',
  DRIVER_NOT_AVAILABLE = 'DRIVER_NOT_AVAILABLE',
  DRIVER_ALREADY_ASSIGNED = 'DRIVER_ALREADY_ASSIGNED',
  DRIVER_IN_EMERGENCY = 'DRIVER_IN_EMERGENCY',
  INVALID_DRIVER_STATUS = 'INVALID_DRIVER_STATUS',
  DRIVER_VERIFICATION_REQUIRED = 'DRIVER_VERIFICATION_REQUIRED',

  // Booking Errors
  BOOKING_NOT_FOUND = 'BOOKING_NOT_FOUND',
  BOOKING_CANNOT_BE_CANCELLED = 'BOOKING_CANNOT_BE_CANCELLED',
  BOOKING_ALREADY_COMPLETED = 'BOOKING_ALREADY_COMPLETED',
  INVALID_PICKUP_LOCATION = 'INVALID_PICKUP_LOCATION',
  INVALID_DROPOFF_LOCATION = 'INVALID_DROPOFF_LOCATION',
  NO_DRIVERS_AVAILABLE = 'NO_DRIVERS_AVAILABLE',
  SERVICE_NOT_AVAILABLE = 'SERVICE_NOT_AVAILABLE',
  BOOKING_TIMEOUT = 'BOOKING_TIMEOUT',

  // Location & Geography Errors
  INVALID_COORDINATES = 'INVALID_COORDINATES',
  LOCATION_OUT_OF_SERVICE_AREA = 'LOCATION_OUT_OF_SERVICE_AREA',
  GPS_ACCURACY_TOO_LOW = 'GPS_ACCURACY_TOO_LOW',
  LOCATION_UPDATE_FAILED = 'LOCATION_UPDATE_FAILED',

  // Emergency & Safety Errors
  INCIDENT_NOT_FOUND = 'INCIDENT_NOT_FOUND',
  INCIDENT_ALREADY_RESOLVED = 'INCIDENT_ALREADY_RESOLVED',
  EMERGENCY_ESCALATION_FAILED = 'EMERGENCY_ESCALATION_FAILED',
  SOS_RESPONSE_TIMEOUT = 'SOS_RESPONSE_TIMEOUT',

  // System Errors
  DATABASE_ERROR = 'DATABASE_ERROR',
  REDIS_ERROR = 'REDIS_ERROR',
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',

  // Regional & Compliance Errors
  REGION_NOT_FOUND = 'REGION_NOT_FOUND',
  REGION_SUSPENDED = 'REGION_SUSPENDED',
  LGU_RESTRICTION_VIOLATION = 'LGU_RESTRICTION_VIOLATION',
  OPERATING_HOURS_VIOLATION = 'OPERATING_HOURS_VIOLATION',
}

// Error severity levels
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

// API Error class
export class ApiError extends Error {
  code: ErrorCode;
  statusCode: number;
  severity: ErrorSeverity;
  userMessage: string;
  debugInfo?: Record<string, any>;
  field?: string;
  value?: any;

  constructor(
    code: ErrorCode,
    message: string,
    userMessage: string,
    statusCode: number = 500,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    debugInfo?: Record<string, any>,
    field?: string,
    value?: any
  ) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.statusCode = statusCode;
    this.severity = severity;
    this.userMessage = userMessage;
    this.debugInfo = debugInfo;
    this.field = field;
    this.value = value;
  }
}

// Predefined error messages with plain English explanations
const ERROR_MESSAGES: Record<ErrorCode, {
  message: string;
  userMessage: string;
  statusCode: number;
  severity: ErrorSeverity;
}> = {
  // Authentication & Authorization
  [ErrorCode.UNAUTHORIZED]: {
    message: 'Authentication required',
    userMessage: 'Please log in to access this feature.',
    statusCode: 401,
    severity: ErrorSeverity.MEDIUM
  },
  [ErrorCode.FORBIDDEN]: {
    message: 'Access forbidden',
    userMessage: 'You don\'t have permission to perform this action.',
    statusCode: 403,
    severity: ErrorSeverity.MEDIUM
  },
  [ErrorCode.INVALID_TOKEN]: {
    message: 'Invalid authentication token',
    userMessage: 'Your session has expired. Please log in again.',
    statusCode: 401,
    severity: ErrorSeverity.MEDIUM
  },
  [ErrorCode.SESSION_EXPIRED]: {
    message: 'Session has expired',
    userMessage: 'Your session has expired. Please log in again.',
    statusCode: 401,
    severity: ErrorSeverity.LOW
  },
  [ErrorCode.INSUFFICIENT_PERMISSIONS]: {
    message: 'Insufficient permissions',
    userMessage: 'You don\'t have the required permissions for this operation.',
    statusCode: 403,
    severity: ErrorSeverity.MEDIUM
  },
  [ErrorCode.REGIONAL_ACCESS_DENIED]: {
    message: 'Regional access denied',
    userMessage: 'You can only access data from your assigned region.',
    statusCode: 403,
    severity: ErrorSeverity.MEDIUM
  },

  // Validation Errors
  [ErrorCode.VALIDATION_ERROR]: {
    message: 'Validation failed',
    userMessage: 'Some information is missing or incorrect. Please check and try again.',
    statusCode: 400,
    severity: ErrorSeverity.LOW
  },
  [ErrorCode.MISSING_REQUIRED_FIELD]: {
    message: 'Required field is missing',
    userMessage: 'Please fill in all required fields.',
    statusCode: 400,
    severity: ErrorSeverity.LOW
  },
  [ErrorCode.INVALID_FORMAT]: {
    message: 'Invalid format',
    userMessage: 'The format of the provided information is not valid.',
    statusCode: 400,
    severity: ErrorSeverity.LOW
  },
  [ErrorCode.INVALID_VALUE]: {
    message: 'Invalid value',
    userMessage: 'One or more values are not valid. Please check and try again.',
    statusCode: 400,
    severity: ErrorSeverity.LOW
  },
  [ErrorCode.DUPLICATE_VALUE]: {
    message: 'Duplicate value',
    userMessage: 'This information already exists in the system.',
    statusCode: 409,
    severity: ErrorSeverity.LOW
  },

  // Resource Errors
  [ErrorCode.RESOURCE_NOT_FOUND]: {
    message: 'Resource not found',
    userMessage: 'The requested information could not be found.',
    statusCode: 404,
    severity: ErrorSeverity.LOW
  },
  [ErrorCode.RESOURCE_CONFLICT]: {
    message: 'Resource conflict',
    userMessage: 'This operation conflicts with existing data.',
    statusCode: 409,
    severity: ErrorSeverity.MEDIUM
  },
  [ErrorCode.RESOURCE_LOCKED]: {
    message: 'Resource is locked',
    userMessage: 'This information is currently being processed by someone else.',
    statusCode: 423,
    severity: ErrorSeverity.MEDIUM
  },
  [ErrorCode.RESOURCE_LIMIT_EXCEEDED]: {
    message: 'Resource limit exceeded',
    userMessage: 'You\'ve reached the maximum limit for this operation.',
    statusCode: 429,
    severity: ErrorSeverity.MEDIUM
  },

  // Driver Management Errors
  [ErrorCode.DRIVER_NOT_FOUND]: {
    message: 'Driver not found',
    userMessage: 'The driver you\'re looking for doesn\'t exist or has been removed.',
    statusCode: 404,
    severity: ErrorSeverity.LOW
  },
  [ErrorCode.DRIVER_NOT_AVAILABLE]: {
    message: 'Driver not available',
    userMessage: 'This driver is currently not available for new bookings.',
    statusCode: 400,
    severity: ErrorSeverity.LOW
  },
  [ErrorCode.DRIVER_ALREADY_ASSIGNED]: {
    message: 'Driver already assigned',
    userMessage: 'This driver is already handling another booking.',
    statusCode: 409,
    severity: ErrorSeverity.LOW
  },
  [ErrorCode.DRIVER_IN_EMERGENCY]: {
    message: 'Driver in emergency situation',
    userMessage: 'This driver is currently in an emergency situation and cannot accept bookings.',
    statusCode: 423,
    severity: ErrorSeverity.HIGH
  },
  [ErrorCode.INVALID_DRIVER_STATUS]: {
    message: 'Invalid driver status',
    userMessage: 'The driver status you\'re trying to set is not valid.',
    statusCode: 400,
    severity: ErrorSeverity.LOW
  },
  [ErrorCode.DRIVER_VERIFICATION_REQUIRED]: {
    message: 'Driver verification required',
    userMessage: 'This driver needs to complete verification before being activated.',
    statusCode: 400,
    severity: ErrorSeverity.MEDIUM
  },

  // Booking Errors
  [ErrorCode.BOOKING_NOT_FOUND]: {
    message: 'Booking not found',
    userMessage: 'The booking you\'re looking for doesn\'t exist.',
    statusCode: 404,
    severity: ErrorSeverity.LOW
  },
  [ErrorCode.BOOKING_CANNOT_BE_CANCELLED]: {
    message: 'Booking cannot be cancelled',
    userMessage: 'This booking is too far along to be cancelled.',
    statusCode: 400,
    severity: ErrorSeverity.LOW
  },
  [ErrorCode.BOOKING_ALREADY_COMPLETED]: {
    message: 'Booking already completed',
    userMessage: 'This booking has already been completed.',
    statusCode: 400,
    severity: ErrorSeverity.LOW
  },
  [ErrorCode.INVALID_PICKUP_LOCATION]: {
    message: 'Invalid pickup location',
    userMessage: 'The pickup location is not valid or not within our service area.',
    statusCode: 400,
    severity: ErrorSeverity.LOW
  },
  [ErrorCode.INVALID_DROPOFF_LOCATION]: {
    message: 'Invalid dropoff location',
    userMessage: 'The dropoff location is not valid or not within our service area.',
    statusCode: 400,
    severity: ErrorSeverity.LOW
  },
  [ErrorCode.NO_DRIVERS_AVAILABLE]: {
    message: 'No drivers available',
    userMessage: 'No drivers are currently available in your area. Please try again later.',
    statusCode: 503,
    severity: ErrorSeverity.MEDIUM
  },
  [ErrorCode.SERVICE_NOT_AVAILABLE]: {
    message: 'Service not available',
    userMessage: 'This service is not available in your area at the moment.',
    statusCode: 503,
    severity: ErrorSeverity.MEDIUM
  },
  [ErrorCode.BOOKING_TIMEOUT]: {
    message: 'Booking request timeout',
    userMessage: 'Your booking request timed out. Please try again.',
    statusCode: 408,
    severity: ErrorSeverity.LOW
  },

  // Location & Geography Errors
  [ErrorCode.INVALID_COORDINATES]: {
    message: 'Invalid coordinates',
    userMessage: 'The location coordinates are not valid.',
    statusCode: 400,
    severity: ErrorSeverity.LOW
  },
  [ErrorCode.LOCATION_OUT_OF_SERVICE_AREA]: {
    message: 'Location outside service area',
    userMessage: 'This location is outside our current service area.',
    statusCode: 400,
    severity: ErrorSeverity.LOW
  },
  [ErrorCode.GPS_ACCURACY_TOO_LOW]: {
    message: 'GPS accuracy too low',
    userMessage: 'Your GPS signal is too weak. Please move to an area with better signal.',
    statusCode: 400,
    severity: ErrorSeverity.LOW
  },
  [ErrorCode.LOCATION_UPDATE_FAILED]: {
    message: 'Location update failed',
    userMessage: 'Failed to update your location. Please check your connection and try again.',
    statusCode: 500,
    severity: ErrorSeverity.MEDIUM
  },

  // Emergency & Safety Errors
  [ErrorCode.INCIDENT_NOT_FOUND]: {
    message: 'Incident not found',
    userMessage: 'The emergency incident you\'re looking for doesn\'t exist.',
    statusCode: 404,
    severity: ErrorSeverity.MEDIUM
  },
  [ErrorCode.INCIDENT_ALREADY_RESOLVED]: {
    message: 'Incident already resolved',
    userMessage: 'This emergency incident has already been resolved.',
    statusCode: 400,
    severity: ErrorSeverity.LOW
  },
  [ErrorCode.EMERGENCY_ESCALATION_FAILED]: {
    message: 'Emergency escalation failed',
    userMessage: 'Failed to escalate the emergency. Please try again or contact support.',
    statusCode: 500,
    severity: ErrorSeverity.CRITICAL
  },
  [ErrorCode.SOS_RESPONSE_TIMEOUT]: {
    message: 'SOS response timeout',
    userMessage: 'Emergency response is taking longer than expected. Help is on the way.',
    statusCode: 408,
    severity: ErrorSeverity.CRITICAL
  },

  // System Errors
  [ErrorCode.DATABASE_ERROR]: {
    message: 'Database error',
    userMessage: 'We\'re experiencing technical difficulties. Please try again in a moment.',
    statusCode: 500,
    severity: ErrorSeverity.HIGH
  },
  [ErrorCode.REDIS_ERROR]: {
    message: 'Cache system error',
    userMessage: 'We\'re experiencing technical difficulties. Please try again in a moment.',
    statusCode: 500,
    severity: ErrorSeverity.HIGH
  },
  [ErrorCode.EXTERNAL_SERVICE_ERROR]: {
    message: 'External service error',
    userMessage: 'An external service is temporarily unavailable. Please try again later.',
    statusCode: 503,
    severity: ErrorSeverity.MEDIUM
  },
  [ErrorCode.RATE_LIMIT_EXCEEDED]: {
    message: 'Rate limit exceeded',
    userMessage: 'You\'re making requests too frequently. Please wait a moment and try again.',
    statusCode: 429,
    severity: ErrorSeverity.LOW
  },
  [ErrorCode.SERVICE_UNAVAILABLE]: {
    message: 'Service temporarily unavailable',
    userMessage: 'The service is temporarily unavailable. Please try again later.',
    statusCode: 503,
    severity: ErrorSeverity.MEDIUM
  },
  [ErrorCode.INTERNAL_SERVER_ERROR]: {
    message: 'Internal server error',
    userMessage: 'Something went wrong on our end. Our team has been notified.',
    statusCode: 500,
    severity: ErrorSeverity.HIGH
  },

  // Regional & Compliance Errors
  [ErrorCode.REGION_NOT_FOUND]: {
    message: 'Region not found',
    userMessage: 'The specified region doesn\'t exist.',
    statusCode: 404,
    severity: ErrorSeverity.LOW
  },
  [ErrorCode.REGION_SUSPENDED]: {
    message: 'Region operations suspended',
    userMessage: 'Operations in this region are temporarily suspended.',
    statusCode: 503,
    severity: ErrorSeverity.HIGH
  },
  [ErrorCode.LGU_RESTRICTION_VIOLATION]: {
    message: 'LGU restriction violation',
    userMessage: 'This operation is restricted by local government regulations.',
    statusCode: 403,
    severity: ErrorSeverity.MEDIUM
  },
  [ErrorCode.OPERATING_HOURS_VIOLATION]: {
    message: 'Operating hours violation',
    userMessage: 'This service is not available during current hours.',
    statusCode: 400,
    severity: ErrorSeverity.LOW
  },
};

// Error factory functions
export class ErrorFactory {
  static create(
    code: ErrorCode,
    additionalInfo?: {
      field?: string;
      value?: any;
      debugInfo?: Record<string, any>;
    }
  ): ApiError {
    const errorConfig = ERROR_MESSAGES[code];
    return new ApiError(
      code,
      errorConfig.message,
      errorConfig.userMessage,
      errorConfig.statusCode,
      errorConfig.severity,
      additionalInfo?.debugInfo,
      additionalInfo?.field,
      additionalInfo?.value
    );
  }

  static validation(
    field: string,
    value: any,
    reason: string = 'Invalid value'
  ): ApiError {
    return new ApiError(
      ErrorCode.VALIDATION_ERROR,
      `Validation failed for field: ${field}`,
      `${reason} for ${field}.`,
      400,
      ErrorSeverity.LOW,
      { field, value, reason },
      field,
      value
    );
  }

  static notFound(resource: string, identifier?: string): ApiError {
    return new ApiError(
      ErrorCode.RESOURCE_NOT_FOUND,
      `${resource} not found`,
      `The ${resource.toLowerCase()} you're looking for doesn't exist.`,
      404,
      ErrorSeverity.LOW,
      { resource, identifier }
    );
  }

  static unauthorized(reason: string = 'Authentication required'): ApiError {
    return new ApiError(
      ErrorCode.UNAUTHORIZED,
      reason,
      'Please log in to access this feature.',
      401,
      ErrorSeverity.MEDIUM,
      { reason }
    );
  }

  static forbidden(reason: string = 'Access denied'): ApiError {
    return new ApiError(
      ErrorCode.FORBIDDEN,
      reason,
      'You don\'t have permission to perform this action.',
      403,
      ErrorSeverity.MEDIUM,
      { reason }
    );
  }

  static driverNotAvailable(driverId: string, currentStatus: string): ApiError {
    return new ApiError(
      ErrorCode.DRIVER_NOT_AVAILABLE,
      `Driver ${driverId} is not available (status: ${currentStatus})`,
      'This driver is currently not available for new bookings.',
      400,
      ErrorSeverity.LOW,
      { driverId, currentStatus }
    );
  }

  static noDriversAvailable(regionId: string): ApiError {
    return new ApiError(
      ErrorCode.NO_DRIVERS_AVAILABLE,
      `No drivers available in region ${regionId}`,
      'No drivers are currently available in your area. Please try again later.',
      503,
      ErrorSeverity.MEDIUM,
      { regionId }
    );
  }

  static locationOutOfServiceArea(latitude: number, longitude: number): ApiError {
    return new ApiError(
      ErrorCode.LOCATION_OUT_OF_SERVICE_AREA,
      `Location (${latitude}, ${longitude}) is outside service area`,
      'This location is outside our current service area.',
      400,
      ErrorSeverity.LOW,
      { latitude, longitude }
    );
  }

  static emergencyEscalationFailed(incidentId: string, reason: string): ApiError {
    return new ApiError(
      ErrorCode.EMERGENCY_ESCALATION_FAILED,
      `Failed to escalate incident ${incidentId}: ${reason}`,
      'Failed to escalate the emergency. Please try again or contact support.',
      500,
      ErrorSeverity.CRITICAL,
      { incidentId, reason }
    );
  }

  static databaseError(operation: string, error: Error): ApiError {
    return new ApiError(
      ErrorCode.DATABASE_ERROR,
      `Database error during ${operation}: ${error.message}`,
      'We\'re experiencing technical difficulties. Please try again in a moment.',
      500,
      ErrorSeverity.HIGH,
      { operation, originalError: error.message }
    );
  }

  static fromZodError(zodError: ZodError): ApiError {
    const firstError = zodError.errors[0];
    const field = firstError.path.join('.');
    const message = firstError.message;
    
    return new ApiError(
      ErrorCode.VALIDATION_ERROR,
      `Validation error: ${message}`,
      `${message} for ${field}.`,
      400,
      ErrorSeverity.LOW,
      { 
        validationErrors: zodError.errors,
        totalErrors: zodError.errors.length
      },
      field,
      firstError.received
    );
  }
}

// Error response formatter
export function formatErrorResponse(error: Error | ApiError) {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  const timestamp = new Date().toISOString();

  if (error instanceof ApiError) {
    // Log error for monitoring (only log high/critical severity errors)
    if (error.severity === ErrorSeverity.HIGH || error.severity === ErrorSeverity.CRITICAL) {
      console.error('High severity error:', {
        requestId,
        code: error.code,
        message: error.message,
        userMessage: error.userMessage,
        severity: error.severity,
        debugInfo: error.debugInfo,
        stack: error.stack
      });
    }

    return NextResponse.json(
      {
        success: false,
        error: {
          code: error.code,
          message: error.userMessage, // User-friendly message
          field: error.field,
          value: error.value
        },
        timestamp,
        requestId,
        ...(process.env.NODE_ENV === 'development' && {
          debug: {
            technicalMessage: error.message,
            debugInfo: error.debugInfo,
            stack: error.stack
          }
        })
      },
      { 
        status: error.statusCode,
        headers: {
          'X-Error-Code': error.code,
          'X-Request-ID': requestId,
          'Content-Type': 'application/json'
        }
      }
    );
  }

  // Handle unexpected errors
  console.error('Unexpected error:', {
    requestId,
    message: error.message,
    stack: error.stack
  });

  return NextResponse.json(
    {
      success: false,
      error: {
        code: ErrorCode.INTERNAL_SERVER_ERROR,
        message: 'Something went wrong on our end. Our team has been notified.'
      },
      timestamp,
      requestId,
      ...(process.env.NODE_ENV === 'development' && {
        debug: {
          technicalMessage: error.message,
          stack: error.stack
        }
      })
    },
    { 
      status: 500,
      headers: {
        'X-Error-Code': ErrorCode.INTERNAL_SERVER_ERROR,
        'X-Request-ID': requestId,
        'Content-Type': 'application/json'
      }
    }
  );
}

// Global error handler wrapper
export function handleApiError<T extends any[], R>(
  fn: (...args: T) => Promise<R>
) {
  return async (...args: T): Promise<R | NextResponse> => {
    try {
      return await fn(...args);
    } catch (error) {
      return formatErrorResponse(error as Error);
    }
  };
}

// Success response formatter
export function formatSuccessResponse<T>(
  data: T,
  message?: string,
  meta?: Record<string, any>
) {
  return NextResponse.json({
    success: true,
    data,
    message,
    timestamp: new Date().toISOString(),
    requestId: `req_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    ...meta
  });
}

// Validation helper for request bodies
export function validateRequest<T>(
  schema: { parse: (data: unknown) => T },
  data: unknown
): T {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof ZodError) {
      throw ErrorFactory.fromZodError(error);
    }
    throw ErrorFactory.create(ErrorCode.VALIDATION_ERROR, {
      debugInfo: { originalError: (error as Error).message }
    });
  }
}