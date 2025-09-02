import { NextRequest, NextResponse } from 'next/server';

// GET /api/v1/pricing/dashboard - Comprehensive pricing centre dashboard
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const regionId = searchParams.get('regionId');

    // Return mock data for now to test the endpoint
    const dashboard = {
      summary: {
        totalProfiles: 0,
        activeProfiles: 0,
        draftProfiles: 0,
        filedProfiles: 0,
        pendingProposals: 0,
        pendingRecommendations: 0,
        recentRegulatorFilings: 0
      },
      aiHealthScores: [],
      recentActivity: [],
      complianceAlerts: [],
      upcomingExpirations: [],
      pendingProposals: [],
      surgeStatus: {
        activeSurgeProfiles: 0,
        totalActiveHexes: 0,
        averageMultiplier: 1.0,
        maxMultiplier: 1.0,
        activeOverrides: 0,
        systemHealthy: true
      },
      forecastingInsights: {
        byService: [],
        recentTrends: [],
        lastGenerated: new Date().toISOString()
      },
      lastUpdated: new Date().toISOString()
    };

    return NextResponse.json(dashboard);

  } catch (error) {
    console.error('Error fetching pricing dashboard:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pricing dashboard' },
      { status: 500 }
    );
  }
}