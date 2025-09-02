-- SQLite Migration 009: Approval Workflows & Temporary Access System
-- Extends existing RBAC schema with approval workflow capabilities

-- =====================================================
-- Approval Workflow System Tables
-- =====================================================

CREATE TABLE IF NOT EXISTS approval_workflows (
    workflow_id INTEGER PRIMARY KEY AUTOINCREMENT,
    action VARCHAR(100) NOT NULL UNIQUE,
    required_approvers INTEGER DEFAULT 1,
    sensitivity_threshold REAL DEFAULT 0.5,
    temporary_access_ttl INTEGER, -- TTL in seconds for temp access grants
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT 1
);

CREATE TABLE IF NOT EXISTS approval_requests (
    request_id TEXT PRIMARY KEY,
    workflow_id INTEGER NOT NULL,
    requester_id TEXT NOT NULL,
    status TEXT CHECK (status IN ('pending', 'approved', 'rejected', 'expired')) DEFAULT 'pending',
    justification TEXT,
    requested_action TEXT NOT NULL, -- JSON string containing action details
    requested_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME,
    completed_at DATETIME,
    FOREIGN KEY (workflow_id) REFERENCES approval_workflows(workflow_id),
    FOREIGN KEY (requester_id) REFERENCES users(user_id)
);

CREATE TABLE IF NOT EXISTS approval_responses (
    response_id TEXT PRIMARY KEY,
    request_id TEXT NOT NULL,
    approver_id TEXT NOT NULL,
    decision TEXT CHECK (decision IN ('approve', 'reject')) NOT NULL,
    comments TEXT,
    responded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (request_id) REFERENCES approval_requests(request_id),
    FOREIGN KEY (approver_id) REFERENCES users(user_id)
);

CREATE TABLE IF NOT EXISTS temporary_access_tokens (
    token_id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    permissions TEXT NOT NULL, -- JSON array of permissions as string
    expires_at DATETIME NOT NULL,
    granted_by TEXT NOT NULL,
    granted_for_request TEXT, -- Optional link to approval request
    revoked_at DATETIME NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    metadata TEXT, -- JSON string for additional context
    FOREIGN KEY (user_id) REFERENCES users(user_id),
    FOREIGN KEY (granted_by) REFERENCES users(user_id),
    FOREIGN KEY (granted_for_request) REFERENCES approval_requests(request_id)
);

-- =====================================================
-- Indexes for Performance
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_approval_requests_status ON approval_requests(status, expires_at);
CREATE INDEX IF NOT EXISTS idx_approval_requests_requester ON approval_requests(requester_id, status);
CREATE INDEX IF NOT EXISTS idx_approval_responses_request ON approval_responses(request_id, responded_at);
CREATE INDEX IF NOT EXISTS idx_temporary_access_user ON temporary_access_tokens(user_id, expires_at);
CREATE INDEX IF NOT EXISTS idx_temporary_access_expires ON temporary_access_tokens(expires_at);

-- =====================================================
-- Insert Predefined Workflow Configurations
-- =====================================================

INSERT OR REPLACE INTO approval_workflows (action, required_approvers, sensitivity_threshold, temporary_access_ttl, is_active) VALUES
    ('configure_alerts', 1, 0.3, 3600, 1), -- ops manager approval, 1h temp access
    ('unmask_pii_with_mfa', 2, 0.8, 1800, 1), -- dual approval (risk + executive), 30min temp access
    ('cross_region_override', 1, 0.7, 7200, 1), -- executive approval, 2h temp access
    ('approve_payout_batch', 2, 0.9, 1800, 1), -- dual financial approval, 30min temp access
    ('manage_users', 1, 0.6, 3600, 1), -- admin approval, 1h temp access
    ('assign_roles', 1, 0.6, 3600, 1), -- admin approval, 1h temp access
    ('revoke_access', 1, 0.5, 1800, 1), -- admin approval, 30min temp access
    ('manage_api_keys', 1, 0.7, 1800, 1), -- admin approval, 30min temp access
    ('export_audit_data', 1, 0.8, 900, 1), -- security approval, 15min temp access
    ('access_raw_location_data', 2, 0.9, 600, 1), -- dual approval (privacy + exec), 10min temp access
    ('generate_security_reports', 1, 0.6, 3600, 1), -- security manager approval, 1h temp access
    ('manage_feature_flags', 1, 0.5, 3600, 1), -- ops manager approval, 1h temp access
    ('manage_integrations', 1, 0.7, 1800, 1), -- tech lead approval, 30min temp access
    ('configure_prelaunch_pricing_flagged', 1, 0.6, 7200, 1), -- expansion manager approval, 2h temp access
    ('promote_region_stage', 1, 0.8, 3600, 1); -- executive approval, 1h temp access

-- =====================================================
-- Add New Capabilities for Approval System
-- =====================================================

INSERT OR REPLACE INTO capabilities (action, description, risk_level) VALUES
    ('manage_approval_workflows', 'Configure and manage approval workflows', 'high'),
    ('approve_requests', 'Approve or reject pending approval requests', 'medium'),
    ('grant_temporary_access', 'Grant temporary elevated permissions', 'high'),
    ('revoke_temporary_access', 'Revoke existing temporary access tokens', 'medium'),
    ('view_approval_history', 'View approval request history and audit trail', 'low'),
    ('view_pending_approvals', 'View pending approval requests requiring action', 'low');

-- =====================================================
-- Assign Approval Capabilities to Roles
-- =====================================================

-- Ops Managers can approve basic workflow requests
INSERT OR REPLACE INTO role_capabilities (role_id, capability_id)
SELECT 25 as role_id, capability_id FROM capabilities 
WHERE action IN ('approve_requests', 'view_pending_approvals', 'view_approval_history');

-- Regional Managers can approve and grant temporary access
INSERT OR REPLACE INTO role_capabilities (role_id, capability_id)
SELECT 40 as role_id, capability_id FROM capabilities 
WHERE action IN ('approve_requests', 'grant_temporary_access', 'view_pending_approvals', 'view_approval_history');

-- Expansion Managers can approve expansion-related requests
INSERT OR REPLACE INTO role_capabilities (role_id, capability_id)
SELECT 45 as role_id, capability_id FROM capabilities 
WHERE action IN ('approve_requests', 'view_pending_approvals', 'view_approval_history');

-- Risk Investigators can approve security-related requests
INSERT OR REPLACE INTO role_capabilities (role_id, capability_id)
SELECT 50 as role_id, capability_id FROM capabilities 
WHERE action IN ('approve_requests', 'grant_temporary_access', 'view_pending_approvals', 'view_approval_history');

-- Executives have full approval system access
INSERT OR REPLACE INTO role_capabilities (role_id, capability_id)
SELECT 60 as role_id, capability_id FROM capabilities 
WHERE action IN ('manage_approval_workflows', 'approve_requests', 'grant_temporary_access', 'revoke_temporary_access', 'view_pending_approvals', 'view_approval_history');

-- =====================================================
-- Sample Data for Testing
-- =====================================================

-- Sample approval request (for testing)
INSERT OR REPLACE INTO approval_requests (
    request_id, 
    workflow_id, 
    requester_id, 
    status, 
    justification, 
    requested_action,
    expires_at
) VALUES (
    'req-test-001',
    (SELECT workflow_id FROM approval_workflows WHERE action = 'configure_alerts'),
    'usr-ground-ops-001',
    'pending',
    'Need to configure critical alerts for Manila region after incident reports',
    '{"action": "configure_alerts", "region": "ph-ncr-manila", "alert_types": ["driver_emergency", "passenger_safety"]}',
    datetime('now', '+24 hours')
);

-- =====================================================
-- Trigger for Auto-Expiry Cleanup (SQLite Compatible)
-- Note: SQLite doesn't support stored procedures, so this would need
-- to be handled by application logic or periodic cleanup jobs
-- =====================================================

-- =====================================================
-- Record Migration
-- =====================================================

INSERT OR REPLACE INTO schema_migrations (version, description) VALUES
    ('009', 'Add approval workflows and temporary access system');