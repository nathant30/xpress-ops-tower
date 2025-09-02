-- Regional AI/ML Recommendation Engine
-- PRD v4.0 Implementation

-- Add AI columns to existing regions table
ALTER TABLE regions
ADD COLUMN ai_health_score NUMERIC(5,2) CHECK (ai_health_score >= 0 AND ai_health_score <= 100),
ADD COLUMN ai_last_forecast JSONB,          -- cached forecast outputs
ADD COLUMN ai_last_recommendations JSONB,   -- cached ranked recommendations
ADD COLUMN tier SMALLINT NOT NULL DEFAULT 3 CHECK (tier IN (1,2,3)), -- Tier 1 (Core Metro), 2 (Tourist/Growth), 3 (Peripheral/Pilot)
ADD COLUMN lifecycle_stage TEXT NOT NULL DEFAULT 'draft' CHECK (lifecycle_stage IN ('draft','pilot','active','paused','retired')),
ADD COLUMN market_maturity TEXT NOT NULL DEFAULT 'emerging' CHECK (market_maturity IN ('emerging','growth','mature','declining')),
ADD COLUMN population INTEGER,
ADD COLUMN gdp_per_capita INTEGER,
ADD COLUMN smartphone_penetration NUMERIC(3,2) CHECK (smartphone_penetration >= 0 AND smartphone_penetration <= 1),
ADD COLUMN internet_coverage NUMERIC(3,2) CHECK (internet_coverage >= 0 AND internet_coverage <= 1),
ADD COLUMN profit_center_id TEXT UNIQUE, -- P&L tracking
ADD COLUMN expansion_budget BIGINT DEFAULT 0,
ADD COLUMN next_review_date DATE,
ADD COLUMN risk_factors JSONB DEFAULT '[]'::jsonb,
ADD COLUMN competitive_landscape JSONB DEFAULT '{}'::jsonb,
ADD COLUMN regulatory_status JSONB DEFAULT '{}'::jsonb;

-- Region Benchmarks - Compare regions against tier peers
CREATE TABLE region_benchmarks (
  id SERIAL PRIMARY KEY,
  region_id INTEGER NOT NULL REFERENCES regions(id) ON DELETE CASCADE,
  tier SMALLINT NOT NULL CHECK (tier IN (1,2,3)),
  metric_key TEXT NOT NULL CHECK (metric_key IN ('trips_per_day','revenue_per_trip','roi','cph','market_share','nps_score','operational_efficiency','fraud_rate')),
  value NUMERIC(12,4) NOT NULL,
  benchmark_value NUMERIC(12,4), -- peer average for same tier
  comparison NUMERIC(12,4),       -- percentage difference from benchmark
  percentile SMALLINT CHECK (percentile >= 0 AND percentile <= 100), -- ranking within tier
  computed_at TIMESTAMP DEFAULT now(),
  valid_until TIMESTAMP DEFAULT now() + INTERVAL '24 hours',
  
  -- Indexes for fast querying
  UNIQUE(region_id, metric_key, computed_at),
  INDEX idx_benchmarks_tier_metric (tier, metric_key),
  INDEX idx_benchmarks_computed (computed_at DESC)
);

-- Region Forecasts - AI predictions for growth, revenue, ROI
CREATE TABLE region_forecasts (
  id SERIAL PRIMARY KEY,
  region_id INTEGER NOT NULL REFERENCES regions(id) ON DELETE CASCADE,
  horizon_days SMALLINT NOT NULL CHECK (horizon_days IN (30, 60, 90, 180, 365)),
  metric_key TEXT NOT NULL CHECK (metric_key IN ('trips','revenue','roi','market_share','driver_supply','user_growth','profitability')),
  predicted_value NUMERIC(12,2) NOT NULL,
  confidence NUMERIC(5,2) NOT NULL CHECK (confidence >= 0 AND confidence <= 1), -- 0-1 confidence score
  baseline_value NUMERIC(12,2), -- current value for comparison
  growth_rate NUMERIC(5,4),     -- predicted growth rate
  seasonality_factor NUMERIC(5,2) DEFAULT 1.0, -- seasonal adjustment
  external_factors JSONB DEFAULT '[]'::jsonb,  -- weather, events, economic indicators
  model_version TEXT NOT NULL DEFAULT 'v1.0',
  generated_at TIMESTAMP DEFAULT now(),
  expires_at TIMESTAMP DEFAULT now() + INTERVAL '7 days',
  
  -- Feature importance for explainability
  feature_importance JSONB DEFAULT '{}'::jsonb, -- {"seasonality":0.4,"weather":0.3,"supply":0.2}
  
  -- Indexes
  UNIQUE(region_id, horizon_days, metric_key, generated_at),
  INDEX idx_forecasts_horizon (horizon_days, generated_at DESC),
  INDEX idx_forecasts_expires (expires_at)
);

-- Region Recommendations - AI-driven actionable insights
CREATE TABLE region_recommendations (
  id SERIAL PRIMARY KEY,
  region_id INTEGER NOT NULL REFERENCES regions(id) ON DELETE CASCADE,
  recommendation_type TEXT NOT NULL CHECK (recommendation_type IN (
    'service_mix',           -- suggest enabling/disabling services
    'pricing',              -- propose pricing profile changes
    'tier_upgrade',         -- suggest tier promotion/demotion
    'tier_downgrade',
    'financial_efficiency', -- cost optimization suggestions
    'compliance_risk',      -- flag upcoming permit expiries
    'growth_opportunity',   -- expansion suggestions
    'risk_mitigation',      -- fraud/operational risk alerts
    'resource_allocation',  -- staffing/budget optimization
    'market_entry',        -- new market opportunities
    'service_optimization' -- improve existing service performance
  )),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low','medium','high','critical')),
  
  -- Core recommendation content
  title TEXT NOT NULL, -- Short title for the recommendation
  message TEXT NOT NULL, -- Human-readable recommendation
  details JSONB NOT NULL DEFAULT '{}'::jsonb, -- Structured payload with specific actions
  
  -- AI scoring and confidence
  confidence NUMERIC(5,2) CHECK (confidence >= 0 AND confidence <= 1), -- AI confidence 0-1
  impact_score NUMERIC(5,2) DEFAULT 0, -- Expected business impact 0-100
  effort_score NUMERIC(5,2) DEFAULT 0, -- Implementation effort 0-100 (lower = easier)
  roi_projection NUMERIC(8,2),         -- Expected ROI multiplier
  
  -- Explainability - why this recommendation was made
  explainability JSONB DEFAULT '{}'::jsonb, -- Feature importance, reasoning
  supporting_data JSONB DEFAULT '{}'::jsonb, -- Data points that led to this rec
  
  -- Lifecycle management
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','under_review','accepted','rejected','implemented','superseded','expired')),
  created_at TIMESTAMP DEFAULT now(),
  expires_at TIMESTAMP DEFAULT now() + INTERVAL '30 days', -- recommendations expire if not acted upon
  
  -- Governance and tracking
  assigned_to UUID REFERENCES users(id), -- who should action this
  actioned_by UUID REFERENCES users(id), -- who made the decision
  actioned_at TIMESTAMP,
  implementation_deadline DATE,
  justification TEXT, -- reason for accept/reject decision
  
  -- Results tracking (for feedback loop)
  implemented_at TIMESTAMP,
  actual_impact NUMERIC(8,2), -- measured impact post-implementation
  success_metrics JSONB DEFAULT '{}'::jsonb,
  
  -- Indexes
  INDEX idx_recommendations_region_status (region_id, status),
  INDEX idx_recommendations_type_priority (recommendation_type, priority),
  INDEX idx_recommendations_created (created_at DESC),
  INDEX idx_recommendations_expires (expires_at),
  INDEX idx_recommendations_assigned (assigned_to, status) WHERE assigned_to IS NOT NULL
);

-- Region AI Training Data - Store outcomes for ML model improvement
CREATE TABLE region_ai_training_data (
  id SERIAL PRIMARY KEY,
  region_id INTEGER NOT NULL REFERENCES regions(id) ON DELETE CASCADE,
  recommendation_id INTEGER REFERENCES region_recommendations(id) ON DELETE CASCADE,
  forecast_id INTEGER REFERENCES region_forecasts(id) ON DELETE CASCADE,
  
  -- Training sample data
  feature_vector JSONB NOT NULL, -- input features that led to prediction/recommendation
  predicted_outcome NUMERIC(12,4), -- what AI predicted
  actual_outcome NUMERIC(12,4),    -- what actually happened
  accuracy_score NUMERIC(5,4),     -- how accurate was the prediction
  
  -- Context
  model_version TEXT NOT NULL,
  prediction_date TIMESTAMP NOT NULL,
  outcome_date TIMESTAMP NOT NULL,
  data_quality_score NUMERIC(3,2) DEFAULT 1.0, -- confidence in the training data
  
  created_at TIMESTAMP DEFAULT now(),
  
  -- Indexes for ML training queries
  INDEX idx_training_region_model (region_id, model_version),
  INDEX idx_training_accuracy (accuracy_score DESC),
  INDEX idx_training_dates (prediction_date, outcome_date)
);

-- Region Service Mix - Track which services are enabled per region
CREATE TABLE region_services (
  id SERIAL PRIMARY KEY,
  region_id INTEGER NOT NULL REFERENCES regions(id) ON DELETE CASCADE,
  service_code TEXT NOT NULL, -- rides, food_delivery, logistics, etc.
  service_name TEXT NOT NULL,
  local_alias TEXT,           -- regional branding (e.g., "Xpress Shuttle Boracay")
  
  -- Service status and configuration
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  launch_date DATE,
  pause_date DATE,
  retirement_date DATE,
  
  -- Performance metrics
  daily_volume INTEGER DEFAULT 0,
  monthly_revenue BIGINT DEFAULT 0,
  market_penetration NUMERIC(5,2) DEFAULT 0, -- 0-1
  nps_score SMALLINT CHECK (nps_score >= -100 AND nps_score <= 100),
  
  -- AI insights
  ai_growth_potential NUMERIC(5,2) DEFAULT 0, -- 0-1 score
  ai_recommendation_score NUMERIC(5,2) DEFAULT 0, -- how strongly AI recommends this service
  competitive_advantage NUMERIC(5,2) DEFAULT 0, -- 0-1 competitive strength
  
  -- Governance
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  
  -- Constraints
  UNIQUE(region_id, service_code),
  INDEX idx_region_services_enabled (region_id, is_enabled),
  INDEX idx_region_services_performance (monthly_revenue DESC, daily_volume DESC)
);

-- Region Pricing Profiles - Link regions to central pricing configurations
CREATE TABLE region_pricing_profiles (
  id SERIAL PRIMARY KEY,
  region_id INTEGER NOT NULL REFERENCES regions(id) ON DELETE CASCADE,
  service_code TEXT NOT NULL,
  pricing_profile_id TEXT NOT NULL, -- references central pricing system
  
  -- Profile details
  profile_name TEXT NOT NULL,
  base_fare NUMERIC(8,2),
  per_km_rate NUMERIC(6,2),
  per_minute_rate NUMERIC(6,2),
  surge_multiplier_cap NUMERIC(4,2) DEFAULT 3.0,
  
  -- Governance - pricing changes require approval
  proposed_by UUID REFERENCES users(id),
  approved_by UUID REFERENCES users(id),
  compliance_validated BOOLEAN DEFAULT false,
  
  -- Lifecycle
  effective_from TIMESTAMP NOT NULL DEFAULT now(),
  effective_until TIMESTAMP,
  is_active BOOLEAN NOT NULL DEFAULT true,
  
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  
  -- Constraints
  INDEX idx_pricing_region_service (region_id, service_code, is_active),
  INDEX idx_pricing_effective (effective_from, effective_until)
);

-- Region Compliance Artifacts - Track regulatory documents and expiries
CREATE TABLE region_compliance_artifacts (
  id SERIAL PRIMARY KEY,
  region_id INTEGER NOT NULL REFERENCES regions(id) ON DELETE CASCADE,
  
  -- Artifact details
  artifact_type TEXT NOT NULL, -- permit, license, certificate, registration
  artifact_name TEXT NOT NULL,
  issuing_authority TEXT NOT NULL,
  document_number TEXT,
  
  -- Lifecycle
  issue_date DATE NOT NULL,
  expiry_date DATE NOT NULL,
  renewal_window_days INTEGER DEFAULT 30, -- start alerting X days before expiry
  
  -- Status tracking
  status TEXT NOT NULL DEFAULT 'valid' CHECK (status IN ('valid','expiring_soon','expired','pending_renewal','suspended')),
  auto_block_on_expiry BOOLEAN DEFAULT true, -- automatically pause services if expired
  
  -- Document management
  document_url TEXT, -- link to stored document
  document_hash TEXT, -- for integrity verification
  
  -- AI risk assessment
  business_impact_score NUMERIC(3,2) DEFAULT 1.0, -- 0-1 score for service disruption risk
  affected_services JSONB DEFAULT '[]'::jsonb,    -- which services would be impacted
  
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  
  -- Indexes
  INDEX idx_compliance_region_status (region_id, status),
  INDEX idx_compliance_expiry (expiry_date),
  INDEX idx_compliance_type (artifact_type)
);

-- Region Financial Metrics - P&L tracking for profit centers
CREATE TABLE region_financials (
  id SERIAL PRIMARY KEY,
  region_id INTEGER NOT NULL REFERENCES regions(id) ON DELETE CASCADE,
  
  -- Time period
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  period_type TEXT NOT NULL DEFAULT 'monthly' CHECK (period_type IN ('daily','weekly','monthly','quarterly','yearly')),
  
  -- Revenue streams
  gross_revenue BIGINT NOT NULL DEFAULT 0,
  net_revenue BIGINT NOT NULL DEFAULT 0, -- after refunds, cancellations
  commission_revenue BIGINT DEFAULT 0,
  surge_revenue BIGINT DEFAULT 0,
  subscription_revenue BIGINT DEFAULT 0,
  
  -- Direct costs
  driver_incentives BIGINT DEFAULT 0,
  fuel_subsidies BIGINT DEFAULT 0,
  marketing_spend BIGINT DEFAULT 0,
  local_operations_cost BIGINT DEFAULT 0,
  regulatory_fees BIGINT DEFAULT 0,
  
  -- Allocated shared costs (pro-rata from central services)
  technology_allocation BIGINT DEFAULT 0,
  support_allocation BIGINT DEFAULT 0,
  overhead_allocation BIGINT DEFAULT 0,
  
  -- Calculated metrics
  gross_profit BIGINT GENERATED ALWAYS AS (gross_revenue - driver_incentives - fuel_subsidies - marketing_spend - local_operations_cost - regulatory_fees) STORED,
  net_profit BIGINT GENERATED ALWAYS AS (net_revenue - driver_incentives - fuel_subsidies - marketing_spend - local_operations_cost - regulatory_fees - technology_allocation - support_allocation - overhead_allocation) STORED,
  
  -- Operational metrics
  total_trips INTEGER DEFAULT 0,
  total_active_drivers INTEGER DEFAULT 0,
  total_active_users INTEGER DEFAULT 0,
  
  -- Efficiency ratios (generated)
  revenue_per_trip NUMERIC(8,2) GENERATED ALWAYS AS (CASE WHEN total_trips > 0 THEN net_revenue::NUMERIC / total_trips ELSE 0 END) STORED,
  cost_per_trip NUMERIC(8,2) GENERATED ALWAYS AS (CASE WHEN total_trips > 0 THEN (driver_incentives + fuel_subsidies + marketing_spend + local_operations_cost)::NUMERIC / total_trips ELSE 0 END) STORED,
  profit_margin NUMERIC(5,4) GENERATED ALWAYS AS (CASE WHEN gross_revenue > 0 THEN net_profit::NUMERIC / gross_revenue ELSE 0 END) STORED,
  
  created_at TIMESTAMP DEFAULT now(),
  
  -- Constraints
  UNIQUE(region_id, period_start, period_end, period_type),
  INDEX idx_financials_period (period_start, period_end),
  INDEX idx_financials_profit (net_profit DESC),
  INDEX idx_financials_region_period (region_id, period_start DESC)
);

-- Region Audit Log - Complete audit trail for all regional changes
CREATE TABLE region_audit (
  id SERIAL PRIMARY KEY,
  region_id INTEGER REFERENCES regions(id) ON DELETE SET NULL, -- keep audit even if region deleted
  recommendation_id INTEGER REFERENCES region_recommendations(id) ON DELETE SET NULL,
  
  -- Change tracking
  table_name TEXT NOT NULL, -- which table was changed
  record_id INTEGER,        -- ID of the changed record
  action_type TEXT NOT NULL CHECK (action_type IN ('create','update','delete','approve','reject','implement')),
  
  -- Change details
  field_name TEXT,          -- specific field changed
  old_value JSONB,         -- previous value
  new_value JSONB,         -- new value  
  change_reason TEXT,       -- justification
  
  -- AI involvement
  ai_recommended BOOLEAN DEFAULT false, -- was this change AI-recommended?
  ai_confidence NUMERIC(5,2),          -- AI confidence if applicable
  human_override BOOLEAN DEFAULT false, -- did human override AI suggestion?
  
  -- Governance
  changed_by UUID NOT NULL REFERENCES users(id),
  approved_by UUID REFERENCES users(id),
  approval_required BOOLEAN DEFAULT false,
  
  -- Context
  session_id TEXT,          -- group related changes
  ip_address INET,
  user_agent TEXT,
  
  created_at TIMESTAMP DEFAULT now(),
  
  -- Indexes for audit queries
  INDEX idx_audit_region (region_id, created_at DESC),
  INDEX idx_audit_user (changed_by, created_at DESC),
  INDEX idx_audit_table_action (table_name, action_type),
  INDEX idx_audit_recommendation (recommendation_id) WHERE recommendation_id IS NOT NULL
);

-- Create triggers for automatic audit logging
CREATE OR REPLACE FUNCTION region_audit_trigger()
RETURNS TRIGGER AS $$
BEGIN
    -- This will be implemented in application code for better control
    -- Trigger serves as backup/safety net
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Add audit triggers to key tables
CREATE TRIGGER region_changes_audit AFTER INSERT OR UPDATE OR DELETE ON regions
    FOR EACH ROW EXECUTE FUNCTION region_audit_trigger();

CREATE TRIGGER region_services_audit AFTER INSERT OR UPDATE OR DELETE ON region_services
    FOR EACH ROW EXECUTE FUNCTION region_audit_trigger();

CREATE TRIGGER region_recommendations_audit AFTER UPDATE ON region_recommendations
    FOR EACH ROW EXECUTE FUNCTION region_audit_trigger();

-- Create indexes for performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_regions_tier_lifecycle ON regions(tier, lifecycle_stage);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_regions_health_score ON regions(ai_health_score DESC NULLS LAST);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_regions_next_review ON regions(next_review_date) WHERE next_review_date IS NOT NULL;

-- Insert sample data for testing
INSERT INTO regions (region_code, name, tier, lifecycle_stage, market_maturity, population, gdp_per_capita, smartphone_penetration, internet_coverage, ai_health_score, profit_center_id, expansion_budget)
VALUES 
('NCR', 'Metro Manila', 1, 'active', 'mature', 13484462, 185000, 0.89, 0.95, 85.5, 'PH-NCR-001', 15000000),
('CEB', 'Cebu Metro', 2, 'active', 'growth', 2849213, 142000, 0.76, 0.88, 78.2, 'PH-CEB-001', 8500000),
('DAV', 'Davao Region', 3, 'pilot', 'emerging', 1776949, 118000, 0.68, 0.82, 65.8, 'PH-DAV-001', 4200000),
('BAG', 'Baguio-Cordillera', 3, 'draft', 'emerging', 345366, 135000, 0.71, 0.75, 45.0, 'PH-BAG-001', 2500000),
('ILO', 'Iloilo Region', 3, 'paused', 'emerging', 457626, 108000, 0.63, 0.78, 32.1, 'PH-ILO-001', 800000)
ON CONFLICT (region_code) DO UPDATE SET
tier = EXCLUDED.tier,
lifecycle_stage = EXCLUDED.lifecycle_stage,
market_maturity = EXCLUDED.market_maturity,
population = EXCLUDED.population,
gdp_per_capita = EXCLUDED.gdp_per_capita,
smartphone_penetration = EXCLUDED.smartphone_penetration,
internet_coverage = EXCLUDED.internet_coverage,
ai_health_score = EXCLUDED.ai_health_score,
profit_center_id = EXCLUDED.profit_center_id,
expansion_budget = EXCLUDED.expansion_budget;

COMMIT;