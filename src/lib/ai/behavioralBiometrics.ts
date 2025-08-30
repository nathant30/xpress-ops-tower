'use client';

import { logger } from '../security/productionLogger';

interface BiometricProfile {
  userId: string;
  deviceFingerprint: string;
  createdAt: number;
  lastUpdated: number;
  sessionsAnalyzed: number;
  confidence: number;
  patterns: {
    typing: TypingPattern;
    touch: TouchPattern;
    device: DeviceUsagePattern;
    app: AppUsagePattern;
    location: LocationPattern;
    temporal: TemporalPattern;
  };
  anomalyScore: number;
  riskFactors: string[];
  isEstablished: boolean; // Whether we have enough data for reliable identification
}

interface TypingPattern {
  keystrokeTimings: {
    dwellTimes: number[]; // Time key is held down
    flightTimes: number[]; // Time between keystrokes
    averageDwellTime: number;
    averageFlightTime: number;
    rhythm: number; // Consistency of typing rhythm
  };
  typingSpeed: {
    averageWPM: number;
    peakWPM: number;
    speedVariation: number;
  };
  errorPatterns: {
    commonMistakes: string[];
    correctionSpeed: number;
    backspaceFrequency: number;
  };
  keyboardLayout: 'qwerty' | 'dvorak' | 'other';
  predictability: number; // How predictable their typing pattern is
}

interface TouchPattern {
  gestures: {
    swipeVelocity: number[];
    tapPressure: number[];
    holdDuration: number[];
    scrollSpeed: number[];
    pinchSpread: number[];
  };
  fingerGeometry: {
    touchSize: number[]; // Size of touch area
    touchShape: 'round' | 'oval' | 'irregular';
    averagePressure: number;
    contactArea: number;
  };
  touchRhythm: {
    tapInterval: number[];
    doubleClickSpeed: number;
    dragAccuracy: number;
  };
  handedness: 'left' | 'right' | 'ambidextrous' | 'unknown';
  reachabilityMap: { [key: string]: number }; // Areas of screen most/least accessible
}

interface DeviceUsagePattern {
  orientationPreference: 'portrait' | 'landscape' | 'auto';
  brightnessSettings: number[];
  volumeSettings: number[];
  batteryUsagePattern: {
    chargingHabits: number[]; // Battery levels when charging starts
    dischargingRate: number;
    powerSavingMode: boolean;
  };
  connectivity: {
    wifiNetworks: string[]; // Hashed network names
    cellularUsage: number;
    bluetoothDevices: string[]; // Paired device types
  };
  sensors: {
    accelerometerBaseline: { x: number; y: number; z: number };
    gyroscopeBaseline: { x: number; y: number; z: number };
    magnetometerBaseline: { x: number; y: number; z: number };
    movementSignature: number[]; // Walking/movement patterns
  };
}

interface AppUsagePattern {
  launchSequence: string[]; // Order of app launches
  sessionDurations: { [appName: string]: number[] };
  backgroundApps: string[];
  foregroundTransitions: Array<{
    from: string;
    to: string;
    frequency: number;
  }>;
  homeScreenLayout: {
    appPositions: { [appName: string]: { x: number; y: number } };
    folderStructure: string[];
    widgetUsage: boolean;
  };
  installationHistory: Array<{
    appName: string;
    installedAt: number;
    category: string;
  }>;
}

interface LocationPattern {
  significantLocations: Array<{
    lat: number;
    lng: number;
    label: string;
    frequency: number;
    timePatterns: number[]; // Hours when this location is visited
  }>;
  travelPatterns: {
    averageSpeed: number;
    preferredRoutes: Array<{
      start: { lat: number; lng: number };
      end: { lat: number; lng: number };
      frequency: number;
    }>;
    transportModes: ('walking' | 'driving' | 'public_transport')[];
  };
  geofences: Array<{
    name: string;
    center: { lat: number; lng: number };
    radius: number;
    dwellTime: number;
  }>;
  mobilityScore: number; // How mobile vs stationary the user is
}

interface TemporalPattern {
  activeHours: number[]; // Hours of day when most active
  peakUsageTimes: Array<{
    startHour: number;
    endHour: number;
    intensity: number;
  }>;
  weeklyPattern: {
    weekdayUsage: number[];
    weekendUsage: number[];
  };
  seasonalPattern: {
    monthlyUsage: number[];
  };
  sleepPattern: {
    estimatedSleepTime: string; // HH:MM format
    estimatedWakeTime: string;
    sleepDuration: number;
  };
}

interface BiometricSession {
  sessionId: string;
  userId: string;
  startTime: number;
  endTime: number;
  deviceFingerprint: string;
  capturedData: {
    keystrokes: Array<{
      timestamp: number;
      key: string;
      dwellTime: number;
      pressure?: number;
    }>;
    touchEvents: Array<{
      timestamp: number;
      type: 'tap' | 'swipe' | 'pinch' | 'hold';
      x: number;
      y: number;
      pressure: number;
      size: number;
      duration?: number;
      velocity?: { x: number; y: number };
    }>;
    sensorData: Array<{
      timestamp: number;
      accelerometer: { x: number; y: number; z: number };
      gyroscope: { x: number; y: number; z: number };
      magnetometer?: { x: number; y: number; z: number };
    }>;
    appUsage: Array<{
      timestamp: number;
      appName: string;
      action: 'launch' | 'background' | 'foreground' | 'close';
      duration?: number;
    }>;
    deviceMetrics: {
      batteryLevel: number;
      brightness: number;
      volume: number;
      orientation: 'portrait' | 'landscape';
      networkType: 'wifi' | 'cellular' | 'offline';
    };
  };
  anomalies: Array<{
    type: string;
    severity: 'low' | 'medium' | 'high';
    description: string;
    confidence: number;
  }>;
}

interface BiometricVerificationResult {
  isAuthentic: boolean;
  confidence: number;
  similarityScore: number;
  analysisBreakdown: {
    typing: { score: number; weight: number };
    touch: { score: number; weight: number };
    device: { score: number; weight: number };
    app: { score: number; weight: number };
    location: { score: number; weight: number };
    temporal: { score: number; weight: number };
  };
  anomalies: string[];
  riskFactors: string[];
  recommendation: 'allow' | 'challenge' | 'block' | 'investigate';
  explanation: string;
}

interface DigitalFingerprint {
  deviceId: string;
  hardwareFingerprint: {
    screenResolution: string;
    colorDepth: number;
    pixelRatio: number;
    cpuCores: number;
    memoryGB: number;
    platform: string;
    architecture: string;
  };
  softwareFingerprint: {
    userAgent: string;
    language: string;
    timezone: string;
    plugins: string[];
    fonts: string[];
    webglRenderer: string;
    audioContext: string;
  };
  behavioralFingerprint: {
    mouseMovement: {
      averageSpeed: number;
      acceleration: number[];
      clickPatterns: number[];
      scrollBehavior: { speed: number; direction: string };
    };
    keyboardSignature: string; // Unique typing signature hash
    touchSignature: string; // Unique touch signature hash
    appUsageSignature: string; // Unique app usage signature hash
  };
  networkFingerprint: {
    ipAddress: string;
    isp: string;
    connectionType: string;
    bandwidth: number;
    latency: number;
    dns: string[];
  };
  entropy: number; // How unique this fingerprint is
  createdAt: number;
  lastSeen: number;
  associatedUsers: string[];
  riskScore: number;
}

class BehavioralBiometricsEngine {
  private static instance: BehavioralBiometricsEngine;
  private profiles: Map<string, BiometricProfile> = new Map();
  private sessions: Map<string, BiometricSession> = new Map();
  private digitalFingerprints: Map<string, DigitalFingerprint> = new Map();
  private activeSessions: Map<string, string> = new Map(); // userId -> sessionId

  private readonly MINIMUM_SESSIONS = 5; // Minimum sessions needed for reliable profile
  private readonly SIMILARITY_THRESHOLD = 0.75; // Threshold for authentic user verification
  private readonly MAX_SESSION_AGE = 24 * 60 * 60 * 1000; // 24 hours

  private constructor() {
    this.startPeriodicCleaning();
    logger.info('Behavioral Biometrics Engine initialized');
  }

  static getInstance(): BehavioralBiometricsEngine {
    if (!BehavioralBiometricsEngine.instance) {
      BehavioralBiometricsEngine.instance = new BehavioralBiometricsEngine();
    }
    return BehavioralBiometricsEngine.instance;
  }

  private startPeriodicCleaning(): void {
    // Clean old sessions every hour
    setInterval(() => {
      this.cleanOldSessions();
    }, 60 * 60 * 1000);

    // Update profiles every 30 minutes
    setInterval(() => {
      this.updateProfiles();
    }, 30 * 60 * 1000);
  }

  async startSession(userId: string, deviceFingerprint: string): Promise<string> {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const session: BiometricSession = {
      sessionId,
      userId,
      startTime: Date.now(),
      endTime: 0,
      deviceFingerprint,
      capturedData: {
        keystrokes: [],
        touchEvents: [],
        sensorData: [],
        appUsage: [],
        deviceMetrics: {
          batteryLevel: 0,
          brightness: 0,
          volume: 0,
          orientation: 'portrait',
          networkType: 'wifi'
        }
      },
      anomalies: []
    };

    this.sessions.set(sessionId, session);
    this.activeSessions.set(userId, sessionId);

    logger.info(`Started biometric session: ${sessionId} for user: ${userId}`);
    return sessionId;
  }

  async captureKeystroke(
    sessionId: string,
    key: string,
    dwellTime: number,
    timestamp?: number,
    pressure?: number
  ): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    session.capturedData.keystrokes.push({
      timestamp: timestamp || Date.now(),
      key,
      dwellTime,
      pressure
    });

    // Real-time anomaly detection
    this.detectKeystrokeAnomalies(session);
  }

  async captureTouchEvent(
    sessionId: string,
    type: 'tap' | 'swipe' | 'pinch' | 'hold',
    x: number,
    y: number,
    pressure: number,
    size: number,
    duration?: number,
    velocity?: { x: number; y: number },
    timestamp?: number
  ): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    session.capturedData.touchEvents.push({
      timestamp: timestamp || Date.now(),
      type,
      x,
      y,
      pressure,
      size,
      duration,
      velocity
    });

    // Real-time anomaly detection
    this.detectTouchAnomalies(session);
  }

  async captureSensorData(
    sessionId: string,
    accelerometer: { x: number; y: number; z: number },
    gyroscope: { x: number; y: number; z: number },
    magnetometer?: { x: number; y: number; z: number },
    timestamp?: number
  ): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    session.capturedData.sensorData.push({
      timestamp: timestamp || Date.now(),
      accelerometer,
      gyroscope,
      magnetometer
    });
  }

  async captureAppUsage(
    sessionId: string,
    appName: string,
    action: 'launch' | 'background' | 'foreground' | 'close',
    duration?: number,
    timestamp?: number
  ): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    session.capturedData.appUsage.push({
      timestamp: timestamp || Date.now(),
      appName,
      action,
      duration
    });
  }

  async updateDeviceMetrics(
    sessionId: string,
    metrics: Partial<BiometricSession['capturedData']['deviceMetrics']>
  ): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    session.capturedData.deviceMetrics = {
      ...session.capturedData.deviceMetrics,
      ...metrics
    };
  }

  async endSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    session.endTime = Date.now();

    // Analyze session data
    await this.analyzeSession(session);

    // Update user profile
    await this.updateUserProfile(session);

    // Remove from active sessions
    this.activeSessions.delete(session.userId);

    logger.info(`Ended biometric session: ${sessionId}`);
  }

  private async analyzeSession(session: BiometricSession): Promise<void> {
    // Analyze typing patterns
    if (session.capturedData.keystrokes.length > 10) {
      const typingAnomalies = this.analyzeTypingPattern(session.capturedData.keystrokes);
      session.anomalies.push(...typingAnomalies);
    }

    // Analyze touch patterns
    if (session.capturedData.touchEvents.length > 20) {
      const touchAnomalies = this.analyzeTouchPattern(session.capturedData.touchEvents);
      session.anomalies.push(...touchAnomalies);
    }

    // Analyze sensor patterns
    if (session.capturedData.sensorData.length > 50) {
      const sensorAnomalies = this.analyzeSensorPattern(session.capturedData.sensorData);
      session.anomalies.push(...sensorAnomalies);
    }

    // Analyze app usage patterns
    if (session.capturedData.appUsage.length > 5) {
      const appAnomalies = this.analyzeAppUsagePattern(session.capturedData.appUsage);
      session.anomalies.push(...appAnomalies);
    }
  }

  private analyzeTypingPattern(keystrokes: BiometricSession['capturedData']['keystrokes']): Array<{
    type: string;
    severity: 'low' | 'medium' | 'high';
    description: string;
    confidence: number;
  }> {
    const anomalies = [];

    // Calculate average dwell time
    const dwellTimes = keystrokes.map(k => k.dwellTime);
    const avgDwellTime = dwellTimes.reduce((sum, time) => sum + time, 0) / dwellTimes.length;

    // Detect unusually fast typing (possible automation)
    if (avgDwellTime < 50) { // Less than 50ms average
      anomalies.push({
        type: 'rapid_typing',
        severity: 'high' as const,
        description: `Unusually fast typing detected: ${avgDwellTime.toFixed(1)}ms average dwell time`,
        confidence: 0.85
      });
    }

    // Detect unusually consistent timing (possible bot)
    const dwellTimeVariation = this.calculateVariation(dwellTimes);
    if (dwellTimeVariation < 0.1) {
      anomalies.push({
        type: 'robotic_timing',
        severity: 'high' as const,
        description: `Extremely consistent timing patterns detected (variation: ${dwellTimeVariation.toFixed(3)})`,
        confidence: 0.9
      });
    }

    // Calculate flight times (time between key releases and next key presses)
    const flightTimes = [];
    for (let i = 1; i < keystrokes.length; i++) {
      const flightTime = keystrokes[i].timestamp - (keystrokes[i-1].timestamp + keystrokes[i-1].dwellTime);
      if (flightTime > 0) flightTimes.push(flightTime);
    }

    if (flightTimes.length > 0) {
      const avgFlightTime = flightTimes.reduce((sum, time) => sum + time, 0) / flightTimes.length;
      
      // Detect unusually fast flight times
      if (avgFlightTime < 20) {
        anomalies.push({
          type: 'superhuman_speed',
          severity: 'high' as const,
          description: `Impossibly fast inter-keystroke timing: ${avgFlightTime.toFixed(1)}ms`,
          confidence: 0.95
        });
      }
    }

    return anomalies;
  }

  private analyzeTouchPattern(touchEvents: BiometricSession['capturedData']['touchEvents']): Array<{
    type: string;
    severity: 'low' | 'medium' | 'high';
    description: string;
    confidence: number;
  }> {
    const anomalies = [];

    // Analyze tap patterns
    const taps = touchEvents.filter(e => e.type === 'tap');
    if (taps.length > 10) {
      // Check for unnaturally precise tapping
      const tapPositions = taps.map(t => ({ x: t.x, y: t.y }));
      const positionVariation = this.calculatePositionVariation(tapPositions);
      
      if (positionVariation < 2) { // Less than 2 pixel variation
        anomalies.push({
          type: 'precise_tapping',
          severity: 'high' as const,
          description: `Unnaturally precise tap positions (variation: ${positionVariation.toFixed(2)}px)`,
          confidence: 0.88
        });
      }

      // Check for consistent pressure
      const pressures = taps.map(t => t.pressure);
      const pressureVariation = this.calculateVariation(pressures);
      
      if (pressureVariation < 0.05) {
        anomalies.push({
          type: 'consistent_pressure',
          severity: 'medium' as const,
          description: `Unusually consistent touch pressure (variation: ${pressureVariation.toFixed(3)})`,
          confidence: 0.75
        });
      }
    }

    // Analyze swipe patterns
    const swipes = touchEvents.filter(e => e.type === 'swipe' && e.velocity);
    if (swipes.length > 5) {
      const velocities = swipes.map(s => Math.sqrt(s.velocity!.x ** 2 + s.velocity!.y ** 2));
      const avgVelocity = velocities.reduce((sum, v) => sum + v, 0) / velocities.length;
      
      // Detect unnaturally fast or consistent swiping
      if (avgVelocity > 2000) { // Very fast swiping
        anomalies.push({
          type: 'rapid_swiping',
          severity: 'medium' as const,
          description: `Unusually fast swiping detected: ${avgVelocity.toFixed(0)}px/s`,
          confidence: 0.7
        });
      }

      const velocityVariation = this.calculateVariation(velocities);
      if (velocityVariation < 0.1) {
        anomalies.push({
          type: 'robotic_swiping',
          severity: 'high' as const,
          description: `Mechanical swipe velocity patterns detected`,
          confidence: 0.85
        });
      }
    }

    return anomalies;
  }

  private analyzeSensorPattern(sensorData: BiometricSession['capturedData']['sensorData']): Array<{
    type: string;
    severity: 'low' | 'medium' | 'high';
    description: string;
    confidence: number;
  }> {
    const anomalies = [];

    // Check for static sensor readings (possible emulator)
    const accelReadings = sensorData.map(s => s.accelerometer);
    const accelVariation = this.calculateSensorVariation(accelReadings);
    
    if (accelVariation < 0.01) {
      anomalies.push({
        type: 'static_sensors',
        severity: 'high' as const,
        description: 'Static accelerometer readings indicate possible emulator',
        confidence: 0.9
      });
    }

    // Check for unrealistic sensor values
    const suspiciousReadings = sensorData.filter(s => 
      Math.abs(s.accelerometer.x) > 20 || 
      Math.abs(s.accelerometer.y) > 20 || 
      Math.abs(s.accelerometer.z) > 20
    );

    if (suspiciousReadings.length > sensorData.length * 0.1) {
      anomalies.push({
        type: 'unrealistic_sensors',
        severity: 'medium' as const,
        description: 'Unrealistic sensor values detected',
        confidence: 0.75
      });
    }

    return anomalies;
  }

  private analyzeAppUsagePattern(appUsage: BiometricSession['capturedData']['appUsage']): Array<{
    type: string;
    severity: 'low' | 'medium' | 'high';
    description: string;
    confidence: number;
  }> {
    const anomalies = [];

    // Check for rapid app switching
    const launches = appUsage.filter(a => a.action === 'launch');
    const switchTimes = [];
    
    for (let i = 1; i < launches.length; i++) {
      const timeDiff = launches[i].timestamp - launches[i-1].timestamp;
      switchTimes.push(timeDiff);
    }

    if (switchTimes.length > 0) {
      const avgSwitchTime = switchTimes.reduce((sum, time) => sum + time, 0) / switchTimes.length;
      
      if (avgSwitchTime < 500) { // Less than 500ms between app launches
        anomalies.push({
          type: 'rapid_app_switching',
          severity: 'medium' as const,
          description: `Unusually rapid app switching: ${avgSwitchTime.toFixed(0)}ms average`,
          confidence: 0.7
        });
      }
    }

    // Check for suspicious app combinations
    const appNames = [...new Set(appUsage.map(a => a.appName))];
    const suspiciousApps = ['LocationSpoofer', 'FakeGPS', 'MockLocation', 'Xposed'];
    const foundSuspicious = appNames.filter(name => 
      suspiciousApps.some(suspicious => name.toLowerCase().includes(suspicious.toLowerCase()))
    );

    if (foundSuspicious.length > 0) {
      anomalies.push({
        type: 'suspicious_apps',
        severity: 'high' as const,
        description: `Suspicious apps detected: ${foundSuspicious.join(', ')}`,
        confidence: 0.95
      });
    }

    return anomalies;
  }

  private calculateVariation(values: number[]): number {
    if (values.length === 0) return 0;
    
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);
    
    return mean > 0 ? stdDev / mean : 0; // Coefficient of variation
  }

  private calculatePositionVariation(positions: { x: number; y: number }[]): number {
    if (positions.length === 0) return 0;
    
    const meanX = positions.reduce((sum, pos) => sum + pos.x, 0) / positions.length;
    const meanY = positions.reduce((sum, pos) => sum + pos.y, 0) / positions.length;
    
    const distances = positions.map(pos => 
      Math.sqrt(Math.pow(pos.x - meanX, 2) + Math.pow(pos.y - meanY, 2))
    );
    
    return distances.reduce((sum, dist) => sum + dist, 0) / distances.length;
  }

  private calculateSensorVariation(readings: { x: number; y: number; z: number }[]): number {
    if (readings.length === 0) return 0;
    
    const xValues = readings.map(r => r.x);
    const yValues = readings.map(r => r.y);
    const zValues = readings.map(r => r.z);
    
    const xVar = this.calculateVariation(xValues);
    const yVar = this.calculateVariation(yValues);
    const zVar = this.calculateVariation(zValues);
    
    return (xVar + yVar + zVar) / 3;
  }

  private detectKeystrokeAnomalies(session: BiometricSession): void {
    // Real-time keystroke anomaly detection
    const keystrokes = session.capturedData.keystrokes;
    if (keystrokes.length < 5) return;

    const recentKeystrokes = keystrokes.slice(-10); // Last 10 keystrokes
    const recentDwellTimes = recentKeystrokes.map(k => k.dwellTime);
    const avgDwellTime = recentDwellTimes.reduce((sum, time) => sum + time, 0) / recentDwellTimes.length;

    // Check for sudden speed changes
    if (avgDwellTime < 30 && keystrokes.length > 10) {
      session.anomalies.push({
        type: 'speed_anomaly',
        severity: 'medium',
        description: 'Sudden typing speed increase detected',
        confidence: 0.7
      });
    }
  }

  private detectTouchAnomalies(session: BiometricSession): void {
    // Real-time touch anomaly detection
    const touchEvents = session.capturedData.touchEvents;
    if (touchEvents.length < 10) return;

    const recentTouches = touchEvents.slice(-20); // Last 20 touches
    const tapEvents = recentTouches.filter(t => t.type === 'tap');

    if (tapEvents.length >= 5) {
      const pressures = tapEvents.map(t => t.pressure);
      const pressureVar = this.calculateVariation(pressures);

      if (pressureVar < 0.02) { // Very consistent pressure
        session.anomalies.push({
          type: 'pressure_consistency',
          severity: 'medium',
          description: 'Unusually consistent touch pressure',
          confidence: 0.75
        });
      }
    }
  }

  private async updateUserProfile(session: BiometricSession): Promise<void> {
    const userId = session.userId;
    let profile = this.profiles.get(userId);

    if (!profile) {
      profile = this.createNewProfile(userId, session.deviceFingerprint);
    }

    // Update patterns based on session data
    profile = await this.updateProfilePatterns(profile, session);
    profile.lastUpdated = Date.now();
    profile.sessionsAnalyzed++;

    // Determine if profile is established
    profile.isEstablished = profile.sessionsAnalyzed >= this.MINIMUM_SESSIONS;

    // Calculate overall confidence
    profile.confidence = this.calculateProfileConfidence(profile);

    // Update anomaly score
    profile.anomalyScore = this.calculateAnomalyScore(profile, session);

    // Update risk factors
    profile.riskFactors = this.identifyRiskFactors(profile, session);

    this.profiles.set(userId, profile);
  }

  private createNewProfile(userId: string, deviceFingerprint: string): BiometricProfile {
    return {
      userId,
      deviceFingerprint,
      createdAt: Date.now(),
      lastUpdated: Date.now(),
      sessionsAnalyzed: 0,
      confidence: 0,
      patterns: {
        typing: this.createEmptyTypingPattern(),
        touch: this.createEmptyTouchPattern(),
        device: this.createEmptyDevicePattern(),
        app: this.createEmptyAppPattern(),
        location: this.createEmptyLocationPattern(),
        temporal: this.createEmptyTemporalPattern()
      },
      anomalyScore: 0,
      riskFactors: [],
      isEstablished: false
    };
  }

  private createEmptyTypingPattern(): TypingPattern {
    return {
      keystrokeTimings: {
        dwellTimes: [],
        flightTimes: [],
        averageDwellTime: 0,
        averageFlightTime: 0,
        rhythm: 0
      },
      typingSpeed: {
        averageWPM: 0,
        peakWPM: 0,
        speedVariation: 0
      },
      errorPatterns: {
        commonMistakes: [],
        correctionSpeed: 0,
        backspaceFrequency: 0
      },
      keyboardLayout: 'qwerty',
      predictability: 0
    };
  }

  private createEmptyTouchPattern(): TouchPattern {
    return {
      gestures: {
        swipeVelocity: [],
        tapPressure: [],
        holdDuration: [],
        scrollSpeed: [],
        pinchSpread: []
      },
      fingerGeometry: {
        touchSize: [],
        touchShape: 'round',
        averagePressure: 0,
        contactArea: 0
      },
      touchRhythm: {
        tapInterval: [],
        doubleClickSpeed: 0,
        dragAccuracy: 0
      },
      handedness: 'unknown',
      reachabilityMap: {}
    };
  }

  private createEmptyDevicePattern(): DeviceUsagePattern {
    return {
      orientationPreference: 'auto',
      brightnessSettings: [],
      volumeSettings: [],
      batteryUsagePattern: {
        chargingHabits: [],
        dischargingRate: 0,
        powerSavingMode: false
      },
      connectivity: {
        wifiNetworks: [],
        cellularUsage: 0,
        bluetoothDevices: []
      },
      sensors: {
        accelerometerBaseline: { x: 0, y: 0, z: 9.81 },
        gyroscopeBaseline: { x: 0, y: 0, z: 0 },
        magnetometerBaseline: { x: 0, y: 0, z: 0 },
        movementSignature: []
      }
    };
  }

  private createEmptyAppPattern(): AppUsagePattern {
    return {
      launchSequence: [],
      sessionDurations: {},
      backgroundApps: [],
      foregroundTransitions: [],
      homeScreenLayout: {
        appPositions: {},
        folderStructure: [],
        widgetUsage: false
      },
      installationHistory: []
    };
  }

  private createEmptyLocationPattern(): LocationPattern {
    return {
      significantLocations: [],
      travelPatterns: {
        averageSpeed: 0,
        preferredRoutes: [],
        transportModes: []
      },
      geofences: [],
      mobilityScore: 0
    };
  }

  private createEmptyTemporalPattern(): TemporalPattern {
    return {
      activeHours: [],
      peakUsageTimes: [],
      weeklyPattern: {
        weekdayUsage: new Array(7).fill(0),
        weekendUsage: new Array(2).fill(0)
      },
      seasonalPattern: {
        monthlyUsage: new Array(12).fill(0)
      },
      sleepPattern: {
        estimatedSleepTime: '23:00',
        estimatedWakeTime: '07:00',
        sleepDuration: 8
      }
    };
  }

  private async updateProfilePatterns(profile: BiometricProfile, session: BiometricSession): Promise<BiometricProfile> {
    // Update typing patterns
    if (session.capturedData.keystrokes.length > 0) {
      profile.patterns.typing = this.updateTypingPattern(profile.patterns.typing, session.capturedData.keystrokes);
    }

    // Update touch patterns
    if (session.capturedData.touchEvents.length > 0) {
      profile.patterns.touch = this.updateTouchPattern(profile.patterns.touch, session.capturedData.touchEvents);
    }

    // Update device patterns
    profile.patterns.device = this.updateDevicePattern(profile.patterns.device, session.capturedData.deviceMetrics);

    // Update app patterns
    if (session.capturedData.appUsage.length > 0) {
      profile.patterns.app = this.updateAppPattern(profile.patterns.app, session.capturedData.appUsage);
    }

    // Update temporal patterns
    profile.patterns.temporal = this.updateTemporalPattern(profile.patterns.temporal, session);

    return profile;
  }

  private updateTypingPattern(
    current: TypingPattern, 
    keystrokes: BiometricSession['capturedData']['keystrokes']
  ): TypingPattern {
    const dwellTimes = keystrokes.map(k => k.dwellTime);
    
    // Update dwell times (keep only recent ones)
    current.keystrokeTimings.dwellTimes.push(...dwellTimes);
    if (current.keystrokeTimings.dwellTimes.length > 1000) {
      current.keystrokeTimings.dwellTimes = current.keystrokeTimings.dwellTimes.slice(-1000);
    }

    // Calculate flight times
    const flightTimes = [];
    for (let i = 1; i < keystrokes.length; i++) {
      const flightTime = keystrokes[i].timestamp - (keystrokes[i-1].timestamp + keystrokes[i-1].dwellTime);
      if (flightTime > 0) flightTimes.push(flightTime);
    }

    current.keystrokeTimings.flightTimes.push(...flightTimes);
    if (current.keystrokeTimings.flightTimes.length > 1000) {
      current.keystrokeTimings.flightTimes = current.keystrokeTimings.flightTimes.slice(-1000);
    }

    // Update averages
    current.keystrokeTimings.averageDwellTime = 
      current.keystrokeTimings.dwellTimes.reduce((sum, time) => sum + time, 0) / current.keystrokeTimings.dwellTimes.length;
    
    current.keystrokeTimings.averageFlightTime = 
      current.keystrokeTimings.flightTimes.reduce((sum, time) => sum + time, 0) / current.keystrokeTimings.flightTimes.length;

    // Calculate typing speed (simplified)
    const sessionDuration = (keystrokes[keystrokes.length - 1].timestamp - keystrokes[0].timestamp) / 1000 / 60; // minutes
    const sessionWPM = sessionDuration > 0 ? (keystrokes.length / 5) / sessionDuration : 0; // Rough WPM calculation

    current.typingSpeed.averageWPM = (current.typingSpeed.averageWPM + sessionWPM) / 2;
    current.typingSpeed.peakWPM = Math.max(current.typingSpeed.peakWPM, sessionWPM);

    return current;
  }

  private updateTouchPattern(
    current: TouchPattern,
    touchEvents: BiometricSession['capturedData']['touchEvents']
  ): TouchPattern {
    const taps = touchEvents.filter(e => e.type === 'tap');
    const swipes = touchEvents.filter(e => e.type === 'swipe');

    // Update tap pressures
    const tapPressures = taps.map(t => t.pressure);
    current.gestures.tapPressure.push(...tapPressures);
    if (current.gestures.tapPressure.length > 500) {
      current.gestures.tapPressure = current.gestures.tapPressure.slice(-500);
    }

    // Update swipe velocities
    const swipeVels = swipes.filter(s => s.velocity).map(s => 
      Math.sqrt(s.velocity!.x ** 2 + s.velocity!.y ** 2)
    );
    current.gestures.swipeVelocity.push(...swipeVels);
    if (current.gestures.swipeVelocity.length > 500) {
      current.gestures.swipeVelocity = current.gestures.swipeVelocity.slice(-500);
    }

    // Update finger geometry
    const touchSizes = touchEvents.map(e => e.size);
    current.fingerGeometry.touchSize.push(...touchSizes);
    if (current.fingerGeometry.touchSize.length > 500) {
      current.fingerGeometry.touchSize = current.fingerGeometry.touchSize.slice(-500);
    }

    current.fingerGeometry.averagePressure = 
      current.gestures.tapPressure.reduce((sum, p) => sum + p, 0) / current.gestures.tapPressure.length;

    return current;
  }

  private updateDevicePattern(
    current: DeviceUsagePattern,
    deviceMetrics: BiometricSession['capturedData']['deviceMetrics']
  ): DeviceUsagePattern {
    // Update brightness settings
    current.brightnessSettings.push(deviceMetrics.brightness);
    if (current.brightnessSettings.length > 100) {
      current.brightnessSettings = current.brightnessSettings.slice(-100);
    }

    // Update volume settings
    current.volumeSettings.push(deviceMetrics.volume);
    if (current.volumeSettings.length > 100) {
      current.volumeSettings = current.volumeSettings.slice(-100);
    }

    // Update orientation preference (simplified)
    if (deviceMetrics.orientation === 'portrait' || deviceMetrics.orientation === 'landscape') {
      current.orientationPreference = deviceMetrics.orientation;
    }

    return current;
  }

  private updateAppPattern(
    current: AppUsagePattern,
    appUsage: BiometricSession['capturedData']['appUsage']
  ): AppUsagePattern {
    // Update launch sequence
    const launches = appUsage.filter(a => a.action === 'launch').map(a => a.appName);
    current.launchSequence.push(...launches);
    if (current.launchSequence.length > 100) {
      current.launchSequence = current.launchSequence.slice(-100);
    }

    // Update session durations
    appUsage.forEach(usage => {
      if (usage.duration) {
        if (!current.sessionDurations[usage.appName]) {
          current.sessionDurations[usage.appName] = [];
        }
        current.sessionDurations[usage.appName].push(usage.duration);
        
        // Keep only recent durations
        if (current.sessionDurations[usage.appName].length > 50) {
          current.sessionDurations[usage.appName] = current.sessionDurations[usage.appName].slice(-50);
        }
      }
    });

    return current;
  }

  private updateTemporalPattern(current: TemporalPattern, session: BiometricSession): TemporalPattern {
    const sessionHour = new Date(session.startTime).getHours();
    const sessionDay = new Date(session.startTime).getDay();

    // Update active hours
    if (!current.activeHours.includes(sessionHour)) {
      current.activeHours.push(sessionHour);
    }

    // Update weekly pattern
    if (sessionDay >= 1 && sessionDay <= 5) { // Weekday
      current.weeklyPattern.weekdayUsage[sessionDay - 1]++;
    } else { // Weekend
      const weekendIndex = sessionDay === 0 ? 1 : 0; // Sunday = 1, Saturday = 0
      current.weeklyPattern.weekendUsage[weekendIndex]++;
    }

    return current;
  }

  private calculateProfileConfidence(profile: BiometricProfile): number {
    let confidence = 0;

    // Base confidence from number of sessions
    const sessionConfidence = Math.min(profile.sessionsAnalyzed / this.MINIMUM_SESSIONS, 1) * 0.3;
    confidence += sessionConfidence;

    // Typing pattern confidence
    if (profile.patterns.typing.keystrokeTimings.dwellTimes.length > 50) {
      confidence += 0.2;
    }

    // Touch pattern confidence
    if (profile.patterns.touch.gestures.tapPressure.length > 50) {
      confidence += 0.2;
    }

    // Device pattern confidence
    if (profile.patterns.device.brightnessSettings.length > 10) {
      confidence += 0.1;
    }

    // App pattern confidence
    if (profile.patterns.app.launchSequence.length > 20) {
      confidence += 0.1;
    }

    // Temporal pattern confidence
    if (profile.patterns.temporal.activeHours.length > 3) {
      confidence += 0.1;
    }

    return Math.min(confidence, 1);
  }

  private calculateAnomalyScore(profile: BiometricProfile, session: BiometricSession): number {
    // Combine session anomalies with historical trend
    const sessionAnomalies = session.anomalies.filter(a => a.severity === 'high').length;
    const sessionAnomalyScore = Math.min(sessionAnomalies * 0.2, 1);

    // Exponential moving average with previous anomaly score
    const alpha = 0.3; // Learning rate
    return alpha * sessionAnomalyScore + (1 - alpha) * profile.anomalyScore;
  }

  private identifyRiskFactors(profile: BiometricProfile, session: BiometricSession): string[] {
    const riskFactors: string[] = [];

    // Session-based risk factors
    session.anomalies.forEach(anomaly => {
      if (anomaly.severity === 'high' && anomaly.confidence > 0.8) {
        riskFactors.push(anomaly.description);
      }
    });

    // Pattern-based risk factors
    if (profile.patterns.typing.keystrokeTimings.averageDwellTime < 50) {
      riskFactors.push('Unusually fast typing patterns');
    }

    if (profile.patterns.device.orientationPreference === 'landscape' && 
        profile.patterns.touch.gestures.tapPressure.every(p => p < 0.1)) {
      riskFactors.push('Possible emulator usage patterns');
    }

    // Remove duplicates and limit to top 10
    return [...new Set(riskFactors)].slice(0, 10);
  }

  async verifyUser(userId: string, sessionId: string): Promise<BiometricVerificationResult> {
    const profile = this.profiles.get(userId);
    const session = this.sessions.get(sessionId);

    if (!profile || !session) {
      return {
        isAuthentic: false,
        confidence: 0,
        similarityScore: 0,
        analysisBreakdown: {
          typing: { score: 0, weight: 0 },
          touch: { score: 0, weight: 0 },
          device: { score: 0, weight: 0 },
          app: { score: 0, weight: 0 },
          location: { score: 0, weight: 0 },
          temporal: { score: 0, weight: 0 }
        },
        anomalies: ['Profile or session not found'],
        riskFactors: [],
        recommendation: 'block',
        explanation: 'Unable to verify user identity'
      };
    }

    if (!profile.isEstablished) {
      return {
        isAuthentic: true,
        confidence: 0.5,
        similarityScore: 0.5,
        analysisBreakdown: {
          typing: { score: 0.5, weight: 0.1 },
          touch: { score: 0.5, weight: 0.1 },
          device: { score: 0.5, weight: 0.1 },
          app: { score: 0.5, weight: 0.1 },
          location: { score: 0.5, weight: 0.1 },
          temporal: { score: 0.5, weight: 0.1 }
        },
        anomalies: [],
        riskFactors: ['Insufficient historical data'],
        recommendation: 'allow',
        explanation: 'Profile still being established - monitoring for patterns'
      };
    }

    // Perform detailed biometric comparison
    const analysisBreakdown = await this.performBiometricAnalysis(profile, session);
    
    // Calculate overall similarity score
    const weights = [
      analysisBreakdown.typing.weight,
      analysisBreakdown.touch.weight,
      analysisBreakdown.device.weight,
      analysisBreakdown.app.weight,
      analysisBreakdown.location.weight,
      analysisBreakdown.temporal.weight
    ];

    const scores = [
      analysisBreakdown.typing.score,
      analysisBreakdown.touch.score,
      analysisBreakdown.device.score,
      analysisBreakdown.app.score,
      analysisBreakdown.location.score,
      analysisBreakdown.temporal.score
    ];

    const weightedSum = scores.reduce((sum, score, i) => sum + score * weights[i], 0);
    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
    const similarityScore = totalWeight > 0 ? weightedSum / totalWeight : 0;

    const isAuthentic = similarityScore >= this.SIMILARITY_THRESHOLD;
    const confidence = this.calculateVerificationConfidence(similarityScore, profile, session);

    // Determine recommendation
    let recommendation: BiometricVerificationResult['recommendation'];
    if (similarityScore >= 0.9) {
      recommendation = 'allow';
    } else if (similarityScore >= 0.75) {
      recommendation = 'challenge';
    } else if (similarityScore >= 0.5) {
      recommendation = 'investigate';
    } else {
      recommendation = 'block';
    }

    // Collect anomalies
    const anomalies = session.anomalies.map(a => a.description);

    return {
      isAuthentic,
      confidence,
      similarityScore,
      analysisBreakdown,
      anomalies,
      riskFactors: profile.riskFactors,
      recommendation,
      explanation: this.generateVerificationExplanation(similarityScore, analysisBreakdown, anomalies)
    };
  }

  private async performBiometricAnalysis(
    profile: BiometricProfile, 
    session: BiometricSession
  ): Promise<BiometricVerificationResult['analysisBreakdown']> {
    const breakdown = {
      typing: { score: 0, weight: 0 },
      touch: { score: 0, weight: 0 },
      device: { score: 0, weight: 0 },
      app: { score: 0, weight: 0 },
      location: { score: 0, weight: 0 },
      temporal: { score: 0, weight: 0 }
    };

    // Typing analysis
    if (session.capturedData.keystrokes.length > 10 && profile.patterns.typing.keystrokeTimings.dwellTimes.length > 0) {
      breakdown.typing.score = this.compareTypingPatterns(profile.patterns.typing, session.capturedData.keystrokes);
      breakdown.typing.weight = 0.3;
    }

    // Touch analysis
    if (session.capturedData.touchEvents.length > 20 && profile.patterns.touch.gestures.tapPressure.length > 0) {
      breakdown.touch.score = this.compareTouchPatterns(profile.patterns.touch, session.capturedData.touchEvents);
      breakdown.touch.weight = 0.25;
    }

    // Device analysis
    breakdown.device.score = this.compareDevicePatterns(profile.patterns.device, session.capturedData.deviceMetrics);
    breakdown.device.weight = 0.15;

    // App analysis
    if (session.capturedData.appUsage.length > 5 && profile.patterns.app.launchSequence.length > 0) {
      breakdown.app.score = this.compareAppPatterns(profile.patterns.app, session.capturedData.appUsage);
      breakdown.app.weight = 0.15;
    }

    // Location analysis (simplified - would need GPS data)
    breakdown.location.score = 0.8; // Default reasonable score
    breakdown.location.weight = 0.05;

    // Temporal analysis
    breakdown.temporal.score = this.compareTemporalPatterns(profile.patterns.temporal, session);
    breakdown.temporal.weight = 0.1;

    return breakdown;
  }

  private compareTypingPatterns(
    profilePattern: TypingPattern,
    sessionKeystrokes: BiometricSession['capturedData']['keystrokes']
  ): number {
    const sessionDwellTimes = sessionKeystrokes.map(k => k.dwellTime);
    const sessionAvgDwellTime = sessionDwellTimes.reduce((sum, time) => sum + time, 0) / sessionDwellTimes.length;

    // Compare average dwell times
    const dwellTimeDiff = Math.abs(sessionAvgDwellTime - profilePattern.keystrokeTimings.averageDwellTime);
    const dwellTimeScore = Math.max(0, 1 - dwellTimeDiff / 100); // Normalize by 100ms

    // Compare typing rhythm (consistency)
    const sessionDwellTimeVar = this.calculateVariation(sessionDwellTimes);
    const profileDwellTimeVar = this.calculateVariation(profilePattern.keystrokeTimings.dwellTimes);
    const rhythmDiff = Math.abs(sessionDwellTimeVar - profileDwellTimeVar);
    const rhythmScore = Math.max(0, 1 - rhythmDiff);

    return (dwellTimeScore + rhythmScore) / 2;
  }

  private compareTouchPatterns(
    profilePattern: TouchPattern,
    sessionTouchEvents: BiometricSession['capturedData']['touchEvents']
  ): number {
    const sessionTaps = sessionTouchEvents.filter(e => e.type === 'tap');
    const sessionPressures = sessionTaps.map(t => t.pressure);
    
    if (sessionPressures.length === 0) return 0.5;

    const sessionAvgPressure = sessionPressures.reduce((sum, p) => sum + p, 0) / sessionPressures.length;
    
    // Compare average pressures
    const pressureDiff = Math.abs(sessionAvgPressure - profilePattern.fingerGeometry.averagePressure);
    const pressureScore = Math.max(0, 1 - pressureDiff);

    // Compare touch sizes
    const sessionSizes = sessionTouchEvents.map(e => e.size);
    const sessionAvgSize = sessionSizes.reduce((sum, s) => sum + s, 0) / sessionSizes.length;
    const profileAvgSize = profilePattern.fingerGeometry.touchSize.reduce((sum, s) => sum + s, 0) / profilePattern.fingerGeometry.touchSize.length;
    
    const sizeDiff = Math.abs(sessionAvgSize - profileAvgSize);
    const sizeScore = Math.max(0, 1 - sizeDiff / 50); // Normalize by 50 pixels

    return (pressureScore + sizeScore) / 2;
  }

  private compareDevicePatterns(
    profilePattern: DeviceUsagePattern,
    sessionMetrics: BiometricSession['capturedData']['deviceMetrics']
  ): number {
    let score = 0;
    let factors = 0;

    // Compare brightness
    if (profilePattern.brightnessSettings.length > 0) {
      const profileAvgBrightness = profilePattern.brightnessSettings.reduce((sum, b) => sum + b, 0) / profilePattern.brightnessSettings.length;
      const brightnessDiff = Math.abs(sessionMetrics.brightness - profileAvgBrightness);
      score += Math.max(0, 1 - brightnessDiff / 100);
      factors++;
    }

    // Compare volume
    if (profilePattern.volumeSettings.length > 0) {
      const profileAvgVolume = profilePattern.volumeSettings.reduce((sum, v) => sum + v, 0) / profilePattern.volumeSettings.length;
      const volumeDiff = Math.abs(sessionMetrics.volume - profileAvgVolume);
      score += Math.max(0, 1 - volumeDiff / 100);
      factors++;
    }

    // Compare orientation
    if (profilePattern.orientationPreference === sessionMetrics.orientation) {
      score += 1;
    } else {
      score += 0.5; // Partial credit
    }
    factors++;

    return factors > 0 ? score / factors : 0.5;
  }

  private compareAppPatterns(
    profilePattern: AppUsagePattern,
    sessionAppUsage: BiometricSession['capturedData']['appUsage']
  ): string {
    const sessionApps = [...new Set(sessionAppUsage.map(a => a.appName))];
    const profileApps = [...new Set(profilePattern.launchSequence)];

    // Calculate Jaccard similarity
    const intersection = sessionApps.filter(app => profileApps.includes(app));
    const union = [...new Set([...sessionApps, ...profileApps])];
    
    return union.length > 0 ? intersection.length / union.length : 0;
  }

  private compareTemporalPatterns(
    profilePattern: TemporalPattern,
    session: BiometricSession
  ): number {
    const sessionHour = new Date(session.startTime).getHours();
    
    // Check if session hour is in user's typical active hours
    const isInActiveHours = profilePattern.activeHours.includes(sessionHour);
    
    // Check proximity to active hours
    let minDistance = 24;
    profilePattern.activeHours.forEach(hour => {
      const distance = Math.min(
        Math.abs(sessionHour - hour),
        24 - Math.abs(sessionHour - hour)
      );
      minDistance = Math.min(minDistance, distance);
    });

    // Score based on how close to typical active hours
    if (isInActiveHours) return 1;
    if (minDistance <= 2) return 0.8;
    if (minDistance <= 4) return 0.6;
    return 0.3;
  }

  private calculateVerificationConfidence(
    similarityScore: number,
    profile: BiometricProfile,
    session: BiometricSession
  ): number {
    let confidence = similarityScore;

    // Boost confidence based on profile maturity
    confidence *= profile.confidence;

    // Reduce confidence based on anomalies
    const highSeverityAnomalies = session.anomalies.filter(a => a.severity === 'high').length;
    confidence *= Math.max(0.3, 1 - highSeverityAnomalies * 0.2);

    // Reduce confidence based on profile anomaly score
    confidence *= Math.max(0.3, 1 - profile.anomalyScore);

    return Math.min(Math.max(confidence, 0), 1);
  }

  private generateVerificationExplanation(
    similarityScore: number,
    breakdown: BiometricVerificationResult['analysisBreakdown'],
    anomalies: string[]
  ): string {
    const scorePercentage = Math.round(similarityScore * 100);
    
    if (similarityScore >= 0.9) {
      return `Strong biometric match (${scorePercentage}%). User behavior patterns are highly consistent with established profile.`;
    } else if (similarityScore >= 0.75) {
      return `Good biometric match (${scorePercentage}%). Some minor variations in behavior patterns detected. Additional verification recommended.`;
    } else if (similarityScore >= 0.5) {
      return `Moderate biometric match (${scorePercentage}%). Significant deviations in behavior patterns. Investigation recommended.`;
    } else {
      return `Poor biometric match (${scorePercentage}%). Behavior patterns do not match established profile. ${anomalies.length > 0 ? 'Anomalies detected: ' + anomalies.slice(0, 2).join(', ') : ''}`;
    }
  }

  async createDigitalFingerprint(
    deviceId: string,
    hardwareInfo: any,
    softwareInfo: any,
    networkInfo: any
  ): Promise<string> {
    const fingerprint: DigitalFingerprint = {
      deviceId,
      hardwareFingerprint: {
        screenResolution: hardwareInfo.screenResolution || 'unknown',
        colorDepth: hardwareInfo.colorDepth || 24,
        pixelRatio: hardwareInfo.pixelRatio || 1,
        cpuCores: hardwareInfo.cpuCores || 4,
        memoryGB: hardwareInfo.memoryGB || 4,
        platform: hardwareInfo.platform || 'unknown',
        architecture: hardwareInfo.architecture || 'unknown'
      },
      softwareFingerprint: {
        userAgent: softwareInfo.userAgent || 'unknown',
        language: softwareInfo.language || 'en',
        timezone: softwareInfo.timezone || 'UTC',
        plugins: softwareInfo.plugins || [],
        fonts: softwareInfo.fonts || [],
        webglRenderer: softwareInfo.webglRenderer || 'unknown',
        audioContext: softwareInfo.audioContext || 'unknown'
      },
      behavioralFingerprint: {
        mouseMovement: {
          averageSpeed: 0,
          acceleration: [],
          clickPatterns: [],
          scrollBehavior: { speed: 0, direction: 'vertical' }
        },
        keyboardSignature: 'pending',
        touchSignature: 'pending',
        appUsageSignature: 'pending'
      },
      networkFingerprint: {
        ipAddress: networkInfo.ipAddress || 'unknown',
        isp: networkInfo.isp || 'unknown',
        connectionType: networkInfo.connectionType || 'unknown',
        bandwidth: networkInfo.bandwidth || 0,
        latency: networkInfo.latency || 0,
        dns: networkInfo.dns || []
      },
      entropy: 0,
      createdAt: Date.now(),
      lastSeen: Date.now(),
      associatedUsers: [],
      riskScore: 0
    };

    // Calculate entropy (uniqueness)
    fingerprint.entropy = this.calculateFingerprintEntropy(fingerprint);

    // Calculate initial risk score
    fingerprint.riskScore = this.calculateFingerprintRiskScore(fingerprint);

    this.digitalFingerprints.set(deviceId, fingerprint);

    logger.info(`Created digital fingerprint: ${deviceId} (entropy: ${fingerprint.entropy.toFixed(2)})`);
    return deviceId;
  }

  private calculateFingerprintEntropy(fingerprint: DigitalFingerprint): number {
    // Calculate entropy based on uniqueness of various components
    let entropy = 0;

    // Hardware entropy
    const resolutionEntropy = this.calculateStringEntropy(fingerprint.hardwareFingerprint.screenResolution);
    entropy += resolutionEntropy * 0.2;

    // Software entropy
    const userAgentEntropy = this.calculateStringEntropy(fingerprint.softwareFingerprint.userAgent);
    entropy += userAgentEntropy * 0.3;

    const pluginsEntropy = fingerprint.softwareFingerprint.plugins.length * 0.1;
    entropy += Math.min(pluginsEntropy, 2);

    const fontsEntropy = fingerprint.softwareFingerprint.fonts.length * 0.05;
    entropy += Math.min(fontsEntropy, 1);

    // Network entropy
    const networkEntropy = this.calculateStringEntropy(fingerprint.networkFingerprint.ipAddress + fingerprint.networkFingerprint.isp);
    entropy += networkEntropy * 0.2;

    return Math.min(entropy, 10); // Cap at 10 bits
  }

  private calculateStringEntropy(str: string): number {
    const charCounts = new Map<string, number>();
    for (const char of str) {
      charCounts.set(char, (charCounts.get(char) || 0) + 1);
    }

    let entropy = 0;
    for (const count of charCounts.values()) {
      const probability = count / str.length;
      entropy -= probability * Math.log2(probability);
    }

    return entropy;
  }

  private calculateFingerprintRiskScore(fingerprint: DigitalFingerprint): number {
    let riskScore = 0;

    // Check for suspicious hardware characteristics
    if (fingerprint.hardwareFingerprint.screenResolution === '1024x768') {
      riskScore += 0.3; // Common emulator resolution
    }

    // Check for suspicious software characteristics
    if (fingerprint.softwareFingerprint.userAgent.includes('HeadlessChrome')) {
      riskScore += 0.5; // Headless browser
    }

    if (fingerprint.softwareFingerprint.plugins.length === 0) {
      riskScore += 0.2; // No plugins unusual
    }

    // Check for VPN/proxy indicators
    if (fingerprint.networkFingerprint.isp.includes('VPN') || 
        fingerprint.networkFingerprint.isp.includes('Proxy')) {
      riskScore += 0.4;
    }

    // Low entropy indicates potential fingerprint spoofing
    if (fingerprint.entropy < 3) {
      riskScore += 0.3;
    }

    return Math.min(riskScore, 1);
  }

  // Public API methods
  getUserProfile(userId: string): BiometricProfile | null {
    return this.profiles.get(userId) || null;
  }

  getDigitalFingerprint(deviceId: string): DigitalFingerprint | null {
    return this.digitalFingerprints.get(deviceId) || null;
  }

  getActiveSession(userId: string): BiometricSession | null {
    const sessionId = this.activeSessions.get(userId);
    return sessionId ? this.sessions.get(sessionId) || null : null;
  }

  getAllUserProfiles(): BiometricProfile[] {
    return Array.from(this.profiles.values());
  }

  private cleanOldSessions(): void {
    const now = Date.now();
    let cleaned = 0;

    this.sessions.forEach((session, sessionId) => {
      if (session.endTime > 0 && (now - session.endTime) > this.MAX_SESSION_AGE) {
        this.sessions.delete(sessionId);
        cleaned++;
      }
    });

    if (cleaned > 0) {
      logger.debug(`Cleaned ${cleaned} old biometric sessions`);
    }
  }

  private updateProfiles(): void {
    // Periodic profile updates and optimizations
    this.profiles.forEach(profile => {
      // Update confidence based on recent activity
      const timeSinceLastUpdate = Date.now() - profile.lastUpdated;
      if (timeSinceLastUpdate > 7 * 24 * 60 * 60 * 1000) { // 7 days
        profile.confidence *= 0.95; // Slight confidence decay
      }
    });
  }

  getBiometricStats(): {
    totalProfiles: number;
    establishedProfiles: number;
    activeSessions: number;
    digitalFingerprints: number;
    averageConfidence: number;
  } {
    const establishedProfiles = Array.from(this.profiles.values()).filter(p => p.isEstablished).length;
    const totalConfidence = Array.from(this.profiles.values()).reduce((sum, p) => sum + p.confidence, 0);
    const averageConfidence = this.profiles.size > 0 ? totalConfidence / this.profiles.size : 0;

    return {
      totalProfiles: this.profiles.size,
      establishedProfiles,
      activeSessions: this.activeSessions.size,
      digitalFingerprints: this.digitalFingerprints.size,
      averageConfidence
    };
  }
}

export const behavioralBiometricsEngine = BehavioralBiometricsEngine.getInstance();
export type {
  BiometricProfile,
  BiometricSession,
  BiometricVerificationResult,
  DigitalFingerprint,
  TypingPattern,
  TouchPattern
};
export default BehavioralBiometricsEngine;