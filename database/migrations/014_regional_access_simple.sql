-- 014_regional_access_simple.sql
-- Simple regional access setup without touching existing user_regions

BEGIN TRANSACTION;

-- Create new regional_user_access table
CREATE TABLE IF NOT EXISTS regional_user_access (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  region_id TEXT NOT NULL REFERENCES regions(region_id) ON DELETE CASCADE,
  access_level TEXT NOT NULL CHECK (access_level IN ('read','write','manage')),
  granted_by TEXT REFERENCES users(id),
  granted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, region_id)
);

CREATE INDEX IF NOT EXISTS rua_user_idx ON regional_user_access(user_id);
CREATE INDEX IF NOT EXISTS rua_region_idx ON regional_user_access(region_id);

-- Add some demo data
INSERT OR IGNORE INTO regional_user_access (user_id, region_id, access_level) VALUES 
('cm0emgl4t000308mb3qme3p4f', 'MNL', 'manage'),
('cm0emgl4t000308mb3qme3p4f', 'CEB', 'write'),
('cm0emgl4t000308mb3qme3p4f', 'DAV', 'read');

-- Update view to use new table
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