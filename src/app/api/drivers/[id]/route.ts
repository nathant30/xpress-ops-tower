// /api/drivers/[id] - Individual Driver Management API
import { NextRequest } from 'next/server';
import { 
  createApiResponse, 
  createApiError,
  createNotFoundError,
  createValidationError,
  validateRequiredFields,
  asyncHandler,
  handleOptionsRequest
} from '@/lib/api-utils';
import { MockDataService } from '@/lib/mockData';
import { UpdateDriverRequest } from '@/types';


// GET /api/drivers/[id] - Get driver by ID
export const GET = asyncHandler(async (request: NextRequest, context?: { params: { id: string } }) => {
  if (!context?.params) {
    return createApiError('Missing route parameters', 'MISSING_PARAMS', 400);
  }
  const { params } = context;
  const { id } = params;
  
  const driver = MockDataService.getDriverById(id);
  
  if (!driver) {
    return createNotFoundError('Driver', `/api/drivers/${id}`, 'GET');
  }
  
  return createApiResponse(
    { driver },
    'Driver retrieved successfully'
  );
});

// PUT /api/drivers/[id] - Update driver
export const PUT = asyncHandler(async (request: NextRequest, context?: { params: { id: string } }) => {
  if (!context?.params) {
    return createApiError('Missing route parameters', 'MISSING_PARAMS', 400);
  }
  const { params } = context;
  const { id } = params;
  const body = await request.json() as UpdateDriverRequest;
  
  // Check if driver exists
  const existingDriver = MockDataService.getDriverById(id);
  if (!existingDriver) {
    return createNotFoundError('Driver', `/api/drivers/${id}`, 'PUT');
  }
  
  // Validate primary service if provided
  if (body.primaryService && body.services && !body.services.includes(body.primaryService)) {
    return createValidationError([{
      field: 'primaryService',
      message: 'Primary service must be included in services array',
      code: 'INVALID_PRIMARY_SERVICE',
    }], `/api/drivers/${id}`, 'PUT');
  }
  
  // Update driver
  const updatedDriver = MockDataService.updateDriver(id, body);
  
  if (!updatedDriver) {
    return createApiError(
      'Failed to update driver',
      'UPDATE_FAILED',
      500,
      undefined,
      `/api/drivers/${id}`,
      'PUT'
    );
  }
  
  return createApiResponse(
    { driver: updatedDriver },
    'Driver updated successfully'
  );
});

// PATCH /api/drivers/[id] - Partial update driver
export const PATCH = asyncHandler(async (request: NextRequest, context?: { params: { id: string } }) => {
  if (!context?.params) {
    return createApiError('Missing route parameters', 'MISSING_PARAMS', 400);
  }
  const { params } = context;
  const { id } = params;
  const body = await request.json();
  
  // Check if driver exists
  const existingDriver = MockDataService.getDriverById(id);
  if (!existingDriver) {
    return createNotFoundError('Driver', `/api/drivers/${id}`, 'PATCH');
  }
  
  // Validate primary service if provided
  if (body.primaryService) {
    const services = body.services || existingDriver.services;
    if (!services.includes(body.primaryService)) {
      return createValidationError([{
        field: 'primaryService',
        message: 'Primary service must be included in services array',
        code: 'INVALID_PRIMARY_SERVICE',
      }], `/api/drivers/${id}`, 'PATCH');
    }
  }
  
  // Update driver with partial data
  const updatedDriver = MockDataService.updateDriver(id, body);
  
  if (!updatedDriver) {
    return createApiError(
      'Failed to update driver',
      'UPDATE_FAILED',
      500,
      undefined,
      `/api/drivers/${id}`,
      'PATCH'
    );
  }
  
  return createApiResponse(
    { driver: updatedDriver },
    'Driver updated successfully'
  );
});

// DELETE /api/drivers/[id] - Delete driver
export const DELETE = asyncHandler(async (request: NextRequest, context?: { params: { id: string } }) => {
  if (!context?.params) {
    return createApiError('Missing route parameters', 'MISSING_PARAMS', 400);
  }
  const { params } = context;
  const { id } = params;
  
  // Check if driver exists
  const existingDriver = MockDataService.getDriverById(id);
  if (!existingDriver) {
    return createNotFoundError('Driver', `/api/drivers/${id}`, 'DELETE');
  }
  
  // Check if driver has active bookings (in real implementation)
  const activeBookings = MockDataService.getBookings({ 
    driverId: id, 
    status: ['requested', 'assigned', 'accepted', 'en_route', 'arrived', 'in_progress'] 
  });
  
  if (activeBookings.length > 0) {
    return createApiError(
      'Cannot delete driver with active bookings',
      'DRIVER_HAS_ACTIVE_BOOKINGS',
      409,
      { activeBookings: activeBookings.length },
      `/api/drivers/${id}`,
      'DELETE'
    );
  }
  
  const deleted = MockDataService.deleteDriver(id);
  
  if (!deleted) {
    return createApiError(
      'Failed to delete driver',
      'DELETE_FAILED',
      500,
      undefined,
      `/api/drivers/${id}`,
      'DELETE'
    );
  }
  
  return createApiResponse(
    { deleted: true, driverId: id },
    'Driver deleted successfully'
  );
});

// OPTIONS handler for CORS
export const OPTIONS = handleOptionsRequest;