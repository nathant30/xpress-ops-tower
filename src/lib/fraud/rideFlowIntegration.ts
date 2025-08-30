// Ride Flow Integration - Shows where to add fraud checks in your ride flow
// This demonstrates integration points throughout the ride lifecycle

import { realTimeFraudEngine, FraudEventData } from './realTimeFraudEngine';
import { metricsCollector } from '../monitoring/metricsCollector';
import { logger } from '../security/productionLogger';

export class RideFlowFraudIntegration {
  private static instance: RideFlowFraudIntegration;

  private constructor() {}

  public static getInstance(): RideFlowFraudIntegration {
    if (!RideFlowFraudIntegration.instance) {
      RideFlowFraudIntegration.instance = new RideFlowFraudIntegration();
    }
    return RideFlowFraudIntegration.instance;
  }

  /**
   * 1. RIDE REQUEST - Check when user requests a ride
   * Integration Point: In your ride request handler
   */
  async checkRideRequest(rideRequestData: {
    riderId: string;
    pickupLocation: { lat: number; lng: number };
    dropoffLocation: { lat: number; lng: number };
    requestedAt: Date;
    paymentMethod: string;
    promoCode?: string;
    metadata?: any;
  }) {
    const eventData: FraudEventData = {
      eventType: 'ride_request',
      userId: rideRequestData.riderId,
      userType: 'rider',
      timestamp: rideRequestData.requestedAt.getTime(),
      data: {
        pickupLocation: rideRequestData.pickupLocation,
        dropoffLocation: rideRequestData.dropoffLocation,
        paymentMethod: rideRequestData.paymentMethod,
        promoCode: rideRequestData.promoCode,
        estimatedDistance: this.calculateDistance(
          rideRequestData.pickupLocation,
          rideRequestData.dropoffLocation
        )
      },
      metadata: rideRequestData.metadata
    };

    const result = await realTimeFraudEngine.checkForFraud(eventData);

    // Handle fraud check result
    if (result.blockedActions.includes('ride_request')) {
      throw new Error('Ride request blocked due to fraud risk');
    }

    if (result.flaggedForReview) {
      // Log for manual review but allow ride to continue
      logger.warn(`Ride request flagged for review: ${rideRequestData.riderId}`, {
        riskScore: result.riskScore,
        reasoning: result.reasoning
      });
    }

    return {
      allowed: true,
      riskScore: result.riskScore,
      requiresReview: result.flaggedForReview,
      alerts: result.alerts
    };
  }

  /**
   * 2. DRIVER MATCHING - Check driver when matched to ride
   * Integration Point: In your driver matching algorithm
   */
  async checkDriverMatch(matchData: {
    driverId: string;
    riderId: string;
    rideId: string;
    driverLocation: { lat: number; lng: number };
    estimatedArrival: number;
    driverRating: number;
    metadata?: any;
  }) {
    const eventData: FraudEventData = {
      eventType: 'ride_start', // Driver-specific check
      userId: matchData.driverId,
      userType: 'driver',
      data: {
        rideId: matchData.rideId,
        riderId: matchData.riderId,
        currentLocation: matchData.driverLocation,
        estimatedArrival: matchData.estimatedArrival,
        driverRating: matchData.driverRating
      },
      metadata: matchData.metadata
    };

    const result = await realTimeFraudEngine.checkForFraud(eventData);

    return {
      allowed: !result.blockedActions.includes('ride_start'),
      riskScore: result.riskScore,
      requiresReview: result.flaggedForReview,
      alerts: result.alerts
    };
  }

  /**
   * 3. GPS LOCATION UPDATES - Check during ride for GPS spoofing
   * Integration Point: In your real-time location tracking
   */
  async checkGPSUpdate(gpsData: {
    userId: string;
    userType: 'rider' | 'driver';
    rideId: string;
    gpsPoints: Array<{
      latitude: number;
      longitude: number;
      timestamp: number;
      accuracy?: number;
      speed?: number;
      bearing?: number;
    }>;
    deviceInfo?: {
      platform: string;
      model: string;
      isRooted?: boolean;
      installedApps?: string[];
      sensorData?: any;
    };
  }) {
    const eventData: FraudEventData = {
      eventType: 'gps_update',
      userId: gpsData.userId,
      userType: gpsData.userType,
      data: {
        rideId: gpsData.rideId,
        gpsPoints: gpsData.gpsPoints,
        deviceInfo: gpsData.deviceInfo
      }
    };

    const result = await realTimeFraudEngine.checkForFraud(eventData);

    // GPS spoofing might require immediate action
    if (result.alerts.some(alert => alert.alertType === 'gps_spoofing' && alert.severity === 'critical')) {
      // Consider pausing ride or flagging for immediate review
      return {
        action: 'suspend_ride',
        reason: 'Critical GPS anomaly detected',
        riskScore: result.riskScore,
        alerts: result.alerts
      };
    }

    return {
      action: result.flaggedForReview ? 'flag_for_review' : 'continue',
      riskScore: result.riskScore,
      alerts: result.alerts
    };
  }

  /**
   * 4. PAYMENT PROCESSING - Check before processing payment
   * Integration Point: In your payment processing pipeline
   */
  async checkPayment(paymentData: {
    userId: string;
    rideId: string;
    amount: number;
    currency: string;
    paymentMethod: string;
    promoCode?: string;
    discount?: number;
    metadata?: any;
  }) {
    const eventData: FraudEventData = {
      eventType: 'payment',
      userId: paymentData.userId,
      userType: 'rider',
      data: {
        rideId: paymentData.rideId,
        amount: paymentData.amount,
        currency: paymentData.currency,
        paymentMethod: paymentData.paymentMethod,
        promoCode: paymentData.promoCode,
        discount: paymentData.discount
      },
      metadata: paymentData.metadata
    };

    const result = await realTimeFraudEngine.checkForFraud(eventData);

    if (result.blockedActions.includes('payment')) {
      return {
        allowed: false,
        reason: 'Payment blocked due to fraud risk',
        riskScore: result.riskScore,
        alerts: result.alerts
      };
    }

    return {
      allowed: true,
      riskScore: result.riskScore,
      requiresReview: result.flaggedForReview,
      alerts: result.alerts
    };
  }

  /**
   * 5. RIDE COMPLETION - Final fraud check
   * Integration Point: When ride is marked as completed
   */
  async checkRideCompletion(completionData: {
    rideId: string;
    riderId: string;
    driverId: string;
    finalAmount: number;
    distance: number;
    duration: number;
    route: Array<{ lat: number; lng: number; timestamp: number }>;
    riderRating?: number;
    driverRating?: number;
    metadata?: any;
  }) {
    // Check both rider and driver
    const riderCheck = await this.performCompletionCheck({
      ...completionData,
      userId: completionData.riderId,
      userType: 'rider' as const
    });

    const driverCheck = await this.performCompletionCheck({
      ...completionData,
      userId: completionData.driverId,
      userType: 'driver' as const
    });

    return {
      rider: riderCheck,
      driver: driverCheck,
      overallRisk: Math.max(riderCheck.riskScore, driverCheck.riskScore),
      requiresReview: riderCheck.requiresReview || driverCheck.requiresReview
    };
  }

  private async performCompletionCheck(data: any) {
    const eventData: FraudEventData = {
      eventType: 'ride_end',
      userId: data.userId,
      userType: data.userType,
      data: {
        rideId: data.rideId,
        finalAmount: data.finalAmount,
        distance: data.distance,
        duration: data.duration,
        route: data.route,
        rating: data.userType === 'rider' ? data.riderRating : data.driverRating
      },
      metadata: data.metadata
    };

    const result = await realTimeFraudEngine.checkForFraud(eventData);

    return {
      riskScore: result.riskScore,
      requiresReview: result.flaggedForReview,
      alerts: result.alerts
    };
  }

  /**
   * 6. USER AUTHENTICATION - Check on login/registration
   * Integration Point: In your authentication middleware
   */
  async checkAuthentication(authData: {
    userId: string;
    userType: 'rider' | 'driver';
    action: 'login' | 'registration';
    deviceInfo?: any;
    ipAddress?: string;
    location?: { lat: number; lng: number };
    metadata?: any;
  }) {
    const eventData: FraudEventData = {
      eventType: authData.action,
      userId: authData.userId,
      userType: authData.userType,
      data: {
        deviceInfo: authData.deviceInfo,
        ipAddress: authData.ipAddress,
        location: authData.location
      },
      metadata: authData.metadata
    };

    const result = await realTimeFraudEngine.checkForFraud(eventData);

    if (result.blockedActions.includes(authData.action)) {
      return {
        allowed: false,
        reason: 'Authentication blocked due to fraud risk',
        riskScore: result.riskScore,
        alerts: result.alerts
      };
    }

    return {
      allowed: true,
      riskScore: result.riskScore,
      requiresReview: result.flaggedForReview,
      alerts: result.alerts
    };
  }

  // Helper methods
  private calculateDistance(point1: { lat: number; lng: number }, point2: { lat: number; lng: number }): number {
    const R = 6371000; // Earth's radius in meters
    const dLat = (point2.lat - point1.lat) * Math.PI / 180;
    const dLng = (point2.lng - point1.lng) * Math.PI / 180;
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(point1.lat * Math.PI / 180) * Math.cos(point2.lat * Math.PI / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }
}

// Example usage in your existing ride flow:
/*

// In your ride request handler:
app.post('/api/rides/request', async (req, res) => {
  try {
    const rideRequest = req.body;
    
    // Add fraud check
    const fraudCheck = await rideFlowIntegration.checkRideRequest({
      riderId: rideRequest.riderId,
      pickupLocation: rideRequest.pickup,
      dropoffLocation: rideRequest.dropoff,
      requestedAt: new Date(),
      paymentMethod: rideRequest.paymentMethod,
      promoCode: rideRequest.promoCode
    });
    
    if (!fraudCheck.allowed) {
      return res.status(403).json({ error: 'Ride request denied' });
    }
    
    // Continue with normal ride request flow
    const ride = await createRide(rideRequest);
    res.json({ ride, fraudCheck });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// In your GPS tracking:
websocket.on('gps_update', async (data) => {
  const fraudCheck = await rideFlowIntegration.checkGPSUpdate({
    userId: data.userId,
    userType: data.userType,
    rideId: data.rideId,
    gpsPoints: data.locations,
    deviceInfo: data.device
  });
  
  if (fraudCheck.action === 'suspend_ride') {
    // Handle suspicious GPS activity
    await handleRideSuspension(data.rideId, fraudCheck.reason);
  }
});

*/

export const rideFlowIntegration = RideFlowFraudIntegration.getInstance();