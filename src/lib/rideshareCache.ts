// Advanced Redis Caching for Ridesharing Operations
// High-performance caching strategies optimized for real-time ridesharing

import { redis } from './redis';
import { getDatabase } from './database';

const db = getDatabase();

// Cache key patterns for different data types
const CACHE_KEYS = {
  // Driver-related caching
  DRIVER_LOCATION: (driverId: string) => `driver:location:${driverId}`,
  DRIVER_STATUS: (driverId: string) => `driver:status:${driverId}`,
  DRIVER_PERFORMANCE: (driverId: string, period: string) => `driver:perf:${driverId}:${period}`,
  AVAILABLE_DRIVERS: (regionId: string, serviceType: string, radius: number) => 
    `drivers:available:${regionId}:${serviceType}:${radius}`,
  
  // Ride-related caching
  ACTIVE_RIDES: (regionId: string) => `rides:active:${regionId}`,
  RIDE_STATUS: (rideId: string) => `ride:status:${rideId}`,
  RIDE_TRACKING: (rideId: string) => `ride:tracking:${rideId}`,
  MATCHING_CANDIDATES: (regionId: string, lat: number, lng: number, service: string) => 
    `match:candidates:${regionId}:${Math.round(lat*1000)}:${Math.round(lng*1000)}:${service}`,
  
  // Demand and surge caching
  DEMAND_HOTSPOTS: (regionId: string, timeWindow: string) => `demand:hotspots:${regionId}:${timeWindow}`,
  SURGE_STATUS: (regionId: string, serviceType?: string) => 
    `surge:status:${regionId}${serviceType ? `:${serviceType}` : ''}`,
  DEMAND_METRICS: (regionId: string) => `demand:metrics:${regionId}`,
  
  // Analytics caching
  REGIONAL_KPI: (regionId: string, timeframe: string) => `kpi:${regionId}:${timeframe}`,
  PERFORMANCE_METRICS: (regionId: string, metric: string) => `perf:${regionId}:${metric}`,
  
  // Session and real-time data
  WEBSOCKET_SESSION: (socketId: string) => `ws:session:${socketId}`,
  REAL_TIME_EVENTS: (regionId: string, eventType: string) => `events:${regionId}:${eventType}`,
  
  // Geospatial indexing
  GEO_DRIVERS: (regionId: string) => `geo:drivers:${regionId}`,
  GEO_DEMAND: (regionId: string) => `geo:demand:${regionId}`,
};

// Cache TTL configurations (in seconds)
const CACHE_TTL = {
  DRIVER_LOCATION: 30,        // 30 seconds - very dynamic
  DRIVER_STATUS: 300,         // 5 minutes
  DRIVER_PERFORMANCE: 3600,   // 1 hour
  AVAILABLE_DRIVERS: 15,      // 15 seconds - critical for matching
  
  ACTIVE_RIDES: 10,          // 10 seconds - real-time dashboard
  RIDE_STATUS: 60,           // 1 minute
  RIDE_TRACKING: 10,         // 10 seconds - live tracking
  MATCHING_CANDIDATES: 30,    // 30 seconds
  
  DEMAND_HOTSPOTS: 60,       // 1 minute
  SURGE_STATUS: 30,          // 30 seconds
  DEMAND_METRICS: 120,       // 2 minutes
  
  REGIONAL_KPI: 300,         // 5 minutes
  PERFORMANCE_METRICS: 180,   // 3 minutes
  
  WEBSOCKET_SESSION: 1800,   // 30 minutes
  REAL_TIME_EVENTS: 300,     // 5 minutes
};

export class RidesharingCache {
  // =====================================================
  // DRIVER LOCATION AND STATUS CACHING
  // =====================================================

  // High-frequency driver location updates with geospatial indexing
  async updateDriverLocation(driverId: string, locationData: {
    latitude: number;
    longitude: number;
    accuracy?: number;
    bearing?: number;
    speed?: number;
    address?: string;
    status: string;
    isAvailable: boolean;
    regionId: string;
    timestamp: number;
  }): Promise<void> {
    try {
      const pipeline = redis.pipeline();
      
      // Store detailed location data
      const locationKey = CACHE_KEYS.DRIVER_LOCATION(driverId);
      pipeline.setex(locationKey, CACHE_TTL.DRIVER_LOCATION, JSON.stringify(locationData));
      
      // Update geospatial index for proximity queries
      const geoKey = CACHE_KEYS.GEO_DRIVERS(locationData.regionId);
      pipeline.geoadd(geoKey, locationData.longitude, locationData.latitude, driverId);
      pipeline.expire(geoKey, CACHE_TTL.AVAILABLE_DRIVERS * 2);
      
      // Store availability status separately for quick filtering
      if (locationData.isAvailable) {
        pipeline.sadd(`available_drivers:${locationData.regionId}`, driverId);
        pipeline.expire(`available_drivers:${locationData.regionId}`, CACHE_TTL.AVAILABLE_DRIVERS);
      } else {
        pipeline.srem(`available_drivers:${locationData.regionId}`, driverId);
      }
      
      // Update driver status cache
      const statusData = {
        status: locationData.status,
        isAvailable: locationData.isAvailable,
        lastLocationUpdate: locationData.timestamp,
        regionId: locationData.regionId
      };
      pipeline.setex(CACHE_KEYS.DRIVER_STATUS(driverId), CACHE_TTL.DRIVER_STATUS, JSON.stringify(statusData));
      
      await pipeline.exec();
      
    } catch (error) {
      console.error('Error updating driver location cache:', error);
    }
  }

  // Get nearby available drivers using geospatial indexing
  async getNearbyDrivers(
    regionId: string,
    latitude: number,
    longitude: number,
    radiusKm: number = 5,
    serviceType?: string,
    limit: number = 50
  ): Promise<any[]> {
    try {
      const cacheKey = CACHE_KEYS.AVAILABLE_DRIVERS(regionId, serviceType || 'all', radiusKm);
      const cached = await redis.get(cacheKey);
      
      if (cached) {
        return JSON.parse(cached);
      }

      // Use Redis geospatial commands for high-performance proximity search
      const geoKey = CACHE_KEYS.GEO_DRIVERS(regionId);
      const availableKey = `available_drivers:${regionId}`;
      
      // Get drivers within radius
      const nearbyDrivers = await redis.georadius(
        geoKey,
        longitude,
        latitude,
        radiusKm,
        'km',
        'WITHDIST',
        'WITHCOORD',
        'ASC',
        'COUNT',
        limit
      );

      // Get available drivers set
      const availableDriverIds = await redis.smembers(availableKey);
      const availableSet = new Set(availableDriverIds);

      // Process results and get detailed data
      const pipeline = redis.pipeline();
      const validDrivers: string[] = [];

      for (const [driverId, distance, coords] of nearbyDrivers) {
        if (availableSet.has(driverId)) {
          validDrivers.push(driverId);
          pipeline.get(CACHE_KEYS.DRIVER_LOCATION(driverId));
          pipeline.get(CACHE_KEYS.DRIVER_STATUS(driverId));
        }
      }

      if (validDrivers.length === 0) {
        return [];
      }

      const results = await pipeline.exec();
      const driverData = [];

      for (let i = 0; i < validDrivers.length; i++) {
        const locationData = results[i * 2]?.[1];
        const statusData = results[i * 2 + 1]?.[1];
        
        if (locationData && statusData) {
          const location = JSON.parse(locationData);
          const status = JSON.parse(statusData);
          
          // Filter by service type if specified
          if (!serviceType || (location.services && location.services.includes(serviceType))) {
            driverData.push({
              driverId: validDrivers[i],
              location,
              status,
              distance: nearbyDrivers[i][1]
            });
          }
        }
      }

      // Cache results for a short time
      await redis.setex(cacheKey, CACHE_TTL.AVAILABLE_DRIVERS, JSON.stringify(driverData));
      
      return driverData;

    } catch (error) {
      console.error('Error getting nearby drivers:', error);
      return [];
    }
  }

  // =====================================================
  // RIDE AND DEMAND CACHING
  // =====================================================

  // Cache active rides with real-time updates
  async cacheActiveRides(regionId: string, activeRides: any[]): Promise<void> {
    try {
      const cacheKey = CACHE_KEYS.ACTIVE_RIDES(regionId);
      await redis.setex(cacheKey, CACHE_TTL.ACTIVE_RIDES, JSON.stringify({
        rides: activeRides,
        lastUpdated: Date.now(),
        count: activeRides.length
      }));

      // Also cache individual ride statuses
      const pipeline = redis.pipeline();
      activeRides.forEach(ride => {
        pipeline.setex(CACHE_KEYS.RIDE_STATUS(ride.id), CACHE_TTL.RIDE_STATUS, JSON.stringify({
          status: ride.status,
          driverId: ride.driver_id,
          customerId: ride.customer_id,
          regionId: ride.region_id,
          lastUpdated: Date.now()
        }));
      });
      
      await pipeline.exec();

    } catch (error) {
      console.error('Error caching active rides:', error);
    }
  }

  // Cache demand hotspots with geospatial indexing
  async cacheDemandHotspots(regionId: string, hotspots: any[], timeWindow: string = '30min'): Promise<void> {
    try {
      const cacheKey = CACHE_KEYS.DEMAND_HOTSPOTS(regionId, timeWindow);
      const geoKey = CACHE_KEYS.GEO_DEMAND(regionId);
      
      const pipeline = redis.pipeline();
      
      // Store hotspot data
      pipeline.setex(cacheKey, CACHE_TTL.DEMAND_HOTSPOTS, JSON.stringify({
        hotspots,
        regionId,
        timeWindow,
        lastUpdated: Date.now()
      }));

      // Clear existing demand geo index
      pipeline.del(geoKey);
      
      // Add hotspots to geospatial index
      hotspots.forEach(hotspot => {
        if (hotspot.location && hotspot.location.center) {
          const hotspotId = `hotspot_${hotspot.location.center.latitude}_${hotspot.location.center.longitude}`;
          pipeline.geoadd(
            geoKey,
            hotspot.location.center.longitude,
            hotspot.location.center.latitude,
            hotspotId
          );
        }
      });

      pipeline.expire(geoKey, CACHE_TTL.DEMAND_HOTSPOTS);
      await pipeline.exec();

    } catch (error) {
      console.error('Error caching demand hotspots:', error);
    }
  }

  // =====================================================
  // SURGE PRICING AND ANALYTICS CACHING
  // =====================================================

  // Cache surge pricing status with regional and service-level granularity
  async cacheSurgeStatus(regionId: string, surgeData: any, serviceType?: string): Promise<void> {
    try {
      const cacheKey = CACHE_KEYS.SURGE_STATUS(regionId, serviceType);
      
      await redis.setex(cacheKey, CACHE_TTL.SURGE_STATUS, JSON.stringify({
        ...surgeData,
        regionId,
        serviceType,
        cachedAt: Date.now()
      }));

      // Also cache in a regional surge overview
      const overviewKey = `surge:overview:${regionId}`;
      const overview = await redis.get(overviewKey) || '{}';
      const overviewData = JSON.parse(overview);
      
      const key = serviceType || 'default';
      overviewData[key] = {
        multiplier: surgeData.surgeMultiplier || 1.0,
        isActive: (surgeData.surgeMultiplier || 1.0) > 1.0,
        lastUpdated: Date.now()
      };

      await redis.setex(overviewKey, CACHE_TTL.SURGE_STATUS, JSON.stringify(overviewData));

    } catch (error) {
      console.error('Error caching surge status:', error);
    }
  }

  // Cache performance KPIs with time-series data
  async cacheRegionalKPIs(regionId: string, kpis: any, timeframe: string = 'current'): Promise<void> {
    try {
      const cacheKey = CACHE_KEYS.REGIONAL_KPI(regionId, timeframe);
      
      await redis.setex(cacheKey, CACHE_TTL.REGIONAL_KPI, JSON.stringify({
        ...kpis,
        regionId,
        timeframe,
        cachedAt: Date.now()
      }));

      // Also store in time-series for trend analysis
      const timeSeriesKey = `kpi:timeseries:${regionId}`;
      const timeSeriesData = {
        timestamp: Date.now(),
        kpis,
        timeframe
      };
      
      await redis.lpush(timeSeriesKey, JSON.stringify(timeSeriesData));
      await redis.ltrim(timeSeriesKey, 0, 100); // Keep last 100 entries
      await redis.expire(timeSeriesKey, 3600 * 24); // 24 hours

    } catch (error) {
      console.error('Error caching regional KPIs:', error);
    }
  }

  // =====================================================
  // MATCHING AND OPTIMIZATION CACHING
  // =====================================================

  // Cache ride matching candidates for quick retrieval
  async cacheMatchingCandidates(
    regionId: string,
    latitude: number,
    longitude: number,
    serviceType: string,
    candidates: any[]
  ): Promise<void> {
    try {
      const cacheKey = CACHE_KEYS.MATCHING_CANDIDATES(regionId, latitude, longitude, serviceType);
      
      await redis.setex(cacheKey, CACHE_TTL.MATCHING_CANDIDATES, JSON.stringify({
        candidates,
        location: { latitude, longitude },
        serviceType,
        regionId,
        cachedAt: Date.now()
      }));

    } catch (error) {
      console.error('Error caching matching candidates:', error);
    }
  }

  // Get cached matching candidates
  async getMatchingCandidates(
    regionId: string,
    latitude: number,
    longitude: number,
    serviceType: string
  ): Promise<any[] | null> {
    try {
      const cacheKey = CACHE_KEYS.MATCHING_CANDIDATES(regionId, latitude, longitude, serviceType);
      const cached = await redis.get(cacheKey);
      
      if (cached) {
        const data = JSON.parse(cached);
        // Check if cache is still fresh (within 30 seconds)
        if (Date.now() - data.cachedAt < 30000) {
          return data.candidates;
        }
      }
      
      return null;

    } catch (error) {
      console.error('Error getting matching candidates:', error);
      return null;
    }
  }

  // =====================================================
  // CACHE WARMING AND OPTIMIZATION
  // =====================================================

  // Warm up critical caches for high-traffic regions
  async warmCriticalCaches(regionIds: string[]): Promise<void> {
    try {
      console.log('Warming up critical caches for regions:', regionIds);

      const pipeline = redis.pipeline();
      
      for (const regionId of regionIds) {
        // Pre-load available drivers
        this.preloadAvailableDrivers(regionId);
        
        // Pre-load active rides
        this.preloadActiveRides(regionId);
        
        // Pre-load demand metrics
        this.preloadDemandMetrics(regionId);
        
        // Pre-load surge status
        this.preloadSurgeStatus(regionId);
      }

      console.log('Cache warming completed');

    } catch (error) {
      console.error('Error warming caches:', error);
    }
  }

  // Preload available drivers for a region
  private async preloadAvailableDrivers(regionId: string): Promise<void> {
    try {
      const query = `
        SELECT 
          d.id,
          ST_X(dl.location) as longitude,
          ST_Y(dl.location) as latitude,
          d.services,
          d.status,
          dl.is_available,
          dl.recorded_at
        FROM drivers d
        JOIN driver_locations dl ON d.id = dl.driver_id
        WHERE d.region_id = $1
          AND d.status = 'active'
          AND dl.is_available = TRUE
          AND dl.expires_at > NOW()
          AND dl.recorded_at > NOW() - INTERVAL '5 minutes'
      `;

      const result = await db.query(query, [regionId]);
      
      // Update geospatial index
      if (result.rows.length > 0) {
        const geoKey = CACHE_KEYS.GEO_DRIVERS(regionId);
        const pipeline = redis.pipeline();
        
        result.rows.forEach(driver => {
          pipeline.geoadd(geoKey, driver.longitude, driver.latitude, driver.id);
        });
        
        pipeline.expire(geoKey, CACHE_TTL.AVAILABLE_DRIVERS * 2);
        await pipeline.exec();
      }

    } catch (error) {
      console.error(`Error preloading drivers for region ${regionId}:`, error);
    }
  }

  // Preload active rides for dashboard
  private async preloadActiveRides(regionId: string): Promise<void> {
    try {
      const query = `
        SELECT id, booking_reference, status, driver_id, customer_id, created_at
        FROM bookings 
        WHERE region_id = $1 
          AND status IN ('searching', 'assigned', 'accepted', 'en_route', 'arrived', 'in_progress')
        ORDER BY created_at DESC
      `;

      const result = await db.query(query, [regionId]);
      
      if (result.rows.length > 0) {
        await this.cacheActiveRides(regionId, result.rows);
      }

    } catch (error) {
      console.error(`Error preloading active rides for region ${regionId}:`, error);
    }
  }

  // Preload demand metrics
  private async preloadDemandMetrics(regionId: string): Promise<void> {
    try {
      const metricsKey = CACHE_KEYS.DEMAND_METRICS(regionId);
      
      // Calculate current demand metrics
      const demandQuery = `
        SELECT 
          COUNT(*) FILTER (WHERE status = 'searching') as searching_rides,
          COUNT(*) FILTER (WHERE status IN ('assigned', 'accepted', 'en_route')) as pending_rides,
          COUNT(*) FILTER (WHERE status = 'in_progress') as active_rides,
          AVG(EXTRACT(EPOCH FROM (NOW() - created_at))) FILTER (WHERE status = 'searching') as avg_wait_time
        FROM bookings 
        WHERE region_id = $1 
          AND created_at > NOW() - INTERVAL '1 hour'
      `;

      const result = await db.query(demandQuery, [regionId]);
      const metrics = result.rows[0];

      await redis.setex(metricsKey, CACHE_TTL.DEMAND_METRICS, JSON.stringify({
        ...metrics,
        regionId,
        lastUpdated: Date.now()
      }));

    } catch (error) {
      console.error(`Error preloading demand metrics for region ${regionId}:`, error);
    }
  }

  // Preload surge status
  private async preloadSurgeStatus(regionId: string): Promise<void> {
    try {
      const surgeKey = CACHE_KEYS.SURGE_STATUS(regionId);
      
      // Get current surge multiplier from database
      const surgeQuery = `
        SELECT surge_multiplier, status 
        FROM regions 
        WHERE id = $1
      `;

      const result = await db.query(surgeQuery, [regionId]);
      
      if (result.rows.length > 0) {
        const surgeData = {
          surgeMultiplier: parseFloat(result.rows[0].surge_multiplier || 1.0),
          regionStatus: result.rows[0].status,
          isActive: parseFloat(result.rows[0].surge_multiplier || 1.0) > 1.0,
          lastUpdated: Date.now()
        };

        await redis.setex(surgeKey, CACHE_TTL.SURGE_STATUS, JSON.stringify(surgeData));
      }

    } catch (error) {
      console.error(`Error preloading surge status for region ${regionId}:`, error);
    }
  }

  // =====================================================
  // CACHE MANAGEMENT AND CLEANUP
  // =====================================================

  // Clean up expired driver location data
  async cleanupExpiredDriverData(): Promise<number> {
    try {
      let cleanedCount = 0;
      const pattern = 'driver:location:*';
      const keys = await redis.keys(pattern);
      
      const pipeline = redis.pipeline();
      
      for (const key of keys) {
        const data = await redis.get(key);
        if (data) {
          const locationData = JSON.parse(data);
          const age = (Date.now() - locationData.timestamp) / 1000; // seconds
          
          if (age > CACHE_TTL.DRIVER_LOCATION * 2) { // Double TTL threshold
            pipeline.del(key);
            cleanedCount++;
            
            // Also clean from geo index
            const driverId = key.split(':').pop();
            if (driverId && locationData.regionId) {
              const geoKey = CACHE_KEYS.GEO_DRIVERS(locationData.regionId);
              pipeline.zrem(geoKey, driverId);
            }
          }
        }
      }
      
      if (pipeline.length > 0) {
        await pipeline.exec();
      }
      
      return cleanedCount;

    } catch (error) {
      console.error('Error cleaning up expired driver data:', error);
      return 0;
    }
  }

  // Get cache statistics for monitoring
  async getCacheStats(): Promise<any> {
    try {
      const info = await redis.info('memory');
      const keyspace = await redis.info('keyspace');
      
      // Count keys by pattern
      const patterns = [
        'driver:*',
        'rides:*',
        'surge:*',
        'demand:*',
        'kpi:*',
        'geo:*',
        'available_drivers:*'
      ];

      const keyCounts: Record<string, number> = {};
      
      for (const pattern of patterns) {
        const keys = await redis.keys(pattern);
        keyCounts[pattern] = keys.length;
      }

      return {
        memory: this.parseRedisInfo(info),
        keyspace: this.parseRedisInfo(keyspace),
        keyCounts,
        timestamp: Date.now()
      };

    } catch (error) {
      console.error('Error getting cache stats:', error);
      return {};
    }
  }

  private parseRedisInfo(infoString: string): Record<string, any> {
    const info: Record<string, any> = {};
    const lines = infoString.split('\r\n');
    
    for (const line of lines) {
      if (line.includes(':')) {
        const [key, value] = line.split(':');
        // Try to parse as number if possible
        const numValue = parseFloat(value);
        info[key] = isNaN(numValue) ? value : numValue;
      }
    }
    
    return info;
  }
}

// Export singleton instance
export const ridesharingCache = new RidesharingCache();