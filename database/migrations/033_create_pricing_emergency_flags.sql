-- Emergency brake system for pricing activations
-- Allows executives to freeze all pricing changes during compliance audits

CREATE TABLE IF NOT EXISTS pricing_emergency_flags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  active INTEGER NOT NULL DEFAULT 0,             -- BOOLEAN as INTEGER in SQLite
  reason TEXT,                                    -- Why emergency brake was activated
  severity_level TEXT CHECK (severity_level IN ('low', 'medium', 'high', 'critical')) DEFAULT 'medium',
  affected_regions TEXT,                          -- JSON array of region IDs (null = all regions)
  affected_services TEXT,                         -- JSON array of service keys (null = all services)
  set_by TEXT,                                    -- UUID of user who set the flag
  set_at TEXT DEFAULT (datetime('now')),
  cleared_by TEXT,                                -- UUID of user who cleared the flag
  cleared_at TEXT,
  auto_clear_at TEXT,                             -- Optional automatic clearing time
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Only one emergency flag can be active at a time
CREATE UNIQUE INDEX IF NOT EXISTS pef_single_active ON pricing_emergency_flags(active) WHERE active = 1;

-- Index for checking active flags
CREATE INDEX IF NOT EXISTS pef_active_idx ON pricing_emergency_flags(active, set_at);