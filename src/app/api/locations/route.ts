// /api/locations - Real-time Location Tracking API
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
import { LocationUpdate } from '@/types';

// GET /api/locations - Get driver locations with filtering
export const GET = asyncHandler(async (request: NextRequest) => {
  const queryParams = parseQueryParams(request);
  const paginationParams = parsePaginationParams(request);
  
  // Parse boundary filters for map viewport
  let bounds;
  if (queryParams.bounds) {
    try {
      bounds = JSON.parse(queryParams.bounds as string);
    } catch (e) {
      // Invalid bounds format, ignore
    }
  }
  
  // Get driver locations with filters
  const locations = MockDataService.getDriverLocations({
    regionId: queryParams.regionId,
    isAvailable: queryParams.isAvailable,
    status: queryParams.status,
    lastUpdatedSince: queryParams.lastUpdatedSince,
  });
  
  // Filter by bounds if provided
  let filteredLocations = locations;
  if (bounds && bounds.northEast && bounds.southWest) {
    filteredLocations = locations.filter(location => {
      const [lng, lat] = location.location.coordinates;
      return (
        lat <= bounds.northEast.lat &&
        lat >= bounds.southWest.lat &&
        lng <= bounds.northEast.lng &&
        lng >= bounds.southWest.lng
      );
    });
  }
  
  // Apply sorting by last update (most recent first by default)
  const sortedLocations = filteredLocations.sort((a, b) => 
    new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime()
  );
  
  // Apply pagination
  const paginatedResult = applyPagination(
    sortedLocations,
    paginationParams.page,
    paginationParams.limit
  );
  
  // Enrich with driver details
  const enrichedLocations = paginatedResult.data.map(location => {
    const driver = MockDataService.getDriverById(location.driverId);
    return {
      ...location,
      driver: driver ? {
        id: driver.id,
        driverCode: driver.driverCode,
        firstName: driver.firstName,
        lastName: driver.lastName,
        rating: driver.rating,
        vehicleInfo: driver.vehicleInfo,
        services: driver.services,
      } : null,
    };
  });
  
  // Calculate summary statistics
  const totalLocations = filteredLocations.length;
  const availableDrivers = filteredLocations.filter(l => l.isAvailable).length;
  const busyDrivers = filteredLocations.filter(l => !l.isAvailable).length;
  const recentUpdates = filteredLocations.filter(l => 
    new Date().getTime() - new Date(l.recordedAt).getTime() < 5 * 60 * 1000 // Last 5 minutes
  ).length;
  
  return createApiResponse({
    locations: enrichedLocations,
    pagination: paginatedResult.pagination,
    summary: {
      total: totalLocations,
      available: availableDrivers,
      busy: busyDrivers,
      recentUpdates,
      coverage: bounds ? 'viewport' : 'all',
    },
    filters: {
      regionId: queryParams.regionId,
      isAvailable: queryParams.isAvailable,
      status: queryParams.status,
      bounds: bounds || null,
    },
    timestamp: new Date(),
  }, 'Driver locations retrieved successfully');
});

// POST /api/locations - Update driver location
export const POST = asyncHandler(async (request: NextRequest) => {
  const body = await request.json() as LocationUpdate;
  
  // Validate required fields
  const requiredFields = ['driverId', 'latitude', 'longitude', 'timestamp'];
  const validationErrors = validateRequiredFields(body, requiredFields);
  
  // Validate coordinates
  if (body.latitude && (body.latitude < -90 || body.latitude > 90)) {
    validationErrors.push({
      field: 'latitude',
      message: 'Latitude must be between -90 and 90',
      code: 'INVALID_LATITUDE',
    });
  }
  
  if (body.longitude && (body.longitude < -180 || body.longitude > 180)) {
    validationErrors.push({
      field: 'longitude',
      message: 'Longitude must be between -180 and 180',
      code: 'INVALID_LONGITUDE',
    });
  }
  
  // Validate accuracy if provided
  if (body.accuracy && body.accuracy < 0) {
    validationErrors.push({
      field: 'accuracy',
      message: 'Accuracy must be a positive number',
      code: 'INVALID_ACCURACY',
    });
  }
  
  // Validate speed if provided
  if (body.speed && body.speed < 0) {
    validationErrors.push({
      field: 'speed',
      message: 'Speed must be a positive number',
      code: 'INVALID_SPEED',
    });
  }
  
  // Validate bearing if provided
  if (body.bearing && (body.bearing < 0 || body.bearing > 360)) {
    validationErrors.push({
      field: 'bearing',
      message: 'Bearing must be between 0 and 360 degrees',
      code: 'INVALID_BEARING',
    });
  }
  
  if (validationErrors.length > 0) {
    return createValidationError(validationErrors, '/api/locations', 'POST');
  }
  
  // Check if driver exists
  const driver = MockDataService.getDriverById(body.driverId);
  if (!driver) {
    return createApiError(
      'Driver not found',
      'DRIVER_NOT_FOUND',
      404,
      { driverId: body.driverId },
      '/api/locations',
      'POST'
    );
  }
  
  // Prepare location data
  const locationData = {
    location: {
      type: 'Point' as const,
      coordinates: [body.longitude, body.latitude]
    },
    accuracy: body.accuracy,
    altitude: body.altitude,
    bearing: body.bearing,
    speed: body.speed,
    driverStatus: driver.status,
    isAvailable: driver.status === 'active',
    regionId: driver.regionId,
    // Address would be reverse geocoded in real implementation
    address: `${body.latitude.toFixed(4)}, ${body.longitude.toFixed(4)}`,
  };
  
  // Update location
  const updatedLocation = MockDataService.updateDriverLocation(body.driverId, locationData);
  
  // Check for geofencing violations or special zones (placeholder)
  const warnings = [];
  
  // Example: Check if driver is in a restricted area (mock implementation)
  if (body.latitude > 14.7 && body.latitude < 14.8 && body.longitude > 120.9 && body.longitude < 121.0) {
    warnings.push({
      type: 'restricted_area',
      message: 'Driver is in a restricted area',
      area: 'Downtown Manila Restricted Zone',
    });
  }
  
  return createApiResponse({
    location: updatedLocation,
    driver: {
      id: driver.id,
      driverCode: driver.driverCode,
      firstName: driver.firstName,
      lastName: driver.lastName,
      status: driver.status,
    },
    warnings,
  }, 'Location updated successfully', 201);
});

// OPTIONS handler for CORS
export const OPTIONS = handleOptionsRequest;