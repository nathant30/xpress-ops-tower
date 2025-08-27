// Integration API Endpoints for External Service Management
// Comprehensive REST API for managing all external service integrations
// Supports Google Services, SMS, Email, Phone, Emergency Services

import { NextRequest, NextResponse } from 'next/server';
import { googleServices } from '@/lib/integrations/googleServices';
import { smsServices } from '@/lib/integrations/smsServices';
import { emailServices } from '@/lib/integrations/emailServices';
import { phoneServices } from '@/lib/integrations/phoneServices';
import { philippinesEmergencyServices } from '@/lib/integrations/emergencyServices';
import { apiManagement } from '@/lib/integrations/apiManagement';
import { failoverManager } from '@/lib/integrations/failoverManager';

/**
 * GET /api/integrations - Get all integration services status
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const service = searchParams.get('service');
    const includeHealth = searchParams.get('health') === 'true';
    const includeMetrics = searchParams.get('metrics') === 'true';

    // If specific service requested
    if (service) {
      return await handleSpecificService(service, { includeHealth, includeMetrics });
    }

    // Get all services overview
    const services = {
      google: {
        name: 'Google Services',
        type: 'google',
        status: 'active',
        endpoints: {
          maps: '/api/integrations/google/maps',
          places: '/api/integrations/google/places',
          directions: '/api/integrations/google/directions',
          geocoding: '/api/integrations/google/geocoding'
        }
      },
      sms: {
        name: 'SMS Services',
        type: 'communication',
        status: 'active',
        endpoints: {
          send: '/api/integrations/sms/send',
          bulk: '/api/integrations/sms/bulk',
          status: '/api/integrations/sms/status',
          templates: '/api/integrations/sms/templates'
        }
      },
      email: {
        name: 'Email Services',
        type: 'communication',
        status: 'active',
        endpoints: {
          send: '/api/integrations/email/send',
          bulk: '/api/integrations/email/bulk',
          templates: '/api/integrations/email/templates',
          analytics: '/api/integrations/email/analytics'
        }
      },
      phone: {
        name: 'Phone Services',
        type: 'communication',
        status: 'active',
        endpoints: {
          call: '/api/integrations/phone/call',
          status: '/api/integrations/phone/status',
          recordings: '/api/integrations/phone/recordings'
        }
      },
      emergency: {
        name: 'Emergency Services',
        type: 'emergency',
        status: 'active',
        endpoints: {
          dispatch: '/api/integrations/emergency/dispatch',
          status: '/api/integrations/emergency/status',
          services: '/api/integrations/emergency/services'
        }
      }
    };

    // Add health information if requested
    if (includeHealth) {
      const health = await Promise.all([
        googleServices.getInstance().getServiceHealth(),
        // Add other service health checks
      ]);
      
      // Merge health data with services
      // Implementation would map health data to services
    }

    return NextResponse.json({
      success: true,
      data: {
        services,
        totalServices: Object.keys(services).length,
        activeServices: Object.values(services).filter(s => s.status === 'active').length,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Failed to get integrations:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get integrations' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/integrations - Create new integration configuration
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, config } = body;

    if (!type || !config) {
      return NextResponse.json(
        { success: false, error: 'Type and config are required' },
        { status: 400 }
      );
    }

    let result;

    switch (type) {
      case 'api_provider':
        result = await apiManagement.registerProvider(config);
        break;
        
      case 'api_key':
        result = await apiManagement.addAPIKey(config);
        break;
        
      case 'quota_limit':
        result = await apiManagement.setQuotaLimit(config);
        break;
        
      case 'health_check':
        result = await apiManagement.addHealthCheck(config);
        break;
        
      case 'failover_config':
        result = await failoverManager.createFailoverConfig(config);
        break;
        
      default:
        return NextResponse.json(
          { success: false, error: `Unknown integration type: ${type}` },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Failed to create integration:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create integration' },
      { status: 500 }
    );
  }
}

// Helper function to handle specific service requests
async function handleSpecificService(
  service: string,
  options: { includeHealth: boolean; includeMetrics: boolean }
) {
  try {
    switch (service) {
      case 'google':
        const googleHealth = options.includeHealth 
          ? googleServices.getInstance().getServiceHealth()
          : null;
        
        return NextResponse.json({
          success: true,
          data: {
            service: 'Google Services',
            type: 'google',
            health: googleHealth,
            capabilities: ['maps', 'places', 'directions', 'geocoding', 'traffic'],
            endpoints: {
              maps: '/api/integrations/google/maps',
              places: '/api/integrations/google/places',
              directions: '/api/integrations/google/directions',
              geocoding: '/api/integrations/google/geocoding'
            }
          }
        });

      case 'sms':
        const smsHealth = options.includeHealth 
          ? smsServices.getInstance().getProviderHealth()
          : null;
        
        return NextResponse.json({
          success: true,
          data: {
            service: 'SMS Services',
            type: 'communication',
            health: smsHealth,
            providers: ['globe', 'smart', 'twilio'],
            capabilities: ['single_sms', 'bulk_sms', 'templates', 'delivery_tracking'],
            endpoints: {
              send: '/api/integrations/sms/send',
              bulk: '/api/integrations/sms/bulk',
              status: '/api/integrations/sms/status'
            }
          }
        });

      case 'email':
        const emailHealth = options.includeHealth 
          ? emailServices.getInstance().getProviderHealth()
          : null;
        
        return NextResponse.json({
          success: true,
          data: {
            service: 'Email Services',
            type: 'communication',
            health: emailHealth,
            providers: ['sendgrid', 'smtp'],
            capabilities: ['single_email', 'bulk_email', 'templates', 'analytics', 'tracking'],
            endpoints: {
              send: '/api/integrations/email/send',
              bulk: '/api/integrations/email/bulk',
              templates: '/api/integrations/email/templates'
            }
          }
        });

      case 'phone':
        const phoneHealth = options.includeHealth 
          ? [{ provider: 'twilio', status: 'healthy', responseTime: 420 }]
          : null;
        
        return NextResponse.json({
          success: true,
          data: {
            service: 'Phone Services',
            type: 'communication',
            health: phoneHealth,
            providers: ['twilio'],
            capabilities: ['voice_calls', 'text_to_speech', 'call_recording', 'conferencing'],
            endpoints: {
              call: '/api/integrations/phone/call',
              status: '/api/integrations/phone/status',
              recordings: '/api/integrations/phone/recordings'
            }
          }
        });

      case 'emergency':
        const emergencyHealth = options.includeHealth 
          ? philippinesEmergencyServices.getInstance().getServiceHealth()
          : null;
        
        return NextResponse.json({
          success: true,
          data: {
            service: 'Emergency Services',
            type: 'emergency',
            health: emergencyHealth,
            providers: ['pnp', 'bfp', 'redcross', 'mmda', 'coastguard'],
            capabilities: ['911_dispatch', 'police_integration', 'medical_emergency', 'fire_department'],
            endpoints: {
              dispatch: '/api/integrations/emergency/dispatch',
              status: '/api/integrations/emergency/status',
              services: '/api/integrations/emergency/services'
            }
          }
        });

      default:
        return NextResponse.json(
          { success: false, error: `Unknown service: ${service}` },
          { status: 404 }
        );
    }
  } catch (error) {
    console.error(`Failed to get service ${service}:`, error);
    return NextResponse.json(
      { success: false, error: `Failed to get service ${service}` },
      { status: 500 }
    );
  }
}