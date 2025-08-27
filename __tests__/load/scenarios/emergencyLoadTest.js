// Emergency System Load Test - Critical Performance Testing
// Tests SOS system under extreme load to ensure <5 second response

const { check, group, fail } = require('k6');
const http = require('k6/http');
const ws = require('k6/ws');
const { Counter, Rate, Trend } = require('k6/metrics');

// Custom metrics for emergency testing
const emergencyResponseTime = new Trend('emergency_response_time');
const sosProcessingTime = new Trend('sos_processing_time');
const emergencyFailureRate = new Rate('emergency_failure_rate');
const criticalAlertDelivery = new Rate('critical_alert_delivery_rate');

// Emergency test configuration
export const options = {
  stages: [
    { duration: '2m', target: 1000 },   // Warm up
    { duration: '5m', target: 5000 },   // Ramp to high load
    { duration: '10m', target: 10000 }, // Peak emergency load
    { duration: '3m', target: 15000 },  // Stress test
    { duration: '5m', target: 10000 },  // Scale back
    { duration: '2m', target: 0 }       // Cool down
  ],
  thresholds: {
    // Critical emergency response thresholds
    'emergency_response_time': ['p(95)<5000', 'p(99)<8000'], // 95% under 5s, 99% under 8s
    'sos_processing_time': ['p(95)<3000', 'p(99)<5000'],     // SOS processing under 3s/5s
    'emergency_failure_rate': ['rate<0.001'],                 // Less than 0.1% failure rate
    'critical_alert_delivery_rate': ['rate>0.999'],           // 99.9% delivery rate
    'http_req_duration': ['p(95)<5000'],
    'http_req_failed': ['rate<0.01']
  }
};

// Test data for emergency scenarios
const emergencyTypes = [
  'medical_emergency',
  'fire_emergency', 
  'kidnapping',
  'accident_critical',
  'security_threat',
  'natural_disaster',
  'domestic_violence',
  'general_emergency'
];

const testRegions = [
  'ncr-manila',
  'cebu-city', 
  'davao-city',
  'iloilo-city'
];

// Generate test user data
function generateTestUser(userId) {
  const isDriver = Math.random() < 0.3; // 30% drivers, 70% customers/operators
  
  return {
    userId: `load_test_user_${userId}_${__VU}`,
    userType: isDriver ? 'driver' : 'customer',
    regionId: testRegions[Math.floor(Math.random() * testRegions.length)],
    name: `Test User ${userId}`,
    phone: `+6391${String(Math.floor(Math.random() * 10000000)).padStart(7, '0')}`,
    location: {
      latitude: 14.5995 + (Math.random() - 0.5) * 0.1,
      longitude: 120.9842 + (Math.random() - 0.5) * 0.1,
      accuracy: Math.floor(Math.random() * 20) + 5
    }
  };
}

// Generate emergency scenario
function generateEmergencyScenario(user) {
  const emergencyType = emergencyTypes[Math.floor(Math.random() * emergencyTypes.length)];
  const severity = emergencyType.includes('medical') || emergencyType.includes('fire') || emergencyType.includes('kidnapping') ? 10 : Math.floor(Math.random() * 4) + 6;
  
  return {
    reporterId: user.userId,
    reporterType: user.userType,
    reporterName: user.name,
    reporterPhone: user.phone,
    location: {
      latitude: user.location.latitude + (Math.random() - 0.5) * 0.01,
      longitude: user.location.longitude + (Math.random() - 0.5) * 0.01,
      accuracy: user.location.accuracy
    },
    emergencyType: emergencyType,
    description: getEmergencyDescription(emergencyType),
    severity: severity,
    driverId: user.userType === 'driver' ? user.userId : null,
    vehicleInfo: user.userType === 'driver' ? {
      plateNumber: `TEST-${Math.floor(Math.random() * 9999)}`,
      type: 'Sedan',
      color: 'White'
    } : null
  };
}

function getEmergencyDescription(type) {
  const descriptions = {
    'medical_emergency': 'Patient needs immediate medical attention',
    'fire_emergency': 'Fire reported - need immediate response',
    'kidnapping': 'Possible kidnapping in progress',
    'accident_critical': 'Serious traffic accident with injuries',
    'security_threat': 'Security threat reported',
    'natural_disaster': 'Natural disaster response needed',
    'domestic_violence': 'Domestic violence incident',
    'general_emergency': 'General emergency assistance needed'
  };
  return descriptions[type] || 'Emergency assistance required';
}

export default function () {
  const user = generateTestUser(__ITER);
  const baseUrl = __ENV.BASE_URL || 'http://localhost:3000';
  
  // Authentication setup (mock token for load testing)
  const authHeaders = {
    'Authorization': `Bearer load_test_token_${user.userId}`,
    'Content-Type': 'application/json'
  };

  group('Emergency System Load Test', () => {
    
    // Test 1: SOS Alert Processing
    group('SOS Alert Processing', () => {
      const emergencyData = generateEmergencyScenario(user);
      const startTime = Date.now();
      
      const response = http.post(`${baseUrl}/api/emergency/sos`, JSON.stringify(emergencyData), {
        headers: authHeaders,
        timeout: '10s'
      });
      
      const responseTime = Date.now() - startTime;
      emergencyResponseTime.add(responseTime);
      
      const success = check(response, {
        'SOS alert created': (r) => r.status === 201 || r.status === 200,
        'Response time under 5s': () => responseTime < 5000,
        'Returns SOS ID': (r) => {
          try {
            const body = JSON.parse(r.body);
            return body.id && body.sosCode;
          } catch {
            return false;
          }
        }
      });
      
      if (!success) {
        emergencyFailureRate.add(1);
        console.error(`Emergency SOS failed: ${response.status} - ${response.body}`);
      } else {
        emergencyFailureRate.add(0);
      }
      
      // Track SOS processing time if available
      try {
        const body = JSON.parse(response.body);
        if (body.processingTime) {
          sosProcessingTime.add(body.processingTime);
        }
      } catch (e) {
        // Ignore parsing errors
      }
    });

    // Test 2: Panic Button Trigger (for drivers)
    if (user.userType === 'driver') {
      group('Panic Button Test', () => {
        const panicData = {
          driverId: user.userId,
          location: user.location,
          emergencyType: emergencyTypes[Math.floor(Math.random() * emergencyTypes.length)],
          description: 'Panic button pressed - need immediate help'
        };
        
        const startTime = Date.now();
        const response = http.post(`${baseUrl}/api/emergency/panic-button`, JSON.stringify(panicData), {
          headers: authHeaders,
          timeout: '8s'
        });
        
        const responseTime = Date.now() - startTime;
        
        check(response, {
          'Panic button processed': (r) => r.status === 201 || r.status === 200,
          'Response time under 3s': () => responseTime < 3000,
          'Emergency services notified': (r) => {
            try {
              const body = JSON.parse(r.body);
              return body.emergencyServicesNotified && body.emergencyServicesNotified.length > 0;
            } catch {
              return false;
            }
          }
        });
      });
    }

    // Test 3: Emergency Response Monitoring
    group('Emergency Response Monitoring', () => {
      const response = http.get(`${baseUrl}/api/emergency/responses?region=${user.regionId}`, {
        headers: authHeaders,
        timeout: '5s'
      });
      
      check(response, {
        'Emergency responses retrieved': (r) => r.status === 200,
        'Response includes active emergencies': (r) => {
          try {
            const body = JSON.parse(r.body);
            return Array.isArray(body.activeEmergencies);
          } catch {
            return false;
          }
        }
      });
    });

    // Test 4: WebSocket Emergency Alerts
    group('WebSocket Emergency Alerts', () => {
      const wsUrl = (__ENV.WS_URL || 'ws://localhost:3000').replace('http', 'ws');
      
      const response = ws.connect(`${wsUrl}/socket.io/?EIO=4&transport=websocket`, {
        timeout: '30s'
      }, function (socket) {
        
        socket.on('open', () => {
          // Authenticate WebSocket connection
          socket.send(JSON.stringify({
            type: 'auth',
            token: `load_test_token_${user.userId}`
          }));
          
          // Subscribe to emergency channels
          socket.send(JSON.stringify({
            type: 'subscribe',
            channels: ['emergency:critical', 'emergency:alerts', 'sos:updates']
          }));
        });
        
        let alertReceived = false;
        socket.on('message', (data) => {
          try {
            const message = JSON.parse(data);
            if (message.type === 'CRITICAL_SOS' || message.type === 'emergency:alert') {
              alertReceived = true;
              criticalAlertDelivery.add(1);
            }
          } catch (e) {
            // Ignore parse errors
          }
        });
        
        // Keep connection open for alert testing
        socket.setTimeout(() => {
          if (!alertReceived) {
            criticalAlertDelivery.add(0);
          }
          socket.close();
        }, 5000);
      });
      
      check(response, {
        'WebSocket connection established': (r) => r && r.status === 101
      });
    });

    // Test 5: Emergency Service Integration Check
    group('Emergency Service Integration', () => {
      const response = http.get(`${baseUrl}/api/integrations/emergency/status`, {
        headers: authHeaders,
        timeout: '3s'
      });
      
      check(response, {
        'Emergency services online': (r) => r.status === 200,
        'Services responding': (r) => {
          try {
            const body = JSON.parse(r.body);
            return body.services && Object.values(body.services).every(s => s.status === 'online');
          } catch {
            return false;
          }
        }
      });
    });

    // Test 6: High-Frequency Location Updates (Stress Test)
    if (Math.random() < 0.3) { // 30% of users send rapid location updates
      group('High-Frequency Location Updates', () => {
        for (let i = 0; i < 5; i++) {
          const locationUpdate = {
            driverId: user.userId,
            location: {
              latitude: user.location.latitude + (Math.random() - 0.5) * 0.001,
              longitude: user.location.longitude + (Math.random() - 0.5) * 0.001,
              accuracy: user.location.accuracy,
              bearing: Math.floor(Math.random() * 360),
              speed: Math.floor(Math.random() * 60)
            },
            timestamp: Date.now()
          };
          
          const response = http.post(`${baseUrl}/api/locations/${user.userId}`, JSON.stringify(locationUpdate), {
            headers: authHeaders,
            timeout: '2s'
          });
          
          check(response, {
            'Location update processed': (r) => r.status === 200 || r.status === 201
          });
          
          // Small delay between rapid updates
          if (i < 4) {
            require('k6').sleep(0.2); // 200ms delay
          }
        }
      });
    }
  });

  // Random sleep to simulate real user behavior
  require('k6').sleep(Math.random() * 2 + 0.5); // 0.5-2.5 second delay
}

// Setup function to prepare test data
export function setup() {
  const baseUrl = __ENV.BASE_URL || 'http://localhost:3000';
  
  console.log('Setting up emergency load test...');
  console.log(`Target URL: ${baseUrl}`);
  console.log(`Test duration: ~30 minutes`);
  console.log(`Peak concurrent users: 15,000`);
  console.log(`Emergency scenarios: ${emergencyTypes.length}`);
  
  // Verify system is ready
  const healthCheck = http.get(`${baseUrl}/api/health`);
  if (healthCheck.status !== 200) {
    throw new Error(`System health check failed: ${healthCheck.status}`);
  }
  
  return {
    baseUrl,
    startTime: Date.now(),
    emergencyTypes,
    testRegions
  };
}

// Teardown function to cleanup and report results
export function teardown(data) {
  const endTime = Date.now();
  const duration = Math.round((endTime - data.startTime) / 1000);
  
  console.log('\n=== EMERGENCY LOAD TEST COMPLETED ===');
  console.log(`Test duration: ${duration} seconds`);
  console.log('Critical metrics will be analyzed...');
  console.log('Check performance thresholds for emergency system compliance');
  
  // Optional: Send completion notification
  const notificationData = {
    test: 'emergency_load_test',
    duration: duration,
    timestamp: new Date().toISOString(),
    peak_users: 15000
  };
  
  try {
    http.post(`${data.baseUrl}/api/internal/test-completed`, JSON.stringify(notificationData), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (e) {
    // Ignore notification failures
  }
}