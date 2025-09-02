import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';
import { withAuthAndRateLimit } from '@/lib/auth';

// GET /api/surge/audit - Get surge audit log
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const regionId = searchParams.get('regionId');
    const serviceKey = searchParams.get('serviceKey');
    const action = searchParams.get('action');
    const userId = searchParams.get('userId');
    const fromDate = searchParams.get('fromDate');
    const toDate = searchParams.get('toDate');
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 100;

    const db = getDatabase();
    let query = `
      SELECT 
        id,
        region_id as regionId,
        service_key as serviceKey,
        user_id as userId,
        action,
        old_value as oldValue,
        new_value as newValue,
        created_at as createdAt
      FROM surge_audit_log
      WHERE 1=1
    `;
    const params: any[] = [];

    if (regionId) {
      query += ' AND region_id = ?';
      params.push(regionId);
    }

    if (serviceKey) {
      query += ' AND service_key = ?';
      params.push(serviceKey);
    }

    if (action) {
      query += ' AND action = ?';
      params.push(action);
    }

    if (userId) {
      query += ' AND user_id = ?';
      params.push(userId);
    }

    if (fromDate) {
      query += ' AND datetime(created_at) >= datetime(?)';
      params.push(fromDate);
    }

    if (toDate) {
      query += ' AND datetime(created_at) <= datetime(?)';
      params.push(toDate);
    }

    query += ' ORDER BY created_at DESC LIMIT ?';
    params.push(limit);

    const auditLogs = await db.all(query, params);

    // Parse JSON values
    const transformedLogs = auditLogs.map(log => ({
      ...log,
      oldValue: log.oldValue ? JSON.parse(log.oldValue) : null,
      newValue: log.newValue ? JSON.parse(log.newValue) : null
    }));

    return NextResponse.json(transformedLogs);

  } catch (error) {
    console.error('Error fetching surge audit logs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch surge audit logs' },
      { status: 500 }
    );
  }
}

// POST /api/surge/audit - Create audit log entry (internal API)
export async function POST(request: NextRequest) {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { regionId, serviceKey, action, oldValue, newValue } = body;

    if (!regionId || !serviceKey || !action) {
      return NextResponse.json(
        { error: 'regionId, serviceKey, and action are required' },
        { status: 400 }
      );
    }

    const db = getDatabase();

    const result = await db.run(`
      INSERT INTO surge_audit_log (
        region_id,
        service_key,
        user_id,
        action,
        old_value,
        new_value
      ) VALUES (?, ?, ?, ?, ?, ?)
    `, [
      regionId,
      serviceKey,
      userId,
      action,
      oldValue ? JSON.stringify(oldValue) : null,
      newValue ? JSON.stringify(newValue) : null
    ]);

    if (!result.lastID) {
      throw new Error('Failed to create audit log entry');
    }

    return NextResponse.json({
      id: result.lastID,
      message: 'Audit log entry created successfully'
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating surge audit log:', error);
    return NextResponse.json(
      { error: 'Failed to create surge audit log' },
      { status: 500 }
    );
  }
}