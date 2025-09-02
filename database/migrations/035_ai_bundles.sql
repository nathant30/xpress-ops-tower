-- AI Bundles - Cross-domain "playbook" bundles (composite insights)
CREATE TABLE ai_bundles (
  id SERIAL PRIMARY KEY,
  region_id INT REFERENCES regions(id) NOT NULL,
  title VARCHAR(200) NOT NULL,
  summary TEXT NOT NULL,
  recommendation_ids INT[] NOT NULL,   -- array of ai_recommendations.id
  confidence NUMERIC(4,2) CHECK (confidence >= 0 AND confidence <= 1),
  risk_level TEXT CHECK (risk_level IN ('low','medium','high')),
  bundle_type TEXT NOT NULL DEFAULT 'optimization' CHECK (bundle_type IN ('optimization','expansion','recovery','compliance')),
  estimated_impact JSONB,              -- projected outcomes: {revenue: +15%, trips: +200, roi: 2.3}
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','superseded','archived')),
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  created_by UUID REFERENCES users(id),
  expires_at TIMESTAMP,                -- bundles can have expiration dates
  
  -- Validation: must reference valid recommendations
  CHECK (array_length(recommendation_ids, 1) >= 1),
  CHECK (array_length(recommendation_ids, 1) <= 10) -- reasonable limit
);

-- Performance indexes  
CREATE INDEX ai_bundles_region_idx ON ai_bundles(region_id, created_at DESC);
CREATE INDEX ai_bundles_status_idx ON ai_bundles(status, created_at DESC);
CREATE INDEX ai_bundles_type_idx ON ai_bundles(bundle_type, risk_level);
CREATE INDEX ai_bundles_expires_idx ON ai_bundles(expires_at) WHERE expires_at IS NOT NULL;

-- GIN index for recommendation IDs array searches
CREATE INDEX ai_bundles_rec_ids_idx ON ai_bundles USING gin(recommendation_ids);

-- View for bundle recommendations with details
CREATE VIEW ai_bundle_details AS
SELECT 
  b.id as bundle_id,
  b.title,
  b.summary,
  b.confidence,
  b.risk_level,
  b.bundle_type,
  b.estimated_impact,
  b.created_at,
  r.name as region_name,
  array_agg(
    json_build_object(
      'id', rec.id,
      'domain', rec.domain,
      'title', rec.title,
      'status', rec.status,
      'confidence', rec.confidence,
      'risk_level', rec.risk_level
    ) ORDER BY rec.created_at
  ) as recommendations
FROM ai_bundles b
JOIN regions r ON b.region_id = r.id
LEFT JOIN ai_recommendations rec ON rec.id = ANY(b.recommendation_ids)
WHERE b.status = 'active'
GROUP BY b.id, b.title, b.summary, b.confidence, b.risk_level, b.bundle_type, b.estimated_impact, b.created_at, r.name;

-- Function to validate recommendation IDs exist
CREATE OR REPLACE FUNCTION validate_recommendation_ids()
RETURNS TRIGGER AS $$
DECLARE
    rec_id INT;
    invalid_ids INT[] := ARRAY[]::INT[];
BEGIN
    -- Check each recommendation ID exists and is not superseded
    FOREACH rec_id IN ARRAY NEW.recommendation_ids
    LOOP
        IF NOT EXISTS (
            SELECT 1 FROM ai_recommendations 
            WHERE id = rec_id 
            AND status != 'superseded'
        ) THEN
            invalid_ids := array_append(invalid_ids, rec_id);
        END IF;
    END LOOP;
    
    IF array_length(invalid_ids, 1) > 0 THEN
        RAISE EXCEPTION 'Invalid recommendation IDs: %', array_to_string(invalid_ids, ', ');
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER validate_ai_bundle_recommendations
    BEFORE INSERT OR UPDATE ON ai_bundles
    FOR EACH ROW
    EXECUTE FUNCTION validate_recommendation_ids();

-- Comments
COMMENT ON TABLE ai_bundles IS 'Cross-domain recommendation bundles - composite AI insights combining multiple domains';
COMMENT ON COLUMN ai_bundles.recommendation_ids IS 'Array of ai_recommendations.id that compose this bundle';
COMMENT ON COLUMN ai_bundles.bundle_type IS 'Bundle category: optimization, expansion, recovery, compliance';
COMMENT ON COLUMN ai_bundles.estimated_impact IS 'Projected outcomes from implementing the bundle';
COMMENT ON VIEW ai_bundle_details IS 'Bundle overview with associated recommendation details';