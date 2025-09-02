import { NextRequest, NextResponse } from 'next/server';
import { 
  RegulatorPackDTO
} from '@/lib/pricing/pricingV4Schemas';
import { getDatabase } from '@/lib/database';
import { withAuthAndRateLimit } from '@/lib/auth';

// GET /api/v1/pricing/profiles/[id]/regulator-pack - Generate regulator filing package
export const GET = withAuthAndRateLimit(async (
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

    const { searchParams } = new URL(request.url);
    const regulatorType = searchParams.get('type') || 'LTFRB';

    const db = getDatabase();
    
    // Get profile with all related data
    const profile = await db.get(`
      SELECT * FROM pricing_profiles_v4 WHERE id = ?
    `, [profileId]);

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Get audit trail
    const auditTrail = await db.all(`
      SELECT 
        id,
        user_id as userId,
        action,
        entity_type as entityType,
        old_value as oldValue,
        new_value as newValue,
        created_at as createdAt
      FROM pricing_audit_v4
      WHERE profile_id = ?
      ORDER BY created_at ASC
    `, [profileId]);

    // Get proposals and approvals if any
    const proposals = await db.all(`
      SELECT 
        p.*,
        GROUP_CONCAT(
          pa.approver_id || ':' || pa.decision || ':' || pa.created_at, 
          '|'
        ) as approvals
      FROM pricing_proposals p
      LEFT JOIN pricing_proposal_approvals pa ON p.id = pa.proposal_id
      WHERE p.profile_id = ?
      GROUP BY p.id
      ORDER BY p.created_at DESC
    `, [profileId]);

    // Generate regulator package
    const regulatorPack = await generateRegulatorPackage(
      profile, 
      auditTrail, 
      proposals, 
      regulatorType,
      userId
    );

    // Store the filing record
    const filingResult = await db.run(`
      INSERT INTO pricing_regulator_filings (
        profile_id,
        regulator_type,
        filing_reference,
        filing_date,
        filing_package,
        created_by
      ) VALUES (?, ?, ?, datetime('now'), ?, ?)
    `, [
      profileId,
      regulatorType,
      `${regulatorType}-${profileId}-${Date.now()}`,
      JSON.stringify(regulatorPack),
      userId
    ]);

    // Create audit log
    await db.run(`
      INSERT INTO pricing_audit_v4 (
        profile_id,
        user_id,
        action,
        entity_type,
        entity_id,
        new_value
      ) VALUES (?, ?, 'regulator_pack_generated', 'profile', ?, ?)
    `, [
      profileId,
      userId,
      profileId,
      JSON.stringify({
        regulatorType,
        filingId: filingResult.lastID,
        artifactCount: regulatorPack.artifacts.length
      })
    ]);

    const response: RegulatorPackDTO = {
      profileId,
      generatedAt: new Date().toISOString(),
      regulatorStatus: profile.regulator_status || 'draft',
      regulatorRef: profile.regulator_ref,
      artifacts: regulatorPack.artifacts
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error generating regulator pack:', error);
    return NextResponse.json(
      { error: 'Failed to generate regulator pack' },
      { status: 500 }
    );
  }
}, ['analytics:export']);

// Generate comprehensive regulator filing package
async function generateRegulatorPackage(
  profile: any,
  auditTrail: any[],
  proposals: any[],
  regulatorType: string,
  userId: string
) {
  const artifacts = [];
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

  // 1. Fare Table CSV
  const fareTableCSV = generateFareTableCSV(profile);
  artifacts.push({
    filename: `fare-table-${profile.service_key}-${timestamp}.csv`,
    url: `/tmp/regulator-exports/fare-table-${profile.id}-${timestamp}.csv`,
    type: 'fare_table_csv' as const
  });

  // 2. Fare Table PDF (formatted)
  const fareTablePDF = generateFareTablePDF(profile, regulatorType);
  artifacts.push({
    filename: `fare-table-${profile.service_key}-${timestamp}.pdf`,
    url: `/tmp/regulator-exports/fare-table-${profile.id}-${timestamp}.pdf`,
    type: 'fare_table_pdf' as const
  });

  // 3. Audit Trail JSON
  const auditJSON = generateAuditJSON(profile, auditTrail, proposals);
  artifacts.push({
    filename: `audit-trail-${profile.service_key}-${timestamp}.json`,
    url: `/tmp/regulator-exports/audit-trail-${profile.id}-${timestamp}.json`,
    type: 'audit_json' as const
  });

  // 4. Approval Chain PDF
  if (proposals.length > 0) {
    const approvalPDF = generateApprovalChainPDF(profile, proposals);
    artifacts.push({
      filename: `approval-chain-${profile.service_key}-${timestamp}.pdf`,
      url: `/tmp/regulator-exports/approval-chain-${profile.id}-${timestamp}.pdf`,
      type: 'approval_chain_pdf' as const
    });
  }

  return { artifacts };
}

// Generate fare table CSV for regulator submission
function generateFareTableCSV(profile: any): string {
  const rows = [
    // CSV Header
    ['Service Type', 'Component', 'Rate', 'Unit', 'Description'],
    
    // Service info
    [profile.service_key.toUpperCase(), 'Base Fare', profile.base_fare || 0, 'PHP', 'Initial fare upon pickup'],
    
    // Distance component
    [profile.service_key.toUpperCase(), 'Per Kilometer', profile.per_km || 0, 'PHP/km', 'Rate per kilometer traveled'],
    
    // Time component
    [profile.service_key.toUpperCase(), 'Per Minute', profile.per_minute || 0, 'PHP/min', 'Rate per minute (if applicable)'],
    
    // Booking fee
    [profile.service_key.toUpperCase(), 'Booking Fee', profile.booking_fee || 0, 'PHP', 'Platform booking fee'],
    
    // Surcharges
    [profile.service_key.toUpperCase(), 'Airport Surcharge', profile.airport_surcharge || 0, 'PHP', 'Additional fee for airport trips'],
    [profile.service_key.toUpperCase(), 'POI Surcharge', profile.poi_surcharge || 0, 'PHP', 'Point of interest surcharge'],
  ];

  return rows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
}

// Generate formatted fare table PDF data structure
function generateFareTablePDF(profile: any, regulatorType: string) {
  return {
    title: `${regulatorType} Fare Filing - ${profile.service_key.toUpperCase()}`,
    profileName: profile.name,
    serviceType: profile.service_key,
    filingDate: new Date().toISOString(),
    
    fareStructure: {
      baseFare: {
        amount: profile.base_fare || 0,
        description: 'Base fare charged upon pickup'
      },
      distanceRate: {
        amount: profile.per_km || 0,
        unit: 'per kilometer',
        description: 'Rate charged for distance traveled'
      },
      timeRate: {
        amount: profile.per_minute || 0,
        unit: 'per minute',
        description: 'Rate charged for time (if applicable)'
      },
      bookingFee: {
        amount: profile.booking_fee || 0,
        description: 'Platform booking fee'
      },
      surcharges: {
        airport: profile.airport_surcharge || 0,
        poi: profile.poi_surcharge || 0
      }
    },
    
    compliance: {
      regulatorType,
      filedBy: profile.created_by,
      lastUpdated: profile.updated_at,
      status: profile.regulator_status || 'draft'
    },
    
    calculations: {
      sampleFares: generateSampleFareCalculations(profile)
    }
  };
}

// Generate audit trail JSON for transparency
function generateAuditJSON(profile: any, auditTrail: any[], proposals: any[]) {
  return {
    profile: {
      id: profile.id,
      name: profile.name,
      serviceType: profile.service_key,
      currentStatus: profile.status,
      regulatorStatus: profile.regulator_status,
      createdAt: profile.created_at,
      lastUpdated: profile.updated_at
    },
    
    auditTrail: auditTrail.map(entry => ({
      id: entry.id,
      timestamp: entry.createdAt,
      userId: entry.userId,
      action: entry.action,
      entityType: entry.entityType,
      changes: {
        from: entry.oldValue ? JSON.parse(entry.oldValue) : null,
        to: entry.newValue ? JSON.parse(entry.newValue) : null
      }
    })),
    
    proposals: proposals.map(proposal => ({
      id: proposal.id,
      title: proposal.title,
      proposedBy: proposal.proposed_by,
      proposedAt: proposal.created_at,
      status: proposal.status,
      changes: JSON.parse(proposal.diff),
      complianceResult: proposal.compliance_result ? JSON.parse(proposal.compliance_result) : null,
      approvals: proposal.approvals ? proposal.approvals.split('|').map((approval: string) => {
        const [userId, decision, timestamp] = approval.split(':');
        return { userId, decision, timestamp };
      }) : []
    })),
    
    generatedAt: new Date().toISOString(),
    generatedFor: 'regulator_filing'
  };
}

// Generate approval chain PDF data
function generateApprovalChainPDF(profile: any, proposals: any[]) {
  return {
    title: 'Pricing Approval Chain',
    profileName: profile.name,
    serviceType: profile.service_key,
    
    approvalWorkflow: {
      requiredApprovals: 2,
      approvalLevels: [
        'Regional Manager',
        'HQ Pricing Strategist',
        'Executive Approval (if required)'
      ]
    },
    
    proposalHistory: proposals.map(proposal => ({
      proposalId: proposal.id,
      title: proposal.title,
      proposedBy: proposal.proposed_by,
      proposedAt: proposal.created_at,
      status: proposal.status,
      
      approvalChain: proposal.approvals ? proposal.approvals.split('|').map((approval: string, index: number) => {
        const [userId, decision, timestamp] = approval.split(':');
        return {
          level: index + 1,
          approver: userId,
          decision,
          timestamp,
          role: index === 0 ? 'Regional Manager' : 'HQ Strategist'
        };
      }) : [],
      
      complianceChecks: proposal.compliance_result ? JSON.parse(proposal.compliance_result) : null
    })),
    
    currentStatus: {
      profileStatus: profile.status,
      regulatorStatus: profile.regulator_status,
      lastFiled: profile.regulator_filed_at,
      expiresAt: profile.regulator_expires_at
    },
    
    generatedAt: new Date().toISOString()
  };
}

// Generate sample fare calculations for regulator review
function generateSampleFareCalculations(profile: any) {
  const samples = [
    { distance: 5, time: 15, description: 'Short trip (5km, 15min)' },
    { distance: 10, time: 25, description: 'Medium trip (10km, 25min)' },
    { distance: 20, time: 45, description: 'Long trip (20km, 45min)' }
  ];

  return samples.map(sample => {
    let fare = profile.base_fare || 0;
    fare += (profile.per_km || 0) * sample.distance;
    fare += (profile.per_minute || 0) * sample.time;
    fare += profile.booking_fee || 0;

    return {
      ...sample,
      calculation: {
        baseFare: profile.base_fare || 0,
        distanceFee: (profile.per_km || 0) * sample.distance,
        timeFee: (profile.per_minute || 0) * sample.time,
        bookingFee: profile.booking_fee || 0,
        totalFare: fare
      }
    };
  });
}