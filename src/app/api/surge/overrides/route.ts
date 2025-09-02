import { NextRequest, NextResponse } from 'next/server';
import { CreateOverrideRequest } from '@/lib/pricing/surgeSchemas';
import { getDatabase } from '@/lib/database';
import { withAuthAndRateLimit } from '@/lib/auth';

// GET /api/surge/overrides - List surge overrides
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
        reason,
        multiplier,
        additive_fee as additiveFee,
        h3_set as h3Set,
        starts_at as startsAt,
        ends_at as endsAt,
        requested_by as requestedBy,
        status,
        approval_request_id as approvalRequestId,
        created_at as createdAt
      FROM surge_overrides
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

    query += ' ORDER BY created_at DESC';

    const overrides = await db.all(query, params);
    
    // Parse h3_set JSON strings
    const transformedOverrides = overrides.map(override => ({
      ...override,
      h3Set: JSON.parse(override.h3Set)
    }));

    return NextResponse.json(transformedOverrides);

  } catch (error) {
    console.error('Error fetching surge overrides:', error);
    return NextResponse.json(
      { error: 'Failed to fetch surge overrides' },
      { status: 500 }
    );
  }
}

// POST /api/surge/overrides - Create surge override
export async function POST(request: NextRequest) {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parsedRequest = CreateOverrideRequest.parse(body);
    
    const db = getDatabase();
    
    // Check if override requires approval (multiplier > 1.5)
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
        ) VALUES (?, ?, 'surge_override', ?, ?, datetime('now'), 'pending', ?, ?, datetime('now'))
      `, [
        parsedRequest.regionId,
        parsedRequest.serviceKey,
        `Manual surge override: ${parsedRequest.reason} (multiplier: ${parsedRequest.multiplier})`,
        userId,
        needsApprovals,
        parsedRequest.reason
      ]);

      approvalRequestId = approvalResult.lastID;
    }

    const result = await db.run(`
      INSERT INTO surge_overrides (
        region_id,
        service_key,
        reason,
        multiplier,
        additive_fee,
        h3_set,
        ends_at,
        requested_by,
        status,
        approval_request_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      parsedRequest.regionId,
      parsedRequest.serviceKey,
      parsedRequest.reason,
      parsedRequest.multiplier,
      parsedRequest.additiveFee,
      JSON.stringify(parsedRequest.h3Set),
      parsedRequest.endsAt,
      userId,
      requiresApproval ? 'pending' : 'approved',
      approvalRequestId
    ]);

    if (!result.lastID) {
      throw new Error('Failed to create surge override');
    }

    // If no approval needed, activate immediately
    if (!requiresApproval) {
      await db.run(`
        INSERT INTO surge_hex_state (
          region_id,
          service_key,
          h3_index,
          h3_res,
          multiplier,
          additive_fee,
          source,
          profile_id,
          valid_from,
          valid_until,
          computed_at
        ) SELECT 
          ?,
          ?,
          value as h3_index,
          8 as h3_res,
          ?,
          ?,
          'manual',
          null,
          datetime('now'),
          ?,
          datetime('now')
        FROM json_each(?)
      `, [
        parsedRequest.regionId,
        parsedRequest.serviceKey,
        parsedRequest.multiplier,
        parsedRequest.additiveFee,
        parsedRequest.endsAt,
        JSON.stringify(parsedRequest.h3Set)
      ]);

      // Log the override activation
      await db.run(`
        INSERT INTO surge_audit_log (
          region_id,
          service_key,
          user_id,
          action,
          old_value,
          new_value
        ) VALUES (?, ?, ?, 'override_create', null, ?)
      `, [
        parsedRequest.regionId,
        parsedRequest.serviceKey,
        userId,
        JSON.stringify({ 
          overrideId: result.lastID,
          multiplier: parsedRequest.multiplier,
          h3Set: parsedRequest.h3Set,
          endsAt: parsedRequest.endsAt
        })
      ]);
    }

    // Fetch the created override
    const newOverride = await db.get(`
      SELECT 
        id,
        region_id as regionId,
        service_key as serviceKey,
        reason,
        multiplier,
        additive_fee as additiveFee,
        h3_set as h3Set,
        starts_at as startsAt,
        ends_at as endsAt,
        requested_by as requestedBy,
        status,
        approval_request_id as approvalRequestId,
        created_at as createdAt
      FROM surge_overrides WHERE id = ?
    `, [result.lastID]);

    const transformedOverride = {
      ...newOverride,
      h3Set: JSON.parse(newOverride.h3Set)
    };

    return NextResponse.json(transformedOverride, { status: 201 });

  } catch (error) {
    console.error('Error creating surge override:', error);
    return NextResponse.json(
      { error: 'Failed to create surge override' },
      { status: 500 }
    );
  }
}