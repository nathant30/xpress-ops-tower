-- 020_pricing_events_schema.sql
-- Event-driven pricing system for automated responses to external signals

BEGIN TRANSACTION;

-- Pricing events table - stores incoming events that can trigger pricing changes
CREATE TABLE IF NOT EXISTS pricing_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_type TEXT NOT NULL,                                    -- 'weather', 'concert', 'flight_arrival', etc.
  region_id TEXT NOT NULL REFERENCES regions(region_id),
  event_data TEXT NOT NULL DEFAULT '{}',                       -- JSON: event-specific data
  severity TEXT NOT NULL CHECK (severity IN ('low','medium','high','critical')),
  coordinates TEXT,                                            -- JSON: [lat, lng] - event location
  radius_km REAL,                                             -- affected radius in km
  start_time DATETIME,                                        -- when event starts affecting pricing
  end_time DATETIME,                                          -- when event stops affecting pricing
  source TEXT NOT NULL,                                       -- 'weather_api', 'pagasa', 'mmda', etc.
  created_at DATETIME NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS pricing_events_region_type_idx ON pricing_events(region_id, event_type);
CREATE INDEX IF NOT EXISTS pricing_events_created_idx ON pricing_events(created_at);
CREATE INDEX IF NOT EXISTS pricing_events_time_range_idx ON pricing_events(start_time, end_time);

-- Pricing profile responses - tracks which profiles were triggered by events
CREATE TABLE IF NOT EXISTS pricing_profile_responses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id INTEGER NOT NULL REFERENCES pricing_events(id) ON DELETE CASCADE,
  profile_id INTEGER NOT NULL REFERENCES pricing_profiles(id) ON DELETE CASCADE,
  trigger_key TEXT NOT NULL,                                  -- which trigger was matched
  effect_applied TEXT NOT NULL,                               -- JSON: the effect that was applied
  status TEXT NOT NULL CHECK (status IN ('active','expired','manual_override')),
  created_at DATETIME NOT NULL DEFAULT (datetime('now')),
  expires_at DATETIME,                                        -- when this response should expire
  manual_override_by TEXT REFERENCES users(id),               -- who manually overrode
  manual_override_at DATETIME
);

CREATE INDEX IF NOT EXISTS pricing_responses_event_idx ON pricing_profile_responses(event_id);
CREATE INDEX IF NOT EXISTS pricing_responses_profile_idx ON pricing_profile_responses(profile_id);
CREATE INDEX IF NOT EXISTS pricing_responses_status_idx ON pricing_profile_responses(status, expires_at);

-- External data sources configuration
CREATE TABLE IF NOT EXISTS pricing_data_sources (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_key TEXT NOT NULL UNIQUE,                           -- 'weather_openweather', 'pagasa_api', 'mmda_traffic'
  name TEXT NOT NULL,
  type TEXT NOT NULL,                                         -- 'weather', 'traffic', 'events', 'flights'
  config TEXT NOT NULL DEFAULT '{}',                         -- JSON: API keys, endpoints, polling intervals
  status TEXT NOT NULL CHECK (status IN ('active','paused','error')),
  last_poll_at DATETIME,
  last_success_at DATETIME,
  error_count INTEGER NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT (datetime('now')),
  updated_at DATETIME NOT NULL DEFAULT (datetime('now'))
);

-- Seed example data sources
INSERT OR IGNORE INTO pricing_data_sources (source_key, name, type, config, status) VALUES
('weather_openweather', 'OpenWeather API', 'weather', 
 '{"api_endpoint":"https://api.openweathermap.org/data/2.5/weather","poll_interval_minutes":15,"regions":["NCR","BTN","CAV"]}', 
 'active'),

('pagasa_forecasts', 'PAGASA Weather Forecasts', 'weather', 
 '{"api_endpoint":"https://api.pagasa.dost.gov.ph/v1/weather","poll_interval_minutes":30,"regions":["NCR","BTN","CAV","BORA"]}', 
 'active'),

('mmda_traffic', 'MMDA Traffic Monitoring', 'traffic', 
 '{"api_endpoint":"https://mmda.gov.ph/api/traffic","poll_interval_minutes":5,"regions":["NCR"]}', 
 'active'),

('naia_ops', 'NAIA Operations System', 'flights', 
 '{"api_endpoint":"https://naia.miaa.gov.ph/api/flights","poll_interval_minutes":10,"regions":["NCR"]}', 
 'active'),

('ticketnet_events', 'TicketNet Event Calendar', 'events', 
 '{"api_endpoint":"https://ticketnet.com.ph/api/events","poll_interval_minutes":60,"regions":["NCR","BTN","CAV","BORA"]}', 
 'paused');

-- Seed example event triggers for NCR
INSERT OR IGNORE INTO pricing_event_triggers (profile_id, key, condition, effect, active) VALUES
((SELECT id FROM pricing_profiles WHERE name = 'NCR Rides Standard v1.0' LIMIT 1),
 'weather:rain', 
 '{"rain_threshold":10,"weather_types":["heavy_rain","thunderstorm"]}',
 '{"multiplier":1.3,"cap":2.0,"duration_minutes":120}',
 1),

((SELECT id FROM pricing_profiles WHERE name = 'NCR Rides Standard v1.0' LIMIT 1),
 'concert:arena', 
 '{"min_capacity":10000,"venue_types":["arena","stadium","amphitheater"]}',
 '{"multiplier":1.5,"additive":20,"duration_minutes":180}',
 1),

((SELECT id FROM pricing_profiles WHERE name = 'NCR Rides Standard v1.0' LIMIT 1),
 'flight:arrival_spike', 
 '{"delay_threshold":30,"passenger_threshold":200}',
 '{"multiplier":1.4,"poi_surge":true,"duration_minutes":90}',
 1),

((SELECT id FROM pricing_profiles WHERE name = 'NCR Taxi EV Premium v1.0' LIMIT 1),
 'weather:rain', 
 '{"rain_threshold":5,"weather_types":["rain","heavy_rain","thunderstorm"]}',
 '{"multiplier":1.4,"cap":2.5,"duration_minutes":150}',
 1);

-- Event processing log for debugging and monitoring
CREATE TABLE IF NOT EXISTS pricing_event_processing_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id INTEGER REFERENCES pricing_events(id),
  processing_step TEXT NOT NULL,                              -- 'received', 'validated', 'triggers_matched', 'responses_applied'
  status TEXT NOT NULL CHECK (status IN ('success','error','warning')),
  details TEXT DEFAULT '{}',                                  -- JSON: step-specific details or error info
  processing_time_ms INTEGER,
  created_at DATETIME NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS event_processing_log_event_idx ON pricing_event_processing_log(event_id);
CREATE INDEX IF NOT EXISTS event_processing_log_created_idx ON pricing_event_processing_log(created_at);

COMMIT;