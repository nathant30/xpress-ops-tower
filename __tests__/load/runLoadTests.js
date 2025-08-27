#!/usr/bin/env node

// Load Test Runner for Xpress Ops Tower
// Orchestrates and manages all load testing scenarios

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Load test configuration
const config = require('./loadTest.config.js');

class LoadTestRunner {
  constructor() {
    this.resultsDir = path.join(__dirname, 'results', new Date().toISOString().replace(/[:.]/g, '-'));
    this.logFile = path.join(this.resultsDir, 'test-runner.log');
    this.processes = new Map();
    this.testResults = new Map();
    
    // Ensure results directory exists
    fs.mkdirSync(this.resultsDir, { recursive: true });
    
    this.log('Load Test Runner initialized');
    this.log(`Results directory: ${this.resultsDir}`);
  }

  log(message) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}`;
    
    console.log(logMessage);
    
    // Append to log file
    fs.appendFileSync(this.logFile, logMessage + '\n');
  }

  async runAllTests(environment = 'local') {
    this.log(`Starting load tests for environment: ${environment}`);
    this.log(`System specs: ${os.cpus().length} CPUs, ${Math.round(os.totalmem() / 1024 / 1024 / 1024)}GB RAM`);
    
    try {
      // Pre-test system checks
      await this.performSystemChecks(environment);
      
      // Start monitoring
      const monitoringProcess = this.startSystemMonitoring();
      
      // Run tests in sequence (to avoid resource conflicts)
      const testScenarios = [
        'standard_operations',
        'high_traffic', 
        'emergency_load',
        'websocket_stress',
        'database_stress'
      ];
      
      for (const scenario of testScenarios) {
        await this.runTestScenario(scenario, environment);
        
        // Cool down period between tests
        if (testScenarios.indexOf(scenario) < testScenarios.length - 1) {
          this.log(`Cooling down for 60 seconds before next test...`);
          await this.sleep(60000);
        }
      }
      
      // Stop monitoring
      if (monitoringProcess) {
        monitoringProcess.kill();
      }
      
      // Generate comprehensive report
      await this.generateFinalReport();
      
      this.log('All load tests completed successfully');
      
    } catch (error) {
      this.log(`Load tests failed: ${error.message}`);
      throw error;
    }
  }

  async performSystemChecks(environment) {
    this.log('Performing pre-test system checks...');
    
    const envConfig = config.environments[environment];
    if (!envConfig) {
      throw new Error(`Unknown environment: ${environment}`);
    }
    
    // Check if k6 is installed
    try {
      execSync('k6 version', { stdio: 'pipe' });
      this.log('k6 is installed and ready');
    } catch (error) {
      throw new Error('k6 is not installed. Please install k6 load testing tool.');
    }
    
    // Check target system availability
    try {
      const response = await this.makeHttpRequest(`${envConfig.base_url}/api/health`);
      if (response.statusCode !== 200) {
        throw new Error(`Target system health check failed: ${response.statusCode}`);
      }
      this.log('Target system is healthy and responsive');
    } catch (error) {
      this.log(`Warning: Health check failed - ${error.message}`);
    }
    
    // Check system resources
    const freeMemory = os.freemem();
    const totalMemory = os.totalmem();
    const memoryUsage = ((totalMemory - freeMemory) / totalMemory) * 100;
    
    if (memoryUsage > 80) {
      this.log(`Warning: High memory usage (${memoryUsage.toFixed(1)}%) before tests`);
    }
    
    this.log('System checks completed');
  }

  startSystemMonitoring() {
    this.log('Starting system resource monitoring...');
    
    const monitoringScript = `
      const os = require('os');
      const fs = require('fs');
      
      const logFile = '${path.join(this.resultsDir, 'system-monitoring.json')}';
      const metrics = [];
      
      setInterval(() => {
        const cpus = os.cpus();
        const loadAvg = os.loadavg();
        const freeMemory = os.freemem();
        const totalMemory = os.totalmem();
        
        const metric = {
          timestamp: new Date().toISOString(),
          cpu_count: cpus.length,
          load_average: loadAvg,
          memory_usage: {
            free: freeMemory,
            total: totalMemory,
            used_percentage: ((totalMemory - freeMemory) / totalMemory) * 100
          },
          uptime: os.uptime()
        };
        
        metrics.push(metric);
        
        // Write metrics to file
        fs.writeFileSync(logFile, JSON.stringify(metrics, null, 2));
        
      }, 5000); // Every 5 seconds
    `;
    
    const monitoringProcess = spawn('node', ['-e', monitoringScript], {
      detached: false,
      stdio: 'pipe'
    });
    
    return monitoringProcess;
  }

  async runTestScenario(scenarioName, environment) {
    this.log(`Starting test scenario: ${scenarioName}`);
    
    const scenario = config.scenarios[scenarioName];
    if (!scenario) {
      throw new Error(`Unknown scenario: ${scenarioName}`);
    }
    
    const envConfig = config.environments[environment];
    const testFile = this.getTestFileForScenario(scenarioName);
    
    if (!fs.existsSync(testFile)) {
      this.log(`Warning: Test file not found for scenario ${scenarioName}, skipping...`);
      return;
    }
    
    const outputFile = path.join(this.resultsDir, `${scenarioName}-results.json`);
    const htmlReport = path.join(this.resultsDir, `${scenarioName}-report.html`);
    
    // Prepare environment variables
    const env = {
      ...process.env,
      BASE_URL: envConfig.base_url,
      WS_URL: envConfig.websocket_url,
      DATABASE_URL: envConfig.database_url,
      K6_OUT: `json=${outputFile}`
    };
    
    // Build k6 command
    const k6Command = [
      'k6', 'run',
      '--out', `json=${outputFile}`,
      '--summary-export', htmlReport,
      testFile
    ];
    
    try {
      this.log(`Running: ${k6Command.join(' ')}`);
      
      const startTime = Date.now();
      
      // Run k6 test
      const result = execSync(k6Command.join(' '), {
        env: env,
        cwd: __dirname,
        stdio: 'pipe',
        maxBuffer: 1024 * 1024 * 10 // 10MB buffer
      });
      
      const duration = Date.now() - startTime;
      
      this.log(`Test scenario ${scenarioName} completed in ${Math.round(duration / 1000)}s`);
      
      // Parse and store results
      await this.parseTestResults(scenarioName, outputFile);
      
    } catch (error) {
      this.log(`Test scenario ${scenarioName} failed: ${error.message}`);
      
      // Store failure information
      this.testResults.set(scenarioName, {
        status: 'failed',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  getTestFileForScenario(scenarioName) {
    const testFileMap = {
      'standard_operations': path.join(__dirname, 'scenarios', 'standardOperationsTest.js'),
      'high_traffic': path.join(__dirname, 'scenarios', 'highTrafficTest.js'),
      'emergency_load': path.join(__dirname, 'scenarios', 'emergencyLoadTest.js'),
      'websocket_stress': path.join(__dirname, 'scenarios', 'websocketStressTest.js'),
      'database_stress': path.join(__dirname, 'scenarios', 'databaseStressTest.js')
    };
    
    return testFileMap[scenarioName] || null;
  }

  async parseTestResults(scenarioName, outputFile) {
    if (!fs.existsSync(outputFile)) {
      this.log(`Warning: Results file not found for ${scenarioName}`);
      return;
    }
    
    try {
      const resultsData = fs.readFileSync(outputFile, 'utf-8');
      const results = resultsData.split('\n')
        .filter(line => line.trim())
        .map(line => JSON.parse(line))
        .filter(data => data.type === 'Point');
      
      // Analyze results
      const analysis = this.analyzeResults(results, scenarioName);
      
      this.testResults.set(scenarioName, {
        status: 'completed',
        analysis: analysis,
        timestamp: new Date().toISOString(),
        raw_data_file: outputFile
      });
      
      this.log(`Results analysis completed for ${scenarioName}`);
      
    } catch (error) {
      this.log(`Failed to parse results for ${scenarioName}: ${error.message}`);
    }
  }

  analyzeResults(results, scenarioName) {
    const metrics = {};
    const thresholds = config.thresholds;
    
    // Group results by metric name
    results.forEach(result => {
      const metricName = result.metric;
      if (!metrics[metricName]) {
        metrics[metricName] = [];
      }
      metrics[metricName].push(result.data.value);
    });
    
    // Calculate statistics for each metric
    const analysis = {};
    Object.keys(metrics).forEach(metricName => {
      const values = metrics[metricName].sort((a, b) => a - b);
      
      analysis[metricName] = {
        count: values.length,
        min: Math.min(...values),
        max: Math.max(...values),
        avg: values.reduce((a, b) => a + b, 0) / values.length,
        median: values[Math.floor(values.length / 2)],
        p95: values[Math.floor(values.length * 0.95)],
        p99: values[Math.floor(values.length * 0.99)]
      };
    });
    
    // Check against thresholds
    const thresholdResults = this.checkThresholds(analysis, thresholds, scenarioName);
    
    return {
      metrics: analysis,
      thresholds: thresholdResults,
      passed: thresholdResults.every(t => t.passed)
    };
  }

  checkThresholds(analysis, thresholds, scenarioName) {
    const results = [];
    
    // Check response time thresholds
    if (analysis.http_req_duration) {
      const responseTimeThreshold = this.getThresholdForScenario(scenarioName, thresholds.response_times);
      results.push({
        metric: 'response_time_p95',
        threshold: responseTimeThreshold,
        actual: analysis.http_req_duration.p95,
        passed: analysis.http_req_duration.p95 <= responseTimeThreshold
      });
    }
    
    // Check error rate thresholds
    if (analysis.http_req_failed) {
      const errorRateThreshold = this.getThresholdForScenario(scenarioName, thresholds.error_rates);
      const errorRate = analysis.http_req_failed.avg * 100; // Convert to percentage
      results.push({
        metric: 'error_rate',
        threshold: errorRateThreshold,
        actual: errorRate,
        passed: errorRate <= errorRateThreshold
      });
    }
    
    // Check emergency-specific thresholds
    if (scenarioName === 'emergency_load') {
      if (analysis.emergency_response_time) {
        results.push({
          metric: 'emergency_response_time_p95',
          threshold: 5000,
          actual: analysis.emergency_response_time.p95,
          passed: analysis.emergency_response_time.p95 <= 5000
        });
      }
    }
    
    return results;
  }

  getThresholdForScenario(scenarioName, thresholds) {
    if (scenarioName.includes('emergency')) {
      return thresholds.emergency_endpoints || 2000;
    }
    return thresholds.general_endpoints || 4000;
  }

  async generateFinalReport() {
    this.log('Generating final comprehensive report...');
    
    const report = {
      test_run: {
        timestamp: new Date().toISOString(),
        duration: Date.now() - this.startTime,
        results_directory: this.resultsDir
      },
      system_info: {
        cpus: os.cpus().length,
        total_memory: os.totalmem(),
        platform: os.platform(),
        arch: os.arch()
      },
      test_results: Object.fromEntries(this.testResults),
      summary: this.generateSummary()
    };
    
    const reportFile = path.join(this.resultsDir, 'final-report.json');
    fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
    
    // Generate HTML report
    await this.generateHtmlReport(report);
    
    this.log(`Final report generated: ${reportFile}`);
  }

  generateSummary() {
    const totalTests = this.testResults.size;
    const passedTests = Array.from(this.testResults.values()).filter(r => r.status === 'completed' && r.analysis?.passed).length;
    const failedTests = totalTests - passedTests;
    
    return {
      total_tests: totalTests,
      passed_tests: passedTests,
      failed_tests: failedTests,
      success_rate: totalTests > 0 ? (passedTests / totalTests) * 100 : 0
    };
  }

  async generateHtmlReport(report) {
    const htmlTemplate = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Xpress Ops Tower - Load Test Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background-color: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .header { text-align: center; margin-bottom: 30px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .summary-card { background: #f8f9fa; padding: 15px; border-radius: 6px; text-align: center; }
        .passed { background-color: #d4edda; color: #155724; }
        .failed { background-color: #f8d7da; color: #721c24; }
        .test-result { margin-bottom: 20px; padding: 15px; border: 1px solid #dee2e6; border-radius: 6px; }
        .metric { margin: 10px 0; padding: 8px; background-color: #f8f9fa; border-radius: 4px; }
        .threshold-pass { color: #28a745; }
        .threshold-fail { color: #dc3545; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        th, td { padding: 8px; text-align: left; border-bottom: 1px solid #dee2e6; }
        th { background-color: #f8f9fa; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🚀 Xpress Ops Tower Load Test Report</h1>
            <p>Generated: ${report.test_run.timestamp}</p>
            <p>Test Duration: ${Math.round(report.test_run.duration / 60000)} minutes</p>
        </div>
        
        <div class="summary">
            <div class="summary-card ${report.summary.success_rate === 100 ? 'passed' : 'failed'}">
                <h3>Overall Success Rate</h3>
                <h2>${report.summary.success_rate.toFixed(1)}%</h2>
                <p>${report.summary.passed_tests} / ${report.summary.total_tests} tests passed</p>
            </div>
            <div class="summary-card">
                <h3>System Configuration</h3>
                <p>${report.system_info.cpus} CPUs</p>
                <p>${Math.round(report.system_info.total_memory / 1024 / 1024 / 1024)}GB RAM</p>
                <p>${report.system_info.platform} ${report.system_info.arch}</p>
            </div>
        </div>
        
        <h2>📊 Test Results</h2>
        ${this.generateTestResultsHtml(report.test_results)}
        
        <div style="margin-top: 30px; padding: 15px; background-color: #e9ecef; border-radius: 6px;">
            <p><strong>Note:</strong> This report provides a comprehensive overview of the load testing results. 
            For detailed metrics and raw data, please refer to the individual test result files in the results directory.</p>
        </div>
    </div>
</body>
</html>`;
    
    const htmlFile = path.join(this.resultsDir, 'final-report.html');
    fs.writeFileSync(htmlFile, htmlTemplate);
    
    this.log(`HTML report generated: ${htmlFile}`);
  }

  generateTestResultsHtml(testResults) {
    let html = '';
    
    Object.entries(testResults).forEach(([testName, result]) => {
      const statusClass = result.status === 'completed' && result.analysis?.passed ? 'passed' : 'failed';
      const statusIcon = result.status === 'completed' && result.analysis?.passed ? '✅' : '❌';
      
      html += `
        <div class="test-result ${statusClass}">
            <h3>${statusIcon} ${testName.replace(/_/g, ' ').toUpperCase()}</h3>
            <p><strong>Status:</strong> ${result.status}</p>
            <p><strong>Timestamp:</strong> ${result.timestamp}</p>
            
            ${result.analysis ? this.generateMetricsHtml(result.analysis) : ''}
            ${result.error ? `<p><strong>Error:</strong> ${result.error}</p>` : ''}
        </div>`;
    });
    
    return html;
  }

  generateMetricsHtml(analysis) {
    let html = '<h4>📈 Metrics</h4>';
    
    if (analysis.thresholds && analysis.thresholds.length > 0) {
      html += '<table><tr><th>Metric</th><th>Threshold</th><th>Actual</th><th>Status</th></tr>';
      
      analysis.thresholds.forEach(threshold => {
        const statusClass = threshold.passed ? 'threshold-pass' : 'threshold-fail';
        const statusIcon = threshold.passed ? '✅' : '❌';
        
        html += `<tr>
          <td>${threshold.metric}</td>
          <td>${threshold.threshold}</td>
          <td>${typeof threshold.actual === 'number' ? threshold.actual.toFixed(2) : threshold.actual}</td>
          <td class="${statusClass}">${statusIcon}</td>
        </tr>`;
      });
      
      html += '</table>';
    }
    
    return html;
  }

  makeHttpRequest(url) {
    return new Promise((resolve, reject) => {
      const http = require('http');
      const https = require('https');
      const client = url.startsWith('https') ? https : http;
      
      const request = client.get(url, (response) => {
        resolve({ statusCode: response.statusCode });
      });
      
      request.on('error', reject);
      request.setTimeout(5000, () => {
        request.destroy();
        reject(new Error('Request timeout'));
      });
    });
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const environment = args[0] || 'local';
  const specificScenario = args[1];
  
  const runner = new LoadTestRunner();
  
  if (specificScenario) {
    console.log(`Running specific scenario: ${specificScenario}`);
    runner.runTestScenario(specificScenario, environment)
      .then(() => runner.generateFinalReport())
      .catch(console.error);
  } else {
    console.log(`Running all load tests for environment: ${environment}`);
    runner.runAllTests(environment)
      .catch(console.error);
  }
}

module.exports = LoadTestRunner;