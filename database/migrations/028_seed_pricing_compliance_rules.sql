-- Seeds sensible, regulator-safe caps per region/service
-- SQLite compatible version using region codes

-- TNVS (applies to 4-seat and 6-seat profiles)
INSERT OR REPLACE INTO pricing_compliance_rules (region_id, service_key, key, value_numeric, notes) VALUES
  -- Surge caps (LTFRB-aligned)
  ('NCR',   'tnvs', 'max_surge_multiplier', 2.00, 'LTFRB cap for TNVS'),
  ('CAV',   'tnvs', 'max_surge_multiplier', 2.00, 'LTFRB cap for TNVS'),
  ('BORA',  'tnvs', 'max_surge_multiplier', 2.00, 'LTFRB cap for TNVS'),
  
  -- Booking fee hard cap
  ('NCR',   'tnvs', 'max_booking_fee',      69.00, 'Xpress booking fee ceiling'),
  ('CAV',   'tnvs', 'max_booking_fee',      69.00, 'Xpress booking fee ceiling'),
  ('BORA',  'tnvs', 'max_booking_fee',      69.00, 'Xpress booking fee ceiling'),
  
  -- Reasonable floors to prevent predatory pricing
  ('NCR',   'tnvs', 'min_base_fare',        35.00, 'Operational floor'),
  ('CAV',   'tnvs', 'min_base_fare',        35.00, 'Operational floor'),
  ('BORA',  'tnvs', 'min_base_fare',        35.00, 'Operational floor'),

-- TAXI (example: disable multipliers; allow modest flat surcharges only)
  ('NCR',   'taxi', 'max_surge_multiplier', 1.00, 'No surge multipliers for Taxi'),
  ('NCR',   'taxi', 'max_airport_surcharge', 100.00, 'Reasonable cap for airport fee'),

-- SPECIAL & POP (guardrails; tune per market)
  ('BORA',  'special', 'max_flat_fare',      1500.00, 'Tourism hub guardrail'),
  ('BORA',  'pop',     'max_poi_surcharge',   300.00, 'POI surcharge cap (airport/mall)'),
  ('NCR',   'pop',     'max_cross_province_base', 5000.00, 'Cross-province base guardrail');