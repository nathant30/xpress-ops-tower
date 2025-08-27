// Emergency Services API Endpoints
// Philippines emergency services integration (911, PNP, BFP, etc.)

import { NextRequest, NextResponse } from 'next/server';
import { philippinesEmergencyServices, createPhilippinesEmergencyConfig } from '@/lib/integrations/emergencyServices';

// Initialize Emergency Services with Philippines configuration
const config = createPhilippinesEmergencyConfig();
const emergency = philippinesEmergencyServices.getInstance(config);

/**
 * POST /api/integrations/emergency/dispatch - Dispatch emergency request
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      type,
      priority,
      incident,
      requestedServices,
      contactPreference = 'auto',
      urgency = 'immediate',
      language = 'en'
    } = body;

    // Validate required fields
    if (!incident || !incident.location || !incident.reporter) {
      return NextResponse.json(
        { success: false, error: 'Incident details with location and reporter are required' },
        { status: 400 }
      );
    }

    const emergencyRequest = {
      type,
      priority,
      incident: {
        id: incident.id || `incident_${Date.now()}`,
        type: incident.type,
        description: incident.description,
        location: incident.location,
        reporter: incident.reporter,
        victim: incident.victim,
        vehicle: incident.vehicle,
        additionalInfo: incident.additionalInfo
      },
      requestedServices: requestedServices || [type],
      contactPreference,
      urgency,
      language
    };

    const responses = await emergency.dispatchEmergency(emergencyRequest);

    return NextResponse.json({
      success: true,
      data: {
        incidentId: emergencyRequest.incident.id,
        dispatchedServices: responses.length,
        responses: responses.map(r => ({
          service: r.service,
          status: r.status,
          referenceNumber: r.referenceNumber,
          dispatchDetails: r.dispatchDetails,
          followUpRequired: r.followUpRequired
        })),
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Emergency dispatch failed:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to dispatch emergency request' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/integrations/emergency/status - Get emergency request status
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const incidentId = searchParams.get('incidentId');

    if (!incidentId) {
      return NextResponse.json(
        { success: false, error: 'Incident ID is required' },
        { status: 400 }
      );
    }

    const status = await emergency.getEmergencyStatus(incidentId);

    return NextResponse.json({
      success: true,
      data: {
        incidentId,
        responses: status,
        totalResponses: status.length,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Failed to get emergency status:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get emergency status' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/integrations/emergency/cancel - Cancel emergency request
 */
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { incidentId, reason } = body;

    if (!incidentId || !reason) {
      return NextResponse.json(
        { success: false, error: 'Incident ID and reason are required' },
        { status: 400 }
      );
    }

    const cancelled = await emergency.cancelEmergency(incidentId, reason);

    return NextResponse.json({
      success: true,
      data: {
        incidentId,
        cancelled,
        reason,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Failed to cancel emergency request:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to cancel emergency request' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/integrations/emergency/services - Get emergency services health
 */
export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const service = searchParams.get('service');
    const region = searchParams.get('region');

    if (service && region) {
      const health = emergency.getSpecificServiceHealth(service as any, region);
      return NextResponse.json({
        success: true,
        data: health
      });
    }

    const allHealth = emergency.getServiceHealth();
    return NextResponse.json({
      success: true,
      data: {
        services: allHealth,
        totalServices: allHealth.length,
        healthyServices: allHealth.filter(s => s.status === 'operational').length,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Failed to get emergency services health:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get emergency services health' },
      { status: 500 }
    );
  }
}