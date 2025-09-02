import { NextRequest, NextResponse } from 'next/server';
import { 
  ActionPricingRecommendationRequest,
  ActionPricingRecommendationResponse
} from '@/lib/pricing/pricingV4Schemas';
import { getDatabase } from '@/lib/database';
import { withAuthAndRateLimit } from '@/lib/auth';

// POST /api/v1/pricing/recommendations/[id]/action - Accept or reject recommendation
export const POST = withAuthAndRateLimit(async (
  request: NextRequest,
  user,
  { params }: { params: { id: string } }
) => {
  try {
    const userId = user.userId;

    const recommendationId = parseInt(params.id);
    if (isNaN(recommendationId)) {
      return NextResponse.json({ error: 'Invalid recommendation ID' }, { status: 400 });
    }

    const body = await request.json();
    const validatedData = ActionPricingRecommendationRequest.parse(body);
    
    const db = getDatabase();
    
    // Get the recommendation
    const recommendation = await db.get(`
      SELECT 
        r.*,
        p.service_key,
        p.region_id,
        p.name as profile_name
      FROM pricing_recommendations r
      JOIN pricing_profiles_v4 p ON r.profile_id = p.id
      WHERE r.id = ?
    `, [recommendationId]);

    if (!recommendation) {
      return NextResponse.json({ error: 'Recommendation not found' }, { status: 404 });
    }

    if (recommendation.status !== 'pending') {
      return NextResponse.json({ 
        error: `Recommendation is already ${recommendation.status}` 
      }, { status: 400 });
    }

    const newStatus = validatedData.decision === 'accepted' ? 'accepted' : 'rejected';
    const now = new Date().toISOString();

    // Update recommendation status
    await db.run(`
      UPDATE pricing_recommendations 
      SET status = ?,
          actioned_by = ?,
          actioned_at = datetime('now')
      WHERE id = ?
    `, [newStatus, userId, recommendationId]);

    // If accepted, create a proposal to implement the recommendation
    if (validatedData.decision === 'accepted') {
      await createProposalFromRecommendation(db, recommendation, userId, validatedData.justification);
    }

    // Create audit log entry
    await db.run(`
      INSERT INTO pricing_audit_v4 (
        profile_id,
        user_id,
        action,
        entity_type,
        entity_id,
        old_value,
        new_value
      ) VALUES (?, ?, 'recommendation_action', 'recommendation', ?, ?, ?)
    `, [
      recommendation.profile_id,
      userId,
      recommendationId,
      JSON.stringify({ status: recommendation.status }),
      JSON.stringify({ 
        status: newStatus, 
        decision: validatedData.decision,
        justification: validatedData.justification
      })
    ]);

    const response: ActionPricingRecommendationResponse = {
      recommendationId,
      newStatus: newStatus as any,
      actionedBy: userId,
      actionedAt: now,
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error processing recommendation action:', error);
    return NextResponse.json(
      { error: 'Failed to process recommendation action' },
      { status: 500 }
    );
  }
}, ['bookings:write']);

// Helper function to create proposal from accepted recommendation
async function createProposalFromRecommendation(
  db: any,
  recommendation: any,
  userId: string,
  justification?: string
) {
  const details = JSON.parse(recommendation.details);
  const diff: any = {};

  // Convert recommendation to proposal diff based on type
  switch (recommendation.recommendation_type) {
    case 'base_fare':
      if (details.recommendedValue) {
        diff.baseFare = details.recommendedValue;
      }
      break;
    case 'per_km':
      if (details.recommendedValue) {
        diff.perKm = details.recommendedValue;
      }
      break;
    case 'per_minute':
      if (details.recommendedValue) {
        diff.perMinute = details.recommendedValue;
      }
      break;
    case 'booking_fee':
      if (details.recommendedValue) {
        diff.bookingFee = details.recommendedValue;
      }
      break;
  }

  if (Object.keys(diff).length === 0) {
    return; // No actionable changes to propose
  }

  // Create the proposal
  const proposalTitle = `AI Recommendation: ${recommendation.message}`;
  const proposalDescription = `
Implementing AI recommendation from ${recommendation.created_at}.
Original confidence: ${(recommendation.confidence * 100).toFixed(1)}%

${justification ? `User justification: ${justification}` : ''}

Expected impact: ${JSON.stringify(details.expectedImpact, null, 2)}
  `;

  await db.run(`
    INSERT INTO pricing_proposals (
      profile_id,
      proposed_by,
      title,
      description,
      diff,
      compliance_result,
      regulator_required,
      status,
      needs_approvals
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?)
  `, [
    recommendation.profile_id,
    userId,
    proposalTitle,
    proposalDescription,
    JSON.stringify(diff),
    JSON.stringify({ ok: true, warnings: [], errors: [] }), // AI rec pre-validated
    recommendation.regulator_impact ? 1 : 0,
    recommendation.regulator_impact ? 3 : 2
  ]);
}