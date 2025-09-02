-- Seed default pricing components for existing profiles
-- This creates transparent breakdown components for the profiles we already have

-- Insert components for NCR 4-Seat TNVS (profile_id = 1)
INSERT OR REPLACE INTO pricing_components (profile_id, key, value_numeric, unit, description, publish, sort_order) VALUES
  (1, 'base_fare',   45.00, 'PHP',          'Covers dispatch & first 1.5 km',  1, 1),
  (1, 'included_km', 1.5,   'KM',           'Distance included in base fare',   1, 2),
  (1, 'per_km',      12.00, 'PHP_PER_KM',   'Rate after included distance',     1, 3),
  (1, 'per_min',     2.00,  'PHP_PER_MIN',  'Applies in heavy traffic',         1, 4),
  (1, 'booking_fee', 69.00, 'PHP',          'Xpress platform fee',              1, 5);

-- Insert components for NCR 6-Seat TNVS (profile_id = 2)
INSERT OR REPLACE INTO pricing_components (profile_id, key, value_numeric, unit, description, publish, sort_order) VALUES
  (2, 'base_fare',   55.00, 'PHP',          'Covers dispatch & first 1.5 km',  1, 1),
  (2, 'included_km', 1.5,   'KM',           'Distance included in base fare',   1, 2),
  (2, 'per_km',      14.00, 'PHP_PER_KM',   'Rate after included distance',     1, 3),
  (2, 'per_min',     2.50,  'PHP_PER_MIN',  'Applies in heavy traffic',         1, 4),
  (2, 'booking_fee', 79.00, 'PHP',          'Xpress platform fee',              1, 5);

-- Insert components for NCR Taxi (profile_id = 3)
INSERT OR REPLACE INTO pricing_components (profile_id, key, value_numeric, unit, description, publish, sort_order) VALUES
  (3, 'flagdown',    40.00, 'PHP',          'LTFRB-regulated initial fare',     1, 1),
  (3, 'per_km',      13.50, 'PHP_PER_KM',   'LTFRB-regulated distance rate',    1, 2),
  (3, 'per_min',     2.00,  'PHP_PER_MIN',  'LTFRB-regulated time rate',        1, 3),
  (3, 'booking_fee', 69.00, 'PHP',          'Xpress convenience fee',           1, 4);

-- Insert components for Boracay Special (profile_id = 4)
INSERT OR REPLACE INTO pricing_components (profile_id, key, value_numeric, unit, description, publish, sort_order) VALUES
  (4, 'flat_fare',   150.00, 'PHP',         'Fixed island loop fare',           1, 1),
  (4, 'booking_fee', 50.00,  'PHP',         'Tourism booking fee',              1, 2);

-- Insert components for NAIA POP (profile_id = 5)
INSERT OR REPLACE INTO pricing_components (profile_id, key, value_numeric, unit, description, publish, sort_order) VALUES
  (5, 'base_fare',   45.00, 'PHP',          'Standard TNVS base fare',          1, 1),
  (5, 'per_km',      12.00, 'PHP_PER_KM',   'Standard TNVS rate',               1, 2),
  (5, 'airport_surcharge', 50.00, 'PHP',    'NAIA terminal access fee',         1, 3),
  (5, 'booking_fee', 69.00, 'PHP',          'Xpress platform fee',              1, 4);

-- Insert sample earnings policies
INSERT OR REPLACE INTO pricing_earnings_policies (profile_id, driver_comp_model, fare_recipient, revenue_split) VALUES
  (1, 'commission', 'driver', '{"driver_pct": 0.75, "xpress_pct": 0.25, "booking_fee_to": "xpress", "tolls_to": "driver_reimbursed"}'),
  (2, 'commission', 'driver', '{"driver_pct": 0.75, "xpress_pct": 0.25, "booking_fee_to": "xpress", "tolls_to": "driver_reimbursed"}'),
  (3, 'salaried', 'xpress', '{"driver_pct": 0.0, "xpress_pct": 1.0, "booking_fee_to": "xpress", "tolls_to": "driver_reimbursed"}'),
  (4, 'commission', 'driver', '{"driver_pct": 0.80, "xpress_pct": 0.20, "booking_fee_to": "xpress", "tolls_to": "driver_reimbursed"}'),
  (5, 'commission', 'driver', '{"driver_pct": 0.75, "xpress_pct": 0.25, "booking_fee_to": "xpress", "tolls_to": "driver_reimbursed", "surcharges": {"airport": {"to": "xpress", "pct": 1.0}}}');

-- Insert sample user roles
INSERT OR REPLACE INTO pricing_role_access (user_id, scope, role) VALUES
  ('admin-user-1', 'global', 'pricing_admin'),
  ('strategist-user-1', 'NCR', 'pricing_strategist'),
  ('editor-user-1', 'NCR', 'pricing_editor'),
  ('viewer-user-1', 'global', 'pricing_viewer');