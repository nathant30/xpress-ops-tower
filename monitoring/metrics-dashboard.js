// Real-time Metrics Dashboard Server
// Provides live performance metrics visualization for operators

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const { performanceMonitor } = require('./performance-monitor');

class MetricsDashboard {
  constructor(port = 3001) {
    this.port = port;
    this.app = express();
    this.server = http.createServer(this.app);
    this.io = socketIo(this.server, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"]
      }
    });
    
    this.connectedClients = new Set();
    this.setupMiddleware();
    this.setupRoutes();
    this.setupWebSocket();
    this.bindPerformanceMonitor();
  }

  setupMiddleware() {
    this.app.use(express.json());
    this.app.use(express.static(path.join(__dirname, 'dashboard')));
    
    // CORS middleware
    this.app.use((req, res, next) => {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
      if (req.method === 'OPTIONS') {
        res.sendStatus(200);
      } else {
        next();
      }
    });
  }

  setupRoutes() {
    // Main dashboard page
    this.app.get('/', (req, res) => {
      res.sendFile(path.join(__dirname, 'dashboard', 'index.html'));
    });

    // Current metrics API
    this.app.get('/api/metrics', (req, res) => {
      try {
        const metrics = performanceMonitor.getCurrentMetrics();
        res.json({
          success: true,
          data: metrics
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    });

    // Historical metrics API
    this.app.get('/api/metrics/history', (req, res) => {
      try {
        const hours = parseInt(req.query.hours) || 1;
        const history = performanceMonitor.getMetricsHistory(hours);
        res.json({
          success: true,
          data: history,
          count: history.length
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    });

    // Active alerts API
    this.app.get('/api/alerts', (req, res) => {
      try {
        const alerts = performanceMonitor.getActiveAlerts();
        res.json({
          success: true,
          data: alerts,
          count: alerts.length
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    });

    // System report API
    this.app.get('/api/report', (req, res) => {
      try {
        const report = performanceMonitor.generateReport();
        res.json({
          success: true,
          data: report
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    });

    // Export metrics API
    this.app.get('/api/export/:format', async (req, res) => {
      try {
        const format = req.params.format;
        const filepath = await performanceMonitor.exportMetrics(format);
        
        res.download(filepath, (err) => {
          if (err) {
            res.status(500).json({
              success: false,
              error: 'Failed to download export file'
            });
          }
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    });

    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        connected_clients: this.connectedClients.size
      });
    });
  }

  setupWebSocket() {
    this.io.on('connection', (socket) => {
      console.log(`Dashboard client connected: ${socket.id}`);
      this.connectedClients.add(socket.id);
      
      // Send initial metrics
      const currentMetrics = performanceMonitor.getCurrentMetrics();
      socket.emit('initial-metrics', currentMetrics);
      
      // Send active alerts
      const activeAlerts = performanceMonitor.getActiveAlerts();
      socket.emit('alerts-update', activeAlerts);
      
      // Handle client requests
      socket.on('request-history', (data) => {
        const hours = data.hours || 1;
        const history = performanceMonitor.getMetricsHistory(hours);
        socket.emit('history-data', history);
      });
      
      socket.on('disconnect', () => {
        console.log(`Dashboard client disconnected: ${socket.id}`);
        this.connectedClients.delete(socket.id);
      });
    });
  }

  bindPerformanceMonitor() {
    // Forward performance monitor events to WebSocket clients
    performanceMonitor.on('metrics-collected', (metrics) => {
      this.io.emit('metrics-update', metrics);
    });
    
    performanceMonitor.on('alert', (alert) => {
      this.io.emit('new-alert', alert);
      console.log(`📊 Dashboard broadcasting alert: ${alert.message}`);
    });
    
    performanceMonitor.on('monitoring-error', (error) => {
      this.io.emit('monitoring-error', {
        message: error.message,
        timestamp: new Date().toISOString()
      });
    });
  }

  start() {
    return new Promise((resolve) => {
      this.server.listen(this.port, () => {
        console.log(`📊 Metrics Dashboard running on http://localhost:${this.port}`);
        
        // Start performance monitoring if not already running
        if (!performanceMonitor.isMonitoring) {
          performanceMonitor.startMonitoring(5000); // 5 second intervals
        }
        
        resolve();
      });
    });
  }

  stop() {
    return new Promise((resolve) => {
      this.server.close(() => {
        console.log('Metrics Dashboard stopped');
        resolve();
      });
    });
  }

  getStats() {
    return {
      connected_clients: this.connectedClients.size,
      server_uptime: process.uptime(),
      port: this.port,
      monitoring_active: performanceMonitor.isMonitoring
    };
  }
}

// CLI interface
if (require.main === module) {
  const port = process.env.DASHBOARD_PORT || 3001;
  const dashboard = new MetricsDashboard(port);
  
  dashboard.start().catch(console.error);
  
  // Graceful shutdown
  process.on('SIGINT', async () => {
    console.log('Shutting down metrics dashboard...');
    performanceMonitor.stopMonitoring();
    await dashboard.stop();
    process.exit(0);
  });
}

module.exports = MetricsDashboard;