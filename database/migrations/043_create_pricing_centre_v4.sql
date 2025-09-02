-- Pricing Centre v4.0 - World-Standard + Surge Integrated
-- Complete overhaul of pricing system with AI/ML, governance, and compliance

-- Enhanced pricing profiles with AI/ML integration and regulator compliance
CREATE TABLE IF NOT EXISTS pricing_profiles_v4 (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  region_id TEXT NOT NULL,
  service_key TEXT NOT NULL CHECK (service_key IN ('tnvs','taxi','special','pop','twg')),
  name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('draft','filed','active','retired')) DEFAULT 'draft',
  
  -- Regulator compliance fields
  regulator_status TEXT CHECK (regulator_status IN ('draft','filed','approved','rejected')),
  regulator_ref TEXT,
  regulator_filed_at TEXT,
  regulator_approved_at TEXT,
  regulator_expires_at TEXT,
  
  -- Core pricing components
  base_fare REAL NOT NULL DEFAULT 0,
  base_included_km REAL DEFAULT 0,
  per_km REAL NOT NULL DEFAULT 0,
  per_minute REAL DEFAULT 0,
  booking_fee REAL DEFAULT 0,
  
  -- Surcharges and additional fees
  airport_surcharge REAL DEFAULT 0,
  poi_surcharge REAL DEFAULT 0,
  toll_passthrough INTEGER DEFAULT 1, -- boolean as integer
  
  -- Rider-facing descriptions with publish toggles
  description TEXT, -- JSON stored as TEXT
  
  -- Earnings routing configuration
  earnings_routing TEXT CHECK (earnings_routing IN ('driver','fleet','xpress')) DEFAULT 'driver',
  driver_commission_pct REAL DEFAULT 0.8,
  fleet_commission_pct REAL DEFAULT 0,
  
  -- AI/ML fields
  ai_health_score REAL DEFAULT 0,
  ai_last_forecast TEXT, -- JSON stored as TEXT
  ai_last_recommendations TEXT, -- JSON stored as TEXT
  ai_elasticity_coefficient REAL,
  
  -- Metadata
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  created_by TEXT, -- UUID as TEXT in SQLite
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_by TEXT,
  
  FOREIGN KEY (region_id) REFERENCES regions(region_id) ON DELETE CASCADE
);

-- Proposal workflow system for pricing changes
CREATE TABLE IF NOT EXISTS pricing_proposals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  profile_id INTEGER NOT NULL,
  proposed_by TEXT NOT NULL, -- UUID as TEXT
  
  -- Proposal details
  title TEXT NOT NULL,
  description TEXT,
  diff TEXT NOT NULL, -- JSON diff of changes
  
  -- Compliance and validation
  compliance_result TEXT, -- JSON validation results
  regulator_required INTEGER DEFAULT 0, -- boolean
  regulator_filed INTEGER DEFAULT 0, -- boolean
  
  -- Workflow status
  status TEXT CHECK (status IN ('pending','approved','rejected','cancelled')) DEFAULT 'pending',
  needs_approvals INTEGER DEFAULT 2,
  current_approvals INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  approved_by TEXT, -- UUID of final approver
  approved_at TEXT,
  effective_at TEXT,
  
  FOREIGN KEY (profile_id) REFERENCES pricing_profiles_v4(id) ON DELETE CASCADE
);

-- AI/ML forecasting results
CREATE TABLE IF NOT EXISTS pricing_forecasts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  profile_id INTEGER NOT NULL,
  
  -- Forecast parameters
  horizon_days INTEGER NOT NULL CHECK (horizon_days IN (30, 60, 90)),
  metric_key TEXT NOT NULL CHECK (metric_key IN ('trips','revenue','roi','demand_elasticity')),
  
  -- Forecast results
  baseline_value REAL NOT NULL,
  predicted_value REAL NOT NULL,
  confidence REAL CHECK (confidence >= 0 AND confidence <= 1),
  
  -- Supporting data
  model_version TEXT DEFAULT 'v1.0',
  input_features TEXT, -- JSON of features used
  
  generated_at TEXT NOT NULL DEFAULT (datetime('now')),
  
  FOREIGN KEY (profile_id) REFERENCES pricing_profiles_v4(id) ON DELETE CASCADE
);

-- AI recommendations engine
CREATE TABLE IF NOT EXISTS pricing_recommendations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  profile_id INTEGER NOT NULL,
  
  -- Recommendation details
  recommendation_type TEXT NOT NULL CHECK (recommendation_type IN ('increase_fare','decrease_fare','adjust_structure','surge_optimize','compliance_warning')),
  message TEXT NOT NULL,
  details TEXT, -- JSON with specific recommendations
  
  -- AI confidence and flags
  confidence REAL CHECK (confidence >= 0 AND confidence <= 1),
  compliance_flag INTEGER DEFAULT 0, -- boolean
  regulator_impact INTEGER DEFAULT 0, -- boolean - requires regulator filing
  
  -- Status and actions
  status TEXT CHECK (status IN ('pending','accepted','rejected','superseded')) DEFAULT 'pending',
  
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  actioned_by TEXT, -- UUID of user who acted
  actioned_at TEXT,
  
  FOREIGN KEY (profile_id) REFERENCES pricing_profiles_v4(id) ON DELETE CASCADE
);

-- Enhanced audit system for all pricing changes
CREATE TABLE IF NOT EXISTS pricing_audit_v4 (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  profile_id INTEGER,
  proposal_id INTEGER,
  
  -- User and action details
  user_id TEXT NOT NULL, -- UUID as TEXT
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('profile','proposal','forecast','recommendation','surge')),
  entity_id INTEGER,
  
  -- Change tracking
  old_value TEXT, -- JSON of old state
  new_value TEXT, -- JSON of new state
  
  -- Compliance and regulator tracking
  compliance_impact INTEGER DEFAULT 0, -- boolean
  regulator_notification_sent INTEGER DEFAULT 0, -- boolean
  
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  
  FOREIGN KEY (profile_id) REFERENCES pricing_profiles_v4(id) ON DELETE SET NULL,
  FOREIGN KEY (proposal_id) REFERENCES pricing_proposals(id) ON DELETE SET NULL
);

-- Regulator filing tracking
CREATE TABLE IF NOT EXISTS pricing_regulator_filings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  profile_id INTEGER NOT NULL,
  
  -- Filing details
  regulator_type TEXT NOT NULL CHECK (regulator_type IN ('LTFRB','TWG')),
  filing_reference TEXT NOT NULL,
  filing_date TEXT NOT NULL,
  
  -- Filing content
  filing_package TEXT NOT NULL, -- JSON export package
  approval_status TEXT CHECK (approval_status IN ('submitted','under_review','approved','rejected')) DEFAULT 'submitted',
  
  -- Response tracking
  regulator_response TEXT, -- JSON response from regulator
  approved_at TEXT,
  expires_at TEXT,
  
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  created_by TEXT NOT NULL, -- UUID
  
  FOREIGN KEY (profile_id) REFERENCES pricing_profiles_v4(id) ON DELETE CASCADE
);

-- Proposal approvals tracking
CREATE TABLE IF NOT EXISTS pricing_proposal_approvals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  proposal_id INTEGER NOT NULL,
  
  -- Approver details
  approver_id TEXT NOT NULL, -- UUID
  approver_role TEXT NOT NULL,
  
  -- Approval details
  decision TEXT NOT NULL CHECK (decision IN ('approved','rejected')),
  comment TEXT,
  approval_level INTEGER NOT NULL, -- 1st approval, 2nd approval, etc.
  
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  
  FOREIGN KEY (proposal_id) REFERENCES pricing_proposals(id) ON DELETE CASCADE
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS pricing_profiles_v4_service_status_idx 
  ON pricing_profiles_v4(service_key, status);

CREATE INDEX IF NOT EXISTS pricing_profiles_v4_region_service_idx 
  ON pricing_profiles_v4(region_id, service_key);

CREATE INDEX IF NOT EXISTS pricing_proposals_status_idx 
  ON pricing_proposals(status, created_at DESC);

CREATE INDEX IF NOT EXISTS pricing_forecasts_profile_metric_idx 
  ON pricing_forecasts(profile_id, metric_key, horizon_days);

CREATE INDEX IF NOT EXISTS pricing_recommendations_profile_status_idx 
  ON pricing_recommendations(profile_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS pricing_audit_v4_profile_created_idx 
  ON pricing_audit_v4(profile_id, created_at DESC);

CREATE INDEX IF NOT EXISTS pricing_regulator_filings_profile_idx 
  ON pricing_regulator_filings(profile_id, regulator_type);