// API endpoint for real-time fraud checking
import { NextRequest, NextResponse } from 'next/server';
import { realTimeFraudEngine, FraudEventData } from '@/lib/fraud/realTimeFraudEngine';
import { metricsCollector } from '@/lib/monitoring/metricsCollector';
import { logger } from '@/lib/security/productionLogger';

export async function POST(request: NextRequest) {
  try {
    const eventData: FraudEventData = await request.json();
    
    // Validate required fields
    if (!eventData.eventType || !eventData.userId || !eventData.userType) {
      return NextResponse.json(
        { error: 'Missing required fields: eventType, userId, userType' },
        { status: 400 }
      );
    }

    // Add timestamp if not provided
    if (!eventData.timestamp) {
      eventData.timestamp = Date.now();
    }

    // Perform fraud check
    const result = await realTimeFraudEngine.checkForFraud(eventData);

    // Track API usage
    metricsCollector.incrementCounter('fraud_api_requests_total', {
      event_type: eventData.eventType,
      result_flagged: result.flaggedForReview.toString()
    });

    return NextResponse.json({
      success: true,
      result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Fraud check API error:', error);
    
    metricsCollector.incrementCounter('fraud_api_errors_total');
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    switch (action) {
      case 'status':
        const stats = realTimeFraudEngine.getStatistics();
        return NextResponse.json(stats);
        
      case 'monitors':
        const monitors = realTimeFraudEngine.getActiveMonitors();
        return NextResponse.json(monitors);
        
      default:
        return NextResponse.json(
          { error: 'Invalid action. Use ?action=status or ?action=monitors' },
          { status: 400 }
        );
    }
  } catch (error) {
    logger.error('Fraud status API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}