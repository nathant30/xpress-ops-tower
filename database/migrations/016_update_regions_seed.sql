-- 016_update_regions_seed.sql
-- Update regions to match the correct seed data

BEGIN TRANSACTION;

-- Clear existing regions and reset to match the correct seed
DELETE FROM regional_user_access;
DELETE FROM region_access_overrides;
DELETE FROM regions;

-- Insert the correct regions following the seed pattern
INSERT INTO regions (region_id, name, region_state, country_code, timezone, created_at) VALUES
  ('NCR', 'NCR', 'active', 'PH', 'Asia/Manila', datetime('now')),
  ('BTN', 'Bataan', 'active', 'PH', 'Asia/Manila', datetime('now')),
  ('PMP', 'Pampanga', 'pilot', 'PH', 'Asia/Manila', datetime('now')),
  ('BUL', 'Bulacan', 'pilot', 'PH', 'Asia/Manila', datetime('now')),
  ('CAV', 'Cavite', 'active', 'PH', 'Asia/Manila', datetime('now')),
  ('LAG', 'Laguna', 'pilot', 'PH', 'Asia/Manila', datetime('now')),
  ('BORA', 'Boracay', 'active', 'PH', 'Asia/Manila', datetime('now'));

-- Add some demo regional access for the super admin
INSERT OR IGNORE INTO regional_user_access (user_id, region_id, access_level) VALUES 
('usr-super-admin-001', 'NCR', 'manage'),
('usr-super-admin-001', 'BTN', 'write'),
('usr-super-admin-001', 'BORA', 'manage');

COMMIT;