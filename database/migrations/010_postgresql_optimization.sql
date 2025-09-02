-- PostgreSQL Migration 010: Performance Optimizations
-- Converts SQLite schema to production-ready PostgreSQL with performance enhancements
-- COMPATIBILITY: This migration is PostgreSQL-specific and will be skipped in SQLite environments

-- =====================================================
-- Enable PostgreSQL Extensions
-- =====================================================

-- UUID generation for better primary keys
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Full-text search capabilities
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- PostGIS for location-based queries (if not already installed)
-- CREATE EXTENSION IF NOT EXISTS "postgis";

-- Better statistics for query optimization
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- =====================================================
-- PostgreSQL-Optimized Data Types
-- =====================================================

-- Convert TEXT primary keys to UUID for better performance
-- Note: This requires careful data migration to preserve foreign key relationships

-- Enhanced user management with UUID primary keys
ALTER TABLE users 
  ALTER COLUMN user_id TYPE UUID USING user_id::UUID;

-- Update foreign key columns to match
ALTER TABLE user_roles 
  ALTER COLUMN user_id TYPE UUID USING user_id::UUID,
  ALTER COLUMN assigned_by_user_id TYPE UUID USING assigned_by_user_id::UUID;

ALTER TABLE user_regions 
  ALTER COLUMN user_id TYPE UUID USING user_id::UUID;

ALTER TABLE approval_requests 
  ALTER COLUMN request_id TYPE UUID USING request_id::UUID,
  ALTER COLUMN requester_id TYPE UUID USING requester_id::UUID;

ALTER TABLE approval_responses 
  ALTER COLUMN response_id TYPE UUID USING response_id::UUID,
  ALTER COLUMN request_id TYPE UUID USING request_id::UUID,
  ALTER COLUMN approver_id TYPE UUID USING approver_id::UUID;

ALTER TABLE temporary_access_tokens 
  ALTER COLUMN token_id TYPE UUID USING token_id::UUID,
  ALTER COLUMN user_id TYPE UUID USING user_id::UUID,
  ALTER COLUMN granted_by TYPE UUID USING granted_by::UUID,
  ALTER COLUMN granted_for_request TYPE UUID USING granted_for_request::UUID;

-- Convert JSON text fields to proper JSONB for better performance
ALTER TABLE approval_requests 
  ALTER COLUMN requested_action TYPE JSONB USING requested_action::JSONB;

ALTER TABLE temporary_access_tokens 
  ALTER COLUMN permissions TYPE JSONB USING permissions::JSONB,
  ALTER COLUMN metadata TYPE JSONB USING metadata::JSONB;

ALTER TABLE region_state_transitions 
  ALTER COLUMN metadata TYPE JSONB USING metadata::JSONB;

ALTER TABLE dual_control_approvals 
  ALTER COLUMN metadata TYPE JSONB USING metadata::JSONB;

-- =====================================================
-- Performance-Optimized Tables
-- =====================================================

-- Create partitioned table for high-volume authorization audit logs
CREATE TABLE authorization_audit_log (
    log_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(user_id),
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50) NOT NULL,
    resource_id VARCHAR(255),
    permission_checked VARCHAR(100),
    result VARCHAR(20) NOT NULL CHECK (result IN ('granted', 'denied', 'error')),
    ip_address INET,
    user_agent TEXT,
    session_id UUID,
    request_context JSONB,
    response_time_ms INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
) PARTITION BY RANGE (created_at);

-- Create monthly partitions for the current year
DO $$
DECLARE
    start_date DATE;
    end_date DATE;
    partition_name TEXT;
BEGIN
    -- Create partitions for current year
    FOR i IN 0..11 LOOP
        start_date := DATE_TRUNC('month', NOW()) + (i || ' months')::INTERVAL;
        end_date := start_date + '1 month'::INTERVAL;
        partition_name := 'authorization_audit_log_' || TO_CHAR(start_date, 'YYYY_MM');
        
        EXECUTE FORMAT('CREATE TABLE %I PARTITION OF authorization_audit_log 
                       FOR VALUES FROM (%L) TO (%L)', 
                       partition_name, start_date, end_date);
                       
        -- Create indexes on each partition
        EXECUTE FORMAT('CREATE INDEX %I ON %I (user_id, created_at DESC)', 
                       'idx_' || partition_name || '_user_time', partition_name);
        EXECUTE FORMAT('CREATE INDEX %I ON %I (action, created_at DESC)', 
                       'idx_' || partition_name || '_action_time', partition_name);
        EXECUTE FORMAT('CREATE INDEX %I ON %I USING GIN (request_context)', 
                       'idx_' || partition_name || '_context', partition_name);
    END LOOP;
END $$;

-- High-performance session management table
CREATE TABLE user_sessions (
    session_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(user_id),
    device_fingerprint TEXT,
    ip_address INET,
    user_agent TEXT,
    mfa_verified BOOLEAN DEFAULT FALSE,
    last_activity TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours'),
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create BRIN index for session cleanup (time-based data)
CREATE INDEX idx_user_sessions_expires_brin ON user_sessions USING BRIN (expires_at);
CREATE INDEX idx_user_sessions_activity ON user_sessions (user_id, last_activity DESC);

-- Performance counters table for real-time metrics
CREATE TABLE performance_metrics (
    metric_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    metric_name VARCHAR(100) NOT NULL,
    metric_value DECIMAL(15,4) NOT NULL,
    dimensions JSONB,
    region_id VARCHAR(50),
    recorded_at TIMESTAMPTZ DEFAULT NOW()
) PARTITION BY RANGE (recorded_at);

-- Create daily partitions for performance metrics (last 30 days)
DO $$
DECLARE
    current_date DATE := CURRENT_DATE - INTERVAL '30 days';
    end_date DATE;
    partition_name TEXT;
BEGIN
    FOR i IN 0..60 LOOP -- Create 60 days worth of partitions
        end_date := current_date + INTERVAL '1 day';
        partition_name := 'performance_metrics_' || TO_CHAR(current_date, 'YYYY_MM_DD');
        
        EXECUTE FORMAT('CREATE TABLE %I PARTITION OF performance_metrics 
                       FOR VALUES FROM (%L) TO (%L)', 
                       partition_name, current_date, end_date);
        
        current_date := end_date;
    END LOOP;
END $$;

-- =====================================================
-- Materialized Views for Complex Queries
-- =====================================================

-- User permission summary for fast permission checks
CREATE MATERIALIZED VIEW user_permissions_summary AS
SELECT 
    u.user_id,
    u.email,
    u.full_name,
    u.status,
    ARRAY_AGG(DISTINCT r.name) as role_names,
    ARRAY_AGG(DISTINCT c.action) as capabilities,
    ARRAY_AGG(DISTINCT ur.region_id) as accessible_regions,
    MAX(r.level) as max_role_level,
    COUNT(DISTINCT ur.role_id) as role_count,
    NOW() as last_updated
FROM users u
LEFT JOIN user_roles ur ON u.user_id = ur.user_id AND ur.is_active = TRUE
LEFT JOIN roles r ON ur.role_id = r.role_id AND r.is_active = TRUE
LEFT JOIN role_capabilities rc ON r.role_id = rc.role_id
LEFT JOIN capabilities c ON rc.capability_id = c.capability_id
LEFT JOIN user_regions ureg ON u.user_id = ureg.user_id AND ureg.is_active = TRUE
WHERE u.status = 'active'
GROUP BY u.user_id, u.email, u.full_name, u.status;

-- Create unique index for materialized view refresh
CREATE UNIQUE INDEX idx_user_permissions_summary_user_id ON user_permissions_summary (user_id);

-- Regional performance summary
CREATE MATERIALIZED VIEW regional_performance_summary AS
SELECT 
    r.region_id,
    r.name,
    r.region_state,
    COUNT(DISTINCT u.user_id) as active_users,
    COUNT(DISTINCT ar.request_id) as total_approval_requests,
    COUNT(DISTINCT CASE WHEN ar.status = 'pending' THEN ar.request_id END) as pending_approvals,
    AVG(EXTRACT(EPOCH FROM (ar.completed_at - ar.requested_at))/60) as avg_approval_time_minutes,
    MAX(ar.requested_at) as last_activity,
    NOW() as last_updated
FROM regions r
LEFT JOIN user_regions ur ON r.region_id = ur.region_id AND ur.is_active = TRUE
LEFT JOIN users u ON ur.user_id = u.user_id AND u.status = 'active'
LEFT JOIN approval_requests ar ON r.region_id = ANY(
    SELECT DISTINCT jsonb_extract_path_text(requested_action, 'region')
    FROM approval_requests 
    WHERE jsonb_extract_path_text(requested_action, 'region') = r.region_id
)
GROUP BY r.region_id, r.name, r.region_state;

CREATE UNIQUE INDEX idx_regional_performance_summary_region_id ON regional_performance_summary (region_id);

-- =====================================================
-- Stored Procedures for Common Operations
-- =====================================================

-- Fast permission check function
CREATE OR REPLACE FUNCTION check_user_permission(
    p_user_id UUID,
    p_capability VARCHAR(100),
    p_region_id VARCHAR(50) DEFAULT NULL
) RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
    has_permission BOOLEAN := FALSE;
BEGIN
    -- Check if user has the capability through their roles
    SELECT EXISTS(
        SELECT 1 
        FROM user_permissions_summary ups 
        WHERE ups.user_id = p_user_id
        AND p_capability = ANY(ups.capabilities)
        AND (p_region_id IS NULL OR p_region_id = ANY(ups.accessible_regions))
    ) INTO has_permission;
    
    -- Log the permission check for audit purposes
    INSERT INTO authorization_audit_log (
        user_id, 
        action, 
        resource_type, 
        resource_id, 
        permission_checked, 
        result,
        request_context
    ) VALUES (
        p_user_id,
        'permission_check',
        'capability',
        p_capability,
        p_capability,
        CASE WHEN has_permission THEN 'granted' ELSE 'denied' END,
        jsonb_build_object('region_id', p_region_id)
    );
    
    RETURN has_permission;
END;
$$;

-- Bulk approval processing function
CREATE OR REPLACE FUNCTION process_approval_request(
    p_request_id UUID,
    p_approver_id UUID,
    p_decision VARCHAR(10),
    p_comments TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    request_record approval_requests%ROWTYPE;
    workflow_record approval_workflows%ROWTYPE;
    approval_count INTEGER;
    required_approvals INTEGER;
    result JSONB;
BEGIN
    -- Get request details
    SELECT * INTO request_record FROM approval_requests WHERE request_id = p_request_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('error', 'Request not found');
    END IF;
    
    -- Get workflow configuration
    SELECT * INTO workflow_record FROM approval_workflows WHERE workflow_id = request_record.workflow_id;
    
    -- Record the approval response
    INSERT INTO approval_responses (
        response_id, request_id, approver_id, decision, comments
    ) VALUES (
        uuid_generate_v4(), p_request_id, p_approver_id, p_decision, p_comments
    );
    
    -- Count current approvals
    SELECT COUNT(*) INTO approval_count
    FROM approval_responses 
    WHERE request_id = p_request_id AND decision = 'approve';
    
    required_approvals := workflow_record.required_approvers;
    
    -- Update request status if we have enough approvals
    IF approval_count >= required_approvals THEN
        UPDATE approval_requests 
        SET status = 'approved', completed_at = NOW()
        WHERE request_id = p_request_id;
        
        result := jsonb_build_object(
            'status', 'approved',
            'approvals_received', approval_count,
            'approvals_required', required_approvals
        );
    ELSIF p_decision = 'reject' THEN
        UPDATE approval_requests 
        SET status = 'rejected', completed_at = NOW()
        WHERE request_id = p_request_id;
        
        result := jsonb_build_object(
            'status', 'rejected',
            'rejected_by', p_approver_id
        );
    ELSE
        result := jsonb_build_object(
            'status', 'pending',
            'approvals_received', approval_count,
            'approvals_required', required_approvals
        );
    END IF;
    
    RETURN result;
END;
$$;

-- =====================================================
-- Performance Configuration
-- =====================================================

-- Optimize PostgreSQL settings for OLTP workload
-- Note: These are recommendations and should be adjusted based on server resources

-- Configure connection and memory settings
ALTER SYSTEM SET max_connections = 200;
ALTER SYSTEM SET shared_buffers = '256MB';
ALTER SYSTEM SET effective_cache_size = '1GB';
ALTER SYSTEM SET work_mem = '4MB';
ALTER SYSTEM SET maintenance_work_mem = '64MB';

-- Enable query optimization
ALTER SYSTEM SET random_page_cost = 1.1;
ALTER SYSTEM SET effective_io_concurrency = 200;

-- Configure logging for performance monitoring
ALTER SYSTEM SET log_min_duration_statement = 1000; -- Log queries > 1 second
ALTER SYSTEM SET log_checkpoints = ON;
ALTER SYSTEM SET log_lock_waits = ON;

-- Enable query plan optimization
ALTER SYSTEM SET constraint_exclusion = 'partition';
ALTER SYSTEM SET default_statistics_target = 100;

-- =====================================================
-- Cleanup and Maintenance Procedures
-- =====================================================

-- Automated cleanup for expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM user_sessions WHERE expires_at < NOW();
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Log cleanup activity
    INSERT INTO authorization_audit_log (
        user_id, action, resource_type, result, request_context
    ) VALUES (
        uuid_generate_v4(), 'cleanup', 'expired_sessions', 'granted',
        jsonb_build_object('deleted_count', deleted_count)
    );
    
    RETURN deleted_count;
END;
$$;

-- Automated cleanup for old audit logs (keep 1 year)
CREATE OR REPLACE FUNCTION cleanup_old_audit_logs()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    deleted_count INTEGER := 0;
    partition_name TEXT;
    cutoff_date DATE := CURRENT_DATE - INTERVAL '365 days';
BEGIN
    -- Drop old partitions older than 1 year
    FOR partition_name IN 
        SELECT schemaname||'.'||tablename 
        FROM pg_tables 
        WHERE tablename LIKE 'authorization_audit_log_%'
        AND tablename < 'authorization_audit_log_' || TO_CHAR(cutoff_date, 'YYYY_MM')
    LOOP
        EXECUTE 'DROP TABLE IF EXISTS ' || partition_name;
        deleted_count := deleted_count + 1;
    END LOOP;
    
    RETURN deleted_count;
END;
$$;

-- =====================================================
-- Automated Maintenance Jobs
-- =====================================================

-- Create a function to refresh materialized views
CREATE OR REPLACE FUNCTION refresh_performance_views()
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY user_permissions_summary;
    REFRESH MATERIALIZED VIEW CONCURRENTLY regional_performance_summary;
    
    -- Update statistics for better query planning
    ANALYZE user_permissions_summary;
    ANALYZE regional_performance_summary;
END;
$$;

-- =====================================================
-- Record Migration
-- =====================================================

INSERT INTO schema_migrations (version, description) VALUES
    ('010', 'PostgreSQL performance optimizations with partitioning, materialized views, and stored procedures');

-- =====================================================
-- Comments for Documentation
-- =====================================================

COMMENT ON TABLE authorization_audit_log IS 'Partitioned audit log for all authorization checks with monthly partitions';
COMMENT ON TABLE user_sessions IS 'High-performance session management with automatic cleanup';
COMMENT ON TABLE performance_metrics IS 'Partitioned performance metrics with daily partitions for monitoring';
COMMENT ON MATERIALIZED VIEW user_permissions_summary IS 'Cached user permissions for fast authorization checks - refresh every 5 minutes';
COMMENT ON MATERIALIZED VIEW regional_performance_summary IS 'Cached regional performance metrics - refresh every hour';
COMMENT ON FUNCTION check_user_permission IS 'Fast permission check with audit logging';
COMMENT ON FUNCTION process_approval_request IS 'Atomic approval processing with automatic status updates';