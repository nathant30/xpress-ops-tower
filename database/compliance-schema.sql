-- ========================================
-- XPRESS OPS TOWER - COMPLIANCE DATABASE SCHEMA
-- ========================================
-- Philippine Regulatory Compliance Data Capture
-- NPC Data Privacy (RA 10173) | LTFRB Transport | DOLE Labor
-- Generated: 2024-08-30
-- ========================================

-- ========================================
-- 1. NPC DATA PRIVACY (RA 10173) TABLES
-- ========================================

-- Data Processing Registry - Track all personal data processing activities
CREATE TABLE data_processing_registry (
    id SERIAL PRIMARY KEY,
    table_name VARCHAR(100) NOT NULL,
    schema_name VARCHAR(50) DEFAULT 'public',
    data_type VARCHAR(50) NOT NULL, -- 'PII', 'Financial', 'Location', 'Biometric'
    data_category VARCHAR(100), -- 'rider_profiles', 'driver_verification', 'trip_history'
    record_count INTEGER DEFAULT 0,
    sensitive_fields JSON, -- Array of sensitive column names
    processing_purpose TEXT,
    legal_basis VARCHAR(100), -- 'consent', 'contract', 'legitimate_interest'
    retention_period VARCHAR(50),
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Consent Management - Track all user consent activities
CREATE TABLE consent_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    user_type VARCHAR(20) NOT NULL, -- 'rider', 'driver', 'admin'
    consent_type VARCHAR(50) NOT NULL, -- 'data_processing', 'marketing', 'location_tracking'
    consent_version VARCHAR(10) DEFAULT '1.0',
    consent_given BOOLEAN NOT NULL,
    previous_consent BOOLEAN,
    consent_method VARCHAR(50), -- 'checkbox', 'verbal', 'implied', 'opt_out'
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    ip_address INET,
    user_agent TEXT,
    app_version VARCHAR(20),
    geolocation POINT,
    withdrawal_reason TEXT
);

-- PII Access Logs - Monitor who accesses personal data
CREATE TABLE pii_access_logs (
    id SERIAL PRIMARY KEY,
    accessor_id INTEGER NOT NULL,
    accessor_type VARCHAR(20) NOT NULL, -- 'admin', 'system', 'api'
    accessed_table VARCHAR(100) NOT NULL,
    accessed_record_id INTEGER,
    access_type VARCHAR(20) NOT NULL, -- 'read', 'write', 'delete', 'export'
    data_fields JSON, -- Fields accessed
    access_reason VARCHAR(200),
    session_id VARCHAR(100),
    ip_address INET,
    user_agent TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    duration_ms INTEGER
);

-- Data Breach Monitoring - Track potential security incidents
CREATE TABLE breach_monitoring (
    id SERIAL PRIMARY KEY,
    incident_type VARCHAR(50) NOT NULL, -- 'mass_export', 'unauthorized_access', 'data_leak'
    severity VARCHAR(20) NOT NULL, -- 'low', 'medium', 'high', 'critical'
    description TEXT,
    affected_records INTEGER,
    affected_data_types JSON,
    detection_method VARCHAR(50), -- 'automated', 'manual', 'reported'
    detected_by INTEGER, -- user_id or system
    detected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP,
    resolution_notes TEXT,
    npc_reported BOOLEAN DEFAULT FALSE,
    npc_report_date TIMESTAMP
);

-- Data Subject Requests - Handle GDPR-style data subject rights
CREATE TABLE data_subject_requests (
    id SERIAL PRIMARY KEY,
    request_id VARCHAR(50) UNIQUE NOT NULL,
    user_id INTEGER NOT NULL,
    request_type VARCHAR(30) NOT NULL, -- 'access', 'correction', 'deletion', 'portability'
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'rejected'
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    completion_notes TEXT,
    processed_by INTEGER -- admin user_id
);

-- ========================================
-- 2. LTFRB TRANSPORT OPERATIONS TABLES
-- ========================================

-- Trip Compliance Monitoring - Real-time trip compliance tracking
CREATE TABLE trip_compliance_log (
    trip_id UUID PRIMARY KEY,
    driver_id INTEGER NOT NULL,
    rider_id INTEGER NOT NULL,
    vehicle_id INTEGER NOT NULL,
    trip_start_time TIMESTAMP NOT NULL,
    trip_end_time TIMESTAMP,
    pickup_location POINT NOT NULL,
    dropoff_location POINT,
    route_coordinates JSON, -- Array of GPS coordinates
    
    -- Fare Compliance
    fare_charged DECIMAL(10,2),
    fare_mandated DECIMAL(10,2),
    fare_variance DECIMAL(10,2),
    fare_compliant BOOLEAN DEFAULT TRUE,
    fare_override_reason TEXT,
    fare_override_by INTEGER, -- admin user_id
    
    -- Route Compliance  
    authorized_routes JSON, -- Array of permitted route IDs
    route_violations JSON, -- Out of bounds coordinates
    boundary_compliant BOOLEAN DEFAULT TRUE,
    
    -- Vehicle Compliance
    cctv_active BOOLEAN DEFAULT TRUE,
    cctv_recording_id VARCHAR(100),
    vehicle_permit_valid BOOLEAN DEFAULT TRUE,
    
    -- Driver Compliance
    driver_rating DECIMAL(2,1),
    driver_declined BOOLEAN DEFAULT FALSE,
    decline_reason VARCHAR(100),
    conduct_violations JSON,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- CCTV Health Monitoring - Track vehicle CCTV system status
CREATE TABLE cctv_health_log (
    id SERIAL PRIMARY KEY,
    vehicle_id INTEGER NOT NULL,
    device_id VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL, -- 'active', 'inactive', 'maintenance', 'tampered'
    health_score INTEGER CHECK (health_score >= 0 AND health_score <= 100),
    last_recording TIMESTAMP,
    storage_capacity_gb INTEGER,
    storage_used_gb INTEGER,
    firmware_version VARCHAR(20),
    check_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    alert_triggered BOOLEAN DEFAULT FALSE,
    maintenance_due DATE
);

-- Driver Conduct Tracking - Monitor driver behavior and violations
CREATE TABLE driver_conduct_log (
    id SERIAL PRIMARY KEY,
    driver_id INTEGER NOT NULL,
    incident_date DATE NOT NULL,
    incident_type VARCHAR(50) NOT NULL, -- 'excessive_decline', 'late_arrival', 'route_deviation', 'customer_complaint'
    severity VARCHAR(20) NOT NULL, -- 'minor', 'major', 'critical'
    description TEXT,
    trip_id UUID, -- Reference to specific trip if applicable
    reported_by INTEGER, -- user_id of reporter
    evidence JSON, -- Screenshots, recordings, etc.
    strike_points INTEGER DEFAULT 0,
    total_strikes INTEGER DEFAULT 0,
    action_taken VARCHAR(100), -- 'warning', 'suspension', 'training_required'
    resolved BOOLEAN DEFAULT FALSE,
    resolved_at TIMESTAMP,
    notes TEXT
);

-- Franchise Boundary Compliance - Track authorized operating areas
CREATE TABLE franchise_boundaries (
    id SERIAL PRIMARY KEY,
    franchise_id VARCHAR(50) NOT NULL,
    driver_id INTEGER NOT NULL,
    area_name VARCHAR(100) NOT NULL,
    boundary_coordinates JSON NOT NULL, -- GeoJSON polygon
    permit_number VARCHAR(50),
    valid_from DATE NOT NULL,
    valid_until DATE NOT NULL,
    special_conditions TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- LTFRB Reporting Requirements - Track regulatory report submissions
CREATE TABLE ltfrb_report_submissions (
    id SERIAL PRIMARY KEY,
    report_type VARCHAR(50) NOT NULL, -- 'daily_trips', 'monthly_summary', 'incident_report'
    report_period_start DATE NOT NULL,
    report_period_end DATE NOT NULL,
    submission_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    file_path VARCHAR(500),
    record_count INTEGER,
    status VARCHAR(20) DEFAULT 'submitted', -- 'draft', 'submitted', 'acknowledged', 'rejected'
    ltfrb_reference_number VARCHAR(100),
    acknowledgment_date TIMESTAMP
);

-- ========================================
-- 3. DOLE LABOR STANDARDS TABLES
-- ========================================

-- Driver Attendance Tracking - Monitor work hours and attendance
CREATE TABLE driver_attendance (
    id SERIAL PRIMARY KEY,
    driver_id INTEGER NOT NULL,
    attendance_date DATE NOT NULL,
    
    -- Shift Times
    scheduled_start TIME,
    scheduled_end TIME,
    actual_start TIME,
    actual_end TIME,
    
    -- Hours Calculation
    regular_hours DECIMAL(4,2) DEFAULT 0,
    overtime_hours DECIMAL(4,2) DEFAULT 0,
    night_differential_hours DECIMAL(4,2) DEFAULT 0,
    rest_day_hours DECIMAL(4,2) DEFAULT 0,
    holiday_hours DECIMAL(4,2) DEFAULT 0,
    
    -- Attendance Status
    status VARCHAR(20) NOT NULL, -- 'present', 'absent', 'late', 'undertime', 'overtime'
    absence_type VARCHAR(30), -- 'sick_leave', 'vacation_leave', 'emergency_leave', 'awol'
    late_minutes INTEGER DEFAULT 0,
    undertime_minutes INTEGER DEFAULT 0,
    
    -- Location Verification
    checkin_location POINT,
    checkout_location POINT,
    gps_verified BOOLEAN DEFAULT FALSE,
    
    -- Approvals
    approved_by INTEGER, -- supervisor user_id
    approved_at TIMESTAMP,
    notes TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(driver_id, attendance_date)
);

-- Benefits Remittance Tracking - Monitor statutory benefits compliance
CREATE TABLE benefits_remittance (
    id SERIAL PRIMARY KEY,
    driver_id INTEGER NOT NULL,
    payroll_period_start DATE NOT NULL,
    payroll_period_end DATE NOT NULL,
    
    -- Contribution Amounts
    philhealth_employee DECIMAL(10,2) DEFAULT 0,
    philhealth_employer DECIMAL(10,2) DEFAULT 0,
    sss_employee DECIMAL(10,2) DEFAULT 0,
    sss_employer DECIMAL(10,2) DEFAULT 0,
    sss_ec DECIMAL(10,2) DEFAULT 0, -- Employees Compensation
    pagibig_employee DECIMAL(10,2) DEFAULT 0,
    pagibig_employer DECIMAL(10,2) DEFAULT 0,
    
    -- Remittance Status
    philhealth_remitted BOOLEAN DEFAULT FALSE,
    sss_remitted BOOLEAN DEFAULT FALSE,
    pagibig_remitted BOOLEAN DEFAULT FALSE,
    
    -- Remittance Dates
    philhealth_remittance_date DATE,
    sss_remittance_date DATE,
    pagibig_remittance_date DATE,
    
    -- Reference Numbers
    philhealth_reference VARCHAR(50),
    sss_reference VARCHAR(50),
    pagibig_reference VARCHAR(50),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(driver_id, payroll_period_start, payroll_period_end)
);

-- Deemed Salary Contract Tracking - Monitor contract compliance
CREATE TABLE deemed_salary_contracts (
    id SERIAL PRIMARY KEY,
    driver_id INTEGER NOT NULL,
    contract_number VARCHAR(50) UNIQUE NOT NULL,
    effective_date DATE NOT NULL,
    expiration_date DATE,
    
    -- Salary Structure
    monthly_deemed_salary DECIMAL(10,2) NOT NULL,
    daily_equivalent DECIMAL(10,2),
    hourly_equivalent DECIMAL(10,2),
    
    -- Coverage Details
    overtime_covered BOOLEAN DEFAULT TRUE,
    night_differential_covered BOOLEAN DEFAULT TRUE,
    rest_day_covered BOOLEAN DEFAULT TRUE,
    holiday_pay_covered BOOLEAN DEFAULT TRUE,
    
    -- Working Time Limits
    max_daily_hours INTEGER DEFAULT 11,
    max_weekly_days INTEGER DEFAULT 6,
    required_rest_hours INTEGER DEFAULT 12,
    
    -- Contract Status
    status VARCHAR(20) DEFAULT 'active', -- 'draft', 'active', 'expired', 'terminated'
    signed_date DATE,
    signed_by_driver BOOLEAN DEFAULT FALSE,
    signed_by_company BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Labor Inspection Readiness - Track compliance documentation
CREATE TABLE labor_inspection_readiness (
    id SERIAL PRIMARY KEY,
    inspection_area VARCHAR(50) NOT NULL, -- 'payroll', 'attendance', 'benefits', 'contracts', 'safety'
    compliance_item VARCHAR(100) NOT NULL,
    requirement_description TEXT,
    current_status VARCHAR(20) NOT NULL, -- 'compliant', 'non_compliant', 'needs_attention'
    compliance_score INTEGER CHECK (compliance_score >= 0 AND compliance_score <= 100),
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    next_review_due DATE,
    responsible_person INTEGER, -- user_id
    documentation_path VARCHAR(500),
    notes TEXT
);

-- ========================================
-- 4. COMMON COMPLIANCE TABLES
-- ========================================

-- Audit Trail - Generic audit logging for all compliance activities
CREATE TABLE compliance_audit_trail (
    id SERIAL PRIMARY KEY,
    compliance_area VARCHAR(50) NOT NULL, -- 'npc_privacy', 'ltfrb_transport', 'dole_labor'
    action VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50), -- 'trip', 'driver', 'consent', etc.
    entity_id VARCHAR(100),
    old_values JSON,
    new_values JSON,
    performed_by INTEGER NOT NULL, -- user_id
    performed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ip_address INET,
    user_agent TEXT,
    reason TEXT
);

-- Compliance Alerts - Automated alert system
CREATE TABLE compliance_alerts (
    id SERIAL PRIMARY KEY,
    alert_type VARCHAR(50) NOT NULL,
    severity VARCHAR(20) NOT NULL, -- 'info', 'warning', 'error', 'critical'
    title VARCHAR(200) NOT NULL,
    description TEXT,
    compliance_area VARCHAR(50),
    entity_type VARCHAR(50),
    entity_id VARCHAR(100),
    threshold_value DECIMAL(10,2),
    actual_value DECIMAL(10,2),
    triggered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    acknowledged BOOLEAN DEFAULT FALSE,
    acknowledged_by INTEGER,
    acknowledged_at TIMESTAMP,
    resolved BOOLEAN DEFAULT FALSE,
    resolved_at TIMESTAMP,
    auto_resolved BOOLEAN DEFAULT FALSE
);

-- ========================================
-- 5. INDEXES FOR PERFORMANCE
-- ========================================

-- NPC Data Privacy Indexes
CREATE INDEX idx_consent_logs_user_id ON consent_logs(user_id);
CREATE INDEX idx_consent_logs_type_timestamp ON consent_logs(consent_type, timestamp);
CREATE INDEX idx_pii_access_logs_timestamp ON pii_access_logs(timestamp);
CREATE INDEX idx_pii_access_logs_accessor ON pii_access_logs(accessor_id, access_type);

-- LTFRB Transport Indexes
CREATE INDEX idx_trip_compliance_driver ON trip_compliance_log(driver_id);
CREATE INDEX idx_trip_compliance_timestamp ON trip_compliance_log(trip_start_time);
CREATE INDEX idx_cctv_health_vehicle ON cctv_health_log(vehicle_id);
CREATE INDEX idx_driver_conduct_driver_date ON driver_conduct_log(driver_id, incident_date);

-- DOLE Labor Indexes
CREATE INDEX idx_driver_attendance_driver_date ON driver_attendance(driver_id, attendance_date);
CREATE INDEX idx_benefits_remittance_driver ON benefits_remittance(driver_id);
CREATE INDEX idx_deemed_salary_driver ON deemed_salary_contracts(driver_id);

-- Common Compliance Indexes
CREATE INDEX idx_audit_trail_timestamp ON compliance_audit_trail(performed_at);
CREATE INDEX idx_compliance_alerts_triggered ON compliance_alerts(triggered_at);
CREATE INDEX idx_compliance_alerts_severity ON compliance_alerts(severity, acknowledged);

-- ========================================
-- 6. VIEWS FOR REPORTING
-- ========================================

-- NPC Privacy Compliance Summary View
CREATE VIEW npc_compliance_summary AS
SELECT 
    COUNT(DISTINCT dpr.table_name) as registered_data_systems,
    SUM(dpr.record_count) as total_personal_records,
    COUNT(CASE WHEN cl.consent_given = true THEN 1 END) * 100.0 / COUNT(cl.id) as consent_capture_rate,
    COUNT(DISTINCT pal.accessor_id) as authorized_accessors,
    COUNT(CASE WHEN bm.severity = 'critical' THEN 1 END) as critical_breaches,
    COUNT(dsr.id) as pending_subject_requests
FROM data_processing_registry dpr
CROSS JOIN consent_logs cl
CROSS JOIN pii_access_logs pal
CROSS JOIN breach_monitoring bm
CROSS JOIN data_subject_requests dsr
WHERE dsr.status = 'pending';

-- LTFRB Transport Compliance Summary View
CREATE VIEW ltfrb_compliance_summary AS
SELECT 
    DATE(trip_start_time) as trip_date,
    COUNT(*) as total_trips,
    COUNT(CASE WHEN fare_compliant = true THEN 1 END) * 100.0 / COUNT(*) as fare_compliance_rate,
    COUNT(CASE WHEN boundary_compliant = true THEN 1 END) * 100.0 / COUNT(*) as route_compliance_rate,
    COUNT(CASE WHEN cctv_active = true THEN 1 END) * 100.0 / COUNT(*) as cctv_active_rate,
    AVG(driver_rating) as avg_driver_rating,
    COUNT(CASE WHEN driver_declined = true THEN 1 END) * 100.0 / COUNT(*) as decline_rate
FROM trip_compliance_log 
WHERE trip_start_time >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(trip_start_time)
ORDER BY trip_date DESC;

-- DOLE Labor Compliance Summary View  
CREATE VIEW dole_compliance_summary AS
SELECT 
    da.attendance_date,
    COUNT(DISTINCT da.driver_id) as total_drivers,
    COUNT(CASE WHEN da.status = 'present' THEN 1 END) * 100.0 / COUNT(*) as attendance_rate,
    AVG(da.regular_hours) as avg_daily_hours,
    COUNT(CASE WHEN da.regular_hours > 11 THEN 1 END) as overtime_violations,
    COUNT(CASE WHEN br.philhealth_remitted = true THEN 1 END) * 100.0 / COUNT(br.id) as benefits_compliance_rate
FROM driver_attendance da
LEFT JOIN benefits_remittance br ON da.driver_id = br.driver_id 
    AND da.attendance_date BETWEEN br.payroll_period_start AND br.payroll_period_end
WHERE da.attendance_date >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY da.attendance_date
ORDER BY da.attendance_date DESC;