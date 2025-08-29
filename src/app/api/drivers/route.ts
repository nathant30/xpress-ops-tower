// /api/drivers - Driver Management API
import { NextRequest } from 'next/server';
import { 
  createApiResponse, 
  createApiError, 
  createValidationError,
  parseQueryParams,
  parsePaginationParams,
  applyPagination,
  validateRequiredFields,
  asyncHandler,
  handleOptionsRequest
} from '@/lib/api-utils';
import { withAuth, withAuthAndRateLimit } from '@/lib/auth';
import { MockDataService } from '@/lib/mockData';
import { CreateDriverRequest } from '@/types';

// GET /api/drivers - List all drivers with filtering and pagination  
export const GET = withAuthAndRateLimit(async (request: NextRequest, user) => {
  // Check if user has drivers:read permission
  if (!user.permissions.includes('drivers:read')) {
    return createApiError(
      'Insufficient permissions to view drivers',
      'PERMISSION_DENIED',
      403,
      { requiredPermission: 'drivers:read' },
      '/api/drivers',
      'GET'
    );
  }
  const queryParams = parseQueryParams(request);
  const paginationParams = parsePaginationParams(request);
  
  // Apply regional filtering for non-admin users
  let regionFilter = queryParams.region;
  if (user.role !== 'admin' && user.regionId) {
    regionFilter = user.regionId;
  }
  
  // Get drivers with filters
  const drivers = MockDataService.getDrivers({
    status: queryParams.status,
    region: regionFilter,
    search: queryParams.search,
    services: queryParams.services,
  });
  
  // Apply sorting
  let sortedDrivers = [...drivers];
  if (paginationParams.sortBy) {
    sortedDrivers.sort((a, b) => {
      const aValue = (a as any)[paginationParams.sortBy!];
      const bValue = (b as any)[paginationParams.sortBy!];
      
      if (aValue < bValue) return paginationParams.sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return paginationParams.sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }
  
  // Apply pagination
  const paginatedResult = applyPagination(
    sortedDrivers,
    paginationParams.page,
    paginationParams.limit
  );
  
  return createApiResponse(
    paginatedResult.data,
    'Drivers retrieved successfully'
  );
});

// POST /api/drivers - Create a new driver
export const POST = withAuthAndRateLimit(async (request: NextRequest, user) => {
  // Check if user has drivers:write permission
  if (!user.permissions.includes('drivers:write')) {
    return createApiError(
      'Insufficient permissions to create drivers',
      'PERMISSION_DENIED',
      403,
      { requiredPermission: 'drivers:write' },
      '/api/drivers',
      'POST'
    );
  }

  const body = await request.json() as CreateDriverRequest;
  
  // Validate required fields
  const requiredFields = [
    'driverCode', 
    'firstName', 
    'lastName', 
    'phone', 
    'address', 
    'regionId', 
    'services', 
    'primaryService'
  ];
  
  const validationErrors = validateRequiredFields(body, requiredFields);
  
  // Additional validation
  if (body.services && !body.services.includes(body.primaryService)) {
    validationErrors.push({
      field: 'primaryService',
      message: 'Primary service must be included in services array',
      code: 'INVALID_PRIMARY_SERVICE',
    });
  }
  
  if (validationErrors.length > 0) {
    return createValidationError(validationErrors, '/api/drivers', 'POST');
  }
  
  // Check if driver code already exists
  const existingDriver = MockDataService.getDrivers({ search: body.driverCode })
    .find(d => d.driverCode === body.driverCode);
  
  if (existingDriver) {
    return createApiError(
      'Driver code already exists',
      'DUPLICATE_DRIVER_CODE',
      409,
      { driverCode: body.driverCode },
      '/api/drivers',
      'POST'
    );
  }
  
  // Create driver with defaults
  const driverData = {
    ...body,
    status: 'active',
    verificationLevel: 1,
    isVerified: false,
    rating: 0,
    totalTrips: 0,
    completedTrips: 0,
    cancelledTrips: 0,
    walletBalance: 0,
    earningsToday: 0,
    earningsWeek: 0,
    earningsMonth: 0,
    vehicleInfo: body.vehicleInfo || { type: 'car' },
    licenseInfo: body.licenseInfo || {},
    documents: {},
    certifications: [],
    isActive: true,
  };
  
  const newDriver = MockDataService.createDriver(driverData);
  
  return createApiResponse(
    { driver: newDriver },
    'Driver created successfully',
    201
  );
});

// OPTIONS handler for CORS
export const OPTIONS = handleOptionsRequest;