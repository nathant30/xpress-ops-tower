// Real-Time Ride Matching Engine
// High-performance driver-passenger matching with <30 second assignment guarantee

import { getDatabase } from './database';
import { redis } from './redis';
import { getWebSocketManager } from './websocket';
import { logger } from '@/lib/security/productionLogger';

const db = getDatabase();

// Matching algorithm configuration
interface MatchingConfig {
  maxSearchRadius: number; // km
  maxAssignmentTime: number; // seconds
  expandRadiusSteps: number[]; // km steps for expanding search
  scoringWeights: {
    distance: number;
    rating: number;
    experience: number;
    acceptance_rate: number;
    eta: number;
  };
  serviceTypeCompatibility: Record<string, string[]>;
}

// Default high-performance matching configuration
const DEFAULT_MATCHING_CONFIG: MatchingConfig = {
  maxSearchRadius: 15, // 15km max search radius
  maxAssignmentTime: 30, // 30 seconds max assignment time
  expandRadiusSteps: [2, 5, 8, 12, 15], // Gradual radius expansion
  scoringWeights: {
    distance: 0.35,    // 35% weight on proximity
    rating: 0.20,      // 20% weight on driver rating
    experience: 0.15,   // 15% weight on total trips
    acceptance_rate: 0.15, // 15% weight on acceptance rate
    eta: 0.15          // 15% weight on estimated arrival time
  },
  serviceTypeCompatibility: {
    'ride_4w': ['ride_4w'],
    'ride_2w': ['ride_2w', 'ride_4w'], // 4-wheel can handle 2-wheel requests
    'send_delivery': ['send_delivery'],
    'eats_delivery': ['eats_delivery', 'send_delivery'],
    'mart_delivery': ['mart_delivery', 'send_delivery']
  }
};

// Driver candidate for matching
interface DriverCandidate {
  id: string;
  driverCode: string;
  name: string;
  phone: string;
  rating: number;
  totalTrips: number;
  acceptanceRate: number;
  services: string[];
  location: {
    latitude: number;
    longitude: number;
    address?: string;
    accuracy?: number;
    bearing?: number;
    speed?: number;
    lastUpdated: string;
  };
  status: string;
  isAvailable: boolean;
  vehicle: any;
  currentBookingId?: string;
  distanceKm: number;
  estimatedArrival: number; // minutes
  matchingScore: number;
}

// Ride request for matching
interface RideRequest {
  id: string;
  bookingReference: string;
  customerId: string;
  serviceType: string;
  pickupLocation: {
    latitude: number;
    longitude: number;
    address: string;
  };
  dropoffLocation?: {
    latitude: number;
    longitude: number;
    address: string;
  };
  regionId: string;
  surgeMultiplier: number;
  scheduledPickupTime?: string;
  specialRequirements?: string[];
  maxWaitTime?: number; // minutes
  customerRating?: number;
}

// Matching result
interface MatchingResult {
  success: boolean;
  assignedDriver?: DriverCandidate;
  alternativeDrivers?: DriverCandidate[];
  matchingTimeMs: number;
  searchRadius: number;
  totalCandidatesEvaluated: number;
  failureReason?: string;
  retryRecommended?: boolean;
  estimatedPickupTime?: string;
}

export class RideMatchingEngine {
  private config: MatchingConfig;
  private activeMatches: Map<string, NodeJS.Timeout> = new Map();

  constructor(config: MatchingConfig = DEFAULT_MATCHING_CONFIG) {
    this.config = config;
  }

  // Main matching function with performance guarantee
  async matchRideToDriver(rideRequest: RideRequest): Promise<MatchingResult> {
    const startTime = Date.now();
    const matchingId = `match_${rideRequest.id}_${startTime}`;

    try {
      // Set timeout for maximum assignment time
      const timeoutPromise = new Promise<MatchingResult>((_, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Matching timeout exceeded'));
        }, this.config.maxAssignmentTime * 1000);
        this.activeMatches.set(matchingId, timeout);
      });

      // Main matching logic
      const matchingPromise = this.performMatching(rideRequest, startTime);

      // Race between matching and timeout
      const result = await Promise.race([matchingPromise, timeoutPromise]);
      
      // Clean up timeout
      const timeout = this.activeMatches.get(matchingId);
      if (timeout) {
        clearTimeout(timeout);
        this.activeMatches.delete(matchingId);
      }

      // Log matching performance
      await this.logMatchingPerformance(rideRequest, result, startTime);

      return result;

    } catch (error) {
      const matchingTimeMs = Date.now() - startTime;
      
      // Clean up timeout
      const timeout = this.activeMatches.get(matchingId);
      if (timeout) {
        clearTimeout(timeout);
        this.activeMatches.delete(matchingId);
      }

      logger.error('Ride matching failed', error instanceof Error ? error.message : error);
      
      return {
        success: false,
        matchingTimeMs,
        searchRadius: 0,
        totalCandidatesEvaluated: 0,
        failureReason: (error as Error).message,
        retryRecommended: matchingTimeMs < this.config.maxAssignmentTime * 1000
      };
    }
  }

  // Core matching algorithm with progressive radius expansion
  private async performMatching(rideRequest: RideRequest, startTime: number): Promise<MatchingResult> {
    let totalCandidatesEvaluated = 0;
    let bestMatch: DriverCandidate | undefined;
    let alternativeDrivers: DriverCandidate[] = [];

    // Progressive radius expansion for optimal performance
    for (const radius of this.config.expandRadiusSteps) {
      const timeElapsed = Date.now() - startTime;
      if (timeElapsed > this.config.maxAssignmentTime * 1000) {
        break; // Time limit exceeded
      }

      const candidates = await this.findDriverCandidates(rideRequest, radius);
      totalCandidatesEvaluated += candidates.length;

      if (candidates.length === 0) {
        continue; // Try larger radius
      }

      // Score and rank candidates
      const scoredCandidates = await this.scoreAndRankCandidates(
        candidates, 
        rideRequest, 
        timeElapsed
      );

      if (scoredCandidates.length > 0) {
        bestMatch = scoredCandidates[0];
        alternativeDrivers = scoredCandidates.slice(1, 5); // Top 5 alternatives

        // If we have a high-quality match, assign immediately
        if (bestMatch.matchingScore >= 80 || radius <= 5) {
          const assignmentResult = await this.assignDriverToRide(bestMatch, rideRequest);
          
          if (assignmentResult.success) {
            return {
              success: true,
              assignedDriver: bestMatch,
              alternativeDrivers,
              matchingTimeMs: Date.now() - startTime,
              searchRadius: radius,
              totalCandidatesEvaluated,
              estimatedPickupTime: new Date(Date.now() + bestMatch.estimatedArrival * 60000).toISOString()
            };
          }
          // If assignment failed, try alternatives
        }
      }

      // If no good matches at small radius, continue expanding
      if (bestMatch && bestMatch.matchingScore >= 70 && radius >= 8) {
        break; // Good enough match found, no need to search further
      }
    }

    // Final assignment attempt with best available match
    if (bestMatch) {
      const assignmentResult = await this.assignDriverToRide(bestMatch, rideRequest);
      
      return {
        success: assignmentResult.success,
        assignedDriver: assignmentResult.success ? bestMatch : undefined,
        alternativeDrivers,
        matchingTimeMs: Date.now() - startTime,
        searchRadius: this.config.maxSearchRadius,
        totalCandidatesEvaluated,
        failureReason: assignmentResult.success ? undefined : assignmentResult.reason,
        retryRecommended: !assignmentResult.success && totalCandidatesEvaluated > 0,
        estimatedPickupTime: assignmentResult.success ? 
          new Date(Date.now() + bestMatch.estimatedArrival * 60000).toISOString() : undefined
      };
    }

    // No drivers found
    return {
      success: false,
      alternativeDrivers: [],
      matchingTimeMs: Date.now() - startTime,
      searchRadius: this.config.maxSearchRadius,
      totalCandidatesEvaluated,
      failureReason: 'No available drivers found in search area',
      retryRecommended: true
    };
  }

  // High-performance driver candidate finding with spatial indexing
  private async findDriverCandidates(
    rideRequest: RideRequest, 
    radiusKm: number
  ): Promise<DriverCandidate[]> {
    try {
      // Check Redis cache first for recent driver locations
      const cacheKey = `driver_candidates:${rideRequest.regionId}:${rideRequest.serviceType}:${radiusKm}`;
      const cached = await redis.get(cacheKey);
      
      if (cached) {
        const cachedCandidates = JSON.parse(cached) as DriverCandidate[];
        // Filter cached results by current location and availability
        return this.filterCachedCandidates(cachedCandidates, rideRequest, radiusKm);
      }

      // Compatible service types for this ride
      const compatibleServices = this.config.serviceTypeCompatibility[rideRequest.serviceType] || [rideRequest.serviceType];

      // High-performance spatial query with optimized indexing
      const query = `
        SELECT DISTINCT ON (d.id)
          d.id,
          d.driver_code,
          d.first_name,
          d.last_name,
          d.phone,
          d.rating,
          d.total_trips,
          d.completed_trips,
          d.services,
          d.vehicle_info,
          
          -- Location data from most recent position
          ST_X(dl.location) as longitude,
          ST_Y(dl.location) as latitude,
          dl.address,
          dl.accuracy,
          dl.bearing,
          dl.speed,
          dl.recorded_at,
          dl.is_available,
          
          -- Calculate distance and ETA
          ST_Distance(
            ST_GeogFromText('POINT($1 $2)'),
            ST_GeogFromText(ST_AsText(dl.location))
          ) / 1000 as distance_km,
          
          -- Performance metrics for scoring
          COALESCE(
            (SELECT dp.acceptance_rate 
             FROM driver_performance_daily dp 
             WHERE dp.driver_id = d.id 
               AND dp.performance_date >= CURRENT_DATE - INTERVAL '7 days'
             ORDER BY dp.performance_date DESC 
             LIMIT 1), 
            95.0
          ) as acceptance_rate,
          
          -- Check for active booking
          (
            SELECT b.id FROM bookings b
            WHERE b.driver_id = d.id 
              AND b.status IN ('assigned', 'accepted', 'en_route', 'arrived', 'in_progress')
            LIMIT 1
          ) as current_booking_id
          
        FROM drivers d
        JOIN driver_locations dl ON d.id = dl.driver_id
        WHERE d.region_id = $3
          AND d.is_active = TRUE
          AND d.status = 'active'
          AND dl.is_available = TRUE
          AND dl.expires_at > NOW()
          AND dl.recorded_at > NOW() - INTERVAL '2 minutes'
          AND d.services && $4::text[] -- Array overlap for service compatibility
          AND ST_DWithin(
            ST_GeogFromText(ST_AsText(dl.location)),
            ST_GeogFromText('POINT($1 $2)'),
            $5
          )
        ORDER BY d.id, dl.recorded_at DESC, distance_km ASC
      `;

      const result = await db.query(query, [
        rideRequest.pickupLocation.longitude,
        rideRequest.pickupLocation.latitude,
        rideRequest.regionId,
        compatibleServices,
        radiusKm * 1000 // Convert to meters
      ]);

      const candidates: DriverCandidate[] = result.rows
        .filter(row => !row.current_booking_id) // Exclude drivers with active bookings
        .map(row => ({
          id: row.id,
          driverCode: row.driver_code,
          name: `${row.first_name} ${row.last_name}`,
          phone: row.phone,
          rating: parseFloat(row.rating),
          totalTrips: parseInt(row.total_trips),
          acceptanceRate: parseFloat(row.acceptance_rate),
          services: row.services,
          location: {
            latitude: row.latitude,
            longitude: row.longitude,
            address: row.address,
            accuracy: row.accuracy,
            bearing: row.bearing,
            speed: row.speed,
            lastUpdated: row.recorded_at
          },
          status: 'active',
          isAvailable: row.is_available,
          vehicle: row.vehicle_info || {},
          distanceKm: parseFloat(row.distance_km),
          estimatedArrival: this.calculateETA(parseFloat(row.distance_km), row.speed),
          matchingScore: 0 // Will be calculated in scoring phase
        }));

      // Cache results for 30 seconds to improve performance
      await redis.setex(cacheKey, 30, JSON.stringify(candidates));

      return candidates;

    } catch (error) {
      logger.error('Error finding driver candidates', error instanceof Error ? error.message : error);
      return [];
    }
  }

  // Advanced candidate scoring with multiple factors
  private async scoreAndRankCandidates(
    candidates: DriverCandidate[],
    rideRequest: RideRequest,
    timeElapsedMs: number
  ): Promise<DriverCandidate[]> {
    const urgencyMultiplier = Math.min(2.0, 1 + (timeElapsedMs / (this.config.maxAssignmentTime * 1000)));

    const scoredCandidates = candidates.map(candidate => {
      let score = 0;

      // Distance score (closer is better, with urgency boost)
      const maxDistance = Math.max(5, candidate.distanceKm);
      const distanceScore = Math.max(0, 100 - (candidate.distanceKm / maxDistance * 100));
      score += distanceScore * this.config.scoringWeights.distance * urgencyMultiplier;

      // Rating score
      const ratingScore = (candidate.rating / 5) * 100;
      score += ratingScore * this.config.scoringWeights.rating;

      // Experience score (more trips = higher score)
      const experienceScore = Math.min(100, Math.log(candidate.totalTrips + 1) * 20);
      score += experienceScore * this.config.scoringWeights.experience;

      // Acceptance rate score
      const acceptanceScore = candidate.acceptanceRate;
      score += acceptanceScore * this.config.scoringWeights.acceptance_rate;

      // ETA score (faster arrival = higher score)
      const etaScore = Math.max(0, 100 - (candidate.estimatedArrival * 5));
      score += etaScore * this.config.scoringWeights.eta;

      // Special bonuses and penalties
      
      // Bonus for exact service type match
      if (candidate.services.includes(rideRequest.serviceType)) {
        score += 10;
      }

      // Penalty for old location data
      const locationAge = (Date.now() - new Date(candidate.location.lastUpdated).getTime()) / 1000 / 60;
      if (locationAge > 1) {
        score -= Math.min(20, locationAge * 5);
      }

      // Bonus for high-velocity drivers (likely to accept quickly)
      if (candidate.location.speed && candidate.location.speed > 5) {
        score += 5; // Driver is moving, likely to respond
      }

      // Customer rating consideration
      if (rideRequest.customerRating && rideRequest.customerRating < 4.0 && candidate.rating > 4.5) {
        score += 5; // High-rated driver for challenging customer
      }

      candidate.matchingScore = Math.max(0, Math.min(100, score));
      return candidate;
    });

    // Sort by matching score (highest first) and distance as tiebreaker
    return scoredCandidates.sort((a, b) => {
      if (Math.abs(a.matchingScore - b.matchingScore) < 1) {
        return a.distanceKm - b.distanceKm; // Closer driver wins in tie
      }
      return b.matchingScore - a.matchingScore;
    });
  }

  // Atomic driver assignment with conflict resolution
  private async assignDriverToRide(
    driver: DriverCandidate,
    rideRequest: RideRequest
  ): Promise<{ success: boolean; reason?: string }> {
    try {
      // Use database transaction for atomic assignment
      const result = await db.transaction(async (client) => {
        // Double-check driver availability (race condition protection)
        const driverCheck = await client.query(`
          SELECT d.status, dl.is_available,
            (SELECT COUNT(*) FROM bookings b 
             WHERE b.driver_id = d.id 
               AND b.status IN ('assigned', 'accepted', 'en_route', 'arrived', 'in_progress')
            ) as active_bookings
          FROM drivers d
          LEFT JOIN driver_locations dl ON d.id = dl.driver_id
          WHERE d.id = $1 AND dl.expires_at > NOW()
        `, [driver.id]);

        const driverStatus = driverCheck.rows[0];
        if (!driverStatus || driverStatus.status !== 'active' || !driverStatus.is_available || driverStatus.active_bookings > 0) {
          throw new Error('Driver no longer available');
        }

        // Assign driver to ride
        await client.query(`
          UPDATE bookings 
          SET 
            driver_id = $1,
            status = 'assigned',
            assigned_at = NOW(),
            estimated_pickup_time = NOW() + INTERVAL '${driver.estimatedArrival} minutes',
            updated_at = NOW()
          WHERE id = $2 AND driver_id IS NULL AND status = 'searching'
        `, [driver.id, rideRequest.id]);

        // Update driver status to busy
        await client.query(`
          UPDATE drivers 
          SET status = 'busy', updated_at = NOW()
          WHERE id = $1
        `, [driver.id]);

        // Mark driver as unavailable in location table
        await client.query(`
          UPDATE driver_locations 
          SET is_available = FALSE, updated_at = NOW()
          WHERE driver_id = $1 AND expires_at > NOW()
        `, [driver.id]);

        return { success: true };
      });

      // Broadcast assignment via WebSocket
      await this.broadcastRideAssignment(driver, rideRequest);

      return result;

    } catch (error) {
      logger.error('Driver assignment failed', error instanceof Error ? error.message : error);
      return { 
        success: false, 
        reason: (error as Error).message 
      };
    }
  }

  // WebSocket notifications for successful matches
  private async broadcastRideAssignment(
    driver: DriverCandidate,
    rideRequest: RideRequest
  ): Promise<void> {
    try {
      const wsManager = getWebSocketManager();
      if (!wsManager) return;

      // Notify the assigned driver
      const driverEvent = {
        rideId: rideRequest.id,
        bookingReference: rideRequest.bookingReference,
        customerId: rideRequest.customerId,
        driverId: driver.id,
        matchingScore: driver.matchingScore,
        estimatedArrival: new Date(Date.now() + driver.estimatedArrival * 60000).toISOString(),
        driverDetails: {
          name: driver.name,
          phone: driver.phone,
          rating: driver.rating,
          vehicleInfo: driver.vehicle,
          currentLocation: driver.location
        },
        regionId: rideRequest.regionId,
        timestamp: new Date().toISOString()
      };

      wsManager.broadcastRideMatched(driverEvent);

      // Update cache to remove assigned driver from available pool
      await this.updateDriverAvailabilityCache(driver.id, false);

    } catch (error) {
      logger.error('Error broadcasting ride assignment', error instanceof Error ? error.message : error);
    }
  }

  // Helper functions

  private calculateETA(distanceKm: number, currentSpeed?: number): number {
    // Base calculation: average city speed of 25 km/h
    let estimatedMinutes = (distanceKm / 25) * 60;

    // Adjust based on current speed if available
    if (currentSpeed && currentSpeed > 0) {
      const speedBasedEta = (distanceKm / currentSpeed) * 60;
      estimatedMinutes = (estimatedMinutes + speedBasedEta) / 2; // Average the estimates
    }

    // Traffic and time-of-day adjustments
    const hour = new Date().getHours();
    if ((hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 19)) {
      estimatedMinutes *= 1.3; // Rush hour penalty
    }

    return Math.max(2, Math.ceil(estimatedMinutes)); // Minimum 2 minutes
  }

  private async filterCachedCandidates(
    cachedCandidates: DriverCandidate[],
    rideRequest: RideRequest,
    radiusKm: number
  ): Promise<DriverCandidate[]> {
    // Filter cached candidates based on current criteria
    return cachedCandidates.filter(candidate => {
      // Check if still within radius
      const distance = this.calculateDistance(
        rideRequest.pickupLocation.latitude,
        rideRequest.pickupLocation.longitude,
        candidate.location.latitude,
        candidate.location.longitude
      );
      
      return distance <= radiusKm && candidate.isAvailable;
    });
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI/180);
  }

  private async updateDriverAvailabilityCache(driverId: string, isAvailable: boolean): Promise<void> {
    try {
      await redis.setex(
        `driver_availability:${driverId}`,
        300, // 5 minutes
        JSON.stringify({ isAvailable, lastUpdated: new Date().toISOString() })
      );
    } catch (error) {
      logger.error('Error updating driver availability cache', error instanceof Error ? error.message : error);
    }
  }

  private async logMatchingPerformance(
    rideRequest: RideRequest,
    result: MatchingResult,
    startTime: number
  ): Promise<void> {
    try {
      const performanceData = {
        rideId: rideRequest.id,
        regionId: rideRequest.regionId,
        serviceType: rideRequest.serviceType,
        success: result.success,
        matchingTimeMs: result.matchingTimeMs,
        searchRadius: result.searchRadius,
        candidatesEvaluated: result.totalCandidatesEvaluated,
        assignedDriverId: result.assignedDriver?.id,
        failureReason: result.failureReason,
        timestamp: new Date().toISOString()
      };

      // Store in Redis for analytics
      await redis.lpush('matching_performance_log', JSON.stringify(performanceData));
      await redis.ltrim('matching_performance_log', 0, 1000); // Keep last 1000 entries

      // Broadcast performance metrics
      const wsManager = getWebSocketManager();
      if (wsManager) {
        wsManager.broadcastSystemPerformance({
          regionId: rideRequest.regionId,
          metrics: {
            avgMatchingTime: result.matchingTimeMs / 1000,
            successfulMatches: result.success ? 1 : 0,
            failedMatches: result.success ? 0 : 1,
            timeoutMatches: result.matchingTimeMs >= this.config.maxAssignmentTime * 1000 ? 1 : 0,
            matchingEfficiency: result.totalCandidatesEvaluated > 0 ? 
              (result.success ? 100 : 0) : 0
          },
          timeWindow: 'current_match',
          timestamp: new Date().toISOString()
        });
      }

    } catch (error) {
      logger.error('Error logging matching performance', error instanceof Error ? error.message : error);
    }
  }
}

// Export singleton instance
export const rideMatchingEngine = new RideMatchingEngine();