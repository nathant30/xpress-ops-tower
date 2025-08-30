// Load Balancer for High-Volume Fraud Detection
// Distributes fraud checks across multiple processing instances

import { FraudEventData, FraudCheckResult } from '../fraud/realTimeFraudEngine';
import { metricsCollector } from '../monitoring/metricsCollector';

export interface FraudProcessingNode {
  id: string;
  url: string;
  weight: number;
  activeConnections: number;
  maxConnections: number;
  responseTime: number;
  errorRate: number;
  lastHealthCheck: Date;
  status: 'healthy' | 'degraded' | 'unhealthy' | 'maintenance';
  region: 'manila' | 'cebu' | 'davao' | 'global';
  capabilities: string[];
}

export interface LoadBalancingStrategy {
  type: 'round_robin' | 'least_connections' | 'weighted_response_time' | 'geographic' | 'fraud_type_based';
  config: Record<string, any>;
}

class FraudDetectionLoadBalancer {
  private static instance: FraudDetectionLoadBalancer;
  private nodes: Map<string, FraudProcessingNode> = new Map();
  private strategy: LoadBalancingStrategy;
  private circuitBreakers: Map<string, CircuitBreaker> = new Map();
  private requestQueue: Array<QueuedRequest> = [];
  private maxQueueSize = 10000;
  private processingTimeout = 30000; // 30 seconds

  private constructor() {
    this.strategy = {
      type: 'weighted_response_time',
      config: {
        responseTimeWeight: 0.4,
        connectionWeight: 0.3,
        errorRateWeight: 0.2,
        geographicBonus: 0.1
      }
    };
    this.initializeNodes();
    this.startHealthChecking();
    this.startQueueProcessor();
  }

  public static getInstance(): FraudDetectionLoadBalancer {
    if (!FraudDetectionLoadBalancer.instance) {
      FraudDetectionLoadBalancer.instance = new FraudDetectionLoadBalancer();
    }
    return FraudDetectionLoadBalancer.instance;
  }

  /**
   * Main entry point for distributed fraud checking
   */
  async processFraudCheck(eventData: FraudEventData): Promise<FraudCheckResult> {
    const startTime = Date.now();
    
    try {
      // Track incoming request
      metricsCollector.incrementCounter('fraud_lb_requests_total', {
        event_type: eventData.eventType,
        user_type: eventData.userType
      });

      // Check if we need to queue the request
      if (this.shouldQueue(eventData)) {
        return await this.queueRequest(eventData);
      }

      // Select best node for processing
      const selectedNode = await this.selectNode(eventData);
      
      if (!selectedNode) {
        throw new Error('No healthy nodes available for fraud processing');
      }

      // Process the fraud check
      const result = await this.executeOnNode(selectedNode, eventData);
      
      // Update node metrics
      this.updateNodeMetrics(selectedNode.id, Date.now() - startTime, true);
      
      // Track successful processing
      metricsCollector.recordHistogram('fraud_lb_processing_time_ms', Date.now() - startTime);
      metricsCollector.incrementCounter('fraud_lb_success_total', {
        node_id: selectedNode.id,
        region: selectedNode.region
      });

      return result;

    } catch (error) {
      metricsCollector.incrementCounter('fraud_lb_errors_total', {
        error_type: error instanceof Error ? error.constructor.name : 'unknown'
      });
      
      // Fallback to local processing if available
      return await this.fallbackProcessing(eventData);
    }
  }

  /**
   * Initialize fraud processing nodes
   */
  private initializeNodes(): void {
    // Main processing nodes for Philippines regions
    const nodes: FraudProcessingNode[] = [
      {
        id: 'fraud-node-manila-1',
        url: 'http://fraud-processor-manila-1:8080',
        weight: 100,
        activeConnections: 0,
        maxConnections: 1000,
        responseTime: 150,
        errorRate: 0.01,
        lastHealthCheck: new Date(),
        status: 'healthy',
        region: 'manila',
        capabilities: ['rider_incentive_fraud', 'gps_spoofing', 'multi_accounting', 'payment_fraud']
      },
      {
        id: 'fraud-node-manila-2',
        url: 'http://fraud-processor-manila-2:8080',
        weight: 100,
        activeConnections: 0,
        maxConnections: 1000,
        responseTime: 145,
        errorRate: 0.008,
        lastHealthCheck: new Date(),
        status: 'healthy',
        region: 'manila',
        capabilities: ['rider_incentive_fraud', 'gps_spoofing', 'multi_accounting', 'payment_fraud']
      },
      {
        id: 'fraud-node-cebu-1',
        url: 'http://fraud-processor-cebu-1:8080',
        weight: 80,
        activeConnections: 0,
        maxConnections: 500,
        responseTime: 180,
        errorRate: 0.012,
        lastHealthCheck: new Date(),
        status: 'healthy',
        region: 'cebu',
        capabilities: ['rider_incentive_fraud', 'gps_spoofing', 'multi_accounting']
      },
      {
        id: 'fraud-node-davao-1',
        url: 'http://fraud-processor-davao-1:8080',
        weight: 60,
        activeConnections: 0,
        maxConnections: 300,
        responseTime: 220,
        errorRate: 0.015,
        lastHealthCheck: new Date(),
        status: 'healthy',
        region: 'davao',
        capabilities: ['rider_incentive_fraud', 'gps_spoofing']
      },
      {
        id: 'fraud-node-global-1',
        url: 'http://fraud-processor-global-1:8080',
        weight: 120,
        activeConnections: 0,
        maxConnections: 2000,
        responseTime: 100,
        errorRate: 0.005,
        lastHealthCheck: new Date(),
        status: 'healthy',
        region: 'global',
        capabilities: ['rider_incentive_fraud', 'gps_spoofing', 'multi_accounting', 'payment_fraud', 'ml_models']
      }
    ];

    // Initialize nodes and circuit breakers
    nodes.forEach(node => {
      this.nodes.set(node.id, node);
      this.circuitBreakers.set(node.id, new CircuitBreaker(node.id, {
        failureThreshold: 5,
        recoveryTime: 60000,
        requestTimeout: this.processingTimeout
      }));
    });
  }

  /**
   * Select the best node for processing based on strategy
   */
  private async selectNode(eventData: FraudEventData): Promise<FraudProcessingNode | null> {
    const healthyNodes = Array.from(this.nodes.values())
      .filter(node => node.status === 'healthy' && node.activeConnections < node.maxConnections)
      .filter(node => this.circuitBreakers.get(node.id)?.isAvailable() ?? false);

    if (healthyNodes.length === 0) {
      return null;
    }

    switch (this.strategy.type) {
      case 'round_robin':
        return this.selectRoundRobin(healthyNodes);
      
      case 'least_connections':
        return this.selectLeastConnections(healthyNodes);
      
      case 'weighted_response_time':
        return this.selectWeightedResponseTime(healthyNodes);
      
      case 'geographic':
        return this.selectGeographic(healthyNodes, eventData);
      
      case 'fraud_type_based':
        return this.selectByFraudType(healthyNodes, eventData);
      
      default:
        return this.selectWeightedResponseTime(healthyNodes);
    }
  }

  private selectRoundRobin(nodes: FraudProcessingNode[]): FraudProcessingNode {
    // Simple round-robin implementation
    const timestamp = Date.now();
    const index = Math.floor(timestamp / 1000) % nodes.length;
    return nodes[index];
  }

  private selectLeastConnections(nodes: FraudProcessingNode[]): FraudProcessingNode {
    return nodes.reduce((best, current) =>
      current.activeConnections < best.activeConnections ? current : best
    );
  }

  private selectWeightedResponseTime(nodes: FraudProcessingNode[]): FraudProcessingNode {
    const config = this.strategy.config;
    
    const scoredNodes = nodes.map(node => {
      const connectionScore = (node.maxConnections - node.activeConnections) / node.maxConnections;
      const responseTimeScore = 1000 / Math.max(node.responseTime, 1);
      const errorRateScore = 1 - node.errorRate;
      
      const totalScore = 
        (responseTimeScore * config.responseTimeWeight) +
        (connectionScore * config.connectionWeight) +
        (errorRateScore * config.errorRateWeight) +
        (node.weight / 100 * config.geographicBonus);
      
      return { node, score: totalScore };
    });

    return scoredNodes.reduce((best, current) =>
      current.score > best.score ? current : best
    ).node;
  }

  private selectGeographic(nodes: FraudProcessingNode[], eventData: FraudEventData): FraudProcessingNode {
    // Prefer nodes in same region as the event
    const userRegion = this.determineUserRegion(eventData);
    
    const regionalNodes = nodes.filter(node => node.region === userRegion);
    if (regionalNodes.length > 0) {
      return this.selectWeightedResponseTime(regionalNodes);
    }
    
    return this.selectWeightedResponseTime(nodes);
  }

  private selectByFraudType(nodes: FraudProcessingNode[], eventData: FraudEventData): FraudProcessingNode {
    // Determine required fraud detection capability
    const requiredCapability = this.getFraudTypeCapability(eventData);
    
    const capableNodes = nodes.filter(node =>
      node.capabilities.includes(requiredCapability)
    );
    
    if (capableNodes.length > 0) {
      return this.selectWeightedResponseTime(capableNodes);
    }
    
    return this.selectWeightedResponseTime(nodes);
  }

  /**
   * Execute fraud check on selected node
   */
  private async executeOnNode(node: FraudProcessingNode, eventData: FraudEventData): Promise<FraudCheckResult> {
    const circuitBreaker = this.circuitBreakers.get(node.id);
    if (!circuitBreaker?.isAvailable()) {
      throw new Error(`Node ${node.id} circuit breaker is open`);
    }

    // Increment active connections
    node.activeConnections++;
    
    try {
      const result = await circuitBreaker.execute(async () => {
        // In production, this would make HTTP request to the processing node
        const response = await this.makeHttpRequest(node.url + '/api/fraud/check', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Node-ID': node.id,
            'X-Request-ID': `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
          },
          body: JSON.stringify(eventData),
          timeout: this.processingTimeout
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return await response.json();
      });

      return result;
    } finally {
      // Decrement active connections
      node.activeConnections = Math.max(0, node.activeConnections - 1);
    }
  }

  /**
   * Queue request during high load
   */
  private shouldQueue(eventData: FraudEventData): boolean {
    const totalActiveConnections = Array.from(this.nodes.values())
      .reduce((sum, node) => sum + node.activeConnections, 0);
    
    const totalMaxConnections = Array.from(this.nodes.values())
      .reduce((sum, node) => sum + node.maxConnections, 0);
    
    const utilizationRate = totalActiveConnections / totalMaxConnections;
    
    // Queue if utilization > 80% and queue is not full
    return utilizationRate > 0.8 && this.requestQueue.length < this.maxQueueSize;
  }

  private async queueRequest(eventData: FraudEventData): Promise<FraudCheckResult> {
    return new Promise((resolve, reject) => {
      const queuedRequest: QueuedRequest = {
        eventData,
        resolve,
        reject,
        queuedAt: Date.now(),
        priority: this.calculatePriority(eventData)
      };
      
      this.requestQueue.push(queuedRequest);
      this.requestQueue.sort((a, b) => b.priority - a.priority); // Higher priority first
      
      metricsCollector.incrementCounter('fraud_lb_queued_requests_total');
      metricsCollector.setGauge('fraud_lb_queue_size', this.requestQueue.length);
    });
  }

  /**
   * Process queued requests
   */
  private startQueueProcessor(): void {
    setInterval(async () => {
      if (this.requestQueue.length === 0) return;
      
      const availableCapacity = this.getAvailableCapacity();
      const batchSize = Math.min(availableCapacity, this.requestQueue.length, 50);
      
      if (batchSize <= 0) return;
      
      const batch = this.requestQueue.splice(0, batchSize);
      
      await Promise.allSettled(
        batch.map(async (request) => {
          try {
            const result = await this.processFraudCheck(request.eventData);
            request.resolve(result);
            
            const queueTime = Date.now() - request.queuedAt;
            metricsCollector.recordHistogram('fraud_lb_queue_time_ms', queueTime);
          } catch (error) {
            request.reject(error);
          }
        })
      );
      
      metricsCollector.setGauge('fraud_lb_queue_size', this.requestQueue.length);
    }, 100); // Process queue every 100ms
  }

  /**
   * Health checking for nodes
   */
  private startHealthChecking(): void {
    setInterval(async () => {
      for (const [nodeId, node] of this.nodes) {
        try {
          const healthResult = await this.checkNodeHealth(node);
          this.updateNodeStatus(nodeId, healthResult);
        } catch (error) {
          console.error(`Health check failed for node ${nodeId}:`, error);
          this.updateNodeStatus(nodeId, { healthy: false, responseTime: 99999, errorRate: 1.0 });
        }
      }
    }, 30000); // Health check every 30 seconds
  }

  private async checkNodeHealth(node: FraudProcessingNode): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      const response = await this.makeHttpRequest(node.url + '/health', {
        method: 'GET',
        timeout: 5000
      });
      
      const responseTime = Date.now() - startTime;
      const healthy = response.ok;
      
      return {
        healthy,
        responseTime,
        errorRate: node.errorRate * 0.9 // Decay error rate on successful health check
      };
    } catch (error) {
      return {
        healthy: false,
        responseTime: Date.now() - startTime,
        errorRate: Math.min(1.0, node.errorRate * 1.1) // Increase error rate on failed health check
      };
    }
  }

  private updateNodeStatus(nodeId: string, healthResult: HealthCheckResult): void {
    const node = this.nodes.get(nodeId);
    if (!node) return;
    
    node.responseTime = healthResult.responseTime;
    node.errorRate = healthResult.errorRate;
    node.lastHealthCheck = new Date();
    
    // Update status based on health metrics
    if (!healthResult.healthy || healthResult.errorRate > 0.1) {
      node.status = 'unhealthy';
    } else if (healthResult.responseTime > 1000 || healthResult.errorRate > 0.05) {
      node.status = 'degraded';
    } else {
      node.status = 'healthy';
    }
    
    // Update metrics
    metricsCollector.setGauge('fraud_lb_node_response_time_ms', healthResult.responseTime, {
      node_id: nodeId,
      region: node.region
    });
    
    metricsCollector.setGauge('fraud_lb_node_error_rate', healthResult.errorRate, {
      node_id: nodeId,
      region: node.region
    });
  }

  // Helper methods
  private determineUserRegion(eventData: FraudEventData): 'manila' | 'cebu' | 'davao' | 'global' {
    // Simple region determination - in production, use actual location data
    const userId = eventData.userId;
    const hash = userId.split('').reduce((a, b) => ((a << 5) - a + b.charCodeAt(0)) | 0, 0);
    const regions = ['manila', 'cebu', 'davao'] as const;
    return regions[Math.abs(hash) % regions.length];
  }

  private getFraudTypeCapability(eventData: FraudEventData): string {
    switch (eventData.eventType) {
      case 'ride_request':
      case 'ride_end':
        return 'rider_incentive_fraud';
      case 'gps_update':
        return 'gps_spoofing';
      case 'login':
      case 'registration':
        return 'multi_accounting';
      case 'payment':
        return 'payment_fraud';
      default:
        return 'rider_incentive_fraud';
    }
  }

  private calculatePriority(eventData: FraudEventData): number {
    let priority = 50; // Base priority
    
    // Higher priority for real-time events
    if (eventData.eventType === 'gps_update') priority += 30;
    if (eventData.eventType === 'payment') priority += 20;
    
    // Higher priority for drivers (less false positive concern)
    if (eventData.userType === 'driver') priority += 10;
    
    return priority;
  }

  private getAvailableCapacity(): number {
    return Array.from(this.nodes.values())
      .filter(node => node.status === 'healthy')
      .reduce((sum, node) => sum + Math.max(0, node.maxConnections - node.activeConnections), 0);
  }

  private updateNodeMetrics(nodeId: string, responseTime: number, success: boolean): void {
    const node = this.nodes.get(nodeId);
    if (!node) return;
    
    // Exponential moving average for response time
    node.responseTime = node.responseTime * 0.9 + responseTime * 0.1;
    
    // Update error rate
    if (success) {
      node.errorRate = node.errorRate * 0.95;
    } else {
      node.errorRate = Math.min(1.0, node.errorRate * 1.1 + 0.01);
    }
  }

  private async fallbackProcessing(eventData: FraudEventData): Promise<FraudCheckResult> {
    // Fallback to local processing when all nodes are unavailable
    console.warn('Using fallback local fraud processing');
    
    metricsCollector.incrementCounter('fraud_lb_fallback_total');
    
    // Return minimal result to prevent complete failure
    return {
      riskScore: 0,
      alerts: [],
      blockedActions: [],
      flaggedForReview: false,
      reasoning: ['Fallback processing - nodes unavailable']
    };
  }

  private async makeHttpRequest(url: string, options: any): Promise<Response> {
    // Mock HTTP request implementation
    // In production, use actual HTTP client like fetch or axios
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          ok: Math.random() > 0.02, // 98% success rate
          status: 200,
          statusText: 'OK',
          json: async () => ({
            riskScore: Math.floor(Math.random() * 100),
            alerts: [],
            blockedActions: [],
            flaggedForReview: false,
            reasoning: []
          })
        } as Response);
      }, 50 + Math.random() * 200); // 50-250ms response time
    });
  }

  // Public API methods
  public getNodeStatus(): Map<string, FraudProcessingNode> {
    return new Map(this.nodes);
  }

  public setLoadBalancingStrategy(strategy: LoadBalancingStrategy): void {
    this.strategy = strategy;
  }

  public addNode(node: FraudProcessingNode): void {
    this.nodes.set(node.id, node);
    this.circuitBreakers.set(node.id, new CircuitBreaker(node.id, {
      failureThreshold: 5,
      recoveryTime: 60000,
      requestTimeout: this.processingTimeout
    }));
  }

  public removeNode(nodeId: string): void {
    this.nodes.delete(nodeId);
    this.circuitBreakers.delete(nodeId);
  }

  public getLoadBalancingStats() {
    return {
      totalNodes: this.nodes.size,
      healthyNodes: Array.from(this.nodes.values()).filter(n => n.status === 'healthy').length,
      queueSize: this.requestQueue.length,
      totalActiveConnections: Array.from(this.nodes.values()).reduce((sum, n) => sum + n.activeConnections, 0),
      strategy: this.strategy
    };
  }
}

// Supporting interfaces and classes
interface QueuedRequest {
  eventData: FraudEventData;
  resolve: (result: FraudCheckResult) => void;
  reject: (error: Error) => void;
  queuedAt: number;
  priority: number;
}

interface HealthCheckResult {
  healthy: boolean;
  responseTime: number;
  errorRate: number;
}

class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: 'closed' | 'open' | 'half_open' = 'closed';

  constructor(
    private nodeId: string,
    private config: {
      failureThreshold: number;
      recoveryTime: number;
      requestTimeout: number;
    }
  ) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailureTime > this.config.recoveryTime) {
        this.state = 'half_open';
      } else {
        throw new Error(`Circuit breaker is open for node ${this.nodeId}`);
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  isAvailable(): boolean {
    return this.state !== 'open';
  }

  private onSuccess(): void {
    this.failures = 0;
    this.state = 'closed';
  }

  private onFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();
    
    if (this.failures >= this.config.failureThreshold) {
      this.state = 'open';
    }
  }
}

// Export singleton instance
export const fraudDetectionLoadBalancer = FraudDetectionLoadBalancer.getInstance();