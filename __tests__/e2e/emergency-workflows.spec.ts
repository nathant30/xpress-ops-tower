// End-to-End Tests for Critical Emergency Workflows
// Tests complete emergency response pipeline from trigger to resolution

import { test, expect, Page, BrowserContext } from '@playwright/test';
import { WebSocket } from 'ws';

// Test configuration
const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:3000';
const WS_URL = process.env.E2E_WS_URL || 'ws://localhost:3000';

// Test data
const testDriver = {
  id: 'e2e-driver-001',
  name: 'Juan Cruz',
  phone: '+639171234567',
  email: 'juan.cruz.e2e@test.com',
  license: 'E2E-DL-001',
  vehicle: {
    plateNumber: 'E2E-001',
    type: 'Sedan',
    color: 'White'
  },
  location: {
    latitude: 14.5995,
    longitude: 120.9842,
    accuracy: 5
  }
};

const testOperator = {
  id: 'e2e-operator-001',
  name: 'Maria Santos',
  email: 'maria.santos.e2e@test.com',
  role: 'operator',
  regionId: 'ncr-manila'
};

const emergencyScenarios = [
  {
    type: 'medical_emergency',
    description: 'Driver experiencing chest pain',
    expectedResponseTime: 3000,
    criticalAlert: true
  },
  {
    type: 'security_threat',
    description: 'Suspicious individuals approaching vehicle',
    expectedResponseTime: 5000,
    criticalAlert: true
  },
  {
    type: 'accident_critical',
    description: 'Vehicle collision with injuries',
    expectedResponseTime: 4000,
    criticalAlert: true
  }
];

// Helper functions
async function authenticateAsDriver(page: Page) {
  await page.goto(`${BASE_URL}/driver/login`);
  await page.fill('[data-testid="email-input"]', testDriver.email);
  await page.fill('[data-testid="password-input"]', 'test-password-123');
  await page.click('[data-testid="login-button"]');
  
  // Wait for successful login
  await expect(page.locator('[data-testid="driver-dashboard"]')).toBeVisible({ timeout: 10000 });
}

async function authenticateAsOperator(page: Page) {
  await page.goto(`${BASE_URL}/operator/login`);
  await page.fill('[data-testid="email-input"]', testOperator.email);
  await page.fill('[data-testid="password-input"]', 'test-password-123');
  await page.click('[data-testid="login-button"]');
  
  // Wait for operator dashboard
  await expect(page.locator('[data-testid="operator-dashboard"]')).toBeVisible({ timeout: 10000 });
}

async function setupWebSocketConnection(userId: string): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`${WS_URL}/socket.io/?EIO=4&transport=websocket`);
    
    ws.on('open', () => {
      // Authenticate WebSocket connection
      ws.send(JSON.stringify({
        type: 'auth',
        token: `e2e-test-token-${userId}`,
        userId: userId
      }));
      
      // Subscribe to emergency channels
      ws.send(JSON.stringify({
        type: 'subscribe',
        channels: ['emergency:critical', 'emergency:alerts', 'sos:updates']
      }));
      
      resolve(ws);
    });
    
    ws.on('error', reject);
    
    // Timeout after 10 seconds
    setTimeout(() => reject(new Error('WebSocket connection timeout')), 10000);
  });
}

test.describe('Emergency Workflow End-to-End Tests', () => {
  let driverContext: BrowserContext;
  let operatorContext: BrowserContext;
  let driverPage: Page;
  let operatorPage: Page;
  let driverWs: WebSocket;
  let operatorWs: WebSocket;

  test.beforeAll(async ({ browser }) => {
    // Create separate browser contexts for driver and operator
    driverContext = await browser.newContext({
      viewport: { width: 375, height: 667 }, // Mobile viewport for driver
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15'
    });
    
    operatorContext = await browser.newContext({
      viewport: { width: 1920, height: 1080 } // Desktop viewport for operator
    });
    
    driverPage = await driverContext.newPage();
    operatorPage = await operatorContext.newPage();
    
    // Set up WebSocket connections
    driverWs = await setupWebSocketConnection(testDriver.id);
    operatorWs = await setupWebSocketConnection(testOperator.id);
  });

  test.afterAll(async () => {
    // Clean up WebSocket connections
    if (driverWs) driverWs.close();
    if (operatorWs) operatorWs.close();
    
    // Clean up browser contexts
    await driverContext.close();
    await operatorContext.close();
  });

  test.beforeEach(async () => {
    // Set up test environment
    await test.step('Setup test environment', async () => {
      // Clear any existing alerts
      await driverPage.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
      });
      
      await operatorPage.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
      });
    });
  });

  test('Critical Emergency: Medical Emergency Flow', async () => {
    const scenario = emergencyScenarios.find(s => s.type === 'medical_emergency');
    let sosAlert: any = null;
    let emergencyProcessingStartTime: number;
    
    await test.step('Driver authentication and location sharing', async () => {
      await authenticateAsDriver(driverPage);
      
      // Enable location sharing
      await driverPage.click('[data-testid="enable-location-btn"]');
      await expect(driverPage.locator('[data-testid="location-status"]')).toHaveText('Location Active');
    });

    await test.step('Operator authentication and monitoring setup', async () => {
      await authenticateAsOperator(operatorPage);
      
      // Navigate to emergency monitoring
      await operatorPage.click('[data-testid="emergency-monitoring-tab"]');
      await expect(operatorPage.locator('[data-testid="emergency-dashboard"]')).toBeVisible();
    });

    await test.step('Trigger SOS Emergency', async () => {
      emergencyProcessingStartTime = Date.now();
      
      // Driver triggers SOS
      await driverPage.click('[data-testid="sos-button"]');
      
      // Select emergency type
      await driverPage.click(`[data-testid="emergency-type-${scenario.type}"]`);
      
      // Add description
      await driverPage.fill('[data-testid="emergency-description"]', scenario.description);
      
      // Confirm emergency
      await driverPage.click('[data-testid="confirm-emergency-btn"]');
      
      // Verify SOS confirmation appears
      await expect(driverPage.locator('[data-testid="sos-confirmed"]')).toBeVisible({ timeout: 5000 });
      
      // Extract SOS code for tracking
      const sosCode = await driverPage.locator('[data-testid="sos-code"]').textContent();
      expect(sosCode).toMatch(/^SOS-\d+-[A-Z0-9]+$/);
    });

    await test.step('Verify Real-time Alert Broadcasting', async () => {
      // Listen for critical alert on WebSocket
      const criticalAlertReceived = new Promise((resolve) => {
        const timeout = setTimeout(() => resolve(false), 10000); // 10 second timeout
        
        operatorWs.on('message', (data) => {
          try {
            const message = JSON.parse(data.toString());
            if (message.type === 'CRITICAL_SOS' && message.emergencyType === scenario.type) {
              clearTimeout(timeout);
              sosAlert = message;
              resolve(true);
            }
          } catch (e) {
            // Ignore parse errors
          }
        });
      });
      
      const alertReceived = await criticalAlertReceived;
      expect(alertReceived).toBe(true);
      expect(sosAlert).toBeDefined();
      expect(sosAlert.requiresImmediateResponse).toBe(true);
    });

    await test.step('Operator receives and acknowledges emergency', async () => {
      // Wait for critical alert to appear in operator dashboard
      await expect(operatorPage.locator('[data-testid="critical-emergency-alert"]')).toBeVisible({ timeout: 8000 });
      
      // Verify emergency details
      const alertDetails = operatorPage.locator('[data-testid="emergency-details"]');
      await expect(alertDetails.locator('[data-testid="emergency-type"]')).toHaveText(scenario.type);
      await expect(alertDetails.locator('[data-testid="emergency-description"]')).toContainText(scenario.description);
      
      // Verify emergency sound/visual indicators
      await expect(operatorPage.locator('[data-testid="emergency-audio-alert"]')).toHaveAttribute('data-playing', 'true');
      await expect(operatorPage.locator('[data-testid="screen-flash"]')).toHaveClass(/flashing/);
      
      // Acknowledge emergency
      const acknowledgeStartTime = Date.now();
      await operatorPage.click('[data-testid="acknowledge-emergency-btn"]');
      
      // Fill acknowledgment details
      await operatorPage.fill('[data-testid="acknowledgment-message"]', 'Emergency received - dispatching medical assistance');
      await operatorPage.click('[data-testid="submit-acknowledgment-btn"]');
      
      // Verify acknowledgment success
      await expect(operatorPage.locator('[data-testid="emergency-status"]')).toHaveText('Acknowledged');
      
      const acknowledgeTime = Date.now() - acknowledgeStartTime;
      expect(acknowledgeTime).toBeLessThan(30000); // Should acknowledge within 30 seconds
    });

    await test.step('Verify Emergency Services Integration', async () => {
      // Check that emergency services were notified
      await expect(operatorPage.locator('[data-testid="emergency-services-status"]')).toContainText('Notified');
      
      // Verify service types based on emergency type
      const expectedServices = ['national_emergency', 'medical'];
      for (const service of expectedServices) {
        await expect(operatorPage.locator(`[data-testid="service-${service}"]`)).toHaveText('Dispatched');
      }
      
      // Check reference numbers
      await expect(operatorPage.locator('[data-testid="emergency-reference-numbers"]')).toBeVisible();
    });

    await test.step('Driver receives confirmation and updates', async () => {
      // Driver should see acknowledgment
      await expect(driverPage.locator('[data-testid="emergency-acknowledged"]')).toBeVisible({ timeout: 10000 });
      
      // Verify help is coming message
      await expect(driverPage.locator('[data-testid="help-message"]')).toContainText('Help is on the way');
      
      // Check estimated arrival time
      await expect(driverPage.locator('[data-testid="estimated-arrival"]')).toBeVisible();
    });

    await test.step('Monitor emergency response time', async () => {
      const totalProcessingTime = Date.now() - emergencyProcessingStartTime;
      
      // Critical: Emergency processing should be under 5 seconds
      expect(totalProcessingTime).toBeLessThan(scenario.expectedResponseTime);
      
      console.log(`Emergency processing time: ${totalProcessingTime}ms (Target: <${scenario.expectedResponseTime}ms)`);
    });

    await test.step('Emergency resolution workflow', async () => {
      // Simulate emergency services arrival
      await operatorPage.click('[data-testid="update-emergency-status"]');
      await operatorPage.selectOption('[data-testid="status-select"]', 'responding');
      await operatorPage.fill('[data-testid="status-message"]', 'Medical team en route - ETA 5 minutes');
      await operatorPage.click('[data-testid="update-status-btn"]');
      
      // Driver receives update
      await expect(driverPage.locator('[data-testid="emergency-update"]')).toBeVisible({ timeout: 5000 });
      
      // Mark as resolved
      await operatorPage.selectOption('[data-testid="status-select"]', 'resolved');
      await operatorPage.fill('[data-testid="resolution-details"]', 'Medical assistance provided - patient stable');
      await operatorPage.click('[data-testid="resolve-emergency-btn"]');
      
      // Verify resolution
      await expect(operatorPage.locator('[data-testid="emergency-status"]')).toHaveText('Resolved');
      await expect(driverPage.locator('[data-testid="emergency-resolved"]')).toBeVisible({ timeout: 5000 });
    });
  });

  test('Panic Button Emergency Workflow', async () => {
    await test.step('Driver setup and panic button access', async () => {
      await authenticateAsDriver(driverPage);
      
      // Navigate to panic button (should be easily accessible)
      await expect(driverPage.locator('[data-testid="panic-button"]')).toBeVisible();
      await expect(driverPage.locator('[data-testid="panic-button"]')).toHaveClass(/panic-button-ready/);
    });

    await test.step('Operator monitoring setup', async () => {
      await authenticateAsOperator(operatorPage);
      await operatorPage.click('[data-testid="emergency-monitoring-tab"]');
    });

    await test.step('Trigger panic button', async () => {
      const panicStartTime = Date.now();
      
      // Long press panic button (3 seconds to prevent accidental triggers)
      await driverPage.locator('[data-testid="panic-button"]').hover();
      await driverPage.mouse.down();
      
      // Show countdown
      await expect(driverPage.locator('[data-testid="panic-countdown"]')).toBeVisible();
      
      // Wait for countdown (3 seconds)
      await driverPage.waitForTimeout(3000);
      await driverPage.mouse.up();
      
      // Panic triggered
      await expect(driverPage.locator('[data-testid="panic-triggered"]')).toBeVisible({ timeout: 2000 });
      
      const panicProcessingTime = Date.now() - panicStartTime;
      expect(panicProcessingTime).toBeLessThan(5000); // Should process within 5 seconds
    });

    await test.step('Verify immediate escalation', async () => {
      // Panic button should escalate faster than regular SOS
      await expect(operatorPage.locator('[data-testid="critical-emergency-alert"]')).toBeVisible({ timeout: 3000 });
      
      // Should indicate panic button trigger
      await expect(operatorPage.locator('[data-testid="trigger-method"]')).toHaveText('Panic Button');
      
      // Should have highest priority
      await expect(operatorPage.locator('[data-testid="emergency-priority"]')).toHaveText('CRITICAL');
    });

    await test.step('Automatic location and context sharing', async () => {
      // Panic button should automatically share driver location and context
      await expect(operatorPage.locator('[data-testid="driver-location"]')).toBeVisible();
      await expect(operatorPage.locator('[data-testid="vehicle-info"]')).toContainText(testDriver.vehicle.plateNumber);
      
      // Should share recent trip context if available
      const contextInfo = operatorPage.locator('[data-testid="context-info"]');
      if (await contextInfo.isVisible()) {
        await expect(contextInfo).toContainText('Recent activity');
      }
    });
  });

  test('Multiple Concurrent Emergencies Handling', async () => {
    // Create multiple driver contexts
    const drivers = [];
    for (let i = 0; i < 3; i++) {
      const driverCtx = await driverContext.browser().newContext();
      const driverPg = await driverCtx.newPage();
      drivers.push({ context: driverCtx, page: driverPg, id: `concurrent-driver-${i}` });
    }

    await test.step('Setup multiple drivers', async () => {
      for (const driver of drivers) {
        await driver.page.goto(`${BASE_URL}/driver/login`);
        await driver.page.fill('[data-testid="email-input"]', `${driver.id}@test.com`);
        await driver.page.fill('[data-testid="password-input"]', 'test-password-123');
        await driver.page.click('[data-testid="login-button"]');
        await expect(driver.page.locator('[data-testid="driver-dashboard"]')).toBeVisible();
      }
    });

    await test.step('Operator monitoring setup', async () => {
      await authenticateAsOperator(operatorPage);
      await operatorPage.click('[data-testid="emergency-monitoring-tab"]');
    });

    await test.step('Trigger simultaneous emergencies', async () => {
      const emergencyPromises = drivers.map(async (driver, index) => {
        const scenario = emergencyScenarios[index];
        
        await driver.page.click('[data-testid="sos-button"]');
        await driver.page.click(`[data-testid="emergency-type-${scenario.type}"]`);
        await driver.page.fill('[data-testid="emergency-description"]', `Concurrent emergency ${index + 1}`);
        await driver.page.click('[data-testid="confirm-emergency-btn"]');
        
        return expect(driver.page.locator('[data-testid="sos-confirmed"]')).toBeVisible({ timeout: 8000 });
      });
      
      // All emergencies should be processed successfully
      await Promise.all(emergencyPromises);
    });

    await test.step('Verify operator can handle multiple emergencies', async () => {
      // Should show multiple critical alerts
      const emergencyAlerts = operatorPage.locator('[data-testid="critical-emergency-alert"]');
      await expect(emergencyAlerts).toHaveCount(3, { timeout: 10000 });
      
      // Should be able to acknowledge each emergency
      const alerts = await emergencyAlerts.all();
      for (let i = 0; i < alerts.length; i++) {
        await alerts[i].locator('[data-testid="acknowledge-emergency-btn"]').click();
        await operatorPage.fill('[data-testid="acknowledgment-message"]', `Handling emergency ${i + 1}`);
        await operatorPage.click('[data-testid="submit-acknowledgment-btn"]');
        
        // Brief pause between acknowledgments
        await operatorPage.waitForTimeout(1000);
      }
      
      // All should be acknowledged
      await expect(operatorPage.locator('[data-testid="emergency-status"][data-status="acknowledged"]')).toHaveCount(3);
    });

    // Cleanup
    for (const driver of drivers) {
      await driver.context.close();
    }
  });

  test('Emergency Communication and Coordination', async () => {
    let sosCode: string;

    await test.step('Setup emergency scenario', async () => {
      await authenticateAsDriver(driverPage);
      await authenticateAsOperator(operatorPage);
      
      // Trigger emergency
      await driverPage.click('[data-testid="sos-button"]');
      await driverPage.click('[data-testid="emergency-type-security_threat"]');
      await driverPage.fill('[data-testid="emergency-description"]', 'Suspicious individuals around vehicle');
      await driverPage.click('[data-testid="confirm-emergency-btn"]');
      
      // Get SOS code
      sosCode = await driverPage.locator('[data-testid="sos-code"]').textContent() || '';
    });

    await test.step('Two-way communication during emergency', async () => {
      // Operator acknowledges and sends message to driver
      await operatorPage.click('[data-testid="emergency-monitoring-tab"]');
      await expect(operatorPage.locator('[data-testid="critical-emergency-alert"]')).toBeVisible();
      
      await operatorPage.click('[data-testid="acknowledge-emergency-btn"]');
      await operatorPage.fill('[data-testid="acknowledgment-message"]', 'Stay calm. Police dispatched to your location.');
      await operatorPage.click('[data-testid="submit-acknowledgment-btn"]');
      
      // Driver receives message
      await expect(driverPage.locator('[data-testid="operator-message"]')).toContainText('Stay calm');
      
      // Driver can respond
      await driverPage.click('[data-testid="send-message-btn"]');
      await driverPage.fill('[data-testid="message-input"]', 'They are approaching the vehicle now');
      await driverPage.click('[data-testid="send-btn"]');
      
      // Operator receives driver message
      await expect(operatorPage.locator('[data-testid="driver-message"]')).toContainText('approaching the vehicle');
    });

    await test.step('Emergency escalation and coordination', async () => {
      // Operator escalates to supervisor
      await operatorPage.click('[data-testid="escalate-emergency-btn"]');
      await operatorPage.selectOption('[data-testid="escalate-to"]', 'supervisor');
      await operatorPage.fill('[data-testid="escalation-reason"]', 'Active threat - need immediate police response');
      await operatorPage.click('[data-testid="confirm-escalation-btn"]');
      
      // Verify escalation
      await expect(operatorPage.locator('[data-testid="emergency-escalated"]')).toBeVisible();
      await expect(operatorPage.locator('[data-testid="escalation-status"]')).toHaveText('Escalated to Supervisor');
    });

    await test.step('Real-time location sharing during emergency', async () => {
      // Driver location should be continuously shared
      await expect(operatorPage.locator('[data-testid="live-location-indicator"]')).toBeVisible();
      
      // Simulate driver movement
      await driverPage.evaluate(() => {
        // Mock location update
        window.dispatchEvent(new CustomEvent('locationUpdate', {
          detail: {
            latitude: 14.6005, // Slightly moved
            longitude: 120.9852,
            accuracy: 3
          }
        }));
      });
      
      // Operator should see updated location
      await expect(operatorPage.locator('[data-testid="location-updated"]')).toBeVisible({ timeout: 5000 });
    });
  });

  test('Emergency System Performance Under Load', async () => {
    await test.step('Operator monitoring setup', async () => {
      await authenticateAsOperator(operatorPage);
      await operatorPage.click('[data-testid="emergency-monitoring-tab"]');
    });

    await test.step('Rapid emergency triggers test', async () => {
      // Create multiple driver sessions
      const driverSessions = [];
      for (let i = 0; i < 10; i++) {
        const ctx = await driverContext.browser().newContext();
        const page = await ctx.newPage();
        driverSessions.push({ context: ctx, page, id: `load-test-driver-${i}` });
      }

      // Authenticate all drivers
      for (const session of driverSessions) {
        await session.page.goto(`${BASE_URL}/driver/login`);
        await session.page.fill('[data-testid="email-input"]', `${session.id}@test.com`);
        await session.page.fill('[data-testid="password-input"]', 'test-password-123');
        await session.page.click('[data-testid="login-button"]');
        await expect(session.page.locator('[data-testid="driver-dashboard"]')).toBeVisible();
      }

      // Trigger emergencies rapidly
      const startTime = Date.now();
      const emergencyPromises = driverSessions.map(async (session, index) => {
        // Stagger triggers slightly to simulate real-world scenario
        await session.page.waitForTimeout(index * 100);
        
        await session.page.click('[data-testid="sos-button"]');
        await session.page.click('[data-testid="emergency-type-general_emergency"]');
        await session.page.fill('[data-testid="emergency-description"]', `Load test emergency ${index}`);
        await session.page.click('[data-testid="confirm-emergency-btn"]');
        
        return expect(session.page.locator('[data-testid="sos-confirmed"]')).toBeVisible({ timeout: 10000 });
      });
      
      await Promise.all(emergencyPromises);
      const totalProcessingTime = Date.now() - startTime;
      
      // All 10 emergencies should be processed within 15 seconds
      expect(totalProcessingTime).toBeLessThan(15000);

      // Operator should see all emergency alerts
      await expect(operatorPage.locator('[data-testid="critical-emergency-alert"]')).toHaveCount(10, { timeout: 20000 });

      // Cleanup
      for (const session of driverSessions) {
        await session.context.close();
      }
    });
  });

  test('Emergency System Failover and Recovery', async () => {
    await test.step('Setup normal emergency flow', async () => {
      await authenticateAsDriver(driverPage);
      await authenticateAsOperator(operatorPage);
    });

    await test.step('Simulate WebSocket disconnection during emergency', async () => {
      // Trigger emergency
      await driverPage.click('[data-testid="sos-button"]');
      await driverPage.click('[data-testid="emergency-type-medical_emergency"]');
      await driverPage.fill('[data-testid="emergency-description"]', 'Network connectivity test emergency');
      
      // Simulate network disconnection
      await driverContext.setOffline(true);
      
      await driverPage.click('[data-testid="confirm-emergency-btn"]');
      
      // Should show offline mode
      await expect(driverPage.locator('[data-testid="offline-mode-indicator"]')).toBeVisible({ timeout: 5000 });
      
      // Emergency should still be queued
      await expect(driverPage.locator('[data-testid="emergency-queued"]')).toBeVisible();
      
      // Restore connection
      await driverContext.setOffline(false);
      
      // Emergency should be sent when connection is restored
      await expect(driverPage.locator('[data-testid="sos-confirmed"]')).toBeVisible({ timeout: 15000 });
      
      // Operator should receive the emergency
      await expect(operatorPage.locator('[data-testid="critical-emergency-alert"]')).toBeVisible({ timeout: 10000 });
    });

    await test.step('Test emergency backup communication channels', async () => {
      // If primary channel fails, should fall back to HTTP polling
      await driverPage.evaluate(() => {
        // Mock WebSocket failure
        window.WebSocket = class {
          constructor() {
            setTimeout(() => {
              if (this.onerror) this.onerror(new Error('Connection failed'));
            }, 100);
          }
          send() {}
          close() {}
        };
      });
      
      // Trigger another emergency
      await driverPage.click('[data-testid="sos-button"]');
      await driverPage.click('[data-testid="emergency-type-security_threat"]');
      await driverPage.fill('[data-testid="emergency-description"]', 'Backup channel test');
      await driverPage.click('[data-testid="confirm-emergency-btn"]');
      
      // Should fall back to HTTP and still work
      await expect(driverPage.locator('[data-testid="sos-confirmed"]')).toBeVisible({ timeout: 10000 });
      await expect(driverPage.locator('[data-testid="fallback-mode"]')).toBeVisible();
    });
  });
});

test.describe('Emergency System Accessibility', () => {
  test('Emergency features work with screen reader', async ({ page }) => {
    // Test accessibility for vision-impaired drivers
    await page.goto(`${BASE_URL}/driver/login`);
    await page.fill('[data-testid="email-input"]', testDriver.email);
    await page.fill('[data-testid="password-input"]', 'test-password-123');
    await page.click('[data-testid="login-button"]');
    
    // Check ARIA labels and roles
    const sosButton = page.locator('[data-testid="sos-button"]');
    await expect(sosButton).toHaveAttribute('aria-label', 'Emergency SOS Button - Press and hold for 3 seconds');
    await expect(sosButton).toHaveAttribute('role', 'button');
    
    // Check keyboard navigation
    await page.keyboard.press('Tab'); // Navigate to SOS button
    await expect(sosButton).toBeFocused();
    
    // Check high contrast mode
    await page.emulateMedia({ forcedColors: 'active' });
    await expect(sosButton).toBeVisible(); // Should still be visible in high contrast
  });

  test('Emergency features work on mobile devices', async ({ page }) => {
    // Test mobile-specific emergency features
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.goto(`${BASE_URL}/driver/login`);
    await page.fill('[data-testid="email-input"]', testDriver.email);
    await page.fill('[data-testid="password-input"]', 'test-password-123');
    await page.click('[data-testid="login-button"]');
    
    // SOS button should be easily accessible with thumb
    const sosButton = page.locator('[data-testid="sos-button"]');
    const boundingBox = await sosButton.boundingBox();
    
    expect(boundingBox?.width).toBeGreaterThan(44); // Minimum touch target size
    expect(boundingBox?.height).toBeGreaterThan(44);
    
    // Test touch gestures
    await sosButton.tap();
    await expect(page.locator('[data-testid="emergency-type-selector"]')).toBeVisible();
    
    // Test landscape orientation
    await page.setViewportSize({ width: 667, height: 375 });
    await expect(sosButton).toBeVisible();
  });
});