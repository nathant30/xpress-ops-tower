// SMS Services API Endpoints
// Globe/Smart and Twilio SMS integration endpoints

import { NextRequest, NextResponse } from 'next/server';
import { smsServices, createPhilippinesSMSConfig } from '@/lib/integrations/smsServices';

// Initialize SMS Services with Philippines configuration
const config = createPhilippinesSMSConfig();
const sms = smsServices.getInstance(config);

/**
 * POST /api/integrations/sms/send - Send single SMS
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      to,
      message,
      type = 'notification',
      priority = 'normal',
      metadata
    } = body;

    if (!to || !message) {
      return NextResponse.json(
        { success: false, error: 'Phone number and message are required' },
        { status: 400 }
      );
    }

    const result = await sms.sendSMS({
      to,
      message,
      type,
      priority,
      metadata
    });

    return NextResponse.json({
      success: true,
      data: {
        messageId: result.messageId,
        status: result.status,
        provider: result.provider,
        cost: result.cost,
        currency: result.currency,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('SMS send failed:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to send SMS' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/integrations/sms/status - Get SMS delivery status
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const messageId = searchParams.get('messageId');

    if (!messageId) {
      return NextResponse.json(
        { success: false, error: 'Message ID is required' },
        { status: 400 }
      );
    }

    const status = await sms.getDeliveryReport(messageId);

    if (!status) {
      return NextResponse.json(
        { success: false, error: 'Message not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: status
    });

  } catch (error) {
    console.error('Failed to get SMS status:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get SMS status' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/integrations/sms/bulk - Send bulk SMS
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { messages } = body;

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { success: false, error: 'Messages array is required' },
        { status: 400 }
      );
    }

    const batch = await sms.sendBulkSMS(messages);

    return NextResponse.json({
      success: true,
      data: {
        batchId: batch.id,
        totalMessages: batch.totalMessages,
        status: batch.status,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Bulk SMS send failed:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to send bulk SMS' },
      { status: 500 }
    );
  }
}