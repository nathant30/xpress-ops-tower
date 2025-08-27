// Unit Tests for SOS Alert Processor
// Testing critical emergency response system with <5 second requirement

import { sosAlertProcessor, SOSAlert, SOSEmergencyType } from '../sosAlertProcessor';
import { redis } from '../redis';
import { db } from '../database';
import { getWebSocketManager } from '../websocket';
import { philippinesEmergencyServices } from '../integrations/emergencyServices';

// Mock dependencies
jest.mock('../redis');
jest.mock('../database');
jest.mock('../websocket');
jest.mock('../integrations/emergencyServices');
jest.mock('../emergencyAlerts');

// Mock timer functions for time-sensitive tests
jest.useFakeTimers();

describe('SOSAlertProcessor', () => {
  let mockRedis: jest.Mocked<typeof redis>;
  let mockDb: jest.Mocked<typeof db>;
  let mockWebSocketManager: jest.MockedObject<any>;
  let mockEmergencyServices: jest.MockedObject<any>;

  beforeEach(() => {
    mockRedis = redis as jest.Mocked<typeof redis>;
    mockDb = db as jest.Mocked<typeof db>;
    mockWebSocketManager = {
      broadcastToAll: jest.fn(),
      broadcastToRegion: jest.fn()
    };
    mockEmergencyServices = {
      dispatchEmergency: jest.fn().mockResolvedValue([
        { service: 'national_emergency', referenceNumber: 'NE-123456' },
        { service: 'medical', referenceNumber: 'MD-789012' }
      ])
    };

    (getWebSocketManager as jest.Mock).mockReturnValue(mockWebSocketManager);
    (philippinesEmergencyServices.getInstance as jest.Mock).mockReturnValue(mockEmergencyServices);

    // Mock database responses
    mockDb.query.mockImplementation((query: string, params?: any[]) => {
      if (query.includes('SELECT d.*, r.name as region_name')) {
        return Promise.resolve({
          rows: [{
            id: 'driver-123',
            first_name: 'Juan',
            last_name: 'Cruz',
            phone: '+639123456789',
            vehicle_info: {
              plateNumber: 'ABC-1234',
              type: 'Sedan',
              color: 'White'
            }
          }]
        });
      }
      if (query.includes('SELECT id, code FROM regions')) {
        return Promise.resolve({
          rows: [{ id: 'ncr-manila', code: 'NCR' }]
        });
      }
      return Promise.resolve({ rows: [] });
    });

    // Mock Redis operations
    mockRedis.setex.mockResolvedValue('OK');
    mockRedis.publish.mockResolvedValue(1);
    mockRedis.get.mockResolvedValue(null);
    mockRedis.updateDriverLocation = jest.fn().mockResolvedValue(undefined);

    // Clear metrics between tests
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  describe('Critical Performance Tests', () => {
    it('should process SOS alert within 5 seconds', async () => {
      const sosData = {
        reporterId: 'reporter-123',
        reporterType: 'driver' as const,
        reporterName: 'Juan Cruz',
        reporterPhone: '+639123456789',
        location: {
          latitude: 14.5995,
          longitude: 120.9842,
          accuracy: 5
        },
        emergencyType: 'medical_emergency' as SOSEmergencyType,
        description: 'Heart attack - need immediate help'
      };

      const startTime = Date.now();
      const result = await sosAlertProcessor.processSOS(sosData);

      // Should return immediately (within 100ms)
      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(100);

      // Verify SOS alert structure
      expect(result).toMatchObject({
        id: expect.stringMatching(/^sos_\d+_/),
        sosCode: expect.stringMatching(/^SOS-\d+-/),
        reporterId: 'reporter-123',
        reporterType: 'driver',
        emergencyType: 'medical_emergency',
        severity: 10, // Medical emergency is highest severity
        status: 'triggered'
      });

      expect(result.triggeredAt).toBeInstanceOf(Date);
      expect(result.location).toEqual(sosData.location);
    });

    it('should achieve <5 second processing target for emergency dispatch', async () => {
      const sosData = {
        reporterId: 'driver-urgent',
        reporterType: 'driver' as const,
        location: {
          latitude: 14.5995,
          longitude: 120.9842
        },
        emergencyType: 'kidnapping' as SOSEmergencyType
      };

      // Process SOS
      const sosAlert = await sosAlertProcessor.processSOS(sosData);

      // Advance timers to simulate processing
      jest.advanceTimersByTime(4000); // 4 seconds

      // Run all pending promises
      await jest.runAllTimersAsync();

      // Verify processing completed within target
      expect(sosAlert.processingTime).toBeLessThan(5000);
    });

    it('should handle concurrent SOS alerts efficiently', async () => {
      const concurrentRequests = Array.from({ length: 10 }, (_, i) => ({
        reporterId: `reporter-${i}`,
        reporterType: 'customer' as const,
        location: {
          latitude: 14.5995 + (i * 0.001),
          longitude: 120.9842 + (i * 0.001)
        },
        emergencyType: 'security_threat' as SOSEmergencyType
      }));

      const startTime = Date.now();
      const results = await Promise.all(
        concurrentRequests.map(data => sosAlertProcessor.processSOS(data))
      );
      const totalTime = Date.now() - startTime;

      // All requests should be processed quickly
      expect(results).toHaveLength(10);
      expect(totalTime).toBeLessThan(500); // 500ms for 10 concurrent requests
      
      // Each should have unique IDs and codes
      const ids = results.map(r => r.id);
      const codes = results.map(r => r.sosCode);
      expect(new Set(ids).size).toBe(10);
      expect(new Set(codes).size).toBe(10);
    });
  });

  describe('Emergency Type Processing', () => {
    it('should correctly classify emergency severity levels', async () => {
      const emergencyTypes: Array<[SOSEmergencyType, number]> = [
        ['medical_emergency', 10],
        ['fire_emergency', 10],
        ['kidnapping', 10],
        ['accident_critical', 9],
        ['security_threat', 8],
        ['natural_disaster', 8],
        ['domestic_violence', 7],
        ['general_emergency', 6]
      ];

      for (const [type, expectedSeverity] of emergencyTypes) {
        const result = await sosAlertProcessor.processSOS({
          reporterId: `test-${type}`,
          reporterType: 'customer',
          location: { latitude: 14.5995, longitude: 120.9842 },
          emergencyType: type
        });

        expect(result.severity).toBe(expectedSeverity);
      }
    });

    it('should determine correct emergency services for each type', async () => {
      const testCases = [
        {
          type: 'medical_emergency' as SOSEmergencyType,
          expectedServices: ['national_emergency', 'medical']
        },
        {
          type: 'fire_emergency' as SOSEmergencyType,
          expectedServices: ['national_emergency', 'fire']
        },
        {
          type: 'kidnapping' as SOSEmergencyType,
          expectedServices: ['national_emergency', 'police']
        },
        {
          type: 'accident_critical' as SOSEmergencyType,
          expectedServices: ['national_emergency', 'police', 'medical']
        }
      ];

      for (const testCase of testCases) {
        await sosAlertProcessor.processSOS({
          reporterId: `test-${testCase.type}`,
          reporterType: 'driver',
          location: { latitude: 14.5995, longitude: 120.9842 },
          emergencyType: testCase.type
        });

        // Advance timers to trigger processing
        jest.advanceTimersByTime(100);
        await jest.runAllTimersAsync();

        // Verify emergency services were called with correct services
        expect(mockEmergencyServices.dispatchEmergency).toHaveBeenCalledWith(
          expect.objectContaining({
            requestedServices: testCase.expectedServices
          })
        );
      }
    });
  });

  describe('Panic Button Integration', () => {
    it('should process panic button triggers from driver app', async () => {
      const panicData = {
        driverId: 'driver-123',
        location: {
          latitude: 14.5995,
          longitude: 120.9842,
          accuracy: 10
        },
        emergencyType: 'security_threat' as SOSEmergencyType,
        description: 'Being followed by suspicious vehicle'
      };

      const result = await sosAlertProcessor.triggerPanicButton(panicData);

      expect(result).toMatchObject({
        reporterId: 'driver-123',
        reporterType: 'driver',
        reporterName: 'Juan Cruz',
        reporterPhone: '+639123456789',
        driverId: 'driver-123',
        emergencyType: 'security_threat',
        vehicleInfo: {
          plateNumber: 'ABC-1234',
          type: 'Sedan',
          color: 'White'
        }
      });
    });

    it('should handle invalid driver ID gracefully', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [] });

      await expect(
        sosAlertProcessor.triggerPanicButton({
          driverId: 'invalid-driver',
          location: { latitude: 14.5995, longitude: 120.9842 }
        })
      ).rejects.toThrow('Driver invalid-driver not found or inactive');
    });
  });

  describe('Real-time Broadcasting', () => {
    it('should immediately broadcast critical SOS alerts', async () => {
      const sosData = {
        reporterId: 'reporter-critical',
        reporterType: 'passenger' as const,
        location: {
          latitude: 14.5995,
          longitude: 120.9842
        },
        emergencyType: 'medical_emergency' as SOSEmergencyType,
        description: 'Passenger collapsed'
      };

      await sosAlertProcessor.processSOS(sosData);

      // Advance timer to trigger broadcasting
      jest.advanceTimersByTime(100);
      await jest.runAllTimersAsync();

      // Verify critical alert was broadcast
      expect(mockWebSocketManager.broadcastToAll).toHaveBeenCalledWith(
        'critical_sos',
        expect.objectContaining({
          type: 'CRITICAL_SOS',
          emergencyType: 'medical_emergency',
          severity: 10,
          requiresImmediateResponse: true,
          playEmergencySound: true,
          flashScreen: true
        })
      );

      // Verify Redis publish for distributed systems
      expect(mockRedis.publish).toHaveBeenCalledWith(
        'emergency:critical_sos',
        expect.any(Object)
      );
    });

    it('should update driver status to emergency', async () => {
      await sosAlertProcessor.triggerPanicButton({
        driverId: 'driver-123',
        location: { latitude: 14.5995, longitude: 120.9842 }
      });

      // Advance timer to process status update
      jest.advanceTimersByTime(100);
      await jest.runAllTimersAsync();

      // Verify driver status update query
      expect(mockDb.query).toHaveBeenCalledWith(
        'UPDATE drivers SET status = $1, updated_at = NOW() WHERE id = $2',
        ['emergency', 'driver-123']
      );

      // Verify WebSocket broadcast of status change
      expect(mockWebSocketManager.broadcastToAll).toHaveBeenCalledWith(
        'driver_status_change',
        expect.objectContaining({
          driverId: 'driver-123',
          status: 'emergency',
          reason: 'SOS_TRIGGERED'
        })
      );
    });
  });

  describe('SOS Alert Lifecycle', () => {
    let sosAlert: SOSAlert;

    beforeEach(async () => {
      sosAlert = await sosAlertProcessor.processSOS({
        reporterId: 'lifecycle-test',
        reporterType: 'customer',
        location: { latitude: 14.5995, longitude: 120.9842 },
        emergencyType: 'general_emergency'
      });

      // Mock cache retrieval
      mockRedis.get.mockResolvedValue(JSON.stringify(sosAlert));
    });

    it('should acknowledge SOS alert and track response time', async () => {
      // Simulate 2-second response time
      jest.advanceTimersByTime(2000);

      await sosAlertProcessor.acknowledgeSOS(
        sosAlert.id,
        'operator-456',
        'Emergency services contacted'
      );

      expect(sosAlert.status).toBe('acknowledged');
      expect(sosAlert.responseTime).toBe(2000);

      // Verify database update
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE sos_alerts'),
        expect.arrayContaining(['acknowledged', 2000, sosAlert.id])
      );
    });

    it('should resolve SOS alert and reset driver status', async () => {
      // Set up driver ID for resolution test
      sosAlert.driverId = 'driver-123';

      await sosAlertProcessor.resolveSOS(
        sosAlert.id,
        'operator-789',
        'False alarm - customer accidentally triggered'
      );

      expect(sosAlert.status).toBe('resolved');

      // Verify driver status reset
      expect(mockDb.query).toHaveBeenCalledWith(
        'UPDATE drivers SET status = $1, updated_at = NOW() WHERE id = $2',
        ['active', 'driver-123']
      );
    });
  });

  describe('Metrics and Performance Monitoring', () => {
    it('should track processing metrics accurately', async () => {
      // Process multiple SOS alerts
      const alerts = await Promise.all([
        sosAlertProcessor.processSOS({
          reporterId: 'metric-1',
          reporterType: 'driver',
          location: { latitude: 14.5995, longitude: 120.9842 }
        }),
        sosAlertProcessor.processSOS({
          reporterId: 'metric-2',
          reporterType: 'customer',
          location: { latitude: 14.6000, longitude: 120.9850 }
        })
      ]);

      // Simulate processing completion
      jest.advanceTimersByTime(3000);
      await jest.runAllTimersAsync();

      const metrics = sosAlertProcessor.getMetrics();

      expect(metrics.totalSOSAlerts).toBeGreaterThanOrEqual(2);
      expect(metrics.successfulDispatches).toBeGreaterThanOrEqual(2);
      expect(metrics.under5SecondProcessing).toBeGreaterThanOrEqual(2);
      expect(metrics.averageProcessingTime).toBeLessThan(5000);
    });

    it('should provide active SOS alerts', async () => {
      // Mock Redis keys response
      mockRedis.keys.mockResolvedValue(['sos:active:123', 'sos:active:456']);
      mockRedis.get.mockImplementation((key: string) => {
        if (key === 'sos:active:123') {
          return Promise.resolve(JSON.stringify({
            id: '123',
            sosCode: 'SOS-123',
            status: 'triggered',
            triggeredAt: new Date().toISOString()
          }));
        }
        if (key === 'sos:active:456') {
          return Promise.resolve(JSON.stringify({
            id: '456',
            sosCode: 'SOS-456',
            status: 'dispatched',
            triggeredAt: new Date().toISOString()
          }));
        }
        return Promise.resolve(null);
      });

      const activeAlerts = await sosAlertProcessor.getActiveSOSAlerts();

      expect(activeAlerts).toHaveLength(2);
      expect(activeAlerts[0]).toMatchObject({ id: '123', sosCode: 'SOS-123' });
      expect(activeAlerts[1]).toMatchObject({ id: '456', sosCode: 'SOS-456' });
    });
  });

  describe('Error Handling and Resilience', () => {
    it('should handle emergency service dispatch failures gracefully', async () => {
      mockEmergencyServices.dispatchEmergency.mockRejectedValue(
        new Error('Emergency service unavailable')
      );

      const sosData = {
        reporterId: 'error-test',
        reporterType: 'driver' as const,
        location: { latitude: 14.5995, longitude: 120.9842 },
        emergencyType: 'medical_emergency' as SOSEmergencyType
      };

      const result = await sosAlertProcessor.processSOS(sosData);

      // Processing should still continue despite dispatch failure
      expect(result.status).toBe('triggered');

      // Advance timer to trigger processing
      jest.advanceTimersByTime(5000);
      await jest.runAllTimersAsync();

      // Should still broadcast critical alert even if dispatch fails
      expect(mockWebSocketManager.broadcastToAll).toHaveBeenCalled();

      // Should publish failure notification
      expect(mockRedis.publish).toHaveBeenCalledWith(
        'sos:processing_failed',
        expect.objectContaining({
          sosId: result.id,
          error: 'Emergency service unavailable',
          requiresManualIntervention: true
        })
      );
    });

    it('should validate SOS data before processing', async () => {
      const invalidData = {
        reporterId: '',
        reporterType: 'invalid_type' as any,
        location: {
          latitude: 200, // Invalid latitude
          longitude: 500  // Invalid longitude
        }
      };

      await expect(
        sosAlertProcessor.processSOS(invalidData)
      ).rejects.toThrow('Invalid SOS data');
    });

    it('should handle Redis failures gracefully', async () => {
      mockRedis.setex.mockRejectedValue(new Error('Redis connection failed'));
      mockRedis.publish.mockRejectedValue(new Error('Redis publish failed'));

      const sosData = {
        reporterId: 'redis-fail-test',
        reporterType: 'customer' as const,
        location: { latitude: 14.5995, longitude: 120.9842 }
      };

      // Should not throw despite Redis failures
      const result = await sosAlertProcessor.processSOS(sosData);
      expect(result).toBeDefined();
      expect(result.status).toBe('triggered');
    });
  });

  describe('Location and Regional Processing', () => {
    it('should determine correct region from coordinates', async () => {
      const sosData = {
        reporterId: 'region-test',
        reporterType: 'driver' as const,
        location: {
          latitude: 14.5995, // Manila coordinates
          longitude: 120.9842
        }
      };

      await sosAlertProcessor.processSOS(sosData);

      // Advance timer to trigger processing
      jest.advanceTimersByTime(100);
      await jest.runAllTimersAsync();

      // Verify region query was made
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('ST_Contains(boundary, ST_Point'),
        [120.9842, 14.5995]
      );
    });

    it('should fallback to nearest region if point not in any boundary', async () => {
      // Mock region queries to simulate point outside boundaries
      mockDb.query.mockImplementation((query: string) => {
        if (query.includes('ST_Contains')) {
          return Promise.resolve({ rows: [] });
        }
        if (query.includes('ST_Distance')) {
          return Promise.resolve({
            rows: [{ id: 'nearest-region', code: 'NR' }]
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const sosData = {
        reporterId: 'fallback-test',
        reporterType: 'customer' as const,
        location: {
          latitude: 0.0, // Coordinates not in any region
          longitude: 0.0
        }
      };

      await sosAlertProcessor.processSOS(sosData);

      // Advance timer to trigger processing
      jest.advanceTimersByTime(100);
      await jest.runAllTimersAsync();

      // Should have tried both queries
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('ST_Contains'),
        expect.any(Array)
      );
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('ST_Distance'),
        expect.any(Array)
      );
    });
  });
});