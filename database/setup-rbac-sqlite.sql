-- SQLite-compatible RBAC+ABAC Schema Setup
-- Creates the core authorization tables for expansion_manager

-- =====================================================
-- Core RBAC Tables
-- =====================================================

CREATE TABLE IF NOT EXISTS roles (
  role_id INTEGER PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  level INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT 1
);

CREATE TABLE IF NOT EXISTS capabilities (
  capability_id INTEGER PRIMARY KEY AUTOINCREMENT,
  action TEXT UNIQUE NOT NULL,
  description TEXT,
  risk_level TEXT CHECK (risk_level IN ('low', 'medium', 'high')) DEFAULT 'medium'
);

CREATE TABLE IF NOT EXISTS role_capabilities (
  role_id INTEGER,
  capability_id INTEGER,
  PRIMARY KEY (role_id, capability_id),
  FOREIGN KEY (role_id) REFERENCES roles(role_id),
  FOREIGN KEY (capability_id) REFERENCES capabilities(capability_id)
);

CREATE TABLE IF NOT EXISTS users (
  user_id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  created_at DATETIME DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS user_roles (
  user_id TEXT,
  role_id INTEGER,
  assigned_by_user_id TEXT,
  assigned_at DATETIME DEFAULT (datetime('now')),
  is_active BOOLEAN DEFAULT 1,
  PRIMARY KEY (user_id, role_id),
  FOREIGN KEY (user_id) REFERENCES users(user_id),
  FOREIGN KEY (role_id) REFERENCES roles(role_id)
);

-- =====================================================
-- Regional and ABAC Tables
-- =====================================================

CREATE TABLE IF NOT EXISTS regions (
  region_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  country_code TEXT NOT NULL,
  timezone TEXT NOT NULL,
  region_state TEXT DEFAULT 'prospect' CHECK (region_state IN ('prospect', 'pilot', 'active', 'suspended')),
  created_at DATETIME DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS user_regions (
  user_id TEXT,
  region_id TEXT,
  user_role TEXT,
  region_state TEXT,
  assigned_at DATETIME DEFAULT (datetime('now')),
  is_active BOOLEAN DEFAULT 1,
  PRIMARY KEY (user_id, region_id),
  FOREIGN KEY (user_id) REFERENCES users(user_id),
  FOREIGN KEY (region_id) REFERENCES regions(region_id)
);

-- =====================================================
-- Audit and Compliance Tables
-- =====================================================

CREATE TABLE IF NOT EXISTS region_state_transitions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  region_id TEXT NOT NULL,
  from_state TEXT,
  to_state TEXT NOT NULL,
  transition_reason TEXT,
  initiated_by_user_id TEXT NOT NULL,
  initiated_by_role TEXT NOT NULL,
  transition_date DATETIME DEFAULT (datetime('now')),
  metadata JSON,
  is_active BOOLEAN DEFAULT 1,
  FOREIGN KEY (region_id) REFERENCES regions(region_id)
);

CREATE TABLE IF NOT EXISTS dual_control_approvals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  workflow_type TEXT NOT NULL,
  resource_id TEXT NOT NULL,
  primary_action TEXT NOT NULL,
  primary_user_id TEXT NOT NULL,
  primary_role TEXT NOT NULL,
  primary_timestamp DATETIME DEFAULT (datetime('now')),
  secondary_user_id TEXT,
  secondary_role TEXT,
  secondary_timestamp DATETIME,
  approval_status TEXT DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected', 'expired')),
  expiry_timestamp DATETIME DEFAULT (datetime('now', '+24 hours')),
  metadata JSON,
  created_at DATETIME DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS schema_migrations (
  version TEXT PRIMARY KEY,
  description TEXT,
  applied_at DATETIME DEFAULT (datetime('now'))
);

-- =====================================================
-- Insert Core Roles
-- =====================================================

INSERT OR REPLACE INTO roles (role_id, name, display_name, level, is_active) VALUES
  (10, 'ground_ops', 'Ground Operations', 10, 1),
  (20, 'support', 'Customer Support', 20, 1),
  (25, 'ops_manager', 'Operations Manager', 25, 1),
  (30, 'analyst', 'Data Analyst', 30, 1),
  (40, 'regional_manager', 'Regional Manager', 40, 1),
  (45, 'expansion_manager', 'Expansion Manager', 45, 1),
  (50, 'risk_investigator', 'Risk Investigator', 50, 1),
  (60, 'executive', 'Executive', 60, 1);

-- =====================================================
-- Insert Capabilities
-- =====================================================

INSERT OR REPLACE INTO capabilities (action, description, risk_level) VALUES
  ('view_drivers', 'View driver information', 'low'),
  ('view_passengers', 'View passenger information', 'low'),
  ('view_trips', 'View trip information', 'low'),
  ('manage_users', 'Manage user accounts', 'high'),
  ('assign_roles', 'Assign roles to users', 'high'),
  ('unmask_pii_with_mfa', 'Unmask PII data with MFA', 'high'),
  ('create_region_request', 'Request creation of new expansion region', 'medium'),
  ('promote_region_stage', 'Promote region from prospect to pilot or pilot to active', 'high'),
  ('configure_prelaunch_pricing_flagged', 'Configure pricing for pre-launch regions', 'medium'),
  ('configure_supply_campaign_flagged', 'Set up supply acquisition campaigns', 'medium'),
  ('view_market_intel_masked', 'Access market intelligence with PII masked', 'low'),
  ('view_vendor_pipeline', 'View vendor partnership pipeline', 'low'),
  ('create_vendor_onboarding_task', 'Create tasks for vendor onboarding', 'low'),
  ('request_temp_access_region', 'Request temporary access to other regions', 'medium'),
  ('publish_go_live_checklist', 'Publish region go-live readiness checklist', 'low'),
  ('handover_to_regional_manager', 'Transfer region ownership to regional manager', 'high');

-- =====================================================
-- Assign Expansion Manager Capabilities
-- =====================================================

INSERT OR REPLACE INTO role_capabilities (role_id, capability_id)
SELECT 
  45 as role_id,
  capability_id
FROM capabilities 
WHERE action IN (
  'create_region_request',
  'promote_region_stage', 
  'configure_prelaunch_pricing_flagged',
  'configure_supply_campaign_flagged',
  'view_market_intel_masked',
  'view_vendor_pipeline',
  'create_vendor_onboarding_task',
  'request_temp_access_region',
  'publish_go_live_checklist',
  'handover_to_regional_manager'
);

-- =====================================================
-- Insert Sample Data
-- =====================================================

INSERT OR REPLACE INTO regions (region_id, name, country_code, timezone, region_state) VALUES
  ('ph-ncr-manila', 'Manila', 'PH', 'Asia/Manila', 'active'),
  ('ph-vis-cebu', 'Cebu', 'PH', 'Asia/Manila', 'active'),
  ('ph-min-davao', 'Davao', 'PH', 'Asia/Manila', 'active'),
  ('ph-pal-puerto', 'Puerto Princesa', 'PH', 'Asia/Manila', 'prospect'),
  ('ph-zam-zamboanga', 'Zamboanga', 'PH', 'Asia/Manila', 'pilot'),
  ('ph-bat-bataan', 'Bataan', 'PH', 'Asia/Manila', 'prospect');

INSERT OR REPLACE INTO users (user_id, email, full_name, status) VALUES
  ('usr-expansion-manager-001', 'expansion.manager@xpress.test', 'Test Expansion Manager', 'active'),
  ('usr-ground-ops-001', 'ground.ops.manila@xpress.test', 'Test Ground Ops', 'active'),
  ('usr-risk-investigator-001', 'risk.investigator@xpress.test', 'Test Risk Investigator', 'active');

INSERT OR REPLACE INTO user_roles (user_id, role_id, assigned_by_user_id, is_active) VALUES
  ('usr-expansion-manager-001', 45, 'system-migration', 1),
  ('usr-ground-ops-001', 10, 'system-migration', 1),
  ('usr-risk-investigator-001', 50, 'system-migration', 1);

INSERT OR REPLACE INTO user_regions (user_id, region_id, user_role, region_state) VALUES
  ('usr-expansion-manager-001', 'ph-pal-puerto', 'expansion_manager', 'prospect'),
  ('usr-expansion-manager-001', 'ph-zam-zamboanga', 'expansion_manager', 'pilot'),
  ('usr-ground-ops-001', 'ph-ncr-manila', 'ground_ops', 'active');

-- =====================================================
-- Create Indexes
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_user_roles_active ON user_roles(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_regions_state ON regions(region_state);
CREATE INDEX IF NOT EXISTS idx_region_transitions_region ON region_state_transitions(region_id);
CREATE INDEX IF NOT EXISTS idx_dual_control_workflow ON dual_control_approvals(workflow_type, approval_status);

-- =====================================================
-- Record Migration
-- =====================================================

INSERT OR REPLACE INTO schema_migrations (version, description) VALUES
  ('008', 'Add expansion_manager role and region_state workflow support');