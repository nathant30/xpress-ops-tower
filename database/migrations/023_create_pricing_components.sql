-- Presentation-layer components (values + descriptions + publish flags)
-- SQLite compatible version

CREATE TABLE IF NOT EXISTS pricing_components (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  profile_id INTEGER NOT NULL,
  key TEXT NOT NULL,                        -- 'base_fare','included_km','per_km','per_min','booking_fee', etc.
  value_numeric REAL,                       -- number value (amount/rate)
  unit TEXT,                                -- 'PHP','KM','PHP_PER_KM','PHP_PER_MIN'
  description TEXT,                         -- rider-safe copy (markdown ok)
  publish INTEGER NOT NULL DEFAULT 1,      -- show in rider breakdown? (SQLite boolean as INTEGER)
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  
  FOREIGN KEY (profile_id) REFERENCES pricing_profiles(id) ON DELETE CASCADE,
  UNIQUE (profile_id, key)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS pricing_components_profile_idx ON pricing_components(profile_id);