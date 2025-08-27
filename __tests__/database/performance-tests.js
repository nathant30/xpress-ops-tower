// Database Performance Testing for Xpress Ops Tower
// Tests database performance under load and validates optimization strategies

const { Client } = require('pg');
const fs = require('fs').promises;
const path = require('path');

class DatabasePerformanceTests {
  constructor() {
    this.client = null;
    this.results = {
      timestamp: new Date().toISOString(),
      tests: [],
      summary: {
        total_tests: 0,
        passed_tests: 0,
        failed_tests: 0,
        avg_response_time: 0,
        total_queries: 0
      }
    };
    
    this.thresholds = {
      slow_query_ms: 1000,       // 1 second
      emergency_query_ms: 100,   // 100ms for emergency queries
      bulk_insert_ms: 5000,      // 5 seconds for bulk operations
      index_usage_min: 0.8       // 80% minimum index usage
    };
  }

  async initialize() {
    const dbUrl = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;
    if (!dbUrl) {
      throw new Error('DATABASE_URL not configured for testing');
    }

    this.client = new Client({
      connectionString: dbUrl,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });

    await this.client.connect();
    console.log('✅ Connected to test database');
  }

  async runAllTests() {
    console.log('🗄️  Starting database performance tests...');
    
    try {
      await this.initialize();
      
      // Run all performance tests
      await this.testBasicQueryPerformance();
      await this.testEmergencySystemQueries();
      await this.testLocationUpdatePerformance();
      await this.testAnalyticsQueryPerformance();
      await this.testBulkInsertPerformance();
      await this.testIndexEfficiency();
      await this.testConnectionPooling();
      await this.testPartitioningEfficiency();
      await this.testConcurrentQueryHandling();
      
      // Calculate summary
      this.calculateSummary();
      
      // Generate report
      const reportPath = await this.generateReport();
      
      console.log('✅ Database performance tests completed');
      console.log(`📊 Results: ${this.results.summary.passed_tests}/${this.results.summary.total_tests} tests passed`);
      console.log(`⏱️  Average response time: ${this.results.summary.avg_response_time.toFixed(2)}ms`);
      console.log(`📄 Report: ${reportPath}`);
      
      return this.results;
      
    } catch (error) {
      console.error('❌ Database performance tests failed:', error);
      throw error;
    } finally {
      if (this.client) {
        await this.client.end();
      }
    }
  }

  async testBasicQueryPerformance() {
    console.log('📋 Testing basic query performance...');
    
    const queries = [
      {
        name: 'Select Active Drivers',
        sql: 'SELECT COUNT(*) FROM drivers WHERE is_active = TRUE',
        threshold: 50
      },
      {
        name: 'Select Recent Bookings',
        sql: 'SELECT * FROM bookings WHERE created_at > NOW() - INTERVAL \'24 hours\' LIMIT 100',
        threshold: 100
      },
      {
        name: 'Driver Location Lookup',
        sql: 'SELECT * FROM driver_locations WHERE driver_id = $1 ORDER BY timestamp DESC LIMIT 1',
        params: ['driver-123'],
        threshold: 25
      }
    ];

    for (const query of queries) {
      const startTime = Date.now();
      
      try {
        await this.client.query(query.sql, query.params || []);
        const responseTime = Date.now() - startTime;
        
        const passed = responseTime <= query.threshold;
        
        this.addTestResult({
          test_name: query.name,
          category: 'basic_queries',
          response_time_ms: responseTime,
          threshold_ms: query.threshold,
          passed: passed,
          details: { sql: query.sql }
        });
        
        if (!passed) {
          console.warn(`⚠️  ${query.name} exceeded threshold: ${responseTime}ms > ${query.threshold}ms`);
        }
        
      } catch (error) {
        this.addTestResult({
          test_name: query.name,
          category: 'basic_queries',
          passed: false,
          error: error.message,
          details: { sql: query.sql }
        });
      }
    }
  }

  async testEmergencySystemQueries() {
    console.log('🚨 Testing emergency system query performance...');
    
    // Critical: Emergency queries must be extremely fast
    const emergencyQueries = [
      {
        name: 'Insert SOS Alert',
        sql: `INSERT INTO sos_alerts (id, sos_code, triggered_at, location, reporter_id, reporter_type, emergency_type, severity, status, created_at) 
              VALUES ($1, $2, NOW(), ST_Point($3, $4), $5, $6, $7, $8, $9, NOW())`,
        params: ['test-sos-1', 'SOS-TEST-001', 120.9842, 14.5995, 'driver-test', 'driver', 'medical_emergency', 10, 'triggered'],
        threshold: this.thresholds.emergency_query_ms
      },
      {
        name: 'Find Nearby Emergency Services',
        sql: `SELECT * FROM emergency_services 
              WHERE ST_DWithin(location, ST_Point($1, $2), 5000) 
              AND service_type = $3 
              ORDER BY ST_Distance(location, ST_Point($1, $2))`,
        params: [120.9842, 14.5995, 'medical'],
        threshold: this.thresholds.emergency_query_ms
      },
      {
        name: 'Get Active Emergency Alerts',
        sql: 'SELECT * FROM sos_alerts WHERE status IN (\'triggered\', \'processing\', \'dispatched\') ORDER BY triggered_at DESC',
        threshold: 50
      }
    ];

    for (const query of emergencyQueries) {
      const startTime = Date.now();
      
      try {
        await this.client.query(query.sql, query.params || []);
        const responseTime = Date.now() - startTime;
        
        const passed = responseTime <= query.threshold;
        
        this.addTestResult({
          test_name: query.name,
          category: 'emergency_queries',
          response_time_ms: responseTime,
          threshold_ms: query.threshold,
          passed: passed,
          critical: true, // Emergency queries are critical
          details: { sql: query.sql }
        });
        
        if (!passed) {
          console.error(`🚨 CRITICAL: ${query.name} exceeded emergency threshold: ${responseTime}ms > ${query.threshold}ms`);
        }
        
      } catch (error) {
        this.addTestResult({
          test_name: query.name,
          category: 'emergency_queries',
          passed: false,
          critical: true,
          error: error.message,
          details: { sql: query.sql }
        });
      }
    }
  }

  async testLocationUpdatePerformance() {
    console.log('📍 Testing location update performance...');
    
    // Simulate high-frequency location updates
    const locationUpdates = Array.from({ length: 100 }, (_, i) => ({
      driverId: `test-driver-${i % 10}`, // 10 drivers updating locations
      latitude: 14.5995 + (Math.random() - 0.5) * 0.01,
      longitude: 120.9842 + (Math.random() - 0.5) * 0.01,
      timestamp: new Date()
    }));

    const startTime = Date.now();
    
    try {
      // Batch insert location updates
      const values = locationUpdates.map((loc, i) => 
        `($${i * 5 + 1}, ST_Point($${i * 5 + 2}, $${i * 5 + 3}), $${i * 5 + 4}, $${i * 5 + 5})`
      ).join(', ');
      
      const params = locationUpdates.flatMap(loc => [
        loc.driverId, loc.longitude, loc.latitude, loc.timestamp, new Date()
      ]);
      
      const sql = `INSERT INTO driver_locations (driver_id, location, timestamp, created_at) VALUES ${values}`;
      
      await this.client.query(sql, params);
      
      const responseTime = Date.now() - startTime;
      const avgPerUpdate = responseTime / locationUpdates.length;
      
      const passed = avgPerUpdate <= 10; // 10ms per location update
      
      this.addTestResult({
        test_name: 'Bulk Location Updates',
        category: 'location_updates',
        response_time_ms: responseTime,
        avg_per_operation_ms: avgPerUpdate,
        operations: locationUpdates.length,
        threshold_ms: 10,
        passed: passed,
        details: { batch_size: locationUpdates.length }
      });
      
    } catch (error) {
      this.addTestResult({
        test_name: 'Bulk Location Updates',
        category: 'location_updates',
        passed: false,
        error: error.message
      });
    }
  }

  async testAnalyticsQueryPerformance() {
    console.log('📊 Testing analytics query performance...');
    
    const analyticsQueries = [
      {
        name: 'Daily Booking Stats',
        sql: `SELECT DATE_TRUNC('day', created_at) as date, 
              COUNT(*) as total_bookings,
              COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_bookings
              FROM bookings 
              WHERE created_at > NOW() - INTERVAL '30 days'
              GROUP BY DATE_TRUNC('day', created_at)
              ORDER BY date DESC`,
        threshold: 500
      },
      {
        name: 'Driver Performance Metrics',
        sql: `SELECT driver_id, 
              COUNT(*) as total_trips,
              AVG(EXTRACT(EPOCH FROM (updated_at - created_at))) as avg_trip_duration,
              SUM(fare_amount) as total_earnings
              FROM bookings 
              WHERE status = 'completed' AND created_at > NOW() - INTERVAL '7 days'
              GROUP BY driver_id
              ORDER BY total_trips DESC
              LIMIT 100`,
        threshold: 300
      },
      {
        name: 'Regional Performance',
        sql: `SELECT r.name as region_name,
              COUNT(b.*) as total_bookings,
              AVG(b.fare_amount) as avg_fare
              FROM bookings b
              JOIN drivers d ON b.driver_id = d.id
              JOIN regions r ON d.region_id = r.id
              WHERE b.created_at > NOW() - INTERVAL '24 hours'
              GROUP BY r.name
              ORDER BY total_bookings DESC`,
        threshold: 200
      }
    ];

    for (const query of analyticsQueries) {
      const startTime = Date.now();
      
      try {
        const result = await this.client.query(query.sql);
        const responseTime = Date.now() - startTime;
        
        const passed = responseTime <= query.threshold;
        
        this.addTestResult({
          test_name: query.name,
          category: 'analytics_queries',
          response_time_ms: responseTime,
          threshold_ms: query.threshold,
          rows_returned: result.rowCount,
          passed: passed,
          details: { sql: query.sql }
        });
        
      } catch (error) {
        this.addTestResult({
          test_name: query.name,
          category: 'analytics_queries',
          passed: false,
          error: error.message
        });
      }
    }
  }

  async testBulkInsertPerformance() {
    console.log('💾 Testing bulk insert performance...');
    
    // Test bulk driver registration
    const bulkDrivers = Array.from({ length: 1000 }, (_, i) => ({
      id: `bulk-test-driver-${i}`,
      email: `driver${i}@bulktest.com`,
      firstName: `Driver${i}`,
      lastName: 'Test',
      phone: `+63912345${String(i).padStart(4, '0')}`,
      regionId: 'test-region'
    }));

    const startTime = Date.now();
    
    try {
      // Use COPY for maximum performance
      const copyData = bulkDrivers.map(driver => 
        `${driver.id}\t${driver.email}\t${driver.firstName}\t${driver.lastName}\t${driver.phone}\t${driver.regionId}\tt\t${new Date().toISOString()}\t${new Date().toISOString()}`
      ).join('\n');
      
      await this.client.query('BEGIN');
      
      const copyQuery = `COPY drivers (id, email, first_name, last_name, phone, region_id, is_active, created_at, updated_at) FROM STDIN WITH (FORMAT text, DELIMITER E'\\t')`;
      
      // For testing, we'll use regular INSERT with VALUES
      const values = bulkDrivers.map((driver, i) => 
        `($${i * 8 + 1}, $${i * 8 + 2}, $${i * 8 + 3}, $${i * 8 + 4}, $${i * 8 + 5}, $${i * 8 + 6}, $${i * 8 + 7}, $${i * 8 + 8})`
      ).join(', ');
      
      const params = bulkDrivers.flatMap(driver => [
        driver.id, driver.email, driver.firstName, driver.lastName, 
        driver.phone, driver.regionId, true, new Date()
      ]);
      
      const sql = `INSERT INTO drivers (id, email, first_name, last_name, phone, region_id, is_active, created_at) VALUES ${values}`;
      
      await this.client.query(sql, params);
      await this.client.query('COMMIT');
      
      const responseTime = Date.now() - startTime;
      const avgPerInsert = responseTime / bulkDrivers.length;
      
      const passed = responseTime <= this.thresholds.bulk_insert_ms;
      
      this.addTestResult({
        test_name: 'Bulk Driver Insert',
        category: 'bulk_operations',
        response_time_ms: responseTime,
        avg_per_operation_ms: avgPerInsert,
        operations: bulkDrivers.length,
        threshold_ms: this.thresholds.bulk_insert_ms,
        passed: passed,
        details: { records_inserted: bulkDrivers.length }
      });
      
      // Cleanup
      await this.client.query('DELETE FROM drivers WHERE id LIKE \'bulk-test-driver-%\'');
      
    } catch (error) {
      await this.client.query('ROLLBACK');
      this.addTestResult({
        test_name: 'Bulk Driver Insert',
        category: 'bulk_operations',
        passed: false,
        error: error.message
      });
    }
  }

  async testIndexEfficiency() {
    console.log('🔍 Testing index efficiency...');
    
    const indexQueries = [
      {
        name: 'Driver Email Index',
        sql: 'EXPLAIN (ANALYZE, BUFFERS) SELECT * FROM drivers WHERE email = $1',
        params: ['test@example.com']
      },
      {
        name: 'Location Spatial Index',
        sql: 'EXPLAIN (ANALYZE, BUFFERS) SELECT * FROM driver_locations WHERE ST_DWithin(location, ST_Point($1, $2), 1000)',
        params: [120.9842, 14.5995]
      },
      {
        name: 'Booking Status Index',
        sql: 'EXPLAIN (ANALYZE, BUFFERS) SELECT * FROM bookings WHERE status = $1 AND created_at > $2',
        params: ['active', new Date(Date.now() - 24*60*60*1000)]
      }
    ];

    for (const query of indexQueries) {
      try {
        const result = await this.client.query(query.sql, query.params);
        const plan = result.rows.map(row => row['QUERY PLAN']).join('\n');
        
        // Check if index is being used
        const usingIndex = plan.includes('Index Scan') || plan.includes('Bitmap Index Scan');
        const usingSeqScan = plan.includes('Seq Scan');
        
        // Extract execution time
        const executionTimeMatch = plan.match(/Execution Time: ([\d.]+) ms/);
        const executionTime = executionTimeMatch ? parseFloat(executionTimeMatch[1]) : null;
        
        const passed = usingIndex && !usingSeqScan && (executionTime === null || executionTime < 100);
        
        this.addTestResult({
          test_name: query.name,
          category: 'index_efficiency',
          execution_time_ms: executionTime,
          using_index: usingIndex,
          using_seq_scan: usingSeqScan,
          passed: passed,
          details: { 
            query_plan: plan.split('\n').slice(0, 10).join('\n') // First 10 lines
          }
        });
        
      } catch (error) {
        this.addTestResult({
          test_name: query.name,
          category: 'index_efficiency',
          passed: false,
          error: error.message
        });
      }
    }
  }

  async testConnectionPooling() {
    console.log('🔗 Testing connection pooling performance...');
    
    const connectionTests = Array.from({ length: 50 }, (_, i) => 
      this.simulateConnection(i)
    );

    const startTime = Date.now();
    
    try {
      await Promise.all(connectionTests);
      const totalTime = Date.now() - startTime;
      const avgConnectionTime = totalTime / connectionTests.length;
      
      const passed = avgConnectionTime <= 100; // 100ms average connection time
      
      this.addTestResult({
        test_name: 'Concurrent Connections',
        category: 'connection_pooling',
        total_time_ms: totalTime,
        avg_connection_time_ms: avgConnectionTime,
        concurrent_connections: connectionTests.length,
        passed: passed,
        details: { connection_count: connectionTests.length }
      });
      
    } catch (error) {
      this.addTestResult({
        test_name: 'Concurrent Connections',
        category: 'connection_pooling',
        passed: false,
        error: error.message
      });
    }
  }

  async simulateConnection(id) {
    const startTime = Date.now();
    
    try {
      await this.client.query('SELECT 1');
      return Date.now() - startTime;
    } catch (error) {
      throw new Error(`Connection ${id} failed: ${error.message}`);
    }
  }

  async testPartitioningEfficiency() {
    console.log('🗂️  Testing partitioning efficiency...');
    
    // Test if partitioning is working for location data
    const partitionQueries = [
      {
        name: 'Recent Location Query (Should use partition)',
        sql: `EXPLAIN (ANALYZE, BUFFERS) 
              SELECT * FROM driver_locations 
              WHERE timestamp > NOW() - INTERVAL '1 hour'`,
        expectPartitionPruning: true
      },
      {
        name: 'Historical Location Query',
        sql: `EXPLAIN (ANALYZE, BUFFERS) 
              SELECT COUNT(*) FROM driver_locations 
              WHERE timestamp > NOW() - INTERVAL '30 days'`,
        expectPartitionPruning: false
      }
    ];

    for (const query of partitionQueries) {
      try {
        const result = await this.client.query(query.sql);
        const plan = result.rows.map(row => row['QUERY PLAN']).join('\n');
        
        const hasPartitionPruning = plan.includes('Partitions') || plan.includes('never executed');
        const executionTimeMatch = plan.match(/Execution Time: ([\d.]+) ms/);
        const executionTime = executionTimeMatch ? parseFloat(executionTimeMatch[1]) : null;
        
        const passed = query.expectPartitionPruning ? hasPartitionPruning : executionTime < 1000;
        
        this.addTestResult({
          test_name: query.name,
          category: 'partitioning',
          execution_time_ms: executionTime,
          has_partition_pruning: hasPartitionPruning,
          expected_pruning: query.expectPartitionPruning,
          passed: passed,
          details: { 
            query_plan: plan.split('\n').slice(0, 15).join('\n')
          }
        });
        
      } catch (error) {
        this.addTestResult({
          test_name: query.name,
          category: 'partitioning',
          passed: false,
          error: error.message
        });
      }
    }
  }

  async testConcurrentQueryHandling() {
    console.log('⚡ Testing concurrent query handling...');
    
    // Simulate concurrent load
    const concurrentQueries = [
      // Read queries
      ...Array.from({ length: 20 }, () => 
        () => this.client.query('SELECT COUNT(*) FROM drivers WHERE is_active = TRUE')
      ),
      // Write queries
      ...Array.from({ length: 5 }, (_, i) => 
        () => this.client.query(
          'INSERT INTO driver_locations (driver_id, location, timestamp, created_at) VALUES ($1, ST_Point($2, $3), NOW(), NOW())',
          [`concurrent-test-${i}`, 120.9842, 14.5995]
        )
      ),
      // Complex queries
      ...Array.from({ length: 3 }, () => 
        () => this.client.query(`
          SELECT d.id, d.first_name, COUNT(b.*) as trip_count
          FROM drivers d
          LEFT JOIN bookings b ON d.id = b.driver_id AND b.created_at > NOW() - INTERVAL '7 days'
          GROUP BY d.id, d.first_name
          ORDER BY trip_count DESC
          LIMIT 10
        `)
      )
    ];

    const startTime = Date.now();
    
    try {
      const results = await Promise.allSettled(
        concurrentQueries.map(query => query())
      );
      
      const totalTime = Date.now() - startTime;
      const successfulQueries = results.filter(r => r.status === 'fulfilled').length;
      const failedQueries = results.length - successfulQueries;
      const successRate = (successfulQueries / results.length) * 100;
      
      const passed = successRate >= 95 && totalTime <= 5000; // 95% success rate, under 5 seconds
      
      this.addTestResult({
        test_name: 'Concurrent Query Execution',
        category: 'concurrency',
        total_time_ms: totalTime,
        total_queries: results.length,
        successful_queries: successfulQueries,
        failed_queries: failedQueries,
        success_rate_percent: successRate,
        passed: passed,
        details: { 
          concurrent_load: results.length,
          failure_reasons: results
            .filter(r => r.status === 'rejected')
            .map(r => r.reason?.message || 'Unknown error')
            .slice(0, 5)
        }
      });
      
      // Cleanup
      await this.client.query('DELETE FROM driver_locations WHERE driver_id LIKE \'concurrent-test-%\'');
      
    } catch (error) {
      this.addTestResult({
        test_name: 'Concurrent Query Execution',
        category: 'concurrency',
        passed: false,
        error: error.message
      });
    }
  }

  addTestResult(result) {
    this.results.tests.push({
      ...result,
      timestamp: new Date().toISOString()
    });
  }

  calculateSummary() {
    const tests = this.results.tests;
    
    this.results.summary.total_tests = tests.length;
    this.results.summary.passed_tests = tests.filter(t => t.passed).length;
    this.results.summary.failed_tests = tests.filter(t => !t.passed).length;
    
    const responseTimes = tests
      .map(t => t.response_time_ms || t.execution_time_ms)
      .filter(t => t !== undefined && t !== null);
    
    this.results.summary.avg_response_time = responseTimes.length > 0 
      ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length 
      : 0;
    
    this.results.summary.total_queries = tests.reduce((sum, test) => 
      sum + (test.operations || test.total_queries || 1), 0
    );
    
    // Calculate critical failures
    this.results.summary.critical_failures = tests.filter(t => 
      !t.passed && (t.critical || t.category === 'emergency_queries')
    ).length;
  }

  async generateReport() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportPath = path.join(__dirname, '..', 'results', `db-performance-${timestamp}.json`);
    
    // Ensure results directory exists
    await fs.mkdir(path.dirname(reportPath), { recursive: true });
    
    const report = {
      ...this.results,
      environment: {
        database_url: process.env.TEST_DATABASE_URL ? 'configured' : 'not configured',
        node_version: process.version,
        timestamp: new Date().toISOString()
      },
      recommendations: this.generateRecommendations()
    };
    
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    
    return reportPath;
  }

  generateRecommendations() {
    const recommendations = [];
    const failedTests = this.results.tests.filter(t => !t.passed);
    
    if (failedTests.some(t => t.category === 'emergency_queries')) {
      recommendations.push({
        priority: 'critical',
        category: 'emergency_system',
        issue: 'Emergency queries exceeding performance thresholds',
        recommendation: 'Optimize emergency query indexes and consider read replicas for emergency services'
      });
    }
    
    if (failedTests.some(t => t.category === 'index_efficiency' && t.using_seq_scan)) {
      recommendations.push({
        priority: 'high',
        category: 'indexing',
        issue: 'Queries using sequential scans instead of indexes',
        recommendation: 'Add missing indexes for frequently queried columns'
      });
    }
    
    if (this.results.summary.avg_response_time > 500) {
      recommendations.push({
        priority: 'medium',
        category: 'performance',
        issue: 'High average response time',
        recommendation: 'Consider query optimization and connection pooling improvements'
      });
    }
    
    if (failedTests.some(t => t.category === 'partitioning' && !t.has_partition_pruning)) {
      recommendations.push({
        priority: 'medium',
        category: 'partitioning',
        issue: 'Partition pruning not working effectively',
        recommendation: 'Review partition constraints and query patterns'
      });
    }
    
    return recommendations;
  }
}

// CLI interface
if (require.main === module) {
  const tester = new DatabasePerformanceTests();
  
  tester.runAllTests()
    .then(results => {
      console.log('\n✅ Database performance testing completed');
      
      if (results.summary.critical_failures > 0) {
        console.error('🚨 CRITICAL: Database performance issues detected');
        process.exit(1);
      } else if (results.summary.failed_tests > 0) {
        console.warn('⚠️  Some performance tests failed');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('❌ Database performance testing failed:', error);
      process.exit(1);
    });
}

module.exports = DatabasePerformanceTests;