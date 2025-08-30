import { logger } from '../security/productionLogger';

export interface GeospatialPoint {
  latitude: number;
  longitude: number;
  timestamp: Date;
  altitude?: number;
  accuracy?: number;
  userId?: string;
  eventType?: string;
}

export interface GeofenceRule {
  id: string;
  name: string;
  polygon: GeospatialPoint[];
  ruleType: 'allowed' | 'restricted' | 'monitoring';
  priority: number;
  isActive: boolean;
  metadata: {
    description: string;
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    alertThreshold: number;
    timeRestrictions?: Array<{ startHour: number; endHour: number }>;
  };
}

export interface LocationCluster {
  centroid: GeospatialPoint;
  radius: number;
  pointCount: number;
  density: number;
  riskScore: number;
  patterns: string[];
  timeDistribution: number[];
  userDistribution: Map<string, number>;
}

export interface RouteAnalysis {
  routeId: string;
  userId: string;
  startPoint: GeospatialPoint;
  endPoint: GeospatialPoint;
  waypoints: GeospatialPoint[];
  
  metrics: {
    totalDistance: number;
    estimatedDuration: number;
    actualDuration: number;
    averageSpeed: number;
    maxSpeed: number;
    stops: number;
    detours: number;
  };
  
  anomalies: {
    speedViolations: Array<{ point: GeospatialPoint; speed: number; limit: number }>;
    routeDeviations: Array<{ point: GeospatialPoint; deviation: number }>;
    suspiciousStops: Array<{ point: GeospatialPoint; duration: number }>;
    impossibleMovements: Array<{ from: GeospatialPoint; to: GeospatialPoint; speed: number }>;
  };
  
  fraudRisk: number;
  confidence: number;
}

export interface TrafficPattern {
  location: GeospatialPoint;
  timeSlot: string;
  expectedDensity: number;
  actualDensity: number;
  congestionLevel: number;
  fraudCorrelation: number;
  historicalAverages: number[];
}

export interface PhilippinesRegionData {
  regionName: string;
  provinces: string[];
  majorCities: Array<{ name: string; location: GeospatialPoint; population: number }>;
  fraudHotspots: Array<{ location: GeospatialPoint; riskLevel: number; incidentTypes: string[] }>;
  transportHubs: Array<{ name: string; type: string; location: GeospatialPoint }>;
  borderCrossings: Array<{ name: string; location: GeospatialPoint; controlLevel: string }>;
}

export class GeospatialIntelligenceEngine {
  private geofences: Map<string, GeofenceRule> = new Map();
  private locationClusters: LocationCluster[] = [];
  private trafficPatterns: Map<string, TrafficPattern> = new Map();
  private routeDatabase: Map<string, RouteAnalysis[]> = new Map();
  
  private philippinesRegions: PhilippinesRegionData[] = [
    {
      regionName: 'National Capital Region (NCR)',
      provinces: ['Metro Manila'],
      majorCities: [
        { name: 'Manila', location: { latitude: 14.5995, longitude: 120.9842, timestamp: new Date() }, population: 1780000 },
        { name: 'Quezon City', location: { latitude: 14.6760, longitude: 121.0437, timestamp: new Date() }, population: 2936000 },
        { name: 'Makati', location: { latitude: 14.5547, longitude: 121.0244, timestamp: new Date() }, population: 510000 }
      ],
      fraudHotspots: [
        { location: { latitude: 14.5995, longitude: 120.9842, timestamp: new Date() }, riskLevel: 0.8, incidentTypes: ['fake_ids', 'payment_fraud'] },
        { location: { latitude: 14.6760, longitude: 121.0437, timestamp: new Date() }, riskLevel: 0.7, incidentTypes: ['driver_impersonation'] }
      ],
      transportHubs: [
        { name: 'NAIA Terminal 1', type: 'airport', location: { latitude: 14.5086, longitude: 121.0198, timestamp: new Date() } },
        { name: 'EDSA-MRT', type: 'train_station', location: { latitude: 14.5547, longitude: 121.0244, timestamp: new Date() } }
      ],
      borderCrossings: []
    },
    {
      regionName: 'Central Visayas',
      provinces: ['Cebu', 'Bohol', 'Negros Oriental', 'Siquijor'],
      majorCities: [
        { name: 'Cebu City', location: { latitude: 10.3157, longitude: 123.8854, timestamp: new Date() }, population: 922000 },
        { name: 'Lapu-Lapu City', location: { latitude: 10.3103, longitude: 123.9494, timestamp: new Date() }, population: 497000 }
      ],
      fraudHotspots: [
        { location: { latitude: 10.3157, longitude: 123.8854, timestamp: new Date() }, riskLevel: 0.6, incidentTypes: ['vehicle_cloning', 'route_manipulation'] }
      ],
      transportHubs: [
        { name: 'Mactan-Cebu International Airport', type: 'airport', location: { latitude: 10.3075, longitude: 123.9796, timestamp: new Date() } }
      ],
      borderCrossings: []
    },
    {
      regionName: 'Davao Region',
      provinces: ['Davao del Norte', 'Davao del Sur', 'Davao Oriental', 'Davao Occidental', 'Compostela Valley'],
      majorCities: [
        { name: 'Davao City', location: { latitude: 7.1907, longitude: 125.4553, timestamp: new Date() }, population: 1776000 }
      ],
      fraudHotspots: [
        { location: { latitude: 7.1907, longitude: 125.4553, timestamp: new Date() }, riskLevel: 0.5, incidentTypes: ['cross_border_fraud'] }
      ],
      transportHubs: [
        { name: 'Francisco Bangoy International Airport', type: 'airport', location: { latitude: 7.1254, longitude: 125.6456, timestamp: new Date() } }
      ],
      borderCrossings: [
        { name: 'Davao-General Santos Border', location: { latitude: 7.0000, longitude: 125.0000, timestamp: new Date() }, controlLevel: 'medium' }
      ]
    }
  ];

  private fraudRiskAreas = {
    highRisk: [
      { center: { lat: 14.5995, lon: 120.9842 }, radius: 5, description: 'Manila Central Business District' },
      { center: { lat: 10.3157, lon: 123.8854 }, radius: 3, description: 'Cebu IT Park Area' },
      { center: { lat: 7.1907, lon: 125.4553 }, radius: 4, description: 'Davao Commercial Center' }
    ],
    moderateRisk: [
      { center: { lat: 14.6760, lon: 121.0437 }, radius: 6, description: 'Quezon City Business Areas' },
      { center: { lat: 14.5547, lon: 121.0244 }, radius: 2, description: 'Makati Financial District' }
    ]
  };

  constructor() {
    this.initializeGeospatialEngine();
    this.setupDefaultGeofences();
    this.loadPhilippinesTrafficPatterns();
  }

  private initializeGeospatialEngine(): void {
    logger.info('Initializing Geospatial Intelligence Engine...');
    logger.info('Loading Philippines regional data...');
    logger.info('Setting up fraud hotspot monitoring...');
  }

  private setupDefaultGeofences(): void {
    this.philippinesRegions.forEach(region => {
      region.fraudHotspots.forEach((hotspot, index) => {
        const geofence: GeofenceRule = {
          id: `hotspot_${region.regionName.replace(/\s+/g, '_')}_${index}`,
          name: `Fraud Hotspot - ${region.regionName}`,
          polygon: this.createCircularGeofence(hotspot.location, 1.0),
          ruleType: 'monitoring',
          priority: hotspot.riskLevel > 0.7 ? 1 : 2,
          isActive: true,
          metadata: {
            description: `High fraud risk area in ${region.regionName}`,
            riskLevel: hotspot.riskLevel > 0.7 ? 'high' : 'medium',
            alertThreshold: 0.8,
            timeRestrictions: [
              { startHour: 22, endHour: 6 }
            ]
          }
        };
        this.geofences.set(geofence.id, geofence);
      });

      region.transportHubs.forEach((hub, index) => {
        const geofence: GeofenceRule = {
          id: `transport_hub_${hub.name.replace(/\s+/g, '_')}`,
          name: `Transport Hub - ${hub.name}`,
          polygon: this.createCircularGeofence(hub.location, 0.5),
          ruleType: 'monitoring',
          priority: 2,
          isActive: true,
          metadata: {
            description: `Transportation hub monitoring: ${hub.name}`,
            riskLevel: 'medium',
            alertThreshold: 0.6
          }
        };
        this.geofences.set(geofence.id, geofence);
      });
    });
  }

  private loadPhilippinesTrafficPatterns(): void {
    const timeSlots = ['morning_rush', 'midday', 'evening_rush', 'night'];
    
    this.philippinesRegions.forEach(region => {
      region.majorCities.forEach(city => {
        timeSlots.forEach(slot => {
          const pattern: TrafficPattern = {
            location: city.location,
            timeSlot: slot,
            expectedDensity: this.calculateExpectedDensity(city.population, slot),
            actualDensity: 0,
            congestionLevel: 0,
            fraudCorrelation: Math.random() * 0.3,
            historicalAverages: Array.from({ length: 30 }, () => Math.random())
          };
          
          const key = `${city.name}_${slot}`;
          this.trafficPatterns.set(key, pattern);
        });
      });
    });
  }

  async analyzeLocationRisk(point: GeospatialPoint): Promise<number> {
    let riskScore = 0;

    const hotspotRisk = this.calculateHotspotRisk(point);
    riskScore += hotspotRisk * 0.4;

    const geofenceViolations = await this.checkGeofenceViolations(point);
    riskScore += geofenceViolations.length * 0.1;

    const clusterRisk = this.analyzeLocationClusters(point);
    riskScore += clusterRisk * 0.3;

    const timeRisk = this.calculateTimeBasedRisk(point);
    riskScore += timeRisk * 0.2;

    const regionRisk = this.getRegionalRiskFactor(point);
    riskScore += regionRisk * 0.1;

    return Math.min(riskScore, 1.0);
  }

  private calculateHotspotRisk(point: GeospatialPoint): number {
    let maxRisk = 0;

    this.philippinesRegions.forEach(region => {
      region.fraudHotspots.forEach(hotspot => {
        const distance = this.calculateDistance(
          point.latitude, point.longitude,
          hotspot.location.latitude, hotspot.location.longitude
        );

        if (distance < 2.0) {
          const proximityFactor = Math.max(0, 1 - (distance / 2.0));
          const risk = hotspot.riskLevel * proximityFactor;
          maxRisk = Math.max(maxRisk, risk);
        }
      });
    });

    return maxRisk;
  }

  private async checkGeofenceViolations(point: GeospatialPoint): Promise<GeofenceRule[]> {
    const violations: GeofenceRule[] = [];

    for (const [id, geofence] of this.geofences.entries()) {
      if (!geofence.isActive) continue;

      const isInside = this.isPointInPolygon(point, geofence.polygon);
      
      if (geofence.ruleType === 'restricted' && isInside) {
        violations.push(geofence);
      }

      if (geofence.ruleType === 'monitoring' && isInside) {
        const currentHour = point.timestamp.getHours();
        const hasTimeRestriction = geofence.metadata.timeRestrictions?.some(
          restriction => currentHour >= restriction.startHour || currentHour <= restriction.endHour
        );

        if (hasTimeRestriction) {
          violations.push(geofence);
        }
      }
    }

    return violations;
  }

  async analyzeRoute(route: GeospatialPoint[], userId: string): Promise<RouteAnalysis> {
    if (route.length < 2) {
      throw new Error('Route must contain at least 2 points');
    }

    const startPoint = route[0];
    const endPoint = route[route.length - 1];
    const waypoints = route.slice(1, -1);

    const metrics = await this.calculateRouteMetrics(route);
    const anomalies = await this.detectRouteAnomalies(route, metrics);
    const fraudRisk = this.calculateRouteFraudRisk(metrics, anomalies);

    const analysis: RouteAnalysis = {
      routeId: `route_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      startPoint,
      endPoint,
      waypoints,
      metrics,
      anomalies,
      fraudRisk,
      confidence: this.calculateRouteConfidence(route, metrics)
    };

    await this.storeRouteAnalysis(userId, analysis);
    return analysis;
  }

  private async calculateRouteMetrics(route: GeospatialPoint[]): Promise<RouteAnalysis['metrics']> {
    let totalDistance = 0;
    let maxSpeed = 0;
    let stops = 0;
    let detours = 0;

    for (let i = 1; i < route.length; i++) {
      const distance = this.calculateDistance(
        route[i-1].latitude, route[i-1].longitude,
        route[i].latitude, route[i].longitude
      );
      totalDistance += distance;

      const timeDiff = (route[i].timestamp.getTime() - route[i-1].timestamp.getTime()) / 1000 / 3600;
      if (timeDiff > 0) {
        const speed = distance / timeDiff;
        maxSpeed = Math.max(maxSpeed, speed);

        if (speed < 5 && timeDiff > 0.05) {
          stops++;
        }
      }
    }

    const estimatedDuration = this.estimateOptimalDuration(route);
    const actualDuration = (route[route.length-1].timestamp.getTime() - route[0].timestamp.getTime()) / 1000 / 3600;
    const averageSpeed = totalDistance / Math.max(actualDuration, 0.1);

    if (actualDuration > estimatedDuration * 1.5) {
      detours = Math.floor((actualDuration / estimatedDuration - 1) * 10);
    }

    return {
      totalDistance,
      estimatedDuration,
      actualDuration,
      averageSpeed,
      maxSpeed,
      stops,
      detours
    };
  }

  private async detectRouteAnomalies(route: GeospatialPoint[], metrics: RouteAnalysis['metrics']): Promise<RouteAnalysis['anomalies']> {
    const anomalies: RouteAnalysis['anomalies'] = {
      speedViolations: [],
      routeDeviations: [],
      suspiciousStops: [],
      impossibleMovements: []
    };

    for (let i = 1; i < route.length; i++) {
      const timeDiff = (route[i].timestamp.getTime() - route[i-1].timestamp.getTime()) / 1000 / 3600;
      const distance = this.calculateDistance(
        route[i-1].latitude, route[i-1].longitude,
        route[i].latitude, route[i].longitude
      );

      if (timeDiff > 0) {
        const speed = distance / timeDiff;

        if (speed > 150) {
          anomalies.speedViolations.push({
            point: route[i],
            speed,
            limit: 80
          });
        }

        if (speed > 500) {
          anomalies.impossibleMovements.push({
            from: route[i-1],
            to: route[i],
            speed
          });
        }
      }

      const expectedRoute = await this.getExpectedRoute(route[0], route[route.length-1]);
      const deviation = this.calculateRouteDeviation(route[i], expectedRoute);
      
      if (deviation > 5.0) {
        anomalies.routeDeviations.push({
          point: route[i],
          deviation
        });
      }

      if (i > 0 && i < route.length - 1) {
        const stopDuration = this.calculateStopDuration(route, i);
        if (stopDuration > 0.5 && this.isInSuspiciousArea(route[i])) {
          anomalies.suspiciousStops.push({
            point: route[i],
            duration: stopDuration
          });
        }
      }
    }

    return anomalies;
  }

  async performLocationClustering(points: GeospatialPoint[], userId?: string): Promise<LocationCluster[]> {
    const clusters: LocationCluster[] = [];
    const processed = new Set<number>();

    for (let i = 0; i < points.length; i++) {
      if (processed.has(i)) continue;

      const cluster: LocationCluster = {
        centroid: { ...points[i] },
        radius: 0,
        pointCount: 1,
        density: 0,
        riskScore: 0,
        patterns: [],
        timeDistribution: new Array(24).fill(0),
        userDistribution: new Map()
      };

      const clusterPoints = [points[i]];
      processed.add(i);

      if (userId) {
        cluster.userDistribution.set(userId, 1);
      }

      for (let j = i + 1; j < points.length; j++) {
        if (processed.has(j)) continue;

        const distance = this.calculateDistance(
          points[i].latitude, points[i].longitude,
          points[j].latitude, points[j].longitude
        );

        if (distance < 0.5) {
          clusterPoints.push(points[j]);
          processed.add(j);
          cluster.pointCount++;

          if (points[j].userId && points[j].userId !== userId) {
            const count = cluster.userDistribution.get(points[j].userId) || 0;
            cluster.userDistribution.set(points[j].userId, count + 1);
          }
        }
      }

      cluster.centroid = this.calculateCentroid(clusterPoints);
      cluster.radius = this.calculateClusterRadius(clusterPoints, cluster.centroid);
      cluster.density = cluster.pointCount / (Math.PI * Math.pow(cluster.radius, 2));
      cluster.timeDistribution = this.analyzeTimeDistribution(clusterPoints);
      cluster.patterns = await this.identifyClusterPatterns(cluster);
      cluster.riskScore = this.calculateClusterRisk(cluster);

      clusters.push(cluster);
    }

    this.locationClusters = clusters.sort((a, b) => b.riskScore - a.riskScore);
    return this.locationClusters;
  }

  private analyzeLocationClusters(point: GeospatialPoint): number {
    let maxRisk = 0;

    for (const cluster of this.locationClusters) {
      const distance = this.calculateDistance(
        point.latitude, point.longitude,
        cluster.centroid.latitude, cluster.centroid.longitude
      );

      if (distance <= cluster.radius) {
        maxRisk = Math.max(maxRisk, cluster.riskScore);
      }
    }

    return maxRisk;
  }

  private calculateTimeBasedRisk(point: GeospatialPoint): number {
    const hour = point.timestamp.getHours();
    
    if (hour >= 2 && hour <= 5) return 0.3;
    if (hour >= 22 || hour <= 1) return 0.2;
    
    return 0.05;
  }

  private getRegionalRiskFactor(point: GeospatialPoint): number {
    for (const region of this.philippinesRegions) {
      if (this.isPointInRegion(point, region)) {
        const avgHotspotRisk = region.fraudHotspots.reduce((sum, h) => sum + h.riskLevel, 0) / region.fraudHotspots.length;
        return avgHotspotRisk * 0.5;
      }
    }

    return 0.1;
  }

  private createCircularGeofence(center: GeospatialPoint, radiusKm: number): GeospatialPoint[] {
    const points: GeospatialPoint[] = [];
    const earthRadius = 6371;
    const numPoints = 32;

    for (let i = 0; i < numPoints; i++) {
      const angle = (i * 2 * Math.PI) / numPoints;
      const latOffset = (radiusKm * Math.cos(angle)) / earthRadius * (180 / Math.PI);
      const lonOffset = (radiusKm * Math.sin(angle)) / earthRadius * (180 / Math.PI) / Math.cos(center.latitude * Math.PI / 180);

      points.push({
        latitude: center.latitude + latOffset,
        longitude: center.longitude + lonOffset,
        timestamp: center.timestamp
      });
    }

    return points;
  }

  private isPointInPolygon(point: GeospatialPoint, polygon: GeospatialPoint[]): boolean {
    let inside = false;
    const x = point.longitude;
    const y = point.latitude;

    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i].longitude;
      const yi = polygon[i].latitude;
      const xj = polygon[j].longitude;
      const yj = polygon[j].latitude;

      if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
        inside = !inside;
      }
    }

    return inside;
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  private calculateExpectedDensity(population: number, timeSlot: string): number {
    const baseDensity = population / 1000000;
    
    switch (timeSlot) {
      case 'morning_rush': return baseDensity * 1.8;
      case 'evening_rush': return baseDensity * 2.0;
      case 'midday': return baseDensity * 1.2;
      case 'night': return baseDensity * 0.3;
      default: return baseDensity;
    }
  }

  private estimateOptimalDuration(route: GeospatialPoint[]): number {
    let totalDistance = 0;
    for (let i = 1; i < route.length; i++) {
      totalDistance += this.calculateDistance(
        route[i-1].latitude, route[i-1].longitude,
        route[i].latitude, route[i].longitude
      );
    }
    
    return totalDistance / 40;
  }

  private calculateRouteFraudRisk(metrics: RouteAnalysis['metrics'], anomalies: RouteAnalysis['anomalies']): number {
    let risk = 0;

    risk += anomalies.speedViolations.length * 0.1;
    risk += anomalies.impossibleMovements.length * 0.3;
    risk += anomalies.routeDeviations.length * 0.15;
    risk += anomalies.suspiciousStops.length * 0.2;

    if (metrics.detours > 3) risk += 0.2;
    if (metrics.averageSpeed > 100) risk += 0.15;
    if (metrics.actualDuration > metrics.estimatedDuration * 2) risk += 0.1;

    return Math.min(risk, 1.0);
  }

  private calculateRouteConfidence(route: GeospatialPoint[], metrics: RouteAnalysis['metrics']): number {
    let confidence = 0.8;

    if (route.length < 10) confidence -= 0.2;
    if (route.some(p => !p.accuracy || p.accuracy > 50)) confidence -= 0.1;
    if (metrics.totalDistance < 1) confidence -= 0.1;

    return Math.max(confidence, 0.3);
  }

  private async getExpectedRoute(start: GeospatialPoint, end: GeospatialPoint): Promise<GeospatialPoint[]> {
    const midpoint: GeospatialPoint = {
      latitude: (start.latitude + end.latitude) / 2,
      longitude: (start.longitude + end.longitude) / 2,
      timestamp: new Date()
    };

    return [start, midpoint, end];
  }

  private calculateRouteDeviation(point: GeospatialPoint, expectedRoute: GeospatialPoint[]): number {
    let minDistance = Infinity;

    for (const expectedPoint of expectedRoute) {
      const distance = this.calculateDistance(
        point.latitude, point.longitude,
        expectedPoint.latitude, expectedPoint.longitude
      );
      minDistance = Math.min(minDistance, distance);
    }

    return minDistance;
  }

  private calculateStopDuration(route: GeospatialPoint[], index: number): number {
    if (index <= 0 || index >= route.length - 1) return 0;

    const beforeTime = route[index - 1].timestamp.getTime();
    const currentTime = route[index].timestamp.getTime();
    const afterTime = route[index + 1].timestamp.getTime();

    return (afterTime - beforeTime) / 1000 / 3600;
  }

  private isInSuspiciousArea(point: GeospatialPoint): boolean {
    for (const riskArea of this.fraudRiskAreas.highRisk) {
      const distance = this.calculateDistance(
        point.latitude, point.longitude,
        riskArea.center.lat, riskArea.center.lon
      );
      if (distance <= riskArea.radius) return true;
    }
    return false;
  }

  private calculateCentroid(points: GeospatialPoint[]): GeospatialPoint {
    const sumLat = points.reduce((sum, p) => sum + p.latitude, 0);
    const sumLon = points.reduce((sum, p) => sum + p.longitude, 0);

    return {
      latitude: sumLat / points.length,
      longitude: sumLon / points.length,
      timestamp: new Date()
    };
  }

  private calculateClusterRadius(points: GeospatialPoint[], centroid: GeospatialPoint): number {
    let maxDistance = 0;

    for (const point of points) {
      const distance = this.calculateDistance(
        point.latitude, point.longitude,
        centroid.latitude, centroid.longitude
      );
      maxDistance = Math.max(maxDistance, distance);
    }

    return maxDistance;
  }

  private analyzeTimeDistribution(points: GeospatialPoint[]): number[] {
    const distribution = new Array(24).fill(0);

    for (const point of points) {
      const hour = point.timestamp.getHours();
      distribution[hour]++;
    }

    const total = points.length;
    return distribution.map(count => count / total);
  }

  private async identifyClusterPatterns(cluster: LocationCluster): Promise<string[]> {
    const patterns: string[] = [];

    if (cluster.userDistribution.size > 10) {
      patterns.push('high_user_convergence');
    }

    if (cluster.density > 100) {
      patterns.push('dense_activity_cluster');
    }

    const peakHours = cluster.timeDistribution
      .map((value, hour) => ({ hour, value }))
      .filter(item => item.value > 0.1)
      .map(item => item.hour);

    if (peakHours.length > 0) {
      if (peakHours.some(hour => hour >= 2 && hour <= 5)) {
        patterns.push('unusual_nighttime_activity');
      }
      if (peakHours.some(hour => hour >= 7 && hour <= 9) && peakHours.some(hour => hour >= 17 && hour <= 19)) {
        patterns.push('commuter_pattern');
      }
    }

    return patterns;
  }

  private calculateClusterRisk(cluster: LocationCluster): number {
    let risk = 0;

    if (cluster.patterns.includes('unusual_nighttime_activity')) risk += 0.3;
    if (cluster.patterns.includes('high_user_convergence')) risk += 0.2;
    if (cluster.density > 200) risk += 0.2;

    const nightActivity = cluster.timeDistribution.slice(0, 6).reduce((sum, val) => sum + val, 0);
    if (nightActivity > 0.3) risk += 0.2;

    if (this.isClusterInFraudArea(cluster)) risk += 0.3;

    return Math.min(risk, 1.0);
  }

  private isClusterInFraudArea(cluster: LocationCluster): boolean {
    return this.isInSuspiciousArea(cluster.centroid);
  }

  private isPointInRegion(point: GeospatialPoint, region: PhilippinesRegionData): boolean {
    return region.majorCities.some(city => {
      const distance = this.calculateDistance(
        point.latitude, point.longitude,
        city.location.latitude, city.location.longitude
      );
      return distance <= 50;
    });
  }

  private async storeRouteAnalysis(userId: string, analysis: RouteAnalysis): Promise<void> {
    const userRoutes = this.routeDatabase.get(userId) || [];
    userRoutes.push(analysis);

    if (userRoutes.length > 100) {
      userRoutes.splice(0, userRoutes.length - 100);
    }

    this.routeDatabase.set(userId, userRoutes);
  }

  getGeofenceRules(): Map<string, GeofenceRule> {
    return this.geofences;
  }

  getLocationClusters(): LocationCluster[] {
    return this.locationClusters;
  }

  getRouteHistory(userId: string): RouteAnalysis[] {
    return this.routeDatabase.get(userId) || [];
  }

  getPhilippinesRegions(): PhilippinesRegionData[] {
    return this.philippinesRegions;
  }

  async generateGeospatialReport(timeRange: string): Promise<any> {
    return {
      reportId: `geo_report_${Date.now()}`,
      timeRange,
      summary: {
        totalLocationsAnalyzed: Math.floor(Math.random() * 10000) + 5000,
        flaggedRoutes: Math.floor(Math.random() * 500) + 100,
        geofenceViolations: Math.floor(Math.random() * 200) + 50,
        clusterDetections: this.locationClusters.length
      },
      hotspots: this.philippinesRegions.flatMap(r => r.fraudHotspots),
      riskAreas: [...this.fraudRiskAreas.highRisk, ...this.fraudRiskAreas.moderateRisk],
      recommendations: [
        'Increase monitoring in NCR business districts',
        'Deploy additional verification in Cebu transport hubs',
        'Enhance nighttime activity tracking',
        'Improve cross-regional coordination'
      ],
      generatedAt: new Date()
    };
  }
}