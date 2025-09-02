import { NextRequest, NextResponse } from 'next/server';
import { 
  PricingRecommendationDTO,
  ActionPricingRecommendationRequest,
  ActionPricingRecommendationResponse
} from '@/lib/pricing/pricingV4Schemas';
import { getDatabase } from '@/lib/database';
import { withAuthAndRateLimit } from '@/lib/auth';

// GET /api/v1/pricing/profiles/[id]/recommendations - Get AI recommendations
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
        recommendation_type as recommendationType,
        message,
        details,
        confidence,
        compliance_flag as complianceFlag,
        regulator_impact as regulatorImpact,
        status,
        created_at as createdAt,
        actioned_by as actionedBy,
        actioned_at as actionedAt
      FROM pricing_recommendations
      WHERE profile_id = ?
    `;
    
    const params_db: any[] = [profileId];

    if (status) {
      query += ' AND status = ?';
      params_db.push(status);
    }

    query += ' ORDER BY created_at DESC';

    const recommendations = await db.all(query, params_db);
    
    // Transform data for response
    const transformedRecommendations = recommendations.map(rec => ({
      ...rec,
      details: rec.details ? JSON.parse(rec.details) : null,
      complianceFlag: Boolean(rec.complianceFlag),
      regulatorImpact: Boolean(rec.regulatorImpact),
    }));

    return NextResponse.json(transformedRecommendations);

  } catch (error) {
    console.error('Error fetching pricing recommendations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pricing recommendations' },
      { status: 500 }
    );
  }
}, ['analytics:read']);

// POST /api/v1/pricing/profiles/[id]/recommendations:generate - Generate AI recommendations
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

    const db = getDatabase();
    
    // Get profile with recent forecasts
    const profile = await db.get(`
      SELECT * FROM pricing_profiles_v4 WHERE id = ?
    `, [profileId]);

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Get recent forecasts for recommendation context
    const recentForecasts = await db.all(`
      SELECT * FROM pricing_forecasts 
      WHERE profile_id = ? 
      ORDER BY generated_at DESC 
      LIMIT 10
    `, [profileId]);

    // Generate AI recommendations
    const recommendations = await generateAIRecommendations(profile, recentForecasts);
    
    const createdRecommendations: PricingRecommendationDTO[] = [];

    // Mark existing recommendations as superseded
    await db.run(`
      UPDATE pricing_recommendations 
      SET status = 'superseded' 
      WHERE profile_id = ? AND status = 'pending'
    `, [profileId]);

    for (const rec of recommendations) {
      const result = await db.run(`
        INSERT INTO pricing_recommendations (
          profile_id,
          recommendation_type,
          message,
          details,
          confidence,
          compliance_flag,
          regulator_impact,
          status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')
      `, [
        profileId,
        rec.recommendationType,
        rec.message,
        JSON.stringify(rec.details),
        rec.confidence,
        rec.complianceFlag ? 1 : 0,
        rec.regulatorImpact ? 1 : 0
      ]);

      if (result.lastID) {
        const newRec = await db.get(`
          SELECT 
            id,
            profile_id as profileId,
            recommendation_type as recommendationType,
            message,
            details,
            confidence,
            compliance_flag as complianceFlag,
            regulator_impact as regulatorImpact,
            status,
            created_at as createdAt,
            actioned_by as actionedBy,
            actioned_at as actionedAt
          FROM pricing_recommendations WHERE id = ?
        `, [result.lastID]);

        createdRecommendations.push({
          ...newRec,
          details: JSON.parse(newRec.details),
          complianceFlag: Boolean(newRec.complianceFlag),
          regulatorImpact: Boolean(newRec.regulatorImpact),
        });
      }
    }

    // Update profile with latest recommendations summary
    const recSummary = {
      lastGenerated: new Date().toISOString(),
      count: recommendations.length,
      highConfidenceCount: recommendations.filter(r => r.confidence > 0.8).length,
      complianceFlags: recommendations.filter(r => r.complianceFlag).length
    };

    await db.run(`
      UPDATE pricing_profiles_v4 
      SET ai_last_recommendations = ?,
          updated_at = datetime('now'),
          updated_by = ?
      WHERE id = ?
    `, [
      JSON.stringify(recSummary),
      userId,
      profileId
    ]);

    // Create audit log entry
    await db.run(`
      INSERT INTO pricing_audit_v4 (
        profile_id,
        user_id,
        action,
        entity_type,
        entity_id,
        new_value
      ) VALUES (?, ?, 'recommendations_generated', 'recommendation', ?, ?)
    `, [
      profileId,
      userId,
      profileId,
      JSON.stringify({
        recommendationCount: recommendations.length,
        summary: recSummary
      })
    ]);

    return NextResponse.json(createdRecommendations, { status: 201 });

  } catch (error) {
    console.error('Error generating pricing recommendations:', error);
    return NextResponse.json(
      { error: 'Failed to generate pricing recommendations' },
      { status: 500 }
    );
  }
}, ['analytics:write']);

// AI recommendation generation logic
async function generateAIRecommendations(profile: any, forecasts: any[]) {
  const recommendations: any[] = [];
  
  // Market benchmarking recommendations
  const marketBenchmark = getMarketBenchmark(profile.service_key);
  
  // Base fare optimization
  if (profile.base_fare) {
    const baseGap = profile.base_fare - marketBenchmark.baseFare;
    if (Math.abs(baseGap) > marketBenchmark.baseFare * 0.1) { // >10% difference
      recommendations.push({
        recommendationType: 'base_fare',
        message: baseGap > 0 
          ? `Consider reducing base fare by ₱${Math.abs(baseGap).toFixed(2)} to align with market`
          : `Opportunity to increase base fare by ₱${Math.abs(baseGap).toFixed(2)} based on market conditions`,
        details: {
          currentValue: profile.base_fare,
          recommendedValue: marketBenchmark.baseFare,
          marketGap: baseGap,
          expectedImpact: {
            demand: baseGap > 0 ? '+5-8%' : '-3-5%',
            revenue: baseGap > 0 ? '+2-4%' : '+8-12%'
          }
        },
        confidence: 0.75,
        complianceFlag: false,
        regulatorImpact: Math.abs(baseGap) > 5 // Large changes need regulator approval
      });
    }
  }

  // Per-km rate optimization
  if (profile.per_km) {
    const perKmGap = profile.per_km - marketBenchmark.perKm;
    if (Math.abs(perKmGap) > marketBenchmark.perKm * 0.15) { // >15% difference
      recommendations.push({
        recommendationType: 'per_km',
        message: perKmGap > 0
          ? `Per-km rate is ${((perKmGap/marketBenchmark.perKm)*100).toFixed(1)}% above market average`
          : `Consider increasing per-km rate to capture more value on longer trips`,
        details: {
          currentValue: profile.per_km,
          recommendedValue: marketBenchmark.perKm,
          marketGap: perKmGap,
          expectedImpact: {
            shortTrips: perKmGap > 0 ? 'Minimal impact' : 'Slight increase',
            longTrips: perKmGap > 0 ? 'May lose competitiveness' : '+10-15% revenue'
          }
        },
        confidence: 0.82,
        complianceFlag: false,
        regulatorImpact: Math.abs(perKmGap) > 2
      });
    }
  }

  // Booking fee optimization
  if (profile.booking_fee !== null && profile.service_key === 'tnvs') {
    const maxBookingFee = 15; // LTFRB cap for TNVS
    if (profile.booking_fee < maxBookingFee * 0.8) { // Under 80% of cap
      recommendations.push({
        recommendationType: 'booking_fee',
        message: `Booking fee can be increased to ₱${maxBookingFee} (current: ₱${profile.booking_fee})`,
        details: {
          currentValue: profile.booking_fee,
          recommendedValue: maxBookingFee,
          maxAllowed: maxBookingFee,
          expectedImpact: {
            revenue: `+₱${(maxBookingFee - profile.booking_fee).toFixed(2)} per trip`,
            demand: 'Minimal impact (fixed fee)',
            monthlyRevenue: `+₱${((maxBookingFee - profile.booking_fee) * 1000).toFixed(0)} (est. 1k trips/month)`
          }
        },
        confidence: 0.95,
        complianceFlag: false,
        regulatorImpact: false
      });
    }
  }

  // AI Health Score improvement recommendations
  if (profile.ai_health_score < 70) {
    recommendations.push({
      recommendationType: 'surcharge',
      message: 'Profile health score is below optimal. Consider reviewing fare structure completeness.',
      details: {
        currentScore: profile.ai_health_score,
          issues: [
          profile.base_fare ? null : 'Missing base fare component',
          profile.per_km ? null : 'Missing per-km rate',
          profile.description ? null : 'Missing rider-facing descriptions',
          profile.earnings_routing ? null : 'Earnings routing not configured'
        ].filter(Boolean),
        recommendedActions: [
          'Complete all core pricing components',
          'Add rider-facing descriptions for transparency',
          'Configure earnings routing policy',
          'Set up surge profiles if applicable'
        ]
      },
      confidence: 0.88,
      complianceFlag: true,
      regulatorImpact: false
    });
  }

  // Forecast-based recommendations
  if (forecasts.length > 0) {
    const revenueForecasts = forecasts.filter(f => f.metric_key === 'revenue');
    if (revenueForecasts.length > 0) {
      const latestRevenueForecast = revenueForecasts[0];
      const revenueChange = (latestRevenueForecast.predicted_value - latestRevenueForecast.baseline_value) / latestRevenueForecast.baseline_value;
      
      if (revenueChange < -0.1) { // >10% revenue decline predicted
        recommendations.push({
          recommendationType: 'base_fare',
          message: `Revenue forecast shows ${(revenueChange * 100).toFixed(1)}% decline. Consider fare adjustments.`,
          details: {
            forecastHorizon: latestRevenueForecast.horizon_days,
            predictedDecline: revenueChange,
            possibleActions: [
              'Reduce base fare to stimulate demand',
              'Increase per-minute rate for time-based value capture',
              'Review competitor pricing',
              'Consider promotional campaigns'
            ]
          },
          confidence: latestRevenueForecast.confidence || 0.7,
          complianceFlag: false,
          regulatorImpact: false
        });
      }
    }
  }

  return recommendations;
}

// Market benchmark data
function getMarketBenchmark(serviceKey: string) {
  const benchmarks: Record<string, any> = {
    'tnvs': {
      baseFare: 40,
      perKm: 12,
      perMinute: 2,
      bookingFee: 12
    },
    'taxi': {
      baseFare: 40,
      perKm: 13.5,
      perMinute: 2.5,
      bookingFee: 0
    },
    'special': {
      baseFare: 60,
      perKm: 15,
      perMinute: 3,
      bookingFee: 15
    },
    'pop': {
      baseFare: 30,
      perKm: 10,
      perMinute: 1.5,
      bookingFee: 8
    },
    'twg': {
      baseFare: 25,
      perKm: 8,
      perMinute: 1,
      bookingFee: 5
    }
  };
  
  return benchmarks[serviceKey] || benchmarks['tnvs'];
}