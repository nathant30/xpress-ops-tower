-- AI Scenario Runs - tracks executive scenario builder simulations
CREATE TABLE ai_scenario_runs (
  id SERIAL PRIMARY KEY,
  requested_by UUID REFERENCES users(id) NOT NULL,
  region_id INT REFERENCES regions(id) NOT NULL,
  profile_id INT,                -- pricing profile in scope if any
  surge_profile_id INT,          -- optional surge profile reference
  inputs JSONB NOT NULL,         -- {pricingDiff, surgeCurveRef, timeWindow}
  outputs JSONB,                 -- forecasts, ROI deltas, supply/demand charts
  compliance_result JSONB,       -- validator findings
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running','completed','failed','cancelled')),
  error_message TEXT,            -- if status = 'failed'
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  completed_at TIMESTAMP,
  
  -- Constraints
  CHECK (
    (status = 'running' AND completed_at IS NULL AND outputs IS NULL) OR
    (status = 'completed' AND completed_at IS NOT NULL AND outputs IS NOT NULL) OR
    (status = 'failed' AND completed_at IS NOT NULL AND error_message IS NOT NULL) OR
    (status = 'cancelled' AND completed_at IS NOT NULL)
  )
);

-- Performance indexes
CREATE INDEX ai_scenario_region_idx ON ai_scenario_runs(region_id, created_at DESC);
CREATE INDEX ai_scenario_user_idx ON ai_scenario_runs(requested_by, created_at DESC);
CREATE INDEX ai_scenario_status_idx ON ai_scenario_runs(status, created_at DESC);

-- Comments
COMMENT ON TABLE ai_scenario_runs IS 'Executive scenario builder simulation runs';
COMMENT ON COLUMN ai_scenario_runs.inputs IS 'Scenario parameters: pricing changes, surge curves, time windows';
COMMENT ON COLUMN ai_scenario_runs.outputs IS 'Simulation results: KPI forecasts, impact analysis, charts';
COMMENT ON COLUMN ai_scenario_runs.compliance_result IS 'Regulatory compliance validation results';