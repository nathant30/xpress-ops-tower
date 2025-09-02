import { z } from "zod";

/* ---------- Shared Enums and Constants ---------- */
export const MetricKey = z.enum([
  "trips", 
  "revenue", 
  "roi", 
  "cph",
  "trips_per_day",
  "revenue_per_trip", 
  "market_share",
  "nps_score",
  "operational_efficiency",
  "fraud_rate",
  "driver_supply",
  "user_growth",
  "profitability"
]);
export type MetricKey = z.infer<typeof MetricKey>;

export const RecommendationType = z.enum([
  "service_mix",           // suggest enabling/disabling services
  "pricing",              // propose pricing profile changes
  "tier_upgrade",         // suggest tier promotion
  "tier_downgrade",       // suggest tier demotion
  "financial_efficiency", // cost optimization suggestions
  "compliance_risk",      // flag upcoming permit expiries
  "growth_opportunity",   // expansion suggestions
  "risk_mitigation",      // fraud/operational risk alerts
  "resource_allocation",  // staffing/budget optimization
  "market_entry",        // new market opportunities
  "service_optimization" // improve existing service performance
]);
export type RecommendationType = z.infer<typeof RecommendationType>;

export const RecommendationStatus = z.enum([
  "pending",
  "under_review", 
  "accepted",
  "rejected",
  "implemented",
  "superseded",
  "expired"
]);
export type RecommendationStatus = z.infer<typeof RecommendationStatus>;

export const RecommendationPriority = z.enum([
  "low",
  "medium", 
  "high",
  "critical"
]);
export type RecommendationPriority = z.infer<typeof RecommendationPriority>;

export const RegionTier = z.enum(["1", "2", "3"]).transform(val => parseInt(val));
export type RegionTier = z.infer<typeof RegionTier>;

export const LifecycleStage = z.enum([
  "draft",
  "pilot", 
  "active",
  "paused",
  "retired"
]);
export type LifecycleStage = z.infer<typeof LifecycleStage>;

export const MarketMaturity = z.enum([
  "emerging",
  "growth",
  "mature", 
  "declining"
]);
export type MarketMaturity = z.infer<typeof MarketMaturity>;

/* ---------- Enhanced Region Model ---------- */
export const EnhancedRegionDTO = z.object({
  id: z.number().int(),
  regionCode: z.string(),
  name: z.string(),
  tier: z.number().int().min(1).max(3),
  lifecycleStage: LifecycleStage,
  marketMaturity: MarketMaturity,
  
  // Demographics & Market Data
  population: z.number().int().optional(),
  gdpPerCapita: z.number().int().optional(),
  smartphonePenetration: z.number().min(0).max(1).optional(),
  internetCoverage: z.number().min(0).max(1).optional(),
  
  // AI Insights
  aiHealthScore: z.number().min(0).max(100).nullable(),
  aiLastForecast: z.record(z.any()).nullable(),
  aiLastRecommendations: z.record(z.any()).nullable(),
  
  // Business Metrics
  profitCenterId: z.string().optional(),
  expansionBudget: z.number().default(0),
  nextReviewDate: z.string().datetime().optional(),
  
  // Risk & Compliance
  riskFactors: z.array(z.string()).default([]),
  competitiveLandscape: z.record(z.any()).default({}),
  regulatoryStatus: z.record(z.any()).default({}),
  
  // Timestamps
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});
export type EnhancedRegionDTO = z.infer<typeof EnhancedRegionDTO>;

/* ---------- Region AI Health ---------- */
export const RegionAIHealthDTO = z.object({
  regionId: z.number().int(),
  aiHealthScore: z.number().min(0).max(100).nullable(),
  aiLastForecast: z.record(z.any()).nullable(),
  aiLastRecommendations: z.record(z.any()).nullable(),
  lastUpdated: z.string().datetime(),
  
  // Health components breakdown
  healthComponents: z.object({
    operational: z.number().min(0).max(100),    // trips, efficiency, supply-demand
    financial: z.number().min(0).max(100),      // revenue, profitability, costs  
    compliance: z.number().min(0).max(100),     // regulatory status, permits
    market: z.number().min(0).max(100),         // market share, competition, growth
    risk: z.number().min(0).max(100),           // fraud, operational risks
    customer: z.number().min(0).max(100)        // NPS, retention, satisfaction
  }).optional()
});
export type RegionAIHealthDTO = z.infer<typeof RegionAIHealthDTO>;

/* ---------- Benchmarks ---------- */
export const RegionBenchmarkDTO = z.object({
  id: z.number().int(),
  regionId: z.number().int(),
  tier: z.number().int().min(1).max(3),
  metricKey: MetricKey,
  value: z.number(),
  benchmarkValue: z.number().nullable(),
  comparison: z.number().nullable(), // % diff from benchmark
  percentile: z.number().min(0).max(100).nullable(),
  computedAt: z.string().datetime(),
  validUntil: z.string().datetime()
});
export type RegionBenchmarkDTO = z.infer<typeof RegionBenchmarkDTO>;

export const GetRegionBenchmarksResponse = z.array(RegionBenchmarkDTO);

export const GetBenchmarksQuery = z.object({
  tier: z.number().int().min(1).max(3).optional(),
  metric: MetricKey.optional(),
  regionIds: z.array(z.number().int()).optional(),
  limit: z.number().int().min(1).max(100).default(50)
});
export type GetBenchmarksQuery = z.infer<typeof GetBenchmarksQuery>;

/* ---------- Forecasts ---------- */
export const RegionForecastDTO = z.object({
  id: z.number().int(),
  regionId: z.number().int(),
  horizonDays: z.number().int(), // 30, 60, 90, 180, 365
  metricKey: MetricKey,
  predictedValue: z.number(),
  confidence: z.number().min(0).max(1), // 0–1 confidence score
  baselineValue: z.number().nullable(),
  growthRate: z.number().nullable(),
  seasonalityFactor: z.number().default(1.0),
  externalFactors: z.array(z.string()).default([]),
  modelVersion: z.string(),
  generatedAt: z.string().datetime(),
  expiresAt: z.string().datetime(),
  
  // Explainability
  featureImportance: z.record(z.number()).default({}) // {"seasonality":0.4,"weather":0.3,"supply":0.2}
});
export type RegionForecastDTO = z.infer<typeof RegionForecastDTO>;

export const GetRegionForecastsResponse = z.array(RegionForecastDTO);

export const GenerateForecastRequest = z.object({
  horizonDays: z.number().int().default(30),
  metrics: z.array(MetricKey).optional().default(["trips", "revenue", "roi"]),
  includeExternalFactors: z.boolean().default(true),
  modelVersion: z.string().optional()
});
export type GenerateForecastRequest = z.infer<typeof GenerateForecastRequest>;

/* ---------- Recommendations ---------- */
export const RegionRecommendationDTO = z.object({
  id: z.number().int(),
  regionId: z.number().int(),
  recommendationType: RecommendationType,
  priority: RecommendationPriority,
  
  // Core content
  title: z.string(),
  message: z.string(),
  details: z.record(z.any()),
  
  // AI scoring
  confidence: z.number().min(0).max(1).nullable(),
  impactScore: z.number().min(0).max(100).default(0), // Expected business impact
  effortScore: z.number().min(0).max(100).default(0), // Implementation effort (lower = easier)
  roiProjection: z.number().nullable(),
  
  // Explainability
  explainability: z.record(z.any()).default({}), // Feature importance, reasoning
  supportingData: z.record(z.any()).default({}), // Data points that led to this rec
  
  // Lifecycle
  status: RecommendationStatus,
  createdAt: z.string().datetime(),
  expiresAt: z.string().datetime(),
  
  // Governance
  assignedTo: z.string().nullable(),
  actionedBy: z.string().nullable(),
  actionedAt: z.string().datetime().optional(),
  implementationDeadline: z.string().date().optional(),
  justification: z.string().optional(),
  
  // Results tracking
  implementedAt: z.string().datetime().optional(),
  actualImpact: z.number().optional(),
  successMetrics: z.record(z.any()).default({})
});
export type RegionRecommendationDTO = z.infer<typeof RegionRecommendationDTO>;

export const GetRegionRecommendationsResponse = z.array(RegionRecommendationDTO);

export const GetRecommendationsQuery = z.object({
  regionId: z.number().int().optional(),
  type: RecommendationType.optional(),
  status: RecommendationStatus.optional(),
  priority: RecommendationPriority.optional(),
  assignedTo: z.string().optional(),
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().min(0).default(0),
  sortBy: z.enum(["createdAt", "priority", "impactScore", "confidence"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc")
});
export type GetRecommendationsQuery = z.infer<typeof GetRecommendationsQuery>;

export const ActionRecommendationRequest = z.object({
  decision: z.enum(["accepted", "rejected", "under_review"]),
  justification: z.string().max(1000).optional(),
  implementationDeadline: z.string().date().optional(),
  assignedTo: z.string().optional() // user UUID to assign implementation
});
export type ActionRecommendationRequest = z.infer<typeof ActionRecommendationRequest>;

export const ActionRecommendationResponse = z.object({
  recommendationId: z.number().int(),
  newStatus: RecommendationStatus,
  actionedBy: z.string(),
  actionedAt: z.string().datetime(),
  message: z.string()
});
export type ActionRecommendationResponse = z.infer<typeof ActionRecommendationResponse>;

/* ---------- Services ---------- */
export const RegionServiceDTO = z.object({
  id: z.number().int(),
  regionId: z.number().int(),
  serviceCode: z.string(),
  serviceName: z.string(),
  localAlias: z.string().optional(), // regional branding
  
  // Status
  isEnabled: z.boolean(),
  launchDate: z.string().date().optional(),
  pauseDate: z.string().date().optional(),
  retirementDate: z.string().date().optional(),
  
  // Performance
  dailyVolume: z.number().int().default(0),
  monthlyRevenue: z.number().default(0),
  marketPenetration: z.number().min(0).max(1).default(0),
  npsScore: z.number().min(-100).max(100).optional(),
  
  // AI insights
  aiGrowthPotential: z.number().min(0).max(1).default(0),
  aiRecommendationScore: z.number().min(0).max(1).default(0),
  competitiveAdvantage: z.number().min(0).max(1).default(0),
  
  // Governance
  approvedBy: z.string().optional(),
  approvedAt: z.string().datetime().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});
export type RegionServiceDTO = z.infer<typeof RegionServiceDTO>;

export const UpdateRegionServiceRequest = z.object({
  isEnabled: z.boolean().optional(),
  localAlias: z.string().optional(),
  launchDate: z.string().date().optional(),
  justification: z.string().max(500).optional()
});
export type UpdateRegionServiceRequest = z.infer<typeof UpdateRegionServiceRequest>;

/* ---------- Financial Metrics ---------- */
export const RegionFinancialDTO = z.object({
  id: z.number().int(),
  regionId: z.number().int(),
  periodStart: z.string().date(),
  periodEnd: z.string().date(),
  periodType: z.enum(["daily", "weekly", "monthly", "quarterly", "yearly"]),
  
  // Revenue streams
  grossRevenue: z.number().default(0),
  netRevenue: z.number().default(0),
  commissionRevenue: z.number().default(0),
  surgeRevenue: z.number().default(0),
  subscriptionRevenue: z.number().default(0),
  
  // Direct costs
  driverIncentives: z.number().default(0),
  fuelSubsidies: z.number().default(0),
  marketingSpend: z.number().default(0),
  localOperationsCost: z.number().default(0),
  regulatoryFees: z.number().default(0),
  
  // Allocated costs
  technologyAllocation: z.number().default(0),
  supportAllocation: z.number().default(0),
  overheadAllocation: z.number().default(0),
  
  // Calculated metrics (generated in DB)
  grossProfit: z.number(),
  netProfit: z.number(),
  
  // Operational metrics
  totalTrips: z.number().int().default(0),
  totalActiveDrivers: z.number().int().default(0),
  totalActiveUsers: z.number().int().default(0),
  
  // Efficiency ratios
  revenuePerTrip: z.number().default(0),
  costPerTrip: z.number().default(0),
  profitMargin: z.number().default(0),
  
  createdAt: z.string().datetime()
});
export type RegionFinancialDTO = z.infer<typeof RegionFinancialDTO>;

/* ---------- Compliance ---------- */
export const RegionComplianceDTO = z.object({
  id: z.number().int(),
  regionId: z.number().int(),
  artifactType: z.string(), // permit, license, certificate, registration
  artifactName: z.string(),
  issuingAuthority: z.string(),
  documentNumber: z.string().optional(),
  
  issueDate: z.string().date(),
  expiryDate: z.string().date(),
  renewalWindowDays: z.number().int().default(30),
  
  status: z.enum(["valid", "expiring_soon", "expired", "pending_renewal", "suspended"]),
  autoBlockOnExpiry: z.boolean().default(true),
  
  documentUrl: z.string().optional(),
  documentHash: z.string().optional(),
  
  businessImpactScore: z.number().min(0).max(1).default(1.0),
  affectedServices: z.array(z.string()).default([]),
  
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});
export type RegionComplianceDTO = z.infer<typeof RegionComplianceDTO>;

/* ---------- Audit Trail ---------- */
export const RegionAuditDTO = z.object({
  id: z.number().int(),
  regionId: z.number().int().optional(),
  recommendationId: z.number().int().optional(),
  
  tableName: z.string(),
  recordId: z.number().int().optional(),
  actionType: z.enum(["create", "update", "delete", "approve", "reject", "implement"]),
  
  fieldName: z.string().optional(),
  oldValue: z.record(z.any()).optional(),
  newValue: z.record(z.any()).optional(),
  changeReason: z.string().optional(),
  
  aiRecommended: z.boolean().default(false),
  aiConfidence: z.number().min(0).max(1).optional(),
  humanOverride: z.boolean().default(false),
  
  changedBy: z.string(), // user UUID
  approvedBy: z.string().optional(),
  approvalRequired: z.boolean().default(false),
  
  sessionId: z.string().optional(),
  ipAddress: z.string().optional(),
  userAgent: z.string().optional(),
  
  createdAt: z.string().datetime()
});
export type RegionAuditDTO = z.infer<typeof RegionAuditDTO>;

/* ---------- Dashboard Aggregations ---------- */
export const RegionDashboardStats = z.object({
  totalRegions: z.number().int(),
  activeRegions: z.number().int(),
  profitableRegions: z.number().int(),
  
  // Tier breakdown
  tier1Regions: z.number().int(),
  tier2Regions: z.number().int(),
  tier3Regions: z.number().int(),
  
  // Financial aggregates
  totalRevenue: z.number(),
  totalProfit: z.number(),
  averageHealthScore: z.number(),
  
  // AI activity
  pendingRecommendations: z.number().int(),
  implementedRecommendations: z.number().int(),
  averageConfidence: z.number(),
  
  // Risk indicators
  complianceAlerts: z.number().int(),
  highRiskRegions: z.number().int(),
  expiringSoonCount: z.number().int()
});
export type RegionDashboardStats = z.infer<typeof RegionDashboardStats>;

export const RegionPerformanceComparison = z.object({
  regionId: z.number().int(),
  regionName: z.string(),
  tier: z.number().int(),
  
  metrics: z.record(z.object({
    value: z.number(),
    benchmark: z.number(),
    percentile: z.number(),
    trend: z.enum(["up", "down", "stable"])
  })),
  
  overallRanking: z.number().int(),
  healthScore: z.number(),
  riskLevel: z.enum(["low", "medium", "high", "critical"])
});
export type RegionPerformanceComparison = z.infer<typeof RegionPerformanceComparison>;

/* ---------- API Response Wrappers ---------- */
export const ApiSuccessResponse = <T extends z.ZodType>(dataSchema: T) =>
  z.object({
    success: z.boolean().default(true),
    data: dataSchema,
    message: z.string().optional(),
    timestamp: z.string().datetime().default(new Date().toISOString())
  });

export const ApiErrorResponse = z.object({
  success: z.boolean().default(false),
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.record(z.any()).optional()
  }),
  timestamp: z.string().datetime().default(new Date().toISOString())
});

export const PaginatedResponse = <T extends z.ZodType>(itemSchema: T) =>
  z.object({
    data: z.array(itemSchema),
    pagination: z.object({
      page: z.number().int(),
      limit: z.number().int(),
      total: z.number().int(),
      totalPages: z.number().int(),
      hasNext: z.boolean(),
      hasPrev: z.boolean()
    }),
    success: z.boolean().default(true),
    timestamp: z.string().datetime().default(new Date().toISOString())
  });

export type ApiSuccessResponse<T> = {
  success: true;
  data: T;
  message?: string;
  timestamp: string;
};

export type ApiErrorResponse = z.infer<typeof ApiErrorResponse>;

export type PaginatedResponse<T> = {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  success: true;
  timestamp: string;
};