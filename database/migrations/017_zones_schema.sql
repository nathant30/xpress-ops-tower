-- 017_zones_schema.sql
-- Comprehensive zones management with PostGIS support

BEGIN TRANSACTION;

-- ZONES - Geographic boundaries within regions
CREATE TABLE IF NOT EXISTS zones (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  region_id TEXT NOT NULL REFERENCES regions(region_id) ON DELETE CASCADE,
  code TEXT NOT NULL,                          -- unique per region
  name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('draft','active','paused','retired')),
  geometry TEXT NOT NULL,                      -- GeoJSON MultiPolygon (SQLite doesn't have PostGIS)
  centroid TEXT,                               -- GeoJSON Point
  tags TEXT DEFAULT '[]',                      -- JSON array e.g. ['business','residential']
  metadata TEXT DEFAULT '{}',                  -- JSON - pickup rules, notes, etc.
  version INTEGER NOT NULL DEFAULT 1,         -- optimistic concurrency
  created_at DATETIME NOT NULL DEFAULT (datetime('now')),
  created_by TEXT REFERENCES users(id),
  updated_at DATETIME NOT NULL DEFAULT (datetime('now')),
  updated_by TEXT REFERENCES users(id),
  UNIQUE(region_id, code)
);

-- Indexes for zones
CREATE INDEX IF NOT EXISTS zones_region_idx ON zones(region_id);
CREATE INDEX IF NOT EXISTS zones_status_idx ON zones(status);

-- ZONE ↔ towns/cities mapping
CREATE TABLE IF NOT EXISTS zone_towns (
  zone_id INTEGER NOT NULL REFERENCES zones(id) ON DELETE CASCADE,
  town_code TEXT NOT NULL,                     -- canonical code, e.g. PSA city code
  PRIMARY KEY(zone_id, town_code)
);

-- Zone history for rollback/audit
CREATE TABLE IF NOT EXISTS zone_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  zone_id INTEGER NOT NULL REFERENCES zones(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,                    -- zone.version before change
  snapshot TEXT NOT NULL,                      -- entire zone row as JSON
  created_at DATETIME NOT NULL DEFAULT (datetime('now')),
  created_by TEXT REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS zone_history_zone_idx ON zone_history(zone_id, version);

-- Seed some example zones for NCR
INSERT OR IGNORE INTO zones (region_id, code, name, status, geometry, centroid, tags, metadata, created_by, updated_by) VALUES
('NCR', 'BGC', 'Bonifacio Global City', 'active', 
 '{"type":"MultiPolygon","coordinates":[[[[121.0244,14.5547],[121.0344,14.5547],[121.0344,14.5647],[121.0244,14.5647],[121.0244,14.5547]]]]}',
 '{"type":"Point","coordinates":[121.0294,14.5597]}',
 '["business","cbd"]', 
 '{"pickup_rules":{"surge_zones":["financial_district"],"restrictions":[]},"notes":"Main business district"}',
 'usr-super-admin-001', 'usr-super-admin-001'),

('NCR', 'MKT', 'Makati CBD', 'active',
 '{"type":"MultiPolygon","coordinates":[[[[121.0144,14.5447],[121.0244,14.5447],[121.0244,14.5547],[121.0144,14.5547],[121.0144,14.5447]]]]}',
 '{"type":"Point","coordinates":[121.0194,14.5497]}',
 '["business","cbd","financial"]',
 '{"pickup_rules":{"surge_zones":["ayala"],"restrictions":[]},"notes":"Makati business district"}',
 'usr-super-admin-001', 'usr-super-admin-001'),

('NCR', 'QC', 'Quezon City', 'active',
 '{"type":"MultiPolygon","coordinates":[[[[121.0044,14.6447],[121.0844,14.6447],[121.0844,14.7247],[121.0044,14.7247],[121.0044,14.6447]]]]}',
 '{"type":"Point","coordinates":[121.0444,14.6847]}',
 '["residential","commercial","mixed"]',
 '{"pickup_rules":{"surge_zones":["diliman","eastwood"],"restrictions":[]},"notes":"Large residential and commercial area"}',
 'usr-super-admin-001', 'usr-super-admin-001');

COMMIT;