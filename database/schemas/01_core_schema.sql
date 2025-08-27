-- =====================================================
-- XPRESS OPS TOWER - MASTER DATABASE SCHEMA
-- Real-time Fleet Operations Command Center
-- Target: 10,000+ active drivers, 1M+ events/day
-- Performance: <2s query response, 99.9% uptime
-- =====================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";
CREATE EXTENSION IF NOT EXISTS "btree_gin";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- =====================================================
-- CORE ENUMS AND TYPES
-- =====================================================

CREATE TYPE service_type AS ENUM (
    'ride_4w',           -- 4-wheel ride service
    'ride_2w',           -- 2-wheel ride service  
    'send_delivery',     -- Package delivery
    'eats_delivery',     -- Food delivery
    'mart_delivery'      -- Grocery delivery
);

CREATE TYPE driver_status AS ENUM (
    'active',            -- Currently available for bookings
    'busy',              -- On an active trip/delivery
    'offline',           -- Not accepting bookings
    'break',             -- On scheduled break
    'maintenance',       -- Vehicle maintenance
    'suspended',         -- Account suspended
    'emergency'          -- In emergency/SOS situation
);

CREATE TYPE booking_status AS ENUM (
    'requested',         -- Customer requested
    'searching',         -- Looking for driver
    'assigned',          -- Driver assigned
    'accepted',          -- Driver accepted
    'en_route',          -- Driver heading to pickup
    'arrived',           -- Driver at pickup location
    'in_progress',       -- Trip/delivery in progress
    'completed',         -- Successfully completed
    'cancelled',         -- Cancelled by customer/driver
    'failed',            -- Failed to complete
    'no_show'            -- Customer/merchant no-show
);

CREATE TYPE incident_priority AS ENUM (
    'critical',          -- Life-threatening, <30s response
    'high',              -- Safety concern, <60s response
    'medium',            -- Service issue, <5min response
    'low'                -- General inquiry, <30min response
);

CREATE TYPE incident_status AS ENUM (
    'open',              -- Just reported
    'acknowledged',      -- Operator aware
    'in_progress',       -- Being handled
    'escalated',         -- Escalated to emergency services
    'resolved',          -- Successfully resolved
    'closed'             -- Case closed
);

CREATE TYPE region_status AS ENUM (
    'active',            -- Fully operational
    'limited',           -- Limited operations (LGU restrictions)
    'suspended',         -- Operations suspended
    'maintenance'        -- System maintenance
);

-- =====================================================
-- CORE MASTER TABLES
-- =====================================================

-- Regional compliance and LGU management
CREATE TABLE regions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    code VARCHAR(10) NOT NULL UNIQUE,
    country_code CHAR(2) DEFAULT 'PH',
    timezone VARCHAR(50) DEFAULT 'Asia/Manila',
    
    -- Geospatial boundaries
    boundary GEOMETRY(POLYGON, 4326),
    center_point GEOMETRY(POINT, 4326),
    
    -- Operational parameters
    status region_status DEFAULT 'active',
    max_drivers INTEGER DEFAULT 1000,
    surge_multiplier DECIMAL(3,2) DEFAULT 1.00,
    
    -- LGU compliance
    lgu_restrictions JSONB DEFAULT '{}',
    operating_hours JSONB DEFAULT '{"start": "05:00", "end": "23:00"}',
    special_zones JSONB DEFAULT '[]',
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID,
    is_active BOOLEAN DEFAULT TRUE
);

-- Driver management - core table for 10,000+ drivers
CREATE TABLE drivers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    driver_code VARCHAR(20) NOT NULL UNIQUE,
    
    -- Personal information
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    middle_name VARCHAR(50),
    email VARCHAR(100) UNIQUE,
    phone VARCHAR(20) NOT NULL,
    date_of_birth DATE,
    
    -- Address information
    address JSONB NOT NULL,
    region_id UUID NOT NULL REFERENCES regions(id),
    
    -- Service capabilities
    services service_type[] NOT NULL,
    primary_service service_type NOT NULL,
    
    -- Status and verification
    status driver_status DEFAULT 'offline',
    verification_level INTEGER DEFAULT 1, -- 1-5 scale
    is_verified BOOLEAN DEFAULT FALSE,
    background_check_date DATE,
    
    -- Performance metrics
    rating DECIMAL(3,2) DEFAULT 5.00,
    total_trips INTEGER DEFAULT 0,
    completed_trips INTEGER DEFAULT 0,
    cancelled_trips INTEGER DEFAULT 0,
    
    -- Financial information
    wallet_balance DECIMAL(10,2) DEFAULT 0.00,
    earnings_today DECIMAL(10,2) DEFAULT 0.00,
    earnings_week DECIMAL(10,2) DEFAULT 0.00,
    earnings_month DECIMAL(10,2) DEFAULT 0.00,
    
    -- Vehicle information
    vehicle_info JSONB DEFAULT '{}',
    license_info JSONB DEFAULT '{}',
    
    -- Compliance and documents
    documents JSONB DEFAULT '{}',
    certifications JSONB DEFAULT '[]',
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE,
    
    CONSTRAINT drivers_rating_check CHECK (rating >= 1.00 AND rating <= 5.00)
);

-- Real-time location tracking - HOT DATA (30-second refresh)
CREATE TABLE driver_locations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    driver_id UUID NOT NULL REFERENCES drivers(id),
    
    -- Location data
    location GEOMETRY(POINT, 4326) NOT NULL,
    accuracy DECIMAL(8,2), -- GPS accuracy in meters
    altitude DECIMAL(8,2),
    bearing DECIMAL(5,2), -- Direction 0-360 degrees
    speed DECIMAL(6,2), -- km/h
    
    -- Address information
    address TEXT,
    region_id UUID REFERENCES regions(id),
    
    -- Status information
    driver_status driver_status NOT NULL,
    is_available BOOLEAN DEFAULT FALSE,
    
    -- Metadata
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- TTL for hot data cleanup (keep only 24 hours)
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '24 hours')
);

-- Booking management - all service types
CREATE TABLE bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_reference VARCHAR(20) NOT NULL UNIQUE,
    
    -- Service details
    service_type service_type NOT NULL,
    status booking_status DEFAULT 'requested',
    
    -- Customer information
    customer_id UUID NOT NULL, -- References customer system
    customer_info JSONB NOT NULL,
    
    -- Driver assignment
    driver_id UUID REFERENCES drivers(id),
    assigned_at TIMESTAMP WITH TIME ZONE,
    accepted_at TIMESTAMP WITH TIME ZONE,
    
    -- Location information
    pickup_location GEOMETRY(POINT, 4326) NOT NULL,
    pickup_address TEXT NOT NULL,
    dropoff_location GEOMETRY(POINT, 4326),
    dropoff_address TEXT,
    
    -- Regional compliance
    region_id UUID NOT NULL REFERENCES regions(id),
    
    -- Service-specific data
    service_details JSONB DEFAULT '{}',
    special_instructions TEXT,
    
    -- Pricing and payment
    base_fare DECIMAL(8,2),
    surge_multiplier DECIMAL(3,2) DEFAULT 1.00,
    total_fare DECIMAL(8,2),
    payment_status VARCHAR(20) DEFAULT 'pending',
    payment_method VARCHAR(20),
    
    -- Timeline tracking
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    estimated_pickup_time TIMESTAMP WITH TIME ZONE,
    actual_pickup_time TIMESTAMP WITH TIME ZONE,
    estimated_completion_time TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    
    -- Quality metrics
    customer_rating INTEGER,
    driver_rating INTEGER,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT bookings_rating_check CHECK (
        (customer_rating IS NULL OR (customer_rating >= 1 AND customer_rating <= 5)) AND
        (driver_rating IS NULL OR (driver_rating >= 1 AND driver_rating <= 5))
    )
);

-- Emergency/SOS incident tracking - CRITICAL SYSTEM
CREATE TABLE incidents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    incident_code VARCHAR(20) NOT NULL UNIQUE,
    
    -- Classification
    priority incident_priority NOT NULL,
    status incident_status DEFAULT 'open',
    incident_type VARCHAR(50) NOT NULL,
    
    -- Reporter information
    reporter_type VARCHAR(20) NOT NULL, -- driver, customer, system, operator
    reporter_id UUID NOT NULL,
    reporter_contact VARCHAR(100),
    
    -- Driver involvement
    driver_id UUID REFERENCES drivers(id),
    booking_id UUID REFERENCES bookings(id),
    
    -- Location information
    location GEOMETRY(POINT, 4326),
    address TEXT,
    region_id UUID REFERENCES regions(id),
    
    -- Incident details
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    attachments JSONB DEFAULT '[]', -- photos, videos, audio
    
    -- Response tracking
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    acknowledged_by UUID, -- operator who acknowledged
    first_response_time INTEGER, -- seconds to first response
    resolution_time INTEGER, -- seconds to resolution
    
    -- Escalation
    escalated_at TIMESTAMP WITH TIME ZONE,
    escalated_to VARCHAR(100), -- emergency services, management
    external_reference VARCHAR(100), -- police report, hospital case
    
    -- Resolution
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by UUID,
    resolution_notes TEXT,
    
    -- Follow-up
    follow_up_required BOOLEAN DEFAULT FALSE,
    follow_up_date DATE,
    follow_up_assigned_to UUID,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- PERFORMANCE AND ANALYTICS TABLES
-- =====================================================

-- Driver performance metrics - daily aggregations
CREATE TABLE driver_performance_daily (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    driver_id UUID NOT NULL REFERENCES drivers(id),
    performance_date DATE NOT NULL,
    region_id UUID REFERENCES regions(id),
    
    -- Trip metrics
    total_trips INTEGER DEFAULT 0,
    completed_trips INTEGER DEFAULT 0,
    cancelled_trips INTEGER DEFAULT 0,
    acceptance_rate DECIMAL(5,2) DEFAULT 0.00,
    completion_rate DECIMAL(5,2) DEFAULT 0.00,
    
    -- Time metrics
    online_hours DECIMAL(6,2) DEFAULT 0.00,
    driving_hours DECIMAL(6,2) DEFAULT 0.00,
    idle_hours DECIMAL(6,2) DEFAULT 0.00,
    
    -- Financial metrics
    gross_earnings DECIMAL(10,2) DEFAULT 0.00,
    net_earnings DECIMAL(10,2) DEFAULT 0.00,
    tips_received DECIMAL(8,2) DEFAULT 0.00,
    
    -- Quality metrics
    average_rating DECIMAL(3,2),
    customer_complaints INTEGER DEFAULT 0,
    safety_incidents INTEGER DEFAULT 0,
    
    -- Distance metrics
    total_distance_km DECIMAL(10,2) DEFAULT 0.00,
    billable_distance_km DECIMAL(10,2) DEFAULT 0.00,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(driver_id, performance_date)
);

-- System KPIs and operational metrics
CREATE TABLE operational_metrics_hourly (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    metric_hour TIMESTAMP WITH TIME ZONE NOT NULL,
    region_id UUID REFERENCES regions(id),
    
    -- Driver metrics
    active_drivers INTEGER DEFAULT 0,
    available_drivers INTEGER DEFAULT 0,
    busy_drivers INTEGER DEFAULT 0,
    
    -- Booking metrics
    total_requests INTEGER DEFAULT 0,
    successful_bookings INTEGER DEFAULT 0,
    cancelled_bookings INTEGER DEFAULT 0,
    average_wait_time DECIMAL(8,2) DEFAULT 0.00, -- minutes
    
    -- Service metrics by type
    ride_4w_requests INTEGER DEFAULT 0,
    ride_2w_requests INTEGER DEFAULT 0,
    delivery_requests INTEGER DEFAULT 0,
    
    -- Performance metrics
    fulfillment_rate DECIMAL(5,2) DEFAULT 0.00,
    average_response_time DECIMAL(8,2) DEFAULT 0.00, -- seconds
    system_uptime DECIMAL(5,2) DEFAULT 100.00,
    
    -- Emergency metrics
    sos_incidents INTEGER DEFAULT 0,
    average_incident_response_time DECIMAL(8,2) DEFAULT 0.00, -- seconds
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(metric_hour, region_id)
);

-- =====================================================
-- AUDIT AND SYSTEM TABLES
-- =====================================================

-- System audit log for all critical operations
CREATE TABLE audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Event details
    event_type VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    
    -- User context
    user_id UUID,
    user_type VARCHAR(20), -- driver, operator, system, customer
    session_id UUID,
    
    -- Change tracking
    old_values JSONB,
    new_values JSONB,
    changed_fields TEXT[],
    
    -- Request context
    ip_address INET,
    user_agent TEXT,
    api_endpoint VARCHAR(200),
    request_id UUID,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    region_id UUID REFERENCES regions(id)
);

-- System health monitoring
CREATE TABLE system_health (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- System component
    component VARCHAR(50) NOT NULL,
    region_id UUID REFERENCES regions(id),
    
    -- Health metrics
    status VARCHAR(20) NOT NULL, -- healthy, warning, critical, down
    cpu_usage DECIMAL(5,2),
    memory_usage DECIMAL(5,2),
    disk_usage DECIMAL(5,2),
    response_time DECIMAL(8,2), -- milliseconds
    
    -- Custom metrics
    custom_metrics JSONB DEFAULT '{}',
    
    -- Alerts
    alert_threshold_breached BOOLEAN DEFAULT FALSE,
    alert_message TEXT,
    
    -- Metadata
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Critical indexes for sub-2-second query performance
CREATE INDEX CONCURRENTLY idx_drivers_status_region ON drivers(status, region_id) WHERE is_active = TRUE;
CREATE INDEX CONCURRENTLY idx_drivers_services ON drivers USING GIN(services);
CREATE INDEX CONCURRENTLY idx_driver_locations_driver_time ON driver_locations(driver_id, recorded_at DESC);
CREATE INDEX CONCURRENTLY idx_driver_locations_spatial ON driver_locations USING GIST(location) WHERE expires_at > NOW();
CREATE INDEX CONCURRENTLY idx_driver_locations_available ON driver_locations(is_available, driver_status) WHERE expires_at > NOW();

CREATE INDEX CONCURRENTLY idx_bookings_status_region ON bookings(status, region_id, created_at DESC);
CREATE INDEX CONCURRENTLY idx_bookings_driver_status ON bookings(driver_id, status) WHERE driver_id IS NOT NULL;
CREATE INDEX CONCURRENTLY idx_bookings_customer ON bookings(customer_id, created_at DESC);
CREATE INDEX CONCURRENTLY idx_bookings_pickup_spatial ON bookings USING GIST(pickup_location);

CREATE INDEX CONCURRENTLY idx_incidents_priority_status ON incidents(priority, status, created_at DESC);
CREATE INDEX CONCURRENTLY idx_incidents_driver ON incidents(driver_id, created_at DESC) WHERE driver_id IS NOT NULL;
CREATE INDEX CONCURRENTLY idx_incidents_region_time ON incidents(region_id, created_at DESC);

-- Performance monitoring indexes
CREATE INDEX CONCURRENTLY idx_driver_performance_driver_date ON driver_performance_daily(driver_id, performance_date DESC);
CREATE INDEX CONCURRENTLY idx_operational_metrics_region_hour ON operational_metrics_hourly(region_id, metric_hour DESC);
CREATE INDEX CONCURRENTLY idx_audit_log_entity ON audit_log(entity_type, entity_id, created_at DESC);
CREATE INDEX CONCURRENTLY idx_system_health_component ON system_health(component, recorded_at DESC);

-- =====================================================
-- FUNCTIONS AND TRIGGERS
-- =====================================================

-- Function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers to relevant tables
CREATE TRIGGER tr_drivers_updated_at BEFORE UPDATE ON drivers FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_bookings_updated_at BEFORE UPDATE ON bookings FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_incidents_updated_at BEFORE UPDATE ON incidents FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_regions_updated_at BEFORE UPDATE ON regions FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Function to clean up expired location data
CREATE OR REPLACE FUNCTION cleanup_expired_locations()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM driver_locations WHERE expires_at <= NOW();
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ language 'plpgsql';

-- =====================================================
-- VIEWS FOR COMMON QUERIES
-- =====================================================

-- Real-time driver availability view
CREATE VIEW v_available_drivers AS
SELECT 
    d.id,
    d.driver_code,
    d.first_name,
    d.last_name,
    d.services,
    d.status,
    d.rating,
    dl.location,
    dl.address,
    dl.recorded_at as last_location_update,
    r.name as region_name,
    r.code as region_code
FROM drivers d
JOIN driver_locations dl ON d.id = dl.driver_id
JOIN regions r ON dl.region_id = r.id
WHERE d.is_active = TRUE
    AND d.status = 'active'
    AND dl.is_available = TRUE
    AND dl.expires_at > NOW()
    AND dl.recorded_at > NOW() - INTERVAL '2 minutes';

-- Active booking summary view
CREATE VIEW v_active_bookings AS
SELECT 
    b.id,
    b.booking_reference,
    b.service_type,
    b.status,
    b.pickup_address,
    b.dropoff_address,
    b.driver_id,
    CONCAT(d.first_name, ' ', d.last_name) as driver_name,
    b.created_at,
    b.estimated_pickup_time,
    r.name as region_name,
    CASE 
        WHEN b.status IN ('requested', 'searching') THEN 
            EXTRACT(EPOCH FROM (NOW() - b.created_at))
        ELSE NULL
    END as wait_time_seconds
FROM bookings b
LEFT JOIN drivers d ON b.driver_id = d.id
JOIN regions r ON b.region_id = r.id
WHERE b.status NOT IN ('completed', 'cancelled', 'failed');

-- Critical incidents view for ops dashboard
CREATE VIEW v_critical_incidents AS
SELECT 
    i.id,
    i.incident_code,
    i.priority,
    i.status,
    i.title,
    i.description,
    CONCAT(d.first_name, ' ', d.last_name) as driver_name,
    i.location,
    i.address,
    r.name as region_name,
    i.created_at,
    i.acknowledged_at,
    CASE 
        WHEN i.acknowledged_at IS NULL THEN 
            EXTRACT(EPOCH FROM (NOW() - i.created_at))
        ELSE i.first_response_time
    END as response_time_seconds
FROM incidents i
LEFT JOIN drivers d ON i.driver_id = d.id
LEFT JOIN regions r ON i.region_id = r.id
WHERE i.status IN ('open', 'acknowledged', 'in_progress', 'escalated')
ORDER BY i.priority::text, i.created_at;

-- =====================================================
-- COMMENTS AND DOCUMENTATION
-- =====================================================

COMMENT ON TABLE regions IS 'Regional boundaries and LGU compliance management for Philippine operations';
COMMENT ON TABLE drivers IS 'Master driver registry supporting 10,000+ active drivers across all services';
COMMENT ON TABLE driver_locations IS 'Real-time location tracking with 30-second refresh rate - HOT data with 24h TTL';
COMMENT ON TABLE bookings IS 'Multi-service booking management for rides, deliveries, and logistics';
COMMENT ON TABLE incidents IS 'Emergency and SOS incident tracking with <60 second response requirement';
COMMENT ON TABLE driver_performance_daily IS 'Daily performance aggregations for analytics and reporting';
COMMENT ON TABLE operational_metrics_hourly IS 'System KPIs and operational health metrics by hour';
COMMENT ON TABLE audit_log IS 'Complete audit trail for all system changes and critical operations';
COMMENT ON TABLE system_health IS 'Real-time system health monitoring for 99.9% uptime requirement';