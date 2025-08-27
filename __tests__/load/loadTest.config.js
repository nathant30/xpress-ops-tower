// Load Testing Configuration for Xpress Ops Tower
// Testing system capacity for 10,000+ concurrent users

module.exports = {
  // Test scenarios configuration
  scenarios: {
    // Standard operations load test
    standard_operations: {
      name: 'Standard Operations Load Test',
      description: 'Simulates normal daily operations with drivers, bookings, and tracking',
      concurrent_users: 1000,
      duration: '10m',
      ramp_up: '2m',
      endpoints: [
        { path: '/api/drivers', weight: 30 },
        { path: '/api/bookings', weight: 25 },
        { path: '/api/locations', weight: 35 },
        { path: '/api/analytics', weight: 10 }
      ]
    },
    
    // High traffic scenario
    high_traffic: {
      name: 'High Traffic Scenario',
      description: 'Simulates peak hours with maximum concurrent operations',
      concurrent_users: 5000,
      duration: '15m',
      ramp_up: '3m',
      endpoints: [
        { path: '/api/drivers', weight: 25 },
        { path: '/api/bookings', weight: 35 },
        { path: '/api/locations', weight: 30 },
        { path: '/api/emergency', weight: 10 }
      ]
    },
    
    // Emergency load test (critical)
    emergency_load: {
      name: 'Emergency System Load Test',
      description: 'Tests emergency SOS system under high concurrent load',
      concurrent_users: 10000,
      duration: '20m',
      ramp_up: '5m',
      critical: true,
      max_response_time: 5000, // 5 seconds max for emergency
      endpoints: [
        { path: '/api/emergency/sos', weight: 40, max_response_time: 2000 },
        { path: '/api/emergency/panic-button', weight: 30, max_response_time: 2000 },
        { path: '/api/emergency/responses', weight: 20 },
        { path: '/api/drivers', weight: 10 }
      ]
    },
    
    // WebSocket stress test
    websocket_stress: {
      name: 'WebSocket Real-time Stress Test',
      description: 'Tests WebSocket connections and real-time updates',
      concurrent_connections: 15000,
      duration: '30m',
      message_frequency: '1s', // Send message every second
      scenarios: [
        { type: 'location_updates', percentage: 60 },
        { type: 'status_changes', percentage: 20 },
        { type: 'emergency_alerts', percentage: 10 },
        { type: 'booking_updates', percentage: 10 }
      ]
    },
    
    // Database stress test
    database_stress: {
      name: 'Database Performance Under Load',
      description: 'Tests database performance with heavy read/write operations',
      concurrent_operations: 2000,
      duration: '25m',
      operations: [
        { type: 'driver_location_updates', ops_per_second: 1000 },
        { type: 'booking_queries', ops_per_second: 500 },
        { type: 'analytics_queries', ops_per_second: 100 },
        { type: 'sos_writes', ops_per_second: 50 }
      ]
    }
  },
  
  // Performance thresholds
  thresholds: {
    // Response time thresholds (95th percentile)
    response_times: {
      emergency_endpoints: 2000, // 2 seconds max
      driver_endpoints: 3000,    // 3 seconds max
      booking_endpoints: 3000,   // 3 seconds max
      analytics_endpoints: 5000, // 5 seconds max
      general_endpoints: 4000    // 4 seconds max
    },
    
    // Error rate thresholds
    error_rates: {
      emergency_endpoints: 0.1, // 0.1% max error rate for emergency
      critical_endpoints: 0.5,  // 0.5% max for critical operations
      general_endpoints: 1.0    // 1% max for general operations
    },
    
    // Resource utilization thresholds
    resources: {
      cpu_usage: 80,           // 80% max CPU usage
      memory_usage: 85,        // 85% max memory usage
      disk_io: 75,             // 75% max disk I/O
      network_io: 70,          // 70% max network I/O
      database_connections: 90  // 90% max database connections
    },
    
    // WebSocket specific thresholds
    websocket: {
      connection_success_rate: 99.5,  // 99.5% connection success
      message_delivery_rate: 99.9,    // 99.9% message delivery
      max_connection_time: 5000,      // 5 seconds max to establish connection
      max_message_latency: 500        // 500ms max message latency
    }
  },
  
  // Test data generation
  test_data: {
    // Driver data
    drivers: {
      count: 10000,
      regions: ['ncr-manila', 'cebu-city', 'davao-city', 'iloilo-city'],
      statuses: ['active', 'busy', 'offline', 'emergency'],
      vehicle_types: ['sedan', 'suv', 'motorcycle', 'tricycle']
    },
    
    // Customer data
    customers: {
      count: 50000,
      booking_frequency: 'normal', // normal, high, low
      preferred_regions: ['ncr-manila', 'cebu-city']
    },
    
    // Booking patterns
    bookings: {
      hourly_pattern: {
        peak_hours: [7, 8, 9, 17, 18, 19], // Rush hours
        low_hours: [2, 3, 4, 5], // Night hours
        multiplier: { peak: 3, normal: 1, low: 0.3 }
      }
    },
    
    // Emergency scenarios
    emergency_scenarios: [
      { type: 'medical_emergency', frequency: 0.1 },
      { type: 'security_threat', frequency: 0.3 },
      { type: 'accident_critical', frequency: 0.2 },
      { type: 'general_emergency', frequency: 0.4 }
    ]
  },
  
  // Monitoring and reporting
  monitoring: {
    // Metrics to collect
    metrics: [
      'response_time',
      'throughput',
      'error_rate',
      'cpu_usage',
      'memory_usage',
      'database_performance',
      'websocket_performance',
      'emergency_response_time'
    ],
    
    // Real-time monitoring
    realtime: {
      enabled: true,
      dashboard_port: 3001,
      refresh_interval: 1000, // 1 second
      alert_thresholds: {
        high_response_time: 5000,
        high_error_rate: 2.0,
        high_cpu: 90,
        emergency_failure: 1 // Any emergency system failure
      }
    },
    
    // Reporting
    reports: {
      formats: ['json', 'html', 'csv'],
      include_graphs: true,
      detailed_breakdown: true,
      comparison_mode: true // Compare with previous runs
    }
  },
  
  // Environment configuration
  environments: {
    local: {
      base_url: 'http://localhost:3000',
      websocket_url: 'ws://localhost:3000',
      database_url: 'postgresql://localhost:5432/xpress_test'
    },
    staging: {
      base_url: 'https://staging.xpress-ops-tower.com',
      websocket_url: 'wss://staging.xpress-ops-tower.com',
      database_url: process.env.STAGING_DATABASE_URL
    },
    production: {
      base_url: 'https://xpress-ops-tower.com',
      websocket_url: 'wss://xpress-ops-tower.com',
      database_url: process.env.PRODUCTION_DATABASE_URL
    }
  }
};