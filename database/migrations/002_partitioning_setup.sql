-- =====================================================
-- MIGRATION 002: Partitioning Setup
-- Hot/Cold Data Separation Implementation
-- =====================================================

-- Migration metadata
INSERT INTO schema_migrations (version, description, executed_at) VALUES 
('002', 'Implement table partitioning for performance and scalability', NOW());

-- Execute partitioning strategy
\i '../partitions/partitioning_strategy.sql'

-- Create initial daily partitions for location tracking (next 7 days)
SELECT create_location_partition(CURRENT_DATE + i) 
FROM generate_series(0, 6) AS i;

-- Create monthly partitions for current and next month
DO $$
DECLARE
    current_month DATE := date_trunc('month', CURRENT_DATE);
    next_month DATE := date_trunc('month', CURRENT_DATE + INTERVAL '1 month');
BEGIN
    -- Booking partitions by region
    PERFORM create_monthly_partitions('bookings_region_0', 'created_at', current_month);
    PERFORM create_monthly_partitions('bookings_region_1', 'created_at', current_month);
    PERFORM create_monthly_partitions('bookings_region_2', 'created_at', current_month);
    PERFORM create_monthly_partitions('bookings_region_3', 'created_at', current_month);
    
    PERFORM create_monthly_partitions('bookings_region_0', 'created_at', next_month);
    PERFORM create_monthly_partitions('bookings_region_1', 'created_at', next_month);
    PERFORM create_monthly_partitions('bookings_region_2', 'created_at', next_month);
    PERFORM create_monthly_partitions('bookings_region_3', 'created_at', next_month);
    
    -- Critical incident time-based partitions
    EXECUTE format('CREATE TABLE incidents_critical_%s PARTITION OF incidents_critical FOR VALUES FROM (%L) TO (%L)',
                   to_char(current_month, 'YYYY_MM'),
                   current_month,
                   next_month);
                   
    EXECUTE format('CREATE TABLE incidents_critical_%s PARTITION OF incidents_critical FOR VALUES FROM (%L) TO (%L)',
                   to_char(next_month, 'YYYY_MM'),
                   next_month,
                   next_month + INTERVAL '1 month');
    
    -- Audit log partitions
    PERFORM create_monthly_partitions('audit_log', 'created_at', current_month);
    PERFORM create_monthly_partitions('audit_log', 'created_at', next_month);
    
    -- Performance tracking partitions
    PERFORM create_monthly_partitions('driver_performance_daily', 'performance_date', current_month);
    PERFORM create_monthly_partitions('driver_performance_daily', 'performance_date', next_month);
    
    PERFORM create_monthly_partitions('operational_metrics_hourly', 'metric_hour', current_month);
    PERFORM create_monthly_partitions('operational_metrics_hourly', 'metric_hour', next_month);
END $$;

-- Migrate data from old tables if they exist
DO $$
BEGIN
    -- Migrate bookings
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'bookings_old') THEN
        INSERT INTO bookings SELECT * FROM bookings_old;
        DROP TABLE bookings_old;
    END IF;
    
    -- Migrate incidents
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'incidents_old') THEN
        INSERT INTO incidents SELECT * FROM incidents_old;
        DROP TABLE incidents_old;
    END IF;
END $$;

-- Set up automated partition constraint exclusion
ALTER TABLE driver_locations SET (enable_partitionwise_join = on);
ALTER TABLE bookings SET (enable_partitionwise_join = on);
ALTER TABLE incidents SET (enable_partitionwise_join = on);

-- Create partition monitoring view
CREATE VIEW v_partition_health AS
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as table_size,
    pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) as data_size,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) as index_size,
    (SELECT count(*) FROM information_schema.table_constraints WHERE table_name = t.tablename AND constraint_type = 'CHECK') as check_constraints
FROM pg_tables t
WHERE tablename LIKE '%_202%' 
   OR tablename LIKE '%_region_%' 
   OR tablename LIKE '%_critical%'
   OR tablename LIKE '%_high%'
   OR tablename LIKE '%_medium%'
   OR tablename LIKE '%_low%'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

COMMENT ON VIEW v_partition_health IS 'Monitor partition health, sizes, and constraint effectiveness';