-- SQLite-compatible surge profiles table
-- Core surge pricing configuration per region/service

CREATE TABLE IF NOT EXISTS surge_profiles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  region_id TEXT NOT NULL,
  service_key TEXT NOT NULL,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  model_version TEXT NOT NULL DEFAULT 'v1',
  max_multiplier REAL NOT NULL DEFAULT 2.0,
  additive_enabled INTEGER NOT NULL DEFAULT 0,        -- BOOLEAN as INTEGER in SQLite
  smoothing_half_life_sec INTEGER NOT NULL DEFAULT 600,
  update_interval_sec INTEGER NOT NULL DEFAULT 300,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  created_by TEXT,                                    -- UUID as TEXT in SQLite
  updated_at TEXT DEFAULT (datetime('now')),
  updated_by TEXT,                                    -- UUID as TEXT in SQLite
  
  CHECK (service_key IN ('tnvs','special','pop','taxi')),
  CHECK (status IN ('draft','active','retired','shadow')),
  FOREIGN KEY (region_id) REFERENCES regions(region_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS surge_profiles_region_service_idx 
  ON surge_profiles(region_id, service_key, status);