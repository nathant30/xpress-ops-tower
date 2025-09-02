-- 008_add_expansion_manager.sql
-- Add expansion_manager role and region_state support for new region expansion workflow

BEGIN;

-- =====================================================
-- Add expansion_manager role
-- =====================================================

INSERT INTO roles (role_id, name, display_name, level, is_active)
VALUES (58, 'expansion_manager', 'Expansion Manager', 45, true)
ON CONFLICT (name) DO NOTHING;

-- =====================================================  
-- Add region_state column to support expansion workflow
-- =====================================================

ALTER TABLE regions
  ADD COLUMN IF NOT EXISTS region_state VARCHAR(16)
  DEFAULT 'prospect'
  CHECK (region_state IN ('prospect', 'pilot', 'active', 'suspended'));

-- Create index for region_state queries
CREATE INDEX IF NOT EXISTS idx_regions_state 
ON regions(region_state) 
WHERE region_state IS NOT NULL;

-- Add region_state to existing regions (default to active for current regions)
UPDATE regions 
SET region_state = 'active' 
WHERE region_state IS NULL;

-- =====================================================
-- Add expansion_manager capabilities
-- =====================================================

-- Insert expansion-specific capabilities
INSERT INTO capabilities (action, description, risk_level) VALUES
  ('create_region_request', 'Request creation of new expansion region', 'medium'),
  ('promote_region_stage', 'Promote region from prospect→pilot or pilot→active', 'high'),
  ('configure_prelaunch_pricing_flagged', 'Configure pricing for pre-launch regions', 'medium'),
  ('configure_supply_campaign_flagged', 'Set up supply acquisition campaigns', 'medium'),
  ('view_market_intel_masked', 'Access market intelligence with PII masked', 'low'),
  ('view_vendor_pipeline', 'View vendor partnership pipeline', 'low'),
  ('create_vendor_onboarding_task', 'Create tasks for vendor onboarding', 'low'),
  ('request_temp_access_region', 'Request temporary access to other regions', 'medium'),
  ('publish_go_live_checklist', 'Publish region go-live readiness checklist', 'low'),
  ('handover_to_regional_manager', 'Transfer region ownership to regional manager', 'high')
ON CONFLICT (action) DO NOTHING;

-- Assign capabilities to expansion_manager role
INSERT INTO role_capabilities (role_id, capability_id)
SELECT 
  r.role_id,
  c.capability_id
FROM roles r
CROSS JOIN capabilities c
WHERE r.name = 'expansion_manager'
  AND c.action IN (
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
  )
ON CONFLICT (role_id, capability_id) DO NOTHING;

-- =====================================================
-- Create region state transition log for auditing
-- =====================================================

CREATE TABLE IF NOT EXISTS region_state_transitions (
  id SERIAL PRIMARY KEY,
  region_id VARCHAR(50) NOT NULL REFERENCES regions(region_id),
  from_state VARCHAR(16),
  to_state VARCHAR(16) NOT NULL,
  transition_reason TEXT,
  initiated_by_user_id VARCHAR(50) NOT NULL,
  initiated_by_role VARCHAR(50) NOT NULL,
  approved_by_user_id VARCHAR(50),
  approved_by_role VARCHAR(50),
  transition_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  effective_date TIMESTAMP WITH TIME ZONE,
  metadata JSONB,
  is_active BOOLEAN DEFAULT true,
  
  CONSTRAINT ck_valid_states CHECK (
    from_state IS NULL OR from_state IN ('prospect', 'pilot', 'active', 'suspended')
  ),
  CONSTRAINT ck_valid_to_states CHECK (
    to_state IN ('prospect', 'pilot', 'active', 'suspended')
  )
);

-- Index for state transition queries
CREATE INDEX IF NOT EXISTS idx_region_state_transitions_region 
ON region_state_transitions(region_id, transition_date DESC);

CREATE INDEX IF NOT EXISTS idx_region_state_transitions_user
ON region_state_transitions(initiated_by_user_id, transition_date DESC);

-- =====================================================
-- Create dual-control approval tracking
-- =====================================================

CREATE TABLE IF NOT EXISTS dual_control_approvals (
  id SERIAL PRIMARY KEY,
  workflow_type VARCHAR(50) NOT NULL, -- 'prelaunch_pricing', 'supply_campaigns', 'region_promotion'
  resource_id VARCHAR(100) NOT NULL, -- region_id, campaign_id, etc
  primary_action VARCHAR(100) NOT NULL,
  primary_user_id VARCHAR(50) NOT NULL,
  primary_role VARCHAR(50) NOT NULL,
  primary_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  secondary_action VARCHAR(100),
  secondary_user_id VARCHAR(50),
  secondary_role VARCHAR(50), 
  secondary_timestamp TIMESTAMP WITH TIME ZONE,
  approval_status VARCHAR(20) DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected', 'expired')),
  expiry_timestamp TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '24 hours'),
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for dual-control queries
CREATE INDEX IF NOT EXISTS idx_dual_control_workflow
ON dual_control_approvals(workflow_type, approval_status, expiry_timestamp);

CREATE INDEX IF NOT EXISTS idx_dual_control_resource
ON dual_control_approvals(resource_id, approval_status);

-- =====================================================
-- Insert sample expansion regions for testing
-- =====================================================

INSERT INTO regions (region_id, name, country_code, timezone, region_state) VALUES
  ('ph-pal-puerto', 'Puerto Princesa', 'PH', 'Asia/Manila', 'prospect'),
  ('ph-zam-zamboanga', 'Zamboanga', 'PH', 'Asia/Manila', 'pilot'),
  ('ph-bat-bataan', 'Bataan', 'PH', 'Asia/Manila', 'prospect')
ON CONFLICT (region_id) DO UPDATE SET
  region_state = EXCLUDED.region_state;

-- =====================================================
-- Create expansion manager test users
-- =====================================================

-- Insert test expansion manager (for development/testing)
INSERT INTO users (
  user_id, 
  email, 
  full_name, 
  status,
  created_at
) VALUES (
  'usr-expansion-manager-001',
  'expansion.manager.test@xpress.ph',
  'Test Expansion Manager',
  'active',
  NOW()
) ON CONFLICT (user_id) DO NOTHING;

-- Assign expansion_manager role to test user
INSERT INTO user_roles (
  user_id,
  role_id,
  assigned_by_user_id,
  assigned_at,
  is_active
) SELECT
  'usr-expansion-manager-001',
  r.role_id,
  'system-migration',
  NOW(),
  true
FROM roles r 
WHERE r.name = 'expansion_manager'
ON CONFLICT (user_id, role_id) DO NOTHING;

-- =====================================================
-- Update RLS policies for region_state
-- =====================================================

-- Drop existing policy if it exists
DROP POLICY IF EXISTS regions_regional_access ON regions;

-- Create updated policy that considers region_state
CREATE POLICY regions_regional_access ON regions
  FOR ALL TO authenticated_users
  USING (
    -- Global roles can see all regions
    current_setting('app.user_role') IN ('iam_admin', 'app_admin', 'executive', 'auditor') OR
    
    -- Regional users can see their assigned regions (active only)
    (region_id = ANY(string_to_array(current_setting('app.user_allowed_regions', true), ',')) AND region_state = 'active') OR
    
    -- Expansion managers can see prospect/pilot regions globally 
    (current_setting('app.user_role') = 'expansion_manager' AND region_state IN ('prospect', 'pilot')) OR
    
    -- Support/risk can see regions they have temporary access to
    (current_setting('app.user_role') IN ('support', 'risk_investigator') AND current_setting('app.temp_access_regions', true) IS NOT NULL)
  );

-- =====================================================
-- Add audit triggers for region state changes
-- =====================================================

-- Function to log region state changes
CREATE OR REPLACE FUNCTION log_region_state_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Only log if region_state actually changed
  IF OLD.region_state IS DISTINCT FROM NEW.region_state THEN
    INSERT INTO region_state_transitions (
      region_id,
      from_state,
      to_state,
      transition_reason,
      initiated_by_user_id,
      initiated_by_role,
      metadata
    ) VALUES (
      NEW.region_id,
      OLD.region_state,
      NEW.region_state,
      'Database update',
      current_setting('app.user_id', true),
      current_setting('app.user_role', true),
      jsonb_build_object(
        'updated_at', NOW(),
        'trigger_source', 'region_update_trigger'
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for region state changes
DROP TRIGGER IF EXISTS trg_region_state_change ON regions;
CREATE TRIGGER trg_region_state_change
  AFTER UPDATE ON regions
  FOR EACH ROW
  EXECUTE FUNCTION log_region_state_change();

-- =====================================================
-- Add constraints and validation
-- =====================================================

-- Ensure expansion managers can only be assigned to prospect/pilot regions initially
ALTER TABLE user_regions 
  ADD CONSTRAINT ck_expansion_manager_region_state 
  CHECK (
    -- Non-expansion managers can be in any region state
    (user_role != 'expansion_manager') OR
    -- Expansion managers can only be assigned to prospect/pilot initially  
    (user_role = 'expansion_manager' AND region_state IN ('prospect', 'pilot'))
  );

-- =====================================================
-- Update metadata and version tracking
-- =====================================================

-- Update schema version
INSERT INTO schema_migrations (version, description, applied_at) VALUES
  ('008', 'Add expansion_manager role and region_state workflow support', NOW())
ON CONFLICT (version) DO NOTHING;

-- Log migration completion
DO $$ 
BEGIN
  RAISE NOTICE 'Migration 008 completed: expansion_manager role added with % capabilities', 
    (SELECT COUNT(*) FROM capabilities WHERE action LIKE '%region%' OR action LIKE '%expansion%');
  RAISE NOTICE 'Region state support added with % existing regions updated', 
    (SELECT COUNT(*) FROM regions WHERE region_state = 'active');
END $$;

COMMIT;