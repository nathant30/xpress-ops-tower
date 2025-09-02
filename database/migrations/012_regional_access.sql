-- 012_regional_access.sql
-- Regional access scaffolding + capabilities (SQLite adaptation)
-- Works with existing regions table structure

BEGIN TRANSACTION;

-- 1) Use existing regions table (region_id as TEXT PRIMARY KEY)
-- No need to create new regions table, but add numeric ID mapping
CREATE TABLE IF NOT EXISTS region_id_mapping (
  numeric_id INTEGER PRIMARY KEY AUTOINCREMENT,
  region_id TEXT UNIQUE NOT NULL REFERENCES regions(region_id),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Populate mapping for existing regions
INSERT OR IGNORE INTO region_id_mapping (region_id)
SELECT region_id FROM regions;

-- 2) User ↔ Region grants (using TEXT region_id to match existing schema)
CREATE TABLE IF NOT EXISTS user_regions (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  region_id TEXT NOT NULL REFERENCES regions(region_id) ON DELETE CASCADE,
  access_level TEXT NOT NULL CHECK (access_level IN ('read','write','manage')),
  granted_by TEXT REFERENCES users(id),
  granted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, region_id)
);

CREATE INDEX IF NOT EXISTS ur_user_idx ON user_regions(user_id);
CREATE INDEX IF NOT EXISTS ur_region_idx ON user_regions(region_id);

-- 3) Temporary overrides
CREATE TABLE IF NOT EXISTS region_access_overrides (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  region_id TEXT NOT NULL REFERENCES regions(region_id) ON DELETE CASCADE,
  access_level TEXT NOT NULL CHECK (access_level IN ('read','write','manage')),
  reason TEXT NOT NULL,
  starts_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ends_at TIMESTAMP NOT NULL,
  created_by TEXT REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS rao_user_region_idx ON region_access_overrides(user_id, region_id);
CREATE INDEX IF NOT EXISTS rao_active_idx ON region_access_overrides(user_id, region_id, starts_at, ends_at);

-- 4) Regional capabilities (separate from existing role_capabilities)
CREATE TABLE IF NOT EXISTS regional_capabilities (
  role_key TEXT NOT NULL,
  capability TEXT NOT NULL,
  scope TEXT NOT NULL DEFAULT 'region' CHECK (scope IN ('region','global')),
  UNIQUE (role_key, capability)
);

-- Seed typical capabilities
INSERT OR IGNORE INTO regional_capabilities(role_key, capability, scope) VALUES
  ('expansion_manager','region:create','global'),
  ('expansion_manager','region:activate','global'),
  ('expansion_manager','service:enable','region'),
  ('expansion_manager','region:assign_rm','region'),
  ('executive','region:create','global'),
  ('executive','region:activate','global'),
  ('executive','service:enable','global'),
  ('executive','region:assign_rm','global'),
  ('iam_admin','region:create','global'),
  ('iam_admin','region:activate','global'),
  ('iam_admin','service:enable','global'),
  ('iam_admin','region:assign_rm','global'),
  ('app_admin','region:create','global'),
  ('app_admin','region:activate','global'),
  ('app_admin','service:enable','global'),
  ('app_admin','region:assign_rm','global');

-- 5) Effective access view (max level wins)
CREATE VIEW IF NOT EXISTS effective_user_region_access AS
WITH base AS (
  SELECT ur.user_id, ur.region_id, ur.access_level,
         CASE ur.access_level WHEN 'read' THEN 1 WHEN 'write' THEN 2 WHEN 'manage' THEN 3 END AS lvl
  FROM user_regions ur
),
ovr AS (
  SELECT r.user_id, r.region_id, r.access_level,
         CASE r.access_level WHEN 'read' THEN 1 WHEN 'write' THEN 2 WHEN 'manage' THEN 3 END AS lvl
  FROM region_access_overrides r
  WHERE datetime('now') BETWEEN r.starts_at AND r.ends_at
),
merged AS (
  SELECT user_id, region_id, access_level, lvl FROM base
  UNION ALL
  SELECT user_id, region_id, access_level, lvl FROM ovr
),
ranked AS (
  SELECT user_id, region_id, access_level, 
         ROW_NUMBER() OVER (PARTITION BY user_id, region_id ORDER BY lvl DESC) as rn
  FROM merged
)
SELECT user_id, region_id, access_level
FROM ranked 
WHERE rn = 1;

COMMIT;

-- Manual rollback if needed:
-- DROP VIEW IF EXISTS effective_user_region_access;
-- DROP TABLE IF EXISTS role_capabilities;
-- DROP TABLE IF EXISTS region_access_overrides;
-- DROP TABLE IF EXISTS user_regions;
-- DROP TABLE IF EXISTS regions;