// Real-time Location Update Scheduler
// Handles scheduled broadcasting of driver locations with batch processing

import { getWebSocketManager } from './websocket';
import { redis } from './redis';
import { locationBatchingService } from './locationBatching';

interface LocationUpdate {
  driverId: string;
  location: {
    latitude: number;
    longitude: number;
    accuracy?: number;
    bearing?: number;
    speed?: number;
  };
  status: string;
  isAvailable: boolean;
  regionId: string;
  timestamp: string;
}

class LocationSchedulerService {
  private schedulerInterval: NodeJS.Timeout | null = null;
  private isRunning = false;
  private readonly BROADCAST_INTERVAL = 30000; // 30 seconds
  private readonly BATCH_SIZE = 500; // Maximum updates per batch

  // Metrics tracking
  private metrics = {
    totalBroadcasts: 0,
    totalDriversUpdated: 0,
    averageBatchSize: 0,
    lastBroadcastTime: null as Date | null,
    broadcastsPerMinute: 0,
    errors: 0,
  };

  // Start the location broadcast scheduler
  start(): void {
    if (this.isRunning) {
      console.log('📍 Location scheduler is already running');
      return;
    }

    console.log('🚀 Starting real-time location broadcast scheduler...');
    console.log(`📡 Broadcasting driver locations every ${this.BROADCAST_INTERVAL / 1000} seconds`);
    
    this.isRunning = true;
    this.schedulerInterval = setInterval(() => {
      this.broadcastLocationUpdates();
    }, this.BROADCAST_INTERVAL);

    // Initial broadcast
    this.broadcastLocationUpdates();
  }

  // Stop the scheduler
  stop(): void {
    if (!this.isRunning) return;

    console.log('⏹️ Stopping location broadcast scheduler...');
    
    if (this.schedulerInterval) {
      clearInterval(this.schedulerInterval);
      this.schedulerInterval = null;
    }
    
    this.isRunning = false;
  }

  // Main broadcast method
  private async broadcastLocationUpdates(): Promise<void> {
    const startTime = Date.now();
    
    try {
      const wsManager = getWebSocketManager();
      if (!wsManager) {
        console.warn('⚠️ WebSocket manager not available for location broadcast');
        return;
      }

      // Get all active driver locations from Redis
      const activeDrivers = await this.getActiveDriverLocations();
      
      if (activeDrivers.length === 0) {
        console.log('📍 No active drivers to broadcast');
        return;
      }

      // Group drivers by region for efficient broadcasting
      const driversByRegion = this.groupDriversByRegion(activeDrivers);
      
      // Broadcast in batches for each region
      for (const [regionId, drivers] of Object.entries(driversByRegion)) {
        await this.broadcastRegionBatches(regionId, drivers, wsManager);
      }

      // Update metrics
      this.updateMetrics(activeDrivers.length, Date.now() - startTime);
      
      console.log(
        `📡 Location broadcast completed: ${activeDrivers.length} drivers, ` +
        `${Object.keys(driversByRegion).length} regions, ` +
        `${Date.now() - startTime}ms`
      );

    } catch (error) {
      console.error('❌ Error in location broadcast:', error);
      this.metrics.errors++;
    }
  }

  // Get active driver locations from Redis
  private async getActiveDriverLocations(): Promise<LocationUpdate[]> {
    try {
      // Get all driver location keys
      const locationKeys = await redis.keys('driver:location:*');
      
      if (locationKeys.length === 0) return [];

      // Get locations in batches to avoid memory issues
      const locations: LocationUpdate[] = [];
      const batchSize = 100;
      
      for (let i = 0; i < locationKeys.length; i += batchSize) {
        const batch = locationKeys.slice(i, i + batchSize);
        const batchLocations = await redis.mget(batch);
        
        for (let j = 0; j < batch.length; j++) {
          const locationData = batchLocations[j];
          if (locationData) {
            try {
              const parsed = JSON.parse(locationData);
              
              // Only include recent locations (within last 5 minutes)
              const lastUpdate = new Date(parsed.timestamp).getTime();
              const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
              
              if (lastUpdate > fiveMinutesAgo && parsed.isAvailable !== false) {
                const driverId = batch[j].split(':')[2];
                locations.push({
                  driverId,
                  location: {
                    latitude: parsed.latitude,
                    longitude: parsed.longitude,
                    accuracy: parsed.accuracy,
                    bearing: parsed.bearing,
                    speed: parsed.speed,
                  },
                  status: parsed.status || 'active',
                  isAvailable: parsed.isAvailable ?? true,
                  regionId: parsed.regionId,
                  timestamp: parsed.timestamp,
                });
              }
            } catch (parseError) {
              console.warn(`⚠️ Failed to parse location data for ${batch[j]}:`, parseError);
            }
          }
        }
      }

      return locations;
    } catch (error) {
      console.error('❌ Error fetching driver locations:', error);
      return [];
    }
  }

  // Group drivers by region for efficient broadcasting
  private groupDriversByRegion(drivers: LocationUpdate[]): Record<string, LocationUpdate[]> {
    const grouped: Record<string, LocationUpdate[]> = {};
    
    for (const driver of drivers) {
      const regionId = driver.regionId || 'unknown';
      if (!grouped[regionId]) {
        grouped[regionId] = [];
      }
      grouped[regionId].push(driver);
    }
    
    return grouped;
  }

  // Broadcast region batches
  private async broadcastRegionBatches(
    regionId: string, 
    drivers: LocationUpdate[], 
    wsManager: any
  ): Promise<void> {
    // Split into batches if too many drivers
    const batches = this.chunkArray(drivers, this.BATCH_SIZE);
    
    for (const batch of batches) {
      // Use the enhanced batch broadcasting
      wsManager.broadcastBatchLocationUpdates(batch, regionId);
      
      // Also send individual updates for immediate responsiveness
      for (const driver of batch) {
        wsManager.broadcastToRegion(regionId, 'driver:location_updated', {
          driverId: driver.driverId,
          location: driver.location,
          status: driver.status,
          isAvailable: driver.isAvailable,
          regionId: driver.regionId,
          timestamp: driver.timestamp,
        });
      }
    }
  }

  // Utility method to chunk arrays
  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  // Update performance metrics
  private updateMetrics(driversCount: number, processingTime: number): void {
    this.metrics.totalBroadcasts++;
    this.metrics.totalDriversUpdated += driversCount;
    this.metrics.averageBatchSize = this.metrics.totalDriversUpdated / this.metrics.totalBroadcasts;
    this.metrics.lastBroadcastTime = new Date();
    
    // Calculate broadcasts per minute (sliding window)
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    this.metrics.broadcastsPerMinute = this.metrics.totalBroadcasts; // Simplified calculation
  }

  // Force immediate broadcast (for manual triggers)
  async forceBroadcast(): Promise<void> {
    console.log('🚀 Force broadcasting location updates...');
    await this.broadcastLocationUpdates();
  }

  // Get scheduler status and metrics
  getStatus() {
    return {
      isRunning: this.isRunning,
      broadcastInterval: this.BROADCAST_INTERVAL,
      batchSize: this.BATCH_SIZE,
      metrics: {
        ...this.metrics,
        uptimeSeconds: this.isRunning 
          ? Math.floor((Date.now() - (this.metrics.lastBroadcastTime?.getTime() || Date.now())) / 1000)
          : 0,
      },
    };
  }

  // Health check
  isHealthy(): boolean {
    const lastBroadcast = this.metrics.lastBroadcastTime;
    if (!lastBroadcast) return false;
    
    // Consider healthy if last broadcast was within the last 2 minutes
    const twoMinutesAgo = Date.now() - (2 * 60 * 1000);
    return lastBroadcast.getTime() > twoMinutesAgo && this.isRunning;
  }
}

// Singleton instance
export const locationScheduler = new LocationSchedulerService();

// Auto-start when imported (in production)
if (process.env.NODE_ENV === 'production' || process.env.AUTO_START_SCHEDULER === 'true') {
  // Start after a short delay to ensure other services are ready
  setTimeout(() => {
    locationScheduler.start();
  }, 5000);
}