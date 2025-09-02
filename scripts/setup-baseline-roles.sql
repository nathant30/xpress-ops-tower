-- Setup baseline roles for production readiness
-- This script ensures baseline roles are properly configured with immutable and sensitive flags

-- First, create the rbac_roles table if it doesn't exist (using XPRESS_ROLES as template)
CREATE TABLE IF NOT EXISTS rbac_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) UNIQUE NOT NULL,
  level INTEGER NOT NULL,
  description TEXT,
  permissions TEXT[] NOT NULL DEFAULT '{}',
  pii_scope VARCHAR(20) NOT NULL DEFAULT 'masked' CHECK (pii_scope IN ('none', 'masked', 'full')),
  allowed_regions TEXT[] NOT NULL DEFAULT '{}',
  domain VARCHAR(50),
  tenant_id UUID,
  country_code VARCHAR(2),
  is_immutable BOOLEAN NOT NULL DEFAULT FALSE,
  sensitive BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by VARCHAR(255)
);

-- Insert baseline roles from XPRESS_ROLES if they don't exist
INSERT INTO rbac_roles (name, level, description, permissions, pii_scope, allowed_regions, is_immutable, sensitive, updated_by)
VALUES 
  ('ground_ops', 10, 'Ground Operations - Basic operational staff', 
   ARRAY['assign_driver', 'contact_driver_masked', 'cancel_trip_ops', 'view_live_map', 'manage_queue', 'view_metrics_region'], 
   'masked', ARRAY[]::TEXT[], TRUE, TRUE, 'system'),
  
  ('ops_monitor', 20, 'Operations Monitor - Real-time monitoring', 
   ARRAY['view_live_map', 'view_metrics_region'], 
   'masked', ARRAY[]::TEXT[], FALSE, FALSE, 'system'),
   
  ('support', 25, 'Customer Support - Issue resolution', 
   ARRAY['case_open', 'case_close', 'trip_replay_masked', 'initiate_refund_request', 'escalate_to_risk', 'view_ticket_history', 'view_masked_profiles'], 
   'masked', ARRAY[]::TEXT[], TRUE, TRUE, 'system'),
   
  ('analyst', 25, 'Data Analyst - Reporting and analysis', 
   ARRAY['query_curated_views', 'export_reports'], 
   'masked', ARRAY[]::TEXT[], FALSE, FALSE, 'system'),
   
  ('ops_manager', 30, 'Operations Manager - Team management', 
   ARRAY['assign_driver', 'contact_driver_masked', 'cancel_trip_ops', 'view_live_map', 'manage_queue', 'view_metrics_region', 'manage_shift', 'throttle_promos_region', 'view_driver_files_masked'], 
   'masked', ARRAY[]::TEXT[], FALSE, FALSE, 'system'),
   
  ('finance_ops', 30, 'Finance Operations - Financial management', 
   ARRAY['view_revenue', 'view_driver_wallets_summary', 'approve_payout_batch', 'process_refund', 'reconcile_deposits', 'manage_disputes'], 
   'masked', ARRAY[]::TEXT[], FALSE, TRUE, 'system'),
   
  ('hr_ops', 30, 'HR Operations - Human resources', 
   ARRAY['view_employee_profile', 'manage_contract', 'record_attendance', 'initiate_payroll_run', 'record_disciplinary_action', 'view_hr_kpis'], 
   'masked', ARRAY[]::TEXT[], FALSE, TRUE, 'system'),
   
  ('risk_investigator', 35, 'Risk Investigator - Security analysis', 
   ARRAY['case_open', 'case_close', 'trip_replay_unmasked', 'view_evidence', 'unmask_pii_with_mfa', 'device_check', 'apply_account_hold', 'close_investigation'], 
   'full', ARRAY[]::TEXT[], FALSE, TRUE, 'system'),
   
  ('regional_manager', 40, 'Regional Manager - Regional oversight', 
   ARRAY['assign_driver', 'contact_driver_masked', 'cancel_trip_ops', 'view_live_map', 'manage_queue', 'view_metrics_region', 'manage_shift', 'throttle_promos_region', 'view_driver_files_masked', 'approve_temp_access_region'], 
   'masked', ARRAY[]::TEXT[], FALSE, TRUE, 'system'),
   
  ('expansion_manager', 45, 'Expansion Manager - Market expansion', 
   ARRAY['create_region_request', 'promote_region_stage', 'configure_prelaunch_pricing_flagged', 'configure_supply_campaign_flagged', 'view_market_intel_masked', 'view_vendor_pipeline', 'create_vendor_onboarding_task', 'request_temp_access_region', 'publish_go_live_checklist', 'handover_to_regional_manager'], 
   'masked', ARRAY[]::TEXT[], FALSE, TRUE, 'system'),
   
  ('auditor', 50, 'System Auditor - Compliance oversight', 
   ARRAY['read_all_configs', 'read_all_audit_logs', 'read_only_everything'], 
   'full', ARRAY[]::TEXT[], FALSE, TRUE, 'system'),
   
  ('executive', 60, 'Executive - Strategic oversight', 
   ARRAY['view_nationwide_dashboards', 'view_financial_summaries', 'view_ops_kpis_masked'], 
   'masked', ARRAY[]::TEXT[], TRUE, TRUE, 'system'),
   
  ('iam_admin', 80, 'IAM Administrator - Identity management', 
   ARRAY['manage_users', 'assign_roles', 'set_allowed_regions', 'set_pii_scope'], 
   'full', ARRAY[]::TEXT[], TRUE, TRUE, 'system'),
   
  ('app_admin', 90, 'Application Administrator - System administration', 
   ARRAY['manage_feature_flags', 'manage_service_configs', 'set_service_limits'], 
   'full', ARRAY[]::TEXT[], FALSE, TRUE, 'system')

ON CONFLICT (name) DO UPDATE SET
  level = EXCLUDED.level,
  description = EXCLUDED.description,
  permissions = EXCLUDED.permissions,
  pii_scope = EXCLUDED.pii_scope,
  allowed_regions = EXCLUDED.allowed_regions,
  is_immutable = EXCLUDED.is_immutable,
  sensitive = EXCLUDED.sensitive,
  updated_at = now(),
  updated_by = EXCLUDED.updated_by;

-- Ensure baseline roles are marked as immutable and sensitive
UPDATE rbac_roles 
SET 
  is_immutable = TRUE, 
  sensitive = TRUE,
  updated_at = now(),
  updated_by = 'baseline_setup'
WHERE name IN ('ground_ops', 'support', 'executive', 'iam_admin');

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_rbac_roles_name ON rbac_roles (name);
CREATE INDEX IF NOT EXISTS idx_rbac_roles_level ON rbac_roles (level);
CREATE INDEX IF NOT EXISTS idx_rbac_roles_immutable ON rbac_roles (is_immutable);
CREATE INDEX IF NOT EXISTS idx_rbac_roles_sensitive ON rbac_roles (sensitive);

-- Create users table if it doesn't exist (for testing user assignments)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  display_name VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create user_roles junction table if it doesn't exist
CREATE TABLE IF NOT EXISTS user_roles (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES rbac_roles(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  assigned_by UUID REFERENCES users(id),
  PRIMARY KEY (user_id, role_id)
);

-- Verification queries
\echo 'Baseline roles verification:'
SELECT 
  name, 
  level, 
  is_immutable, 
  sensitive, 
  array_length(permissions, 1) as permission_count,
  pii_scope
FROM rbac_roles 
WHERE name IN ('ground_ops', 'support', 'executive', 'iam_admin')
ORDER BY level;

\echo 'Total roles count:'
SELECT COUNT(*) as total_roles FROM rbac_roles;

\echo 'Immutable roles count:'
SELECT COUNT(*) as immutable_roles FROM rbac_roles WHERE is_immutable = TRUE;