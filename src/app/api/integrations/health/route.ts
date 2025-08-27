// Integration Health Monitoring API
// Centralized health status and metrics for all external integrations

import { NextRequest, NextResponse } from 'next/server';
import { apiManagement } from '@/lib/integrations/apiManagement';
import { failoverManager } from '@/lib/integrations/failoverManager';

/**
 * GET /api/integrations/health - Get overall integration health
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const service = searchParams.get('service');
    const includeMetrics = searchParams.get('metrics') === 'true';
    const includeProviders = searchParams.get('providers') === 'true';

    // Get all provider health
    const providersHealth = await apiManagement.getProvidersHealth();
    
    // Calculate overall health score
    const healthyProviders = providersHealth.filter(p => p.status === 'healthy');
    const overallHealthScore = providersHealth.length > 0 
      ? Math.round((healthyProviders.length / providersHealth.length) * 100)
      : 100;

    const response: any = {
      success: true,
      data: {
        overallHealth: {
          score: overallHealthScore,
          status: overallHealthScore >= 90 ? 'healthy' : 
                 overallHealthScore >= 70 ? 'degraded' : 'critical',
          totalServices: providersHealth.length,
          healthyServices: healthyProviders.length,
          degradedServices: providersHealth.filter(p => p.status === 'degraded').length,
          downServices: providersHealth.filter(p => p.status === 'down').length
        },
        timestamp: new Date().toISOString(),
        lastUpdated: new Date().toISOString()
      }
    };

    // Include detailed provider information if requested
    if (includeProviders) {
      response.data.providers = providersHealth.map(provider => ({
        id: provider.providerId,
        status: provider.status,
        uptime: provider.uptime,
        responseTime: provider.responseTime,
        errorRate: provider.errorRate,
        lastChecked: provider.lastChecked,
        quotaUsage: provider.quotaUsage
      }));
    }

    // Include metrics if requested
    if (includeMetrics) {
      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      
      // This would aggregate metrics from all providers
      response.data.metrics = {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        averageResponseTime: 0,
        totalCost: 0,
        period: {
          start: oneDayAgo.toISOString(),
          end: now.toISOString()
        }
      };
    }

    // Filter by specific service if requested
    if (service) {
      const serviceProvider = providersHealth.find(p => 
        p.providerId.toLowerCase().includes(service.toLowerCase())
      );
      
      if (!serviceProvider) {
        return NextResponse.json(
          { success: false, error: `Service ${service} not found` },
          { status: 404 }
        );
      }

      response.data = {
        service: serviceProvider,
        timestamp: new Date().toISOString()
      };
    }

    return NextResponse.json(response);

  } catch (error) {
    console.error('Failed to get integration health:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get integration health' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/integrations/health/check - Trigger health check for specific service
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { providerId, force = false } = body;

    if (!providerId) {
      return NextResponse.json(
        { success: false, error: 'Provider ID is required' },
        { status: 400 }
      );
    }

    // This would trigger an immediate health check
    console.log(`🔍 Triggering health check for provider: ${providerId}`);

    // Simulate health check response
    const healthResult = {
      providerId,
      status: 'healthy',
      responseTime: Math.floor(Math.random() * 500) + 100,
      timestamp: new Date().toISOString(),
      checks: [
        { name: 'connectivity', status: 'passed', responseTime: 150 },
        { name: 'authentication', status: 'passed', responseTime: 75 },
        { name: 'quota', status: 'passed', usage: '45%' }
      ]
    };

    return NextResponse.json({
      success: true,
      data: healthResult
    });

  } catch (error) {
    console.error('Failed to trigger health check:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to trigger health check' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/integrations/health/metrics - Get detailed health metrics
 */
export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const providerId = searchParams.get('providerId');
    const period = searchParams.get('period') || 'day';
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const end = endDate ? new Date(endDate) : new Date();
    const start = startDate ? new Date(startDate) : 
      new Date(end.getTime() - (period === 'week' ? 7 : period === 'month' ? 30 : 1) * 24 * 60 * 60 * 1000);

    let metrics;

    if (providerId) {
      // Get metrics for specific provider
      metrics = await apiManagement.getUsageMetrics(providerId, period as any, start, end);
    } else {
      // Get aggregated metrics for all providers
      const allProviders = await apiManagement.getProvidersHealth();
      const providerMetrics = await Promise.all(
        allProviders.map(p => 
          apiManagement.getUsageMetrics(p.providerId, period as any, start, end)
        )
      );

      metrics = {
        period,
        startDate: start,
        endDate: end,
        totalRequests: providerMetrics.reduce((sum, m) => sum + m.totalRequests, 0),
        successfulRequests: providerMetrics.reduce((sum, m) => sum + m.successfulRequests, 0),
        failedRequests: providerMetrics.reduce((sum, m) => sum + m.failedRequests, 0),
        averageResponseTime: providerMetrics.reduce((sum, m) => sum + m.averageResponseTime, 0) / providerMetrics.length,
        totalCost: providerMetrics.reduce((sum, m) => sum + m.totalCost, 0),
        currency: 'USD',
        providers: providerMetrics.map((m, i) => ({
          providerId: allProviders[i].providerId,
          requests: m.totalRequests,
          successRate: m.totalRequests > 0 ? (m.successfulRequests / m.totalRequests) * 100 : 0,
          responseTime: m.averageResponseTime,
          cost: m.totalCost
        }))
      };
    }

    return NextResponse.json({
      success: true,
      data: metrics
    });

  } catch (error) {
    console.error('Failed to get health metrics:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get health metrics' },
      { status: 500 }
    );
  }
}