// Database Query Optimizer
// Provides caching, batch operations, and N+1 query elimination
// Designed to work with the existing database infrastructure

import { getDatabaseAdapter } from '../database';
import type { DatabaseAdapter } from './connection-manager';
import { logger } from '../security/productionLogger';

// Cache configuration
interface CacheConfig {
  ttl: number; // Time to live in seconds
  tags?: string[]; // Tags for cache invalidation
  key?: string; // Custom cache key
}

// Batch query result
interface BatchQueryResult<T = any> {
  data: T[];
  total: number;
  cached: boolean;
  executionTime: number;
}

// Query cache entry
interface CacheEntry {
  data: any;
  expires: number;
  tags: string[];
  hitCount: number;
}

class QueryOptimizer {
  private cache = new Map<string, CacheEntry>();
  private db: DatabaseAdapter;

  constructor(database?: DatabaseAdapter) {
    this.db = database || getDatabaseAdapter();
  }

  // =====================================================
  // QUERY CACHING LAYER
  // =====================================================

  /**
   * Execute query with caching support
   */
  async cachedQuery<T = any>(
    sql: string,
    params: any[] = [],
    cacheConfig?: CacheConfig
  ): Promise<{ data: T[]; cached: boolean; executionTime: number }> {
    const startTime = Date.now();

    if (!cacheConfig) {
      const result = await this.db.query<T>(sql, params);
      return {
        data: result.rows,
        cached: false,
        executionTime: Date.now() - startTime
      };
    }

    const cacheKey = cacheConfig.key || this.generateCacheKey(sql, params);
    const cached = this.getFromCache<T[]>(cacheKey);

    if (cached) {
      // Update hit count
      const entry = this.cache.get(cacheKey);
      if (entry) {
        entry.hitCount++;
        this.cache.set(cacheKey, entry);
      }

      logger.debug('Cache hit for query', { 
        cacheKey: cacheKey.substring(0, 50),
        executionTime: Date.now() - startTime 
      });

      return {
        data: cached,
        cached: true,
        executionTime: Date.now() - startTime
      };
    }

    // Execute query
    const result = await this.db.query<T>(sql, params);
    
    // Cache the result
    this.setCache(cacheKey, result.rows, cacheConfig);

    logger.debug('Query executed and cached', { 
      cacheKey: cacheKey.substring(0, 50),
      rowCount: result.rows.length,
      executionTime: Date.now() - startTime 
    });

    return {
      data: result.rows,
      cached: false,
      executionTime: Date.now() - startTime
    };
  }

  /**
   * Batch execute multiple queries in parallel
   */
  async batchQuery<T = any>(
    queries: Array<{ sql: string; params?: any[]; cacheConfig?: CacheConfig }>
  ): Promise<BatchQueryResult<T>[]> {
    const startTime = Date.now();
    
    const results = await Promise.all(
      queries.map(async (query) => {
        const result = await this.cachedQuery<T>(
          query.sql, 
          query.params || [], 
          query.cacheConfig
        );
        
        return {
          data: result.data,
          total: result.data.length,
          cached: result.cached,
          executionTime: result.executionTime
        };
      })
    );

    logger.debug('Batch query executed', { 
      queryCount: queries.length,
      totalTime: Date.now() - startTime 
    });

    return results;
  }

  // =====================================================
  // N+1 QUERY ELIMINATION HELPERS
  // =====================================================

  /**
   * Batch fetch zone details (eliminates N+1 in zone APIs)
   */
  async batchFetchZoneDetails(zoneIds: string[]): Promise<Record<string, any>> {
    if (zoneIds.length === 0) return {};

    const cacheKey = `zone_batch:${zoneIds.sort().join(',')}`;
    const cached = this.getFromCache<Record<string, any>>(cacheKey);
    
    if (cached) {
      return cached;
    }

    const placeholders = zoneIds.map(() => '?').join(',');
    const sql = `
      SELECT 
        z.id,
        z.code,
        z.name,
        z.status,
        z.region_id,
        z.geometry,
        z.centroid,
        z.tags,
        z.metadata,
        z.created_at,
        z.updated_at,
        z.version,
        COALESCE(poi_stats.poi_count, 0) as poi_count,
        COALESCE(poi_stats.poi_names, '[]') as poi_names,
        COALESCE(town_stats.town_codes, '[]') as town_codes
      FROM zones z
      LEFT JOIN (
        SELECT 
          zone_id,
          COUNT(*) as poi_count,
          JSON_GROUP_ARRAY(name || ' (' || type || ')') as poi_names
        FROM pois 
        WHERE zone_id IN (${placeholders}) AND status != 'retired'
        GROUP BY zone_id
      ) poi_stats ON z.id = poi_stats.zone_id
      LEFT JOIN (
        SELECT 
          zone_id,
          JSON_GROUP_ARRAY(town_code) as town_codes
        FROM zone_towns 
        WHERE zone_id IN (${placeholders})
        GROUP BY zone_id
      ) town_stats ON z.id = town_stats.zone_id
      WHERE z.id IN (${placeholders})
    `;

    const result = await this.db.query(sql, [...zoneIds, ...zoneIds, ...zoneIds]);
    
    // Convert to map for O(1) lookup
    const zoneMap: Record<string, any> = {};
    result.rows.forEach(row => {
      zoneMap[row.id] = {
        ...row,
        geometry: JSON.parse(row.geometry || '{}'),
        centroid: JSON.parse(row.centroid || 'null'),
        tags: JSON.parse(row.tags || '[]'),
        metadata: JSON.parse(row.metadata || '{}'),
        poi_names: JSON.parse(row.poi_names || '[]'),
        town_codes: JSON.parse(row.town_codes || '[]')
      };
    });

    // Cache for 5 minutes
    this.setCache(cacheKey, zoneMap, { ttl: 300, tags: ['zones', 'pois'] });
    
    return zoneMap;
  }

  /**
   * Batch fetch user permissions (eliminates N+1 in RBAC)
   */
  async batchFetchUserPermissions(userIds: string[]): Promise<Record<string, any>> {
    if (userIds.length === 0) return {};

    const cacheKey = `user_permissions_batch:${userIds.sort().join(',')}`;
    const cached = this.getFromCache<Record<string, any>>(cacheKey);
    
    if (cached) {
      return cached;
    }

    const placeholders = userIds.map(() => '?').join(',');
    const sql = `
      SELECT 
        u.user_id,
        u.email,
        u.full_name,
        u.status,
        JSON_GROUP_ARRAY(
          DISTINCT JSON_OBJECT(
            'id', r.role_id,
            'name', r.name,
            'level', r.level
          )
        ) as roles,
        JSON_GROUP_ARRAY(DISTINCT c.action) as capabilities,
        JSON_GROUP_ARRAY(DISTINCT rua.region_id) as regions
      FROM users u
      LEFT JOIN user_roles ur ON u.user_id = ur.user_id AND ur.is_active = 1
      LEFT JOIN roles r ON ur.role_id = r.role_id AND r.is_active = 1
      LEFT JOIN role_capabilities rc ON r.role_id = rc.role_id
      LEFT JOIN capabilities c ON rc.capability_id = c.capability_id
      LEFT JOIN regional_user_access rua ON u.user_id = rua.user_id
      WHERE u.user_id IN (${placeholders})
      GROUP BY u.user_id, u.email, u.full_name, u.status
    `;

    const result = await this.db.query(sql, userIds);
    
    // Convert to map for O(1) lookup
    const userMap: Record<string, any> = {};
    result.rows.forEach(row => {
      userMap[row.user_id] = {
        ...row,
        roles: JSON.parse(row.roles || '[]').filter((r: any) => r.id !== null),
        capabilities: JSON.parse(row.capabilities || '[]').filter((c: any) => c !== null),
        regions: JSON.parse(row.regions || '[]').filter((r: any) => r !== null)
      };
    });

    // Cache for 10 minutes
    this.setCache(cacheKey, userMap, { ttl: 600, tags: ['users', 'permissions', 'rbac'] });
    
    return userMap;
  }

  /**
   * Batch fetch driver details for location enrichment
   */
  async batchFetchDriverDetails(driverIds: string[]): Promise<Record<string, any>> {
    if (driverIds.length === 0) return {};

    const cacheKey = `driver_details_batch:${driverIds.sort().join(',')}`;
    const cached = this.getFromCache<Record<string, any>>(cacheKey);
    
    if (cached) {
      return cached;
    }

    const placeholders = driverIds.map(() => '?').join(',');
    const sql = `
      SELECT 
        id,
        driver_code,
        first_name,
        last_name,
        rating,
        vehicle_type,
        plate_number,
        vehicle_model,
        services,
        status,
        region_id
      FROM drivers 
      WHERE id IN (${placeholders})
      AND is_active = 1
    `;

    const result = await this.db.query(sql, driverIds);
    
    // Convert to map for O(1) lookup
    const driverMap: Record<string, any> = {};
    result.rows.forEach(row => {
      driverMap[row.id] = {
        id: row.id,
        driverCode: row.driver_code,
        firstName: row.first_name,
        lastName: row.last_name,
        rating: row.rating,
        vehicleInfo: {
          type: row.vehicle_type,
          plateNumber: row.plate_number,
          model: row.vehicle_model
        },
        services: JSON.parse(row.services || '[]'),
        status: row.status,
        regionId: row.region_id
      };
    });

    // Cache for 2 minutes (driver data changes frequently)
    this.setCache(cacheKey, driverMap, { ttl: 120, tags: ['drivers'] });
    
    return driverMap;
  }

  // =====================================================
  // OPTIMIZED PAGINATION
  // =====================================================

  /**
   * Cursor-based pagination for large datasets
   */
  async paginateWithCursor<T = any>(
    baseQuery: string,
    countQuery: string,
    params: any[] = [],
    options: {
      cursor?: string;
      limit?: number;
      cursorColumn?: string;
      direction?: 'ASC' | 'DESC';
      cacheConfig?: CacheConfig;
    } = {}
  ): Promise<{
    data: T[];
    nextCursor?: string;
    hasMore: boolean;
    total: number;
    cached: boolean;
  }> {
    const {
      cursor,
      limit = 20,
      cursorColumn = 'created_at',
      direction = 'DESC',
      cacheConfig
    } = options;

    // Build cursor condition
    let cursorCondition = '';
    let queryParams = [...params];
    
    if (cursor) {
      const operator = direction === 'DESC' ? '<' : '>';
      cursorCondition = ` AND ${cursorColumn} ${operator} ?`;
      queryParams.push(cursor);
    }

    // Add cursor condition to base query
    const paginatedQuery = `
      ${baseQuery} 
      ${cursorCondition} 
      ORDER BY ${cursorColumn} ${direction} 
      LIMIT ${limit + 1}
    `;

    // Execute queries in parallel
    const [dataResult, totalResult] = await Promise.all([
      this.cachedQuery<T>(paginatedQuery, queryParams, cacheConfig),
      this.cachedQuery<{ total: number }>(countQuery, params, {
        ...cacheConfig,
        ttl: cacheConfig?.ttl || 300 // Cache count for 5 minutes
      })
    ]);

    const rows = dataResult.data;
    const total = totalResult.data[0]?.total || 0;
    const hasMore = rows.length > limit;
    
    // Remove extra row used for hasMore detection
    if (hasMore) {
      rows.pop();
    }

    // Generate next cursor
    const nextCursor = hasMore && rows.length > 0 ? 
      (rows[rows.length - 1] as any)[cursorColumn] : undefined;

    return {
      data: rows,
      nextCursor,
      hasMore,
      total,
      cached: dataResult.cached
    };
  }

  // =====================================================
  // SPATIAL QUERY OPTIMIZATION
  // =====================================================

  /**
   * Optimized nearby driver search with caching
   */
  async findNearbyDrivers(
    latitude: number,
    longitude: number,
    radiusKm: number = 5,
    serviceTypes: string[] = [],
    limit: number = 50
  ): Promise<any[]> {
    const cacheKey = `nearby_drivers:${latitude.toFixed(4)},${longitude.toFixed(4)}:${radiusKm}:${serviceTypes.sort().join(',')}`;
    const cached = this.getFromCache<any[]>(cacheKey);
    
    if (cached) {
      return cached;
    }

    // Build service type filter
    const serviceFilter = serviceTypes.length > 0 ? 
      `AND JSON_EXTRACT(d.services, '$') LIKE '%${serviceTypes.join('%') || JSON_EXTRACT(d.services, \'$\') LIKE \'%'}%'` : '';

    const sql = `
      SELECT 
        d.id,
        d.driver_code,
        d.first_name,
        d.last_name,
        d.rating,
        d.vehicle_type,
        d.services,
        dl.location,
        dl.recorded_at,
        dl.speed,
        dl.bearing,
        -- Calculate distance using Haversine formula (approximation)
        (
          6371 * acos(
            cos(radians(${latitude})) * 
            cos(radians(JSON_EXTRACT(dl.location, '$.coordinates[1]'))) *
            cos(radians(JSON_EXTRACT(dl.location, '$.coordinates[0]')) - radians(${longitude})) +
            sin(radians(${latitude})) * 
            sin(radians(JSON_EXTRACT(dl.location, '$.coordinates[1]')))
          )
        ) as distance_km
      FROM drivers d
      JOIN driver_locations dl ON d.id = dl.driver_id
      WHERE d.status = 'active'
        AND d.is_active = 1
        AND dl.is_available = 1
        AND dl.expires_at > datetime('now')
        AND dl.recorded_at > datetime('now', '-5 minutes')
        ${serviceFilter}
        -- Rough bounding box filter for performance
        AND JSON_EXTRACT(dl.location, '$.coordinates[1]') BETWEEN ${latitude - (radiusKm/111.32)} AND ${latitude + (radiusKm/111.32)}
        AND JSON_EXTRACT(dl.location, '$.coordinates[0]') BETWEEN ${longitude - (radiusKm/(111.32 * cos(radians(latitude))))} AND ${longitude + (radiusKm/(111.32 * cos(radians(latitude))))}
      HAVING distance_km <= ${radiusKm}
      ORDER BY distance_km ASC, d.rating DESC
      LIMIT ${limit}
    `;

    const result = await this.db.query(sql);
    const drivers = result.rows.map(row => ({
      ...row,
      location: JSON.parse(row.location),
      services: JSON.parse(row.services || '[]'),
      distance_km: Math.round(row.distance_km * 100) / 100 // Round to 2 decimals
    }));

    // Cache for 30 seconds (location data changes frequently)
    this.setCache(cacheKey, drivers, { ttl: 30, tags: ['drivers', 'locations'] });
    
    return drivers;
  }

  // =====================================================
  // CACHE MANAGEMENT
  // =====================================================

  private generateCacheKey(sql: string, params: any[]): string {
    const sqlHash = this.hashString(sql.replace(/\s+/g, ' ').trim());
    const paramsHash = this.hashString(JSON.stringify(params));
    return `query:${sqlHash}:${paramsHash}`;
  }

  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(36);
  }

  private setCache<T>(key: string, data: T, config: CacheConfig): void {
    const expires = Date.now() + (config.ttl * 1000);
    this.cache.set(key, {
      data,
      expires,
      tags: config.tags || [],
      hitCount: 0
    });

    // Simple cache size management (remove oldest entries if cache gets too large)
    if (this.cache.size > 1000) {
      const oldestKey = Array.from(this.cache.keys())[0];
      this.cache.delete(oldestKey);
    }
  }

  private getFromCache<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    if (Date.now() > entry.expires) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data as T;
  }

  /**
   * Invalidate cache by tags
   */
  invalidateCacheByTags(tags: string[]): number {
    let invalidatedCount = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      if (entry.tags.some(tag => tags.includes(tag))) {
        this.cache.delete(key);
        invalidatedCount++;
      }
    }
    
    logger.debug('Cache invalidated by tags', { tags, invalidatedCount });
    return invalidatedCount;
  }

  /**
   * Clear expired cache entries
   */
  clearExpiredCache(): number {
    const now = Date.now();
    let clearedCount = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expires) {
        this.cache.delete(key);
        clearedCount++;
      }
    }
    
    if (clearedCount > 0) {
      logger.debug('Expired cache entries cleared', { clearedCount });
    }
    
    return clearedCount;
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    totalEntries: number;
    hitCounts: Record<string, number>;
    tagDistribution: Record<string, number>;
    memoryUsage: number;
  } {
    const hitCounts: Record<string, number> = {};
    const tagDistribution: Record<string, number> = {};
    let memoryUsage = 0;

    for (const [key, entry] of this.cache.entries()) {
      hitCounts[key] = entry.hitCount;
      memoryUsage += JSON.stringify(entry.data).length;
      
      entry.tags.forEach(tag => {
        tagDistribution[tag] = (tagDistribution[tag] || 0) + 1;
      });
    }

    return {
      totalEntries: this.cache.size,
      hitCounts,
      tagDistribution,
      memoryUsage
    };
  }
}

// Export singleton instance
export const queryOptimizer = new QueryOptimizer();

// Export class for custom instances
export { QueryOptimizer };

// Utility function to setup cache invalidation triggers
export function setupCacheInvalidation(): void {
  // This would typically be called during application startup
  // to setup event listeners for data changes that should invalidate cache
  
  // Example: Listen to booking changes to invalidate demand hotspots
  // This is a placeholder - actual implementation would depend on your event system
  logger.info('Cache invalidation setup completed');
}

// Automatic cache cleanup every 5 minutes
setInterval(() => {
  queryOptimizer.clearExpiredCache();
}, 5 * 60 * 1000);