-- SQLite-compatible surge overrides table
-- Manual operator overrides with TTL, approval required above thresholds

CREATE TABLE IF NOT EXISTS surge_overrides (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  region_id TEXT NOT NULL,
  service_key TEXT NOT NULL,
  reason TEXT NOT NULL,
  multiplier REAL NOT NULL,
  additive_fee REAL DEFAULT 0,
  h3_set TEXT NOT NULL,                               -- JSON array as TEXT in SQLite
  starts_at TEXT NOT NULL DEFAULT (datetime('now')),
  ends_at TEXT NOT NULL,
  requested_by TEXT NOT NULL,                         -- UUID as TEXT in SQLite
  status TEXT NOT NULL DEFAULT 'pending',
  approval_request_id INTEGER,                        -- link to pricing_activation_requests
  created_at TEXT DEFAULT (datetime('now')),
  
  CHECK (service_key IN ('tnvs','special','pop','taxi')),
  CHECK (status IN ('pending','approved','rejected','cancelled')),
  FOREIGN KEY (region_id) REFERENCES regions(region_id) ON DELETE CASCADE,
  FOREIGN KEY (approval_request_id) REFERENCES pricing_activation_requests(id)
);