// GPS Spoofing Detection Engine
// Advanced detection of location manipulation and fake GPS data

import { GPSSpoofingDetection, GPSJump, FraudAlert, FraudEvidence, DetectedPattern, RiskFactor } from '@/types/fraudDetection';
import { logger } from '../security/productionLogger';

export class GPSSpoofingDetector {
  private static instance: GPSSpoofingDetector;
  
  // Philippines-specific constants
  private readonly PHILIPPINES_BOUNDS = {
    north: 21.0,
    south: 4.0,
    east: 127.0,
    west: 116.0
  };

  // Service areas in major Philippine cities
  private readonly SERVICE_AREAS = [
    { name: 'Metro Manila', bounds: { north: 14.8, south: 14.3, east: 121.2, west: 120.9 } },
    { name: 'Cebu City', bounds: { north: 10.4, south: 10.2, east: 124.0, west: 123.8 } },
    { name: 'Davao City', bounds: { north: 7.3, south: 7.0, east: 125.7, west: 125.4 } }
  ];

  // Detection thresholds
  private readonly MAX_SPEED_KMH = 200; // Maximum realistic speed in Philippines traffic
  private readonly MAX_TELEPORT_DISTANCE = 10000; // 10km instant jump threshold
  private readonly MIN_TIME_BETWEEN_UPDATES = 2; // Minimum seconds between legitimate GPS updates

  private constructor() {}

  public static getInstance(): GPSSpoofingDetector {
    if (!GPSSpoofingDetector.instance) {
      GPSSpoofingDetector.instance = new GPSSpoofingDetector();
    }
    return GPSSpoofingDetector.instance;
  }

  /**
   * Analyze GPS data for spoofing indicators
   */
  async analyzeGPSData(
    rideId: string, 
    gpsPoints: GPSPoint[], 
    deviceInfo?: any,
    driverId?: string,
    riderId?: string
  ): Promise<FraudAlert | null> {
    try {
      const spoofingAnalysis = await this.performSpoofingAnalysis(
        rideId, gpsPoints, deviceInfo, driverId, riderId
      );
      
      if (spoofingAnalysis.confidenceScore >= 70) {
        return this.generateSpoofingAlert(spoofingAnalysis);
      }
      
      return null;
    } catch (error) {
      logger.error('GPS spoofing analysis failed', { error });
      return null;
    }
  }

  private async performSpoofingAnalysis(
    rideId: string,
    gpsPoints: GPSPoint[],
    deviceInfo: any = {},
    driverId?: string,
    riderId?: string
  ): Promise<GPSSpoofingDetection> {
    const analysis: GPSSpoofingDetection = {
      rideId,
      driverId,
      riderId,
      
      // Location anomalies
      impossibleSpeed: false,
      teleportation: false,
      locationJumps: [],
      
      // Device indicators
      mockLocationApp: false,
      rootedDevice: false,
      developerOptions: false,
      
      // Route analysis
      routeDeviation: 0,
      straightLineMovement: false,
      unrealisticTraffic: false,
      
      // Philippines-specific checks
      outsideServiceArea: false,
      restrictedZones: [],
      
      // Sensor data inconsistencies
      accelerometerMismatch: false,
      gyroscopeMismatch: false,
      magnetometerAnomaly: false,
      
      confidenceScore: 0
    };

    // Analyze location anomalies
    await this.analyzeLocationAnomalies(analysis, gpsPoints);
    
    // Analyze device indicators
    await this.analyzeDeviceIndicators(analysis, deviceInfo);
    
    // Analyze route patterns
    await this.analyzeRoutePatterns(analysis, gpsPoints);
    
    // Philippines-specific analysis
    await this.analyzePhilippinesContext(analysis, gpsPoints);
    
    // Analyze sensor data if available
    if (deviceInfo.sensorData) {
      await this.analyzeSensorData(analysis, gpsPoints, deviceInfo.sensorData);
    }
    
    // Calculate confidence score
    analysis.confidenceScore = this.calculateConfidenceScore(analysis);
    
    return analysis;
  }

  private async analyzeLocationAnomalies(analysis: GPSSpoofingDetection, gpsPoints: GPSPoint[]): Promise<void> {
    if (gpsPoints.length < 2) return;

    const locationJumps: GPSJump[] = [];
    let impossibleSpeedCount = 0;
    let teleportationCount = 0;

    for (let i = 1; i < gpsPoints.length; i++) {
      const prevPoint = gpsPoints[i - 1];
      const currentPoint = gpsPoints[i];
      
      const distance = this.calculateDistance(
        prevPoint.latitude, prevPoint.longitude,
        currentPoint.latitude, currentPoint.longitude
      );
      
      const timeElapsed = (currentPoint.timestamp - prevPoint.timestamp) / 1000; // seconds
      
      if (timeElapsed > 0 && distance > 0) {
        const speedKmh = (distance / 1000) / (timeElapsed / 3600); // km/h
        
        // Check for impossible speeds
        if (speedKmh > this.MAX_SPEED_KMH) {
          impossibleSpeedCount++;
          
          locationJumps.push({
            fromLocation: { lat: prevPoint.latitude, lng: prevPoint.longitude },
            toLocation: { lat: currentPoint.latitude, lng: currentPoint.longitude },
            distance,
            timeElapsed,
            impossibleSpeed: speedKmh,
            timestamp: new Date(currentPoint.timestamp)
          });
        }
        
        // Check for teleportation (instant large distance jumps)
        if (timeElapsed < this.MIN_TIME_BETWEEN_UPDATES && distance > this.MAX_TELEPORT_DISTANCE) {
          teleportationCount++;
        }
      }
    }

    analysis.impossibleSpeed = impossibleSpeedCount > Math.max(1, gpsPoints.length * 0.05); // 5% threshold
    analysis.teleportation = teleportationCount > 0;
    analysis.locationJumps = locationJumps;
  }

  private async analyzeDeviceIndicators(analysis: GPSSpoofingDetection, deviceInfo: any): Promise<void> {
    // Check for mock location apps
    if (deviceInfo.installedApps) {
      const mockLocationApps = [
        'fake gps', 'mock locations', 'gps joystick', 'fake location',
        'location spoofer', 'gps emulator', 'mock gps'
      ];
      
      const installedMockApps = deviceInfo.installedApps.filter((app: string) =>
        mockLocationApps.some(mockApp => app.toLowerCase().includes(mockApp))
      );
      
      analysis.mockLocationApp = installedMockApps.length > 0;
    }

    // Check for rooted/jailbroken devices
    analysis.rootedDevice = deviceInfo.isRooted || deviceInfo.isJailbroken || false;

    // Check for developer options enabled
    analysis.developerOptions = deviceInfo.developerOptionsEnabled || false;

    // Check for suspicious device characteristics
    if (deviceInfo.buildProps) {
      // Check for emulator indicators
      const emulatorIndicators = ['goldfish', 'ranchu', 'sdk', 'emulator', 'vbox', 'genymotion'];
      const hasEmulatorProps = emulatorIndicators.some(indicator =>
        JSON.stringify(deviceInfo.buildProps).toLowerCase().includes(indicator)
      );
      
      if (hasEmulatorProps) {
        analysis.mockLocationApp = true; // Emulator likely means testing/spoofing
      }
    }
  }

  private async analyzeRoutePatterns(analysis: GPSSpoofingDetection, gpsPoints: GPSPoint[]): Promise<void> {
    if (gpsPoints.length < 3) return;

    let straightLineCount = 0;
    let totalDeviation = 0;
    let unrealisticMovements = 0;

    // Analyze movement patterns
    for (let i = 2; i < gpsPoints.length; i++) {
      const p1 = gpsPoints[i - 2];
      const p2 = gpsPoints[i - 1];
      const p3 = gpsPoints[i];

      // Check for perfectly straight line movements (suspicious)
      const bearing1 = this.calculateBearing(p1.latitude, p1.longitude, p2.latitude, p2.longitude);
      const bearing2 = this.calculateBearing(p2.latitude, p2.longitude, p3.latitude, p3.longitude);
      
      const bearingDiff = Math.abs(bearing1 - bearing2);
      if (bearingDiff < 2 || bearingDiff > 358) { // Very straight line
        straightLineCount++;
      }

      // Calculate deviation from expected route
      // This would integrate with mapping services in production
      const expectedDeviation = this.calculateRouteDeviation(p1, p2, p3);
      totalDeviation += expectedDeviation;

      // Check for unrealistic traffic behavior
      const speed1 = this.calculateSpeed(p1, p2);
      const speed2 = this.calculateSpeed(p2, p3);
      
      // Unrealistic if speed changes too dramatically without stops
      if (Math.abs(speed1 - speed2) > 50 && speed1 > 0 && speed2 > 0) {
        unrealisticMovements++;
      }
    }

    analysis.straightLineMovement = straightLineCount > gpsPoints.length * 0.7; // 70% straight lines
    analysis.routeDeviation = totalDeviation / (gpsPoints.length - 2);
    analysis.unrealisticTraffic = unrealisticMovements > gpsPoints.length * 0.3;
  }

  private async analyzePhilippinesContext(analysis: GPSSpoofingDetection, gpsPoints: GPSPoint[]): Promise<void> {
    let outsideServiceCount = 0;
    const restrictedZones: string[] = [];

    gpsPoints.forEach(point => {
      // Check if outside Philippines bounds
      if (!this.isWithinPhilippines(point.latitude, point.longitude)) {
        outsideServiceCount++;
        return;
      }

      // Check if within service areas
      const inServiceArea = this.SERVICE_AREAS.some(area =>
        this.isWithinBounds(point.latitude, point.longitude, area.bounds)
      );

      if (!inServiceArea) {
        outsideServiceCount++;
      }

      // Check for restricted zones (airports, military bases, etc.)
      const restrictedZone = this.checkRestrictedZones(point.latitude, point.longitude);
      if (restrictedZone) {
        restrictedZones.push(restrictedZone);
      }
    });

    analysis.outsideServiceArea = outsideServiceCount > gpsPoints.length * 0.1; // 10% outside service
    analysis.restrictedZones = [...new Set(restrictedZones)]; // Remove duplicates
  }

  private async analyzeSensorData(
    analysis: GPSSpoofingDetection, 
    gpsPoints: GPSPoint[], 
    sensorData: any[]
  ): Promise<void> {
    if (!sensorData || sensorData.length === 0) return;

    // Match GPS points with sensor data
    let accelerometerMismatches = 0;
    let gyroscopeMismatches = 0;
    let magnetometerAnomalies = 0;

    for (let i = 1; i < gpsPoints.length && i < sensorData.length; i++) {
      const prevGPS = gpsPoints[i - 1];
      const currentGPS = gpsPoints[i];
      const sensor = sensorData[i];

      if (!sensor) continue;

      // Calculate expected acceleration from GPS
      const gpsAcceleration = this.calculateGPSAcceleration(prevGPS, currentGPS);
      
      // Compare with actual accelerometer data
      if (sensor.accelerometer) {
        const sensorAcceleration = Math.sqrt(
          Math.pow(sensor.accelerometer.x, 2) +
          Math.pow(sensor.accelerometer.y, 2) +
          Math.pow(sensor.accelerometer.z, 2)
        );
        
        const accelerationDiff = Math.abs(gpsAcceleration - sensorAcceleration);
        if (accelerationDiff > 5) { // m/s² threshold
          accelerometerMismatches++;
        }
      }

      // Check gyroscope data consistency
      if (sensor.gyroscope) {
        const gpsRotation = this.calculateGPSRotation(prevGPS, currentGPS);
        const sensorRotation = Math.sqrt(
          Math.pow(sensor.gyroscope.x, 2) +
          Math.pow(sensor.gyroscope.y, 2) +
          Math.pow(sensor.gyroscope.z, 2)
        );
        
        if (Math.abs(gpsRotation - sensorRotation) > 2) { // rad/s threshold
          gyroscopeMismatches++;
        }
      }

      // Check magnetometer for compass anomalies
      if (sensor.magnetometer) {
        const magneticStrength = Math.sqrt(
          Math.pow(sensor.magnetometer.x, 2) +
          Math.pow(sensor.magnetometer.y, 2) +
          Math.pow(sensor.magnetometer.z, 2)
        );
        
        // Earth's magnetic field strength in Philippines (~43,000 nT)
        if (magneticStrength < 35000 || magneticStrength > 55000) {
          magnetometerAnomalies++;
        }
      }
    }

    analysis.accelerometerMismatch = accelerometerMismatches > gpsPoints.length * 0.2;
    analysis.gyroscopeMismatch = gyroscopeMismatches > gpsPoints.length * 0.2;
    analysis.magnetometerAnomaly = magnetometerAnomalies > gpsPoints.length * 0.3;
  }

  private calculateConfidenceScore(analysis: GPSSpoofingDetection): number {
    let score = 0;

    // Location anomaly scoring
    if (analysis.impossibleSpeed) score += 25;
    if (analysis.teleportation) score += 30;
    score += Math.min(20, analysis.locationJumps.length * 5);

    // Device indicator scoring
    if (analysis.mockLocationApp) score += 35;
    if (analysis.rootedDevice) score += 15;
    if (analysis.developerOptions) score += 10;

    // Route pattern scoring
    if (analysis.straightLineMovement) score += 20;
    if (analysis.routeDeviation > 100) score += 15;
    if (analysis.unrealisticTraffic) score += 12;

    // Philippines context scoring
    if (analysis.outsideServiceArea) score += 25;
    score += Math.min(15, analysis.restrictedZones.length * 5);

    // Sensor mismatch scoring
    if (analysis.accelerometerMismatch) score += 10;
    if (analysis.gyroscopeMismatch) score += 8;
    if (analysis.magnetometerAnomaly) score += 7;

    return Math.min(100, Math.max(0, score));
  }

  private async generateSpoofingAlert(analysis: GPSSpoofingDetection): Promise<FraudAlert> {
    const evidence: FraudEvidence[] = this.generateSpoofingEvidence(analysis);
    const patterns: DetectedPattern[] = this.generateSpoofingPatterns(analysis);
    const riskFactors: RiskFactor[] = this.generateSpoofingRiskFactors(analysis);

    const severity = analysis.confidenceScore >= 90 ? 'critical' :
                    analysis.confidenceScore >= 75 ? 'high' :
                    analysis.confidenceScore >= 60 ? 'medium' : 'low';

    return {
      id: `GPS_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      alertType: 'gps_spoofing',
      severity,
      status: 'active',
      
      subjectType: 'ride',
      subjectId: analysis.rideId,
      
      title: 'GPS Spoofing Detected',
      description: `Suspicious GPS manipulation detected in ride ${analysis.rideId}`,
      fraudScore: analysis.confidenceScore,
      confidence: analysis.confidenceScore,
      
      evidence,
      patterns,
      riskFactors,
      
      currency: 'PHP'
    };
  }

  private generateSpoofingEvidence(analysis: GPSSpoofingDetection): FraudEvidence[] {
    const evidence: FraudEvidence[] = [];

    if (analysis.impossibleSpeed) {
      evidence.push({
        type: 'location',
        description: 'Impossible travel speeds detected',
        data: { 
          maxSpeed: Math.max(...analysis.locationJumps.map(j => j.impossibleSpeed)),
          jumpCount: analysis.locationJumps.length
        },
        weight: 25,
        timestamp: new Date()
      });
    }

    if (analysis.mockLocationApp) {
      evidence.push({
        type: 'device',
        description: 'Mock location applications detected on device',
        data: { deviceCompromised: true },
        weight: 35,
        timestamp: new Date()
      });
    }

    return evidence;
  }

  private generateSpoofingPatterns(analysis: GPSSpoofingDetection): DetectedPattern[] {
    const patterns: DetectedPattern[] = [];

    if (analysis.straightLineMovement) {
      patterns.push({
        patternType: 'unnatural_movement',
        description: 'Unnaturally straight movement patterns inconsistent with road networks',
        frequency: 1,
        timespan: 'per_ride',
        examples: ['Perfect straight lines between points'],
        riskLevel: 'high'
      });
    }

    return patterns;
  }

  private generateSpoofingRiskFactors(analysis: GPSSpoofingDetection): RiskFactor[] {
    const riskFactors: RiskFactor[] = [];

    riskFactors.push({
      factor: 'GPS Spoofing Confidence',
      value: analysis.confidenceScore,
      riskContribution: analysis.confidenceScore,
      explanation: 'Overall confidence in GPS manipulation detection'
    });

    return riskFactors;
  }

  // Helper methods
  private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371000; // Earth's radius in meters
    const dLat = this.toRad(lat2 - lat1);
    const dLng = this.toRad(lng2 - lng1);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private calculateBearing(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const dLng = this.toRad(lng2 - lng1);
    const y = Math.sin(dLng) * Math.cos(this.toRad(lat2));
    const x = Math.cos(this.toRad(lat1)) * Math.sin(this.toRad(lat2)) -
              Math.sin(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) * Math.cos(dLng);
    
    return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
  }

  private calculateSpeed(p1: GPSPoint, p2: GPSPoint): number {
    const distance = this.calculateDistance(p1.latitude, p1.longitude, p2.latitude, p2.longitude);
    const timeElapsed = (p2.timestamp - p1.timestamp) / 1000;
    return timeElapsed > 0 ? (distance / timeElapsed) * 3.6 : 0; // km/h
  }

  private calculateRouteDeviation(p1: GPSPoint, p2: GPSPoint, p3: GPSPoint): number {
    // Simplified deviation calculation
    // In production, use actual routing services
    const directDistance = this.calculateDistance(p1.latitude, p1.longitude, p3.latitude, p3.longitude);
    const actualDistance = 
      this.calculateDistance(p1.latitude, p1.longitude, p2.latitude, p2.longitude) +
      this.calculateDistance(p2.latitude, p2.longitude, p3.latitude, p3.longitude);
    
    return Math.abs(actualDistance - directDistance);
  }

  private calculateGPSAcceleration(prev: GPSPoint, current: GPSPoint): number {
    const speed1 = prev.speed || 0;
    const speed2 = current.speed || 0;
    const timeElapsed = (current.timestamp - prev.timestamp) / 1000;
    
    return timeElapsed > 0 ? Math.abs(speed2 - speed1) / timeElapsed : 0;
  }

  private calculateGPSRotation(prev: GPSPoint, current: GPSPoint): number {
    const bearing1 = prev.bearing || 0;
    const bearing2 = current.bearing || 0;
    const timeElapsed = (current.timestamp - prev.timestamp) / 1000;
    
    let bearingDiff = Math.abs(bearing2 - bearing1);
    if (bearingDiff > 180) bearingDiff = 360 - bearingDiff;
    
    return timeElapsed > 0 ? this.toRad(bearingDiff) / timeElapsed : 0;
  }

  private isWithinPhilippines(lat: number, lng: number): boolean {
    return lat >= this.PHILIPPINES_BOUNDS.south && lat <= this.PHILIPPINES_BOUNDS.north &&
           lng >= this.PHILIPPINES_BOUNDS.west && lng <= this.PHILIPPINES_BOUNDS.east;
  }

  private isWithinBounds(lat: number, lng: number, bounds: any): boolean {
    return lat >= bounds.south && lat <= bounds.north &&
           lng >= bounds.west && lng <= bounds.east;
  }

  private checkRestrictedZones(lat: number, lng: number): string | null {
    // Philippines restricted zones
    const restrictedZones = [
      { name: 'NAIA Airport', lat: 14.5086, lng: 121.0194, radius: 5000 },
      { name: 'Malacañang Palace', lat: 14.5958, lng: 120.9936, radius: 1000 },
      { name: 'Camp Aguinaldo', lat: 14.6417, lng: 121.0056, radius: 2000 }
    ];

    for (const zone of restrictedZones) {
      const distance = this.calculateDistance(lat, lng, zone.lat, zone.lng);
      if (distance <= zone.radius) {
        return zone.name;
      }
    }

    return null;
  }

  private toRad(degrees: number): number {
    return degrees * (Math.PI / 180);
  }
}

// GPS Point interface
export interface GPSPoint {
  latitude: number;
  longitude: number;
  timestamp: number;
  accuracy?: number;
  altitude?: number;
  speed?: number;
  bearing?: number;
}

// Export singleton instance
export const gpsSpoofingDetector = GPSSpoofingDetector.getInstance();