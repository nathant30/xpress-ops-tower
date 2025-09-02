import { NextRequest, NextResponse } from 'next/server';
import { 
  PricingProposalDTO, 
  CreatePricingProposalRequest,
  ComplianceValidationResponse,
  ComplianceIssue
} from '@/lib/pricing/pricingV4Schemas';
import { getDatabase } from '@/lib/database';
import { withAuthAndRateLimit } from '@/lib/auth';

// GET /api/v1/pricing/profiles/[id]/proposals - List proposals for profile
export const GET = withAuthAndRateLimit(async (
  request: NextRequest,
  user,
  { params }: { params: { id: string } }
) => {
  try {
    const profileId = parseInt(params.id);
    if (isNaN(profileId)) {
      return NextResponse.json({ error: 'Invalid profile ID' }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    const db = getDatabase();
    
    let query = `
      SELECT 
        id,
        profile_id as profileId,
        proposed_by as proposedBy,
        title,
        description,
        diff,
        compliance_result as complianceResult,
        regulator_required as regulatorRequired,
        regulator_filed as regulatorFiled,
        status,
        needs_approvals as needsApprovals,
        current_approvals as currentApprovals,
        created_at as createdAt,
        approved_by as approvedBy,
        approved_at as approvedAt,
        effective_at as effectiveAt
      FROM pricing_proposals
      WHERE profile_id = ?
    `;
    
    const params_db: any[] = [profileId];

    if (status) {
      query += ' AND status = ?';
      params_db.push(status);
    }

    query += ' ORDER BY created_at DESC';

    const proposals = await db.all(query, params_db);
    
    // Transform data for response
    const transformedProposals = proposals.map(proposal => ({
      ...proposal,
      diff: proposal.diff ? JSON.parse(proposal.diff) : {},
      complianceResult: proposal.complianceResult ? JSON.parse(proposal.complianceResult) : null,
      regulatorRequired: Boolean(proposal.regulatorRequired),
      regulatorFiled: Boolean(proposal.regulatorFiled),
      proposedAt: proposal.createdAt, // Use createdAt as proposedAt
    }));

    return NextResponse.json(transformedProposals);

  } catch (error) {
    console.error('Error fetching pricing proposals:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pricing proposals' },
      { status: 500 }
    );
  }
}, ['analytics:read']);

// POST /api/v1/pricing/profiles/[id]/proposals - Create new proposal
export const POST = withAuthAndRateLimit(async (
  request: NextRequest,
  user,
  { params }: { params: { id: string } }
) => {
  try {
    const userId = user.userId;

    const profileId = parseInt(params.id);
    if (isNaN(profileId)) {
      return NextResponse.json({ error: 'Invalid profile ID' }, { status: 400 });
    }

    const body = await request.json();
    const validatedData = CreatePricingProposalRequest.parse(body);
    
    const db = getDatabase();
    
    // Check if profile exists
    const profile = await db.get(
      'SELECT * FROM pricing_profiles_v4 WHERE id = ?',
      [profileId]
    );

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Run compliance validation on the proposed changes
    const complianceResult = await validateProposedChanges(profile, validatedData.diff);
    
    // Determine if regulator filing is required
    const regulatorRequired = determineRegulatorRequirement(validatedData.diff, complianceResult);
    
    // Calculate approval requirements
    const needsApprovals = regulatorRequired ? 3 : 2; // Extra approval if regulator filing needed

    // Generate proposal title from diff
    const proposalTitle = generateProposalTitle(validatedData.diff);

    const result = await db.run(`
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
      profileId,
      userId,
      proposalTitle,
      validatedData.comment || null,
      JSON.stringify(validatedData.diff),
      JSON.stringify(complianceResult),
      regulatorRequired ? 1 : 0,
      needsApprovals
    ]);

    if (!result.lastID) {
      throw new Error('Failed to create pricing proposal');
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
        new_value
      ) VALUES (?, ?, ?, 'proposal_created', 'proposal', ?, ?)
    `, [
      profileId,
      result.lastID,
      userId,
      result.lastID,
      JSON.stringify({
        diff: validatedData.diff,
        complianceResult,
        regulatorRequired
      })
    ]);

    // Fetch the created proposal
    const newProposal = await db.get(`
      SELECT 
        id,
        profile_id as profileId,
        proposed_by as proposedBy,
        title,
        description,
        diff,
        compliance_result as complianceResult,
        regulator_required as regulatorRequired,
        regulator_filed as regulatorFiled,
        status,
        needs_approvals as needsApprovals,
        current_approvals as currentApprovals,
        created_at as createdAt,
        approved_by as approvedBy,
        approved_at as approvedAt,
        effective_at as effectiveAt
      FROM pricing_proposals WHERE id = ?
    `, [result.lastID]);

    const transformedProposal = {
      ...newProposal,
      diff: newProposal.diff ? JSON.parse(newProposal.diff) : {},
      complianceResult: newProposal.complianceResult ? JSON.parse(newProposal.complianceResult) : null,
      regulatorRequired: Boolean(newProposal.regulatorRequired),
      regulatorFiled: Boolean(newProposal.regulatorFiled),
      proposedAt: newProposal.createdAt,
    };

    return NextResponse.json(transformedProposal, { status: 201 });

  } catch (error) {
    console.error('Error creating pricing proposal:', error);
    return NextResponse.json(
      { error: 'Failed to create pricing proposal' },
      { status: 500 }
    );
  }
}, ['bookings:write']);

// Helper function to validate proposed changes
async function validateProposedChanges(
  currentProfile: any, 
  diff: any
): Promise<ComplianceValidationResponse> {
  const issues: ComplianceIssue[] = [];
  
  // Calculate proposed values by merging diff with current profile
  const proposedProfile = { ...currentProfile, ...diff };
  
  // LTFRB/TWG compliance checks based on service type
  switch (currentProfile.service_key) {
    case 'tnvs':
      // TNVS specific caps
      if (proposedProfile.booking_fee > 15) {
        issues.push({
          code: 'TNVS_BOOKING_FEE_EXCEEDED',
          message: `TNVS booking fee ₱${proposedProfile.booking_fee} exceeds LTFRB maximum of ₱15`,
          severity: 'error',
          context: { proposedFee: proposedProfile.booking_fee, maxAllowed: 15 }
        });
      }
      break;
      
    case 'taxi':
      // Taxi specific caps
      if (proposedProfile.base_fare > 40) {
        issues.push({
          code: 'TAXI_BASE_FARE_EXCEEDED',
          message: `Taxi base fare ₱${proposedProfile.base_fare} exceeds LTFRB maximum of ₱40`,
          severity: 'error',
          context: { proposedFare: proposedProfile.base_fare, maxAllowed: 40 }
        });
      }
      break;
  }
  
  // Cross-service validation
  if (proposedProfile.per_km && proposedProfile.per_km > 20) {
    issues.push({
      code: 'PER_KM_HIGH_WARNING',
      message: `Per-km rate of ₱${proposedProfile.per_km} is unusually high and may require additional justification`,
      severity: 'warning',
      context: { proposedRate: proposedProfile.per_km }
    });
  }

  return {
    ok: issues.filter(i => i.severity === 'error').length === 0,
    warnings: issues.filter(i => i.severity === 'warning'),
    errors: issues.filter(i => i.severity === 'error'),
  };
}

// Helper function to determine if regulator filing is required
function determineRegulatorRequirement(diff: any, complianceResult: ComplianceValidationResponse): boolean {
  // Require regulator filing if:
  // 1. Any compliance errors exist
  // 2. Major fare component changes (>20% change)
  // 3. New service introduction
  
  if (complianceResult.errors.length > 0) {
    return true;
  }
  
  // Check for significant changes that would require filing
  const significantChanges = [
    'baseFare', 'perKm', 'perMinute', 'bookingFee'
  ];
  
  for (const change of significantChanges) {
    if (diff[change] !== undefined) {
      return true; // Any fare component change requires filing
    }
  }
  
  return false;
}

// Helper function to generate proposal title from diff
function generateProposalTitle(diff: any): string {
  const changes = Object.keys(diff);
  
  if (changes.length === 1) {
    const change = changes[0];
    switch (change) {
      case 'baseFare':
        return `Update Base Fare to ₱${diff[change]}`;
      case 'perKm':
        return `Update Per-KM Rate to ₱${diff[change]}`;
      case 'perMinute':
        return `Update Per-Minute Rate to ₱${diff[change]}`;
      case 'bookingFee':
        return `Update Booking Fee to ₱${diff[change]}`;
      default:
        return `Update ${change.replace(/([A-Z])/g, ' $1').toLowerCase()}`;
    }
  }
  
  return `Update ${changes.length} pricing components`;
}