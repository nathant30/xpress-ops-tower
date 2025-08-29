// /api/bookings/[id] - Individual Booking Management API
import { NextRequest } from 'next/server';
import { 
  createApiResponse, 
  createApiError,
  createNotFoundError,
  createValidationError,
  asyncHandler,
  handleOptionsRequest
} from '@/lib/api-utils';
import { MockDataService } from '@/lib/mockData';
import { BookingStatus } from '@/types';

// Real-time update broadcasting function
async function broadcastBookingUpdate(bookingId: string, status: string, data: any) {
  try {
    const update = {
      type: 'booking_update',
      bookingId,
      status,
      timestamp: new Date().toISOString(),
      data
    };
    
    console.log('Broadcasting booking status update:', update);
    
    global.realtimeUpdates = global.realtimeUpdates || [];
    global.realtimeUpdates.push(update);
    
    if (global.realtimeUpdates.length > 100) {
      global.realtimeUpdates = global.realtimeUpdates.slice(-100);
    }
  } catch (error) {
    console.error('Failed to broadcast booking update:', error);
  }
}


// GET /api/bookings/[id] - Get booking by ID
export const GET = asyncHandler(async (request: NextRequest, context?: { params: { id: string } }) => {
  // Get user from request for authentication
  const { getUserFromRequest } = await import('@/lib/auth');
  const user = await getUserFromRequest(request);
  
  if (!user) {
    return createApiError(
      'Authentication required',
      'UNAUTHORIZED',
      401,
      undefined,
      '/api/bookings/[id]',
      'GET'
    );
  }

  // Check if user has bookings:read permission
  if (!user.permissions.includes('bookings:read')) {
    return createApiError(
      'Insufficient permissions to view booking',
      'PERMISSION_DENIED',
      403,
      { requiredPermission: 'bookings:read' },
      '/api/bookings/[id]',
      'GET'
    );
  }
  if (!context?.params) {
    return createApiError('Missing route parameters', 'MISSING_PARAMS', 400);
  }
  const { params } = context;
  const { id } = params;
  
  const booking = MockDataService.getBookingById(id);
  
  if (!booking) {
    return createNotFoundError('Booking', `/api/bookings/${id}`, 'GET');
  }
  
  // Get driver info if assigned
  const driver = booking.driverId ? MockDataService.getDriverById(booking.driverId) : null;
  
  // Get driver location if assigned and active
  const driverLocation = booking.driverId ? 
    MockDataService.getDriverLocations({ driverId: booking.driverId })[0] : null;
  
  return createApiResponse({
    booking,
    driver: driver ? {
      id: driver.id,
      driverCode: driver.driverCode,
      firstName: driver.firstName,
      lastName: driver.lastName,
      phone: driver.phone,
      rating: driver.rating,
      vehicleInfo: driver.vehicleInfo,
      location: driverLocation?.location,
      lastLocationUpdate: driverLocation?.recordedAt,
    } : null,
  }, 'Booking retrieved successfully');
});

// PATCH /api/bookings/[id] - Update booking status and details
export const PATCH = asyncHandler(async (request: NextRequest, context?: { params: { id: string } }) => {
  // Get user from request for authentication
  const { getUserFromRequest } = await import('@/lib/auth');
  const user = await getUserFromRequest(request);
  
  if (!user) {
    return createApiError(
      'Authentication required',
      'UNAUTHORIZED',
      401,
      undefined,
      '/api/bookings/[id]',
      'PATCH'
    );
  }

  // Check if user has bookings:write permission
  if (!user.permissions.includes('bookings:write')) {
    return createApiError(
      'Insufficient permissions to update booking',
      'PERMISSION_DENIED',
      403,
      { requiredPermission: 'bookings:write' },
      '/api/bookings/[id]',
      'PATCH'
    );
  }
  if (!context?.params) {
    return createApiError('Missing route parameters', 'MISSING_PARAMS', 400);
  }
  const { params } = context;
  const { id } = params;
  const body = await request.json();
  
  // Check if booking exists
  const existingBooking = MockDataService.getBookingById(id);
  if (!existingBooking) {
    return createNotFoundError('Booking', `/api/bookings/${id}`, 'PATCH');
  }
  
  const validationErrors = [];
  
  // Validate status transitions
  if (body.status) {
    const validStatusTransitions: Record<BookingStatus, BookingStatus[]> = {
      'requested': ['searching', 'cancelled'],
      'searching': ['assigned', 'cancelled', 'no_show'],
      'assigned': ['accepted', 'cancelled'],
      'accepted': ['en_route', 'cancelled'],
      'en_route': ['arrived', 'cancelled'],
      'arrived': ['in_progress', 'cancelled', 'no_show'],
      'in_progress': ['completed', 'failed'],
      'completed': [], // Terminal state
      'cancelled': [], // Terminal state
      'failed': [], // Terminal state
      'no_show': [], // Terminal state
    };
    
    const currentStatus = existingBooking.status;
    const newStatus = body.status;
    const allowedTransitions = validStatusTransitions[currentStatus] || [];
    
    if (!allowedTransitions.includes(newStatus)) {
      validationErrors.push({
        field: 'status',
        message: `Cannot transition from ${currentStatus} to ${newStatus}`,
        code: 'INVALID_STATUS_TRANSITION',
      });
    }
  }
  
  // Validate driver assignment
  if (body.driverId) {
    const driver = MockDataService.getDriverById(body.driverId);
    if (!driver) {
      validationErrors.push({
        field: 'driverId',
        message: 'Driver not found',
        code: 'DRIVER_NOT_FOUND',
      });
    } else if (!driver.services.includes(existingBooking.serviceType)) {
      validationErrors.push({
        field: 'driverId',
        message: 'Driver does not provide the required service type',
        code: 'DRIVER_SERVICE_MISMATCH',
      });
    } else if (driver.status !== 'active') {
      validationErrors.push({
        field: 'driverId',
        message: 'Driver is not available for assignment',
        code: 'DRIVER_NOT_AVAILABLE',
      });
    }
  }
  
  if (validationErrors.length > 0) {
    return createValidationError(validationErrors, `/api/bookings/${id}`, 'PATCH');
  }
  
  // Prepare update data with timestamps
  const updateData = { ...body };
  
  // Add timestamps based on status changes
  if (body.status) {
    const now = new Date();
    switch (body.status) {
      case 'assigned':
        updateData.assignedAt = now;
        break;
      case 'accepted':
        updateData.acceptedAt = now;
        break;
      case 'arrived':
        updateData.actualPickupTime = now;
        break;
      case 'completed':
        updateData.completedAt = now;
        break;
      case 'cancelled':
        updateData.cancelledAt = now;
        break;
    }
  }
  
  // Update booking
  const updatedBooking = MockDataService.updateBooking(id, updateData);
  
  if (!updatedBooking) {
    return createApiError(
      'Failed to update booking',
      'UPDATE_FAILED',
      500,
      undefined,
      `/api/bookings/${id}`,
      'PATCH'
    );
  }
  
  // If driver was assigned, update their status
  let assignedDriver = null;
  if (body.driverId && body.status === 'assigned') {
    MockDataService.updateDriver(body.driverId, { status: 'busy' });
    assignedDriver = MockDataService.getDriverById(body.driverId);
  }
  
  // If booking completed or cancelled, make driver available again
  if (['completed', 'cancelled', 'failed'].includes(body.status) && updatedBooking.driverId) {
    MockDataService.updateDriver(updatedBooking.driverId, { status: 'active' });
  }

  // Broadcast real-time update for status change
  if (body.status) {
    let message = '';
    switch (body.status) {
      case 'assigned':
        message = assignedDriver ? 
          `Booking assigned to driver ${assignedDriver.firstName} ${assignedDriver.lastName}` :
          'Booking assigned to driver';
        break;
      case 'accepted':
        message = 'Driver accepted the booking';
        break;
      case 'en_route':
        message = 'Driver is on the way to pickup location';
        break;
      case 'arrived':
        message = 'Driver has arrived at pickup location';
        break;
      case 'in_progress':
        message = 'Trip is in progress';
        break;
      case 'completed':
        message = 'Trip completed successfully';
        break;
      case 'cancelled':
        message = 'Booking has been cancelled';
        break;
      default:
        message = `Booking status updated to ${body.status}`;
    }

    await broadcastBookingUpdate(id, body.status, {
      booking: updatedBooking,
      driver: assignedDriver,
      message
    });
  }
  
  return createApiResponse(
    { 
      booking: updatedBooking,
      realtimeUpdate: body.status ? true : false
    },
    'Booking updated successfully'
  );
});

// DELETE /api/bookings/[id] - Cancel booking (same as PATCH with cancelled status)
export const DELETE = asyncHandler(async (request: NextRequest, context?: { params: { id: string } }) => {
  // Get user from request for authentication
  const { getUserFromRequest } = await import('@/lib/auth');
  const user = await getUserFromRequest(request);
  
  if (!user) {
    return createApiError(
      'Authentication required',
      'UNAUTHORIZED',
      401,
      undefined,
      '/api/bookings/[id]',
      'DELETE'
    );
  }

  // Check if user has bookings:cancel permission (or write)
  if (!user.permissions.includes('bookings:cancel') && !user.permissions.includes('bookings:write')) {
    return createApiError(
      'Insufficient permissions to cancel booking',
      'PERMISSION_DENIED',
      403,
      { requiredPermission: 'bookings:cancel' },
      '/api/bookings/[id]',
      'DELETE'
    );
  }
  if (!context?.params) {
    return createApiError('Missing route parameters', 'MISSING_PARAMS', 400);
  }
  const { params } = context;
  const { id } = params;
  
  // Check if booking exists
  const existingBooking = MockDataService.getBookingById(id);
  if (!existingBooking) {
    return createNotFoundError('Booking', `/api/bookings/${id}`, 'DELETE');
  }
  
  // Check if booking can be cancelled
  const cancellableStatuses = ['requested', 'searching', 'assigned', 'accepted', 'en_route', 'arrived'];
  if (!cancellableStatuses.includes(existingBooking.status)) {
    return createApiError(
      `Cannot cancel booking with status: ${existingBooking.status}`,
      'BOOKING_NOT_CANCELLABLE',
      409,
      { currentStatus: existingBooking.status },
      `/api/bookings/${id}`,
      'DELETE'
    );
  }
  
  // Update booking to cancelled
  const updatedBooking = MockDataService.updateBooking(id, {
    status: 'cancelled',
    cancelledAt: new Date(),
  });
  
  // Make driver available again if assigned
  if (existingBooking.driverId) {
    MockDataService.updateDriver(existingBooking.driverId, { status: 'active' });
  }

  // Broadcast real-time update for cancellation
  await broadcastBookingUpdate(id, 'cancelled', {
    booking: updatedBooking,
    message: 'Booking has been cancelled'
  });
  
  return createApiResponse(
    { 
      booking: updatedBooking,
      realtimeUpdate: true
    },
    'Booking cancelled successfully'
  );
});

// OPTIONS handler for CORS
export const OPTIONS = handleOptionsRequest;