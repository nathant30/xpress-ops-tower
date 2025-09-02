import { NextRequest, NextResponse } from 'next/server';
import { ActivateSurgeRequest, ActivateSurgeResponse } from '@/lib/pricing/surgeSchemas';
import { getDatabase } from '@/lib/database';
import { withAuthAndRateLimit } from '@/lib/auth';

// POST /api/surge/profiles/[id]/activate - Activate surge profile
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const profileId = parseInt(params.id);
    if (isNaN(profileId)) {
      return NextResponse.json({ error: 'Invalid profile ID' }, { status: 400 });
    }

    const body = await request.json();
    const parsedRequest = ActivateSurgeRequest.parse(body);
    
    const db = getDatabase();
    
    // Check if profile exists and is not already active
    const profile = await db.get(`
      SELECT id, name, region_id, service_key, status, max_multiplier 
      FROM surge_profiles 
      WHERE id = ?
    `, [profileId]);

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    if (profile.status === 'active') {
      return NextResponse.json(
        { error: 'Profile is already active' },
        { status: 400 }
      );
    }

    // Check if activation requires approval (max_multiplier > 1.5 or emergency conditions)
    const requiresApproval = profile.max_multiplier > 1.5;
    const needsApprovals = requiresApproval ? 2 : 0;

    // Create pricing activation request
    const activationResult = await db.run(`
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
      ) VALUES (?, ?, 'surge_profile_activation', ?, ?, ?, ?, ?, ?, datetime('now'))
    `, [
      profile.region_id,
      profile.service_key,
      `Activate surge profile "${profile.name}" (max multiplier: ${profile.max_multiplier})`,
      userId,
      parsedRequest.effectiveAt,
      requiresApproval ? 'pending' : 'approved',
      needsApprovals,
      parsedRequest.comment || null
    ]);

    if (!activationResult.lastID) {
      throw new Error('Failed to create activation request');
    }

    // If no approval needed, activate immediately
    if (!requiresApproval) {
      await db.run(
        'UPDATE surge_profiles SET status = ?, updated_by = ?, updated_at = datetime(?) WHERE id = ?',
        ['active', userId, parsedRequest.effectiveAt, profileId]
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
        ) VALUES (?, ?, ?, 'profile_activation', ?, ?)
      `, [
        profile.region_id,
        profile.service_key,
        userId,
        'profile_activation',
        JSON.stringify({ status: profile.status }),
        JSON.stringify({ status: 'active', profileId, effectiveAt: parsedRequest.effectiveAt })
      ]);
    }

    const response: ActivateSurgeResponse = {
      requestId: activationResult.lastID,
      status: requiresApproval ? 'pending' : 'approved',
      needsApprovals,
      emergencyBlocked: false
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error activating surge profile:', error);
    return NextResponse.json(
      { error: 'Failed to activate surge profile' },
      { status: 500 }
    );
  }
}