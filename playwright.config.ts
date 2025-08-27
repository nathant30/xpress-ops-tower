// Playwright Configuration for Xpress Ops Tower E2E Tests
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './__tests__/e2e',
  
  // Test configuration
  timeout: 60000, // 60 seconds per test (emergencies need longer timeouts)
  expect: { timeout: 10000 }, // 10 seconds for assertions
  
  // Global setup and teardown
  globalSetup: require.resolve('./__tests__/e2e/global-setup.ts'),
  globalTeardown: require.resolve('./__tests__/e2e/global-teardown.ts'),
  
  // Run tests in parallel, but limit for emergency testing
  fullyParallel: false,
  workers: process.env.CI ? 2 : 3,
  
  // Retry configuration
  retries: process.env.CI ? 2 : 1,
  
  // Reporter configuration
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'test-results/results.json' }],
    ['junit', { outputFile: 'test-results/junit.xml' }],
    ['line']
  ],
  
  use: {
    // Base URL
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:3000',
    
    // Browser configuration
    headless: process.env.CI ? true : false,
    viewport: { width: 1280, height: 720 },
    
    // Test artifacts
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',
    
    // Network and timing
    actionTimeout: 15000,
    navigationTimeout: 30000,
    
    // Permissions for emergency testing
    permissions: ['geolocation', 'notifications', 'microphone', 'camera'],
    geolocation: { latitude: 14.5995, longitude: 120.9842 }, // Manila coordinates
    
    // Extra HTTP headers
    extraHTTPHeaders: {
      'X-Test-Environment': 'e2e',
      'X-Emergency-Test': 'true'
    }
  },

  projects: [
    // Desktop browsers
    {
      name: 'chromium-desktop',
      use: { ...devices['Desktop Chrome'] },
      testMatch: /emergency-workflows\.spec\.ts/,
    },
    
    {
      name: 'firefox-desktop',
      use: { ...devices['Desktop Firefox'] },
      testMatch: /emergency-workflows\.spec\.ts/,
    },
    
    {
      name: 'webkit-desktop',
      use: { ...devices['Desktop Safari'] },
      testMatch: /emergency-workflows\.spec\.ts/,
    },
    
    // Mobile browsers (important for driver app)
    {
      name: 'mobile-chrome',
      use: { 
        ...devices['Pixel 5'],
        permissions: ['geolocation', 'notifications']
      },
      testMatch: /emergency-workflows\.spec\.ts/,
    },
    
    {
      name: 'mobile-safari',
      use: { 
        ...devices['iPhone 12'],
        permissions: ['geolocation', 'notifications']
      },
      testMatch: /emergency-workflows\.spec\.ts/,
    },
    
    // High-DPI displays
    {
      name: 'high-dpi',
      use: {
        ...devices['Desktop Chrome'],
        deviceScaleFactor: 2,
      },
      testMatch: /emergency-workflows\.spec\.ts/,
    },
    
    // Performance testing browser
    {
      name: 'performance-test',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          args: [
            '--disable-dev-shm-usage',
            '--disable-background-timer-throttling',
            '--disable-backgrounding-occluded-windows',
            '--disable-renderer-backgrounding'
          ]
        }
      },
      testMatch: /.*performance.*\.spec\.ts/,
    },
    
    // Accessibility testing
    {
      name: 'accessibility',
      use: {
        ...devices['Desktop Chrome'],
        colorScheme: 'dark',
        reducedMotion: 'reduce'
      },
      testMatch: /.*accessibility.*\.spec\.ts/,
    }
  ],

  // Web server configuration for local testing
  webServer: process.env.CI ? undefined : {
    command: 'npm run build && npm start',
    port: 3000,
    timeout: 120000, // 2 minutes to start
    reuseExistingServer: !process.env.CI
  }
});