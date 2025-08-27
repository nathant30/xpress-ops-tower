#!/usr/bin/env node

// Comprehensive Health Checks for Xpress Ops Tower
// Production-ready monitoring and health validation system

const { Client } = require('pg');
const Redis = require('redis');
const http = require('http');
const https = require('https');
const fs = require('fs').promises;
const path = require('path');

class HealthCheckManager {
  constructor() {
    this.healthChecks = new Map();
    this.healthHistory = [];
    this.alertsEnabled = process.env.HEALTH_ALERTS_ENABLED !== 'false';
    this.checkInterval = parseInt(process.env.HEALTH_CHECK_INTERVAL) || 30000; // 30 seconds
    this.maxHistorySize = 1000;
    
    // Initialize health checks
    this.initializeHealthChecks();
  }

  initializeHealthChecks() {
    // Database health check
    this.healthChecks.set('database', {
      name: 'PostgreSQL Database',
      critical: true,
      timeout: 5000,
      check: this.checkDatabase.bind(this)
    });

    // Redis health check
    this.healthChecks.set('redis', {
      name: 'Redis Cache',
      critical: true,
      timeout: 3000,
      check: this.checkRedis.bind(this)
    });

    // Application health check
    this.healthChecks.set('application', {
      name: 'Application Server',
      critical: true,
      timeout: 10000,
      check: this.checkApplication.bind(this)
    });

    // Emergency system health check
    this.healthChecks.set('emergency_system', {
      name: 'Emergency Response System',
      critical: true,
      timeout: 2000,
      check: this.checkEmergencySystem.bind(this)
    });

    // WebSocket health check
    this.healthChecks.set('websocket', {
      name: 'WebSocket Server',
      critical: true,
      timeout: 5000,
      check: this.checkWebSocket.bind(this)
    });

    // External integrations health check
    this.healthChecks.set('integrations', {
      name: 'External Integrations',
      critical: false,
      timeout: 10000,
      check: this.checkIntegrations.bind(this)
    });

    // File system health check
    this.healthChecks.set('filesystem', {
      name: 'File System',
      critical: true,
      timeout: 5000,
      check: this.checkFileSystem.bind(this)
    });
  }

  async checkDatabase() {
    const client = new Client({
      connectionString: process.env.DATABASE_URL
    });

    try {
      const startTime = Date.now();
      
      await client.connect();
      
      // Test basic query
      const result = await client.query('SELECT 1 as test');
      
      // Test critical tables exist
      const tablesResult = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name IN ('drivers', 'bookings', 'sos_alerts', 'driver_locations')
      `);
      
      const responseTime = Date.now() - startTime;
      
      if (tablesResult.rows.length < 4) {
        throw new Error('Critical database tables missing');
      }

      return {
        status: 'healthy',
        responseTime,
        details: {
          connection: 'ok',
          basicQuery: result.rows[0].test === 1,
          criticalTables: tablesResult.rows.length,
          version: (await client.query('SELECT version()')).rows[0].version
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        details: { connectionString: process.env.DATABASE_URL ? 'configured' : 'missing' }
      };
    } finally {
      try {
        await client.end();
      } catch (e) {
        // Ignore cleanup errors
      }
    }
  }

  async checkRedis() {
    const redis = Redis.createClient({
      url: process.env.REDIS_URL
    });

    try {
      const startTime = Date.now();
      
      await redis.connect();
      
      // Test basic operations
      await redis.set('health_check', 'test_value', { EX: 10 });
      const testValue = await redis.get('health_check');
      
      const responseTime = Date.now() - startTime;
      
      if (testValue !== 'test_value') {
        throw new Error('Redis read/write test failed');
      }

      return {
        status: 'healthy',
        responseTime,
        details: {
          connection: 'ok',
          readWrite: 'ok',
          info: await redis.info()
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        details: { redisUrl: process.env.REDIS_URL ? 'configured' : 'missing' }
      };
    } finally {
      try {
        await redis.quit();
      } catch (e) {
        // Ignore cleanup errors
      }
    }
  }

  async checkApplication() {
    const port = process.env.PORT || 3000;
    const host = process.env.HOSTNAME || 'localhost';
    
    return new Promise((resolve) => {
      const startTime = Date.now();
      
      const req = http.get(`http://${host}:${port}/api/health`, (res) => {
        const responseTime = Date.now() - startTime;
        let body = '';
        
        res.on('data', (chunk) => {
          body += chunk;
        });
        
        res.on('end', () => {
          try {
            const healthData = JSON.parse(body);
            
            resolve({
              status: res.statusCode === 200 ? 'healthy' : 'unhealthy',
              responseTime,
              details: {
                statusCode: res.statusCode,
                responseBody: healthData
              }
            });
          } catch (error) {
            resolve({
              status: 'unhealthy',
              responseTime,
              error: 'Invalid JSON response',
              details: { statusCode: res.statusCode, body }
            });
          }
        });
      });
      
      req.on('error', (error) => {
        resolve({
          status: 'unhealthy',
          responseTime: Date.now() - startTime,
          error: error.message
        });
      });
      
      req.setTimeout(10000, () => {
        req.destroy();
        resolve({
          status: 'unhealthy',
          responseTime: Date.now() - startTime,
          error: 'Request timeout'
        });
      });
    });
  }

  async checkEmergencySystem() {
    const port = process.env.PORT || 3000;
    const host = process.env.HOSTNAME || 'localhost';
    
    return new Promise((resolve) => {
      const startTime = Date.now();
      
      const req = http.get(`http://${host}:${port}/api/emergency/health`, (res) => {
        const responseTime = Date.now() - startTime;
        let body = '';
        
        res.on('data', (chunk) => {
          body += chunk;
        });
        
        res.on('end', () => {
          try {
            const healthData = JSON.parse(body);
            
            // Critical: Emergency system must respond within 2 seconds
            const isHealthy = res.statusCode === 200 && responseTime < 2000;
            
            resolve({
              status: isHealthy ? 'healthy' : 'unhealthy',
              responseTime,
              critical: true, // Emergency system is always critical
              details: {
                statusCode: res.statusCode,
                responseBody: healthData,
                responseTimeThreshold: '2000ms',
                withinThreshold: responseTime < 2000
              }
            });
          } catch (error) {
            resolve({
              status: 'unhealthy',
              responseTime,
              critical: true,
              error: 'Invalid JSON response from emergency system',
              details: { statusCode: res.statusCode, body }
            });
          }
        });
      });
      
      req.on('error', (error) => {
        resolve({
          status: 'unhealthy',
          responseTime: Date.now() - startTime,
          critical: true,
          error: `Emergency system error: ${error.message}`
        });
      });
      
      req.setTimeout(2000, () => { // 2 second timeout for emergency system
        req.destroy();
        resolve({
          status: 'unhealthy',
          responseTime: Date.now() - startTime,
          critical: true,
          error: 'Emergency system timeout (>2s)'
        });
      });
    });
  }

  async checkWebSocket() {
    const port = process.env.PORT || 3000;
    const host = process.env.HOSTNAME || 'localhost';
    
    return new Promise((resolve) => {
      const startTime = Date.now();
      
      const req = http.get(`http://${host}:${port}/api/websocket/health`, (res) => {
        const responseTime = Date.now() - startTime;
        let body = '';
        
        res.on('data', (chunk) => {
          body += chunk;
        });
        
        res.on('end', () => {
          try {
            const healthData = JSON.parse(body);
            
            resolve({
              status: res.statusCode === 200 ? 'healthy' : 'unhealthy',
              responseTime,
              details: {
                statusCode: res.statusCode,
                connections: healthData.activeConnections,
                memoryUsage: healthData.memoryUsage
              }
            });
          } catch (error) {
            resolve({
              status: 'unhealthy',
              responseTime,
              error: 'Invalid JSON response from WebSocket health check',
              details: { statusCode: res.statusCode, body }
            });
          }
        });
      });
      
      req.on('error', (error) => {
        resolve({
          status: 'unhealthy',
          responseTime: Date.now() - startTime,
          error: error.message
        });
      });
      
      req.setTimeout(5000, () => {
        req.destroy();
        resolve({
          status: 'unhealthy',
          responseTime: Date.now() - startTime,
          error: 'WebSocket health check timeout'
        });
      });
    });
  }

  async checkIntegrations() {
    const port = process.env.PORT || 3000;
    const host = process.env.HOSTNAME || 'localhost';
    
    return new Promise((resolve) => {
      const startTime = Date.now();
      
      const req = http.get(`http://${host}:${port}/api/integrations/health`, (res) => {
        const responseTime = Date.now() - startTime;
        let body = '';
        
        res.on('data', (chunk) => {
          body += chunk;
        });
        
        res.on('end', () => {
          try {
            const healthData = JSON.parse(body);
            
            resolve({
              status: res.statusCode === 200 ? 'healthy' : 'degraded',
              responseTime,
              details: {
                statusCode: res.statusCode,
                integrations: healthData
              }
            });
          } catch (error) {
            resolve({
              status: 'degraded',
              responseTime,
              error: 'Invalid JSON response from integrations health check',
              details: { statusCode: res.statusCode, body }
            });
          }
        });
      });
      
      req.on('error', (error) => {
        resolve({
          status: 'degraded',
          responseTime: Date.now() - startTime,
          error: error.message
        });
      });
      
      req.setTimeout(10000, () => {
        req.destroy();
        resolve({
          status: 'degraded',
          responseTime: Date.now() - startTime,
          error: 'Integrations health check timeout'
        });
      });
    });
  }

  async checkFileSystem() {
    try {
      const startTime = Date.now();
      
      // Check critical directories
      const criticalDirs = ['/app/logs', '/app/uploads', '/app/tmp'];
      const dirChecks = await Promise.all(
        criticalDirs.map(async (dir) => {
          try {
            const stats = await fs.stat(dir);
            return { path: dir, exists: true, writable: stats.isDirectory() };
          } catch (error) {
            return { path: dir, exists: false, error: error.message };
          }
        })
      );
      
      // Test write permissions
      const testFile = '/app/tmp/health_check_test.txt';
      try {
        await fs.writeFile(testFile, 'test');
        await fs.unlink(testFile);
      } catch (error) {
        throw new Error(`Cannot write to temp directory: ${error.message}`);
      }
      
      const responseTime = Date.now() - startTime;
      const allDirsOk = dirChecks.every(check => check.exists);
      
      return {
        status: allDirsOk ? 'healthy' : 'unhealthy',
        responseTime,
        details: {
          directories: dirChecks,
          writeTest: 'ok'
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        details: { filesystem: 'error' }
      };
    }
  }

  async runAllChecks() {
    const results = {
      timestamp: new Date().toISOString(),
      overall: 'healthy',
      checks: {},
      summary: {
        total: this.healthChecks.size,
        healthy: 0,
        unhealthy: 0,
        degraded: 0,
        criticalFailures: 0
      }
    };

    // Run all health checks in parallel
    const checkPromises = Array.from(this.healthChecks.entries()).map(
      async ([key, config]) => {
        try {
          const result = await Promise.race([
            config.check(),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Health check timeout')), config.timeout)
            )
          ]);
          
          return [key, { ...result, name: config.name, critical: config.critical }];
        } catch (error) {
          return [key, {
            name: config.name,
            status: 'unhealthy',
            critical: config.critical,
            error: error.message
          }];
        }
      }
    );

    const checkResults = await Promise.allSettled(checkPromises);
    
    // Process results
    checkResults.forEach((promiseResult) => {
      if (promiseResult.status === 'fulfilled') {
        const [key, result] = promiseResult.value;
        results.checks[key] = result;
        
        switch (result.status) {
          case 'healthy':
            results.summary.healthy++;
            break;
          case 'unhealthy':
            results.summary.unhealthy++;
            if (result.critical) {
              results.summary.criticalFailures++;
              results.overall = 'unhealthy';
            }
            break;
          case 'degraded':
            results.summary.degraded++;
            if (results.overall === 'healthy') {
              results.overall = 'degraded';
            }
            break;
        }
      }
    });

    // Store in history
    this.healthHistory.push(results);
    if (this.healthHistory.length > this.maxHistorySize) {
      this.healthHistory = this.healthHistory.slice(-this.maxHistorySize);
    }

    // Handle alerts
    if (this.alertsEnabled) {
      await this.processAlerts(results);
    }

    return results;
  }

  async processAlerts(results) {
    const criticalFailures = Object.entries(results.checks)
      .filter(([_, result]) => result.critical && result.status === 'unhealthy');
    
    if (criticalFailures.length > 0) {
      const alertData = {
        severity: 'critical',
        timestamp: results.timestamp,
        message: `Critical health check failures detected`,
        failures: criticalFailures.map(([key, result]) => ({
          service: result.name,
          error: result.error
        }))
      };
      
      // Log critical alert
      console.error('🚨 CRITICAL ALERT:', JSON.stringify(alertData, null, 2));
      
      // Write alert to file
      try {
        const alertFile = path.join('/app/logs', `critical_alert_${Date.now()}.json`);
        await fs.writeFile(alertFile, JSON.stringify(alertData, null, 2));
      } catch (error) {
        console.error('Failed to write alert file:', error);
      }
    }
  }

  getHealthHistory(limit = 10) {
    return this.healthHistory.slice(-limit);
  }

  async startContinuousMonitoring() {
    console.log(`🏥 Starting continuous health monitoring (interval: ${this.checkInterval}ms)`);
    
    const runCheck = async () => {
      try {
        const results = await this.runAllChecks();
        console.log(`Health check completed - Overall: ${results.overall} (${results.summary.healthy}/${results.summary.total} healthy)`);
        
        if (results.summary.criticalFailures > 0) {
          console.error(`🚨 ${results.summary.criticalFailures} critical failures detected!`);
        }
      } catch (error) {
        console.error('Health check failed:', error);
      }
    };

    // Run initial check
    await runCheck();
    
    // Schedule recurring checks
    const intervalId = setInterval(runCheck, this.checkInterval);
    
    // Graceful shutdown
    process.on('SIGTERM', () => {
      console.log('Stopping health monitoring...');
      clearInterval(intervalId);
    });
    
    process.on('SIGINT', () => {
      console.log('Stopping health monitoring...');
      clearInterval(intervalId);
      process.exit(0);
    });
  }
}

// CLI interface
if (require.main === module) {
  const healthChecker = new HealthCheckManager();
  
  const command = process.argv[2] || 'monitor';
  
  switch (command) {
    case 'check':
      healthChecker.runAllChecks()
        .then(results => {
          console.log(JSON.stringify(results, null, 2));
          process.exit(results.overall === 'healthy' ? 0 : 1);
        })
        .catch(error => {
          console.error('Health check failed:', error);
          process.exit(1);
        });
      break;
      
    case 'monitor':
      healthChecker.startContinuousMonitoring();
      break;
      
    case 'history':
      const history = healthChecker.getHealthHistory(20);
      console.log(JSON.stringify(history, null, 2));
      break;
      
    default:
      console.error(`Unknown command: ${command}`);
      console.error('Usage: health-checks.js [check|monitor|history]');
      process.exit(1);
  }
}

module.exports = HealthCheckManager;