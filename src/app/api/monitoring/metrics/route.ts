// Metrics API Endpoint - Access to system metrics and performance data

import { NextRequest, NextResponse } from 'next/server';
import { metricsCollector } from '../../../../lib/monitoring/metrics-collector';
import { databaseMonitor } from '../../../../lib/monitoring/database-monitor';
import { errorTracker } from '../../../../lib/monitoring/error-tracker';
import { logger } from '../../../../lib/security/productionLogger';

export async function GET(request: NextRequest) {
  const requestId = crypto.randomUUID();
  const startTime = Date.now();

  try {
    const url = new URL(request.url);
    const metricName = url.searchParams.get('metric');
    const timeRange = url.searchParams.get('timeRange') || '1h';
    const aggregation = url.searchParams.get('aggregation') || 'AVG';
    const groupBy = url.searchParams.get('groupBy');
    const format = url.searchParams.get('format') || 'json';

    // Parse time range
    const timeRangeMs = parseTimeRange(timeRange);
    const since = new Date(Date.now() - timeRangeMs);

    let responseData;

    if (metricName) {
      // Get specific metric
      if (aggregation && ['SUM', 'AVG', 'COUNT', 'MIN', 'MAX'].includes(aggregation)) {
        responseData = metricsCollector.getAggregatedMetrics(
          metricName,
          aggregation as any,
          timeRangeMs / (60 * 1000), // Convert to minutes
          groupBy || undefined
        );
      } else {
        responseData = metricsCollector.getMetrics(metricName, since);
      }
    } else {
      // Get metrics overview
      responseData = await getMetricsOverview(timeRangeMs);
    }

    // Handle different output formats
    if (format === 'prometheus') {
      const prometheusData = metricsCollector.exportPrometheus();
      return new NextResponse(prometheusData, {
        headers: {
          'Content-Type': 'text/plain',
          'X-Request-ID': requestId
        }
      });
    }

    const responseTime = Date.now() - startTime;

    // Record API usage metrics
    metricsCollector.recordMetric('api_metrics_requests', 1, 'count', {
      metric_name: metricName || 'overview',
      time_range: timeRange,
      format
    });

    return NextResponse.json({
      success: true,
      data: responseData,
      metadata: {
        metricName,
        timeRange,
        aggregation,
        groupBy,
        recordCount: Array.isArray(responseData) ? responseData.length : 1,
        responseTime
      },
      timestamp: new Date(),
      requestId
    });

  } catch (error) {
    const responseTime = Date.now() - startTime;

    errorTracker.trackError(error as Error, 'ERROR', {
      component: 'MetricsAPI',
      action: 'getMetrics',
      requestId
    });

    logger.error('Metrics API error', {
      error: (error as Error).message,
      responseTime,
      requestId
    }, {
      component: 'MetricsAPI',
      action: 'getMetrics'
    });

    return NextResponse.json({
      success: false,
      error: {
        code: 'METRICS_ERROR',
        message: 'Failed to retrieve metrics',
        details: process.env.NODE_ENV === 'development' ? error : undefined
      },
      timestamp: new Date(),
      requestId
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();
  const startTime = Date.now();

  try {
    const body = await request.json();
    const { name, value, unit, tags = {} } = body;

    // Validate required fields
    if (!name || value === undefined || !unit) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Missing required fields: name, value, unit'
        },
        timestamp: new Date(),
        requestId
      }, { status: 400 });
    }

    // Validate unit
    const validUnits = ['count', 'gauge', 'histogram', 'timer', 'percentage'];
    if (!validUnits.includes(unit)) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: `Invalid unit. Must be one of: ${validUnits.join(', ')}`
        },
        timestamp: new Date(),
        requestId
      }, { status: 400 });
    }

    // Record the custom metric
    metricsCollector.recordMetric(name, value, unit, tags);

    const responseTime = Date.now() - startTime;

    // Record API usage
    metricsCollector.recordMetric('api_metrics_posts', 1, 'count', {
      metric_name: name,
      unit
    });

    return NextResponse.json({
      success: true,
      data: {
        recorded: true,
        metricName: name,
        value,
        unit,
        tags,
        timestamp: new Date()
      },
      responseTime,
      timestamp: new Date(),
      requestId
    });

  } catch (error) {
    const responseTime = Date.now() - startTime;

    errorTracker.trackError(error as Error, 'ERROR', {
      component: 'MetricsAPI',
      action: 'postMetric',
      requestId
    });

    return NextResponse.json({
      success: false,
      error: {
        code: 'METRICS_POST_ERROR',
        message: 'Failed to record metric'
      },
      timestamp: new Date(),
      requestId
    }, { status: 500 });
  }
}

function parseTimeRange(timeRange: string): number {
  const unit = timeRange.slice(-1);
  const value = parseInt(timeRange.slice(0, -1));

  switch (unit) {
    case 'm':
      return value * 60 * 1000; // minutes to milliseconds
    case 'h':
      return value * 60 * 60 * 1000; // hours to milliseconds
    case 'd':
      return value * 24 * 60 * 60 * 1000; // days to milliseconds
    default:
      return 60 * 60 * 1000; // default to 1 hour
  }
}

async function getMetricsOverview(timeRangeMs: number): Promise<any> {
  const timeRangeMinutes = timeRangeMs / (60 * 1000);
  const since = new Date(Date.now() - timeRangeMs);

  // Get system metrics
  const systemMetrics = metricsCollector.getSystemMetrics();

  // Get performance metrics
  const performanceMetrics = {
    totalRequests: metricsCollector.getAggregatedMetrics('http_requests_total', 'SUM', timeRangeMinutes),
    avgResponseTime: metricsCollector.getAggregatedMetrics('http_request_duration', 'AVG', timeRangeMinutes),
    errorRate: metricsCollector.getAggregatedMetrics('http_errors_total', 'SUM', timeRangeMinutes),
    requestsByEndpoint: metricsCollector.getAggregatedMetrics('http_requests_total', 'SUM', timeRangeMinutes, 'endpoint')
  };

  // Get database metrics
  const databaseMetrics = {
    totalQueries: metricsCollector.getAggregatedMetrics('database_queries_total', 'SUM', timeRangeMinutes),
    avgQueryTime: metricsCollector.getAggregatedMetrics('database_query_duration', 'AVG', timeRangeMinutes),
    slowQueries: databaseMonitor.getSlowQueriesReport(timeRangeMinutes),
    connectionMetrics: {
      total: systemMetrics.memory_heap_total, // placeholder
      idle: 0,
      waiting: 0
    }
  };

  // Get error statistics
  const errorStats = errorTracker.getErrorStatistics(timeRangeMs / (60 * 60 * 1000));

  // Get business metrics
  const businessMetrics = {
    activeDrivers: metricsCollector.getAggregatedMetrics('business_driver_active', 'AVG', timeRangeMinutes),
    bookingsCreated: metricsCollector.getAggregatedMetrics('business_booking_created', 'SUM', timeRangeMinutes),
    fraudDetected: metricsCollector.getAggregatedMetrics('business_fraud_detected', 'SUM', timeRangeMinutes)
  };

  // Get security metrics
  const securityMetrics = {
    authFailures: metricsCollector.getAggregatedMetrics('security_auth_failures', 'SUM', timeRangeMinutes),
    suspiciousRequests: metricsCollector.getAggregatedMetrics('security_suspicious_requests', 'SUM', timeRangeMinutes),
    attackAttempts: metricsCollector.getAggregatedMetrics('security_attack_attempts', 'SUM', timeRangeMinutes)
  };

  return {
    system: systemMetrics,
    performance: performanceMetrics,
    database: databaseMetrics,
    errors: errorStats,
    business: businessMetrics,
    security: securityMetrics,
    summary: {
      healthStatus: getOverallHealthStatus(systemMetrics, errorStats),
      totalMetrics: metricsCollector.getMetricNames().length,
      dataPoints: calculateTotalDataPoints(timeRangeMs),
      timeRange: `${timeRangeMs / (60 * 1000)} minutes`
    }
  };
}

function getOverallHealthStatus(systemMetrics: any, errorStats: any): 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY' {
  // Simple health determination logic
  if (errorStats.criticalErrors > 10) {
    return 'UNHEALTHY';
  }
  
  if (errorStats.totalErrors > 50 || systemMetrics.uptime < 300) {
    return 'DEGRADED';
  }
  
  return 'HEALTHY';
}

function calculateTotalDataPoints(timeRangeMs: number): number {
  // Estimate total data points across all metrics
  const metricNames = metricsCollector.getMetricNames();
  const avgDataPointsPerMetric = Math.floor(timeRangeMs / (30 * 1000)); // Assuming 30-second intervals
  return metricNames.length * avgDataPointsPerMetric;
}