// Monitoring Dashboard API - Comprehensive system monitoring data

import { NextRequest, NextResponse } from 'next/server';
import { metricsCollector } from '../../../../lib/monitoring/metrics-collector';
import { errorTracker } from '../../../../lib/monitoring/error-tracker';
import { securityMonitor } from '../../../../lib/monitoring/security-monitor';
import { businessMetricsTracker } from '../../../../lib/monitoring/business-metrics';
import { databaseMonitor } from '../../../../lib/monitoring/database-monitor';
import { getDatabaseAdapter } from '../../../../lib/database';
import { logger } from '../../../../lib/security/productionLogger';

export async function GET(request: NextRequest) {
  const requestId = crypto.randomUUID();
  const startTime = Date.now();

  try {
    const url = new URL(request.url);
    const timeRange = url.searchParams.get('timeRange') || '24h';
    const includeDetails = url.searchParams.get('details') === 'true';
    const category = url.searchParams.get('category'); // system, business, security, etc.

    const timeRangeHours = parseTimeRange(timeRange);

    let dashboardData;

    if (category) {
      // Get specific category data
      dashboardData = await getCategorySpecificData(category, timeRangeHours, includeDetails);
    } else {
      // Get comprehensive dashboard data
      dashboardData = await getComprehensiveDashboardData(timeRangeHours, includeDetails);
    }

    const responseTime = Date.now() - startTime;

    // Record API usage metrics
    metricsCollector.recordMetric('api_dashboard_requests', 1, 'count', {
      time_range: timeRange,
      category: category || 'all',
      include_details: includeDetails.toString()
    });

    return NextResponse.json({
      success: true,
      data: dashboardData,
      metadata: {
        timeRange,
        category,
        includeDetails,
        responseTime,
        generatedAt: new Date()
      },
      timestamp: new Date(),
      requestId
    });

  } catch (error) {
    const responseTime = Date.now() - startTime;

    errorTracker.trackError(error as Error, 'ERROR', {
      component: 'DashboardAPI',
      action: 'getDashboard',
      requestId
    });

    logger.error('Dashboard API error', {
      error: (error as Error).message,
      responseTime,
      requestId
    }, {
      component: 'DashboardAPI',
      action: 'getDashboard'
    });

    return NextResponse.json({
      success: false,
      error: {
        code: 'DASHBOARD_ERROR',
        message: 'Failed to retrieve dashboard data'
      },
      timestamp: new Date(),
      requestId
    }, { status: 500 });
  }
}

async function getComprehensiveDashboardData(hours: number, includeDetails: boolean) {
  const [
    systemHealth,
    performanceMetrics,
    businessSummary,
    securitySummary,
    errorSummary,
    databasePerformance
  ] = await Promise.allSettled([
    getSystemHealthData(),
    getPerformanceMetrics(hours),
    getBusinessMetrics(hours),
    getSecurityMetrics(hours),
    getErrorMetrics(hours),
    getDatabaseMetrics(hours)
  ]);

  const dashboard = {
    overview: {
      systemStatus: getSettledValue(systemHealth, 'UNKNOWN'),
      totalErrors: getSettledValue(errorSummary, { totalErrors: 0 }).totalErrors,
      securityThreats: getSettledValue(securitySummary, { activeThreats: 0 }).activeThreats,
      performanceScore: calculatePerformanceScore(getSettledValue(performanceMetrics, {})),
      timestamp: new Date()
    },
    system: {
      health: getSettledValue(systemHealth, null),
      performance: getSettledValue(performanceMetrics, null)
    },
    business: getSettledValue(businessSummary, null),
    security: getSettledValue(securitySummary, null),
    errors: getSettledValue(errorSummary, null),
    database: getSettledValue(databasePerformance, null)
  };

  if (includeDetails) {
    dashboard.details = await getDetailedMetrics(hours);
  }

  return dashboard;
}

async function getCategorySpecificData(category: string, hours: number, includeDetails: boolean) {
  switch (category.toLowerCase()) {
    case 'system':
      return {
        health: await getSystemHealthData(),
        performance: await getPerformanceMetrics(hours),
        database: await getDatabaseMetrics(hours)
      };

    case 'business':
      return {
        summary: await getBusinessMetrics(hours),
        kpis: businessMetricsTracker.getCurrentKPIs(),
        regional: businessMetricsTracker.getRegionalPerformance(hours),
        snapshot: businessMetricsTracker.getOperationalSnapshot()
      };

    case 'security':
      return {
        summary: await getSecurityMetrics(hours),
        threats: securityMonitor.getCurrentThreats(),
        events: securityMonitor.getSecurityStatistics(hours),
        details: includeDetails ? await getSecurityDetails(hours) : undefined
      };

    case 'errors':
      return {
        summary: await getErrorMetrics(hours),
        statistics: errorTracker.getErrorStatistics(hours),
        alerts: errorTracker.getActiveAlerts()
      };

    default:
      throw new Error(`Unknown category: ${category}`);
  }
}

async function getSystemHealthData() {
  try {
    const db = getDatabaseAdapter();
    const dbHealth = await db.healthCheck();
    const systemMetrics = metricsCollector.getSystemMetrics();

    // Determine overall system health
    let overallHealth = 'HEALTHY';
    if (dbHealth.status === 'unhealthy') {
      overallHealth = 'UNHEALTHY';
    } else if (systemMetrics.memory_heap_used / systemMetrics.memory_heap_total > 0.9) {
      overallHealth = 'DEGRADED';
    }

    return {
      overall: overallHealth,
      database: {
        status: dbHealth.status,
        responseTime: dbHealth.responseTime,
        connections: dbHealth.connections
      },
      system: {
        uptime: systemMetrics.uptime,
        memoryUsage: {
          used: systemMetrics.memory_heap_used,
          total: systemMetrics.memory_heap_total,
          percentage: (systemMetrics.memory_heap_used / systemMetrics.memory_heap_total) * 100
        },
        cpu: {
          user: systemMetrics.cpu_user,
          system: systemMetrics.cpu_system
        }
      },
      timestamp: new Date()
    };
  } catch (error) {
    return {
      overall: 'UNHEALTHY',
      error: (error as Error).message,
      timestamp: new Date()
    };
  }
}

async function getPerformanceMetrics(hours: number) {
  const timeRangeMinutes = hours * 60;
  const since = new Date(Date.now() - hours * 60 * 60 * 1000);

  const [
    totalRequests,
    avgResponseTime,
    errorRate,
    slowQueries
  ] = await Promise.all([
    metricsCollector.getAggregatedMetrics('http_requests_total', 'SUM', timeRangeMinutes),
    metricsCollector.getAggregatedMetrics('http_request_duration', 'AVG', timeRangeMinutes),
    metricsCollector.getAggregatedMetrics('http_errors_total', 'SUM', timeRangeMinutes),
    databaseMonitor.getSlowQueriesReport(timeRangeMinutes)
  ]);

  const requestsValue = totalRequests[0]?.value || 0;
  const errorsValue = errorRate[0]?.value || 0;

  return {
    requests: {
      total: requestsValue,
      rate: requestsValue / (hours * 3600), // per second
      errorRate: requestsValue > 0 ? (errorsValue / requestsValue) * 100 : 0
    },
    responseTime: {
      average: avgResponseTime[0]?.value || 0,
      p95: 0, // Would need percentile calculation
      p99: 0
    },
    database: {
      slowQueries: slowQueries.length,
      avgQueryTime: slowQueries.length > 0 ? 
        slowQueries.reduce((sum, q) => sum + q.avgDuration, 0) / slowQueries.length : 0
    },
    timestamp: new Date()
  };
}

async function getBusinessMetrics(hours: number) {
  const summary = businessMetricsTracker.getBusinessMetricsSummary(hours);
  const kpis = businessMetricsTracker.getCurrentKPIs();

  return {
    summary,
    kpis: kpis.slice(0, 6), // Top 6 KPIs
    trends: {
      revenue: calculateTrend(kpis.find(k => k.name.includes('Revenue'))),
      drivers: calculateTrend(kpis.find(k => k.name.includes('Drivers'))),
      bookings: calculateTrend(kpis.find(k => k.name.includes('Booking'))),
      satisfaction: calculateTrend(kpis.find(k => k.name.includes('Satisfaction')))
    },
    alerts: getBusinessAlerts(summary),
    timestamp: new Date()
  };
}

async function getSecurityMetrics(hours: number) {
  const stats = securityMonitor.getSecurityStatistics(hours);
  const threats = securityMonitor.getCurrentThreats();

  return {
    overview: {
      totalEvents: stats.totalEvents,
      activeThreats: threats.length,
      blockedRequests: stats.blockedRequests,
      riskLevel: determineRiskLevel(stats, threats)
    },
    eventsByType: stats.eventsByType,
    threatsBySeverity: stats.threatsBySeverity,
    topThreats: threats.slice(0, 5),
    ipStatistics: stats.ipStatistics.slice(0, 10),
    timestamp: new Date()
  };
}

async function getErrorMetrics(hours: number) {
  const stats = errorTracker.getErrorStatistics(hours);
  const alerts = errorTracker.getActiveAlerts();

  return {
    overview: {
      totalErrors: stats.totalErrors,
      criticalErrors: stats.criticalErrors,
      activeAlerts: alerts.length,
      errorRate: stats.totalErrors / (hours * 3600) // per second
    },
    errorsByType: stats.errorsByType.slice(0, 10),
    errorsByComponent: stats.errorsByComponent.slice(0, 10),
    trends: stats.trends,
    recentAlerts: alerts.slice(0, 5),
    timestamp: new Date()
  };
}

async function getDatabaseMetrics(hours: number) {
  const performance = databaseMonitor.getPerformanceSummary(hours * 60);
  const slowQueries = databaseMonitor.getSlowQueriesReport(hours * 60);
  const activeQueries = databaseMonitor.getActiveQueries();

  return {
    performance: {
      totalQueries: performance.totalQueries,
      avgDuration: performance.avgDuration,
      errorRate: performance.errorRate,
      slowQueries: performance.slowQueries
    },
    slowQueries: slowQueries.slice(0, 10),
    activeQueries: activeQueries.slice(0, 5),
    topTables: performance.topTables.slice(0, 10),
    timestamp: new Date()
  };
}

async function getDetailedMetrics(hours: number) {
  const timeRangeMinutes = hours * 60;
  
  return {
    systemTimeseries: await getTimeseriesData('system_metrics', hours),
    performanceTimeseries: await getTimeseriesData('performance_metrics', hours),
    businessTimeseries: await getTimeseriesData('business_metrics', hours),
    errorTimeseries: await getTimeseriesData('error_metrics', hours)
  };
}

async function getTimeseriesData(category: string, hours: number) {
  // This would generate timeseries data for charts
  // For now, return placeholder structure
  const dataPoints = [];
  const interval = Math.max(1, Math.floor(hours / 24)); // Sample every hour for 24h, or adjust for longer periods
  
  for (let i = hours; i >= 0; i -= interval) {
    const timestamp = new Date(Date.now() - i * 60 * 60 * 1000);
    dataPoints.push({
      timestamp,
      value: Math.random() * 100, // Placeholder - would be real metrics
      category
    });
  }
  
  return dataPoints;
}

async function getSecurityDetails(hours: number) {
  const events = errorTracker.getSecurityEvents(hours);
  const threats = securityMonitor.getCurrentThreats();
  
  return {
    recentEvents: events.slice(0, 50),
    threatTimeline: threats.map(threat => ({
      id: threat.id,
      type: threat.type,
      severity: threat.severity,
      firstDetected: threat.firstDetected,
      lastActivity: threat.lastActivity,
      resolved: threat.resolved
    })),
    attackPatterns: analyzeAttackPatterns(events)
  };
}

function parseTimeRange(timeRange: string): number {
  const unit = timeRange.slice(-1);
  const value = parseInt(timeRange.slice(0, -1));

  switch (unit) {
    case 'h':
      return value;
    case 'd':
      return value * 24;
    case 'w':
      return value * 24 * 7;
    default:
      return 24; // default to 24 hours
  }
}

function getSettledValue<T>(settledResult: PromiseSettledResult<T>, defaultValue: T): T {
  return settledResult.status === 'fulfilled' ? settledResult.value : defaultValue;
}

function calculatePerformanceScore(metrics: any): number {
  // Simple performance scoring algorithm
  if (!metrics || !metrics.requests) return 0;

  let score = 100;
  
  // Penalize high error rates
  if (metrics.requests.errorRate > 5) score -= 30;
  else if (metrics.requests.errorRate > 1) score -= 10;
  
  // Penalize slow response times
  if (metrics.responseTime?.average > 2000) score -= 20;
  else if (metrics.responseTime?.average > 1000) score -= 10;
  
  // Penalize slow database queries
  if (metrics.database?.slowQueries > 10) score -= 20;
  else if (metrics.database?.slowQueries > 5) score -= 10;
  
  return Math.max(0, score);
}

function calculateTrend(kpi: any): string {
  if (!kpi) return 'STABLE';
  return kpi.trend;
}

function getBusinessAlerts(summary: any): Array<{ type: string; message: string; severity: string }> {
  const alerts = [];
  
  if (summary.driverMetrics.totalActive < 50) {
    alerts.push({
      type: 'LOW_DRIVER_COUNT',
      message: 'Low number of active drivers detected',
      severity: 'WARNING'
    });
  }
  
  if (summary.bookingMetrics.cancellationRate > 15) {
    alerts.push({
      type: 'HIGH_CANCELLATION_RATE',
      message: 'High booking cancellation rate detected',
      severity: 'WARNING'
    });
  }
  
  if (summary.customerMetrics.averageRating < 4.0) {
    alerts.push({
      type: 'LOW_CUSTOMER_SATISFACTION',
      message: 'Customer satisfaction below target',
      severity: 'WARNING'
    });
  }
  
  return alerts;
}

function determineRiskLevel(stats: any, threats: any[]): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
  const criticalThreats = threats.filter(t => t.severity === 'CRITICAL');
  const highThreats = threats.filter(t => t.severity === 'HIGH');
  
  if (criticalThreats.length > 0) return 'CRITICAL';
  if (highThreats.length > 2) return 'HIGH';
  if (stats.totalEvents > 100) return 'MEDIUM';
  return 'LOW';
}

function analyzeAttackPatterns(events: any[]): any[] {
  // Simple attack pattern analysis
  const patterns = new Map();
  
  events.forEach(event => {
    const key = `${event.type}_${event.ipAddress}`;
    if (!patterns.has(key)) {
      patterns.set(key, {
        type: event.type,
        ipAddress: event.ipAddress,
        count: 0,
        firstSeen: event.timestamp,
        lastSeen: event.timestamp
      });
    }
    
    const pattern = patterns.get(key);
    pattern.count++;
    pattern.lastSeen = event.timestamp;
  });
  
  return Array.from(patterns.values())
    .filter(pattern => pattern.count > 5)
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
}