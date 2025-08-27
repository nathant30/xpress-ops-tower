-- =====================================================
-- SEED DATA 001: Sample Operational Data
-- Xpress Ops Tower - Development and Testing Data
-- =====================================================

-- =====================================================
-- DRIVER SEED DATA (100 sample drivers across regions)
-- =====================================================

-- Metro Manila drivers (40 drivers)
INSERT INTO drivers (
    driver_code, first_name, last_name, email, phone, 
    region_id, services, primary_service, status, 
    rating, total_trips, completed_trips, vehicle_info, address
)
SELECT 
    'XPR' || LPAD(generate_series(1001, 1040)::text, 4, '0'),
    (ARRAY['Juan', 'Maria', 'Jose', 'Ana', 'Carlos', 'Luz', 'Pedro', 'Rosa', 'Miguel', 'Carmen'])[floor(random() * 10 + 1)],
    (ARRAY['Santos', 'Reyes', 'Cruz', 'Bautista', 'Gonzales', 'Flores', 'Mendoza', 'Torres', 'Ramos', 'Garcia'])[floor(random() * 10 + 1)],
    'driver' || generate_series(1001, 1040) || '@xpress.ph',
    '+639' || (900000000 + floor(random() * 99999999))::bigint,
    (SELECT id FROM regions WHERE code = 'MMD'),
    CASE floor(random() * 4)
        WHEN 0 THEN ARRAY['ride_4w']::service_type[]
        WHEN 1 THEN ARRAY['ride_2w']::service_type[]
        WHEN 2 THEN ARRAY['send_delivery', 'eats_delivery']::service_type[]
        ELSE ARRAY['ride_4w', 'send_delivery']::service_type[]
    END,
    CASE floor(random() * 4)
        WHEN 0 THEN 'ride_4w'::service_type
        WHEN 1 THEN 'ride_2w'::service_type
        WHEN 2 THEN 'send_delivery'::service_type
        ELSE 'ride_4w'::service_type
    END,
    (ARRAY['active', 'busy', 'offline', 'break'])[floor(random() * 4 + 1)]::driver_status,
    4.0 + random() * 1.0, -- Rating between 4.0-5.0
    floor(random() * 1000 + 50), -- Total trips
    floor(random() * 950 + 45), -- Completed trips
    jsonb_build_object(
        'make', (ARRAY['Toyota', 'Honda', 'Mitsubishi', 'Suzuki', 'Yamaha', 'Kawasaki'])[floor(random() * 6 + 1)],
        'model', 'Vehicle Model',
        'year', 2018 + floor(random() * 6),
        'plate_number', 'ABC' || floor(random() * 900 + 100),
        'color', (ARRAY['White', 'Black', 'Silver', 'Red', 'Blue'])[floor(random() * 5 + 1)]
    ),
    jsonb_build_object(
        'street', floor(random() * 999 + 1) || ' Main Street',
        'barangay', 'Barangay ' || floor(random() * 50 + 1),
        'city', (ARRAY['Quezon City', 'Manila', 'Makati', 'Taguig', 'Pasig'])[floor(random() * 5 + 1)],
        'province', 'Metro Manila',
        'postal_code', '1' || LPAD(floor(random() * 799 + 100)::text, 3, '0')
    )
FROM generate_series(1001, 1040);

-- Cebu drivers (25 drivers)
INSERT INTO drivers (
    driver_code, first_name, last_name, email, phone, 
    region_id, services, primary_service, status, 
    rating, total_trips, completed_trips, vehicle_info, address
)
SELECT 
    'CEB' || LPAD(generate_series(2001, 2025)::text, 4, '0'),
    (ARRAY['Ramon', 'Elena', 'Ricardo', 'Sofia', 'Fernando', 'Isabel', 'Antonio', 'Patricia', 'Eduardo', 'Cristina'])[floor(random() * 10 + 1)],
    (ARRAY['Villanueva', 'Morales', 'Herrera', 'Jimenez', 'Alvarez', 'Romero', 'Navarro', 'Ruiz', 'Gutierrez', 'Vargas'])[floor(random() * 10 + 1)],
    'cebu.driver' || generate_series(2001, 2025) || '@xpress.ph',
    '+639' || (800000000 + floor(random() * 99999999))::bigint,
    (SELECT id FROM regions WHERE code = 'CEB'),
    CASE floor(random() * 3)
        WHEN 0 THEN ARRAY['ride_4w']::service_type[]
        WHEN 1 THEN ARRAY['ride_2w']::service_type[]
        ELSE ARRAY['send_delivery', 'eats_delivery']::service_type[]
    END,
    CASE floor(random() * 3)
        WHEN 0 THEN 'ride_4w'::service_type
        WHEN 1 THEN 'ride_2w'::service_type
        ELSE 'send_delivery'::service_type
    END,
    (ARRAY['active', 'busy', 'offline'])[floor(random() * 3 + 1)]::driver_status,
    4.2 + random() * 0.8,
    floor(random() * 800 + 30),
    floor(random() * 750 + 25),
    jsonb_build_object(
        'make', (ARRAY['Toyota', 'Honda', 'Suzuki', 'Yamaha'])[floor(random() * 4 + 1)],
        'model', 'Cebu Model',
        'year', 2017 + floor(random() * 7),
        'plate_number', 'CEB' || floor(random() * 900 + 100),
        'color', (ARRAY['White', 'Black', 'Silver', 'Blue'])[floor(random() * 4 + 1)]
    ),
    jsonb_build_object(
        'street', floor(random() * 299 + 1) || ' Colon Street',
        'barangay', 'Barangay ' || floor(random() * 30 + 1),
        'city', 'Cebu City',
        'province', 'Cebu',
        'postal_code', '6000'
    )
FROM generate_series(2001, 2025);

-- Davao drivers (15 drivers)
INSERT INTO drivers (
    driver_code, first_name, last_name, email, phone, 
    region_id, services, primary_service, status, 
    rating, total_trips, completed_trips, vehicle_info, address
)
SELECT 
    'DAV' || LPAD(generate_series(3001, 3015)::text, 4, '0'),
    (ARRAY['Roberto', 'Maricel', 'Leonardo', 'Grace', 'Alberto'])[floor(random() * 5 + 1)],
    (ARRAY['Aquino', 'Dela Cruz', 'Fernandez', 'Lopez', 'Perez'])[floor(random() * 5 + 1)],
    'davao.driver' || generate_series(3001, 3015) || '@xpress.ph',
    '+639' || (700000000 + floor(random() * 99999999))::bigint,
    (SELECT id FROM regions WHERE code = 'DAV'),
    ARRAY['ride_4w', 'send_delivery']::service_type[],
    'ride_4w'::service_type,
    (ARRAY['active', 'busy', 'offline'])[floor(random() * 3 + 1)]::driver_status,
    4.3 + random() * 0.7,
    floor(random() * 600 + 20),
    floor(random() * 550 + 18),
    jsonb_build_object(
        'make', 'Toyota',
        'model', 'Vios',
        'year', 2019 + floor(random() * 5),
        'plate_number', 'DAV' || floor(random() * 900 + 100),
        'color', 'White'
    ),
    jsonb_build_object(
        'street', floor(random() * 199 + 1) || ' San Pedro Street',
        'barangay', 'Barangay ' || floor(random() * 25 + 1),
        'city', 'Davao City',
        'province', 'Davao del Sur',
        'postal_code', '8000'
    )
FROM generate_series(3001, 3015);

-- Boracay e-trike drivers (10 drivers)
INSERT INTO drivers (
    driver_code, first_name, last_name, email, phone, 
    region_id, services, primary_service, status, 
    rating, total_trips, completed_trips, vehicle_info, address
)
SELECT 
    'BOR' || LPAD(generate_series(4001, 4010)::text, 4, '0'),
    (ARRAY['Mark', 'Gina', 'Ben', 'Liza', 'Rey'])[floor(random() * 5 + 1)],
    (ARRAY['Tanaka', 'Santos', 'Wong', 'Kim', 'Patel'])[floor(random() * 5 + 1)],
    'boracay.driver' || generate_series(4001, 4010) || '@xpress.ph',
    '+639' || (600000000 + floor(random() * 99999999))::bigint,
    (SELECT id FROM regions WHERE code = 'BOR'),
    ARRAY['ride_2w']::service_type[], -- E-trikes only
    'ride_2w'::service_type,
    (ARRAY['active', 'busy'])[floor(random() * 2 + 1)]::driver_status, -- Always active or busy in tourist area
    4.6 + random() * 0.4,
    floor(random() * 400 + 50),
    floor(random() * 380 + 45),
    jsonb_build_object(
        'make', 'Electric Trike',
        'model', 'E-Trike Model X',
        'year', 2022,
        'plate_number', 'BOR' || floor(random() * 100 + 10),
        'color', 'Green',
        'electric', true,
        'battery_level', 85 + random() * 15
    ),
    jsonb_build_object(
        'street', 'Station ' || floor(random() * 3 + 1),
        'barangay', 'Boracay',
        'city', 'Malay',
        'province', 'Aklan',
        'postal_code', '5608'
    )
FROM generate_series(4001, 4010);

-- Baguio drivers (10 drivers)
INSERT INTO drivers (
    driver_code, first_name, last_name, email, phone, 
    region_id, services, primary_service, status, 
    rating, total_trips, completed_trips, vehicle_info, address
)
SELECT 
    'BAG' || LPAD(generate_series(5001, 5010)::text, 4, '0'),
    (ARRAY['Michael', 'Sarah', 'David', 'Jennifer', 'Christopher'])[floor(random() * 5 + 1)],
    (ARRAY['Johnson', 'Williams', 'Brown', 'Jones', 'Miller'])[floor(random() * 5 + 1)],
    'baguio.driver' || generate_series(5001, 5010) || '@xpress.ph',
    '+639' || (500000000 + floor(random() * 99999999))::bigint,
    (SELECT id FROM regions WHERE code = 'BAG'),
    ARRAY['ride_2w', 'send_delivery']::service_type[], -- Limited vehicle types
    'ride_2w'::service_type,
    (ARRAY['active', 'offline'])[floor(random() * 2 + 1)]::driver_status,
    4.4 + random() * 0.6,
    floor(random() * 300 + 15),
    floor(random() * 280 + 12),
    jsonb_build_object(
        'make', 'Yamaha',
        'model', 'NMAX',
        'year', 2020 + floor(random() * 4),
        'plate_number', 'BAG' || floor(random() * 500 + 100),
        'color', (ARRAY['Black', 'Blue', 'Red'])[floor(random() * 3 + 1)]
    ),
    jsonb_build_object(
        'street', floor(random() * 99 + 1) || ' Session Road',
        'barangay', 'Barangay ' || floor(random() * 15 + 1),
        'city', 'Baguio City',
        'province', 'Benguet',
        'postal_code', '2600'
    )
FROM generate_series(5001, 5010);

-- =====================================================
-- REAL-TIME LOCATION DATA (CURRENT POSITIONS)
-- =====================================================

-- Generate current location data for active drivers
INSERT INTO driver_locations (
    driver_id, location, accuracy, bearing, speed, 
    address, region_id, driver_status, is_available, recorded_at
)
SELECT 
    d.id,
    -- Generate realistic locations within each region's boundaries
    CASE 
        WHEN r.code = 'MMD' THEN ST_Point(
            121.0244 + (random() - 0.5) * 0.2, -- Longitude spread around Metro Manila
            14.6592 + (random() - 0.5) * 0.2,  -- Latitude spread
            4326
        )
        WHEN r.code = 'CEB' THEN ST_Point(
            123.8854 + (random() - 0.5) * 0.1,
            10.3157 + (random() - 0.5) * 0.1,
            4326
        )
        WHEN r.code = 'DAV' THEN ST_Point(
            125.6158 + (random() - 0.5) * 0.1,
            7.1907 + (random() - 0.5) * 0.1,
            4326
        )
        WHEN r.code = 'BOR' THEN ST_Point(
            121.9270 + (random() - 0.5) * 0.02, -- Smaller spread for island
            11.9674 + (random() - 0.5) * 0.02,
            4326
        )
        WHEN r.code = 'BAG' THEN ST_Point(
            120.5960 + (random() - 0.5) * 0.05,
            16.4023 + (random() - 0.5) * 0.05,
            4326
        )
    END,
    5 + random() * 10, -- GPS accuracy 5-15 meters
    random() * 360, -- Random bearing
    CASE 
        WHEN d.status = 'busy' THEN 10 + random() * 40  -- Moving 10-50 km/h
        WHEN d.status = 'active' THEN random() * 5      -- Slow or stationary
        ELSE 0  -- Offline/break drivers are stationary
    END,
    'Sample Address, ' || r.name,
    d.region_id,
    d.status,
    CASE 
        WHEN d.status = 'active' THEN TRUE
        ELSE FALSE
    END,
    NOW() - (random() * INTERVAL '30 seconds') -- Recent locations within 30 seconds
FROM drivers d
JOIN regions r ON d.region_id = r.id
WHERE d.status IN ('active', 'busy'); -- Only active drivers have location data

-- =====================================================
-- SAMPLE BOOKINGS (RECENT ACTIVITY)
-- =====================================================

-- Generate recent bookings (last 24 hours)
INSERT INTO bookings (
    booking_reference, service_type, status, customer_id, customer_info,
    pickup_location, pickup_address, dropoff_location, dropoff_address,
    region_id, base_fare, surge_multiplier, total_fare,
    requested_at, driver_id, assigned_at, accepted_at
)
SELECT 
    'XPR' || to_char(NOW(), 'YYYYMMDD') || LPAD((row_number() OVER ())::text, 4, '0'),
    (ARRAY['ride_4w', 'ride_2w', 'send_delivery', 'eats_delivery'])[floor(random() * 4 + 1)]::service_type,
    (ARRAY['completed', 'in_progress', 'assigned', 'requested'])[floor(random() * 4 + 1)]::booking_status,
    uuid_generate_v4(),
    jsonb_build_object(
        'name', 'Customer ' || generate_series(1, 50),
        'phone', '+639' || (900000000 + floor(random() * 99999999))::bigint,
        'rating', 4.0 + random() * 1.0
    ),
    -- Pickup location within region
    CASE 
        WHEN r.code = 'MMD' THEN ST_Point(121.0244 + (random() - 0.5) * 0.15, 14.6592 + (random() - 0.5) * 0.15, 4326)
        WHEN r.code = 'CEB' THEN ST_Point(123.8854 + (random() - 0.5) * 0.08, 10.3157 + (random() - 0.5) * 0.08, 4326)
        WHEN r.code = 'DAV' THEN ST_Point(125.6158 + (random() - 0.5) * 0.08, 7.1907 + (random() - 0.5) * 0.08, 4326)
        WHEN r.code = 'BOR' THEN ST_Point(121.9270 + (random() - 0.5) * 0.01, 11.9674 + (random() - 0.5) * 0.01, 4326)
        ELSE ST_Point(120.5960 + (random() - 0.5) * 0.04, 16.4023 + (random() - 0.5) * 0.04, 4326)
    END,
    'Pickup at ' || generate_series(1, 50) || ' Street, ' || r.name,
    -- Dropoff location
    CASE 
        WHEN r.code = 'MMD' THEN ST_Point(121.0244 + (random() - 0.5) * 0.15, 14.6592 + (random() - 0.5) * 0.15, 4326)
        WHEN r.code = 'CEB' THEN ST_Point(123.8854 + (random() - 0.5) * 0.08, 10.3157 + (random() - 0.5) * 0.08, 4326)
        WHEN r.code = 'DAV' THEN ST_Point(125.6158 + (random() - 0.5) * 0.08, 7.1907 + (random() - 0.5) * 0.08, 4326)
        WHEN r.code = 'BOR' THEN ST_Point(121.9270 + (random() - 0.5) * 0.01, 11.9674 + (random() - 0.5) * 0.01, 4326)
        ELSE ST_Point(120.5960 + (random() - 0.5) * 0.04, 16.4023 + (random() - 0.5) * 0.04, 4326)
    END,
    'Dropoff at ' || generate_series(1, 50) || ' Avenue, ' || r.name,
    r.id,
    50 + random() * 200, -- Base fare 50-250
    1.0 + (CASE WHEN random() > 0.8 THEN random() * 1.5 ELSE 0 END), -- Occasional surge pricing
    (50 + random() * 200) * (1.0 + (CASE WHEN random() > 0.8 THEN random() * 1.5 ELSE 0 END)),
    NOW() - (random() * INTERVAL '24 hours'), -- Bookings in last 24 hours
    CASE WHEN random() > 0.3 THEN (SELECT id FROM drivers d2 WHERE d2.region_id = r.id ORDER BY random() LIMIT 1) ELSE NULL END,
    CASE WHEN random() > 0.3 THEN NOW() - (random() * INTERVAL '20 hours') ELSE NULL END,
    CASE WHEN random() > 0.4 THEN NOW() - (random() * INTERVAL '18 hours') ELSE NULL END
FROM regions r, generate_series(1, 50)
WHERE r.is_active = TRUE;

-- =====================================================
-- SAMPLE INCIDENTS (FOR SOS TESTING)
-- =====================================================

-- Generate sample incidents across priority levels
INSERT INTO incidents (
    incident_code, priority, status, incident_type,
    reporter_type, reporter_id, reporter_contact,
    driver_id, location, address, region_id,
    title, description, created_at, acknowledged_at, first_response_time
)
SELECT 
    'INC' || to_char(NOW(), 'YYYYMMDD') || LPAD((row_number() OVER ())::text, 3, '0'),
    (ARRAY['low', 'medium', 'high', 'critical'])[floor(random() * 4 + 1)]::incident_priority,
    (ARRAY['open', 'acknowledged', 'resolved', 'closed'])[floor(random() * 4 + 1)]::incident_status,
    (ARRAY['vehicle_breakdown', 'accident', 'medical_emergency', 'security_issue', 'customer_complaint'])[floor(random() * 5 + 1)],
    'driver',
    (SELECT id FROM drivers ORDER BY random() LIMIT 1),
    '+639' || (900000000 + floor(random() * 99999999))::bigint,
    (SELECT id FROM drivers ORDER BY random() LIMIT 1),
    ST_Point(121.0244 + (random() - 0.5) * 0.2, 14.6592 + (random() - 0.5) * 0.2, 4326),
    'Incident location on Main Street',
    (SELECT id FROM regions ORDER BY random() LIMIT 1),
    (ARRAY['Vehicle breakdown', 'Minor accident', 'Medical emergency', 'Security concern', 'Customer complaint'])[floor(random() * 5 + 1)],
    'Sample incident description for testing and development purposes.',
    NOW() - (random() * INTERVAL '48 hours'),
    CASE WHEN random() > 0.3 THEN NOW() - (random() * INTERVAL '46 hours') ELSE NULL END,
    CASE WHEN random() > 0.3 THEN floor(random() * 300 + 30) ELSE NULL END -- Response time in seconds
FROM generate_series(1, 20);

-- =====================================================
-- PERFORMANCE METRICS (HISTORICAL DATA)
-- =====================================================

-- Generate daily performance data for drivers (last 30 days)
INSERT INTO driver_performance_daily (
    driver_id, performance_date, region_id,
    total_trips, completed_trips, cancelled_trips,
    acceptance_rate, completion_rate,
    online_hours, driving_hours, idle_hours,
    gross_earnings, net_earnings,
    average_rating, total_distance_km, billable_distance_km
)
SELECT 
    d.id,
    current_date - (random() * 30)::int, -- Random date in last 30 days
    d.region_id,
    floor(random() * 20 + 5), -- 5-25 trips per day
    floor(random() * 18 + 4), -- Most trips completed
    floor(random() * 2), -- Few cancelled
    0.85 + random() * 0.14, -- 85-99% acceptance rate
    0.90 + random() * 0.09, -- 90-99% completion rate
    6 + random() * 6, -- 6-12 hours online
    4 + random() * 4, -- 4-8 hours driving
    1 + random() * 3, -- 1-4 hours idle
    800 + random() * 1200, -- Daily gross earnings
    600 + random() * 900, -- Daily net earnings
    4.2 + random() * 0.8, -- Daily rating
    80 + random() * 120, -- Total distance
    60 + random() * 90 -- Billable distance
FROM drivers d, generate_series(1, 5) -- 5 data points per driver
WHERE d.is_active = TRUE;

-- =====================================================
-- OPERATIONAL METRICS (HOURLY DATA)
-- =====================================================

-- Generate hourly operational metrics for the last 7 days
INSERT INTO operational_metrics_hourly (
    metric_hour, region_id,
    active_drivers, available_drivers, busy_drivers,
    total_requests, successful_bookings, cancelled_bookings,
    average_wait_time, fulfillment_rate, average_response_time,
    ride_4w_requests, ride_2w_requests, delivery_requests,
    sos_incidents, average_incident_response_time
)
SELECT 
    date_trunc('hour', NOW() - (random() * INTERVAL '7 days')),
    r.id,
    floor(random() * 50 + 10), -- 10-60 active drivers
    floor(random() * 30 + 5),  -- 5-35 available
    floor(random() * 25 + 2),  -- 2-27 busy
    floor(random() * 100 + 20), -- 20-120 requests per hour
    floor(random() * 95 + 18),  -- Most successful
    floor(random() * 5 + 1),    -- Few cancelled
    2 + random() * 8,           -- 2-10 minute wait time
    0.85 + random() * 0.14,     -- 85-99% fulfillment
    30 + random() * 120,        -- 30-150 second response time
    floor(random() * 40 + 5),   -- 4W ride requests
    floor(random() * 30 + 5),   -- 2W ride requests
    floor(random() * 25 + 5),   -- Delivery requests
    floor(random() * 2),        -- 0-2 SOS incidents per hour
    CASE WHEN floor(random() * 2) > 0 THEN 30 + random() * 90 ELSE NULL END -- Incident response time
FROM regions r, generate_series(1, 24 * 7) -- 7 days of hourly data
WHERE r.is_active = TRUE;

-- =====================================================
-- UPDATE STATISTICS AND REFRESH VIEWS
-- =====================================================

-- Update table statistics for optimal query planning
ANALYZE drivers;
ANALYZE driver_locations;
ANALYZE bookings;
ANALYZE incidents;
ANALYZE driver_performance_daily;
ANALYZE operational_metrics_hourly;

-- Refresh materialized views if any exist
-- REFRESH MATERIALIZED VIEW mv_driver_performance_summary;

COMMENT ON TABLE drivers IS 'Sample data includes 100 drivers across 5 regions with realistic distribution';
COMMENT ON TABLE driver_locations IS 'Real-time location data for active drivers with GPS accuracy simulation';
COMMENT ON TABLE bookings IS 'Sample bookings from last 24 hours across all service types';
COMMENT ON TABLE incidents IS 'Sample incidents across all priority levels for SOS system testing';
COMMENT ON TABLE driver_performance_daily IS 'Historical performance data for analytics and reporting testing';
COMMENT ON TABLE operational_metrics_hourly IS 'Hourly system metrics for dashboard and monitoring testing';