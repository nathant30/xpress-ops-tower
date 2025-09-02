import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/database';
import { z } from 'zod';

// Event ingestion schema
const EventIngestionSchema = z.object({
  event_type: z.enum(['weather', 'concert', 'flight_arrival', 'flight_departure', 'traffic_incident', 'holiday', 'surge_demand']),
  region_id: z.string(),
  event_data: z.record(z.any()),
  severity: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  coordinates: z.array(z.number()).optional(), // [lat, lng]
  radius_km: z.number().optional(),
  start_time: z.string().optional(), // ISO datetime
  end_time: z.string().optional(),   // ISO datetime
  source: z.string() // 'weather_api', 'pagasa', 'mmda', 'naia_ops', etc.
});

// GET /api/pricing/events - List recent pricing events
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const region_id = searchParams.get('region_id');
    const event_type = searchParams.get('event_type');
    const severity = searchParams.get('severity');
    const hours = parseInt(searchParams.get('hours') || '24'); // Last N hours
    const limit = parseInt(searchParams.get('limit') || '50');

    const db = await getDb();
    
    let query = `
      SELECT pe.*, 
             COUNT(ppr.id) as triggered_responses
      FROM pricing_events pe
      LEFT JOIN pricing_profile_responses ppr ON pe.id = ppr.event_id
      WHERE pe.created_at >= datetime('now', '-${hours} hours')
    `;
    
    const params: any[] = [];
    
    if (region_id) {
      query += ' AND pe.region_id = ?';
      params.push(region_id);
    }
    
    if (event_type) {
      query += ' AND pe.event_type = ?';
      params.push(event_type);
    }
    
    if (severity) {
      query += ' AND pe.severity = ?';
      params.push(severity);
    }
    
    query += `
      GROUP BY pe.id
      ORDER BY pe.created_at DESC
      LIMIT ?
    `;
    params.push(limit);

    const events = await db.all(query, params);
    
    // Parse JSON fields
    const processedEvents = events.map(event => ({
      ...event,
      event_data: JSON.parse(event.event_data || '{}'),
      coordinates: event.coordinates ? JSON.parse(event.coordinates) : null,
    }));

    return NextResponse.json({
      events: processedEvents,
      period_hours: hours
    });

  } catch (error) {
    console.error('Pricing events GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pricing events' },
      { status: 500 }
    );
  }
}

// POST /api/pricing/events - Ingest new pricing event and trigger responses
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = EventIngestionSchema.parse(body);

    const db = await getDb();
    
    // Insert the event
    const result = await db.run(`
      INSERT INTO pricing_events (
        event_type, region_id, event_data, severity, coordinates, 
        radius_km, start_time, end_time, source
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      validatedData.event_type,
      validatedData.region_id,
      JSON.stringify(validatedData.event_data),
      validatedData.severity,
      validatedData.coordinates ? JSON.stringify(validatedData.coordinates) : null,
      validatedData.radius_km || null,
      validatedData.start_time || null,
      validatedData.end_time || null,
      validatedData.source
    ]);

    const eventId = result.lastID;

    // Find matching event triggers and execute pricing responses
    const triggeredResponses = await executePricingTriggers(
      db, 
      eventId, 
      validatedData
    );

    return NextResponse.json({
      event_id: eventId,
      message: 'Event ingested successfully',
      triggered_responses: triggeredResponses.length,
      responses: triggeredResponses
    }, { status: 201 });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    
    console.error('Pricing events POST error:', error);
    return NextResponse.json(
      { error: 'Failed to ingest event' },
      { status: 500 }
    );
  }
}

// Execute pricing triggers based on incoming event
async function executePricingTriggers(db: any, eventId: number, eventData: any) {
  try {
    // Find active pricing profiles for the region
    const activeProfiles = await db.all(`
      SELECT pp.*, pet.key, pet.condition, pet.effect
      FROM pricing_profiles pp
      JOIN pricing_event_triggers pet ON pp.id = pet.profile_id
      WHERE pp.region_id = ? AND pp.status = 'active' AND pet.active = 1
    `, [eventData.region_id]);

    const triggeredResponses = [];

    for (const profile of activeProfiles) {
      // Check if event matches trigger condition
      if (shouldTriggerPricingResponse(profile, eventData)) {
        const effect = JSON.parse(profile.effect);
        
        // Create pricing response record
        await db.run(`
          INSERT INTO pricing_profile_responses (
            event_id, profile_id, trigger_key, effect_applied, status
          ) VALUES (?, ?, ?, ?, 'active')
        `, [
          eventId,
          profile.id,
          profile.key,
          JSON.stringify(effect)
        ]);

        triggeredResponses.push({
          profile_id: profile.id,
          profile_name: profile.name,
          trigger_key: profile.key,
          effect: effect,
          estimated_impact: calculateEstimatedImpact(effect, eventData)
        });

        // In a real system, this would trigger actual pricing updates
        }
    }

    return triggeredResponses;

  } catch (error) {
    console.error('Failed to execute pricing triggers:', error);
    return [];
  }
}

// Determine if event should trigger pricing response
function shouldTriggerPricingResponse(profile: any, eventData: any): boolean {
  try {
    const condition = JSON.parse(profile.condition);
    const triggerKey = profile.key;

    // Match event type to trigger key pattern
    if (triggerKey.startsWith(`${eventData.event_type}:`)) {
      const [eventType, eventSubtype] = triggerKey.split(':');
      
      // Check specific conditions based on event type
      switch (eventData.event_type) {
        case 'weather':
          return checkWeatherConditions(condition, eventData);
        case 'concert':
          return checkEventConditions(condition, eventData);
        case 'flight_arrival':
        case 'flight_departure':
          return checkFlightConditions(condition, eventData);
        case 'traffic_incident':
          return checkTrafficConditions(condition, eventData);
        default:
          return eventData.severity === condition.min_severity || 
                 ['high', 'critical'].includes(eventData.severity);
      }
    }

    return false;
  } catch (error) {
    console.error('Error checking trigger condition:', error);
    return false;
  }
}

function checkWeatherConditions(condition: any, eventData: any): boolean {
  const weatherData = eventData.event_data;
  
  if (condition.rain_threshold && weatherData.rainfall_mm >= condition.rain_threshold) {
    return true;
  }
  
  if (condition.wind_threshold && weatherData.wind_speed_kph >= condition.wind_threshold) {
    return true;
  }
  
  if (condition.weather_types && condition.weather_types.includes(weatherData.weather_type)) {
    return true;
  }
  
  return false;
}

function checkEventConditions(condition: any, eventData: any): boolean {
  const eventDetails = eventData.event_data;
  
  if (condition.min_capacity && eventDetails.expected_attendance >= condition.min_capacity) {
    return true;
  }
  
  if (condition.venue_types && condition.venue_types.includes(eventDetails.venue_type)) {
    return true;
  }
  
  return false;
}

function checkFlightConditions(condition: any, eventData: any): boolean {
  const flightData = eventData.event_data;
  
  if (condition.delay_threshold && flightData.delay_minutes >= condition.delay_threshold) {
    return true;
  }
  
  if (condition.passenger_threshold && flightData.passenger_count >= condition.passenger_threshold) {
    return true;
  }
  
  return false;
}

function checkTrafficConditions(condition: any, eventData: any): boolean {
  const trafficData = eventData.event_data;
  
  if (condition.severity_levels && condition.severity_levels.includes(trafficData.severity)) {
    return true;
  }
  
  if (condition.affected_roads && 
      trafficData.affected_roads?.some((road: string) => condition.affected_roads.includes(road))) {
    return true;
  }
  
  return false;
}

function calculateEstimatedImpact(effect: any, eventData: any) {
  const baseImpact = {
    fare_change_pct: 0,
    demand_change_pct: 0,
    estimated_duration_minutes: 60
  };

  if (effect.multiplier) {
    baseImpact.fare_change_pct = (effect.multiplier - 1) * 100;
  }

  if (effect.additive) {
    baseImpact.fare_change_pct += 10; // Rough estimate
  }

  // Estimate demand impact based on event severity
  const severityMultipliers = { low: 1.1, medium: 1.3, high: 1.6, critical: 2.0 };
  baseImpact.demand_change_pct = (severityMultipliers[eventData.severity] - 1) * 100;

  // Estimate duration
  if (eventData.end_time && eventData.start_time) {
    const start = new Date(eventData.start_time);
    const end = new Date(eventData.end_time);
    baseImpact.estimated_duration_minutes = Math.max(60, (end.getTime() - start.getTime()) / (1000 * 60));
  }

  return baseImpact;
}