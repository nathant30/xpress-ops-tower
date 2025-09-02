import { z } from "zod";

/* ===== Shared Enums ===== */
export const NexusDomain = z.enum(["pricing","surge","regional","risk"]);
export type NexusDomain = z.infer<typeof NexusDomain>;

export const RiskLevel = z.enum(["low","medium","high"]);
export type RiskLevel = z.infer<typeof RiskLevel>;

export const RecStatus = z.enum(["generated","proposed","approved","rejected","superseded"]);
export type RecStatus = z.infer<typeof RecStatus>;

/* ===== Health ===== */
export const AIHealthScoreDTO = z.object({
  id: z.number().int(),
  domain: NexusDomain,
  regionId: z.number().int().nullable(),
  profileId: z.number().int().nullable(),
  score: z.number().min(0).max(100),
  components: z.record(z.any()).nullable(),
  computedAt: z.string().datetime()
});
export type AIHealthScoreDTO = z.infer<typeof AIHealthScoreDTO>;

/* ===== Recommendations ===== */
export const AIRecommendationDTO = z.object({
  id: z.number().int(),
  domain: NexusDomain,
  regionId: z.number().int().nullable(),
  profileId: z.number().int().nullable(),
  serviceKey: z.enum(["tnvs","taxi","special","pop","twg"]).nullable(),
  title: z.string(),
  message: z.string(),
  details: z.record(z.any()).nullable(),    // structured payload (diffs/targets)
  confidence: z.number().min(0).max(1),
  riskLevel: RiskLevel,
  complianceFlag: z.boolean().default(false),
  status: RecStatus,
  createdByModel: z.string(),               // name/version
  createdAt: z.string().datetime(),
  proposedBy: z.string().uuid().nullable(),
  proposedAt: z.string().datetime().nullable(),
  approvedBy: z.string().uuid().nullable(),
  approvedAt: z.string().datetime().nullable(),
  rejectionReason: z.string().nullable()
});
export type AIRecommendationDTO = z.infer<typeof AIRecommendationDTO>;

export const ProposeRecommendationRequest = z.object({
  comment: z.string().max(1000).optional()
});
export type ProposeRecommendationRequest = z.infer<typeof ProposeRecommendationRequest>;

export const ApproveRecommendationRequest = z.object({
  justification: z.string().max(1000).optional()
});
export type ApproveRecommendationRequest = z.infer<typeof ApproveRecommendationRequest>;

export const RejectRecommendationRequest = z.object({
  reason: z.string().min(3).max(1000)
});
export type RejectRecommendationRequest = z.infer<typeof RejectRecommendationRequest>;

/* ===== Scenario Builder ===== */
export const ScenarioInputs = z.object({
  pricingDiff: z.record(z.any()).optional(),   // e.g., { perKm: +2 }
  surgeCurveRef: z.string().optional(),        // reference to a pre-defined surge curve
  timeWindow: z.object({
    start: z.string().datetime(),
    end: z.string().datetime()
  }),
});
export type ScenarioInputs = z.infer<typeof ScenarioInputs>;

export const CreateScenarioRequest = z.object({
  regionId: z.number().int(),
  profileId: z.number().int().optional(),
  surgeProfileId: z.number().int().optional(),
  inputs: ScenarioInputs
});
export type CreateScenarioRequest = z.infer<typeof CreateScenarioRequest>;

export const ScenarioRunDTO = z.object({
  id: z.number().int(),
  requestedBy: z.string().uuid(),
  regionId: z.number().int(),
  profileId: z.number().int().nullable(),
  surgeProfileId: z.number().int().nullable(),
  inputs: ScenarioInputs,
  outputs: z.record(z.any()).nullable(),         // KPI deltas, charts
  complianceResult: z.record(z.any()).nullable(),
  createdAt: z.string().datetime()
});
export type ScenarioRunDTO = z.infer<typeof ScenarioRunDTO>;

/* ===== Forecasts ===== */
export const NexusMetricKey = z.enum(["trips","revenue","roi"]);
export type NexusMetricKey = z.infer<typeof NexusMetricKey>;

export const ForecastDTO = z.object({
  id: z.number().int(),
  regionId: z.number().int().nullable(),
  profileId: z.number().int().nullable(),
  horizonDays: z.number().int(),
  metricKey: NexusMetricKey,
  predictedValue: z.number(),
  confidence: z.number().min(0).max(1).nullable(),
  generatedAt: z.string().datetime()
});
export type ForecastDTO = z.infer<typeof ForecastDTO>;

/* ===== Cross-Domain Bundles ===== */
export const AIBundleDTO = z.object({
  id: z.number().int(),
  regionId: z.number().int(),
  title: z.string(),
  summary: z.string(),
  recommendationIds: z.array(z.number().int()).min(1),
  confidence: z.number().min(0).max(1).nullable(),
  riskLevel: RiskLevel.nullable(),
  createdAt: z.string().datetime()
});
export type AIBundleDTO = z.infer<typeof AIBundleDTO>;

/* ===== Model Metrics (Ops) ===== */
export const ModelMetricDTO = z.object({
  id: z.number().int(),
  modelName: z.string(),
  modelVersion: z.string(),
  metricKey: z.string(),                    // 'mape','rmse','accept_rate'
  metricValue: z.number(),
  window: z.string(),                       // '7d','30d','90d'
  computedAt: z.string().datetime()
});
export type ModelMetricDTO = z.infer<typeof ModelMetricDTO>;

/* ===== Glossary ===== */
export const GlossaryEntryDTO = z.object({
  id: z.number().int(),
  term: z.string(),
  simpleDefinition: z.string(),
  longDefinition: z.string().nullable(),
  examples: z.record(z.any()).nullable(),
  lastUpdated: z.string().datetime()
});
export type GlossaryEntryDTO = z.infer<typeof GlossaryEntryDTO>;

/* ===== API Response Wrappers ===== */
export const NexusOverviewResponse = z.object({
  healthScores: z.array(AIHealthScoreDTO),
  keyAlerts: z.array(z.object({
    id: z.number().int(),
    type: z.enum(["expiring_permit","underperforming_region","model_drift","compliance_risk"]),
    severity: z.enum(["low","medium","high","critical"]),
    title: z.string(),
    message: z.string(),
    regionId: z.number().int().nullable(),
    domain: NexusDomain.nullable(),
    createdAt: z.string().datetime()
  })),
  summary: z.object({
    totalRecommendations: z.number().int(),
    pendingApprovals: z.number().int(),
    activeScenarios: z.number().int(),
    healthAverage: z.number().min(0).max(100)
  })
});
export type NexusOverviewResponse = z.infer<typeof NexusOverviewResponse>;

export const RecommendationFeedResponse = z.object({
  recommendations: z.array(AIRecommendationDTO),
  pagination: z.object({
    total: z.number().int(),
    page: z.number().int(),
    limit: z.number().int(),
    hasNext: z.boolean()
  })
});
export type RecommendationFeedResponse = z.infer<typeof RecommendationFeedResponse>;

/* ===== UI State Types ===== */
export const NexusTabId = z.enum([
  "overview",
  "recommendations", 
  "forecasts",
  "scenario_builder",
  "cross_domain",
  "risk_compliance",
  "ops_ai",
  "audit_governance",
  "knowledge"
]);
export type NexusTabId = z.infer<typeof NexusTabId>;

export const NexusFilters = z.object({
  domain: NexusDomain.optional(),
  regionId: z.number().int().optional(),
  profileId: z.number().int().optional(),
  status: RecStatus.optional(),
  riskLevel: RiskLevel.optional(),
  dateRange: z.object({
    start: z.string().datetime(),
    end: z.string().datetime()
  }).optional()
});
export type NexusFilters = z.infer<typeof NexusFilters>;