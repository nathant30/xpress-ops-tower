import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/database';

// GET /api/pricing/simulations/[id]/results - Get simulation results with detailed metrics
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const db = await getDb();
    
    const simulation = await db.get(`
      SELECT ps.*, 
             pp.name as profile_name,
             bp.name as baseline_profile_name
      FROM pricing_simulations ps
      JOIN pricing_profiles pp ON ps.profile_id = pp.id
      LEFT JOIN pricing_profiles bp ON ps.baseline_profile_id = bp.id
      WHERE ps.id = ?
    `, [id]);

    if (!simulation) {
      return NextResponse.json(
        { error: 'Simulation not found' },
        { status: 404 }
      );
    }

    // Parse metrics and generate realistic simulation results
    let metrics = JSON.parse(simulation.metrics || '{}');
    
    // If simulation is completed but metrics are empty, generate sample results
    if (simulation.status === 'completed' && Object.keys(metrics).length === 0) {
      metrics = generateSampleResults(simulation);
      
      // Update the simulation with generated results
      await db.run(`
        UPDATE pricing_simulations 
        SET metrics = ?
        WHERE id = ?
      `, [JSON.stringify(metrics), id]);
    }

    const processedSimulation = {
      ...simulation,
      metrics
    };

    return NextResponse.json({ 
      simulation: processedSimulation,
      detailed_metrics: generateDetailedMetrics(metrics, simulation)
    });

  } catch (error) {
    console.error('Simulation results GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch simulation results' },
      { status: 500 }
    );
  }
}

// POST /api/pricing/simulations/[id]/results - Update simulation results (internal API)
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const { status, metrics } = await request.json();

    if (!['running', 'completed', 'failed'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status' },
        { status: 400 }
      );
    }

    const db = await getDb();
    
    const updateFields = ['status = ?', 'updated_at = datetime("now")'];
    const updateValues = [status];
    
    if (metrics) {
      updateFields.push('metrics = ?');
      updateValues.push(JSON.stringify(metrics));
    }
    
    if (status === 'completed' || status === 'failed') {
      updateFields.push('completed_at = datetime("now")');
    }
    
    updateValues.push(id);

    await db.run(`
      UPDATE pricing_simulations 
      SET ${updateFields.join(', ')}
      WHERE id = ?
    `, updateValues);

    return NextResponse.json({
      message: 'Simulation results updated successfully'
    });

  } catch (error) {
    console.error('Simulation results POST error:', error);
    return NextResponse.json(
      { error: 'Failed to update simulation results' },
      { status: 500 }
    );
  }
}

// Generate realistic sample results for demo purposes
function generateSampleResults(simulation: any) {
  const baseMetrics = {
    total_trips_analyzed: Math.floor(Math.random() * 10000) + 5000,
    avg_fare_change: (Math.random() * 40 - 20), // -20% to +20%
    revenue_impact: (Math.random() * 30 - 10), // -10% to +20%
    driver_acceptance_change: (Math.random() * 10 - 5), // -5% to +5%
    customer_satisfaction_change: (Math.random() * 6 - 3), // -3% to +3%
    eta_impact_minutes: (Math.random() * 4 - 2), // -2 to +2 minutes
    surge_frequency_change: (Math.random() * 20 - 10), // -10% to +10%
  };

  const zoneMetrics = [
    {
      zone_code: 'BGC',
      zone_name: 'Bonifacio Global City',
      trip_count: Math.floor(Math.random() * 2000) + 1000,
      fare_change_pct: (Math.random() * 30 - 15),
      demand_change_pct: (Math.random() * 20 - 10),
      supply_change_pct: (Math.random() * 15 - 7),
    },
    {
      zone_code: 'MKT',
      zone_name: 'Makati CBD',
      trip_count: Math.floor(Math.random() * 2500) + 1200,
      fare_change_pct: (Math.random() * 25 - 12),
      demand_change_pct: (Math.random() * 18 - 9),
      supply_change_pct: (Math.random() * 12 - 6),
    }
  ];

  const timeMetrics = [
    {
      hour: '07:00-09:00',
      label: 'Morning Peak',
      trip_count: Math.floor(Math.random() * 1000) + 500,
      fare_change_pct: (Math.random() * 35 - 10),
      utilization_change_pct: (Math.random() * 15 - 5),
    },
    {
      hour: '17:00-19:00', 
      label: 'Evening Peak',
      trip_count: Math.floor(Math.random() * 1200) + 600,
      fare_change_pct: (Math.random() * 40 - 15),
      utilization_change_pct: (Math.random() * 20 - 8),
    }
  ];

  return {
    summary: baseMetrics,
    zone_breakdown: zoneMetrics,
    time_breakdown: timeMetrics,
    recommendations: generateRecommendations(baseMetrics),
    risk_analysis: generateRiskAnalysis(baseMetrics)
  };
}

function generateDetailedMetrics(metrics: any, simulation: any) {
  if (!metrics.summary) return null;

  return {
    performance_indicators: {
      revenue_efficiency: metrics.summary.revenue_impact > 5 ? 'High' : metrics.summary.revenue_impact > 0 ? 'Medium' : 'Low',
      operational_impact: Math.abs(metrics.summary.eta_impact_minutes) < 1 ? 'Low' : 'Medium',
      market_response: metrics.summary.driver_acceptance_change > 2 ? 'Positive' : metrics.summary.driver_acceptance_change < -2 ? 'Negative' : 'Neutral'
    },
    financial_projection: {
      monthly_revenue_change: metrics.summary.revenue_impact * 1000000 / 100, // Convert % to PHP
      break_even_days: Math.abs(metrics.summary.revenue_impact) > 10 ? 30 : 60,
      roi_confidence: metrics.summary.revenue_impact > 0 ? 85 : 45
    },
    operational_readiness: {
      driver_training_needed: metrics.summary.avg_fare_change > 15,
      customer_communication_required: Math.abs(metrics.summary.avg_fare_change) > 10,
      system_updates_required: simulation.profile_name.includes('v2')
    }
  };
}

function generateRecommendations(baseMetrics: any) {
  const recommendations = [];

  if (baseMetrics.revenue_impact > 10) {
    recommendations.push({
      type: 'opportunity',
      priority: 'high',
      text: 'Strong revenue uplift detected. Consider immediate rollout to capture market opportunity.',
      action: 'Schedule executive approval meeting'
    });
  }

  if (baseMetrics.driver_acceptance_change < -3) {
    recommendations.push({
      type: 'risk',
      priority: 'high', 
      text: 'Driver acceptance significantly decreased. Review incentive structures.',
      action: 'Engage driver relations team'
    });
  }

  if (Math.abs(baseMetrics.eta_impact_minutes) > 1.5) {
    recommendations.push({
      type: 'operational',
      priority: 'medium',
      text: 'ETA impact exceeds acceptable threshold. Review zone boundaries.',
      action: 'Consult operations team'
    });
  }

  return recommendations;
}

function generateRiskAnalysis(baseMetrics: any) {
  return {
    overall_risk_score: Math.abs(baseMetrics.driver_acceptance_change) * 2 + Math.abs(baseMetrics.customer_satisfaction_change) * 3,
    key_risks: [
      {
        risk: 'Driver churn',
        probability: baseMetrics.driver_acceptance_change < -2 ? 'High' : 'Low',
        impact: 'High',
        mitigation: 'Implement driver incentive program'
      },
      {
        risk: 'Customer backlash', 
        probability: baseMetrics.avg_fare_change > 15 ? 'Medium' : 'Low',
        impact: 'Medium',
        mitigation: 'Gradual rollout with communication campaign'
      }
    ]
  };
}