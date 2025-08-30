// Rider Incentive Fraud Detection Engine
// Detects exploitation of promos, referrals, and ride incentives

import { RiderIncentiveFraud, FraudAlert, FraudEvidence, DetectedPattern, RiskFactor } from '@/types/fraudDetection';
import { logger } from '../security/productionLogger';

export class RiderIncentiveFraudDetector {
  private static instance: RiderIncentiveFraudDetector;
  private fraudThreshold = 65; // Score above which to flag as suspicious
  private criticalThreshold = 85; // Score above which to take immediate action

  private constructor() {}

  public static getInstance(): RiderIncentiveFraudDetector {
    if (!RiderIncentiveFraudDetector.instance) {
      RiderIncentiveFraudDetector.instance = new RiderIncentiveFraudDetector();
    }
    return RiderIncentiveFraudDetector.instance;
  }

  /**
   * Analyze rider for incentive fraud patterns
   */
  async analyzeRider(riderId: string, riderData: any): Promise<FraudAlert | null> {
    try {
      const fraudAnalysis = await this.performFraudAnalysis(riderId, riderData);
      
      if (fraudAnalysis.fraudScore >= this.fraudThreshold) {
        return this.generateFraudAlert(riderId, fraudAnalysis);
      }
      
      return null;
    } catch (error) {
      logger.error('Rider incentive fraud analysis failed', { error });
      return null;
    }
  }

  private async performFraudAnalysis(riderId: string, riderData: any): Promise<RiderIncentiveFraud> {
    const analysis: RiderIncentiveFraud = {
      riderId,
      unusualRideFrequency: false,
      shortRidePattern: false,
      sameRouteRepeating: false,
      unusualTiming: false,
      promoCodeAbuse: 0,
      referralFraud: false,
      bonusHunting: false,
      rideCompletionRate: 0,
      cancelationPattern: [],
      ratingGiven: [],
      crossRegionRides: false,
      remoteAreaTargeting: false,
      fraudScore: 0
    };

    // Analyze ride patterns
    await this.analyzeRidePatterns(analysis, riderData.rides || []);
    
    // Analyze promo usage
    await this.analyzePromoUsage(analysis, riderData.promoUsage || []);
    
    // Analyze referral behavior
    await this.analyzeReferralBehavior(analysis, riderData.referrals || []);
    
    // Analyze ratings and behavior
    await this.analyzeBehavioralPatterns(analysis, riderData);
    
    // Calculate final fraud score
    analysis.fraudScore = this.calculateFraudScore(analysis);
    
    return analysis;
  }

  private async analyzeRidePatterns(analysis: RiderIncentiveFraud, rides: any[]): Promise<void> {
    if (rides.length === 0) return;

    const recentRides = rides.filter(ride => 
      new Date(ride.createdAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
    );

    // Check for unusual ride frequency
    const ridesPerDay = recentRides.length / 7;
    analysis.unusualRideFrequency = ridesPerDay > 10; // More than 10 rides per day avg

    // Check for short ride patterns (potential bonus hunting)
    const shortRides = rides.filter(ride => ride.distance < 1000 && ride.duration < 300); // < 1km, < 5min
    analysis.shortRidePattern = (shortRides.length / rides.length) > 0.6; // 60% short rides

    // Check for same route repetition
    const routeMap = new Map<string, number>();
    rides.forEach(ride => {
      const routeKey = `${ride.pickupLat},${ride.pickupLng}-${ride.dropoffLat},${ride.dropoffLng}`;
      routeMap.set(routeKey, (routeMap.get(routeKey) || 0) + 1);
    });
    
    const maxRouteRepeat = Math.max(...Array.from(routeMap.values()));
    analysis.sameRouteRepeating = maxRouteRepeat > Math.max(5, rides.length * 0.3);

    // Check for unusual timing (late night rides to hit daily bonuses)
    const lateNightRides = rides.filter(ride => {
      const hour = new Date(ride.createdAt).getHours();
      return hour >= 23 || hour <= 4;
    });
    analysis.unusualTiming = (lateNightRides.length / rides.length) > 0.4;

    // Calculate completion rate
    const completedRides = rides.filter(ride => ride.status === 'completed').length;
    analysis.rideCompletionRate = completedRides / rides.length;

    // Analyze cancellation patterns
    const cancelledRides = rides.filter(ride => ride.status === 'cancelled');
    analysis.cancelationPattern = this.extractCancellationPatterns(cancelledRides);

    // Geographic analysis for Philippines
    analysis.crossRegionRides = this.detectCrossRegionRides(rides);
    analysis.remoteAreaTargeting = this.detectRemoteAreaTargeting(rides);
  }

  private async analyzePromoUsage(analysis: RiderIncentiveFraud, promoUsage: any[]): Promise<void> {
    if (promoUsage.length === 0) return;

    // Count unique promo codes used
    const uniquePromoCodes = new Set(promoUsage.map(p => p.promoCode));
    
    // Check for excessive promo code usage
    const recentPromoUsage = promoUsage.filter(p => 
      new Date(p.usedAt) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
    );
    
    analysis.promoCodeAbuse = recentPromoUsage.length;
    
    // Check for promo code farming patterns
    const promoCodesPerDay = recentPromoUsage.length / 30;
    if (promoCodesPerDay > 3) {
      analysis.bonusHunting = true;
    }

    // Check for expired/invalid promo attempts
    const invalidAttempts = promoUsage.filter(p => p.status === 'invalid' || p.status === 'expired').length;
    if (invalidAttempts > 10) {
      analysis.promoCodeAbuse += 20; // Penalty for trying invalid codes
    }
  }

  private async analyzeReferralBehavior(analysis: RiderIncentiveFraud, referrals: any[]): Promise<void> {
    if (referrals.length === 0) return;

    // Check for suspicious referral patterns
    const recentReferrals = referrals.filter(r => 
      new Date(r.createdAt) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    );

    // Too many referrals in short time
    if (recentReferrals.length > 20) {
      analysis.referralFraud = true;
    }

    // Check if referred users have suspicious patterns
    const suspiciousReferrals = referrals.filter(r => {
      // Check if referred user barely used the app (potential fake accounts)
      return r.referredUser?.totalRides < 2;
    }).length;

    if (suspiciousReferrals / referrals.length > 0.7) {
      analysis.referralFraud = true;
    }
  }

  private async analyzeBehavioralPatterns(analysis: RiderIncentiveFraud, riderData: any): Promise<void> {
    // Analyze rating patterns
    if (riderData.ratingsGiven && riderData.ratingsGiven.length > 0) {
      analysis.ratingGiven = riderData.ratingsGiven;
      
      // Check for unusual rating patterns (always giving same rating)
      const ratingVariance = this.calculateVariance(analysis.ratingGiven);
      if (ratingVariance < 0.1 && analysis.ratingGiven.length > 10) {
        // Potentially automated behavior
        analysis.fraudScore += 15;
      }
    }

    // Check account age vs activity level
    const accountAge = Date.now() - new Date(riderData.createdAt).getTime();
    const accountAgeDays = accountAge / (24 * 60 * 60 * 1000);
    
    if (accountAgeDays < 30 && riderData.totalRides > 100) {
      // New account with very high activity - suspicious
      analysis.fraudScore += 25;
    }
  }

  private detectCrossRegionRides(rides: any[]): boolean {
    // Philippines regions
    const regions = new Set();
    
    rides.forEach(ride => {
      const pickupRegion = this.getPhilippinesRegion(ride.pickupLat, ride.pickupLng);
      const dropoffRegion = this.getPhilippinesRegion(ride.dropoffLat, ride.dropoffLng);
      
      regions.add(pickupRegion);
      if (pickupRegion !== dropoffRegion) {
        regions.add(dropoffRegion);
      }
    });

    // Suspicious if covering more than 3 regions
    return regions.size > 3;
  }

  private detectRemoteAreaTargeting(rides: any[]): boolean {
    // Check if rider specifically targets remote areas for higher incentives
    const remoteRides = rides.filter(ride => 
      this.isRemoteArea(ride.pickupLat, ride.pickupLng) ||
      this.isRemoteArea(ride.dropoffLat, ride.dropoffLng)
    );

    return (remoteRides.length / rides.length) > 0.5; // 50% remote area rides
  }

  private getPhilippinesRegion(lat: number, lng: number): string {
    // Simplified region mapping for Philippines
    // In production, use proper geographic service
    
    if (lat >= 12.0 && lat <= 19.0 && lng >= 120.0 && lng <= 125.0) {
      if (lat >= 16.0) return 'Northern Luzon';
      if (lat >= 14.0) return 'Central Luzon';
      return 'Southern Luzon';
    }
    
    if (lat >= 9.0 && lat <= 12.0 && lng >= 123.0 && lng <= 127.0) {
      return 'Visayas';
    }
    
    if (lat >= 4.0 && lat <= 10.0 && lng >= 119.0 && lng <= 127.0) {
      return 'Mindanao';
    }
    
    return 'Unknown';
  }

  private isRemoteArea(lat: number, lng: number): boolean {
    // Define remote areas in Philippines context
    // Areas outside major cities (Manila, Cebu, Davao, etc.)
    
    const majorCities = [
      { lat: 14.5995, lng: 120.9842, radius: 50 }, // Manila
      { lat: 10.3157, lng: 123.8854, radius: 30 }, // Cebu
      { lat: 7.1907, lng: 125.4553, radius: 25 },  // Davao
      { lat: 10.7202, lng: 122.5621, radius: 20 }, // Iloilo
    ];

    return !majorCities.some(city => {
      const distance = this.calculateDistance(lat, lng, city.lat, city.lng);
      return distance <= city.radius;
    });
  }

  private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    // Haversine formula for distance calculation
    const R = 6371; // Earth's radius in km
    const dLat = this.toRad(lat2 - lat1);
    const dLng = this.toRad(lng2 - lng1);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  private extractCancellationPatterns(cancelledRides: any[]): string[] {
    const patterns: string[] = [];
    
    // Analyze cancellation timing
    const quickCancellations = cancelledRides.filter(ride => 
      (new Date(ride.cancelledAt).getTime() - new Date(ride.createdAt).getTime()) < 60000 // < 1 minute
    );
    
    if (quickCancellations.length > cancelledRides.length * 0.8) {
      patterns.push('frequent_quick_cancellation');
    }

    // Analyze cancellation reasons
    const reasonCounts = new Map<string, number>();
    cancelledRides.forEach(ride => {
      const reason = ride.cancellationReason || 'no_reason';
      reasonCounts.set(reason, (reasonCounts.get(reason) || 0) + 1);
    });

    const dominantReason = Array.from(reasonCounts.entries())
      .sort((a, b) => b[1] - a[1])[0];
    
    if (dominantReason && dominantReason[1] > cancelledRides.length * 0.6) {
      patterns.push(`dominant_reason_${dominantReason[0]}`);
    }

    return patterns;
  }

  private calculateVariance(numbers: number[]): number {
    if (numbers.length === 0) return 0;
    
    const mean = numbers.reduce((a, b) => a + b, 0) / numbers.length;
    const variance = numbers.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / numbers.length;
    
    return variance;
  }

  private calculateFraudScore(analysis: RiderIncentiveFraud): number {
    let score = 0;

    // Ride pattern scoring
    if (analysis.unusualRideFrequency) score += 20;
    if (analysis.shortRidePattern) score += 25;
    if (analysis.sameRouteRepeating) score += 15;
    if (analysis.unusualTiming) score += 10;

    // Promo abuse scoring
    if (analysis.promoCodeAbuse > 20) score += 30;
    else if (analysis.promoCodeAbuse > 10) score += 15;
    else if (analysis.promoCodeAbuse > 5) score += 8;

    // Referral fraud scoring
    if (analysis.referralFraud) score += 25;

    // Bonus hunting scoring
    if (analysis.bonusHunting) score += 20;

    // Completion rate penalty
    if (analysis.rideCompletionRate < 0.7) score += 15;
    if (analysis.rideCompletionRate < 0.5) score += 25;

    // Geographic anomalies
    if (analysis.crossRegionRides) score += 12;
    if (analysis.remoteAreaTargeting) score += 18;

    // Cancellation pattern penalties
    analysis.cancelationPattern.forEach(pattern => {
      if (pattern === 'frequent_quick_cancellation') score += 15;
      if (pattern.includes('dominant_reason')) score += 10;
    });

    return Math.min(100, Math.max(0, score));
  }

  private async generateFraudAlert(riderId: string, analysis: RiderIncentiveFraud): Promise<FraudAlert> {
    const evidence: FraudEvidence[] = this.generateEvidence(analysis);
    const patterns: DetectedPattern[] = this.generatePatterns(analysis);
    const riskFactors: RiskFactor[] = this.generateRiskFactors(analysis);

    const severity = analysis.fraudScore >= this.criticalThreshold ? 'critical' :
                    analysis.fraudScore >= 80 ? 'high' :
                    analysis.fraudScore >= 60 ? 'medium' : 'low';

    return {
      id: `RIF_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      alertType: 'rider_incentive_fraud',
      severity,
      status: 'active',
      
      subjectType: 'rider',
      subjectId: riderId,
      
      title: `Rider Incentive Fraud Detected`,
      description: `Suspicious incentive exploitation patterns detected for rider ${riderId}`,
      fraudScore: analysis.fraudScore,
      confidence: Math.min(95, analysis.fraudScore + 10),
      
      evidence,
      patterns,
      riskFactors,
      
      currency: 'PHP'
    };
  }

  private generateEvidence(analysis: RiderIncentiveFraud): FraudEvidence[] {
    const evidence: FraudEvidence[] = [];

    if (analysis.unusualRideFrequency) {
      evidence.push({
        type: 'behavior',
        description: 'Extremely high ride frequency detected',
        data: { pattern: 'unusual_ride_frequency' },
        weight: 20,
        timestamp: new Date()
      });
    }

    if (analysis.shortRidePattern) {
      evidence.push({
        type: 'behavior',
        description: 'Dominant pattern of very short rides',
        data: { pattern: 'short_ride_exploitation' },
        weight: 25,
        timestamp: new Date()
      });
    }

    if (analysis.promoCodeAbuse > 10) {
      evidence.push({
        type: 'financial',
        description: 'Excessive promotional code usage',
        data: { promoCount: analysis.promoCodeAbuse },
        weight: 30,
        timestamp: new Date()
      });
    }

    return evidence;
  }

  private generatePatterns(analysis: RiderIncentiveFraud): DetectedPattern[] {
    const patterns: DetectedPattern[] = [];

    if (analysis.sameRouteRepeating) {
      patterns.push({
        patternType: 'route_repetition',
        description: 'Repeated use of same routes for bonus exploitation',
        frequency: 1,
        timespan: 'weekly',
        examples: ['Same pickup/dropoff combinations'],
        riskLevel: 'medium'
      });
    }

    if (analysis.bonusHunting) {
      patterns.push({
        patternType: 'bonus_hunting',
        description: 'Strategic timing to maximize daily/weekly bonuses',
        frequency: 1,
        timespan: 'daily',
        examples: ['Multiple rides at bonus threshold times'],
        riskLevel: 'high'
      });
    }

    return patterns;
  }

  private generateRiskFactors(analysis: RiderIncentiveFraud): RiskFactor[] {
    const riskFactors: RiskFactor[] = [];

    riskFactors.push({
      factor: 'Fraud Score',
      value: analysis.fraudScore,
      riskContribution: analysis.fraudScore,
      explanation: `Composite score based on multiple suspicious patterns`
    });

    if (analysis.rideCompletionRate < 0.8) {
      riskFactors.push({
        factor: 'Low Completion Rate',
        value: analysis.rideCompletionRate,
        riskContribution: 15,
        explanation: 'High cancellation rate may indicate bonus manipulation'
      });
    }

    return riskFactors;
  }
}

// Export singleton instance
export const riderIncentiveFraudDetector = RiderIncentiveFraudDetector.getInstance();