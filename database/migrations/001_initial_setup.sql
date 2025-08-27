-- =====================================================
-- MIGRATION 001: Initial Setup
-- Xpress Ops Tower Database Foundation
-- =====================================================

-- Migration metadata
INSERT INTO schema_migrations (version, description, executed_at) VALUES 
('001', 'Initial database setup with core tables', NOW());

-- Execute core schema
\i '../schemas/01_core_schema.sql'

-- Create initial regions (Philippines major regions)
INSERT INTO regions (name, code, country_code, timezone, status, max_drivers, center_point, lgu_restrictions, operating_hours) VALUES
('Metro Manila', 'MMD', 'PH', 'Asia/Manila', 'active', 3000, ST_Point(121.0244, 14.6592, 4326), 
 '{"restricted_areas": [], "vehicle_restrictions": {"jeepney": false, "motorcycle": true, "car": true}}',
 '{"start": "05:00", "end": "02:00", "24_hours": false}'),

('Cebu', 'CEB', 'PH', 'Asia/Manila', 'active', 2000, ST_Point(123.8854, 10.3157, 4326),
 '{"restricted_areas": ["Colon Street"], "vehicle_restrictions": {"jeepney": true, "motorcycle": true, "car": true}}',
 '{"start": "05:00", "end": "00:00", "24_hours": false}'),

('Davao', 'DAV', 'PH', 'Asia/Manila', 'active', 1500, ST_Point(125.6158, 7.1907, 4326),
 '{"restricted_areas": [], "vehicle_restrictions": {"jeepney": true, "motorcycle": true, "car": true}}',
 '{"start": "05:00", "end": "01:00", "24_hours": false}'),

('Baguio', 'BAG', 'PH', 'Asia/Manila', 'active', 800, ST_Point(120.5960, 16.4023, 4326),
 '{"restricted_areas": ["Session Road"], "vehicle_restrictions": {"jeepney": false, "motorcycle": true, "car": false}}',
 '{"start": "06:00", "end": "22:00", "24_hours": false}'),

('Boracay', 'BOR', 'PH', 'Asia/Manila', 'active', 500, ST_Point(121.9270, 11.9674, 4326),
 '{"restricted_areas": ["White Beach"], "vehicle_restrictions": {"jeepney": false, "motorcycle": false, "car": false}, "electric_only": true}',
 '{"start": "05:00", "end": "24:00", "24_hours": false}');

-- Create schema migrations tracking table
CREATE TABLE IF NOT EXISTS schema_migrations (
    version VARCHAR(20) PRIMARY KEY,
    description TEXT NOT NULL,
    executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    rollback_sql TEXT
);

-- Set up row level security (RLS) for multi-tenancy
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for regional data isolation
CREATE POLICY drivers_region_policy ON drivers
    FOR ALL TO ops_users
    USING (region_id = current_setting('app.current_region_id')::uuid);

CREATE POLICY bookings_region_policy ON bookings
    FOR ALL TO ops_users
    USING (region_id = current_setting('app.current_region_id')::uuid);

CREATE POLICY incidents_region_policy ON incidents
    FOR ALL TO ops_users
    USING (region_id = current_setting('app.current_region_id')::uuid);

-- Create database roles
CREATE ROLE ops_admin;
CREATE ROLE ops_operator;
CREATE ROLE ops_viewer;
CREATE ROLE ops_api;

-- Grant permissions
GRANT ALL ON ALL TABLES IN SCHEMA public TO ops_admin;
GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO ops_operator;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO ops_viewer;
GRANT SELECT, INSERT, UPDATE ON drivers, bookings, driver_locations, incidents TO ops_api;

COMMENT ON TABLE schema_migrations IS 'Tracks database schema migrations and versions';