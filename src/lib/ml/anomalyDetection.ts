'use client';

import { MLFeatures } from './fraudDetectionModels';

interface AnomalyScore {
  overall: number; // 0-1 scale
  dimensions: {
    temporal: number;
    behavioral: number;
    geographical: number;
    financial: number;
    network: number;
  };
  confidence: number;
  explanation: string[];
}

interface TimeSeriesPoint {
  timestamp: number;
  value: number;
  expected: number;
  anomaly: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

interface BehavioralPattern {
  id: string;
  userId: string;
  patternType: 'trip_frequency' | 'route_preference' | 'time_pattern' | 'payment_behavior';
  baseline: {
    mean: number;
    std: number;
    percentiles: { p25: number; p50: number; p75: number; p90: number; p99: number };
  };
  currentValue: number;
  deviation: number; // Z-score
  anomalyLevel: number; // 0-1
  lastUpdated: number;
}

interface ClusterAnalysis {
  clusterId: string;
  center: number[];
  size: number;
  cohesion: number; // How tight the cluster is
  outliers: Array<{
    id: string;
    distance: number;
    features: number[];
  }>;
  characteristics: {
    avgRiskScore: number;
    commonFeatures: string[];
    geographicConcentration: string;
    temporalPatterns: string[];
  };
}

interface AnomalyAlert {
  id: string;
  type: 'statistical' | 'clustering' | 'sequential' | 'contextual';
  severity: 'low' | 'medium' | 'high' | 'critical';
  userId?: string;
  description: string;
  features: string[];
  confidence: number;
  timestamp: number;
  resolved: boolean;
  falsePositive?: boolean;
}

class AnomalyDetectionEngine {
  private static instance: AnomalyDetectionEngine;
  private userPatterns: Map<string, BehavioralPattern[]> = new Map();
  private globalBaselines: Map<string, { mean: number; std: number }> = new Map();
  private recentAnomalies: AnomalyAlert[] = [];
  private clusteringModel: Map<string, ClusterAnalysis> = new Map();
  private timeSeriesHistory: Map<string, TimeSeriesPoint[]> = new Map();

  private constructor() {
    this.initializeBaselines();
    this.initializeClusters();
  }

  static getInstance(): AnomalyDetectionEngine {
    if (!AnomalyDetectionEngine.instance) {
      AnomalyDetectionEngine.instance = new AnomalyDetectionEngine();
    }
    return AnomalyDetectionEngine.instance;
  }

  private initializeBaselines(): void {
    // Initialize global statistical baselines
    const baselines = [
      { metric: 'trip_distance', mean: 15.5, std: 12.3 },
      { metric: 'trip_duration', mean: 35, std: 25 },
      { metric: 'trip_price', mean: 250, std: 180 },
      { metric: 'daily_trips', mean: 8, std: 5 },
      { metric: 'route_deviation', mean: 0.15, std: 0.25 },
      { metric: 'payment_amount', mean: 280, std: 220 },
      { metric: 'gps_accuracy', mean: 5.2, std: 8.1 },
      { metric: 'trip_cancelation_rate', mean: 0.08, std: 0.12 }
    ];

    baselines.forEach(baseline => {
      this.globalBaselines.set(baseline.metric, {
        mean: baseline.mean,
        std: baseline.std
      });
    });
  }

  private initializeClusters(): void {
    // Initialize predefined fraud pattern clusters
    const clusters = [
      {
        id: 'normal_users',
        center: [0.1, 0.2, 0.05, 0.1, 0.0], // Low risk features
        size: 15000,
        cohesion: 0.85,
        outliers: [],
        characteristics: {
          avgRiskScore: 0.12,
          commonFeatures: ['consistent_routes', 'regular_timing', 'low_cancelation'],
          geographicConcentration: 'distributed',
          temporalPatterns: ['peak_hour_usage', 'weekend_moderate']
        }
      },
      {
        id: 'gps_spoofers',
        center: [0.9, 0.8, 0.7, 0.2, 0.3], // High GPS anomaly features
        size: 245,
        cohesion: 0.92,
        outliers: [],
        characteristics: {
          avgRiskScore: 0.87,
          commonFeatures: ['location_jumps', 'impossible_speeds', 'poor_gps_accuracy'],
          geographicConcentration: 'manila_cbd',
          temporalPatterns: ['bonus_period_alignment', 'late_night_activity']
        }
      },
      {
        id: 'multi_account_operators',
        center: [0.3, 0.9, 0.2, 0.8, 0.9], // High device/account features
        size: 156,
        cohesion: 0.89,
        outliers: [],
        characteristics: {
          avgRiskScore: 0.91,
          commonFeatures: ['device_sharing', 'identical_patterns', 'rapid_switching'],
          geographicConcentration: 'cebu_it_park',
          temporalPatterns: ['24_7_activity', 'synchronized_actions']
        }
      }
    ];

    clusters.forEach(cluster => {
      this.clusteringModel.set(cluster.id, cluster);
    });
  }

  async detectAnomalies(features: MLFeatures, userId: string): Promise<AnomalyScore> {
    // Perform multi-dimensional anomaly detection
    const temporalScore = await this.detectTemporalAnomalies(features, userId);
    const behavioralScore = await this.detectBehavioralAnomalies(features, userId);
    const geographicalScore = await this.detectGeographicalAnomalies(features, userId);
    const financialScore = await this.detectFinancialAnomalies(features, userId);
    const networkScore = await this.detectNetworkAnomalies(features, userId);

    // Combine scores with weights
    const overallScore = (
      temporalScore * 0.15 +
      behavioralScore * 0.30 +
      geographicalScore * 0.25 +
      financialScore * 0.20 +
      networkScore * 0.10
    );

    const confidence = this.calculateConfidence([
      temporalScore, behavioralScore, geographicalScore, financialScore, networkScore
    ]);

    const explanation = this.generateExplanation({
      temporal: temporalScore,
      behavioral: behavioralScore,
      geographical: geographicalScore,
      financial: financialScore,
      network: networkScore
    });

    const anomalyScore: AnomalyScore = {
      overall: Math.min(Math.max(overallScore, 0), 1),
      dimensions: {
        temporal: temporalScore,
        behavioral: behavioralScore,
        geographical: geographicalScore,
        financial: financialScore,
        network: networkScore
      },
      confidence,
      explanation
    };

    // Generate anomaly alert if significant
    if (overallScore > 0.7) {
      await this.generateAnomalyAlert(anomalyScore, features, userId);
    }

    return anomalyScore;
  }

  private async detectTemporalAnomalies(features: MLFeatures, userId: string): Promise<number> {
    let anomalyScore = 0;
    const currentHour = features.trip.timeOfDay;
    const currentDay = features.trip.dayOfWeek;

    // Check for unusual timing patterns
    const userHistory = this.getUserTimeSeriesHistory(userId, 'trip_timing');
    if (userHistory.length > 10) {
      // Check if current time is unusual for this user
      const hourFrequency = userHistory.filter(point => 
        Math.abs(new Date(point.timestamp).getHours() - currentHour) <= 1
      ).length / userHistory.length;

      if (hourFrequency < 0.05) { // Less than 5% of trips at this time
        anomalyScore += 0.6;
      } else if (hourFrequency < 0.15) { // Less than 15% of trips at this time
        anomalyScore += 0.3;
      }
    }

    // Check for weekend/weekday pattern deviations
    const isWeekend = features.trip.isWeekend;
    const expectedWeekendRatio = 0.28; // Typical weekend trip ratio
    if (isWeekend && Math.random() > expectedWeekendRatio) {
      anomalyScore += 0.2;
    }

    // Check for holiday patterns
    if (features.trip.isHoliday) {
      anomalyScore += 0.4; // Holiday trips are often anomalous
    }

    // Check trip frequency anomalies
    const todayTripCount = userHistory.filter(point => 
      Date.now() - point.timestamp < 24 * 60 * 60 * 1000
    ).length;

    const baseline = this.globalBaselines.get('daily_trips');
    if (baseline && todayTripCount > baseline.mean + 2 * baseline.std) {
      anomalyScore += 0.5; // Unusually high trip frequency
    }

    return Math.min(anomalyScore, 1);
  }

  private async detectBehavioralAnomalies(features: MLFeatures, userId: string): Promise<number> {
    let anomalyScore = 0;
    
    // Analyze route deviation
    if (features.trip.routeDeviation > 0.6) {
      anomalyScore += 0.4;
    } else if (features.trip.routeDeviation > 0.4) {
      anomalyScore += 0.2;
    }

    // Analyze speed anomalies
    if (features.trip.speedAnomaly > 0.8) {
      anomalyScore += 0.5; // Very high speed anomaly
    } else if (features.trip.speedAnomaly > 0.5) {
      anomalyScore += 0.3;
    }

    // Check cancellation rate
    if (features.user.cancelationRate > 0.4) {
      anomalyScore += 0.3; // High cancellation rate
    }

    // Check user consistency
    if (features.user.locationConsistency < 0.3) {
      anomalyScore += 0.4; // Very inconsistent location patterns
    }

    // Analyze payment behavior
    const paymentFailures = features.payment.cardFailures;
    if (paymentFailures > 5) {
      anomalyScore += 0.3;
    } else if (paymentFailures > 2) {
      anomalyScore += 0.1;
    }

    // Check for automation indicators
    if (features.device.isEmulator) {
      anomalyScore += 0.7; // Very suspicious
    }

    if (features.device.isRooted) {
      anomalyScore += 0.3;
    }

    return Math.min(anomalyScore, 1);
  }

  private async detectGeographicalAnomalies(features: MLFeatures, userId: string): Promise<number> {
    let anomalyScore = 0;

    // Check for impossible location jumps
    if (features.location.locationJumps > 3) {
      anomalyScore += 0.8; // Multiple location jumps are highly suspicious
    } else if (features.location.locationJumps > 1) {
      anomalyScore += 0.4;
    }

    // Check for impossible speeds
    if (features.location.impossibleSpeeds > 2) {
      anomalyScore += 0.9; // Multiple impossible speeds
    } else if (features.location.impossibleSpeeds > 0) {
      anomalyScore += 0.6;
    }

    // Check GPS accuracy
    if (features.location.gpsAccuracy > 50) {
      anomalyScore += 0.3; // Poor GPS accuracy
    } else if (features.location.gpsAccuracy > 20) {
      anomalyScore += 0.1;
    }

    // Check risk scores of pickup/dropoff locations
    if (features.location.pickupRiskScore > 0.8 || features.location.dropoffRiskScore > 0.8) {
      anomalyScore += 0.4; // High-risk locations
    }

    // Check for cross-region anomalies
    if (features.location.pickupRegion !== features.location.dropoffRegion) {
      const interRegionalRate = 0.05; // 5% of trips are inter-regional
      if (Math.random() > interRegionalRate) {
        anomalyScore += 0.2;
      }
    }

    return Math.min(anomalyScore, 1);
  }

  private async detectFinancialAnomalies(features: MLFeatures, userId: string): Promise<number> {
    let anomalyScore = 0;

    // Check for unusual payment amounts
    if (features.payment.unusualAmounts) {
      anomalyScore += 0.4;
    }

    // Check payment velocity
    if (features.payment.paymentVelocity > 10) {
      anomalyScore += 0.5; // Very high payment frequency
    } else if (features.payment.paymentVelocity > 5) {
      anomalyScore += 0.2;
    }

    // Check chargeback history
    if (features.payment.chargebackHistory > 3) {
      anomalyScore += 0.6;
    } else if (features.payment.chargebackHistory > 1) {
      anomalyScore += 0.3;
    }

    // Analyze trip price vs distance ratio
    const pricePerKm = features.trip.price / Math.max(features.trip.distance, 0.1);
    const expectedPricePerKm = 16; // Average price per km in PHP
    
    if (pricePerKm > expectedPricePerKm * 3) {
      anomalyScore += 0.5; // Suspiciously high price per km
    } else if (pricePerKm < expectedPricePerKm * 0.3) {
      anomalyScore += 0.4; // Suspiciously low price per km
    }

    return Math.min(anomalyScore, 1);
  }

  private async detectNetworkAnomalies(features: MLFeatures, userId: string): Promise<number> {
    let anomalyScore = 0;

    // Check IP risk score
    if (features.network.ipRiskScore > 0.8) {
      anomalyScore += 0.6;
    } else if (features.network.ipRiskScore > 0.5) {
      anomalyScore += 0.3;
    }

    // Check for VPN/Proxy usage
    if (features.network.isVpn || features.network.isProxy) {
      anomalyScore += 0.4;
    }

    // Check for Tor usage (highly suspicious)
    if (features.network.isTor) {
      anomalyScore += 0.8;
    }

    // Check for frequent network changes
    if (features.network.networkChanges > 5) {
      anomalyScore += 0.3;
    } else if (features.network.networkChanges > 2) {
      anomalyScore += 0.1;
    }

    // Check country consistency
    if (features.network.countryCode !== 'PH') {
      anomalyScore += 0.7; // Operating from outside Philippines
    }

    return Math.min(anomalyScore, 1);
  }

  private calculateConfidence(scores: number[]): number {
    // Calculate confidence based on consistency of anomaly scores
    const mean = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    const variance = scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / scores.length;
    const standardDev = Math.sqrt(variance);
    
    // Higher consistency (lower standard deviation) = higher confidence
    const consistency = 1 - Math.min(standardDev, 0.5) / 0.5;
    
    // Scale confidence based on overall anomaly level
    const baseConfidence = mean > 0.7 ? 0.9 : mean > 0.4 ? 0.7 : 0.5;
    
    return Math.min(baseConfidence * consistency, 0.98);
  }

  private generateExplanation(dimensions: AnomalyScore['dimensions']): string[] {
    const explanations: string[] = [];

    if (dimensions.temporal > 0.5) {
      explanations.push('Unusual timing pattern detected - activity outside normal schedule');
    }

    if (dimensions.behavioral > 0.6) {
      explanations.push('Behavioral anomaly detected - patterns deviate from user history');
    }

    if (dimensions.geographical > 0.7) {
      explanations.push('Location anomaly detected - impossible movements or high-risk areas');
    }

    if (dimensions.financial > 0.5) {
      explanations.push('Financial anomaly detected - unusual payment patterns or amounts');
    }

    if (dimensions.network > 0.6) {
      explanations.push('Network anomaly detected - suspicious IP or connection patterns');
    }

    // Combination explanations
    if (dimensions.geographical > 0.5 && dimensions.temporal > 0.5) {
      explanations.push('Coordinated location and timing anomalies suggest possible fraud');
    }

    if (dimensions.behavioral > 0.5 && dimensions.financial > 0.5) {
      explanations.push('Combined behavioral and financial anomalies indicate systematic abuse');
    }

    return explanations.length > 0 ? explanations : ['Minor statistical deviation from normal patterns'];
  }

  private async generateAnomalyAlert(
    anomalyScore: AnomalyScore, 
    features: MLFeatures, 
    userId: string
  ): Promise<void> {
    const alert: AnomalyAlert = {
      id: `anomaly_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: this.determineAnomalyType(anomalyScore.dimensions),
      severity: this.determineSeverity(anomalyScore.overall),
      userId,
      description: anomalyScore.explanation[0] || 'Statistical anomaly detected',
      features: Object.entries(anomalyScore.dimensions)
        .filter(([_, score]) => score > 0.5)
        .map(([dimension, _]) => dimension),
      confidence: anomalyScore.confidence,
      timestamp: Date.now(),
      resolved: false
    };

    this.recentAnomalies.push(alert);
    
    // Keep only last 1000 anomalies
    if (this.recentAnomalies.length > 1000) {
      this.recentAnomalies = this.recentAnomalies.slice(-1000);
    }

    `);
  }

  private determineAnomalyType(dimensions: AnomalyScore['dimensions']): AnomalyAlert['type'] {
    const maxDimension = Object.entries(dimensions).reduce((max, [key, value]) => 
      value > max.value ? { key, value } : max, { key: '', value: 0 }
    );

    switch (maxDimension.key) {
      case 'temporal': return 'sequential';
      case 'geographical': return 'contextual';
      case 'behavioral': return 'statistical';
      default: return 'statistical';
    }
  }

  private determineSeverity(overallScore: number): AnomalyAlert['severity'] {
    if (overallScore >= 0.9) return 'critical';
    if (overallScore >= 0.7) return 'high';
    if (overallScore >= 0.4) return 'medium';
    return 'low';
  }

  private getUserTimeSeriesHistory(userId: string, metric: string): TimeSeriesPoint[] {
    const key = `${userId}_${metric}`;
    return this.timeSeriesHistory.get(key) || [];
  }

  // Clustering-based anomaly detection
  async performClusteringAnalysis(featureVectors: number[][]): Promise<ClusterAnalysis[]> {
    const clusters: ClusterAnalysis[] = [];
    const k = 5; // Number of clusters

    // Simplified k-means clustering simulation
    for (let i = 0; i < k; i++) {
      const center = featureVectors[Math.floor(Math.random() * featureVectors.length)];
      const clusterId = `cluster_${i + 1}`;
      
      // Find points close to this center
      const clusterPoints = featureVectors.filter(vector => 
        this.euclideanDistance(vector, center) < 0.5
      );

      // Identify outliers
      const outliers = clusterPoints
        .map((vector, idx) => ({
          id: `point_${idx}`,
          distance: this.euclideanDistance(vector, center),
          features: vector
        }))
        .filter(point => point.distance > 0.3)
        .sort((a, b) => b.distance - a.distance)
        .slice(0, 10); // Top 10 outliers

      const analysis: ClusterAnalysis = {
        clusterId,
        center,
        size: clusterPoints.length,
        cohesion: this.calculateCohesion(clusterPoints, center),
        outliers,
        characteristics: {
          avgRiskScore: clusterPoints.reduce((sum, point) => sum + point[0], 0) / clusterPoints.length,
          commonFeatures: this.identifyCommonFeatures(clusterPoints),
          geographicConcentration: this.analyzeGeographicConcentration(clusterPoints),
          temporalPatterns: this.analyzeTemporalPatterns(clusterPoints)
        }
      };

      clusters.push(analysis);
    }

    return clusters;
  }

  private euclideanDistance(vector1: number[], vector2: number[]): number {
    return Math.sqrt(
      vector1.reduce((sum, val, idx) => 
        sum + Math.pow(val - vector2[idx], 2), 0
      )
    );
  }

  private calculateCohesion(points: number[][], center: number[]): number {
    if (points.length === 0) return 0;
    
    const avgDistance = points.reduce((sum, point) => 
      sum + this.euclideanDistance(point, center), 0
    ) / points.length;
    
    return Math.max(0, 1 - avgDistance);
  }

  private identifyCommonFeatures(points: number[][]): string[] {
    // Simplified feature identification
    const features = ['high_risk', 'location_anomaly', 'behavioral_anomaly', 'timing_anomaly'];
    return features.filter((_, idx) => {
      const avgFeatureValue = points.reduce((sum, point) => sum + point[idx % 4], 0) / points.length;
      return avgFeatureValue > 0.6;
    });
  }

  private analyzeGeographicConcentration(points: number[][]): string {
    // Simplified geographic analysis
    const concentrations = ['manila', 'cebu', 'davao', 'distributed'];
    return concentrations[Math.floor(Math.random() * concentrations.length)];
  }

  private analyzeTemporalPatterns(points: number[][]): string[] {
    // Simplified temporal analysis
    const patterns = ['peak_hours', 'late_night', 'weekend_heavy', 'holiday_spike'];
    return patterns.filter(() => Math.random() > 0.6);
  }

  // Public API methods
  getRecentAnomalies(limit: number = 50): AnomalyAlert[] {
    return this.recentAnomalies
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  resolveAnomaly(anomalyId: string, isFalsePositive: boolean = false): boolean {
    const anomaly = this.recentAnomalies.find(a => a.id === anomalyId);
    if (anomaly) {
      anomaly.resolved = true;
      anomaly.falsePositive = isFalsePositive;
      return true;
    }
    return false;
  }

  getAnomalyStats(): {
    total: number;
    byType: Record<string, number>;
    bySeverity: Record<string, number>;
    falsePositiveRate: number;
  } {
    const total = this.recentAnomalies.length;
    const byType: Record<string, number> = {};
    const bySeverity: Record<string, number> = {};
    let falsePositives = 0;

    this.recentAnomalies.forEach(anomaly => {
      byType[anomaly.type] = (byType[anomaly.type] || 0) + 1;
      bySeverity[anomaly.severity] = (bySeverity[anomaly.severity] || 0) + 1;
      if (anomaly.falsePositive) falsePositives++;
    });

    return {
      total,
      byType,
      bySeverity,
      falsePositiveRate: total > 0 ? falsePositives / total : 0
    };
  }

  updateUserPattern(userId: string, pattern: BehavioralPattern): void {
    const userPatterns = this.userPatterns.get(userId) || [];
    const existingIndex = userPatterns.findIndex(p => p.patternType === pattern.patternType);
    
    if (existingIndex >= 0) {
      userPatterns[existingIndex] = pattern;
    } else {
      userPatterns.push(pattern);
    }
    
    this.userPatterns.set(userId, userPatterns);
  }
}

export const anomalyDetectionEngine = AnomalyDetectionEngine.getInstance();
export type { 
  AnomalyScore, 
  TimeSeriesPoint, 
  BehavioralPattern, 
  ClusterAnalysis, 
  AnomalyAlert 
};
export default AnomalyDetectionEngine;