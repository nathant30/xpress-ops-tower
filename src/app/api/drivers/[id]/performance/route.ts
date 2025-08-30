// /api/drivers/[id]/performance - Driver analytics and ratings
// Comprehensive driver performance metrics and analytics

import { NextRequest } from 'next/server';
import { logger } from '@/lib/security/productionLogger';
import { 
  createApiResponse, 
  createApiError,
  parseQueryParams,
  asyncHandler,
  handleOptionsRequest
} from '@/lib/api-utils';
import { getDatabase } from '@/lib/database';
import { redis } from '@/lib/redis';

const db = getDatabase();

// GET /api/drivers/[id]/performance - Get comprehensive driver performance metrics
export const GET = asyncHandler(async (request: NextRequest, { params }: { params: { id: string } }) => {
  const driverId = params.id;
  const queryParams = parseQueryParams(request);

  try {
    // Parse time range parameters
    const timeframe = queryParams.timeframe || '30d'; // 7d, 30d, 90d, 1y
    const includeComparisons = queryParams.includeComparisons === 'true';
    
    // Check Redis cache
    const cacheKey = `driver_performance:${driverId}:${timeframe}:${includeComparisons}`;
    const cached = await redis.get(cacheKey);
    
    if (cached && !queryParams.force) {
      return createApiResponse(JSON.parse(cached), 'Driver performance retrieved from cache');
    }

    // Verify driver exists
    const driverQuery = `
      SELECT d.*, r.name as region_name, r.code as region_code
      FROM drivers d
      LEFT JOIN regions r ON d.region_id = r.id
      WHERE d.id = $1
    `;
    
    const driverResult = await db.query(driverQuery, [driverId]);
    
    if (driverResult.rows.length === 0) {
      return createApiError('Driver not found', 'DRIVER_NOT_FOUND', 404, {}, `/api/drivers/${driverId}/performance`, 'GET');
    }
    
    const driver = driverResult.rows[0];

    // Determine date range
    const intervals = {
      '7d': 7,
      '30d': 30,
      '90d': 90,
      '1y': 365
    };
    const days = intervals[timeframe as keyof typeof intervals] || 30;

    // 1. Historical Performance Metrics
    const performanceQuery = `
      SELECT 
        dp.performance_date,
        dp.total_trips,
        dp.completed_trips,
        dp.cancelled_trips,
        dp.acceptance_rate,
        dp.completion_rate,
        dp.online_hours,
        dp.driving_hours,
        dp.idle_hours,
        dp.gross_earnings,
        dp.net_earnings,
        dp.tips_received,
        dp.average_rating,
        dp.customer_complaints,
        dp.safety_incidents,
        dp.total_distance_km,
        dp.billable_distance_km
      FROM driver_performance_daily dp
      WHERE dp.driver_id = $1 
        AND dp.performance_date >= CURRENT_DATE - INTERVAL '${days} days'
      ORDER BY dp.performance_date DESC
    `;

    // 2. Trip Details and Ratings
    const tripsQuery = `
      SELECT 
        b.id,
        b.booking_reference,
        b.service_type,
        b.status,
        b.created_at,
        b.completed_at,
        b.customer_rating,
        b.driver_rating,
        b.total_fare,
        b.surge_multiplier,
        b.pickup_address,
        b.dropoff_address,
        
        -- Calculate trip duration
        EXTRACT(EPOCH FROM (b.completed_at - b.actual_pickup_time)) / 60 as trip_duration_minutes,
        EXTRACT(EPOCH FROM (b.assigned_at - b.created_at)) as assignment_time_seconds,
        EXTRACT(EPOCH FROM (b.actual_pickup_time - b.assigned_at)) as pickup_time_seconds
        
      FROM bookings b
      WHERE b.driver_id = $1
        AND b.created_at >= NOW() - INTERVAL '${days} days'
      ORDER BY b.created_at DESC
      LIMIT 500
    `;

    // 3. Current Status and Real-time Metrics
    const currentStatusQuery = `
      SELECT 
        d.status,
        d.rating,
        d.total_trips,
        d.completed_trips,
        d.cancelled_trips,
        d.wallet_balance,
        d.earnings_today,
        d.earnings_week,
        d.earnings_month,
        
        -- Current location and availability
        ST_X(dl.location) as current_longitude,
        ST_Y(dl.location) as current_latitude,
        dl.address as current_address,
        dl.is_available,
        dl.recorded_at as location_updated,
        
        -- Today's active time
        (
          SELECT EXTRACT(EPOCH FROM (NOW() - MIN(al.created_at))) / 3600
          FROM audit_log al
          WHERE al.entity_type = 'driver' 
            AND al.entity_id = d.id
            AND al.event_type = 'driver_status_change'
            AND al.new_values->>'new_status' = 'active'
            AND DATE(al.created_at) = CURRENT_DATE
        ) as today_active_hours
        
      FROM drivers d
      LEFT JOIN LATERAL (
        SELECT * FROM driver_locations 
        WHERE driver_id = d.id 
          AND expires_at > NOW()
        ORDER BY recorded_at DESC 
        LIMIT 1
      ) dl ON true
      WHERE d.id = $1
    `;

    // Execute queries in parallel
    const [performanceResult, tripsResult, statusResult] = await Promise.all([
      db.query(performanceQuery, [driverId]),
      db.query(tripsQuery, [driverId]),
      db.query(currentStatusQuery, [driverId])
    ]);

    const performanceData = performanceResult.rows;
    const tripsData = tripsResult.rows;
    const currentStatus = statusResult.rows[0];

    // Process performance metrics
    const totalMetrics = performanceData.reduce((acc, day) => ({
      totalTrips: acc.totalTrips + (parseInt(day.total_trips) || 0),
      completedTrips: acc.completedTrips + (parseInt(day.completed_trips) || 0),
      cancelledTrips: acc.cancelledTrips + (parseInt(day.cancelled_trips) || 0),
      onlineHours: acc.onlineHours + (parseFloat(day.online_hours) || 0),
      drivingHours: acc.drivingHours + (parseFloat(day.driving_hours) || 0),
      grossEarnings: acc.grossEarnings + (parseFloat(day.gross_earnings) || 0),
      netEarnings: acc.netEarnings + (parseFloat(day.net_earnings) || 0),
      tips: acc.tips + (parseFloat(day.tips_received) || 0),
      totalDistance: acc.totalDistance + (parseFloat(day.total_distance_km) || 0),
      billableDistance: acc.billableDistance + (parseFloat(day.billable_distance_km) || 0),
      ratingSum: acc.ratingSum + (parseFloat(day.average_rating) || 0),
      ratingCount: acc.ratingCount + (day.average_rating ? 1 : 0),
      complaints: acc.complaints + (parseInt(day.customer_complaints) || 0),
      incidents: acc.incidents + (parseInt(day.safety_incidents) || 0)
    }), {
      totalTrips: 0, completedTrips: 0, cancelledTrips: 0,
      onlineHours: 0, drivingHours: 0,
      grossEarnings: 0, netEarnings: 0, tips: 0,
      totalDistance: 0, billableDistance: 0,
      ratingSum: 0, ratingCount: 0, complaints: 0, incidents: 0
    });

    // Calculate derived metrics
    const avgRating = totalMetrics.ratingCount > 0 ? totalMetrics.ratingSum / totalMetrics.ratingCount : null;
    const completionRate = totalMetrics.totalTrips > 0 ? (totalMetrics.completedTrips / totalMetrics.totalTrips * 100) : null;
    const cancellationRate = totalMetrics.totalTrips > 0 ? (totalMetrics.cancelledTrips / totalMetrics.totalTrips * 100) : null;
    const utilizationRate = totalMetrics.onlineHours > 0 ? (totalMetrics.drivingHours / totalMetrics.onlineHours * 100) : null;
    const earningsPerHour = totalMetrics.onlineHours > 0 ? totalMetrics.grossEarnings / totalMetrics.onlineHours : null;
    const earningsPerTrip = totalMetrics.completedTrips > 0 ? totalMetrics.grossEarnings / totalMetrics.completedTrips : null;

    // Process trip details for ratings distribution and patterns
    const completedTrips = tripsData.filter(trip => trip.status === 'completed');
    const ratingDistribution = completedTrips.reduce((acc, trip) => {
      if (trip.customer_rating) {
        acc[trip.customer_rating] = (acc[trip.customer_rating] || 0) + 1;
      }
      return acc;
    }, {} as Record<number, number>);

    // Service type breakdown
    const serviceBreakdown = tripsData.reduce((acc, trip) => {
      acc[trip.service_type] = (acc[trip.service_type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Performance trends (last 7 days vs previous 7 days)
    const recentDays = performanceData.slice(0, 7);
    const previousDays = performanceData.slice(7, 14);
    
    const recentAvg = recentDays.length > 0 ? {
      tripsPerDay: recentDays.reduce((sum, d) => sum + parseInt(d.total_trips || 0), 0) / recentDays.length,
      earningsPerDay: recentDays.reduce((sum, d) => sum + parseFloat(d.gross_earnings || 0), 0) / recentDays.length,
      hoursPerDay: recentDays.reduce((sum, d) => sum + parseFloat(d.online_hours || 0), 0) / recentDays.length,
      rating: recentDays.reduce((sum, d) => sum + parseFloat(d.average_rating || 0), 0) / recentDays.filter(d => d.average_rating).length
    } : null;

    const previousAvg = previousDays.length > 0 ? {
      tripsPerDay: previousDays.reduce((sum, d) => sum + parseInt(d.total_trips || 0), 0) / previousDays.length,
      earningsPerDay: previousDays.reduce((sum, d) => sum + parseFloat(d.gross_earnings || 0), 0) / previousDays.length,
      hoursPerDay: previousDays.reduce((sum, d) => sum + parseFloat(d.online_hours || 0), 0) / previousDays.length
    } : null;

    // Get regional comparisons if requested
    let regionalComparisons = null;
    if (includeComparisons && driver.region_id) {
      regionalComparisons = await getRegionalComparisons(driver.region_id, totalMetrics, days);
    }

    const responseData = {
      driver: {
        id: driver.id,
        driverCode: driver.driver_code,
        name: `${driver.first_name} ${driver.last_name}`,
        region: {
          id: driver.region_id,
          name: driver.region_name,
          code: driver.region_code
        },
        joinDate: driver.created_at,
        currentStatus: currentStatus.status,
        overallRating: parseFloat(driver.rating)
      },

      currentStatus: {
        status: currentStatus.status,
        isAvailable: currentStatus.is_available || false,
        location: currentStatus.current_longitude && currentStatus.current_latitude ? {
          latitude: currentStatus.current_latitude,
          longitude: currentStatus.current_longitude,
          address: currentStatus.current_address,
          lastUpdated: currentStatus.location_updated
        } : null,
        todayActiveHours: currentStatus.today_active_hours ? 
          parseFloat(parseFloat(currentStatus.today_active_hours).toFixed(2)) : null,
        walletBalance: parseFloat(currentStatus.wallet_balance || 0),
        earnings: {
          today: parseFloat(currentStatus.earnings_today || 0),
          week: parseFloat(currentStatus.earnings_week || 0),
          month: parseFloat(currentStatus.earnings_month || 0)
        }
      },

      metrics: {
        timeframe: `${days} days`,
        summary: {
          totalTrips: totalMetrics.totalTrips,
          completedTrips: totalMetrics.completedTrips,
          cancelledTrips: totalMetrics.cancelledTrips,
          completionRate: completionRate ? parseFloat(completionRate.toFixed(1)) : null,
          cancellationRate: cancellationRate ? parseFloat(cancellationRate.toFixed(1)) : null,
          avgRating: avgRating ? parseFloat(avgRating.toFixed(2)) : null,
          totalComplaints: totalMetrics.complaints,
          safetyIncidents: totalMetrics.incidents
        },

        activity: {
          totalOnlineHours: parseFloat(totalMetrics.onlineHours.toFixed(2)),
          totalDrivingHours: parseFloat(totalMetrics.drivingHours.toFixed(2)),
          avgHoursPerDay: parseFloat((totalMetrics.onlineHours / days).toFixed(2)),
          utilizationRate: utilizationRate ? parseFloat(utilizationRate.toFixed(1)) : null,
          totalDistance: parseFloat(totalMetrics.totalDistance.toFixed(2)),
          billableDistance: parseFloat(totalMetrics.billableDistance.toFixed(2))
        },

        financial: {
          totalGrossEarnings: parseFloat(totalMetrics.grossEarnings.toFixed(2)),
          totalNetEarnings: parseFloat(totalMetrics.netEarnings.toFixed(2)),
          totalTips: parseFloat(totalMetrics.tips.toFixed(2)),
          avgEarningsPerHour: earningsPerHour ? parseFloat(earningsPerHour.toFixed(2)) : null,
          avgEarningsPerTrip: earningsPerTrip ? parseFloat(earningsPerTrip.toFixed(2)) : null,
          avgDailyEarnings: parseFloat((totalMetrics.grossEarnings / days).toFixed(2))
        }
      },

      trends: {
        recent: recentAvg,
        previous: previousAvg,
        changes: recentAvg && previousAvg ? {
          trips: recentAvg.tripsPerDay - previousAvg.tripsPerDay,
          earnings: recentAvg.earningsPerDay - previousAvg.earningsPerDay,
          hours: recentAvg.hoursPerDay - previousAvg.hoursPerDay,
          tripsPercent: previousAvg.tripsPerDay > 0 ? 
            parseFloat(((recentAvg.tripsPerDay - previousAvg.tripsPerDay) / previousAvg.tripsPerDay * 100).toFixed(1)) : null,
          earningsPercent: previousAvg.earningsPerDay > 0 ? 
            parseFloat(((recentAvg.earningsPerDay - previousAvg.earningsPerDay) / previousAvg.earningsPerDay * 100).toFixed(1)) : null
        } : null
      },

      breakdown: {
        byService: serviceBreakdown,
        ratingDistribution,
        dailyPerformance: performanceData.map(day => ({
          date: day.performance_date,
          trips: parseInt(day.total_trips || 0),
          completed: parseInt(day.completed_trips || 0),
          earnings: parseFloat(day.gross_earnings || 0),
          hours: parseFloat(day.online_hours || 0),
          rating: day.average_rating ? parseFloat(parseFloat(day.average_rating).toFixed(2)) : null,
          distance: parseFloat(day.total_distance_km || 0)
        }))
      },

      recentTrips: tripsData.slice(0, 20).map(trip => ({
        id: trip.id,
        reference: trip.booking_reference,
        serviceType: trip.service_type,
        status: trip.status,
        date: trip.created_at,
        completedAt: trip.completed_at,
        customerRating: trip.customer_rating,
        driverRating: trip.driver_rating,
        fare: trip.total_fare ? parseFloat(trip.total_fare) : null,
        surgeMultiplier: trip.surge_multiplier ? parseFloat(trip.surge_multiplier) : null,
        pickup: trip.pickup_address,
        dropoff: trip.dropoff_address,
        duration: trip.trip_duration_minutes ? Math.round(trip.trip_duration_minutes) : null,
        assignmentTime: trip.assignment_time_seconds ? Math.round(trip.assignment_time_seconds) : null,
        pickupTime: trip.pickup_time_seconds ? Math.round(trip.pickup_time_seconds) : null
      })),

      regionalComparisons,

      lastUpdated: new Date().toISOString()
    };

    // Cache for 10 minutes (performance data doesn't change rapidly)
    await redis.setex(cacheKey, 600, JSON.stringify(responseData));

    return createApiResponse(responseData, 'Driver performance retrieved successfully');

  } catch (error) {
    logger.error('Error retrieving driver performance', { driverId, timeframe: queryParams.timeframe, error: error instanceof Error ? error.message : String(error) });
    return createApiError(
      'Failed to retrieve driver performance',
      'PERFORMANCE_ERROR',
      500,
      { error: (error as Error).message },
      `/api/drivers/${driverId}/performance`,
      'GET'
    );
  }
});

// Helper function to get regional comparisons
async function getRegionalComparisons(regionId: string, driverMetrics: any, days: number): Promise<any> {
  try {
    const regionAvgQuery = `
      SELECT 
        AVG(dp.total_trips) as avg_trips,
        AVG(dp.completed_trips) as avg_completed,
        AVG(dp.gross_earnings) as avg_earnings,
        AVG(dp.online_hours) as avg_hours,
        AVG(dp.average_rating) as avg_rating,
        AVG(dp.completion_rate) as avg_completion_rate,
        COUNT(DISTINCT dp.driver_id) as total_drivers
      FROM driver_performance_daily dp
      JOIN drivers d ON dp.driver_id = d.id
      WHERE d.region_id = $1
        AND dp.performance_date >= CURRENT_DATE - INTERVAL '${days} days'
        AND d.is_active = TRUE
    `;

    const regionResult = await db.query(regionAvgQuery, [regionId]);
    const regionAvg = regionResult.rows[0];

    if (!regionAvg || !regionAvg.total_drivers) {
      return null;
    }

    const driverAvg = {
      trips: driverMetrics.totalTrips / days,
      earnings: driverMetrics.grossEarnings / days,
      hours: driverMetrics.onlineHours / days,
      rating: driverMetrics.ratingCount > 0 ? driverMetrics.ratingSum / driverMetrics.ratingCount : null,
      completionRate: driverMetrics.totalTrips > 0 ? (driverMetrics.completedTrips / driverMetrics.totalTrips * 100) : null
    };

    const regionDaily = {
      trips: parseFloat(regionAvg.avg_trips || 0),
      earnings: parseFloat(regionAvg.avg_earnings || 0),
      hours: parseFloat(regionAvg.avg_hours || 0),
      rating: regionAvg.avg_rating ? parseFloat(parseFloat(regionAvg.avg_rating).toFixed(2)) : null,
      completionRate: regionAvg.avg_completion_rate ? parseFloat(parseFloat(regionAvg.avg_completion_rate).toFixed(1)) : null
    };

    return {
      regionAverages: regionDaily,
      driverVsRegion: {
        tripsPercentile: regionDaily.trips > 0 ? 
          Math.round((driverAvg.trips / regionDaily.trips) * 100) : null,
        earningsPercentile: regionDaily.earnings > 0 ? 
          Math.round((driverAvg.earnings / regionDaily.earnings) * 100) : null,
        hoursPercentile: regionDaily.hours > 0 ? 
          Math.round((driverAvg.hours / regionDaily.hours) * 100) : null,
        ratingComparison: regionDaily.rating && driverAvg.rating ? 
          parseFloat((driverAvg.rating - regionDaily.rating).toFixed(2)) : null
      },
      totalRegionalDrivers: parseInt(regionAvg.total_drivers)
    };

  } catch (error) {
    logger.error('Error getting regional comparisons', { regionId, days, error: error instanceof Error ? error.message : String(error) });
    return null;
  }
}

// OPTIONS handler for CORS
export const OPTIONS = handleOptionsRequest;