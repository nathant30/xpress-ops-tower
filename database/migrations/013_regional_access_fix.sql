-- 013_regional_access_fix.sql
-- Fix regional access to work with existing schema

BEGIN TRANSACTION;

-- Drop and recreate user_regions with correct schema for regional access
DROP TABLE IF EXISTS user_regions_old;
ALTER TABLE user_regions RENAME TO user_regions_old;

-- Create new user_regions table with proper schema
CREATE TABLE user_regions (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  region_id TEXT NOT NULL REFERENCES regions(region_id) ON DELETE CASCADE,
  access_level TEXT NOT NULL CHECK (access_level IN ('read','write','manage')),
  granted_by TEXT REFERENCES users(id),
  granted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, region_id)
);

CREATE INDEX IF NOT EXISTS ur_user_idx_new ON user_regions(user_id);
CREATE INDEX IF NOT EXISTS ur_region_idx_new ON user_regions(region_id);

-- Migrate existing data if any (map user_role to access_level)
INSERT INTO user_regions (user_id, region_id, access_level, granted_at)
SELECT 
  user_id, 
  region_id, 
  CASE 
    WHEN user_role IN ('ops_manager', 'regional_manager') THEN 'manage'
    WHEN user_role IN ('ops_coordinator', 'city_manager') THEN 'write'
    ELSE 'read'
  END as access_level,
  assigned_at
FROM user_regions_old
WHERE is_active = 1;

-- Drop old table
DROP TABLE user_regions_old;

-- Update view to match new schema
DROP VIEW IF EXISTS effective_user_region_access;
CREATE VIEW effective_user_region_access AS
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