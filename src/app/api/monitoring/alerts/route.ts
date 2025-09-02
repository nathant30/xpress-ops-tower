// Alert Management API - Create, manage, and respond to monitoring alerts

import { NextRequest, NextResponse } from 'next/server';
import { errorTracker } from '../../../../lib/monitoring/error-tracker';
import { Alert, AlertCondition, AlertAction } from '../../../../lib/monitoring/types';
import { metricsCollector } from '../../../../lib/monitoring/metrics-collector';
import { logger } from '../../../../lib/security/productionLogger';

export async function GET(request: NextRequest) {
  const requestId = crypto.randomUUID();
  const startTime = Date.now();

  try {
    const url = new URL(request.url);
    const status = url.searchParams.get('status') as 'ACTIVE' | 'ACKNOWLEDGED' | 'RESOLVED' | null;
    const severity = url.searchParams.get('severity') as 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | null;
    const type = url.searchParams.get('type') as Alert['type'] | null;
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const offset = parseInt(url.searchParams.get('offset') || '0');

    // Get all active alerts
    let alerts = errorTracker.getActiveAlerts();

    // Apply filters
    if (status) {
      alerts = alerts.filter(alert => alert.status === status);
    }
    if (severity) {
      alerts = alerts.filter(alert => alert.severity === severity);
    }
    if (type) {
      alerts = alerts.filter(alert => alert.type === type);
    }

    // Apply pagination
    const total = alerts.length;
    const paginatedAlerts = alerts.slice(offset, offset + limit);

    const responseTime = Date.now() - startTime;

    // Record API usage metrics
    metricsCollector.recordMetric('api_alerts_list_requests', 1, 'count', {
      status: status || 'all',
      severity: severity || 'all',
      type: type || 'all'
    });

    return NextResponse.json({
      success: true,
      data: {
        alerts: paginatedAlerts,
        pagination: {
          total,
          offset,
          limit,
          hasMore: offset + limit < total
        }
      },
      metadata: {
        filters: { status, severity, type },
        responseTime
      },
      timestamp: new Date(),
      requestId
    });

  } catch (error) {
    const responseTime = Date.now() - startTime;

    errorTracker.trackError(error as Error, 'ERROR', {
      component: 'AlertsAPI',
      action: 'listAlerts',
      requestId
    });

    return NextResponse.json({
      success: false,
      error: {
        code: 'ALERTS_LIST_ERROR',
        message: 'Failed to retrieve alerts'
      },
      timestamp: new Date(),
      requestId
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();
  const startTime = Date.now();

  try {
    const body = await request.json();
    const {
      name,
      description,
      type,
      severity,
      conditions,
      actions
    } = body;

    // Validate required fields
    if (!name || !description || !type || !severity) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Missing required fields: name, description, type, severity'
        },
        timestamp: new Date(),
        requestId
      }, { status: 400 });
    }

    // Validate severity
    const validSeverities = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
    if (!validSeverities.includes(severity)) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: `Invalid severity. Must be one of: ${validSeverities.join(', ')}`
        },
        timestamp: new Date(),
        requestId
      }, { status: 400 });
    }

    // Validate type
    const validTypes = ['PERFORMANCE', 'SECURITY', 'BUSINESS', 'SYSTEM', 'DATABASE'];
    if (!validTypes.includes(type)) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: `Invalid type. Must be one of: ${validTypes.join(', ')}`
        },
        timestamp: new Date(),
        requestId
      }, { status: 400 });
    }

    // Validate and sanitize conditions
    const validatedConditions: AlertCondition[] = [];
    if (conditions && Array.isArray(conditions)) {
      for (const condition of conditions) {
        const validatedCondition = validateAlertCondition(condition);
        if (validatedCondition.isValid) {
          validatedConditions.push(validatedCondition.condition);
        } else {
          return NextResponse.json({
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: `Invalid condition: ${validatedCondition.error}`
            },
            timestamp: new Date(),
            requestId
          }, { status: 400 });
        }
      }
    }

    // Validate and sanitize actions
    const validatedActions: AlertAction[] = [];
    if (actions && Array.isArray(actions)) {
      for (const action of actions) {
        const validatedAction = validateAlertAction(action);
        if (validatedAction.isValid) {
          validatedActions.push(validatedAction.action);
        } else {
          return NextResponse.json({
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: `Invalid action: ${validatedAction.error}`
            },
            timestamp: new Date(),
            requestId
          }, { status: 400 });
        }
      }
    }

    // Create the alert
    const alertId = errorTracker.registerAlert({
      name,
      description,
      type,
      severity,
      conditions: validatedConditions,
      actions: validatedActions
    });

    const responseTime = Date.now() - startTime;

    // Record alert creation metrics
    metricsCollector.recordMetric('alerts_created', 1, 'count', {
      type,
      severity
    });

    logger.info('Alert created', {
      alertId,
      name,
      type,
      severity,
      conditionsCount: validatedConditions.length,
      actionsCount: validatedActions.length
    }, {
      component: 'AlertsAPI',
      action: 'createAlert'
    });

    return NextResponse.json({
      success: true,
      data: {
        alertId,
        name,
        type,
        severity,
        status: 'ACTIVE',
        createdAt: new Date()
      },
      responseTime,
      timestamp: new Date(),
      requestId
    });

  } catch (error) {
    const responseTime = Date.now() - startTime;

    errorTracker.trackError(error as Error, 'ERROR', {
      component: 'AlertsAPI',
      action: 'createAlert',
      requestId
    });

    return NextResponse.json({
      success: false,
      error: {
        code: 'ALERT_CREATION_ERROR',
        message: 'Failed to create alert'
      },
      timestamp: new Date(),
      requestId
    }, { status: 500 });
  }
}

function validateAlertCondition(condition: any): { isValid: boolean; condition?: AlertCondition; error?: string } {
  if (!condition.metric || typeof condition.metric !== 'string') {
    return { isValid: false, error: 'metric is required and must be a string' };
  }

  if (!condition.operator || !['GT', 'LT', 'EQ', 'GTE', 'LTE', 'CONTAINS', 'NOT_CONTAINS'].includes(condition.operator)) {
    return { isValid: false, error: 'operator must be one of: GT, LT, EQ, GTE, LTE, CONTAINS, NOT_CONTAINS' };
  }

  if (condition.threshold === undefined || condition.threshold === null) {
    return { isValid: false, error: 'threshold is required' };
  }

  if (!condition.timeWindow || typeof condition.timeWindow !== 'number' || condition.timeWindow <= 0) {
    return { isValid: false, error: 'timeWindow must be a positive number (minutes)' };
  }

  if (!condition.aggregation || !['SUM', 'AVG', 'COUNT', 'MIN', 'MAX'].includes(condition.aggregation)) {
    return { isValid: false, error: 'aggregation must be one of: SUM, AVG, COUNT, MIN, MAX' };
  }

  return {
    isValid: true,
    condition: {
      metric: condition.metric,
      operator: condition.operator,
      threshold: condition.threshold,
      timeWindow: condition.timeWindow,
      aggregation: condition.aggregation
    }
  };
}

function validateAlertAction(action: any): { isValid: boolean; action?: AlertAction; error?: string } {
  if (!action.type || !['EMAIL', 'SMS', 'WEBHOOK', 'SLACK', 'PAGERDUTY'].includes(action.type)) {
    return { isValid: false, error: 'type must be one of: EMAIL, SMS, WEBHOOK, SLACK, PAGERDUTY' };
  }

  if (!action.target || typeof action.target !== 'string') {
    return { isValid: false, error: 'target is required and must be a string' };
  }

  // Validate target format based on type
  switch (action.type) {
    case 'EMAIL':
      if (!isValidEmail(action.target)) {
        return { isValid: false, error: 'target must be a valid email address for EMAIL type' };
      }
      break;
    case 'WEBHOOK':
      if (!isValidUrl(action.target)) {
        return { isValid: false, error: 'target must be a valid URL for WEBHOOK type' };
      }
      break;
  }

  return {
    isValid: true,
    action: {
      type: action.type,
      target: action.target,
      template: action.template,
      enabled: action.enabled !== false // Default to true
    }
  };
}

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}