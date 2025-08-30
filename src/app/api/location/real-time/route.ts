import { NextRequest, NextResponse } from 'next/server';
import { locationIntegrationManager } from '@/lib/realtime/locationIntegrationManager';
import { DriverLocationData } from '@/lib/realtime/realtimeLocationTracker';
import { logger } from '@/lib/security/productionLogger';

export async function POST(request: NextRequest) {
  try {
    await locationIntegrationManager.initialize();
    
    const locationData: DriverLocationData = await request.json();
    
    // Validate required fields
    if (!locationData.driverId || !locationData.latitude || !locationData.longitude) {
      return NextResponse.json(
        { error: 'Missing required fields: driverId, latitude, longitude' },
        { status: 400 }
      );
    }

    // Process integrated location update
    const result = await locationIntegrationManager.processLocationUpdate(locationData);
    
    return NextResponse.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error(`Real-time location API error: ${error instanceof Error ? error.message : error}`);
    return NextResponse.json(
      { error: 'Failed to process location update' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const timeframe = searchParams.get('timeframe') as '1h' | '24h' | '7d' || '1h';
    
    const [analytics, serviceStatus] = await Promise.all([
      locationIntegrationManager.getLocationAnalytics(timeframe),
      locationIntegrationManager.getServiceStatus()
    ]);

    return NextResponse.json({
      success: true,
      data: {
        analytics,
        serviceStatus
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error(`Location analytics API error: ${error instanceof Error ? error.message : error}`);
    return NextResponse.json(
      { error: 'Failed to get location analytics' },
      { status: 500 }
    );
  }
}