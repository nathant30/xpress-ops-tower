// /api/analytics - KPI Dashboard Analytics API
import { NextRequest } from 'next/server';
import { 
  createApiResponse, 
  parseQueryParams,
  asyncHandler,
  handleOptionsRequest
} from '@/lib/api-utils';
import { MockDataService } from '@/lib/mockData';

// GET /api/analytics - Get performance metrics and KPIs
export const GET = asyncHandler(async (request: NextRequest) => {
  const queryParams = parseQueryParams(request);
  const timeRange = queryParams.timeRange || '24h';
  const regionId = queryParams.regionId;
  
  // Get base performance metrics
  const baseMetrics = MockDataService.getPerformanceMetrics();
  
  // Get regional metrics if specific region requested
  const regionalMetrics = regionId ? 
    MockDataService.getRegionalMetrics().find(r => r.regionId === regionId) :
    null;
  
  // Calculate time-based variations (mock implementation)
  const timeVariations = generateTimeBasedMetrics(timeRange as string);
  
  // Get current data for calculations
  const allDrivers = MockDataService.getDrivers();
  const allBookings = MockDataService.getBookings();
  const allIncidents = MockDataService.getIncidents();
  const allLocations = MockDataService.getDriverLocations();
  
  // Calculate real-time metrics
  const realTimeMetrics = {
    // Driver metrics
    totalDrivers: allDrivers.length,
    activeDrivers: allDrivers.filter(d => d.status === 'active').length,
    busyDrivers: allDrivers.filter(d => d.status === 'busy').length,
    offlineDrivers: allDrivers.filter(d => d.status === 'offline').length,
    
    // Booking metrics
    totalBookings: allBookings.length,
    activeBookings: allBookings.filter(b => 
      ['requested', 'searching', 'assigned', 'accepted', 'en_route', 'arrived', 'in_progress'].includes(b.status)
    ).length,
    completedBookings: allBookings.filter(b => b.status === 'completed').length,
    cancelledBookings: allBookings.filter(b => b.status === 'cancelled').length,
    
    // Service type breakdown
    serviceBreakdown: {
      ride_4w: allBookings.filter(b => b.serviceType === 'ride_4w').length,
      ride_2w: allBookings.filter(b => b.serviceType === 'ride_2w').length,
      send_delivery: allBookings.filter(b => b.serviceType === 'send_delivery').length,
      eats_delivery: allBookings.filter(b => b.serviceType === 'eats_delivery').length,
      mart_delivery: allBookings.filter(b => b.serviceType === 'mart_delivery').length,
    },
    
    // Incident metrics
    totalIncidents: allIncidents.length,
    criticalIncidents: allIncidents.filter(i => i.priority === 'critical').length,
    openIncidents: allIncidents.filter(i => ['open', 'acknowledged', 'in_progress'].includes(i.status)).length,
    resolvedIncidents: allIncidents.filter(i => i.status === 'resolved').length,
    
    // Location tracking metrics
    trackingCoverage: allLocations.length,
    recentUpdates: allLocations.filter(l => 
      new Date().getTime() - new Date(l.recordedAt).getTime() < 5 * 60 * 1000 // Last 5 minutes
    ).length,
  };
  
  // Calculate derived metrics
  const derivedMetrics = {
    driverUtilization: realTimeMetrics.totalDrivers > 0 ? 
      (realTimeMetrics.busyDrivers / realTimeMetrics.totalDrivers) * 100 : 0,
    
    bookingFulfillmentRate: realTimeMetrics.totalBookings > 0 ? 
      (realTimeMetrics.completedBookings / realTimeMetrics.totalBookings) * 100 : 0,
    
    incidentResolutionRate: realTimeMetrics.totalIncidents > 0 ? 
      (realTimeMetrics.resolvedIncidents / realTimeMetrics.totalIncidents) * 100 : 0,
    
    averageResponseTime: calculateAverageResponseTime(allBookings),
    averageRating: calculateAverageRating(allDrivers),
    
    locationTrackingHealth: allDrivers.length > 0 ? 
      (realTimeMetrics.recentUpdates / allDrivers.length) * 100 : 0,
  };
  
  // Generate hourly data for charts (last 24 hours)
  const hourlyData = generateHourlyChartData();
  
  // Generate regional comparison
  const regionalComparison = MockDataService.getRegionalMetrics();
  
  return createApiResponse({
    metrics: {
      ...baseMetrics,
      ...realTimeMetrics,
      ...derivedMetrics,
    },
    regional: regionalMetrics || {
      summary: regionalComparison,
      selected: regionId || null,
    },
    temporal: {
      timeRange,
      variations: timeVariations,
      hourlyData,
    },
    alerts: {
      lowDriverUtilization: derivedMetrics.driverUtilization < 60,
      highIncidentRate: realTimeMetrics.criticalIncidents > 5,
      lowFulfillmentRate: derivedMetrics.bookingFulfillmentRate < 85,
      locationTrackingIssues: derivedMetrics.locationTrackingHealth < 80,
    },
    lastUpdated: new Date(),
  }, 'Analytics data retrieved successfully');
});

// Helper functions
function generateTimeBasedMetrics(timeRange: string) {
  // Mock time-based variations
  const variations = {
    '1h': { bookings: 95, drivers: 102, incidents: 88 },
    '24h': { bookings: 87, drivers: 94, incidents: 110 },
    '7d': { bookings: 112, drivers: 89, incidents: 95 },
    '30d': { bookings: 98, drivers: 107, incidents: 92 },
  };
  
  return variations[timeRange as keyof typeof variations] || variations['24h'];
}

function calculateAverageResponseTime(bookings: any[]): number {
  const completedBookings = bookings.filter(b => b.completedAt && b.requestedAt);
  if (completedBookings.length === 0) return 0;
  
  const totalResponseTime = completedBookings.reduce((sum, booking) => {
    const responseTime = new Date(booking.assignedAt || booking.acceptedAt || booking.completedAt).getTime() - 
                        new Date(booking.requestedAt).getTime();
    return sum + responseTime;
  }, 0);
  
  return Math.round(totalResponseTime / completedBookings.length / 1000); // Return in seconds
}

function calculateAverageRating(drivers: any[]): number {
  const ratedDrivers = drivers.filter(d => d.rating > 0);
  if (ratedDrivers.length === 0) return 0;
  
  const totalRating = ratedDrivers.reduce((sum, driver) => sum + driver.rating, 0);
  return Math.round((totalRating / ratedDrivers.length) * 100) / 100; // Round to 2 decimal places
}

function generateHourlyChartData() {
  const hours = [];
  const now = new Date();
  
  // Generate last 24 hours of mock data
  for (let i = 23; i >= 0; i--) {
    const hour = new Date(now.getTime() - i * 60 * 60 * 1000);
    hours.push({
      hour: hour.getHours(),
      timestamp: hour.toISOString(),
      bookings: Math.floor(Math.random() * 100) + 20, // 20-120 bookings per hour
      drivers: Math.floor(Math.random() * 50) + 30,   // 30-80 active drivers
      incidents: Math.floor(Math.random() * 5),       // 0-5 incidents per hour
      fulfillmentRate: Math.floor(Math.random() * 20) + 80, // 80-100% fulfillment
    });
  }
  
  return hours;
}

// OPTIONS handler for CORS
export const OPTIONS = handleOptionsRequest;