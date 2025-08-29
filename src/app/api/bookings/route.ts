// /api/bookings - Booking Management API
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
import { withAuthAndRateLimit } from '@/lib/auth';
import { MockDataService } from '@/lib/mockData';
import { CreateBookingRequest } from '@/types';

// Real-time update broadcasting function
async function broadcastBookingUpdate(bookingId: string, status: string, data: any) {
  try {
    // In a real implementation, this would use WebSocket connections or server-sent events
    // For now, we'll simulate by storing the update in a cache/database
    const update = {
      type: 'booking_update',
      bookingId,
      status,
      timestamp: new Date().toISOString(),
      data
    };
    
    console.log('Broadcasting booking update:', update);
    
    // Store update for WebSocket connections to pick up
    // In real implementation, send to all connected clients
    global.realtimeUpdates = global.realtimeUpdates || [];
    global.realtimeUpdates.push(update);
    
    // Keep only last 100 updates
    if (global.realtimeUpdates.length > 100) {
      global.realtimeUpdates = global.realtimeUpdates.slice(-100);
    }
  } catch (error) {
    console.error('Failed to broadcast booking update:', error);
  }
}

// GET /api/bookings - List all bookings with filtering and pagination
export const GET = withAuthAndRateLimit(async (request: NextRequest, user) => {
  // Check if user has bookings:read permission
  if (!user.permissions.includes('bookings:read')) {
    return createApiError(
      'Insufficient permissions to view bookings',
      'PERMISSION_DENIED',
      403,
      { requiredPermission: 'bookings:read' },
      '/api/bookings',
      'GET'
    );
  }
  const queryParams = parseQueryParams(request);
  const paginationParams = parsePaginationParams(request);
  
  // Get bookings with filters
  const bookings = MockDataService.getBookings({
    status: queryParams.status,
    serviceType: queryParams.serviceType,
    driverId: queryParams.driverId,
    customerId: queryParams.customerId,
    regionId: queryParams.regionId,
    createdFrom: queryParams.createdFrom,
    createdTo: queryParams.createdTo,
  });
  
  // Apply sorting
  let sortedBookings = [...bookings];
  if (paginationParams.sortBy) {
    sortedBookings.sort((a, b) => {
      const aValue = (a as any)[paginationParams.sortBy!];
      const bValue = (b as any)[paginationParams.sortBy!];
      
      if (aValue < bValue) return paginationParams.sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return paginationParams.sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }
  
  // Apply pagination
  const paginatedResult = applyPagination(
    sortedBookings,
    paginationParams.page,
    paginationParams.limit
  );
  
  // Calculate summary statistics
  const totalBookings = bookings.length;
  const completedBookings = bookings.filter(b => b.status === 'completed').length;
  const activeBookings = bookings.filter(b => 
    ['requested', 'assigned', 'accepted', 'en_route', 'arrived', 'in_progress'].includes(b.status)
  ).length;
  const cancelledBookings = bookings.filter(b => b.status === 'cancelled').length;
  
  return createApiResponse(
    paginatedResult.data,
    'Bookings retrieved successfully'
  );
});

// POST /api/bookings - Create a new booking
export const POST = withAuthAndRateLimit(async (request: NextRequest, user) => {
  // Check if user has bookings:write permission
  if (!user.permissions.includes('bookings:write')) {
    return createApiError(
      'Insufficient permissions to create bookings',
      'PERMISSION_DENIED',
      403,
      { requiredPermission: 'bookings:write' },
      '/api/bookings',
      'POST'
    );
  }
  const body = await request.json() as CreateBookingRequest;
  
  // Validate required fields
  const requiredFields = [
    'serviceType', 
    'customerId', 
    'customerInfo', 
    'pickupLocation', 
    'pickupAddress', 
    'regionId'
  ];
  
  const validationErrors = validateRequiredFields(body, requiredFields);
  
  // Additional validation for delivery services
  if (['send_delivery', 'eats_delivery', 'mart_delivery'].includes(body.serviceType)) {
    if (!body.dropoffLocation || !body.dropoffAddress) {
      validationErrors.push({
        field: 'dropoffLocation',
        message: 'Dropoff location and address are required for delivery services',
        code: 'MISSING_DROPOFF_INFO',
      });
    }
  }
  
  // Validate customer info
  if (!body.customerInfo?.name || !body.customerInfo?.phone) {
    validationErrors.push({
      field: 'customerInfo',
      message: 'Customer name and phone are required',
      code: 'INCOMPLETE_CUSTOMER_INFO',
    });
  }
  
  // Validate location coordinates
  if (!body.pickupLocation?.latitude || !body.pickupLocation?.longitude) {
    validationErrors.push({
      field: 'pickupLocation',
      message: 'Valid pickup coordinates (latitude, longitude) are required',
      code: 'INVALID_PICKUP_COORDINATES',
    });
  }
  
  if (validationErrors.length > 0) {
    return createValidationError(validationErrors, '/api/bookings', 'POST');
  }
  
  // Convert location format for GeoJSON
  const pickupLocation = {
    type: 'Point' as const,
    coordinates: [body.pickupLocation.longitude, body.pickupLocation.latitude]
  };
  
  const dropoffLocation = body.dropoffLocation ? {
    type: 'Point' as const,
    coordinates: [body.dropoffLocation.longitude, body.dropoffLocation.latitude]
  } : undefined;
  
  // Create booking with defaults
  const bookingData = {
    ...body,
    pickupLocation,
    dropoffLocation,
    status: 'requested',
    surgeMultiplier: 1.0, // Could be calculated based on demand
    paymentStatus: 'pending',
    requestedAt: new Date(),
    estimatedPickupTime: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes from now
    estimatedCompletionTime: body.dropoffLocation ? 
      new Date(Date.now() + 45 * 60 * 1000) : // 45 minutes for trips with dropoff
      new Date(Date.now() + 30 * 60 * 1000),  // 30 minutes for pickup-only
  };
  
  const newBooking = MockDataService.createBooking(bookingData);
  
  // Broadcast real-time update for new booking
  await broadcastBookingUpdate(newBooking.id, 'requested', {
    booking: newBooking,
    message: 'New booking created and waiting for driver assignment'
  });
  
  // In a real implementation, this would trigger driver matching algorithm
  // For now, we'll simulate finding available drivers
  const availableDrivers = MockDataService.getDrivers({
    status: ['active'],
    region: body.regionId,
  }).filter(driver => 
    driver.services.includes(body.serviceType) &&
    driver.isActive
  );

  // Simulate assignment process if drivers are available
  if (availableDrivers.length > 0) {
    // Simulate assignment delay
    setTimeout(async () => {
      const assignedDriver = availableDrivers[0];
      const updatedBooking = MockDataService.updateBooking(newBooking.id, {
        driverId: assignedDriver.id,
        status: 'assigned',
        assignedAt: new Date(),
        estimatedPickupTime: new Date(Date.now() + 8 * 60 * 1000), // 8 minutes
      });

      if (updatedBooking) {
        await broadcastBookingUpdate(newBooking.id, 'assigned', {
          booking: updatedBooking,
          driver: assignedDriver,
          message: `Booking assigned to driver ${assignedDriver.firstName} ${assignedDriver.lastName}`
        });
      }
    }, 2000); // 2 second delay to simulate processing
  }
  
  return createApiResponse({
    booking: newBooking,
    availableDrivers: availableDrivers.length,
    estimatedAssignmentTime: availableDrivers.length > 0 ? '2-5 minutes' : 'No drivers available',
    realtimeUpdates: true
  }, 'Booking created successfully', 201);
});

// OPTIONS handler for CORS
export const OPTIONS = handleOptionsRequest;