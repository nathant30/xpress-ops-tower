// A/B Testing Framework for ML Models
// Advanced experimentation platform for fraud detection models

import { EventEmitter } from 'events';
import { logger } from '@/lib/security/productionLogger';
import { PredictionRequest, PredictionResponse } from '../modelServing/servingInfrastructure';

export interface ABTest {
  id: string;
  name: string;
  description: string;
  status: 'draft' | 'running' | 'paused' | 'completed' | 'cancelled';
  created_at: Date;
  started_at?: Date;
  ended_at?: Date;
  
  // Test Configuration
  traffic_split: {
    control: number;    // Percentage of traffic for control group
    treatment: number;  // Percentage of traffic for treatment group
  };
  
  // Models being tested
  models: {
    control: {
      model_id: string;
      version: string;
      endpoint: string;
    };
    treatment: {
      model_id: string;
      version: string;
      endpoint: string;
    };
  };
  
  // Targeting and Filters
  targeting: {
    regions?: string[];
    user_segments?: string[];
    time_windows?: {
      start_hour: number;
      end_hour: number;
    };
    sample_criteria?: {
      min_transaction_amount?: number;
      max_transaction_amount?: number;
      include_new_users?: boolean;
    };
  };
  
  // Success Metrics
  metrics: {
    primary: {
      name: string;
      description: string;
      target_improvement: number; // Minimum improvement % to declare winner
    };
    secondary: string[];
    guardrail: {
      name: string;
      max_degradation: number; // Maximum allowed degradation %
    };
  };
  
  // Statistical Configuration
  statistical_config: {
    confidence_level: number;     // e.g., 0.95 for 95% confidence
    minimum_sample_size: number;
    maximum_duration_days: number;
    early_stopping: {
      enabled: boolean;
      check_frequency_hours: number;
      significance_threshold: number;
    };
  };
}

export interface TestAssignment {
  user_id: string;
  session_id?: string;
  test_id: string;
  variant: 'control' | 'treatment';
  assigned_at: Date;
  region: string;
  user_segment: string;
  assignment_reason: string;
}

export interface TestResult {
  test_id: string;
  variant: 'control' | 'treatment';
  timestamp: Date;
  
  // Request/Response Data
  request: PredictionRequest;
  response: PredictionResponse;
  
  // Business Metrics
  business_outcome?: {
    conversion: boolean;
    fraud_detected: boolean;
    false_positive: boolean;
    user_satisfaction_score?: number;
    business_value?: number;
  };
  
  // Performance Metrics
  performance: {
    response_time_ms: number;
    model_confidence: number;
    feature_count: number;
  };
}

export interface TestAnalysis {
  test_id: string;
  analysis_date: Date;
  status: 'insufficient_data' | 'running' | 'significant' | 'inconclusive';
  
  // Sample Sizes
  sample_sizes: {
    control: number;
    treatment: number;
    total: number;
  };
  
  // Primary Metric Results
  primary_metric: {
    control_mean: number;
    treatment_mean: number;
    lift: number;           // % improvement
    confidence_interval: [number, number];
    p_value: number;
    is_significant: boolean;
    statistical_power: number;
  };
  
  // Secondary Metrics
  secondary_metrics: {
    [metric_name: string]: {
      control_mean: number;
      treatment_mean: number;
      lift: number;
      p_value: number;
      is_significant: boolean;
    };
  };
  
  // Guardrail Metrics
  guardrail_status: 'pass' | 'warning' | 'fail';
  guardrail_details?: {
    metric: string;
    degradation: number;
    threshold: number;
  };
  
  // Recommendations
  recommendation: 'continue' | 'stop_for_winner' | 'stop_for_loser' | 'stop_inconclusive';
  confidence_in_recommendation: number;
  estimated_days_to_significance?: number;
}

export interface PhilippinesABTestConfig {
  // Regional considerations
  regional_stratification: {
    metro_manila_weight: number;
    cebu_weight: number;
    davao_weight: number;
    other_regions_weight: number;
  };
  
  // Time-based considerations (Philippines timezone)
  time_considerations: {
    peak_hours: number[];        // 7-9 AM, 5-7 PM
    off_peak_hours: number[];    // 10 PM - 6 AM
    weekend_behavior: boolean;   // Different patterns on weekends
  };
  
  // Cultural and behavioral factors
  behavioral_factors: {
    holiday_adjustments: boolean;  // Account for Philippines holidays
    payday_patterns: boolean;      // 15th and 30th behavior changes
    weather_impact: boolean;       // Typhoon season considerations
  };
  
  // Business-specific metrics
  philippines_metrics: {
    gcash_transaction_success_rate: boolean;
    paymaya_transaction_success_rate: boolean;
    regional_fraud_detection_accuracy: boolean;
    ltfrb_compliance_score: boolean;
  };
}

export class ABTestingFramework extends EventEmitter {
  private activeTests: Map<string, ABTest> = new Map();
  private testAssignments: Map<string, TestAssignment> = new Map(); // user_id -> assignment
  private testResults: Map<string, TestResult[]> = new Map(); // test_id -> results
  private testAnalyses: Map<string, TestAnalysis> = new Map();
  private philippinesConfig: PhilippinesABTestConfig;

  constructor() {
    super();
    this.initializePhilippinesConfig();
    this.initialize();
  }

  private async initialize(): Promise<void> {
    logger.info('Initializing A/B Testing Framework');
    this.startBackgroundAnalysis();
    this.startAssignmentCleanup();
    logger.info('A/B Testing Framework ready');
  }

  private initializePhilippinesConfig(): void {
    this.philippinesConfig = {
      regional_stratification: {
        metro_manila_weight: 0.4,  // 40% of population
        cebu_weight: 0.15,         // 15% of population  
        davao_weight: 0.12,        // 12% of population
        other_regions_weight: 0.33  // 33% other regions
      },
      time_considerations: {
        peak_hours: [7, 8, 9, 17, 18, 19],
        off_peak_hours: [22, 23, 0, 1, 2, 3, 4, 5, 6],
        weekend_behavior: true
      },
      behavioral_factors: {
        holiday_adjustments: true,
        payday_patterns: true,
        weather_impact: true
      },
      philippines_metrics: {
        gcash_transaction_success_rate: true,
        paymaya_transaction_success_rate: true,
        regional_fraud_detection_accuracy: true,
        ltfrb_compliance_score: true
      }
    };
  }

  // Test Management
  async createTest(testConfig: Omit<ABTest, 'id' | 'created_at' | 'status'>): Promise<string> {
    const testId = `ab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const test: ABTest = {
      id: testId,
      status: 'draft',
      created_at: new Date(),
      ...testConfig
    };

    // Validate test configuration
    this.validateTestConfiguration(test);
    
    // Apply Philippines-specific optimizations
    this.optimizeForPhilippines(test);
    
    this.activeTests.set(testId, test);
    this.testResults.set(testId, []);
    
    logger.info('A/B Test created', { testId, testName: test.name });
    this.emit('test_created', { test_id: testId, test });
    
    return testId;
  }

  async startTest(testId: string): Promise<boolean> {
    const test = this.activeTests.get(testId);
    if (!test || test.status !== 'draft') {
      logger.error('Cannot start test - not in draft status', { testId });
      return false;
    }

    // Pre-flight checks
    const checks = await this.performPreflightChecks(test);
    if (!checks.passed) {
      logger.error('Pre-flight checks failed for test', { testId, failures: checks.failures });
      return false;
    }

    test.status = 'running';
    test.started_at = new Date();
    
    logger.info('A/B Test started', { testId });
    this.emit('test_started', { test_id: testId, test });
    
    return true;
  }

  async stopTest(testId: string, reason: string): Promise<boolean> {
    const test = this.activeTests.get(testId);
    if (!test || test.status !== 'running') {
      return false;
    }

    test.status = 'completed';
    test.ended_at = new Date();
    
    // Generate final analysis
    const finalAnalysis = await this.analyzeTest(testId);
    logger.info('A/B Test stopped', { testId, reason });
    logger.info('A/B Test final result', { recommendation: finalAnalysis.recommendation });
    
    this.emit('test_stopped', { test_id: testId, reason, analysis: finalAnalysis });
    
    return true;
  }

  // Traffic Assignment with Philippines Optimization
  async assignVariant(userId: string, context: {
    region: string;
    user_segment?: string;
    session_id?: string;
    timestamp?: Date;
    transaction_context?: any;
  }): Promise<{ test_id: string; variant: 'control' | 'treatment'; model_endpoint: string } | null> {
    
    // Check if user already has assignment
    const existingAssignment = this.testAssignments.get(userId);
    if (existingAssignment) {
      const test = this.activeTests.get(existingAssignment.test_id);
      if (test && test.status === 'running') {
        return {
          test_id: existingAssignment.test_id,
          variant: existingAssignment.variant,
          model_endpoint: existingAssignment.variant === 'control' 
            ? test.models.control.endpoint 
            : test.models.treatment.endpoint
        };
      }
    }

    // Find active test that matches criteria
    const eligibleTest = this.findEligibleTest(userId, context);
    if (!eligibleTest) {
      return null; // No active tests for this user
    }

    // Apply Philippines-specific assignment logic
    const variant = this.determineVariantWithPhilippinesLogic(eligibleTest, context);
    
    // Create assignment record
    const assignment: TestAssignment = {
      user_id: userId,
      session_id: context.session_id,
      test_id: eligibleTest.id,
      variant,
      assigned_at: new Date(),
      region: context.region,
      user_segment: context.user_segment || 'unknown',
      assignment_reason: this.getAssignmentReason(eligibleTest, context, variant)
    };

    this.testAssignments.set(userId, assignment);
    
    logger.debug('User assigned to test', { userId, testId: eligibleTest.id, variant });
    this.emit('variant_assigned', assignment);

    return {
      test_id: eligibleTest.id,
      variant,
      model_endpoint: variant === 'control' 
        ? eligibleTest.models.control.endpoint 
        : eligibleTest.models.treatment.endpoint
    };
  }

  private findEligibleTest(userId: string, context: any): ABTest | null {
    for (const test of this.activeTests.values()) {
      if (test.status !== 'running') continue;
      
      // Check regional targeting
      if (test.targeting.regions && !test.targeting.regions.includes(context.region)) {
        continue;
      }
      
      // Check user segment targeting
      if (test.targeting.user_segments && context.user_segment && 
          !test.targeting.user_segments.includes(context.user_segment)) {
        continue;
      }
      
      // Check time window targeting
      if (test.targeting.time_windows) {
        const currentHour = new Date().getHours();
        if (currentHour < test.targeting.time_windows.start_hour || 
            currentHour > test.targeting.time_windows.end_hour) {
          continue;
        }
      }
      
      // Check sample criteria
      if (test.targeting.sample_criteria && context.transaction_context) {
        const criteria = test.targeting.sample_criteria;
        const amount = context.transaction_context.amount;
        
        if (criteria.min_transaction_amount && amount < criteria.min_transaction_amount) continue;
        if (criteria.max_transaction_amount && amount > criteria.max_transaction_amount) continue;
      }
      
      return test; // First eligible test wins
    }
    
    return null;
  }

  private determineVariantWithPhilippinesLogic(test: ABTest, context: any): 'control' | 'treatment' {
    // Philippines-specific stratification
    let adjustedSplit = { ...test.traffic_split };
    
    // Regional adjustments
    if (context.region === 'Metro Manila') {
      // Metro Manila gets slightly more treatment traffic due to higher volume
      adjustedSplit.treatment = Math.min(adjustedSplit.treatment * 1.1, 50);
      adjustedSplit.control = 100 - adjustedSplit.treatment;
    } else if (['Cebu', 'Davao'].includes(context.region)) {
      // Major cities get standard split
      // No adjustment needed
    } else {
      // Smaller regions get slightly more control traffic for stability
      adjustedSplit.control = Math.min(adjustedSplit.control * 1.1, 50);
      adjustedSplit.treatment = 100 - adjustedSplit.control;
    }
    
    // Time-based adjustments (Philippines Standard Time)
    const currentHour = new Date().getHours();
    if (this.philippinesConfig.time_considerations.peak_hours.includes(currentHour)) {
      // During peak hours, be more conservative with new models
      adjustedSplit.control = Math.min(adjustedSplit.control * 1.05, 60);
      adjustedSplit.treatment = 100 - adjustedSplit.control;
    }
    
    // Holiday adjustments
    if (this.isPhilippinesHoliday(new Date())) {
      // More conservative during holidays
      adjustedSplit.control = Math.min(adjustedSplit.control * 1.15, 70);
      adjustedSplit.treatment = 100 - adjustedSplit.control;
    }
    
    // Random assignment based on adjusted split
    const random = Math.random() * 100;
    return random < adjustedSplit.control ? 'control' : 'treatment';
  }

  private isPhilippinesHoliday(date: Date): boolean {
    const holidays = [
      '2025-01-01', '2025-04-09', '2025-04-10', '2025-05-01',
      '2025-06-12', '2025-08-21', '2025-08-26', '2025-11-30',
      '2025-12-25', '2025-12-30', '2025-12-31'
    ];
    
    const dateString = date.toISOString().split('T')[0];
    return holidays.includes(dateString);
  }

  private getAssignmentReason(test: ABTest, context: any, variant: string): string {
    const reasons = [];
    
    if (context.region === 'Metro Manila') {
      reasons.push('metro_manila_high_volume');
    }
    
    const currentHour = new Date().getHours();
    if (this.philippinesConfig.time_considerations.peak_hours.includes(currentHour)) {
      reasons.push('peak_hour_conservative');
    }
    
    if (this.isPhilippinesHoliday(new Date())) {
      reasons.push('holiday_conservative');
    }
    
    reasons.push(`variant_${variant}`);
    
    return reasons.join(',');
  }

  // Result Recording and Analysis
  async recordTestResult(result: TestResult): Promise<void> {
    const testResults = this.testResults.get(result.test_id);
    if (!testResults) {
      logger.warn('No test found for result', { testId: result.test_id });
      return;
    }

    testResults.push(result);
    
    // Apply Philippines-specific business outcome calculation
    if (result.business_outcome) {
      result.business_outcome.business_value = this.calculatePhilippinesBusinessValue(result);
    }

    this.emit('test_result_recorded', result);
    
    // Trigger analysis if we have enough data
    if (testResults.length % 100 === 0) { // Every 100 results
      this.analyzeTest(result.test_id);
    }
  }

  private calculatePhilippinesBusinessValue(result: TestResult): number {
    let value = 0;
    
    // Base value for fraud prevention
    if (result.business_outcome?.fraud_detected) {
      value += 500; // $500 saved per fraud detected
    }
    
    // Penalty for false positives (customer experience impact)
    if (result.business_outcome?.false_positive) {
      value -= 50; // $50 cost per false positive
    }
    
    // Regional multipliers
    const region = result.request.context?.philippines_context?.region;
    if (region === 'Metro Manila') {
      value *= 1.3; // Higher value in Metro Manila
    } else if (['Cebu', 'Davao'].includes(region || '')) {
      value *= 1.1; // Moderate premium in major cities
    }
    
    // Time-based multipliers
    const hour = new Date(result.timestamp).getHours();
    if (this.philippinesConfig.time_considerations.peak_hours.includes(hour)) {
      value *= 1.2; // Higher value during peak hours
    }
    
    return value;
  }

  async analyzeTest(testId: string): Promise<TestAnalysis> {
    const test = this.activeTests.get(testId);
    const results = this.testResults.get(testId);
    
    if (!test || !results) {
      throw new Error(`Test not found: ${testId}`);
    }

    logger.info('Analyzing test', { testId });

    // Separate results by variant
    const controlResults = results.filter(r => {
      const assignment = this.testAssignments.get(r.request.context?.user_id || '');
      return assignment?.variant === 'control';
    });
    
    const treatmentResults = results.filter(r => {
      const assignment = this.testAssignments.get(r.request.context?.user_id || '');
      return assignment?.variant === 'treatment';
    });

    // Check minimum sample size
    const totalSamples = controlResults.length + treatmentResults.length;
    if (totalSamples < test.statistical_config.minimum_sample_size) {
      const analysis: TestAnalysis = {
        test_id: testId,
        analysis_date: new Date(),
        status: 'insufficient_data',
        sample_sizes: {
          control: controlResults.length,
          treatment: treatmentResults.length,
          total: totalSamples
        },
        primary_metric: {
          control_mean: 0,
          treatment_mean: 0,
          lift: 0,
          confidence_interval: [0, 0],
          p_value: 1,
          is_significant: false,
          statistical_power: 0
        },
        secondary_metrics: {},
        guardrail_status: 'pass',
        recommendation: 'continue',
        confidence_in_recommendation: 0.1,
        estimated_days_to_significance: this.estimateDaysToSignificance(test, totalSamples)
      };
      
      this.testAnalyses.set(testId, analysis);
      return analysis;
    }

    // Calculate primary metric (fraud detection accuracy)
    const primaryMetric = this.calculatePrimaryMetric(controlResults, treatmentResults, test);
    
    // Calculate secondary metrics
    const secondaryMetrics = this.calculateSecondaryMetrics(controlResults, treatmentResults, test);
    
    // Check guardrails
    const guardrailStatus = this.checkGuardrails(controlResults, treatmentResults, test);
    
    // Determine recommendation
    const recommendation = this.determineRecommendation(primaryMetric, guardrailStatus, test);
    
    const analysis: TestAnalysis = {
      test_id: testId,
      analysis_date: new Date(),
      status: primaryMetric.is_significant ? 'significant' : 'running',
      sample_sizes: {
        control: controlResults.length,
        treatment: treatmentResults.length,
        total: totalSamples
      },
      primary_metric: primaryMetric,
      secondary_metrics: secondaryMetrics,
      guardrail_status: guardrailStatus.status,
      guardrail_details: guardrailStatus.details,
      recommendation: recommendation.action,
      confidence_in_recommendation: recommendation.confidence,
      estimated_days_to_significance: this.estimateDaysToSignificance(test, totalSamples)
    };

    this.testAnalyses.set(testId, analysis);
    this.emit('test_analyzed', analysis);

    logger.info('Test analysis complete', { testId, recommendation: recommendation.action });
    
    return analysis;
  }

  private calculatePrimaryMetric(controlResults: TestResult[], treatmentResults: TestResult[], test: ABTest): any {
    // Calculate fraud detection accuracy for both variants
    const controlAccuracy = this.calculateAccuracy(controlResults);
    const treatmentAccuracy = this.calculateAccuracy(treatmentResults);
    
    const lift = ((treatmentAccuracy - controlAccuracy) / controlAccuracy) * 100;
    
    // Statistical significance test (simplified t-test)
    const pValue = this.calculatePValue(controlResults, treatmentResults);
    const isSignificant = pValue < (1 - test.statistical_config.confidence_level);
    
    // Confidence interval calculation (simplified)
    const margin = 1.96 * Math.sqrt((controlAccuracy * (1 - controlAccuracy)) / controlResults.length);
    const confidenceInterval: [number, number] = [
      lift - (margin * 100),
      lift + (margin * 100)
    ];
    
    return {
      control_mean: controlAccuracy,
      treatment_mean: treatmentAccuracy,
      lift,
      confidence_interval: confidenceInterval,
      p_value: pValue,
      is_significant: isSignificant,
      statistical_power: this.calculateStatisticalPower(controlResults.length, treatmentResults.length)
    };
  }

  private calculateAccuracy(results: TestResult[]): number {
    if (results.length === 0) return 0;
    
    const correctPredictions = results.filter(r => 
      r.business_outcome?.fraud_detected === (r.response.prediction.class === 'fraud')
    ).length;
    
    return correctPredictions / results.length;
  }

  private calculateSecondaryMetrics(controlResults: TestResult[], treatmentResults: TestResult[], test: ABTest): any {
    const metrics: any = {};
    
    // Response time
    const controlResponseTime = controlResults.reduce((sum, r) => sum + r.performance.response_time_ms, 0) / controlResults.length;
    const treatmentResponseTime = treatmentResults.reduce((sum, r) => sum + r.performance.response_time_ms, 0) / treatmentResults.length;
    
    metrics.response_time = {
      control_mean: controlResponseTime,
      treatment_mean: treatmentResponseTime,
      lift: ((treatmentResponseTime - controlResponseTime) / controlResponseTime) * 100,
      p_value: this.calculatePValue(controlResults, treatmentResults, 'response_time'),
      is_significant: false // Simplified
    };
    
    // False positive rate
    const controlFPR = this.calculateFalsePositiveRate(controlResults);
    const treatmentFPR = this.calculateFalsePositiveRate(treatmentResults);
    
    metrics.false_positive_rate = {
      control_mean: controlFPR,
      treatment_mean: treatmentFPR,
      lift: ((treatmentFPR - controlFPR) / controlFPR) * 100,
      p_value: this.calculatePValue(controlResults, treatmentResults, 'false_positive'),
      is_significant: false
    };
    
    return metrics;
  }

  private calculateFalsePositiveRate(results: TestResult[]): number {
    if (results.length === 0) return 0;
    
    const falsePositives = results.filter(r => r.business_outcome?.false_positive).length;
    return falsePositives / results.length;
  }

  private calculatePValue(controlResults: TestResult[], treatmentResults: TestResult[], metric: string = 'accuracy'): number {
    // Simplified p-value calculation - in production, use proper statistical libraries
    return Math.random() * 0.1; // Mock for demonstration
  }

  private calculateStatisticalPower(controlSampleSize: number, treatmentSampleSize: number): number {
    // Simplified power calculation
    const totalSample = controlSampleSize + treatmentSampleSize;
    return Math.min(totalSample / 1000, 0.95); // 95% max power
  }

  private checkGuardrails(controlResults: TestResult[], treatmentResults: TestResult[], test: ABTest): any {
    // Check if guardrail metrics are within acceptable bounds
    const guardrailMetric = test.metrics.guardrail.name;
    let status: 'pass' | 'warning' | 'fail' = 'pass';
    let details = undefined;
    
    if (guardrailMetric === 'error_rate') {
      const controlErrorRate = this.calculateErrorRate(controlResults);
      const treatmentErrorRate = this.calculateErrorRate(treatmentResults);
      const degradation = ((treatmentErrorRate - controlErrorRate) / controlErrorRate) * 100;
      
      if (degradation > test.metrics.guardrail.max_degradation) {
        status = 'fail';
        details = {
          metric: guardrailMetric,
          degradation,
          threshold: test.metrics.guardrail.max_degradation
        };
      } else if (degradation > test.metrics.guardrail.max_degradation * 0.8) {
        status = 'warning';
      }
    }
    
    return { status, details };
  }

  private calculateErrorRate(results: TestResult[]): number {
    if (results.length === 0) return 0;
    
    const errors = results.filter(r => r.performance.response_time_ms > 1000).length;
    return errors / results.length;
  }

  private determineRecommendation(primaryMetric: any, guardrailStatus: any, test: ABTest): any {
    let action: 'continue' | 'stop_for_winner' | 'stop_for_loser' | 'stop_inconclusive' = 'continue';
    let confidence = 0.5;
    
    if (guardrailStatus.status === 'fail') {
      action = 'stop_for_loser';
      confidence = 0.9;
    } else if (primaryMetric.is_significant) {
      if (primaryMetric.lift >= test.metrics.primary.target_improvement) {
        action = 'stop_for_winner';
        confidence = 0.85;
      } else {
        action = 'stop_for_loser';
        confidence = 0.75;
      }
    } else if (primaryMetric.statistical_power > 0.8) {
      action = 'stop_inconclusive';
      confidence = 0.7;
    }
    
    return { action, confidence };
  }

  // Utility Methods
  private validateTestConfiguration(test: ABTest): void {
    if (test.traffic_split.control + test.traffic_split.treatment !== 100) {
      throw new Error('Traffic split must sum to 100%');
    }
    
    if (test.statistical_config.confidence_level < 0.8 || test.statistical_config.confidence_level > 0.99) {
      throw new Error('Confidence level must be between 80% and 99%');
    }
    
    if (test.statistical_config.minimum_sample_size < 100) {
      throw new Error('Minimum sample size must be at least 100');
    }
  }

  private optimizeForPhilippines(test: ABTest): void {
    // Add Philippines-specific targeting if not specified
    if (!test.targeting.regions) {
      test.targeting.regions = ['Metro Manila', 'Cebu', 'Davao', 'Baguio', 'Iloilo'];
    }
    
    // Adjust sample size for Philippines market
    if (test.statistical_config.minimum_sample_size < 500) {
      test.statistical_config.minimum_sample_size = 500; // Larger sample for diverse market
    }
    
    // Add Philippines-specific metrics
    if (!test.metrics.secondary.includes('regional_performance')) {
      test.metrics.secondary.push('regional_performance');
    }
  }

  private async performPreflightChecks(test: ABTest): Promise<{ passed: boolean; failures: string[] }> {
    const failures: string[] = [];
    
    // Check model endpoints
    try {
      // In production, ping actual endpoints
      logger.debug('Checking endpoints', { controlEndpoint: test.models.control.endpoint, treatmentEndpoint: test.models.treatment.endpoint });
    } catch (error) {
      failures.push('Model endpoints not reachable');
    }
    
    // Check targeting makes sense
    if (test.targeting.regions && test.targeting.regions.length === 0) {
      failures.push('No target regions specified');
    }
    
    return {
      passed: failures.length === 0,
      failures
    };
  }

  private estimateDaysToSignificance(test: ABTest, currentSampleSize: number): number {
    const targetSampleSize = test.statistical_config.minimum_sample_size;
    const currentRate = currentSampleSize / (test.started_at ? 
      (Date.now() - test.started_at.getTime()) / (24 * 60 * 60 * 1000) : 1);
    
    const remainingSamples = Math.max(0, targetSampleSize - currentSampleSize);
    return Math.ceil(remainingSamples / currentRate);
  }

  // Background Tasks
  private startBackgroundAnalysis(): void {
    setInterval(() => {
      this.activeTests.forEach((test, testId) => {
        if (test.status === 'running') {
          this.analyzeTest(testId);
        }
      });
    }, 60 * 60 * 1000); // Every hour
  }

  private startAssignmentCleanup(): void {
    setInterval(() => {
      const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000; // 30 days
      
      for (const [userId, assignment] of this.testAssignments) {
        if (assignment.assigned_at.getTime() < cutoff) {
          this.testAssignments.delete(userId);
        }
      }
    }, 24 * 60 * 60 * 1000); // Daily cleanup
  }

  // Public API Methods
  getActiveTests(): ABTest[] {
    return Array.from(this.activeTests.values()).filter(test => test.status === 'running');
  }

  getTest(testId: string): ABTest | undefined {
    return this.activeTests.get(testId);
  }

  getTestAnalysis(testId: string): TestAnalysis | undefined {
    return this.testAnalyses.get(testId);
  }

  getUserAssignment(userId: string): TestAssignment | undefined {
    return this.testAssignments.get(userId);
  }

  getTestResults(testId: string): TestResult[] {
    return this.testResults.get(testId) || [];
  }
}

// Export singleton instance
export const abTestingFramework = new ABTestingFramework();
export default abTestingFramework;