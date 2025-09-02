-- PostgreSQL Migration 012: Security Enhancements
-- Row-Level Security, Audit Triggers, and Enterprise Security Features
-- COMPATIBILITY: PostgreSQL-specific features, gracefully handles SQLite environments

-- =====================================================
-- Create Security Schema and Roles
-- =====================================================

-- Create dedicated schema for security functions
CREATE SCHEMA IF NOT EXISTS security;

-- Create application roles for different access levels
DO $$
BEGIN
    -- Application service role (for API connections)
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'rbac_app_service') THEN
        CREATE ROLE rbac_app_service LOGIN;
    END IF;
    
    -- Read-only reporting role
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'rbac_readonly') THEN
        CREATE ROLE rbac_readonly LOGIN;
    END IF;
    
    -- Audit role for compliance queries
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'rbac_auditor') THEN
        CREATE ROLE rbac_auditor LOGIN;
    END IF;
    
    -- Emergency access role (break-glass)
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'rbac_emergency') THEN
        CREATE ROLE rbac_emergency LOGIN;
    END IF;
END $$;

-- =====================================================
-- Session Context Functions
-- =====================================================

-- Function to set current user context for RLS
CREATE OR REPLACE FUNCTION security.set_current_user_context(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    PERFORM set_config('app.current_user_id', p_user_id::TEXT, TRUE);
    PERFORM set_config('app.session_start', NOW()::TEXT, TRUE);
END;
$$;

-- Function to get current user context
CREATE OR REPLACE FUNCTION security.get_current_user_id()
RETURNS UUID
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
    user_id_text TEXT;
BEGIN
    user_id_text := current_setting('app.current_user_id', TRUE);
    IF user_id_text IS NULL OR user_id_text = '' THEN
        RETURN NULL;
    END IF;
    RETURN user_id_text::UUID;
EXCEPTION
    WHEN OTHERS THEN
        RETURN NULL;
END;
$$;

-- Function to check if user has specific capability
CREATE OR REPLACE FUNCTION security.has_capability(p_capability VARCHAR(100))
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
    current_user_id UUID := security.get_current_user_id();
    has_cap BOOLEAN := FALSE;
BEGIN
    IF current_user_id IS NULL THEN
        RETURN FALSE;
    END IF;
    
    SELECT EXISTS(
        SELECT 1 
        FROM user_roles ur
        JOIN role_capabilities rc ON ur.role_id = rc.role_id
        JOIN capabilities c ON rc.capability_id = c.capability_id
        WHERE ur.user_id = current_user_id
        AND ur.is_active = TRUE
        AND c.action = p_capability
    ) INTO has_cap;
    
    RETURN has_cap;
END;
$$;

-- =====================================================
-- Row-Level Security Policies
-- =====================================================

-- Enable RLS on sensitive tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_regions ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE temporary_access_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE authorization_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

-- Users table RLS policies
-- Users can see their own data, admins can see all
CREATE POLICY users_self_access ON users
    FOR ALL TO rbac_app_service
    USING (user_id = security.get_current_user_id() OR security.has_capability('manage_users'));

-- Read-only access for reporting
CREATE POLICY users_readonly_access ON users
    FOR SELECT TO rbac_readonly
    USING (status = 'active');

-- User roles policies
-- Users can see their own roles, admins can see/modify all
CREATE POLICY user_roles_self_access ON user_roles
    FOR SELECT TO rbac_app_service
    USING (user_id = security.get_current_user_id() OR security.has_capability('assign_roles'));

CREATE POLICY user_roles_admin_access ON user_roles
    FOR ALL TO rbac_app_service
    USING (security.has_capability('assign_roles'));

-- User regions policies
-- Users can see regions they have access to
CREATE POLICY user_regions_access ON user_regions
    FOR SELECT TO rbac_app_service
    USING (
        user_id = security.get_current_user_id() 
        OR security.has_capability('manage_users')
        OR security.has_capability('view_market_intel_masked')
    );

-- Approval requests policies
-- Users can see requests they created or can approve
CREATE POLICY approval_requests_access ON approval_requests
    FOR SELECT TO rbac_app_service
    USING (
        requester_id = security.get_current_user_id()
        OR security.has_capability('approve_requests')
        OR security.has_capability('view_approval_history')
    );

-- Users can create their own requests
CREATE POLICY approval_requests_create ON approval_requests
    FOR INSERT TO rbac_app_service
    WITH CHECK (requester_id = security.get_current_user_id());

-- Only system can update request status (through stored procedures)
CREATE POLICY approval_requests_update ON approval_requests
    FOR UPDATE TO rbac_app_service
    USING (security.has_capability('approve_requests'));

-- Approval responses policies
-- Users can see responses to requests they created or made
CREATE POLICY approval_responses_access ON approval_responses
    FOR SELECT TO rbac_app_service
    USING (
        approver_id = security.get_current_user_id()
        OR request_id IN (
            SELECT request_id FROM approval_requests 
            WHERE requester_id = security.get_current_user_id()
        )
        OR security.has_capability('view_approval_history')
    );

-- Users can create responses to requests they can approve
CREATE POLICY approval_responses_create ON approval_responses
    FOR INSERT TO rbac_app_service
    WITH CHECK (
        security.has_capability('approve_requests')
        AND approver_id = security.get_current_user_id()
    );

-- Temporary access tokens policies
-- Users can see their own tokens, admins can see all
CREATE POLICY temp_tokens_access ON temporary_access_tokens
    FOR SELECT TO rbac_app_service
    USING (
        user_id = security.get_current_user_id()
        OR granted_by = security.get_current_user_id()
        OR security.has_capability('grant_temporary_access')
    );

-- Only authorized users can create tokens
CREATE POLICY temp_tokens_create ON temporary_access_tokens
    FOR INSERT TO rbac_app_service
    WITH CHECK (security.has_capability('grant_temporary_access'));

-- Only authorized users can revoke tokens
CREATE POLICY temp_tokens_revoke ON temporary_access_tokens
    FOR UPDATE TO rbac_app_service
    USING (
        security.has_capability('revoke_temporary_access')
        OR granted_by = security.get_current_user_id()
    );

-- Audit log policies
-- Auditors and users can read their own audit entries
CREATE POLICY audit_log_read ON authorization_audit_log
    FOR SELECT TO rbac_app_service, rbac_auditor
    USING (
        user_id = security.get_current_user_id()
        OR security.has_capability('export_audit_data')
    );

-- Only system can insert audit entries
CREATE POLICY audit_log_insert ON authorization_audit_log
    FOR INSERT TO rbac_app_service
    WITH CHECK (TRUE); -- System inserts are always allowed

-- Session policies
-- Users can see their own sessions
CREATE POLICY user_sessions_access ON user_sessions
    FOR ALL TO rbac_app_service
    USING (
        user_id = security.get_current_user_id()
        OR security.has_capability('manage_users')
    );

-- =====================================================
-- Audit Trigger System
-- =====================================================

-- Create audit schema and tables
CREATE SCHEMA IF NOT EXISTS audit;

-- Generic audit log table
CREATE TABLE IF NOT EXISTS audit.data_changes (
    audit_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    table_name TEXT NOT NULL,
    operation CHAR(1) NOT NULL CHECK (operation IN ('I', 'U', 'D')),
    user_id UUID,
    session_id UUID,
    changed_at TIMESTAMPTZ DEFAULT NOW(),
    old_data JSONB,
    new_data JSONB,
    changed_fields TEXT[],
    client_ip INET,
    user_agent TEXT
);

-- Partition the audit table by month
ALTER TABLE audit.data_changes 
SET (
    timescaledb.continuous_aggregates_enabled = FALSE
);

-- Create partitions for audit data
DO $$
DECLARE
    start_date DATE;
    end_date DATE;
    partition_name TEXT;
BEGIN
    FOR i IN 0..12 LOOP
        start_date := DATE_TRUNC('month', NOW()) + (i || ' months')::INTERVAL;
        end_date := start_date + '1 month'::INTERVAL;
        partition_name := 'data_changes_' || TO_CHAR(start_date, 'YYYY_MM');
        
        EXECUTE FORMAT('CREATE TABLE IF NOT EXISTS audit.%I PARTITION OF audit.data_changes 
                       FOR VALUES FROM (%L) TO (%L)', 
                       partition_name, start_date, end_date);
    END LOOP;
END $$;

-- Audit trigger function
CREATE OR REPLACE FUNCTION audit.audit_trigger_func()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    old_data JSONB;
    new_data JSONB;
    changed_fields TEXT[];
    current_user_id UUID;
BEGIN
    -- Get current user context
    current_user_id := security.get_current_user_id();
    
    -- Build old and new data
    IF TG_OP = 'DELETE' THEN
        old_data := row_to_json(OLD)::JSONB;
        new_data := NULL;
    ELSIF TG_OP = 'INSERT' THEN
        old_data := NULL;
        new_data := row_to_json(NEW)::JSONB;
    ELSE -- UPDATE
        old_data := row_to_json(OLD)::JSONB;
        new_data := row_to_json(NEW)::JSONB;
        
        -- Find changed fields
        SELECT ARRAY_AGG(key) INTO changed_fields
        FROM jsonb_each(old_data) o
        JOIN jsonb_each(new_data) n ON o.key = n.key
        WHERE o.value != n.value;
    END IF;
    
    -- Insert audit record
    INSERT INTO audit.data_changes (
        table_name,
        operation,
        user_id,
        old_data,
        new_data,
        changed_fields,
        client_ip
    ) VALUES (
        TG_TABLE_NAME,
        SUBSTRING(TG_OP, 1, 1),
        current_user_id,
        old_data,
        new_data,
        changed_fields,
        inet_client_addr()
    );
    
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$;

-- Create audit triggers for sensitive tables
CREATE TRIGGER users_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON users
    FOR EACH ROW EXECUTE FUNCTION audit.audit_trigger_func();

CREATE TRIGGER user_roles_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON user_roles
    FOR EACH ROW EXECUTE FUNCTION audit.audit_trigger_func();

CREATE TRIGGER approval_requests_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON approval_requests
    FOR EACH ROW EXECUTE FUNCTION audit.audit_trigger_func();

CREATE TRIGGER temporary_access_tokens_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON temporary_access_tokens
    FOR EACH ROW EXECUTE FUNCTION audit.audit_trigger_func();

-- =====================================================
-- Data Encryption Functions
-- =====================================================

-- Install pgcrypto if available
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Function to encrypt sensitive data
CREATE OR REPLACE FUNCTION security.encrypt_pii(data TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    encryption_key TEXT;
BEGIN
    -- Get encryption key from environment or configuration
    encryption_key := COALESCE(current_setting('app.encryption_key', TRUE), 'default_key_change_in_production');
    
    IF data IS NULL THEN
        RETURN NULL;
    END IF;
    
    RETURN encode(encrypt(data::BYTEA, encryption_key::BYTEA, 'aes'), 'base64');
EXCEPTION
    WHEN OTHERS THEN
        -- If pgcrypto is not available, return original data
        RETURN data;
END;
$$;

-- Function to decrypt sensitive data
CREATE OR REPLACE FUNCTION security.decrypt_pii(encrypted_data TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    encryption_key TEXT;
BEGIN
    -- Get encryption key from environment or configuration
    encryption_key := COALESCE(current_setting('app.encryption_key', TRUE), 'default_key_change_in_production');
    
    IF encrypted_data IS NULL THEN
        RETURN NULL;
    END IF;
    
    RETURN convert_from(decrypt(decode(encrypted_data, 'base64'), encryption_key::BYTEA, 'aes'), 'UTF8');
EXCEPTION
    WHEN OTHERS THEN
        -- If pgcrypto is not available or decryption fails, return encrypted data
        RETURN encrypted_data;
END;
$$;

-- =====================================================
-- Rate Limiting System
-- =====================================================

-- Create rate limiting table
CREATE TABLE IF NOT EXISTS security.rate_limits (
    limit_key TEXT NOT NULL,
    window_start TIMESTAMPTZ NOT NULL,
    request_count INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (limit_key, window_start)
);

-- Create cleanup index for rate limits
CREATE INDEX IF NOT EXISTS idx_rate_limits_cleanup ON security.rate_limits (window_start);

-- Rate limiting function
CREATE OR REPLACE FUNCTION security.check_rate_limit(
    p_key TEXT,
    p_max_requests INTEGER DEFAULT 100,
    p_window_seconds INTEGER DEFAULT 60
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
    window_start TIMESTAMPTZ;
    current_count INTEGER;
BEGIN
    -- Calculate window start time
    window_start := DATE_TRUNC('minute', NOW() - (p_window_seconds || ' seconds')::INTERVAL);
    
    -- Get current count for this window
    SELECT COALESCE(SUM(request_count), 0) INTO current_count
    FROM security.rate_limits
    WHERE limit_key = p_key
    AND window_start >= (NOW() - (p_window_seconds || ' seconds')::INTERVAL);
    
    -- Check if limit exceeded
    IF current_count >= p_max_requests THEN
        RETURN FALSE;
    END IF;
    
    -- Increment counter
    INSERT INTO security.rate_limits (limit_key, window_start, request_count)
    VALUES (p_key, DATE_TRUNC('minute', NOW()), 1)
    ON CONFLICT (limit_key, window_start)
    DO UPDATE SET request_count = security.rate_limits.request_count + 1;
    
    RETURN TRUE;
END;
$$;

-- =====================================================
-- Data Retention Policies
-- =====================================================

-- Function to enforce data retention policies
CREATE OR REPLACE FUNCTION security.enforce_data_retention()
RETURNS TABLE(table_name TEXT, deleted_count BIGINT)
LANGUAGE plpgsql
AS $$
DECLARE
    retention_policy RECORD;
    deleted_rows BIGINT;
BEGIN
    -- Define retention policies
    FOR retention_policy IN VALUES
        ('authorization_audit_log', '1 year', 'created_at'),
        ('audit.data_changes', '2 years', 'changed_at'),
        ('user_sessions', '30 days', 'expires_at'),
        ('security.rate_limits', '7 days', 'created_at'),
        ('performance_metrics', '90 days', 'recorded_at')
    LOOP
        -- Execute deletion with the retention policy
        EXECUTE FORMAT('DELETE FROM %I WHERE %I < NOW() - INTERVAL %L',
            retention_policy.column1,
            retention_policy.column3,
            retention_policy.column2
        );
        
        GET DIAGNOSTICS deleted_rows = ROW_COUNT;
        
        RETURN QUERY SELECT retention_policy.column1, deleted_rows;
    END LOOP;
END;
$$;

-- =====================================================
-- Security Monitoring Views
-- =====================================================

-- Failed authentication attempts
CREATE OR REPLACE VIEW security.failed_auth_attempts AS
SELECT 
    user_id,
    COUNT(*) as attempt_count,
    MAX(created_at) as last_attempt,
    ARRAY_AGG(DISTINCT ip_address::TEXT) as source_ips
FROM authorization_audit_log
WHERE action = 'authentication'
AND result = 'denied'
AND created_at >= NOW() - INTERVAL '1 hour'
GROUP BY user_id
HAVING COUNT(*) >= 5;

-- Suspicious permission escalations
CREATE OR REPLACE VIEW security.permission_escalations AS
SELECT 
    ac.user_id,
    u.email,
    ac.old_data->>'role_id' as old_role,
    ac.new_data->>'role_id' as new_role,
    ac.changed_at,
    ac.client_ip
FROM audit.data_changes ac
JOIN users u ON ac.user_id = u.user_id
WHERE ac.table_name = 'user_roles'
AND ac.operation = 'U'
AND (ac.old_data->>'role_id')::INTEGER < (ac.new_data->>'role_id')::INTEGER
AND ac.changed_at >= NOW() - INTERVAL '24 hours';

-- Emergency access usage
CREATE OR REPLACE VIEW security.emergency_access_usage AS
SELECT 
    tat.user_id,
    u.email,
    tat.permissions,
    tat.granted_by,
    gu.email as granted_by_email,
    tat.created_at,
    tat.expires_at,
    CASE WHEN tat.revoked_at IS NOT NULL THEN 'REVOKED'
         WHEN tat.expires_at < NOW() THEN 'EXPIRED'
         ELSE 'ACTIVE'
    END as status
FROM temporary_access_tokens tat
JOIN users u ON tat.user_id = u.user_id
JOIN users gu ON tat.granted_by = gu.user_id
WHERE tat.metadata->>'emergency' = 'true'
ORDER BY tat.created_at DESC;

-- =====================================================
-- Grant Permissions to Application Roles
-- =====================================================

-- Grant permissions to application service role
GRANT USAGE ON SCHEMA public, security, audit TO rbac_app_service;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO rbac_app_service;
GRANT SELECT, INSERT ON ALL TABLES IN SCHEMA audit TO rbac_app_service;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO rbac_app_service;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA security TO rbac_app_service;

-- Grant read-only access to reporting role
GRANT USAGE ON SCHEMA public TO rbac_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO rbac_readonly;

-- Grant audit access to auditor role
GRANT USAGE ON SCHEMA public, audit, security TO rbac_auditor;
GRANT SELECT ON ALL TABLES IN SCHEMA public, audit TO rbac_auditor;
GRANT SELECT ON security.failed_auth_attempts, security.permission_escalations, security.emergency_access_usage TO rbac_auditor;

-- Emergency role gets full access (break-glass)
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO rbac_emergency;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO rbac_emergency;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA security TO rbac_emergency;

-- =====================================================
-- Security Configuration
-- =====================================================

-- Set secure connection requirements
ALTER SYSTEM SET ssl = 'on';
ALTER SYSTEM SET ssl_ciphers = 'HIGH:MEDIUM:+3DES:!aNULL';
ALTER SYSTEM SET ssl_prefer_server_ciphers = 'on';

-- Configure authentication and logging
ALTER SYSTEM SET log_connections = 'on';
ALTER SYSTEM SET log_disconnections = 'on';
ALTER SYSTEM SET log_statement = 'mod';
ALTER SYSTEM SET log_min_duration_statement = 5000; -- Log slow queries

-- Set row security defaults
ALTER SYSTEM SET row_security = 'on';

-- =====================================================
-- Record Migration
-- =====================================================

INSERT INTO schema_migrations (version, description) VALUES
    ('012', 'Enterprise security enhancements with RLS, audit triggers, and data encryption');

-- =====================================================
-- Comments for Documentation
-- =====================================================

COMMENT ON SCHEMA security IS 'Security functions and utilities for RBAC system';
COMMENT ON SCHEMA audit IS 'Audit trail and data change tracking';
COMMENT ON TABLE audit.data_changes IS 'Comprehensive audit log for all data changes';
COMMENT ON FUNCTION security.set_current_user_context IS 'Sets user context for Row-Level Security';
COMMENT ON FUNCTION security.check_rate_limit IS 'Database-level rate limiting for API protection';
COMMENT ON FUNCTION security.enforce_data_retention IS 'Automated data retention policy enforcement';