// Global Setup for E2E Tests
// Prepares test environment and data for emergency workflow testing

import { chromium, FullConfig } from '@playwright/test';
import { spawn, ChildProcess } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';

// Test data setup
const testData = {
  drivers: [
    {
      id: 'e2e-driver-001',
      email: 'juan.cruz.e2e@test.com',
      password: 'test-password-123',
      name: 'Juan Cruz',
      phone: '+639171234567',
      license: 'E2E-DL-001',
      vehicle: {
        plateNumber: 'E2E-001',
        type: 'Sedan',
        color: 'White'
      },
      location: {
        latitude: 14.5995,
        longitude: 120.9842
      },
      status: 'active'
    }
  ],
  operators: [
    {
      id: 'e2e-operator-001',
      email: 'maria.santos.e2e@test.com',
      password: 'test-password-123',
      name: 'Maria Santos',
      role: 'operator',
      regionId: 'ncr-manila',
      permissions: ['drivers:read', 'bookings:write', 'incidents:write', 'emergency:handle']
    }
  ],
  regions: [
    {
      id: 'ncr-manila',
      code: 'NCR',
      name: 'Metro Manila',
      emergency_services: {
        national_emergency: '911',
        police: '117',
        fire: '116',
        medical: '143'
      }
    }
  ]
};

let backgroundServices: ChildProcess[] = [];

async function globalSetup(config: FullConfig) {
  console.log('🚀 Setting up E2E test environment...');
  
  const baseURL = config.projects[0].use.baseURL || 'http://localhost:3000';
  
  try {
    // 1. Start background services if not running
    await startBackgroundServices();
    
    // 2. Wait for main server to be ready
    await waitForServer(baseURL);
    
    // 3. Setup test database
    await setupTestDatabase();
    
    // 4. Create test users and data
    await createTestData(baseURL);
    
    // 5. Setup mock emergency services
    await setupMockEmergencyServices();
    
    // 6. Create test artifacts directory
    await fs.mkdir('./test-results', { recursive: true });
    await fs.mkdir('./playwright-report', { recursive: true });
    
    console.log('✅ E2E test environment ready');
    
  } catch (error) {
    console.error('❌ Failed to setup E2E test environment:', error);
    throw error;
  }
}

async function startBackgroundServices() {
  console.log('Starting background services...');
  
  // Start Redis (if not running)
  try {
    const redisProcess = spawn('redis-server', ['--port', '6379', '--daemonize', 'yes'], {
      stdio: 'pipe'
    });
    backgroundServices.push(redisProcess);
  } catch (error) {
    console.log('Redis might already be running or not installed locally');
  }
  
  // Start WebSocket service monitor
  const wsMonitor = spawn('node', ['-e', `
    const WebSocket = require('ws');
    const wss = new WebSocket.Server({ port: 8080 });
    console.log('WebSocket monitor running on port 8080');
    
    wss.on('connection', (ws) => {
      console.log('Test WebSocket connection established');
      ws.on('message', (message) => {
        try {
          const data = JSON.parse(message);
          if (data.type === 'emergency') {
            console.log('Emergency WebSocket message received:', data);
          }
        } catch (e) {
          // Ignore non-JSON messages
        }
      });
    });
  `], {
    stdio: 'pipe'
  });
  
  backgroundServices.push(wsMonitor);
  
  // Give services time to start
  await new Promise(resolve => setTimeout(resolve, 2000));
}

async function waitForServer(baseURL: string, maxAttempts = 30) {
  console.log(`Waiting for server at ${baseURL}...`);
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const browser = await chromium.launch();
      const page = await browser.newPage();
      
      const response = await page.goto(`${baseURL}/api/health`, {
        timeout: 5000,
        waitUntil: 'networkidle'
      });
      
      await browser.close();
      
      if (response?.ok()) {
        console.log('✅ Server is ready');
        return;
      }
    } catch (error) {
      console.log(`Attempt ${attempt}/${maxAttempts}: Server not ready yet...`);
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  throw new Error('Server failed to start within timeout period');
}

async function setupTestDatabase() {
  console.log('Setting up test database...');
  
  // Create test database schema and seed data
  // This would typically connect to your actual database
  const dbSetupScript = `
    -- Clean up any existing test data
    DELETE FROM sos_alerts WHERE id LIKE 'e2e-%' OR reporter_id LIKE 'e2e-%';
    DELETE FROM drivers WHERE id LIKE 'e2e-%' OR email LIKE '%e2e@test.com';
    DELETE FROM users WHERE id LIKE 'e2e-%' OR email LIKE '%e2e@test.com';
    DELETE FROM emergency_responses WHERE id LIKE 'e2e-%';
    
    -- Reset sequences if needed
    -- ALTER SEQUENCE sos_alerts_id_seq RESTART WITH 1;
  `;
  
  // You would execute this against your test database
  console.log('Test database setup completed (mocked)');
}

async function createTestData(baseURL: string) {
  console.log('Creating test users and data...');
  
  const browser = await chromium.launch();
  const context = await browser.newContext({
    extraHTTPHeaders: {
      'X-Test-Setup': 'true',
      'Content-Type': 'application/json'
    }
  });
  const page = await context.newPage();
  
  try {
    // Create test drivers
    for (const driver of testData.drivers) {
      const response = await page.evaluate(async (driverData) => {
        return fetch('/api/test/create-driver', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(driverData)
        });
      }, driver);
      
      console.log(`Created test driver: ${driver.email}`);
    }
    
    // Create test operators
    for (const operator of testData.operators) {
      await page.evaluate(async (operatorData) => {
        return fetch('/api/test/create-operator', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(operatorData)
        });
      }, operator);
      
      console.log(`Created test operator: ${operator.email}`);
    }
    
    // Setup test regions
    for (const region of testData.regions) {
      await page.evaluate(async (regionData) => {
        return fetch('/api/test/setup-region', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(regionData)
        });
      }, region);
      
      console.log(`Setup test region: ${region.name}`);
    }
    
  } catch (error) {
    console.error('Failed to create test data:', error);
    // Continue with mock data for now
  } finally {
    await browser.close();
  }
}

async function setupMockEmergencyServices() {
  console.log('Setting up mock emergency services...');
  
  // Create mock emergency service endpoints
  const mockServiceData = {
    national_emergency: {
      endpoint: 'http://localhost:9911/emergency',
      response_time: 2000,
      success_rate: 0.98
    },
    police: {
      endpoint: 'http://localhost:9117/police',
      response_time: 3000,
      success_rate: 0.95
    },
    medical: {
      endpoint: 'http://localhost:9143/medical',
      response_time: 2500,
      success_rate: 0.97
    },
    fire: {
      endpoint: 'http://localhost:9116/fire',
      response_time: 3500,
      success_rate: 0.96
    }
  };
  
  // Start mock servers
  Object.entries(mockServiceData).forEach(([service, config]) => {
    const port = new URL(config.endpoint).port;
    const mockServer = spawn('node', ['-e', `
      const http = require('http');
      const server = http.createServer((req, res) => {
        res.setHeader('Content-Type', 'application/json');
        
        if (req.method === 'POST' && req.url === '/${service}') {
          let body = '';
          req.on('data', chunk => body += chunk);
          req.on('end', () => {
            const shouldSucceed = Math.random() < ${config.success_rate};
            
            setTimeout(() => {
              if (shouldSucceed) {
                res.statusCode = 200;
                res.end(JSON.stringify({
                  status: 'dispatched',
                  service: '${service}',
                  referenceNumber: 'MOCK-' + Date.now(),
                  estimatedArrival: new Date(Date.now() + 600000).toISOString()
                }));
              } else {
                res.statusCode = 503;
                res.end(JSON.stringify({ error: 'Service temporarily unavailable' }));
              }
            }, ${config.response_time});
          });
        } else {
          res.statusCode = 404;
          res.end(JSON.stringify({ error: 'Not found' }));
        }
      });
      
      server.listen(${port}, () => {
        console.log('Mock ${service} service running on port ${port}');
      });
    `], {
      stdio: 'pipe'
    });
    
    backgroundServices.push(mockServer);
  });
  
  // Save mock service configuration
  await fs.writeFile(
    './test-results/mock-services.json',
    JSON.stringify(mockServiceData, null, 2)
  );
  
  console.log('Mock emergency services ready');
}

// Cleanup function
process.on('exit', () => {
  console.log('🧹 Cleaning up background services...');
  backgroundServices.forEach(service => {
    try {
      service.kill();
    } catch (error) {
      // Ignore cleanup errors
    }
  });
});

process.on('SIGINT', () => {
  process.exit();
});

process.on('SIGTERM', () => {
  process.exit();
});

export default globalSetup;