-- AI Recommendations - core table for all ML-generated recommendations across domains
CREATE TABLE ai_recommendations (
  id SERIAL PRIMARY KEY,
  domain TEXT NOT NULL CHECK (domain IN ('pricing','surge','regional','risk')),
  region_id INT REFERENCES regions(id),
  profile_id INT,                           -- e.g., pricing_profiles.id when domain='pricing'
  service_key TEXT CHECK (service_key IN ('tnvs','taxi','special','pop','twg')),
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  details JSONB,                            -- structured payload (diffs, targets)
  confidence NUMERIC(4,2) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  risk_level TEXT NOT NULL CHECK (risk_level IN ('low','medium','high')),
  compliance_flag BOOLEAN NOT NULL DEFAULT FALSE,
  status TEXT NOT NULL CHECK (status IN ('generated','proposed','approved','rejected','superseded')),
  created_by_model TEXT NOT NULL,           -- model name/version
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  proposed_by UUID REFERENCES users(id),    -- set when manager proposes
  proposed_at TIMESTAMP,
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMP,
  rejection_reason TEXT,
  
  -- Audit fields
  created_by UUID REFERENCES users(id),
  updated_at TIMESTAMP DEFAULT now(),
  
  -- Constraints
  CHECK (
    (status = 'generated' AND proposed_by IS NULL AND proposed_at IS NULL) OR
    (status IN ('proposed', 'approved', 'rejected') AND proposed_by IS NOT NULL AND proposed_at IS NOT NULL)
  ),
  CHECK (
    (status IN ('generated', 'proposed', 'superseded') AND approved_by IS NULL) OR
    (status IN ('approved', 'rejected') AND approved_by IS NOT NULL AND approved_at IS NOT NULL)
  ),
  CHECK (
    (status != 'rejected' AND rejection_reason IS NULL) OR
    (status = 'rejected' AND rejection_reason IS NOT NULL)
  )
);

-- Performance indexes
CREATE INDEX ai_recommendations_domain_idx ON ai_recommendations(domain, status);
CREATE INDEX ai_recommendations_region_idx ON ai_recommendations(region_id) WHERE region_id IS NOT NULL;
CREATE INDEX ai_recommendations_status_idx ON ai_recommendations(status, created_at DESC);
CREATE INDEX ai_recommendations_risk_idx ON ai_recommendations(risk_level, confidence DESC);
CREATE INDEX ai_recommendations_proposed_idx ON ai_recommendations(proposed_by, proposed_at) WHERE proposed_by IS NOT NULL;
CREATE INDEX ai_recommendations_approved_idx ON ai_recommendations(approved_by, approved_at) WHERE approved_by IS NOT NULL;

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_ai_recommendations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_ai_recommendations_updated_at
    BEFORE UPDATE ON ai_recommendations
    FOR EACH ROW
    EXECUTE FUNCTION update_ai_recommendations_updated_at();

-- Comments
COMMENT ON TABLE ai_recommendations IS 'AI-generated recommendations across all domains with dual approval workflow';
COMMENT ON COLUMN ai_recommendations.status IS 'Workflow status: generated → proposed → approved/rejected';
COMMENT ON COLUMN ai_recommendations.compliance_flag IS 'True if recommendation requires regulatory compliance review';
COMMENT ON COLUMN ai_recommendations.details IS 'Structured recommendation payload (pricing diffs, targets, etc.)';
COMMENT ON COLUMN ai_recommendations.confidence IS 'Model confidence score 0.0-1.0';