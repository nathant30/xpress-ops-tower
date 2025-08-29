// /api/analytics - KPI Dashboard Analytics API
import { NextRequest } from 'next/server';
import { 
  createApiResponse, 
  createApiError,
  parseQueryParams,
  asyncHandler,
  handleOptionsRequest
} from '@/lib/api-utils';
import { withAuthAndRateLimit } from '@/lib/auth';
import { MockDataService } from '@/lib/mockData';

// GET /api/analytics - Get performance metrics and KPIs
export const GET = withAuthAndRateLimit(async (request: NextRequest, user) => {
  // Check if user has analytics:read permission
  if (!user.permissions.includes('analytics:read')) {
    return createApiError(
      'Insufficient permissions to view analytics',
      'PERMISSION_DENIED',
      403,
      { requiredPermission: 'analytics:read' },
      '/api/analytics',
      'GET'
    );
  }
  const queryParams = parseQueryParams(request);
  const timeRange = queryParams.timeRange || '24h';
  let regionId = queryParams.regionId;
  
  // Apply regional filtering for non-admin users
  if (user.role !== 'admin' && user.regionId) {
    regionId = user.regionId;
  }
  
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

  // Enhanced KPI calculations for ridesharing operations
  const rideshareKPIs = calculateRideshareKPIs(allBookings, allDrivers, allIncidents);
  
  // Service performance comparison
  const servicePerformance = calculateServicePerformance(allBookings);
  
  // Peak hours analysis
  const peakHoursAnalysis = calculatePeakHours(allBookings);
  
  // Geographic distribution analysis
  const geoDistribution = calculateGeographicDistribution(allBookings, allDrivers);
  
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
    rideshareKPIs,
    servicePerformance,
    peakHours: peakHoursAnalysis,
    geoDistribution,
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
      // Enhanced alerts from rideshare KPIs
      longWaitTimes: rideshareKPIs.averageWaitTime > 300, // > 5 minutes
      lowDriverOnlineTime: rideshareKPIs.averageDriverOnlineTime < 8, // < 8 hours
      surgeNeeded: rideshareKPIs.demandSupplyRatio > 1.5,
    },
    lastUpdated: new Date(),
    userRegion: regionId,
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

// Enhanced KPI calculation functions
function calculateRideshareKPIs(bookings: any[], drivers: any[], incidents: any[]) {
  const completedBookings = bookings.filter(b => b.status === 'completed');
  const activeBookings = bookings.filter(b => 
    ['requested', 'searching', 'assigned', 'accepted', 'en_route', 'arrived', 'in_progress'].includes(b.status)
  );

  // Calculate wait times (mock realistic data)
  const averageWaitTime = completedBookings.length > 0 ? 
    completedBookings.reduce((sum, b) => {
      const waitTime = b.assignedAt ? 
        new Date(b.assignedAt).getTime() - new Date(b.requestedAt).getTime() : 
        Math.random() * 600000; // 0-10 minutes mock
      return sum + waitTime;
    }, 0) / completedBookings.length / 1000 : 0; // Convert to seconds

  // Driver performance metrics
  const averageDriverOnlineTime = drivers.length > 0 ? 
    drivers.reduce((sum, d) => sum + (Math.random() * 8 + 4), 0) / drivers.length : 0; // 4-12 hours mock
  
  // Demand-supply ratio
  const demandSupplyRatio = drivers.filter(d => d.status === 'active').length > 0 ? 
    activeBookings.length / drivers.filter(d => d.status === 'active').length : 0;

  // Trip efficiency metrics
  const averageTripDuration = completedBookings.length > 0 ?
    completedBookings.reduce((sum, b) => {
      const duration = b.completedAt && b.acceptedAt ?
        new Date(b.completedAt).getTime() - new Date(b.acceptedAt).getTime() :
        Math.random() * 1800000; // 0-30 minutes mock
      return sum + duration;
    }, 0) / completedBookings.length / 1000 / 60 : 0; // Convert to minutes

  // Revenue metrics (mock calculation)
  const totalRevenue = completedBookings.length * 150; // Average ₱150 per trip
  const revenuePerDriver = drivers.length > 0 ? totalRevenue / drivers.length : 0;

  return {
    averageWaitTime: Math.round(averageWaitTime),
    averageDriverOnlineTime: Math.round(averageDriverOnlineTime * 100) / 100,
    demandSupplyRatio: Math.round(demandSupplyRatio * 100) / 100,
    averageTripDuration: Math.round(averageTripDuration),
    totalRevenue,
    revenuePerDriver: Math.round(revenuePerDriver),
    completionRate: bookings.length > 0 ? Math.round((completedBookings.length / bookings.length) * 100) : 0,
    cancellationRate: bookings.length > 0 ? Math.round((bookings.filter(b => b.status === 'cancelled').length / bookings.length) * 100) : 0,
  };
}

function calculateServicePerformance(bookings: any[]) {
  const services = ['ride_4w', 'ride_2w', 'send_delivery', 'eats_delivery', 'mart_delivery'];
  
  return services.map(service => {
    const serviceBookings = bookings.filter(b => b.serviceType === service);
    const completedBookings = serviceBookings.filter(b => b.status === 'completed');
    
    return {
      service,
      totalBookings: serviceBookings.length,
      completedBookings: completedBookings.length,
      completionRate: serviceBookings.length > 0 ? 
        Math.round((completedBookings.length / serviceBookings.length) * 100) : 0,
      averageRating: Math.random() * 1 + 4, // Mock 4-5 rating
      revenue: completedBookings.length * (service.includes('delivery') ? 80 : 150), // Different pricing
    };
  });
}

function calculatePeakHours(bookings: any[]) {
  const hourlyStats = Array.from({ length: 24 }, (_, hour) => ({
    hour,
    bookings: 0,
    completedBookings: 0,
    averageWaitTime: 0,
  }));

  // Simulate realistic peak hours data
  const peakHours = [7, 8, 9, 17, 18, 19, 20]; // Rush hours
  
  hourlyStats.forEach((stat, index) => {
    const isPeak = peakHours.includes(index);
    stat.bookings = Math.floor(Math.random() * (isPeak ? 100 : 50)) + (isPeak ? 50 : 10);
    stat.completedBookings = Math.floor(stat.bookings * (0.8 + Math.random() * 0.15));
    stat.averageWaitTime = Math.floor(Math.random() * (isPeak ? 600 : 300)) + (isPeak ? 300 : 120);
  });

  return {
    hourlyStats,
    peakHours: peakHours.map(hour => ({
      hour,
      label: `${hour}:00 - ${hour + 1}:00`,
      multiplier: 1.2 + Math.random() * 0.8, // Surge multiplier
    })),
  };
}

function calculateGeographicDistribution(bookings: any[], drivers: any[]) {
  // Mock geographic distribution for Philippine regions
  const regions = [
    { id: 'reg-001', name: 'Metro Manila', bookings: 0, drivers: 0, coverage: 0 },
    { id: 'reg-002', name: 'Cebu City', bookings: 0, drivers: 0, coverage: 0 },
    { id: 'reg-003', name: 'Davao City', bookings: 0, drivers: 0, coverage: 0 },
  ];

  regions.forEach(region => {
    region.bookings = bookings.filter(b => b.regionId === region.id).length;
    region.drivers = drivers.filter(d => d.regionId === region.id).length;
    region.coverage = region.drivers > 0 ? Math.min(100, (region.drivers / 50) * 100) : 0; // Coverage based on driver density
  });

  return {
    regions,
    totalCoverage: regions.reduce((sum, r) => sum + r.coverage, 0) / regions.length,
    bestPerforming: regions.reduce((best, current) => 
      current.coverage > best.coverage ? current : best, regions[0]),
  };
}

// OPTIONS handler for CORS
export const OPTIONS = handleOptionsRequest;