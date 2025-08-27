-- =====================================================
-- XPRESS OPS TOWER - PARTITIONING STRATEGY
-- Hot/Cold Data Separation for 1M+ Events/Day
-- Performance Target: Sub-2-second queries, 12-month retention
-- =====================================================

-- =====================================================
-- 1. LOCATION TRACKING PARTITIONING (HOT DATA)
-- =====================================================

-- Drop existing table and recreate as partitioned
DROP TABLE IF EXISTS driver_locations CASCADE;

CREATE TABLE driver_locations (
    id UUID DEFAULT uuid_generate_v4(),
    driver_id UUID NOT NULL,
    
    -- Location data
    location GEOMETRY(POINT, 4326) NOT NULL,
    accuracy DECIMAL(8,2),
    altitude DECIMAL(8,2),
    bearing DECIMAL(5,2),
    speed DECIMAL(6,2),
    
    -- Address information
    address TEXT,
    region_id UUID,
    
    -- Status information
    driver_status driver_status NOT NULL,
    is_available BOOLEAN DEFAULT FALSE,
    
    -- Metadata
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '24 hours'),
    
    PRIMARY KEY (id, recorded_at)
) PARTITION BY RANGE (recorded_at);

-- Create hourly partitions for current day (hot data)
CREATE TABLE driver_locations_current_00 PARTITION OF driver_locations
    FOR VALUES FROM (date_trunc('day', NOW()) + interval '0 hours') 
                 TO (date_trunc('day', NOW()) + interval '1 hours');

CREATE TABLE driver_locations_current_01 PARTITION OF driver_locations
    FOR VALUES FROM (date_trunc('day', NOW()) + interval '1 hours') 
                 TO (date_trunc('day', NOW()) + interval '2 hours');

-- Continue for all 24 hours (will be created dynamically)
-- Create daily partitions for historical data (warm data)
CREATE TABLE driver_locations_history PARTITION OF driver_locations
    FOR VALUES FROM ('2025-01-01') TO ('2025-12-31');

-- =====================================================
-- 2. BOOKING DATA PARTITIONING BY REGION AND TIME
-- =====================================================

-- Recreate bookings table as partitioned by region and time
ALTER TABLE bookings RENAME TO bookings_old;

CREATE TABLE bookings (
    id UUID DEFAULT uuid_generate_v4(),
    booking_reference VARCHAR(20) NOT NULL,
    
    -- Service details
    service_type service_type NOT NULL,
    status booking_status DEFAULT 'requested',
    
    -- Customer information
    customer_id UUID NOT NULL,
    customer_info JSONB NOT NULL,
    
    -- Driver assignment
    driver_id UUID,
    assigned_at TIMESTAMP WITH TIME ZONE,
    accepted_at TIMESTAMP WITH TIME ZONE,
    
    -- Location information
    pickup_location GEOMETRY(POINT, 4326) NOT NULL,
    pickup_address TEXT NOT NULL,
    dropoff_location GEOMETRY(POINT, 4326),
    dropoff_address TEXT,
    
    -- Regional compliance
    region_id UUID NOT NULL,
    
    -- Service-specific data
    service_details JSONB DEFAULT '{}',
    special_instructions TEXT,
    
    -- Pricing and payment
    base_fare DECIMAL(8,2),
    surge_multiplier DECIMAL(3,2) DEFAULT 1.00,
    total_fare DECIMAL(8,2),
    payment_status VARCHAR(20) DEFAULT 'pending',
    payment_method VARCHAR(20),
    
    -- Timeline tracking
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    estimated_pickup_time TIMESTAMP WITH TIME ZONE,
    actual_pickup_time TIMESTAMP WITH TIME ZONE,
    estimated_completion_time TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    
    -- Quality metrics
    customer_rating INTEGER,
    driver_rating INTEGER,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    PRIMARY KEY (id, region_id, created_at),
    
    CONSTRAINT bookings_rating_check CHECK (
        (customer_rating IS NULL OR (customer_rating >= 1 AND customer_rating <= 5)) AND
        (driver_rating IS NULL OR (driver_rating >= 1 AND driver_rating <= 5))
    )
) PARTITION BY HASH (region_id);

-- Create regional partitions (4 major regions in Philippines)
CREATE TABLE bookings_region_0 PARTITION OF bookings FOR VALUES WITH (modulus 4, remainder 0);
CREATE TABLE bookings_region_1 PARTITION OF bookings FOR VALUES WITH (modulus 4, remainder 1);
CREATE TABLE bookings_region_2 PARTITION OF bookings FOR VALUES WITH (modulus 4, remainder 2);
CREATE TABLE bookings_region_3 PARTITION OF bookings FOR VALUES WITH (modulus 4, remainder 3);

-- Subpartition each regional partition by time (monthly)
ALTER TABLE bookings_region_0 PARTITION BY RANGE (created_at);
ALTER TABLE bookings_region_1 PARTITION BY RANGE (created_at);
ALTER TABLE bookings_region_2 PARTITION BY RANGE (created_at);
ALTER TABLE bookings_region_3 PARTITION BY RANGE (created_at);

-- =====================================================
-- 3. INCIDENT DATA PARTITIONING (CRITICAL PERFORMANCE)
-- =====================================================

ALTER TABLE incidents RENAME TO incidents_old;

CREATE TABLE incidents (
    id UUID DEFAULT uuid_generate_v4(),
    incident_code VARCHAR(20) NOT NULL,
    
    -- Classification
    priority incident_priority NOT NULL,
    status incident_status DEFAULT 'open',
    incident_type VARCHAR(50) NOT NULL,
    
    -- Reporter information
    reporter_type VARCHAR(20) NOT NULL,
    reporter_id UUID NOT NULL,
    reporter_contact VARCHAR(100),
    
    -- Driver involvement
    driver_id UUID,
    booking_id UUID,
    
    -- Location information
    location GEOMETRY(POINT, 4326),
    address TEXT,
    region_id UUID,
    
    -- Incident details
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    attachments JSONB DEFAULT '[]',
    
    -- Response tracking
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    acknowledged_by UUID,
    first_response_time INTEGER,
    resolution_time INTEGER,
    
    -- Escalation
    escalated_at TIMESTAMP WITH TIME ZONE,
    escalated_to VARCHAR(100),
    external_reference VARCHAR(100),
    
    -- Resolution
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by UUID,
    resolution_notes TEXT,
    
    -- Follow-up
    follow_up_required BOOLEAN DEFAULT FALSE,
    follow_up_date DATE,
    follow_up_assigned_to UUID,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    PRIMARY KEY (id, priority, created_at)
) PARTITION BY LIST (priority);

-- Partition by priority for optimal emergency response
CREATE TABLE incidents_critical PARTITION OF incidents FOR VALUES IN ('critical');
CREATE TABLE incidents_high PARTITION OF incidents FOR VALUES IN ('high');
CREATE TABLE incidents_medium PARTITION OF incidents FOR VALUES IN ('medium');
CREATE TABLE incidents_low PARTITION OF incidents FOR VALUES IN ('low');

-- Subpartition critical incidents by time for fastest access
ALTER TABLE incidents_critical PARTITION BY RANGE (created_at);

-- =====================================================
-- 4. AUDIT LOG PARTITIONING (MASSIVE VOLUME)
-- =====================================================

ALTER TABLE audit_log PARTITION BY RANGE (created_at);

-- Create monthly partitions for audit logs
CREATE TABLE audit_log_2025_08 PARTITION OF audit_log
    FOR VALUES FROM ('2025-08-01') TO ('2025-09-01');

CREATE TABLE audit_log_2025_09 PARTITION OF audit_log
    FOR VALUES FROM ('2025-09-01') TO ('2025-10-01');

-- Template for future months (will be automated)

-- =====================================================
-- 5. PERFORMANCE MONITORING PARTITIONING
-- =====================================================

-- Partition driver performance by month
ALTER TABLE driver_performance_daily PARTITION BY RANGE (performance_date);

CREATE TABLE driver_performance_2025_08 PARTITION OF driver_performance_daily
    FOR VALUES FROM ('2025-08-01') TO ('2025-09-01');

CREATE TABLE driver_performance_2025_09 PARTITION OF driver_performance_daily
    FOR VALUES FROM ('2025-09-01') TO ('2025-10-01');

-- Partition operational metrics by month
ALTER TABLE operational_metrics_hourly PARTITION BY RANGE (metric_hour);

CREATE TABLE operational_metrics_2025_08 PARTITION OF operational_metrics_hourly
    FOR VALUES FROM ('2025-08-01') TO ('2025-09-01');

CREATE TABLE operational_metrics_2025_09 PARTITION OF operational_metrics_hourly
    FOR VALUES FROM ('2025-09-01') TO ('2025-10-01');

-- =====================================================
-- 6. AUTOMATED PARTITION MANAGEMENT
-- =====================================================

-- Function to create location tracking partitions
CREATE OR REPLACE FUNCTION create_location_partition(partition_date DATE)
RETURNS TEXT AS $$
DECLARE
    partition_name TEXT;
    start_time TIMESTAMP WITH TIME ZONE;
    end_time TIMESTAMP WITH TIME ZONE;
BEGIN
    partition_name := 'driver_locations_' || to_char(partition_date, 'YYYY_MM_DD');
    start_time := partition_date::TIMESTAMP WITH TIME ZONE;
    end_time := start_time + INTERVAL '1 day';
    
    EXECUTE format('CREATE TABLE %I PARTITION OF driver_locations FOR VALUES FROM (%L) TO (%L)',
                   partition_name, start_time, end_time);
                   
    -- Create indexes on new partition
    EXECUTE format('CREATE INDEX CONCURRENTLY %I ON %I USING GIST(location)', 
                   'idx_' || partition_name || '_location', partition_name);
    EXECUTE format('CREATE INDEX CONCURRENTLY %I ON %I (driver_id, recorded_at DESC)', 
                   'idx_' || partition_name || '_driver_time', partition_name);
                   
    RETURN partition_name;
END;
$$ LANGUAGE plpgsql;

-- Function to drop old location partitions (data cleanup)
CREATE OR REPLACE FUNCTION drop_old_location_partitions(retention_days INTEGER DEFAULT 7)
RETURNS TABLE(dropped_partition TEXT) AS $$
DECLARE
    partition_record RECORD;
BEGIN
    FOR partition_record IN
        SELECT schemaname, tablename 
        FROM pg_tables 
        WHERE tablename LIKE 'driver_locations_%' 
        AND tablename ~ '\d{4}_\d{2}_\d{2}$'
        AND to_date(substring(tablename from '\d{4}_\d{2}_\d{2}$'), 'YYYY_MM_DD') < CURRENT_DATE - retention_days
    LOOP
        EXECUTE format('DROP TABLE IF EXISTS %I.%I', partition_record.schemaname, partition_record.tablename);
        dropped_partition := partition_record.tablename;
        RETURN NEXT;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to create monthly partitions for various tables
CREATE OR REPLACE FUNCTION create_monthly_partitions(table_name TEXT, date_column TEXT, target_month DATE)
RETURNS TEXT AS $$
DECLARE
    partition_name TEXT;
    start_date DATE;
    end_date DATE;
BEGIN
    partition_name := table_name || '_' || to_char(target_month, 'YYYY_MM');
    start_date := date_trunc('month', target_month)::DATE;
    end_date := (start_date + INTERVAL '1 month')::DATE;
    
    EXECUTE format('CREATE TABLE %I PARTITION OF %I FOR VALUES FROM (%L) TO (%L)',
                   partition_name, table_name, start_date, end_date);
                   
    RETURN partition_name;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 7. PARTITION PRUNING OPTIMIZATION
-- =====================================================

-- Enable partition pruning parameters
ALTER SYSTEM SET enable_partition_pruning = on;
ALTER SYSTEM SET enable_partitionwise_join = on;
ALTER SYSTEM SET enable_partitionwise_aggregate = on;

-- =====================================================
-- 8. PARTITION MAINTENANCE PROCEDURES
-- =====================================================

-- Procedure to maintain partitions automatically
CREATE OR REPLACE FUNCTION maintain_partitions()
RETURNS TEXT AS $$
DECLARE
    result TEXT;
    today DATE := CURRENT_DATE;
    next_week DATE := CURRENT_DATE + INTERVAL '7 days';
BEGIN
    result := '';
    
    -- Create location partitions for next week
    FOR i IN 0..6 LOOP
        BEGIN
            result := result || create_location_partition(next_week + i) || E'\n';
        EXCEPTION WHEN duplicate_table THEN
            -- Partition already exists, skip
            NULL;
        END;
    END LOOP;
    
    -- Drop old location partitions (keep only 7 days)
    SELECT string_agg(dropped_partition, E'\n') INTO result 
    FROM drop_old_location_partitions(7);
    
    -- Create monthly partitions for next month
    IF EXTRACT(day FROM today) = 1 THEN  -- First day of month
        -- Create next month's partitions
        BEGIN
            result := result || create_monthly_partitions('bookings_region_0', 'created_at', today + INTERVAL '1 month') || E'\n';
            result := result || create_monthly_partitions('bookings_region_1', 'created_at', today + INTERVAL '1 month') || E'\n';
            result := result || create_monthly_partitions('bookings_region_2', 'created_at', today + INTERVAL '1 month') || E'\n';
            result := result || create_monthly_partitions('bookings_region_3', 'created_at', today + INTERVAL '1 month') || E'\n';
            result := result || create_monthly_partitions('audit_log', 'created_at', today + INTERVAL '1 month') || E'\n';
        EXCEPTION WHEN duplicate_table THEN
            -- Partition already exists, skip
            NULL;
        END;
    END IF;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Schedule partition maintenance (will be called by cron job)
-- CREATE EXTENSION IF NOT EXISTS pg_cron;
-- SELECT cron.schedule('partition-maintenance', '0 2 * * *', 'SELECT maintain_partitions()');

-- =====================================================
-- 9. PARTITION-AWARE INDEXES
-- =====================================================

-- Indexes on partitioned tables
CREATE INDEX CONCURRENTLY idx_bookings_region_0_status_time ON bookings_region_0 (status, created_at DESC);
CREATE INDEX CONCURRENTLY idx_bookings_region_1_status_time ON bookings_region_1 (status, created_at DESC);
CREATE INDEX CONCURRENTLY idx_bookings_region_2_status_time ON bookings_region_2 (status, created_at DESC);
CREATE INDEX CONCURRENTLY idx_bookings_region_3_status_time ON bookings_region_3 (status, created_at DESC);

CREATE INDEX CONCURRENTLY idx_incidents_critical_status_time ON incidents_critical (status, created_at DESC);
CREATE INDEX CONCURRENTLY idx_incidents_high_status_time ON incidents_high (status, created_at DESC);

-- =====================================================
-- PERFORMANCE MONITORING QUERIES
-- =====================================================

-- Query to check partition sizes
CREATE VIEW v_partition_sizes AS
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
    pg_total_relation_size(schemaname||'.'||tablename) as size_bytes
FROM pg_tables 
WHERE tablename LIKE '%_202%' OR tablename LIKE '%_region_%' OR tablename LIKE '%_critical'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Query to check partition pruning effectiveness
CREATE VIEW v_partition_pruning_stats AS
SELECT 
    query,
    calls,
    total_time,
    mean_time,
    rows
FROM pg_stat_statements 
WHERE query LIKE '%driver_locations%' 
   OR query LIKE '%bookings%' 
   OR query LIKE '%incidents%'
ORDER BY mean_time DESC
LIMIT 20;

-- =====================================================
-- DOCUMENTATION
-- =====================================================

COMMENT ON FUNCTION create_location_partition(DATE) IS 'Creates daily partitions for driver location tracking with optimal indexes';
COMMENT ON FUNCTION drop_old_location_partitions(INTEGER) IS 'Drops location partitions older than specified days to manage disk space';
COMMENT ON FUNCTION maintain_partitions() IS 'Main partition maintenance function to be run daily via cron';
COMMENT ON VIEW v_partition_sizes IS 'Monitor partition sizes for capacity planning';
COMMENT ON VIEW v_partition_pruning_stats IS 'Monitor query performance and partition pruning effectiveness';