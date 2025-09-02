// Individual Alert Management API - Get, update, acknowledge, and resolve specific alerts

import { NextRequest, NextResponse } from 'next/server';
import { errorTracker } from '../../../../../lib/monitoring/error-tracker';
import { metricsCollector } from '../../../../../lib/monitoring/metrics-collector';
import { logger } from '../../../../../lib/security/productionLogger';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const requestId = crypto.randomUUID();
  const startTime = Date.now();

  try {
    const alertId = params.id;

    // Get all alerts and find the specific one
    const alerts = errorTracker.getActiveAlerts();
    const alert = alerts.find(a => a.id === alertId);

    if (!alert) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'ALERT_NOT_FOUND',
          message: `Alert with ID ${alertId} not found`
        },
        timestamp: new Date(),
        requestId
      }, { status: 404 });
    }

    const responseTime = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      data: alert,
      responseTime,
      timestamp: new Date(),
      requestId
    });

  } catch (error) {
    const responseTime = Date.now() - startTime;

    errorTracker.trackError(error as Error, 'ERROR', {
      component: 'AlertsAPI',
      action: 'getAlert',
      requestId
    });

    return NextResponse.json({
      success: false,
      error: {
        code: 'ALERT_RETRIEVAL_ERROR',
        message: 'Failed to retrieve alert'
      },
      timestamp: new Date(),
      requestId
    }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const requestId = crypto.randomUUID();
  const startTime = Date.now();

  try {
    const alertId = params.id;
    const body = await request.json();
    const { action, userId, reason } = body;

    if (!action) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'action is required'
        },
        timestamp: new Date(),
        requestId
      }, { status: 400 });
    }

    const validActions = ['acknowledge', 'resolve', 'reactivate'];
    if (!validActions.includes(action)) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: `Invalid action. Must be one of: ${validActions.join(', ')}`
        },
        timestamp: new Date(),
        requestId
      }, { status: 400 });
    }

    let success = false;
    let message = '';

    switch (action) {
      case 'acknowledge':
        if (!userId) {
          return NextResponse.json({
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'userId is required for acknowledge action'
            },
            timestamp: new Date(),
            requestId
          }, { status: 400 });
        }

        success = errorTracker.acknowledgeAlert(alertId, userId);
        message = success ? 'Alert acknowledged successfully' : 'Alert not found or already processed';
        
        if (success) {
          metricsCollector.recordMetric('alerts_acknowledged', 1, 'count', {
            user_id: userId
          });

          logger.info('Alert acknowledged', {
            alertId,
            userId,
            reason
          }, {
            component: 'AlertsAPI',
            action: 'acknowledgeAlert'
          });
        }
        break;

      case 'resolve':
        success = errorTracker.resolveAlert(alertId);
        message = success ? 'Alert resolved successfully' : 'Alert not found or already resolved';
        
        if (success) {
          metricsCollector.recordMetric('alerts_resolved', 1, 'count', {
            resolved_by: userId || 'system'
          });

          logger.info('Alert resolved', {
            alertId,
            resolvedBy: userId,
            reason
          }, {
            component: 'AlertsAPI',
            action: 'resolveAlert'
          });
        }
        break;

      case 'reactivate':
        // For reactivate, we would need to implement reactivation logic
        // For now, just return an appropriate message
        message = 'Reactivation not yet implemented';
        break;
    }

    const responseTime = Date.now() - startTime;

    if (!success) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'ALERT_ACTION_FAILED',
          message
        },
        timestamp: new Date(),
        requestId
      }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      data: {
        alertId,
        action,
        message,
        performedAt: new Date(),
        performedBy: userId
      },
      responseTime,
      timestamp: new Date(),
      requestId
    });

  } catch (error) {
    const responseTime = Date.now() - startTime;

    errorTracker.trackError(error as Error, 'ERROR', {
      component: 'AlertsAPI',
      action: 'updateAlert',
      requestId
    });

    return NextResponse.json({
      success: false,
      error: {
        code: 'ALERT_UPDATE_ERROR',
        message: 'Failed to update alert'
      },
      timestamp: new Date(),
      requestId
    }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const requestId = crypto.randomUUID();
  const startTime = Date.now();

  try {
    const alertId = params.id;
    const url = new URL(request.url);
    const userId = url.searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'userId is required for alert deletion'
        },
        timestamp: new Date(),
        requestId
      }, { status: 400 });
    }

    // For now, we'll resolve the alert instead of actually deleting it
    // In a real system, you might want to maintain audit trails
    const success = errorTracker.resolveAlert(alertId);

    if (!success) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'ALERT_NOT_FOUND',
          message: `Alert with ID ${alertId} not found or already resolved`
        },
        timestamp: new Date(),
        requestId
      }, { status: 404 });
    }

    const responseTime = Date.now() - startTime;

    metricsCollector.recordMetric('alerts_deleted', 1, 'count', {
      deleted_by: userId
    });

    logger.info('Alert deleted (resolved)', {
      alertId,
      deletedBy: userId
    }, {
      component: 'AlertsAPI',
      action: 'deleteAlert'
    });

    return NextResponse.json({
      success: true,
      data: {
        alertId,
        message: 'Alert deleted successfully',
        deletedAt: new Date(),
        deletedBy: userId
      },
      responseTime,
      timestamp: new Date(),
      requestId
    });

  } catch (error) {
    const responseTime = Date.now() - startTime;

    errorTracker.trackError(error as Error, 'ERROR', {
      component: 'AlertsAPI',
      action: 'deleteAlert',
      requestId
    });

    return NextResponse.json({
      success: false,
      error: {
        code: 'ALERT_DELETION_ERROR',
        message: 'Failed to delete alert'
      },
      timestamp: new Date(),
      requestId
    }, { status: 500 });
  }
}