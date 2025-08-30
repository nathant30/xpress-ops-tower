'use client';

interface MLFeatures {
  // User behavior features
  user: {
    id: string;
    accountAge: number; // days
    totalRides: number;
    avgRidesPerDay: number;
    cancelationRate: number;
    ratingAverage: number;
    ratingCount: number;
    recentComplaints: number;
    deviceChanges: number;
    locationConsistency: number; // 0-1 score
  };
  
  // Trip features
  trip: {
    id: string;
    distance: number; // km
    duration: number; // minutes
    price: number;
    timeOfDay: number; // hour 0-23
    dayOfWeek: number; // 0-6
    isWeekend: boolean;
    isHoliday: boolean;
    routeDeviation: number; // 0-1 score
    speedAnomaly: number; // 0-1 score
    waitTime: number; // minutes
  };
  
  // Location features
  location: {
    pickupRegion: 'manila' | 'cebu' | 'davao';
    dropoffRegion: 'manila' | 'cebu' | 'davao';
    pickupRiskScore: number; // 0-1
    dropoffRiskScore: number; // 0-1
    routeRiskScore: number; // 0-1
    gpsAccuracy: number; // meters
    locationJumps: number;
    impossibleSpeeds: number;
  };
  
  // Payment features
  payment: {
    method: 'cash' | 'card' | 'wallet' | 'corporate';
    cardFailures: number;
    paymentDelays: number;
    unusualAmounts: boolean;
    chargebackHistory: number;
    paymentVelocity: number; // payments per hour
  };
  
  // Device features
  device: {
    fingerprint: string;
    platform: string;
    appVersion: string;
    isRooted: boolean;
    isEmulator: boolean;
    vpnUsage: boolean;
    multipleAccounts: number;
    deviceAge: number; // days
  };
  
  // Network features
  network: {
    ipAddress: string;
    ipRiskScore: number; // 0-1
    countryCode: string;
    isVpn: boolean;
    isProxy: boolean;
    isTor: boolean;
    connectionType: string;
    networkChanges: number;
  };
}

interface MLPrediction {
  fraudScore: number; // 0-1
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  confidence: number; // 0-1
  reasons: string[];
  modelVersion: string;
  timestamp: number;
  features: {
    topPositive: Array<{ feature: string; importance: number }>;
    topNegative: Array<{ feature: string; importance: number }>;
  };
}

interface ModelPerformance {
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  auc: number;
  falsePositiveRate: number;
  falseNegativeRate: number;
  threshold: number;
  lastUpdated: number;
  sampleSize: number;
}

interface FraudPattern {
  id: string;
  name: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  occurrences: number;
  firstSeen: number;
  lastSeen: number;
  affectedUsers: string[];
  characteristics: {
    behavioral: string[];
    temporal: string[];
    geographical: string[];
    financial: string[];
  };
  riskFactors: Array<{
    factor: string;
    weight: number;
    description: string;
  }>;
}

class MLFraudDetectionEngine {
  private static instance: MLFraudDetectionEngine;
  private models: Map<string, any> = new Map();
  private featureStats: Map<string, { mean: number; std: number; min: number; max: number }> = new Map();
  private modelPerformance: Map<string, ModelPerformance> = new Map();
  private detectedPatterns: Map<string, FraudPattern> = new Map();

  private constructor() {
    this.initializeModels();
    this.initializeFeatureStats();
    this.initializeKnownPatterns();
  }

  static getInstance(): MLFraudDetectionEngine {
    if (!MLFraudDetectionEngine.instance) {
      MLFraudDetectionEngine.instance = new MLFraudDetectionEngine();
    }
    return MLFraudDetectionEngine.instance;
  }

  private initializeModels(): void {
    // Initialize model performance metrics (in production, these would be loaded from model training)
    this.modelPerformance.set('ensemble_v2.1', {
      accuracy: 0.94,
      precision: 0.89,
      recall: 0.92,
      f1Score: 0.905,
      auc: 0.96,
      falsePositiveRate: 0.03,
      falseNegativeRate: 0.08,
      threshold: 0.75,
      lastUpdated: Date.now() - 86400000, // 1 day ago
      sampleSize: 1000000
    });

    this.modelPerformance.set('gps_spoofing_v1.3', {
      accuracy: 0.97,
      precision: 0.95,
      recall: 0.89,
      f1Score: 0.92,
      auc: 0.98,
      falsePositiveRate: 0.02,
      falseNegativeRate: 0.11,
      threshold: 0.80,
      lastUpdated: Date.now() - 172800000, // 2 days ago
      sampleSize: 500000
    });

    this.modelPerformance.set('multi_account_v1.1', {
      accuracy: 0.91,
      precision: 0.88,
      recall: 0.85,
      f1Score: 0.865,
      auc: 0.94,
      falsePositiveRate: 0.04,
      falseNegativeRate: 0.15,
      threshold: 0.70,
      lastUpdated: Date.now() - 259200000, // 3 days ago
      sampleSize: 750000
    });
  }

  private initializeFeatureStats(): void {
    // Initialize feature statistics for normalization
    const stats = [
      { feature: 'user.accountAge', mean: 365, std: 200, min: 0, max: 2000 },
      { feature: 'user.totalRides', mean: 120, std: 150, min: 0, max: 5000 },
      { feature: 'user.cancelationRate', mean: 0.08, std: 0.12, min: 0, max: 1 },
      { feature: 'trip.distance', mean: 15.5, std: 12.3, min: 0.1, max: 200 },
      { feature: 'trip.duration', mean: 35, std: 25, min: 1, max: 300 },
      { feature: 'trip.price', mean: 250, std: 180, min: 50, max: 2000 },
      { feature: 'location.gpsAccuracy', mean: 5.2, std: 8.1, min: 1, max: 100 },
      { feature: 'payment.cardFailures', mean: 0.3, std: 1.2, min: 0, max: 50 },
      { feature: 'device.deviceAge', mean: 180, std: 120, min: 0, max: 1000 }
    ];

    stats.forEach(stat => {
      this.featureStats.set(stat.feature, {
        mean: stat.mean,
        std: stat.std,
        min: stat.min,
        max: stat.max
      });
    });
  }

  private initializeKnownPatterns(): void {
    const patterns: FraudPattern[] = [
      {
        id: 'gps_teleportation',
        name: 'GPS Teleportation Pattern',
        description: 'Users making impossible location jumps indicating GPS spoofing',
        severity: 'critical',
        confidence: 0.95,
        occurrences: 1247,
        firstSeen: Date.now() - 7 * 24 * 60 * 60 * 1000,
        lastSeen: Date.now() - 3600000,
        affectedUsers: [],
        characteristics: {
          behavioral: ['Sudden location jumps >50km in <1min', 'Speed calculations >200km/h'],
          temporal: ['Pattern occurs during peak hours', 'Consistent timing with bonus periods'],
          geographical: ['Concentrated in Manila CBD', 'Airport to city center routes'],
          financial: ['High-value trips', 'Bonus eligibility patterns']
        },
        riskFactors: [
          { factor: 'Impossible speed', weight: 0.9, description: 'Movement speed exceeds physical limits' },
          { factor: 'Low GPS accuracy', weight: 0.7, description: 'Consistently poor GPS signal quality' },
          { factor: 'Bonus timing', weight: 0.8, description: 'Aligned with incentive periods' }
        ]
      },
      {
        id: 'coordinated_fake_rides',
        name: 'Coordinated Fake Ride Network',
        description: 'Groups of users creating fake rides for bonus collection',
        severity: 'high',
        confidence: 0.88,
        occurrences: 892,
        firstSeen: Date.now() - 14 * 24 * 60 * 60 * 1000,
        lastSeen: Date.now() - 7200000,
        affectedUsers: [],
        characteristics: {
          behavioral: ['Circular ride patterns', 'Unrealistic trip durations', 'Coordinated timing'],
          temporal: ['Late night activity spikes', 'Weekend concentration'],
          geographical: ['Same pickup/dropoff locations', 'Remote area concentration'],
          financial: ['Low fare amounts', 'Payment method clustering']
        },
        riskFactors: [
          { factor: 'Route circularity', weight: 0.85, description: 'Routes that return to origin' },
          { factor: 'User coordination', weight: 0.9, description: 'Synchronized behavior patterns' },
          { factor: 'Location clustering', weight: 0.75, description: 'Concentrated geographic activity' }
        ]
      },
      {
        id: 'device_farm_operation',
        name: 'Device Farm Multi-Account Pattern',
        description: 'Single device managing multiple accounts for fraud',
        severity: 'high',
        confidence: 0.92,
        occurrences: 445,
        firstSeen: Date.now() - 21 * 24 * 60 * 60 * 1000,
        lastSeen: Date.now() - 1800000,
        affectedUsers: [],
        characteristics: {
          behavioral: ['Rapid account switching', 'Identical behavioral patterns', 'Automated actions'],
          temporal: ['24/7 activity patterns', 'Precisely timed actions'],
          geographical: ['Single location multiple accounts', 'Limited geographical diversity'],
          financial: ['Payment method reuse', 'Systematic bonus claiming']
        },
        riskFactors: [
          { factor: 'Device fingerprint sharing', weight: 0.95, description: 'Multiple accounts on same device' },
          { factor: 'Behavioral similarity', weight: 0.8, description: 'Identical usage patterns' },
          { factor: 'Automation indicators', weight: 0.85, description: 'Non-human interaction patterns' }
        ]
      }
    ];

    patterns.forEach(pattern => {
      this.detectedPatterns.set(pattern.id, pattern);
    });
  }

  async predictFraud(features: MLFeatures): Promise<MLPrediction> {
    const normalizedFeatures = this.normalizeFeatures(features);
    
    // Ensemble model prediction (simulated)
    const ensembleScore = this.calculateEnsembleScore(normalizedFeatures);
    const gpsScore = this.calculateGPSSpoofingScore(normalizedFeatures);
    const multiAccountScore = this.calculateMultiAccountScore(normalizedFeatures);
    const incentiveScore = this.calculateIncentiveFraudScore(normalizedFeatures);

    // Combine scores with weights
    const finalScore = (
      ensembleScore * 0.4 +
      gpsScore * 0.25 +
      multiAccountScore * 0.2 +
      incentiveScore * 0.15
    );

    const riskLevel = this.scoreToRiskLevel(finalScore);
    const reasons = this.generateReasons(normalizedFeatures, {
      ensemble: ensembleScore,
      gps: gpsScore,
      multiAccount: multiAccountScore,
      incentive: incentiveScore
    });

    const featureImportance = this.calculateFeatureImportance(normalizedFeatures);

    return {
      fraudScore: Math.min(Math.max(finalScore, 0), 1),
      riskLevel,
      confidence: this.calculateConfidence(finalScore, normalizedFeatures),
      reasons,
      modelVersion: 'ensemble_v2.1',
      timestamp: Date.now(),
      features: featureImportance
    };
  }

  private normalizeFeatures(features: MLFeatures): Record<string, number> {
    const normalized: Record<string, number> = {};

    // Normalize user features
    normalized['user_account_age'] = this.normalizeFeature('user.accountAge', features.user.accountAge);
    normalized['user_total_rides'] = this.normalizeFeature('user.totalRides', features.user.totalRides);
    normalized['user_cancelation_rate'] = features.user.cancelationRate;
    normalized['user_rating'] = features.user.ratingAverage / 5.0;
    normalized['user_device_changes'] = Math.min(features.user.deviceChanges / 10, 1);
    normalized['user_location_consistency'] = features.user.locationConsistency;

    // Normalize trip features
    normalized['trip_distance'] = this.normalizeFeature('trip.distance', features.trip.distance);
    normalized['trip_duration'] = this.normalizeFeature('trip.duration', features.trip.duration);
    normalized['trip_price'] = this.normalizeFeature('trip.price', features.trip.price);
    normalized['trip_time_of_day'] = features.trip.timeOfDay / 24;
    normalized['trip_is_weekend'] = features.trip.isWeekend ? 1 : 0;
    normalized['trip_route_deviation'] = features.trip.routeDeviation;
    normalized['trip_speed_anomaly'] = features.trip.speedAnomaly;

    // Normalize location features
    normalized['location_gps_accuracy'] = this.normalizeFeature('location.gpsAccuracy', features.location.gpsAccuracy);
    normalized['location_jumps'] = Math.min(features.location.locationJumps / 10, 1);
    normalized['location_impossible_speeds'] = Math.min(features.location.impossibleSpeeds / 5, 1);
    normalized['location_pickup_risk'] = features.location.pickupRiskScore;
    normalized['location_dropoff_risk'] = features.location.dropoffRiskScore;

    // Normalize payment features
    normalized['payment_card_failures'] = this.normalizeFeature('payment.cardFailures', features.payment.cardFailures);
    normalized['payment_delays'] = Math.min(features.payment.paymentDelays / 5, 1);
    normalized['payment_unusual_amounts'] = features.payment.unusualAmounts ? 1 : 0;
    normalized['payment_velocity'] = Math.min(features.payment.paymentVelocity / 20, 1);

    // Normalize device features
    normalized['device_is_rooted'] = features.device.isRooted ? 1 : 0;
    normalized['device_is_emulator'] = features.device.isEmulator ? 1 : 0;
    normalized['device_vpn_usage'] = features.device.vpnUsage ? 1 : 0;
    normalized['device_multiple_accounts'] = Math.min(features.device.multipleAccounts / 10, 1);
    normalized['device_age'] = this.normalizeFeature('device.deviceAge', features.device.deviceAge);

    // Normalize network features
    normalized['network_ip_risk'] = features.network.ipRiskScore;
    normalized['network_is_vpn'] = features.network.isVpn ? 1 : 0;
    normalized['network_is_proxy'] = features.network.isProxy ? 1 : 0;
    normalized['network_changes'] = Math.min(features.network.networkChanges / 10, 1);

    return normalized;
  }

  private normalizeFeature(featureName: string, value: number): number {
    const stats = this.featureStats.get(featureName);
    if (!stats) return Math.min(Math.max(value, 0), 1);

    // Z-score normalization, then sigmoid to 0-1 range
    const zscore = (value - stats.mean) / stats.std;
    return 1 / (1 + Math.exp(-zscore));
  }

  private calculateEnsembleScore(features: Record<string, number>): number {
    // Simulated ensemble model prediction
    let score = 0;

    // High-risk indicators
    score += features['location_jumps'] * 0.15;
    score += features['location_impossible_speeds'] * 0.12;
    score += features['device_is_emulator'] * 0.10;
    score += features['device_multiple_accounts'] * 0.08;
    score += features['payment_card_failures'] * 0.06;
    score += features['trip_route_deviation'] * 0.07;
    score += features['network_is_vpn'] * 0.05;

    // Protective factors (reduce score)
    score -= features['user_rating'] * 0.03;
    score -= features['user_location_consistency'] * 0.04;

    // Add some randomness to simulate model uncertainty
    score += (Math.random() - 0.5) * 0.1;

    return Math.min(Math.max(score, 0), 1);
  }

  private calculateGPSSpoofingScore(features: Record<string, number>): number {
    let score = 0;

    score += features['location_jumps'] * 0.25;
    score += features['location_impossible_speeds'] * 0.30;
    score += features['location_gps_accuracy'] * 0.15; // Poor accuracy is suspicious
    score += features['trip_speed_anomaly'] * 0.20;
    score += features['device_is_rooted'] * 0.10;

    return Math.min(Math.max(score, 0), 1);
  }

  private calculateMultiAccountScore(features: Record<string, number>): number {
    let score = 0;

    score += features['device_multiple_accounts'] * 0.35;
    score += features['payment_card_failures'] * 0.20;
    score += features['user_device_changes'] * 0.15;
    score += features['network_changes'] * 0.15;
    score += features['device_is_emulator'] * 0.15;

    return Math.min(Math.max(score, 0), 1);
  }

  private calculateIncentiveFraudScore(features: Record<string, number>): number {
    let score = 0;

    score += features['trip_route_deviation'] * 0.25;
    score += features['payment_unusual_amounts'] * 0.20;
    score += features['trip_is_weekend'] * 0.10; // Weekend bonuses
    score += features['user_cancelation_rate'] * 0.15;
    score += features['location_pickup_risk'] * 0.15;
    score += features['location_dropoff_risk'] * 0.15;

    return Math.min(Math.max(score, 0), 1);
  }

  private scoreToRiskLevel(score: number): 'low' | 'medium' | 'high' | 'critical' {
    if (score >= 0.8) return 'critical';
    if (score >= 0.6) return 'high';
    if (score >= 0.3) return 'medium';
    return 'low';
  }

  private generateReasons(features: Record<string, number>, scores: Record<string, number>): string[] {
    const reasons: string[] = [];

    // GPS spoofing indicators
    if (features['location_jumps'] > 0.7) {
      reasons.push('Multiple impossible location jumps detected');
    }
    if (features['location_impossible_speeds'] > 0.6) {
      reasons.push('Movement speeds exceed physical limits');
    }

    // Multi-account indicators
    if (features['device_multiple_accounts'] > 0.5) {
      reasons.push('Device associated with multiple accounts');
    }
    if (features['device_is_emulator'] > 0.5) {
      reasons.push('Device appears to be an emulator');
    }

    // Payment fraud indicators
    if (features['payment_card_failures'] > 0.6) {
      reasons.push('High rate of payment failures');
    }
    if (features['payment_unusual_amounts'] > 0.5) {
      reasons.push('Unusual payment amounts detected');
    }

    // Route and behavior indicators
    if (features['trip_route_deviation'] > 0.7) {
      reasons.push('Significant route deviations from optimal path');
    }
    if (features['user_cancelation_rate'] > 0.8) {
      reasons.push('Unusually high trip cancellation rate');
    }

    // Network security indicators
    if (features['network_is_vpn'] > 0.5 || features['network_is_proxy'] > 0.5) {
      reasons.push('Connection through VPN or proxy detected');
    }

    // High-level model scores
    if (scores.gps > 0.7) {
      reasons.push('GPS spoofing model indicates high risk');
    }
    if (scores.multiAccount > 0.7) {
      reasons.push('Multi-account fraud model indicates high risk');
    }

    return reasons.slice(0, 5); // Return top 5 reasons
  }

  private calculateFeatureImportance(features: Record<string, number>) {
    const importance = Object.entries(features).map(([feature, value]) => ({
      feature,
      importance: value,
      impact: this.getFeatureImpact(feature, value)
    }));

    const sorted = importance.sort((a, b) => Math.abs(b.importance) - Math.abs(a.importance));

    return {
      topPositive: sorted
        .filter(f => f.importance > 0)
        .slice(0, 5)
        .map(f => ({ feature: f.feature, importance: f.importance })),
      topNegative: sorted
        .filter(f => f.importance < 0)
        .slice(0, 3)
        .map(f => ({ feature: f.feature, importance: Math.abs(f.importance) }))
    };
  }

  private getFeatureImpact(feature: string, value: number): string {
    const impacts: Record<string, string> = {
      'location_jumps': 'Location inconsistencies',
      'device_multiple_accounts': 'Device sharing patterns',
      'payment_card_failures': 'Payment reliability issues',
      'trip_route_deviation': 'Route optimization concerns',
      'user_rating': 'User reputation factor',
      'user_location_consistency': 'Behavioral consistency'
    };
    return impacts[feature] || 'Contributing factor';
  }

  private calculateConfidence(score: number, features: Record<string, number>): number {
    // Calculate confidence based on feature consistency and model agreement
    const featureCount = Object.keys(features).length;
    const nonZeroFeatures = Object.values(features).filter(v => v > 0.1).length;
    const featureConsistency = nonZeroFeatures / featureCount;
    
    // Higher scores with more consistent features = higher confidence
    const baseConfidence = score * featureConsistency;
    
    // Add some domain-specific confidence factors
    let confidenceBoost = 0;
    if (features['location_impossible_speeds'] > 0.8) confidenceBoost += 0.1;
    if (features['device_is_emulator'] > 0.8) confidenceBoost += 0.1;
    if (features['device_multiple_accounts'] > 0.7) confidenceBoost += 0.08;
    
    return Math.min(baseConfidence + confidenceBoost, 0.98);
  }

  // Pattern detection methods
  detectPatterns(recentPredictions: MLPrediction[]): FraudPattern[] {
    const detectedPatterns: FraudPattern[] = [];

    // Update existing patterns
    this.updatePatternOccurrences(recentPredictions);

    // Return active patterns with recent activity
    const activePatterns = Array.from(this.detectedPatterns.values())
      .filter(pattern => Date.now() - pattern.lastSeen < 24 * 60 * 60 * 1000) // Active in last 24h
      .sort((a, b) => b.confidence - a.confidence);

    return activePatterns;
  }

  private updatePatternOccurrences(predictions: MLPrediction[]): void {
    predictions.forEach(prediction => {
      if (prediction.fraudScore > 0.6) {
        // Check which patterns this prediction matches
        this.detectedPatterns.forEach((pattern, patternId) => {
          if (this.matchesPattern(prediction, pattern)) {
            pattern.occurrences++;
            pattern.lastSeen = prediction.timestamp;
            this.detectedPatterns.set(patternId, pattern);
          }
        });
      }
    });
  }

  private matchesPattern(prediction: MLPrediction, pattern: FraudPattern): boolean {
    // Simple pattern matching logic (in production, this would be more sophisticated)
    if (pattern.id === 'gps_teleportation') {
      return prediction.reasons.some(reason => 
        reason.includes('location jumps') || reason.includes('impossible speeds')
      );
    }
    if (pattern.id === 'coordinated_fake_rides') {
      return prediction.reasons.some(reason => 
        reason.includes('route deviation') || reason.includes('unusual amounts')
      );
    }
    if (pattern.id === 'device_farm_operation') {
      return prediction.reasons.some(reason => 
        reason.includes('multiple accounts') || reason.includes('emulator')
      );
    }
    return false;
  }

  // Model performance monitoring
  getModelPerformance(): Map<string, ModelPerformance> {
    return new Map(this.modelPerformance);
  }

  updateModelPerformance(modelName: string, performance: Partial<ModelPerformance>): void {
    const existing = this.modelPerformance.get(modelName);
    if (existing) {
      this.modelPerformance.set(modelName, { ...existing, ...performance });
    }
  }

  // Feature engineering utilities
  extractFeatures(rawData: any): MLFeatures {
    // This would extract features from raw trip/user data
    // For now, return mock features
    return {
      user: {
        id: rawData.userId || 'unknown',
        accountAge: rawData.user?.accountAge || Math.floor(Math.random() * 1000),
        totalRides: rawData.user?.totalRides || Math.floor(Math.random() * 500),
        avgRidesPerDay: rawData.user?.avgRidesPerDay || Math.random() * 5,
        cancelationRate: rawData.user?.cancelationRate || Math.random() * 0.3,
        ratingAverage: rawData.user?.ratingAverage || 3 + Math.random() * 2,
        ratingCount: rawData.user?.ratingCount || Math.floor(Math.random() * 200),
        recentComplaints: rawData.user?.recentComplaints || Math.floor(Math.random() * 5),
        deviceChanges: rawData.user?.deviceChanges || Math.floor(Math.random() * 10),
        locationConsistency: rawData.user?.locationConsistency || Math.random()
      },
      trip: {
        id: rawData.tripId || 'unknown',
        distance: rawData.trip?.distance || Math.random() * 50,
        duration: rawData.trip?.duration || Math.random() * 120,
        price: rawData.trip?.price || 100 + Math.random() * 500,
        timeOfDay: rawData.trip?.timeOfDay || Math.floor(Math.random() * 24),
        dayOfWeek: rawData.trip?.dayOfWeek || Math.floor(Math.random() * 7),
        isWeekend: rawData.trip?.isWeekend || Math.random() > 0.7,
        isHoliday: rawData.trip?.isHoliday || Math.random() > 0.9,
        routeDeviation: rawData.trip?.routeDeviation || Math.random(),
        speedAnomaly: rawData.trip?.speedAnomaly || Math.random(),
        waitTime: rawData.trip?.waitTime || Math.random() * 15
      },
      location: {
        pickupRegion: rawData.location?.pickupRegion || 'manila',
        dropoffRegion: rawData.location?.dropoffRegion || 'manila',
        pickupRiskScore: rawData.location?.pickupRiskScore || Math.random(),
        dropoffRiskScore: rawData.location?.dropoffRiskScore || Math.random(),
        routeRiskScore: rawData.location?.routeRiskScore || Math.random(),
        gpsAccuracy: rawData.location?.gpsAccuracy || Math.random() * 20,
        locationJumps: rawData.location?.locationJumps || Math.floor(Math.random() * 5),
        impossibleSpeeds: rawData.location?.impossibleSpeeds || Math.floor(Math.random() * 3)
      },
      payment: {
        method: rawData.payment?.method || 'cash',
        cardFailures: rawData.payment?.cardFailures || Math.floor(Math.random() * 3),
        paymentDelays: rawData.payment?.paymentDelays || Math.floor(Math.random() * 2),
        unusualAmounts: rawData.payment?.unusualAmounts || Math.random() > 0.8,
        chargebackHistory: rawData.payment?.chargebackHistory || Math.floor(Math.random() * 2),
        paymentVelocity: rawData.payment?.paymentVelocity || Math.random() * 10
      },
      device: {
        fingerprint: rawData.device?.fingerprint || 'device_' + Math.random().toString(36),
        platform: rawData.device?.platform || 'android',
        appVersion: rawData.device?.appVersion || '2.1.0',
        isRooted: rawData.device?.isRooted || Math.random() > 0.9,
        isEmulator: rawData.device?.isEmulator || Math.random() > 0.95,
        vpnUsage: rawData.device?.vpnUsage || Math.random() > 0.8,
        multipleAccounts: rawData.device?.multipleAccounts || Math.floor(Math.random() * 5),
        deviceAge: rawData.device?.deviceAge || Math.floor(Math.random() * 1000)
      },
      network: {
        ipAddress: rawData.network?.ipAddress || '127.0.0.1',
        ipRiskScore: rawData.network?.ipRiskScore || Math.random(),
        countryCode: rawData.network?.countryCode || 'PH',
        isVpn: rawData.network?.isVpn || Math.random() > 0.85,
        isProxy: rawData.network?.isProxy || Math.random() > 0.9,
        isTor: rawData.network?.isTor || Math.random() > 0.99,
        connectionType: rawData.network?.connectionType || 'cellular',
        networkChanges: rawData.network?.networkChanges || Math.floor(Math.random() * 3)
      }
    };
  }
}

export const mlFraudEngine = MLFraudDetectionEngine.getInstance();
export type { MLFeatures, MLPrediction, ModelPerformance, FraudPattern };
export default MLFraudDetectionEngine;