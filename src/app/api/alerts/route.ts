// /api/alerts - Emergency/SOS Alert Management API
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
import { MockDataService } from '@/lib/mockData';
import { CreateIncidentRequest } from '@/types';

// GET /api/alerts - List all alerts/incidents with filtering and pagination
export const GET = asyncHandler(async (request: NextRequest) => {
  const queryParams = parseQueryParams(request);
  const paginationParams = parsePaginationParams(request);
  
  // Get incidents with filters
  const incidents = MockDataService.getIncidents({
    priority: queryParams.priority,
    status: queryParams.status,
    regionId: queryParams.regionId,
    driverId: queryParams.driverId,
    incidentType: queryParams.incidentType,
    createdFrom: queryParams.createdFrom,
    createdTo: queryParams.createdTo,
  });
  
  // Apply sorting (most recent first by default, critical incidents prioritized)
  let sortedIncidents = [...incidents];
  if (paginationParams.sortBy) {
    sortedIncidents.sort((a, b) => {
      const aValue = (a as any)[paginationParams.sortBy!];
      const bValue = (b as any)[paginationParams.sortBy!];
      
      if (aValue < bValue) return paginationParams.sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return paginationParams.sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  } else {
    // Default sorting: Critical incidents first, then by creation time (newest first)
    sortedIncidents.sort((a, b) => {
      // Priority order: critical > high > medium > low
      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      const aPriority = priorityOrder[a.priority];
      const bPriority = priorityOrder[b.priority];
      
      if (aPriority !== bPriority) {
        return bPriority - aPriority; // Higher priority first
      }
      
      // Same priority, sort by creation time (newest first)
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }
  
  // Apply pagination
  const paginatedResult = applyPagination(
    sortedIncidents,
    paginationParams.page,
    paginationParams.limit
  );
  
  // Enrich incidents with driver details
  const enrichedIncidents = paginatedResult.data.map(incident => {
    const driver = incident.driverId ? MockDataService.getDriverById(incident.driverId) : null;
    const booking = incident.bookingId ? MockDataService.getBookingById(incident.bookingId) : null;
    
    return {
      ...incident,
      driver: driver ? {
        id: driver.id,
        driverCode: driver.driverCode,
        firstName: driver.firstName,
        lastName: driver.lastName,
        phone: driver.phone,
        vehicleInfo: driver.vehicleInfo,
      } : null,
      booking: booking ? {
        id: booking.id,
        bookingReference: booking.bookingReference,
        serviceType: booking.serviceType,
        status: booking.status,
        pickupAddress: booking.pickupAddress,
        dropoffAddress: booking.dropoffAddress,
      } : null,
    };
  });
  
  // Calculate summary statistics
  const totalIncidents = incidents.length;
  const criticalIncidents = incidents.filter(i => i.priority === 'critical').length;
  const openIncidents = incidents.filter(i => 
    ['open', 'acknowledged', 'in_progress'].includes(i.status)
  ).length;
  const resolvedIncidents = incidents.filter(i => i.status === 'resolved').length;
  const escalatedIncidents = incidents.filter(i => i.status === 'escalated').length;
  
  // Calculate average response time for resolved incidents
  const resolvedWithTimes = incidents.filter(i => 
    i.status === 'resolved' && i.firstResponseTime
  );
  const avgResponseTime = resolvedWithTimes.length > 0 ? 
    resolvedWithTimes.reduce((sum, i) => sum + (i.firstResponseTime || 0), 0) / resolvedWithTimes.length : 0;
  
  return createApiResponse({
    alerts: enrichedIncidents,
    pagination: paginatedResult.pagination,
    summary: {
      total: totalIncidents,
      critical: criticalIncidents,
      open: openIncidents,
      resolved: resolvedIncidents,
      escalated: escalatedIncidents,
      averageResponseTime: Math.round(avgResponseTime),
      resolutionRate: totalIncidents > 0 ? (resolvedIncidents / totalIncidents) * 100 : 0,
    },
    filters: {
      priority: queryParams.priority,
      status: queryParams.status,
      regionId: queryParams.regionId,
      driverId: queryParams.driverId,
      incidentType: queryParams.incidentType,
      createdFrom: queryParams.createdFrom,
      createdTo: queryParams.createdTo,
    }
  }, 'Alerts retrieved successfully');
});

// POST /api/alerts - Create a new alert/incident
export const POST = asyncHandler(async (request: NextRequest) => {
  const body = await request.json() as CreateIncidentRequest;
  
  // Validate required fields
  const requiredFields = [
    'priority', 
    'incidentType', 
    'reporterType', 
    'reporterId', 
    'title', 
    'description'
  ];
  
  const validationErrors = validateRequiredFields(body, requiredFields);
  
  // Additional validation for SOS alerts
  if (body.priority === 'critical') {
    if (!body.driverId && body.reporterType === 'driver') {
      validationErrors.push({
        field: 'driverId',
        message: 'Driver ID is required for critical driver-reported incidents',
        code: 'MISSING_DRIVER_ID',
      });
    }
    
    if (!body.location && !body.address) {
      validationErrors.push({
        field: 'location',
        message: 'Location information is required for critical incidents',
        code: 'MISSING_LOCATION',
      });
    }
  }
  
  // Validate location coordinates if provided
  if (body.location) {
    if (body.location.latitude < -90 || body.location.latitude > 90) {
      validationErrors.push({
        field: 'location.latitude',
        message: 'Latitude must be between -90 and 90',
        code: 'INVALID_LATITUDE',
      });
    }
    
    if (body.location.longitude < -180 || body.location.longitude > 180) {
      validationErrors.push({
        field: 'location.longitude',
        message: 'Longitude must be between -180 and 180',
        code: 'INVALID_LONGITUDE',
      });
    }
  }
  
  // Validate reporter exists
  if (body.reporterType === 'driver' && body.reporterId) {
    const driver = MockDataService.getDriverById(body.reporterId);
    if (!driver) {
      validationErrors.push({
        field: 'reporterId',
        message: 'Reporter driver not found',
        code: 'REPORTER_NOT_FOUND',
      });
    }
  }
  
  // Validate driver exists if specified
  if (body.driverId) {
    const driver = MockDataService.getDriverById(body.driverId);
    if (!driver) {
      validationErrors.push({
        field: 'driverId',
        message: 'Involved driver not found',
        code: 'DRIVER_NOT_FOUND',
      });
    }
  }
  
  // Validate booking exists if specified
  if (body.bookingId) {
    const booking = MockDataService.getBookingById(body.bookingId);
    if (!booking) {
      validationErrors.push({
        field: 'bookingId',
        message: 'Associated booking not found',
        code: 'BOOKING_NOT_FOUND',
      });
    }
  }
  
  if (validationErrors.length > 0) {
    return createValidationError(validationErrors, '/api/alerts', 'POST');
  }
  
  // Convert location format for GeoJSON if provided
  const location = body.location ? {
    type: 'Point' as const,
    coordinates: [body.location.longitude, body.location.latitude]
  } : undefined;
  
  // Create incident with appropriate defaults
  const incidentData = {
    ...body,
    location,
    status: body.priority === 'critical' ? 'open' : 'acknowledged',
    // Auto-acknowledge non-critical incidents
    acknowledgedAt: body.priority === 'critical' ? undefined : new Date(),
    acknowledgedBy: body.priority === 'critical' ? undefined : 'system',
  };
  
  const newIncident = MockDataService.createIncident(incidentData);
  
  // For critical incidents, trigger immediate notifications
  const notifications = [];
  if (body.priority === 'critical') {
    notifications.push({
      type: 'emergency_alert',
      message: 'Critical incident requires immediate attention',
      channels: ['sms', 'email', 'push'],
      recipients: ['emergency_response_team'],
    });
    
    // If driver is involved, update their status
    if (body.driverId) {
      MockDataService.updateDriver(body.driverId, { status: 'emergency' });
    }
  }
  
  return createApiResponse({
    alert: newIncident,
    notifications,
    autoActions: {
      driverStatusUpdated: body.driverId ? true : false,
      emergencyTeamNotified: body.priority === 'critical',
      escalationScheduled: body.priority === 'critical' || body.priority === 'high',
    }
  }, 'Alert created successfully', 201);
});

// OPTIONS handler for CORS
export const OPTIONS = handleOptionsRequest;