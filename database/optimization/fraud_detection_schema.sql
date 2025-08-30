-- Optimized Database Schema for High-Performance Fraud Detection
-- Designed for Philippines ride-sharing scale with fast query performance

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "btree_gin";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "hstore";

-- Fraud Alerts table with optimized indexing
CREATE TABLE fraud_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    alert_type VARCHAR(50) NOT NULL,
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'investigating', 'resolved', 'false_positive')),
    
    -- Subject information
    subject_type VARCHAR(20) NOT NULL CHECK (subject_type IN ('rider', 'driver', 'ride', 'transaction')),
    subject_id VARCHAR(100) NOT NULL,
    
    -- Core metrics
    fraud_score INTEGER NOT NULL CHECK (fraud_score >= 0 AND fraud_score <= 100),
    confidence INTEGER NOT NULL CHECK (confidence >= 0 AND confidence <= 100),
    
    -- Alert details
    title TEXT NOT NULL,
    description TEXT,
    
    -- Financial impact
    estimated_loss DECIMAL(12,2) DEFAULT 0,
    currency VARCHAR(3) DEFAULT 'PHP',
    
    -- Geographic context (Philippines-specific)
    region VARCHAR(50),
    city VARCHAR(100),
    province VARCHAR(100),
    barangay VARCHAR(100),
    
    -- Evidence and patterns (JSON for flexibility)
    evidence JSONB,
    patterns JSONB,
    risk_factors JSONB,
    
    -- Metadata
    metadata JSONB,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMPTZ,
    
    -- Review information
    reviewed_by VARCHAR(100),
    review_notes TEXT
);

-- High-performance indexes for fraud_alerts
CREATE INDEX CONCURRENTLY idx_fraud_alerts_type_severity ON fraud_alerts (alert_type, severity);
CREATE INDEX CONCURRENTLY idx_fraud_alerts_status_created ON fraud_alerts (status, created_at DESC);
CREATE INDEX CONCURRENTLY idx_fraud_alerts_subject ON fraud_alerts (subject_type, subject_id);
CREATE INDEX CONCURRENTLY idx_fraud_alerts_score ON fraud_alerts (fraud_score DESC) WHERE status = 'active';
CREATE INDEX CONCURRENTLY idx_fraud_alerts_region_city ON fraud_alerts (region, city);
CREATE INDEX CONCURRENTLY idx_fraud_alerts_created_at ON fraud_alerts (created_at DESC);

-- GIN indexes for JSONB fields
CREATE INDEX CONCURRENTLY idx_fraud_alerts_evidence_gin ON fraud_alerts USING GIN (evidence);
CREATE INDEX CONCURRENTLY idx_fraud_alerts_patterns_gin ON fraud_alerts USING GIN (patterns);
CREATE INDEX CONCURRENTLY idx_fraud_alerts_metadata_gin ON fraud_alerts USING GIN (metadata);

-- Partial indexes for common queries
CREATE INDEX CONCURRENTLY idx_fraud_alerts_active_high ON fraud_alerts (created_at DESC) 
    WHERE status = 'active' AND severity IN ('high', 'critical');
CREATE INDEX CONCURRENTLY idx_fraud_alerts_rider_active ON fraud_alerts (subject_id, created_at DESC) 
    WHERE subject_type = 'rider' AND status = 'active';

-- User fraud scores table for fast lookups
CREATE TABLE user_fraud_scores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id VARCHAR(100) NOT NULL,
    user_type VARCHAR(20) NOT NULL CHECK (user_type IN ('rider', 'driver')),
    
    -- Current fraud metrics
    current_score INTEGER NOT NULL DEFAULT 0 CHECK (current_score >= 0 AND current_score <= 100),
    max_score INTEGER NOT NULL DEFAULT 0,
    alert_count INTEGER NOT NULL DEFAULT 0,
    
    -- Risk categories
    incentive_fraud_score INTEGER DEFAULT 0,
    gps_spoofing_score INTEGER DEFAULT 0,
    multi_account_score INTEGER DEFAULT 0,
    payment_fraud_score INTEGER DEFAULT 0,
    
    -- Geographic risk (Philippines regions)
    region VARCHAR(50),
    high_risk_areas TEXT[], -- Array of high-risk locations
    
    -- Behavioral patterns
    ride_patterns JSONB,
    device_patterns JSONB,
    network_patterns JSONB,
    
    -- Timestamps
    first_alert_at TIMESTAMPTZ,
    last_alert_at TIMESTAMPTZ,
    last_updated TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    UNIQUE(user_id, user_type)
);

-- Indexes for user_fraud_scores
CREATE INDEX CONCURRENTLY idx_user_fraud_scores_user ON user_fraud_scores (user_id, user_type);
CREATE INDEX CONCURRENTLY idx_user_fraud_scores_score ON user_fraud_scores (current_score DESC);
CREATE INDEX CONCURRENTLY idx_user_fraud_scores_updated ON user_fraud_scores (last_updated DESC);
CREATE INDEX CONCURRENTLY idx_user_fraud_scores_region ON user_fraud_scores (region, current_score DESC);

-- GIN index for behavioral patterns
CREATE INDEX CONCURRENTLY idx_user_fraud_scores_patterns ON user_fraud_scores USING GIN 
    (ride_patterns, device_patterns, network_patterns);

-- Fraud detection rules table
CREATE TABLE fraud_detection_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(200) NOT NULL,
    description TEXT,
    rule_type VARCHAR(50) NOT NULL,
    
    -- Rule configuration
    enabled BOOLEAN NOT NULL DEFAULT true,
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    threshold_score INTEGER NOT NULL CHECK (threshold_score >= 0 AND threshold_score <= 100),
    
    -- Rule conditions (JSON for flexibility)
    conditions JSONB NOT NULL,
    actions JSONB NOT NULL,
    
    -- Performance metrics
    accuracy DECIMAL(5,4) DEFAULT 0,
    false_positive_rate DECIMAL(5,4) DEFAULT 0,
    triggered_count INTEGER DEFAULT 0,
    
    -- Region specificity (Philippines)
    applicable_regions TEXT[],
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100) NOT NULL
);

-- Indexes for fraud_detection_rules
CREATE INDEX CONCURRENTLY idx_fraud_rules_type_enabled ON fraud_detection_rules (rule_type, enabled);
CREATE INDEX CONCURRENTLY idx_fraud_rules_severity ON fraud_detection_rules (severity, enabled);
CREATE INDEX CONCURRENTLY idx_fraud_rules_conditions ON fraud_detection_rules USING GIN (conditions);

-- Real-time fraud checks cache table
CREATE TABLE fraud_check_cache (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cache_key VARCHAR(200) NOT NULL UNIQUE,
    
    -- Request data
    user_id VARCHAR(100) NOT NULL,
    user_type VARCHAR(20) NOT NULL,
    event_type VARCHAR(50) NOT NULL,
    
    -- Cached result
    fraud_score INTEGER NOT NULL,
    risk_factors JSONB,
    processing_time_ms INTEGER,
    
    -- Cache metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMPTZ NOT NULL,
    hit_count INTEGER DEFAULT 0,
    
    -- Geographic context
    region VARCHAR(50)
);

-- Indexes for fraud_check_cache
CREATE INDEX CONCURRENTLY idx_fraud_cache_key ON fraud_check_cache (cache_key);
CREATE INDEX CONCURRENTLY idx_fraud_cache_user ON fraud_check_cache (user_id, user_type);
CREATE INDEX CONCURRENTLY idx_fraud_cache_expires ON fraud_check_cache (expires_at);

-- Automatic cache cleanup
CREATE INDEX CONCURRENTLY idx_fraud_cache_cleanup ON fraud_check_cache (expires_at) 
    WHERE expires_at < CURRENT_TIMESTAMP;

-- Training data table for ML models
CREATE TABLE fraud_training_data (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    batch_id VARCHAR(100) NOT NULL,
    
    -- Training record
    user_id VARCHAR(100) NOT NULL,
    user_type VARCHAR(20) NOT NULL,
    is_fraud BOOLEAN NOT NULL,
    fraud_type VARCHAR(50),
    confidence_score DECIMAL(5,4) NOT NULL,
    
    -- Features (optimized storage)
    features JSONB NOT NULL,
    context JSONB,
    
    -- Labels and metadata
    confirmed_by VARCHAR(100) NOT NULL,
    data_source VARCHAR(100),
    
    -- Timestamps
    event_timestamp TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for fraud_training_data
CREATE INDEX CONCURRENTLY idx_training_data_batch ON fraud_training_data (batch_id);
CREATE INDEX CONCURRENTLY idx_training_data_fraud ON fraud_training_data (is_fraud, fraud_type);
CREATE INDEX CONCURRENTLY idx_training_data_features ON fraud_training_data USING GIN (features);
CREATE INDEX CONCURRENTLY idx_training_data_timestamp ON fraud_training_data (event_timestamp DESC);

-- Performance monitoring table
CREATE TABLE fraud_performance_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    metric_name VARCHAR(100) NOT NULL,
    metric_type VARCHAR(50) NOT NULL, -- 'gauge', 'counter', 'histogram'
    
    -- Metric values
    value DECIMAL(15,6) NOT NULL,
    labels JSONB, -- Key-value pairs for metric labels
    
    -- Aggregation data for histograms
    bucket_data JSONB,
    
    -- Timestamp
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Retention (auto-cleanup after 30 days)
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (CURRENT_TIMESTAMP + INTERVAL '30 days')
);

-- Indexes for fraud_performance_metrics
CREATE INDEX CONCURRENTLY idx_perf_metrics_name_time ON fraud_performance_metrics (metric_name, recorded_at DESC);
CREATE INDEX CONCURRENTLY idx_perf_metrics_type ON fraud_performance_metrics (metric_type, recorded_at DESC);
CREATE INDEX CONCURRENTLY idx_perf_metrics_labels ON fraud_performance_metrics USING GIN (labels);
CREATE INDEX CONCURRENTLY idx_perf_metrics_expires ON fraud_performance_metrics (expires_at);

-- Geographic lookup table for Philippines
CREATE TABLE philippines_locations (
    id SERIAL PRIMARY KEY,
    region VARCHAR(50) NOT NULL,
    province VARCHAR(100) NOT NULL,
    city VARCHAR(100) NOT NULL,
    barangay VARCHAR(100),
    
    -- Geographic data
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    
    -- Risk profiling
    fraud_risk_level VARCHAR(20) DEFAULT 'low' CHECK (fraud_risk_level IN ('low', 'medium', 'high')),
    service_area BOOLEAN DEFAULT false,
    
    -- Metro area classification
    metro_area VARCHAR(50), -- 'Metro Manila', 'Metro Cebu', 'Metro Davao'
    
    UNIQUE(region, province, city, barangay)
);

-- Spatial index for location-based queries
CREATE INDEX CONCURRENTLY idx_philippines_locations_coords ON philippines_locations (latitude, longitude);
CREATE INDEX CONCURRENTLY idx_philippines_locations_risk ON philippines_locations (fraud_risk_level, service_area);
CREATE INDEX CONCURRENTLY idx_philippines_locations_metro ON philippines_locations (metro_area);

-- Populate with major Philippines locations
INSERT INTO philippines_locations (region, province, city, metro_area, fraud_risk_level, service_area, latitude, longitude) VALUES
('NCR', 'Metro Manila', 'Manila', 'Metro Manila', 'medium', true, 14.5995, 120.9842),
('NCR', 'Metro Manila', 'Quezon City', 'Metro Manila', 'low', true, 14.6760, 121.0437),
('NCR', 'Metro Manila', 'Makati', 'Metro Manila', 'low', true, 14.5547, 121.0244),
('Central Visayas', 'Cebu', 'Cebu City', 'Metro Cebu', 'low', true, 10.3157, 123.8854),
('Davao Region', 'Davao del Sur', 'Davao City', 'Metro Davao', 'medium', true, 7.1907, 125.4553);

-- Create materialized views for common queries
CREATE MATERIALIZED VIEW mv_daily_fraud_stats AS
SELECT 
    DATE(created_at) as alert_date,
    alert_type,
    severity,
    region,
    COUNT(*) as alert_count,
    AVG(fraud_score) as avg_fraud_score,
    SUM(estimated_loss) as total_estimated_loss
FROM fraud_alerts
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(created_at), alert_type, severity, region;

CREATE UNIQUE INDEX ON mv_daily_fraud_stats (alert_date, alert_type, severity, region);

-- Refresh materialized view daily
CREATE OR REPLACE FUNCTION refresh_fraud_stats()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_daily_fraud_stats;
END;
$$ LANGUAGE plpgsql;

-- User risk summary view
CREATE MATERIALIZED VIEW mv_user_risk_summary AS
SELECT 
    ufs.user_id,
    ufs.user_type,
    ufs.current_score,
    ufs.region,
    COUNT(fa.id) as total_alerts,
    COUNT(fa.id) FILTER (WHERE fa.severity IN ('high', 'critical')) as high_risk_alerts,
    MAX(fa.created_at) as last_alert_date,
    AVG(fa.fraud_score) as avg_alert_score
FROM user_fraud_scores ufs
LEFT JOIN fraud_alerts fa ON fa.subject_id = ufs.user_id AND fa.subject_type = ufs.user_type
GROUP BY ufs.user_id, ufs.user_type, ufs.current_score, ufs.region;

CREATE UNIQUE INDEX ON mv_user_risk_summary (user_id, user_type);

-- Functions for optimized queries
CREATE OR REPLACE FUNCTION get_user_fraud_risk(p_user_id VARCHAR, p_user_type VARCHAR)
RETURNS TABLE(
    current_score INTEGER,
    risk_level VARCHAR,
    recent_alerts INTEGER,
    last_alert_date TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ufs.current_score,
        CASE 
            WHEN ufs.current_score >= 80 THEN 'high'
            WHEN ufs.current_score >= 60 THEN 'medium'
            ELSE 'low'
        END as risk_level,
        (SELECT COUNT(*)::INTEGER 
         FROM fraud_alerts fa 
         WHERE fa.subject_id = p_user_id 
         AND fa.subject_type = p_user_type 
         AND fa.created_at >= CURRENT_TIMESTAMP - INTERVAL '7 days') as recent_alerts,
        ufs.last_alert_at as last_alert_date
    FROM user_fraud_scores ufs
    WHERE ufs.user_id = p_user_id AND ufs.user_type = p_user_type;
END;
$$ LANGUAGE plpgsql;

-- Function to update user fraud score efficiently
CREATE OR REPLACE FUNCTION update_user_fraud_score(
    p_user_id VARCHAR,
    p_user_type VARCHAR,
    p_new_score INTEGER,
    p_alert_type VARCHAR,
    p_region VARCHAR DEFAULT NULL
) RETURNS void AS $$
BEGIN
    INSERT INTO user_fraud_scores (
        user_id, user_type, current_score, max_score, alert_count, 
        region, first_alert_at, last_alert_at, last_updated
    ) VALUES (
        p_user_id, p_user_type, p_new_score, p_new_score, 1,
        p_region, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    )
    ON CONFLICT (user_id, user_type) DO UPDATE SET
        current_score = GREATEST(user_fraud_scores.current_score, p_new_score),
        max_score = GREATEST(user_fraud_scores.max_score, p_new_score),
        alert_count = user_fraud_scores.alert_count + 1,
        last_alert_at = CURRENT_TIMESTAMP,
        last_updated = CURRENT_TIMESTAMP,
        region = COALESCE(p_region, user_fraud_scores.region);
        
    -- Update specific fraud type score
    UPDATE user_fraud_scores SET
        incentive_fraud_score = CASE WHEN p_alert_type = 'rider_incentive_fraud' THEN GREATEST(incentive_fraud_score, p_new_score) ELSE incentive_fraud_score END,
        gps_spoofing_score = CASE WHEN p_alert_type = 'gps_spoofing' THEN GREATEST(gps_spoofing_score, p_new_score) ELSE gps_spoofing_score END,
        multi_account_score = CASE WHEN p_alert_type = 'multi_accounting' THEN GREATEST(multi_account_score, p_new_score) ELSE multi_account_score END,
        payment_fraud_score = CASE WHEN p_alert_type = 'payment_fraud' THEN GREATEST(payment_fraud_score, p_new_score) ELSE payment_fraud_score END
    WHERE user_id = p_user_id AND user_type = p_user_type;
END;
$$ LANGUAGE plpgsql;

-- Automatic cleanup functions
CREATE OR REPLACE FUNCTION cleanup_expired_cache()
RETURNS void AS $$
BEGIN
    DELETE FROM fraud_check_cache WHERE expires_at < CURRENT_TIMESTAMP;
    DELETE FROM fraud_performance_metrics WHERE expires_at < CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;

-- Partitioning for large tables (fraud_alerts by month)
-- This would be implemented based on actual data volume
-- CREATE TABLE fraud_alerts_y2025m01 PARTITION OF fraud_alerts
-- FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');

-- Triggers for automatic updates
CREATE OR REPLACE FUNCTION update_modified_time()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_fraud_alerts_updated
    BEFORE UPDATE ON fraud_alerts
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_time();

CREATE TRIGGER trigger_fraud_rules_updated
    BEFORE UPDATE ON fraud_detection_rules
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_time();

-- Performance monitoring
CREATE OR REPLACE FUNCTION record_query_performance(
    p_query_name VARCHAR,
    p_execution_time_ms INTEGER,
    p_rows_affected INTEGER DEFAULT NULL
) RETURNS void AS $$
BEGIN
    INSERT INTO fraud_performance_metrics (metric_name, metric_type, value, labels)
    VALUES (
        'query_performance',
        'histogram',
        p_execution_time_ms,
        jsonb_build_object(
            'query_name', p_query_name,
            'rows_affected', COALESCE(p_rows_affected, 0)
        )
    );
END;
$$ LANGUAGE plpgsql;

-- Schedule automatic maintenance
-- This would be set up as cron jobs or pg_cron extension
-- SELECT cron.schedule('cleanup-fraud-cache', '0 2 * * *', 'SELECT cleanup_expired_cache();');
-- SELECT cron.schedule('refresh-fraud-stats', '0 1 * * *', 'SELECT refresh_fraud_stats();');

-- Create indexes to support common dashboard queries
CREATE INDEX CONCURRENTLY idx_fraud_alerts_dashboard ON fraud_alerts (status, severity, created_at DESC)
    WHERE status IN ('active', 'investigating');

CREATE INDEX CONCURRENTLY idx_fraud_alerts_regional_stats ON fraud_alerts (region, alert_type, DATE(created_at))
    WHERE created_at >= CURRENT_DATE - INTERVAL '30 days';

-- Grant appropriate permissions (adjust based on your user roles)
-- GRANT SELECT, INSERT, UPDATE ON fraud_alerts TO fraud_analyst_role;
-- GRANT SELECT ON mv_daily_fraud_stats TO dashboard_role;
-- GRANT EXECUTE ON FUNCTION get_user_fraud_risk TO api_role;