-- 018_pois_schema.sql
-- POIs (points of interest) with pickup/dropoff lanes and queue policies

BEGIN TRANSACTION;

-- POIs (airports, malls, ports, hospitals, etc.)
CREATE TABLE IF NOT EXISTS pois (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  region_id TEXT NOT NULL REFERENCES regions(region_id) ON DELETE CASCADE,
  zone_id INTEGER REFERENCES zones(id) ON DELETE SET NULL,  -- optional: assign to zone
  code TEXT NOT NULL,                                       -- e.g. 'NAIA-T3'
  name TEXT NOT NULL,
  type TEXT NOT NULL,                                       -- 'airport','mall','port','station','hospital','event','landmark'
  status TEXT NOT NULL CHECK (status IN ('draft','active','paused','retired')),
  location TEXT NOT NULL,                                   -- GeoJSON Point
  boundary TEXT,                                            -- GeoJSON Polygon - POI compound boundary
  pickup_lanes TEXT DEFAULT '[]',                           -- JSON array: [{name, laneType:'fifo|free', coordinates:[...], restrictions:{...}}]
  dropoff_lanes TEXT DEFAULT '[]',                          -- JSON array
  restrictions TEXT DEFAULT '{}',                           -- JSON: { serviceWhitelist:['rides','ev_taxi'], vehicleTypes:['sedan'], hours:[...]}
  queue_policy TEXT DEFAULT '{}',                           -- JSON: airport FIFO config: {enabled:true, holdingArea:[...], maxQueue:300, rotation:'fifo|weighted'}
  metadata TEXT DEFAULT '{}',                               -- Additional POI-specific data
  version INTEGER NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT (datetime('now')),
  created_by TEXT REFERENCES users(id),
  updated_at DATETIME NOT NULL DEFAULT (datetime('now')),
  updated_by TEXT REFERENCES users(id),
  UNIQUE(region_id, code)
);

-- Indexes for POIs
CREATE INDEX IF NOT EXISTS pois_region_idx ON pois(region_id);
CREATE INDEX IF NOT EXISTS pois_zone_idx   ON pois(zone_id);
CREATE INDEX IF NOT EXISTS pois_type_idx   ON pois(type);
CREATE INDEX IF NOT EXISTS pois_status_idx ON pois(status);

-- POI history for audit trail
CREATE TABLE IF NOT EXISTS poi_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  poi_id INTEGER NOT NULL REFERENCES pois(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  snapshot TEXT NOT NULL,                                   -- entire poi row as JSON
  created_at DATETIME NOT NULL DEFAULT (datetime('now')),
  created_by TEXT REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS poi_history_poi_idx ON poi_history(poi_id, version);

-- Seed some example POIs for NCR
INSERT OR IGNORE INTO pois (region_id, zone_id, code, name, type, status, location, boundary, pickup_lanes, dropoff_lanes, restrictions, queue_policy, metadata, created_by, updated_by) VALUES
('NCR', 
 (SELECT id FROM zones WHERE code = 'BGC' AND region_id = 'NCR'),
 'NAIA-T1', 'NAIA Terminal 1', 'airport', 'active',
 '{"type":"Point","coordinates":[121.0198,14.5086]}',
 '{"type":"Polygon","coordinates":[[[121.0178,14.5066],[121.0218,14.5066],[121.0218,14.5106],[121.0178,14.5106],[121.0178,14.5066]]]}',
 '[{"name":"Arrivals Lane","laneType":"fifo","coordinates":[[121.0188,14.5076],[121.0208,14.5076]],"restrictions":{"vehicleTypes":["sedan","mpv"]}}]',
 '[{"name":"Departures Curb","laneType":"free","coordinates":[[121.0188,14.5096],[121.0208,14.5096]],"restrictions":{}}]',
 '{"serviceWhitelist":["rides","taxi_ev"],"vehicleTypes":["sedan","mpv","suv"],"hours":[{"start":"00:00","end":"23:59"}]}',
 '{"enabled":true,"rotation":"fifo","holdingArea":[[121.0168,14.5056],[121.0228,14.5116]],"maxQueue":300,"queueTimeEstimate":"15-30min"}',
 '{"terminal":"T1","contact":"NAIA Operations","specialInstructions":"Use designated pickup area only"}',
 'usr-super-admin-001', 'usr-super-admin-001'),

('NCR', 
 (SELECT id FROM zones WHERE code = 'BGC' AND region_id = 'NCR'),
 'NAIA-T3', 'NAIA Terminal 3', 'airport', 'active',
 '{"type":"Point","coordinates":[121.0198,14.5086]}',
 '{"type":"Polygon","coordinates":[[[121.0178,14.5066],[121.0218,14.5066],[121.0218,14.5106],[121.0178,14.5106],[121.0178,14.5066]]]}',
 '[{"name":"Arrivals Lane A","laneType":"fifo","coordinates":[[121.0188,14.5076],[121.0208,14.5076]],"restrictions":{}},{"name":"Arrivals Lane B","laneType":"fifo","coordinates":[[121.0188,14.5078],[121.0208,14.5078]],"restrictions":{}}]',
 '[{"name":"Departures Level 4","laneType":"free","coordinates":[[121.0188,14.5096],[121.0208,14.5096]],"restrictions":{}}]',
 '{"serviceWhitelist":["rides","taxi_ev","shuttles"],"vehicleTypes":["sedan","mpv","suv"],"hours":[{"start":"00:00","end":"23:59"}]}',
 '{"enabled":true,"rotation":"fifo","holdingArea":[[121.0168,14.5056],[121.0228,14.5116]],"maxQueue":500,"queueTimeEstimate":"10-25min"}',
 '{"terminal":"T3","contact":"NAIA T3 Operations","specialInstructions":"Premium terminal with extended queue capacity"}',
 'usr-super-admin-001', 'usr-super-admin-001'),

('NCR', 
 (SELECT id FROM zones WHERE code = 'MKT' AND region_id = 'NCR'),
 'SM-MOA', 'SM Mall of Asia', 'mall', 'active',
 '{"type":"Point","coordinates":[120.9794,14.5352]}',
 '{"type":"Polygon","coordinates":[[[120.9774,14.5332],[120.9814,14.5332],[120.9814,14.5372],[120.9774,14.5372],[120.9774,14.5332]]]}',
 '[{"name":"Main Pickup","laneType":"free","coordinates":[[120.9784,14.5342],[120.9804,14.5342]],"restrictions":{}},{"name":"North Pickup","laneType":"free","coordinates":[[120.9784,14.5362],[120.9804,14.5362]],"restrictions":{}}]',
 '[{"name":"Main Dropoff","laneType":"free","coordinates":[[120.9784,14.5352],[120.9804,14.5352]],"restrictions":{}}]',
 '{"serviceWhitelist":["rides","taxi_ev","eats"],"vehicleTypes":["sedan","mpv","motorcycle"],"hours":[{"start":"10:00","end":"22:00"}]}',
 '{"enabled":false}',
 '{"mall":"SM Mall of Asia","contact":"SM MOA Security","specialInstructions":"Use designated pickup zones, no waiting in fire lanes"}',
 'usr-super-admin-001', 'usr-super-admin-001'),

('NCR', 
 (SELECT id FROM zones WHERE code = 'BGC' AND region_id = 'NCR'),
 'BGC-HIGH-ST', 'BGC High Street', 'landmark', 'active',
 '{"type":"Point","coordinates":[121.0244,14.5547]}',
 '{"type":"Polygon","coordinates":[[[121.0224,14.5527],[121.0264,14.5527],[121.0264,14.5567],[121.0224,14.5567],[121.0224,14.5527]]]}',
 '[{"name":"High Street Pickup","laneType":"free","coordinates":[[121.0234,14.5537],[121.0254,14.5537]],"restrictions":{}}]',
 '[{"name":"High Street Dropoff","laneType":"free","coordinates":[[121.0234,14.5557],[121.0254,14.5557]],"restrictions":{}}]',
 '{"serviceWhitelist":["rides","taxi_ev","eats","shuttles"],"vehicleTypes":["sedan","mpv"],"hours":[{"start":"06:00","end":"23:00"}]}',
 '{"enabled":false}',
 '{"landmark":"BGC High Street","contact":"BGC Security","specialInstructions":"Premium pickup location in business district"}',
 'usr-super-admin-001', 'usr-super-admin-001');

COMMIT;