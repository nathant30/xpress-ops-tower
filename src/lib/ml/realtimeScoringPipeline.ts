'use client';

import { mlFraudEngine, MLFeatures, MLPrediction } from './fraudDetectionModels';
import { redisCacheManager } from '../scaling/redisCacheManager';
import { monitoringSystem } from '../scaling/monitoringSystem';

interface ScoringRequest {
  id: string;
  userId: string;
  tripId?: string;
  eventType: 'trip_request' | 'trip_start' | 'trip_end' | 'payment' | 'location_update';
  timestamp: number;
  rawData: any;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  requiresRealtime: boolean;
}

interface ScoringResponse {
  requestId: string;
  prediction: MLPrediction;
  processingTime: number;
  cacheHit: boolean;
  actions: RecommendedAction[];
  metadata: {
    modelVersion: string;
    featureCount: number;
    pipelineVersion: string;
  };
}

interface RecommendedAction {
  type: 'block' | 'flag' | 'monitor' | 'investigate' | 'allow';
  confidence: number;
  reason: string;
  urgency: 'immediate' | 'within_hour' | 'within_day' | 'routine';
  autoExecutable: boolean;
}

interface PipelineMetrics {
  totalRequests: number;
  averageLatency: number;
  cacheHitRate: number;
  errorRate: number;
  throughputPerSecond: number;
  modelAccuracy: number;
  falsePositiveRate: number;
  blockedTransactions: number;
  lastUpdated: number;
}

interface BatchScoringJob {
  id: string;
  requests: ScoringRequest[];
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: number;
  completedAt?: number;
  results?: ScoringResponse[];
  priority: number;
}

class RealtimeScoringPipeline {
  private static instance: RealtimeScoringPipeline;
  private requestQueue: Map<string, ScoringRequest[]> = new Map(); // Priority-based queues
  private processingRequests: Set<string> = new Set();
  private batchJobs: Map<string, BatchScoringJob> = new Map();
  private metrics: PipelineMetrics;
  private isProcessing = false;
  private workerInterval?: NodeJS.Timeout;
  private metricsInterval?: NodeJS.Timeout;

  private constructor() {
    this.metrics = {
      totalRequests: 0,
      averageLatency: 0,
      cacheHitRate: 0,
      errorRate: 0,
      throughputPerSecond: 0,
      modelAccuracy: 0,
      falsePositiveRate: 0,
      blockedTransactions: 0,
      lastUpdated: Date.now()
    };

    this.initializeQueues();
    this.startWorkers();
    this.startMetricsCollection();
  }

  static getInstance(): RealtimeScoringPipeline {
    if (!RealtimeScoringPipeline.instance) {
      RealtimeScoringPipeline.instance = new RealtimeScoringPipeline();
    }
    return RealtimeScoringPipeline.instance;
  }

  private initializeQueues(): void {
    // Initialize priority-based queues
    this.requestQueue.set('urgent', []);
    this.requestQueue.set('high', []);
    this.requestQueue.set('normal', []);
    this.requestQueue.set('low', []);
  }

  private startWorkers(): void {
    // Start processing workers
    this.workerInterval = setInterval(() => {
      this.processQueue();
    }, 100); // Process every 100ms

    }

  private startMetricsCollection(): void {
    this.metricsInterval = setInterval(() => {
      this.updateMetrics();
    }, 30000); // Update metrics every 30 seconds
  }

  async scoreRequest(request: ScoringRequest): Promise<ScoringResponse> {
    const startTime = Date.now();
    
    try {
      // Check cache first for non-urgent requests
      if (request.priority !== 'urgent') {
        const cached = await this.getCachedScore(request);
        if (cached) {
          this.metrics.totalRequests++;
          return {
            ...cached,
            processingTime: Date.now() - startTime,
            cacheHit: true
          };
        }
      }

      // Extract features from raw data
      const features = await this.extractAndEnrichFeatures(request);
      
      // Get ML prediction
      const prediction = await mlFraudEngine.predictFraud(features);
      
      // Generate recommended actions
      const actions = this.generateActions(prediction, request);
      
      // Create response
      const response: ScoringResponse = {
        requestId: request.id,
        prediction,
        processingTime: Date.now() - startTime,
        cacheHit: false,
        actions,
        metadata: {
          modelVersion: prediction.modelVersion,
          featureCount: Object.keys(features).length,
          pipelineVersion: '2.1.0'
        }
      };

      // Cache the result
      await this.cacheScore(request, response);

      // Update metrics
      this.metrics.totalRequests++;
      this.updateLatencyMetrics(response.processingTime);

      // Execute auto actions if needed
      await this.executeAutoActions(response);

      return response;

    } catch (error) {
      console.error('Error in scoring pipeline:', error);
      this.metrics.errorRate = (this.metrics.errorRate * 0.9) + (0.1); // Exponential moving average
      
      // Return safe default response
      return this.createErrorResponse(request, startTime, error as Error);
    }
  }

  async batchScore(requests: ScoringRequest[]): Promise<string> {
    const jobId = `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const job: BatchScoringJob = {
      id: jobId,
      requests,
      status: 'pending',
      createdAt: Date.now(),
      priority: this.calculateBatchPriority(requests)
    };

    this.batchJobs.set(jobId, job);
    
    // Process batch asynchronously
    this.processBatchJob(jobId);
    
    return jobId;
  }

  async getBatchResults(jobId: string): Promise<BatchScoringJob | null> {
    return this.batchJobs.get(jobId) || null;
  }

  private async processBatchJob(jobId: string): Promise<void> {
    const job = this.batchJobs.get(jobId);
    if (!job) return;

    job.status = 'processing';
    this.batchJobs.set(jobId, job);

    try {
      const results: ScoringResponse[] = [];
      
      // Process in batches of 50 to avoid overwhelming the system
      const batchSize = 50;
      for (let i = 0; i < job.requests.length; i += batchSize) {
        const batch = job.requests.slice(i, i + batchSize);
        const batchPromises = batch.map(request => this.scoreRequest(request));
        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);

        // Small delay between batches to prevent system overload
        if (i + batchSize < job.requests.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      job.results = results;
      job.status = 'completed';
      job.completedAt = Date.now();
      
    } catch (error) {
      console.error(`Batch job ${jobId} failed:`, error);
      job.status = 'failed';
    }

    this.batchJobs.set(jobId, job);
  }

  private calculateBatchPriority(requests: ScoringRequest[]): number {
    // Higher number = higher priority
    const urgentCount = requests.filter(r => r.priority === 'urgent').length;
    const highCount = requests.filter(r => r.priority === 'high').length;
    
    return urgentCount * 4 + highCount * 2 + requests.length;
  }

  private async extractAndEnrichFeatures(request: ScoringRequest): Promise<MLFeatures> {
    // Extract base features from raw data
    let features = mlFraudEngine.extractFeatures(request.rawData);
    
    // Enrich with cached user data
    const userCache = await redisCacheManager.getUserRiskProfile(request.userId);
    if (userCache) {
      features.user = {
        ...features.user,
        accountAge: userCache.accountAge || features.user.accountAge,
        totalRides: userCache.totalRides || features.user.totalRides,
        ratingAverage: userCache.currentRating || features.user.ratingAverage,
        cancelationRate: userCache.cancelationRate || features.user.cancelationRate
      };
    }

    // Enrich with device fingerprinting data
    if (request.rawData.deviceFingerprint) {
      const deviceData = await redisCacheManager.getDeviceFingerprint(request.rawData.deviceFingerprint);
      if (deviceData) {
        features.device = {
          ...features.device,
          multipleAccounts: deviceData.accountCount || features.device.multipleAccounts,
          isRooted: deviceData.isRooted || features.device.isRooted,
          isEmulator: deviceData.isEmulator || features.device.isEmulator
        };
      }
    }

    // Enrich with IP reputation data
    if (request.rawData.ipAddress) {
      const ipReputation = await redisCacheManager.getIPReputation(request.rawData.ipAddress);
      if (ipReputation) {
        features.network = {
          ...features.network,
          ipRiskScore: ipReputation.riskScore || features.network.ipRiskScore,
          isVpn: ipReputation.isVpn || features.network.isVpn,
          isProxy: ipReputation.isProxy || features.network.isProxy
        };
      }
    }

    // Add real-time contextual features
    features = this.addContextualFeatures(features, request);

    return features;
  }

  private addContextualFeatures(features: MLFeatures, request: ScoringRequest): MLFeatures {
    const now = new Date(request.timestamp);
    const hour = now.getHours();
    const dayOfWeek = now.getDay();

    // Update temporal features
    features.trip.timeOfDay = hour;
    features.trip.dayOfWeek = dayOfWeek;
    features.trip.isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    
    // Check if it's a Philippine holiday (simplified)
    const holidays = ['2024-01-01', '2024-12-25', '2024-12-30']; // Add more holidays
    const dateStr = now.toISOString().split('T')[0];
    features.trip.isHoliday = holidays.includes(dateStr);

    // Add event-specific context
    if (request.eventType === 'location_update') {
      // Increase location-based feature weights for location events
      features.location.gpsAccuracy = features.location.gpsAccuracy * 1.2;
    }

    return features;
  }

  private generateActions(prediction: MLPrediction, request: ScoringRequest): RecommendedAction[] {
    const actions: RecommendedAction[] = [];
    
    if (prediction.fraudScore >= 0.9) {
      actions.push({
        type: 'block',
        confidence: prediction.confidence,
        reason: 'Critical fraud risk detected',
        urgency: 'immediate',
        autoExecutable: true
      });
    } else if (prediction.fraudScore >= 0.7) {
      actions.push({
        type: 'flag',
        confidence: prediction.confidence,
        reason: 'High fraud risk - requires investigation',
        urgency: 'within_hour',
        autoExecutable: false
      });
    } else if (prediction.fraudScore >= 0.4) {
      actions.push({
        type: 'monitor',
        confidence: prediction.confidence,
        reason: 'Medium fraud risk - enhanced monitoring',
        urgency: 'within_day',
        autoExecutable: true
      });
    } else {
      actions.push({
        type: 'allow',
        confidence: prediction.confidence,
        reason: 'Low fraud risk - normal processing',
        urgency: 'routine',
        autoExecutable: true
      });
    }

    // Add specific actions based on fraud reasons
    prediction.reasons.forEach(reason => {
      if (reason.includes('GPS spoofing') || reason.includes('location jumps')) {
        actions.push({
          type: 'investigate',
          confidence: 0.8,
          reason: 'Location anomaly requires manual review',
          urgency: 'within_hour',
          autoExecutable: false
        });
      }
      
      if (reason.includes('multiple accounts')) {
        actions.push({
          type: 'flag',
          confidence: 0.9,
          reason: 'Multi-account abuse detected',
          urgency: 'immediate',
          autoExecutable: false
        });
      }
    });

    return actions;
  }

  private async executeAutoActions(response: ScoringResponse): Promise<void> {
    for (const action of response.actions) {
      if (action.autoExecutable) {
        try {
          await this.executeAction(action, response);
        } catch (error) {
          console.error('Failed to execute auto action:', error);
        }
      }
    }
  }

  private async executeAction(action: RecommendedAction, response: ScoringResponse): Promise<void> {
    switch (action.type) {
      case 'block':
        // Add to blocked users cache
        await redisCacheManager.setTemporaryBlock(
          response.requestId, 
          'fraud_detected', 
          3600 // 1 hour
        );
        this.metrics.blockedTransactions++;
        break;

      case 'monitor':
        // Increase monitoring frequency for this user
        await redisCacheManager.setCacheWithTTL(
          `monitor:${response.requestId}`,
          JSON.stringify({
            level: 'enhanced',
            reason: action.reason,
            timestamp: Date.now()
          }),
          24 * 3600 // 24 hours
        );
        break;

      case 'allow':
        // Update positive interaction cache
        await redisCacheManager.setCacheWithTTL(
          `allow:${response.requestId}`,
          JSON.stringify({
            score: response.prediction.fraudScore,
            timestamp: Date.now()
          }),
          3600 // 1 hour
        );
        break;
    }
  }

  private async getCachedScore(request: ScoringRequest): Promise<ScoringResponse | null> {
    try {
      const cacheKey = this.generateCacheKey(request);
      const cached = await redisCacheManager.getCache(cacheKey);
      
      if (cached) {
        const parsedCache = JSON.parse(cached);
        // Check if cache is still valid (5 minutes for normal requests)
        const cacheAge = Date.now() - parsedCache.timestamp;
        if (cacheAge < 300000) { // 5 minutes
          return parsedCache;
        }
      }
    } catch (error) {
      console.error('Error getting cached score:', error);
    }
    
    return null;
  }

  private async cacheScore(request: ScoringRequest, response: ScoringResponse): Promise<void> {
    try {
      const cacheKey = this.generateCacheKey(request);
      const cacheData = {
        ...response,
        timestamp: Date.now()
      };
      
      // Cache for different durations based on risk level
      let ttl = 300; // 5 minutes default
      if (response.prediction.riskLevel === 'critical') ttl = 60; // 1 minute
      else if (response.prediction.riskLevel === 'high') ttl = 180; // 3 minutes
      else if (response.prediction.riskLevel === 'low') ttl = 900; // 15 minutes
      
      await redisCacheManager.setCacheWithTTL(cacheKey, JSON.stringify(cacheData), ttl);
      
    } catch (error) {
      console.error('Error caching score:', error);
    }
  }

  private generateCacheKey(request: ScoringRequest): string {
    // Create cache key based on user and relevant contextual data
    const contextHash = this.hashContext({
      userId: request.userId,
      eventType: request.eventType,
      hour: new Date(request.timestamp).getHours(),
      deviceFingerprint: request.rawData?.deviceFingerprint?.slice(0, 10)
    });
    
    return `fraud_score:${request.userId}:${contextHash}`;
  }

  private hashContext(context: any): string {
    return Buffer.from(JSON.stringify(context)).toString('base64').slice(0, 12);
  }

  private createErrorResponse(request: ScoringRequest, startTime: number, error: Error): ScoringResponse {
    return {
      requestId: request.id,
      prediction: {
        fraudScore: 0.5, // Conservative default
        riskLevel: 'medium',
        confidence: 0.1,
        reasons: ['Error in fraud detection - manual review required'],
        modelVersion: 'error_fallback_v1.0',
        timestamp: Date.now(),
        features: { topPositive: [], topNegative: [] }
      },
      processingTime: Date.now() - startTime,
      cacheHit: false,
      actions: [{
        type: 'investigate',
        confidence: 1.0,
        reason: `Fraud detection error: ${error.message}`,
        urgency: 'within_hour',
        autoExecutable: false
      }],
      metadata: {
        modelVersion: 'error_fallback_v1.0',
        featureCount: 0,
        pipelineVersion: '2.1.0'
      }
    };
  }

  private processQueue(): void {
    if (this.isProcessing) return;
    
    this.isProcessing = true;
    
    // Process urgent requests first, then high, normal, low
    const priorityOrder = ['urgent', 'high', 'normal', 'low'];
    
    for (const priority of priorityOrder) {
      const queue = this.requestQueue.get(priority) || [];
      if (queue.length > 0) {
        const request = queue.shift()!;
        this.requestQueue.set(priority, queue);
        
        // Process request asynchronously
        this.scoreRequest(request).catch(error => {
          console.error('Error processing queued request:', error);
        });
        
        break; // Process one request per cycle
      }
    }
    
    this.isProcessing = false;
  }

  private updateLatencyMetrics(latency: number): void {
    // Exponential moving average
    this.metrics.averageLatency = (this.metrics.averageLatency * 0.9) + (latency * 0.1);
  }

  private updateMetrics(): void {
    const now = Date.now();
    const timeDiff = (now - this.metrics.lastUpdated) / 1000; // seconds
    
    if (timeDiff > 0) {
      this.metrics.throughputPerSecond = this.metrics.totalRequests / timeDiff;
    }
    
    // Update cache hit rate
    redisCacheManager.getCacheStats().then(stats => {
      this.metrics.cacheHitRate = stats.hitRate || 0;
    }).catch(() => {}); // Ignore errors
    
    this.metrics.lastUpdated = now;
    
    // Emit metrics for monitoring
    monitoringSystem.emit('pipeline_metrics', this.metrics);
  }

  // Public API methods
  getMetrics(): PipelineMetrics {
    return { ...this.metrics };
  }

  getQueueStatus(): Record<string, number> {
    const status: Record<string, number> = {};
    this.requestQueue.forEach((queue, priority) => {
      status[priority] = queue.length;
    });
    return status;
  }

  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    latency: number;
    queueDepth: number;
    errorRate: number;
  }> {
    const totalQueued = Array.from(this.requestQueue.values())
      .reduce((sum, queue) => sum + queue.length, 0);

    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    
    if (this.metrics.errorRate > 0.1 || this.metrics.averageLatency > 5000) {
      status = 'unhealthy';
    } else if (this.metrics.errorRate > 0.05 || this.metrics.averageLatency > 2000 || totalQueued > 100) {
      status = 'degraded';
    }

    return {
      status,
      latency: this.metrics.averageLatency,
      queueDepth: totalQueued,
      errorRate: this.metrics.errorRate
    };
  }

  stop(): void {
    if (this.workerInterval) {
      clearInterval(this.workerInterval);
      this.workerInterval = undefined;
    }
    
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
      this.metricsInterval = undefined;
    }
    
    }
}

export const realtimeScoringPipeline = RealtimeScoringPipeline.getInstance();
export type { ScoringRequest, ScoringResponse, RecommendedAction, PipelineMetrics };
export default RealtimeScoringPipeline;