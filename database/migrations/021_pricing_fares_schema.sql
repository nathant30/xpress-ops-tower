-- Pricing & Fares Management System Schema v3.0 (SQLite Compatible)
-- Comprehensive pricing system supporting TNVS, Taxi, Special Regional, and POP pricing

-- Enhanced Pricing Profiles (shared across all pricing types)
CREATE TABLE pricing_profiles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  region_id TEXT NOT NULL,
  service_key TEXT NOT NULL CHECK (service_key IN ('tnvs','taxi','special','pop')),
  vehicle_type TEXT CHECK (vehicle_type IN ('4_seat','6_seat')),
  name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('draft','active','retired','shadow')),
  booking_fee REAL DEFAULT 69.00,
  effective_at TEXT DEFAULT (datetime('now')),
  supersedes_id INTEGER REFERENCES pricing_profiles(id),
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  created_by TEXT DEFAULT 'system',
  updated_at TEXT DEFAULT (datetime('now')),
  updated_by TEXT DEFAULT 'system',
  
  FOREIGN KEY (region_id) REFERENCES regions(region_id) ON DELETE CASCADE
);

-- TNVS Fares (4-seat and 6-seat vehicles)
CREATE TABLE tnvs_fares (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  profile_id INTEGER NOT NULL,
  vehicle_type TEXT NOT NULL CHECK (vehicle_type IN ('4_seat','6_seat')),
  base_fare REAL NOT NULL,
  per_km REAL NOT NULL,
  per_min REAL NOT NULL,
  min_fare REAL NOT NULL,
  surge_cap REAL DEFAULT 2.0,
  currency TEXT DEFAULT 'PHP',
  
  -- Elasticity and rider segmentation
  new_rider_cap REAL DEFAULT 1.5,
  loyal_rider_threshold REAL DEFAULT 2.5,
  driver_incentive_coupling INTEGER DEFAULT 1, -- SQLite boolean as integer
  
  FOREIGN KEY (profile_id) REFERENCES pricing_profiles(id) ON DELETE CASCADE,
  UNIQUE(profile_id, vehicle_type)
);

-- Taxi Fares (LTFRB-compliant)
CREATE TABLE taxi_fares (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  profile_id INTEGER NOT NULL,
  flagdown REAL NOT NULL,
  per_km REAL NOT NULL,
  per_min REAL NOT NULL,
  
  -- Surcharges
  night_surcharge_pct REAL DEFAULT 0,
  airport_surcharge REAL DEFAULT 0,
  event_surcharge REAL DEFAULT 0,
  holiday_surcharge REAL DEFAULT 0,
  
  -- Xpress booking fees
  xpress_booking_fee_flat REAL DEFAULT 69.00,
  xpress_booking_fee_pct REAL DEFAULT 0,
  
  -- Compliance settings
  ltfrb_compliant INTEGER DEFAULT 1, -- SQLite boolean as integer
  surge_blocked INTEGER DEFAULT 1, -- SQLite boolean as integer
  
  other_surcharges TEXT DEFAULT '{}', -- JSON as TEXT in SQLite
  
  FOREIGN KEY (profile_id) REFERENCES pricing_profiles(id) ON DELETE CASCADE,
  UNIQUE(profile_id)
);

-- Special Regional Fares (Boracay, El Nido, etc.)
CREATE TABLE special_region_fares (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  profile_id INTEGER NOT NULL,
  zone_id INTEGER REFERENCES zones(id),
  region_name TEXT NOT NULL, -- 'Boracay', 'El Nido', etc.
  
  fare_type TEXT NOT NULL CHECK (fare_type IN ('flat','band','timeband')),
  
  -- Flat fare
  flat_fare REAL,
  
  -- Banded/timeband fares
  min_fare REAL,
  per_km REAL,
  per_min REAL,
  
  -- Conditions (JSON for flexibility)
  conditions TEXT DEFAULT '{}', -- JSON as TEXT in SQLite
  
  FOREIGN KEY (profile_id) REFERENCES pricing_profiles(id) ON DELETE CASCADE,
  UNIQUE(profile_id, zone_id, fare_type)
);

-- POP Pricing (POI & Cross-Province)
CREATE TABLE pop_pricing (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  profile_id INTEGER NOT NULL,
  
  -- POI-specific pricing
  poi_id INTEGER REFERENCES pois(id),
  poi_mode TEXT CHECK (poi_mode IN ('pickup','dropoff','either')),
  
  -- Cross-province pricing
  cross_province INTEGER DEFAULT 0, -- SQLite boolean as integer
  origin_region_id TEXT REFERENCES regions(region_id),
  dest_region_id TEXT REFERENCES regions(region_id),
  
  -- Pricing structure
  base_fare REAL,
  per_km REAL,
  per_min REAL,
  surcharge REAL,
  multiplier REAL DEFAULT 1.0,
  
  -- Partnership surcharges (NAIA, Ayala malls, etc.)
  partnership_surcharge REAL DEFAULT 0,
  partnership_name TEXT,
  
  FOREIGN KEY (profile_id) REFERENCES pricing_profiles(id) ON DELETE CASCADE,
  UNIQUE(profile_id, poi_id, poi_mode, origin_region_id, dest_region_id)
);

-- Surge Controls (dynamic pricing)
CREATE TABLE surge_controls (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  profile_id INTEGER NOT NULL,
  
  -- Surge types
  surge_type TEXT NOT NULL CHECK (surge_type IN ('multiplicative','additive','predictive')),
  
  -- Multiplicative surge (1.1x - 2.0x)
  multiplier_min REAL DEFAULT 1.1,
  multiplier_max REAL DEFAULT 2.0,
  
  -- Additive surge (+₱ fixed)
  additive_amount REAL DEFAULT 0,
  
  -- Predictive surge triggers
  weather_trigger INTEGER DEFAULT 0, -- SQLite boolean as integer
  traffic_trigger INTEGER DEFAULT 0, -- SQLite boolean as integer
  event_trigger INTEGER DEFAULT 0, -- SQLite boolean as integer
  
  -- Activation thresholds
  demand_supply_ratio_threshold REAL DEFAULT 2.0,
  activation_latency_seconds INTEGER DEFAULT 300, -- 5 minutes
  
  active INTEGER DEFAULT 1, -- SQLite boolean as integer
  created_at TEXT DEFAULT (datetime('now')),
  
  FOREIGN KEY (profile_id) REFERENCES pricing_profiles(id) ON DELETE CASCADE
);

-- Tolls Management
CREATE TABLE tolls (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  route_code TEXT NOT NULL UNIQUE,
  amount REAL NOT NULL,
  
  -- Geographic constraints
  region_id TEXT REFERENCES regions(region_id),
  origin_lat REAL,
  origin_lng REAL,
  destination_lat REAL,
  destination_lng REAL,
  
  -- Auto-detection settings
  auto_detect INTEGER DEFAULT 1, -- SQLite boolean as integer
  detection_radius_meters INTEGER DEFAULT 500,
  
  active INTEGER DEFAULT 1, -- SQLite boolean as integer
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Trip Tolls (tracking tolls applied to trips)
CREATE TABLE trip_tolls (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  trip_id TEXT NOT NULL, -- UUID as text for flexibility
  toll_id INTEGER NOT NULL,
  amount REAL NOT NULL,
  
  -- Reconciliation
  auto_detected INTEGER DEFAULT 0, -- SQLite boolean as integer
  deviation_amount REAL DEFAULT 0,
  reconciled INTEGER DEFAULT 0, -- SQLite boolean as integer
  
  applied_at TEXT DEFAULT (datetime('now')),
  
  FOREIGN KEY (toll_id) REFERENCES tolls(id),
  UNIQUE(trip_id, toll_id)
);

-- Pricing Simulations (shadow pricing and elasticity testing)
CREATE TABLE pricing_simulations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  profile_id INTEGER NOT NULL,
  simulation_name TEXT NOT NULL,
  
  -- Simulation parameters
  test_percentage REAL DEFAULT 5.0, -- % of rides to test
  duration_days INTEGER DEFAULT 7,
  
  -- Metrics tracking
  baseline_conversion_rate REAL,
  test_conversion_rate REAL,
  revenue_impact_pct REAL,
  rider_satisfaction_impact REAL,
  
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft','running','completed','cancelled')),
  started_at TEXT,
  completed_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  created_by TEXT DEFAULT 'system',
  
  FOREIGN KEY (profile_id) REFERENCES pricing_profiles(id) ON DELETE CASCADE
);

-- Pricing Audit Trail
CREATE TABLE pricing_audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  profile_id INTEGER REFERENCES pricing_profiles(id) ON DELETE SET NULL,
  table_name TEXT NOT NULL,
  record_id INTEGER NOT NULL,
  
  action TEXT NOT NULL CHECK (action IN ('create','update','delete','activate','retire')),
  old_values TEXT, -- JSON as TEXT in SQLite
  new_values TEXT, -- JSON as TEXT in SQLite
  reason TEXT,
  
  actor TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  
  created_at TEXT DEFAULT (datetime('now'))
);

-- Compliance Tracking
CREATE TABLE pricing_compliance (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  profile_id INTEGER NOT NULL,
  
  compliance_type TEXT NOT NULL CHECK (compliance_type IN ('ltfrb','doi','lgu','internal')),
  rule_description TEXT NOT NULL,
  
  compliant INTEGER DEFAULT 1, -- SQLite boolean as integer
  violation_details TEXT,
  remediation_required INTEGER DEFAULT 0, -- SQLite boolean as integer
  remediation_deadline TEXT,
  
  checked_at TEXT DEFAULT (datetime('now')),
  checked_by TEXT DEFAULT 'system',
  
  FOREIGN KEY (profile_id) REFERENCES pricing_profiles(id) ON DELETE CASCADE
);

-- Seed initial data
INSERT INTO pricing_profiles (region_id, service_key, vehicle_type, name, status, booking_fee, notes) VALUES
-- NCR TNVS Pricing
('NCR', 'tnvs', '4_seat', 'NCR 4-Seat Standard', 'active', 69.00, 'Standard 4-seat TNVS pricing for NCR'),
('NCR', 'tnvs', '6_seat', 'NCR 6-Seat Standard', 'active', 79.00, 'Standard 6-seat TNVS pricing for NCR'),
-- NCR Taxi Pricing
('NCR', 'taxi', NULL, 'NCR Taxi LTFRB Compliant', 'active', 69.00, 'LTFRB-compliant taxi pricing for NCR'),
-- Boracay Special Pricing
('BORA', 'special', NULL, 'Boracay Flat Fare', 'active', 50.00, 'Special flat fare pricing for Boracay island'),
-- NAIA POP Pricing
('NCR', 'pop', NULL, 'NAIA Airport Surcharge', 'active', 69.00, 'Airport pickup/dropoff surcharge pricing');

-- TNVS Fares
INSERT INTO tnvs_fares (profile_id, vehicle_type, base_fare, per_km, per_min, min_fare, surge_cap, new_rider_cap, loyal_rider_threshold, driver_incentive_coupling) VALUES
(1, '4_seat', 45.00, 12.00, 2.00, 89.00, 2.0, 1.5, 2.5, 1),
(2, '6_seat', 55.00, 14.00, 2.50, 120.00, 2.0, 1.5, 2.5, 1);

-- Taxi Fares
INSERT INTO taxi_fares (profile_id, flagdown, per_km, per_min, night_surcharge_pct, airport_surcharge, xpress_booking_fee_flat, ltfrb_compliant, surge_blocked) VALUES
(3, 40.00, 13.50, 2.00, 20.0, 60.00, 69.00, 1, 1);

-- Special Regional Fares
INSERT INTO special_region_fares (profile_id, region_name, fare_type, flat_fare, conditions) VALUES
(4, 'Boracay', 'flat', 150.00, '{"applicable": "island_loop", "vehicle_types": ["tricycle", "e_jeep"]}');

-- POP Pricing
INSERT INTO pop_pricing (profile_id, poi_id, poi_mode, surcharge, partnership_surcharge, partnership_name) VALUES
(5, 1, 'either', 50.00, 30.00, 'NAIA Terminal Fee');

-- Sample Surge Controls
INSERT INTO surge_controls (profile_id, surge_type, multiplier_min, multiplier_max, demand_supply_ratio_threshold, weather_trigger, traffic_trigger, event_trigger, active) VALUES
(1, 'multiplicative', 1.1, 2.0, 2.0, 1, 1, 1, 1),
(2, 'multiplicative', 1.1, 2.0, 2.0, 1, 1, 1, 1);

-- Sample Tolls
INSERT INTO tolls (name, route_code, amount, region_id, auto_detect, detection_radius_meters, active) VALUES
('Skyway Stage 1', 'SLEX_SKYWAY_1', 62.00, 'NCR', 1, 500, 1),
('Skyway Stage 2', 'SLEX_SKYWAY_2', 119.00, 'NCR', 1, 500, 1),
('NLEX', 'NLEX_MAIN', 88.00, 'NCR', 1, 500, 1),
('CAVITEX', 'CAVITEX_MAIN', 45.00, 'CAV', 1, 500, 1),
('STAR Tollway', 'STAR_TOLLWAY', 75.00, 'BTN', 1, 500, 1);

-- Create indexes for performance
CREATE INDEX idx_pricing_profiles_region_service ON pricing_profiles(region_id, service_key);
CREATE INDEX idx_pricing_profiles_status ON pricing_profiles(status);
CREATE INDEX idx_tnvs_fares_profile_vehicle ON tnvs_fares(profile_id, vehicle_type);
CREATE INDEX idx_taxi_fares_profile ON taxi_fares(profile_id);
CREATE INDEX idx_special_fares_region ON special_region_fares(region_name);
CREATE INDEX idx_pop_pricing_poi ON pop_pricing(poi_id);
CREATE INDEX idx_pop_pricing_regions ON pop_pricing(origin_region_id, dest_region_id);
CREATE INDEX idx_tolls_region ON tolls(region_id);
CREATE INDEX idx_tolls_route_code ON tolls(route_code);
CREATE INDEX idx_trip_tolls_trip ON trip_tolls(trip_id);
CREATE INDEX idx_surge_controls_profile ON surge_controls(profile_id);
CREATE INDEX idx_pricing_audit_profile ON pricing_audit_log(profile_id);
CREATE INDEX idx_pricing_audit_timestamp ON pricing_audit_log(created_at);
CREATE INDEX idx_compliance_profile ON pricing_compliance(profile_id);