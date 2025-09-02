// Main Server Entry Point for Xpress Ops Tower
// High-performance backend server with real-time capabilities

import { createServer } from 'http';
import next from 'next';
import { initializeDatabase, closeDatabaseConnection } from './lib/database';
import { initializeRedis, closeRedisConnection } from './lib/redis';
import { initializeWebSocketServer } from './lib/websocket';
import { locationScheduler } from './lib/locationScheduler';
import { connectionHealthMonitor } from './lib/connectionHealthMonitor';
import { metricsCollector } from './lib/metricsCollector';
import { logger } from './lib/security/productionLogger';

// Fix EventEmitter memory leak warning
process.setMaxListeners(20);

const dev = process.env.NODE_ENV !== 'production';
const hostname = process.env.HOSTNAME || 'localhost';
const port = parseInt(process.env.PORT || '3000', 10);

// Create Next.js app
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

interface ServerStats {
  startTime: Date;
  uptime: number;
  totalRequests: number;
  activeConnections: number;
  memoryUsage: NodeJS.MemoryUsage;
}

class XpressOpsServer {
  private httpServer: any;
  private stats: ServerStats;
  private isShuttingDown = false;

  constructor() {
    this.stats = {
      startTime: new Date(),
      uptime: 0,
      totalRequests: 0,
      activeConnections: 0,
      memoryUsage: process.memoryUsage()
    };
  }

  // Initialize all server components
  async initialize(): Promise<void> {
    logger.info('🚀 Starting Xpress Ops Tower Backend...');

    try {
      // 1. Initialize database connections
      logger.info('📊 Initializing database connections...');
      await initializeDatabase();
      logger.info('✅ Database connected successfully');

      // 2. Initialize Redis cache and pub/sub
      logger.info('🔄 Initializing Redis cache layer...');
      await initializeRedis();
      logger.info('✅ Redis cache layer ready');

      // 3. Prepare Next.js application
      logger.info('⚡ Preparing Next.js application...');
      await app.prepare();
      logger.info('✅ Next.js application ready');

      // 4. Create HTTP server
      this.httpServer = createServer(async (req, res) => {
        try {
          this.stats.totalRequests++;
          this.stats.activeConnections++;

          // Add CORS headers for API requests
          if (req.url?.startsWith('/api/')) {
            res.setHeader('Access-Control-Allow-Origin', process.env.CORS_ORIGIN || '*');
            res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
            
            if (req.method === 'OPTIONS') {
              res.writeHead(200);
              res.end();
              return;
            }
          }

          // Add security headers
          res.setHeader('X-Content-Type-Options', 'nosniff');
          res.setHeader('X-Frame-Options', 'DENY');
          res.setHeader('X-XSS-Protection', '1; mode=block');
          res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

          // Handle request
          await handle(req, res);
        } catch (error) {
          logger.error('Request handling error:', error);
          if (!res.headersSent) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({
              success: false,
              error: 'Internal server error',
              timestamp: new Date().toISOString()
            }));
          }
        } finally {
          this.stats.activeConnections--;
        }
      });

      // 5. Initialize WebSocket server
      logger.info('🔌 Initializing WebSocket server...');
      const wsManager = initializeWebSocketServer(this.httpServer);
      logger.info('✅ WebSocket server ready for real-time communications');

      // 6. Start location broadcasting scheduler
      logger.info('📍 Starting location broadcast scheduler...');
      locationScheduler.start();
      logger.info('✅ Location scheduler ready for 30-second broadcasts');

      // 7. Start health monitoring
      logger.info('🔍 Starting connection health monitoring...');
      connectionHealthMonitor.start();
      logger.info('✅ Health monitoring active');

      // 8. Start metrics collection
      logger.info('📊 Starting real-time metrics collection...');
      metricsCollector.start();
      logger.info('✅ Metrics collection active');

      // 9. Setup server monitoring
      this.setupMonitoring();

      // 10. Setup graceful shutdown
      this.setupGracefulShutdown();

      logger.info('🎯 All systems initialized successfully!');

    } catch (error) {
      logger.error('❌ Failed to initialize server:', error);
      process.exit(1);
    }
  }

  // Start the HTTP server
  async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.httpServer.listen(port, (err?: Error) => {
        if (err) {
          reject(err);
          return;
        }

        logger.info(`
╔══════════════════════════════════════════════════════════════════════╗
║                    🚀 XPRESS OPS TOWER BACKEND                      ║
║                         Real-time Fleet Operations                   ║
╠══════════════════════════════════════════════════════════════════════╣
║  🌐 Server URL: http://${hostname}:${port}                          ║
║  🔧 Environment: ${process.env.NODE_ENV || 'development'}            ║
║  📊 Database: PostgreSQL (${process.env.DATABASE_NAME || 'xpress_ops_tower'})
║  🔄 Cache: Redis (${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || '6379'})
║  🔌 WebSocket: Ready for 10,000+ concurrent connections             ║
║  📈 Performance Target: <2s API response, 99.9% uptime             ║
╠══════════════════════════════════════════════════════════════════════╣
║  📋 API Endpoints:                                                   ║
║    • /api/drivers     - Driver management & status updates          ║
║    • /api/bookings    - Booking lifecycle management                ║
║    • /api/locations   - Real-time location tracking                 ║
║    • /api/analytics   - KPI dashboard data                          ║
║    • /api/alerts      - Emergency & SOS management                  ║
╚══════════════════════════════════════════════════════════════════════╝
        `);

        resolve();
      });
    });
  }

  // Setup server monitoring
  private setupMonitoring(): void {
    // Update stats every 30 seconds
    setInterval(() => {
      this.stats.uptime = Date.now() - this.stats.startTime.getTime();
      this.stats.memoryUsage = process.memoryUsage();
    }, 30000);

    // Health check endpoint
    this.httpServer.on('request', (req: any, res: any) => {
      if (req.url === '/health' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          status: 'healthy',
          timestamp: new Date().toISOString(),
          uptime: this.stats.uptime,
          totalRequests: this.stats.totalRequests,
          activeConnections: this.stats.activeConnections,
          memoryUsage: {
            rss: Math.round(this.stats.memoryUsage.rss / 1024 / 1024) + 'MB',
            heapUsed: Math.round(this.stats.memoryUsage.heapUsed / 1024 / 1024) + 'MB',
            heapTotal: Math.round(this.stats.memoryUsage.heapTotal / 1024 / 1024) + 'MB'
          }
        }));
      }
    });

    // Log performance metrics every 5 minutes
    setInterval(() => {
      const memoryMB = Math.round(this.stats.memoryUsage.heapUsed / 1024 / 1024);
      logger.info(`📊 Performance: ${this.stats.totalRequests} requests, ${this.stats.activeConnections} active connections, ${memoryMB}MB memory`);
    }, 300000);
  }

  // Setup graceful shutdown
  private setupGracefulShutdown(): void {
    const shutdown = async (signal: string) => {
      if (this.isShuttingDown) return;
      this.isShuttingDown = true;

      logger.info(`\n🔄 Received ${signal}, starting graceful shutdown...`);

      try {
        // 1. Stop accepting new requests
        logger.info('🚫 Stopping HTTP server...');
        this.httpServer.close();

        // 2. Stop health monitoring
        logger.info('🔍 Stopping health monitoring...');
        connectionHealthMonitor.stop();

        // 3. Stop metrics collection
        logger.info('📊 Stopping metrics collection...');
        metricsCollector.stop();

        // 4. Stop location scheduler
        logger.info('📍 Stopping location scheduler...');
        locationScheduler.stop();

        // 5. Close WebSocket connections
        logger.info('🔌 Closing WebSocket connections...');
        const wsManager = require('./lib/websocket').getWebSocketManager();
        if (wsManager) {
          await wsManager.close();
        }

        // 6. Close database connections
        logger.info('📊 Closing database connections...');
        await closeDatabaseConnection();

        // 7. Close Redis connections
        logger.info('🔄 Closing Redis connections...');
        await closeRedisConnection();

        logger.info('✅ Graceful shutdown completed');
        process.exit(0);
      } catch (error) {
        logger.error('❌ Error during shutdown:', error);
        process.exit(1);
      }
    };

    // Handle shutdown signals
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
    
    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      logger.error('💥 Uncaught Exception:', error);
      shutdown('uncaughtException');
    });

    process.on('unhandledRejection', (reason, promise) => {
      logger.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
      shutdown('unhandledRejection');
    });
  }

  // Get server statistics
  getStats(): ServerStats {
    return {
      ...this.stats,
      uptime: Date.now() - this.stats.startTime.getTime()
    };
  }
}

// Main execution
async function main() {
  const server = new XpressOpsServer();
  
  try {
    await server.initialize();
    await server.start();
  } catch (error) {
    logger.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
if (require.main === module) {
  main().catch(error => {
    logger.error('❌ Server startup failed:', error);
    process.exit(1);
  });
}

export default main;