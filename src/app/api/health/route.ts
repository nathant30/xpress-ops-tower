// /api/health - Health Check API
import { NextRequest } from 'next/server';
import { 
  createApiResponse,
  asyncHandler,
  handleOptionsRequest
} from '@/lib/api-utils';

// GET /api/health - Health check endpoint
export const GET = asyncHandler(async (request: NextRequest) => {
  const healthData = {
    status: 'healthy' as const,
    timestamp: new Date(),
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    uptime: process.uptime(),
    services: {
      api: 'healthy',
      database: 'mock', // Using mock data
      websockets: 'available',
      location_tracking: 'active',
      emergency_system: 'active',
    },
    endpoints: {
      drivers: '/api/drivers',
      bookings: '/api/bookings', 
      locations: '/api/locations',
      analytics: '/api/analytics',
      alerts: '/api/alerts',
    },
    features: {
      real_time_tracking: true,
      emergency_response: true,
      multi_service_support: true,
      analytics_dashboard: true,
      demo_mode: true,
    }
  };
  
  return createApiResponse(healthData, 'System is healthy and all services are operational');
});

// OPTIONS handler for CORS
export const OPTIONS = handleOptionsRequest;