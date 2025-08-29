-- =====================================================
-- COMPREHENSIVE FRAUD DETECTION SCHEMA ENHANCEMENT
-- Covers all fraud types: Payment, Identity, Behavioral, Collusion
-- =====================================================

-- Enable required extensions if not exists
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";
CREATE EXTENSION IF NOT EXISTS "btree_gin";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- =====================================================
-- ENHANCED ENUMS FOR FRAUD TYPES
-- =====================================================

-- Comprehensive fraud categories
CREATE TYPE fraud_category AS ENUM (
    'payment_fraud',
    'identity_fraud', 
    'ride_manipulation',
    'rating_fraud',
    'referral_fraud',
    'account_sharing',
    'collusion',
    'fake_requests',
    'chargeback_fraud',
    'document_fraud'
);

-- Fraud detection methods
CREATE TYPE detection_method AS ENUM (
    'ml_model',
    'behavioral_analysis',
    'device_fingerprinting',
    'location_analysis',
    'payment_gateway',
    'document_verification',
    'cross_correlation',
    'manual_review'
);

-- Verification status types
CREATE TYPE verification_status AS ENUM (
    'pending',
    'verified',
    'rejected',
    'requires_review',
    'expired',
    'fraudulent'
);

-- =====================================================
-- PASSENGER FRAUD DETECTION TABLES
-- =====================================================

-- Enhanced passenger profiles with fraud detection
CREATE TABLE passenger_fraud_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    passenger_id UUID NOT NULL, -- Reference to passengers table
    
    -- Identity verification
    identity_verification_status verification_status DEFAULT 'pending',
    identity_verification_date TIMESTAMP WITH TIME ZONE,
    document_verification JSONB DEFAULT '{}',
    biometric_verification JSONB DEFAULT '{}',
    
    -- Fraud risk scoring
    fraud_risk_score DECIMAL(5,2) DEFAULT 50.00,
    payment_risk_score DECIMAL(5,2) DEFAULT 50.00,
    behavioral_risk_score DECIMAL(5,2) DEFAULT 50.00,
    identity_risk_score DECIMAL(5,2) DEFAULT 50.00,
    
    -- Account security flags
    account_sharing_detected BOOLEAN DEFAULT FALSE,
    multiple_accounts_detected BOOLEAN DEFAULT FALSE,
    stolen_identity_suspected BOOLEAN DEFAULT FALSE,
    
    -- Behavioral patterns
    booking_patterns JSONB DEFAULT '{}',
    payment_patterns JSONB DEFAULT '{}',
    device_patterns JSONB DEFAULT '{}',
    location_patterns JSONB DEFAULT '{}',
    
    -- ML scores
    ml_confidence_score DECIMAL(5,3) DEFAULT 0.500,
    anomaly_score DECIMAL(5,3) DEFAULT 0.000,
    
    -- Investigation status
    investigation_status VARCHAR(50) DEFAULT 'none',
    last_investigation_date TIMESTAMP WITH TIME ZONE,
    
    -- Fraud flags and alerts
    active_fraud_flags JSONB DEFAULT '[]',
    resolved_fraud_flags JSONB DEFAULT '[]',
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT passenger_fraud_risk_check CHECK (fraud_risk_score >= 0 AND fraud_risk_score <= 100),
    CONSTRAINT passenger_payment_risk_check CHECK (payment_risk_score >= 0 AND payment_risk_score <= 100)
);

-- Payment fraud detection and analysis
CREATE TABLE payment_fraud_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_id VARCHAR(100) NOT NULL,
    passenger_id UUID NOT NULL,
    booking_id UUID, -- Reference to bookings
    
    -- Payment details
    payment_method VARCHAR(50) NOT NULL,
    payment_processor VARCHAR(50),
    card_fingerprint VARCHAR(100), -- Hashed card details
    amount DECIMAL(10,2) NOT NULL,
    currency CHAR(3) DEFAULT 'PHP',
    
    -- Fraud indicators
    fraud_score DECIMAL(5,2) DEFAULT 0.00,
    stolen_card_probability DECIMAL(5,3) DEFAULT 0.000,
    velocity_fraud_score DECIMAL(5,2) DEFAULT 0.00,
    
    -- Card validation
    card_validation_status verification_status DEFAULT 'pending',
    cvv_match BOOLEAN,
    avs_match BOOLEAN,
    bin_country_match BOOLEAN,
    
    -- Fraud flags
    is_chargeback BOOLEAN DEFAULT FALSE,
    is_declined BOOLEAN DEFAULT FALSE,
    is_suspicious BOOLEAN DEFAULT FALSE,
    requires_manual_review BOOLEAN DEFAULT FALSE,
    
    -- Detection details
    detection_method detection_method[],
    fraud_indicators JSONB DEFAULT '{}',
    risk_factors JSONB DEFAULT '{}',
    
    -- Geographic analysis
    transaction_location GEOMETRY(POINT, 4326),
    ip_location GEOMETRY(POINT, 4326),
    location_mismatch BOOLEAN DEFAULT FALSE,
    
    -- Timeline
    transaction_timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT payment_fraud_score_check CHECK (fraud_score >= 0 AND fraud_score <= 100)
);

-- Chargeback and dispute management
CREATE TABLE chargeback_management (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_id VARCHAR(100) NOT NULL,
    passenger_id UUID NOT NULL,
    booking_id UUID,
    
    -- Chargeback details
    chargeback_id VARCHAR(100) UNIQUE NOT NULL,
    chargeback_type VARCHAR(50) NOT NULL,
    chargeback_reason_code VARCHAR(10),
    chargeback_amount DECIMAL(10,2) NOT NULL,
    
    -- Status tracking
    status VARCHAR(50) DEFAULT 'received',
    dispute_status VARCHAR(50) DEFAULT 'pending',
    
    -- Investigation
    is_fraudulent BOOLEAN,
    investigation_notes TEXT,
    evidence_provided JSONB DEFAULT '[]',
    
    -- Outcomes
    resolution VARCHAR(50),
    recovery_amount DECIMAL(10,2) DEFAULT 0.00,
    
    -- Timeline
    chargeback_date TIMESTAMP WITH TIME ZONE NOT NULL,
    dispute_deadline TIMESTAMP WITH TIME ZONE,
    resolved_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- BEHAVIORAL ANALYTICS FOR PASSENGERS
-- =====================================================

CREATE TABLE passenger_behavioral_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    passenger_id UUID NOT NULL,
    analysis_date DATE NOT NULL,
    
    -- Booking behavior patterns
    booking_frequency_score DECIMAL(5,2) DEFAULT 100.00,
    booking_time_patterns JSONB DEFAULT '{}',
    booking_location_patterns JSONB DEFAULT '{}',
    cancellation_rate DECIMAL(5,2) DEFAULT 0.00,
    
    -- Payment behavior
    payment_method_consistency DECIMAL(5,2) DEFAULT 100.00,
    payment_velocity_score DECIMAL(5,2) DEFAULT 100.00,
    unusual_payment_locations INTEGER DEFAULT 0,
    
    -- Device and location patterns
    device_consistency_score DECIMAL(5,2) DEFAULT 100.00,
    location_consistency_score DECIMAL(5,2) DEFAULT 100.00,
    suspicious_locations INTEGER DEFAULT 0,
    
    -- Social behavior
    referral_abuse_indicators JSONB DEFAULT '{}',
    account_sharing_indicators JSONB DEFAULT '{}',
    
    -- Overall scoring
    overall_behavior_score DECIMAL(5,2) DEFAULT 100.00,
    anomaly_flags JSONB DEFAULT '[]',
    
    -- Risk assessment
    risk_level VARCHAR(20) DEFAULT 'low',
    recommended_actions JSONB DEFAULT '[]',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT passenger_behavior_score_check CHECK (overall_behavior_score >= 0 AND overall_behavior_score <= 100)
);

-- =====================================================
-- COLLUSION DETECTION SYSTEM
-- =====================================================

CREATE TABLE collusion_detection (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Participants
    driver_id UUID NOT NULL,
    passenger_id UUID NOT NULL,
    
    -- Collusion indicators
    collusion_score DECIMAL(5,2) DEFAULT 0.00,
    suspicious_ride_count INTEGER DEFAULT 0,
    fake_ride_probability DECIMAL(5,3) DEFAULT 0.000,
    
    -- Pattern analysis
    route_manipulation_score DECIMAL(5,2) DEFAULT 0.00,
    timing_pattern_score DECIMAL(5,2) DEFAULT 0.00,
    location_pattern_score DECIMAL(5,2) DEFAULT 0.00,
    payment_pattern_score DECIMAL(5,2) DEFAULT 0.00,
    
    -- Detection details
    suspicious_rides JSONB DEFAULT '[]',
    pattern_indicators JSONB DEFAULT '{}',
    correlation_factors JSONB DEFAULT '{}',
    
    -- Investigation
    investigation_status VARCHAR(50) DEFAULT 'detected',
    manual_review_required BOOLEAN DEFAULT FALSE,
    evidence_quality DECIMAL(3,2) DEFAULT 0.50,
    
    -- Timeline analysis
    first_suspicious_ride TIMESTAMP WITH TIME ZONE,
    last_suspicious_ride TIMESTAMP WITH TIME ZONE,
    pattern_duration_days INTEGER,
    
    -- Status
    status VARCHAR(50) DEFAULT 'active',
    resolved_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT collusion_score_check CHECK (collusion_score >= 0 AND collusion_score <= 100)
);

-- =====================================================
-- REFERRAL AND INCENTIVE FRAUD
-- =====================================================

CREATE TABLE referral_fraud_detection (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    user_type VARCHAR(20) NOT NULL, -- 'driver' or 'passenger'
    
    -- Referral analysis
    total_referrals INTEGER DEFAULT 0,
    suspicious_referrals INTEGER DEFAULT 0,
    fake_referrals_detected INTEGER DEFAULT 0,
    
    -- Pattern indicators
    referral_velocity_score DECIMAL(5,2) DEFAULT 100.00,
    device_diversity_score DECIMAL(5,2) DEFAULT 100.00,
    location_diversity_score DECIMAL(5,2) DEFAULT 100.00,
    
    -- Fraud indicators
    mass_registration_detected BOOLEAN DEFAULT FALSE,
    bot_activity_suspected BOOLEAN DEFAULT FALSE,
    device_farming_detected BOOLEAN DEFAULT FALSE,
    
    -- Financial impact
    fraudulent_bonuses_claimed DECIMAL(10,2) DEFAULT 0.00,
    recovered_amounts DECIMAL(10,2) DEFAULT 0.00,
    
    -- Investigation
    investigation_status VARCHAR(50) DEFAULT 'none',
    manual_review_notes TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- DOCUMENT AND IDENTITY VERIFICATION
-- =====================================================

CREATE TABLE document_verification (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    user_type VARCHAR(20) NOT NULL, -- 'driver' or 'passenger'
    document_type VARCHAR(50) NOT NULL,
    
    -- Document analysis
    document_url TEXT,
    document_hash VARCHAR(128),
    ocr_extracted_data JSONB DEFAULT '{}',
    
    -- Verification results
    verification_status verification_status DEFAULT 'pending',
    fraud_score DECIMAL(5,2) DEFAULT 0.00,
    authenticity_score DECIMAL(5,3) DEFAULT 0.500,
    
    -- Fraud indicators
    is_fake_document BOOLEAN DEFAULT FALSE,
    is_altered_document BOOLEAN DEFAULT FALSE,
    is_expired_document BOOLEAN DEFAULT FALSE,
    
    -- AI analysis
    ai_model_results JSONB DEFAULT '{}',
    manual_review_required BOOLEAN DEFAULT FALSE,
    manual_review_notes TEXT,
    
    -- Verification details
    verified_by UUID, -- User ID of verifier
    verification_date TIMESTAMP WITH TIME ZONE,
    expiry_date DATE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- DEVICE AND LOCATION FINGERPRINTING
-- =====================================================

CREATE TABLE device_fingerprinting (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    user_type VARCHAR(20) NOT NULL,
    
    -- Device identification
    device_fingerprint VARCHAR(128) NOT NULL,
    device_type VARCHAR(50),
    operating_system VARCHAR(100),
    browser_info VARCHAR(200),
    
    -- Location tracking
    ip_address INET,
    ip_location GEOMETRY(POINT, 4326),
    gps_location GEOMETRY(POINT, 4326),
    location_accuracy DECIMAL(8,2),
    
    -- Fraud indicators
    is_emulator BOOLEAN DEFAULT FALSE,
    is_rooted_jailbroken BOOLEAN DEFAULT FALSE,
    is_vpn_proxy BOOLEAN DEFAULT FALSE,
    multiple_accounts_same_device BOOLEAN DEFAULT FALSE,
    
    -- Usage patterns
    session_duration INTEGER, -- minutes
    actions_per_session INTEGER,
    unusual_activity_score DECIMAL(5,2) DEFAULT 0.00,
    
    -- Risk assessment
    device_risk_score DECIMAL(5,2) DEFAULT 50.00,
    trust_score DECIMAL(5,3) DEFAULT 0.500,
    
    -- Timestamps
    first_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    session_count INTEGER DEFAULT 1
);

-- =====================================================
-- FRAUD ALERT AND NOTIFICATION SYSTEM
-- =====================================================

CREATE TABLE fraud_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Alert classification
    alert_type fraud_category NOT NULL,
    severity VARCHAR(20) NOT NULL, -- 'low', 'medium', 'high', 'critical'
    status VARCHAR(20) DEFAULT 'active', -- 'active', 'investigating', 'resolved', 'false_positive'
    
    -- Entities involved
    driver_id UUID,
    passenger_id UUID,
    booking_id UUID,
    transaction_id VARCHAR(100),
    
    -- Alert details
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    fraud_score DECIMAL(5,2) NOT NULL,
    confidence_score DECIMAL(5,3) NOT NULL,
    
    -- Detection information
    detection_method detection_method NOT NULL,
    model_used VARCHAR(100),
    rule_triggered VARCHAR(200),
    
    -- Evidence
    evidence JSONB DEFAULT '{}',
    supporting_data JSONB DEFAULT '{}',
    
    -- Investigation
    assigned_to UUID, -- Fraud analyst user ID
    investigation_status VARCHAR(50) DEFAULT 'pending',
    investigation_notes TEXT,
    
    -- Location context
    incident_location GEOMETRY(POINT, 4326),
    location_description TEXT,
    
    -- Timeline
    detected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    resolved_at TIMESTAMP WITH TIME ZONE,
    
    -- Escalation
    escalated BOOLEAN DEFAULT FALSE,
    escalated_at TIMESTAMP WITH TIME ZONE,
    escalation_reason TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- FRAUD INVESTIGATION WORKFLOW
-- =====================================================

CREATE TABLE fraud_investigations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    case_number VARCHAR(50) UNIQUE NOT NULL,
    
    -- Case details
    investigation_type fraud_category NOT NULL,
    priority VARCHAR(20) DEFAULT 'medium',
    status VARCHAR(50) DEFAULT 'open',
    
    -- Entities under investigation
    primary_suspect_id UUID NOT NULL,
    suspect_type VARCHAR(20) NOT NULL, -- 'driver' or 'passenger'
    secondary_suspects JSONB DEFAULT '[]',
    
    -- Case information
    case_title VARCHAR(200) NOT NULL,
    case_description TEXT NOT NULL,
    suspected_fraud_amount DECIMAL(10,2) DEFAULT 0.00,
    
    -- Investigation team
    lead_investigator UUID NOT NULL,
    assigned_investigators JSONB DEFAULT '[]',
    external_agencies JSONB DEFAULT '[]',
    
    -- Evidence management
    evidence_collected JSONB DEFAULT '[]',
    digital_evidence_urls JSONB DEFAULT '[]',
    witness_statements JSONB DEFAULT '[]',
    
    -- Timeline
    case_opened TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    target_resolution_date DATE,
    case_closed TIMESTAMP WITH TIME ZONE,
    
    -- Outcomes
    investigation_outcome VARCHAR(50),
    fraud_confirmed BOOLEAN,
    recovery_amount DECIMAL(10,2) DEFAULT 0.00,
    actions_taken JSONB DEFAULT '[]',
    
    -- Legal proceedings
    legal_action_required BOOLEAN DEFAULT FALSE,
    law_enforcement_notified BOOLEAN DEFAULT FALSE,
    court_case_reference VARCHAR(100),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- PERFORMANCE INDEXES FOR FRAUD QUERIES
-- =====================================================

-- Passenger fraud indexes
CREATE INDEX idx_passenger_fraud_risk ON passenger_fraud_profiles(fraud_risk_score DESC);
CREATE INDEX idx_passenger_investigation ON passenger_fraud_profiles(investigation_status);
CREATE INDEX idx_passenger_ml_confidence ON passenger_fraud_profiles(ml_confidence_score DESC);

-- Payment fraud indexes
CREATE INDEX idx_payment_fraud_score ON payment_fraud_analytics(fraud_score DESC);
CREATE INDEX idx_payment_suspicious ON payment_fraud_analytics(is_suspicious) WHERE is_suspicious = true;
CREATE INDEX idx_payment_chargeback ON payment_fraud_analytics(is_chargeback) WHERE is_chargeback = true;
CREATE INDEX idx_payment_timestamp ON payment_fraud_analytics(transaction_timestamp DESC);

-- Collusion detection indexes
CREATE INDEX idx_collusion_score ON collusion_detection(collusion_score DESC);
CREATE INDEX idx_collusion_participants ON collusion_detection(driver_id, passenger_id);
CREATE INDEX idx_collusion_status ON collusion_detection(status) WHERE status = 'active';

-- Alert and investigation indexes
CREATE INDEX idx_fraud_alerts_severity ON fraud_alerts(severity, detected_at DESC);
CREATE INDEX idx_fraud_alerts_status ON fraud_alerts(status) WHERE status IN ('active', 'investigating');
CREATE INDEX idx_investigations_status ON fraud_investigations(status, priority);
CREATE INDEX idx_investigations_investigator ON fraud_investigations(lead_investigator);

-- Device fingerprinting indexes
CREATE INDEX idx_device_fingerprint ON device_fingerprinting(device_fingerprint);
CREATE INDEX idx_device_risk_score ON device_fingerprinting(device_risk_score DESC);
CREATE INDEX idx_device_multiple_accounts ON device_fingerprinting(multiple_accounts_same_device) WHERE multiple_accounts_same_device = true;

-- Spatial indexes for location analysis
CREATE INDEX idx_payment_transaction_location ON payment_fraud_analytics USING GIST(transaction_location);
CREATE INDEX idx_device_gps_location ON device_fingerprinting USING GIST(gps_location);

-- =====================================================
-- TRIGGERS FOR AUTOMATIC UPDATES
-- =====================================================

-- Update passenger fraud profiles when new data is available
CREATE OR REPLACE FUNCTION update_passenger_fraud_score()
RETURNS TRIGGER AS $$
BEGIN
    -- Update fraud risk score based on recent payment fraud analytics
    UPDATE passenger_fraud_profiles 
    SET 
        payment_risk_score = (
            SELECT COALESCE(AVG(fraud_score), 50.0)
            FROM payment_fraud_analytics 
            WHERE passenger_id = NEW.passenger_id 
            AND transaction_timestamp >= NOW() - INTERVAL '30 days'
        ),
        updated_at = NOW()
    WHERE passenger_id = NEW.passenger_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for payment fraud analytics
CREATE TRIGGER tr_update_passenger_fraud_on_payment
    AFTER INSERT OR UPDATE ON payment_fraud_analytics
    FOR EACH ROW
    EXECUTE FUNCTION update_passenger_fraud_score();

-- Auto-generate case numbers for investigations
CREATE OR REPLACE FUNCTION generate_case_number()
RETURNS TRIGGER AS $$
DECLARE
    case_prefix TEXT;
    next_number INTEGER;
    year_part TEXT := TO_CHAR(NOW(), 'YYYY');
BEGIN
    -- Generate prefix based on investigation type
    CASE NEW.investigation_type
        WHEN 'payment_fraud' THEN case_prefix := 'PF';
        WHEN 'identity_fraud' THEN case_prefix := 'IF';
        WHEN 'collusion' THEN case_prefix := 'CO';
        WHEN 'referral_fraud' THEN case_prefix := 'RF';
        ELSE case_prefix := 'FR';
    END CASE;
    
    -- Get next sequence number
    SELECT COALESCE(MAX(SUBSTRING(case_number, LENGTH(case_prefix || '-' || year_part || '-') + 1)::INTEGER), 0) + 1
    INTO next_number
    FROM fraud_investigations 
    WHERE case_number LIKE case_prefix || '-' || year_part || '-%';
    
    NEW.case_number := case_prefix || '-' || year_part || '-' || LPAD(next_number::TEXT, 4, '0');
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for case number generation
CREATE TRIGGER tr_generate_case_number
    BEFORE INSERT ON fraud_investigations
    FOR EACH ROW
    WHEN (NEW.case_number IS NULL OR NEW.case_number = '')
    EXECUTE FUNCTION generate_case_number();

-- =====================================================
-- VIEWS FOR COMMON FRAUD QUERIES
-- =====================================================

-- High-risk users (both drivers and passengers)
CREATE VIEW v_high_risk_users AS
SELECT 
    'driver' as user_type,
    ud.id,
    ud.first_name || ' ' || ud.last_name as full_name,
    ud.driver_code as identifier,
    ud.fraud_risk_score,
    ud.fraud_status,
    ud.company_id
FROM unified_drivers ud
WHERE ud.fraud_risk_score > 70
    AND ud.is_active = true

UNION ALL

SELECT 
    'passenger' as user_type,
    p.id, -- Assuming passengers table exists
    pfp.passenger_id::text as full_name, -- Would need actual passenger name from passengers table
    pfp.passenger_id::text as identifier,
    pfp.fraud_risk_score,
    pfp.investigation_status as fraud_status,
    NULL as company_id
FROM passenger_fraud_profiles pfp
WHERE pfp.fraud_risk_score > 70;

-- Active fraud alerts requiring attention
CREATE VIEW v_active_fraud_alerts AS
SELECT 
    fa.id,
    fa.alert_type,
    fa.severity,
    fa.title,
    fa.fraud_score,
    fa.confidence_score,
    fa.status,
    fa.detected_at,
    CASE 
        WHEN fa.driver_id IS NOT NULL THEN 
            (SELECT first_name || ' ' || last_name FROM unified_drivers WHERE id = fa.driver_id)
        WHEN fa.passenger_id IS NOT NULL THEN 
            fa.passenger_id::text -- Would need passenger name lookup
        ELSE 'Unknown'
    END as subject_name,
    CASE 
        WHEN fa.driver_id IS NOT NULL THEN 'driver'
        WHEN fa.passenger_id IS NOT NULL THEN 'passenger'
        ELSE 'unknown'
    END as subject_type
FROM fraud_alerts fa
WHERE fa.status IN ('active', 'investigating')
ORDER BY 
    CASE fa.severity 
        WHEN 'critical' THEN 1
        WHEN 'high' THEN 2
        WHEN 'medium' THEN 3
        ELSE 4
    END,
    fa.detected_at DESC;

-- Collusion cases requiring investigation
CREATE VIEW v_collusion_cases AS
SELECT 
    cd.id,
    cd.driver_id,
    cd.passenger_id,
    ud.first_name || ' ' || ud.last_name as driver_name,
    ud.driver_code,
    cd.collusion_score,
    cd.suspicious_ride_count,
    cd.investigation_status,
    cd.created_at,
    cd.manual_review_required
FROM collusion_detection cd
JOIN unified_drivers ud ON cd.driver_id = ud.id
WHERE cd.collusion_score > 60
    AND cd.status = 'active'
ORDER BY cd.collusion_score DESC;

-- =====================================================
-- FRAUD DETECTION FUNCTIONS
-- =====================================================

-- Calculate dynamic fraud risk score for passengers
CREATE OR REPLACE FUNCTION calculate_passenger_fraud_risk(p_passenger_id UUID)
RETURNS DECIMAL(5,2) AS $$
DECLARE
    payment_risk DECIMAL(5,2) := 50.0;
    behavioral_risk DECIMAL(5,2) := 50.0;
    identity_risk DECIMAL(5,2) := 50.0;
    final_score DECIMAL(5,2);
BEGIN
    -- Get recent payment fraud score
    SELECT COALESCE(AVG(fraud_score), 50.0)
    INTO payment_risk
    FROM payment_fraud_analytics 
    WHERE passenger_id = p_passenger_id 
    AND transaction_timestamp >= NOW() - INTERVAL '30 days';
    
    -- Get behavioral risk score
    SELECT COALESCE(AVG(100 - overall_behavior_score), 50.0)
    INTO behavioral_risk
    FROM passenger_behavioral_analytics 
    WHERE passenger_id = p_passenger_id 
    AND analysis_date >= CURRENT_DATE - INTERVAL '30 days';
    
    -- Get identity risk from verification status
    SELECT CASE 
        WHEN identity_verification_status = 'verified' THEN 10.0
        WHEN identity_verification_status = 'rejected' THEN 90.0
        WHEN identity_verification_status = 'fraudulent' THEN 95.0
        ELSE 50.0
    END INTO identity_risk
    FROM passenger_fraud_profiles 
    WHERE passenger_id = p_passenger_id;
    
    -- Calculate weighted final score
    final_score := (payment_risk * 0.4) + (behavioral_risk * 0.3) + (identity_risk * 0.3);
    
    -- Update passenger fraud profile
    UPDATE passenger_fraud_profiles 
    SET 
        fraud_risk_score = final_score,
        payment_risk_score = payment_risk,
        behavioral_risk_score = behavioral_risk,
        identity_risk_score = identity_risk,
        updated_at = NOW()
    WHERE passenger_id = p_passenger_id;
    
    RETURN final_score;
END;
$$ LANGUAGE plpgsql;

-- Detect potential collusion between driver and passenger
CREATE OR REPLACE FUNCTION detect_collusion(p_driver_id UUID, p_passenger_id UUID)
RETURNS DECIMAL(5,2) AS $$
DECLARE
    ride_count INTEGER := 0;
    route_manipulation DECIMAL(5,2) := 0.0;
    timing_patterns DECIMAL(5,2) := 0.0;
    collusion_score DECIMAL(5,2) := 0.0;
BEGIN
    -- Count rides between this driver-passenger pair
    SELECT COUNT(*)
    INTO ride_count
    FROM bookings 
    WHERE driver_id = p_driver_id 
    AND customer_id = p_passenger_id::text -- Assuming customer_id links to passenger
    AND created_at >= NOW() - INTERVAL '30 days';
    
    -- Analyze route manipulation patterns
    -- This would involve complex spatial analysis of actual vs expected routes
    
    -- Calculate collusion score based on patterns
    IF ride_count > 10 THEN
        collusion_score := collusion_score + 30.0;
    ELSIF ride_count > 5 THEN
        collusion_score := collusion_score + 15.0;
    END IF;
    
    -- Insert or update collusion detection record
    INSERT INTO collusion_detection (
        driver_id, 
        passenger_id, 
        collusion_score, 
        suspicious_ride_count,
        investigation_status
    )
    VALUES (
        p_driver_id, 
        p_passenger_id, 
        collusion_score, 
        ride_count,
        CASE WHEN collusion_score > 50 THEN 'requires_investigation' ELSE 'monitoring' END
    )
    ON CONFLICT (driver_id, passenger_id) 
    DO UPDATE SET
        collusion_score = EXCLUDED.collusion_score,
        suspicious_ride_count = EXCLUDED.suspicious_ride_count,
        investigation_status = EXCLUDED.investigation_status,
        updated_at = NOW();
    
    RETURN collusion_score;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- COMMENTS AND DOCUMENTATION
-- =====================================================

COMMENT ON TABLE passenger_fraud_profiles IS 'Comprehensive fraud risk profiling for passengers';
COMMENT ON TABLE payment_fraud_analytics IS 'Real-time payment fraud detection and analysis';
COMMENT ON TABLE chargeback_management IS 'Chargeback dispute tracking and recovery';
COMMENT ON TABLE collusion_detection IS 'Driver-passenger collusion pattern detection';
COMMENT ON TABLE referral_fraud_detection IS 'Referral and incentive fraud prevention';
COMMENT ON TABLE fraud_alerts IS 'Unified fraud alerting system';
COMMENT ON TABLE fraud_investigations IS 'Investigation case management workflow';

-- Schema creation complete
SELECT 'Comprehensive Fraud Detection Schema Created Successfully!' as result,
       'Coverage: Payment, Identity, Behavioral, Collusion, Investigation' as features;