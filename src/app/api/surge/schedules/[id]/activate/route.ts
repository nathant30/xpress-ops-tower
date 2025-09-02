import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';
import { withAuthAndRateLimit } from '@/lib/auth';

// POST /api/surge/schedules/[id]/activate - Manually activate schedule (cron job endpoint)
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const scheduleId = parseInt(params.id);
    if (isNaN(scheduleId)) {
      return NextResponse.json({ error: 'Invalid schedule ID' }, { status: 400 });
    }

    const db = getDatabase();
    
    // Get the schedule
    const schedule = await db.get(`
      SELECT 
        id,
        region_id,
        service_key,
        name,
        multiplier,
        additive_fee,
        h3_set,
        starts_at,
        ends_at,
        status
      FROM surge_schedules 
      WHERE id = ?
    `, [scheduleId]);

    if (!schedule) {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 });
    }

    if (schedule.status !== 'approved') {
      return NextResponse.json(
        { error: 'Schedule is not approved for activation' },
        { status: 400 }
      );
    }

    // Check if it's time to activate
    const now = new Date();
    const startsAt = new Date(schedule.starts_at);
    
    if (now < startsAt) {
      return NextResponse.json(
        { error: 'Schedule is not yet ready for activation' },
        { status: 400 }
      );
    }

    // Begin transaction
    await db.run('BEGIN TRANSACTION');

    try {
      // Activate the schedule by creating hex state entries
      if (schedule.h3_set) {
        // Specific hexes
        const h3Set = JSON.parse(schedule.h3_set);
        
        for (const h3Index of h3Set) {
          await db.run(`
            INSERT OR REPLACE INTO surge_hex_state (
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
            ) VALUES (?, ?, ?, 8, ?, ?, 'scheduled', null, ?, ?, datetime('now'))
          `, [
            schedule.region_id,
            schedule.service_key,
            h3Index,
            schedule.multiplier,
            schedule.additive_fee,
            schedule.starts_at,
            schedule.ends_at
          ]);
        }
      } else {
        // Region-wide (exclude taxi service as per business rules)
        if (schedule.service_key !== 'taxi') {
          // Get all active hexes in region for this service
          const regionHexes = await db.all(`
            SELECT DISTINCT h3_index 
            FROM surge_hex_meta 
            WHERE region_id = ?
            LIMIT 1000
          `, [schedule.region_id]);

          for (const hexRow of regionHexes) {
            await db.run(`
              INSERT OR REPLACE INTO surge_hex_state (
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
              ) VALUES (?, ?, ?, 8, ?, ?, 'scheduled', null, ?, ?, datetime('now'))
            `, [
              schedule.region_id,
              schedule.service_key,
              hexRow.h3_index,
              schedule.multiplier,
              schedule.additive_fee,
              schedule.starts_at,
              schedule.ends_at
            ]);
          }
        }
      }

      // Update schedule status
      await db.run(
        'UPDATE surge_schedules SET status = ? WHERE id = ?',
        ['active', scheduleId]
      );

      // Log the activation
      await db.run(`
        INSERT INTO surge_audit_log (
          region_id,
          service_key,
          user_id,
          action,
          old_value,
          new_value
        ) VALUES (?, ?, ?, 'schedule_activate', ?, ?)
      `, [
        schedule.region_id,
        schedule.service_key,
        userId,
        JSON.stringify({ status: 'approved' }),
        JSON.stringify({ 
          status: 'active',
          scheduleId,
          activatedAt: now.toISOString()
        })
      ]);

      await db.run('COMMIT');

      return NextResponse.json({
        message: 'Schedule activated successfully',
        scheduleId,
        activatedAt: now.toISOString()
      });

    } catch (error) {
      await db.run('ROLLBACK');
      throw error;
    }

  } catch (error) {
    console.error('Error activating surge schedule:', error);
    return NextResponse.json(
      { error: 'Failed to activate surge schedule' },
      { status: 500 }
    );
  }
}