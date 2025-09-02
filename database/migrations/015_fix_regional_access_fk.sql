-- 015_fix_regional_access_fk.sql  
-- Fix foreign key references in regional access tables

BEGIN TRANSACTION;

-- Drop the existing table with wrong foreign key
DROP TABLE IF EXISTS regional_user_access;

-- Recreate with correct foreign key references
CREATE TABLE regional_user_access (
  user_id TEXT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  region_id TEXT NOT NULL REFERENCES regions(region_id) ON DELETE CASCADE,
  access_level TEXT NOT NULL CHECK (access_level IN ('read','write','manage')),
  granted_by TEXT REFERENCES users(user_id),
  granted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, region_id)
);

CREATE INDEX rua_user_idx ON regional_user_access(user_id);
CREATE INDEX rua_region_idx ON regional_user_access(region_id);

-- Add some demo data
INSERT OR IGNORE INTO regional_user_access (user_id, region_id, access_level) VALUES 
('usr-super-admin-001', 'ph-ncr-manila', 'manage'),
('usr-super-admin-001', 'ph-vis-cebu', 'write'),
('usr-super-admin-001', 'ph-min-davao', 'read');

-- Also fix the region_access_overrides table if it exists
DROP TABLE IF EXISTS region_access_overrides;
CREATE TABLE IF NOT EXISTS region_access_overrides (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  region_id TEXT NOT NULL REFERENCES regions(region_id) ON DELETE CASCADE,
  access_level TEXT NOT NULL CHECK (access_level IN ('read','write','manage')),
  reason TEXT NOT NULL,
  starts_at TIMESTAMP NOT NULL,
  ends_at TIMESTAMP NOT NULL,
  created_by TEXT REFERENCES users(user_id),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX rao_user_idx ON region_access_overrides(user_id);
CREATE INDEX rao_region_idx ON region_access_overrides(region_id);
CREATE INDEX rao_active_idx ON region_access_overrides(starts_at, ends_at);

-- Update the view to match
DROP VIEW IF EXISTS effective_user_region_access;
CREATE VIEW effective_user_region_access AS
WITH base AS (
  SELECT ur.user_id, ur.region_id, ur.access_level,
         CASE ur.access_level WHEN 'read' THEN 1 WHEN 'write' THEN 2 WHEN 'manage' THEN 3 END AS lvl
  FROM regional_user_access ur
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