// API Validation Schemas for Xpress Ops Tower
// Comprehensive Zod schemas for request/response validation

import { z } from 'zod';
import { 
  ServiceType, 
  DriverStatus, 
  BookingStatus, 
  IncidentPriority, 
  IncidentStatus
} from '../types/fleet';

// =====================================================
// COMMON VALIDATION SCHEMAS
// =====================================================

// Pagination schema
export const PaginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc')
});

// Date range schema
export const DateRangeSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional()
}).refine(data => {
  if (data.startDate && data.endDate) {
    return new Date(data.startDate) <= new Date(data.endDate);
  }
  return true;
}, "Start date must be before end date");

// Geographic coordinates schema
export const CoordinatesSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracy: z.number().min(0).optional(),
  altitude: z.number().optional(),
  bearing: z.number().min(0).max(360).optional(),
  speed: z.number().min(0).optional()
});

// Phone number schema (Philippine format)
export const PhoneNumberSchema = z.string()
  .regex(/^(\+63|0)[0-9]{10}$/, "Invalid Philippine phone number format");

// Email schema
export const EmailSchema = z.string().email("Invalid email format");

// UUID schema
export const UuidSchema = z.string().uuid("Invalid UUID format");

// =====================================================
// DRIVER MANAGEMENT SCHEMAS
// =====================================================

// Driver creation schema
export const CreateDriverSchema = z.object({
  driverCode: z.string().min(3).max(20).regex(/^[A-Z0-9-]+$/, "Driver code must contain only uppercase letters, numbers, and hyphens"),
  firstName: z.string().min(2).max(50).trim(),
  lastName: z.string().min(2).max(50).trim(),
  middleName: z.string().max(50).trim().optional(),
  email: EmailSchema.optional(),
  phone: PhoneNumberSchema,
  dateOfBirth: z.string().date().optional(),
  address: z.object({
    street: z.string().min(5).max(200).trim(),
    barangay: z.string().min(2).max(100).trim(),
    city: z.string().min(2).max(100).trim(),
    province: z.string().min(2).max(100).trim(),
    postalCode: z.string().max(10).optional(),
    coordinates: CoordinatesSchema.optional()
  }),
  regionId: UuidSchema,
  services: z.array(z.nativeEnum(ServiceType)).min(1, "At least one service must be selected"),
  primaryService: z.nativeEnum(ServiceType),
  vehicleInfo: z.object({
    make: z.string().max(50).optional(),
    model: z.string().max(50).optional(),
    year: z.number().int().min(1990).max(new Date().getFullYear() + 1).optional(),
    plateNumber: z.string().max(20).optional(),
    color: z.string().max(30).optional(),
    type: z.enum(['motorcycle', 'tricycle', 'car', 'suv', 'van']),
    registrationNumber: z.string().max(50).optional(),
    insuranceDetails: z.object({
      provider: z.string().max(100),
      policyNumber: z.string().max(50),
      expiryDate: z.string().date()
    }).optional()
  }).optional(),
  licenseInfo: z.object({
    licenseNumber: z.string().max(50).optional(),
    licenseType: z.string().max(30).optional(),
    expiryDate: z.string().date().optional(),
    restrictions: z.array(z.string().max(100)).optional()
  }).optional()
}).refine(data => data.services.includes(data.primaryService), {
  message: "Primary service must be included in the services array",
  path: ["primaryService"]
});

// Driver update schema
export const UpdateDriverSchema = CreateDriverSchema.partial().omit({
  driverCode: true // Driver code cannot be changed
});

// Driver status update schema
export const UpdateDriverStatusSchema = z.object({
  status: z.nativeEnum(DriverStatus),
  reason: z.string().max(500).optional()
});

// Driver query/filter schema
export const DriverQuerySchema = PaginationSchema.extend({
  regionId: UuidSchema.optional(),
  status: z.array(z.nativeEnum(DriverStatus)).optional(),
  services: z.array(z.nativeEnum(ServiceType)).optional(),
  isVerified: z.coerce.boolean().optional(),
  search: z.string().max(100).optional(),
  minRating: z.coerce.number().min(1).max(5).optional(),
  maxRating: z.coerce.number().min(1).max(5).optional(),
  verificationLevel: z.coerce.number().int().min(1).max(5).optional(),
  ...DateRangeSchema.shape
});

// =====================================================
// BOOKING MANAGEMENT SCHEMAS
// =====================================================

// Booking creation schema
export const CreateBookingSchema = z.object({
  serviceType: z.nativeEnum(ServiceType),
  customerId: UuidSchema,
  customerInfo: z.object({
    name: z.string().min(2).max(100).trim(),
    phone: PhoneNumberSchema,
    email: EmailSchema.optional(),
    profilePhoto: z.string().url().optional(),
    rating: z.number().min(1).max(5).optional()
  }),
  pickupLocation: CoordinatesSchema,
  pickupAddress: z.string().min(10).max(500).trim(),
  dropoffLocation: CoordinatesSchema.optional(),
  dropoffAddress: z.string().max(500).trim().optional(),
  regionId: UuidSchema,
  serviceDetails: z.object({
    // Ride-specific
    passengerCount: z.number().int().min(1).max(8).optional(),
    vehiclePreference: z.string().max(50).optional(),
    
    // Delivery-specific
    packageType: z.string().max(100).optional(),
    packageWeight: z.number().min(0).max(50).optional(), // in kg
    packageDimensions: z.object({
      length: z.number().min(0).max(200), // in cm
      width: z.number().min(0).max(200),
      height: z.number().min(0).max(200)
    }).optional(),
    recipientName: z.string().max(100).optional(),
    recipientPhone: PhoneNumberSchema.optional(),
    deliveryInstructions: z.string().max(500).optional(),
    
    // Food delivery specific
    restaurantName: z.string().max(100).optional(),
    estimatedPrepTime: z.number().int().min(0).max(120).optional(), // in minutes
    orderItems: z.array(z.object({
      name: z.string().max(100),
      quantity: z.number().int().min(1),
      price: z.number().min(0)
    })).optional(),
    
    // Special requirements
    requiresInsulation: z.boolean().optional(),
    fragile: z.boolean().optional(),
    priority: z.enum(['normal', 'urgent', 'scheduled']).default('normal')
  }).optional(),
  specialInstructions: z.string().max(1000).optional(),
  paymentMethod: z.string().max(50).optional(),
  scheduledPickupTime: z.string().datetime().optional()
}).refine(data => {
  // If it's a delivery, dropoff location is required
  if (data.serviceType.includes('delivery') && !data.dropoffLocation) {
    return false;
  }
  return true;
}, {
  message: "Dropoff location is required for delivery services",
  path: ["dropoffLocation"]
});

// Booking update schema
export const UpdateBookingSchema = z.object({
  status: z.nativeEnum(BookingStatus).optional(),
  driverId: UuidSchema.optional(),
  estimatedPickupTime: z.string().datetime().optional(),
  estimatedCompletionTime: z.string().datetime().optional(),
  actualPickupTime: z.string().datetime().optional(),
  completedAt: z.string().datetime().optional(),
  cancelledAt: z.string().datetime().optional(),
  customerRating: z.number().int().min(1).max(5).optional(),
  driverRating: z.number().int().min(1).max(5).optional(),
  specialInstructions: z.string().max(1000).optional()
});

// Booking query schema
export const BookingQuerySchema = PaginationSchema.extend({
  serviceType: z.array(z.nativeEnum(ServiceType)).optional(),
  status: z.array(z.nativeEnum(BookingStatus)).optional(),
  regionId: UuidSchema.optional(),
  driverId: UuidSchema.optional(),
  customerId: UuidSchema.optional(),
  search: z.string().max(100).optional(),
  ...DateRangeSchema.shape
});

// =====================================================
// LOCATION TRACKING SCHEMAS
// =====================================================

// Location update schema
export const LocationUpdateSchema = z.object({
  driverId: UuidSchema,
  location: CoordinatesSchema,
  address: z.string().max(500).optional(),
  regionId: UuidSchema.optional(),
  driverStatus: z.nativeEnum(DriverStatus),
  isAvailable: z.boolean(),
  recordedAt: z.string().datetime().optional()
});

// Bulk location updates schema
export const BulkLocationUpdateSchema = z.object({
  updates: z.array(LocationUpdateSchema).min(1).max(100)
});

// Location query schema
export const LocationQuerySchema = z.object({
  regionId: UuidSchema.optional(),
  status: z.array(z.nativeEnum(DriverStatus)).optional(),
  isAvailable: z.boolean().optional(),
  lastUpdatedSince: z.string().datetime().optional(),
  bounds: z.object({
    northEast: z.object({
      lat: z.number().min(-90).max(90),
      lng: z.number().min(-180).max(180)
    }),
    southWest: z.object({
      lat: z.number().min(-90).max(90),
      lng: z.number().min(-180).max(180)
    })
  }).optional(),
  radius: z.object({
    center: CoordinatesSchema,
    radiusKm: z.number().min(0.1).max(100)
  }).optional()
});

// =====================================================
// INCIDENT/EMERGENCY SCHEMAS
// =====================================================

// Incident creation schema
export const CreateIncidentSchema = z.object({
  priority: z.nativeEnum(IncidentPriority),
  incidentType: z.string().min(3).max(50),
  reporterType: z.enum(['driver', 'customer', 'system', 'operator']),
  reporterId: UuidSchema,
  reporterContact: z.string().max(100).optional(),
  driverId: UuidSchema.optional(),
  bookingId: UuidSchema.optional(),
  location: CoordinatesSchema.optional(),
  address: z.string().max(500).optional(),
  regionId: UuidSchema.optional(),
  title: z.string().min(5).max(200).trim(),
  description: z.string().min(10).max(2000).trim(),
  attachments: z.array(z.object({
    type: z.enum(['photo', 'video', 'audio', 'document']),
    filename: z.string().max(255),
    url: z.string().url(),
    size: z.number().int().min(1),
    mimeType: z.string().max(100)
  })).optional()
});

// Incident update schema
export const UpdateIncidentSchema = z.object({
  status: z.nativeEnum(IncidentStatus).optional(),
  acknowledgedBy: UuidSchema.optional(),
  escalatedTo: z.string().max(100).optional(),
  externalReference: z.string().max(100).optional(),
  resolvedBy: UuidSchema.optional(),
  resolutionNotes: z.string().max(2000).optional(),
  followUpRequired: z.boolean().optional(),
  followUpDate: z.string().date().optional(),
  followUpAssignedTo: UuidSchema.optional()
});

// Incident query schema
export const IncidentQuerySchema = PaginationSchema.extend({
  priority: z.array(z.nativeEnum(IncidentPriority)).optional(),
  status: z.array(z.nativeEnum(IncidentStatus)).optional(),
  regionId: UuidSchema.optional(),
  driverId: UuidSchema.optional(),
  bookingId: UuidSchema.optional(),
  incidentType: z.string().max(50).optional(),
  reporterType: z.enum(['driver', 'customer', 'system', 'operator']).optional(),
  slaViolation: z.coerce.boolean().optional(),
  search: z.string().max(100).optional(),
  ...DateRangeSchema.shape
});

// =====================================================
// ANALYTICS SCHEMAS
// =====================================================

// Analytics query schema
export const AnalyticsQuerySchema = z.object({
  regionId: UuidSchema.optional(),
  timeRange: z.enum(['1h', '6h', '24h', '7d', '30d', '90d']).default('24h'),
  granularity: z.enum(['minute', 'hour', 'day']).default('hour'),
  forceRefresh: z.coerce.boolean().default(false),
  metrics: z.array(z.enum([
    'driver_count', 'booking_count', 'completion_rate', 'average_wait_time',
    'revenue', 'distance_traveled', 'incident_count', 'customer_rating'
  ])).optional(),
  groupBy: z.array(z.enum([
    'region', 'service_type', 'driver_status', 'hour_of_day', 'day_of_week'
  ])).optional(),
  ...DateRangeSchema.shape
});

// =====================================================
// AUTHENTICATION SCHEMAS
// =====================================================

// Login schema
export const LoginSchema = z.object({
  email: EmailSchema,
  password: z.string().min(8).max(128),
  deviceId: z.string().max(100).optional(),
  rememberMe: z.boolean().default(false)
});

// Token refresh schema
export const RefreshTokenSchema = z.object({
  refreshToken: z.string().min(100)
});

// Password change schema
export const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(8).max(128),
  newPassword: z.string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password must not exceed 128 characters")
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, 
      "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character"),
  confirmPassword: z.string()
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"]
});

// =====================================================
// BULK OPERATIONS SCHEMAS
// =====================================================

// Bulk driver update schema
export const BulkDriverUpdateSchema = z.object({
  driverIds: z.array(UuidSchema).min(1).max(100),
  updates: UpdateDriverSchema.partial(),
  options: z.object({
    validateOnly: z.boolean().default(false),
    continueOnError: z.boolean().default(true)
  }).optional()
});

// Bulk status update schema
export const BulkStatusUpdateSchema = z.object({
  entityIds: z.array(UuidSchema).min(1).max(100),
  status: z.string(),
  reason: z.string().max(500).optional()
});

// =====================================================
// EXPORT/IMPORT SCHEMAS
// =====================================================

// Export request schema
export const ExportRequestSchema = z.object({
  format: z.enum(['csv', 'xlsx', 'json', 'pdf']),
  entityType: z.enum(['drivers', 'bookings', 'incidents', 'analytics']),
  filters: z.record(z.unknown()).optional(),
  columns: z.array(z.string()).optional(),
  options: z.object({
    includeHeaders: z.boolean().default(true),
    dateFormat: z.string().default('ISO'),
    timezone: z.string().default('Asia/Manila')
  }).optional()
});

// File upload schema
export const FileUploadSchema = z.object({
  filename: z.string().min(1).max(255),
  contentType: z.string().max(100),
  size: z.number().int().min(1).max(10 * 1024 * 1024), // 10MB max
  purpose: z.enum(['driver_document', 'incident_attachment', 'profile_photo'])
});

// =====================================================
// HELPER FUNCTIONS
// =====================================================

// Validation helper that throws formatted errors
export function validateSchema<T>(schema: z.ZodSchema<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw result.error;
  }
  return result.data;
}

// Parse query parameters with schema
export function parseQuery<T>(schema: z.ZodSchema<T>, searchParams: URLSearchParams): T {
  const queryObject: Record<string, any> = {};
  
  for (const [key, value] of searchParams.entries()) {
    // Handle array parameters (e.g., status=active&status=busy)
    if (queryObject[key]) {
      if (Array.isArray(queryObject[key])) {
        queryObject[key].push(value);
      } else {
        queryObject[key] = [queryObject[key], value];
      }
    } else {
      queryObject[key] = value;
    }
  }

  return validateSchema(schema, queryObject);
}

// Transform validation errors to user-friendly format
export function formatValidationErrors(error: z.ZodError): Array<{
  field: string;
  message: string;
  code: string;
  value?: any;
}> {
  return error.errors.map(err => ({
    field: err.path.join('.'),
    message: err.message,
    code: err.code,
    value: err.code === 'invalid_type' ? (err as any).received : undefined
  }));
}

// Response validation schema
export const ApiResponseSchema = z.object({
  success: z.boolean(),
  data: z.unknown().optional(),
  message: z.string().optional(),
  timestamp: z.string().datetime(),
  requestId: z.string()
});

// Paginated response schema
export const PaginatedResponseSchema = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z.object({
    success: z.literal(true),
    data: z.array(itemSchema),
    pagination: z.object({
      page: z.number().int().min(1),
      limit: z.number().int().min(1),
      total: z.number().int().min(0),
      totalPages: z.number().int().min(0),
      hasNext: z.boolean(),
      hasPrev: z.boolean()
    }),
    timestamp: z.string().datetime(),
    requestId: z.string()
  });