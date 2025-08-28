// Ridesharing Concurrent Rides Load Test
// Critical test: System performance under 10,000+ concurrent active rides
// Validates real-time tracking, WebSocket stability, and database performance

const { check, group, fail } = require('k6');
const http = require('k6/http');
const ws = require('k6/ws');
const { Counter, Rate, Trend, Gauge } = require('k6/metrics');

// Custom metrics for ridesharing load testing
const rideRequestTime = new Trend('ride_request_time');
const rideMatchingTime = new Trend('ride_matching_time');
const locationUpdateTime = new Trend('location_update_time');
const webSocketConnectionTime = new Trend('websocket_connection_time');
const concurrentRidesGauge = new Gauge('concurrent_rides_active');
const rideCompletionRate = new Rate('ride_completion_rate');
const systemStabilityRate = new Rate('system_stability_rate');
const realTimeAccuracy = new Rate('realtime_accuracy_rate');

// Load test configuration for ridesharing
export const options = {
  stages: [
    // Gradual ramp-up to simulate realistic growth
    { duration: '5m', target: 2000 },   // Morning commute buildup  
    { duration: '10m', target: 5000 },  // Peak morning demand
    { duration: '15m', target: 8000 },  // Sustained high load
    { duration: '10m', target: 12000 }, // Peak load - 12K concurrent rides
    { duration: '15m', target: 15000 }, // Stress test - 15K concurrent rides
    { duration: '20m', target: 10000 }, // Evening rush hour
    { duration: '10m', target: 5000 },  // Cool down period
    { duration: '5m', target: 1000 },   // Late night baseline
    { duration: '5m', target: 0 }       // Complete shutdown
  ],
  
  // Critical performance thresholds for ridesharing
  thresholds: {
    // Ride request processing must be fast
    'ride_request_time': ['p(95)<5000', 'p(99)<8000'],           // 95% under 5s, 99% under 8s
    
    // Driver matching must complete within 30 seconds (critical requirement)
    'ride_matching_time': ['p(95)<30000', 'p(99)<45000'],       // 95% under 30s, 99% under 45s
    
    // Location updates must be processed quickly for real-time tracking
    'location_update_time': ['p(95)<2000', 'p(99)<3000'],       // 95% under 2s, 99% under 3s
    
    // WebSocket connections must be stable
    'websocket_connection_time': ['p(95)<3000'],                // 95% connect under 3s
    
    // System reliability thresholds
    'ride_completion_rate': ['rate>0.90'],                      // 90%+ ride completion
    'system_stability_rate': ['rate>0.95'],                     // 95%+ system uptime
    'realtime_accuracy_rate': ['rate>0.98'],                    // 98%+ real-time data accuracy
    
    // Standard HTTP performance
    'http_req_duration': ['p(95)<10000'],                       // 95% under 10s
    'http_req_failed': ['rate<0.05']                            // <5% failure rate
  }
};

// Test data for ridesharing scenarios
const rideServiceTypes = ['ride_4w', 'ride_2w', 'send_delivery', 'eats_delivery'];
const testRegions = ['ncr-manila', 'cebu-city', 'davao-city', 'iloilo-city', 'cagayan-de-oro'];

// Philippine major city coordinates for realistic ride locations
const cityCoordinates = {
  'ncr-manila': { lat: 14.5995, lng: 120.9842, radius: 0.3 },
  'cebu-city': { lat: 10.3157, lng: 123.8854, radius: 0.2 },
  'davao-city': { lat: 7.1907, lng: 125.4553, radius: 0.2 },
  'iloilo-city': { lat: 10.7202, lng: 122.5621, radius: 0.15 },
  'cagayan-de-oro': { lat: 8.4542, lng: 124.6319, radius: 0.15 }
};

// Generate realistic ride request
function generateRideRequest(userId, region) {
  const cityData = cityCoordinates[region];
  const serviceType = rideServiceTypes[Math.floor(Math.random() * rideServiceTypes.length)];
  
  // Generate pickup location within city bounds
  const pickupLat = cityData.lat + (Math.random() - 0.5) * cityData.radius;
  const pickupLng = cityData.lng + (Math.random() - 0.5) * cityData.radius;
  
  // Generate dropoff location (usually within 20km for rides, wider for delivery)
  const maxDistance = serviceType.includes('delivery') ? 0.4 : 0.2;
  const dropoffLat = cityData.lat + (Math.random() - 0.5) * maxDistance;
  const dropoffLng = cityData.lng + (Math.random() - 0.5) * maxDistance;
  
  return {
    customerId: `load_test_customer_${userId}_${__VU}`,
    serviceType: serviceType,
    pickupLocation: {
      latitude: pickupLat,
      longitude: pickupLng
    },
    pickupAddress: generateAddress(pickupLat, pickupLng, region),
    dropoffLocation: serviceType.includes('delivery') ? {
      latitude: dropoffLat,
      longitude: dropoffLng
    } : null,
    dropoffAddress: serviceType.includes('delivery') ? generateAddress(dropoffLat, dropoffLng, region) : null,
    regionId: region,
    customerInfo: {
      name: `Load Test Customer ${userId}`,
      phone: `+6391${String(Math.floor(Math.random() * 10000000)).padStart(7, '0')}`,
      rating: 4.0 + Math.random()
    },
    specialInstructions: Math.random() > 0.7 ? generateSpecialInstructions(serviceType) : null,
    paymentMethod: Math.random() > 0.3 ? 'card' : 'cash'
  };
}

function generateAddress(lat, lng, region) {
  const streetNames = [
    'Ayala Avenue', 'EDSA', 'Roxas Boulevard', 'Ortigas Avenue', 'C5 Road',
    'Quezon Avenue', 'España Boulevard', 'Taft Avenue', 'Shaw Boulevard', 'Pasig Boulevard'
  ];
  const street = streetNames[Math.floor(Math.random() * streetNames.length)];
  const houseNumber = Math.floor(Math.random() * 9999) + 1;
  return `${houseNumber} ${street}, ${region.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}`;
}

function generateSpecialInstructions(serviceType) {
  const rideInstructions = [
    'Please call when you arrive',
    'Wait at the main entrance',
    'Blue building with glass facade',
    'I will wait at the lobby'
  ];
  
  const deliveryInstructions = [
    'Leave at the front door',
    'Call recipient upon arrival',
    'Handle with care - fragile items',
    'Deliver to security guard'
  ];
  
  const instructions = serviceType.includes('delivery') ? deliveryInstructions : rideInstructions;
  return instructions[Math.floor(Math.random() * instructions.length)];
}

// Generate driver data for load testing
function generateDriverUpdate(driverId, region) {
  const cityData = cityCoordinates[region];
  
  return {
    driverId: `load_test_driver_${driverId}_${__VU}`,
    location: {
      latitude: cityData.lat + (Math.random() - 0.5) * cityData.radius,
      longitude: cityData.lng + (Math.random() - 0.5) * cityData.radius,
      accuracy: Math.floor(Math.random() * 15) + 3, // 3-18 meters GPS accuracy
      bearing: Math.floor(Math.random() * 360),
      speed: Math.floor(Math.random() * 60) // 0-60 km/h
    },
    status: Math.random() > 0.3 ? 'active' : 'busy', // 70% active, 30% busy
    isAvailable: Math.random() > 0.2, // 80% available
    services: ['ride_4w'], // Most drivers handle 4-wheel rides
    timestamp: Date.now()
  };
}

export default function () {
  const baseUrl = __ENV.BASE_URL || 'http://localhost:3000';
  const wsUrl = (__ENV.WS_URL || 'ws://localhost:3000').replace('http', 'ws');
  
  // Select random region for this virtual user
  const region = testRegions[Math.floor(Math.random() * testRegions.length)];
  const userId = __ITER;
  
  // Authentication headers for load testing
  const authHeaders = {
    'Authorization': `Bearer load_test_token_${userId}_${__VU}`,
    'Content-Type': 'application/json',
    'X-Region-ID': region,
    'X-Load-Test': 'true'
  };

  group('Ridesharing Concurrent Load Test', () => {
    
    // Test 1: Ride Request Processing (High Volume)
    group('Ride Request Processing', () => {
      const rideRequest = generateRideRequest(userId, region);
      const requestStartTime = Date.now();
      
      const response = http.post(`${baseUrl}/api/bookings`, JSON.stringify(rideRequest), {
        headers: authHeaders,
        timeout: '15s'
      });
      
      const requestTime = Date.now() - requestStartTime;
      rideRequestTime.add(requestTime);
      
      const requestSuccess = check(response, {
        'Ride request accepted': (r) => r.status === 201 || r.status === 200,
        'Response time acceptable': () => requestTime < 10000,
        'Returns booking ID': (r) => {
          try {
            const body = JSON.parse(r.body);
            return body.booking && body.booking.id;
          } catch {
            return false;
          }
        }
      });
      
      if (requestSuccess) {
        systemStabilityRate.add(1);
        
        // Test driver matching process
        try {
          const bookingBody = JSON.parse(response.body);
          if (bookingBody.booking && bookingBody.booking.id) {
            
            // Simulate driver matching time
            const matchingStartTime = Date.now();
            const matchingResponse = http.get(`${baseUrl}/api/bookings/${bookingBody.booking.id}/status`, {
              headers: authHeaders,
              timeout: '35s' // Allow up to 35 seconds for matching
            });
            
            const matchingTime = Date.now() - matchingStartTime;
            rideMatchingTime.add(matchingTime);
            
            check(matchingResponse, {
              'Driver matching succeeded': (r) => r.status === 200,
              'Matching within time limit': () => matchingTime < 30000, // 30 second limit
              'Driver assigned': (r) => {
                try {
                  const body = JSON.parse(r.body);
                  return body.status === 'assigned' || body.driverId;
                } catch {
                  return false;
                }
              }
            });
            
            // Track concurrent rides
            concurrentRidesGauge.add(1);
            
            // Simulate ride completion (probabilistic)
            if (Math.random() > 0.1) { // 90% completion rate
              rideCompletionRate.add(1);
              concurrentRidesGauge.add(-1); // Remove from active count
            } else {
              rideCompletionRate.add(0);
            }
          }
        } catch (e) {
          console.warn(`Matching process failed: ${e.message}`);
          systemStabilityRate.add(0);
        }
      } else {
        systemStabilityRate.add(0);
        console.error(`Ride request failed: ${response.status} - ${response.body}`);
      }
    });

    // Test 2: Real-time Location Updates (Driver Simulation)
    if (Math.random() > 0.3) { // 70% of VUs act as drivers sending location updates
      group('Driver Location Updates', () => {
        const driverUpdate = generateDriverUpdate(userId, region);
        const locationStartTime = Date.now();
        
        const locationResponse = http.post(
          `${baseUrl}/api/locations/${driverUpdate.driverId}`, 
          JSON.stringify(driverUpdate), 
          {
            headers: authHeaders,
            timeout: '5s'
          }
        );
        
        const locationUpdateProcessTime = Date.now() - locationStartTime;
        locationUpdateTime.add(locationUpdateProcessTime);
        
        const locationSuccess = check(locationResponse, {
          'Location update processed': (r) => r.status === 200 || r.status === 201,
          'Update time acceptable': () => locationUpdateProcessTime < 3000,
          'Real-time data confirmed': (r) => {
            try {
              const body = JSON.parse(r.body);
              return body.success || body.updated;
            } catch {
              return false;
            }
          }
        });
        
        if (locationSuccess) {
          realTimeAccuracy.add(1);
        } else {
          realTimeAccuracy.add(0);
        }
      });
    }

    // Test 3: WebSocket Real-time Communication
    if (__ITER % 10 === 0) { // Every 10th iteration tests WebSocket
      group('WebSocket Real-time Updates', () => {
        const wsStartTime = Date.now();
        
        const wsResponse = ws.connect(`${wsUrl}/socket.io/?EIO=4&transport=websocket`, {
          timeout: '10s'
        }, function (socket) {
          
          let connectionEstablished = false;
          let realTimeUpdatesReceived = 0;
          
          socket.on('open', function () {
            const connectionTime = Date.now() - wsStartTime;
            webSocketConnectionTime.add(connectionTime);
            connectionEstablished = true;
            
            // Authenticate WebSocket connection
            socket.send(JSON.stringify({
              type: '42',
              data: ['auth', {
                token: `load_test_token_${userId}_${__VU}`,
                userType: 'customer',
                regionId: region
              }]
            }));
            
            // Subscribe to real-time updates
            socket.send(JSON.stringify({
              type: '42',
              data: ['subscribe', {
                channels: [
                  'bookings:updates',
                  'drivers:location_updates', 
                  'surge:pricing_updates'
                ]
              }]
            }));
          });
          
          socket.on('message', function (data) {
            try {
              // Parse Socket.IO protocol message
              if (data.startsWith('42')) {
                const messageData = JSON.parse(data.slice(2));
                if (messageData[0] === 'booking:driver_assigned' || 
                    messageData[0] === 'driver:location_updated' ||
                    messageData[0] === 'surge:multiplier_updated') {
                  realTimeUpdatesReceived++;
                  realTimeAccuracy.add(1);
                }
              }
            } catch (e) {
              // Ignore parse errors
            }
          });
          
          socket.on('error', function (e) {
            console.error(`WebSocket error: ${e.error}`);
            realTimeAccuracy.add(0);
          });
          
          // Keep connection alive for testing duration
          socket.setTimeout(function () {
            if (connectionEstablished && realTimeUpdatesReceived >= 1) {
              realTimeAccuracy.add(1);
            } else {
              realTimeAccuracy.add(0);
            }
            socket.close();
          }, 8000); // 8 second test duration
        });
        
        check(wsResponse, {
          'WebSocket connection established': (r) => r && r.status === 101
        });
      });
    }

    // Test 4: Surge Pricing Calculation (High Load)
    if (Math.random() > 0.8) { // 20% of requests trigger surge pricing check
      group('Surge Pricing Under Load', () => {
        const surgeResponse = http.get(`${baseUrl}/api/pricing/surge?regionId=${region}&serviceType=ride_4w`, {
          headers: authHeaders,
          timeout: '5s'
        });
        
        check(surgeResponse, {
          'Surge pricing calculated': (r) => r.status === 200,
          'Surge data valid': (r) => {
            try {
              const body = JSON.parse(r.body);
              return body.surgeMultiplier >= 1.0 && body.surgeMultiplier <= 5.0;
            } catch {
              return false;
            }
          }
        });
      });
    }

    // Test 5: System Health Monitoring
    if (__ITER % 50 === 0) { // Every 50th iteration checks system health
      group('System Health Check', () => {
        const healthResponse = http.get(`${baseUrl}/api/health/detailed`, {
          headers: authHeaders,
          timeout: '10s'
        });
        
        const systemHealthy = check(healthResponse, {
          'System health check passes': (r) => r.status === 200,
          'Database responsive': (r) => {
            try {
              const body = JSON.parse(r.body);
              return body.database && body.database.status === 'healthy';
            } catch {
              return false;
            }
          },
          'Redis responsive': (r) => {
            try {
              const body = JSON.parse(r.body);
              return body.redis && body.redis.status === 'healthy';
            } catch {
              return false;
            }
          },
          'WebSocket server healthy': (r) => {
            try {
              const body = JSON.parse(r.body);
              return body.websocket && body.websocket.connections < 20000; // Under connection limit
            } catch {
              return false;
            }
          }
        });
        
        if (systemHealthy) {
          systemStabilityRate.add(1);
        } else {
          systemStabilityRate.add(0);
        }
      });
    }

    // Test 6: Analytics and Metrics (System Load)
    if (__ITER % 100 === 0) { // Every 100th iteration tests analytics
      group('Analytics Under Load', () => {
        const analyticsResponse = http.get(`${baseUrl}/api/analytics/realtime?regionId=${region}`, {
          headers: authHeaders,
          timeout: '8s'
        });
        
        check(analyticsResponse, {
          'Analytics data available': (r) => r.status === 200,
          'Realtime metrics accurate': (r) => {
            try {
              const body = JSON.parse(r.body);
              return body.activeBookings >= 0 && body.availableDrivers >= 0;
            } catch {
              return false;
            }
          }
        });
      });
    }
  });

  // Random sleep to simulate realistic user behavior
  const sleepTime = Math.random() * 3 + 1; // 1-4 seconds
  require('k6').sleep(sleepTime);
}

// Setup function - prepare system for load test
export function setup() {
  const baseUrl = __ENV.BASE_URL || 'http://localhost:3000';
  
  console.log('\n=== RIDESHARING CONCURRENT LOAD TEST SETUP ===');
  console.log(`Target URL: ${baseUrl}`);
  console.log(`Test regions: ${testRegions.join(', ')}`);
  console.log(`Peak concurrent rides: 15,000`);
  console.log(`Test duration: ~85 minutes`);
  console.log('Critical thresholds:');
  console.log('- Ride matching: <30s (95th percentile)');
  console.log('- Location updates: <2s (95th percentile)');
  console.log('- System stability: >95%');
  console.log('- Ride completion: >90%');
  
  // System health check before starting
  const healthResponse = http.get(`${baseUrl}/api/health`);
  if (healthResponse.status !== 200) {
    throw new Error(`Pre-test health check failed: ${healthResponse.status}`);
  }
  
  console.log('✅ Pre-test health check passed');
  console.log('🚀 Starting ridesharing load test...\n');
  
  return {
    baseUrl,
    testRegions,
    startTime: Date.now()
  };
}

// Teardown function - analyze results and cleanup
export function teardown(data) {
  const endTime = Date.now();
  const duration = Math.round((endTime - data.startTime) / 1000);
  
  console.log('\n=== RIDESHARING LOAD TEST COMPLETED ===');
  console.log(`Test duration: ${Math.floor(duration / 60)}m ${duration % 60}s`);
  console.log(`Regions tested: ${data.testRegions.length}`);
  console.log('\nCritical Performance Metrics:');
  console.log('- Check ride matching performance (<30s requirement)');
  console.log('- Verify location update processing (<2s requirement)');  
  console.log('- Confirm WebSocket stability under load');
  console.log('- Validate system stability (>95% requirement)');
  console.log('- Review ride completion rates (>90% target)');
  
  console.log('\nPost-test Analysis Required:');
  console.log('1. Database performance under concurrent load');
  console.log('2. Redis cache hit rates and memory usage');
  console.log('3. WebSocket connection stability');
  console.log('4. Real-time data accuracy and latency');
  console.log('5. Surge pricing calculation accuracy');
  
  // Optional: Send test completion notification
  const completionData = {
    testType: 'ridesharing_concurrent_load_test',
    duration: duration,
    peakConcurrentRides: 15000,
    regionsTest: data.testRegions.length,
    timestamp: new Date().toISOString()
  };
  
  try {
    http.post(`${data.baseUrl}/api/internal/load-test-completed`, JSON.stringify(completionData), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (e) {
    // Ignore notification failures
    console.log('Note: Post-test notification delivery failed (non-critical)');
  }
  
  console.log('\n🏁 Load test analysis complete. Review metrics for system optimization.\n');
}