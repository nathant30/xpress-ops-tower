import { NextRequest, NextResponse } from 'next/server';
import { 
  PricingForecastDTO,
  GeneratePricingForecastRequest,
  MetricKey
} from '@/lib/pricing/pricingV4Schemas';
import { getDatabase } from '@/lib/database';
import { withAuthAndRateLimit } from '@/lib/auth';

// GET /api/v1/pricing/profiles/[id]/forecasts - Get forecasts for profile
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
    const horizonDays = searchParams.get('horizon') ? parseInt(searchParams.get('horizon')!) : null;
    const metricKey = searchParams.get('metric') as MetricKey | null;

    const db = getDatabase();
    
    let query = `
      SELECT 
        id,
        profile_id as profileId,
        horizon_days as horizonDays,
        metric_key as metricKey,
        baseline_value as baselineValue,
        predicted_value as predictedValue,
        confidence,
        model_version as modelVersion,
        input_features as inputFeatures,
        generated_at as generatedAt
      FROM pricing_forecasts
      WHERE profile_id = ?
    `;
    
    const params_db: any[] = [profileId];

    if (horizonDays) {
      query += ' AND horizon_days = ?';
      params_db.push(horizonDays);
    }

    if (metricKey) {
      query += ' AND metric_key = ?';
      params_db.push(metricKey);
    }

    query += ' ORDER BY generated_at DESC, horizon_days ASC';

    const forecasts = await db.all(query, params_db);
    
    // Transform data for response
    const transformedForecasts = forecasts.map(forecast => ({
      ...forecast,
      inputFeatures: forecast.inputFeatures ? JSON.parse(forecast.inputFeatures) : null,
    }));

    return NextResponse.json(transformedForecasts);

  } catch (error) {
    console.error('Error fetching pricing forecasts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pricing forecasts' },
      { status: 500 }
    );
  }
}, ['analytics:read']);

// POST /api/v1/pricing/profiles/[id]/forecasts:generate - Generate new forecasts
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
    const validatedData = GeneratePricingForecastRequest.parse(body);
    
    const db = getDatabase();
    
    // Check if profile exists
    const profile = await db.get(
      'SELECT * FROM pricing_profiles_v4 WHERE id = ?',
      [profileId]
    );

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Generate forecasts for each metric
    const generatedForecasts: PricingForecastDTO[] = [];

    for (const metric of validatedData.metrics) {
      const forecastData = await generateForecastForMetric(
        profile,
        validatedData.horizonDays,
        metric
      );

      const result = await db.run(`
        INSERT INTO pricing_forecasts (
          profile_id,
          horizon_days,
          metric_key,
          baseline_value,
          predicted_value,
          confidence,
          model_version,
          input_features
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        profileId,
        validatedData.horizonDays,
        metric,
        forecastData.baseline,
        forecastData.predicted,
        forecastData.confidence,
        forecastData.modelVersion,
        JSON.stringify(forecastData.inputFeatures)
      ]);

      if (result.lastID) {
        const forecast = await db.get(`
          SELECT 
            id,
            profile_id as profileId,
            horizon_days as horizonDays,
            metric_key as metricKey,
            baseline_value as baselineValue,
            predicted_value as predictedValue,
            confidence,
            model_version as modelVersion,
            input_features as inputFeatures,
            generated_at as generatedAt
          FROM pricing_forecasts WHERE id = ?
        `, [result.lastID]);

        generatedForecasts.push({
          ...forecast,
          inputFeatures: JSON.parse(forecast.inputFeatures),
        });
      }
    }

    // Update profile with latest forecast summary
    const forecastSummary = {
      lastGenerated: new Date().toISOString(),
      horizonDays: validatedData.horizonDays,
      metrics: generatedForecasts.map(f => ({
        metric: f.metricKey,
        predicted: f.predictedValue,
        confidence: f.confidence
      }))
    };

    await db.run(`
      UPDATE pricing_profiles_v4 
      SET ai_last_forecast = ?,
          updated_at = datetime('now'),
          updated_by = ?
      WHERE id = ?
    `, [
      JSON.stringify(forecastSummary),
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
      ) VALUES (?, ?, 'forecasts_generated', 'forecast', ?, ?)
    `, [
      profileId,
      userId,
      profileId,
      JSON.stringify({
        horizonDays: validatedData.horizonDays,
        metrics: validatedData.metrics,
        forecastCount: generatedForecasts.length
      })
    ]);

    return NextResponse.json(generatedForecasts, { status: 201 });

  } catch (error) {
    console.error('Error generating pricing forecasts:', error);
    return NextResponse.json(
      { error: 'Failed to generate pricing forecasts' },
      { status: 500 }
    );
  }
}, ['analytics:write']);

// AI/ML forecast generation logic
async function generateForecastForMetric(
  profile: any,
  horizonDays: number,
  metricKey: MetricKey
) {
  // Mock AI/ML forecast generation - replace with actual model integration
  
  // Get historical data features
  const inputFeatures = {
    serviceKey: profile.service_key,
    regionId: profile.region_id,
    currentBaseFare: profile.base_fare || 0,
    currentPerKm: profile.per_km || 0,
    currentPerMinute: profile.per_minute || 0,
    currentBookingFee: profile.booking_fee || 0,
    aiHealthScore: profile.ai_health_score || 0,
    horizonDays,
    seasonality: getSeasonalityFactor(),
    marketTrends: getMarketTrends(profile.service_key),
  };

  // Generate baseline (current performance estimate)
  let baseline = 0;
  let predicted = 0;
  let confidence = 0.75; // Mock confidence

  switch (metricKey) {
    case 'trips':
      baseline = 1000 + Math.random() * 500; // Mock baseline trips
      predicted = baseline * (1 + (Math.random() - 0.5) * 0.3); // ±15% variance
      break;
      
    case 'revenue':
      const avgFare = (profile.base_fare || 0) + (profile.per_km || 0) * 5; // Assume avg 5km trip
      baseline = 1000 * avgFare; // trips * avgFare
      
      // Revenue forecast with elasticity
      const fareElasticity = -0.8; // Mock elasticity coefficient
      const fareChange = calculateFareChangeImpact(profile);
      predicted = baseline * (1 + fareElasticity * fareChange);
      break;
      
    case 'roi':
      baseline = 0.15; // 15% baseline ROI
      predicted = baseline + (Math.random() - 0.5) * 0.1; // ±5% ROI change
      confidence = 0.65; // Lower confidence for ROI predictions
      break;
  }

  return {
    baseline: Math.round(baseline * 100) / 100,
    predicted: Math.round(predicted * 100) / 100,
    confidence,
    modelVersion: 'v1.0-mock',
    inputFeatures
  };
}

// Helper functions for AI features
function getSeasonalityFactor(): number {
  const month = new Date().getMonth();
  // Mock seasonal factors - higher demand in Dec, Jan (holidays)
  const seasonalFactors = [1.2, 1.1, 1.0, 1.0, 1.0, 0.9, 0.9, 0.9, 1.0, 1.0, 1.1, 1.3];
  return seasonalFactors[month];
}

function getMarketTrends(serviceKey: string): number {
  // Mock market trends by service
  const trends: Record<string, number> = {
    'tnvs': 1.05,    // 5% growth trend
    'taxi': 0.98,    // -2% decline trend
    'special': 1.02, // 2% growth trend
    'pop': 1.08,     // 8% growth trend
    'twg': 1.15,     // 15% growth trend (pilot program)
  };
  return trends[serviceKey] || 1.0;
}

function calculateFareChangeImpact(profile: any): number {
  // Mock calculation of how much fares have changed from market baseline
  // This would integrate with historical data and market benchmarks
  const marketBaselines: Record<string, any> = {
    'tnvs': { baseFare: 40, perKm: 12, bookingFee: 10 },
    'taxi': { baseFare: 40, perKm: 13.5 },
    'special': { baseFare: 60, perKm: 15 },
    'pop': { baseFare: 30, perKm: 10 },
    'twg': { baseFare: 25, perKm: 8 }
  };
  
  const baseline = marketBaselines[profile.service_key] || {};
  let totalChange = 0;
  let componentCount = 0;
  
  if (profile.base_fare && baseline.baseFare) {
    totalChange += (profile.base_fare - baseline.baseFare) / baseline.baseFare;
    componentCount++;
  }
  
  if (profile.per_km && baseline.perKm) {
    totalChange += (profile.per_km - baseline.perKm) / baseline.perKm;
    componentCount++;
  }
  
  return componentCount > 0 ? totalChange / componentCount : 0;
}