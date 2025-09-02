// Backup of the original dashboard route before simplification
import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';

// GET /api/v1/pricing/dashboard - Comprehensive pricing centre dashboard
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const regionId = searchParams.get('regionId');
    
    const db = getDatabase();
    
    // Get summary statistics
    const summary = await getPricingSummary(db, regionId);
    
    // Get AI health scores by service
    const aiHealthScores = await getAIHealthScores(db, regionId);
    
    // Get recent activity
    const recentActivity = await getRecentActivity(db, regionId);
    
    // Get compliance alerts
    const complianceAlerts = await getComplianceAlerts(db, regionId);
    
    // Get upcoming regulator expirations
    const upcomingExpirations = await getUpcomingExpirations(db, regionId);
    
    // Get pending proposals
    const pendingProposals = await getPendingProposals(db, regionId);
    
    // Get surge system status
    const surgeStatus = await getSurgeSystemStatus(db, regionId);
    
    // Get forecasting insights
    const forecastingInsights = await getForecastingInsights(db, regionId);

    const dashboard = {
      summary,
      aiHealthScores,
      recentActivity,
      complianceAlerts,
      upcomingExpirations,
      pendingProposals,
      surgeStatus,
      forecastingInsights,
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