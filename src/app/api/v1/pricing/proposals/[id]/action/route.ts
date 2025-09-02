import { NextRequest, NextResponse } from 'next/server';
import { 
  ActionPricingProposalRequest,
  ActionPricingProposalResponse
} from '@/lib/pricing/pricingV4Schemas';
import { getDatabase } from '@/lib/database';
import { withAuthAndRateLimit } from '@/lib/auth';

// POST /api/v1/pricing/proposals/[id]/action - Approve or reject proposal
export const POST = withAuthAndRateLimit(async (
  request: NextRequest,
  user,
  { params }: { params: { id: string } }
) => {
  try {
    const userId = user.userId;

    const proposalId = parseInt(params.id);
    if (isNaN(proposalId)) {
      return NextResponse.json({ error: 'Invalid proposal ID' }, { status: 400 });
    }

    const body = await request.json();
    const validatedData = ActionPricingProposalRequest.parse(body);
    
    const db = getDatabase();
    
    // Get the proposal with profile data
    const proposal = await db.get(`
      SELECT 
        p.*,
        pr.service_key,
        pr.region_id,
        pr.name as profile_name
      FROM pricing_proposals p
      JOIN pricing_profiles_v4 pr ON p.profile_id = pr.id
      WHERE p.id = ?
    `, [proposalId]);

    if (!proposal) {
      return NextResponse.json({ error: 'Proposal not found' }, { status: 404 });
    }

    if (proposal.status !== 'pending') {
      return NextResponse.json({ 
        error: `Proposal is already ${proposal.status}` 
      }, { status: 400 });
    }

    // Check user permissions for approval
    // TODO: Implement role-based approval permissions
    
    // Begin transaction
    await db.run('BEGIN TRANSACTION');

    try {
      let newStatus = validatedData.decision;
      let needsMoreApprovals = false;

      if (validatedData.decision === 'approved') {
        // Increment approval count
        const newApprovalCount = proposal.current_approvals + 1;
        
        if (newApprovalCount >= proposal.needs_approvals) {
          // Fully approved - apply changes to profile
          newStatus = 'approved';
          await applyProposalToProfile(db, proposal.profile_id, JSON.parse(proposal.diff), userId);
        } else {
          // Still needs more approvals
          newStatus = 'pending';
          needsMoreApprovals = true;
        }

        // Update approval count
        await db.run(`
          UPDATE pricing_proposals 
          SET current_approvals = ?,
              status = ?,
              ${newStatus === 'approved' ? 'approved_by = ?, approved_at = datetime(\'now\'),' : ''}
              effective_at = CASE 
                WHEN ? = 'approved' THEN datetime('now') 
                ELSE effective_at 
              END
          WHERE id = ?
        `, [
          newApprovalCount,
          newStatus,
          ...(newStatus === 'approved' ? [userId] : []),
          newStatus,
          proposalId
        ]);

        // Record individual approval
        await db.run(`
          INSERT INTO pricing_proposal_approvals (
            proposal_id,
            approver_id,
            approver_role,
            decision,
            comment,
            approval_level
          ) VALUES (?, ?, 'pricing_strategist', 'approved', ?, ?)
        `, [
          proposalId,
          userId,
          validatedData.comment || null,
          newApprovalCount
        ]);

      } else {
        // Rejected
        await db.run(`
          UPDATE pricing_proposals 
          SET status = 'rejected',
              approved_by = ?,
              approved_at = datetime('now')
          WHERE id = ?
        `, [userId, proposalId]);

        // Record rejection
        await db.run(`
          INSERT INTO pricing_proposal_approvals (
            proposal_id,
            approver_id,
            approver_role,
            decision,
            comment,
            approval_level
          ) VALUES (?, ?, 'pricing_strategist', 'rejected', ?, ?)
        `, [
          proposalId,
          userId,
          validatedData.comment || null,
          proposal.current_approvals + 1
        ]);
      }

      // Create audit log entry
      await db.run(`
        INSERT INTO pricing_audit_v4 (
          profile_id,
          proposal_id,
          user_id,
          action,
          entity_type,
          entity_id,
          old_value,
          new_value
        ) VALUES (?, ?, ?, 'proposal_action', 'proposal', ?, ?, ?)
      `, [
        proposal.profile_id,
        proposalId,
        userId,
        proposalId,
        JSON.stringify({ status: proposal.status, currentApprovals: proposal.current_approvals }),
        JSON.stringify({ 
          status: newStatus, 
          currentApprovals: proposal.current_approvals + (validatedData.decision === 'approved' ? 1 : 0),
          decision: validatedData.decision,
          comment: validatedData.comment
        })
      ]);

      await db.run('COMMIT');

      const response: ActionPricingProposalResponse = {
        proposalId,
        newStatus: newStatus as any,
        actedBy: userId,
        actedAt: new Date().toISOString(),
      };

      return NextResponse.json(response);

    } catch (error) {
      await db.run('ROLLBACK');
      throw error;
    }

  } catch (error) {
    console.error('Error processing proposal action:', error);
    return NextResponse.json(
      { error: 'Failed to process proposal action' },
      { status: 500 }
    );
  }
}, ['bookings:write']);

// Helper function to apply approved proposal changes to profile
async function applyProposalToProfile(
  db: any,
  profileId: number,
  diff: any,
  userId: string
) {
  // Build dynamic update query based on diff
  const updateFields: string[] = [];
  const updateParams: any[] = [];

  Object.entries(diff).forEach(([key, value]) => {
    switch (key) {
      case 'name':
        updateFields.push('name = ?');
        updateParams.push(value);
        break;
      case 'baseFare':
        updateFields.push('base_fare = ?');
        updateParams.push(value);
        break;
      case 'baseIncludedKm':
        updateFields.push('base_included_km = ?');
        updateParams.push(value);
        break;
      case 'perKm':
        updateFields.push('per_km = ?');
        updateParams.push(value);
        break;
      case 'perMinute':
        updateFields.push('per_minute = ?');
        updateParams.push(value);
        break;
      case 'bookingFee':
        updateFields.push('booking_fee = ?');
        updateParams.push(value);
        break;
      case 'airportSurcharge':
        updateFields.push('airport_surcharge = ?');
        updateParams.push(value);
        break;
      case 'poiSurcharge':
        updateFields.push('poi_surcharge = ?');
        updateParams.push(value);
        break;
      case 'tollPassthrough':
        updateFields.push('toll_passthrough = ?');
        updateParams.push(value ? 1 : 0);
        break;
      case 'description':
        updateFields.push('description = ?');
        updateParams.push(value ? JSON.stringify(value) : null);
        break;
      case 'earningsRouting':
        updateFields.push('earnings_routing = ?');
        updateParams.push(value);
        break;
      case 'driverCommissionPct':
        updateFields.push('driver_commission_pct = ?');
        updateParams.push(value);
        break;
      case 'fleetCommissionPct':
        updateFields.push('fleet_commission_pct = ?');
        updateParams.push(value);
        break;
    }
  });

  if (updateFields.length === 0) {
    return; // No changes to apply
  }

  // Add updated metadata
  updateFields.push('updated_by = ?', 'updated_at = datetime(\'now\')');
  updateParams.push(userId, profileId);

  const updateQuery = `
    UPDATE pricing_profiles_v4 
    SET ${updateFields.join(', ')}
    WHERE id = ?
  `;

  await db.run(updateQuery, updateParams);

  // Create profile update audit log
  await db.run(`
    INSERT INTO pricing_audit_v4 (
      profile_id,
      user_id,
      action,
      entity_type,
      entity_id,
      new_value
    ) VALUES (?, ?, 'profile_updated_via_proposal', 'profile', ?, ?)
  `, [
    profileId,
    userId,
    profileId,
    JSON.stringify(diff)
  ]);
}