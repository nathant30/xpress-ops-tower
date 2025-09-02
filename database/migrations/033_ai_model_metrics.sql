-- AI Model Metrics - tracks ML model performance and health over time
CREATE TABLE ai_model_metrics (
  id SERIAL PRIMARY KEY,
  model_name TEXT NOT NULL,
  model_version TEXT NOT NULL,
  metric_key TEXT NOT NULL,            -- 'mape','rmse','accept_rate','drift_ks'
  metric_value NUMERIC(12,6) NOT NULL,
  window TEXT NOT NULL CHECK (window IN ('1d','7d','30d','90d')),
  computed_at TIMESTAMP NOT NULL DEFAULT now(),
  
  -- Metadata
  region_id INT REFERENCES regions(id),  -- metric scope (null = global)
  domain TEXT CHECK (domain IN ('pricing','surge','regional','risk')),
  
  UNIQUE (model_name, model_version, metric_key, window, COALESCE(region_id, -1), computed_at)
);

-- Performance indexes
CREATE INDEX ai_model_metrics_model_idx ON ai_model_metrics(model_name, model_version, computed_at DESC);
CREATE INDEX ai_model_metrics_key_idx ON ai_model_metrics(metric_key, computed_at DESC);
CREATE INDEX ai_model_metrics_domain_idx ON ai_model_metrics(domain, computed_at DESC) WHERE domain IS NOT NULL;

-- Model drift alerts view
CREATE VIEW ai_model_drift_alerts AS
SELECT 
  model_name,
  model_version,
  metric_key,
  metric_value,
  computed_at,
  CASE 
    WHEN metric_key = 'drift_ks' AND metric_value > 0.2 THEN 'critical'
    WHEN metric_key = 'drift_ks' AND metric_value > 0.1 THEN 'warning'
    WHEN metric_key = 'mape' AND metric_value > 0.15 THEN 'critical'
    WHEN metric_key = 'mape' AND metric_value > 0.10 THEN 'warning'
    ELSE 'normal'
  END as alert_level
FROM ai_model_metrics 
WHERE computed_at > now() - interval '7 days'
AND metric_key IN ('drift_ks', 'mape', 'rmse');

-- Comments
COMMENT ON TABLE ai_model_metrics IS 'ML model performance metrics and monitoring data';
COMMENT ON COLUMN ai_model_metrics.metric_key IS 'Performance metric: mape, rmse, accept_rate, drift_ks, etc.';
COMMENT ON COLUMN ai_model_metrics.window IS 'Time window for metric calculation';
COMMENT ON VIEW ai_model_drift_alerts IS 'Automated alerts for model drift and performance degradation';