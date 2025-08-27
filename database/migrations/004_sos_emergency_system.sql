-- =====================================================
-- SOS Emergency System - Life-Critical Database Schema
-- Sub-5-second response requirement for emergency alerts
-- =====================================================

-- SOS Emergency Types Enum
CREATE TYPE sos_emergency_type AS ENUM (
    'medical_emergency',     -- Heart attack, injury, unconscious
    'security_threat',       -- Attack, robbery, harassment
    'accident_critical',     -- Severe accident with injuries
    'fire_emergency',        -- Vehicle fire, building fire
    'natural_disaster',      -- Earthquake, flood, landslide
    'kidnapping',           -- Kidnapping attempt or threat
    'domestic_violence',    -- Domestic violence situation
    'general_emergency'     -- General distress call
);

-- SOS Status Enum
CREATE TYPE sos_status AS ENUM (
    'triggered',            -- SOS button pressed
    'processing',           -- System processing alert
    'dispatched',           -- Emergency services notified
    'acknowledged',         -- Emergency services responded
    'responding',           -- Emergency services en route
    'resolved',             -- Emergency resolved
    'false_alarm'           -- Confirmed false alarm
);

-- SOS Alerts Table - CRITICAL PERFORMANCE TABLE
CREATE TABLE sos_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sos_code VARCHAR(20) NOT NULL UNIQUE,
    
    -- Timing (critical for performance metrics)
    triggered_at TIMESTAMP WITH TIME ZONE NOT NULL,
    processing_time_ms INTEGER, -- Time from trigger to emergency dispatch
    response_time_ms INTEGER,   -- Time to first acknowledgment
    
    -- Location Information
    location GEOMETRY(POINT, 4326) NOT NULL,
    location_accuracy DECIMAL(8,2), -- GPS accuracy in meters
    address TEXT,
    region_id UUID REFERENCES regions(id),
    
    -- Reporter Information
    reporter_id UUID NOT NULL,
    reporter_type VARCHAR(20) NOT NULL, -- driver, passenger, customer, system
    reporter_name VARCHAR(100),
    reporter_phone VARCHAR(20),
    
    -- Context Information
    driver_id UUID REFERENCES drivers(id),
    booking_id UUID REFERENCES bookings(id),
    vehicle_info JSONB, -- Vehicle details for emergency responders
    
    -- Emergency Classification
    emergency_type sos_emergency_type NOT NULL,
    severity INTEGER NOT NULL CHECK (severity >= 1 AND severity <= 10),
    description TEXT,
    attachments JSONB DEFAULT '[]', -- Emergency photos/videos/audio
    
    -- Status Tracking
    status sos_status DEFAULT 'triggered',
    
    -- Emergency Response Tracking
    emergency_services_notified JSONB DEFAULT '[]', -- Array of services notified
    emergency_reference_numbers JSONB DEFAULT '{}', -- Reference numbers from each service
    first_responder_eta TIMESTAMP WITH TIME ZONE,
    
    -- Resolution
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    acknowledged_by UUID,
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by UUID,
    resolution_notes TEXT,
    
    -- Follow-up and Compliance
    follow_up_required BOOLEAN DEFAULT TRUE,
    compliance_report_generated BOOLEAN DEFAULT FALSE,
    incident_report_number VARCHAR(50),
    
    -- Metadata and Audit
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Emergency Service Dispatch Log
CREATE TABLE emergency_service_dispatches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sos_alert_id UUID NOT NULL REFERENCES sos_alerts(id),
    
    -- Service Details
    service_type VARCHAR(50) NOT NULL, -- police, medical, fire, etc.
    service_agency VARCHAR(100),
    reference_number VARCHAR(100),
    
    -- Dispatch Timing
    dispatched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    arrived_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    
    -- Dispatch Details
    unit_dispatched VARCHAR(100),
    responder_name VARCHAR(100),
    responder_badge VARCHAR(50),
    contact_number VARCHAR(20),
    
    -- Response Information
    response_notes TEXT,
    outcome VARCHAR(50), -- resolved, escalated, transferred, cancelled
    
    -- Performance Metrics
    dispatch_time_seconds INTEGER, -- Time from SOS to dispatch
    response_time_seconds INTEGER, -- Time from dispatch to acknowledgment
    arrival_time_seconds INTEGER,  -- Time from dispatch to arrival
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Emergency Communications Log (SMS, Phone calls, etc.)
CREATE TABLE emergency_communications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sos_alert_id UUID REFERENCES sos_alerts(id),
    incident_id UUID REFERENCES incidents(id), -- Can link to general incidents too
    
    -- Communication Details
    type VARCHAR(20) NOT NULL, -- sms, phone, email, radio
    direction VARCHAR(10) NOT NULL, -- inbound, outbound
    recipient VARCHAR(100),
    sender VARCHAR(100),
    
    -- Content
    subject VARCHAR(200),
    message TEXT,
    attachments JSONB DEFAULT '[]',
    
    -- Status
    status VARCHAR(20) DEFAULT 'sent', -- sent, delivered, failed, read
    delivery_confirmed_at TIMESTAMP WITH TIME ZONE,
    
    -- Metadata
    provider VARCHAR(50), -- Twilio, AWS SNS, etc.
    external_id VARCHAR(100),
    cost DECIMAL(8,4), -- Communication cost
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Safety Incident Reports (for post-SOS analysis)
CREATE TABLE safety_incident_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sos_alert_id UUID REFERENCES sos_alerts(id),
    incident_id UUID REFERENCES incidents(id),
    
    -- Report Classification
    report_type VARCHAR(50) NOT NULL, -- police_report, hospital_report, internal_investigation
    report_number VARCHAR(100) NOT NULL,
    filing_agency VARCHAR(100),
    
    -- Parties Involved
    driver_id UUID REFERENCES drivers(id),
    customer_id UUID,
    other_parties JSONB DEFAULT '[]',
    
    -- Report Details
    incident_summary TEXT NOT NULL,
    official_findings TEXT,
    recommendations TEXT,
    follow_up_actions JSONB DEFAULT '[]',
    
    -- Legal and Compliance
    legal_action_required BOOLEAN DEFAULT FALSE,
    insurance_claim_number VARCHAR(50),
    regulatory_filing_required BOOLEAN DEFAULT FALSE,
    
    -- Report Status
    status VARCHAR(20) DEFAULT 'draft', -- draft, submitted, approved, closed
    filed_at TIMESTAMP WITH TIME ZONE,
    approved_at TIMESTAMP WITH TIME ZONE,
    approved_by UUID,
    
    -- Document Management
    report_documents JSONB DEFAULT '[]', -- URLs to report PDFs, photos, etc.
    confidentiality_level VARCHAR(20) DEFAULT 'internal', -- public, internal, confidential, restricted
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID NOT NULL
);

-- Driver Safety Scores and Behavioral Analysis
CREATE TABLE driver_safety_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    driver_id UUID NOT NULL REFERENCES drivers(id),
    
    -- Safety Scores (updated daily)
    overall_safety_score DECIMAL(5,2) DEFAULT 100.00, -- 0-100 scale
    incident_frequency_score DECIMAL(5,2) DEFAULT 100.00,
    response_compliance_score DECIMAL(5,2) DEFAULT 100.00,
    emergency_preparedness_score DECIMAL(5,2) DEFAULT 100.00,
    
    -- Incident History Summary
    total_sos_incidents INTEGER DEFAULT 0,
    false_alarm_incidents INTEGER DEFAULT 0,
    resolved_incidents INTEGER DEFAULT 0,
    escalated_incidents INTEGER DEFAULT 0,
    
    -- Last 30 Days Activity
    recent_incidents INTEGER DEFAULT 0,
    recent_false_alarms INTEGER DEFAULT 0,
    recent_score_change DECIMAL(5,2) DEFAULT 0.00,
    
    -- Risk Assessment
    risk_level VARCHAR(20) DEFAULT 'low', -- low, medium, high, critical
    risk_factors JSONB DEFAULT '[]',
    recommended_actions JSONB DEFAULT '[]',
    
    -- Behavioral Patterns
    common_incident_types JSONB DEFAULT '[]',
    common_incident_locations JSONB DEFAULT '[]',
    common_incident_times JSONB DEFAULT '[]',
    
    -- Training and Compliance
    safety_training_completed JSONB DEFAULT '[]',
    last_safety_training DATE,
    next_safety_review DATE,
    compliance_status VARCHAR(20) DEFAULT 'compliant',
    
    -- Performance Tracking
    profile_date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(driver_id, profile_date)
);

-- Emergency Response Performance Metrics
CREATE TABLE emergency_response_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    metric_date DATE NOT NULL,
    region_id UUID REFERENCES regions(id),
    
    -- SOS Performance Metrics
    total_sos_alerts INTEGER DEFAULT 0,
    under_5_second_processing INTEGER DEFAULT 0,
    over_5_second_processing INTEGER DEFAULT 0,
    average_processing_time_ms DECIMAL(10,2) DEFAULT 0,
    
    -- Response Metrics
    total_emergency_dispatches INTEGER DEFAULT 0,
    successful_dispatches INTEGER DEFAULT 0,
    failed_dispatches INTEGER DEFAULT 0,
    average_response_time_ms DECIMAL(10,2) DEFAULT 0,
    
    -- Service Level Performance
    critical_sla_met INTEGER DEFAULT 0,
    critical_sla_missed INTEGER DEFAULT 0,
    average_first_responder_time_minutes DECIMAL(8,2) DEFAULT 0,
    
    -- Incident Resolution
    resolved_incidents INTEGER DEFAULT 0,
    false_alarms INTEGER DEFAULT 0,
    escalated_to_external INTEGER DEFAULT 0,
    average_resolution_time_minutes DECIMAL(10,2) DEFAULT 0,
    
    -- Emergency Service Integration
    emergency_service_availability DECIMAL(5,2) DEFAULT 100.00, -- 0-100%
    integration_failures INTEGER DEFAULT 0,
    communication_failures INTEGER DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(metric_date, region_id)
);

-- =====================================================
-- CRITICAL PERFORMANCE INDEXES
-- =====================================================

-- SOS Alerts - Critical for sub-5-second queries
CREATE INDEX CONCURRENTLY idx_sos_alerts_triggered_at ON sos_alerts(triggered_at DESC);
CREATE INDEX CONCURRENTLY idx_sos_alerts_status_priority ON sos_alerts(status, emergency_type) WHERE status IN ('triggered', 'processing', 'dispatched');
CREATE INDEX CONCURRENTLY idx_sos_alerts_driver ON sos_alerts(driver_id, triggered_at DESC) WHERE driver_id IS NOT NULL;
CREATE INDEX CONCURRENTLY idx_sos_alerts_location ON sos_alerts USING GIST(location);
CREATE INDEX CONCURRENTLY idx_sos_alerts_region_time ON sos_alerts(region_id, triggered_at DESC);

-- Emergency Service Dispatches
CREATE INDEX CONCURRENTLY idx_emergency_dispatches_sos ON emergency_service_dispatches(sos_alert_id, dispatched_at DESC);
CREATE INDEX CONCURRENTLY idx_emergency_dispatches_service ON emergency_service_dispatches(service_type, dispatched_at DESC);
CREATE INDEX CONCURRENTLY idx_emergency_dispatches_performance ON emergency_service_dispatches(dispatch_time_seconds, response_time_seconds) WHERE dispatch_time_seconds IS NOT NULL;

-- Emergency Communications
CREATE INDEX CONCURRENTLY idx_emergency_communications_sos ON emergency_communications(sos_alert_id, created_at DESC);
CREATE INDEX CONCURRENTLY idx_emergency_communications_type ON emergency_communications(type, status, created_at DESC);

-- Safety Profiles
CREATE INDEX CONCURRENTLY idx_driver_safety_profiles_driver ON driver_safety_profiles(driver_id, profile_date DESC);
CREATE INDEX CONCURRENTLY idx_driver_safety_profiles_risk ON driver_safety_profiles(risk_level, overall_safety_score) WHERE risk_level != 'low';
CREATE INDEX CONCURRENTLY idx_driver_safety_profiles_score ON driver_safety_profiles(overall_safety_score) WHERE overall_safety_score < 80;

-- Performance Metrics
CREATE INDEX CONCURRENTLY idx_emergency_response_metrics_date ON emergency_response_metrics(metric_date DESC, region_id);

-- =====================================================
-- TRIGGERS AND FUNCTIONS
-- =====================================================

-- Function to update SOS alert timestamps
CREATE OR REPLACE FUNCTION update_sos_timestamps()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    
    -- Calculate processing time when status changes to dispatched
    IF OLD.status != 'dispatched' AND NEW.status = 'dispatched' THEN
        NEW.processing_time_ms = EXTRACT(EPOCH FROM (NOW() - NEW.triggered_at)) * 1000;
    END IF;
    
    -- Calculate response time when acknowledged
    IF OLD.acknowledged_at IS NULL AND NEW.acknowledged_at IS NOT NULL THEN
        NEW.response_time_ms = EXTRACT(EPOCH FROM (NEW.acknowledged_at - NEW.triggered_at)) * 1000;
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to SOS alerts
CREATE TRIGGER tr_sos_alerts_timestamps 
    BEFORE UPDATE ON sos_alerts 
    FOR EACH ROW 
    EXECUTE FUNCTION update_sos_timestamps();

-- Apply updated_at trigger to other tables
CREATE TRIGGER tr_emergency_service_dispatches_updated_at 
    BEFORE UPDATE ON emergency_service_dispatches 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER tr_safety_incident_reports_updated_at 
    BEFORE UPDATE ON safety_incident_reports 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER tr_driver_safety_profiles_updated_at 
    BEFORE UPDATE ON driver_safety_profiles 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at();

-- =====================================================
-- CRITICAL VIEWS FOR DASHBOARD
-- =====================================================

-- Active SOS Alerts View
CREATE VIEW v_active_sos_alerts AS
SELECT 
    sa.id,
    sa.sos_code,
    sa.emergency_type,
    sa.severity,
    sa.status,
    sa.triggered_at,
    sa.processing_time_ms,
    sa.response_time_ms,
    sa.location,
    sa.address,
    sa.reporter_name,
    sa.reporter_phone,
    sa.reporter_type,
    CONCAT(d.first_name, ' ', d.last_name) as driver_name,
    d.phone as driver_phone,
    sa.vehicle_info,
    r.name as region_name,
    EXTRACT(EPOCH FROM (NOW() - sa.triggered_at)) * 1000 as elapsed_time_ms,
    CASE 
        WHEN sa.processing_time_ms IS NOT NULL THEN sa.processing_time_ms < 5000
        ELSE EXTRACT(EPOCH FROM (NOW() - sa.triggered_at)) * 1000 < 5000
    END as within_5_second_target,
    CASE sa.emergency_type
        WHEN 'medical_emergency' THEN '#DC2626'
        WHEN 'fire_emergency' THEN '#EA580C'
        WHEN 'kidnapping' THEN '#7C2D12'
        WHEN 'accident_critical' THEN '#B91C1C'
        WHEN 'security_threat' THEN '#DC2626'
        ELSE '#EF4444'
    END as status_color
FROM sos_alerts sa
LEFT JOIN drivers d ON sa.driver_id = d.id
LEFT JOIN regions r ON sa.region_id = r.id
WHERE sa.status IN ('triggered', 'processing', 'dispatched', 'acknowledged', 'responding')
ORDER BY sa.severity DESC, sa.triggered_at DESC;

-- SOS Performance Dashboard View
CREATE VIEW v_sos_performance_dashboard AS
SELECT 
    r.name as region_name,
    r.code as region_code,
    COUNT(sa.id) as total_sos_today,
    COUNT(CASE WHEN sa.status = 'triggered' THEN 1 END) as active_alerts,
    COUNT(CASE WHEN sa.processing_time_ms < 5000 THEN 1 END) as under_5_second_processing,
    COUNT(CASE WHEN sa.processing_time_ms >= 5000 THEN 1 END) as over_5_second_processing,
    ROUND(AVG(sa.processing_time_ms), 0) as avg_processing_time_ms,
    ROUND(AVG(sa.response_time_ms), 0) as avg_response_time_ms,
    COUNT(CASE WHEN sa.status = 'resolved' THEN 1 END) as resolved_today,
    COUNT(CASE WHEN sa.status = 'false_alarm' THEN 1 END) as false_alarms_today,
    ROUND(
        COUNT(CASE WHEN sa.processing_time_ms < 5000 THEN 1 END) * 100.0 / 
        NULLIF(COUNT(CASE WHEN sa.processing_time_ms IS NOT NULL THEN 1 END), 0), 
        1
    ) as performance_percentage
FROM regions r
LEFT JOIN sos_alerts sa ON r.id = sa.region_id AND sa.triggered_at >= CURRENT_DATE
WHERE r.is_active = TRUE
GROUP BY r.id, r.name, r.code
ORDER BY total_sos_today DESC, performance_percentage ASC;

-- Emergency Services Integration Status View
CREATE VIEW v_emergency_services_status AS
SELECT 
    service_type,
    COUNT(*) as total_dispatches_today,
    COUNT(CASE WHEN acknowledged_at IS NOT NULL THEN 1 END) as acknowledged_dispatches,
    COUNT(CASE WHEN arrived_at IS NOT NULL THEN 1 END) as arrived_dispatches,
    COUNT(CASE WHEN completed_at IS NOT NULL THEN 1 END) as completed_dispatches,
    ROUND(AVG(dispatch_time_seconds), 1) as avg_dispatch_time_seconds,
    ROUND(AVG(response_time_seconds), 1) as avg_response_time_seconds,
    ROUND(AVG(arrival_time_seconds), 1) as avg_arrival_time_seconds,
    ROUND(
        COUNT(CASE WHEN acknowledged_at IS NOT NULL THEN 1 END) * 100.0 / 
        NULLIF(COUNT(*), 0), 
        1
    ) as acknowledgment_rate
FROM emergency_service_dispatches 
WHERE dispatched_at >= CURRENT_DATE
GROUP BY service_type
ORDER BY total_dispatches_today DESC;

-- =====================================================
-- COMMENTS AND DOCUMENTATION
-- =====================================================

COMMENT ON TABLE sos_alerts IS 'Life-critical SOS emergency alerts with sub-5-second processing requirement';
COMMENT ON TABLE emergency_service_dispatches IS 'Emergency service dispatch log with performance tracking';
COMMENT ON TABLE emergency_communications IS 'All emergency communications log for audit and compliance';
COMMENT ON TABLE safety_incident_reports IS 'Post-incident safety reports and compliance documentation';
COMMENT ON TABLE driver_safety_profiles IS 'Driver safety scores and behavioral analysis for risk management';
COMMENT ON TABLE emergency_response_metrics IS 'Daily emergency response performance metrics for KPI tracking';

COMMENT ON VIEW v_active_sos_alerts IS 'Real-time view of active SOS alerts for emergency dashboard';
COMMENT ON VIEW v_sos_performance_dashboard IS 'SOS system performance metrics by region';
COMMENT ON VIEW v_emergency_services_status IS 'Emergency services integration performance and availability';

-- Grant necessary permissions
GRANT SELECT ON v_active_sos_alerts TO readonly_role;
GRANT SELECT ON v_sos_performance_dashboard TO readonly_role;
GRANT SELECT ON v_emergency_services_status TO readonly_role;