import { getDb } from '@/lib/database';

// External data polling service for automated event ingestion
export class EventIngestionService {
  private pollingIntervals: Map<string, NodeJS.Timeout> = new Map();

  async startAllPolling() {
    const db = await getDb();
    const activeSources = await db.all(
      'SELECT * FROM pricing_data_sources WHERE status = "active"'
    );

    for (const source of activeSources) {
      await this.startPolling(source);
    }
  }

  async startPolling(source: any) {
    const config = JSON.parse(source.config);
    const pollInterval = (config.poll_interval_minutes || 15) * 60 * 1000; // Convert to ms

    const intervalId = setInterval(async () => {
      try {
        await this.pollDataSource(source);
      } catch (error) {
        console.error(`Error polling ${source.source_key}:`, error);
        await this.logPollingError(source.id, error);
      }
    }, pollInterval);

    this.pollingIntervals.set(source.source_key, intervalId);
  }

  async stopPolling(sourceKey: string) {
    const intervalId = this.pollingIntervals.get(sourceKey);
    if (intervalId) {
      clearInterval(intervalId);
      this.pollingIntervals.delete(sourceKey);
      }
  }

  async pollDataSource(source: any) {
    const config = JSON.parse(source.config);
    const db = await getDb();

    try {
      let events = [];

      switch (source.type) {
        case 'weather':
          events = await this.pollWeatherData(source, config);
          break;
        case 'traffic':
          events = await this.pollTrafficData(source, config);
          break;
        case 'flights':
          events = await this.pollFlightData(source, config);
          break;
        case 'events':
          events = await this.pollEventData(source, config);
          break;
        default:
          console.warn(`Unknown source type: ${source.type}`);
          return;
      }

      // Ingest events into the system
      for (const event of events) {
        await this.ingestEvent(event);
      }

      // Update last poll timestamp
      await db.run(
        'UPDATE pricing_data_sources SET last_poll_at = datetime("now"), last_success_at = datetime("now"), error_count = 0 WHERE id = ?',
        [source.id]
      );

      } catch (error) {
      await this.logPollingError(source.id, error);
      throw error;
    }
  }

  // Weather data polling (simulated - would integrate with real APIs)
  async pollWeatherData(source: any, config: any): Promise<any[]> {
    const events = [];

    for (const regionId of config.regions) {
      // Simulate weather API call
      const weatherData = this.simulateWeatherData();

      if (this.shouldCreateWeatherEvent(weatherData)) {
        events.push({
          event_type: 'weather',
          region_id: regionId,
          event_data: weatherData,
          severity: this.calculateWeatherSeverity(weatherData),
          source: source.source_key,
          coordinates: this.getRegionCoordinates(regionId),
          radius_km: 50
        });
      }
    }

    return events;
  }

  // Traffic data polling (simulated)
  async pollTrafficData(source: any, config: any): Promise<any[]> {
    const events = [];

    for (const regionId of config.regions) {
      // Simulate traffic API call
      const trafficData = this.simulateTrafficData();

      if (this.shouldCreateTrafficEvent(trafficData)) {
        events.push({
          event_type: 'traffic_incident',
          region_id: regionId,
          event_data: trafficData,
          severity: trafficData.severity,
          source: source.source_key,
          coordinates: trafficData.coordinates,
          radius_km: trafficData.radius_km || 10,
          start_time: new Date().toISOString(),
          end_time: new Date(Date.now() + trafficData.estimated_duration_minutes * 60000).toISOString()
        });
      }
    }

    return events;
  }

  // Flight data polling (simulated)
  async pollFlightData(source: any, config: any): Promise<any[]> {
    const events = [];

    for (const regionId of config.regions) {
      // Simulate flight API call
      const flightEvents = this.simulateFlightData();

      for (const flight of flightEvents) {
        if (this.shouldCreateFlightEvent(flight)) {
          events.push({
            event_type: flight.type === 'arrival' ? 'flight_arrival' : 'flight_departure',
            region_id: regionId,
            event_data: flight,
            severity: flight.delay_minutes > 60 ? 'high' : flight.delay_minutes > 30 ? 'medium' : 'low',
            source: source.source_key,
            coordinates: [14.5086, 121.0198], // NAIA coordinates
            radius_km: 15
          });
        }
      }
    }

    return events;
  }

  // Event calendar polling (simulated)
  async pollEventData(source: any, config: any): Promise<any[]> {
    const events = [];

    for (const regionId of config.regions) {
      // Simulate events API call
      const upcomingEvents = this.simulateEventData();

      for (const event of upcomingEvents) {
        if (this.shouldCreateConcertEvent(event)) {
          events.push({
            event_type: 'concert',
            region_id: regionId,
            event_data: event,
            severity: event.expected_attendance > 20000 ? 'high' : event.expected_attendance > 5000 ? 'medium' : 'low',
            source: source.source_key,
            coordinates: event.venue_coordinates,
            radius_km: event.expected_attendance > 10000 ? 15 : 8,
            start_time: event.start_time,
            end_time: event.end_time
          });
        }
      }
    }

    return events;
  }

  // Ingest event into pricing system
  async ingestEvent(eventData: any) {
    try {
      const response = await fetch('/api/pricing/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(eventData)
      });

      if (!response.ok) {
        throw new Error(`Failed to ingest event: ${response.statusText}`);
      }

      const result = await response.json();
      } catch (error) {
      console.error('Failed to ingest event:', error);
      throw error;
    }
  }

  // Simulation methods (replace with real API calls)
  simulateWeatherData() {
    const conditions = ['clear', 'cloudy', 'light_rain', 'heavy_rain', 'thunderstorm'];
    const condition = conditions[Math.floor(Math.random() * conditions.length)];
    
    return {
      weather_type: condition,
      temperature_c: 25 + Math.random() * 10,
      humidity_pct: 60 + Math.random() * 30,
      rainfall_mm: condition.includes('rain') ? Math.random() * 20 : 0,
      wind_speed_kph: Math.random() * 30,
      visibility_km: condition === 'heavy_rain' ? 2 + Math.random() * 3 : 8 + Math.random() * 2,
      timestamp: new Date().toISOString()
    };
  }

  simulateTrafficData() {
    const severities = ['low', 'medium', 'high', 'critical'];
    const incidentTypes = ['accident', 'construction', 'flooding', 'breakdown'];
    
    return {
      incident_type: incidentTypes[Math.floor(Math.random() * incidentTypes.length)],
      severity: severities[Math.floor(Math.random() * severities.length)],
      affected_roads: ['EDSA', 'C5', 'Commonwealth Ave'][Math.floor(Math.random() * 3)],
      coordinates: [14.5547 + (Math.random() - 0.5) * 0.1, 121.0244 + (Math.random() - 0.5) * 0.1],
      estimated_duration_minutes: 30 + Math.random() * 120,
      lanes_affected: Math.floor(Math.random() * 3) + 1
    };
  }

  simulateFlightData() {
    const flights = [];
    const airlines = ['PAL', 'CEB', 'AirAsia', 'JetStar'];
    
    for (let i = 0; i < Math.floor(Math.random() * 5); i++) {
      flights.push({
        type: Math.random() > 0.5 ? 'arrival' : 'departure',
        flight_number: `${airlines[Math.floor(Math.random() * airlines.length)]}${Math.floor(Math.random() * 9000) + 1000}`,
        delay_minutes: Math.random() > 0.7 ? Math.floor(Math.random() * 120) : 0,
        passenger_count: 100 + Math.floor(Math.random() * 200),
        terminal: `T${Math.floor(Math.random() * 3) + 1}`,
        scheduled_time: new Date(Date.now() + Math.random() * 3600000).toISOString()
      });
    }
    
    return flights;
  }

  simulateEventData() {
    const events = [];
    const venues = [
      { name: 'Smart Araneta Coliseum', coordinates: [14.6125, 121.0374], capacity: 25000 },
      { name: 'Mall of Asia Arena', coordinates: [14.5352, 120.9794], capacity: 20000 },
      { name: 'BGC Arts Center', coordinates: [14.5547, 121.0244], capacity: 8000 }
    ];
    
    for (let i = 0; i < Math.floor(Math.random() * 3); i++) {
      const venue = venues[Math.floor(Math.random() * venues.length)];
      const startTime = new Date(Date.now() + Math.random() * 7 * 24 * 3600000); // Next 7 days
      
      events.push({
        event_name: `Concert Event ${i + 1}`,
        venue_name: venue.name,
        venue_type: 'arena',
        venue_coordinates: venue.coordinates,
        expected_attendance: Math.floor(Math.random() * venue.capacity * 0.8) + venue.capacity * 0.2,
        start_time: startTime.toISOString(),
        end_time: new Date(startTime.getTime() + 4 * 3600000).toISOString() // 4 hours later
      });
    }
    
    return events;
  }

  // Event filtering logic
  shouldCreateWeatherEvent(weatherData: any): boolean {
    return weatherData.rainfall_mm > 5 || 
           weatherData.wind_speed_kph > 25 || 
           ['heavy_rain', 'thunderstorm'].includes(weatherData.weather_type);
  }

  shouldCreateTrafficEvent(trafficData: any): boolean {
    return ['medium', 'high', 'critical'].includes(trafficData.severity);
  }

  shouldCreateFlightEvent(flightData: any): boolean {
    return flightData.delay_minutes > 20 || flightData.passenger_count > 250;
  }

  shouldCreateConcertEvent(eventData: any): boolean {
    return eventData.expected_attendance > 3000;
  }

  calculateWeatherSeverity(weatherData: any): 'low' | 'medium' | 'high' | 'critical' {
    if (weatherData.weather_type === 'thunderstorm' || weatherData.rainfall_mm > 15) {
      return 'high';
    }
    if (weatherData.weather_type === 'heavy_rain' || weatherData.rainfall_mm > 8) {
      return 'medium';
    }
    return 'low';
  }

  getRegionCoordinates(regionId: string): [number, number] {
    const coordinates: Record<string, [number, number]> = {
      'NCR': [14.5547, 121.0244],
      'BTN': [14.6419, 120.4467],
      'CAV': [14.2456, 120.8792],
      'BORA': [11.9674, 121.9248]
    };
    return coordinates[regionId] || [14.5547, 121.0244];
  }

  async logPollingError(sourceId: number, error: any) {
    try {
      const db = await getDb();
      await db.run(
        'UPDATE pricing_data_sources SET error_count = error_count + 1, updated_at = datetime("now") WHERE id = ?',
        [sourceId]
      );
      console.error(`Polling error for source ${sourceId}:`, error);
    } catch (dbError) {
      console.error('Failed to log polling error:', dbError);
    }
  }

  async stopAllPolling() {
    for (const [sourceKey, intervalId] of this.pollingIntervals) {
      clearInterval(intervalId);
      }
    this.pollingIntervals.clear();
  }
}

// Global instance
export const eventIngestionService = new EventIngestionService();