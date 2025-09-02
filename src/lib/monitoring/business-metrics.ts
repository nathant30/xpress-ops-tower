// Business Metrics Tracking System - Real-time operational insights

import { BusinessMetric } from './types';
import { metricsCollector } from './metrics-collector';
import { logger } from '../security/productionLogger';

export interface BusinessKPI {
  name: string;
  value: number;
  target?: number;
  unit: string;
  trend: 'UP' | 'DOWN' | 'STABLE';
  change: number; // percentage change
  timestamp: Date;
}

export interface OperationalMetrics {
  // Driver metrics
  activeDrivers: number;
  driverUtilization: number; // percentage
  avgDriverEarnings: number;
  driverOnlineTime: number; // minutes
  
  // Booking metrics
  totalBookings: number;
  completedBookings: number;
  cancelledBookings: number;
  avgBookingDuration: number; // minutes
  avgWaitTime: number; // minutes
  
  // Revenue metrics
  totalRevenue: number;
  avgFarePerRide: number;
  revenuePerDriver: number;
  
  // Operational efficiency
  demandSupplyRatio: number;
  surgeActivation: number; // percentage of time surge is active
  fraudDetectionRate: number;
  
  // Customer satisfaction
  avgRating: number;
  complaintRate: number;
  
  timestamp: Date;
}

export class BusinessMetricsTracker {
  private static instance: BusinessMetricsTracker;
  private kpiHistory: Map<string, BusinessKPI[]> = new Map();
  private operationalSnapshot: OperationalMetrics | null = null;
  private readonly maxHistoryLength = 1440; // 24 hours of minute-by-minute data

  private constructor() {
    // Start periodic KPI calculation
    setInterval(() => this.calculateKPIs(), 60 * 1000); // Every minute
    setInterval(() => this.updateOperationalSnapshot(), 5 * 60 * 1000); // Every 5 minutes
  }

  public static getInstance(): BusinessMetricsTracker {
    if (!BusinessMetricsTracker.instance) {
      BusinessMetricsTracker.instance = new BusinessMetricsTracker();
    }
    return BusinessMetricsTracker.instance;
  }

  // Track driver-related metrics
  public trackDriverMetric(
    type: 'ONLINE' | 'OFFLINE' | 'TRIP_STARTED' | 'TRIP_COMPLETED' | 'EARNINGS',
    driverId: string,
    value: number = 1,
    metadata: Record<string, any> = {}
  ): void {
    metricsCollector.recordBusinessMetric({
      type: `DRIVER_${type}`,
      value,
      metadata: {
        driver_id: driverId,
        ...metadata
      },
      regionId: metadata.region_id,
      timestamp: new Date()
    });

    // Update specific driver metrics
    this.updateDriverMetrics(type, driverId, value, metadata);
  }

  // Track booking-related metrics
  public trackBookingMetric(
    type: 'CREATED' | 'ASSIGNED' | 'STARTED' | 'COMPLETED' | 'CANCELLED',
    bookingId: string,
    value: number = 1,
    metadata: Record<string, any> = {}
  ): void {
    metricsCollector.recordBusinessMetric({
      type: `BOOKING_${type}`,
      value,
      metadata: {
        booking_id: bookingId,
        ...metadata
      },
      regionId: metadata.region_id,
      timestamp: new Date()
    });

    // Update booking-specific metrics
    this.updateBookingMetrics(type, bookingId, value, metadata);
  }

  // Track fraud detection metrics
  public trackFraudMetric(
    detected: boolean,
    riskScore: number,
    fraudType?: string,
    metadata: Record<string, any> = {}
  ): void {
    metricsCollector.recordBusinessMetric({
      type: 'FRAUD_DETECTED',
      value: detected ? 1 : 0,
      metadata: {
        risk_score: riskScore,
        fraud_type: fraudType,
        ...metadata
      },
      regionId: metadata.region_id,
      timestamp: new Date()
    });

    if (detected) {
      logger.warn('Fraud detected', {
        riskScore,
        fraudType,
        metadata
      }, {
        component: 'FraudDetection',
        action: 'trackFraudMetric'
      });
    }
  }

  // Track revenue metrics
  public trackRevenueMetric(
    amount: number,
    type: 'BOOKING_FARE' | 'COMMISSION' | 'SURGE_PREMIUM' | 'TOLL',
    metadata: Record<string, any> = {}
  ): void {
    metricsCollector.recordBusinessMetric({
      type: `REVENUE_${type}`,
      value: amount,
      metadata,
      regionId: metadata.region_id,
      timestamp: new Date()
    });
  }

  // Track customer satisfaction metrics
  public trackCustomerSatisfaction(
    rating: number,
    bookingId: string,
    feedback?: string,
    metadata: Record<string, any> = {}
  ): void {
    metricsCollector.recordBusinessMetric({
      type: 'CUSTOMER_RATING',
      value: rating,
      metadata: {
        booking_id: bookingId,
        feedback: feedback?.substring(0, 100),
        ...metadata
      },
      regionId: metadata.region_id,
      timestamp: new Date()
    });
  }

  // Get current KPIs
  public getCurrentKPIs(): BusinessKPI[] {
    const kpis: BusinessKPI[] = [];
    
    this.kpiHistory.forEach(history => {
      if (history.length > 0) {
        kpis.push(history[history.length - 1]);
      }
    });
    
    return kpis.sort((a, b) => {
      const severityOrder = { DOWN: 0, STABLE: 1, UP: 2 };
      return severityOrder[a.trend] - severityOrder[b.trend];
    });
  }

  // Get KPI history for a specific metric
  public getKPIHistory(kpiName: string, hours: number = 24): BusinessKPI[] {
    const history = this.kpiHistory.get(kpiName) || [];
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
    
    return history.filter(kpi => kpi.timestamp >= cutoff);
  }

  // Get current operational snapshot
  public getOperationalSnapshot(): OperationalMetrics | null {
    return this.operationalSnapshot;
  }

  // Get business metrics summary
  public getBusinessMetricsSummary(hours: number = 24): {
    driverMetrics: {
      totalActive: number;
      averageUtilization: number;
      totalEarnings: number;
      onlineHours: number;
    };
    bookingMetrics: {
      totalBookings: number;
      completionRate: number;
      cancellationRate: number;
      averageWaitTime: number;
      averageDuration: number;
    };
    revenueMetrics: {
      totalRevenue: number;
      averageFare: number;
      surgeRevenue: number;
      commissionRevenue: number;
    };
    fraudMetrics: {
      totalDetected: number;
      falsePositiveRate: number;
      averageRiskScore: number;
    };
    customerMetrics: {
      averageRating: number;
      totalRatings: number;
      satisfactionRate: number;
    };
  } {
    const timeRangeMs = hours * 60 * 60 * 1000;
    const timeRangeMinutes = hours * 60;
    
    // Driver metrics
    const activeDrivers = metricsCollector.getAggregatedMetrics('business_driver_online', 'AVG', timeRangeMinutes);
    const driverEarnings = metricsCollector.getAggregatedMetrics('business_driver_earnings', 'SUM', timeRangeMinutes);
    
    // Booking metrics
    const totalBookings = metricsCollector.getAggregatedMetrics('business_booking_created', 'SUM', timeRangeMinutes);
    const completedBookings = metricsCollector.getAggregatedMetrics('business_booking_completed', 'SUM', timeRangeMinutes);
    const cancelledBookings = metricsCollector.getAggregatedMetrics('business_booking_cancelled', 'SUM', timeRangeMinutes);
    
    // Revenue metrics
    const bookingRevenue = metricsCollector.getAggregatedMetrics('business_revenue_booking_fare', 'SUM', timeRangeMinutes);
    const surgeRevenue = metricsCollector.getAggregatedMetrics('business_revenue_surge_premium', 'SUM', timeRangeMinutes);
    const commissionRevenue = metricsCollector.getAggregatedMetrics('business_revenue_commission', 'SUM', timeRangeMinutes);
    
    // Fraud metrics
    const fraudDetected = metricsCollector.getAggregatedMetrics('business_fraud_detected', 'SUM', timeRangeMinutes);
    
    // Customer metrics
    const customerRatings = metricsCollector.getAggregatedMetrics('business_customer_rating', 'AVG', timeRangeMinutes);
    const totalRatings = metricsCollector.getAggregatedMetrics('business_customer_rating', 'COUNT', timeRangeMinutes);

    // Calculate derived metrics
    const totalBookingsValue = totalBookings[0]?.value || 0;
    const completedBookingsValue = completedBookings[0]?.value || 0;
    const cancelledBookingsValue = cancelledBookings[0]?.value || 0;
    
    const completionRate = totalBookingsValue > 0 ? (completedBookingsValue / totalBookingsValue) * 100 : 0;
    const cancellationRate = totalBookingsValue > 0 ? (cancelledBookingsValue / totalBookingsValue) * 100 : 0;
    
    const totalRevenueValue = (bookingRevenue[0]?.value || 0) + (surgeRevenue[0]?.value || 0);
    const averageFare = completedBookingsValue > 0 ? totalRevenueValue / completedBookingsValue : 0;

    return {
      driverMetrics: {
        totalActive: activeDrivers[0]?.value || 0,
        averageUtilization: 0, // Would need more complex calculation
        totalEarnings: driverEarnings[0]?.value || 0,
        onlineHours: 0 // Would need tracking of online time
      },
      bookingMetrics: {
        totalBookings: totalBookingsValue,
        completionRate,
        cancellationRate,
        averageWaitTime: 0, // Would need wait time tracking
        averageDuration: 0 // Would need duration tracking
      },
      revenueMetrics: {
        totalRevenue: totalRevenueValue,
        averageFare,
        surgeRevenue: surgeRevenue[0]?.value || 0,
        commissionRevenue: commissionRevenue[0]?.value || 0
      },
      fraudMetrics: {
        totalDetected: fraudDetected[0]?.value || 0,
        falsePositiveRate: 0, // Would need false positive tracking
        averageRiskScore: 0 // Would need risk score tracking
      },
      customerMetrics: {
        averageRating: customerRatings[0]?.value || 0,
        totalRatings: totalRatings[0]?.value || 0,
        satisfactionRate: customerRatings[0]?.value >= 4 ? 
          (customerRatings[0]?.value / 5) * 100 : 0
      }
    };
  }

  // Get regional performance comparison
  public getRegionalPerformance(hours: number = 24): Array<{
    regionId: string;
    activeDrivers: number;
    totalBookings: number;
    revenue: number;
    utilizationRate: number;
    customerSatisfaction: number;
  }> {
    const timeRangeMinutes = hours * 60;
    
    // Get metrics grouped by region
    const driversByRegion = metricsCollector.getAggregatedMetrics('business_driver_online', 'AVG', timeRangeMinutes, 'region');
    const bookingsByRegion = metricsCollector.getAggregatedMetrics('business_booking_created', 'SUM', timeRangeMinutes, 'region');
    const revenueByRegion = metricsCollector.getAggregatedMetrics('business_revenue_booking_fare', 'SUM', timeRangeMinutes, 'region');
    const ratingsByRegion = metricsCollector.getAggregatedMetrics('business_customer_rating', 'AVG', timeRangeMinutes, 'region');

    // Combine metrics by region
    const regions = new Set<string>();
    [driversByRegion, bookingsByRegion, revenueByRegion, ratingsByRegion].forEach(metrics => {
      metrics.forEach(metric => {
        if (metric.tags && Object.keys(metric.tags).length > 0) {
          const regionKey = Object.keys(metric.tags)[0];
          regions.add(metric.tags[regionKey]);
        }
      });
    });

    return Array.from(regions).map(regionId => {
      const drivers = driversByRegion.find(m => m.tags && Object.values(m.tags).includes(regionId))?.value || 0;
      const bookings = bookingsByRegion.find(m => m.tags && Object.values(m.tags).includes(regionId))?.value || 0;
      const revenue = revenueByRegion.find(m => m.tags && Object.values(m.tags).includes(regionId))?.value || 0;
      const rating = ratingsByRegion.find(m => m.tags && Object.values(m.tags).includes(regionId))?.value || 0;

      return {
        regionId,
        activeDrivers: drivers,
        totalBookings: bookings,
        revenue,
        utilizationRate: drivers > 0 ? (bookings / drivers) * 100 : 0,
        customerSatisfaction: rating
      };
    }).sort((a, b) => b.revenue - a.revenue);
  }

  // Private methods

  private updateDriverMetrics(
    type: string,
    driverId: string,
    value: number,
    metadata: Record<string, any>
  ): void {
    const tags = {
      driver_id: driverId,
      type,
      region: metadata.region_id || 'default'
    };

    switch (type) {
      case 'ONLINE':
        metricsCollector.recordMetric('driver_status_online', value, 'gauge', tags);
        break;
      case 'TRIP_COMPLETED':
        metricsCollector.recordMetric('driver_trips_completed', value, 'count', tags);
        if (metadata.earnings) {
          metricsCollector.recordMetric('driver_earnings', metadata.earnings, 'gauge', tags);
        }
        break;
    }
  }

  private updateBookingMetrics(
    type: string,
    bookingId: string,
    value: number,
    metadata: Record<string, any>
  ): void {
    const tags = {
      booking_id: bookingId,
      type,
      region: metadata.region_id || 'default'
    };

    switch (type) {
      case 'CREATED':
        metricsCollector.recordMetric('booking_demand', value, 'count', tags);
        break;
      case 'COMPLETED':
        metricsCollector.recordMetric('booking_supply_fulfillment', value, 'count', tags);
        if (metadata.duration) {
          metricsCollector.recordMetric('booking_duration', metadata.duration, 'timer', tags);
        }
        break;
      case 'CANCELLED':
        metricsCollector.recordMetric('booking_cancellation', value, 'count', {
          ...tags,
          reason: metadata.cancellation_reason || 'unknown'
        });
        break;
    }
  }

  private calculateKPIs(): void {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    
    // Calculate active drivers KPI
    const activeDriversMetrics = metricsCollector.getMetrics('business_driver_online', oneHourAgo);
    if (activeDriversMetrics.length > 0) {
      const currentValue = activeDriversMetrics[activeDriversMetrics.length - 1].value;
      const previousValue = activeDriversMetrics.length > 1 ? 
        activeDriversMetrics[activeDriversMetrics.length - 2].value : currentValue;
      
      const change = previousValue > 0 ? ((currentValue - previousValue) / previousValue) * 100 : 0;
      const trend = change > 5 ? 'UP' : change < -5 ? 'DOWN' : 'STABLE';

      this.updateKPI('active_drivers', {
        name: 'Active Drivers',
        value: currentValue,
        target: 100, // Example target
        unit: 'drivers',
        trend,
        change,
        timestamp: now
      });
    }

    // Calculate other KPIs similarly...
    this.calculateBookingKPIs(now);
    this.calculateRevenueKPIs(now);
    this.calculateSatisfactionKPIs(now);
  }

  private calculateBookingKPIs(now: Date): void {
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    
    const bookingMetrics = metricsCollector.getMetrics('business_booking_created', oneHourAgo);
    if (bookingMetrics.length > 0) {
      const currentValue = bookingMetrics.reduce((sum, metric) => sum + metric.value, 0);
      // Calculate trend and update KPI
      this.updateKPI('bookings_per_hour', {
        name: 'Bookings per Hour',
        value: currentValue,
        target: 50,
        unit: 'bookings',
        trend: 'STABLE',
        change: 0,
        timestamp: now
      });
    }
  }

  private calculateRevenueKPIs(now: Date): void {
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    
    const revenueMetrics = metricsCollector.getMetrics('business_revenue_booking_fare', oneHourAgo);
    if (revenueMetrics.length > 0) {
      const currentValue = revenueMetrics.reduce((sum, metric) => sum + metric.value, 0);
      this.updateKPI('revenue_per_hour', {
        name: 'Revenue per Hour',
        value: currentValue,
        target: 5000,
        unit: 'PHP',
        trend: 'STABLE',
        change: 0,
        timestamp: now
      });
    }
  }

  private calculateSatisfactionKPIs(now: Date): void {
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    
    const ratingMetrics = metricsCollector.getMetrics('business_customer_rating', oneHourAgo);
    if (ratingMetrics.length > 0) {
      const avgRating = ratingMetrics.reduce((sum, metric) => sum + metric.value, 0) / ratingMetrics.length;
      this.updateKPI('customer_satisfaction', {
        name: 'Customer Satisfaction',
        value: avgRating,
        target: 4.5,
        unit: 'stars',
        trend: avgRating >= 4.5 ? 'UP' : avgRating < 4.0 ? 'DOWN' : 'STABLE',
        change: 0,
        timestamp: now
      });
    }
  }

  private updateKPI(name: string, kpi: BusinessKPI): void {
    if (!this.kpiHistory.has(name)) {
      this.kpiHistory.set(name, []);
    }

    const history = this.kpiHistory.get(name)!;
    history.push(kpi);

    // Keep only recent history
    if (history.length > this.maxHistoryLength) {
      history.splice(0, history.length - this.maxHistoryLength);
    }
  }

  private updateOperationalSnapshot(): void {
    // This would be implemented with real-time data fetching
    // For now, using mock data structure
    this.operationalSnapshot = {
      activeDrivers: 85,
      driverUtilization: 72.5,
      avgDriverEarnings: 1250,
      driverOnlineTime: 480,
      totalBookings: 156,
      completedBookings: 142,
      cancelledBookings: 14,
      avgBookingDuration: 25,
      avgWaitTime: 8,
      totalRevenue: 12500,
      avgFarePerRide: 88,
      revenuePerDriver: 147,
      demandSupplyRatio: 1.2,
      surgeActivation: 15,
      fraudDetectionRate: 0.02,
      avgRating: 4.3,
      complaintRate: 0.05,
      timestamp: new Date()
    };
  }
}

// Export singleton instance
export const businessMetricsTracker = BusinessMetricsTracker.getInstance();