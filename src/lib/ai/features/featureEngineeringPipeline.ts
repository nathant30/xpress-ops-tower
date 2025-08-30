// Real-Time Feature Engineering Pipeline
// High-performance feature processing for ML models in Philippines rideshare context

import { EventEmitter } from 'events';
import { logger } from '@/lib/security/productionLogger';
import { 
  UserProfile, 
  Transaction, 
  GeoCoordinates, 
  DeviceInfo, 
  NetworkInfo, 
  PhilippinesContext, 
  FeatureVector, 
  ProcessingMetrics, 
  StatisticalFeatures,
  LocationHistory,
  RiskIndicators,
  CacheEntry
} from '@/types/common';

export interface RawFeatureData {
  // User/Driver data
  user_id: string;
  driver_id?: string;
  session_id?: string;
  
  // Transaction data
  transaction: {
    amount: number;
    currency: string;
    payment_method: string;
    timestamp: Date;
    merchant_id?: string;
    merchant_category?: string;
  };
  
  // Location data
  location: {
    latitude: number;
    longitude: number;
    region: string;
    accuracy: number;
    speed?: number;
    bearing?: number;
    geofence_zones?: string[];
  };
  
  // Device data
  device: {
    fingerprint: string;
    type: string;
    os: string;
    ip_address: string;
    user_agent?: string;
  };
  
  // Context data
  context: {
    channel: string;
    referrer?: string;
    user_segment?: string;
    is_new_user: boolean;
    account_age_days: number;
  };
  
  // Philippines-specific data
  philippines_context?: {
    traffic_condition?: string;
    weather_condition?: string;
    is_holiday?: boolean;
    is_payday_period?: boolean;
    ltfrb_compliance_zone?: boolean;
  };
}

export interface ProcessedFeatures {
  // Identity features
  user_features: {
    account_age_days: number;
    is_new_user: boolean;
    user_risk_score: number;
    historical_transaction_count: number;
    avg_transaction_amount: number;
  };
  
  // Transaction features
  transaction_features: {
    amount_normalized: number;
    amount_zscore: number;
    amount_percentile: number;
    hour_of_day: number;
    day_of_week: number;
    is_weekend: boolean;
    is_business_hours: boolean;
    velocity_1h: number;
    velocity_24h: number;
    velocity_7d: number;
  };
  
  // Location features
  location_features: {
    region_encoded: number;
    region_risk_score: number;
    distance_from_home: number;
    unusual_location_score: number;
    geofence_violation_count: number;
    traffic_delay_factor: number;
    speed_anomaly_score: number;
  };
  
  // Device features
  device_features: {
    device_consistency_score: number;
    device_risk_score: number;
    ip_reputation_score: number;
    user_agent_risk_score: number;
    device_change_frequency: number;
  };
  
  // Behavioral features
  behavioral_features: {
    transaction_pattern_score: number;
    time_pattern_deviation: number;
    merchant_diversity_score: number;
    payment_method_consistency: number;
    session_behavior_score: number;
  };
  
  // Philippines-specific features
  philippines_features?: {
    regional_holiday_impact: number;
    payday_pattern_score: number;
    traffic_impact_score: number;
    weather_impact_score: number;
    ltfrb_compliance_score: number;
    gcash_paymaya_usage_pattern: number;
  };
  
  // Meta features
  meta: {
    feature_count: number;
    processing_time_ms: number;
    feature_quality_score: number;
    missing_feature_count: number;
    timestamp: Date;
  };
}

export interface FeatureStore {
  // User profiles
  user_profiles: Map<string, {
    first_seen: Date;
    transaction_history: number[];
    location_history: { lat: number; lng: number; timestamp: Date }[];
    device_history: string[];
    risk_indicators: { [key: string]: number };
  }>;
  
  // Aggregated statistics
  global_stats: {
    transaction_amounts: {
      mean: number;
      std: number;
      percentiles: { [p: string]: number };
    };
    regional_stats: Map<string, {
      avg_amount: number;
      fraud_rate: number;
      volume: number;
    }>;
    time_patterns: Map<number, number>; // hour -> transaction_count
  };
  
  // Reference data
  reference_data: {
    philippines_holidays: Set<string>;
    payday_dates: Set<string>;
    region_risk_scores: Map<string, number>;
    merchant_categories: Map<string, number>;
    geofence_definitions: Map<string, {
      coordinates: GeoCoordinates[];
      type: 'restricted' | 'allowed' | 'monitored';
      active: boolean;
    }>;
  };
}

export interface FeaturePipelineConfig {
  // Processing settings
  batch_size: number;
  timeout_ms: number;
  enable_caching: boolean;
  cache_ttl_seconds: number;
  
  // Feature engineering settings
  philippines_optimization: {
    enable_regional_features: boolean;
    enable_traffic_features: boolean;
    enable_weather_features: boolean;
    enable_holiday_features: boolean;
    enable_payday_features: boolean;
  };
  
  // Quality settings
  max_missing_features: number;
  min_quality_score: number;
  enable_feature_validation: boolean;
  
  // Performance settings
  enable_parallel_processing: boolean;
  max_concurrent_requests: number;
  enable_streaming: boolean;
}

export class FeatureEngineeringPipeline extends EventEmitter {
  private featureStore: FeatureStore;
  private config: FeaturePipelineConfig;
  private processingQueue: RawFeatureData[] = [];
  private isProcessing: boolean = false;
  private featureCache: Map<string, ProcessedFeatures> = new Map();
  private performanceMetrics: Map<string, {
    total_requests: number;
    avg_processing_time: number;
    max_processing_time: number;
    error_count: number;
  }> = new Map();

  constructor(config?: Partial<FeaturePipelineConfig>) {
    super();
    this.config = this.getDefaultConfig(config);
    this.featureStore = this.initializeFeatureStore();
    this.initialize();
  }

  private async initialize(): Promise<void> {
    logger.info('Initializing Feature Engineering Pipeline');
    await this.loadReferenceData();
    await this.loadUserProfiles();
    await this.computeGlobalStatistics();
    this.startBackgroundTasks();
    logger.info('Feature Engineering Pipeline ready');
  }

  // Main Feature Processing Entry Point
  async processFeatures(rawData: RawFeatureData): Promise<ProcessedFeatures> {
    const startTime = Date.now();
    logger.debug('Processing features for user', { userId: rawData.user_id });

    try {
      // Check cache first
      const cacheKey = this.generateCacheKey(rawData);
      if (this.config.enable_caching && this.featureCache.has(cacheKey)) {
        const cached = this.featureCache.get(cacheKey)!;
        const cacheAge = Date.now() - cached.meta.timestamp.getTime();
        if (cacheAge < this.config.cache_ttl_seconds * 1000) {
          logger.debug('Returning cached features for user', { userId: rawData.user_id });
          return cached;
        }
      }

      // Process features in parallel
      const [
        userFeatures,
        transactionFeatures,
        locationFeatures,
        deviceFeatures,
        behavioralFeatures,
        philippinesFeatures
      ] = await Promise.all([
        this.processUserFeatures(rawData),
        this.processTransactionFeatures(rawData),
        this.processLocationFeatures(rawData),
        this.processDeviceFeatures(rawData),
        this.processBehavioralFeatures(rawData),
        this.config.philippines_optimization.enable_regional_features ? 
          this.processPhilippinesFeatures(rawData) : Promise.resolve(undefined)
      ]);

      // Combine all features
      const processedFeatures: ProcessedFeatures = {
        user_features: userFeatures,
        transaction_features: transactionFeatures,
        location_features: locationFeatures,
        device_features: deviceFeatures,
        behavioral_features: behavioralFeatures,
        philippines_features: philippinesFeatures,
        meta: {
          feature_count: this.countFeatures({
            userFeatures,
            transactionFeatures,
            locationFeatures,
            deviceFeatures,
            behavioralFeatures,
            philippinesFeatures
          }),
          processing_time_ms: Date.now() - startTime,
          feature_quality_score: this.calculateFeatureQuality({
            userFeatures,
            transactionFeatures,
            locationFeatures,
            deviceFeatures,
            behavioralFeatures
          }),
          missing_feature_count: 0, // TODO: calculate
          timestamp: new Date()
        }
      };

      // Validate feature quality
      if (this.config.enable_feature_validation) {
        this.validateFeatures(processedFeatures);
      }

      // Cache the result
      if (this.config.enable_caching) {
        this.featureCache.set(cacheKey, processedFeatures);
      }

      // Update user profile
      await this.updateUserProfile(rawData, processedFeatures);

      // Update performance metrics
      this.updatePerformanceMetrics(rawData.user_id, Date.now() - startTime);

      this.emit('features_processed', {
        user_id: rawData.user_id,
        processing_time_ms: Date.now() - startTime,
        feature_count: processedFeatures.meta.feature_count
      });

      logger.info('Features processed for user', { userId: rawData.user_id, processingTimeMs: Date.now() - startTime });
      return processedFeatures;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Feature processing failed for user', { userId: rawData.user_id, error: errorMessage });
      this.emit('processing_error', { user_id: rawData.user_id, error: errorMessage });
      throw error;
    }
  }

  // User Feature Engineering
  private async processUserFeatures(rawData: RawFeatureData): Promise<{
    account_age_days: number;
    is_new_user: boolean;
    user_risk_score: number;
    historical_transaction_count: number;
    avg_transaction_amount: number;
  }> {
    const userProfile = this.featureStore.user_profiles.get(rawData.user_id);
    
    return {
      account_age_days: rawData.context.account_age_days,
      is_new_user: rawData.context.is_new_user,
      user_risk_score: this.calculateUserRiskScore(rawData, userProfile),
      historical_transaction_count: userProfile?.transaction_history.length || 0,
      avg_transaction_amount: userProfile 
        ? userProfile.transaction_history.reduce((a, b) => a + b, 0) / userProfile.transaction_history.length 
        : 0
    };
  }

  // Transaction Feature Engineering
  private async processTransactionFeatures(rawData: RawFeatureData): Promise<{
    amount_normalized: number;
    amount_zscore: number;
    amount_percentile: number;
    hour_of_day: number;
    day_of_week: number;
    is_weekend: boolean;
    is_business_hours: boolean;
    velocity_1h: number;
    velocity_24h: number;
    velocity_7d: number;
  }> {
    const amount = rawData.transaction.amount;
    const timestamp = rawData.transaction.timestamp;
    const globalStats = this.featureStore.global_stats;
    
    // Normalization and statistical features
    const amount_normalized = amount / 10000; // Scale to 0-1 range for Philippines context
    const amount_zscore = (amount - globalStats.transaction_amounts.mean) / globalStats.transaction_amounts.std;
    const amount_percentile = this.calculatePercentile(amount, globalStats.transaction_amounts.percentiles);
    
    // Time-based features
    const hour_of_day = timestamp.getHours();
    const day_of_week = timestamp.getDay();
    const is_weekend = day_of_week === 0 || day_of_week === 6;
    const is_business_hours = hour_of_day >= 8 && hour_of_day <= 18 && !is_weekend;
    
    // Velocity features
    const userProfile = this.featureStore.user_profiles.get(rawData.user_id);
    const velocity_1h = this.calculateVelocity(userProfile, 1);
    const velocity_24h = this.calculateVelocity(userProfile, 24);
    const velocity_7d = this.calculateVelocity(userProfile, 24 * 7);
    
    return {
      amount_normalized,
      amount_zscore,
      amount_percentile,
      hour_of_day,
      day_of_week,
      is_weekend,
      is_business_hours,
      velocity_1h,
      velocity_24h,
      velocity_7d
    };
  }

  // Location Feature Engineering (Philippines-Optimized)
  private async processLocationFeatures(rawData: RawFeatureData): Promise<{
    region_encoded: number;
    region_risk_score: number;
    distance_from_home: number;
    unusual_location_score: number;
    geofence_violation_count: number;
    traffic_delay_factor: number;
    speed_anomaly_score: number;
  }> {
    const location = rawData.location;
    const userProfile = this.featureStore.user_profiles.get(rawData.user_id);
    
    // Regional encoding
    const region_encoded = this.encodeRegion(location.region);
    const region_risk_score = this.featureStore.reference_data.region_risk_scores.get(location.region) || 0.5;
    
    // Distance calculations
    const distance_from_home = this.calculateDistanceFromHome(rawData.user_id, location);
    const unusual_location_score = this.calculateUnusualLocationScore(userProfile, location);
    
    // Geofence features
    const geofence_violation_count = this.countGeofenceViolations(location);
    
    // Philippines-specific location features
    const traffic_delay_factor = this.calculateTrafficDelayFactor(location, rawData.philippines_context);
    const speed_anomaly_score = this.calculateSpeedAnomalyScore(location, rawData.philippines_context);
    
    return {
      region_encoded,
      region_risk_score,
      distance_from_home,
      unusual_location_score,
      geofence_violation_count,
      traffic_delay_factor,
      speed_anomaly_score
    };
  }

  // Device Feature Engineering
  private async processDeviceFeatures(rawData: RawFeatureData): Promise<{
    device_consistency_score: number;
    device_risk_score: number;
    ip_reputation_score: number;
    user_agent_risk_score: number;
    device_change_frequency: number;
  }> {
    const device = rawData.device;
    const userProfile = this.featureStore.user_profiles.get(rawData.user_id);
    
    const device_consistency_score = this.calculateDeviceConsistency(userProfile, device);
    const device_risk_score = this.calculateDeviceRiskScore(device);
    const ip_reputation_score = await this.getIPReputationScore(device.ip_address);
    const user_agent_risk_score = this.calculateUserAgentRiskScore(device.user_agent);
    const device_change_frequency = this.calculateDeviceChangeFrequency(userProfile);
    
    return {
      device_consistency_score,
      device_risk_score,
      ip_reputation_score,
      user_agent_risk_score,
      device_change_frequency
    };
  }

  // Behavioral Feature Engineering
  private async processBehavioralFeatures(rawData: RawFeatureData): Promise<{
    transaction_pattern_score: number;
    time_pattern_deviation: number;
    merchant_diversity_score: number;
    payment_method_consistency: number;
    session_behavior_score: number;
  }> {
    const userProfile = this.featureStore.user_profiles.get(rawData.user_id);
    
    const transaction_pattern_score = this.calculateTransactionPatternScore(userProfile, rawData);
    const time_pattern_deviation = this.calculateTimePatternDeviation(userProfile, rawData);
    const merchant_diversity_score = this.calculateMerchantDiversityScore(userProfile);
    const payment_method_consistency = this.calculatePaymentMethodConsistency(userProfile, rawData);
    const session_behavior_score = this.calculateSessionBehaviorScore(rawData);
    
    return {
      transaction_pattern_score,
      time_pattern_deviation,
      merchant_diversity_score,
      payment_method_consistency,
      session_behavior_score
    };
  }

  // Philippines-Specific Feature Engineering
  private async processPhilippinesFeatures(rawData: RawFeatureData): Promise<{
    regional_holiday_impact: number;
    payday_pattern_score: number;
    traffic_impact_score: number;
    weather_impact_score: number;
    ltfrb_compliance_score: number;
    gcash_paymaya_usage_pattern: number;
  } | Record<string, never>> {
    if (!rawData.philippines_context) return {};
    
    const context = rawData.philippines_context;
    const timestamp = rawData.transaction.timestamp;
    
    // Holiday impact
    const regional_holiday_impact = this.calculateHolidayImpact(timestamp, rawData.location.region);
    
    // Payday patterns (15th and 30th in Philippines)
    const payday_pattern_score = this.calculatePaydayPatternScore(timestamp);
    
    // Traffic impact on behavior
    const traffic_impact_score = this.calculateTrafficImpactScore(context.traffic_condition);
    
    // Weather impact
    const weather_impact_score = this.calculateWeatherImpactScore(context.weather_condition);
    
    // LTFRB compliance
    const ltfrb_compliance_score = context.ltfrb_compliance_zone ? 1.0 : 0.0;
    
    // GCash/PayMaya usage patterns
    const gcash_paymaya_usage_pattern = this.calculateGCashPayMayaPattern(rawData);
    
    return {
      regional_holiday_impact,
      payday_pattern_score,
      traffic_impact_score,
      weather_impact_score,
      ltfrb_compliance_score,
      gcash_paymaya_usage_pattern
    };
  }

  // Feature Calculation Helper Methods
  private calculateUserRiskScore(rawData: RawFeatureData, userProfile: {
    first_seen: Date;
    transaction_history: number[];
    location_history: { lat: number; lng: number; timestamp: Date }[];
    device_history: string[];
    risk_indicators: RiskIndicators;
  } | undefined): number {
    let riskScore = 0.3; // Base risk
    
    // New user risk
    if (rawData.context.is_new_user) riskScore += 0.2;
    
    // Account age risk
    if (rawData.context.account_age_days < 30) riskScore += 0.1;
    
    // Historical behavior
    if (userProfile?.risk_indicators) {
      riskScore += Object.values(userProfile.risk_indicators)
        .filter((value): value is number => typeof value === 'number')
        .reduce((a, b) => a + b, 0) / 10;
    }
    
    return Math.min(riskScore, 1.0);
  }

  private calculatePercentile(value: number, percentiles: { [p: string]: number }): number {
    const sortedPercentiles = Object.keys(percentiles)
      .map(p => ({ percentile: parseInt(p), value: percentiles[p] }))
      .sort((a, b) => a.percentile - b.percentile);
    
    for (let i = 0; i < sortedPercentiles.length; i++) {
      if (value <= sortedPercentiles[i].value) {
        return sortedPercentiles[i].percentile;
      }
    }
    
    return 100;
  }

  private calculateVelocity(userProfile: {
    transaction_history: number[];
  } | undefined, hours: number): number {
    if (!userProfile?.transaction_history) return 0;
    
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
    // In real implementation, we'd have timestamps. For now, simulate
    return Math.min(userProfile.transaction_history.length / hours, 10); // Max 10 per hour
  }

  private encodeRegion(region: string): number {
    const regionEncoding: { [key: string]: number } = {
      'Metro Manila': 1,
      'Cebu': 2,
      'Davao': 3,
      'Baguio': 4,
      'Iloilo': 5,
      'Bacolod': 6,
      'Cagayan de Oro': 7,
      'Zamboanga': 8
    };
    
    return regionEncoding[region] || 0;
  }

  private calculateDistanceFromHome(userId: string, currentLocation: {
    latitude: number;
    longitude: number;
  }): number {
    const userProfile = this.featureStore.user_profiles.get(userId);
    if (!userProfile?.location_history || userProfile.location_history.length === 0) {
      return 0;
    }
    
    // Use most common location as "home"
    const homeLocation = userProfile.location_history[0]; // Simplified
    return this.calculateDistance(
      currentLocation.latitude, currentLocation.longitude,
      homeLocation.lat, homeLocation.lng
    );
  }

  private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  private calculateUnusualLocationScore(userProfile: {
    location_history: { lat: number; lng: number; timestamp: Date }[];
  } | undefined, location: {
    latitude: number;
    longitude: number;
  }): number {
    if (!userProfile?.location_history) return 1.0; // Unknown location = high risk
    
    const threshold = 10; // 10km threshold
    const nearbyLocations = userProfile.location_history.filter((loc: any) => 
      this.calculateDistance(location.latitude, location.longitude, loc.lat, loc.lng) < threshold
    );
    
    return 1.0 - (nearbyLocations.length / userProfile.location_history.length);
  }

  private countGeofenceViolations(location: {
    geofence_zones?: string[];
  }): number {
    // Check against defined geofences
    const violations = location.geofence_zones?.filter((zone: string) => 
      zone.includes('violation') || zone.includes('restricted')
    ) || [];
    
    return violations.length;
  }

  private calculateTrafficDelayFactor(location: GeoCoordinates, philippinesContext: {
    traffic_condition?: 'light' | 'moderate' | 'heavy' | 'severe';
  } | undefined): number {
    if (!philippinesContext?.traffic_condition) return 0;
    
    const trafficMultipliers = {
      'light': 0.1,
      'moderate': 0.3,
      'heavy': 0.6,
      'severe': 1.0
    };
    
    return trafficMultipliers[philippinesContext.traffic_condition as keyof typeof trafficMultipliers] || 0;
  }

  private calculateSpeedAnomalyScore(location: {
    speed?: number;
  }, philippinesContext: {
    traffic_condition?: 'light' | 'moderate' | 'heavy' | 'severe';
  } | undefined): number {
    if (!location.speed) return 0;
    
    // Philippines urban speed limits: 30-60 kmh
    const expectedSpeed = philippinesContext?.traffic_condition === 'heavy' ? 20 : 40;
    const speedDifference = Math.abs(location.speed - expectedSpeed);
    
    return Math.min(speedDifference / expectedSpeed, 1.0);
  }

  private calculateDeviceConsistency(userProfile: {
    device_history: string[];
  } | undefined, device: {
    fingerprint: string;
  }): number {
    if (!userProfile?.device_history) return 0.5; // Unknown = neutral
    
    const recentDevices = userProfile.device_history.slice(-5); // Last 5 devices
    const currentDeviceCount = recentDevices.filter((d: string) => d === device.fingerprint).length;
    
    return currentDeviceCount / recentDevices.length;
  }

  private calculateDeviceRiskScore(device: {
    type: string;
    user_agent?: string;
  }): number {
    let riskScore = 0;
    
    // High-risk device types
    if (device.type === 'emulator' || device.type === 'rooted') riskScore += 0.5;
    
    // Suspicious user agents
    if (device.user_agent?.includes('bot') || device.user_agent?.includes('crawler')) {
      riskScore += 0.3;
    }
    
    return Math.min(riskScore, 1.0);
  }

  private async getIPReputationScore(ipAddress: string): Promise<number> {
    // In production, integrate with IP reputation services
    // For now, simulate based on IP patterns
    
    const suspiciousPatterns = ['10.0.0', '192.168', '127.0.0'];
    const isSuspicious = suspiciousPatterns.some(pattern => ipAddress.startsWith(pattern));
    
    return isSuspicious ? 0.3 : 0.8; // Higher = better reputation
  }

  private calculateUserAgentRiskScore(userAgent?: string): number {
    if (!userAgent) return 0.5;
    
    const riskIndicators = ['bot', 'crawler', 'automated', 'headless'];
    const hasRiskIndicator = riskIndicators.some(indicator => 
      userAgent.toLowerCase().includes(indicator)
    );
    
    return hasRiskIndicator ? 0.8 : 0.1;
  }

  private calculateDeviceChangeFrequency(userProfile: {
    device_history: string[];
  } | undefined): number {
    if (!userProfile?.device_history || userProfile.device_history.length < 2) return 0;
    
    const uniqueDevices = new Set(userProfile.device_history).size;
    return uniqueDevices / userProfile.device_history.length;
  }

  private calculateTransactionPatternScore(userProfile: {
    transaction_history: number[];
  } | undefined, rawData: RawFeatureData): number {
    if (!userProfile?.transaction_history) return 0.5;
    
    const avgAmount = userProfile.transaction_history.reduce((a: number, b: number) => a + b, 0) / 
                     userProfile.transaction_history.length;
    const currentAmount = rawData.transaction.amount;
    
    const deviation = Math.abs(currentAmount - avgAmount) / avgAmount;
    return Math.max(0, 1 - deviation); // Higher = more consistent
  }

  private calculateTimePatternDeviation(userProfile: {
    transaction_history?: number[];
  } | undefined, rawData: RawFeatureData): number {
    // Calculate how unusual the current time is for this user
    const currentHour = rawData.transaction.timestamp.getHours();
    
    // In a real implementation, we'd analyze historical transaction times
    // For now, simulate based on business hours
    const businessHours = [9, 10, 11, 12, 13, 14, 15, 16, 17];
    const isBusinessHour = businessHours.includes(currentHour);
    
    return isBusinessHour ? 0.1 : 0.6; // Higher = more unusual
  }

  private calculateMerchantDiversityScore(userProfile: {
    transaction_history?: number[];
  } | undefined): number {
    // In a real implementation, track merchant variety
    return 0.5; // Placeholder
  }

  private calculatePaymentMethodConsistency(userProfile: {
    transaction_history?: number[];
  } | undefined, rawData: RawFeatureData): number {
    // Track payment method consistency
    return 0.8; // Placeholder - high consistency
  }

  private calculateSessionBehaviorScore(rawData: RawFeatureData): number {
    // Analyze session-level behavior patterns
    return 0.7; // Placeholder
  }

  // Philippines-Specific Calculations
  private calculateHolidayImpact(timestamp: Date, region: string): number {
    const dateString = timestamp.toISOString().split('T')[0];
    const isHoliday = this.featureStore.reference_data.philippines_holidays.has(dateString);
    
    if (!isHoliday) return 0;
    
    // Regional holiday impact multipliers
    const regionalMultipliers = {
      'Metro Manila': 1.2,
      'Cebu': 1.1,
      'Davao': 1.0,
      'default': 0.9
    };
    
    return regionalMultipliers[region as keyof typeof regionalMultipliers] || regionalMultipliers.default;
  }

  private calculatePaydayPatternScore(timestamp: Date): number {
    const day = timestamp.getDate();
    const isPayday = day === 15 || day === 30 || day === 31;
    
    if (!isPayday) return 0;
    
    // Payday periods have different transaction patterns
    return day === 15 ? 0.8 : 1.0; // 15th typically higher activity than 30th
  }

  private calculateTrafficImpactScore(trafficCondition?: string): number {
    if (!trafficCondition) return 0;
    
    const trafficScores = {
      'light': 0.1,
      'moderate': 0.3,
      'heavy': 0.6,
      'severe': 1.0
    };
    
    return trafficScores[trafficCondition as keyof typeof trafficScores] || 0;
  }

  private calculateWeatherImpactScore(weatherCondition?: string): number {
    if (!weatherCondition) return 0;
    
    const weatherScores = {
      'clear': 0.1,
      'cloudy': 0.2,
      'rainy': 0.6,
      'stormy': 1.0,
      'typhoon': 1.5
    };
    
    return Math.min(weatherScores[weatherCondition as keyof typeof weatherScores] || 0, 1.0);
  }

  private calculateGCashPayMayaPattern(rawData: RawFeatureData): number {
    const paymentMethod = rawData.transaction.payment_method.toLowerCase();
    
    if (paymentMethod.includes('gcash') || paymentMethod.includes('paymaya')) {
      return 1.0; // Popular in Philippines
    } else if (paymentMethod.includes('cash')) {
      return 0.8; // Also common
    } else if (paymentMethod.includes('card')) {
      return 0.5; // Less common but growing
    }
    
    return 0.3; // Other methods
  }

  // Utility Methods
  private countFeatures(features: Record<string, unknown>): number {
    let count = 0;
    
    const traverse = (obj: unknown) => {
      if (obj && typeof obj === 'object') {
        Object.values(obj).forEach(value => {
          if (typeof value === 'number' || typeof value === 'boolean') {
            count++;
          } else if (typeof value === 'object') {
            traverse(value);
          }
        });
      }
    };
    
    traverse(features);
    return count;
  }

  private calculateFeatureQuality(features: Record<string, unknown>): number {
    // Calculate overall feature quality score
    let qualityScore = 1.0;
    
    // Check for missing or invalid values
    const checkValues = (obj: Record<string, unknown>) => {
      Object.values(obj).forEach(value => {
        if (value === null || value === undefined || 
            (typeof value === 'number' && (isNaN(value) || !isFinite(value)))) {
          qualityScore -= 0.1;
        }
      });
    };
    
    Object.values(features).forEach(featureGroup => {
      if (typeof featureGroup === 'object' && featureGroup !== null) {
        checkValues(featureGroup as Record<string, unknown>);
      }
    });
    
    return Math.max(qualityScore, 0);
  }

  private validateFeatures(features: ProcessedFeatures): void {
    if (features.meta.feature_quality_score < this.config.min_quality_score) {
      throw new Error(`Feature quality too low: ${features.meta.feature_quality_score}`);
    }
    
    if (features.meta.missing_feature_count > this.config.max_missing_features) {
      throw new Error(`Too many missing features: ${features.meta.missing_feature_count}`);
    }
  }

  private generateCacheKey(rawData: RawFeatureData): string {
    const keyComponents = [
      rawData.user_id,
      rawData.transaction.amount,
      rawData.transaction.timestamp.toISOString().substr(0, 13), // Hour precision
      rawData.location.region,
      rawData.device.fingerprint
    ];
    
    return keyComponents.join('_');
  }

  private async updateUserProfile(rawData: RawFeatureData, processedFeatures: ProcessedFeatures): Promise<void> {
    let userProfile = this.featureStore.user_profiles.get(rawData.user_id);
    
    if (!userProfile) {
      userProfile = {
        first_seen: new Date(),
        transaction_history: [],
        location_history: [],
        device_history: [],
        risk_indicators: {}
      };
    }
    
    // Update transaction history
    userProfile.transaction_history.push(rawData.transaction.amount);
    if (userProfile.transaction_history.length > 100) {
      userProfile.transaction_history.shift(); // Keep last 100
    }
    
    // Update location history
    userProfile.location_history.push({
      lat: rawData.location.latitude,
      lng: rawData.location.longitude,
      timestamp: new Date()
    });
    if (userProfile.location_history.length > 50) {
      userProfile.location_history.shift(); // Keep last 50
    }
    
    // Update device history
    if (!userProfile.device_history.includes(rawData.device.fingerprint)) {
      userProfile.device_history.push(rawData.device.fingerprint);
      if (userProfile.device_history.length > 10) {
        userProfile.device_history.shift();
      }
    }
    
    // Update risk indicators
    userProfile.risk_indicators = {
      transaction_risk: processedFeatures.transaction_features.amount_zscore > 2 ? 1 : 0,
      location_risk: processedFeatures.location_features.unusual_location_score > 0.7 ? 1 : 0,
      device_risk: processedFeatures.device_features.device_risk_score > 0.5 ? 1 : 0,
      behavioral_risk: processedFeatures.behavioral_features.transaction_pattern_score < 0.3 ? 1 : 0
    };
    
    this.featureStore.user_profiles.set(rawData.user_id, userProfile);
  }

  private updatePerformanceMetrics(userId: string, processingTime: number): void {
    const metrics = this.performanceMetrics.get('global') || {
      total_requests: 0,
      avg_processing_time: 0,
      max_processing_time: 0,
      error_count: 0
    };
    
    metrics.total_requests++;
    metrics.avg_processing_time = (metrics.avg_processing_time * (metrics.total_requests - 1) + processingTime) / metrics.total_requests;
    metrics.max_processing_time = Math.max(metrics.max_processing_time, processingTime);
    
    this.performanceMetrics.set('global', metrics);
  }

  // Initialization Methods
  private getDefaultConfig(customConfig?: Partial<FeaturePipelineConfig>): FeaturePipelineConfig {
    return {
      batch_size: 100,
      timeout_ms: 1000,
      enable_caching: true,
      cache_ttl_seconds: 300,
      philippines_optimization: {
        enable_regional_features: true,
        enable_traffic_features: true,
        enable_weather_features: true,
        enable_holiday_features: true,
        enable_payday_features: true
      },
      max_missing_features: 5,
      min_quality_score: 0.7,
      enable_feature_validation: true,
      enable_parallel_processing: true,
      max_concurrent_requests: 100,
      enable_streaming: false,
      ...customConfig
    };
  }

  private initializeFeatureStore(): FeatureStore {
    return {
      user_profiles: new Map(),
      global_stats: {
        transaction_amounts: {
          mean: 2500, // PHP 2,500 average
          std: 1500,
          percentiles: {
            '10': 500,
            '25': 1000,
            '50': 2000,
            '75': 3500,
            '90': 5000,
            '95': 7500,
            '99': 15000
          }
        },
        regional_stats: new Map([
          ['Metro Manila', { avg_amount: 3000, fraud_rate: 0.15, volume: 1000000 }],
          ['Cebu', { avg_amount: 2200, fraud_rate: 0.12, volume: 200000 }],
          ['Davao', { avg_amount: 2000, fraud_rate: 0.10, volume: 150000 }]
        ]),
        time_patterns: new Map()
      },
      reference_data: {
        philippines_holidays: new Set([
          '2025-01-01', '2025-04-09', '2025-04-10', '2025-05-01',
          '2025-06-12', '2025-08-21', '2025-08-26', '2025-11-30',
          '2025-12-25', '2025-12-30', '2025-12-31'
        ]),
        payday_dates: new Set(), // Will be populated dynamically
        region_risk_scores: new Map([
          ['Metro Manila', 0.25],
          ['Cebu', 0.15],
          ['Davao', 0.12],
          ['Baguio', 0.08]
        ]),
        merchant_categories: new Map(),
        geofence_definitions: new Map()
      }
    };
  }

  private async loadReferenceData(): Promise<void> {
    logger.info('Loading reference data');
    // In production, load from databases, APIs, etc.
    logger.info('Reference data loaded');
  }

  private async loadUserProfiles(): Promise<void> {
    logger.info('Loading user profiles');
    // In production, load recent user profiles from database
    logger.info('User profiles loaded');
  }

  private async computeGlobalStatistics(): Promise<void> {
    logger.info('Computing global statistics');
    // In production, compute from historical data
    logger.info('Global statistics computed');
  }

  private startBackgroundTasks(): void {
    // Update global statistics hourly
    setInterval(() => {
      this.computeGlobalStatistics();
    }, 60 * 60 * 1000);
    
    // Clean up cache periodically
    setInterval(() => {
      this.cleanupCache();
    }, 30 * 60 * 1000);
    
    // Update performance metrics
    setInterval(() => {
      this.emitPerformanceMetrics();
    }, 5 * 60 * 1000);
  }

  private cleanupCache(): void {
    const now = Date.now();
    const ttlMs = this.config.cache_ttl_seconds * 1000;
    
    for (const [key, features] of this.featureCache) {
      const age = now - features.meta.timestamp.getTime();
      if (age > ttlMs) {
        this.featureCache.delete(key);
      }
    }
    
    logger.debug('Cache cleanup completed', { entriesRemaining: this.featureCache.size });
  }

  private emitPerformanceMetrics(): void {
    const metrics = this.performanceMetrics.get('global');
    if (metrics) {
      this.emit('performance_metrics', {
        ...metrics,
        cache_size: this.featureCache.size,
        user_profiles: this.featureStore.user_profiles.size
      });
    }
  }

  // Public API Methods
  getPerformanceMetrics(): {
    total_requests: number;
    avg_processing_time: number;
    max_processing_time: number;
    error_count: number;
  } | undefined {
    return this.performanceMetrics.get('global');
  }

  getUserProfile(userId: string): {
    first_seen: Date;
    transaction_history: number[];
    location_history: { lat: number; lng: number; timestamp: Date }[];
    device_history: string[];
    risk_indicators: RiskIndicators;
  } | undefined {
    return this.featureStore.user_profiles.get(userId);
  }

  getGlobalStatistics(): {
    transaction_amounts: {
      mean: number;
      std: number;
      percentiles: { [p: string]: number };
    };
    regional_stats: Map<string, {
      avg_amount: number;
      fraud_rate: number;
      volume: number;
    }>;
    time_patterns: Map<number, number>;
  } {
    return this.featureStore.global_stats;
  }

  async batchProcessFeatures(rawDataArray: RawFeatureData[]): Promise<ProcessedFeatures[]> {
    const batchSize = this.config.batch_size;
    const results: ProcessedFeatures[] = [];
    
    for (let i = 0; i < rawDataArray.length; i += batchSize) {
      const batch = rawDataArray.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(rawData => this.processFeatures(rawData))
      );
      results.push(...batchResults);
    }
    
    return results;
  }
}

// Export singleton instance
export const featureEngineeringPipeline = new FeatureEngineeringPipeline();
export default featureEngineeringPipeline;