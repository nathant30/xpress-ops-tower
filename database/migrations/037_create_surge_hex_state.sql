-- SQLite-compatible surge hex state table
-- Active multipliers at H3 hex granularity with adaptive resolution

CREATE TABLE IF NOT EXISTS surge_hex_state (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  region_id TEXT NOT NULL,
  service_key TEXT NOT NULL,
  h3_index TEXT NOT NULL,                             -- e.g., '8a2a1072b59ffff'
  h3_res INTEGER NOT NULL,                            -- 6..10 typical
  multiplier REAL NOT NULL DEFAULT 1.0,
  additive_fee REAL DEFAULT 0,
  source TEXT NOT NULL DEFAULT 'ml',
  profile_id INTEGER REFERENCES surge_profiles(id),
  valid_from TEXT NOT NULL DEFAULT (datetime('now')),
  valid_until TEXT,                                   -- optional TTL for overrides
  computed_at TEXT NOT NULL DEFAULT (datetime('now')),
  
  CHECK (service_key IN ('tnvs','special','pop','taxi')),
  CHECK (source IN ('ml','manual','scheduled','shadow')),
  FOREIGN KEY (region_id) REFERENCES regions(region_id) ON DELETE CASCADE,
  UNIQUE (service_key, h3_index, valid_from)
);

CREATE INDEX IF NOT EXISTS surge_hex_state_lookup_idx 
  ON surge_hex_state(service_key, h3_index, computed_at DESC);