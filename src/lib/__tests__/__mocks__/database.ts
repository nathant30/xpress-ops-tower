// Database Mock for Testing
export const db = {
  query: jest.fn().mockImplementation((query: string, params?: any[]) => {
    // Default mock responses based on query patterns
    if (query.includes('SELECT d.*, r.name as region_name')) {
      return Promise.resolve({
        rows: [{
          id: 'driver-123',
          first_name: 'Juan',
          last_name: 'Cruz',
          phone: '+639123456789',
          email: 'juan.cruz@example.com',
          is_active: true,
          status: 'active',
          vehicle_info: {
            plateNumber: 'ABC-1234',
            type: 'Sedan',
            color: 'White'
          },
          region_name: 'Metro Manila',
          region_code: 'NCR'
        }]
      });
    }
    
    if (query.includes('SELECT id, code FROM regions')) {
      return Promise.resolve({
        rows: [{ id: 'ncr-manila', code: 'NCR' }]
      });
    }
    
    if (query.includes('SELECT * FROM bookings')) {
      return Promise.resolve({
        rows: [{
          id: 'booking-123',
          booking_reference: 'XP-BK-123456',
          customer_id: 'customer-123',
          driver_id: 'driver-123',
          status: 'active',
          pickup_location: { lat: 14.5995, lng: 120.9842 },
          pickup_address: 'Makati CBD, Metro Manila',
          created_at: new Date()
        }]
      });
    }
    
    if (query.includes('INSERT INTO sos_alerts')) {
      return Promise.resolve({
        rows: [],
        rowCount: 1
      });
    }
    
    if (query.includes('UPDATE drivers SET status')) {
      return Promise.resolve({
        rows: [],
        rowCount: 1
      });
    }
    
    if (query.includes('UPDATE sos_alerts')) {
      return Promise.resolve({
        rows: [],
        rowCount: 1
      });
    }
    
    if (query.includes('ST_Contains') || query.includes('ST_Distance')) {
      return Promise.resolve({
        rows: [{ id: 'ncr-manila', code: 'NCR', distance: 1000 }]
      });
    }
    
    // Default empty response
    return Promise.resolve({ rows: [] });
  }),
  
  // Connection management
  connect: jest.fn().mockResolvedValue(undefined),
  end: jest.fn().mockResolvedValue(undefined),
  
  // Transaction support
  begin: jest.fn().mockResolvedValue(undefined),
  commit: jest.fn().mockResolvedValue(undefined),
  rollback: jest.fn().mockResolvedValue(undefined),
  
  // Pool management
  pool: {
    connect: jest.fn().mockResolvedValue({
      query: jest.fn().mockImplementation((query: string) => db.query(query)),
      release: jest.fn()
    }),
    end: jest.fn().mockResolvedValue(undefined),
    totalCount: 10,
    idleCount: 5,
    waitingCount: 0
  },
  
  // Test utilities
  _clearMocks: () => {
    (db.query as jest.Mock).mockClear();
    (db.connect as jest.Mock).mockClear();
    (db.end as jest.Mock).mockClear();
    (db.begin as jest.Mock).mockClear();
    (db.commit as jest.Mock).mockClear();
    (db.rollback as jest.Mock).mockClear();
  },
  
  _mockQueryResponse: (query: string, response: any) => {
    (db.query as jest.Mock).mockImplementationOnce((q: string) => {
      if (q.includes(query)) {
        return Promise.resolve(response);
      }
      return Promise.resolve({ rows: [] });
    });
  }
};