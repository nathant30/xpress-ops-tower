# Xpress Ops Tower API Documentation

## Overview
This document outlines the restored API routes for Xpress Ops Tower. All endpoints have been restored with full TypeScript type safety, proper error handling, and mock data integration.

## Base URL
- Development: `http://localhost:4000/api`
- Production: `https://xpress-ops-tower.vercel.app/api`

## Authentication
Currently using demo mode with mock data. In production, all endpoints would require proper authentication tokens.

## Common Response Format
All API responses follow a consistent format:

```typescript
{
  success: boolean;
  data: T;
  message?: string;
  timestamp: Date;
  requestId: string;
}
```

Error responses include:
```typescript
{
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  timestamp: Date;
  requestId: string;
  path: string;
  method: string;
}
```

## Endpoints

### 1. Health Check
**GET** `/api/health`
- Returns system health status and service availability
- No authentication required
- Response includes version, uptime, and service status

### 2. Driver Management
**GET** `/api/drivers`
- List all drivers with filtering and pagination
- Filters: `status`, `region`, `search`, `services`
- Pagination: `page`, `limit`, `sortBy`, `sortOrder`

**POST** `/api/drivers`
- Create a new driver
- Required fields: `driverCode`, `firstName`, `lastName`, `phone`, `address`, `regionId`, `services`, `primaryService`

**GET** `/api/drivers/[id]`
- Get driver by ID
- Returns full driver details

**PUT** `/api/drivers/[id]`
- Update driver (full replacement)
- Validates service assignments and status transitions

**PATCH** `/api/drivers/[id]`
- Partial driver update
- Only updates provided fields

**DELETE** `/api/drivers/[id]`
- Delete driver
- Prevents deletion if driver has active bookings

### 3. Booking Management
**GET** `/api/bookings`
- List all bookings with filtering and pagination
- Filters: `status`, `serviceType`, `driverId`, `customerId`, `regionId`, `createdFrom`, `createdTo`
- Includes booking summary statistics

**POST** `/api/bookings`
- Create a new booking
- Required fields: `serviceType`, `customerId`, `customerInfo`, `pickupLocation`, `pickupAddress`, `regionId`
- Validates delivery-specific requirements

**GET** `/api/bookings/[id]`
- Get booking by ID
- Includes driver and location details if assigned

**PATCH** `/api/bookings/[id]`
- Update booking status and details
- Validates status transitions (requested → searching → assigned → accepted → en_route → arrived → in_progress → completed)
- Handles driver status updates

**DELETE** `/api/bookings/[id]`
- Cancel booking
- Only allows cancellation of bookings in cancellable states

### 4. Real-time Location Tracking
**GET** `/api/locations`
- Get driver locations with filtering
- Filters: `regionId`, `isAvailable`, `status`, `bounds` (for map viewport)
- Includes driver details and location summary

**POST** `/api/locations`
- Update driver location
- Required fields: `driverId`, `latitude`, `longitude`, `timestamp`
- Validates coordinates and performs geofencing checks

### 5. Analytics Dashboard
**GET** `/api/analytics`
- Get KPI metrics and performance data
- Query params: `timeRange` (1h, 24h, 7d, 30d), `regionId`
- Returns real-time metrics, temporal data, and regional comparisons
- Includes alerts for threshold violations

### 6. Emergency/SOS Alerts
**GET** `/api/alerts`
- List alerts/incidents with filtering and pagination
- Filters: `priority`, `status`, `regionId`, `driverId`, `incidentType`, `createdFrom`, `createdTo`
- Sorts by priority (critical first) and creation time
- Includes response time statistics

**POST** `/api/alerts`
- Create new alert/incident
- Required fields: `priority`, `incidentType`, `reporterType`, `reporterId`, `title`, `description`
- Critical incidents trigger immediate notifications
- Updates driver status for emergency situations

**GET** `/api/alerts/[id]`
- Get alert by ID
- Includes related driver, booking, and location data

**PATCH** `/api/alerts/[id]`
- Update alert status and details
- Validates status transitions (open → acknowledged → in_progress → resolved → closed)
- Handles escalation and resolution workflows

**DELETE** `/api/alerts/[id]`
- Close/archive resolved alert
- Only allows closing of resolved incidents

## Service Types Supported
- `ride_4w` - 4-wheel ride service
- `ride_2w` - 2-wheel ride service  
- `send_delivery` - Package delivery
- `eats_delivery` - Food delivery
- `mart_delivery` - Grocery delivery

## Driver Status Types
- `active` - Available for bookings
- `busy` - On an active trip/delivery
- `offline` - Not accepting bookings
- `break` - On scheduled break
- `maintenance` - Vehicle maintenance
- `suspended` - Account suspended
- `emergency` - In emergency/SOS situation

## Booking Status Flow
1. `requested` - Customer requested
2. `searching` - Looking for driver
3. `assigned` - Driver assigned
4. `accepted` - Driver accepted
5. `en_route` - Driver heading to pickup
6. `arrived` - Driver at pickup location
7. `in_progress` - Trip/delivery in progress
8. `completed` - Successfully completed
9. `cancelled` - Cancelled by customer/driver
10. `failed` - Failed to complete
11. `no_show` - Customer/merchant no-show

## Incident Priority Levels
- `critical` - Life-threatening, <30s response (SOS alerts)
- `high` - Safety concern, <60s response
- `medium` - Service issue, <5min response
- `low` - General inquiry, <30min response

## Error Codes
- `VALIDATION_ERROR` - Request validation failed
- `NOT_FOUND` - Resource not found
- `UNAUTHORIZED` - Authentication required
- `RATE_LIMIT_EXCEEDED` - Too many requests
- `METHOD_NOT_ALLOWED` - HTTP method not supported
- `INTERNAL_ERROR` - Server error
- `DUPLICATE_DRIVER_CODE` - Driver code already exists
- `DRIVER_HAS_ACTIVE_BOOKINGS` - Cannot delete driver with active bookings
- `INVALID_STATUS_TRANSITION` - Invalid status change
- `DRIVER_NOT_AVAILABLE` - Driver not available for assignment

## CORS Support
All endpoints support CORS with the following headers:
- `Access-Control-Allow-Origin: *`
- `Access-Control-Allow-Methods: GET, POST, PUT, DELETE, PATCH, OPTIONS`
- `Access-Control-Allow-Headers: Content-Type, Authorization`

## Rate Limiting
Basic rate limiting is implemented:
- 100 requests per minute per IP
- Rate limit headers included in responses

## Mock Data Features
- 2 sample drivers in Metro Manila region
- 2 sample bookings (one completed, one in progress)
- 2 sample incidents (one critical SOS, one resolved complaint)
- Real-time location tracking data
- Performance metrics and analytics
- Regional data for Philippines locations

## Production Considerations
When deployed to production:
1. Replace mock data services with actual database integration
2. Implement proper authentication and authorization
3. Add request logging and monitoring
4. Configure production rate limits
5. Set up real-time WebSocket connections for location tracking
6. Integrate with actual emergency services for critical alerts
7. Add data validation and sanitization
8. Implement proper CORS policies for specific domains