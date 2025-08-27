// Main Server Entry Point for Xpress Ops Tower
// High-performance backend server with real-time capabilities

import { createServer } from 'http';
import next from 'next';
import { initializeDatabase, closeDatabaseConnection } from './lib/database';
import { initializeRedis, closeRedisConnection } from './lib/redis';
import { initializeWebSocketServer } from './lib/websocket';

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
    console.log('🚀 Starting Xpress Ops Tower Backend...');

    try {
      // 1. Initialize database connections
      console.log('📊 Initializing database connections...');
      await initializeDatabase();
      console.log('✅ Database connected successfully');

      // 2. Initialize Redis cache and pub/sub
      console.log('🔄 Initializing Redis cache layer...');
      await initializeRedis();
      console.log('✅ Redis cache layer ready');

      // 3. Prepare Next.js application
      console.log('⚡ Preparing Next.js application...');
      await app.prepare();
      console.log('✅ Next.js application ready');

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
          console.error('Request handling error:', error);
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
      console.log('🔌 Initializing WebSocket server...');
      const wsManager = initializeWebSocketServer(this.httpServer);
      console.log('✅ WebSocket server ready for real-time communications');

      // 6. Setup server monitoring
      this.setupMonitoring();

      // 7. Setup graceful shutdown
      this.setupGracefulShutdown();

      console.log('🎯 All systems initialized successfully!');

    } catch (error) {
      console.error('❌ Failed to initialize server:', error);
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

        console.log(`
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
      console.log(`📊 Performance: ${this.stats.totalRequests} requests, ${this.stats.activeConnections} active connections, ${memoryMB}MB memory`);
    }, 300000);
  }

  // Setup graceful shutdown
  private setupGracefulShutdown(): void {
    const shutdown = async (signal: string) => {
      if (this.isShuttingDown) return;
      this.isShuttingDown = true;

      console.log(`\n🔄 Received ${signal}, starting graceful shutdown...`);

      try {
        // 1. Stop accepting new requests
        console.log('🚫 Stopping HTTP server...');
        this.httpServer.close();

        // 2. Close WebSocket connections
        console.log('🔌 Closing WebSocket connections...');
        const wsManager = require('./lib/websocket').getWebSocketManager();
        if (wsManager) {
          await wsManager.close();
        }

        // 3. Close database connections
        console.log('📊 Closing database connections...');
        await closeDatabaseConnection();

        // 4. Close Redis connections
        console.log('🔄 Closing Redis connections...');
        await closeRedisConnection();

        console.log('✅ Graceful shutdown completed');
        process.exit(0);
      } catch (error) {
        console.error('❌ Error during shutdown:', error);
        process.exit(1);
      }
    };

    // Handle shutdown signals
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
    
    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      console.error('💥 Uncaught Exception:', error);
      shutdown('uncaughtException');
    });

    process.on('unhandledRejection', (reason, promise) => {
      console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
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
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Server startup failed:', error);
    process.exit(1);
  });
}

export default main;