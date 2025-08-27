// /api/alerts/[id] - Individual Alert Management API
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
import { IncidentStatus } from '@/types';


// GET /api/alerts/[id] - Get alert by ID
export const GET = asyncHandler(async (request: NextRequest, context?: { params: { id: string } }) => {
  if (!context?.params) {
    return createApiError('Missing route parameters', 'MISSING_PARAMS', 400);
  }
  const { params } = context;
  const { id } = params;
  
  const incident = MockDataService.getIncidentById(id);
  
  if (!incident) {
    return createNotFoundError('Alert', `/api/alerts/${id}`, 'GET');
  }
  
  // Enrich with related data
  const driver = incident.driverId ? MockDataService.getDriverById(incident.driverId) : null;
  const booking = incident.bookingId ? MockDataService.getBookingById(incident.bookingId) : null;
  const driverLocation = incident.driverId ? 
    MockDataService.getDriverLocations({ driverId: incident.driverId })[0] : null;
  
  return createApiResponse({
    alert: incident,
    driver: driver ? {
      id: driver.id,
      driverCode: driver.driverCode,
      firstName: driver.firstName,
      lastName: driver.lastName,
      phone: driver.phone,
      rating: driver.rating,
      vehicleInfo: driver.vehicleInfo,
      status: driver.status,
      location: driverLocation?.location,
      lastLocationUpdate: driverLocation?.recordedAt,
    } : null,
    booking: booking ? {
      id: booking.id,
      bookingReference: booking.bookingReference,
      serviceType: booking.serviceType,
      status: booking.status,
      pickupAddress: booking.pickupAddress,
      dropoffAddress: booking.dropoffAddress,
      customerInfo: booking.customerInfo,
    } : null,
  }, 'Alert retrieved successfully');
});

// PATCH /api/alerts/[id] - Update alert status and details
export const PATCH = asyncHandler(async (request: NextRequest, context?: { params: { id: string } }) => {
  if (!context?.params) {
    return createApiError('Missing route parameters', 'MISSING_PARAMS', 400);
  }
  const { params } = context;
  const { id } = params;
  const body = await request.json();
  
  // Check if alert exists
  const existingIncident = MockDataService.getIncidentById(id);
  if (!existingIncident) {
    return createNotFoundError('Alert', `/api/alerts/${id}`, 'PATCH');
  }
  
  const validationErrors = [];
  
  // Validate status transitions
  if (body.status) {
    const validStatusTransitions: Record<IncidentStatus, IncidentStatus[]> = {
      'open': ['acknowledged', 'in_progress', 'escalated'],
      'acknowledged': ['in_progress', 'resolved', 'escalated'],
      'in_progress': ['resolved', 'escalated'],
      'escalated': ['in_progress', 'resolved'],
      'resolved': ['closed'],
      'closed': [], // Terminal state
    };
    
    const currentStatus = existingIncident.status;
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
  
  // Validate escalation fields
  if (body.status === 'escalated' && !body.escalatedTo) {
    validationErrors.push({
      field: 'escalatedTo',
      message: 'Escalation target is required when escalating incident',
      code: 'MISSING_ESCALATION_TARGET',
    });
  }
  
  // Validate resolution fields
  if (body.status === 'resolved' && !body.resolutionNotes && !existingIncident.resolutionNotes) {
    validationErrors.push({
      field: 'resolutionNotes',
      message: 'Resolution notes are required when resolving incident',
      code: 'MISSING_RESOLUTION_NOTES',
    });
  }
  
  if (validationErrors.length > 0) {
    return createValidationError(validationErrors, `/api/alerts/${id}`, 'PATCH');
  }
  
  // Prepare update data with timestamps and operator info
  const updateData = { ...body };
  const now = new Date();
  
  // Add timestamps and operator info based on status changes
  if (body.status) {
    switch (body.status) {
      case 'acknowledged':
        updateData.acknowledgedAt = now;
        updateData.acknowledgedBy = body.operatorId || 'system';
        updateData.firstResponseTime = updateData.firstResponseTime || 
          Math.round((now.getTime() - new Date(existingIncident.createdAt).getTime()) / 1000);
        break;
        
      case 'escalated':
        updateData.escalatedAt = now;
        break;
        
      case 'resolved':
        updateData.resolvedAt = now;
        updateData.resolvedBy = body.operatorId || 'system';
        updateData.resolutionTime = updateData.resolutionTime ||
          Math.round((now.getTime() - new Date(existingIncident.createdAt).getTime()) / 1000);
        break;
    }
  }
  
  // Update incident
  const updatedIncident = MockDataService.updateIncident(id, updateData);
  
  if (!updatedIncident) {
    return createApiError(
      'Failed to update alert',
      'UPDATE_FAILED',
      500,
      undefined,
      `/api/alerts/${id}`,
      'PATCH'
    );
  }
  
  // Handle side effects based on status changes
  const sideEffects = [];
  
  // If incident is resolved and involves a driver, update driver status
  if (body.status === 'resolved' && existingIncident.driverId) {
    const driver = MockDataService.getDriverById(existingIncident.driverId);
    if (driver && driver.status === 'emergency') {
      MockDataService.updateDriver(existingIncident.driverId, { status: 'active' });
      sideEffects.push('Driver status updated to active');
    }
  }
  
  // If incident is escalated, create notifications
  if (body.status === 'escalated') {
    sideEffects.push('Emergency services notified');
    sideEffects.push('Management team alerted');
  }
  
  return createApiResponse({
    alert: updatedIncident,
    sideEffects,
    statusChanged: body.status !== existingIncident.status,
  }, 'Alert updated successfully');
});

// DELETE /api/alerts/[id] - Close/archive alert
export const DELETE = asyncHandler(async (request: NextRequest, context?: { params: { id: string } }) => {
  if (!context?.params) {
    return createApiError('Missing route parameters', 'MISSING_PARAMS', 400);
  }
  const { params } = context;
  const { id } = params;
  
  // Check if alert exists
  const existingIncident = MockDataService.getIncidentById(id);
  if (!existingIncident) {
    return createNotFoundError('Alert', `/api/alerts/${id}`, 'DELETE');
  }
  
  // Only allow deletion/closing of resolved incidents
  if (existingIncident.status !== 'resolved') {
    return createApiError(
      `Cannot close alert with status: ${existingIncident.status}`,
      'ALERT_NOT_CLOSABLE',
      409,
      { currentStatus: existingIncident.status },
      `/api/alerts/${id}`,
      'DELETE'
    );
  }
  
  // Update incident to closed status instead of actual deletion
  const updatedIncident = MockDataService.updateIncident(id, {
    status: 'closed',
  });
  
  // If incident involved a driver in emergency status, ensure they're active again
  if (existingIncident.driverId) {
    const driver = MockDataService.getDriverById(existingIncident.driverId);
    if (driver && driver.status === 'emergency') {
      MockDataService.updateDriver(existingIncident.driverId, { status: 'active' });
    }
  }
  
  return createApiResponse({
    alert: updatedIncident,
    closed: true,
  }, 'Alert closed successfully');
});

// OPTIONS handler for CORS
export const OPTIONS = handleOptionsRequest;