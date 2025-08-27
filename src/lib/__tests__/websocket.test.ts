// Integration Tests for WebSocket Real-time Communication
// Testing real-time system for 10,000+ concurrent users

import { WebSocketManager, initializeWebSocketServer, getWebSocketManager } from '../websocket';
import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { authManager } from '../auth';
import { redis } from '../redis';
import { createServer } from 'http';
import { AddressInfo } from 'net';
import io from 'socket.io-client';

// Mock dependencies
jest.mock('../auth');
jest.mock('../redis');

// Mock Socket.IO for testing
jest.mock('socket.io', () => ({
  Server: jest.fn().mockImplementation(() => ({
    use: jest.fn(),
    on: jest.fn(),
    emit: jest.fn(),
    close: jest.fn((callback) => callback && callback()),
    sockets: {
      sockets: new Map()
    }
  }))
}));

describe('WebSocketManager', () => {
  let httpServer: HTTPServer;
  let wsManager: WebSocketManager;
  let mockIO: jest.Mocked<SocketIOServer>;
  let mockAuthManager: jest.Mocked<typeof authManager>;
  let mockRedis: jest.Mocked<typeof redis>;

  const mockUser = {
    userId: 'user-123',
    username: 'test-user',
    email: 'test@example.com',
    role: 'operator',
    userType: 'operator' as const,
    regionId: 'ncr-manila',
    permissions: ['drivers:read', 'bookings:read', 'incidents:read'],
    sessionId: 'session-123'
  };

  beforeEach(() => {
    httpServer = createServer();
    mockAuthManager = authManager as jest.Mocked<typeof authManager>;
    mockRedis = redis as jest.Mocked<typeof redis>;
    
    // Mock authentication
    mockAuthManager.verifyToken.mockResolvedValue(mockUser);
    
    // Mock Redis operations
    mockRedis.subscribe.mockResolvedValue(undefined);
    mockRedis.publish.mockResolvedValue(1);
    mockRedis.updateDriverLocation = jest.fn().mockResolvedValue(undefined);
    
    // Initialize WebSocket manager
    wsManager = initializeWebSocketServer(httpServer);
    mockIO = (wsManager as any).io;
    
    jest.clearAllMocks();
  });

  afterEach(async () => {
    await wsManager.close();
    httpServer.close();
  });

  describe('Connection Management', () => {
    it('should initialize WebSocket server with correct configuration', () => {
      expect(SocketIOServer).toHaveBeenCalledWith(httpServer, {
        cors: {
          origin: "*",
          methods: ["GET", "POST"],
          credentials: true
        },
        transports: ['websocket', 'polling'],
        pingTimeout: 30000,
        pingInterval: 25000,
        maxHttpBufferSize: 1024 * 1024,
        allowEIO3: true
      });
    });

    it('should set up authentication middleware', () => {
      expect(mockIO.use).toHaveBeenCalled();
      
      // Get the middleware function
      const middlewareCall = (mockIO.use as jest.Mock).mock.calls[0];
      expect(middlewareCall).toBeDefined();
      
      const middleware = middlewareCall[0];
      expect(typeof middleware).toBe('function');
    });

    it('should authenticate valid tokens', async () => {
      const mockSocket = {
        handshake: {
          auth: { token: 'valid-token' },
          headers: {}
        },
        data: {}
      };
      const mockNext = jest.fn();
      
      // Get the middleware function and test it
      const middlewareCall = (mockIO.use as jest.Mock).mock.calls[0];
      const middleware = middlewareCall[0];
      
      await middleware(mockSocket, mockNext);
      
      expect(mockAuthManager.verifyToken).toHaveBeenCalledWith('valid-token');
      expect(mockSocket.data.user).toEqual(mockUser);
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should reject invalid tokens', async () => {
      mockAuthManager.verifyToken.mockResolvedValueOnce(null);
      
      const mockSocket = {
        handshake: {
          auth: { token: 'invalid-token' },
          headers: {}
        },
        data: {}
      };
      const mockNext = jest.fn();
      
      const middlewareCall = (mockIO.use as jest.Mock).mock.calls[0];
      const middleware = middlewareCall[0];
      
      await middleware(mockSocket, mockNext);
      
      expect(mockNext).toHaveBeenCalledWith(new Error('Authentication error: Invalid token'));
    });

    it('should handle missing tokens', async () => {
      const mockSocket = {
        handshake: {
          auth: {},
          headers: {}
        },
        data: {}
      };
      const mockNext = jest.fn();
      
      const middlewareCall = (mockIO.use as jest.Mock).mock.calls[0];
      const middleware = middlewareCall[0];
      
      await middleware(mockSocket, mockNext);
      
      expect(mockNext).toHaveBeenCalledWith(new Error('Authentication error: Missing token'));
    });
  });

  describe('Socket Event Handling', () => {
    let mockSocket: any;
    let connectionHandler: any;

    beforeEach(() => {
      mockSocket = {
        id: 'socket-123',
        data: { user: mockUser },
        on: jest.fn(),
        emit: jest.fn(),
        join: jest.fn(),
        leave: jest.fn()
      };

      // Get the connection handler
      const connectionCall = (mockIO.on as jest.Mock).mock.calls.find(
        call => call[0] === 'connection'
      );
      connectionHandler = connectionCall[1];
    });

    it('should handle new connections properly', () => {
      connectionHandler(mockSocket);
      
      expect(mockSocket.on).toHaveBeenCalledWith('subscribe', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('unsubscribe', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('location:update', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('emergency:trigger', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('disconnect', expect.any(Function));
      
      expect(mockSocket.emit).toHaveBeenCalledWith('connected', {
        socketId: 'socket-123',
        userId: 'user-123',
        role: 'operator',
        regionId: 'ncr-manila',
        permissions: mockUser.permissions,
        timestamp: expect.any(String)
      });
    });

    it('should handle driver connections and track driver sockets', () => {
      const driverUser = { ...mockUser, userType: 'driver' as const };
      mockSocket.data.user = driverUser;
      
      connectionHandler(mockSocket);
      
      // Should have stored driver socket mapping
      const stats = wsManager.getStats();
      expect(stats.driverConnections).toBe(1);
    });

    it('should handle subscription requests', () => {
      connectionHandler(mockSocket);
      
      // Get the subscribe handler
      const subscribeCall = (mockSocket.on as jest.Mock).mock.calls.find(
        call => call[0] === 'subscribe'
      );
      const subscribeHandler = subscribeCall[1];
      
      const channels = ['drivers:status', 'bookings:updates'];
      subscribeHandler(channels);
      
      // Should join channels based on permissions
      expect(mockSocket.join).toHaveBeenCalled();
      expect(mockSocket.emit).toHaveBeenCalledWith('subscribed', expect.any(Object));
    });

    it('should handle location updates from drivers', async () => {
      const driverUser = { ...mockUser, userType: 'driver' as const };
      mockSocket.data.user = driverUser;
      
      connectionHandler(mockSocket);
      
      // Get the location update handler
      const locationCall = (mockSocket.on as jest.Mock).mock.calls.find(
        call => call[0] === 'location:update'
      );
      const locationHandler = locationCall[1];
      
      const locationData = {
        latitude: 14.5995,
        longitude: 120.9842,
        accuracy: 5,
        bearing: 45,
        speed: 30,
        status: 'active',
        isAvailable: true,
        regionId: 'ncr-manila'
      };
      
      await locationHandler(locationData);
      
      expect(mockRedis.updateDriverLocation).toHaveBeenCalledWith(
        driverUser.userId,
        expect.objectContaining({
          latitude: 14.5995,
          longitude: 120.9842,
          status: 'active',
          isAvailable: true
        })
      );
    });

    it('should handle emergency triggers', async () => {
      connectionHandler(mockSocket);
      
      // Get the emergency handler
      const emergencyCall = (mockSocket.on as jest.Mock).mock.calls.find(
        call => call[0] === 'emergency:trigger'
      );
      const emergencyHandler = emergencyCall[1];
      
      const emergencyData = {
        location: { latitude: 14.5995, longitude: 120.9842 },
        message: 'Help needed!'
      };
      
      await emergencyHandler(emergencyData);
      
      expect(mockRedis.publish).toHaveBeenCalledWith(
        'emergency:triggered',
        expect.objectContaining({
          userId: mockUser.userId,
          userType: mockUser.userType,
          location: emergencyData.location
        })
      );
    });

    it('should handle disconnections properly', () => {
      connectionHandler(mockSocket);
      
      // Get the disconnect handler
      const disconnectCall = (mockSocket.on as jest.Mock).mock.calls.find(
        call => call[0] === 'disconnect'
      );
      const disconnectHandler = disconnectCall[1];
      
      disconnectHandler('client disconnect');
      
      // Should clean up socket mappings
      const stats = wsManager.getStats();
      expect(stats.totalConnections).toBe(0);
    });
  });

  describe('Broadcasting and Messaging', () => {
    beforeEach(() => {
      // Set up mock sockets in the manager
      const mockSocket1 = { id: 'socket-1', emit: jest.fn() };
      const mockSocket2 = { id: 'socket-2', emit: jest.fn() };
      
      mockIO.sockets.sockets.set('socket-1', mockSocket1 as any);
      mockIO.sockets.sockets.set('socket-2', mockSocket2 as any);
      
      // Simulate authenticated connections
      (wsManager as any).authenticatedSockets.set('socket-1', {
        id: 'socket-1',
        user: { ...mockUser, userId: 'user-1', role: 'admin' },
        regionId: 'ncr-manila',
        subscriptions: new Set()
      });
      
      (wsManager as any).authenticatedSockets.set('socket-2', {
        id: 'socket-2',
        user: { ...mockUser, userId: 'user-2', role: 'operator' },
        regionId: 'ncr-manila',
        subscriptions: new Set()
      });
      
      (wsManager as any).regionSockets.set('ncr-manila', new Set(['socket-1', 'socket-2']));
    });

    it('should broadcast to all sockets in a region', () => {
      (wsManager as any).broadcastToRegion('ncr-manila', 'driver:location_updated', {
        driverId: 'driver-123',
        location: { latitude: 14.5995, longitude: 120.9842 },
        timestamp: new Date().toISOString()
      });
      
      const socket1 = mockIO.sockets.sockets.get('socket-1');
      const socket2 = mockIO.sockets.sockets.get('socket-2');
      
      expect(socket1?.emit).toHaveBeenCalledWith('driver:location_updated', expect.any(Object));
      expect(socket2?.emit).toHaveBeenCalledWith('driver:location_updated', expect.any(Object));
    });

    it('should broadcast to specific roles', () => {
      (wsManager as any).broadcastToRole('admin', 'system:metrics_updated', {
        metrics: { activeDrivers: 100 },
        timestamp: new Date().toISOString()
      });
      
      const socket1 = mockIO.sockets.sockets.get('socket-1'); // admin
      const socket2 = mockIO.sockets.sockets.get('socket-2'); // operator
      
      expect(socket1?.emit).toHaveBeenCalledWith('system:metrics_updated', expect.any(Object));
      expect(socket2?.emit).not.toHaveBeenCalled();
    });

    it('should send messages to specific users', () => {
      wsManager.sendToUser('user-1', 'booking:driver_assigned', {
        bookingId: 'booking-123',
        driverId: 'driver-456',
        timestamp: new Date().toISOString()
      } as any);
      
      const socket1 = mockIO.sockets.sockets.get('socket-1');
      const socket2 = mockIO.sockets.sockets.get('socket-2');
      
      expect(socket1?.emit).toHaveBeenCalledWith('booking:driver_assigned', expect.any(Object));
      expect(socket2?.emit).not.toHaveBeenCalled();
    });

    it('should broadcast system announcements', () => {
      wsManager.broadcastSystemAnnouncement('System maintenance in 5 minutes', 'warning');
      
      expect(mockIO.emit).toHaveBeenCalledWith('system:announcement', {
        message: 'System maintenance in 5 minutes',
        priority: 'warning',
        timestamp: expect.any(String)
      });
    });
  });

  describe('Redis Integration', () => {
    it('should subscribe to Redis channels', () => {
      const expectedChannels = [
        'driver:status_changed',
        'driver:location_updated',
        'booking:new_request',
        'booking:driver_assigned',
        'booking:status_updated',
        'incident:new_alert',
        'incident:acknowledged',
        'incident:escalated',
        'incident:resolved',
        'system:metrics_updated'
      ];
      
      expect(mockRedis.subscribe).toHaveBeenCalledWith(
        expectedChannels,
        expect.any(Function)
      );
    });

    it('should handle Redis messages and broadcast accordingly', () => {
      // Get the Redis message handler
      const subscribeCall = (mockRedis.subscribe as jest.Mock).mock.calls[0];
      const messageHandler = subscribeCall[1];
      
      // Set up mock sockets
      const mockSocket = { emit: jest.fn() };
      mockIO.sockets.sockets.set('socket-test', mockSocket as any);
      
      (wsManager as any).regionSockets.set('ncr-manila', new Set(['socket-test']));
      
      // Test driver location update message
      const driverLocationMessage = {
        regionId: 'ncr-manila',
        driverId: 'driver-123',
        location: { latitude: 14.5995, longitude: 120.9842 },
        timestamp: new Date().toISOString()
      };
      
      messageHandler('driver:location_updated', driverLocationMessage);
      
      expect(mockSocket.emit).toHaveBeenCalledWith(
        'driver:location_updated',
        driverLocationMessage
      );
    });

    it('should handle booking requests and notify nearby drivers', () => {
      const subscribeCall = (mockRedis.subscribe as jest.Mock).mock.calls[0];
      const messageHandler = subscribeCall[1];
      
      // Set up driver socket
      const mockDriverSocket = { emit: jest.fn() };
      mockIO.sockets.sockets.set('driver-socket', mockDriverSocket as any);
      (wsManager as any).driverSockets.set('driver-nearby', 'driver-socket');
      
      const bookingMessage = {
        bookingId: 'booking-123',
        nearbyDrivers: ['driver-nearby', 'driver-far'],
        regionId: 'ncr-manila',
        timestamp: new Date().toISOString()
      };
      
      messageHandler('booking:new_request', bookingMessage);
      
      expect(mockDriverSocket.emit).toHaveBeenCalledWith(
        'booking:new_request',
        bookingMessage
      );
    });
  });

  describe('Performance and Scalability', () => {
    it('should provide connection statistics', () => {
      // Set up multiple connections
      (wsManager as any).authenticatedSockets.set('driver-1', {
        user: { userType: 'driver', role: 'driver' }
      });
      (wsManager as any).authenticatedSockets.set('driver-2', {
        user: { userType: 'driver', role: 'driver' }
      });
      (wsManager as any).authenticatedSockets.set('operator-1', {
        user: { userType: 'operator', role: 'operator' }
      });
      
      (wsManager as any).regionSockets.set('ncr-manila', new Set(['driver-1', 'operator-1']));
      (wsManager as any).regionSockets.set('cebu-city', new Set(['driver-2']));
      
      const stats = wsManager.getStats();
      
      expect(stats).toEqual({
        totalConnections: 3,
        regionalConnections: {
          'ncr-manila': 2,
          'cebu-city': 1
        },
        driverConnections: 2,
        operatorConnections: 1
      });
    });

    it('should handle high-frequency location updates efficiently', async () => {
      const driverUser = { ...mockUser, userType: 'driver' as const };
      
      // Simulate rapid location updates
      const locationUpdates = Array.from({ length: 100 }, (_, i) => ({
        latitude: 14.5995 + (i * 0.0001),
        longitude: 120.9842 + (i * 0.0001),
        accuracy: 5,
        timestamp: Date.now() + i
      }));
      
      const startTime = Date.now();
      
      // Process all location updates
      for (const location of locationUpdates) {
        await (wsManager as any).handleDriverLocationUpdate(driverUser.userId, location);
      }
      
      const processingTime = Date.now() - startTime;
      
      // Should process 100 updates in less than 1 second
      expect(processingTime).toBeLessThan(1000);
      expect(mockRedis.updateDriverLocation).toHaveBeenCalledTimes(100);
    });

    it('should clean up disconnected sockets properly', () => {
      // Set up initial state
      (wsManager as any).authenticatedSockets.set('socket-disconnect', {
        id: 'socket-disconnect',
        user: { userId: 'user-disconnect', userType: 'driver' },
        regionId: 'test-region'
      });
      
      (wsManager as any).regionSockets.set('test-region', new Set(['socket-disconnect']));
      (wsManager as any).driverSockets.set('user-disconnect', 'socket-disconnect');
      
      // Simulate disconnection
      (wsManager as any).handleDisconnection('socket-disconnect');
      
      // Verify cleanup
      expect((wsManager as any).authenticatedSockets.has('socket-disconnect')).toBe(false);
      expect((wsManager as any).driverSockets.has('user-disconnect')).toBe(false);
      expect((wsManager as any).regionSockets.get('test-region')).toBeUndefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle Redis connection failures gracefully', async () => {
      mockRedis.publish.mockRejectedValue(new Error('Redis connection failed'));
      
      const driverUser = { ...mockUser, userType: 'driver' as const };
      
      // Should not throw despite Redis failure
      await expect(
        (wsManager as any).handleDriverLocationUpdate(driverUser.userId, {
          latitude: 14.5995,
          longitude: 120.9842
        })
      ).resolves.not.toThrow();
    });

    it('should handle malformed Redis messages gracefully', () => {
      const subscribeCall = (mockRedis.subscribe as jest.Mock).mock.calls[0];
      const messageHandler = subscribeCall[1];
      
      // Should not crash on malformed message
      expect(() => {
        messageHandler('driver:location_updated', null);
        messageHandler('driver:location_updated', { invalid: 'data' });
        messageHandler('unknown:channel', { data: 'test' });
      }).not.toThrow();
    });

    it('should handle WebSocket send failures gracefully', () => {
      const mockSocket = {
        emit: jest.fn().mockImplementation(() => {
          throw new Error('Socket send failed');
        })
      };
      
      mockIO.sockets.sockets.set('failing-socket', mockSocket as any);
      (wsManager as any).regionSockets.set('test-region', new Set(['failing-socket']));
      
      // Should not crash when socket send fails
      expect(() => {
        (wsManager as any).broadcastToRegion('test-region', 'test:event', { data: 'test' });
      }).not.toThrow();
    });
  });

  describe('Permission and Security', () => {
    it('should check channel permissions before subscription', () => {
      const mockSocket = {
        id: 'perm-test',
        data: { user: { ...mockUser, role: 'driver', permissions: ['drivers:read'] } },
        join: jest.fn(),
        emit: jest.fn()
      };
      
      (wsManager as any).authenticatedSockets.set('perm-test', {
        id: 'perm-test',
        user: mockSocket.data.user,
        subscriptions: new Set()
      });
      
      mockIO.sockets.sockets.set('perm-test', mockSocket as any);
      
      // Test permission checking
      const hasPermission = (wsManager as any).hasChannelPermission(
        mockSocket.data.user,
        'drivers:status'
      );
      
      expect(hasPermission).toBe(true);
      
      const noPermission = (wsManager as any).hasChannelPermission(
        mockSocket.data.user,
        'analytics:reports'
      );
      
      expect(noPermission).toBe(false);
    });

    it('should allow admin access to all channels', () => {
      const adminUser = { ...mockUser, role: 'admin' };
      
      const testChannels = [
        'drivers:status',
        'bookings:updates',
        'incidents:alerts',
        'analytics:reports',
        'emergency:critical'
      ];
      
      testChannels.forEach(channel => {
        const hasPermission = (wsManager as any).hasChannelPermission(adminUser, channel);
        expect(hasPermission).toBe(true);
      });
    });
  });
});

// Integration test with actual Socket.IO (optional, for more comprehensive testing)
describe('WebSocket Integration (Real Socket.IO)', () => {
  let httpServer: HTTPServer;
  let serverPort: number;
  let wsManager: WebSocketManager;
  let clientSocket: any;

  beforeAll((done) => {
    jest.unmock('socket.io');
    
    httpServer = createServer();
    httpServer.listen(() => {
      const address = httpServer.address() as AddressInfo;
      serverPort = address.port;
      
      // Mock auth for integration test
      (authManager.verifyToken as jest.Mock).mockResolvedValue(mockUser);
      
      wsManager = new (require('../websocket').WebSocketManager)(httpServer);
      done();
    });
  });

  afterAll((done) => {
    if (clientSocket) {
      clientSocket.close();
    }
    wsManager.close().then(() => {
      httpServer.close(done);
    });
  });

  it('should establish connection with valid token', (done) => {
    clientSocket = io(`http://localhost:${serverPort}`, {
      auth: { token: 'valid-token' }
    });
    
    clientSocket.on('connected', (data: any) => {
      expect(data.userId).toBe('user-123');
      expect(data.role).toBe('operator');
      done();
    });
    
    clientSocket.on('connect_error', (error: any) => {
      done(error);
    });
  });
});