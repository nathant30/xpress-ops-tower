import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';

// GET /api/surge/status - Get comprehensive surge system status
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const regionId = searchParams.get('regionId');

    const db = getDatabase();

    // Get active profiles count
    let profileQuery = 'SELECT COUNT(*) as count FROM surge_profiles WHERE status = ?';
    const profileParams: any[] = ['active'];
    
    if (regionId) {
      profileQuery += ' AND region_id = ?';
      profileParams.push(regionId);
    }
    
    const activeProfiles = await db.get(profileQuery, profileParams);

    // Get current hex state stats
    let hexStateQuery = `
      SELECT 
        service_key,
        COUNT(*) as hexCount,
        AVG(multiplier) as avgMultiplier,
        MAX(multiplier) as maxMultiplier,
        source
      FROM surge_hex_state 
      WHERE (valid_until IS NULL OR datetime(valid_until) > datetime('now'))
    `;
    const hexStateParams: any[] = [];
    
    if (regionId) {
      hexStateQuery += ' AND region_id = ?';
      hexStateParams.push(regionId);
    }
    
    hexStateQuery += ' GROUP BY service_key, source';
    
    const hexStateStats = await db.all(hexStateQuery, hexStateParams);

    // Get active overrides
    let overrideQuery = `
      SELECT 
        COUNT(*) as count,
        service_key,
        status
      FROM surge_overrides 
      WHERE datetime(ends_at) > datetime('now')
    `;
    const overrideParams: any[] = [];
    
    if (regionId) {
      overrideQuery += ' AND region_id = ?';
      overrideParams.push(regionId);
    }
    
    overrideQuery += ' GROUP BY service_key, status';
    
    const activeOverrides = await db.all(overrideQuery, overrideParams);

    // Get upcoming schedules
    let scheduleQuery = `
      SELECT 
        COUNT(*) as count,
        service_key,
        status
      FROM surge_schedules 
      WHERE datetime(starts_at) > datetime('now')
        AND datetime(starts_at) <= datetime('now', '+24 hours')
    `;
    const scheduleParams: any[] = [];
    
    if (regionId) {
      scheduleQuery += ' AND region_id = ?';
      scheduleParams.push(regionId);
    }
    
    scheduleQuery += ' GROUP BY service_key, status';
    
    const upcomingSchedules = await db.all(scheduleQuery, scheduleParams);

    // Get recent audit activity
    let auditQuery = `
      SELECT 
        action,
        COUNT(*) as count,
        MAX(created_at) as lastActivity
      FROM surge_audit_log 
      WHERE datetime(created_at) >= datetime('now', '-24 hours')
    `;
    const auditParams: any[] = [];
    
    if (regionId) {
      auditQuery += ' AND region_id = ?';
      auditParams.push(regionId);
    }
    
    auditQuery += ' GROUP BY action';
    
    const recentActivity = await db.all(auditQuery, auditParams);

    // Check emergency brake status
    const emergencyBrake = await db.get(`
      SELECT status, updated_at, updated_by
      FROM emergency_pricing_flags 
      WHERE flag_key = 'surge_disabled'
    `);

    // Calculate system health metrics
    const totalHexesWithSurge = hexStateStats.reduce((sum, stat) => sum + stat.hexCount, 0);
    const avgMultiplierOverall = hexStateStats.length > 0 
      ? hexStateStats.reduce((sum, stat) => sum + (stat.avgMultiplier * stat.hexCount), 0) / totalHexesWithSurge
      : 1.0;
    
    const systemStatus = {
      healthy: !emergencyBrake || emergencyBrake.status !== 'active',
      emergencyBrake: emergencyBrake ? {
        active: emergencyBrake.status === 'active',
        updatedAt: emergencyBrake.updated_at,
        updatedBy: emergencyBrake.updated_by
      } : { active: false },
      profiles: {
        activeCount: activeProfiles.count,
        status: activeProfiles.count > 0 ? 'active' : 'none'
      },
      currentSurge: {
        totalHexes: totalHexesWithSurge,
        averageMultiplier: parseFloat(avgMultiplierOverall.toFixed(2)),
        maxMultiplier: hexStateStats.length > 0 ? Math.max(...hexStateStats.map(s => s.maxMultiplier)) : 1.0,
        serviceBreakdown: hexStateStats.reduce((acc, stat) => {
          if (!acc[stat.service_key]) acc[stat.service_key] = {};
          acc[stat.service_key][stat.source] = {
            hexCount: stat.hexCount,
            avgMultiplier: parseFloat(stat.avgMultiplier.toFixed(2)),
            maxMultiplier: stat.maxMultiplier
          };
          return acc;
        }, {} as any)
      },
      overrides: {
        active: activeOverrides.reduce((sum, o) => sum + o.count, 0),
        byService: activeOverrides.reduce((acc, o) => {
          if (!acc[o.service_key]) acc[o.service_key] = {};
          acc[o.service_key][o.status] = o.count;
          return acc;
        }, {} as any)
      },
      schedules: {
        upcoming24h: upcomingSchedules.reduce((sum, s) => sum + s.count, 0),
        byService: upcomingSchedules.reduce((acc, s) => {
          if (!acc[s.service_key]) acc[s.service_key] = {};
          acc[s.service_key][s.status] = s.count;
          return acc;
        }, {} as any)
      },
      recentActivity: {
        last24h: recentActivity.reduce((sum, a) => sum + a.count, 0),
        byAction: recentActivity.reduce((acc, a) => {
          acc[a.action] = {
            count: a.count,
            lastActivity: a.lastActivity
          };
          return acc;
        }, {} as any)
      },
      lastUpdated: new Date().toISOString()
    };

    return NextResponse.json(systemStatus);

  } catch (error) {
    console.error('Error fetching surge status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch surge status' },
      { status: 500 }
    );
  }
}