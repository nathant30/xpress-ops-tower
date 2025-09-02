-- SQLite-compatible surge schedules table
-- Predetermined surges for events, optionally for specific H3 hexes

CREATE TABLE IF NOT EXISTS surge_schedules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  region_id TEXT NOT NULL,
  service_key TEXT NOT NULL,
  name TEXT NOT NULL,
  multiplier REAL NOT NULL DEFAULT 1.2,
  additive_fee REAL DEFAULT 0,
  starts_at TEXT NOT NULL,                            -- timestamp as TEXT in SQLite
  ends_at TEXT NOT NULL,                              -- timestamp as TEXT in SQLite
  h3_set TEXT,                                        -- JSON array as TEXT; null = region-wide (non-taxi)
  created_by TEXT,                                    -- UUID as TEXT in SQLite
  created_at TEXT DEFAULT (datetime('now')),
  
  CHECK (service_key IN ('tnvs','special','pop','taxi')),
  FOREIGN KEY (region_id) REFERENCES regions(region_id) ON DELETE CASCADE
);