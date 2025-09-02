-- =====================================================
-- ENHANCED USER MANAGEMENT - RBAC + ABAC IMPLEMENTATION
-- Based on Xpress Policy Bundle v2025-08-31
-- Implements comprehensive role-based and attribute-based access control
-- =====================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "btree_gin";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- =====================================================
-- ENHANCED ENUMS FOR USER MANAGEMENT
-- =====================================================

-- User status types
CREATE TYPE user_status AS ENUM (
    'active',            -- Active user
    'inactive',          -- Temporarily inactive
    'suspended',         -- Administratively suspended
    'pending',           -- Pending activation
    'locked'             -- Account locked due to security
);

-- Authentication method types
CREATE TYPE auth_method AS ENUM (
    'password',          -- Standard password
    'mfa_totp',          -- Time-based OTP
    'mfa_sms',           -- SMS-based MFA
    'mfa_email',         -- Email-based MFA
    'hardware_key',      -- Hardware security key
    'sso'                -- Single Sign-On
);

-- Session status
CREATE TYPE session_status AS ENUM (
    'active',            -- Active session
    'expired',           -- Naturally expired
    'revoked',           -- Manually revoked
    'terminated'         -- Forced termination
);

-- Data sensitivity levels
CREATE TYPE data_class AS ENUM (
    'public',            -- Public data
    'internal',          -- Internal use
    'confidential',      -- Confidential data
    'restricted'         -- Highly restricted
);

-- PII scope levels
CREATE TYPE pii_scope AS ENUM (
    'none',              -- No PII access
    'masked',            -- Masked PII only
    'full'               -- Full PII access
);

-- Permission scopes
CREATE TYPE permission_scope AS ENUM (
    'global',            -- System-wide
    'regional',          -- Region-specific
    'team',              -- Team-specific
    'personal'           -- Personal only
);

-- =====================================================
-- CORE USER MANAGEMENT TABLES
-- =====================================================

-- Enhanced users table with ABAC attributes
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Basic user information
    email VARCHAR(255) NOT NULL UNIQUE,
    username VARCHAR(100) UNIQUE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    display_name VARCHAR(200),
    
    -- Authentication
    password_hash TEXT,
    salt TEXT,
    password_changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    failed_login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMP WITH TIME ZONE,
    
    -- Status and verification
    status user_status DEFAULT 'pending',
    email_verified_at TIMESTAMP WITH TIME ZONE,
    phone_verified_at TIMESTAMP WITH TIME ZONE,
    
    -- Profile information
    avatar_url TEXT,
    phone VARCHAR(20),
    timezone VARCHAR(50) DEFAULT 'Asia/Manila',
    locale VARCHAR(10) DEFAULT 'en-PH',
    
    -- ABAC Attributes (from policy bundle)
    allowed_regions UUID[] DEFAULT '{}',
    pii_scope pii_scope DEFAULT 'none',
    domain VARCHAR(50), -- fraud, safety, compliance
    
    -- Security settings
    mfa_enabled BOOLEAN DEFAULT FALSE,
    mfa_secret TEXT, -- Encrypted TOTP secret
    backup_codes JSONB DEFAULT '[]', -- Encrypted backup codes
    trusted_devices JSONB DEFAULT '[]',
    
    -- Session management
    current_session_id UUID,
    last_login_at TIMESTAMP WITH TIME ZONE,
    last_active_at TIMESTAMP WITH TIME ZONE,
    login_count INTEGER DEFAULT 0,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Constraints
    CONSTRAINT users_email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    CONSTRAINT users_password_changed CHECK (password_changed_at <= NOW())
);

-- System roles based on policy bundle
CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) NOT NULL UNIQUE,
    display_name VARCHAR(100) NOT NULL,
    description TEXT,
    
    -- Role hierarchy and permissions
    level INTEGER DEFAULT 0, -- For role hierarchy
    permissions TEXT[] DEFAULT '{}',
    inherits_from UUID[] DEFAULT '{}', -- Role inheritance
    
    -- Role metadata
    is_system BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT roles_name_format CHECK (name ~* '^[a-z_]+$')
);

-- User role assignments with regional and temporal constraints
CREATE TABLE user_roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    
    -- ABAC constraints
    allowed_regions UUID[] DEFAULT '{}', -- Regional restrictions
    valid_from TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    valid_until TIMESTAMP WITH TIME ZONE,
    
    -- Assignment metadata
    assigned_by UUID REFERENCES users(id),
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE,
    
    UNIQUE(user_id, role_id, valid_from)
);

-- Permissions registry
CREATE TABLE permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    display_name VARCHAR(200) NOT NULL,
    description TEXT,
    
    -- Permission categorization
    resource VARCHAR(100) NOT NULL,
    action VARCHAR(100) NOT NULL,
    scope permission_scope DEFAULT 'global',
    
    -- Data sensitivity
    data_class data_class DEFAULT 'internal',
    requires_mfa BOOLEAN DEFAULT FALSE,
    
    -- Metadata
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT permissions_name_format CHECK (name ~* '^[a-z_:]+$')
);

-- User sessions with detailed tracking
CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Session identification
    session_token_hash TEXT NOT NULL,
    refresh_token_hash TEXT,
    
    -- Device and location information
    device_id VARCHAR(255),
    device_name VARCHAR(200),
    user_agent TEXT,
    ip_address INET NOT NULL,
    ip_country VARCHAR(2),
    ip_city VARCHAR(100),
    
    -- Security information
    auth_methods auth_method[] DEFAULT '{}',
    risk_score DECIMAL(3,2) DEFAULT 0.0,
    
    -- Session lifecycle
    status session_status DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    terminated_at TIMESTAMP WITH TIME ZONE,
    terminated_by UUID REFERENCES users(id),
    termination_reason TEXT,
    
    -- Indexing for performance
    CONSTRAINT sessions_risk_score CHECK (risk_score >= 0.0 AND risk_score <= 10.0)
);

-- Escalation and temporary access based on policy bundle
CREATE TABLE temporary_access (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    
    -- Escalation context (from policy bundle)
    case_id VARCHAR(100),
    escalation_type VARCHAR(50) NOT NULL, -- support, risk_investigator
    
    -- Temporary permissions
    granted_permissions TEXT[] DEFAULT '{}',
    granted_regions UUID[] DEFAULT '{}',
    pii_scope_override pii_scope,
    
    -- Approval and lifecycle
    requested_by UUID NOT NULL REFERENCES users(id),
    approved_by UUID REFERENCES users(id),
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    approved_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    revoked_at TIMESTAMP WITH TIME ZONE,
    revoked_by UUID REFERENCES users(id),
    
    -- Justification and audit
    justification TEXT NOT NULL,
    approval_notes TEXT,
    
    -- Status
    is_active BOOLEAN DEFAULT FALSE,
    
    CONSTRAINT temp_access_expires CHECK (expires_at > requested_at),
    CONSTRAINT temp_access_case_format CHECK (case_id IS NULL OR case_id ~* '^[A-Z0-9-]+$')
);

-- Comprehensive audit log for all user management actions
CREATE TABLE user_management_audit (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Event identification
    event_type VARCHAR(50) NOT NULL,
    event_category VARCHAR(50) NOT NULL, -- auth, rbac, abac, session, admin
    
    -- User context
    user_id UUID REFERENCES users(id),
    target_user_id UUID REFERENCES users(id), -- For admin actions
    session_id UUID,
    
    -- Request context
    ip_address INET,
    user_agent TEXT,
    channel VARCHAR(20) DEFAULT 'ui', -- ui, api, batch
    
    -- Event details
    resource VARCHAR(100),
    action VARCHAR(100),
    old_values JSONB,
    new_values JSONB,
    
    -- Success/failure
    success BOOLEAN DEFAULT TRUE,
    error_message TEXT,
    
    -- Compliance and security
    mfa_verified BOOLEAN DEFAULT FALSE,
    risk_score DECIMAL(3,2),
    requires_review BOOLEAN DEFAULT FALSE,
    
    -- Timestamp
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Regional context
    region_id UUID REFERENCES regions(id)
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- User lookups and authentication
CREATE INDEX CONCURRENTLY idx_users_email ON users(email) WHERE is_active = TRUE;
CREATE INDEX CONCURRENTLY idx_users_username ON users(username) WHERE is_active = TRUE;
CREATE INDEX CONCURRENTLY idx_users_status ON users(status, last_active_at DESC);
CREATE INDEX CONCURRENTLY idx_users_regions ON users USING GIN(allowed_regions);
CREATE INDEX CONCURRENTLY idx_users_mfa ON users(mfa_enabled, status) WHERE is_active = TRUE;

-- Role and permission lookups
CREATE INDEX CONCURRENTLY idx_roles_name ON roles(name) WHERE is_active = TRUE;
CREATE INDEX CONCURRENTLY idx_roles_permissions ON roles USING GIN(permissions);
CREATE INDEX CONCURRENTLY idx_user_roles_user ON user_roles(user_id, is_active, valid_from DESC);
CREATE INDEX CONCURRENTLY idx_user_roles_regions ON user_roles USING GIN(allowed_regions);
CREATE INDEX CONCURRENTLY idx_permissions_resource_action ON permissions(resource, action);

-- Session management
CREATE INDEX CONCURRENTLY idx_sessions_user ON user_sessions(user_id, status, last_activity_at DESC);
CREATE INDEX CONCURRENTLY idx_sessions_token ON user_sessions(session_token_hash) WHERE status = 'active';
CREATE INDEX CONCURRENTLY idx_sessions_ip ON user_sessions(ip_address, created_at DESC);
CREATE INDEX CONCURRENTLY idx_sessions_device ON user_sessions(device_id, user_id);
CREATE INDEX CONCURRENTLY idx_sessions_expiry ON user_sessions(expires_at) WHERE status = 'active';

-- Temporary access and escalations
CREATE INDEX CONCURRENTLY idx_temp_access_user ON temporary_access(user_id, is_active, expires_at);
CREATE INDEX CONCURRENTLY idx_temp_access_case ON temporary_access(case_id, escalation_type);
CREATE INDEX CONCURRENTLY idx_temp_access_expiry ON temporary_access(expires_at) WHERE is_active = TRUE;

-- Audit and compliance
CREATE INDEX CONCURRENTLY idx_audit_user_time ON user_management_audit(user_id, created_at DESC);
CREATE INDEX CONCURRENTLY idx_audit_event_type ON user_management_audit(event_type, event_category, created_at DESC);
CREATE INDEX CONCURRENTLY idx_audit_target_user ON user_management_audit(target_user_id, created_at DESC);
CREATE INDEX CONCURRENTLY idx_audit_ip ON user_management_audit(ip_address, created_at DESC);
CREATE INDEX CONCURRENTLY idx_audit_session ON user_management_audit(session_id, created_at DESC);

-- =====================================================
-- VIEWS FOR COMMON QUERIES
-- =====================================================

-- Active users with current roles and permissions
CREATE VIEW v_users_with_roles AS
SELECT 
    u.id,
    u.email,
    u.first_name,
    u.last_name,
    u.display_name,
    u.status,
    u.allowed_regions,
    u.pii_scope,
    u.domain,
    u.mfa_enabled,
    u.last_login_at,
    u.last_active_at,
    
    -- Current roles
    COALESCE(
        JSON_AGG(
            JSON_BUILD_OBJECT(
                'role_id', r.id,
                'role_name', r.name,
                'role_display_name', r.display_name,
                'role_level', r.level,
                'assigned_at', ur.assigned_at,
                'valid_until', ur.valid_until
            ) ORDER BY r.level DESC
        ) FILTER (WHERE r.id IS NOT NULL), 
        '[]'::json
    ) as roles,
    
    -- Aggregated permissions
    ARRAY_AGG(DISTINCT unnest_perm) FILTER (WHERE unnest_perm IS NOT NULL) as permissions
    
FROM users u
LEFT JOIN user_roles ur ON u.id = ur.user_id 
    AND ur.is_active = TRUE 
    AND (ur.valid_until IS NULL OR ur.valid_until > NOW())
LEFT JOIN roles r ON ur.role_id = r.id AND r.is_active = TRUE
LEFT JOIN LATERAL unnest(r.permissions) AS unnest_perm ON TRUE
WHERE u.is_active = TRUE
GROUP BY u.id, u.email, u.first_name, u.last_name, u.display_name, 
         u.status, u.allowed_regions, u.pii_scope, u.domain, 
         u.mfa_enabled, u.last_login_at, u.last_active_at;

-- Active sessions with user information
CREATE VIEW v_active_sessions AS
SELECT 
    s.id as session_id,
    s.user_id,
    u.email,
    u.first_name,
    u.last_name,
    s.device_name,
    s.ip_address,
    s.ip_city,
    s.ip_country,
    s.user_agent,
    s.auth_methods,
    s.risk_score,
    s.created_at,
    s.last_activity_at,
    s.expires_at,
    (s.expires_at - NOW()) as time_to_expiry
FROM user_sessions s
JOIN users u ON s.user_id = u.id
WHERE s.status = 'active' 
    AND s.expires_at > NOW()
    AND u.is_active = TRUE;

-- Temporary access with user context
CREATE VIEW v_temporary_access AS
SELECT 
    ta.id,
    ta.case_id,
    ta.escalation_type,
    ta.granted_permissions,
    ta.granted_regions,
    ta.pii_scope_override,
    ta.justification,
    ta.expires_at,
    ta.is_active,
    
    -- User information
    u.email as user_email,
    u.first_name as user_first_name,
    u.last_name as user_last_name,
    
    -- Requester information
    req.email as requested_by_email,
    req.first_name as requested_by_first_name,
    req.last_name as requested_by_last_name,
    ta.requested_at,
    
    -- Approver information
    appr.email as approved_by_email,
    appr.first_name as approved_by_first_name,
    appr.last_name as approved_by_last_name,
    ta.approved_at
    
FROM temporary_access ta
JOIN users u ON ta.user_id = u.id
JOIN users req ON ta.requested_by = req.id
LEFT JOIN users appr ON ta.approved_by = appr.id
WHERE ta.expires_at > NOW() OR ta.is_active = TRUE;

-- =====================================================
-- FUNCTIONS AND TRIGGERS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers
CREATE TRIGGER tr_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_roles_updated_at BEFORE UPDATE ON roles FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Function to clean up expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS INTEGER AS $$
DECLARE
    expired_count INTEGER;
BEGIN
    UPDATE user_sessions 
    SET status = 'expired', terminated_at = NOW()
    WHERE status = 'active' AND expires_at <= NOW();
    
    GET DIAGNOSTICS expired_count = ROW_COUNT;
    RETURN expired_count;
END;
$$ language 'plpgsql';

-- Function to clean up expired temporary access
CREATE OR REPLACE FUNCTION cleanup_expired_access()
RETURNS INTEGER AS $$
DECLARE
    expired_count INTEGER;
BEGIN
    UPDATE temporary_access 
    SET is_active = FALSE
    WHERE is_active = TRUE AND expires_at <= NOW();
    
    GET DIAGNOSTICS expired_count = ROW_COUNT;
    RETURN expired_count;
END;
$$ language 'plpgsql';

-- Function to audit user management events
CREATE OR REPLACE FUNCTION audit_user_event(
    p_event_type VARCHAR,
    p_event_category VARCHAR,
    p_user_id UUID,
    p_target_user_id UUID DEFAULT NULL,
    p_session_id UUID DEFAULT NULL,
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL,
    p_resource VARCHAR DEFAULT NULL,
    p_action VARCHAR DEFAULT NULL,
    p_old_values JSONB DEFAULT NULL,
    p_new_values JSONB DEFAULT NULL,
    p_success BOOLEAN DEFAULT TRUE,
    p_error_message TEXT DEFAULT NULL,
    p_mfa_verified BOOLEAN DEFAULT FALSE,
    p_risk_score DECIMAL DEFAULT 0.0
)
RETURNS UUID AS $$
DECLARE
    audit_id UUID;
BEGIN
    INSERT INTO user_management_audit (
        event_type, event_category, user_id, target_user_id, session_id,
        ip_address, user_agent, resource, action, old_values, new_values,
        success, error_message, mfa_verified, risk_score
    ) VALUES (
        p_event_type, p_event_category, p_user_id, p_target_user_id, p_session_id,
        p_ip_address, p_user_agent, p_resource, p_action, p_old_values, p_new_values,
        p_success, p_error_message, p_mfa_verified, p_risk_score
    ) RETURNING id INTO audit_id;
    
    RETURN audit_id;
END;
$$ language 'plpgsql';

-- =====================================================
-- INITIAL DATA SETUP
-- =====================================================

-- Insert system roles from policy bundle
INSERT INTO roles (name, display_name, description, level, permissions, is_system) VALUES
('ground_ops', 'Ground Operations', 'Basic operational tasks and driver management', 10, 
 ARRAY['assign_driver', 'contact_driver_masked', 'cancel_trip_ops', 'view_live_map', 'manage_queue', 'view_metrics_region'], TRUE),

('ops_monitor', 'Operations Monitor', 'View-only operations monitoring', 20,
 ARRAY['view_live_map', 'view_metrics_region'], TRUE),

('ops_manager', 'Operations Manager', 'Operations management with regional scope', 30,
 ARRAY['assign_driver', 'contact_driver_masked', 'cancel_trip_ops', 'view_live_map', 'manage_queue', 'view_metrics_region', 'manage_shift', 'throttle_promos_region', 'view_driver_files_masked'], TRUE),

('regional_manager', 'Regional Manager', 'Regional operations and temporary access approval', 40,
 ARRAY['assign_driver', 'contact_driver_masked', 'cancel_trip_ops', 'view_live_map', 'manage_queue', 'view_metrics_region', 'manage_shift', 'throttle_promos_region', 'view_driver_files_masked', 'approve_temp_access_region'], TRUE),

('support', 'Customer Support', 'Customer support and case management', 25,
 ARRAY['case_open', 'case_close', 'trip_replay_masked', 'initiate_refund_request', 'escalate_to_risk', 'view_ticket_history', 'view_masked_profiles'], TRUE),

('risk_investigator', 'Risk Investigator', 'Fraud investigation and risk analysis', 35,
 ARRAY['case_open', 'case_close', 'trip_replay_unmasked', 'view_evidence', 'unmask_pii_with_mfa', 'device_check', 'apply_account_hold', 'close_investigation'], TRUE),

('finance_ops', 'Finance Operations', 'Financial operations and reconciliation', 30,
 ARRAY['view_revenue', 'view_driver_wallets_summary', 'approve_payout_batch', 'process_refund', 'reconcile_deposits', 'manage_disputes'], TRUE),

('hr_ops', 'HR Operations', 'Human resources and employee management', 30,
 ARRAY['view_employee_profile', 'manage_contract', 'record_attendance', 'initiate_payroll_run', 'record_disciplinary_action', 'view_hr_kpis'], TRUE),

('executive', 'Executive', 'Executive dashboards and high-level metrics', 60,
 ARRAY['view_nationwide_dashboards', 'view_financial_summaries', 'view_ops_kpis_masked'], TRUE),

('analyst', 'Data Analyst', 'Data analysis and reporting', 25,
 ARRAY['query_curated_views', 'export_reports'], TRUE),

('auditor', 'System Auditor', 'System auditing and compliance review', 50,
 ARRAY['read_all_configs', 'read_all_audit_logs', 'read_only_everything'], TRUE),

('iam_admin', 'IAM Administrator', 'Identity and access management', 80,
 ARRAY['manage_users', 'assign_roles', 'set_allowed_regions', 'set_pii_scope'], TRUE),

('app_admin', 'Application Administrator', 'Application configuration and feature management', 90,
 ARRAY['manage_feature_flags', 'manage_service_configs', 'set_service_limits'], TRUE);

-- Insert standard permissions
INSERT INTO permissions (name, display_name, description, resource, action, scope, data_class, requires_mfa) VALUES
-- Basic operations
('view_live_map', 'View Live Map', 'Access to real-time driver location map', 'map', 'view', 'regional', 'internal', FALSE),
('assign_driver', 'Assign Driver', 'Assign drivers to bookings', 'booking', 'assign', 'regional', 'internal', FALSE),
('contact_driver_masked', 'Contact Driver (Masked)', 'Contact drivers with masked personal information', 'driver', 'contact', 'regional', 'internal', FALSE),

-- Advanced operations
('unmask_pii_with_mfa', 'Unmask PII with MFA', 'View unmasked personally identifiable information', 'user', 'unmask_pii', 'global', 'restricted', TRUE),
('approve_temp_access_region', 'Approve Regional Temp Access', 'Approve temporary access for regional scope', 'access', 'approve', 'regional', 'confidential', TRUE),

-- Admin operations
('manage_users', 'Manage Users', 'Create, update, and deactivate user accounts', 'user', 'manage', 'global', 'confidential', TRUE),
('assign_roles', 'Assign Roles', 'Assign and revoke user roles', 'role', 'assign', 'global', 'confidential', TRUE),
('set_allowed_regions', 'Set Allowed Regions', 'Configure user regional access', 'user', 'configure_regions', 'global', 'confidential', TRUE),
('set_pii_scope', 'Set PII Scope', 'Configure user PII access levels', 'user', 'configure_pii', 'global', 'restricted', TRUE),

-- System operations
('read_all_audit_logs', 'Read All Audit Logs', 'Access all system audit logs', 'audit', 'read', 'global', 'confidential', FALSE),
('manage_feature_flags', 'Manage Feature Flags', 'Configure system feature flags', 'system', 'configure', 'global', 'internal', FALSE);

-- =====================================================
-- COMMENTS AND DOCUMENTATION
-- =====================================================

COMMENT ON TABLE users IS 'Enhanced user management with RBAC and ABAC attributes';
COMMENT ON TABLE roles IS 'System roles with hierarchical permissions based on Xpress policy bundle';
COMMENT ON TABLE user_roles IS 'User role assignments with regional and temporal constraints';
COMMENT ON TABLE permissions IS 'System permissions registry with data classification';
COMMENT ON TABLE user_sessions IS 'Comprehensive session tracking with security context';
COMMENT ON TABLE temporary_access IS 'Temporary elevated access with case-based justification';
COMMENT ON TABLE user_management_audit IS 'Complete audit trail for all user management operations';

COMMENT ON COLUMN users.allowed_regions IS 'ABAC attribute: regions where user can operate';
COMMENT ON COLUMN users.pii_scope IS 'ABAC attribute: level of PII access (none/masked/full)';
COMMENT ON COLUMN users.domain IS 'ABAC attribute: specialized domain (fraud/safety/compliance)';
COMMENT ON COLUMN temporary_access.case_id IS 'Cross-region override case ID for support/risk escalation';