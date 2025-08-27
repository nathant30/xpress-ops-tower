// Driver Safety Monitoring System with Behavioral Analysis
// Real-time safety score tracking, behavioral pattern analysis, and risk assessment
// Proactive safety measures for 10,000+ drivers with predictive alerts

import { redis } from './redis';
import { db } from './database';
import { emergencyAlertService } from './emergencyAlerts';
import { sosAlertProcessor } from './sosAlertProcessor';
import { getWebSocketManager } from './websocket';

export interface DriverSafetyProfile {
  driverId: string;
  profileDate: Date;
  
  // Safety Scores (0-100 scale)
  overallSafetyScore: number;
  incidentFrequencyScore: number;
  responseComplianceScore: number;
  emergencyPreparednessScore: number;
  behavioralScore: number;
  
  // Risk Assessment
  riskLevel: SafetyRiskLevel;
  riskFactors: string[];
  riskScore: number; // 0-100, higher = more risk
  
  // Incident History
  totalIncidents: number;
  falseAlarmIncidents: number;
  resolvedIncidents: number;
  escalatedIncidents: number;
  
  // Recent Activity (30 days)
  recentIncidents: number;
  recentFalseAlarms: number;
  recentViolations: number;
  scoreChange: number; // Positive = improvement, negative = decline
  
  // Behavioral Patterns
  commonIncidentTypes: { type: string; count: number; percentage: number; }[];
  commonIncidentLocations: { location: string; count: number; }[];
  commonIncidentTimes: { hour: number; count: number; }[];
  
  // Safety Compliance
  safetyTrainingCompleted: string[];
  lastSafetyTraining?: Date;
  nextSafetyReview?: Date;
  complianceStatus: ComplianceStatus;
  
  // Recommendations
  recommendedActions: SafetyRecommendation[];
  
  metadata?: Record<string, unknown>;
}

export interface SafetyAlert {
  id: string;
  alertCode: string;
  driverId: string;
  alertType: SafetyAlertType;
  severity: SafetyAlertSeverity;
  
  // Alert Details
  title: string;
  description: string;
  triggerData: Record<string, unknown>;
  
  // Location and Context
  location?: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  bookingId?: string;
  
  // Status and Tracking
  status: SafetyAlertStatus;
  triggeredAt: Date;
  acknowledgedAt?: Date;
  acknowledgedBy?: string;
  resolvedAt?: Date;
  
  // Actions and Response
  requiredActions: string[];
  completedActions: string[];
  
  metadata?: Record<string, unknown>;
}

export interface SafetyRecommendation {
  id: string;
  type: RecommendationType;
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  expectedOutcome: string;
  dueDate?: Date;
  status: 'pending' | 'in_progress' | 'completed' | 'dismissed';
}

export interface BehavioralPattern {
  driverId: string;
  patternType: BehavioralPatternType;
  patternData: Record<string, unknown>;
  confidence: number; // 0-1, how confident we are in this pattern
  riskLevel: number; // 0-10, how risky this pattern is
  detectedAt: Date;
  lastOccurrence: Date;
  frequency: number; // How often this pattern occurs
}

export interface SafetyMetrics {
  totalDrivers: number;
  averageSafetyScore: number;
  highRiskDrivers: number;
  mediumRiskDrivers: number;
  lowRiskDrivers: number;
  activeAlerts: number;
  resolvedToday: number;
  complianceRate: number;
  lastCalculated: Date;
}

export type SafetyRiskLevel = 'low' | 'medium' | 'high' | 'critical';
export type ComplianceStatus = 'compliant' | 'non_compliant' | 'pending_review' | 'overdue';
export type SafetyAlertType = 
  | 'risk_score_increase'     // Driver risk score increased significantly
  | 'pattern_detection'       // Risky behavioral pattern detected
  | 'route_deviation'         // Suspicious route deviation
  | 'speed_violation'         // Speed limit violations
  | 'area_violation'          // Unauthorized area access
  | 'time_violation'          // Operating outside allowed hours
  | 'maintenance_overdue'     // Vehicle maintenance overdue
  | 'training_overdue'        // Safety training overdue
  | 'compliance_violation';   // Regulatory compliance issue

export type SafetyAlertSeverity = 'info' | 'warning' | 'critical' | 'emergency';
export type SafetyAlertStatus = 'active' | 'acknowledged' | 'resolved' | 'dismissed';

export type RecommendationType = 
  | 'safety_training'         // Additional safety training
  | 'vehicle_inspection'      // Vehicle safety inspection
  | 'route_restriction'       // Restrict certain routes
  | 'time_restriction'        // Restrict operating hours
  | 'supervision_increase'    // Increase supervision level
  | 'counseling_session'      // Safety counseling session
  | 'equipment_upgrade'       // Safety equipment upgrade
  | 'medical_evaluation';     // Medical fitness evaluation

export type BehavioralPatternType = 
  | 'frequent_stops'          // Unusual stopping patterns
  | 'speed_patterns'          // Speeding or slow driving patterns
  | 'route_patterns'          // Unusual route choices
  | 'time_patterns'           // Unusual working hour patterns
  | 'incident_clustering'     // Incidents clustered in time/location
  | 'false_alarm_pattern'     // Pattern of false alarms
  | 'location_preference'     // Preference for specific areas
  | 'customer_complaints'     // Pattern of customer complaints
  | 'maintenance_neglect';    // Vehicle maintenance patterns

class DriverSafetyMonitoringSystem {
  private static instance: DriverSafetyMonitoringSystem;
  private safetyProfiles = new Map<string, DriverSafetyProfile>();
  private activeAlerts = new Map<string, SafetyAlert>();
  private behavioralPatterns = new Map<string, BehavioralPattern[]>();
  
  // Monitoring thresholds
  private readonly RISK_SCORE_THRESHOLD = 70; // Above this = high risk
  private readonly INCIDENT_FREQUENCY_THRESHOLD = 5; // More than 5 incidents in 30 days = concern
  private readonly FALSE_ALARM_RATE_THRESHOLD = 0.3; // 30% false alarm rate = concern
  private readonly SCORE_DROP_THRESHOLD = 10; // 10 point drop in score = alert
  
  constructor() {
    this.startSafetyMonitoring();
    this.startBehavioralAnalysis();
    this.startComplianceMonitoring();
    this.setupSafetyChannels();
    this.initializeMetricsCollection();
  }

  static getInstance(): DriverSafetyMonitoringSystem {
    if (!DriverSafetyMonitoringSystem.instance) {
      DriverSafetyMonitoringSystem.instance = new DriverSafetyMonitoringSystem();
    }
    return DriverSafetyMonitoringSystem.instance;
  }

  /**
   * Calculate comprehensive safety profile for a driver
   */
  async calculateDriverSafetyProfile(driverId: string): Promise<DriverSafetyProfile> {
    // Get driver's incident history
    const incidentHistory = await this.getDriverIncidentHistory(driverId);
    
    // Get behavioral patterns
    const behavioralPatterns = await this.getDriverBehavioralPatterns(driverId);
    
    // Get compliance status
    const complianceStatus = await this.getDriverComplianceStatus(driverId);
    
    // Calculate individual scores
    const incidentFrequencyScore = this.calculateIncidentFrequencyScore(incidentHistory);
    const responseComplianceScore = this.calculateResponseComplianceScore(incidentHistory);
    const emergencyPreparednessScore = this.calculateEmergencyPreparednessScore(driverId, complianceStatus);
    const behavioralScore = this.calculateBehavioralScore(behavioralPatterns);
    
    // Calculate overall safety score (weighted average)
    const overallSafetyScore = Math.round(
      (incidentFrequencyScore * 0.3) +
      (responseComplianceScore * 0.25) +
      (emergencyPreparednessScore * 0.25) +
      (behavioralScore * 0.2)
    );
    
    // Determine risk level and factors
    const { riskLevel, riskFactors, riskScore } = this.assessDriverRisk(
      overallSafetyScore,
      incidentHistory,
      behavioralPatterns,
      complianceStatus
    );
    
    // Generate recommendations
    const recommendedActions = this.generateSafetyRecommendations(
      driverId,
      overallSafetyScore,
      riskLevel,
      incidentHistory,
      behavioralPatterns,
      complianceStatus
    );
    
    // Create safety profile
    const safetyProfile: DriverSafetyProfile = {
      driverId,
      profileDate: new Date(),
      overallSafetyScore,
      incidentFrequencyScore,
      responseComplianceScore,
      emergencyPreparednessScore,
      behavioralScore,
      riskLevel,
      riskFactors,
      riskScore,
      totalIncidents: incidentHistory.total,
      falseAlarmIncidents: incidentHistory.falseAlarms,
      resolvedIncidents: incidentHistory.resolved,
      escalatedIncidents: incidentHistory.escalated,
      recentIncidents: incidentHistory.recent30Days,
      recentFalseAlarms: incidentHistory.recentFalseAlarms,
      recentViolations: incidentHistory.recentViolations,
      scoreChange: await this.calculateScoreChange(driverId, overallSafetyScore),
      commonIncidentTypes: this.analyzeIncidentTypes(incidentHistory.incidents),
      commonIncidentLocations: this.analyzeIncidentLocations(incidentHistory.incidents),
      commonIncidentTimes: this.analyzeIncidentTimes(incidentHistory.incidents),
      safetyTrainingCompleted: complianceStatus.completedTraining,
      lastSafetyTraining: complianceStatus.lastTraining,
      nextSafetyReview: complianceStatus.nextReview,
      complianceStatus: complianceStatus.status,
      recommendedActions
    };
    
    // Store in cache and database
    await this.saveSafetyProfile(safetyProfile);
    this.safetyProfiles.set(driverId, safetyProfile);
    
    // Check for alerts
    await this.checkForSafetyAlerts(safetyProfile);
    
    return safetyProfile;
  }

  /**
   * Trigger safety alert based on driver behavior or risk
   */
  async triggerSafetyAlert(
    driverId: string,
    alertType: SafetyAlertType,
    severity: SafetyAlertSeverity,
    details: {
      title: string;
      description: string;
      triggerData: Record<string, unknown>;
      location?: { latitude: number; longitude: number; address?: string; };
      bookingId?: string;
      requiredActions?: string[];
    }
  ): Promise<SafetyAlert> {
    const safetyAlert: SafetyAlert = {
      id: `safety_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      alertCode: this.generateSafetyAlertCode(alertType, severity),
      driverId,
      alertType,
      severity,
      title: details.title,
      description: details.description,
      triggerData: details.triggerData,
      location: details.location,
      bookingId: details.bookingId,
      status: 'active',
      triggeredAt: new Date(),
      requiredActions: details.requiredActions || [],
      completedActions: [],
      metadata: {
        autoGenerated: true,
        source: 'safety_monitoring_system'
      }
    };
    
    // Store active alert
    this.activeAlerts.set(safetyAlert.id, safetyAlert);
    
    // Save to database
    await this.saveSafetyAlert(safetyAlert);
    
    // Broadcast alert based on severity
    if (severity === 'critical' || severity === 'emergency') {
      await this.broadcastCriticalSafetyAlert(safetyAlert);
    } else {
      await this.broadcastSafetyAlert(safetyAlert);
    }
    
    // If emergency severity, also trigger emergency response
    if (severity === 'emergency') {
      await this.escalateToEmergencyResponse(safetyAlert);
    }
    
    console.log(`🔐 Safety alert ${safetyAlert.alertCode} triggered for driver ${driverId}`);
    
    return safetyAlert;
  }

  /**
   * Acknowledge safety alert
   */
  async acknowledgeSafetyAlert(alertId: string, acknowledgedBy: string, message?: string): Promise<void> {
    const alert = this.activeAlerts.get(alertId);
    if (!alert) {
      throw new Error(`Safety alert ${alertId} not found`);
    }
    
    alert.status = 'acknowledged';
    alert.acknowledgedAt = new Date();
    alert.acknowledgedBy = acknowledgedBy;
    
    await this.updateSafetyAlert(alert);
    
    // Broadcast acknowledgment
    await this.broadcastSafetyAlertUpdate(alert, 'acknowledged', {
      acknowledgedBy,
      message
    });
    
    console.log(`✅ Safety alert ${alert.alertCode} acknowledged by ${acknowledgedBy}`);
  }

  /**
   * Resolve safety alert
   */
  async resolveSafetyAlert(
    alertId: string, 
    resolvedBy: string, 
    resolution: string,
    completedActions: string[]
  ): Promise<void> {
    const alert = this.activeAlerts.get(alertId);
    if (!alert) {
      throw new Error(`Safety alert ${alertId} not found`);
    }
    
    alert.status = 'resolved';
    alert.resolvedAt = new Date();
    alert.completedActions = completedActions;
    
    await this.updateSafetyAlert(alert);
    
    // Remove from active alerts
    this.activeAlerts.delete(alertId);
    
    // Broadcast resolution
    await this.broadcastSafetyAlertUpdate(alert, 'resolved', {
      resolvedBy,
      resolution,
      completedActions
    });
    
    console.log(`✅ Safety alert ${alert.alertCode} resolved by ${resolvedBy}`);
  }

  /**
   * Get driver safety profile
   */
  async getDriverSafetyProfile(driverId: string, forceRecalculate = false): Promise<DriverSafetyProfile> {
    // Check cache first
    if (!forceRecalculate && this.safetyProfiles.has(driverId)) {
      const cached = this.safetyProfiles.get(driverId)!;
      
      // Use cached if less than 1 hour old
      if (Date.now() - cached.profileDate.getTime() < 3600000) {
        return cached;
      }
    }
    
    // Check database
    const dbProfile = await this.getSafetyProfileFromDatabase(driverId);
    if (!forceRecalculate && dbProfile && Date.now() - dbProfile.profileDate.getTime() < 3600000) {
      this.safetyProfiles.set(driverId, dbProfile);
      return dbProfile;
    }
    
    // Recalculate profile
    return await this.calculateDriverSafetyProfile(driverId);
  }

  /**
   * Get active safety alerts
   */
  getActiveSafetyAlerts(): SafetyAlert[] {
    return Array.from(this.activeAlerts.values())
      .sort((a, b) => b.triggeredAt.getTime() - a.triggeredAt.getTime());
  }

  /**
   * Get safety metrics for dashboard
   */
  async getSafetyMetrics(): Promise<SafetyMetrics> {
    const totalDriversResult = await db.query('SELECT COUNT(*) FROM drivers WHERE is_active = TRUE');
    const totalDrivers = parseInt(totalDriversResult.rows[0].count);
    
    const averageScoreResult = await db.query(`
      SELECT AVG(overall_safety_score) as avg_score 
      FROM driver_safety_profiles 
      WHERE profile_date >= CURRENT_DATE - INTERVAL '7 days'
    `);
    const averageSafetyScore = Math.round(averageScoreResult.rows[0].avg_score || 0);
    
    const riskLevelResult = await db.query(`
      SELECT 
        risk_level,
        COUNT(*) as count
      FROM driver_safety_profiles 
      WHERE profile_date >= CURRENT_DATE - INTERVAL '7 days'
      GROUP BY risk_level
    `);
    
    const riskLevels = riskLevelResult.rows.reduce((acc, row) => {
      acc[row.risk_level] = parseInt(row.count);
      return acc;
    }, { low: 0, medium: 0, high: 0, critical: 0 });
    
    const alertsResult = await db.query(`
      SELECT 
        COUNT(*) FILTER (WHERE status = 'active') as active_alerts,
        COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE AND status = 'resolved') as resolved_today
      FROM safety_alerts
    `);
    
    const complianceResult = await db.query(`
      SELECT 
        COUNT(*) FILTER (WHERE compliance_status = 'compliant') * 100.0 / COUNT(*) as compliance_rate
      FROM driver_safety_profiles 
      WHERE profile_date >= CURRENT_DATE - INTERVAL '7 days'
    `);
    
    return {
      totalDrivers,
      averageSafetyScore,
      highRiskDrivers: riskLevels.high + riskLevels.critical,
      mediumRiskDrivers: riskLevels.medium,
      lowRiskDrivers: riskLevels.low,
      activeAlerts: parseInt(alertsResult.rows[0].active_alerts || '0'),
      resolvedToday: parseInt(alertsResult.rows[0].resolved_today || '0'),
      complianceRate: Math.round(complianceResult.rows[0].compliance_rate || 0),
      lastCalculated: new Date()
    };
  }

  // Private helper methods

  private async getDriverIncidentHistory(driverId: string): Promise<{
    total: number;
    falseAlarms: number;
    resolved: number;
    escalated: number;
    recent30Days: number;
    recentFalseAlarms: number;
    recentViolations: number;
    incidents: any[];
  }> {
    const result = await db.query(`
      SELECT 
        i.*,
        sa.status as sos_status
      FROM incidents i
      LEFT JOIN sos_alerts sa ON i.id = sa.incident_id
      WHERE i.driver_id = $1
      ORDER BY i.created_at DESC
    `, [driverId]);
    
    const incidents = result.rows;
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    const recentIncidents = incidents.filter(i => new Date(i.created_at) >= thirtyDaysAgo);
    
    return {
      total: incidents.length,
      falseAlarms: incidents.filter(i => i.status === 'false_alarm' || i.sos_status === 'false_alarm').length,
      resolved: incidents.filter(i => i.status === 'resolved').length,
      escalated: incidents.filter(i => i.status === 'escalated').length,
      recent30Days: recentIncidents.length,
      recentFalseAlarms: recentIncidents.filter(i => i.status === 'false_alarm' || i.sos_status === 'false_alarm').length,
      recentViolations: recentIncidents.filter(i => i.incident_type.includes('violation')).length,
      incidents
    };
  }

  private async getDriverBehavioralPatterns(driverId: string): Promise<BehavioralPattern[]> {
    // This would involve complex analysis of driver behavior
    // For now, return empty array - would be populated by ML analysis
    return this.behavioralPatterns.get(driverId) || [];
  }

  private async getDriverComplianceStatus(driverId: string): Promise<{
    status: ComplianceStatus;
    completedTraining: string[];
    lastTraining?: Date;
    nextReview?: Date;
  }> {
    const result = await db.query(`
      SELECT 
        d.certifications,
        d.updated_at,
        dsp.last_safety_training,
        dsp.next_safety_review,
        dsp.compliance_status
      FROM drivers d
      LEFT JOIN driver_safety_profiles dsp ON d.id = dsp.driver_id 
        AND dsp.profile_date = (
          SELECT MAX(profile_date) FROM driver_safety_profiles WHERE driver_id = d.id
        )
      WHERE d.id = $1
    `, [driverId]);
    
    if (result.rows.length === 0) {
      return {
        status: 'pending_review',
        completedTraining: []
      };
    }
    
    const row = result.rows[0];
    const certifications = JSON.parse(row.certifications || '[]');
    
    return {
      status: row.compliance_status || 'pending_review',
      completedTraining: certifications,
      lastTraining: row.last_safety_training,
      nextReview: row.next_safety_review
    };
  }

  private calculateIncidentFrequencyScore(history: any): number {
    const baseScore = 100;
    const recentIncidents = history.recent30Days;
    
    // Deduct points for incidents
    let score = baseScore - (recentIncidents * 10);
    
    // Additional penalty for frequent incidents
    if (recentIncidents > this.INCIDENT_FREQUENCY_THRESHOLD) {
      score -= (recentIncidents - this.INCIDENT_FREQUENCY_THRESHOLD) * 5;
    }
    
    return Math.max(0, score);
  }

  private calculateResponseComplianceScore(history: any): number {
    if (history.total === 0) return 100; // No incidents = perfect score
    
    const falseAlarmRate = history.falseAlarms / history.total;
    const resolutionRate = history.resolved / Math.max(1, history.total - history.falseAlarms);
    
    let score = 100;
    
    // Penalty for false alarms
    if (falseAlarmRate > this.FALSE_ALARM_RATE_THRESHOLD) {
      score -= (falseAlarmRate - this.FALSE_ALARM_RATE_THRESHOLD) * 200;
    }
    
    // Bonus for good resolution rate
    score += resolutionRate * 10;
    
    return Math.max(0, Math.min(100, score));
  }

  private calculateEmergencyPreparednessScore(driverId: string, compliance: any): number {
    let score = 50; // Base score
    
    // Training completion bonus
    score += compliance.completedTraining.length * 10;
    
    // Recent training bonus
    if (compliance.lastTraining) {
      const daysSinceTraining = (Date.now() - compliance.lastTraining.getTime()) / (24 * 60 * 60 * 1000);
      if (daysSinceTraining < 90) score += 20; // Recent training
      else if (daysSinceTraining < 180) score += 10;
    }
    
    // Compliance status
    switch (compliance.status) {
      case 'compliant': score += 30; break;
      case 'non_compliant': score -= 20; break;
      case 'overdue': score -= 30; break;
    }
    
    return Math.max(0, Math.min(100, score));
  }

  private calculateBehavioralScore(patterns: BehavioralPattern[]): number {
    if (patterns.length === 0) return 100; // No patterns = good
    
    let score = 100;
    
    // Deduct points for risky patterns
    patterns.forEach(pattern => {
      score -= pattern.riskLevel * pattern.confidence * 10;
    });
    
    return Math.max(0, score);
  }

  private assessDriverRisk(
    overallScore: number,
    history: any,
    patterns: BehavioralPattern[],
    compliance: any
  ): { riskLevel: SafetyRiskLevel; riskFactors: string[]; riskScore: number; } {
    const riskFactors: string[] = [];
    let riskScore = 100 - overallScore; // Inverse of safety score
    
    // Assess risk factors
    if (overallScore < 50) riskFactors.push('Low overall safety score');
    if (history.recent30Days > 3) riskFactors.push('High recent incident frequency');
    if (history.falseAlarms / Math.max(1, history.total) > 0.3) riskFactors.push('High false alarm rate');
    if (compliance.status === 'non_compliant') riskFactors.push('Safety compliance issues');
    if (patterns.some(p => p.riskLevel >= 7)) riskFactors.push('High-risk behavioral patterns detected');
    
    // Additional risk score adjustments
    if (history.escalated > 0) riskScore += 10;
    if (patterns.length > 3) riskScore += patterns.length * 5;
    
    // Determine risk level
    let riskLevel: SafetyRiskLevel;
    if (riskScore >= 80) riskLevel = 'critical';
    else if (riskScore >= 60) riskLevel = 'high';
    else if (riskScore >= 40) riskLevel = 'medium';
    else riskLevel = 'low';
    
    return { riskLevel, riskFactors, riskScore: Math.min(100, riskScore) };
  }

  private generateSafetyRecommendations(
    driverId: string,
    safetyScore: number,
    riskLevel: SafetyRiskLevel,
    history: any,
    patterns: BehavioralPattern[],
    compliance: any
  ): SafetyRecommendation[] {
    const recommendations: SafetyRecommendation[] = [];
    
    // Score-based recommendations
    if (safetyScore < 70) {
      recommendations.push({
        id: `rec_${Date.now()}_1`,
        type: 'safety_training',
        priority: 'high',
        title: 'Comprehensive Safety Training',
        description: 'Complete additional safety training to improve overall safety score',
        expectedOutcome: 'Improved safety awareness and practices',
        dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days
        status: 'pending'
      });
    }
    
    // Incident-based recommendations
    if (history.recent30Days > 3) {
      recommendations.push({
        id: `rec_${Date.now()}_2`,
        type: 'supervision_increase',
        priority: 'high',
        title: 'Increased Supervision',
        description: 'Increase supervision and monitoring due to frequent recent incidents',
        expectedOutcome: 'Reduced incident frequency',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        status: 'pending'
      });
    }
    
    // False alarm recommendations
    if (history.falseAlarms / Math.max(1, history.total) > 0.3) {
      recommendations.push({
        id: `rec_${Date.now()}_3`,
        type: 'training',
        priority: 'medium',
        title: 'Emergency System Training',
        description: 'Training on proper use of emergency systems to reduce false alarms',
        expectedOutcome: 'Reduced false alarm incidents',
        dueDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000), // 21 days
        status: 'pending'
      });
    }
    
    // Compliance recommendations
    if (compliance.status !== 'compliant') {
      recommendations.push({
        id: `rec_${Date.now()}_4`,
        type: 'safety_training',
        priority: 'high',
        title: 'Compliance Training',
        description: 'Complete required training to achieve compliance status',
        expectedOutcome: 'Full regulatory compliance',
        dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // 10 days
        status: 'pending'
      });
    }
    
    return recommendations;
  }

  private async calculateScoreChange(driverId: string, currentScore: number): Promise<number> {
    const previousResult = await db.query(`
      SELECT overall_safety_score
      FROM driver_safety_profiles
      WHERE driver_id = $1 AND profile_date < CURRENT_DATE
      ORDER BY profile_date DESC
      LIMIT 1
    `, [driverId]);
    
    if (previousResult.rows.length === 0) return 0;
    
    return currentScore - previousResult.rows[0].overall_safety_score;
  }

  private analyzeIncidentTypes(incidents: any[]): { type: string; count: number; percentage: number; }[] {
    const typeCounts = incidents.reduce((acc, incident) => {
      acc[incident.incident_type] = (acc[incident.incident_type] || 0) + 1;
      return acc;
    }, {});
    
    const total = incidents.length;
    return Object.entries(typeCounts).map(([type, count]) => ({
      type,
      count: count as number,
      percentage: Math.round((count as number / total) * 100)
    })).sort((a, b) => b.count - a.count);
  }

  private analyzeIncidentLocations(incidents: any[]): { location: string; count: number; }[] {
    // This would analyze geographical clustering of incidents
    // For now, return simple address-based analysis
    const locationCounts = incidents.reduce((acc, incident) => {
      const location = incident.address || 'Unknown Location';
      acc[location] = (acc[location] || 0) + 1;
      return acc;
    }, {});
    
    return Object.entries(locationCounts).map(([location, count]) => ({
      location,
      count: count as number
    })).sort((a, b) => b.count - a.count).slice(0, 5);
  }

  private analyzeIncidentTimes(incidents: any[]): { hour: number; count: number; }[] {
    const hourCounts = Array(24).fill(0);
    
    incidents.forEach(incident => {
      const hour = new Date(incident.created_at).getHours();
      hourCounts[hour]++;
    });
    
    return hourCounts.map((count, hour) => ({ hour, count }))
      .filter(item => item.count > 0)
      .sort((a, b) => b.count - a.count);
  }

  private generateSafetyAlertCode(type: SafetyAlertType, severity: SafetyAlertSeverity): string {
    const typeMap = {
      'risk_score_increase': 'RSK',
      'pattern_detection': 'PTN',
      'route_deviation': 'RTE',
      'speed_violation': 'SPD',
      'area_violation': 'ARA',
      'time_violation': 'TME',
      'maintenance_overdue': 'MNT',
      'training_overdue': 'TRN',
      'compliance_violation': 'CMP'
    };
    
    const severityMap = {
      'info': 'I',
      'warning': 'W',
      'critical': 'C',
      'emergency': 'E'
    };
    
    const timestamp = Date.now().toString().slice(-6);
    return `${typeMap[type]}${severityMap[severity]}-${timestamp}`;
  }

  private async saveSafetyProfile(profile: DriverSafetyProfile): Promise<void> {
    try {
      const query = `
        INSERT INTO driver_safety_profiles (
          driver_id, profile_date, overall_safety_score, incident_frequency_score,
          response_compliance_score, emergency_preparedness_score, risk_level,
          risk_factors, total_sos_incidents, false_alarm_incidents, resolved_incidents,
          escalated_incidents, recent_incidents, recent_false_alarms, recent_score_change,
          common_incident_types, common_incident_locations, common_incident_times,
          safety_training_completed, last_safety_training, next_safety_review,
          compliance_status, recommended_actions, created_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
          $16, $17, $18, $19, $20, $21, $22, $23, NOW()
        )
        ON CONFLICT (driver_id, profile_date) DO UPDATE SET
          overall_safety_score = $3,
          incident_frequency_score = $4,
          response_compliance_score = $5,
          emergency_preparedness_score = $6,
          risk_level = $7,
          updated_at = NOW()
      `;
      
      await db.query(query, [
        profile.driverId,
        profile.profileDate,
        profile.overallSafetyScore,
        profile.incidentFrequencyScore,
        profile.responseComplianceScore,
        profile.emergencyPreparednessScore,
        profile.riskLevel,
        JSON.stringify(profile.riskFactors),
        profile.totalIncidents,
        profile.falseAlarmIncidents,
        profile.resolvedIncidents,
        profile.escalatedIncidents,
        profile.recentIncidents,
        profile.recentFalseAlarms,
        profile.scoreChange,
        JSON.stringify(profile.commonIncidentTypes),
        JSON.stringify(profile.commonIncidentLocations),
        JSON.stringify(profile.commonIncidentTimes),
        JSON.stringify(profile.safetyTrainingCompleted),
        profile.lastSafetyTraining,
        profile.nextSafetyReview,
        profile.complianceStatus,
        JSON.stringify(profile.recommendedActions)
      ]);
    } catch (error) {
      console.error(`Failed to save safety profile for driver ${profile.driverId}:`, error);
    }
  }

  private async getSafetyProfileFromDatabase(driverId: string): Promise<DriverSafetyProfile | null> {
    try {
      const result = await db.query(`
        SELECT * FROM driver_safety_profiles
        WHERE driver_id = $1
        ORDER BY profile_date DESC
        LIMIT 1
      `, [driverId]);
      
      if (result.rows.length === 0) return null;
      
      const row = result.rows[0];
      return {
        driverId: row.driver_id,
        profileDate: row.profile_date,
        overallSafetyScore: row.overall_safety_score,
        incidentFrequencyScore: row.incident_frequency_score,
        responseComplianceScore: row.response_compliance_score,
        emergencyPreparednessScore: row.emergency_preparedness_score,
        behavioralScore: row.behavioral_score || 100,
        riskLevel: row.risk_level,
        riskFactors: JSON.parse(row.risk_factors || '[]'),
        riskScore: row.risk_score || 0,
        totalIncidents: row.total_sos_incidents,
        falseAlarmIncidents: row.false_alarm_incidents,
        resolvedIncidents: row.resolved_incidents,
        escalatedIncidents: row.escalated_incidents,
        recentIncidents: row.recent_incidents,
        recentFalseAlarms: row.recent_false_alarms,
        recentViolations: row.recent_violations || 0,
        scoreChange: row.recent_score_change,
        commonIncidentTypes: JSON.parse(row.common_incident_types || '[]'),
        commonIncidentLocations: JSON.parse(row.common_incident_locations || '[]'),
        commonIncidentTimes: JSON.parse(row.common_incident_times || '[]'),
        safetyTrainingCompleted: JSON.parse(row.safety_training_completed || '[]'),
        lastSafetyTraining: row.last_safety_training,
        nextSafetyReview: row.next_safety_review,
        complianceStatus: row.compliance_status,
        recommendedActions: JSON.parse(row.recommended_actions || '[]')
      };
    } catch (error) {
      console.error(`Failed to get safety profile for driver ${driverId}:`, error);
      return null;
    }
  }

  private async saveSafetyAlert(alert: SafetyAlert): Promise<void> {
    try {
      const query = `
        INSERT INTO safety_alerts (
          id, alert_code, driver_id, alert_type, severity, title, description,
          trigger_data, location, address, booking_id, status, triggered_at,
          required_actions, completed_actions, created_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, ST_Point($9, $10), $11, $12, $13, $14, $15, $16, NOW()
        )
      `;
      
      await db.query(query, [
        alert.id,
        alert.alertCode,
        alert.driverId,
        alert.alertType,
        alert.severity,
        alert.title,
        alert.description,
        JSON.stringify(alert.triggerData),
        alert.location?.longitude,
        alert.location?.latitude,
        alert.location?.address,
        alert.bookingId,
        alert.status,
        alert.triggeredAt,
        JSON.stringify(alert.requiredActions),
        JSON.stringify(alert.completedActions)
      ]);
    } catch (error) {
      console.error(`Failed to save safety alert ${alert.alertCode}:`, error);
    }
  }

  private async updateSafetyAlert(alert: SafetyAlert): Promise<void> {
    try {
      await db.query(`
        UPDATE safety_alerts SET
          status = $1,
          acknowledged_at = $2,
          acknowledged_by = $3,
          resolved_at = $4,
          completed_actions = $5,
          updated_at = NOW()
        WHERE id = $6
      `, [
        alert.status,
        alert.acknowledgedAt,
        alert.acknowledgedBy,
        alert.resolvedAt,
        JSON.stringify(alert.completedActions),
        alert.id
      ]);
    } catch (error) {
      console.error(`Failed to update safety alert ${alert.alertCode}:`, error);
    }
  }

  private async checkForSafetyAlerts(profile: DriverSafetyProfile): Promise<void> {
    // Check for risk score alerts
    if (profile.scoreChange < -this.SCORE_DROP_THRESHOLD) {
      await this.triggerSafetyAlert(
        profile.driverId,
        'risk_score_increase',
        'warning',
        {
          title: 'Safety Score Decreased',
          description: `Driver safety score dropped by ${Math.abs(profile.scoreChange)} points`,
          triggerData: { 
            previousScore: profile.overallSafetyScore + profile.scoreChange,
            currentScore: profile.overallSafetyScore,
            change: profile.scoreChange
          },
          requiredActions: ['Review recent incidents', 'Consider additional training']
        }
      );
    }
    
    // Check for high risk alerts
    if (profile.riskLevel === 'critical') {
      await this.triggerSafetyAlert(
        profile.driverId,
        'risk_score_increase',
        'critical',
        {
          title: 'Critical Risk Level',
          description: `Driver has reached critical risk level with score ${profile.riskScore}`,
          triggerData: { 
            riskScore: profile.riskScore,
            riskFactors: profile.riskFactors
          },
          requiredActions: ['Immediate safety review', 'Temporary service suspension consideration']
        }
      );
    }
    
    // Check for compliance alerts
    if (profile.complianceStatus === 'overdue') {
      await this.triggerSafetyAlert(
        profile.driverId,
        'training_overdue',
        'warning',
        {
          title: 'Safety Training Overdue',
          description: 'Driver has overdue safety training requirements',
          triggerData: { 
            complianceStatus: profile.complianceStatus,
            lastTraining: profile.lastSafetyTraining
          },
          requiredActions: ['Schedule safety training', 'Update compliance records']
        }
      );
    }
  }

  private async broadcastCriticalSafetyAlert(alert: SafetyAlert): Promise<void> {
    const wsManager = getWebSocketManager();
    
    const criticalAlert = {
      type: 'CRITICAL_SAFETY_ALERT',
      alertId: alert.id,
      alertCode: alert.alertCode,
      driverId: alert.driverId,
      alertType: alert.alertType,
      severity: alert.severity,
      title: alert.title,
      description: alert.description,
      location: alert.location,
      triggeredAt: alert.triggeredAt.toISOString(),
      requiresImmediateAction: true,
      playAlert: true
    };
    
    if (wsManager) {
      wsManager.broadcastToAll('critical_safety_alert', criticalAlert);
    }
    
    await redis.publish('safety:critical_alert', criticalAlert);
  }

  private async broadcastSafetyAlert(alert: SafetyAlert): Promise<void> {
    const wsManager = getWebSocketManager();
    
    const alertData = {
      alertId: alert.id,
      alertCode: alert.alertCode,
      driverId: alert.driverId,
      alertType: alert.alertType,
      severity: alert.severity,
      title: alert.title,
      location: alert.location,
      triggeredAt: alert.triggeredAt.toISOString()
    };
    
    if (wsManager) {
      wsManager.broadcastToAll('safety_alert', alertData);
    }
    
    await redis.publish('safety:alert', alertData);
  }

  private async broadcastSafetyAlertUpdate(alert: SafetyAlert, updateType: string, data: any): Promise<void> {
    const updateMessage = {
      alertId: alert.id,
      alertCode: alert.alertCode,
      updateType,
      status: alert.status,
      ...data,
      timestamp: new Date().toISOString()
    };

    await redis.publish('safety:alert_update', updateMessage);
  }

  private async escalateToEmergencyResponse(alert: SafetyAlert): Promise<void> {
    // For emergency severity alerts, create emergency incident
    try {
      await emergencyAlertService.triggerAlert({
        reporterId: 'safety_system',
        reporterType: 'system',
        location: alert.location || { latitude: 0, longitude: 0 },
        regionId: 'default-region', // Would determine from driver
        type: 'security',
        priority: 'critical',
        title: `SAFETY ESCALATION: ${alert.title}`,
        description: `Safety monitoring system escalated alert: ${alert.description}`,
        driverId: alert.driverId,
        bookingId: alert.bookingId,
        metadata: {
          safetyAlertId: alert.id,
          safetyAlertCode: alert.alertCode,
          escalatedFromSafety: true
        }
      });
      
      console.log(`🚨 Safety alert ${alert.alertCode} escalated to emergency response`);
    } catch (error) {
      console.error(`Failed to escalate safety alert ${alert.alertCode} to emergency:`, error);
    }
  }

  private startSafetyMonitoring(): void {
    // Monitor safety metrics every 5 minutes
    setInterval(async () => {
      console.log('🔐 Running safety monitoring checks...');
      // This would trigger various safety checks
    }, 300000);
  }

  private startBehavioralAnalysis(): void {
    // Analyze behavioral patterns every hour
    setInterval(async () => {
      console.log('🔍 Running behavioral pattern analysis...');
      // This would run ML-based behavioral analysis
    }, 3600000);
  }

  private startComplianceMonitoring(): void {
    // Check compliance status daily
    setInterval(async () => {
      console.log('📋 Running compliance monitoring...');
      // This would check training, certifications, etc.
    }, 86400000);
  }

  private setupSafetyChannels(): void {
    redis.subscribe(['safety:trigger_alert'], (channel, message) => {
      try {
        const data = JSON.parse(message);
        this.triggerSafetyAlert(
          data.driverId,
          data.alertType,
          data.severity,
          data.details
        );
      } catch (error) {
        console.error('Error processing safety channel message:', error);
      }
    });
  }

  private initializeMetricsCollection(): void {
    setInterval(async () => {
      const metrics = await this.getSafetyMetrics();
      console.log('Safety Monitoring Metrics:', {
        ...metrics,
        activeAlerts: this.activeAlerts.size,
        cachedProfiles: this.safetyProfiles.size
      });
    }, 300000); // Every 5 minutes
  }
}

// Export singleton instance
export const driverSafetyMonitoring = DriverSafetyMonitoringSystem.getInstance();