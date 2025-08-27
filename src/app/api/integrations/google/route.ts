// Google Services API Endpoints
// Maps, Places, Directions, and Geocoding integration endpoints

import { NextRequest, NextResponse } from 'next/server';
import { googleServices, createPhilippinesConfig } from '@/lib/integrations/googleServices';

// Initialize Google Services with Philippines configuration
const config = createPhilippinesConfig(process.env.GOOGLE_MAPS_API_KEY || '');
const google = googleServices.getInstance(config);

/**
 * POST /api/integrations/google/places - Search for places
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      query,
      location,
      radius,
      type,
      region,
      strictBounds,
      priceLevel,
      openNow
    } = body;

    if (!query) {
      return NextResponse.json(
        { success: false, error: 'Query is required' },
        { status: 400 }
      );
    }

    const results = await google.searchPlaces({
      query,
      location,
      radius,
      type,
      region,
      strictBounds,
      priceLevel,
      openNow
    });

    return NextResponse.json({
      success: true,
      data: {
        places: results,
        count: results.length,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Google Places search failed:', error);
    return NextResponse.json(
      { success: false, error: 'Places search failed' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/integrations/google/health - Get Google Services health
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const service = searchParams.get('service');

    if (service) {
      const health = google.getSpecificServiceHealth(service as any);
      return NextResponse.json({
        success: true,
        data: health
      });
    }

    const allHealth = google.getServiceHealth();
    return NextResponse.json({
      success: true,
      data: {
        services: allHealth,
        overall: {
          status: allHealth.every(s => s.status === 'healthy') ? 'healthy' : 'degraded',
          count: allHealth.length
        },
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Failed to get Google Services health:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get health status' },
      { status: 500 }
    );
  }
}