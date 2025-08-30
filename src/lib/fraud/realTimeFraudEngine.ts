// Real-time Fraud Detection Engine
// Orchestrates all fraud detection systems for real-time monitoring

import { riderIncentiveFraudDetector } from './riderIncentiveFraud';
import { gpsSpoofingDetector } from './gpsSpoofingDetector';
import { multiAccountDetector } from './multiAccountDetector';
import { dataProtectionLogger } from '../compliance/dataProtectionLogger';
import { metricsCollector } from '../monitoring/metricsCollector';
import { FraudAlert, FraudAlertType, FraudMonitor } from '@/types/fraudDetection';
import { logger } from '../security/productionLogger';

export interface FraudEventData {
  eventType: 'ride_request' | 'ride_start' | 'ride_end' | 'payment' | 'login' | 'registration' | 'gps_update';
  userId: string;
  userType: 'rider' | 'driver';
  data: any;
  timestamp?: number;
  metadata?: any;
}

export interface FraudCheckResult {
  riskScore: number;
  alerts: FraudAlert[];
  blockedActions: string[];
  flaggedForReview: boolean;
  reasoning: string[];
}

class RealTimeFraudEngine {
  private static instance: RealTimeFraudEngine;
  private isEnabled = true;
  private alertQueue: FraudAlert[] = [];
  private activeMonitors: Map<string, FraudMonitor> = new Map();
  private alertHandlers: Array<(alert: FraudAlert) => void> = [];

  // Configuration
  private readonly config = {
    realTimeBlocking: false, // Start with flagging only
    autoEscalationThreshold: 90,
    batchProcessingInterval: 5000, // 5 seconds
    maxQueueSize: 1000,
    alertRetention: 30 * 24 * 60 * 60 * 1000, // 30 days
  };

  // Fraud type weights for overall risk calculation
  private readonly fraudWeights = {
    'rider_incentive_fraud': 0.25,
    'gps_spoofing': 0.30,
    'multi_accounting': 0.20,
    'payment_fraud': 0.35,
    'fake_rides': 0.25,
    'device_fraud': 0.15
  };

  private constructor() {
    this.initializeMonitors();
    this.startBatchProcessor();
  }

  public static getInstance(): RealTimeFraudEngine {
    if (!RealTimeFraudEngine.instance) {
      RealTimeFraudEngine.instance = new RealTimeFraudEngine();
    }
    return RealTimeFraudEngine.instance;
  }

  /**
   * Main entry point for real-time fraud checking
   */
  async checkForFraud(eventData: FraudEventData): Promise<FraudCheckResult> {
    if (!this.isEnabled) {
      return this.createEmptyResult();
    }

    try {
      const startTime = Date.now();
      
      // Track fraud check metrics
      metricsCollector.incrementCounter('fraud_checks_total', { 
        event_type: eventData.eventType,
        user_type: eventData.userType 
      });

      const result = await this.performFraudCheck(eventData);
      
      // Record processing time
      const processingTime = Date.now() - startTime;
      metricsCollector.recordHistogram('fraud_check_duration_ms', processingTime);

      // Log data access for compliance
      if (eventData.data && result.riskScore > 0) {
        await dataProtectionLogger.logDataAccess({
          timestamp: new Date(),
          userId: 'fraud_system',
          userRole: 'system',
          dataSubjectId: eventData.userId,
          dataType: 'personal',
          accessType: 'read',
          purpose: 'fraud_detection',
          legalBasis: 'legitimate_interests',
          dataFields: Object.keys(eventData.data),
          ipAddress: 'system',
          userAgent: 'fraud_engine',
          sessionId: `fraud_${Date.now()}`
        });
      }

      // Process alerts
      if (result.alerts.length > 0) {
        await this.processAlerts(result.alerts);
      }

      return result;
    } catch (error) {
      logger.error('Real-time fraud check failed', { error });
      metricsCollector.incrementCounter('fraud_check_errors_total');
      return this.createEmptyResult();
    }
  }

  /**
   * Perform comprehensive fraud analysis
   */
  private async performFraudCheck(eventData: FraudEventData): Promise<FraudCheckResult> {
    const alerts: FraudAlert[] = [];
    const blockedActions: string[] = [];
    const reasoning: string[] = [];
    let maxRiskScore = 0;

    // Run fraud detection based on event type
    switch (eventData.eventType) {
      case 'ride_request':
      case 'ride_start':
      case 'ride_end':
        await this.checkRideRelatedFraud(eventData, alerts, reasoning);
        break;
        
      case 'payment':
        await this.checkPaymentFraud(eventData, alerts, reasoning);
        break;
        
      case 'login':
      case 'registration':
        await this.checkAccountFraud(eventData, alerts, reasoning);
        break;
        
      case 'gps_update':
        await this.checkLocationFraud(eventData, alerts, reasoning);
        break;
    }

    // Calculate overall risk score
    if (alerts.length > 0) {
      maxRiskScore = Math.max(...alerts.map(alert => alert.fraudScore));
      
      // Determine if actions should be blocked (when real-time blocking is enabled)
      if (this.config.realTimeBlocking && maxRiskScore >= this.config.autoEscalationThreshold) {
        blockedActions.push(eventData.eventType);
        reasoning.push(`High risk score (${maxRiskScore}) triggered automatic blocking`);
      }
    }

    return {
      riskScore: maxRiskScore,
      alerts,
      blockedActions,
      flaggedForReview: maxRiskScore >= 60, // Flag for manual review
      reasoning
    };
  }

  /**
   * Check for ride-related fraud (incentive fraud, fake rides)
   */
  private async checkRideRelatedFraud(
    eventData: FraudEventData, 
    alerts: FraudAlert[], 
    reasoning: string[]
  ): Promise<void> {
    if (eventData.userType !== 'rider') return;

    // Check for rider incentive fraud
    try {
      const riderData = await this.getRiderData(eventData.userId);
      const incentiveFraudAlert = await riderIncentiveFraudDetector.analyzeRider(
        eventData.userId, 
        riderData
      );
      
      if (incentiveFraudAlert) {
        alerts.push(incentiveFraudAlert);
        reasoning.push('Rider incentive fraud patterns detected');
        metricsCollector.incrementCounter('fraud_alerts_total', { type: 'rider_incentive_fraud' });
      }
    } catch (error) {
      logger.error('Rider incentive fraud check failed', { error });
    }

    // Additional ride fraud checks would go here
    // - Fake ride detection
    // - Driver-rider collusion
    // - Rating manipulation
  }

  /**
   * Check for payment-related fraud
   */
  private async checkPaymentFraud(
    eventData: FraudEventData, 
    alerts: FraudAlert[], 
    reasoning: string[]
  ): Promise<void> {
    // Payment fraud detection logic
    // - Stolen credit card detection
    // - Chargeback patterns
    // - Unusual payment patterns
    
    // Placeholder for now - would implement actual payment fraud detection
    if (eventData.data?.amount > 10000) { // Large payments in PHP
      reasoning.push('Large payment amount flagged for review');
    }
  }

  /**
   * Check for account-related fraud (multi-accounting)
   */
  private async checkAccountFraud(
    eventData: FraudEventData, 
    alerts: FraudAlert[], 
    reasoning: string[]
  ): Promise<void> {
    try {
      const userData = await this.getUserData(eventData.userId);
      const allUserData = await this.getAllUsersData(); // In production, this would be more efficient
      
      const multiAccountAlert = await multiAccountDetector.analyzeAccount(
        eventData.userId,
        userData,
        allUserData
      );
      
      if (multiAccountAlert) {
        alerts.push(multiAccountAlert);
        reasoning.push('Multi-accounting patterns detected');
        metricsCollector.incrementCounter('fraud_alerts_total', { type: 'multi_accounting' });
      }
    } catch (error) {
      logger.error('Multi-account fraud check failed:', error);
    }
  }

  /**
   * Check for location-related fraud (GPS spoofing)
   */
  private async checkLocationFraud(
    eventData: FraudEventData, 
    alerts: FraudAlert[], 
    reasoning: string[]
  ): Promise<void> {
    if (!eventData.data?.gpsPoints || eventData.data.gpsPoints.length < 2) return;

    try {
      const gpsSpoofingAlert = await gpsSpoofingDetector.analyzeGPSData(
        eventData.data.rideId || `location_${Date.now()}`,
        eventData.data.gpsPoints,
        eventData.data.deviceInfo,
        eventData.userType === 'driver' ? eventData.userId : undefined,
        eventData.userType === 'rider' ? eventData.userId : undefined
      );
      
      if (gpsSpoofingAlert) {
        alerts.push(gpsSpoofingAlert);
        reasoning.push('GPS spoofing detected');
        metricsCollector.incrementCounter('fraud_alerts_total', { type: 'gps_spoofing' });
      }
    } catch (error) {
      logger.error('GPS spoofing check failed:', error);
    }
  }

  /**
   * Process generated fraud alerts
   */
  private async processAlerts(alerts: FraudAlert[]): Promise<void> {
    for (const alert of alerts) {
      // Add to processing queue
      if (this.alertQueue.length < this.config.maxQueueSize) {
        this.alertQueue.push(alert);
      }

      // Immediate escalation for critical alerts
      if (alert.severity === 'critical') {
        await this.escalateAlert(alert);
      }

      // Notify registered handlers
      this.notifyAlertHandlers(alert);

      // Update metrics
      metricsCollector.setGauge('active_fraud_alerts_total', this.alertQueue.length);
    }
  }

  /**
   * Escalate critical fraud alerts
   */
  private async escalateAlert(alert: FraudAlert): Promise<void> {
    try {
      logger.error(`CRITICAL FRAUD ALERT: ${alert.title}`, {
        alertId: alert.id,
        subjectId: alert.subjectId,
        fraudScore: alert.fraudScore,
        alertType: alert.alertType
      });

      // In production, this would:
      // - Send notifications to fraud team
      // - Create urgent tickets
      // - Auto-suspend accounts if configured
      // - Send alerts to monitoring systems
      
      metricsCollector.incrementCounter('critical_fraud_alerts_total');
    } catch (error) {
      logger.error('Alert escalation failed:', error);
    }
  }

  /**
   * Register alert handler for real-time notifications
   */
  public registerAlertHandler(handler: (alert: FraudAlert) => void): void {
    this.alertHandlers.push(handler);
  }

  /**
   * Notify all registered alert handlers
   */
  private notifyAlertHandlers(alert: FraudAlert): void {
    this.alertHandlers.forEach(handler => {
      try {
        handler(alert);
      } catch (error) {
        logger.error('Alert handler failed:', error);
      }
    });
  }

  /**
   * Initialize fraud monitoring rules
   */
  private initializeMonitors(): void {
    const defaultMonitor: FraudMonitor = {
      id: 'default_monitor',
      name: 'Default Fraud Monitor',
      description: 'Monitors all fraud types with standard thresholds',
      entityTypes: ['rider', 'driver', 'ride', 'transaction'],
      regions: ['Metro Manila', 'Cebu', 'Davao'], // Philippines regions
      alertThreshold: 60,
      criticalThreshold: 85,
      realTimeBlocking: false,
      autoEscalation: true,
      notificationChannels: ['email', 'slack'],
      active: true,
      alertsGenerated: 0,
      accuracy: 0.85
    };

    this.activeMonitors.set(defaultMonitor.id, defaultMonitor);
  }

  /**
   * Start batch processing of queued alerts
   */
  private startBatchProcessor(): void {
    setInterval(async () => {
      if (this.alertQueue.length === 0) return;

      const batchSize = Math.min(50, this.alertQueue.length);
      const batch = this.alertQueue.splice(0, batchSize);

      try {
        await this.processBatchAlerts(batch);
      } catch (error) {
        logger.error('Batch alert processing failed:', error);
        // Re-queue failed alerts
        this.alertQueue.unshift(...batch);
      }
    }, this.config.batchProcessingInterval);
  }

  /**
   * Process batch of alerts
   */
  private async processBatchAlerts(alerts: FraudAlert[]): Promise<void> {
    for (const alert of alerts) {
      try {
        // In production, this would:
        // - Store alerts in database
        // - Update fraud scores
        // - Generate reports
        // - Update user risk profiles
        
        logger.debug(`Processing fraud alert: ${alert.id} (${alert.alertType})`);
      } catch (error) {
        logger.error(`Failed to process alert ${alert.id}:`, error);
      }
    }

    metricsCollector.setGauge('active_fraud_alerts_total', this.alertQueue.length);
  }

  /**
   * Get rider data (mock implementation)
   */
  private async getRiderData(riderId: string): Promise<any> {
    // In production, this would fetch from database
    return {
      id: riderId,
      createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
      rides: [],
      promoUsage: [],
      referrals: [],
      totalRides: 0
    };
  }

  /**
   * Get user data (mock implementation)
   */
  private async getUserData(userId: string): Promise<any> {
    // In production, this would fetch from database
    return {
      id: userId,
      createdAt: new Date(),
      deviceId: `device_${userId}`,
      ipAddresses: ['192.168.1.1'],
      type: 'rider'
    };
  }

  /**
   * Get all users data (mock implementation)
   */
  private async getAllUsersData(): Promise<any[]> {
    // In production, this would be more efficient and filtered
    return [];
  }

  /**
   * Create empty result for disabled or error states
   */
  private createEmptyResult(): FraudCheckResult {
    return {
      riskScore: 0,
      alerts: [],
      blockedActions: [],
      flaggedForReview: false,
      reasoning: []
    };
  }

  /**
   * Public API methods
   */
  public setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }

  public getQueueSize(): number {
    return this.alertQueue.length;
  }

  public getActiveMonitors(): FraudMonitor[] {
    return Array.from(this.activeMonitors.values());
  }

  public enableRealTimeBlocking(enabled: boolean): void {
    this.config.realTimeBlocking = enabled;
    logger.debug(`Real-time blocking ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Get fraud statistics
   */
  public getStatistics() {
    return {
      enabled: this.isEnabled,
      queueSize: this.alertQueue.length,
      activeMonitors: this.activeMonitors.size,
      realTimeBlocking: this.config.realTimeBlocking,
      alertHandlers: this.alertHandlers.length
    };
  }
}

// Export singleton instance
export const realTimeFraudEngine = RealTimeFraudEngine.getInstance();
export default RealTimeFraudEngine;