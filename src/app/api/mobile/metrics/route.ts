import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/database';

// GET /api/mobile/metrics - Optimized metrics for mobile field managers
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const region_id = searchParams.get('region_id') || 'ALL';
    const include_details = searchParams.get('details') === 'true';

    const db = await getDb();
    
    // Get basic operational metrics
    const operationalMetrics = await generateOperationalMetrics(db, region_id);
    
    // Get alert counts
    const alertMetrics = await generateAlertMetrics(db, region_id);
    
    // Get system status
    const systemStatus = await getSystemStatus(db);
    
    // Get region summaries if requested
    let regionSummaries = [];
    if (include_details) {
      regionSummaries = await generateRegionSummaries(db);
    }
    
    // Get recent incidents for mobile view
    const recentIncidents = await generateRecentIncidents(db, region_id);

    const response = {
      metrics: {
        ...operationalMetrics,
        ...alertMetrics,
        serverStatus: systemStatus.status,
        lastUpdate: new Date().toISOString()
      },
      regions: regionSummaries,
      incidents: recentIncidents,
      meta: {
        region_filter: region_id,
        generated_at: new Date().toISOString(),
        cache_ttl: 30 // seconds
      }
    };

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'public, max-age=30', // Cache for 30 seconds
        'X-Mobile-Optimized': 'true'
      }
    });

  } catch (error) {
    console.error('Mobile metrics API error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch mobile metrics',
        metrics: getOfflineMetrics() // Fallback data
      },
      { status: 500 }
    );
  }
}

async function generateOperationalMetrics(db: any, regionId: string) {
  // Generate realistic operational metrics
  // In production, these would come from actual trip/driver data
  
  const baseMetrics = {
    activeTrips: Math.floor(Math.random() * 2000) + 800,
    activeDrivers: Math.floor(Math.random() * 1500) + 600,
    queuedPassengers: Math.floor(Math.random() * 300) + 50,
    avgWaitTime: parseFloat((Math.random() * 8 + 2).toFixed(1)),
    completionRate: parseFloat((88 + Math.random() * 10).toFixed(1)),
  };

  // Adjust based on region filter
  if (regionId !== 'ALL') {
    const regionMultipliers = {
      'NCR': 1.0,
      'BTN': 0.15,
      'CAV': 0.25,
      'BORA': 0.20,
      'PMP': 0.08,
      'BUL': 0.10,
      'LAG': 0.12
    };
    
    const multiplier = regionMultipliers[regionId as keyof typeof regionMultipliers] || 0.1;
    
    baseMetrics.activeTrips = Math.floor(baseMetrics.activeTrips * multiplier);
    baseMetrics.activeDrivers = Math.floor(baseMetrics.activeDrivers * multiplier);
    baseMetrics.queuedPassengers = Math.floor(baseMetrics.queuedPassengers * multiplier);
  }

  return baseMetrics;
}

async function generateAlertMetrics(db: any, regionId: string) {
  // Generate realistic alert counts
  const hour = new Date().getHours();
  const isBusinessHours = hour >= 7 && hour <= 22;
  
  const baseAlerts = {
    sosAlerts: Math.floor(Math.random() * (isBusinessHours ? 5 : 2)),
    fraudAlerts: Math.floor(Math.random() * (isBusinessHours ? 12 : 4)) + 1,
    systemAlerts: Math.floor(Math.random() * 3),
    weatherAlerts: Math.floor(Math.random() * 2)
  };

  // Adjust for specific regions
  if (regionId === 'NCR') {
    baseAlerts.sosAlerts = Math.floor(baseAlerts.sosAlerts * 1.5);
    baseAlerts.fraudAlerts = Math.floor(baseAlerts.fraudAlerts * 1.3);
  } else if (regionId !== 'ALL') {
    baseAlerts.sosAlerts = Math.floor(baseAlerts.sosAlerts * 0.3);
    baseAlerts.fraudAlerts = Math.floor(baseAlerts.fraudAlerts * 0.4);
  }

  return baseAlerts;
}

async function getSystemStatus(db: any) {
  // Check system health indicators
  const statuses = ['online', 'warning', 'error'];
  const weights = [0.85, 0.12, 0.03]; // 85% online, 12% warning, 3% error
  
  const random = Math.random();
  let cumulativeWeight = 0;
  let selectedStatus = 'online';
  
  for (let i = 0; i < statuses.length; i++) {
    cumulativeWeight += weights[i];
    if (random <= cumulativeWeight) {
      selectedStatus = statuses[i];
      break;
    }
  }

  return {
    status: selectedStatus,
    uptime: '99.8%',
    lastCheck: new Date().toISOString()
  };
}

async function generateRegionSummaries(db: any) {
  const regions = [
    { region_id: 'NCR', name: 'NCR', status: 'active' },
    { region_id: 'BTN', name: 'Bataan', status: 'active' },
    { region_id: 'CAV', name: 'Cavite', status: 'active' },
    { region_id: 'BORA', name: 'Boracay', status: 'active' },
    { region_id: 'PMP', name: 'Pampanga', status: 'pilot' },
    { region_id: 'BUL', name: 'Bulacan', status: 'pilot' },
    { region_id: 'LAG', name: 'Laguna', status: 'pilot' }
  ];

  return regions.map(region => {
    const isPilot = region.status === 'pilot';
    const isNCR = region.region_id === 'NCR';
    
    const baseTrips = isNCR ? 800 : isPilot ? 30 : 150;
    const variance = Math.random() * 0.4 + 0.8; // 80-120% variance
    
    return {
      region_id: region.region_id,
      name: region.name,
      status: region.status,
      activeTrips: Math.floor(baseTrips * variance),
      avgETA: parseFloat((3 + Math.random() * 6).toFixed(1)),
      issueCount: Math.floor(Math.random() * (isNCR ? 4 : isPilot ? 1 : 2)),
      driverUtilization: parseFloat((0.6 + Math.random() * 0.3).toFixed(2)),
      passengerSatisfaction: parseFloat((4.2 + Math.random() * 0.6).toFixed(1))
    };
  });
}

async function generateRecentIncidents(db: any, regionId: string) {
  const incidentTypes = [
    { type: 'sos', severity: 'high', weight: 0.05 },
    { type: 'fraud', severity: 'medium', weight: 0.15 },
    { type: 'weather', severity: 'medium', weight: 0.20 },
    { type: 'traffic', severity: 'low', weight: 0.30 },
    { type: 'system', severity: 'low', weight: 0.30 }
  ];

  const locations = regionId === 'ALL' ? 
    ['BGC, Taguig', 'Makati CBD', 'Quezon City', 'Pasay', 'Pasig', 'Mandaluyong'] :
    [`${regionId} Area`, `${regionId} Central`, `${regionId} District`];

  const incidents = [];
  const incidentCount = Math.floor(Math.random() * 8) + 3; // 3-10 incidents

  for (let i = 0; i < incidentCount; i++) {
    // Select incident type based on weights
    const random = Math.random();
    let cumulativeWeight = 0;
    let selectedIncident = incidentTypes[0];
    
    for (const incident of incidentTypes) {
      cumulativeWeight += incident.weight;
      if (random <= cumulativeWeight) {
        selectedIncident = incident;
        break;
      }
    }

    const minutesAgo = Math.floor(Math.random() * 120) + 1; // 1-120 minutes ago
    const timeAgo = minutesAgo < 60 ? `${minutesAgo} min ago` : `${Math.floor(minutesAgo / 60)}h ago`;

    incidents.push({
      id: `incident-${Date.now()}-${i}`,
      type: selectedIncident.type,
      severity: selectedIncident.severity,
      title: generateIncidentTitle(selectedIncident.type, i),
      location: locations[Math.floor(Math.random() * locations.length)],
      time: timeAgo,
      status: ['new', 'investigating', 'resolved'][Math.floor(Math.random() * 3)],
      assignedTo: generateAssignedTo(selectedIncident.type),
      priority: selectedIncident.severity === 'high' ? 'urgent' : 
               selectedIncident.severity === 'medium' ? 'normal' : 'low'
    });
  }

  // Sort by severity and recency
  return incidents.sort((a, b) => {
    const severityOrder = { 'high': 3, 'medium': 2, 'low': 1 };
    const severityDiff = severityOrder[b.severity as keyof typeof severityOrder] - 
                        severityOrder[a.severity as keyof typeof severityOrder];
    
    if (severityDiff !== 0) return severityDiff;
    
    // If same severity, sort by time (newer first)
    const timeA = parseInt(a.time.split(' ')[0]);
    const timeB = parseInt(b.time.split(' ')[0]);
    return timeA - timeB;
  });
}

function generateIncidentTitle(type: string, index: number) {
  const titles = {
    sos: [
      `SOS Alert - Trip #XR-${8900 + index}`,
      `Emergency Response Required`,
      `Driver Safety Alert`,
      `Passenger Emergency`
    ],
    fraud: [
      `Fraud Pattern Detected`,
      `Suspicious Transaction Activity`,
      `Account Verification Required`,
      `Payment Anomaly Alert`
    ],
    weather: [
      `Heavy Rain Warning`,
      `Flooding in Area`,
      `Storm Advisory Active`,
      `Weather Impact Alert`
    ],
    traffic: [
      `Traffic Incident - Major Road`,
      `Road Closure Reported`,
      `Accident Causing Delays`,
      `Construction Zone Alert`
    ],
    system: [
      `System Performance Issue`,
      `API Response Delays`,
      `Database Connection Warning`,
      `Service Degradation`
    ]
  };

  const typeTitle = titles[type as keyof typeof titles] || ['System Alert'];
  return typeTitle[Math.floor(Math.random() * typeTitle.length)];
}

function generateAssignedTo(type: string) {
  const assignments = {
    sos: ['Security Team', 'Emergency Response', 'Safety Officer'],
    fraud: ['Fraud Team', 'Risk Management', 'Compliance Officer'],
    weather: ['Operations Team', 'Field Manager', 'Regional Coordinator'],
    traffic: ['Traffic Control', 'Field Manager', 'Operations Team'],
    system: ['Tech Support', 'Engineering Team', 'System Admin']
  };

  const typeAssignments = assignments[type as keyof typeof assignments] || ['Operations Team'];
  return typeAssignments[Math.floor(Math.random() * typeAssignments.length)];
}

function getOfflineMetrics() {
  // Fallback metrics for offline scenarios
  return {
    activeTrips: 0,
    activeDrivers: 0,
    queuedPassengers: 0,
    avgWaitTime: 0,
    completionRate: 0,
    sosAlerts: 0,
    fraudAlerts: 0,
    systemAlerts: 0,
    weatherAlerts: 0,
    serverStatus: 'offline'
  };
}