-- Region/service caps used by validator before activation
-- SQLite compatible version

CREATE TABLE IF NOT EXISTS pricing_compliance_rules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  region_id TEXT NOT NULL, -- Region code as text
  service_key TEXT NOT NULL,                       -- 'tnvs','taxi','special','pop'
  key TEXT NOT NULL,                               -- 'max_surge_multiplier','max_booking_fee','min_base_fare', etc.
  value_numeric REAL NOT NULL,
  notes TEXT,
  
  UNIQUE (region_id, service_key, key)
);