-- Feature flags for progressive rollout of pricing features
-- Enables/disables micro-zones, predictive surge, personalization per region/service

CREATE TABLE IF NOT EXISTS pricing_feature_flags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  region_id TEXT NOT NULL,                        -- Region identifier
  service_key TEXT NOT NULL CHECK (service_key IN ('tnvs','taxi','special','pop')),
  flag TEXT NOT NULL CHECK (flag IN ('micro_zones','predictive_surge','personalization','experiments')),
  enabled INTEGER NOT NULL DEFAULT 0,            -- BOOLEAN as INTEGER in SQLite
  config TEXT,                                    -- JSON configuration for the feature
  description TEXT,                               -- Human-readable description
  created_by TEXT,                                -- UUID of user who created
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  UNIQUE (region_id, service_key, flag)
);

-- Indexes for feature flag lookups
CREATE INDEX IF NOT EXISTS pff_region_service_idx ON pricing_feature_flags(region_id, service_key);
CREATE INDEX IF NOT EXISTS pff_flag_idx ON pricing_feature_flags(flag, enabled);