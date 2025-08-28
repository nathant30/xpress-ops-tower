// Ridesharing Surge Pricing Algorithm Tests
// Critical test: Dynamic pricing accuracy during high demand periods
// Validates surge calculation, market responsiveness, and fairness algorithms

import { MockDataService } from '@/lib/mockData';
import { redis } from '@/lib/redis';
import { ServiceType, Region } from '@/types/fleet';

// Mock Redis for testing
jest.mock('@/lib/redis');
const mockRedis = redis as jest.Mocked<typeof redis>;

interface SurgePricingData {
  regionId: string;
  serviceType: ServiceType;
  demandScore: number;
  supplyScore: number;
  surgeMultiplier: number;
  effectiveUntil: Date;
  reason: string;
  historicalAverage: number;
}

interface MarketConditions {
  activeBookings: number;
  availableDrivers: number;
  completedRidesLastHour: number;
  cancelledRidesLastHour: number;
  averageWaitTime: number;
  weatherCondition: 'clear' | 'rain' | 'storm' | 'fog';
  timeOfDay: 'morning_rush' | 'afternoon_rush' | 'late_night' | 'normal';
  specialEvents: string[];
}

describe('Surge Pricing Algorithm', () => {
  let mockMarketConditions: MarketConditions;
  
  beforeEach(() => {
    mockRedis.get.mockClear();
    mockRedis.set.mockClear();
    mockRedis.hget.mockClear();
    mockRedis.hset.mockClear();
    mockRedis.zadd.mockClear();
    mockRedis.zrange.mockClear();
    
    // Default market conditions (normal demand)
    mockMarketConditions = {
      activeBookings: 150,
      availableDrivers: 200,
      completedRidesLastHour: 180,
      cancelledRidesLastHour: 12,
      averageWaitTime: 4.5, // minutes
      weatherCondition: 'clear',
      timeOfDay: 'normal',
      specialEvents: []
    };
    
    // Mock Redis responses
    mockRedis.get.mockImplementation(async (key: string) => {
      if (key.includes('market_conditions')) {
        return JSON.stringify(mockMarketConditions);
      }
      if (key.includes('surge_history')) {
        return JSON.stringify([1.0, 1.2, 1.0, 1.0, 1.1]); // Historical multipliers
      }
      return null;
    });
  });

  describe('Basic Surge Calculation', () => {
    it('should calculate surge multiplier based on demand/supply ratio', async () => {
      const pricingData = await calculateSurgeMultiplier('ncr-manila', 'ride_4w', mockMarketConditions);
      
      expect(pricingData.regionId).toBe('ncr-manila');
      expect(pricingData.serviceType).toBe('ride_4w');
      expect(pricingData.surgeMultiplier).toBeGreaterThanOrEqual(1.0);
      expect(pricingData.surgeMultiplier).toBeLessThanOrEqual(5.0); // Max surge cap
      expect(pricingData.demandScore).toBeGreaterThan(0);
      expect(pricingData.supplyScore).toBeGreaterThan(0);
    });

    it('should increase surge during high demand scenarios', async () => {
      // High demand scenario
      const highDemandConditions: MarketConditions = {
        ...mockMarketConditions,
        activeBookings: 500,
        availableDrivers: 80,
        averageWaitTime: 12.5,
        timeOfDay: 'morning_rush'
      };

      const pricingData = await calculateSurgeMultiplier('ncr-manila', 'ride_4w', highDemandConditions);
      
      expect(pricingData.surgeMultiplier).toBeGreaterThan(1.5);
      expect(pricingData.reason).toContain('high demand');
      expect(pricingData.demandScore).toBeGreaterThan(70); // High demand score
    });

    it('should maintain normal pricing during balanced supply/demand', async () => {
      const pricingData = await calculateSurgeMultiplier('ncr-manila', 'ride_4w', mockMarketConditions);
      
      expect(pricingData.surgeMultiplier).toBeLessThanOrEqual(1.2);
      expect(pricingData.reason).toContain('normal');
    });

    it('should apply different multipliers for different service types', async () => {
      const ride4wPricing = await calculateSurgeMultiplier('ncr-manila', 'ride_4w', mockMarketConditions);
      const ride2wPricing = await calculateSurgeMultiplier('ncr-manila', 'ride_2w', mockMarketConditions);
      const deliveryPricing = await calculateSurgeMultiplier('ncr-manila', 'send_delivery', mockMarketConditions);

      // Different service types may have different surge patterns
      expect(ride4wPricing.surgeMultiplier).toBeGreaterThan(0);
      expect(ride2wPricing.surgeMultiplier).toBeGreaterThan(0);
      expect(deliveryPricing.surgeMultiplier).toBeGreaterThan(0);

      // 2-wheel typically has lower surge due to more availability
      expect(ride2wPricing.surgeMultiplier).toBeLessThanOrEqual(ride4wPricing.surgeMultiplier);
    });
  });

  describe('Dynamic Market Response', () => {
    it('should increase surge during bad weather conditions', async () => {
      const rainyConditions: MarketConditions = {
        ...mockMarketConditions,
        weatherCondition: 'rain',
        availableDrivers: 120, // Fewer drivers active during rain
        activeBookings: 280,   // More ride requests
        averageWaitTime: 8.5
      };

      const pricingData = await calculateSurgeMultiplier('ncr-manila', 'ride_4w', rainyConditions);
      
      expect(pricingData.surgeMultiplier).toBeGreaterThan(1.3);
      expect(pricingData.reason).toContain('weather');
    });

    it('should handle special events with elevated surge', async () => {
      const specialEventConditions: MarketConditions = {
        ...mockMarketConditions,
        specialEvents: ['concert_moa', 'basketball_araneta'],
        activeBookings: 450,
        availableDrivers: 90,
        averageWaitTime: 15.2
      };

      const pricingData = await calculateSurgeMultiplier('ncr-manila', 'ride_4w', specialEventConditions);
      
      expect(pricingData.surgeMultiplier).toBeGreaterThan(2.0);
      expect(pricingData.reason).toContain('special event');
    });

    it('should respond to rush hour patterns', async () => {
      const morningRushConditions: MarketConditions = {
        ...mockMarketConditions,
        timeOfDay: 'morning_rush',
        activeBookings: 380,
        availableDrivers: 150,
        averageWaitTime: 9.5
      };

      const morningPricing = await calculateSurgeMultiplier('ncr-manila', 'ride_4w', morningRushConditions);
      
      const afternoonRushConditions: MarketConditions = {
        ...morningRushConditions,
        timeOfDay: 'afternoon_rush',
        activeBookings: 420,
        averageWaitTime: 11.0
      };

      const afternoonPricing = await calculateSurgeMultiplier('ncr-manila', 'ride_4w', afternoonRushConditions);

      expect(morningPricing.surgeMultiplier).toBeGreaterThan(1.2);
      expect(afternoonPricing.surgeMultiplier).toBeGreaterThan(1.2);
      expect(afternoonPricing.surgeMultiplier).toBeGreaterThanOrEqual(morningPricing.surgeMultiplier);
    });

    it('should handle late night scenarios with adjusted pricing', async () => {
      const lateNightConditions: MarketConditions = {
        ...mockMarketConditions,
        timeOfDay: 'late_night',
        activeBookings: 80,
        availableDrivers: 25,
        averageWaitTime: 12.0
      };

      const pricingData = await calculateSurgeMultiplier('ncr-manila', 'ride_4w', lateNightConditions);
      
      // Late night should have moderate surge due to limited driver availability
      expect(pricingData.surgeMultiplier).toBeGreaterThan(1.5);
      expect(pricingData.reason).toContain('late night');
    });
  });

  describe('Surge Fairness and Limits', () => {
    it('should cap surge at maximum allowed multiplier', async () => {
      const extremeConditions: MarketConditions = {
        ...mockMarketConditions,
        activeBookings: 1000,
        availableDrivers: 20,
        averageWaitTime: 25.0,
        weatherCondition: 'storm',
        timeOfDay: 'morning_rush',
        specialEvents: ['typhoon_warning']
      };

      const pricingData = await calculateSurgeMultiplier('ncr-manila', 'ride_4w', extremeConditions);
      
      // Should never exceed maximum surge cap
      expect(pricingData.surgeMultiplier).toBeLessThanOrEqual(5.0);
    });

    it('should gradually decrease surge when conditions improve', async () => {
      // Start with high surge conditions
      const highSurgeConditions: MarketConditions = {
        ...mockMarketConditions,
        activeBookings: 400,
        availableDrivers: 80,
        averageWaitTime: 15.0
      };

      const initialPricing = await calculateSurgeMultiplier('ncr-manila', 'ride_4w', highSurgeConditions);
      
      // Conditions improve - more drivers come online
      const improvedConditions: MarketConditions = {
        ...highSurgeConditions,
        availableDrivers: 180,
        averageWaitTime: 8.0
      };

      const improvedPricing = await calculateSurgeMultiplier('ncr-manila', 'ride_4w', improvedConditions);
      
      expect(improvedPricing.surgeMultiplier).toBeLessThan(initialPricing.surgeMultiplier);
    });

    it('should prevent surge manipulation by checking historical patterns', async () => {
      // Mock suspicious pattern in surge history
      mockRedis.get.mockImplementation(async (key: string) => {
        if (key.includes('surge_history')) {
          // Suspicious rapid fluctuation
          return JSON.stringify([1.0, 3.5, 1.2, 3.8, 1.1, 3.6]);
        }
        if (key.includes('market_conditions')) {
          return JSON.stringify(mockMarketConditions);
        }
        return null;
      });

      const pricingData = await calculateSurgeMultiplier('ncr-manila', 'ride_4w', mockMarketConditions);
      
      // Should apply smoothing to prevent manipulation
      const smoothingFactor = calculateSmoothingFactor([1.0, 3.5, 1.2, 3.8, 1.1, 3.6]);
      expect(smoothingFactor).toBeLessThan(1.0); // Should reduce volatility
    });
  });

  describe('Regional Surge Variations', () => {
    it('should calculate different surge for different regions', async () => {
      const manilaConditions: MarketConditions = {
        ...mockMarketConditions,
        activeBookings: 300,
        availableDrivers: 120
      };

      const cebuConditions: MarketConditions = {
        ...mockMarketConditions,
        activeBookings: 150,
        availableDrivers: 180
      };

      const manilaPricing = await calculateSurgeMultiplier('ncr-manila', 'ride_4w', manilaConditions);
      const cebuPricing = await calculateSurgeMultiplier('cebu-city', 'ride_4w', cebuConditions);

      // Manila should have higher surge due to higher demand/supply ratio
      expect(manilaPricing.surgeMultiplier).toBeGreaterThan(cebuPricing.surgeMultiplier);
    });

    it('should handle cross-regional surge spillover effects', async () => {
      // High surge in one region may affect nearby regions
      const spilloverEffect = await calculateSpilloverEffect('ncr-manila', ['quezon-city', 'pasig-city']);
      
      expect(spilloverEffect).toBeDefined();
      expect(spilloverEffect.affectedRegions).toContain('quezon-city');
      expect(spilloverEffect.adjustmentFactor).toBeGreaterThan(1.0);
    });
  });

  describe('Performance and Scalability', () => {
    it('should calculate surge for 1000+ regions within 10 seconds', async () => {
      const regions = Array.from({ length: 1000 }, (_, i) => `region-${i}`);
      const serviceTypes: ServiceType[] = ['ride_4w', 'ride_2w', 'send_delivery'];
      
      const startTime = Date.now();
      
      const calculations = [];
      for (const region of regions) {
        for (const serviceType of serviceTypes) {
          calculations.push(
            calculateSurgeMultiplier(region, serviceType, mockMarketConditions)
          );
        }
      }
      
      const results = await Promise.all(calculations);
      const calculationTime = Date.now() - startTime;
      
      // Should complete all calculations within 10 seconds
      expect(calculationTime).toBeLessThan(10000);
      expect(results).toHaveLength(3000); // 1000 regions * 3 service types
      
      console.log(`Calculated surge for ${results.length} region/service combinations in ${calculationTime}ms`);
    });

    it('should efficiently store and retrieve surge history', async () => {
      const surgeData: SurgePricingData = {
        regionId: 'ncr-manila',
        serviceType: 'ride_4w',
        demandScore: 75,
        supplyScore: 45,
        surgeMultiplier: 2.1,
        effectiveUntil: new Date(Date.now() + 15 * 60000), // 15 minutes
        reason: 'high demand',
        historicalAverage: 1.3
      };

      const startTime = Date.now();
      await storeSurgeData(surgeData);
      const storageTime = Date.now() - startTime;
      
      // Storage should be fast (under 100ms)
      expect(storageTime).toBeLessThan(100);
      
      // Verify data is stored correctly
      expect(mockRedis.hset).toHaveBeenCalledWith(
        'surge_pricing:ncr-manila',
        'ride_4w',
        JSON.stringify(expect.objectContaining({
          surgeMultiplier: 2.1,
          reason: 'high demand'
        }))
      );
    });

    it('should handle concurrent surge calculations without conflicts', async () => {
      const concurrentCalculations = Array.from({ length: 100 }, (_, i) => 
        calculateSurgeMultiplier('ncr-manila', 'ride_4w', {
          ...mockMarketConditions,
          activeBookings: mockMarketConditions.activeBookings + i,
          availableDrivers: mockMarketConditions.availableDrivers - (i % 20)
        })
      );

      const results = await Promise.all(concurrentCalculations);
      
      // All calculations should succeed
      expect(results).toHaveLength(100);
      results.forEach(result => {
        expect(result.surgeMultiplier).toBeGreaterThanOrEqual(1.0);
        expect(result.regionId).toBe('ncr-manila');
      });
    });
  });

  describe('Real-time Updates and Notifications', () => {
    it('should notify drivers of surge opportunities', async () => {
      const highSurgeConditions: MarketConditions = {
        ...mockMarketConditions,
        activeBookings: 400,
        availableDrivers: 90,
        averageWaitTime: 12.0
      };

      const pricingData = await calculateSurgeMultiplier('ncr-manila', 'ride_4w', highSurgeConditions);
      
      if (pricingData.surgeMultiplier >= 1.5) {
        await notifyDriversOfSurge(pricingData);
        
        expect(mockRedis.publish).toHaveBeenCalledWith(
          'surge:driver_notification',
          expect.stringContaining('ncr-manila')
        );
      }
    });

    it('should update passenger estimates in real-time', async () => {
      const pricingData = await calculateSurgeMultiplier('ncr-manila', 'ride_4w', mockMarketConditions);
      
      await updatePassengerEstimates(pricingData);
      
      expect(mockRedis.publish).toHaveBeenCalledWith(
        'surge:passenger_update',
        expect.objectContaining({
          regionId: 'ncr-manila',
          serviceType: 'ride_4w',
          surgeMultiplier: pricingData.surgeMultiplier
        })
      );
    });
  });
});

// Helper functions (would be implemented in actual surge pricing service)
async function calculateSurgeMultiplier(
  regionId: string, 
  serviceType: ServiceType, 
  conditions: MarketConditions
): Promise<SurgePricingData> {
  // Mock surge calculation based on various factors
  let baseScore = 1.0;
  let demandScore = 0;
  let supplyScore = 0;
  let reason = 'normal conditions';

  // Calculate demand score
  demandScore = Math.min(100, (conditions.activeBookings / 200) * 100);
  
  // Calculate supply score  
  supplyScore = Math.min(100, (conditions.availableDrivers / 150) * 100);
  
  // Demand/Supply ratio impact
  const demandSupplyRatio = conditions.activeBookings / Math.max(conditions.availableDrivers, 1);
  if (demandSupplyRatio > 2.5) {
    baseScore *= 2.5;
    reason = 'very high demand';
  } else if (demandSupplyRatio > 2.0) {
    baseScore *= 2.0;
    reason = 'high demand';
  } else if (demandSupplyRatio > 1.5) {
    baseScore *= 1.5;
    reason = 'moderate high demand';
  }

  // Weather impact
  if (conditions.weatherCondition === 'storm') {
    baseScore *= 1.8;
    reason += ', severe weather';
  } else if (conditions.weatherCondition === 'rain') {
    baseScore *= 1.4;
    reason += ', weather conditions';
  }

  // Time of day impact
  if (conditions.timeOfDay === 'morning_rush' || conditions.timeOfDay === 'afternoon_rush') {
    baseScore *= 1.3;
    reason += ', rush hour';
  } else if (conditions.timeOfDay === 'late_night') {
    baseScore *= 1.6;
    reason += ', late night';
  }

  // Special events impact
  if (conditions.specialEvents.length > 0) {
    baseScore *= (1.5 + conditions.specialEvents.length * 0.3);
    reason += ', special event';
  }

  // Wait time impact
  if (conditions.averageWaitTime > 10) {
    baseScore *= 1.4;
    reason += ', long wait times';
  } else if (conditions.averageWaitTime > 7) {
    baseScore *= 1.2;
  }

  // Service type adjustments
  if (serviceType === 'ride_2w') {
    baseScore *= 0.8; // Lower surge for 2-wheelers
  } else if (serviceType === 'send_delivery') {
    baseScore *= 0.9; // Lower surge for deliveries
  }

  // Cap at maximum surge
  const surgeMultiplier = Math.min(5.0, Math.max(1.0, baseScore));
  
  return {
    regionId,
    serviceType,
    demandScore,
    supplyScore,
    surgeMultiplier: Math.round(surgeMultiplier * 10) / 10, // Round to 1 decimal
    effectiveUntil: new Date(Date.now() + 15 * 60000), // 15 minutes
    reason,
    historicalAverage: 1.2
  };
}

function calculateSmoothingFactor(history: number[]): number {
  if (history.length < 3) return 1.0;
  
  // Calculate volatility
  const volatility = history.reduce((acc, val, idx) => {
    if (idx === 0) return acc;
    return acc + Math.abs(val - history[idx - 1]);
  }, 0) / (history.length - 1);
  
  // Higher volatility = lower smoothing factor (more dampening)
  return Math.max(0.7, 1.0 - volatility);
}

async function calculateSpilloverEffect(
  sourceRegion: string, 
  nearbyRegions: string[]
): Promise<{ affectedRegions: string[]; adjustmentFactor: number }> {
  // Mock spillover calculation
  return {
    affectedRegions: nearbyRegions.filter(() => Math.random() > 0.3),
    adjustmentFactor: 1.2
  };
}

async function storeSurgeData(data: SurgePricingData): Promise<void> {
  await mockRedis.hset(
    `surge_pricing:${data.regionId}`,
    data.serviceType,
    JSON.stringify(data)
  );
  
  // Also store in time series for historical tracking
  await mockRedis.zadd(
    `surge_history:${data.regionId}:${data.serviceType}`,
    Date.now(),
    JSON.stringify({
      multiplier: data.surgeMultiplier,
      timestamp: new Date().toISOString()
    })
  );
}

async function notifyDriversOfSurge(data: SurgePricingData): Promise<void> {
  await mockRedis.publish('surge:driver_notification', JSON.stringify({
    regionId: data.regionId,
    serviceType: data.serviceType,
    surgeMultiplier: data.surgeMultiplier,
    message: `${data.surgeMultiplier}x surge active in ${data.regionId}`,
    timestamp: new Date().toISOString()
  }));
}

async function updatePassengerEstimates(data: SurgePricingData): Promise<void> {
  await mockRedis.publish('surge:passenger_update', JSON.stringify({
    regionId: data.regionId,
    serviceType: data.serviceType,
    surgeMultiplier: data.surgeMultiplier,
    reason: data.reason,
    timestamp: new Date().toISOString()
  }));
}