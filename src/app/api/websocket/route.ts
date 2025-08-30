// WebSocket API Route for Real-time Connections
// Handles WebSocket upgrade requests and connection management

import { NextRequest } from 'next/server';
import { getWebSocketManager } from '@/lib/websocket';
import { logger } from '@/lib/security/productionLogger';

export async function GET(request: NextRequest) {
  // Check if this is a WebSocket upgrade request
  const upgrade = request.headers.get('upgrade');
  
  if (upgrade !== 'websocket') {
    return new Response('WebSocket upgrade required', { 
      status: 400,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  try {
    // Get WebSocket manager
    const wsManager = getWebSocketManager();
    
    if (!wsManager) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'WebSocket server not initialized',
          timestamp: new Date().toISOString(),
        }),
        { 
          status: 503,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    }

    // Return connection info and stats
    const stats = wsManager.getStats();
    
    return new Response(
      JSON.stringify({
        success: true,
        message: 'WebSocket server is running',
        endpoint: '/socket.io/',
        stats: {
          totalConnections: stats.totalConnections,
          regionalConnections: stats.regionalConnections,
          driverConnections: stats.driverConnections,
          operatorConnections: stats.operatorConnections,
        },
        features: [
          'Real-time driver location updates',
          'Instant emergency alerts',
          'Live booking status changes',
          'System health monitoring',
          'KPI metrics broadcasting'
        ],
        timestamp: new Date().toISOString(),
      }),
      { 
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
        },
      }
    );

  } catch (error) {
    logger.error(`WebSocket API route error: ${error instanceof Error ? error.message : error}`);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Internal server error',
        timestamp: new Date().toISOString(),
      }),
      { 
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
}

// Health check endpoint for WebSocket service
export async function POST(request: NextRequest) {
  try {
    const wsManager = getWebSocketManager();
    
    if (!wsManager) {
      return new Response(
        JSON.stringify({
          success: false,
          status: 'down',
          error: 'WebSocket server not initialized',
          timestamp: new Date().toISOString(),
        }),
        { 
          status: 503,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    }

    const stats = wsManager.getStats();
    const isHealthy = stats.totalConnections >= 0; // Basic health check

    return new Response(
      JSON.stringify({
        success: true,
        status: isHealthy ? 'healthy' : 'degraded',
        stats,
        healthChecks: {
          serverRunning: true,
          connectionsActive: stats.totalConnections > 0,
          regionsConnected: Object.keys(stats.regionalConnections).length,
        },
        timestamp: new Date().toISOString(),
      }),
      { 
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

  } catch (error) {
    logger.error(`WebSocket health check error: ${error instanceof Error ? error.message : error}`);
    
    return new Response(
      JSON.stringify({
        success: false,
        status: 'down',
        error: 'Health check failed',
        timestamp: new Date().toISOString(),
      }),
      { 
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
}