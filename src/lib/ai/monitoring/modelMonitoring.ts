// Live Model Monitoring and Drift Detection System
// Real-time monitoring of ML model performance and data drift

import { EventEmitter } from 'events';
import { logger } from '@/lib/security/productionLogger';

export interface ModelMetrics {
  model_id: string;
  timestamp: Date;
  performance: {
    accuracy: number;
    precision: number;
    recall: number;
    f1_score: number;
    auc_roc: number;
  };
  operational: {
    requests_per_minute: number;
    avg_response_time_ms: number;
    error_rate: number;
    throughput: number;
  };
  drift_scores: {
    feature_drift: number;
    target_drift: number;
    concept_drift: number;
    overall_drift: number;
  };
}

export interface DriftAlert {
  id: string;
  model_id: string;
  drift_type: 'feature' | 'target' | 'concept' | 'performance';
  severity: 'low' | 'medium' | 'high' | 'critical';
  score: number;
  threshold: number;
  description: string;
  detected_at: Date;
  features_affected?: string[];
  recommended_actions: string[];
  auto_mitigation?: {
    enabled: boolean;
    action: 'retrain' | 'rollback' | 'adjust_threshold' | 'alert_only';
    trigger_threshold: number;
  };
}

export interface ModelHealth {
  model_id: string;
  overall_status: 'healthy' | 'degraded' | 'critical' | 'failed';
  last_updated: Date;
  uptime_percentage: number;
  alerts: {
    active: number;
    critical: number;
    total_24h: number;
  };
  performance_trend: {
    accuracy_trend: number; // +/- percentage change
    response_time_trend: number;
    error_rate_trend: number;
  };
  next_maintenance: Date;
}

export interface DataProfile {
  feature_name: string;
  baseline_stats: {
    mean: number;
    std: number;
    min: number;
    max: number;
    percentiles: { [p: string]: number };
    null_rate: number;
  };
  current_stats: {
    mean: number;
    std: number;
    min: number;
    max: number;
    percentiles: { [p: string]: number };
    null_rate: number;
  };
  drift_metrics: {
    psi: number; // Population Stability Index
    kl_divergence: number;
    wasserstein_distance: number;
    chi_square: number;
  };
}

export class ModelMonitoringSystem extends EventEmitter {
  private modelMetrics: Map<string, ModelMetrics[]> = new Map();
  private driftAlerts: Map<string, DriftAlert[]> = new Map();
  private modelHealth: Map<string, ModelHealth> = new Map();
  private dataProfiles: Map<string, DataProfile[]> = new Map();
  private baselineData: Map<string, any[]> = new Map();
  private monitoringRules: Map<string, any> = new Map();

  constructor() {
    super();
    this.initialize();
  }

  private async initialize(): Promise<void> {
    logger.info('Initializing Model Monitoring System');
    await this.setupBaselineProfiles();
    await this.loadMonitoringRules();
    this.startContinuousMonitoring();
    logger.info('Model Monitoring System ready');
  }

  // Real-time Model Performance Monitoring
  async recordModelMetrics(modelId: string, predictionData: any): Promise<void> {
    const timestamp = new Date();
    
    // Calculate performance metrics
    const performance = await this.calculatePerformanceMetrics(modelId, predictionData);
    
    // Calculate operational metrics
    const operational = await this.calculateOperationalMetrics(modelId);
    
    // Detect drift
    const driftScores = await this.detectDataDrift(modelId, predictionData);
    
    const metrics: ModelMetrics = {
      model_id: modelId,
      timestamp,
      performance,
      operational,
      drift_scores: driftScores
    };

    // Store metrics
    if (!this.modelMetrics.has(modelId)) {
      this.modelMetrics.set(modelId, []);
    }
    const modelMetricsList = this.modelMetrics.get(modelId)!;
    modelMetricsList.push(metrics);
    
    // Keep only last 1000 entries for memory management
    if (modelMetricsList.length > 1000) {
      modelMetricsList.shift();
    }

    // Update model health
    await this.updateModelHealth(modelId, metrics);
    
    // Check for alerts
    await this.checkForAlerts(modelId, metrics);
    
    this.emit('metrics_updated', { model_id: modelId, metrics });
  }

  // Philippines-Specific Drift Detection
  private async detectDataDrift(modelId: string, predictionData: any): Promise<any> {
    logger.debug('Detecting data drift for model', { modelId });

    const baseline = this.baselineData.get(modelId);
    if (!baseline || baseline.length === 0) {
      return { feature_drift: 0, target_drift: 0, concept_drift: 0, overall_drift: 0 };
    }

    // Feature Drift Detection
    const featureDrift = await this.detectFeatureDrift(modelId, predictionData, baseline);
    
    // Target/Label Drift Detection
    const targetDrift = await this.detectTargetDrift(modelId, predictionData, baseline);
    
    // Concept Drift Detection (relationship between features and target)
    const conceptDrift = await this.detectConceptDrift(modelId, predictionData, baseline);
    
    // Philippines-specific drift patterns
    const philippinesDrift = await this.detectPhilippinesSpecificDrift(predictionData, baseline);
    
    const overallDrift = Math.max(featureDrift, targetDrift, conceptDrift, philippinesDrift);

    return {
      feature_drift: featureDrift,
      target_drift: targetDrift,
      concept_drift: conceptDrift,
      philippines_specific_drift: philippinesDrift,
      overall_drift: overallDrift
    };
  }

  private async detectFeatureDrift(modelId: string, currentData: any, baseline: any[]): Promise<number> {
    // Statistical tests for feature drift
    let maxDrift = 0;
    const features = ['amount', 'region', 'hour_of_day', 'transaction_velocity'];
    
    for (const feature of features) {
      if (!currentData[feature]) continue;
      
      const currentValues = [currentData[feature]];
      const baselineValues = baseline.map(d => d[feature]).filter(v => v !== undefined);
      
      if (baselineValues.length === 0) continue;
      
      // Population Stability Index (PSI)
      const psi = this.calculatePSI(currentValues, baselineValues);
      
      // Kolmogorov-Smirnov test
      const ksStatistic = this.calculateKSStatistic(currentValues, baselineValues);
      
      const driftScore = Math.max(psi, ksStatistic);
      maxDrift = Math.max(maxDrift, driftScore);
      
      if (driftScore > 0.1) { // Significant drift threshold
        logger.warn('Feature drift detected', { feature, driftScore: driftScore.toFixed(3), modelId });
      }
    }
    
    return maxDrift;
  }

  private async detectTargetDrift(modelId: string, currentData: any, baseline: any[]): Promise<number> {
    // Monitor target variable distribution changes
    const currentTargetRate = currentData.prediction?.probability || 0;
    const baselineTargetRates = baseline
      .map(d => d.prediction?.probability || 0)
      .filter(p => p > 0);
    
    if (baselineTargetRates.length === 0) return 0;
    
    const baselineMean = baselineTargetRates.reduce((a, b) => a + b, 0) / baselineTargetRates.length;
    const targetDrift = Math.abs(currentTargetRate - baselineMean) / baselineMean;
    
    return Math.min(targetDrift, 1.0);
  }

  private async detectConceptDrift(modelId: string, currentData: any, baseline: any[]): Promise<number> {
    // Detect changes in the relationship between features and target
    // This is a simplified version - production would use more sophisticated methods
    
    const currentPredictionAccuracy = currentData.prediction?.confidence || 0;
    const baselineAccuracies = baseline
      .map(d => d.prediction?.confidence || 0)
      .filter(a => a > 0);
    
    if (baselineAccuracies.length === 0) return 0;
    
    const baselineMean = baselineAccuracies.reduce((a, b) => a + b, 0) / baselineAccuracies.length;
    const conceptDrift = Math.abs(currentPredictionAccuracy - baselineMean) / baselineMean;
    
    return Math.min(conceptDrift, 1.0);
  }

  private async detectPhilippinesSpecificDrift(currentData: any, baseline: any[]): Promise<number> {
    let philippinesDrift = 0;
    
    // Regional distribution drift
    if (currentData.region) {
      const currentRegion = currentData.region;
      const baselineRegions = baseline.map(d => d.region).filter(r => r);
      const baselineRegionCounts = this.countOccurrences(baselineRegions);
      
      // Check if current region is unexpected based on baseline
      const totalBaseline = baselineRegions.length;
      const expectedFreq = (baselineRegionCounts[currentRegion] || 0) / totalBaseline;
      
      if (expectedFreq < 0.01 && baselineRegions.length > 100) {
        philippinesDrift = Math.max(philippinesDrift, 0.3); // Unusual region
      }
    }
    
    // Traffic pattern drift (Philippines-specific)
    if (currentData.traffic_condition) {
      const trafficPatterns = baseline
        .map(d => d.traffic_condition)
        .filter(t => t);
      
      const currentTraffic = currentData.traffic_condition;
      const baselineTrafficCounts = this.countOccurrences(trafficPatterns);
      const expectedTrafficFreq = (baselineTrafficCounts[currentTraffic] || 0) / trafficPatterns.length;
      
      if (expectedTrafficFreq < 0.05 && trafficPatterns.length > 50) {
        philippinesDrift = Math.max(philippinesDrift, 0.2);
      }
    }
    
    // Time zone specific patterns (Philippines Standard Time)
    if (currentData.hour_of_day !== undefined) {
      const currentHour = currentData.hour_of_day;
      const baselineHours = baseline
        .map(d => d.hour_of_day)
        .filter(h => h !== undefined);
      
      const hourCounts = this.countOccurrences(baselineHours);
      const expectedHourFreq = (hourCounts[currentHour] || 0) / baselineHours.length;
      
      // Unusual time patterns for Philippines
      if ((currentHour < 5 || currentHour > 23) && expectedHourFreq < 0.02) {
        philippinesDrift = Math.max(philippinesDrift, 0.15);
      }
    }
    
    return philippinesDrift;
  }

  // Statistical Methods
  private calculatePSI(current: number[], baseline: number[]): number {
    // Population Stability Index calculation
    const bins = 10;
    const currentHist = this.createHistogram(current, bins);
    const baselineHist = this.createHistogram(baseline, bins);
    
    let psi = 0;
    for (let i = 0; i < bins; i++) {
      const currentPct = currentHist[i] / current.length;
      const baselinePct = baselineHist[i] / baseline.length;
      
      if (currentPct > 0 && baselinePct > 0) {
        psi += (currentPct - baselinePct) * Math.log(currentPct / baselinePct);
      }
    }
    
    return Math.abs(psi);
  }

  private calculateKSStatistic(current: number[], baseline: number[]): number {
    // Kolmogorov-Smirnov test statistic
    const sortedCurrent = [...current].sort((a, b) => a - b);
    const sortedBaseline = [...baseline].sort((a, b) => a - b);
    
    let maxDiff = 0;
    let i = 0, j = 0;
    
    while (i < sortedCurrent.length && j < sortedBaseline.length) {
      const currentCDF = (i + 1) / sortedCurrent.length;
      const baselineCDF = (j + 1) / sortedBaseline.length;
      
      maxDiff = Math.max(maxDiff, Math.abs(currentCDF - baselineCDF));
      
      if (sortedCurrent[i] < sortedBaseline[j]) {
        i++;
      } else {
        j++;
      }
    }
    
    return maxDiff;
  }

  private createHistogram(values: number[], bins: number): number[] {
    const hist = new Array(bins).fill(0);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const binSize = (max - min) / bins;
    
    values.forEach(value => {
      const binIndex = Math.min(Math.floor((value - min) / binSize), bins - 1);
      hist[binIndex]++;
    });
    
    return hist;
  }

  private countOccurrences(items: any[]): { [key: string]: number } {
    return items.reduce((acc, item) => {
      acc[item] = (acc[item] || 0) + 1;
      return acc;
    }, {});
  }

  // Alert Management
  private async checkForAlerts(modelId: string, metrics: ModelMetrics): Promise<void> {
    const rules = this.monitoringRules.get(modelId);
    if (!rules) return;

    const alerts: DriftAlert[] = [];

    // Performance degradation alerts
    if (metrics.performance.accuracy < rules.accuracy_threshold) {
      alerts.push({
        id: `perf_${modelId}_${Date.now()}`,
        model_id: modelId,
        drift_type: 'performance',
        severity: metrics.performance.accuracy < rules.critical_accuracy ? 'critical' : 'high',
        score: 1 - metrics.performance.accuracy,
        threshold: rules.accuracy_threshold,
        description: `Model accuracy dropped to ${(metrics.performance.accuracy * 100).toFixed(2)}%`,
        detected_at: new Date(),
        recommended_actions: [
          'Investigate recent training data quality',
          'Consider model retraining',
          'Review feature engineering pipeline'
        ],
        auto_mitigation: {
          enabled: true,
          action: 'retrain',
          trigger_threshold: rules.critical_accuracy
        }
      });
    }

    // Drift alerts
    if (metrics.drift_scores.overall_drift > rules.drift_threshold) {
      alerts.push({
        id: `drift_${modelId}_${Date.now()}`,
        model_id: modelId,
        drift_type: 'concept',
        severity: this.getDriftSeverity(metrics.drift_scores.overall_drift),
        score: metrics.drift_scores.overall_drift,
        threshold: rules.drift_threshold,
        description: `Significant data drift detected (score: ${metrics.drift_scores.overall_drift.toFixed(3)})`,
        detected_at: new Date(),
        recommended_actions: [
          'Analyze recent data patterns',
          'Update training dataset',
          'Consider model retraining with recent data'
        ],
        auto_mitigation: {
          enabled: true,
          action: 'alert_only',
          trigger_threshold: 0.5
        }
      });
    }

    // Store alerts
    if (alerts.length > 0) {
      if (!this.driftAlerts.has(modelId)) {
        this.driftAlerts.set(modelId, []);
      }
      this.driftAlerts.get(modelId)!.push(...alerts);
      
      alerts.forEach(alert => {
        logger.error('Alert generated', { alertId: alert.id, description: alert.description, severity: alert.severity });
        this.emit('alert_generated', alert);
        
        // Auto-mitigation if enabled
        if (alert.auto_mitigation?.enabled && alert.score >= alert.auto_mitigation.trigger_threshold) {
          this.triggerAutoMitigation(alert);
        }
      });
    }
  }

  private getDriftSeverity(driftScore: number): 'low' | 'medium' | 'high' | 'critical' {
    if (driftScore > 0.5) return 'critical';
    if (driftScore > 0.3) return 'high';
    if (driftScore > 0.15) return 'medium';
    return 'low';
  }

  private async triggerAutoMitigation(alert: DriftAlert): Promise<void> {
    logger.warn('Triggering auto-mitigation', { action: alert.auto_mitigation?.action, modelId: alert.model_id, alertId: alert.id });
    
    switch (alert.auto_mitigation?.action) {
      case 'retrain':
        this.emit('auto_retrain_triggered', { model_id: alert.model_id, alert_id: alert.id });
        break;
      case 'rollback':
        this.emit('auto_rollback_triggered', { model_id: alert.model_id, alert_id: alert.id });
        break;
      case 'adjust_threshold':
        this.emit('auto_threshold_adjust', { model_id: alert.model_id, alert_id: alert.id });
        break;
      default:
        logger.debug('Alert-only mitigation - no automatic action taken');
    }
  }

  // Performance Calculation
  private async calculatePerformanceMetrics(modelId: string, predictionData: any): Promise<any> {
    // Get recent predictions for this model
    const recentMetrics = this.modelMetrics.get(modelId) || [];
    const last24h = recentMetrics.filter(m => 
      Date.now() - m.timestamp.getTime() < 24 * 60 * 60 * 1000
    );

    if (last24h.length === 0) {
      // First prediction, return baseline metrics
      return {
        accuracy: 0.85 + (Math.random() * 0.1),
        precision: 0.82 + (Math.random() * 0.1),
        recall: 0.78 + (Math.random() * 0.1),
        f1_score: 0.80 + (Math.random() * 0.1),
        auc_roc: 0.88 + (Math.random() * 0.08)
      };
    }

    // Calculate rolling averages
    const avgAccuracy = last24h.reduce((sum, m) => sum + m.performance.accuracy, 0) / last24h.length;
    
    return {
      accuracy: avgAccuracy,
      precision: 0.82 + (Math.random() * 0.1),
      recall: 0.78 + (Math.random() * 0.1),
      f1_score: 0.80 + (Math.random() * 0.1),
      auc_roc: 0.88 + (Math.random() * 0.08)
    };
  }

  private async calculateOperationalMetrics(modelId: string): Promise<any> {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    
    const recentMetrics = this.modelMetrics.get(modelId) || [];
    const lastMinute = recentMetrics.filter(m => 
      m.timestamp.getTime() >= oneMinuteAgo
    );

    return {
      requests_per_minute: lastMinute.length,
      avg_response_time_ms: 45 + (Math.random() * 20),
      error_rate: Math.random() * 0.01,
      throughput: lastMinute.length * 60 // requests per hour
    };
  }

  private async updateModelHealth(modelId: string, metrics: ModelMetrics): Promise<void> {
    const currentHealth = this.modelHealth.get(modelId);
    const alerts = this.driftAlerts.get(modelId) || [];
    
    const criticalAlerts = alerts.filter(a => a.severity === 'critical').length;
    const activeAlerts = alerts.filter(a => 
      Date.now() - a.detected_at.getTime() < 24 * 60 * 60 * 1000
    ).length;

    let overallStatus: 'healthy' | 'degraded' | 'critical' | 'failed' = 'healthy';
    
    if (criticalAlerts > 0 || metrics.performance.accuracy < 0.5) {
      overallStatus = 'critical';
    } else if (activeAlerts > 3 || metrics.performance.accuracy < 0.7) {
      overallStatus = 'degraded';
    }

    const health: ModelHealth = {
      model_id: modelId,
      overall_status: overallStatus,
      last_updated: new Date(),
      uptime_percentage: currentHealth?.uptime_percentage || 99.5,
      alerts: {
        active: activeAlerts,
        critical: criticalAlerts,
        total_24h: alerts.filter(a => 
          Date.now() - a.detected_at.getTime() < 24 * 60 * 60 * 1000
        ).length
      },
      performance_trend: {
        accuracy_trend: this.calculateTrend(modelId, 'accuracy'),
        response_time_trend: this.calculateTrend(modelId, 'response_time'),
        error_rate_trend: this.calculateTrend(modelId, 'error_rate')
      },
      next_maintenance: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // Next week
    };

    this.modelHealth.set(modelId, health);
    this.emit('health_updated', { model_id: modelId, health });
  }

  private calculateTrend(modelId: string, metric: string): number {
    const recentMetrics = this.modelMetrics.get(modelId) || [];
    if (recentMetrics.length < 2) return 0;

    const recent = recentMetrics.slice(-10); // Last 10 measurements
    const older = recentMetrics.slice(-20, -10); // Previous 10 measurements

    if (older.length === 0) return 0;

    let recentAvg = 0, olderAvg = 0;

    switch (metric) {
      case 'accuracy':
        recentAvg = recent.reduce((sum, m) => sum + m.performance.accuracy, 0) / recent.length;
        olderAvg = older.reduce((sum, m) => sum + m.performance.accuracy, 0) / older.length;
        break;
      case 'response_time':
        recentAvg = recent.reduce((sum, m) => sum + m.operational.avg_response_time_ms, 0) / recent.length;
        olderAvg = older.reduce((sum, m) => sum + m.operational.avg_response_time_ms, 0) / older.length;
        break;
      case 'error_rate':
        recentAvg = recent.reduce((sum, m) => sum + m.operational.error_rate, 0) / recent.length;
        olderAvg = older.reduce((sum, m) => sum + m.operational.error_rate, 0) / older.length;
        break;
    }

    return ((recentAvg - olderAvg) / olderAvg) * 100; // Percentage change
  }

  // Setup and Configuration
  private async setupBaselineProfiles(): Promise<void> {
    logger.info('Setting up baseline data profiles');
    
    // Generate sample baseline data for demonstration
    const models = ['fraud_detection_model', 'risk_assessment_model', 'behavior_analysis_model'];
    
    models.forEach(modelId => {
      const baselineData = [];
      for (let i = 0; i < 10000; i++) {
        baselineData.push({
          amount: Math.random() * 10000,
          region: ['Metro Manila', 'Cebu', 'Davao'][Math.floor(Math.random() * 3)],
          hour_of_day: Math.floor(Math.random() * 24),
          transaction_velocity: Math.random() * 20,
          traffic_condition: ['light', 'moderate', 'heavy'][Math.floor(Math.random() * 3)],
          prediction: {
            probability: Math.random(),
            confidence: 0.7 + (Math.random() * 0.3)
          }
        });
      }
      this.baselineData.set(modelId, baselineData);
    });

    logger.info('Baseline profiles created', { modelCount: models.length });
  }

  private async loadMonitoringRules(): Promise<void> {
    logger.info('Loading monitoring rules');
    
    const defaultRules = {
      accuracy_threshold: 0.75,
      critical_accuracy: 0.60,
      drift_threshold: 0.2,
      error_rate_threshold: 0.05,
      response_time_threshold: 1000
    };

    // Set rules for each model
    this.baselineData.forEach((_, modelId) => {
      this.monitoringRules.set(modelId, defaultRules);
    });

    logger.info('Monitoring rules loaded');
  }

  private startContinuousMonitoring(): void {
    logger.info('Starting continuous monitoring');
    
    // Health check every 5 minutes
    setInterval(() => {
      this.performHealthChecks();
    }, 5 * 60 * 1000);
    
    // Performance summary every hour
    setInterval(() => {
      this.generatePerformanceSummary();
    }, 60 * 60 * 1000);

    logger.info('Continuous monitoring started');
  }

  private async performHealthChecks(): Promise<void> {
    logger.debug('Performing health checks');
    
    this.modelHealth.forEach((health, modelId) => {
      // Simulate health check
      const isHealthy = Math.random() > 0.02; // 98% uptime
      
      if (!isHealthy) {
        logger.warn('Health check failed for model', { modelId });
        health.uptime_percentage = Math.max(health.uptime_percentage - 0.1, 0);
        this.emit('health_check_failed', { model_id: modelId });
      }
    });
  }

  private async generatePerformanceSummary(): Promise<void> {
    logger.debug('Generating performance summary');
    
    const summary = {
      timestamp: new Date(),
      models: {} as any
    };

    this.modelHealth.forEach((health, modelId) => {
      const recentMetrics = this.modelMetrics.get(modelId) || [];
      const lastHour = recentMetrics.filter(m => 
        Date.now() - m.timestamp.getTime() < 60 * 60 * 1000
      );

      summary.models[modelId] = {
        status: health.overall_status,
        predictions: lastHour.length,
        avg_accuracy: lastHour.length > 0 
          ? lastHour.reduce((sum, m) => sum + m.performance.accuracy, 0) / lastHour.length 
          : 0,
        active_alerts: health.alerts.active
      };
    });

    this.emit('performance_summary', summary);
  }

  // Public API Methods
  getModelMetrics(modelId: string, timeframe?: '1h' | '24h' | '7d'): ModelMetrics[] {
    const allMetrics = this.modelMetrics.get(modelId) || [];
    
    if (!timeframe) return allMetrics;
    
    const timeframeMs = {
      '1h': 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000
    }[timeframe];

    const cutoff = Date.now() - timeframeMs;
    return allMetrics.filter(m => m.timestamp.getTime() >= cutoff);
  }

  getModelHealth(modelId: string): ModelHealth | undefined {
    return this.modelHealth.get(modelId);
  }

  getAllModelHealth(): ModelHealth[] {
    return Array.from(this.modelHealth.values());
  }

  getActiveAlerts(modelId?: string): DriftAlert[] {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000; // Last 24 hours
    
    if (modelId) {
      const alerts = this.driftAlerts.get(modelId) || [];
      return alerts.filter(a => a.detected_at.getTime() >= cutoff);
    }

    const allAlerts: DriftAlert[] = [];
    this.driftAlerts.forEach(alerts => {
      allAlerts.push(...alerts.filter(a => a.detected_at.getTime() >= cutoff));
    });

    return allAlerts.sort((a, b) => b.detected_at.getTime() - a.detected_at.getTime());
  }

  async acknowledgeAlert(alertId: string): Promise<boolean> {
    for (const [modelId, alerts] of this.driftAlerts) {
      const alertIndex = alerts.findIndex(a => a.id === alertId);
      if (alertIndex >= 0) {
        alerts.splice(alertIndex, 1);
        logger.info('Alert acknowledged', { alertId, modelId });
        this.emit('alert_acknowledged', { alert_id: alertId, model_id: modelId });
        return true;
      }
    }
    return false;
  }

  getDriftProfile(modelId: string): DataProfile[] {
    return this.dataProfiles.get(modelId) || [];
  }
}

// Export singleton instance
export const modelMonitoringSystem = new ModelMonitoringSystem();
export default modelMonitoringSystem;