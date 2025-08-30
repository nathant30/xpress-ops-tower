'use client';

import { logger } from '../security/productionLogger';

interface GraphNode {
  id: string;
  type: 'user' | 'device' | 'location' | 'payment' | 'ip' | 'transaction';
  properties: Record<string, any>;
  embedding?: number[];
  riskScore: number;
  lastUpdated: number;
  metadata: {
    region?: 'manila' | 'cebu' | 'davao';
    userType?: 'driver' | 'passenger';
    deviceType?: 'android' | 'ios' | 'web';
  };
}

interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: 'uses_device' | 'shares_location' | 'same_payment' | 'same_ip' | 'transaction' | 'referral' | 'suspicious_pattern';
  weight: number;
  properties: Record<string, any>;
  createdAt: number;
  strength: number; // 0-1 indicating connection strength
}

interface FraudNetwork {
  id: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
  centerNode: string; // Most connected node
  networkScore: number; // Overall fraud risk of network
  networkType: 'device_farm' | 'account_circle' | 'payment_ring' | 'location_cluster' | 'referral_fraud';
  confidence: number;
  discoveredAt: number;
  size: number;
  density: number; // How interconnected the network is
  suspiciousPatterns: string[];
  geographicSpread: {
    regions: ('manila' | 'cebu' | 'davao')[];
    concentrated: boolean;
  };
  financialImpact: {
    estimatedLoss: number;
    transactionsAffected: number;
    timeSpan: number;
  };
}

interface GraphEmbedding {
  nodeId: string;
  vector: number[];
  clusterId?: string;
  anomalyScore: number;
  lastComputed: number;
}

interface PredictionResult {
  nodeId: string;
  predictedRisk: number;
  confidenceInterval: [number, number];
  factors: Array<{
    factor: string;
    contribution: number;
    explanation: string;
  }>;
  timeHorizon: '1h' | '24h' | '7d' | '30d';
  recommendedActions: string[];
}

interface GraphAnalytics {
  totalNodes: number;
  totalEdges: number;
  networksDetected: number;
  avgClusteringCoefficient: number;
  networkEfficiency: number;
  anomalousNodes: number;
  topRiskNodes: GraphNode[];
  communityDetection: Array<{
    communityId: string;
    nodes: string[];
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    characteristics: string[];
  }>;
}

class GraphNeuralNetwork {
  private static instance: GraphNeuralNetwork;
  private graph: Map<string, GraphNode> = new Map();
  private edges: Map<string, GraphEdge> = new Map();
  private embeddings: Map<string, GraphEmbedding> = new Map();
  private detectedNetworks: Map<string, FraudNetwork> = new Map();
  private embeddingDimension = 128;
  private learningRate = 0.01;
  private modelVersion = 'gnn_v2.1';

  private constructor() {
    this.initializeGraph();
    this.startPeriodicAnalysis();
  }

  static getInstance(): GraphNeuralNetwork {
    if (!GraphNeuralNetwork.instance) {
      GraphNeuralNetwork.instance = new GraphNeuralNetwork();
    }
    return GraphNeuralNetwork.instance;
  }

  private initializeGraph(): void {
    // Initialize with some seed data representing typical fraud patterns
    this.addSeedNodes();
    this.addSeedEdges();
    logger.info('Graph Neural Network initialized with seed data');
  }

  private addSeedNodes(): void {
    // Create various node types with realistic fraud patterns
    const seedUsers = [
      {
        id: 'user_fraud_spoofer_001',
        type: 'user' as const,
        properties: {
          accountAge: 30,
          totalTrips: 156,
          avgTripDistance: 45.2,
          cancelationRate: 0.12,
          rating: 3.2,
          phoneVerified: false,
          emailVerified: true
        },
        riskScore: 0.89,
        metadata: { region: 'manila' as const, userType: 'driver' as const }
      },
      {
        id: 'user_normal_001',
        type: 'user' as const,
        properties: {
          accountAge: 365,
          totalTrips: 1250,
          avgTripDistance: 12.8,
          cancelationRate: 0.04,
          rating: 4.7,
          phoneVerified: true,
          emailVerified: true
        },
        riskScore: 0.15,
        metadata: { region: 'cebu' as const, userType: 'passenger' as const }
      }
    ];

    const seedDevices = [
      {
        id: 'device_emulator_001',
        type: 'device' as const,
        properties: {
          fingerprint: 'android_emulator_x86_64',
          isRooted: true,
          isEmulator: true,
          appVersion: '2.1.0',
          osVersion: '12.0',
          screenResolution: '1080x1920',
          batteryLevel: 100, // Always 100% suspicious
          accountsUsed: 15
        },
        riskScore: 0.95,
        metadata: { deviceType: 'android' as const }
      }
    ];

    const seedLocations = [
      {
        id: 'location_hotspot_001',
        type: 'location' as const,
        properties: {
          lat: 14.5995,
          lng: 120.9842,
          radius: 100,
          fraudIncidents: 89,
          totalActivities: 1200,
          riskRating: 'high',
          locationName: 'Manila CBD Hotspot'
        },
        riskScore: 0.74,
        metadata: { region: 'manila' as const }
      }
    ];

    [...seedUsers, ...seedDevices, ...seedLocations].forEach(node => {
      this.graph.set(node.id, {
        ...node,
        embedding: this.generateRandomEmbedding(),
        lastUpdated: Date.now()
      });
    });
  }

  private addSeedEdges(): void {
    const seedEdges = [
      {
        id: 'edge_user_device_001',
        source: 'user_fraud_spoofer_001',
        target: 'device_emulator_001',
        type: 'uses_device' as const,
        weight: 0.9,
        properties: {
          usageFrequency: 'daily',
          suspiciousPatterns: ['always_100_battery', 'identical_fingerprint'],
          firstSeen: Date.now() - 30 * 24 * 60 * 60 * 1000
        },
        strength: 0.95
      },
      {
        id: 'edge_user_location_001',
        source: 'user_fraud_spoofer_001',
        target: 'location_hotspot_001',
        type: 'shares_location' as const,
        weight: 0.7,
        properties: {
          visitFrequency: 'high',
          tripCount: 45,
          anomalousVisits: 12
        },
        strength: 0.85
      }
    ];

    seedEdges.forEach(edge => {
      this.edges.set(edge.id, {
        ...edge,
        createdAt: Date.now()
      });
    });
  }

  private startPeriodicAnalysis(): void {
    // Run network analysis every 5 minutes
    setInterval(() => {
      this.performNetworkAnalysis();
    }, 5 * 60 * 1000);

    // Update embeddings every hour
    setInterval(() => {
      this.updateNodeEmbeddings();
    }, 60 * 60 * 1000);

    // Detect new fraud networks every 15 minutes
    setInterval(() => {
      this.detectFraudNetworks();
    }, 15 * 60 * 1000);
  }

  addNode(node: Omit<GraphNode, 'lastUpdated' | 'embedding'>): void {
    const fullNode: GraphNode = {
      ...node,
      lastUpdated: Date.now(),
      embedding: this.generateRandomEmbedding()
    };

    this.graph.set(node.id, fullNode);
    
    // Compute initial embedding based on properties
    this.computeNodeEmbedding(node.id);
    
    logger.debug(`Added node: ${node.id} (${node.type})`);
  }

  addEdge(edge: Omit<GraphEdge, 'createdAt'>): void {
    const fullEdge: GraphEdge = {
      ...edge,
      createdAt: Date.now()
    };

    this.edges.set(edge.id, fullEdge);
    
    // Update embeddings for connected nodes
    this.updateConnectedNodeEmbeddings(edge.source, edge.target);
    
    logger.debug(`Added edge: ${edge.source} -> ${edge.target} (${edge.type})`);
  }

  private generateRandomEmbedding(): number[] {
    return Array.from({ length: this.embeddingDimension }, () => 
      (Math.random() - 0.5) * 2 // Values between -1 and 1
    );
  }

  private computeNodeEmbedding(nodeId: string): void {
    const node = this.graph.get(nodeId);
    if (!node) return;

    // Simple GNN-style embedding computation
    const neighborEmbeddings = this.getNeighborEmbeddings(nodeId);
    const propertyEmbedding = this.encodeNodeProperties(node.properties);
    
    // Aggregate neighbor embeddings
    const aggregatedNeighbors = neighborEmbeddings.length > 0 
      ? this.aggregateEmbeddings(neighborEmbeddings)
      : new Array(this.embeddingDimension).fill(0);

    // Combine with node properties (simplified GCN operation)
    const newEmbedding = propertyEmbedding.map((val, idx) => 
      0.6 * val + 0.4 * aggregatedNeighbors[idx]
    );

    // Store embedding
    this.embeddings.set(nodeId, {
      nodeId,
      vector: newEmbedding,
      anomalyScore: this.computeAnomalyScore(newEmbedding),
      lastComputed: Date.now()
    });

    // Update node
    node.embedding = newEmbedding;
    this.graph.set(nodeId, node);
  }

  private getNeighborEmbeddings(nodeId: string): number[][] {
    const neighborEmbeddings: number[][] = [];
    
    this.edges.forEach(edge => {
      let neighborId: string | null = null;
      
      if (edge.source === nodeId) {
        neighborId = edge.target;
      } else if (edge.target === nodeId) {
        neighborId = edge.source;
      }

      if (neighborId) {
        const neighbor = this.graph.get(neighborId);
        if (neighbor?.embedding) {
          // Weight by edge strength
          const weightedEmbedding = neighbor.embedding.map(val => val * edge.strength);
          neighborEmbeddings.push(weightedEmbedding);
        }
      }
    });

    return neighborEmbeddings;
  }

  private encodeNodeProperties(properties: Record<string, any>): number[] {
    // Simple property encoding - in production, this would be more sophisticated
    const encoding = new Array(this.embeddingDimension).fill(0);
    
    // Encode different property types
    let idx = 0;
    
    Object.entries(properties).forEach(([key, value]) => {
      if (idx >= this.embeddingDimension) return;
      
      if (typeof value === 'number') {
        // Normalize numeric values
        encoding[idx] = Math.tanh(value / 100); // Simple normalization
      } else if (typeof value === 'boolean') {
        encoding[idx] = value ? 1 : -1;
      } else if (typeof value === 'string') {
        // Simple string hash to numeric
        encoding[idx] = Math.tanh(this.hashString(value) / 1000);
      }
      
      idx++;
    });

    return encoding;
  }

  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  private aggregateEmbeddings(embeddings: number[][]): number[] {
    if (embeddings.length === 0) return new Array(this.embeddingDimension).fill(0);
    
    const aggregated = new Array(this.embeddingDimension).fill(0);
    
    embeddings.forEach(embedding => {
      embedding.forEach((value, idx) => {
        aggregated[idx] += value;
      });
    });

    // Average aggregation
    return aggregated.map(val => val / embeddings.length);
  }

  private computeAnomalyScore(embedding: number[]): number {
    // Simple anomaly detection based on embedding magnitude and distribution
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    const meanAbs = embedding.reduce((sum, val) => sum + Math.abs(val), 0) / embedding.length;
    
    // Combine magnitude and mean absolute value as anomaly indicators
    const anomalyScore = Math.tanh(magnitude * 0.1 + meanAbs * 0.5);
    
    return Math.min(Math.max(anomalyScore, 0), 1);
  }

  private updateConnectedNodeEmbeddings(nodeId1: string, nodeId2: string): void {
    this.computeNodeEmbedding(nodeId1);
    this.computeNodeEmbedding(nodeId2);
  }

  private updateNodeEmbeddings(): void {
    logger.info('Updating node embeddings...');
    
    this.graph.forEach((node, nodeId) => {
      this.computeNodeEmbedding(nodeId);
    });
    
    logger.info(`Updated ${this.graph.size} node embeddings`);
  }

  private performNetworkAnalysis(): void {
    const analytics = this.computeGraphAnalytics();
    logger.info('Network Analysis:', JSON.stringify({
      nodes: analytics.totalNodes,
      edges: analytics.totalEdges,
      networks: analytics.networksDetected,
      anomalous: analytics.anomalousNodes
    }));
  }

  private detectFraudNetworks(): void {
    logger.info('Detecting fraud networks...');
    
    // Community detection using simple clustering
    const communities = this.detectCommunities();
    
    communities.forEach(community => {
      const network = this.analyzeCommunitForFraud(community);
      if (network) {
        this.detectedNetworks.set(network.id, network);
        logger.warn(`Fraud network detected: ${network.networkType} (${network.size} nodes)`);
      }
    });
  }

  private detectCommunities(): Array<{ nodes: string[]; edges: GraphEdge[] }> {
    const communities: Array<{ nodes: string[]; edges: GraphEdge[] }> = [];
    const visited = new Set<string>();
    
    // Simple connected component detection
    this.graph.forEach((node, nodeId) => {
      if (visited.has(nodeId)) return;
      
      const component = this.exploreComponent(nodeId, visited);
      if (component.nodes.length >= 3) { // Minimum community size
        communities.push(component);
      }
    });

    return communities;
  }

  private exploreComponent(startNodeId: string, visited: Set<string>): { nodes: string[]; edges: GraphEdge[] } {
    const nodes: string[] = [];
    const edges: GraphEdge[] = [];
    const stack = [startNodeId];
    
    while (stack.length > 0) {
      const nodeId = stack.pop()!;
      if (visited.has(nodeId)) continue;
      
      visited.add(nodeId);
      nodes.push(nodeId);
      
      // Find connected nodes
      this.edges.forEach(edge => {
        if (edge.source === nodeId && !visited.has(edge.target)) {
          stack.push(edge.target);
          edges.push(edge);
        } else if (edge.target === nodeId && !visited.has(edge.source)) {
          stack.push(edge.source);
          edges.push(edge);
        }
      });
    }

    return { nodes, edges };
  }

  private analyzeCommunitForFraud(community: { nodes: string[]; edges: GraphEdge[] }): FraudNetwork | null {
    const communityNodes = community.nodes.map(id => this.graph.get(id)!);
    const avgRiskScore = communityNodes.reduce((sum, node) => sum + node.riskScore, 0) / communityNodes.length;
    
    // Only consider high-risk communities
    if (avgRiskScore < 0.6) return null;

    // Determine network type based on characteristics
    const networkType = this.classifyNetworkType(communityNodes, community.edges);
    const suspiciousPatterns = this.identifySuspiciousPatterns(communityNodes, community.edges);
    
    // Calculate network density
    const maxPossibleEdges = communityNodes.length * (communityNodes.length - 1) / 2;
    const density = community.edges.length / Math.max(maxPossibleEdges, 1);
    
    // Find center node (most connected)
    const nodeDegrees = new Map<string, number>();
    community.edges.forEach(edge => {
      nodeDegrees.set(edge.source, (nodeDegrees.get(edge.source) || 0) + 1);
      nodeDegrees.set(edge.target, (nodeDegrees.get(edge.target) || 0) + 1);
    });
    
    const centerNode = Array.from(nodeDegrees.entries())
      .sort((a, b) => b[1] - a[1])[0]?.[0] || communityNodes[0].id;

    const network: FraudNetwork = {
      id: `network_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      nodes: communityNodes,
      edges: community.edges,
      centerNode,
      networkScore: avgRiskScore,
      networkType,
      confidence: this.calculateNetworkConfidence(communityNodes, community.edges),
      discoveredAt: Date.now(),
      size: communityNodes.length,
      density,
      suspiciousPatterns,
      geographicSpread: this.analyzeGeographicSpread(communityNodes),
      financialImpact: this.estimateFinancialImpact(communityNodes, community.edges)
    };

    return network;
  }

  private classifyNetworkType(nodes: GraphNode[], edges: GraphEdge[]): FraudNetwork['networkType'] {
    const deviceSharing = edges.filter(e => e.type === 'uses_device').length;
    const locationSharing = edges.filter(e => e.type === 'shares_location').length;
    const paymentSharing = edges.filter(e => e.type === 'same_payment').length;
    const deviceNodes = nodes.filter(n => n.type === 'device').length;

    // Classification logic based on edge patterns
    if (deviceNodes > 0 && deviceSharing > nodes.length * 0.8) {
      return 'device_farm';
    } else if (locationSharing > edges.length * 0.6) {
      return 'location_cluster';
    } else if (paymentSharing > 0) {
      return 'payment_ring';
    } else if (edges.some(e => e.type === 'referral')) {
      return 'referral_fraud';
    }
    
    return 'account_circle';
  }

  private identifySuspiciousPatterns(nodes: GraphNode[], edges: GraphEdge[]): string[] {
    const patterns: string[] = [];
    
    // Check for device sharing
    const deviceEdges = edges.filter(e => e.type === 'uses_device');
    if (deviceEdges.length > 3) {
      patterns.push(`Multiple users sharing ${deviceEdges.length} devices`);
    }

    // Check for emulator usage
    const emulatorNodes = nodes.filter(n => 
      n.type === 'device' && n.properties.isEmulator === true
    );
    if (emulatorNodes.length > 0) {
      patterns.push(`${emulatorNodes.length} emulator devices detected`);
    }

    // Check for high-risk locations
    const highRiskLocations = nodes.filter(n => 
      n.type === 'location' && n.riskScore > 0.7
    );
    if (highRiskLocations.length > 0) {
      patterns.push(`Activity in ${highRiskLocations.length} high-risk locations`);
    }

    // Check for rapid account creation
    const recentAccounts = nodes.filter(n => 
      n.type === 'user' && 
      n.properties.accountAge && 
      n.properties.accountAge < 30
    );
    if (recentAccounts.length > 2) {
      patterns.push(`${recentAccounts.length} recently created accounts`);
    }

    return patterns;
  }

  private calculateNetworkConfidence(nodes: GraphNode[], edges: GraphEdge[]): number {
    let confidence = 0.5; // Base confidence
    
    // Increase confidence based on strong indicators
    const avgRiskScore = nodes.reduce((sum, n) => sum + n.riskScore, 0) / nodes.length;
    confidence += avgRiskScore * 0.3;
    
    // Edge strength contribution
    const avgEdgeStrength = edges.reduce((sum, e) => sum + e.strength, 0) / edges.length;
    confidence += avgEdgeStrength * 0.2;
    
    // Size and density bonus
    if (nodes.length >= 5) confidence += 0.1;
    if (edges.length / Math.max(nodes.length, 1) > 1.5) confidence += 0.1;
    
    return Math.min(confidence, 0.98);
  }

  private analyzeGeographicSpread(nodes: GraphNode[]): FraudNetwork['geographicSpread'] {
    const regions = new Set<'manila' | 'cebu' | 'davao'>();
    
    nodes.forEach(node => {
      if (node.metadata.region) {
        regions.add(node.metadata.region);
      }
    });

    return {
      regions: Array.from(regions),
      concentrated: regions.size === 1
    };
  }

  private estimateFinancialImpact(nodes: GraphNode[], edges: GraphEdge[]): FraudNetwork['financialImpact'] {
    // Simplified financial impact calculation
    const userNodes = nodes.filter(n => n.type === 'user');
    const avgRiskScore = userNodes.reduce((sum, n) => sum + n.riskScore, 0) / userNodes.length;
    
    const estimatedLoss = userNodes.length * avgRiskScore * 500 * 30; // Rough estimate
    const transactionsAffected = userNodes.reduce((sum, n) => 
      sum + (n.properties.totalTrips || 0), 0
    );
    
    return {
      estimatedLoss,
      transactionsAffected,
      timeSpan: 30 * 24 * 60 * 60 * 1000 // 30 days in ms
    };
  }

  async predictNodeRisk(nodeId: string, timeHorizon: '1h' | '24h' | '7d' | '30d' = '24h'): Promise<PredictionResult> {
    const node = this.graph.get(nodeId);
    if (!node) {
      throw new Error(`Node not found: ${nodeId}`);
    }

    // Get current embedding
    const embedding = this.embeddings.get(nodeId);
    if (!embedding) {
      throw new Error(`No embedding found for node: ${nodeId}`);
    }

    // Simple risk prediction based on embedding and neighbors
    const neighborRisks = this.getNeighborRiskScores(nodeId);
    const embeddingRisk = embedding.anomalyScore;
    
    // Weighted combination
    const predictedRisk = 0.6 * embeddingRisk + 0.4 * neighborRisks;
    
    // Calculate confidence interval
    const uncertainty = 0.1 * (1 - embedding.anomalyScore);
    const confidenceInterval: [number, number] = [
      Math.max(predictedRisk - uncertainty, 0),
      Math.min(predictedRisk + uncertainty, 1)
    ];

    // Generate explanation factors
    const factors = this.generateRiskFactors(node, embedding, neighborRisks);
    
    // Generate recommendations
    const recommendedActions = this.generateRecommendations(predictedRisk, factors);

    return {
      nodeId,
      predictedRisk,
      confidenceInterval,
      factors,
      timeHorizon,
      recommendedActions
    };
  }

  private getNeighborRiskScores(nodeId: string): number {
    const neighborScores: number[] = [];
    
    this.edges.forEach(edge => {
      let neighborId: string | null = null;
      
      if (edge.source === nodeId) {
        neighborId = edge.target;
      } else if (edge.target === nodeId) {
        neighborId = edge.source;
      }

      if (neighborId) {
        const neighbor = this.graph.get(neighborId);
        if (neighbor) {
          // Weight by edge strength and recency
          const ageWeight = Math.exp(-(Date.now() - edge.createdAt) / (30 * 24 * 60 * 60 * 1000));
          neighborScores.push(neighbor.riskScore * edge.strength * ageWeight);
        }
      }
    });

    return neighborScores.length > 0 
      ? neighborScores.reduce((sum, score) => sum + score, 0) / neighborScores.length
      : 0;
  }

  private generateRiskFactors(
    node: GraphNode, 
    embedding: GraphEmbedding, 
    neighborRisk: number
  ): PredictionResult['factors'] {
    const factors: PredictionResult['factors'] = [];

    // Node-specific factors
    if (node.riskScore > 0.7) {
      factors.push({
        factor: 'High Historical Risk',
        contribution: node.riskScore * 0.4,
        explanation: `Node has consistently high risk score of ${Math.round(node.riskScore * 100)}%`
      });
    }

    // Embedding anomaly
    if (embedding.anomalyScore > 0.6) {
      factors.push({
        factor: 'Behavioral Anomaly',
        contribution: embedding.anomalyScore * 0.3,
        explanation: 'Node behavior patterns deviate significantly from normal'
      });
    }

    // Network influence
    if (neighborRisk > 0.5) {
      factors.push({
        factor: 'High-Risk Network',
        contribution: neighborRisk * 0.3,
        explanation: 'Connected to other high-risk entities in the network'
      });
    }

    // Node type specific factors
    if (node.type === 'device' && node.properties.isEmulator) {
      factors.push({
        factor: 'Emulator Device',
        contribution: 0.8,
        explanation: 'Device is identified as an emulator, commonly used in fraud'
      });
    }

    return factors.sort((a, b) => b.contribution - a.contribution);
  }

  private generateRecommendations(predictedRisk: number, factors: PredictionResult['factors']): string[] {
    const recommendations: string[] = [];

    if (predictedRisk > 0.8) {
      recommendations.push('Immediate investigation required');
      recommendations.push('Consider temporary account suspension');
      recommendations.push('Flag all associated accounts for review');
    } else if (predictedRisk > 0.6) {
      recommendations.push('Enhanced monitoring recommended');
      recommendations.push('Review recent transaction patterns');
      recommendations.push('Verify identity and documentation');
    } else if (predictedRisk > 0.4) {
      recommendations.push('Routine monitoring sufficient');
      recommendations.push('Periodic risk assessment');
    }

    // Factor-specific recommendations
    factors.forEach(factor => {
      if (factor.factor === 'Emulator Device') {
        recommendations.push('Require genuine device verification');
      } else if (factor.factor === 'High-Risk Network') {
        recommendations.push('Investigate connected entities');
      }
    });

    return [...new Set(recommendations)]; // Remove duplicates
  }

  private computeGraphAnalytics(): GraphAnalytics {
    const totalNodes = this.graph.size;
    const totalEdges = this.edges.size;
    const networksDetected = this.detectedNetworks.size;
    
    // Calculate clustering coefficient (simplified)
    let totalClusteringCoeff = 0;
    this.graph.forEach((node, nodeId) => {
      const clusteringCoeff = this.calculateClusteringCoefficient(nodeId);
      totalClusteringCoeff += clusteringCoeff;
    });
    const avgClusteringCoefficient = totalNodes > 0 ? totalClusteringCoeff / totalNodes : 0;

    // Find anomalous nodes
    const anomalousNodes = Array.from(this.graph.values())
      .filter(node => node.riskScore > 0.7).length;

    // Get top risk nodes
    const topRiskNodes = Array.from(this.graph.values())
      .sort((a, b) => b.riskScore - a.riskScore)
      .slice(0, 10);

    // Community detection results
    const communities = this.detectCommunities();
    const communityDetection = communities.map((community, idx) => ({
      communityId: `community_${idx}`,
      nodes: community.nodes,
      riskLevel: this.assessCommunityRiskLevel(community),
      characteristics: this.describeCommunityCharacteristics(community)
    }));

    return {
      totalNodes,
      totalEdges,
      networksDetected,
      avgClusteringCoefficient,
      networkEfficiency: this.calculateNetworkEfficiency(),
      anomalousNodes,
      topRiskNodes,
      communityDetection
    };
  }

  private calculateClusteringCoefficient(nodeId: string): number {
    // Simplified clustering coefficient calculation
    const neighbors = this.getNeighbors(nodeId);
    if (neighbors.length < 2) return 0;

    let triangles = 0;
    const maxTriangles = neighbors.length * (neighbors.length - 1) / 2;

    for (let i = 0; i < neighbors.length; i++) {
      for (let j = i + 1; j < neighbors.length; j++) {
        if (this.areConnected(neighbors[i], neighbors[j])) {
          triangles++;
        }
      }
    }

    return maxTriangles > 0 ? triangles / maxTriangles : 0;
  }

  private getNeighbors(nodeId: string): string[] {
    const neighbors: string[] = [];
    
    this.edges.forEach(edge => {
      if (edge.source === nodeId) {
        neighbors.push(edge.target);
      } else if (edge.target === nodeId) {
        neighbors.push(edge.source);
      }
    });

    return neighbors;
  }

  private areConnected(nodeId1: string, nodeId2: string): boolean {
    return Array.from(this.edges.values()).some(edge =>
      (edge.source === nodeId1 && edge.target === nodeId2) ||
      (edge.source === nodeId2 && edge.target === nodeId1)
    );
  }

  private calculateNetworkEfficiency(): number {
    // Simplified network efficiency calculation
    return 0.75 + Math.random() * 0.2; // Mock implementation
  }

  private assessCommunityRiskLevel(community: { nodes: string[] }): 'low' | 'medium' | 'high' | 'critical' {
    const nodes = community.nodes.map(id => this.graph.get(id)!);
    const avgRisk = nodes.reduce((sum, node) => sum + node.riskScore, 0) / nodes.length;

    if (avgRisk >= 0.8) return 'critical';
    if (avgRisk >= 0.6) return 'high';
    if (avgRisk >= 0.4) return 'medium';
    return 'low';
  }

  private describeCommunityCharacteristics(community: { nodes: string[]; edges: GraphEdge[] }): string[] {
    const characteristics: string[] = [];
    const nodes = community.nodes.map(id => this.graph.get(id)!);
    
    // Analyze node types
    const nodeTypes = nodes.reduce((acc, node) => {
      acc[node.type] = (acc[node.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    Object.entries(nodeTypes).forEach(([type, count]) => {
      characteristics.push(`${count} ${type} nodes`);
    });

    // Analyze edge types
    const edgeTypes = community.edges.reduce((acc, edge) => {
      acc[edge.type] = (acc[edge.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    if (edgeTypes.uses_device) {
      characteristics.push('Device sharing detected');
    }
    if (edgeTypes.same_payment) {
      characteristics.push('Payment method sharing');
    }

    return characteristics;
  }

  // Public API methods
  getNode(nodeId: string): GraphNode | null {
    return this.graph.get(nodeId) || null;
  }

  getDetectedNetworks(): FraudNetwork[] {
    return Array.from(this.detectedNetworks.values())
      .sort((a, b) => b.networkScore - a.networkScore);
  }

  getHighRiskNodes(limit: number = 20): GraphNode[] {
    return Array.from(this.graph.values())
      .sort((a, b) => b.riskScore - a.riskScore)
      .slice(0, limit);
  }

  getGraphStatistics(): GraphAnalytics {
    return this.computeGraphAnalytics();
  }

  exportGraph(): { nodes: GraphNode[]; edges: GraphEdge[] } {
    return {
      nodes: Array.from(this.graph.values()),
      edges: Array.from(this.edges.values())
    };
  }

  clearOldData(maxAgeMs: number = 90 * 24 * 60 * 60 * 1000): void {
    const cutoff = Date.now() - maxAgeMs;
    
    // Remove old edges
    this.edges.forEach((edge, edgeId) => {
      if (edge.createdAt < cutoff) {
        this.edges.delete(edgeId);
      }
    });

    // Remove old embeddings
    this.embeddings.forEach((embedding, nodeId) => {
      if (embedding.lastComputed < cutoff) {
        this.embeddings.delete(nodeId);
      }
    });

    logger.debug('Cleared old graph data');
  }
}

export const graphNeuralNetwork = GraphNeuralNetwork.getInstance();
export type { GraphNode, GraphEdge, FraudNetwork, PredictionResult, GraphAnalytics };
export default GraphNeuralNetwork;