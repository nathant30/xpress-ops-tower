-- PostgreSQL Migration 011: Comprehensive Indexing Strategy
-- Production-optimized indexes for high-performance RBAC operations
-- COMPATIBILITY: This migration includes both PostgreSQL-specific and SQLite-compatible indexes

-- =====================================================
-- Core RBAC Performance Indexes
-- =====================================================

-- Primary user lookup indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email_active 
ON users (email) WHERE status = 'active';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_status_created 
ON users (status, created_at DESC);

-- User roles performance indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_roles_user_active 
ON user_roles (user_id, is_active) 
WHERE is_active = TRUE;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_roles_role_active 
ON user_roles (role_id, is_active, assigned_at DESC) 
WHERE is_active = TRUE;

-- Fast role capability lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_role_capabilities_role 
ON role_capabilities (role_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_role_capabilities_capability 
ON role_capabilities (capability_id);

-- Composite index for permission checks
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_role_capabilities_composite 
ON role_capabilities (role_id, capability_id);

-- =====================================================
-- Regional Access Optimization
-- =====================================================

-- Regional user access patterns
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_regions_user_active 
ON user_regions (user_id, is_active, region_state) 
WHERE is_active = TRUE;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_regions_region_active 
ON user_regions (region_id, is_active, user_role) 
WHERE is_active = TRUE;

-- Region state management
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_regions_state_country 
ON regions (region_state, country_code);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_region_transitions_region_date 
ON region_state_transitions (region_id, transition_date DESC);

-- =====================================================
-- Approval Workflow Optimization
-- =====================================================

-- Critical approval request indexes for real-time operations
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_approval_requests_status_expires 
ON approval_requests (status, expires_at) 
WHERE status IN ('pending', 'approved');

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_approval_requests_requester_status 
ON approval_requests (requester_id, status, requested_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_approval_requests_workflow_status 
ON approval_requests (workflow_id, status, requested_at DESC);

-- JSONB optimization for requested actions
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_approval_requests_action_gin 
ON approval_requests USING GIN (requested_action);

-- Specific JSONB path indexes for common queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_approval_requests_region 
ON approval_requests ((requested_action->>'region')) 
WHERE requested_action->>'region' IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_approval_requests_action_type 
ON approval_requests ((requested_action->>'action'));

-- Approval response optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_approval_responses_request_decision 
ON approval_responses (request_id, decision, responded_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_approval_responses_approver_date 
ON approval_responses (approver_id, responded_at DESC);

-- =====================================================
-- Temporary Access Token Optimization
-- =====================================================

-- Active token lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_temp_tokens_user_active 
ON temporary_access_tokens (user_id, expires_at) 
WHERE revoked_at IS NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_temp_tokens_expires_cleanup 
ON temporary_access_tokens (expires_at) 
WHERE revoked_at IS NULL;

-- Permission-based token searches
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_temp_tokens_permissions_gin 
ON temporary_access_tokens USING GIN (permissions);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_temp_tokens_metadata_gin 
ON temporary_access_tokens USING GIN (metadata);

-- Token grant relationship
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_temp_tokens_granted_by 
ON temporary_access_tokens (granted_by, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_temp_tokens_request_link 
ON temporary_access_tokens (granted_for_request) 
WHERE granted_for_request IS NOT NULL;

-- =====================================================
-- Audit and Compliance Indexes
-- =====================================================

-- High-performance audit log queries (PostgreSQL with partitioning)
-- Note: Indexes are created per partition in migration 010

-- Dual control approval tracking
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_dual_control_workflow_status 
ON dual_control_approvals (workflow_type, approval_status);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_dual_control_primary_user 
ON dual_control_approvals (primary_user_id, primary_timestamp DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_dual_control_secondary_user 
ON dual_control_approvals (secondary_user_id, secondary_timestamp DESC) 
WHERE secondary_user_id IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_dual_control_expiry 
ON dual_control_approvals (expiry_timestamp) 
WHERE approval_status = 'pending';

-- Resource-based audit tracking
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_dual_control_resource 
ON dual_control_approvals (resource_id, workflow_type);

-- =====================================================
-- Full-Text Search Indexes
-- =====================================================

-- User search optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_name_search 
ON users USING GIN (to_tsvector('english', full_name || ' ' || email));

-- Approval request justification search
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_approval_requests_text_search 
ON approval_requests USING GIN (to_tsvector('english', COALESCE(justification, '')));

-- Comments and response search
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_approval_responses_comments_search 
ON approval_responses USING GIN (to_tsvector('english', COALESCE(comments, ''))) 
WHERE comments IS NOT NULL;

-- =====================================================
-- Performance Monitoring Indexes
-- =====================================================

-- Session management optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_sessions_user_activity 
ON user_sessions (user_id, last_activity DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_sessions_device_ip 
ON user_sessions (device_fingerprint, ip_address);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_sessions_mfa_status 
ON user_sessions (mfa_verified, expires_at) 
WHERE expires_at > NOW();

-- Performance metrics optimization (for partitioned table)
-- These would be created per partition, but we include the template here

-- Template indexes for performance_metrics partitions
-- (Actual indexes are created per partition in the partitioning logic)

-- =====================================================
-- Specialized Indexes for Complex Queries
-- =====================================================

-- Multi-role user optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_roles_multi_role 
ON user_roles (user_id, role_id, is_active);

-- Cross-region approval patterns
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_approval_cross_region
ON approval_requests (requester_id, (requested_action->>'region'), status);

-- Temporal approval patterns (for trending analysis)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_approval_temporal
ON approval_requests (DATE_TRUNC('day', requested_at), workflow_id);

-- Capability risk level analysis
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_capabilities_risk_action
ON capabilities (risk_level, action);

-- Role hierarchy optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_roles_level_active
ON roles (level DESC, is_active) WHERE is_active = TRUE;

-- =====================================================
-- Covering Indexes for Read-Heavy Operations
-- =====================================================

-- User permission summary covering index
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_permission_covering
ON user_roles (user_id, is_active) 
INCLUDE (role_id, assigned_at) 
WHERE is_active = TRUE;

-- Approval workflow covering index
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_approval_workflow_covering
ON approval_workflows (action, is_active) 
INCLUDE (required_approvers, sensitivity_threshold, temporary_access_ttl) 
WHERE is_active = TRUE;

-- =====================================================
-- Partial Indexes for Specific Use Cases
-- =====================================================

-- Active pending approvals (most common query)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pending_approvals_active
ON approval_requests (requested_at DESC) 
WHERE status = 'pending' AND expires_at > NOW();

-- High-risk capability assignments
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_high_risk_capabilities
ON role_capabilities (role_id, capability_id) 
WHERE capability_id IN (
    SELECT capability_id FROM capabilities WHERE risk_level = 'high'
);

-- Active regional managers
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_active_regional_managers
ON user_regions (region_id, user_id) 
WHERE user_role = 'regional_manager' AND is_active = TRUE;

-- Recently expired tokens (for cleanup)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_recently_expired_tokens
ON temporary_access_tokens (expires_at) 
WHERE revoked_at IS NULL 
AND expires_at BETWEEN (NOW() - INTERVAL '7 days') AND NOW();

-- =====================================================
-- Statistics and Query Optimization
-- =====================================================

-- Update table statistics for better query planning
ANALYZE users;
ANALYZE user_roles;
ANALYZE role_capabilities;
ANALYZE capabilities;
ANALYZE regions;
ANALYZE user_regions;
ANALYZE approval_workflows;
ANALYZE approval_requests;
ANALYZE approval_responses;
ANALYZE temporary_access_tokens;
ANALYZE region_state_transitions;
ANALYZE dual_control_approvals;

-- Set extended statistics for correlated columns
CREATE STATISTICS IF NOT EXISTS stats_user_roles_correlation
ON (user_id, role_id, is_active) FROM user_roles;

CREATE STATISTICS IF NOT EXISTS stats_approval_correlation
ON (status, expires_at, workflow_id) FROM approval_requests;

CREATE STATISTICS IF NOT EXISTS stats_regional_correlation
ON (region_id, user_role, is_active) FROM user_regions;

-- =====================================================
-- Index Maintenance Procedures
-- =====================================================

-- Function to rebuild fragmented indexes
CREATE OR REPLACE FUNCTION rebuild_fragmented_indexes(threshold_percent FLOAT DEFAULT 30.0)
RETURNS TABLE(index_name TEXT, fragmentation_percent FLOAT, rebuilt BOOLEAN)
LANGUAGE plpgsql
AS $$
DECLARE
    idx_record RECORD;
    fragmentation FLOAT;
BEGIN
    FOR idx_record IN
        SELECT schemaname, indexname, tablename
        FROM pg_indexes 
        WHERE schemaname = 'public'
        AND indexname NOT LIKE 'pg_%'
    LOOP
        -- Calculate index fragmentation (simplified estimation)
        SELECT CASE 
            WHEN pg_relation_size(idx_record.indexname::regclass) > 0 
            THEN (100.0 * pg_relation_size(idx_record.tablename::regclass) / pg_relation_size(idx_record.indexname::regclass))
            ELSE 0.0 
        END INTO fragmentation;
        
        IF fragmentation > threshold_percent THEN
            EXECUTE 'REINDEX INDEX CONCURRENTLY ' || idx_record.indexname;
            RETURN QUERY SELECT idx_record.indexname, fragmentation, TRUE;
        ELSE
            RETURN QUERY SELECT idx_record.indexname, fragmentation, FALSE;
        END IF;
    END LOOP;
END;
$$;

-- Function to analyze index usage statistics
CREATE OR REPLACE FUNCTION analyze_index_usage()
RETURNS TABLE(
    index_name TEXT,
    table_name TEXT,
    index_scans BIGINT,
    tuples_read BIGINT,
    tuples_fetched BIGINT,
    usage_ratio FLOAT
)
LANGUAGE SQL
AS $$
    SELECT 
        indexrelname as index_name,
        relname as table_name,
        idx_scan as index_scans,
        idx_tup_read as tuples_read,
        idx_tup_fetch as tuples_fetched,
        CASE WHEN idx_scan > 0 
             THEN ROUND(idx_tup_fetch::NUMERIC / idx_scan::NUMERIC, 2)
             ELSE 0 
        END as usage_ratio
    FROM pg_stat_user_indexes
    ORDER BY idx_scan DESC;
$$;

-- =====================================================
-- SQLite Compatibility Layer
-- =====================================================

-- For SQLite environments, create simpler versions of critical indexes
-- These will be ignored if PostgreSQL-specific indexes already exist

-- Basic user lookup (SQLite compatible)
CREATE INDEX IF NOT EXISTS idx_users_email_sqlite ON users (email);
CREATE INDEX IF NOT EXISTS idx_users_status_sqlite ON users (status);

-- Basic role permissions (SQLite compatible)
CREATE INDEX IF NOT EXISTS idx_user_roles_user_sqlite ON user_roles (user_id);
CREATE INDEX IF NOT EXISTS idx_role_capabilities_role_sqlite ON role_capabilities (role_id);

-- Basic approval workflow (SQLite compatible)
CREATE INDEX IF NOT EXISTS idx_approval_requests_status_sqlite ON approval_requests (status);
CREATE INDEX IF NOT EXISTS idx_approval_requests_requester_sqlite ON approval_requests (requester_id);

-- =====================================================
-- Index Monitoring and Alerting
-- =====================================================

-- View for monitoring index health
CREATE OR REPLACE VIEW index_health_monitor AS
SELECT 
    schemaname,
    indexname,
    tablename,
    pg_size_pretty(pg_relation_size(indexname::regclass)) as index_size,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch,
    CASE WHEN idx_scan = 0 THEN 'UNUSED'
         WHEN idx_scan < 10 THEN 'LOW_USAGE'
         ELSE 'NORMAL'
    END as usage_status
FROM pg_stat_user_indexes psi
JOIN pg_indexes pi ON psi.indexrelname = pi.indexname
WHERE pi.schemaname = 'public'
ORDER BY idx_scan DESC;

-- =====================================================
-- Record Migration
-- =====================================================

INSERT INTO schema_migrations (version, description) VALUES
    ('011', 'Comprehensive production indexing strategy with performance optimization');

-- =====================================================
-- Comments for Documentation
-- =====================================================

COMMENT ON FUNCTION rebuild_fragmented_indexes IS 'Identifies and rebuilds fragmented indexes above threshold';
COMMENT ON FUNCTION analyze_index_usage IS 'Analyzes index usage patterns for optimization';
COMMENT ON VIEW index_health_monitor IS 'Real-time index health and usage monitoring';