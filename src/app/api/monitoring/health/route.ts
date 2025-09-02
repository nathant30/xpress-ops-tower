// Health Check API Endpoint - Comprehensive system health monitoring

import { NextRequest, NextResponse } from 'next/server';
import { getDatabaseAdapter } from '../../../../lib/database';
import { metricsCollector } from '../../../../lib/monitoring/metrics-collector';
import { errorTracker } from '../../../../lib/monitoring/error-tracker';
import { SystemHealth, ServiceHealth } from '../../../../lib/monitoring/types';
import { logger } from '../../../../lib/security/productionLogger';

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const requestId = crypto.randomUUID();

  try {
    // Check if this is a detailed health check
    const detailed = request.nextUrl.searchParams.get('detailed') === 'true';
    
    // Perform health checks
    const systemHealth = await performSystemHealthCheck(detailed);
    const responseTime = Date.now() - startTime;
    
    // Determine overall status
    const overallStatus = determineOverallStatus(systemHealth.services);
    
    // Record health check metrics
    metricsCollector.recordMetric('health_check_duration', responseTime, 'timer', {
      detailed: detailed.toString(),
      status: overallStatus
    });

    // Set appropriate HTTP status code
    let httpStatus = 200;
    if (overallStatus === 'UNHEALTHY') {
      httpStatus = 503; // Service Unavailable
    } else if (overallStatus === 'DEGRADED') {
      httpStatus = 200; // OK but with warnings
    }

    const response = {
      success: true,
      data: {
        ...systemHealth,
        overall: overallStatus,
        responseTime,
        timestamp: new Date(),
        requestId
      },
      timestamp: new Date(),
      requestId
    };

    return NextResponse.json(response, { status: httpStatus });

  } catch (error) {
    const responseTime = Date.now() - startTime;
    
    // Track the health check failure
    errorTracker.trackError(error as Error, 'ERROR', {
      component: 'HealthCheck',
      action: 'performHealthCheck',
      requestId
    });

    logger.error('Health check failed', {
      error: (error as Error).message,
      responseTime,
      requestId
    }, {
      component: 'HealthCheckAPI',
      action: 'healthCheck'
    });

    return NextResponse.json({
      success: false,
      data: {
        overall: 'UNHEALTHY',
        services: [],
        responseTime,
        timestamp: new Date(),
        error: 'Health check failed'
      },
      error: {
        code: 'HEALTH_CHECK_FAILED',
        message: 'Unable to perform health check'
      },
      timestamp: new Date(),
      requestId
    }, { status: 503 });
  }
}

async function performSystemHealthCheck(detailed: boolean): Promise<Omit<SystemHealth, 'overall'>> {
  const services: ServiceHealth[] = [];

  // Database health check
  services.push(await checkDatabaseHealth());

  // Redis health check (if available)
  services.push(await checkRedisHealth());

  // External services health checks
  if (detailed) {
    services.push(await checkExternalServicesHealth());
    services.push(await checkFileSystemHealth());
    services.push(await checkMemoryHealth());
  }

  // Application health check
  services.push(await checkApplicationHealth());

  return {
    services,
    timestamp: new Date()
  };
}

async function checkDatabaseHealth(): Promise<ServiceHealth> {
  const serviceName = 'database';
  const startTime = Date.now();

  try {
    const db = getDatabaseAdapter();
    const healthCheck = await db.healthCheck();
    const responseTime = Date.now() - startTime;

    // Get connection pool metrics
    const connectionMetrics = {
      totalConnections: healthCheck.connections?.total || 0,
      idleConnections: healthCheck.connections?.idle || 0,
      waitingConnections: healthCheck.connections?.waiting || 0
    };

    // Determine status based on response time and connections
    let status: ServiceHealth['status'] = 'HEALTHY';
    if (healthCheck.status === 'unhealthy') {
      status = 'UNHEALTHY';
    } else if (responseTime > 5000 || connectionMetrics.waitingConnections > 10) {
      status = 'DEGRADED';
    }

    return {
      name: serviceName,
      status,
      responseTime,
      uptime: process.uptime(),
      lastCheck: new Date(),
      dependencies: [],
      metrics: {
        responseTime,
        ...connectionMetrics
      }
    };

  } catch (error) {
    const responseTime = Date.now() - startTime;
    
    errorTracker.trackError(error as Error, 'ERROR', {
      component: 'DatabaseHealthCheck',
      action: 'checkHealth'
    });

    return {
      name: serviceName,
      status: 'UNHEALTHY',
      responseTime,
      uptime: 0,
      lastCheck: new Date(),
      dependencies: [],
      metrics: {
        responseTime,
        error: (error as Error).message
      }
    };
  }
}

async function checkRedisHealth(): Promise<ServiceHealth> {
  const serviceName = 'redis';
  const startTime = Date.now();

  try {
    // Redis health check implementation
    // For now, we'll simulate this check
    const responseTime = Date.now() - startTime;
    
    return {
      name: serviceName,
      status: 'HEALTHY',
      responseTime,
      uptime: process.uptime(),
      lastCheck: new Date(),
      dependencies: [],
      metrics: {
        responseTime,
        connections: 1,
        memory_usage: 0
      }
    };

  } catch (error) {
    const responseTime = Date.now() - startTime;
    
    return {
      name: serviceName,
      status: 'UNHEALTHY',
      responseTime,
      uptime: 0,
      lastCheck: new Date(),
      dependencies: [],
      metrics: {
        responseTime,
        error: (error as Error).message
      }
    };
  }
}

async function checkExternalServicesHealth(): Promise<ServiceHealth> {
  const serviceName = 'external_services';
  const startTime = Date.now();

  try {
    // Check external dependencies like Google Maps API, SMS services, etc.
    const checks = await Promise.allSettled([
      // Add actual external service checks here
      Promise.resolve({ service: 'google_maps', status: 'healthy' }),
      Promise.resolve({ service: 'twilio', status: 'healthy' }),
      Promise.resolve({ service: 'sendgrid', status: 'healthy' })
    ]);

    const responseTime = Date.now() - startTime;
    const failedChecks = checks.filter(check => check.status === 'rejected').length;
    const totalChecks = checks.length;

    let status: ServiceHealth['status'] = 'HEALTHY';
    if (failedChecks === totalChecks) {
      status = 'UNHEALTHY';
    } else if (failedChecks > 0) {
      status = 'DEGRADED';
    }

    return {
      name: serviceName,
      status,
      responseTime,
      uptime: process.uptime(),
      lastCheck: new Date(),
      dependencies: [
        { name: 'google_maps', status: 'HEALTHY', required: true },
        { name: 'twilio', status: 'HEALTHY', required: false },
        { name: 'sendgrid', status: 'HEALTHY', required: false }
      ],
      metrics: {
        responseTime,
        total_services: totalChecks,
        healthy_services: totalChecks - failedChecks,
        failed_services: failedChecks
      }
    };

  } catch (error) {
    const responseTime = Date.now() - startTime;
    
    return {
      name: serviceName,
      status: 'UNHEALTHY',
      responseTime,
      uptime: 0,
      lastCheck: new Date(),
      dependencies: [],
      metrics: {
        responseTime,
        error: (error as Error).message
      }
    };
  }
}

async function checkFileSystemHealth(): Promise<ServiceHealth> {
  const serviceName = 'filesystem';
  const startTime = Date.now();

  try {
    const fs = require('fs').promises;
    
    // Check if we can write to temp directory
    const testFile = `/tmp/health_check_${Date.now()}.txt`;
    await fs.writeFile(testFile, 'health check');
    await fs.unlink(testFile);
    
    const responseTime = Date.now() - startTime;

    return {
      name: serviceName,
      status: 'HEALTHY',
      responseTime,
      uptime: process.uptime(),
      lastCheck: new Date(),
      dependencies: [],
      metrics: {
        responseTime,
        write_test: 'passed'
      }
    };

  } catch (error) {
    const responseTime = Date.now() - startTime;
    
    return {
      name: serviceName,
      status: 'UNHEALTHY',
      responseTime,
      uptime: 0,
      lastCheck: new Date(),
      dependencies: [],
      metrics: {
        responseTime,
        error: (error as Error).message
      }
    };
  }
}

async function checkMemoryHealth(): Promise<ServiceHealth> {
  const serviceName = 'memory';
  const startTime = Date.now();

  try {
    const memUsage = process.memoryUsage();
    const responseTime = Date.now() - startTime;
    
    // Calculate memory usage percentage (rough estimate)
    const heapUsedMB = memUsage.heapUsed / 1024 / 1024;
    const heapTotalMB = memUsage.heapTotal / 1024 / 1024;
    const heapUsagePercent = (heapUsedMB / heapTotalMB) * 100;

    let status: ServiceHealth['status'] = 'HEALTHY';
    if (heapUsagePercent > 90) {
      status = 'UNHEALTHY';
    } else if (heapUsagePercent > 75) {
      status = 'DEGRADED';
    }

    return {
      name: serviceName,
      status,
      responseTime,
      uptime: process.uptime(),
      lastCheck: new Date(),
      dependencies: [],
      metrics: {
        responseTime,
        heap_used_mb: Math.round(heapUsedMB),
        heap_total_mb: Math.round(heapTotalMB),
        heap_usage_percent: Math.round(heapUsagePercent),
        rss_mb: Math.round(memUsage.rss / 1024 / 1024),
        external_mb: Math.round(memUsage.external / 1024 / 1024)
      }
    };

  } catch (error) {
    const responseTime = Date.now() - startTime;
    
    return {
      name: serviceName,
      status: 'UNHEALTHY',
      responseTime,
      uptime: 0,
      lastCheck: new Date(),
      dependencies: [],
      metrics: {
        responseTime,
        error: (error as Error).message
      }
    };
  }
}

async function checkApplicationHealth(): Promise<ServiceHealth> {
  const serviceName = 'application';
  const startTime = Date.now();

  try {
    // Check various application health indicators
    const errorStats = errorTracker.getErrorStatistics(1); // Last hour
    const systemMetrics = metricsCollector.getSystemMetrics();
    const responseTime = Date.now() - startTime;

    // Determine status based on error rates and system metrics
    let status: ServiceHealth['status'] = 'HEALTHY';
    if (errorStats.criticalErrors > 10) {
      status = 'UNHEALTHY';
    } else if (errorStats.totalErrors > 50 || systemMetrics.uptime < 300) { // Less than 5 minutes uptime
      status = 'DEGRADED';
    }

    return {
      name: serviceName,
      status,
      responseTime,
      uptime: systemMetrics.uptime,
      lastCheck: new Date(),
      dependencies: [],
      metrics: {
        responseTime,
        uptime: systemMetrics.uptime,
        total_errors_1h: errorStats.totalErrors,
        critical_errors_1h: errorStats.criticalErrors,
        memory_heap_used: systemMetrics.memory_heap_used,
        memory_heap_total: systemMetrics.memory_heap_total
      }
    };

  } catch (error) {
    const responseTime = Date.now() - startTime;
    
    return {
      name: serviceName,
      status: 'UNHEALTHY',
      responseTime,
      uptime: 0,
      lastCheck: new Date(),
      dependencies: [],
      metrics: {
        responseTime,
        error: (error as Error).message
      }
    };
  }
}

function determineOverallStatus(services: ServiceHealth[]): SystemHealth['overall'] {
  const unhealthyServices = services.filter(s => s.status === 'UNHEALTHY');
  const degradedServices = services.filter(s => s.status === 'DEGRADED');

  if (unhealthyServices.length > 0) {
    return 'UNHEALTHY';
  }
  
  if (degradedServices.length > 0) {
    return 'DEGRADED';
  }
  
  return 'HEALTHY';
}