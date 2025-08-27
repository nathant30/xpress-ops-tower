// Redis Mock for Testing
export const redis = {
  // Basic operations
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn().mockResolvedValue('OK'),
  setex: jest.fn().mockResolvedValue('OK'),
  del: jest.fn().mockResolvedValue(1),
  exists: jest.fn().mockResolvedValue(0),
  expire: jest.fn().mockResolvedValue(1),
  
  // Pub/Sub operations
  publish: jest.fn().mockResolvedValue(1),
  subscribe: jest.fn().mockImplementation((channels, callback) => {
    // Store callback for manual triggering in tests
    redis._subscribeCallback = callback;
    return Promise.resolve();
  }),
  
  // List operations
  lpush: jest.fn().mockResolvedValue(1),
  rpush: jest.fn().mockResolvedValue(1),
  lpop: jest.fn().mockResolvedValue(null),
  rpop: jest.fn().mockResolvedValue(null),
  llen: jest.fn().mockResolvedValue(0),
  
  // Set operations
  sadd: jest.fn().mockResolvedValue(1),
  srem: jest.fn().mockResolvedValue(1),
  smembers: jest.fn().mockResolvedValue([]),
  sismember: jest.fn().mockResolvedValue(0),
  
  // Hash operations
  hget: jest.fn().mockResolvedValue(null),
  hset: jest.fn().mockResolvedValue(1),
  hgetall: jest.fn().mockResolvedValue({}),
  hdel: jest.fn().mockResolvedValue(1),
  
  // Key scanning
  keys: jest.fn().mockResolvedValue([]),
  scan: jest.fn().mockResolvedValue(['0', []]),
  
  // Custom methods for Xpress Ops Tower
  updateDriverLocation: jest.fn().mockResolvedValue(undefined),
  getDriverLocation: jest.fn().mockResolvedValue(null),
  getNearbyDrivers: jest.fn().mockResolvedValue([]),
  cacheMetrics: jest.fn().mockResolvedValue('OK'),
  getMetrics: jest.fn().mockResolvedValue(null),
  
  // Transaction support
  multi: jest.fn().mockReturnValue({
    get: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    setex: jest.fn().mockReturnThis(),
    del: jest.fn().mockReturnThis(),
    exec: jest.fn().mockResolvedValue(['OK', 'OK'])
  }),
  
  // Connection management
  disconnect: jest.fn().mockResolvedValue(undefined),
  ping: jest.fn().mockResolvedValue('PONG'),
  
  // Test utilities
  _subscribeCallback: null as any,
  _clearMocks: () => {
    Object.keys(redis).forEach(key => {
      if (typeof redis[key as keyof typeof redis] === 'function' && key !== '_clearMocks') {
        (redis[key as keyof typeof redis] as jest.Mock).mockClear();
      }
    });
    redis._subscribeCallback = null;
  }
};