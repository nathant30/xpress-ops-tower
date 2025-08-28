// Ridesharing Ride Matching Algorithm Tests
// Critical test: Driver assignment must complete within 30 seconds
// Validates algorithm performance under high demand scenarios

import { MockDataService } from '@/lib/mockData';
import { redis } from '@/lib/redis';
import { DriverStatus, BookingStatus, ServiceType } from '@/types/fleet';

// Mock Redis for testing
jest.mock('@/lib/redis');
const mockRedis = redis as jest.Mocked<typeof redis>;

describe('Ride Matching Algorithm', () => {
  let mockDrivers: any[];
  let mockBooking: any;
  
  beforeEach(() => {
    // Reset Redis mocks
    mockRedis.get.mockClear();
    mockRedis.set.mockClear();
    mockRedis.publish.mockClear();
    mockRedis.expire.mockClear();
    
    // Set up test data
    mockDrivers = [
      {
        id: 'driver-1',
        driverCode: 'DRV001',
        status: 'active' as DriverStatus,
        services: ['ride_4w'] as ServiceType[],
        rating: 4.8,
        location: {
          type: 'Point',
          coordinates: [120.9842, 14.5995] // Makati area
        },
        isActive: true,
        regionId: 'ncr-manila',
        lastLocationUpdate: new Date()
      },
      {
        id: 'driver-2', 
        driverCode: 'DRV002',
        status: 'active' as DriverStatus,
        services: ['ride_4w', 'ride_2w'] as ServiceType[],
        rating: 4.5,
        location: {
          type: 'Point',
          coordinates: [120.9900, 14.6000] // Slightly further
        },
        isActive: true,
        regionId: 'ncr-manila',
        lastLocationUpdate: new Date()
      },
      {
        id: 'driver-3',
        driverCode: 'DRV003', 
        status: 'busy' as DriverStatus, // Not available
        services: ['ride_4w'] as ServiceType[],
        rating: 4.9,
        location: {
          type: 'Point',
          coordinates: [120.9840, 14.5990]
        },
        isActive: true,
        regionId: 'ncr-manila',
        lastLocationUpdate: new Date()
      }
    ];
    
    mockBooking = {
      id: 'booking-test-001',
      bookingReference: 'BK20240828001',
      serviceType: 'ride_4w' as ServiceType,
      status: 'searching' as BookingStatus,
      pickupLocation: {
        type: 'Point',
        coordinates: [120.9842, 14.5995] // Same as driver-1
      },
      pickupAddress: 'Makati Central Business District',
      regionId: 'ncr-manila',
      requestedAt: new Date(),
      estimatedPickupTime: new Date(Date.now() + 10 * 60000), // 10 minutes
      customerId: 'customer-001',
      customerInfo: {
        name: 'Test Customer',
        phone: '+639171234567'
      }
    };
  });

  describe('Basic Matching Algorithm', () => {
    it('should find available drivers within service radius', async () => {
      // Mock driver location data from Redis
      mockRedis.get.mockImplementation((key: string) => {
        if (key.includes('driver_location')) {
          const driverId = key.split(':')[2];
          const driver = mockDrivers.find(d => d.id === driverId);
          return Promise.resolve(JSON.stringify({
            latitude: driver?.location.coordinates[1],
            longitude: driver?.location.coordinates[0],
            status: driver?.status,
            isAvailable: driver?.status === 'active'
          }));
        }
        return Promise.resolve(null);
      });

      const startTime = Date.now();
      
      // Simulate ride matching algorithm
      const availableDrivers = await findAvailableDrivers(mockBooking);
      
      const matchingTime = Date.now() - startTime;
      
      // Critical requirement: Matching must complete within 30 seconds
      expect(matchingTime).toBeLessThan(30000);
      
      // Should find only active drivers
      expect(availableDrivers).toHaveLength(2);
      expect(availableDrivers.map(d => d.id)).toContain('driver-1');
      expect(availableDrivers.map(d => d.id)).toContain('driver-2');
      expect(availableDrivers.map(d => d.id)).not.toContain('driver-3'); // busy driver
    });

    it('should prioritize drivers by proximity and rating', async () => {
      mockRedis.get.mockImplementation((key: string) => {
        if (key.includes('driver_location')) {
          const driverId = key.split(':')[2];
          const driver = mockDrivers.find(d => d.id === driverId);
          return Promise.resolve(JSON.stringify({
            latitude: driver?.location.coordinates[1],
            longitude: driver?.location.coordinates[0],
            status: driver?.status,
            isAvailable: driver?.status === 'active'
          }));
        }
        return Promise.resolve(null);
      });

      const availableDrivers = await findAvailableDrivers(mockBooking);
      
      // Should be sorted by proximity first, then rating
      expect(availableDrivers[0].id).toBe('driver-1'); // Closer and high rating
      expect(availableDrivers[1].id).toBe('driver-2'); // Further but still good rating
    });

    it('should handle service type matching correctly', async () => {
      // Test with 2-wheeler service request
      const twoBikeBooking = {
        ...mockBooking,
        serviceType: 'ride_2w' as ServiceType
      };

      mockRedis.get.mockImplementation((key: string) => {
        if (key.includes('driver_location')) {
          const driverId = key.split(':')[2];
          const driver = mockDrivers.find(d => d.id === driverId);
          return Promise.resolve(JSON.stringify({
            latitude: driver?.location.coordinates[1],
            longitude: driver?.location.coordinates[0],
            status: driver?.status,
            isAvailable: driver?.status === 'active'
          }));
        }
        return Promise.resolve(null);
      });

      const availableDrivers = await findAvailableDrivers(twoBikeBooking);
      
      // Only driver-2 supports ride_2w
      expect(availableDrivers).toHaveLength(1);
      expect(availableDrivers[0].id).toBe('driver-2');
    });
  });

  describe('High Demand Scenarios', () => {
    it('should handle 1000+ concurrent ride requests efficiently', async () => {
      // Simulate high demand scenario
      const concurrentBookings = Array.from({ length: 1000 }, (_, i) => ({
        ...mockBooking,
        id: `booking-${i}`,
        bookingReference: `BK${Date.now()}${i.toString().padStart(3, '0')}`,
        customerId: `customer-${i}`
      }));

      const startTime = Date.now();
      
      // Process all bookings concurrently
      const matchingPromises = concurrentBookings.map(booking => 
        findAvailableDrivers(booking).catch(err => ({ error: err.message }))
      );
      
      const results = await Promise.all(matchingPromises);
      const processingTime = Date.now() - startTime;
      
      // Critical: Should complete all matches within 60 seconds
      expect(processingTime).toBeLessThan(60000);
      
      // Check for errors
      const errors = results.filter(r => 'error' in r);
      expect(errors.length).toBeLessThan(results.length * 0.05); // Less than 5% error rate
      
      console.log(`Processed ${concurrentBookings.length} bookings in ${processingTime}ms`);
    });

    it('should implement surge pricing during high demand', async () => {
      // Simulate high demand in specific area
      const highDemandArea = {
        latitude: 14.5995,
        longitude: 120.9842,
        radius: 2 // 2km radius
      };

      const surgeData = await calculateSurgeMultiplier(highDemandArea);
      
      // Should detect high demand and increase pricing
      expect(surgeData.multiplier).toBeGreaterThan(1.0);
      expect(surgeData.multiplier).toBeLessThanOrEqual(3.0); // Max 3x surge
      expect(surgeData.reason).toContain('high demand');
      
      // Should affect booking estimation
      const estimatedFare = calculateEstimatedFare(mockBooking, surgeData.multiplier);
      expect(estimatedFare).toBeGreaterThan(calculateEstimatedFare(mockBooking, 1.0));
    });

    it('should handle driver shortage gracefully', async () => {
      // Simulate scenario with very few available drivers
      const limitedDrivers = mockDrivers.map(d => ({
        ...d,
        status: 'offline' as DriverStatus
      }));
      
      // Only one driver available
      limitedDrivers[0].status = 'active' as DriverStatus;

      mockRedis.get.mockImplementation((key: string) => {
        if (key.includes('driver_location')) {
          const driverId = key.split(':')[2];
          const driver = limitedDrivers.find(d => d.id === driverId);
          return Promise.resolve(JSON.stringify({
            latitude: driver?.location.coordinates[1],
            longitude: driver?.location.coordinates[0],
            status: driver?.status,
            isAvailable: driver?.status === 'active'
          }));
        }
        return Promise.resolve(null);
      });

      const availableDrivers = await findAvailableDrivers(mockBooking);
      
      expect(availableDrivers).toHaveLength(1);
      
      // Should trigger driver incentive system
      const incentiveData = await calculateDriverIncentives('ncr-manila');
      expect(incentiveData.bonusMultiplier).toBeGreaterThan(1.0);
      expect(incentiveData.reason).toContain('low supply');
    });
  });

  describe('Emergency Response Integration', () => {
    it('should prioritize emergency bookings', async () => {
      const emergencyBooking = {
        ...mockBooking,
        priority: 'emergency',
        emergencyType: 'medical_emergency',
        description: 'Patient needs immediate hospital transport'
      };

      const startTime = Date.now();
      const availableDrivers = await findAvailableDrivers(emergencyBooking);
      const matchingTime = Date.now() - startTime;
      
      // Emergency matching should be even faster
      expect(matchingTime).toBeLessThan(10000); // Under 10 seconds
      
      // Should notify emergency services
      expect(mockRedis.publish).toHaveBeenCalledWith(
        'emergency:booking_created',
        expect.objectContaining({
          bookingId: emergencyBooking.id,
          priority: 'emergency',
          emergencyType: 'medical_emergency'
        })
      );
    });

    it('should handle SOS situations during active rides', async () => {
      const activeBooking = {
        ...mockBooking,
        status: 'in_progress' as BookingStatus,
        driverId: 'driver-1',
        acceptedAt: new Date(Date.now() - 10 * 60000) // Started 10 minutes ago
      };

      const sosAlert = {
        bookingId: activeBooking.id,
        driverId: activeBooking.driverId,
        location: mockBooking.pickupLocation,
        emergencyType: 'security_threat',
        triggeredBy: 'passenger'
      };

      const responseTime = await processSosAlert(sosAlert);
      
      // Critical: SOS response must be under 5 seconds
      expect(responseTime).toBeLessThan(5000);
      
      // Should automatically notify authorities
      expect(mockRedis.publish).toHaveBeenCalledWith(
        'emergency:sos_triggered',
        expect.objectContaining({
          bookingId: activeBooking.id,
          priority: 'critical'
        })
      );
    });
  });

  describe('Performance Optimization', () => {
    it('should efficiently process location updates from 10K+ drivers', async () => {
      const driverLocations = Array.from({ length: 10000 }, (_, i) => ({
        driverId: `driver-${i}`,
        latitude: 14.5995 + (Math.random() - 0.5) * 0.1,
        longitude: 120.9842 + (Math.random() - 0.5) * 0.1,
        timestamp: Date.now()
      }));

      const startTime = Date.now();
      
      // Process all location updates
      const updatePromises = driverLocations.map(location => 
        updateDriverLocation(location.driverId, location)
      );
      
      await Promise.all(updatePromises);
      const processingTime = Date.now() - startTime;
      
      // Should process 10K updates within 30 seconds
      expect(processingTime).toBeLessThan(30000);
      
      console.log(`Processed ${driverLocations.length} location updates in ${processingTime}ms`);
    });

    it('should maintain real-time accuracy with batched updates', async () => {
      const batchSize = 100;
      const updates = Array.from({ length: 1000 }, (_, i) => ({
        driverId: `driver-${i % 50}`, // 50 unique drivers with multiple updates
        latitude: 14.5995 + (Math.random() - 0.5) * 0.01,
        longitude: 120.9842 + (Math.random() - 0.5) * 0.01,
        timestamp: Date.now() + i
      }));

      const batches = [];
      for (let i = 0; i < updates.length; i += batchSize) {
        batches.push(updates.slice(i, i + batchSize));
      }

      const startTime = Date.now();
      
      // Process in batches
      for (const batch of batches) {
        await processBatchLocationUpdates(batch);
      }
      
      const totalTime = Date.now() - startTime;
      
      // Batch processing should be efficient
      expect(totalTime).toBeLessThan(10000); // Under 10 seconds for 1K updates
      
      // Verify latest location is stored correctly
      const latestLocation = await mockRedis.get('driver_location:driver-0');
      expect(latestLocation).toBeTruthy();
    });
  });
});

// Helper functions (would be implemented in actual ride matching service)
async function findAvailableDrivers(booking: any): Promise<any[]> {
  // Mock implementation for testing
  const availableDrivers = mockDrivers.filter(driver => 
    driver.status === 'active' && 
    driver.services.includes(booking.serviceType) &&
    driver.regionId === booking.regionId
  );

  // Sort by proximity and rating
  return availableDrivers.sort((a, b) => {
    const distanceA = calculateDistance(
      booking.pickupLocation.coordinates,
      a.location.coordinates
    );
    const distanceB = calculateDistance(
      booking.pickupLocation.coordinates, 
      b.location.coordinates
    );
    
    if (Math.abs(distanceA - distanceB) < 0.5) {
      // If similar distance, prioritize by rating
      return b.rating - a.rating;
    }
    
    return distanceA - distanceB;
  });
}

function calculateDistance(coord1: [number, number], coord2: [number, number]): number {
  // Simple distance calculation for testing
  const dx = coord1[0] - coord2[0];
  const dy = coord1[1] - coord2[1];
  return Math.sqrt(dx * dx + dy * dy);
}

async function calculateSurgeMultiplier(area: any): Promise<{ multiplier: number; reason: string }> {
  // Mock surge calculation
  const demandRatio = Math.random() * 3; // Mock demand vs supply ratio
  
  if (demandRatio > 2) {
    return { multiplier: 2.5, reason: 'very high demand' };
  } else if (demandRatio > 1.5) {
    return { multiplier: 1.8, reason: 'high demand' };
  } else if (demandRatio > 1.2) {
    return { multiplier: 1.3, reason: 'moderate demand' };
  }
  
  return { multiplier: 1.0, reason: 'normal demand' };
}

function calculateEstimatedFare(booking: any, surgeMultiplier: number): number {
  const baseFare = 50; // Base fare in PHP
  return baseFare * surgeMultiplier;
}

async function calculateDriverIncentives(regionId: string): Promise<{ bonusMultiplier: number; reason: string }> {
  // Mock incentive calculation during low supply
  return {
    bonusMultiplier: 1.5,
    reason: 'low supply incentive'
  };
}

async function processSosAlert(sosAlert: any): Promise<number> {
  const startTime = Date.now();
  
  // Mock SOS processing
  await mockRedis.publish('emergency:sos_triggered', JSON.stringify({
    bookingId: sosAlert.bookingId,
    priority: 'critical',
    location: sosAlert.location,
    timestamp: new Date().toISOString()
  }));
  
  return Date.now() - startTime;
}

async function updateDriverLocation(driverId: string, location: any): Promise<void> {
  // Mock location update processing
  await mockRedis.set(
    `driver_location:${driverId}`,
    JSON.stringify(location),
    'EX',
    3600 // 1 hour TTL
  );
}

async function processBatchLocationUpdates(batch: any[]): Promise<void> {
  // Mock batch processing
  const pipeline = batch.map(update => 
    mockRedis.set(`driver_location:${update.driverId}`, JSON.stringify(update))
  );
  
  await Promise.all(pipeline);
}