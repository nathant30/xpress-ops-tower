import { z } from "zod";

/* =========================
 * Enums & Common Types
 * ========================= */

export const ServiceKey = z.enum(["tnvs", "taxi", "special", "pop", "twg"]);
export type ServiceKey = z.infer<typeof ServiceKey>;

export const ProfileStatus = z.enum(["draft", "filed", "active", "retired"]);
export type ProfileStatus = z.infer<typeof ProfileStatus>;

export const RegulatorStatus = z.enum(["draft", "filed", "approved", "rejected"]);
export type RegulatorStatus = z.infer<typeof RegulatorStatus>;

export const MetricKey = z.enum(["trips", "revenue", "roi"]);
export type MetricKey = z.infer<typeof MetricKey>;

export const RecommendationStatus = z.enum(["pending", "accepted", "rejected", "superseded"]);
export type RecommendationStatus = z.infer<typeof RecommendationStatus>;

export const PricingAction = z.enum([
  "create",
  "update_component",
  "update_description",
  "publish_toggle",
  "profile_status_change",
  "earnings_routing_change",
  "attach_profile_to_region",
  "detach_profile_from_region",
]);
export type PricingAction = z.infer<typeof PricingAction>;

export const EarningsRouting = z.enum(["driver", "fleet", "xpress"]);
export type EarningsRouting = z.infer<typeof EarningsRouting>;

/* Rider-facing description blocks with publish control */
export const PublishableText = z.object({
  label: z.string(),       // e.g., "Base fare"
  text: z.string(),        // markdown/text
  publish: z.boolean().default(true),
});
export type PublishableText = z.infer<typeof PublishableText>;

/* ===== Pricing Profile DTO ===== */
export const PricingProfileV4DTO = z.object({
  id: z.number().int(),
  regionId: z.string(),
  serviceKey: ServiceKey,
  name: z.string(),
  status: ProfileStatus,
  
  // Regulator compliance
  regulatorStatus: RegulatorStatus.nullable(),
  regulatorRef: z.string().nullable(),
  regulatorFiledAt: z.string().datetime().nullable(),
  regulatorApprovedAt: z.string().datetime().nullable(),
  regulatorExpiresAt: z.string().datetime().nullable(),
  
  // Core pricing
  baseFare: z.number().nonnegative(),
  baseIncludedKm: z.number().nonnegative(),
  perKm: z.number().nonnegative(),
  perMinute: z.number().nonnegative(),
  bookingFee: z.number().nonnegative(),
  
  // Surcharges
  airportSurcharge: z.number().nonnegative(),
  poiSurcharge: z.number().nonnegative(),
  tollPassthrough: z.boolean(),
  
  // Descriptions and transparency
  description: z.record(z.any()).nullable(), // JSON object
  
  // Earnings
  earningsRouting: EarningsRouting,
  driverCommissionPct: z.number().min(0).max(1),
  fleetCommissionPct: z.number().min(0).max(1),
  
  // AI/ML fields
  aiHealthScore: z.number().min(0).max(100),
  aiLastForecast: z.record(z.any()).nullable(),
  aiLastRecommendations: z.record(z.any()).nullable(),
  aiElasticityCoefficient: z.number().nullable(),
  
  // Metadata
  createdAt: z.string().datetime(),
  createdBy: z.string().nullable(),
  updatedAt: z.string().datetime(),
  updatedBy: z.string().nullable(),
});
export type PricingProfileV4DTO = z.infer<typeof PricingProfileV4DTO>;

/* ===== Create/Update Profile Requests ===== */
export const CreateProfileRequest = z.object({
  regionId: z.string(),
  serviceKey: ServiceKey,
  name: z.string(),
  
  // Core pricing - all optional with defaults
  baseFare: z.number().nonnegative().default(0),
  baseIncludedKm: z.number().nonnegative().default(0),
  perKm: z.number().nonnegative().default(0),
  perMinute: z.number().nonnegative().default(0),
  bookingFee: z.number().nonnegative().default(0),
  
  // Surcharges
  airportSurcharge: z.number().nonnegative().default(0),
  poiSurcharge: z.number().nonnegative().default(0),
  tollPassthrough: z.boolean().default(true),
  
  // Descriptions
  description: z.record(z.any()).optional(),
  
  // Earnings
  earningsRouting: EarningsRouting.default("driver"),
  driverCommissionPct: z.number().min(0).max(1).default(0.8),
  fleetCommissionPct: z.number().min(0).max(1).default(0),
});
export type CreateProfileRequest = z.infer<typeof CreateProfileRequest>;

export const UpdateProfileRequest = CreateProfileRequest.partial().extend({
  id: z.number().int(),
});
export type UpdateProfileRequest = z.infer<typeof UpdateProfileRequest>;

/* ===== Pricing Proposals ===== */
export const PricingProposalDTO = z.object({
  id: z.number().int(),
  profileId: z.number().int(),
  proposedBy: z.string(),
  
  title: z.string(),
  description: z.string().nullable(),
  diff: z.record(z.any()), // JSON diff object
  
  complianceResult: z.record(z.any()).nullable(),
  regulatorRequired: z.boolean(),
  regulatorFiled: z.boolean(),
  
  status: ProposalStatus,
  needsApprovals: z.number().int(),
  currentApprovals: z.number().int(),
  
  createdAt: z.string().datetime(),
  approvedBy: z.string().nullable(),
  approvedAt: z.string().datetime().nullable(),
  effectiveAt: z.string().datetime().nullable(),
});
export type PricingProposalDTO = z.infer<typeof PricingProposalDTO>;

export const CreateProposalRequest = z.object({
  profileId: z.number().int(),
  title: z.string(),
  description: z.string().optional(),
  changes: z.record(z.any()), // Object with proposed changes
  effectiveAt: z.string().datetime().optional(),
});
export type CreateProposalRequest = z.infer<typeof CreateProposalRequest>;

export const ProposalActionRequest = z.object({
  action: z.enum(["approve", "reject"]),
  comment: z.string().optional(),
});
export type ProposalActionRequest = z.infer<typeof ProposalActionRequest>;

/* ===== AI/ML Forecasts ===== */
export const PricingForecastDTO = z.object({
  id: z.number().int(),
  profileId: z.number().int(),
  horizonDays: z.enum([30, 60, 90]),
  metricKey: ForecastMetric,
  
  baselineValue: z.number(),
  predictedValue: z.number(),
  confidence: z.number().min(0).max(1),
  
  modelVersion: z.string(),
  inputFeatures: z.record(z.any()).nullable(),
  
  generatedAt: z.string().datetime(),
});
export type PricingForecastDTO = z.infer<typeof PricingForecastDTO>;

export const GenerateForecastRequest = z.object({
  profileId: z.number().int(),
  horizonDays: z.enum([30, 60, 90]),
  metrics: z.array(ForecastMetric).optional(),
});
export type GenerateForecastRequest = z.infer<typeof GenerateForecastRequest>;

/* ===== AI Recommendations ===== */
export const PricingRecommendationDTO = z.object({
  id: z.number().int(),
  profileId: z.number().int(),
  
  recommendationType: RecommendationType,
  message: z.string(),
  details: z.record(z.any()).nullable(),
  
  confidence: z.number().min(0).max(1),
  complianceFlag: z.boolean(),
  regulatorImpact: z.boolean(),
  
  status: RecommendationStatus,
  
  createdAt: z.string().datetime(),
  actionedBy: z.string().nullable(),
  actionedAt: z.string().datetime().nullable(),
});
export type PricingRecommendationDTO = z.infer<typeof PricingRecommendationDTO>;

export const RecommendationActionRequest = z.object({
  action: z.enum(["accept", "reject"]),
  comment: z.string().optional(),
});
export type RecommendationActionRequest = z.infer<typeof RecommendationActionRequest>;

/* ===== Compliance & Validation ===== */
export const ComplianceIssue = z.object({
  code: z.string(),
  message: z.string(),
  severity: z.enum(["info", "warning", "error"]),
  regulatorImpact: z.boolean().default(false),
  context: z.record(z.any()).optional(),
});
export type ComplianceIssue = z.infer<typeof ComplianceIssue>;

export const ComplianceValidationResult = z.object({
  valid: z.boolean(),
  issues: z.array(ComplianceIssue),
  regulatorFilingRequired: z.boolean(),
  estimatedApprovalTime: z.string().nullable(),
});
export type ComplianceValidationResult = z.infer<typeof ComplianceValidationResult>;

/* ===== Regulator Filing ===== */
export const RegulatorFilingDTO = z.object({
  id: z.number().int(),
  profileId: z.number().int(),
  
  regulatorType: RegulatorType,
  filingReference: z.string(),
  filingDate: z.string().datetime(),
  
  filingPackage: z.record(z.any()),
  approvalStatus: z.enum(["submitted", "under_review", "approved", "rejected"]),
  
  regulatorResponse: z.record(z.any()).nullable(),
  approvedAt: z.string().datetime().nullable(),
  expiresAt: z.string().datetime().nullable(),
  
  createdAt: z.string().datetime(),
  createdBy: z.string(),
});
export type RegulatorFilingDTO = z.infer<typeof RegulatorFilingDTO>;

export const CreateFilingRequest = z.object({
  profileId: z.number().int(),
  regulatorType: RegulatorType,
  filingReference: z.string(),
  filingPackage: z.record(z.any()),
});
export type CreateFilingRequest = z.infer<typeof CreateFilingRequest>;

/* ===== Audit Trail ===== */
export const PricingAuditDTO = z.object({
  id: z.number().int(),
  profileId: z.number().int().nullable(),
  proposalId: z.number().int().nullable(),
  
  userId: z.string(),
  action: z.string(),
  entityType: EntityType,
  entityId: z.number().int().nullable(),
  
  oldValue: z.record(z.any()).nullable(),
  newValue: z.record(z.any()).nullable(),
  
  complianceImpact: z.boolean(),
  regulatorNotificationSent: z.boolean(),
  
  createdAt: z.string().datetime(),
});
export type PricingAuditDTO = z.infer<typeof PricingAuditDTO>;

/* ===== Dashboard & Analytics ===== */
export const PricingDashboardDTO = z.object({
  summary: z.object({
    totalProfiles: z.number().int(),
    activeProfiles: z.number().int(),
    pendingProposals: z.number().int(),
    pendingRecommendations: z.number().int(),
    regulatorFilings: z.number().int(),
  }),
  
  aiHealthScores: z.array(z.object({
    serviceKey: ServiceKey,
    regionId: z.string(),
    avgHealthScore: z.number(),
    profileCount: z.number().int(),
  })),
  
  recentActivity: z.array(PricingAuditDTO),
  
  complianceAlerts: z.array(ComplianceIssue),
  
  upcomingExpirations: z.array(z.object({
    profileId: z.number().int(),
    profileName: z.string(),
    expiresAt: z.string().datetime(),
    daysUntilExpiry: z.number().int(),
  })),
});
export type PricingDashboardDTO = z.infer<typeof PricingDashboardDTO>;

/* ===== Preview & ROI Analysis ===== */
export const PricingPreviewRequest = z.object({
  profileId: z.number().int().optional(),
  profileData: CreateProfileRequest.optional(),
  
  // Trip details for preview
  origin: z.object({ lat: z.number(), lon: z.number() }),
  destination: z.object({ lat: z.number(), lon: z.number() }),
  timestamp: z.string().datetime(),
  
  // Preview options
  includeRiderView: z.boolean().default(true),
  includeDriverEarnings: z.boolean().default(true),
  includeROIImpact: z.boolean().default(true),
});
export type PricingPreviewRequest = z.infer<typeof PricingPreviewRequest>;

export const PricingPreviewResponse = z.object({
  // Fare breakdown
  fareBreakdown: z.array(z.object({
    component: z.string(),
    amount: z.number(),
    description: z.string().optional(),
    publishToRider: z.boolean(),
  })),
  
  totalFare: z.number(),
  
  // Earnings split
  driverEarnings: z.number(),
  fleetEarnings: z.number(),
  xpressEarnings: z.number(),
  
  // ROI impact (if available)
  roiImpact: z.object({
    revenueChange: z.number(),
    demandImpact: z.number(),
    elasticityFactor: z.number().nullable(),
  }).nullable(),
  
  // Compliance status
  complianceStatus: z.object({
    valid: z.boolean(),
    warnings: z.array(z.string()),
    regulatorApprovalRequired: z.boolean(),
  }),
});
export type PricingPreviewResponse = z.infer<typeof PricingPreviewResponse>;