// Prometheus-compatible metrics endpoint
import { NextRequest, NextResponse } from 'next/server';
import { metricsCollector } from '@/lib/monitoring/metricsCollector';
import { logger } from '@/lib/security/productionLogger';

export async function GET(request: NextRequest) {
  try {
    // Get query parameters
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'prometheus';
    
    if (format === 'prometheus') {
      // Return Prometheus format
      const metricsText = metricsCollector.getPrometheusFormat();
      
      return new NextResponse(metricsText, {
        status: 200,
        headers: {
          'Content-Type': 'text/plain; version=0.0.4; charset=utf-8',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
    } else if (format === 'json') {
      // Return JSON format for dashboard
      const metricsSummary = metricsCollector.getMetricsSummary();
      
      return NextResponse.json({
        timestamp: new Date().toISOString(),
        metrics: metricsSummary
      });
    } else {
      return NextResponse.json({ error: 'Invalid format. Use "prometheus" or "json"' }, { status: 400 });
    }
    
  } catch (error) {
    logger.error(`Metrics endpoint error: ${error instanceof Error ? error.message : error}`);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Health check for metrics endpoint
export async function HEAD() {
  return new NextResponse(null, { status: 200 });
}