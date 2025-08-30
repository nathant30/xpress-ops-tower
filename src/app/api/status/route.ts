// System Status API Route
// Provides comprehensive system health and status information

import { NextRequest, NextResponse } from 'next/server';
import { getWebSocketManager } from '@/lib/websocket';
import { connectionHealthMonitor } from '@/lib/connectionHealthMonitor';
import { locationScheduler } from '@/lib/locationScheduler';
import { metricsCollector } from '@/lib/metricsCollector';
import { logger } from '@/lib/security/productionLogger';

export async function GET(request: NextRequest) {
  try {
    // Get WebSocket manager stats
    const wsManager = getWebSocketManager();
    const wsStats = wsManager ? wsManager.getStats() : null;

    // Get health monitoring data
    let healthReport;
    try {
      healthReport = await connectionHealthMonitor.getCurrentHealth();
    } catch (error) {
      logger.warn(`Health monitor not available: ${error instanceof Error ? error.message : error}`);
      healthReport = null;
    }

    // Get location scheduler status
    const locationStatus = locationScheduler.getStatus();
    const locationHealthy = locationScheduler.isHealthy();

    // Get metrics collector status
    const metricsStatus = metricsCollector.getStatus();
    const metricsHealthy = metricsCollector.isHealthy();

    // Calculate overall system status
    const services = [
      {
        name: 'websocket',
        status: wsManager ? 'healthy' : 'down',
        healthy: !!wsManager,
        details: wsStats
      },
      {
        name: 'location_scheduler',
        status: locationHealthy ? 'healthy' : (locationStatus.isRunning ? 'degraded' : 'down'),
        healthy: locationHealthy,
        details: locationStatus
      },
      {
        name: 'metrics_collector',
        status: metricsHealthy ? 'healthy' : (metricsStatus.isRunning ? 'degraded' : 'down'),
        healthy: metricsHealthy,
        details: metricsStatus
      },
      {
        name: 'health_monitor',
        status: healthReport ? 'healthy' : 'down',
        healthy: !!healthReport,
        details: connectionHealthMonitor.getMonitoringStatus()
      }
    ];

    const healthyServices = services.filter(s => s.healthy).length;
    const totalServices = services.length;
    const healthPercentage = (healthyServices / totalServices) * 100;

    const overallStatus = healthPercentage >= 90 ? 'healthy' : 
                         healthPercentage >= 70 ? 'degraded' : 'down';

    // Prepare response
    const statusResponse = {
      success: true,
      timestamp: new Date().toISOString(),
      system: {
        status: overallStatus,
        healthScore: Math.round(healthPercentage),
        uptime: process.uptime(),
        version: process.env.npm_package_version || '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        nodeVersion: process.version
      },
      services: {
        websocket: {
          status: wsManager ? 'operational' : 'down',
          connections: wsStats?.totalConnections || 0,
          regionalConnections: wsStats?.regionalConnections || {},
          driverConnections: wsStats?.driverConnections || 0,
          operatorConnections: wsStats?.operatorConnections || 0
        },
        locationScheduler: {
          status: locationHealthy ? 'operational' : (locationStatus.isRunning ? 'degraded' : 'down'),
          isRunning: locationStatus.isRunning,
          totalBroadcasts: locationStatus.metrics?.totalBroadcasts || 0,
          totalDriversUpdated: locationStatus.metrics?.totalDriversUpdated || 0,
          lastBroadcast: locationStatus.metrics?.lastBroadcastTime || null,
          broadcastInterval: locationStatus.broadcastInterval
        },
        metricsCollector: {
          status: metricsHealthy ? 'operational' : (metricsStatus.isRunning ? 'degraded' : 'down'),
          isRunning: metricsStatus.isRunning,
          totalSystemCollections: metricsStatus.totalSystemCollections || 0,
          totalKPICollections: metricsStatus.totalKPICollections || 0,
          lastSystemUpdate: metricsStatus.lastSystemUpdate || null,
          lastKPIUpdate: metricsStatus.lastKPIUpdate || null
        },
        healthMonitor: {
          status: healthReport ? 'operational' : 'down',
          isRunning: connectionHealthMonitor.getMonitoringStatus().isRunning,
          totalChecks: connectionHealthMonitor.getMonitoringStatus().totalChecks || 0,
          uptime: connectionHealthMonitor.getMonitoringStatus().uptime || 0,
          overallHealth: healthReport?.overallStatus || 'unknown',
          criticalIssues: healthReport?.criticalIssues || [],
          warnings: healthReport?.warnings || []
        }
      },
      performance: {
        memoryUsage: process.memoryUsage(),
        cpuUsage: process.cpuUsage(),
        eventLoopDelay: process.hrtime.bigint ? Number(process.hrtime.bigint()) : 0
      },
      metrics: healthReport ? {
        overallScore: healthReport.overallScore,
        totalRequests: healthReport.totalRequests,
        errorRate: healthReport.errorRate,
        serviceBreakdown: healthReport.services.map(service => ({
          name: service.name,
          status: service.status,
          responseTime: service.responseTime,
          uptime: service.uptime,
          errorCount: service.errorCount
        }))
      } : null
    };

    // Determine HTTP status code based on system health
    const httpStatus = overallStatus === 'healthy' ? 200 : 
                      overallStatus === 'degraded' ? 200 : 503;

    return NextResponse.json(statusResponse, { 
      status: httpStatus,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });

  } catch (error) {
    logger.error(`Status endpoint error: ${error instanceof Error ? error.message : error}`);

    return NextResponse.json({
      success: false,
      error: 'Failed to retrieve system status',
      timestamp: new Date().toISOString(),
      system: {
        status: 'down',
        healthScore: 0
      }
    }, { 
      status: 500,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });
  }
}

// Health check endpoint (simpler version for load balancers)
export async function HEAD(request: NextRequest) {
  try {
    const wsManager = getWebSocketManager();
    const locationHealthy = locationScheduler.isHealthy();
    const metricsHealthy = metricsCollector.isHealthy();
    
    // Basic health check - if core services are running
    const isHealthy = !!wsManager && locationHealthy && metricsHealthy;
    
    return new NextResponse(null, {
      status: isHealthy ? 200 : 503,
      headers: {
        'Cache-Control': 'no-cache'
      }
    });
    
  } catch (error) {
    return new NextResponse(null, { status: 503 });
  }
}

// Force health check (POST request)
export async function POST(request: NextRequest) {
  try {
    // Trigger manual health checks
    const [healthReport, metricsData] = await Promise.all([
      connectionHealthMonitor.triggerHealthCheck(),
      metricsCollector.forceCollection()
    ]);

    // Force location broadcast
    await locationScheduler.forceBroadcast();

    return NextResponse.json({
      success: true,
      message: 'Health checks triggered successfully',
      timestamp: new Date().toISOString(),
      results: {
        healthCheck: {
          overallStatus: healthReport.overallStatus,
          overallScore: healthReport.overallScore,
          services: healthReport.services.length
        },
        metricsCollection: 'completed',
        locationBroadcast: 'completed'
      }
    });

  } catch (error) {
    logger.error(`Force health check error: ${error instanceof Error ? error.message : error}`);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to trigger health checks',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}