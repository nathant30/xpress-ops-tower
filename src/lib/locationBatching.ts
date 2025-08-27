// Location Data Batching System for High-Performance Real-time Updates
// Optimized for 10,000+ concurrent drivers with intelligent batching strategies

import { redis } from './redis';
import { getWebSocketManager } from './websocket';

export interface LocationBatch {
  batchId: string;
  timestamp: number;
  regionId: string;
  updates: LocationUpdate[];
  metadata: {
    batchSize: number;
    processingTime?: number;
    priority: 'normal' | 'high' | 'emergency';
  };
}

export interface LocationUpdate {
  driverId: string;
  latitude: number;
  longitude: number;
  accuracy?: number;
  bearing?: number;
  speed?: number;
  status: string;
  isAvailable: boolean;
  timestamp: number;
  address?: string;
  regionId: string;
  priority?: 'normal' | 'high' | 'emergency';
}

export interface BatchingConfig {
  maxBatchSize: number;
  maxBatchDelay: number; // milliseconds
  priorityBatchDelay: number; // for emergency updates
  compressionThreshold: number; // Enable compression above this size
  enableGeospatialOptimization: boolean;
  retryAttempts: number;
  retryDelay: number;
}

export class LocationBatchingService {
  private static instance: LocationBatchingService;
  private config: BatchingConfig;
  private pendingBatches: Map<string, LocationUpdate[]> = new Map();
  private batchTimers: Map<string, NodeJS.Timeout> = new Map();
  private processingQueue: LocationBatch[] = [];
  private isProcessing = false;
  private metrics = {
    totalBatches: 0,
    totalUpdates: 0,
    averageBatchSize: 0,
    averageProcessingTime: 0,
    errorCount: 0,
    lastProcessedAt: null as Date | null
  };

  constructor(config?: Partial<BatchingConfig>) {
    this.config = {
      maxBatchSize: 500,
      maxBatchDelay: 1000,
      priorityBatchDelay: 100,
      compressionThreshold: 100,
      enableGeospatialOptimization: true,
      retryAttempts: 3,
      retryDelay: 1000,
      ...config
    };

    this.startProcessingLoop();
    this.startMetricsCollection();
  }

  static getInstance(config?: Partial<BatchingConfig>): LocationBatchingService {
    if (!LocationBatchingService.instance) {
      LocationBatchingService.instance = new LocationBatchingService(config);
    }
    return LocationBatchingService.instance;
  }

  /**
   * Add a location update to the batching queue
   */
  async addLocationUpdate(update: LocationUpdate): Promise<void> {
    const batchKey = this.getBatchKey(update);
    
    // Get or create batch for this key
    if (!this.pendingBatches.has(batchKey)) {
      this.pendingBatches.set(batchKey, []);
    }

    const batch = this.pendingBatches.get(batchKey)!;
    
    // Check if this is an update for an existing driver (deduplicate)
    const existingIndex = batch.findIndex(existing => existing.driverId === update.driverId);
    if (existingIndex >= 0) {
      // Update existing entry with latest data
      batch[existingIndex] = {
        ...batch[existingIndex],
        ...update,
        timestamp: Math.max(batch[existingIndex].timestamp, update.timestamp)
      };
    } else {
      batch.push(update);
    }

    // Check if we should process this batch immediately
    if (this.shouldProcessImmediately(batch, update)) {
      await this.processBatch(batchKey);
    } else if (!this.batchTimers.has(batchKey)) {
      // Set up timer for this batch if it doesn't exist
      this.setupBatchTimer(batchKey, update.priority || 'normal');
    }
  }

  /**
   * Force process all pending batches
   */
  async flushAllBatches(): Promise<void> {
    const promises = Array.from(this.pendingBatches.keys()).map(batchKey => 
      this.processBatch(batchKey)
    );
    
    await Promise.allSettled(promises);
  }

  /**
   * Get performance metrics
   */
  getMetrics() {
    return { ...this.metrics };
  }

  /**
   * Generate batch key for grouping updates
   */
  private getBatchKey(update: LocationUpdate): string {
    if (this.config.enableGeospatialOptimization) {
      // Group by region and geohash for spatial locality
      const geohash = this.getGeohash(update.latitude, update.longitude, 6);
      return `${update.regionId}:${geohash}`;
    } else {
      // Simple regional batching
      return update.regionId;
    }
  }

  /**
   * Check if batch should be processed immediately
   */
  private shouldProcessImmediately(batch: LocationUpdate[], update: LocationUpdate): boolean {
    // Emergency updates are processed immediately
    if (update.priority === 'emergency' || update.status === 'emergency') {
      return true;
    }

    // Process if batch size limit reached
    if (batch.length >= this.config.maxBatchSize) {
      return true;
    }

    return false;
  }

  /**
   * Setup timer for batch processing
   */
  private setupBatchTimer(batchKey: string, priority: 'normal' | 'high' | 'emergency'): void {
    const delay = priority === 'emergency' || priority === 'high' 
      ? this.config.priorityBatchDelay 
      : this.config.maxBatchDelay;

    const timer = setTimeout(async () => {
      await this.processBatch(batchKey);
    }, delay);

    this.batchTimers.set(batchKey, timer);
  }

  /**
   * Process a specific batch
   */
  private async processBatch(batchKey: string): Promise<void> {
    const batch = this.pendingBatches.get(batchKey);
    if (!batch || batch.length === 0) {
      return;
    }

    // Clear timer and remove from pending
    const timer = this.batchTimers.get(batchKey);
    if (timer) {
      clearTimeout(timer);
      this.batchTimers.delete(batchKey);
    }
    
    this.pendingBatches.delete(batchKey);

    // Create batch object
    const locationBatch: LocationBatch = {
      batchId: `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      regionId: batch[0].regionId,
      updates: batch,
      metadata: {
        batchSize: batch.length,
        priority: this.getBatchPriority(batch)
      }
    };

    // Add to processing queue
    this.processingQueue.push(locationBatch);
    
    // Start processing if not already running
    if (!this.isProcessing) {
      this.processQueue();
    }
  }

  /**
   * Main processing loop for batches
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.processingQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    while (this.processingQueue.length > 0) {
      const batch = this.processingQueue.shift()!;
      const startTime = Date.now();

      try {
        await this.processSingleBatch(batch);
        
        // Update metrics
        const processingTime = Date.now() - startTime;
        batch.metadata.processingTime = processingTime;
        
        this.updateMetrics(batch);
        
      } catch (error) {
        console.error(`Error processing batch ${batch.batchId}:`, error);
        this.metrics.errorCount++;
        
        // Retry logic
        await this.retryBatch(batch);
      }
    }

    this.isProcessing = false;
  }

  /**
   * Process a single batch with all optimizations
   */
  private async processSingleBatch(batch: LocationBatch): Promise<void> {
    const { updates } = batch;

    // 1. Database updates (bulk upsert)
    await this.bulkUpdateDatabase(updates);

    // 2. Redis cache updates (pipeline)
    await this.bulkUpdateRedisCache(updates);

    // 3. WebSocket broadcasts (optimized)
    await this.broadcastLocationUpdates(batch);

    // 4. Trigger dependent processes
    await this.triggerDependentProcesses(batch);
  }

  /**
   * Bulk update database with batch
   */
  private async bulkUpdateDatabase(updates: LocationUpdate[]): Promise<void> {
    const { db } = await import('./database');
    
    const values = updates.map((update, index) => {
      const offset = index * 12;
      return `($${offset + 1}, ST_Point($${offset + 2}, $${offset + 3}), $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9}, $${offset + 10}, $${offset + 11}, to_timestamp($${offset + 12}))`;
    }).join(',');

    const params = updates.flatMap(update => [
      update.driverId,
      update.longitude,
      update.latitude,
      update.accuracy || null,
      update.bearing || null,
      update.speed || null,
      update.address || null,
      update.regionId,
      update.status,
      update.isAvailable,
      update.timestamp / 1000 // Convert to seconds
    ]);

    const query = `
      INSERT INTO driver_locations (
        driver_id, location, accuracy, bearing, speed, 
        address, region_id, driver_status, is_available, recorded_at, created_at, expires_at
      ) VALUES ${values}
      ON CONFLICT (driver_id, recorded_at) 
      DO UPDATE SET
        location = EXCLUDED.location,
        accuracy = EXCLUDED.accuracy,
        bearing = EXCLUDED.bearing,
        speed = EXCLUDED.speed,
        address = EXCLUDED.address,
        driver_status = EXCLUDED.driver_status,
        is_available = EXCLUDED.is_available,
        expires_at = NOW() + INTERVAL '24 hours'
    `;

    await db.query(query, params);
  }

  /**
   * Bulk update Redis cache using pipeline
   */
  private async bulkUpdateRedisCache(updates: LocationUpdate[]): Promise<void> {
    const pipeline = redis.pipeline();

    updates.forEach(update => {
      const locationKey = `driver:location:${update.driverId}`;
      const locationData = {
        latitude: update.latitude,
        longitude: update.longitude,
        accuracy: update.accuracy,
        bearing: update.bearing,
        speed: update.speed,
        status: update.status,
        isAvailable: update.isAvailable,
        timestamp: update.timestamp,
        address: update.address,
        regionId: update.regionId
      };

      // Set location data with TTL
      pipeline.setex(locationKey, 3600, JSON.stringify(locationData));
      
      // Update geospatial index
      pipeline.geoadd(
        `region:drivers:${update.regionId}`,
        update.longitude,
        update.latitude,
        update.driverId
      );

      // Update status index
      pipeline.sadd(`status:${update.status}`, update.driverId);
    });

    await pipeline.exec();
  }

  /**
   * Broadcast location updates via WebSocket
   */
  private async broadcastLocationUpdates(batch: LocationBatch): Promise<void> {
    const wsManager = getWebSocketManager();
    if (!wsManager) return;

    const { updates } = batch;

    // Group updates by priority for different broadcast strategies
    const emergencyUpdates = updates.filter(u => u.priority === 'emergency' || u.status === 'emergency');
    const regularUpdates = updates.filter(u => u.priority !== 'emergency' && u.status !== 'emergency');

    // Emergency updates - broadcast immediately to all relevant users
    if (emergencyUpdates.length > 0) {
      for (const update of emergencyUpdates) {
        await redis.publish('driver:location_updated', {
          driverId: update.driverId,
          location: {
            latitude: update.latitude,
            longitude: update.longitude,
            accuracy: update.accuracy,
            bearing: update.bearing,
            speed: update.speed
          },
          status: update.status,
          isAvailable: update.isAvailable,
          regionId: update.regionId,
          timestamp: new Date(update.timestamp).toISOString(),
          priority: 'emergency'
        });
      }
    }

    // Regular updates - batch broadcast
    if (regularUpdates.length > 0) {
      // Group by region for efficient broadcasting
      const regionGroups = new Map<string, LocationUpdate[]>();
      regularUpdates.forEach(update => {
        if (!regionGroups.has(update.regionId)) {
          regionGroups.set(update.regionId, []);
        }
        regionGroups.get(update.regionId)!.push(update);
      });

      // Broadcast by region
      for (const [regionId, regionUpdates] of regionGroups) {
        await redis.publish('driver:bulk_location_update', {
          regionId,
          updates: regionUpdates.map(update => ({
            driverId: update.driverId,
            location: {
              latitude: update.latitude,
              longitude: update.longitude,
              accuracy: update.accuracy,
              bearing: update.bearing,
              speed: update.speed
            },
            status: update.status,
            isAvailable: update.isAvailable,
            timestamp: new Date(update.timestamp).toISOString()
          })),
          batchId: batch.batchId,
          timestamp: new Date(batch.timestamp).toISOString()
        });
      }
    }
  }

  /**
   * Trigger dependent processes (analytics, alerts, etc.)
   */
  private async triggerDependentProcesses(batch: LocationBatch): Promise<void> {
    // Update demand heatmap data
    await this.updateDemandHeatmap(batch);
    
    // Check for geofence violations
    await this.checkGeofenceEvents(batch);
    
    // Update regional analytics
    await this.updateRegionalAnalytics(batch);
  }

  /**
   * Update demand heatmap data
   */
  private async updateDemandHeatmap(batch: LocationBatch): Promise<void> {
    const activeDrivers = batch.updates.filter(u => u.status === 'active' && u.isAvailable);
    
    if (activeDrivers.length === 0) return;

    // Calculate demand density for this batch
    const demandPoints = await this.calculateDemandDensity(activeDrivers);
    
    if (demandPoints.length > 0) {
      await redis.publish('demand:updated', demandPoints);
    }
  }

  /**
   * Check for geofence violations/events
   */
  private async checkGeofenceEvents(batch: LocationBatch): Promise<void> {
    // This would integrate with the geofence service
    // For now, just log that we would check
    console.log(`Checking geofence events for batch ${batch.batchId} with ${batch.updates.length} updates`);
  }

  /**
   * Update regional analytics
   */
  private async updateRegionalAnalytics(batch: LocationBatch): Promise<void> {
    const regionStats = {
      regionId: batch.metadata.priority,
      activeDrivers: batch.updates.filter(u => u.status === 'active').length,
      busyDrivers: batch.updates.filter(u => u.status === 'busy').length,
      emergencyDrivers: batch.updates.filter(u => u.status === 'emergency').length,
      lastUpdate: new Date(batch.timestamp).toISOString()
    };

    await redis.setex(`analytics:region:${batch.regionId}`, 300, JSON.stringify(regionStats));
  }

  /**
   * Calculate demand density from driver locations
   */
  private async calculateDemandDensity(drivers: LocationUpdate[]): Promise<any[]> {
    // Simple grid-based density calculation
    const gridSize = 0.01; // ~1km grid
    const densityGrid = new Map<string, number>();

    drivers.forEach(driver => {
      const gridX = Math.floor(driver.latitude / gridSize);
      const gridY = Math.floor(driver.longitude / gridSize);
      const gridKey = `${gridX},${gridY}`;
      
      densityGrid.set(gridKey, (densityGrid.get(gridKey) || 0) + 1);
    });

    // Convert to heatmap points
    const heatmapPoints = Array.from(densityGrid.entries()).map(([gridKey, count]) => {
      const [gridX, gridY] = gridKey.split(',').map(Number);
      return {
        latitude: gridX * gridSize + gridSize / 2,
        longitude: gridY * gridSize + gridSize / 2,
        intensity: Math.min(count * 10, 100), // Scale to 0-100
        demandType: 'driver_concentration',
        regionId: drivers[0]?.regionId || 'unknown',
        timestamp: new Date()
      };
    });

    return heatmapPoints;
  }

  /**
   * Retry failed batch processing
   */
  private async retryBatch(batch: LocationBatch, attempt = 1): Promise<void> {
    if (attempt > this.config.retryAttempts) {
      console.error(`Batch ${batch.batchId} failed after ${this.config.retryAttempts} attempts`);
      return;
    }

    await new Promise(resolve => setTimeout(resolve, this.config.retryDelay * attempt));
    
    try {
      await this.processSingleBatch(batch);
      console.log(`Batch ${batch.batchId} succeeded on retry ${attempt}`);
    } catch (error) {
      console.error(`Batch ${batch.batchId} retry ${attempt} failed:`, error);
      await this.retryBatch(batch, attempt + 1);
    }
  }

  /**
   * Get batch priority based on updates
   */
  private getBatchPriority(updates: LocationUpdate[]): 'normal' | 'high' | 'emergency' {
    if (updates.some(u => u.priority === 'emergency' || u.status === 'emergency')) {
      return 'emergency';
    }
    
    if (updates.some(u => u.priority === 'high' || u.status === 'busy')) {
      return 'high';
    }

    return 'normal';
  }

  /**
   * Simple geohash implementation for spatial grouping
   */
  private getGeohash(lat: number, lng: number, precision: number): string {
    const chars = '0123456789bcdefghjkmnpqrstuvwxyz';
    let bit = 0;
    let bitCount = 0;
    let hash = '';

    let latRange = [-90, 90];
    let lngRange = [-180, 180];

    while (hash.length < precision) {
      const isEven = bitCount % 2 === 0;
      const range = isEven ? lngRange : latRange;
      const value = isEven ? lng : lat;
      const mid = (range[0] + range[1]) / 2;

      if (value >= mid) {
        bit |= 1 << (4 - (bitCount % 5));
        range[0] = mid;
      } else {
        range[1] = mid;
      }

      bitCount++;
      
      if (bitCount === 5) {
        hash += chars[bit];
        bit = 0;
        bitCount = 0;
      }
    }

    return hash;
  }

  /**
   * Update performance metrics
   */
  private updateMetrics(batch: LocationBatch): void {
    this.metrics.totalBatches++;
    this.metrics.totalUpdates += batch.metadata.batchSize;
    
    // Update averages
    this.metrics.averageBatchSize = this.metrics.totalUpdates / this.metrics.totalBatches;
    
    if (batch.metadata.processingTime) {
      this.metrics.averageProcessingTime = (
        (this.metrics.averageProcessingTime * (this.metrics.totalBatches - 1) + batch.metadata.processingTime) 
        / this.metrics.totalBatches
      );
    }
    
    this.metrics.lastProcessedAt = new Date();
  }

  /**
   * Start metrics collection loop
   */
  private startMetricsCollection(): void {
    setInterval(() => {
      // Log metrics periodically
      console.log('Location Batching Metrics:', {
        ...this.metrics,
        pendingBatches: this.pendingBatches.size,
        processingQueueLength: this.processingQueue.length,
        isProcessing: this.isProcessing
      });
    }, 60000); // Every minute
  }

  /**
   * Start the main processing loop
   */
  private startProcessingLoop(): void {
    setInterval(() => {
      if (!this.isProcessing && this.processingQueue.length > 0) {
        this.processQueue();
      }
    }, 100); // Check every 100ms
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    // Clear all timers
    for (const timer of this.batchTimers.values()) {
      clearTimeout(timer);
    }
    this.batchTimers.clear();

    // Process remaining batches
    this.flushAllBatches();
  }
}

// Export singleton instance
export const locationBatchingService = LocationBatchingService.getInstance();