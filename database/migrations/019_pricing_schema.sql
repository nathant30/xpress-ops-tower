-- 019_pricing_schema.sql
-- Comprehensive pricing system with profiles, zone-pairs, timebands, and POI overrides

BEGIN TRANSACTION;

-- Pricing profiles (versioned pricing configurations per region+service)
CREATE TABLE IF NOT EXISTS pricing_profiles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  region_id TEXT NOT NULL REFERENCES regions(region_id) ON DELETE CASCADE,
  service_key TEXT NOT NULL,                                  -- e.g. 'rides','taxi_ev','eats'
  name TEXT NOT NULL,                                         -- 'NCR Rides v2025-09'
  status TEXT NOT NULL CHECK (status IN ('draft','shadow','active','retired')),
  effective_at DATETIME,                                      -- when it goes live (for 'active')
  supersedes_id INTEGER REFERENCES pricing_profiles(id),     -- linked list
  notes TEXT,
  created_at DATETIME NOT NULL DEFAULT (datetime('now')),
  created_by TEXT REFERENCES users(id),
  updated_at DATETIME NOT NULL DEFAULT (datetime('now')),
  updated_by TEXT REFERENCES users(id),
  UNIQUE(region_id, service_key, name)
);

CREATE INDEX IF NOT EXISTS pricing_profiles_region_service_idx ON pricing_profiles(region_id, service_key, status);

-- Shadow run attachment to profile
CREATE TABLE IF NOT EXISTS pricing_shadows (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  profile_id INTEGER NOT NULL REFERENCES pricing_profiles(id) ON DELETE CASCADE,
  baseline_profile_id INTEGER NOT NULL REFERENCES pricing_profiles(id),
  started_at DATETIME NOT NULL DEFAULT (datetime('now')),
  ended_at DATETIME,
  status TEXT NOT NULL CHECK (status IN ('running','stopped','completed')),
  metrics TEXT DEFAULT '{}'                                 -- JSON: deltas: avg fare, take rate, acceptance, ETA impact
);

-- Zone-pair rules - Matrix: pickup_zone → drop_zone with fare formula parts
CREATE TABLE IF NOT EXISTS pricing_zone_pairs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  profile_id INTEGER NOT NULL REFERENCES pricing_profiles(id) ON DELETE CASCADE,
  pickup_zone_id INTEGER NOT NULL REFERENCES zones(id),
  drop_zone_id INTEGER NOT NULL REFERENCES zones(id),
  base_fare REAL NOT NULL DEFAULT 0,
  per_km REAL NOT NULL DEFAULT 0,
  per_min REAL NOT NULL DEFAULT 0,
  min_fare REAL NOT NULL DEFAULT 0,
  booking_fee REAL NOT NULL DEFAULT 0,
  surge_cap REAL NOT NULL DEFAULT 3.0,                       -- e.g., max 3x
  currency TEXT NOT NULL DEFAULT 'PHP',
  rules TEXT DEFAULT '{}',                                    -- JSON: extra predicates (e.g. road tolls)
  UNIQUE(profile_id, pickup_zone_id, drop_zone_id)
);

CREATE INDEX IF NOT EXISTS pricing_zone_pairs_profile_idx ON pricing_zone_pairs(profile_id);

-- Timeband rules (overlays for time/day special multipliers or overrides)
CREATE TABLE IF NOT EXISTS pricing_timebands (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  profile_id INTEGER NOT NULL REFERENCES pricing_profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,                                         -- 'Peak Weekday'
  dow_mask TEXT NOT NULL,                                     -- '0111110' for Mon-Fri (1=Sun..Sat)
  start_minute INTEGER NOT NULL CHECK (start_minute BETWEEN 0 AND 1439),
  end_minute INTEGER NOT NULL CHECK (end_minute BETWEEN 1 AND 1440),
  multiplier REAL,                                            -- e.g., 1.25
  additive REAL,                                              -- add fixed amount
  priority INTEGER NOT NULL DEFAULT 0                         -- higher wins if overlaps
);

CREATE INDEX IF NOT EXISTS pricing_timebands_profile_idx ON pricing_timebands(profile_id);

-- POI-specific overrides (airports/events)
CREATE TABLE IF NOT EXISTS pricing_poi_overrides (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  profile_id INTEGER NOT NULL REFERENCES pricing_profiles(id) ON DELETE CASCADE,
  poi_id INTEGER NOT NULL REFERENCES pois(id),
  mode TEXT NOT NULL CHECK (mode IN ('pickup','dropoff','either')),
  base_fare REAL,
  per_km REAL,
  per_min REAL,
  min_fare REAL,
  booking_fee REAL,
  surcharge REAL,                                             -- fixed extra
  multiplier REAL,
  UNIQUE(profile_id, poi_id, mode)
);

CREATE INDEX IF NOT EXISTS pricing_poi_overrides_profile_idx ON pricing_poi_overrides(profile_id);

-- Event hooks / external signals (optional)
CREATE TABLE IF NOT EXISTS pricing_event_triggers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  profile_id INTEGER NOT NULL REFERENCES pricing_profiles(id) ON DELETE CASCADE,
  key TEXT NOT NULL,                                           -- 'weather:rain','concert:arena','flight:arrival_spike'
  condition TEXT NOT NULL,                                     -- JSON predicate schema
  effect TEXT NOT NULL,                                        -- JSON {multiplier:1.2, cap:2.5}
  active BOOLEAN NOT NULL DEFAULT TRUE
);

-- Simulation runs (replay historical trips with a profile)
CREATE TABLE IF NOT EXISTS pricing_simulations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  profile_id INTEGER NOT NULL REFERENCES pricing_profiles(id) ON DELETE CASCADE,
  baseline_profile_id INTEGER REFERENCES pricing_profiles(id),
  region_id TEXT NOT NULL REFERENCES regions(region_id),
  service_key TEXT NOT NULL,
  sample_window_start DATETIME NOT NULL,                      -- time range of historical trips
  sample_window_end DATETIME NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending','running','completed','failed')),
  requested_by TEXT REFERENCES users(id),
  requested_at DATETIME NOT NULL DEFAULT (datetime('now')),
  completed_at DATETIME,
  metrics TEXT DEFAULT '{}'                                   -- JSON: summary deltas
);

-- Seed example pricing profiles for NCR
INSERT OR IGNORE INTO pricing_profiles (region_id, service_key, name, status, notes, created_by, updated_by) VALUES
('NCR', 'rides', 'NCR Rides Standard v1.0', 'active', 'Standard ride pricing for NCR region', 'usr-super-admin-001', 'usr-super-admin-001'),
('NCR', 'taxi_ev', 'NCR Taxi EV Premium v1.0', 'active', 'Premium EV taxi pricing for NCR region', 'usr-super-admin-001', 'usr-super-admin-001'),
('NCR', 'rides', 'NCR Rides Experimental v2.0', 'draft', 'New experimental pricing model - under review', 'usr-super-admin-001', 'usr-super-admin-001');

-- Note: Zone-pair, timeband, and POI override seeding will be done via API after zones are created
-- This avoids complex nested SELECT statements in the migration

COMMIT;