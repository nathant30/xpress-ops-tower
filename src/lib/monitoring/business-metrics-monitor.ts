// Business Metrics Monitoring System
// Tracks key business KPIs, driver activity, booking rates, and fraud metrics

import { metricsCollector } from './enhanced-metrics-collector';
import { logger } from '../security/productionLogger';
import { getDatabase } from '../database';

export interface DriverMetrics {
  online: number;
  active: number;
  idle: number;
  offline: number;
  utilization: number;
  avgRating: number;
  completedRides: number;
  rejectedRides: number;
}

export interface BookingMetrics {
  totalRequests: number;
  successfulBookings: number;
  cancelledBookings: number;
  completedRides: number;
  successRate: number;
  avgBookingTime: number;
  avgWaitTime: number;
  avgRideTime: number;
}

export interface RevenueMetrics {
  totalRevenue: number;
  revenuePerRide: number;
  revenuePerHour: number;
  driverEarnings: number;
  platformCommission: number;
  avgFare: number;
}

export interface FraudMetrics {
  detectedFraudAttempts: number;
  blockedTransactions: number;
  falsePositiveRate: number;
  avgDetectionTime: number;
  highRiskUsers: number;
  flaggedDrivers: number;
  suspiciousActivities: number;
}

export interface CustomerMetrics {
  activeUsers: number;
  newRegistrations: number;
  returningCustomers: number;
  avgCustomerRating: number;
  supportTickets: number;
  complaintsRate: number;
}

export interface OperationalMetrics {
  totalRides: number;
  peakHourUtilization: number;
  emergencyCallsActive: number;
  emergencyResponseTime: number;
  systemUptime: number;
  averageSpeed: number;
  fuelEfficiency: number;
}

export interface RegionalMetrics {
  regionId: string;
  regionName: string;
  activeDrivers: number;
  completedRides: number;
  revenue: number;
  demandLevel: 'low' | 'medium' | 'high' | 'surge';
  trafficConditions: 'light' | 'moderate' | 'heavy' | 'severe';
  weatherImpact: number;
}

class BusinessMetricsMonitor {
  private static instance: BusinessMetricsMonitor;
  private driverMetrics: DriverMetrics = {
    online: 0,
    active: 0,
    idle: 0,
    offline: 0,
    utilization: 0,
    avgRating: 0,
    completedRides: 0,
    rejectedRides: 0
  };
  
  private bookingMetrics: BookingMetrics = {
    totalRequests: 0,
    successfulBookings: 0,
    cancelledBookings: 0,
    completedRides: 0,
    successRate: 0,
    avgBookingTime: 0,
    avgWaitTime: 0,
    avgRideTime: 0
  };

  private revenueMetrics: RevenueMetrics = {
    totalRevenue: 0,
    revenuePerRide: 0,
    revenuePerHour: 0,
    driverEarnings: 0,
    platformCommission: 0,
    avgFare: 0
  };

  private fraudMetrics: FraudMetrics = {
    detectedFraudAttempts: 0,
    blockedTransactions: 0,
    falsePositiveRate: 0,
    avgDetectionTime: 0,
    highRiskUsers: 0,
    flaggedDrivers: 0,
    suspiciousActivities: 0
  };

  private customerMetrics: CustomerMetrics = {
    activeUsers: 0,
    newRegistrations: 0,
    returningCustomers: 0,
    avgCustomerRating: 0,
    supportTickets: 0,
    complaintsRate: 0
  };

  private operationalMetrics: OperationalMetrics = {
    totalRides: 0,
    peakHourUtilization: 0,
    emergencyCallsActive: 0,
    emergencyResponseTime: 0,
    systemUptime: 0,
    averageSpeed: 0,
    fuelEfficiency: 0
  };

  private regionalMetrics: Map<string, RegionalMetrics> = new Map();

  private constructor() {
    this.startMetricsCollection();
    this.startRealtimeUpdates();
  }

  static getInstance(): BusinessMetricsMonitor {
    if (!BusinessMetricsMonitor.instance) {
      BusinessMetricsMonitor.instance = new BusinessMetricsMonitor();
    }
    return BusinessMetricsMonitor.instance;
  }

  // Start comprehensive metrics collection
  private startMetricsCollection(): void {
    // Collect metrics every minute for real-time data
    setInterval(async () => {
      await Promise.all([
        this.collectDriverMetrics(),
        this.collectBookingMetrics(),
        this.collectRevenueMetrics(),
        this.collectFraudMetrics(),
        this.collectCustomerMetrics(),
        this.collectOperationalMetrics(),
        this.collectRegionalMetrics()
      ]);
    }, 60000); // Every minute

    // Initial collection
    setTimeout(() => {
      this.startMetricsCollection();
    }, 5000);
  }

  // Collect driver-related metrics
  private async collectDriverMetrics(): Promise<void> {
    try {
      const db = getDatabase();

      // Driver status counts
      const driverStatusQuery = await db.query(`
        SELECT 
          status,
          COUNT(*) as count,
          AVG(rating) as avg_rating
        FROM drivers 
        WHERE last_seen > NOW() - INTERVAL '5 minutes'
        GROUP BY status
      `);

      let totalDrivers = 0;
      const statusCounts: Record<string, number> = {};
      let avgRating = 0;

      for (const row of driverStatusQuery.rows) {
        const count = parseInt(row.count);
        statusCounts[row.status] = count;
        totalDrivers += count;
        if (row.status === 'available') {
          avgRating = parseFloat(row.avg_rating || '0');
        }
      }

      this.driverMetrics.online = statusCounts.available || 0;
      this.driverMetrics.active = statusCounts.on_trip || 0;
      this.driverMetrics.idle = statusCounts.idle || 0;
      this.driverMetrics.offline = statusCounts.offline || 0;
      this.driverMetrics.utilization = totalDrivers > 0 ? (this.driverMetrics.active / totalDrivers) * 100 : 0;
      this.driverMetrics.avgRating = avgRating;

      // Completed and rejected rides in last hour
      const rideStatsQuery = await db.query(`
        SELECT 
          COUNT(*) FILTER (WHERE status = 'completed') as completed,
          COUNT(*) FILTER (WHERE status = 'cancelled' AND cancelled_by = 'driver') as rejected
        FROM rides 
        WHERE created_at > NOW() - INTERVAL '1 hour'
      `);

      const rideStats = rideStatsQuery.rows[0];
      this.driverMetrics.completedRides = parseInt(rideStats?.completed || '0');
      this.driverMetrics.rejectedRides = parseInt(rideStats?.rejected || '0');

      // Update metrics collector
      metricsCollector.setGauge('drivers_online_total', this.driverMetrics.online);
      metricsCollector.setGauge('drivers_active_total', this.driverMetrics.active);
      metricsCollector.setGauge('drivers_utilization_rate', this.driverMetrics.utilization);
      metricsCollector.setGauge('drivers_avg_rating', this.driverMetrics.avgRating);

    } catch (error) {
      logger.error('Failed to collect driver metrics', {
        error: (error as Error).message
      }, { component: 'BusinessMetricsMonitor', action: 'collectDriverMetrics' });
    }
  }

  // Collect booking and ride metrics
  private async collectBookingMetrics(): Promise<void> {
    try {
      const db = getDatabase();

      // Booking statistics for last hour
      const bookingQuery = await db.query(`
        SELECT 
          COUNT(*) as total_requests,
          COUNT(*) FILTER (WHERE status = 'completed') as successful,
          COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled,
          AVG(EXTRACT(EPOCH FROM (accepted_at - created_at))) * 1000 as avg_booking_time,
          AVG(EXTRACT(EPOCH FROM (driver_arrived_at - accepted_at))) * 1000 as avg_wait_time,
          AVG(EXTRACT(EPOCH FROM (completed_at - started_at))) * 1000 as avg_ride_time
        FROM rides 
        WHERE created_at > NOW() - INTERVAL '1 hour'
      `);

      const booking = bookingQuery.rows[0];
      if (booking) {
        this.bookingMetrics.totalRequests = parseInt(booking.total_requests || '0');
        this.bookingMetrics.successfulBookings = parseInt(booking.successful || '0');
        this.bookingMetrics.cancelledBookings = parseInt(booking.cancelled || '0');
        this.bookingMetrics.completedRides = parseInt(booking.successful || '0');
        this.bookingMetrics.successRate = this.bookingMetrics.totalRequests > 0 
          ? (this.bookingMetrics.successfulBookings / this.bookingMetrics.totalRequests) * 100 
          : 0;
        this.bookingMetrics.avgBookingTime = parseFloat(booking.avg_booking_time || '0');
        this.bookingMetrics.avgWaitTime = parseFloat(booking.avg_wait_time || '0');
        this.bookingMetrics.avgRideTime = parseFloat(booking.avg_ride_time || '0');
      }

      // Update metrics collector
      metricsCollector.setGauge('booking_success_rate', this.bookingMetrics.successRate);
      metricsCollector.setGauge('booking_avg_time_ms', this.bookingMetrics.avgBookingTime);
      metricsCollector.setGauge('ride_avg_wait_time_ms', this.bookingMetrics.avgWaitTime);
      metricsCollector.incrementCounter('rides_completed_total');

    } catch (error) {
      logger.error('Failed to collect booking metrics', {
        error: (error as Error).message
      }, { component: 'BusinessMetricsMonitor', action: 'collectBookingMetrics' });
    }
  }

  // Collect revenue metrics
  private async collectRevenueMetrics(): Promise<void> {
    try {
      const db = getDatabase();

      // Revenue statistics for last hour
      const revenueQuery = await db.query(`
        SELECT 
          SUM(fare_amount) as total_revenue,
          AVG(fare_amount) as avg_fare,
          SUM(driver_earnings) as driver_earnings,
          SUM(commission) as platform_commission,
          COUNT(*) as total_rides
        FROM rides 
        WHERE status = 'completed' 
          AND completed_at > NOW() - INTERVAL '1 hour'
      `);

      const revenue = revenueQuery.rows[0];
      if (revenue) {
        this.revenueMetrics.totalRevenue = parseFloat(revenue.total_revenue || '0');
        this.revenueMetrics.avgFare = parseFloat(revenue.avg_fare || '0');
        this.revenueMetrics.driverEarnings = parseFloat(revenue.driver_earnings || '0');
        this.revenueMetrics.platformCommission = parseFloat(revenue.platform_commission || '0');
        
        const rideCount = parseInt(revenue.total_rides || '0');
        this.revenueMetrics.revenuePerRide = rideCount > 0 ? this.revenueMetrics.totalRevenue / rideCount : 0;
        this.revenueMetrics.revenuePerHour = this.revenueMetrics.totalRevenue; // Already hourly
      }

      // Update metrics collector
      metricsCollector.setGauge('revenue_total_hourly', this.revenueMetrics.totalRevenue);
      metricsCollector.setGauge('revenue_per_ride', this.revenueMetrics.revenuePerRide);
      metricsCollector.setGauge('fare_avg_amount', this.revenueMetrics.avgFare);

    } catch (error) {
      logger.error('Failed to collect revenue metrics', {
        error: (error as Error).message
      }, { component: 'BusinessMetricsMonitor', action: 'collectRevenueMetrics' });
    }
  }

  // Collect fraud detection metrics
  private async collectFraudMetrics(): Promise<void> {
    try {
      const db = getDatabase();

      // Fraud statistics for last hour
      const fraudQuery = await db.query(`
        SELECT 
          COUNT(*) FILTER (WHERE alert_type = 'fraud_detected') as fraud_attempts,
          COUNT(*) FILTER (WHERE alert_type = 'transaction_blocked') as blocked_transactions,
          COUNT(*) FILTER (WHERE risk_score > 80) as high_risk_users,
          AVG(EXTRACT(EPOCH FROM (resolved_at - created_at))) * 1000 as avg_detection_time
        FROM fraud_alerts 
        WHERE created_at > NOW() - INTERVAL '1 hour'
      `);

      const fraud = fraudQuery.rows[0];
      if (fraud) {
        this.fraudMetrics.detectedFraudAttempts = parseInt(fraud.fraud_attempts || '0');
        this.fraudMetrics.blockedTransactions = parseInt(fraud.blocked_transactions || '0');
        this.fraudMetrics.highRiskUsers = parseInt(fraud.high_risk_users || '0');
        this.fraudMetrics.avgDetectionTime = parseFloat(fraud.avg_detection_time || '0');
      }

      // Calculate false positive rate (simplified)
      const falsePositiveQuery = await db.query(`
        SELECT 
          COUNT(*) FILTER (WHERE is_false_positive = true) as false_positives,
          COUNT(*) as total_alerts
        FROM fraud_alerts 
        WHERE created_at > NOW() - INTERVAL '24 hours'
      `);

      const falsePositive = falsePositiveQuery.rows[0];
      if (falsePositive && parseInt(falsePositive.total_alerts) > 0) {
        this.fraudMetrics.falsePositiveRate = 
          (parseInt(falsePositive.false_positives) / parseInt(falsePositive.total_alerts)) * 100;
      }

      // Update metrics collector
      metricsCollector.setGauge('fraud_detection_rate', this.fraudMetrics.detectedFraudAttempts);
      metricsCollector.setGauge('fraud_false_positive_rate', this.fraudMetrics.falsePositiveRate);
      metricsCollector.setGauge('fraud_high_risk_users', this.fraudMetrics.highRiskUsers);
      metricsCollector.setGauge('fraud_detection_time_ms', this.fraudMetrics.avgDetectionTime);

    } catch (error) {
      logger.error('Failed to collect fraud metrics', {
        error: (error as Error).message
      }, { component: 'BusinessMetricsMonitor', action: 'collectFraudMetrics' });
    }
  }

  // Collect customer metrics
  private async collectCustomerMetrics(): Promise<void> {
    try {
      const db = getDatabase();

      // Customer statistics
      const customerQuery = await db.query(`
        SELECT 
          COUNT(*) FILTER (WHERE last_active > NOW() - INTERVAL '24 hours') as active_users,
          COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '1 hour') as new_registrations,
          AVG(rating) as avg_rating
        FROM users 
        WHERE user_type = 'passenger'
      `);

      const customer = customerQuery.rows[0];
      if (customer) {
        this.customerMetrics.activeUsers = parseInt(customer.active_users || '0');
        this.customerMetrics.newRegistrations = parseInt(customer.new_registrations || '0');
        this.customerMetrics.avgCustomerRating = parseFloat(customer.avg_rating || '0');
      }

      // Support ticket count
      const supportQuery = await db.query(`
        SELECT COUNT(*) as ticket_count
        FROM support_tickets 
        WHERE status = 'open' 
          AND created_at > NOW() - INTERVAL '24 hours'
      `);

      const support = supportQuery.rows[0];
      this.customerMetrics.supportTickets = parseInt(support?.ticket_count || '0');

      // Update metrics collector
      metricsCollector.setGauge('customers_active_24h', this.customerMetrics.activeUsers);
      metricsCollector.setGauge('customers_new_registrations_hourly', this.customerMetrics.newRegistrations);
      metricsCollector.setGauge('customer_satisfaction_score', this.customerMetrics.avgCustomerRating);
      metricsCollector.setGauge('support_tickets_open', this.customerMetrics.supportTickets);

    } catch (error) {
      logger.error('Failed to collect customer metrics', {
        error: (error as Error).message
      }, { component: 'BusinessMetricsMonitor', action: 'collectCustomerMetrics' });
    }
  }

  // Collect operational metrics
  private async collectOperationalMetrics(): Promise<void> {
    try {
      const db = getDatabase();

      // Operational statistics
      const operationalQuery = await db.query(`
        SELECT 
          COUNT(*) as total_rides,
          AVG(avg_speed) as average_speed,
          COUNT(*) FILTER (WHERE emergency_status = 'active') as emergency_calls
        FROM rides 
        WHERE created_at > NOW() - INTERVAL '1 hour'
      `);

      const operational = operationalQuery.rows[0];
      if (operational) {
        this.operationalMetrics.totalRides = parseInt(operational.total_rides || '0');
        this.operationalMetrics.averageSpeed = parseFloat(operational.average_speed || '0');
        this.operationalMetrics.emergencyCallsActive = parseInt(operational.emergency_calls || '0');
      }

      // Emergency response time
      const emergencyQuery = await db.query(`
        SELECT AVG(EXTRACT(EPOCH FROM (response_time - created_at))) * 1000 as avg_response_time
        FROM emergency_alerts 
        WHERE created_at > NOW() - INTERVAL '1 hour'
          AND response_time IS NOT NULL
      `);

      const emergency = emergencyQuery.rows[0];
      if (emergency) {
        this.operationalMetrics.emergencyResponseTime = parseFloat(emergency.avg_response_time || '0');
      }

      // System uptime (from process)
      if (typeof process !== 'undefined') {
        this.operationalMetrics.systemUptime = process.uptime();
      }

      // Update metrics collector
      metricsCollector.setGauge('operations_total_rides_hourly', this.operationalMetrics.totalRides);
      metricsCollector.setGauge('operations_avg_speed_kmh', this.operationalMetrics.averageSpeed);
      metricsCollector.setGauge('emergency_calls_active', this.operationalMetrics.emergencyCallsActive);
      metricsCollector.setGauge('emergency_response_time_ms', this.operationalMetrics.emergencyResponseTime);
      metricsCollector.setGauge('system_uptime_seconds', this.operationalMetrics.systemUptime);

    } catch (error) {
      logger.error('Failed to collect operational metrics', {
        error: (error as Error).message
      }, { component: 'BusinessMetricsMonitor', action: 'collectOperationalMetrics' });
    }
  }

  // Collect regional metrics
  private async collectRegionalMetrics(): Promise<void> {
    try {
      const db = getDatabase();

      // Regional statistics
      const regionalQuery = await db.query(`
        SELECT 
          r.id,
          r.name,
          COUNT(d.id) FILTER (WHERE d.status = 'available') as active_drivers,
          COUNT(ri.id) FILTER (WHERE ri.status = 'completed' AND ri.completed_at > NOW() - INTERVAL '1 hour') as completed_rides,
          SUM(ri.fare_amount) FILTER (WHERE ri.status = 'completed' AND ri.completed_at > NOW() - INTERVAL '1 hour') as revenue
        FROM regions r
        LEFT JOIN drivers d ON ST_Contains(r.boundary, d.location) AND d.last_seen > NOW() - INTERVAL '5 minutes'
        LEFT JOIN rides ri ON ST_Contains(r.boundary, ri.pickup_location)
        GROUP BY r.id, r.name
      `);

      for (const row of regionalQuery.rows) {
        const regionMetrics: RegionalMetrics = {
          regionId: row.id,
          regionName: row.name,
          activeDrivers: parseInt(row.active_drivers || '0'),
          completedRides: parseInt(row.completed_rides || '0'),
          revenue: parseFloat(row.revenue || '0'),
          demandLevel: this.calculateDemandLevel(parseInt(row.completed_rides || '0')),
          trafficConditions: 'moderate', // Would be from traffic API
          weatherImpact: 0 // Would be from weather API
        };

        this.regionalMetrics.set(row.id, regionMetrics);

        // Update metrics collector with regional data
        metricsCollector.setGauge('regional_active_drivers', regionMetrics.activeDrivers, {
          region_id: regionMetrics.regionId,
          region_name: regionMetrics.regionName
        });
        metricsCollector.setGauge('regional_completed_rides', regionMetrics.completedRides, {
          region_id: regionMetrics.regionId,
          region_name: regionMetrics.regionName
        });
        metricsCollector.setGauge('regional_revenue', regionMetrics.revenue, {
          region_id: regionMetrics.regionId,
          region_name: regionMetrics.regionName
        });
      }

    } catch (error) {
      logger.error('Failed to collect regional metrics', {
        error: (error as Error).message
      }, { component: 'BusinessMetricsMonitor', action: 'collectRegionalMetrics' });
    }
  }

  // Calculate demand level based on rides
  private calculateDemandLevel(ridesPerHour: number): 'low' | 'medium' | 'high' | 'surge' {
    if (ridesPerHour < 10) return 'low';
    if (ridesPerHour < 30) return 'medium';
    if (ridesPerHour < 60) return 'high';
    return 'surge';
  }

  // Start real-time updates
  private startRealtimeUpdates(): void {
    setInterval(() => {
      // Emit real-time metrics updates
      logger.info('Business metrics updated', {
        drivers: this.driverMetrics.online,
        activeRides: this.driverMetrics.active,
        bookingSuccessRate: this.bookingMetrics.successRate,
        hourlyRevenue: this.revenueMetrics.totalRevenue,
        fraudDetections: this.fraudMetrics.detectedFraudAttempts
      }, { component: 'BusinessMetricsMonitor', action: 'realtimeUpdate' });
    }, 30000); // Every 30 seconds
  }

  // Public API methods
  getDriverMetrics(): DriverMetrics {
    return { ...this.driverMetrics };
  }

  getBookingMetrics(): BookingMetrics {
    return { ...this.bookingMetrics };
  }

  getRevenueMetrics(): RevenueMetrics {
    return { ...this.revenueMetrics };
  }

  getFraudMetrics(): FraudMetrics {
    return { ...this.fraudMetrics };
  }

  getCustomerMetrics(): CustomerMetrics {
    return { ...this.customerMetrics };
  }

  getOperationalMetrics(): OperationalMetrics {
    return { ...this.operationalMetrics };
  }

  getRegionalMetrics(): RegionalMetrics[] {
    return Array.from(this.regionalMetrics.values());
  }

  getRegionalMetricsByRegion(regionId: string): RegionalMetrics | null {
    return this.regionalMetrics.get(regionId) || null;
  }

  // Get comprehensive business metrics summary
  getBusinessMetricsSummary(): {
    drivers: DriverMetrics;
    bookings: BookingMetrics;
    revenue: RevenueMetrics;
    fraud: FraudMetrics;
    customers: CustomerMetrics;
    operations: OperationalMetrics;
    regions: RegionalMetrics[];
    timestamp: Date;
  } {
    return {
      drivers: this.getDriverMetrics(),
      bookings: this.getBookingMetrics(),
      revenue: this.getRevenueMetrics(),
      fraud: this.getFraudMetrics(),
      customers: this.getCustomerMetrics(),
      operations: this.getOperationalMetrics(),
      regions: this.getRegionalMetrics(),
      timestamp: new Date()
    };
  }

  // Track custom business event
  trackBusinessEvent(
    eventType: 'ride_completed' | 'driver_onboarded' | 'fraud_detected' | 'emergency_resolved',
    metadata: Record<string, any> = {}
  ): void {
    metricsCollector.incrementCounter(`business_event_${eventType}_total`, metadata);
    
    logger.info('Business event tracked', {
      eventType,
      metadata,
      timestamp: new Date()
    }, { component: 'BusinessMetricsMonitor', action: 'trackBusinessEvent' });
  }
}

// Export business metrics monitor instance
export const businessMetricsMonitor = BusinessMetricsMonitor.getInstance();
export default BusinessMetricsMonitor;