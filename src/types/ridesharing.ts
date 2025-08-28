// Ridesharing-specific WebSocket Event Types
// Real-time events for ride matching, driver management, and surge pricing

export interface RidesharingWebSocketEvents {
  // Ride Lifecycle Events
  'ride:created': {
    rideId: string;
    bookingReference: string;
    customerId: string;
    serviceType: 'ride_4w' | 'ride_2w' | 'send_delivery' | 'eats_delivery' | 'mart_delivery';
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
    estimatedFare?: number;
    nearbyDriversCount: number;
    timestamp: string;
  };

  'ride:matched': {
    rideId: string;
    bookingReference: string;
    customerId: string;
    driverId: string;
    matchingScore: number;
    estimatedArrival: string;
    driverDetails: {
      name: string;
      phone: string;
      rating: number;
      vehicleInfo: any;
      currentLocation: {
        latitude: number;
        longitude: number;
        address?: string;
      };
    };
    regionId: string;
    timestamp: string;
  };

  'ride:status_update': {
    rideId: string;
    bookingReference: string;
    oldStatus: string;
    newStatus: 'searching' | 'assigned' | 'accepted' | 'en_route' | 'arrived' | 'in_progress' | 'completed' | 'cancelled';
    driverId?: string;
    customerId: string;
    regionId: string;
    location?: {
      latitude: number;
      longitude: number;
      address?: string;
    };
    timestamp: string;
    metadata?: {
      cancellationReason?: string;
      completionDetails?: any;
      eta?: string;
    };
  };

  // Driver Real-time Events
  'driver:location_update': {
    driverId: string;
    location: {
      latitude: number;
      longitude: number;
      accuracy?: number;
      bearing?: number;
      speed?: number;
      address?: string;
    };
    status: 'active' | 'offline' | 'busy' | 'break' | 'maintenance' | 'emergency';
    isAvailable: boolean;
    onTripId?: string;
    regionId: string;
    timestamp: string;
  };

  'driver:status_change': {
    driverId: string;
    oldStatus: string;
    newStatus: string;
    isAvailable: boolean;
    reason?: string;
    regionId: string;
    location?: {
      latitude: number;
      longitude: number;
      address?: string;
    };
    activeBooking?: {
      rideId: string;
      status: string;
    };
    timestamp: string;
  };

  'driver:availability_update': {
    driverId: string;
    isAvailable: boolean;
    services: string[];
    location: {
      latitude: number;
      longitude: number;
      address?: string;
    };
    regionId: string;
    capacity: {
      maxPassengers?: number;
      vehicleType: string;
    };
    timestamp: string;
  };

  // Demand and Surge Events
  'surge:activated': {
    regionId: string;
    serviceType?: string;
    surgeMultiplier: number;
    previousMultiplier: number;
    reason: 'high_demand' | 'low_supply' | 'manual_override' | 'event_based';
    duration?: number; // minutes
    zones?: string[];
    operatorId?: string;
    demandMetrics: {
      activeRequests: number;
      availableDrivers: number;
      demandSupplyRatio: number;
    };
    timestamp: string;
    expiresAt?: string;
  };

  'surge:deactivated': {
    regionId: string;
    serviceType?: string;
    previousMultiplier: number;
    reason: 'demand_normalized' | 'manual_override' | 'expired' | 'emergency';
    operatorId?: string;
    duration: number; // How long surge was active (minutes)
    timestamp: string;
  };

  'demand:hotspot_update': {
    regionId: string;
    hotspots: {
      location: {
        latitude: number;
        longitude: number;
        address?: string;
      };
      intensity: 'low' | 'medium' | 'high' | 'critical';
      requestCount: number;
      availableDriversNearby: number;
      estimatedWaitTime: number;
      services: string[];
    }[];
    totalActiveRequests: number;
    avgWaitTime: number;
    timestamp: string;
  };

  // Safety and Emergency Events
  'safety:incident': {
    incidentId: string;
    type: 'sos' | 'accident' | 'harassment' | 'vehicle_breakdown' | 'security_concern';
    priority: 'critical' | 'high' | 'medium' | 'low';
    reportedBy: {
      type: 'driver' | 'passenger' | 'system' | 'third_party';
      id: string;
      contact?: string;
    };
    location: {
      latitude: number;
      longitude: number;
      address?: string;
    };
    rideId?: string;
    driverId?: string;
    description: string;
    regionId: string;
    emergencyServices?: {
      contacted: boolean;
      responseTime?: number;
      reference?: string;
    };
    timestamp: string;
  };

  'safety:sos_activated': {
    sosId: string;
    triggeredBy: {
      type: 'driver' | 'passenger';
      id: string;
      name: string;
      phone: string;
    };
    location: {
      latitude: number;
      longitude: number;
      address?: string;
      accuracy?: number;
    };
    rideId?: string;
    rideDetails?: {
      bookingReference: string;
      status: string;
      driverId?: string;
      customerId?: string;
    };
    regionId: string;
    autoAlerts: {
      emergencyServices: boolean;
      nearbyDrivers: boolean;
      regionalOperators: boolean;
    };
    timestamp: string;
  };

  // System Performance Events
  'system:ride_matching_performance': {
    regionId?: string;
    metrics: {
      avgMatchingTime: number; // seconds
      successfulMatches: number;
      failedMatches: number;
      timeoutMatches: number;
      matchingEfficiency: number; // percentage
    };
    timeWindow: string; // e.g., "last_5_minutes"
    timestamp: string;
  };

  'system:driver_utilization': {
    regionId?: string;
    utilization: {
      totalDrivers: number;
      activeDrivers: number;
      busyDrivers: number;
      availableDrivers: number;
      utilizationRate: number; // percentage
      avgTripsPerDriver: number;
      avgHoursOnline: number;
    };
    byService: Record<string, {
      drivers: number;
      utilization: number;
    }>;
    timestamp: string;
  };

  // Real-time Analytics Events
  'analytics:demand_forecast': {
    regionId: string;
    forecast: {
      nextHour: {
        expectedRequests: number;
        confidence: number;
        peakServices: string[];
      };
      next4Hours: {
        hourlyBreakdown: {
          hour: string;
          expectedRequests: number;
          recommendedDrivers: number;
        }[];
      };
    };
    currentMetrics: {
      activeRequests: number;
      trendDirection: 'increasing' | 'decreasing' | 'stable';
      changePercent: number;
    };
    timestamp: string;
  };

  'analytics:revenue_update': {
    regionId?: string;
    revenueMetrics: {
      totalRevenue: number;
      revenuePerHour: number;
      avgFarePerTrip: number;
      surgeRevenue: number;
      surgePercentage: number;
      topEarningService: string;
    };
    timeframe: string; // e.g., "today", "this_hour"
    comparison: {
      previousPeriod: number;
      changePercent: number;
      changeDirection: 'up' | 'down' | 'stable';
    };
    timestamp: string;
  };

  // Operational Events
  'operations:fleet_rebalancing': {
    regionId: string;
    rebalancing: {
      source: {
        zone: string;
        excessDrivers: number;
      };
      target: {
        zone: string;
        neededDrivers: number;
      };
      recommendedMoves: {
        driverId: string;
        fromLocation: string;
        toLocation: string;
        incentive?: number;
      }[];
    };
    reason: 'demand_imbalance' | 'surge_mitigation' | 'coverage_optimization';
    timestamp: string;
  };

  'operations:quality_alert': {
    alertType: 'low_ratings' | 'high_cancellations' | 'long_wait_times' | 'customer_complaints';
    severity: 'low' | 'medium' | 'high' | 'critical';
    regionId: string;
    affectedEntity: {
      type: 'driver' | 'region' | 'service_type';
      id: string;
      name: string;
    };
    metrics: {
      currentValue: number;
      threshold: number;
      trend: 'worsening' | 'improving' | 'stable';
    };
    recommendedActions: string[];
    timestamp: string;
  };

  // Customer Experience Events
  'customer:ride_feedback': {
    rideId: string;
    customerId: string;
    driverId: string;
    rating: number;
    feedback?: string;
    categories: string[]; // e.g., ['cleanliness', 'navigation', 'courtesy']
    regionId: string;
    serviceType: string;
    tripDetails: {
      fare: number;
      duration: number;
      distance: number;
      surgeApplied: boolean;
    };
    timestamp: string;
  };

  'customer:complaint': {
    complaintId: string;
    customerId: string;
    rideId?: string;
    driverId?: string;
    category: 'safety' | 'service_quality' | 'billing' | 'app_issue' | 'other';
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    regionId: string;
    autoEscalate: boolean;
    timestamp: string;
  };

  // Integration Events (for external systems)
  'integration:payment_processed': {
    rideId: string;
    paymentId: string;
    amount: number;
    currency: string;
    method: string;
    status: 'success' | 'failed' | 'pending' | 'refunded';
    customerId: string;
    driverId: string;
    timestamp: string;
  };

  'integration:external_booking': {
    sourceSystem: string;
    externalBookingId: string;
    rideId: string;
    mappedData: any;
    syncStatus: 'synced' | 'failed' | 'partial';
    timestamp: string;
  };
}

// Event priority levels for routing and processing
export type EventPriority = 'critical' | 'high' | 'medium' | 'low';

// Event routing configuration
export interface EventRoutingConfig {
  event: keyof RidesharingWebSocketEvents;
  priority: EventPriority;
  requiresAuth: boolean;
  rolePermissions?: string[];
  regionScoped: boolean;
  persistToDb?: boolean;
  cacheTtl?: number; // seconds
  rateLimited?: {
    maxPerSecond: number;
    maxPerMinute: number;
  };
}

// Pre-defined routing configurations for ridesharing events
export const RIDESHARING_EVENT_ROUTING: EventRoutingConfig[] = [
  {
    event: 'safety:sos_activated',
    priority: 'critical',
    requiresAuth: true,
    rolePermissions: ['safety_monitor', 'admin', 'operator'],
    regionScoped: true,
    persistToDb: true,
    rateLimited: { maxPerSecond: 10, maxPerMinute: 100 }
  },
  {
    event: 'ride:created',
    priority: 'high',
    requiresAuth: false, // Drivers need to see this
    regionScoped: true,
    persistToDb: true,
    cacheTtl: 30,
    rateLimited: { maxPerSecond: 50, maxPerMinute: 1000 }
  },
  {
    event: 'surge:activated',
    priority: 'high',
    requiresAuth: false, // Public information
    regionScoped: true,
    persistToDb: true,
    cacheTtl: 60
  },
  {
    event: 'driver:location_update',
    priority: 'medium',
    requiresAuth: true,
    regionScoped: true,
    cacheTtl: 10,
    rateLimited: { maxPerSecond: 100, maxPerMinute: 3000 }
  },
  {
    event: 'analytics:demand_forecast',
    priority: 'medium',
    requiresAuth: true,
    rolePermissions: ['analyst', 'admin', 'operator'],
    regionScoped: true,
    cacheTtl: 300
  }
];