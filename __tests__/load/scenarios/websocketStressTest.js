// WebSocket Stress Test - Real-time Communication Testing
// Tests WebSocket performance under extreme concurrent load

const { check, group } = require('k6');
const ws = require('k6/ws');
const { Counter, Rate, Trend } = require('k6/metrics');

// WebSocket specific metrics
const wsConnectionTime = new Trend('ws_connection_time');
const wsMessageLatency = new Trend('ws_message_latency');
const wsConnectionSuccess = new Rate('ws_connection_success_rate');
const wsMessageDelivery = new Rate('ws_message_delivery_rate');
const wsCriticalAlerts = new Counter('ws_critical_alerts_received');
const wsLocationUpdates = new Counter('ws_location_updates_sent');

export const options = {
  scenarios: {
    // WebSocket connection stress test
    websocket_connections: {
      executor: 'ramping-vus',
      startVUs: 100,
      stages: [
        { duration: '1m', target: 1000 },    // Ramp to 1K connections
        { duration: '2m', target: 5000 },    // Ramp to 5K connections  
        { duration: '5m', target: 10000 },   // Ramp to 10K connections
        { duration: '10m', target: 15000 },  // Peak at 15K connections
        { duration: '5m', target: 20000 },   // Stress test at 20K
        { duration: '2m', target: 10000 },   // Scale back
        { duration: '1m', target: 0 }        // Cool down
      ],
      gracefulRampDown: '30s'
    }
  },
  thresholds: {
    // WebSocket performance thresholds
    'ws_connection_time': ['p(95)<5000', 'p(99)<8000'],      // Connection time under 5s/8s
    'ws_message_latency': ['p(95)<500', 'p(99)<1000'],       // Message latency under 500ms/1s
    'ws_connection_success_rate': ['rate>0.995'],             // 99.5% connection success
    'ws_message_delivery_rate': ['rate>0.999'],               // 99.9% message delivery
    'ws_location_updates_sent': ['count>100000'],             // Minimum location updates
    'ws_critical_alerts_received': ['count>1000']             // Minimum critical alerts
  }
};

// Test user types and behaviors
const userProfiles = [
  { type: 'driver', weight: 30, behavior: 'high_activity' },
  { type: 'operator', weight: 20, behavior: 'medium_activity' },
  { type: 'customer', weight: 40, behavior: 'low_activity' },
  { type: 'admin', weight: 5, behavior: 'monitoring' },
  { type: 'analyst', weight: 5, behavior: 'monitoring' }
];

const regions = ['ncr-manila', 'cebu-city', 'davao-city', 'iloilo-city'];

// Generate user profile for testing
function generateUserProfile(vuId) {
  const random = Math.random() * 100;
  let cumulativeWeight = 0;
  
  for (const profile of userProfiles) {
    cumulativeWeight += profile.weight;
    if (random <= cumulativeWeight) {
      return {
        userId: `ws_test_${profile.type}_${vuId}_${__VU}`,
        userType: profile.type,
        role: profile.type,
        behavior: profile.behavior,
        regionId: regions[Math.floor(Math.random() * regions.length)],
        permissions: getPermissionsForType(profile.type)
      };
    }
  }
  
  return userProfiles[0]; // Fallback
}

function getPermissionsForType(type) {
  const permissionMap = {
    driver: ['drivers:write', 'bookings:read', 'locations:write'],
    operator: ['drivers:read', 'bookings:write', 'incidents:write'],
    customer: ['bookings:write'],
    admin: ['*'],
    analyst: ['analytics:read', 'drivers:read', 'bookings:read']
  };
  return permissionMap[type] || [];
}

// Message generators for different scenarios
const messageGenerators = {
  location_update: (user) => ({
    type: 'location:update',
    driverId: user.userId,
    location: {
      latitude: 14.5995 + (Math.random() - 0.5) * 0.1,
      longitude: 120.9842 + (Math.random() - 0.5) * 0.1,
      accuracy: Math.floor(Math.random() * 20) + 5,
      bearing: Math.floor(Math.random() * 360),
      speed: Math.floor(Math.random() * 80)
    },
    timestamp: Date.now()
  }),
  
  status_change: (user) => ({
    type: 'driver:status_change',
    driverId: user.userId,
    oldStatus: ['active', 'busy', 'offline'][Math.floor(Math.random() * 3)],
    newStatus: ['active', 'busy', 'offline'][Math.floor(Math.random() * 3)],
    timestamp: Date.now()
  }),
  
  emergency_trigger: (user) => ({
    type: 'emergency:trigger',
    userId: user.userId,
    userType: user.userType,
    location: {
      latitude: 14.5995 + (Math.random() - 0.5) * 0.1,
      longitude: 120.9842 + (Math.random() - 0.5) * 0.1
    },
    message: 'Emergency assistance needed',
    priority: 'critical',
    timestamp: Date.now()
  }),
  
  booking_update: (user) => ({
    type: 'booking:update',
    bookingId: `booking_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    customerId: user.userType === 'customer' ? user.userId : `customer_${Math.floor(Math.random() * 10000)}`,
    status: ['requested', 'assigned', 'picked_up', 'completed'][Math.floor(Math.random() * 4)],
    timestamp: Date.now()
  })
};

export default function () {
  const user = generateUserProfile(__ITER);
  const wsUrl = (__ENV.WS_URL || 'ws://localhost:3000').replace('http', 'ws');
  const socketUrl = `${wsUrl}/socket.io/?EIO=4&transport=websocket&userId=${user.userId}`;
  
  group('WebSocket Stress Test', () => {
    const connectionStart = Date.now();
    
    const response = ws.connect(socketUrl, {
      timeout: '30s',
      headers: {
        'Authorization': `Bearer ws_test_token_${user.userId}`
      }
    }, function (socket) {
      
      let isConnected = false;
      let messagesReceived = 0;
      let messagesSent = 0;
      let lastMessageTime = 0;
      
      socket.on('open', () => {
        const connectionTime = Date.now() - connectionStart;
        wsConnectionTime.add(connectionTime);
        wsConnectionSuccess.add(1);
        isConnected = true;
        
        // Authenticate
        socket.send(JSON.stringify({
          type: 'auth',
          token: `ws_test_token_${user.userId}`,
          userId: user.userId,
          userType: user.userType,
          regionId: user.regionId
        }));
        
        // Subscribe to relevant channels based on user type
        const channels = getChannelsForUser(user);
        socket.send(JSON.stringify({
          type: 'subscribe',
          channels: channels
        }));
      });
      
      socket.on('message', (data) => {
        try {
          const message = JSON.parse(data);
          messagesReceived++;
          
          // Calculate message latency if it's a response to our message
          if (message.messageId && lastMessageTime > 0) {
            const latency = Date.now() - lastMessageTime;
            wsMessageLatency.add(latency);
          }
          
          // Track specific message types
          if (message.type === 'CRITICAL_SOS' || message.type === 'emergency:alert') {
            wsCriticalAlerts.add(1);
          }
          
          wsMessageDelivery.add(1);
          
        } catch (e) {
          // Ignore parse errors but track delivery failure
          wsMessageDelivery.add(0);
        }
      });
      
      socket.on('error', (e) => {
        console.error(`WebSocket error for user ${user.userId}:`, e);
        wsConnectionSuccess.add(0);
      });
      
      socket.on('close', () => {
        if (!isConnected) {
          wsConnectionSuccess.add(0);
        }
      });
      
      // Simulate user behavior based on profile
      const behaviorInterval = getBehaviorInterval(user.behavior);
      const messageTypes = getMessageTypesForUser(user);
      
      const behaviorTimer = setInterval(() => {
        if (!isConnected) return;
        
        // Select random message type based on user profile
        const messageType = messageTypes[Math.floor(Math.random() * messageTypes.length)];
        const messageGenerator = messageGenerators[messageType];
        
        if (messageGenerator) {
          const message = messageGenerator(user);
          message.messageId = `${user.userId}_${Date.now()}_${messagesSent}`;
          
          lastMessageTime = Date.now();
          socket.send(JSON.stringify(message));
          messagesSent++;
          
          // Track location updates specifically
          if (messageType === 'location_update') {
            wsLocationUpdates.add(1);
          }
        }
      }, behaviorInterval);
      
      // Connection duration based on user behavior
      const connectionDuration = getConnectionDuration(user.behavior);
      
      socket.setTimeout(() => {
        clearInterval(behaviorTimer);
        socket.close();
      }, connectionDuration);
      
      // Periodic ping to keep connection alive
      const pingInterval = setInterval(() => {
        if (isConnected) {
          socket.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
        }
      }, 25000); // Every 25 seconds
      
      socket.setTimeout(() => {
        clearInterval(pingInterval);
      }, connectionDuration);
    });
    
    // Check connection establishment
    const connectionSuccess = check(response, {
      'WebSocket connection established': (r) => r && r.status === 101,
      'Connection time acceptable': () => (Date.now() - connectionStart) < 10000
    });
    
    if (!connectionSuccess) {
      wsConnectionSuccess.add(0);
    }
  });
}

// Helper functions
function getChannelsForUser(user) {
  const channelMap = {
    driver: ['driver:status', 'booking:assignments', 'emergency:alerts'],
    operator: ['driver:status', 'booking:requests', 'incident:alerts', 'emergency:alerts'],
    customer: ['booking:updates', 'driver:location'],
    admin: ['*'], // All channels
    analyst: ['analytics:metrics', 'system:performance']
  };
  
  return channelMap[user.userType] || [];
}

function getMessageTypesForUser(user) {
  const messageTypeMap = {
    driver: ['location_update', 'status_change', 'emergency_trigger'],
    operator: ['status_change', 'booking_update'],
    customer: ['booking_update', 'emergency_trigger'],
    admin: ['status_change', 'booking_update'],
    analyst: ['status_change']
  };
  
  return messageTypeMap[user.userType] || ['status_change'];
}

function getBehaviorInterval(behavior) {
  const intervalMap = {
    high_activity: 1000,   // Every 1 second
    medium_activity: 3000, // Every 3 seconds
    low_activity: 10000,   // Every 10 seconds
    monitoring: 5000       // Every 5 seconds
  };
  
  return intervalMap[behavior] || 5000;
}

function getConnectionDuration(behavior) {
  const durationMap = {
    high_activity: 300000,  // 5 minutes
    medium_activity: 600000, // 10 minutes
    low_activity: 180000,   // 3 minutes
    monitoring: 1200000     // 20 minutes
  };
  
  return durationMap[behavior] || 300000;
}

export function setup() {
  const wsUrl = __ENV.WS_URL || 'ws://localhost:3000';
  
  console.log('Setting up WebSocket stress test...');
  console.log(`WebSocket URL: ${wsUrl}`);
  console.log(`Peak concurrent connections: 20,000`);
  console.log(`Test duration: ~30 minutes`);
  console.log(`User profiles: ${userProfiles.length}`);
  
  return {
    wsUrl,
    startTime: Date.now(),
    userProfiles,
    regions
  };
}

export function teardown(data) {
  const endTime = Date.now();
  const duration = Math.round((endTime - data.startTime) / 1000);
  
  console.log('\n=== WEBSOCKET STRESS TEST COMPLETED ===');
  console.log(`Test duration: ${duration} seconds`);
  console.log(`Peak connections tested: 20,000`);
  console.log('WebSocket performance metrics will be analyzed...');
}