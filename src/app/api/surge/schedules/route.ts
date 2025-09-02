import { NextRequest, NextResponse } from 'next/server';
import { CreateScheduleRequest } from '@/lib/pricing/surgeSchemas';
import { getDatabase } from '@/lib/database';
import { withAuthAndRateLimit } from '@/lib/auth';

// GET /api/surge/schedules - List surge schedules
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const regionId = searchParams.get('regionId');
    const serviceKey = searchParams.get('serviceKey');
    const status = searchParams.get('status');

    const db = getDatabase();
    let query = `
      SELECT 
        id,
        region_id as regionId,
        service_key as serviceKey,
        name,
        multiplier,
        additive_fee as additiveFee,
        h3_set as h3Set,
        starts_at as startsAt,
        ends_at as endsAt,
        requested_by as requestedBy,
        status,
        approval_request_id as approvalRequestId,
        created_at as createdAt
      FROM surge_schedules
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

    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }

    query += ' ORDER BY starts_at DESC';

    const schedules = await db.all(query, params);
    
    // Parse h3_set JSON strings (null for region-wide)
    const transformedSchedules = schedules.map(schedule => ({
      ...schedule,
      h3Set: schedule.h3Set ? JSON.parse(schedule.h3Set) : null
    }));

    return NextResponse.json(transformedSchedules);

  } catch (error) {
    console.error('Error fetching surge schedules:', error);
    return NextResponse.json(
      { error: 'Failed to fetch surge schedules' },
      { status: 500 }
    );
  }
}

// POST /api/surge/schedules - Create surge schedule
export async function POST(request: NextRequest) {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parsedRequest = CreateScheduleRequest.parse(body);
    
    const db = getDatabase();
    
    // Check if schedule requires approval (multiplier > 1.5)
    const requiresApproval = parsedRequest.multiplier > 1.5;
    const needsApprovals = requiresApproval ? 2 : 0;
    
    let approvalRequestId = null;

    // Create approval request if needed
    if (requiresApproval) {
      const approvalResult = await db.run(`
        INSERT INTO pricing_activation_requests (
          region_id,
          service_key,
          change_type,
          change_description,
          requested_by,
          effective_at,
          status,
          needs_approvals,
          comment,
          created_at
        ) VALUES (?, ?, 'surge_schedule', ?, ?, ?, 'pending', ?, ?, datetime('now'))
      `, [
        parsedRequest.regionId,
        parsedRequest.serviceKey,
        `Scheduled surge: ${parsedRequest.name} (multiplier: ${parsedRequest.multiplier})`,
        userId,
        parsedRequest.startsAt,
        needsApprovals,
        `Scheduled surge from ${parsedRequest.startsAt} to ${parsedRequest.endsAt}`
      ]);

      approvalRequestId = approvalResult.lastID;
    }

    const result = await db.run(`
      INSERT INTO surge_schedules (
        region_id,
        service_key,
        name,
        multiplier,
        additive_fee,
        h3_set,
        starts_at,
        ends_at,
        requested_by,
        status,
        approval_request_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      parsedRequest.regionId,
      parsedRequest.serviceKey,
      parsedRequest.name,
      parsedRequest.multiplier,
      parsedRequest.additiveFee,
      parsedRequest.h3Set ? JSON.stringify(parsedRequest.h3Set) : null,
      parsedRequest.startsAt,
      parsedRequest.endsAt,
      userId,
      requiresApproval ? 'pending' : 'approved',
      approvalRequestId
    ]);

    if (!result.lastID) {
      throw new Error('Failed to create surge schedule');
    }

    // Log the schedule creation
    await db.run(`
      INSERT INTO surge_audit_log (
        region_id,
        service_key,
        user_id,
        action,
        old_value,
        new_value
      ) VALUES (?, ?, ?, 'schedule_create', null, ?)
    `, [
      parsedRequest.regionId,
      parsedRequest.serviceKey,
      userId,
      JSON.stringify({ 
        scheduleId: result.lastID,
        name: parsedRequest.name,
        multiplier: parsedRequest.multiplier,
        startsAt: parsedRequest.startsAt,
        endsAt: parsedRequest.endsAt,
        h3Set: parsedRequest.h3Set
      })
    ]);

    // Fetch the created schedule
    const newSchedule = await db.get(`
      SELECT 
        id,
        region_id as regionId,
        service_key as serviceKey,
        name,
        multiplier,
        additive_fee as additiveFee,
        h3_set as h3Set,
        starts_at as startsAt,
        ends_at as endsAt,
        requested_by as requestedBy,
        status,
        approval_request_id as approvalRequestId,
        created_at as createdAt
      FROM surge_schedules WHERE id = ?
    `, [result.lastID]);

    const transformedSchedule = {
      ...newSchedule,
      h3Set: newSchedule.h3Set ? JSON.parse(newSchedule.h3Set) : null
    };

    return NextResponse.json(transformedSchedule, { status: 201 });

  } catch (error) {
    console.error('Error creating surge schedule:', error);
    return NextResponse.json(
      { error: 'Failed to create surge schedule' },
      { status: 500 }
    );
  }
}