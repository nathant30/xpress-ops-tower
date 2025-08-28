-- =====================================================
-- MIGRATION 005: Ridesharing Operations Transformation
-- Professional Ridesharing Platform Schema Evolution
-- Designed for 10K+ concurrent rides with real-time optimization
-- =====================================================

-- Migration metadata
INSERT INTO schema_migrations (version, description, executed_at) VALUES 
('005', 'Ridesharing operations platform transformation', NOW());

-- =====================================================
-- PASSENGER MANAGEMENT SYSTEM
-- =====================================================

CREATE TABLE passengers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Basic Information
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE,
    profile_photo TEXT,
    
    -- Account Information
    status TEXT CHECK (status IN ('active', 'suspended', 'blocked')) DEFAULT 'active',
    rating DECIMAL(3,2) DEFAULT 5.00 CHECK (rating >= 1.00 AND rating <= 5.00),
    total_rides INTEGER DEFAULT 0,
    total_spent DECIMAL(10,2) DEFAULT 0.00,
    
    -- Preferences (JSON structure)
    preferences JSONB DEFAULT '{}',
    -- Example: {"vehicleType": "economy", "temperature": "cool", "music": false}
    
    -- Accessibility Requirements
    accessibility_requirements JSONB DEFAULT '{}',
    -- Example: {"wheelchairAccessible": true, "visualImpairment": false}
    
    -- Emergency Contact
    emergency_contact JSONB,
    -- Example: {"name": "John Doe", "phone": "+639171234567", "relationship": "spouse"}
    
    -- Payment Methods (encrypted)
    payment_methods JSONB DEFAULT '[]',
    
    -- Audit Fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_active TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Soft Delete
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- =====================================================
-- ENHANCED DRIVER MANAGEMENT
-- =====================================================

-- Add ridesharing-specific fields to existing drivers table
ALTER TABLE drivers 
    ADD COLUMN IF NOT EXISTS total_trips INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS years_experience INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS languages TEXT[] DEFAULT '{"English"}',
    ADD COLUMN IF NOT EXISTS badges JSONB DEFAULT '[]',
    ADD COLUMN IF NOT EXISTS safety_score DECIMAL(3,2) DEFAULT 5.00,
    ADD COLUMN IF NOT EXISTS driver_preferences JSONB DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS availability_schedule JSONB DEFAULT '{}';

-- Update vehicle_info structure for ridesharing
ALTER TABLE drivers 
    ALTER COLUMN vehicle_info TYPE JSONB USING vehicle_info::jsonb;

-- =====================================================
-- ACTIVE RIDES MANAGEMENT
-- =====================================================

CREATE TABLE active_rides (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id VARCHAR(50) UNIQUE NOT NULL, -- Human-readable trip ID
    
    -- Participants
    passenger_id UUID REFERENCES passengers(id) ON DELETE CASCADE,
    driver_id UUID REFERENCES drivers(id) ON DELETE SET NULL,
    
    -- Location Information
    pickup_location POINT NOT NULL,
    pickup_address TEXT NOT NULL,
    pickup_landmark TEXT,
    pickup_instructions TEXT,
    
    destination_location POINT,
    destination_address TEXT,
    destination_landmark TEXT,
    destination_instructions TEXT,
    
    -- Ride Details
    ride_type TEXT CHECK (ride_type IN ('economy', 'premium', 'luxury', 'suv', 'van', 'motorcycle', 'electric', 'hybrid')) DEFAULT 'economy',
    status TEXT CHECK (status IN ('searching', 'assigned', 'pickup', 'in-progress', 'completed', 'cancelled', 'driver_en_route', 'driver_arrived', 'passenger_pickup', 'ride_started', 'near_destination')) DEFAULT 'searching',
    
    -- Timing
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    assigned_at TIMESTAMP WITH TIME ZONE,
    pickup_eta TIMESTAMP WITH TIME ZONE,
    actual_pickup_time TIMESTAMP WITH TIME ZONE,
    estimated_arrival TIMESTAMP WITH TIME ZONE,
    actual_arrival_time TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    
    -- Route and Distance
    estimated_distance DECIMAL(8,2), -- kilometers
    actual_distance DECIMAL(8,2),
    estimated_duration INTEGER, -- minutes
    actual_duration INTEGER,
    route_polyline TEXT, -- Encoded polyline
    
    -- Pricing
    base_fare DECIMAL(10,2),
    distance_fare DECIMAL(10,2),
    time_fare DECIMAL(10,2),
    surge_multiplier DECIMAL(4,2) DEFAULT 1.00,
    surge_fare DECIMAL(10,2) DEFAULT 0.00,
    tolls DECIMAL(10,2) DEFAULT 0.00,
    taxes DECIMAL(10,2) DEFAULT 0.00,
    discounts DECIMAL(10,2) DEFAULT 0.00,
    tips DECIMAL(10,2) DEFAULT 0.00,
    total_fare DECIMAL(10,2),
    currency VARCHAR(3) DEFAULT 'PHP',
    
    -- Special Requirements
    special_requirements JSONB DEFAULT '[]',
    -- Example: [{"type": "wheelchair", "description": "Need wheelchair accessible vehicle"}]
    
    -- Regional Information
    region_id UUID REFERENCES regions(id),
    
    -- Real-time Updates
    real_time_updates JSONB DEFAULT '[]',
    last_location_update TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ratings
    passenger_rating DECIMAL(3,2) CHECK (passenger_rating >= 1.00 AND passenger_rating <= 5.00),
    driver_rating DECIMAL(3,2) CHECK (driver_rating >= 1.00 AND driver_rating <= 5.00),
    passenger_feedback TEXT,
    driver_feedback TEXT,
    
    -- Audit Fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- DEMAND HOTSPOT ANALYTICS
-- =====================================================

CREATE TABLE demand_hotspots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Location Information
    area_name VARCHAR(255) NOT NULL,
    center_point POINT NOT NULL,
    boundary POLYGON,
    radius_meters INTEGER DEFAULT 1000,
    
    -- Demand Metrics
    demand_level TEXT CHECK (demand_level IN ('Low', 'Medium', 'High', 'Very High', 'Critical')) DEFAULT 'Low',
    available_drivers INTEGER DEFAULT 0,
    average_eta_minutes INTEGER DEFAULT 0,
    current_rides INTEGER DEFAULT 0,
    pending_requests INTEGER DEFAULT 0,
    
    -- Surge Information
    surge_multiplier DECIMAL(4,2) DEFAULT 1.00,
    surge_active BOOLEAN DEFAULT false,
    surge_reason TEXT,
    
    -- Regional Assignment
    region_id UUID REFERENCES regions(id),
    
    -- Historical Analytics
    historical_data JSONB DEFAULT '{}',
    -- Example: {"averageWeeklyDemand": 150, "peakHours": [...], "seasonalTrends": [...]}
    
    -- Predictions
    predictions JSONB DEFAULT '[]',
    -- Example: [{"timeWindow": "2025-08-28T15:00:00Z", "predictedDemand": 200, "confidence": 0.85}]
    
    -- Status and Timing
    status TEXT CHECK (status IN ('active', 'inactive', 'monitoring')) DEFAULT 'active',
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Spatial Indexing
    CONSTRAINT valid_boundary CHECK (ST_IsValid(boundary))
);

-- =====================================================
-- DYNAMIC SURGE PRICING
-- =====================================================

CREATE TABLE surge_pricing (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Location Definition
    area_name VARCHAR(255) NOT NULL,
    coordinates POLYGON NOT NULL, -- Surge area boundary
    center_point POINT NOT NULL,
    
    -- Pricing Information
    multiplier DECIMAL(4,2) NOT NULL CHECK (multiplier >= 1.00 AND multiplier <= 10.00),
    start_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    end_time TIMESTAMP WITH TIME ZONE,
    estimated_duration_minutes INTEGER,
    
    -- Trigger Information
    reason TEXT CHECK (reason IN ('high_demand', 'low_supply', 'weather', 'event', 'rush_hour', 'airport_queue', 'manual')) NOT NULL,
    demand_level TEXT CHECK (demand_level IN ('Low', 'Medium', 'High', 'Very High', 'Critical')),
    
    -- Current Metrics
    available_drivers INTEGER DEFAULT 0,
    active_rides INTEGER DEFAULT 0,
    pending_requests INTEGER DEFAULT 0,
    
    -- Control Flags
    automatic_adjustment BOOLEAN DEFAULT true,
    manual_override BOOLEAN DEFAULT false,
    override_reason TEXT,
    
    -- Regional Assignment
    region_id UUID REFERENCES regions(id),
    
    -- Performance Tracking
    driver_attraction_rate DECIMAL(4,3) DEFAULT 0.000, -- 0-1 scale
    revenue_impact DECIMAL(12,2) DEFAULT 0.00,
    ride_completion_rate DECIMAL(4,3) DEFAULT 1.000,
    
    -- History and Analytics
    history JSONB DEFAULT '[]',
    -- Example: [{"timestamp": "...", "multiplier": 1.5, "trigger": "high_demand", "effectiveness": 0.75}]
    
    -- Status
    status TEXT CHECK (status IN ('active', 'expired', 'cancelled', 'completed')) DEFAULT 'active',
    
    -- Audit Fields
    created_by VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Spatial Constraints
    CONSTRAINT valid_surge_area CHECK (ST_IsValid(coordinates))
);

-- =====================================================
-- RIDE REQUESTS AND MATCHING
-- =====================================================

CREATE TABLE ride_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id VARCHAR(50) UNIQUE NOT NULL, -- Human-readable request ID
    
    -- Passenger Information
    passenger_id UUID REFERENCES passengers(id) ON DELETE CASCADE,
    
    -- Location Requirements
    pickup_location POINT NOT NULL,
    pickup_address TEXT NOT NULL,
    pickup_landmark TEXT,
    pickup_instructions TEXT,
    
    destination_location POINT,
    destination_address TEXT,
    destination_landmark TEXT,
    destination_instructions TEXT,
    
    -- Ride Requirements
    ride_type TEXT CHECK (ride_type IN ('economy', 'premium', 'luxury', 'shared', 'xl', 'pet_friendly')) DEFAULT 'economy',
    urgency TEXT CHECK (urgency IN ('standard', 'priority', 'emergency')) DEFAULT 'standard',
    passenger_count INTEGER DEFAULT 1 CHECK (passenger_count > 0 AND passenger_count <= 8),
    
    -- Special Requirements
    special_requirements JSONB DEFAULT '[]',
    accessibility_required BOOLEAN DEFAULT false,
    
    -- Scheduling
    scheduled_time TIMESTAMP WITH TIME ZONE, -- NULL for immediate rides
    
    -- Matching Criteria
    max_wait_minutes INTEGER DEFAULT 10,
    search_radius_meters INTEGER DEFAULT 3000,
    min_driver_rating DECIMAL(3,2) DEFAULT 4.0,
    preferred_drivers TEXT[], -- Array of driver IDs
    excluded_drivers TEXT[], -- Array of driver IDs to exclude
    
    -- Price Information
    price_estimate_min DECIMAL(10,2),
    price_estimate_max DECIMAL(10,2),
    surge_acknowledged BOOLEAN DEFAULT false,
    max_surge_accepted DECIMAL(4,2) DEFAULT 2.00,
    
    -- Status Tracking
    status TEXT CHECK (status IN ('searching', 'driver_found', 'assignment_pending', 'assigned', 'expired', 'cancelled')) DEFAULT 'searching',
    search_attempts INTEGER DEFAULT 0,
    drivers_notified INTEGER DEFAULT 0,
    timeout_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '10 minutes'),
    
    -- Assignment Information
    assigned_driver_id UUID REFERENCES drivers(id) ON DELETE SET NULL,
    assigned_at TIMESTAMP WITH TIME ZONE,
    ride_id UUID REFERENCES active_rides(id) ON DELETE SET NULL,
    
    -- Regional Information
    region_id UUID REFERENCES regions(id),
    
    -- Analytics
    search_history JSONB DEFAULT '[]',
    -- Example: [{"attempt": 1, "driversFound": 5, "responses": [...], "result": "success"}]
    
    -- Cancellation Information
    cancelled_at TIMESTAMP WITH TIME ZONE,
    cancellation_reason TEXT,
    cancelled_by TEXT CHECK (cancelled_by IN ('passenger', 'system', 'timeout')),
    
    -- Audit Fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- DRIVER PERFORMANCE METRICS
-- =====================================================

CREATE TABLE driver_performance_daily (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_id UUID REFERENCES drivers(id) ON DELETE CASCADE,
    performance_date DATE NOT NULL,
    region_id UUID REFERENCES regions(id),
    
    -- Trip Metrics
    total_requests INTEGER DEFAULT 0,
    accepted_requests INTEGER DEFAULT 0,
    completed_trips INTEGER DEFAULT 0,
    cancelled_trips INTEGER DEFAULT 0,
    no_shows INTEGER DEFAULT 0,
    
    -- Rate Calculations
    acceptance_rate DECIMAL(5,4) DEFAULT 0.0000, -- 0-1 scale
    completion_rate DECIMAL(5,4) DEFAULT 0.0000,
    cancellation_rate DECIMAL(5,4) DEFAULT 0.0000,
    
    -- Time Metrics (in minutes)
    online_minutes INTEGER DEFAULT 0,
    driving_minutes INTEGER DEFAULT 0,
    idle_minutes INTEGER DEFAULT 0,
    break_minutes INTEGER DEFAULT 0,
    
    -- Financial Metrics
    gross_earnings DECIMAL(12,2) DEFAULT 0.00,
    net_earnings DECIMAL(12,2) DEFAULT 0.00,
    tips_received DECIMAL(10,2) DEFAULT 0.00,
    bonuses_earned DECIMAL(10,2) DEFAULT 0.00,
    incentives_earned DECIMAL(10,2) DEFAULT 0.00,
    
    -- Distance Metrics (in kilometers)
    total_distance DECIMAL(10,2) DEFAULT 0.00,
    billable_distance DECIMAL(10,2) DEFAULT 0.00,
    empty_miles DECIMAL(10,2) DEFAULT 0.00,
    
    -- Quality Metrics
    average_rating DECIMAL(3,2),
    customer_complaints INTEGER DEFAULT 0,
    safety_incidents INTEGER DEFAULT 0,
    vehicle_issues INTEGER DEFAULT 0,
    
    -- Efficiency Metrics
    average_pickup_time INTEGER DEFAULT 0, -- minutes
    average_trip_time INTEGER DEFAULT 0,
    utilization_rate DECIMAL(5,4) DEFAULT 0.0000, -- driving_time / online_time
    
    -- Streaks and Badges
    consecutive_good_ratings INTEGER DEFAULT 0,
    perfect_weeks INTEGER DEFAULT 0,
    badges_earned JSONB DEFAULT '[]',
    
    -- Regional Performance
    top_areas JSONB DEFAULT '[]', -- Areas where driver performed best
    peak_hours JSONB DEFAULT '[]', -- Most productive hours
    
    -- Audit Fields
    calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(driver_id, performance_date)
);

-- =====================================================
-- RIDESHARING KPI TRACKING
-- =====================================================

CREATE TABLE ridesharing_kpis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Time and Region
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    period TEXT CHECK (period IN ('realtime', 'hourly', 'daily', 'weekly', 'monthly')) NOT NULL,
    region_id UUID REFERENCES regions(id),
    
    -- Ride Metrics
    total_rides INTEGER DEFAULT 0,
    completed_rides INTEGER DEFAULT 0,
    cancelled_rides INTEGER DEFAULT 0,
    completion_rate DECIMAL(5,4) DEFAULT 0.0000,
    
    -- Driver Metrics
    active_drivers INTEGER DEFAULT 0,
    online_drivers INTEGER DEFAULT 0,
    utilization_rate DECIMAL(5,4) DEFAULT 0.0000,
    average_earnings_per_driver DECIMAL(10,2) DEFAULT 0.00,
    
    -- Passenger Metrics
    total_passengers INTEGER DEFAULT 0,
    new_passengers INTEGER DEFAULT 0,
    repeat_passengers INTEGER DEFAULT 0,
    average_wait_time INTEGER DEFAULT 0, -- minutes
    
    -- Financial Metrics
    gross_revenue DECIMAL(15,2) DEFAULT 0.00,
    net_revenue DECIMAL(15,2) DEFAULT 0.00,
    average_fare_per_ride DECIMAL(10,2) DEFAULT 0.00,
    surge_revenue DECIMAL(12,2) DEFAULT 0.00,
    
    -- Service Quality
    average_rating DECIMAL(3,2) DEFAULT 5.00,
    passenger_rating DECIMAL(3,2) DEFAULT 5.00,
    driver_rating DECIMAL(3,2) DEFAULT 5.00,
    complaints INTEGER DEFAULT 0,
    
    -- Efficiency Metrics
    average_pickup_time INTEGER DEFAULT 0, -- minutes
    average_ride_time INTEGER DEFAULT 0,
    average_distance DECIMAL(8,2) DEFAULT 0.00, -- kilometers
    route_efficiency DECIMAL(5,4) DEFAULT 1.0000, -- actual vs optimal
    
    -- Safety and Incidents
    safety_incidents INTEGER DEFAULT 0,
    emergency_alerts INTEGER DEFAULT 0,
    accident_reports INTEGER DEFAULT 0,
    
    -- Supply and Demand
    supply_demand_ratio DECIMAL(5,4) DEFAULT 1.0000,
    surge_periods INTEGER DEFAULT 0,
    average_surge_multiplier DECIMAL(4,2) DEFAULT 1.00,
    demand_fulfillment_rate DECIMAL(5,4) DEFAULT 1.0000,
    
    -- Service Availability
    service_availability DECIMAL(5,4) DEFAULT 1.0000, -- 0-1 scale
    average_eta_minutes INTEGER DEFAULT 0,
    first_attempt_success_rate DECIMAL(5,4) DEFAULT 1.0000,
    
    -- Predictions and ML
    predicted_demand INTEGER DEFAULT 0,
    prediction_accuracy DECIMAL(5,4) DEFAULT 0.0000,
    ml_model_version VARCHAR(50),
    
    -- Audit Fields
    calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    data_sources JSONB DEFAULT '[]', -- Track where data came from
    
    -- Constraints for uniqueness
    UNIQUE(period, region_id, timestamp) 
        WHERE region_id IS NOT NULL,
    UNIQUE(period, timestamp) 
        WHERE region_id IS NULL
);

-- =====================================================
-- ENHANCED INCIDENT MANAGEMENT FOR RIDESHARING
-- =====================================================

CREATE TABLE ridesharing_incidents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    incident_id VARCHAR(50) UNIQUE NOT NULL, -- Human-readable ID
    
    -- Incident Classification
    type TEXT CHECK (type IN ('safety', 'security', 'medical', 'vehicle', 'service', 'fraud', 'harassment')) NOT NULL,
    category TEXT CHECK (category IN ('accident', 'emergency', 'harassment', 'fraud', 'vehicle_issue', 'route_problem', 'payment_issue', 'service_complaint')) NOT NULL,
    subcategory TEXT,
    severity TEXT CHECK (severity IN ('low', 'medium', 'high', 'critical', 'emergency')) NOT NULL,
    
    -- Involved Parties
    ride_id UUID REFERENCES active_rides(id) ON DELETE SET NULL,
    passenger_id UUID REFERENCES passengers(id) ON DELETE SET NULL,
    driver_id UUID REFERENCES drivers(id) ON DELETE SET NULL,
    
    -- Reporter Information
    reported_by_type TEXT CHECK (reported_by_type IN ('driver', 'passenger', 'system', 'third_party')) NOT NULL,
    reported_by_id VARCHAR(255) NOT NULL,
    reporter_contact TEXT,
    reporter_credibility DECIMAL(3,2) DEFAULT 5.00,
    
    -- Location and Context
    location POINT,
    address TEXT,
    region_id UUID REFERENCES regions(id),
    
    -- Incident Details
    title VARCHAR(500) NOT NULL,
    description TEXT NOT NULL,
    tags TEXT[] DEFAULT '{}',
    
    -- Response Tracking
    status TEXT CHECK (status IN ('reported', 'acknowledged', 'investigating', 'escalated', 'resolved', 'closed')) DEFAULT 'reported',
    priority TEXT CHECK (priority IN ('low', 'medium', 'high', 'critical', 'urgent')) NOT NULL,
    
    -- Response Times (in seconds)
    response_time INTEGER, -- Time to first response
    resolution_time INTEGER, -- Time to resolution
    target_response_time INTEGER DEFAULT 300, -- 5 minutes default
    
    -- Assignment and Escalation
    assigned_to VARCHAR(255),
    escalated_at TIMESTAMP WITH TIME ZONE,
    escalated_to VARCHAR(255),
    escalation_reason TEXT,
    
    -- Documentation
    evidence JSONB DEFAULT '[]',
    -- Example: [{"type": "photo", "url": "...", "uploadedBy": "...", "verified": true}]
    
    statements JSONB DEFAULT '[]',
    -- Example: [{"providedBy": "driver123", "role": "driver", "statement": "...", "verified": true}]
    
    -- Legal and Insurance
    legal_case BOOLEAN DEFAULT false,
    insurance_claim VARCHAR(255),
    police_report_number VARCHAR(255),
    external_reference VARCHAR(255),
    
    -- Resolution
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by VARCHAR(255),
    resolution_summary TEXT,
    
    -- Follow-up
    follow_up_required BOOLEAN DEFAULT false,
    follow_up_actions JSONB DEFAULT '[]',
    follow_up_date TIMESTAMP WITH TIME ZONE,
    
    -- Impact Assessment
    service_impact TEXT CHECK (service_impact IN ('none', 'minimal', 'moderate', 'significant', 'severe')),
    financial_impact DECIMAL(12,2) DEFAULT 0.00,
    reputation_impact INTEGER DEFAULT 0 CHECK (reputation_impact >= -10 AND reputation_impact <= 10),
    
    -- Audit Fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    acknowledged_by VARCHAR(255)
);

-- =====================================================
-- REAL-TIME LOCATION TRACKING OPTIMIZATION
-- =====================================================

-- Enhance existing driver_locations table for ridesharing
ALTER TABLE driver_locations 
    ADD COLUMN IF NOT EXISTS speed_kmh DECIMAL(5,2) DEFAULT 0.00,
    ADD COLUMN IF NOT EXISTS heading INTEGER CHECK (heading >= 0 AND heading <= 360),
    ADD COLUMN IF NOT EXISTS in_ride BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS ride_id UUID REFERENCES active_rides(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS passenger_count INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS destination_eta INTEGER, -- minutes to destination
    ADD COLUMN IF NOT EXISTS battery_level INTEGER CHECK (battery_level >= 0 AND battery_level <= 100),
    ADD COLUMN IF NOT EXISTS signal_strength INTEGER CHECK (signal_strength >= 0 AND signal_strength <= 100);

-- Create location history partitioned table for analytics
CREATE TABLE driver_location_history (
    id UUID DEFAULT gen_random_uuid(),
    driver_id UUID NOT NULL,
    location POINT NOT NULL,
    accuracy DECIMAL(8,2),
    speed_kmh DECIMAL(5,2),
    heading INTEGER,
    in_ride BOOLEAN DEFAULT false,
    ride_id UUID,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- Partition key
    recorded_date DATE NOT NULL DEFAULT CURRENT_DATE,
    
    PRIMARY KEY (id, recorded_date)
) PARTITION BY RANGE (recorded_date);

-- Create partitions for current and next month
CREATE TABLE driver_location_history_current 
    PARTITION OF driver_location_history
    FOR VALUES FROM (CURRENT_DATE) TO (CURRENT_DATE + INTERVAL '1 month');

CREATE TABLE driver_location_history_next 
    PARTITION OF driver_location_history
    FOR VALUES FROM (CURRENT_DATE + INTERVAL '1 month') TO (CURRENT_DATE + INTERVAL '2 months');

-- =====================================================
-- INDEXES FOR HIGH-PERFORMANCE QUERIES
-- =====================================================

-- Passenger indexes
CREATE INDEX idx_passengers_phone ON passengers(phone);
CREATE INDEX idx_passengers_status ON passengers(status) WHERE status = 'active';
CREATE INDEX idx_passengers_rating ON passengers(rating DESC);

-- Active rides indexes (critical for real-time operations)
CREATE INDEX idx_active_rides_status ON active_rides(status) WHERE status IN ('searching', 'assigned', 'pickup', 'in-progress');
CREATE INDEX idx_active_rides_driver ON active_rides(driver_id) WHERE driver_id IS NOT NULL;
CREATE INDEX idx_active_rides_passenger ON active_rides(passenger_id);
CREATE INDEX idx_active_rides_region ON active_rides(region_id);
CREATE INDEX idx_active_rides_pickup_location ON active_rides USING GIST(pickup_location);
CREATE INDEX idx_active_rides_destination_location ON active_rides USING GIST(destination_location) WHERE destination_location IS NOT NULL;
CREATE INDEX idx_active_rides_requested_at ON active_rides(requested_at DESC);
CREATE INDEX idx_active_rides_trip_id ON active_rides(trip_id);

-- Demand hotspots spatial indexes
CREATE INDEX idx_demand_hotspots_center ON demand_hotspots USING GIST(center_point);
CREATE INDEX idx_demand_hotspots_boundary ON demand_hotspots USING GIST(boundary) WHERE boundary IS NOT NULL;
CREATE INDEX idx_demand_hotspots_region ON demand_hotspots(region_id);
CREATE INDEX idx_demand_hotspots_demand_level ON demand_hotspots(demand_level) WHERE demand_level IN ('High', 'Very High', 'Critical');
CREATE INDEX idx_demand_hotspots_surge ON demand_hotspots(surge_active) WHERE surge_active = true;

-- Surge pricing indexes
CREATE INDEX idx_surge_pricing_area ON surge_pricing USING GIST(coordinates);
CREATE INDEX idx_surge_pricing_active ON surge_pricing(status) WHERE status = 'active';
CREATE INDEX idx_surge_pricing_region ON surge_pricing(region_id);
CREATE INDEX idx_surge_pricing_multiplier ON surge_pricing(multiplier DESC) WHERE status = 'active';
CREATE INDEX idx_surge_pricing_time ON surge_pricing(start_time, end_time);

-- Ride requests indexes (critical for matching)
CREATE INDEX idx_ride_requests_status ON ride_requests(status) WHERE status IN ('searching', 'driver_found', 'assignment_pending');
CREATE INDEX idx_ride_requests_pickup_location ON ride_requests USING GIST(pickup_location);
CREATE INDEX idx_ride_requests_region ON ride_requests(region_id);
CREATE INDEX idx_ride_requests_scheduled ON ride_requests(scheduled_time) WHERE scheduled_time IS NOT NULL;
CREATE INDEX idx_ride_requests_timeout ON ride_requests(timeout_at) WHERE status IN ('searching', 'driver_found');
CREATE INDEX idx_ride_requests_created_at ON ride_requests(created_at DESC);

-- Driver performance indexes
CREATE INDEX idx_driver_performance_driver_date ON driver_performance_daily(driver_id, performance_date DESC);
CREATE INDEX idx_driver_performance_region_date ON driver_performance_daily(region_id, performance_date DESC);
CREATE INDEX idx_driver_performance_rating ON driver_performance_daily(average_rating DESC) WHERE average_rating IS NOT NULL;
CREATE INDEX idx_driver_performance_earnings ON driver_performance_daily(gross_earnings DESC);

-- KPI indexes for dashboard queries
CREATE INDEX idx_ridesharing_kpis_period_region ON ridesharing_kpis(period, region_id, timestamp DESC);
CREATE INDEX idx_ridesharing_kpis_timestamp ON ridesharing_kpis(timestamp DESC);
CREATE INDEX idx_ridesharing_kpis_region ON ridesharing_kpis(region_id) WHERE region_id IS NOT NULL;

-- Incident indexes for emergency response
CREATE INDEX idx_ridesharing_incidents_status ON ridesharing_incidents(status) WHERE status IN ('reported', 'acknowledged', 'investigating');
CREATE INDEX idx_ridesharing_incidents_severity ON ridesharing_incidents(severity) WHERE severity IN ('critical', 'emergency');
CREATE INDEX idx_ridesharing_incidents_priority ON ridesharing_incidents(priority) WHERE priority IN ('critical', 'urgent');
CREATE INDEX idx_ridesharing_incidents_location ON ridesharing_incidents USING GIST(location) WHERE location IS NOT NULL;
CREATE INDEX idx_ridesharing_incidents_created_at ON ridesharing_incidents(created_at DESC);
CREATE INDEX idx_ridesharing_incidents_ride ON ridesharing_incidents(ride_id) WHERE ride_id IS NOT NULL;

-- Enhanced location tracking indexes
CREATE INDEX idx_driver_locations_updated ON driver_locations(driver_id, updated_at DESC);
CREATE INDEX idx_driver_locations_region ON driver_locations(region_id);
CREATE INDEX idx_driver_locations_in_ride ON driver_locations(in_ride) WHERE in_ride = true;
CREATE INDEX idx_driver_locations_ride ON driver_locations(ride_id) WHERE ride_id IS NOT NULL;

-- Location history indexes (for analytics)
CREATE INDEX idx_driver_location_history_driver_time ON driver_location_history(driver_id, timestamp DESC);
CREATE INDEX idx_driver_location_history_ride ON driver_location_history(ride_id) WHERE ride_id IS NOT NULL;

-- =====================================================
-- REAL-TIME TRIGGERS AND FUNCTIONS
-- =====================================================

-- Function to update ride status and metrics
CREATE OR REPLACE FUNCTION update_ride_metrics()
RETURNS TRIGGER AS $$
BEGIN
    -- Update driver status when ride status changes
    IF NEW.status != OLD.status THEN
        -- Update driver status based on ride status
        IF NEW.status = 'assigned' AND NEW.driver_id IS NOT NULL THEN
            UPDATE drivers 
            SET status = 'busy' 
            WHERE id = NEW.driver_id;
        ELSIF NEW.status = 'completed' AND NEW.driver_id IS NOT NULL THEN
            UPDATE drivers 
            SET status = 'available', 
                total_trips = total_trips + 1
            WHERE id = NEW.driver_id;
            
            -- Update passenger trip count
            UPDATE passengers 
            SET total_rides = total_rides + 1
            WHERE id = NEW.passenger_id;
        END IF;
        
        -- Add real-time update entry
        NEW.real_time_updates = NEW.real_time_updates || 
            jsonb_build_object(
                'timestamp', NOW(),
                'type', 'status_change',
                'oldStatus', OLD.status,
                'newStatus', NEW.status,
                'location', ST_AsGeoJSON(ST_Transform(NEW.pickup_location, 4326))::jsonb
            );
    END IF;
    
    -- Update timestamp
    NEW.updated_at = NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for active rides updates
CREATE TRIGGER trigger_update_ride_metrics
    BEFORE UPDATE ON active_rides
    FOR EACH ROW
    EXECUTE FUNCTION update_ride_metrics();

-- Function to automatically update demand hotspots
CREATE OR REPLACE FUNCTION update_demand_hotspot()
RETURNS TRIGGER AS $$
DECLARE
    hotspot_id UUID;
    driver_count INTEGER;
    pending_count INTEGER;
    avg_eta INTEGER;
BEGIN
    -- Find relevant hotspot based on pickup location
    SELECT id INTO hotspot_id
    FROM demand_hotspots
    WHERE ST_DWithin(center_point, NEW.pickup_location, radius_meters)
    AND status = 'active'
    ORDER BY ST_Distance(center_point, NEW.pickup_location)
    LIMIT 1;
    
    IF hotspot_id IS NOT NULL THEN
        -- Count available drivers in area
        SELECT COUNT(*) INTO driver_count
        FROM driver_locations dl
        JOIN drivers d ON d.id = dl.driver_id
        WHERE ST_DWithin(dl.location, NEW.pickup_location, 3000)
        AND d.status = 'available'
        AND dl.updated_at > NOW() - INTERVAL '5 minutes';
        
        -- Count pending ride requests in area
        SELECT COUNT(*) INTO pending_count
        FROM ride_requests
        WHERE ST_DWithin(pickup_location, NEW.pickup_location, 1000)
        AND status = 'searching'
        AND created_at > NOW() - INTERVAL '30 minutes';
        
        -- Calculate average ETA (simplified)
        avg_eta := CASE 
            WHEN driver_count > 0 THEN LEAST(driver_count * 2, 15)
            ELSE 30
        END;
        
        -- Update hotspot
        UPDATE demand_hotspots
        SET available_drivers = driver_count,
            pending_requests = pending_count,
            average_eta_minutes = avg_eta,
            current_rides = (
                SELECT COUNT(*) 
                FROM active_rides 
                WHERE ST_DWithin(pickup_location, NEW.pickup_location, 1000)
                AND status IN ('assigned', 'pickup', 'in-progress')
            ),
            demand_level = CASE
                WHEN pending_count > driver_count * 2 THEN 'Critical'
                WHEN pending_count > driver_count THEN 'Very High'
                WHEN pending_count * 2 > driver_count THEN 'High'
                WHEN pending_count > 0 THEN 'Medium'
                ELSE 'Low'
            END,
            last_updated = NOW()
        WHERE id = hotspot_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for ride request hotspot updates
CREATE TRIGGER trigger_update_demand_hotspot
    AFTER INSERT OR UPDATE ON ride_requests
    FOR EACH ROW
    WHEN (NEW.status = 'searching')
    EXECUTE FUNCTION update_demand_hotspot();

-- =====================================================
-- VIEWS FOR DASHBOARD AND ANALYTICS
-- =====================================================

-- Real-time dashboard view
CREATE VIEW ridesharing_dashboard AS
SELECT 
    r.id as region_id,
    r.name as region_name,
    
    -- Current Active Metrics
    COUNT(CASE WHEN ar.status IN ('searching', 'assigned', 'pickup', 'in-progress') THEN 1 END) as active_rides,
    COUNT(CASE WHEN ar.status = 'searching' THEN 1 END) as pending_requests,
    COUNT(CASE WHEN d.status = 'available' THEN 1 END) as available_drivers,
    COUNT(CASE WHEN d.status = 'busy' THEN 1 END) as busy_drivers,
    
    -- Average Wait Time (last hour)
    AVG(EXTRACT(EPOCH FROM (ar.assigned_at - ar.requested_at))/60) 
        FILTER (WHERE ar.assigned_at IS NOT NULL AND ar.requested_at > NOW() - INTERVAL '1 hour') as avg_wait_minutes,
    
    -- Surge Information
    COUNT(CASE WHEN sp.status = 'active' THEN 1 END) as active_surge_areas,
    AVG(sp.multiplier) FILTER (WHERE sp.status = 'active') as avg_surge_multiplier,
    
    -- Demand Hotspots
    COUNT(CASE WHEN dh.demand_level IN ('High', 'Very High', 'Critical') THEN 1 END) as high_demand_areas,
    
    -- Recent Performance (last hour)
    COUNT(CASE WHEN ar.status = 'completed' AND ar.completed_at > NOW() - INTERVAL '1 hour' THEN 1 END) as completed_rides_hour,
    COUNT(CASE WHEN ar.status = 'cancelled' AND ar.created_at > NOW() - INTERVAL '1 hour' THEN 1 END) as cancelled_rides_hour,
    
    -- Safety
    COUNT(CASE WHEN ri.severity IN ('critical', 'emergency') AND ri.created_at > NOW() - INTERVAL '1 hour' THEN 1 END) as critical_incidents_hour,
    
    -- Last Updated
    NOW() as last_updated
    
FROM regions r
LEFT JOIN active_rides ar ON ar.region_id = r.id
LEFT JOIN drivers d ON d.region_id = r.id AND d.is_active = true
LEFT JOIN surge_pricing sp ON sp.region_id = r.id
LEFT JOIN demand_hotspots dh ON dh.region_id = r.id AND dh.status = 'active'
LEFT JOIN ridesharing_incidents ri ON ri.region_id = r.id
WHERE r.is_active = true
GROUP BY r.id, r.name
ORDER BY r.name;

-- Driver performance summary view
CREATE VIEW driver_performance_summary AS
SELECT 
    d.id as driver_id,
    d.first_name || ' ' || d.last_name as driver_name,
    d.rating as current_rating,
    d.status,
    d.region_id,
    r.name as region_name,
    
    -- Recent Performance (last 7 days)
    AVG(dp.acceptance_rate) as avg_acceptance_rate,
    AVG(dp.completion_rate) as avg_completion_rate,
    AVG(dp.average_rating) as avg_customer_rating,
    SUM(dp.completed_trips) as total_trips_week,
    SUM(dp.gross_earnings) as total_earnings_week,
    AVG(dp.utilization_rate) as avg_utilization,
    
    -- Today's Performance
    COALESCE(dp_today.completed_trips, 0) as trips_today,
    COALESCE(dp_today.gross_earnings, 0) as earnings_today,
    COALESCE(dp_today.online_minutes, 0) as minutes_online_today,
    
    -- Rankings (within region)
    RANK() OVER (PARTITION BY d.region_id ORDER BY AVG(dp.gross_earnings) DESC) as earnings_rank,
    RANK() OVER (PARTITION BY d.region_id ORDER BY AVG(dp.average_rating) DESC NULLS LAST) as rating_rank,
    RANK() OVER (PARTITION BY d.region_id ORDER BY SUM(dp.completed_trips) DESC) as trips_rank,
    
    -- Last Activity
    dl.updated_at as last_location_update,
    dp_latest.performance_date as last_performance_date
    
FROM drivers d
JOIN regions r ON r.id = d.region_id
LEFT JOIN driver_performance_daily dp ON dp.driver_id = d.id 
    AND dp.performance_date >= CURRENT_DATE - INTERVAL '7 days'
LEFT JOIN driver_performance_daily dp_today ON dp_today.driver_id = d.id 
    AND dp_today.performance_date = CURRENT_DATE
LEFT JOIN driver_performance_daily dp_latest ON dp_latest.driver_id = d.id 
    AND dp_latest.performance_date = (
        SELECT MAX(performance_date) 
        FROM driver_performance_daily 
        WHERE driver_id = d.id
    )
LEFT JOIN driver_locations dl ON dl.driver_id = d.id
WHERE d.is_active = true
GROUP BY d.id, d.first_name, d.last_name, d.rating, d.status, d.region_id, r.name,
         dp_today.completed_trips, dp_today.gross_earnings, dp_today.online_minutes,
         dl.updated_at, dp_latest.performance_date;

-- =====================================================
-- DATA RETENTION AND CLEANUP POLICIES
-- =====================================================

-- Function to cleanup old location history (keep 90 days)
CREATE OR REPLACE FUNCTION cleanup_location_history()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM driver_location_history 
    WHERE recorded_date < CURRENT_DATE - INTERVAL '90 days';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Log the cleanup
    INSERT INTO system_logs (level, message, metadata, created_at)
    VALUES ('INFO', 'Location history cleanup completed', 
            jsonb_build_object('deletedRecords', deleted_count), NOW());
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to archive completed rides (move to archive table after 1 year)
CREATE OR REPLACE FUNCTION archive_completed_rides()
RETURNS INTEGER AS $$
DECLARE
    archived_count INTEGER;
BEGIN
    -- Create archive table if it doesn't exist
    CREATE TABLE IF NOT EXISTS active_rides_archive (LIKE active_rides INCLUDING ALL);
    
    -- Move old completed rides to archive
    WITH moved_rides AS (
        DELETE FROM active_rides 
        WHERE status IN ('completed', 'cancelled')
        AND completed_at < CURRENT_DATE - INTERVAL '1 year'
        RETURNING *
    )
    INSERT INTO active_rides_archive SELECT * FROM moved_rides;
    
    GET DIAGNOSTICS archived_count = ROW_COUNT;
    
    -- Log the archival
    INSERT INTO system_logs (level, message, metadata, created_at)
    VALUES ('INFO', 'Ride archival completed', 
            jsonb_build_object('archivedRides', archived_count), NOW());
    
    RETURN archived_count;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- PERMISSIONS AND SECURITY
-- =====================================================

-- Grant permissions to existing roles
GRANT SELECT, INSERT, UPDATE ON passengers TO ops_api;
GRANT SELECT, INSERT, UPDATE, DELETE ON active_rides TO ops_api;
GRANT SELECT, INSERT, UPDATE ON demand_hotspots TO ops_api;
GRANT SELECT, INSERT, UPDATE, DELETE ON surge_pricing TO ops_api;
GRANT SELECT, INSERT, UPDATE, DELETE ON ride_requests TO ops_api;
GRANT SELECT, INSERT ON driver_performance_daily TO ops_api;
GRANT SELECT, INSERT ON ridesharing_kpis TO ops_api;
GRANT SELECT, INSERT, UPDATE ON ridesharing_incidents TO ops_api;
GRANT SELECT, INSERT ON driver_location_history TO ops_api;

-- Grant view access
GRANT SELECT ON ridesharing_dashboard TO ops_operator, ops_viewer;
GRANT SELECT ON driver_performance_summary TO ops_operator, ops_viewer;

-- Row Level Security policies
ALTER TABLE passengers ENABLE ROW LEVEL SECURITY;
ALTER TABLE active_rides ENABLE ROW LEVEL SECURITY;
ALTER TABLE ride_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE ridesharing_incidents ENABLE ROW LEVEL SECURITY;

-- Regional isolation policies
CREATE POLICY ridesharing_regional_policy ON active_rides
    FOR ALL TO ops_users
    USING (region_id = current_setting('app.current_region_id')::uuid);

CREATE POLICY requests_regional_policy ON ride_requests
    FOR ALL TO ops_users
    USING (region_id = current_setting('app.current_region_id')::uuid);

-- =====================================================
-- INITIAL DATA AND CONFIGURATION
-- =====================================================

-- Insert initial demand hotspots for major areas
INSERT INTO demand_hotspots (area_name, center_point, radius_meters, region_id, status) 
SELECT 
    'CBD Area - ' || r.name,
    r.center_point,
    2000,
    r.id,
    'active'
FROM regions r 
WHERE r.status = 'active'
ON CONFLICT DO NOTHING;

-- Insert airport areas as special hotspots
INSERT INTO demand_hotspots (area_name, center_point, boundary, radius_meters, region_id, status)
VALUES 
    ('NAIA Terminal Complex', ST_Point(121.0197, 14.5086, 4326), 
     ST_Buffer(ST_Point(121.0197, 14.5086, 4326)::geography, 1500)::geometry, 
     1500, (SELECT id FROM regions WHERE code = 'MMD'), 'active'),
    ('Mactan-Cebu Airport', ST_Point(123.9619, 10.3075, 4326),
     ST_Buffer(ST_Point(123.9619, 10.3075, 4326)::geography, 1000)::geometry,
     1000, (SELECT id FROM regions WHERE code = 'CEB'), 'active')
ON CONFLICT DO NOTHING;

-- Create system configuration for ridesharing parameters
INSERT INTO system_config (key, value, description, category) VALUES
    ('ridesharing.default_search_radius', '3000', 'Default search radius for drivers in meters', 'ridesharing'),
    ('ridesharing.max_wait_time', '10', 'Maximum wait time for rides in minutes', 'ridesharing'),
    ('ridesharing.surge_activation_threshold', '2.0', 'Demand/supply ratio to activate surge', 'ridesharing'),
    ('ridesharing.max_surge_multiplier', '3.0', 'Maximum surge pricing multiplier', 'ridesharing'),
    ('ridesharing.driver_location_update_interval', '10', 'Driver location update interval in seconds', 'ridesharing'),
    ('ridesharing.kpi_calculation_interval', '300', 'KPI calculation interval in seconds', 'ridesharing'),
    ('ridesharing.emergency_response_time_target', '30', 'Emergency response time target in seconds', 'ridesharing')
ON CONFLICT (key) DO UPDATE SET 
    value = EXCLUDED.value,
    updated_at = NOW();

-- =====================================================
-- MIGRATION COMPLETION
-- =====================================================

-- Update migration record
UPDATE schema_migrations 
SET executed_at = NOW(),
    rollback_sql = 'DROP TABLE IF EXISTS passengers, active_rides, demand_hotspots, surge_pricing, ride_requests, driver_performance_daily, ridesharing_kpis, ridesharing_incidents, driver_location_history CASCADE;'
WHERE version = '005';

-- Log successful migration
INSERT INTO system_logs (level, message, metadata, created_at)
VALUES ('INFO', 'Ridesharing transformation migration completed successfully', 
        jsonb_build_object('migration', '005', 'tablesCreated', 9, 'indexesCreated', 35), NOW());

COMMIT;