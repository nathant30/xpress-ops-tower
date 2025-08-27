-- =====================================================
-- MIGRATION 003: Performance Indexes
-- Sub-2-Second Query Performance Optimization
-- =====================================================

-- Migration metadata
INSERT INTO schema_migrations (version, description, executed_at) VALUES 
('003', 'Create comprehensive indexes for sub-2-second query performance', NOW());

-- =====================================================
-- CRITICAL REAL-TIME INDEXES
-- =====================================================

-- Driver availability for assignment (most critical query)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_drivers_realtime_availability 
ON drivers (status, region_id, services, rating DESC, total_trips DESC) 
WHERE is_active = TRUE;

-- Location-based driver search (geospatial)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_driver_locations_realtime_spatial 
ON driver_locations USING GIST (location, recorded_at) 
WHERE is_available = TRUE AND expires_at > NOW();

-- Emergency incident response (critical <60s requirement)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_incidents_emergency_response 
ON incidents (priority, status, region_id, created_at DESC)
WHERE status IN ('open', 'acknowledged');

-- Active booking tracking
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bookings_active_tracking 
ON bookings (status, driver_id, region_id, created_at DESC)
WHERE status NOT IN ('completed', 'cancelled', 'failed');

-- =====================================================
-- DRIVER MANAGEMENT INDEXES
-- =====================================================

-- Driver lookup by code (frequent operation)
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS idx_drivers_code_active 
ON drivers (driver_code) WHERE is_active = TRUE;

-- Driver performance queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_drivers_performance_rating 
ON drivers (region_id, rating DESC, total_trips DESC, completed_trips DESC)
WHERE is_active = TRUE;

-- Multi-service driver search
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_drivers_services_gin 
ON drivers USING GIN (services) WHERE is_active = TRUE;

-- Driver status monitoring
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_drivers_status_monitoring 
ON drivers (status, region_id, last_login DESC) WHERE is_active = TRUE;

-- =====================================================
-- LOCATION TRACKING INDEXES (HOT DATA)
-- =====================================================

-- Driver location history (for tracking and analytics)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_driver_locations_history 
ON driver_locations (driver_id, recorded_at DESC);

-- Available drivers in region (real-time assignment)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_driver_locations_available_region 
ON driver_locations (region_id, is_available, driver_status, recorded_at DESC)
WHERE expires_at > NOW();

-- Speed and movement analysis
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_driver_locations_movement 
ON driver_locations (driver_id, speed, bearing, recorded_at DESC)
WHERE speed > 0;

-- Accuracy filtering for precise tracking
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_driver_locations_accuracy 
ON driver_locations (accuracy, recorded_at DESC) WHERE accuracy < 50;

-- =====================================================
-- BOOKING SYSTEM INDEXES
-- =====================================================

-- Customer booking history
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bookings_customer_history 
ON bookings (customer_id, created_at DESC, status);

-- Driver trip history and earnings
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bookings_driver_trips 
ON bookings (driver_id, status, completed_at DESC) WHERE driver_id IS NOT NULL;

-- Service type analytics
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bookings_service_analytics 
ON bookings (service_type, region_id, created_at DESC, status);

-- Pickup location clustering (for demand analysis)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bookings_pickup_clustering 
ON bookings USING GIST (pickup_location, created_at);

-- Wait time analysis
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bookings_wait_time 
ON bookings (requested_at, assigned_at, accepted_at) WHERE assigned_at IS NOT NULL;

-- Surge pricing analysis
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bookings_surge_pricing 
ON bookings (region_id, surge_multiplier, created_at DESC) WHERE surge_multiplier > 1.0;

-- Payment status tracking
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bookings_payment_tracking 
ON bookings (payment_status, payment_method, total_fare, completed_at DESC);

-- =====================================================
-- INCIDENT MANAGEMENT INDEXES
-- =====================================================

-- Response time monitoring (KPI tracking)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_incidents_response_time 
ON incidents (created_at DESC, acknowledged_at, first_response_time) 
WHERE status NOT IN ('closed');

-- Driver incident history
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_incidents_driver_history 
ON incidents (driver_id, created_at DESC, priority, status) WHERE driver_id IS NOT NULL;

-- Location-based incident clustering
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_incidents_location_clustering 
ON incidents USING GIST (location, created_at) WHERE location IS NOT NULL;

-- Escalation tracking
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_incidents_escalation 
ON incidents (escalated_at DESC, escalated_to, status) WHERE escalated_at IS NOT NULL;

-- Follow-up management
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_incidents_followup 
ON incidents (follow_up_required, follow_up_date, follow_up_assigned_to) 
WHERE follow_up_required = TRUE;

-- =====================================================
-- PERFORMANCE ANALYTICS INDEXES
-- =====================================================

-- Driver daily performance lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_driver_performance_analytics 
ON driver_performance_daily (driver_id, performance_date DESC, completion_rate DESC);

-- Regional performance comparison
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_driver_performance_regional 
ON driver_performance_daily (region_id, performance_date DESC, total_trips DESC);

-- Earnings analysis
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_driver_performance_earnings 
ON driver_performance_daily (performance_date DESC, gross_earnings DESC, net_earnings DESC);

-- Operational metrics time series
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_operational_metrics_timeseries 
ON operational_metrics_hourly (metric_hour DESC, region_id);

-- System health monitoring
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_system_health_monitoring 
ON system_health (component, recorded_at DESC, status) WHERE status != 'healthy';

-- =====================================================
-- AUDIT AND SECURITY INDEXES
-- =====================================================

-- Audit trail for security
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_log_security 
ON audit_log (user_id, event_type, created_at DESC);

-- Entity audit history
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_log_entity 
ON audit_log (entity_type, entity_id, created_at DESC);

-- API endpoint performance tracking
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_log_api 
ON audit_log (api_endpoint, created_at DESC) WHERE api_endpoint IS NOT NULL;

-- =====================================================
-- COMPOSITE INDEXES FOR COMPLEX QUERIES
-- =====================================================

-- Real-time dashboard query (most frequent)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_realtime_dashboard 
ON driver_locations (region_id, is_available, driver_status, recorded_at DESC) 
INCLUDE (driver_id, location, speed) WHERE expires_at > NOW();

-- Booking assignment optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_booking_assignment 
ON bookings (region_id, status, service_type, created_at) 
INCLUDE (pickup_location) WHERE status IN ('requested', 'searching');

-- Incident priority response
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_incident_priority_response 
ON incidents (priority, status, region_id) 
INCLUDE (created_at, driver_id, location) WHERE status IN ('open', 'acknowledged', 'in_progress');

-- =====================================================
-- PARTIAL INDEXES FOR SPECIFIC USE CASES
-- =====================================================

-- Online drivers only (most common filter)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_drivers_online_only 
ON drivers (region_id, services, rating DESC) 
WHERE status IN ('active', 'busy') AND is_active = TRUE;

-- Current location data only (exclude expired)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_locations_current_only 
ON driver_locations (driver_id, recorded_at DESC) 
WHERE expires_at > NOW();

-- Incomplete bookings (active operations)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bookings_incomplete 
ON bookings (region_id, created_at DESC) 
WHERE status NOT IN ('completed', 'cancelled', 'failed');

-- Open incidents requiring action
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_incidents_open 
ON incidents (priority, created_at) 
WHERE status IN ('open', 'acknowledged', 'in_progress');

-- =====================================================
-- EXPRESSION INDEXES FOR COMPUTED VALUES
-- =====================================================

-- Wait time calculation
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bookings_wait_time_calc 
ON bookings (EXTRACT(EPOCH FROM (assigned_at - requested_at))) 
WHERE assigned_at IS NOT NULL;

-- Distance calculation (for nearby driver search)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_driver_locations_distance 
ON driver_locations USING GIST (location) 
WHERE is_available = TRUE AND expires_at > NOW();

-- =====================================================
-- TEXT SEARCH INDEXES
-- =====================================================

-- Driver name search
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_drivers_name_search 
ON drivers USING GIN (to_tsvector('english', first_name || ' ' || last_name));

-- Incident description search
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_incidents_description_search 
ON incidents USING GIN (to_tsvector('english', title || ' ' || description));

-- Address search
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bookings_address_search 
ON bookings USING GIN (to_tsvector('english', pickup_address || ' ' || dropoff_address));

-- =====================================================
-- INDEX MONITORING QUERIES
-- =====================================================

-- Create view to monitor index usage
CREATE VIEW v_index_usage_stats AS
SELECT
    schemaname,
    tablename,
    indexname,
    idx_tup_read,
    idx_tup_fetch,
    idx_scan,
    ROUND((idx_tup_read::numeric / NULLIF(idx_scan, 0)), 2) as avg_tuples_per_scan,
    pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC, idx_tup_read DESC;

-- Create view to identify unused indexes
CREATE VIEW v_unused_indexes AS
SELECT
    schemaname,
    tablename,
    indexname,
    pg_size_pretty(pg_relation_size(indexrelid)) as index_size,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch
FROM pg_stat_user_indexes
WHERE schemaname = 'public' AND idx_scan < 10
ORDER BY pg_relation_size(indexrelid) DESC;

-- =====================================================
-- INDEX MAINTENANCE FUNCTIONS
-- =====================================================

-- Function to rebuild fragmented indexes
CREATE OR REPLACE FUNCTION rebuild_fragmented_indexes(fragmentation_threshold FLOAT DEFAULT 0.3)
RETURNS TABLE(rebuilt_index TEXT, old_size TEXT, new_size TEXT) AS $$
DECLARE
    index_record RECORD;
    old_size BIGINT;
    new_size BIGINT;
BEGIN
    FOR index_record IN
        SELECT schemaname, indexname, tablename
        FROM pg_stat_user_indexes psu
        JOIN pg_stat_user_tables pst ON psu.relid = pst.relid
        WHERE pst.n_tup_upd + pst.n_tup_del > 1000  -- Active table
        AND psu.idx_scan > 100  -- Used index
    LOOP
        -- Get current size
        SELECT pg_relation_size(index_record.schemaname||'.'||index_record.indexname) INTO old_size;
        
        -- Rebuild index
        EXECUTE format('REINDEX INDEX CONCURRENTLY %I.%I', index_record.schemaname, index_record.indexname);
        
        -- Get new size
        SELECT pg_relation_size(index_record.schemaname||'.'||index_record.indexname) INTO new_size;
        
        rebuilt_index := index_record.schemaname||'.'||index_record.indexname;
        old_size := pg_size_pretty(old_size);
        new_size := pg_size_pretty(new_size);
        
        RETURN NEXT;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- ANALYZE STATISTICS UPDATE
-- =====================================================

-- Update table statistics for query planner
ANALYZE drivers;
ANALYZE driver_locations;
ANALYZE bookings;
ANALYZE incidents;
ANALYZE driver_performance_daily;
ANALYZE operational_metrics_hourly;

-- Set more frequent auto-analyze for high-volume tables
ALTER TABLE driver_locations SET (autovacuum_analyze_scale_factor = 0.02);  -- Analyze after 2% change
ALTER TABLE bookings SET (autovacuum_analyze_scale_factor = 0.05);  -- Analyze after 5% change
ALTER TABLE incidents SET (autovacuum_analyze_scale_factor = 0.1);   -- Analyze after 10% change

-- =====================================================
-- DOCUMENTATION
-- =====================================================

COMMENT ON VIEW v_index_usage_stats IS 'Monitor index usage patterns for optimization';
COMMENT ON VIEW v_unused_indexes IS 'Identify unused indexes that can be dropped to save space';
COMMENT ON FUNCTION rebuild_fragmented_indexes(FLOAT) IS 'Rebuild indexes that have become fragmented due to high update activity';