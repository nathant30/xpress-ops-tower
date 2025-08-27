// Analytics and KPI Dashboard API Routes
// GET /api/analytics - Get comprehensive dashboard metrics and KPIs

import { NextRequest } from 'next/server';
import { withAuthAndRateLimit, AuthPayload } from '@/lib/auth';
import { db } from '@/lib/database';
import { redis } from '@/lib/redis';
import { ErrorFactory, formatSuccessResponse, handleApiError } from '@/lib/errors';
import { parseQuery, AnalyticsQuerySchema } from '@/lib/validation';

interface KPIMetrics {
  realTimeMetrics: {
    activeDrivers: number;
    availableDrivers: number;
    activeBookings: number;
    pendingRequests: number;
    emergencyIncidents: number;
    systemUptime: number;
  };
  performanceMetrics: {
    averageResponseTime: number;
    bookingFulfillmentRate: number;
    driverUtilizationRate: number;
    customerSatisfactionScore: number;
    averageWaitTime: number;
    completionRate: number;
  };
  operationalMetrics: {
    totalTripsToday: number;
    totalEarningsToday: number;
    hourlyBookingTrend: Array<{ hour: number; count: number; }>;
    serviceTypeDistribution: Array<{ serviceType: string; count: number; percentage: number; }>;
    topPerformingDrivers: Array<{ driverId: string; name: string; trips: number; rating: number; }>;
    regionPerformance: Array<{ regionId: string; name: string; activeDrivers: number; bookings: number; }>;
  };
  trends: {
    bookingsLast7Days: Array<{ date: string; count: number; }>;
    driverOnlineHoursLast7Days: Array<{ date: string; hours: number; }>;
    incidentsTrend: Array<{ date: string; count: number; priority: string; }>;
  };
}

// Helper function to get real-time metrics
async function getRealTimeMetrics(regionId?: string): Promise<KPIMetrics['realTimeMetrics']> {
  const whereClause = regionId ? 'AND d.region_id = $1' : '';
  const params = regionId ? [regionId] : [];
  
  const queries = await Promise.all([
    // Active drivers count
    db.query(
      `SELECT COUNT(*) as count 
       FROM drivers d 
       WHERE d.is_active = TRUE 
       AND d.status IN ('active', 'busy') ${whereClause}`,
      params
    ),
    
    // Available drivers count
    db.query(
      `SELECT COUNT(*) as count 
       FROM drivers d 
       WHERE d.is_active = TRUE 
       AND d.status = 'active' ${whereClause}`,
      params
    ),
    
    // Active bookings count
    db.query(
      `SELECT COUNT(*) as count 
       FROM bookings b 
       WHERE b.status IN ('assigned', 'accepted', 'en_route', 'arrived', 'in_progress')
       ${regionId ? 'AND b.region_id = $1' : ''}`,
      params
    ),
    
    // Pending requests count
    db.query(
      `SELECT COUNT(*) as count 
       FROM bookings b 
       WHERE b.status IN ('requested', 'searching')
       ${regionId ? 'AND b.region_id = $1' : ''}`,
      params
    ),
    
    // Emergency incidents count
    db.query(
      `SELECT COUNT(*) as count 
       FROM incidents i 
       WHERE i.status IN ('open', 'acknowledged', 'in_progress') 
       AND i.priority = 'critical'
       ${regionId ? 'AND i.region_id = $1' : ''}`,
      params
    )
  ]);

  return {
    activeDrivers: parseInt(queries[0].rows[0]?.count || '0'),
    availableDrivers: parseInt(queries[1].rows[0]?.count || '0'),
    activeBookings: parseInt(queries[2].rows[0]?.count || '0'),
    pendingRequests: parseInt(queries[3].rows[0]?.count || '0'),
    emergencyIncidents: parseInt(queries[4].rows[0]?.count || '0'),
    systemUptime: 99.9 // TODO: Calculate from system health monitoring
  };
}

// Helper function to get performance metrics
async function getPerformanceMetrics(regionId?: string): Promise<KPIMetrics['performanceMetrics']> {
  const whereClause = regionId ? 'AND b.region_id = $1' : '';
  const params = regionId ? [regionId] : [];
  
  const queries = await Promise.all([
    // Average response time for bookings assigned today
    db.query(
      `SELECT AVG(EXTRACT(EPOCH FROM (assigned_at - requested_at))) as avg_response_time
       FROM bookings b
       WHERE b.assigned_at IS NOT NULL 
       AND b.requested_at >= CURRENT_DATE
       ${whereClause}`,
      params
    ),
    
    // Booking fulfillment rate (assigned vs requested) for today
    db.query(
      `SELECT 
         COUNT(*) FILTER (WHERE status NOT IN ('cancelled', 'failed', 'no_show')) as fulfilled,
         COUNT(*) as total
       FROM bookings b
       WHERE b.requested_at >= CURRENT_DATE
       ${whereClause}`,
      params
    ),
    
    // Driver utilization rate (busy vs active time)
    db.query(
      `SELECT 
         AVG(COALESCE(driving_hours / NULLIF(online_hours, 0), 0)) as utilization_rate
       FROM driver_performance_daily dpd
       JOIN drivers d ON dpd.driver_id = d.id
       WHERE dpd.performance_date = CURRENT_DATE
       ${regionId ? 'AND d.region_id = $1' : ''}`,
      params
    ),
    
    // Average customer rating for completed trips today
    db.query(
      `SELECT AVG(customer_rating) as avg_rating
       FROM bookings b
       WHERE b.status = 'completed' 
       AND b.completed_at >= CURRENT_DATE
       AND b.customer_rating IS NOT NULL
       ${whereClause}`,
      params
    ),
    
    // Average wait time for bookings assigned today (in minutes)
    db.query(
      `SELECT AVG(EXTRACT(EPOCH FROM (assigned_at - requested_at)) / 60) as avg_wait_time
       FROM bookings b
       WHERE b.assigned_at IS NOT NULL 
       AND b.requested_at >= CURRENT_DATE
       ${whereClause}`,
      params
    ),
    
    // Completion rate for bookings requested today
    db.query(
      `SELECT 
         COUNT(*) FILTER (WHERE status = 'completed') as completed,
         COUNT(*) FILTER (WHERE status NOT IN ('requested', 'searching', 'assigned', 'accepted', 'en_route', 'arrived', 'in_progress')) as total_finished
       FROM bookings b
       WHERE b.requested_at >= CURRENT_DATE
       ${whereClause}`,
      params
    )
  ]);

  const responseTime = parseFloat(queries[0].rows[0]?.avg_response_time || '0');
  const fulfilled = parseInt(queries[1].rows[0]?.fulfilled || '0');
  const totalRequests = parseInt(queries[1].rows[0]?.total || '0');
  const utilizationRate = parseFloat(queries[2].rows[0]?.utilization_rate || '0');
  const avgRating = parseFloat(queries[3].rows[0]?.avg_rating || '0');
  const avgWaitTime = parseFloat(queries[4].rows[0]?.avg_wait_time || '0');
  const completed = parseInt(queries[5].rows[0]?.completed || '0');
  const totalFinished = parseInt(queries[5].rows[0]?.total_finished || '0');

  return {
    averageResponseTime: Math.round(responseTime), // seconds
    bookingFulfillmentRate: totalRequests > 0 ? Math.round((fulfilled / totalRequests) * 100) : 0,
    driverUtilizationRate: Math.round(utilizationRate * 100),
    customerSatisfactionScore: Math.round(avgRating * 10) / 10,
    averageWaitTime: Math.round(avgWaitTime * 10) / 10, // minutes
    completionRate: totalFinished > 0 ? Math.round((completed / totalFinished) * 100) : 0
  };
}

// Helper function to get operational metrics
async function getOperationalMetrics(regionId?: string): Promise<KPIMetrics['operationalMetrics']> {
  const whereClause = regionId ? 'AND region_id = $1' : '';
  const driverWhereClause = regionId ? 'AND d.region_id = $1' : '';
  const params = regionId ? [regionId] : [];
  
  const queries = await Promise.all([
    // Total trips completed today
    db.query(
      `SELECT COUNT(*) as count 
       FROM bookings 
       WHERE status = 'completed' 
       AND completed_at >= CURRENT_DATE ${whereClause}`,
      params
    ),
    
    // Total earnings today (sum of base_fare for completed bookings)
    db.query(
      `SELECT COALESCE(SUM(total_fare), 0) as total_earnings
       FROM bookings 
       WHERE status = 'completed' 
       AND completed_at >= CURRENT_DATE ${whereClause}`,
      params
    ),
    
    // Hourly booking trend for today
    db.query(
      `SELECT 
         EXTRACT(HOUR FROM requested_at) as hour,
         COUNT(*) as count
       FROM bookings 
       WHERE requested_at >= CURRENT_DATE 
       AND requested_at < CURRENT_DATE + INTERVAL '1 day' ${whereClause}
       GROUP BY EXTRACT(HOUR FROM requested_at)
       ORDER BY hour`,
      params
    ),
    
    // Service type distribution for today
    db.query(
      `SELECT 
         service_type,
         COUNT(*) as count,
         ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as percentage
       FROM bookings 
       WHERE requested_at >= CURRENT_DATE ${whereClause}
       GROUP BY service_type
       ORDER BY count DESC`,
      params
    ),
    
    // Top performing drivers today (by completed trips)
    db.query(
      `SELECT 
         d.id as driver_id,
         CONCAT(d.first_name, ' ', d.last_name) as name,
         COUNT(b.id) as trips,
         d.rating
       FROM drivers d
       LEFT JOIN bookings b ON d.id = b.driver_id 
         AND b.status = 'completed' 
         AND b.completed_at >= CURRENT_DATE
       WHERE d.is_active = TRUE ${driverWhereClause}
       GROUP BY d.id, d.first_name, d.last_name, d.rating
       HAVING COUNT(b.id) > 0
       ORDER BY trips DESC, d.rating DESC
       LIMIT 10`,
      params
    ),
    
    // Region performance (if no specific region requested)
    !regionId ? db.query(
      `SELECT 
         r.id as region_id,
         r.name,
         COUNT(DISTINCT d.id) FILTER (WHERE d.status IN ('active', 'busy')) as active_drivers,
         COUNT(DISTINCT b.id) FILTER (WHERE b.requested_at >= CURRENT_DATE) as bookings
       FROM regions r
       LEFT JOIN drivers d ON r.id = d.region_id AND d.is_active = TRUE
       LEFT JOIN bookings b ON r.id = b.region_id
       WHERE r.status = 'active'
       GROUP BY r.id, r.name
       ORDER BY active_drivers DESC, bookings DESC`
    ) : Promise.resolve({ rows: [] })
  ]);

  return {
    totalTripsToday: parseInt(queries[0].rows[0]?.count || '0'),
    totalEarningsToday: parseFloat(queries[1].rows[0]?.total_earnings || '0'),
    hourlyBookingTrend: queries[2].rows.map(row => ({
      hour: parseInt(row.hour),
      count: parseInt(row.count)
    })),
    serviceTypeDistribution: queries[3].rows.map(row => ({
      serviceType: row.service_type,
      count: parseInt(row.count),
      percentage: parseFloat(row.percentage)
    })),
    topPerformingDrivers: queries[4].rows.map(row => ({
      driverId: row.driver_id,
      name: row.name,
      trips: parseInt(row.trips),
      rating: parseFloat(row.rating)
    })),
    regionPerformance: queries[5].rows.map(row => ({
      regionId: row.region_id,
      name: row.name,
      activeDrivers: parseInt(row.active_drivers),
      bookings: parseInt(row.bookings)
    }))
  };
}

// Helper function to get trend data
async function getTrends(regionId?: string): Promise<KPIMetrics['trends']> {
  const whereClause = regionId ? 'AND region_id = $1' : '';
  const params = regionId ? [regionId] : [];
  
  const queries = await Promise.all([
    // Bookings last 7 days
    db.query(
      `SELECT 
         DATE(requested_at) as date,
         COUNT(*) as count
       FROM bookings 
       WHERE requested_at >= CURRENT_DATE - INTERVAL '7 days' ${whereClause}
       GROUP BY DATE(requested_at)
       ORDER BY date`,
      params
    ),
    
    // Driver online hours last 7 days
    db.query(
      `SELECT 
         dpd.performance_date as date,
         SUM(dpd.online_hours) as hours
       FROM driver_performance_daily dpd
       JOIN drivers d ON dpd.driver_id = d.id
       WHERE dpd.performance_date >= CURRENT_DATE - INTERVAL '7 days'
       ${regionId ? 'AND d.region_id = $1' : ''}
       GROUP BY dpd.performance_date
       ORDER BY dpd.performance_date`,
      params
    ),
    
    // Incidents trend by priority last 7 days
    db.query(
      `SELECT 
         DATE(created_at) as date,
         priority,
         COUNT(*) as count
       FROM incidents 
       WHERE created_at >= CURRENT_DATE - INTERVAL '7 days' ${whereClause}
       GROUP BY DATE(created_at), priority
       ORDER BY date, priority`,
      params
    )
  ]);

  return {
    bookingsLast7Days: queries[0].rows.map(row => ({
      date: row.date,
      count: parseInt(row.count)
    })),
    driverOnlineHoursLast7Days: queries[1].rows.map(row => ({
      date: row.date,
      hours: parseFloat(row.hours)
    })),
    incidentsTrend: queries[2].rows.map(row => ({
      date: row.date,
      count: parseInt(row.count),
      priority: row.priority
    }))
  };
}

// GET /api/analytics - Get comprehensive dashboard metrics
export const GET = handleApiError(
  withAuthAndRateLimit(
    async (req: NextRequest, user: AuthPayload) => {
      const url = new URL(req.url);
      const query = parseQuery(AnalyticsQuerySchema, url.searchParams);
      
      // Regional access control
      const regionId = user.role === 'admin' ? query.regionId : user.regionId;
      
      // Try cache first (cache analytics for 2 minutes)
      const cacheKey = `analytics:dashboard:${regionId || 'all'}:${query.timeRange || '24h'}`;
      const cachedResult = await redis.getCache<KPIMetrics>(cacheKey);
      
      if (cachedResult && !query.forceRefresh) {
        return formatSuccessResponse(cachedResult, 'Analytics retrieved successfully', {
          cached: true,
          generatedAt: new Date().toISOString(),
          regionId
        });
      }
      
      // Gather all metrics in parallel for performance
      const [realTimeMetrics, performanceMetrics, operationalMetrics, trends] = await Promise.all([
        getRealTimeMetrics(regionId),
        getPerformanceMetrics(regionId),
        getOperationalMetrics(regionId),
        getTrends(regionId)
      ]);
      
      const analyticsData: KPIMetrics = {
        realTimeMetrics,
        performanceMetrics,
        operationalMetrics,
        trends
      };
      
      // Cache the result for 2 minutes
      await redis.setCache(cacheKey, analyticsData, 120, [
        'analytics', 
        'dashboard', 
        regionId ? `region:${regionId}` : 'global'
      ]);
      
      return formatSuccessResponse(analyticsData, 'Analytics retrieved successfully', {
        cached: false,
        generatedAt: new Date().toISOString(),
        regionId,
        dataFreshness: '2 minutes',
        metrics: {
          realTimeMetrics: Object.keys(realTimeMetrics).length,
          performanceMetrics: Object.keys(performanceMetrics).length,
          operationalDataPoints: operationalMetrics.hourlyBookingTrend.length,
          trendDataPoints: trends.bookingsLast7Days.length
        }
      });
    },
    ['analytics:read'],
    { limit: 100, windowSeconds: 3600 }
  )
);