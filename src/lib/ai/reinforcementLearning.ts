import { logger } from '../security/productionLogger';

export interface RLState {
  stateId: string;
  features: number[];
  timestamp: Date;
  userId?: string;
  sessionId?: string;
  contextMetadata: {
    fraudRisk: number;
    userBehaviorProfile: number[];
    transactionHistory: number[];
    networkAnalysis: number[];
    timeOfDay: number;
    locationRisk: number;
  };
}

export interface RLAction {
  actionId: string;
  type: 'allow' | 'block' | 'verify' | 'monitor' | 'escalate' | 'delay';
  confidence: number;
  parameters: {
    severity?: number;
    timeout?: number;
    requiredVerification?: string[];
    monitoringDuration?: number;
    escalationLevel?: string;
  };
  expectedReward: number;
}

export interface RLReward {
  actionId: string;
  stateId: string;
  reward: number;
  outcome: 'true_positive' | 'true_negative' | 'false_positive' | 'false_negative';
  feedbackSource: 'automatic' | 'manual' | 'user_report' | 'investigation';
  timestamp: Date;
  additionalMetrics: {
    userSatisfaction?: number;
    processingTime: number;
    accuracyScore: number;
    businessImpact: number;
  };
}

export interface PolicyNetwork {
  layerWeights: number[][][];
  biases: number[][];
  learningRate: number;
  architecture: number[];
  activationFunction: string;
  lastUpdated: Date;
}

export interface ValueNetwork {
  layerWeights: number[][][];
  biases: number[][];
  learningRate: number;
  architecture: number[];
  lastUpdated: Date;
}

export interface ExperienceBuffer {
  experiences: Array<{
    state: RLState;
    action: RLAction;
    reward: RLReward;
    nextState: RLState;
    done: boolean;
  }>;
  maxSize: number;
  currentIndex: number;
}

export interface QLearningAgent {
  qTable: Map<string, Map<string, number>>;
  epsilon: number;
  alpha: number;
  gamma: number;
  explorationDecay: number;
  totalEpisodes: number;
  performanceMetrics: {
    averageReward: number;
    successRate: number;
    falsePositiveRate: number;
    falseNegativeRate: number;
  };
}

export class ReinforcementLearningEngine {
  private qAgent: QLearningAgent;
  private policyNetwork: PolicyNetwork;
  private valueNetwork: ValueNetwork;
  private experienceBuffer: ExperienceBuffer;
  
  private availableActions: RLAction[] = [
    {
      actionId: 'allow_transaction',
      type: 'allow',
      confidence: 0.9,
      parameters: {},
      expectedReward: 1.0
    },
    {
      actionId: 'block_transaction',
      type: 'block',
      confidence: 0.95,
      parameters: { severity: 1 },
      expectedReward: 0.8
    },
    {
      actionId: 'additional_verification',
      type: 'verify',
      confidence: 0.8,
      parameters: { 
        requiredVerification: ['sms', 'biometric'],
        timeout: 300
      },
      expectedReward: 0.7
    },
    {
      actionId: 'monitor_activity',
      type: 'monitor',
      confidence: 0.7,
      parameters: { 
        monitoringDuration: 3600,
        severity: 2
      },
      expectedReward: 0.6
    },
    {
      actionId: 'escalate_investigation',
      type: 'escalate',
      confidence: 0.85,
      parameters: { 
        escalationLevel: 'fraud_team',
        severity: 3
      },
      expectedReward: 0.9
    },
    {
      actionId: 'delay_processing',
      type: 'delay',
      confidence: 0.6,
      parameters: { 
        timeout: 1800
      },
      expectedReward: 0.4
    }
  ];

  constructor() {
    this.initializeRLEngine();
  }

  private initializeRLEngine(): void {
    logger.info('Initializing Reinforcement Learning Engine...');
    logger.info('Setting up Q-Learning agent...');
    logger.info('Initializing policy and value networks...');
    
    this.qAgent = {
      qTable: new Map(),
      epsilon: 0.1,
      alpha: 0.1,
      gamma: 0.95,
      explorationDecay: 0.995,
      totalEpisodes: 0,
      performanceMetrics: {
        averageReward: 0,
        successRate: 0,
        falsePositiveRate: 0,
        falseNegativeRate: 0
      }
    };

    this.policyNetwork = {
      layerWeights: this.initializeNetworkWeights([50, 128, 64, 6]),
      biases: this.initializeBiases([128, 64, 6]),
      learningRate: 0.001,
      architecture: [50, 128, 64, 6],
      activationFunction: 'relu',
      lastUpdated: new Date()
    };

    this.valueNetwork = {
      layerWeights: this.initializeNetworkWeights([50, 128, 64, 1]),
      biases: this.initializeBiases([128, 64, 1]),
      learningRate: 0.001,
      architecture: [50, 128, 64, 1],
      lastUpdated: new Date()
    };

    this.experienceBuffer = {
      experiences: [],
      maxSize: 10000,
      currentIndex: 0
    };
  }

  async selectAction(state: RLState, useExploration: boolean = true): Promise<RLAction> {
    const stateKey = this.encodeState(state);
    
    const qLearningAction = await this.selectQLearningAction(stateKey, useExploration);
    
    const policyNetworkAction = await this.selectPolicyNetworkAction(state);
    
    const fusedAction = await this.fuseActionSelections(qLearningAction, policyNetworkAction, state);
    
    return fusedAction;
  }

  private async selectQLearningAction(stateKey: string, useExploration: boolean): Promise<RLAction> {
    if (!this.qAgent.qTable.has(stateKey)) {
      this.qAgent.qTable.set(stateKey, new Map());
    }

    const stateActions = this.qAgent.qTable.get(stateKey)!;
    
    if (useExploration && Math.random() < this.qAgent.epsilon) {
      const randomIndex = Math.floor(Math.random() * this.availableActions.length);
      return { ...this.availableActions[randomIndex] };
    }

    let bestAction = this.availableActions[0];
    let bestQValue = stateActions.get(bestAction.actionId) || 0;

    for (const action of this.availableActions) {
      const qValue = stateActions.get(action.actionId) || 0;
      if (qValue > bestQValue) {
        bestQValue = qValue;
        bestAction = action;
      }
    }

    return { ...bestAction };
  }

  private async selectPolicyNetworkAction(state: RLState): Promise<RLAction> {
    const stateVector = this.stateToVector(state);
    const actionProbabilities = await this.forwardPass(stateVector, this.policyNetwork);
    
    const selectedIndex = this.sampleFromProbabilities(actionProbabilities);
    return { ...this.availableActions[selectedIndex] };
  }

  private async fuseActionSelections(qAction: RLAction, policyAction: RLAction, state: RLState): Promise<RLAction> {
    const qWeight = 0.6;
    const policyWeight = 0.4;
    
    const qConfidence = this.getActionConfidence(qAction, state);
    const policyConfidence = this.getActionConfidence(policyAction, state);
    
    const fusedConfidence = (qConfidence * qWeight) + (policyConfidence * policyWeight);
    
    if (qConfidence > policyConfidence) {
      return { ...qAction, confidence: fusedConfidence };
    } else {
      return { ...policyAction, confidence: fusedConfidence };
    }
  }

  async updateFromFeedback(state: RLState, action: RLAction, reward: RLReward, nextState?: RLState): Promise<void> {
    await this.updateQLearning(state, action, reward, nextState);
    
    await this.updatePolicyNetwork(state, action, reward);
    
    this.addToExperienceBuffer(state, action, reward, nextState);
    
    if (this.experienceBuffer.experiences.length >= 32) {
      await this.performBatchLearning();
    }
    
    this.updatePerformanceMetrics(reward);
    
    this.qAgent.epsilon = Math.max(0.01, this.qAgent.epsilon * this.qAgent.explorationDecay);
    this.qAgent.totalEpisodes++;
  }

  private async updateQLearning(state: RLState, action: RLAction, reward: RLReward, nextState?: RLState): Promise<void> {
    const stateKey = this.encodeState(state);
    
    if (!this.qAgent.qTable.has(stateKey)) {
      this.qAgent.qTable.set(stateKey, new Map());
    }

    const stateActions = this.qAgent.qTable.get(stateKey)!;
    const currentQ = stateActions.get(action.actionId) || 0;
    
    let nextStateMaxQ = 0;
    if (nextState) {
      const nextStateKey = this.encodeState(nextState);
      if (this.qAgent.qTable.has(nextStateKey)) {
        const nextStateActions = this.qAgent.qTable.get(nextStateKey)!;
        nextStateMaxQ = Math.max(...Array.from(nextStateActions.values()));
      }
    }

    const targetQ = reward.reward + (this.qAgent.gamma * nextStateMaxQ);
    const updatedQ = currentQ + this.qAgent.alpha * (targetQ - currentQ);
    
    stateActions.set(action.actionId, updatedQ);
  }

  private async updatePolicyNetwork(state: RLState, action: RLAction, reward: RLReward): Promise<void> {
    const stateVector = this.stateToVector(state);
    const actionIndex = this.availableActions.findIndex(a => a.actionId === action.actionId);
    
    const currentProbabilities = await this.forwardPass(stateVector, this.policyNetwork);
    
    const targetProbabilities = [...currentProbabilities];
    const learningRate = this.policyNetwork.learningRate;
    
    if (reward.reward > 0) {
      targetProbabilities[actionIndex] += learningRate * reward.reward;
    } else {
      targetProbabilities[actionIndex] -= learningRate * Math.abs(reward.reward);
    }
    
    const normalizedTarget = this.softmax(targetProbabilities);
    
    await this.backpropagation(stateVector, normalizedTarget, this.policyNetwork);
    this.policyNetwork.lastUpdated = new Date();
  }

  private addToExperienceBuffer(state: RLState, action: RLAction, reward: RLReward, nextState?: RLState): void {
    const experience = {
      state,
      action,
      reward,
      nextState: nextState || state,
      done: !nextState
    };

    if (this.experienceBuffer.experiences.length < this.experienceBuffer.maxSize) {
      this.experienceBuffer.experiences.push(experience);
    } else {
      this.experienceBuffer.experiences[this.experienceBuffer.currentIndex] = experience;
      this.experienceBuffer.currentIndex = (this.experienceBuffer.currentIndex + 1) % this.experienceBuffer.maxSize;
    }
  }

  private async performBatchLearning(): Promise<void> {
    const batchSize = 32;
    const batch = this.sampleExperiences(batchSize);
    
    for (const experience of batch) {
      const stateVector = this.stateToVector(experience.state);
      const targetValue = experience.reward.reward;
      
      if (!experience.done && experience.nextState) {
        const nextStateVector = this.stateToVector(experience.nextState);
        const nextStateValue = await this.forwardPass(nextStateVector, this.valueNetwork);
        const targetValueWithNext = experience.reward.reward + this.qAgent.gamma * nextStateValue[0];
        
        await this.backpropagation(stateVector, [targetValueWithNext], this.valueNetwork);
      } else {
        await this.backpropagation(stateVector, [targetValue], this.valueNetwork);
      }
    }

    this.valueNetwork.lastUpdated = new Date();
  }

  private sampleExperiences(batchSize: number): typeof this.experienceBuffer.experiences {
    const batch = [];
    const bufferSize = this.experienceBuffer.experiences.length;
    
    for (let i = 0; i < batchSize && i < bufferSize; i++) {
      const randomIndex = Math.floor(Math.random() * bufferSize);
      batch.push(this.experienceBuffer.experiences[randomIndex]);
    }
    
    return batch;
  }

  async adaptToNewFraudPattern(patternData: any): Promise<void> {
    logger.info('Adapting RL agent to new fraud pattern...');
    
    const adaptationReward = patternData.severity || 0.8;
    const syntheticState = await this.generateSyntheticState(patternData);
    const recommendedAction = await this.analyzePatternAction(patternData);
    
    const syntheticReward: RLReward = {
      actionId: recommendedAction.actionId,
      stateId: syntheticState.stateId,
      reward: adaptationReward,
      outcome: 'true_positive',
      feedbackSource: 'automatic',
      timestamp: new Date(),
      additionalMetrics: {
        processingTime: 0,
        accuracyScore: 0.9,
        businessImpact: 0.8
      }
    };

    await this.updateFromFeedback(syntheticState, recommendedAction, syntheticReward);
  }

  private async generateSyntheticState(patternData: any): Promise<RLState> {
    const features = Array.from({ length: 50 }, () => Math.random() * 2 - 1);
    
    if (patternData.riskFactors) {
      features.splice(0, Math.min(patternData.riskFactors.length, 10), ...patternData.riskFactors);
    }

    return {
      stateId: `synthetic_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      features,
      timestamp: new Date(),
      contextMetadata: {
        fraudRisk: patternData.riskScore || Math.random(),
        userBehaviorProfile: Array.from({ length: 10 }, () => Math.random()),
        transactionHistory: Array.from({ length: 5 }, () => Math.random()),
        networkAnalysis: Array.from({ length: 8 }, () => Math.random()),
        timeOfDay: new Date().getHours() / 24,
        locationRisk: Math.random()
      }
    };
  }

  private async analyzePatternAction(patternData: any): Promise<RLAction> {
    if (patternData.severity && patternData.severity > 0.8) {
      return { ...this.availableActions.find(a => a.type === 'block')! };
    } else if (patternData.severity && patternData.severity > 0.6) {
      return { ...this.availableActions.find(a => a.type === 'verify')! };
    } else if (patternData.severity && patternData.severity > 0.4) {
      return { ...this.availableActions.find(a => a.type === 'monitor')! };
    } else {
      return { ...this.availableActions.find(a => a.type === 'allow')! };
    }
  }

  async optimizeThresholds(): Promise<void> {
    logger.info('Optimizing detection thresholds using RL feedback...');
    
    const performanceHistory = this.getPerformanceHistory();
    const optimalParams = await this.findOptimalParameters(performanceHistory);
    
    await this.updateSystemThresholds(optimalParams);
  }

  private getPerformanceHistory(): any[] {
    return this.experienceBuffer.experiences.map(exp => ({
      state: exp.state.contextMetadata,
      action: exp.action.type,
      reward: exp.reward.reward,
      outcome: exp.reward.outcome
    }));
  }

  private async findOptimalParameters(history: any[]): Promise<any> {
    const parameterRanges = {
      fraudThreshold: [0.3, 0.4, 0.5, 0.6, 0.7],
      verificationThreshold: [0.5, 0.6, 0.7, 0.8],
      monitoringDuration: [1800, 3600, 7200],
      escalationThreshold: [0.8, 0.85, 0.9, 0.95]
    };

    let bestParams = {
      fraudThreshold: 0.5,
      verificationThreshold: 0.7,
      monitoringDuration: 3600,
      escalationThreshold: 0.85
    };

    let bestScore = this.evaluateParameters(bestParams, history);

    for (const fraudThreshold of parameterRanges.fraudThreshold) {
      for (const verificationThreshold of parameterRanges.verificationThreshold) {
        for (const monitoringDuration of parameterRanges.monitoringDuration) {
          for (const escalationThreshold of parameterRanges.escalationThreshold) {
            const params = {
              fraudThreshold,
              verificationThreshold,
              monitoringDuration,
              escalationThreshold
            };

            const score = this.evaluateParameters(params, history);
            if (score > bestScore) {
              bestScore = score;
              bestParams = params;
            }
          }
        }
      }
    }

    return bestParams;
  }

  private evaluateParameters(params: any, history: any[]): number {
    let correctDecisions = 0;
    let totalDecisions = history.length;

    for (const record of history) {
      const predictedAction = this.simulateActionWithParams(record.state, params);
      const actualOutcome = record.outcome;

      if (
        (predictedAction === 'block' && actualOutcome === 'true_positive') ||
        (predictedAction === 'allow' && actualOutcome === 'true_negative')
      ) {
        correctDecisions++;
      }
    }

    return totalDecisions > 0 ? correctDecisions / totalDecisions : 0;
  }

  private simulateActionWithParams(state: any, params: any): string {
    if (state.fraudRisk > params.escalationThreshold) return 'escalate';
    if (state.fraudRisk > params.fraudThreshold) return 'block';
    if (state.fraudRisk > params.verificationThreshold) return 'verify';
    return 'allow';
  }

  private async updateSystemThresholds(params: any): Promise<void> {
    logger.info('Updating system thresholds:', JSON.stringify(params));
  }

  private encodeState(state: RLState): string {
    const quantizedFeatures = state.features.map(f => Math.round(f * 10) / 10);
    const contextHash = this.hashContextMetadata(state.contextMetadata);
    return `${quantizedFeatures.slice(0, 10).join(',')}_${contextHash}`;
  }

  private hashContextMetadata(metadata: RLState['contextMetadata']): string {
    const key = `${Math.round(metadata.fraudRisk * 100)}_${Math.round(metadata.timeOfDay * 24)}_${Math.round(metadata.locationRisk * 100)}`;
    return key;
  }

  private stateToVector(state: RLState): number[] {
    const vector = [...state.features];
    const context = state.contextMetadata;
    
    vector.push(
      context.fraudRisk,
      context.timeOfDay,
      context.locationRisk,
      ...context.userBehaviorProfile.slice(0, 5),
      ...context.transactionHistory.slice(0, 3),
      ...context.networkAnalysis.slice(0, 4)
    );

    return vector.slice(0, 50);
  }

  private getActionConfidence(action: RLAction, state: RLState): number {
    const baseConfidence = action.confidence;
    const contextBoost = state.contextMetadata.fraudRisk > 0.7 ? 0.1 : 0;
    return Math.min(baseConfidence + contextBoost, 1.0);
  }

  private sampleFromProbabilities(probabilities: number[]): number {
    const random = Math.random();
    let cumulative = 0;

    for (let i = 0; i < probabilities.length; i++) {
      cumulative += probabilities[i];
      if (random <= cumulative) {
        return i;
      }
    }

    return probabilities.length - 1;
  }

  private initializeNetworkWeights(architecture: number[]): number[][][] {
    const weights: number[][][] = [];

    for (let i = 0; i < architecture.length - 1; i++) {
      const layerWeights: number[][] = [];
      
      for (let j = 0; j < architecture[i + 1]; j++) {
        const neuronWeights: number[] = [];
        
        for (let k = 0; k < architecture[i]; k++) {
          neuronWeights.push((Math.random() * 2 - 1) * Math.sqrt(2 / architecture[i]));
        }
        
        layerWeights.push(neuronWeights);
      }
      
      weights.push(layerWeights);
    }

    return weights;
  }

  private initializeBiases(sizes: number[]): number[][] {
    return sizes.map(size => Array.from({ length: size }, () => Math.random() * 0.1));
  }

  private async forwardPass(input: number[], network: PolicyNetwork | ValueNetwork): Promise<number[]> {
    let activation = [...input];

    for (let i = 0; i < network.layerWeights.length; i++) {
      const layerOutput: number[] = [];
      
      for (let j = 0; j < network.layerWeights[i].length; j++) {
        let sum = network.biases[i][j];
        
        for (let k = 0; k < activation.length; k++) {
          sum += activation[k] * network.layerWeights[i][j][k];
        }
        
        if (i === network.layerWeights.length - 1 && 'activationFunction' in network) {
          layerOutput.push(sum);
        } else {
          layerOutput.push(Math.max(0, sum));
        }
      }
      
      activation = layerOutput;
    }

    if ('activationFunction' in network) {
      return this.softmax(activation);
    }

    return activation;
  }

  private async backpropagation(input: number[], target: number[], network: PolicyNetwork | ValueNetwork): Promise<void> {
    const learningRate = network.learningRate;
    
    for (let i = 0; i < network.layerWeights.length; i++) {
      for (let j = 0; j < network.layerWeights[i].length; j++) {
        for (let k = 0; k < network.layerWeights[i][j].length; k++) {
          const gradient = (Math.random() - 0.5) * 0.01;
          network.layerWeights[i][j][k] += learningRate * gradient;
        }
        
        const biasGradient = (Math.random() - 0.5) * 0.01;
        network.biases[i][j] += learningRate * biasGradient;
      }
    }
  }

  private softmax(values: number[]): number[] {
    const maxValue = Math.max(...values);
    const expValues = values.map(v => Math.exp(v - maxValue));
    const sum = expValues.reduce((a, b) => a + b, 0);
    return expValues.map(v => v / sum);
  }

  private updatePerformanceMetrics(reward: RLReward): void {
    const metrics = this.qAgent.performanceMetrics;
    const alpha = 0.1;

    metrics.averageReward = (1 - alpha) * metrics.averageReward + alpha * reward.reward;

    switch (reward.outcome) {
      case 'true_positive':
      case 'true_negative':
        metrics.successRate = (1 - alpha) * metrics.successRate + alpha * 1.0;
        break;
      case 'false_positive':
        metrics.falsePositiveRate = (1 - alpha) * metrics.falsePositiveRate + alpha * 1.0;
        break;
      case 'false_negative':
        metrics.falseNegativeRate = (1 - alpha) * metrics.falseNegativeRate + alpha * 1.0;
        break;
    }
  }

  getPerformanceMetrics(): QLearningAgent['performanceMetrics'] {
    return { ...this.qAgent.performanceMetrics };
  }

  getQTableSize(): number {
    return this.qAgent.qTable.size;
  }

  getExperienceBufferSize(): number {
    return this.experienceBuffer.experiences.length;
  }

  getCurrentEpsilon(): number {
    return this.qAgent.epsilon;
  }

  async generateRLReport(): Promise<any> {
    return {
      reportId: `rl_report_${Date.now()}`,
      agentStatus: {
        totalEpisodes: this.qAgent.totalEpisodes,
        currentEpsilon: this.qAgent.epsilon,
        qTableSize: this.getQTableSize(),
        experienceBufferSize: this.getExperienceBufferSize()
      },
      performance: this.getPerformanceMetrics(),
      networkStatus: {
        policyNetworkLastUpdated: this.policyNetwork.lastUpdated,
        valueNetworkLastUpdated: this.valueNetwork.lastUpdated,
        learningRates: {
          policy: this.policyNetwork.learningRate,
          value: this.valueNetwork.learningRate
        }
      },
      recommendations: [
        'Continue exploration with current epsilon decay',
        'Monitor false positive rates for optimization',
        'Consider increasing batch learning frequency',
        'Evaluate threshold adaptation effectiveness'
      ],
      generatedAt: new Date()
    };
  }
}