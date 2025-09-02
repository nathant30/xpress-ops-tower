// Integration Examples - How to integrate the monitoring system with existing code

import { MonitoringSystem, metricsCollector, errorTracker, securityMonitor, businessMetricsTracker } from './index';

// Example 1: Enhanced API Route with Monitoring
// Use this pattern in your API routes
export function createMonitoredAPIRoute(handler: Function) {
  return async function monitoredHandler(request: any, response: any) {
    const startTime = Date.now();
    const requestId = crypto.randomUUID();
    const endpoint = request.url;
    const method = request.method;

    try {
      // Track incoming request
      metricsCollector.recordMetric('api_requests_total', 1, 'count', {
        endpoint,
        method,
        request_id: requestId
      });

      // Execute the actual handler
      const result = await handler(request, response);
      const duration = Date.now() - startTime;

      // Track successful request
      MonitoringSystem.trackPerformance(endpoint, duration, true, {
        method,
        requestId,
        statusCode: 200
      });

      return result;

    } catch (error) {
      const duration = Date.now() - startTime;

      // Track failed request
      MonitoringSystem.trackPerformance(endpoint, duration, false, {
        method,
        requestId,
        statusCode: 500,
        errorType: (error as Error).name
      });

      // Track the error
      const errorId = MonitoringSystem.trackError(error as Error, {
        component: 'APIRoute',
        action: endpoint,
        requestId,
        method
      });

      throw error;
    }
  };
}

// Example 2: Database Query Monitoring Integration
export function createMonitoredDatabaseQuery(db: any) {
  return {
    async query(text: string, params?: any[], context?: any) {
      const queryId = crypto.randomUUID();
      const startTime = Date.now();

      try {
        const result = await db.query(text, params);
        const duration = Date.now() - startTime;

        // Track successful query
        metricsCollector.recordDatabaseMetric({
          query: text,
          duration,
          success: true,
          affectedRows: result.rowCount || 0
        });

        return result;

      } catch (error) {
        const duration = Date.now() - startTime;

        // Track failed query
        metricsCollector.recordDatabaseMetric({
          query: text,
          duration,
          success: false,
          errorType: (error as Error).name
        });

        throw error;
      }
    },

    async transaction(callback: Function) {
      const transactionId = crypto.randomUUID();
      const startTime = Date.now();

      try {
        const result = await db.transaction(callback);
        const duration = Date.now() - startTime;

        metricsCollector.recordMetric('database_transactions', 1, 'count', {
          success: 'true',
          duration_bucket: duration < 1000 ? 'fast' : duration < 5000 ? 'medium' : 'slow'
        });

        return result;

      } catch (error) {
        const duration = Date.now() - startTime;

        metricsCollector.recordMetric('database_transactions', 1, 'count', {
          success: 'false',
          error_type: (error as Error).name
        });

        throw error;
      }
    }
  };
}

// Example 3: Business Logic Monitoring
export class BookingService {
  async createBooking(bookingData: any) {
    const bookingId = crypto.randomUUID();
    const startTime = Date.now();

    try {
      // Your existing booking creation logic here
      // const booking = await this.saveBooking(bookingData);

      // Track successful booking creation
      businessMetricsTracker.trackBookingMetric('CREATED', bookingId, 1, {
        region_id: bookingData.regionId,
        vehicle_type: bookingData.vehicleType,
        estimated_fare: bookingData.estimatedFare
      });

      // Track revenue metrics
      if (bookingData.estimatedFare) {
        businessMetricsTracker.trackRevenueMetric(
          bookingData.estimatedFare,
          'BOOKING_FARE',
          { booking_id: bookingId, region_id: bookingData.regionId }
        );
      }

      return { id: bookingId, ...bookingData };

    } catch (error) {
      // Track booking creation failure
      errorTracker.trackError(error as Error, 'ERROR', {
        component: 'BookingService',
        action: 'createBooking',
        bookingId,
        metadata: bookingData
      });

      throw error;
    }
  }

  async assignDriver(bookingId: string, driverId: string) {
    try {
      // Your driver assignment logic here
      
      // Track driver assignment
      businessMetricsTracker.trackDriverMetric('TRIP_STARTED', driverId, 1, {
        booking_id: bookingId
      });

      // Update booking metrics
      businessMetricsTracker.trackBookingMetric('ASSIGNED', bookingId, 1);

    } catch (error) {
      errorTracker.trackError(error as Error, 'ERROR', {
        component: 'BookingService',
        action: 'assignDriver',
        bookingId,
        driverId
      });

      throw error;
    }
  }

  async completeBooking(bookingId: string, completionData: any) {
    try {
      // Your booking completion logic here

      // Track business metrics
      businessMetricsTracker.trackBookingMetric('COMPLETED', bookingId, 1, {
        duration: completionData.duration,
        final_fare: completionData.finalFare,
        driver_id: completionData.driverId
      });

      // Track driver earnings
      businessMetricsTracker.trackDriverMetric('EARNINGS', completionData.driverId, completionData.driverEarnings);

      // Track customer satisfaction if provided
      if (completionData.rating) {
        businessMetricsTracker.trackCustomerSatisfaction(
          completionData.rating,
          bookingId,
          completionData.feedback
        );
      }

    } catch (error) {
      errorTracker.trackError(error as Error, 'ERROR', {
        component: 'BookingService',
        action: 'completeBooking',
        bookingId
      });

      throw error;
    }
  }
}

// Example 4: Authentication Monitoring
export class AuthService {
  async login(credentials: { email: string; password: string }, ipAddress: string, userAgent: string) {
    try {
      // Your existing login logic here
      // const user = await this.validateCredentials(credentials);

      // Track successful login
      metricsCollector.recordMetric('auth_logins_successful', 1, 'count', {
        user_email: credentials.email
      });

      return { success: true, user: { id: '123', email: credentials.email } };

    } catch (error) {
      // Track failed login
      securityMonitor.trackAuthFailure(ipAddress, credentials.email, {
        endpoint: '/api/auth/login',
        user_agent: userAgent,
        error_type: (error as Error).name
      });

      throw error;
    }
  }

  async validateRequest(request: any) {
    const ipAddress = request.headers['x-forwarded-for'] || request.connection.remoteAddress;
    const userAgent = request.headers['user-agent'];
    const endpoint = request.url;

    // Check if request should be blocked
    const blockCheck = securityMonitor.shouldBlockRequest({
      ipAddress,
      endpoint,
      method: request.method,
      userAgent,
      body: JSON.stringify(request.body),
      query: request.query ? new URLSearchParams(request.query).toString() : ''
    });

    if (blockCheck.blocked) {
      throw new Error(`Request blocked: ${blockCheck.reason}`);
    }

    return true;
  }
}

// Example 5: Fraud Detection Integration
export class FraudDetectionService {
  async checkTransaction(transactionData: any): Promise<{ isValid: boolean; riskScore: number; reasons: string[] }> {
    const startTime = Date.now();

    try {
      // Your fraud detection logic here
      const riskScore = Math.random() * 100; // Simulated risk score
      const isValid = riskScore < 70;
      const reasons: string[] = [];

      if (riskScore > 70) {
        reasons.push('High risk score detected');
      }

      // Track fraud detection result
      businessMetricsTracker.trackFraudMetric(!isValid, riskScore, 'PAYMENT_FRAUD', {
        transaction_id: transactionData.id,
        amount: transactionData.amount,
        region_id: transactionData.regionId
      });

      if (!isValid) {
        // Track security event for fraud
        securityMonitor.trackSuspiciousActivity(
          'SUSPICIOUS_ACTIVITY',
          riskScore > 90 ? 'HIGH' : 'MEDIUM',
          {
            ipAddress: transactionData.ipAddress || 'unknown',
            endpoint: '/api/payment/process',
            userAgent: transactionData.userAgent || 'unknown',
            userId: transactionData.userId,
            details: {
              transaction_id: transactionData.id,
              risk_score: riskScore,
              reasons
            }
          }
        );
      }

      return { isValid, riskScore, reasons };

    } catch (error) {
      errorTracker.trackError(error as Error, 'ERROR', {
        component: 'FraudDetectionService',
        action: 'checkTransaction',
        transactionId: transactionData.id
      });

      throw error;
    }
  }
}

// Example 6: System Health Monitoring
export class SystemHealthService {
  async performHealthCheck() {
    const healthData = MonitoringSystem.getSystemHealth();

    // Create alerts for unhealthy conditions
    if (healthData.errors.criticalErrors > 10) {
      errorTracker.registerAlert({
        name: 'High Critical Error Rate',
        description: `System has ${healthData.errors.criticalErrors} critical errors in the last hour`,
        type: 'SYSTEM',
        severity: 'HIGH',
        conditions: [
          {
            metric: 'critical_errors',
            operator: 'GT',
            threshold: 10,
            timeWindow: 60,
            aggregation: 'COUNT'
          }
        ],
        actions: [
          {
            type: 'EMAIL',
            target: 'ops@company.com',
            enabled: true
          },
          {
            type: 'SLACK',
            target: '#alerts',
            enabled: true
          }
        ]
      });
    }

    return healthData;
  }
}

// Example 7: Using monitoring in middleware
export function createAppWithMonitoring(app: any) {
  // Add monitoring middleware
  app.use((req: any, res: any, next: any) => {
    const startTime = Date.now();

    // Track request
    metricsCollector.recordMetric('http_requests_total', 1, 'count', {
      method: req.method,
      path: req.path
    });

    // Override res.end to capture response time
    const originalEnd = res.end;
    res.end = function(chunk: any, encoding: any) {
      const duration = Date.now() - startTime;
      
      metricsCollector.recordPerformanceMetric({
        endpoint: req.path,
        method: req.method,
        duration,
        success: res.statusCode < 400,
        statusCode: res.statusCode
      });

      originalEnd.call(this, chunk, encoding);
    };

    next();
  });

  return app;
}

// Example 8: Scheduled monitoring tasks
export class MonitoringScheduler {
  static startScheduledTasks() {
    // Generate system health reports every 5 minutes
    setInterval(async () => {
      try {
        const health = MonitoringSystem.getSystemHealth();
        
        // Record KPI metrics
        metricsCollector.recordMetric('system_health_score', this.calculateHealthScore(health), 'gauge', {
          timestamp: new Date().toISOString()
        });

      } catch (error) {
        errorTracker.trackError(error as Error, 'ERROR', {
          component: 'MonitoringScheduler',
          action: 'generateHealthReport'
        });
      }
    }, 5 * 60 * 1000);

    // Cleanup old metrics every hour
    setInterval(() => {
      metricsCollector.recordMetric('monitoring_cleanup_task', 1, 'count', {
        timestamp: new Date().toISOString()
      });
    }, 60 * 60 * 1000);
  }

  private static calculateHealthScore(health: any): number {
    let score = 100;

    // Deduct for errors
    if (health.errors.criticalErrors > 0) score -= 30;
    if (health.errors.totalErrors > 50) score -= 20;

    // Deduct for security threats
    if (health.security.activeThreats > 0) score -= 20;

    // Deduct for active alerts
    if (health.alerts.length > 5) score -= 10;

    return Math.max(0, score);
  }
}

// Start scheduled monitoring tasks
MonitoringScheduler.startScheduledTasks();