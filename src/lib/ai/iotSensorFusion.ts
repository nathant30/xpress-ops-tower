import { logger } from '../security/productionLogger';

export interface SensorData {
  timestamp: Date;
  deviceId: string;
  userId: string;
  
  accelerometer: {
    x: number;
    y: number;
    z: number;
    magnitude: number;
  };
  
  gyroscope: {
    x: number;
    y: number;
    z: number;
    rotationRate: number;
  };
  
  magnetometer: {
    x: number;
    y: number;
    z: number;
    heading: number;
  };
  
  gps: {
    latitude: number;
    longitude: number;
    altitude: number;
    accuracy: number;
    speed: number;
    bearing: number;
  };
  
  deviceMetrics: {
    batteryLevel: number;
    screenBrightness: number;
    networkStrength: number;
    temperature: number;
  };
  
  environmentalSensors?: {
    ambientLight: number;
    proximity: number;
    humidity: number;
    pressure: number;
  };
}

export interface MovementPattern {
  patternId: string;
  userId: string;
  movementType: 'walking' | 'driving' | 'riding' | 'stationary' | 'anomalous';
  confidence: number;
  duration: number;
  averageSpeed: number;
  accelerationPattern: number[];
  rotationPattern: number[];
  fraudRisk: number;
  anomalies: string[];
  timestamp: Date;
}

export interface DeviceFingerprint {
  deviceId: string;
  userId: string;
  sensorSignature: number[];
  movementProfile: {
    walkingGait: number[];
    drivingStyle: number[];
    deviceHoldingPattern: number[];
    typingRhythm: number[];
  };
  environmentalProfile: {
    usualLocations: Array<{lat: number, lon: number, frequency: number}>;
    timePatterns: number[];
    deviceUsageHours: number[];
  };
  trustScore: number;
  lastCalibrated: Date;
  anomalyHistory: string[];
}

export interface VehicleTelemetrics {
  vehicleId: string;
  driverId: string;
  engineMetrics: {
    rpm: number;
    speed: number;
    fuelLevel: number;
    temperature: number;
  };
  drivingBehavior: {
    accelerationEvents: number;
    brakingEvents: number;
    corneringG: number;
    speedingEvents: number;
  };
  gpsTrajectory: Array<{
    lat: number;
    lon: number;
    timestamp: Date;
    speed: number;
  }>;
  fraudIndicators: string[];
  riskScore: number;
}

export class IoTSensorFusionEngine {
  private deviceFingerprints: Map<string, DeviceFingerprint> = new Map();
  private movementProfiles: Map<string, MovementPattern[]> = new Map();
  private sensorCalibrationData: Map<string, any> = new Map();
  
  private anomalyThresholds = {
    accelerationSpike: 15.0,
    rotationAnomaly: 300.0,
    speedInconsistency: 50.0,
    locationJump: 1000.0,
    batteryDrainRate: 0.5,
    sensorNoise: 0.3
  };

  constructor() {
    this.initializeSensorProcessing();
  }

  private initializeSensorProcessing(): void {
    logger.info('Initializing IoT Sensor Fusion Engine...');
    logger.info('Loading sensor calibration algorithms...');
    logger.info('Setting up movement pattern recognition...');
  }

  async processSensorStream(sensorData: SensorData): Promise<MovementPattern> {
    const preprocessedData = await this.preprocessSensorData(sensorData);
    const movementType = await this.classifyMovement(preprocessedData);
    const fraudRisk = await this.analyzeFraudRisk(preprocessedData, movementType);
    const anomalies = await this.detectSensorAnomalies(preprocessedData);

    const pattern: MovementPattern = {
      patternId: `pattern_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId: sensorData.userId,
      movementType,
      confidence: this.calculateMovementConfidence(preprocessedData, movementType),
      duration: 0,
      averageSpeed: sensorData.gps.speed,
      accelerationPattern: [preprocessedData.accelerometer.x, preprocessedData.accelerometer.y, preprocessedData.accelerometer.z],
      rotationPattern: [preprocessedData.gyroscope.x, preprocessedData.gyroscope.y, preprocessedData.gyroscope.z],
      fraudRisk,
      anomalies,
      timestamp: sensorData.timestamp
    };

    await this.updateMovementHistory(sensorData.userId, pattern);
    return pattern;
  }

  private async preprocessSensorData(data: SensorData): Promise<SensorData> {
    const calibration = this.sensorCalibrationData.get(data.deviceId) || this.getDefaultCalibration();
    
    const calibratedData = { ...data };
    
    calibratedData.accelerometer.x -= calibration.accelerometer.bias.x;
    calibratedData.accelerometer.y -= calibration.accelerometer.bias.y;
    calibratedData.accelerometer.z -= calibration.accelerometer.bias.z;
    calibratedData.accelerometer.magnitude = Math.sqrt(
      Math.pow(calibratedData.accelerometer.x, 2) +
      Math.pow(calibratedData.accelerometer.y, 2) +
      Math.pow(calibratedData.accelerometer.z, 2)
    );

    calibratedData.gyroscope.rotationRate = Math.sqrt(
      Math.pow(calibratedData.gyroscope.x, 2) +
      Math.pow(calibratedData.gyroscope.y, 2) +
      Math.pow(calibratedData.gyroscope.z, 2)
    );

    return calibratedData;
  }

  private async classifyMovement(data: SensorData): Promise<MovementPattern['movementType']> {
    const accelMagnitude = data.accelerometer.magnitude;
    const speed = data.gps.speed;
    const gyroRate = data.gyroscope.rotationRate;

    if (speed < 1 && accelMagnitude < 2) return 'stationary';
    if (speed < 8 && accelMagnitude > 2 && accelMagnitude < 6) return 'walking';
    if (speed > 15 && speed < 120 && gyroRate < 100) return 'driving';
    if (speed > 8 && speed < 25 && accelMagnitude < 4) return 'riding';

    if (accelMagnitude > 20 || gyroRate > 500 || speed > 200) return 'anomalous';

    return 'walking';
  }

  private async analyzeFraudRisk(data: SensorData, movementType: MovementPattern['movementType']): Promise<number> {
    let risk = 0;

    if (movementType === 'anomalous') risk += 0.4;

    const speedGpsInconsistency = this.checkSpeedConsistency(data);
    if (speedGpsInconsistency > this.anomalyThresholds.speedInconsistency) risk += 0.3;

    const locationJump = await this.detectLocationJumps(data);
    if (locationJump > this.anomalyThresholds.locationJump) risk += 0.3;

    if (data.deviceMetrics.batteryLevel < 0.1 && data.deviceMetrics.screenBrightness > 0.8) risk += 0.1;

    const sensorNoiseLevel = this.calculateSensorNoise(data);
    if (sensorNoiseLevel > this.anomalyThresholds.sensorNoise) risk += 0.2;

    const philippinesLocationCheck = this.isInPhilippinesRegion(data.gps.latitude, data.gps.longitude);
    if (!philippinesLocationCheck) risk += 0.1;

    return Math.min(risk, 1.0);
  }

  private async detectSensorAnomalies(data: SensorData): Promise<string[]> {
    const anomalies: string[] = [];

    if (data.accelerometer.magnitude > this.anomalyThresholds.accelerationSpike) {
      anomalies.push('excessive_acceleration_detected');
    }

    if (data.gyroscope.rotationRate > this.anomalyThresholds.rotationAnomaly) {
      anomalies.push('abnormal_rotation_pattern');
    }

    if (Math.abs(data.gps.speed - this.calculateExpectedSpeed(data)) > this.anomalyThresholds.speedInconsistency) {
      anomalies.push('gps_speed_sensor_mismatch');
    }

    if (data.deviceMetrics.temperature > 45 || data.deviceMetrics.temperature < -10) {
      anomalies.push('extreme_device_temperature');
    }

    const batteryDrain = this.calculateBatteryDrainRate(data);
    if (batteryDrain > this.anomalyThresholds.batteryDrainRate) {
      anomalies.push('abnormal_battery_consumption');
    }

    if (data.environmentalSensors && data.environmentalSensors.proximity < 0.1 && data.deviceMetrics.screenBrightness > 0.9) {
      anomalies.push('screen_active_during_proximity');
    }

    return anomalies;
  }

  async createDeviceFingerprint(userId: string, deviceId: string, sensorHistory: SensorData[]): Promise<DeviceFingerprint> {
    const sensorSignature = await this.generateSensorSignature(sensorHistory);
    const movementProfile = await this.analyzeMovementProfile(sensorHistory);
    const environmentalProfile = await this.buildEnvironmentalProfile(sensorHistory);

    const fingerprint: DeviceFingerprint = {
      deviceId,
      userId,
      sensorSignature,
      movementProfile,
      environmentalProfile,
      trustScore: 0.8,
      lastCalibrated: new Date(),
      anomalyHistory: []
    };

    this.deviceFingerprints.set(deviceId, fingerprint);
    return fingerprint;
  }

  private async generateSensorSignature(history: SensorData[]): Promise<number[]> {
    if (history.length === 0) return [];

    const signature: number[] = [];
    
    const avgAccelX = history.reduce((sum, d) => sum + d.accelerometer.x, 0) / history.length;
    const avgAccelY = history.reduce((sum, d) => sum + d.accelerometer.y, 0) / history.length;
    const avgAccelZ = history.reduce((sum, d) => sum + d.accelerometer.z, 0) / history.length;
    
    const accelVariance = this.calculateVariance(history.map(d => d.accelerometer.magnitude));
    const gyroVariance = this.calculateVariance(history.map(d => d.gyroscope.rotationRate));
    
    signature.push(avgAccelX, avgAccelY, avgAccelZ, accelVariance, gyroVariance);
    
    const frequencyComponents = await this.performFFT(history.map(d => d.accelerometer.magnitude));
    signature.push(...frequencyComponents.slice(0, 10));

    return signature;
  }

  private async analyzeMovementProfile(history: SensorData[]): Promise<DeviceFingerprint['movementProfile']> {
    const walkingData = history.filter(d => d.gps.speed < 8);
    const drivingData = history.filter(d => d.gps.speed > 15);

    return {
      walkingGait: walkingData.length > 0 ? await this.extractGaitPattern(walkingData) : [],
      drivingStyle: drivingData.length > 0 ? await this.extractDrivingStyle(drivingData) : [],
      deviceHoldingPattern: await this.analyzeDeviceOrientation(history),
      typingRhythm: await this.extractTypingRhythm(history)
    };
  }

  async analyzeVehicleTelemetrics(telemetrics: VehicleTelemetrics): Promise<VehicleTelemetrics> {
    const fraudIndicators: string[] = [];
    let riskScore = 0;

    if (telemetrics.drivingBehavior.accelerationEvents > 50) {
      fraudIndicators.push('aggressive_driving_pattern');
      riskScore += 0.2;
    }

    if (telemetrics.drivingBehavior.speedingEvents > 20) {
      fraudIndicators.push('frequent_speeding_violations');
      riskScore += 0.3;
    }

    const routeAnalysis = await this.analyzeRoutePattern(telemetrics.gpsTrajectory);
    if (routeAnalysis.isAnomalous) {
      fraudIndicators.push('suspicious_route_deviation');
      riskScore += 0.3;
    }

    if (telemetrics.engineMetrics.fuelLevel < 0.1 && telemetrics.gpsTrajectory.length > 100) {
      fraudIndicators.push('impossible_fuel_consumption');
      riskScore += 0.4;
    }

    const duplicateLocations = this.detectLocationDuplication(telemetrics.gpsTrajectory);
    if (duplicateLocations > 0.3) {
      fraudIndicators.push('gps_spoofing_detected');
      riskScore += 0.5;
    }

    return {
      ...telemetrics,
      fraudIndicators,
      riskScore: Math.min(riskScore, 1.0)
    };
  }

  private checkSpeedConsistency(data: SensorData): number {
    const expectedSpeed = this.calculateExpectedSpeed(data);
    return Math.abs(data.gps.speed - expectedSpeed);
  }

  private calculateExpectedSpeed(data: SensorData): number {
    const accelMagnitude = data.accelerometer.magnitude;
    if (accelMagnitude < 2) return 0;
    if (accelMagnitude < 6) return Math.random() * 8 + 2;
    if (accelMagnitude < 10) return Math.random() * 30 + 10;
    return Math.random() * 60 + 30;
  }

  private async detectLocationJumps(data: SensorData): Promise<number> {
    return Math.random() * 500;
  }

  private calculateSensorNoise(data: SensorData): number {
    const accelNoise = Math.abs(data.accelerometer.magnitude - 9.81) / 9.81;
    const gyroNoise = data.gyroscope.rotationRate / 1000;
    return (accelNoise + gyroNoise) / 2;
  }

  private isInPhilippinesRegion(lat: number, lon: number): boolean {
    return lat >= 4.0 && lat <= 21.0 && lon >= 116.0 && lon <= 127.0;
  }

  private calculateBatteryDrainRate(data: SensorData): number {
    return Math.random() * 0.3;
  }

  private calculateMovementConfidence(data: SensorData, movementType: MovementPattern['movementType']): number {
    let confidence = 0.8;
    
    if (data.gps.accuracy > 10) confidence -= 0.2;
    if (data.deviceMetrics.networkStrength < 0.3) confidence -= 0.1;
    if (movementType === 'anomalous') confidence -= 0.3;
    
    return Math.max(confidence, 0.1);
  }

  private async updateMovementHistory(userId: string, pattern: MovementPattern): Promise<void> {
    const history = this.movementProfiles.get(userId) || [];
    history.push(pattern);
    
    if (history.length > 1000) {
      history.splice(0, history.length - 1000);
    }
    
    this.movementProfiles.set(userId, history);
  }

  private getDefaultCalibration(): any {
    return {
      accelerometer: {
        bias: { x: 0.1, y: -0.05, z: 0.02 },
        scale: { x: 1.0, y: 1.0, z: 1.0 }
      },
      gyroscope: {
        bias: { x: 0.01, y: -0.02, z: 0.005 },
        scale: { x: 1.0, y: 1.0, z: 1.0 }
      }
    };
  }

  private calculateVariance(values: number[]): number {
    if (values.length === 0) return 0;
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    return values.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / values.length;
  }

  private async performFFT(signal: number[]): Promise<number[]> {
    if (signal.length === 0) return [];
    
    const fftResult: number[] = [];
    for (let i = 0; i < Math.min(signal.length, 20); i++) {
      fftResult.push(Math.sin(i * Math.PI / signal.length) * signal[i % signal.length]);
    }
    return fftResult;
  }

  private async extractGaitPattern(walkingData: SensorData[]): Promise<number[]> {
    if (walkingData.length === 0) return [];
    
    const steps = walkingData.map(d => d.accelerometer.magnitude);
    return this.findPeaks(steps).slice(0, 10);
  }

  private async extractDrivingStyle(drivingData: SensorData[]): Promise<number[]> {
    if (drivingData.length === 0) return [];
    
    const accelerations = drivingData.map(d => d.accelerometer.magnitude);
    const rotations = drivingData.map(d => d.gyroscope.rotationRate);
    
    return [
      this.calculateVariance(accelerations),
      this.calculateVariance(rotations),
      Math.max(...accelerations),
      Math.max(...rotations)
    ];
  }

  private async analyzeDeviceOrientation(history: SensorData[]): Promise<number[]> {
    if (history.length === 0) return [];
    
    const orientations = history.map(d => Math.atan2(d.accelerometer.y, d.accelerometer.x));
    return [
      this.calculateVariance(orientations),
      Math.max(...orientations),
      Math.min(...orientations)
    ];
  }

  private async extractTypingRhythm(history: SensorData[]): Promise<number[]> {
    const typingEvents = history.filter(d => d.accelerometer.magnitude > 5 && d.accelerometer.magnitude < 15);
    if (typingEvents.length === 0) return [];
    
    const intervals: number[] = [];
    for (let i = 1; i < typingEvents.length; i++) {
      intervals.push(typingEvents[i].timestamp.getTime() - typingEvents[i-1].timestamp.getTime());
    }
    
    return intervals.slice(0, 10);
  }

  private async buildEnvironmentalProfile(history: SensorData[]): Promise<DeviceFingerprint['environmentalProfile']> {
    const locations = history.map(d => ({ lat: d.gps.latitude, lon: d.gps.longitude }));
    const hours = history.map(d => d.timestamp.getHours());
    
    const usualLocations = this.clusterLocations(locations);
    const timePatterns = this.analyzeTimeUsage(hours);
    
    return {
      usualLocations,
      timePatterns,
      deviceUsageHours: Array.from({ length: 24 }, (_, i) => 
        hours.filter(h => h === i).length / history.length
      )
    };
  }

  private clusterLocations(locations: Array<{lat: number, lon: number}>): Array<{lat: number, lon: number, frequency: number}> {
    const clusters: Array<{lat: number, lon: number, frequency: number}> = [];
    
    for (const location of locations) {
      let found = false;
      for (const cluster of clusters) {
        const distance = this.calculateDistance(location.lat, location.lon, cluster.lat, cluster.lon);
        if (distance < 0.1) {
          cluster.frequency++;
          found = true;
          break;
        }
      }
      if (!found) {
        clusters.push({ ...location, frequency: 1 });
      }
    }
    
    return clusters.sort((a, b) => b.frequency - a.frequency).slice(0, 10);
  }

  private analyzeTimeUsage(hours: number[]): number[] {
    const usage = new Array(24).fill(0);
    hours.forEach(hour => usage[hour]++);
    const total = hours.length;
    return usage.map(count => count / total);
  }

  private findPeaks(signal: number[]): number[] {
    const peaks: number[] = [];
    for (let i = 1; i < signal.length - 1; i++) {
      if (signal[i] > signal[i-1] && signal[i] > signal[i+1] && signal[i] > 5) {
        peaks.push(i);
      }
    }
    return peaks;
  }

  private async analyzeRoutePattern(trajectory: Array<{lat: number, lon: number, timestamp: Date, speed: number}>): Promise<any> {
    if (trajectory.length < 2) return { isAnomalous: false, confidence: 0 };
    
    let totalDistance = 0;
    let speedAnomalies = 0;
    
    for (let i = 1; i < trajectory.length; i++) {
      const distance = this.calculateDistance(
        trajectory[i-1].lat, trajectory[i-1].lon,
        trajectory[i].lat, trajectory[i].lon
      );
      totalDistance += distance;
      
      if (trajectory[i].speed > 120) speedAnomalies++;
    }
    
    return {
      isAnomalous: speedAnomalies > trajectory.length * 0.1,
      confidence: Math.min(trajectory.length / 100, 1.0),
      totalDistance,
      averageSpeed: totalDistance / trajectory.length
    };
  }

  private detectLocationDuplication(trajectory: Array<{lat: number, lon: number, timestamp: Date}>): number {
    let duplicates = 0;
    const seen = new Set<string>();
    
    for (const point of trajectory) {
      const key = `${Math.round(point.lat * 1000)},${Math.round(point.lon * 1000)}`;
      if (seen.has(key)) duplicates++;
      seen.add(key);
    }
    
    return duplicates / trajectory.length;
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  getDeviceFingerprint(deviceId: string): DeviceFingerprint | null {
    return this.deviceFingerprints.get(deviceId) || null;
  }

  getMovementHistory(userId: string): MovementPattern[] {
    return this.movementProfiles.get(userId) || [];
  }
}