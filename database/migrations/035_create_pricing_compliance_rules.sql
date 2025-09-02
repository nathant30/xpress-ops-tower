-- SQLite-compatible pricing compliance rules table
-- Defines validation rules for pricing profiles

CREATE TABLE IF NOT EXISTS pricing_compliance_rules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  region_id TEXT NOT NULL,
  service_key TEXT NOT NULL,
  rule_type TEXT NOT NULL,
  rule_value TEXT NOT NULL,             -- JSON as TEXT in SQLite (threshold values, config)
  severity TEXT NOT NULL DEFAULT 'warning',
  active INTEGER NOT NULL DEFAULT 1,    -- BOOLEAN as INTEGER in SQLite
  message TEXT NOT NULL,                -- Human-readable rule description
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  
  UNIQUE (region_id, service_key, rule_type),
  CHECK (service_key IN ('tnvs','taxi','special','pop')),
  CHECK (rule_type IN ('min_base_fare','max_surge_multiplier','max_per_km_rate','min_booking_fee','required_transparency','earnings_policy_required')),
  CHECK (severity IN ('warning','error'))
);

-- Insert default compliance rules for Metro Manila TNVS
INSERT OR IGNORE INTO pricing_compliance_rules 
(region_id, service_key, rule_type, rule_value, severity, message) VALUES
('MM', 'tnvs', 'min_base_fare', '{"min_amount": 40}', 'error', 'Base fare must be at least ₱40 for TNVS in Metro Manila'),
('MM', 'tnvs', 'max_surge_multiplier', '{"max_multiplier": 2.0}', 'warning', 'Surge multiplier should not exceed 2.0x during peak hours'),
('MM', 'tnvs', 'max_per_km_rate', '{"max_rate": 15}', 'warning', 'Per-kilometer rate should not exceed ₱15 for reasonable pricing'),
('MM', 'tnvs', 'min_booking_fee', '{"min_amount": 15}', 'warning', 'Booking fee should be at least ₱15 to cover operational costs'),
('MM', 'tnvs', 'required_transparency', '{"required_mode": "detailed_breakdown"}', 'error', 'TNVS profiles must use detailed breakdown transparency mode'),
('MM', 'tnvs', 'earnings_policy_required', '{"required": true}', 'error', 'TNVS profiles must have an associated earnings policy');

-- Insert default compliance rules for Metro Manila Taxi
INSERT OR IGNORE INTO pricing_compliance_rules 
(region_id, service_key, rule_type, rule_value, severity, message) VALUES
('MM', 'taxi', 'min_base_fare', '{"min_amount": 45}', 'error', 'Base fare must be at least ₱45 for taxi in Metro Manila (LTFRB regulated)'),
('MM', 'taxi', 'max_per_km_rate', '{"max_rate": 16.5}', 'error', 'Per-kilometer rate must not exceed ₱16.50 for taxi (LTFRB regulated)'),
('MM', 'taxi', 'min_booking_fee', '{"min_amount": 0}', 'warning', 'Taxi booking fee should be minimal or zero'),
('MM', 'taxi', 'required_transparency', '{"required_mode": "summary_only"}', 'warning', 'Taxi profiles typically use summary-only transparency mode'),
('MM', 'taxi', 'earnings_policy_required', '{"required": true}', 'error', 'Taxi profiles must have an associated earnings policy');

-- Indexes for performance
CREATE INDEX IF NOT EXISTS pcr_region_service_idx ON pricing_compliance_rules(region_id, service_key);
CREATE INDEX IF NOT EXISTS pcr_active_idx ON pricing_compliance_rules(active);