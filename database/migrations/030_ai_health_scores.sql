-- AI Health Scores - tracks health metrics across all domains and regions
CREATE TABLE ai_health_scores (
  id SERIAL PRIMARY KEY,
  domain TEXT NOT NULL CHECK (domain IN ('pricing','surge','regional','risk')),
  region_id INT REFERENCES regions(id),
  profile_id INT, -- optional: pricing profile id
  score NUMERIC(5,2) NOT NULL CHECK (score >= 0 AND score <= 100),
  components JSONB,                        -- breakdown drivers e.g., {"seasonality":0.4,"weather":0.2}
  computed_at TIMESTAMP NOT NULL DEFAULT now(),
  
  UNIQUE (domain, COALESCE(region_id, -1), COALESCE(profile_id, -1))
);

-- Indexes for performance
CREATE INDEX ai_health_domain_idx ON ai_health_scores(domain, computed_at DESC);
CREATE INDEX ai_health_region_idx ON ai_health_scores(region_id) WHERE region_id IS NOT NULL;
CREATE INDEX ai_health_score_idx ON ai_health_scores(score DESC);

-- Comments for clarity
COMMENT ON TABLE ai_health_scores IS 'AI health metrics across pricing, surge, regional, and risk domains';
COMMENT ON COLUMN ai_health_scores.domain IS 'Domain: pricing, surge, regional, or risk';
COMMENT ON COLUMN ai_health_scores.components IS 'JSON breakdown of health score components';
COMMENT ON COLUMN ai_health_scores.score IS 'Health score from 0-100';