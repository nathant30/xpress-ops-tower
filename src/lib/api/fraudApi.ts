// Comprehensive Fraud Detection API Layer
import {
  EnhancedPassenger,
  EnhancedDriver,
  FraudAlert,
  CollusionDetection,
  PaymentFraudAnalytics,
  FraudInvestigation,
  PassengerBehavioralAnalytics,
  FraudDetectionResponse,
  FraudAnalyticsResponse,
  FraudCategory,
  RiskLevel
} from '@/types/fraud';

// Base API configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || '/api';

// API Client with error handling
class FraudAPIClient {
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`Fraud API request failed:`, error);
      throw error;
    }
  }

  // =====================================================
  // PASSENGER FRAUD DETECTION
  // =====================================================

  async getEnhancedPassengers(filters: {
    search?: string;
    tier?: string;
    accountStatus?: string;
    riskLevel?: RiskLevel;
    verificationStatus?: string;
    page?: number;
    limit?: number;
  } = {}): Promise<{ passengers: EnhancedPassenger[]; total: number; }> {
    const queryParams = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        queryParams.append(key, value.toString());
      }
    });

    return this.request<{ passengers: EnhancedPassenger[]; total: number; }>(
      `/fraud/passengers?${queryParams.toString()}`
    );
  }

  async getPassengerFraudProfile(passengerId: string): Promise<EnhancedPassenger> {
    return this.request<EnhancedPassenger>(`/fraud/passengers/${passengerId}`);
  }

  async updatePassengerFraudScore(passengerId: string, scoreData: {
    fraudRiskScore?: number;
    paymentRiskScore?: number;
    behavioralRiskScore?: number;
    identityRiskScore?: number;
    notes?: string;
  }): Promise<{ success: boolean; }> {
    return this.request<{ success: boolean; }>(`/fraud/passengers/${passengerId}/risk-score`, {
      method: 'PUT',
      body: JSON.stringify(scoreData),
    });
  }

  async runPassengerFraudAssessment(passengerId: string): Promise<FraudDetectionResponse> {
    return this.request<FraudDetectionResponse>(`/fraud/passengers/${passengerId}/assessment`, {
      method: 'POST',
    });
  }

  async suspendPassengerAccount(passengerId: string, reason: string): Promise<{ success: boolean; }> {
    return this.request<{ success: boolean; }>(`/fraud/passengers/${passengerId}/suspend`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }

  // =====================================================
  // DRIVER FRAUD DETECTION
  // =====================================================

  async getEnhancedDrivers(filters: {
    search?: string;
    riskLevel?: RiskLevel;
    investigationStatus?: string;
    correlationThreshold?: number;
    collusionSuspected?: boolean;
    page?: number;
    limit?: number;
  } = {}): Promise<{ drivers: EnhancedDriver[]; total: number; }> {
    const queryParams = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        queryParams.append(key, value.toString());
      }
    });

    return this.request<{ drivers: EnhancedDriver[]; total: number; }>(
      `/fraud/drivers?${queryParams.toString()}`
    );
  }

  async getDriverFraudProfile(driverId: string): Promise<EnhancedDriver> {
    return this.request<EnhancedDriver>(`/fraud/drivers/${driverId}`);
  }

  async updateDriverFraudScore(driverId: string, scoreData: {
    fraudRiskScore?: number;
    operationalRiskScore?: number;
    combinedRiskScore?: number;
    mlConfidenceScore?: number;
    investigationStatus?: string;
    notes?: string;
  }): Promise<{ success: boolean; }> {
    return this.request<{ success: boolean; }>(`/fraud/drivers/${driverId}/risk-score`, {
      method: 'PUT',
      body: JSON.stringify(scoreData),
    });
  }

  async runDriverFraudAssessment(driverId: string): Promise<FraudDetectionResponse> {
    return this.request<FraudDetectionResponse>(`/fraud/drivers/${driverId}/assessment`, {
      method: 'POST',
    });
  }

  // =====================================================
  // PAYMENT FRAUD DETECTION
  // =====================================================

  async getPaymentFraudAnalytics(filters: {
    passengerId?: string;
    startDate?: Date;
    endDate?: Date;
    minFraudScore?: number;
    paymentMethod?: string;
    isSuspicious?: boolean;
  } = {}): Promise<PaymentFraudAnalytics[]> {
    const queryParams = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (value instanceof Date) {
          queryParams.append(key, value.toISOString());
        } else {
          queryParams.append(key, value.toString());
        }
      }
    });

    return this.request<PaymentFraudAnalytics[]>(
      `/fraud/payments?${queryParams.toString()}`
    );
  }

  async analyzePaymentTransaction(transactionData: {
    transactionId: string;
    passengerId: string;
    amount: number;
    paymentMethod: string;
    cardFingerprint?: string;
    ipAddress?: string;
    deviceFingerprint?: string;
    location?: { latitude: number; longitude: number; };
  }): Promise<{
    fraudScore: number;
    riskFactors: string[];
    requiresManualReview: boolean;
    recommendations: string[];
  }> {
    return this.request<{
      fraudScore: number;
      riskFactors: string[];
      requiresManualReview: boolean;
      recommendations: string[];
    }>('/fraud/payments/analyze', {
      method: 'POST',
      body: JSON.stringify(transactionData),
    });
  }

  async processChargeback(chargebackData: {
    transactionId: string;
    passengerId: string;
    chargebackAmount: number;
    reasonCode: string;
    evidence?: any[];
  }): Promise<{ success: boolean; chargebackId: string; }> {
    return this.request<{ success: boolean; chargebackId: string; }>('/fraud/payments/chargeback', {
      method: 'POST',
      body: JSON.stringify(chargebackData),
    });
  }

  // =====================================================
  // COLLUSION DETECTION
  // =====================================================

  async getCollusionDetections(filters: {
    driverId?: string;
    passengerId?: string;
    minCollusionScore?: number;
    status?: string;
    dateRange?: { start: Date; end: Date; };
  } = {}): Promise<CollusionDetection[]> {
    const queryParams = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (typeof value === 'object' && 'start' in value && 'end' in value) {
          queryParams.append('startDate', value.start.toISOString());
          queryParams.append('endDate', value.end.toISOString());
        } else {
          queryParams.append(key, value.toString());
        }
      }
    });

    return this.request<CollusionDetection[]>(
      `/fraud/collusion?${queryParams.toString()}`
    );
  }

  async runCollusionAnalysis(driverId: string, passengerId: string): Promise<{
    collusionScore: number;
    suspiciousPatterns: string[];
    riskFactors: string[];
    recommendation: string;
  }> {
    return this.request<{
      collusionScore: number;
      suspiciousPatterns: string[];
      riskFactors: string[];
      recommendation: string;
    }>('/fraud/collusion/analyze', {
      method: 'POST',
      body: JSON.stringify({ driverId, passengerId }),
    });
  }

  async flagCollusionCase(collusionId: string, notes: string): Promise<{ success: boolean; }> {
    return this.request<{ success: boolean; }>(`/fraud/collusion/${collusionId}/flag`, {
      method: 'POST',
      body: JSON.stringify({ notes }),
    });
  }

  // =====================================================
  // FRAUD ALERTS MANAGEMENT
  // =====================================================

  async getFraudAlerts(filters: {
    alertType?: FraudCategory;
    severity?: string;
    status?: string;
    assignedTo?: string;
    startDate?: Date;
    endDate?: Date;
  } = {}): Promise<FraudAlert[]> {
    const queryParams = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (value instanceof Date) {
          queryParams.append(key, value.toISOString());
        } else {
          queryParams.append(key, value.toString());
        }
      }
    });

    return this.request<FraudAlert[]>(
      `/fraud/alerts?${queryParams.toString()}`
    );
  }

  async acknowledgeAlert(alertId: string, analystId: string): Promise<{ success: boolean; }> {
    return this.request<{ success: boolean; }>(`/fraud/alerts/${alertId}/acknowledge`, {
      method: 'POST',
      body: JSON.stringify({ analystId }),
    });
  }

  async updateAlertStatus(alertId: string, status: string, notes?: string): Promise<{ success: boolean; }> {
    return this.request<{ success: boolean; }>(`/fraud/alerts/${alertId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status, notes }),
    });
  }

  async escalateAlert(alertId: string, escalationReason: string): Promise<{ success: boolean; }> {
    return this.request<{ success: boolean; }>(`/fraud/alerts/${alertId}/escalate`, {
      method: 'POST',
      body: JSON.stringify({ escalationReason }),
    });
  }

  // =====================================================
  // INVESTIGATIONS MANAGEMENT
  // =====================================================

  async getFraudInvestigations(filters: {
    investigationType?: FraudCategory;
    priority?: string;
    status?: string;
    leadInvestigator?: string;
    suspectType?: 'driver' | 'passenger';
  } = {}): Promise<FraudInvestigation[]> {
    const queryParams = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        queryParams.append(key, value.toString());
      }
    });

    return this.request<FraudInvestigation[]>(
      `/fraud/investigations?${queryParams.toString()}`
    );
  }

  async createInvestigation(investigationData: {
    investigationType: FraudCategory;
    priority: string;
    primarySuspectId: string;
    suspectType: 'driver' | 'passenger';
    caseTitle: string;
    caseDescription: string;
    leadInvestigator: string;
  }): Promise<{ success: boolean; investigationId: string; caseNumber: string; }> {
    return this.request<{ success: boolean; investigationId: string; caseNumber: string; }>(
      '/fraud/investigations', {
      method: 'POST',
      body: JSON.stringify(investigationData),
    });
  }

  async updateInvestigation(investigationId: string, updateData: {
    status?: string;
    investigationNotes?: string;
    evidenceAdded?: any[];
    actionsTaken?: string[];
  }): Promise<{ success: boolean; }> {
    return this.request<{ success: boolean; }>(`/fraud/investigations/${investigationId}`, {
      method: 'PUT',
      body: JSON.stringify(updateData),
    });
  }

  async closeInvestigation(investigationId: string, outcome: {
    investigationOutcome: string;
    fraudConfirmed: boolean;
    recoveryAmount?: number;
    actionsTaken: string[];
    finalNotes: string;
  }): Promise<{ success: boolean; }> {
    return this.request<{ success: boolean; }>(`/fraud/investigations/${investigationId}/close`, {
      method: 'POST',
      body: JSON.stringify(outcome),
    });
  }

  // =====================================================
  // BEHAVIORAL ANALYTICS
  // =====================================================

  async getPassengerBehavioralAnalytics(passengerId: string, dateRange?: {
    start: Date;
    end: Date;
  }): Promise<PassengerBehavioralAnalytics[]> {
    const queryParams = new URLSearchParams();
    
    if (dateRange) {
      queryParams.append('startDate', dateRange.start.toISOString());
      queryParams.append('endDate', dateRange.end.toISOString());
    }

    return this.request<PassengerBehavioralAnalytics[]>(
      `/fraud/behavioral/passengers/${passengerId}?${queryParams.toString()}`
    );
  }

  async runBehavioralAnalysis(userId: string, userType: 'driver' | 'passenger'): Promise<{
    overallScore: number;
    riskFactors: string[];
    anomalies: string[];
    recommendations: string[];
    patternAnalysis: any;
  }> {
    return this.request<{
      overallScore: number;
      riskFactors: string[];
      anomalies: string[];
      recommendations: string[];
      patternAnalysis: any;
    }>('/fraud/behavioral/analyze', {
      method: 'POST',
      body: JSON.stringify({ userId, userType }),
    });
  }

  // =====================================================
  // FRAUD ANALYTICS AND REPORTING
  // =====================================================

  async getFraudAnalyticsDashboard(dateRange?: {
    start: Date;
    end: Date;
  }): Promise<FraudAnalyticsResponse> {
    const queryParams = new URLSearchParams();
    
    if (dateRange) {
      queryParams.append('startDate', dateRange.start.toISOString());
      queryParams.append('endDate', dateRange.end.toISOString());
    }

    return this.request<FraudAnalyticsResponse>(
      `/fraud/analytics/dashboard?${queryParams.toString()}`
    );
  }

  async getFraudTrends(period: string = '30d'): Promise<{
    fraudIncidents: Array<{ date: string; count: number; category: FraudCategory; }>;
    riskScoreDistribution: Array<{ range: string; count: number; }>;
    detectionAccuracy: Array<{ date: string; accuracy: number; falsePositives: number; }>;
  }> {
    return this.request<{
      fraudIncidents: Array<{ date: string; count: number; category: FraudCategory; }>;
      riskScoreDistribution: Array<{ range: string; count: number; }>;
      detectionAccuracy: Array<{ date: string; accuracy: number; falsePositives: number; }>;
    }>(`/fraud/analytics/trends?period=${period}`);
  }

  async generateFraudReport(reportConfig: {
    type: 'summary' | 'detailed' | 'investigation';
    dateRange: { start: Date; end: Date; };
    categories?: FraudCategory[];
    includeCharts: boolean;
    format: 'json' | 'pdf' | 'excel';
  }): Promise<{ success: boolean; reportUrl: string; reportId: string; }> {
    return this.request<{ success: boolean; reportUrl: string; reportId: string; }>(
      '/fraud/reports/generate', {
      method: 'POST',
      body: JSON.stringify(reportConfig),
    });
  }

  // =====================================================
  // AI/ML MODEL MANAGEMENT
  // =====================================================

  async getModelPerformance(): Promise<{
    models: Array<{
      name: string;
      version: string;
      accuracy: number;
      precision: number;
      recall: number;
      lastTrained: Date;
      status: string;
    }>;
    overallPerformance: {
      averageAccuracy: number;
      totalPredictions: number;
      correctPredictions: number;
    };
  }> {
    return this.request<{
      models: Array<{
        name: string;
        version: string;
        accuracy: number;
        precision: number;
        recall: number;
        lastTrained: Date;
        status: string;
      }>;
      overallPerformance: {
        averageAccuracy: number;
        totalPredictions: number;
        correctPredictions: number;
      };
    }>('/fraud/models/performance');
  }

  async retrainModel(modelName: string, trainingData?: any): Promise<{
    success: boolean;
    trainingJobId: string;
    estimatedCompletion: Date;
  }> {
    return this.request<{
      success: boolean;
      trainingJobId: string;
      estimatedCompletion: Date;
    }>(`/fraud/models/${modelName}/retrain`, {
      method: 'POST',
      body: JSON.stringify({ trainingData }),
    });
  }

  // =====================================================
  // REAL-TIME MONITORING
  // =====================================================

  async getRealTimeAlerts(): Promise<{
    criticalAlerts: FraudAlert[];
    activeInvestigations: number;
    highRiskUsers: number;
    recentActivity: Array<{
      type: string;
      message: string;
      timestamp: Date;
      severity: string;
    }>;
  }> {
    return this.request<{
      criticalAlerts: FraudAlert[];
      activeInvestigations: number;
      highRiskUsers: number;
      recentActivity: Array<{
        type: string;
        message: string;
        timestamp: Date;
        severity: string;
      }>;
    }>('/fraud/realtime/alerts');
  }

  async subscribeToFraudAlerts(callback: (alert: FraudAlert) => void): () => void {
    // WebSocket connection for real-time fraud alerts
    const ws = new WebSocket(`${process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3000'}/fraud/alerts`);
    
    ws.onmessage = (event) => {
      try {
        const alert: FraudAlert = JSON.parse(event.data);
        callback(alert);
      } catch (error) {
        console.error('Failed to parse fraud alert:', error);
      }
    };

    ws.onerror = (error) => {
      console.error('Fraud alerts WebSocket error:', error);
    };

    // Return cleanup function
    return () => {
      ws.close();
    };
  }
}

// Export singleton instance
export const fraudAPI = new FraudAPIClient();

// Export utility functions
export const fraudUtils = {
  getRiskLevelFromScore: (score: number): RiskLevel => {
    if (score >= 80) return 'critical';
    if (score >= 60) return 'high';
    if (score >= 40) return 'medium';
    return 'low';
  },

  getRiskColor: (riskLevel: RiskLevel): string => {
    switch (riskLevel) {
      case 'critical': return 'text-red-600 bg-red-50';
      case 'high': return 'text-orange-600 bg-orange-50';
      case 'medium': return 'text-yellow-600 bg-yellow-50';
      case 'low': return 'text-green-600 bg-green-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  },

  formatCurrency: (amount: number, currency: string = 'PHP'): string => {
    const formatter = new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: currency,
    });
    return formatter.format(amount);
  },

  calculateTrend: (current: number, previous: number): {
    direction: 'up' | 'down' | 'stable';
    percentage: number;
  } => {
    if (previous === 0) return { direction: 'stable', percentage: 0 };
    
    const change = ((current - previous) / previous) * 100;
    
    if (Math.abs(change) < 1) return { direction: 'stable', percentage: Math.abs(change) };
    
    return {
      direction: change > 0 ? 'up' : 'down',
      percentage: Math.abs(change)
    };
  },

  debounce: <T extends (...args: any[]) => any>(
    func: T,
    wait: number
  ): ((...args: Parameters<T>) => void) => {
    let timeout: NodeJS.Timeout;
    
    return (...args: Parameters<T>) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  }
};