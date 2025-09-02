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

/* =========================
 * Profiles (DTOs & Requests)
 * ========================= */

export const PricingProfileDTO = z.object({
  id: z.number().int(),
  serviceKey: ServiceKey,
  name: z.string().min(1).max(128),
  status: ProfileStatus,
  regulatorStatus: RegulatorStatus.nullable().default("draft"),
  regulatorRef: z.string().max(64).nullable(),
  regulatorFiledAt: z.string().datetime().nullable(),
  regulatorApprovedAt: z.string().datetime().nullable(),

  baseFare: z.number().nonnegative().nullable(),
  baseIncludedKm: z.number().nonnegative().nullable(),
  perKm: z.number().nonnegative().nullable(),
  perMinute: z.number().nonnegative().nullable(),
  bookingFee: z.number().nonnegative().nullable(),

  description: z.array(PublishableText).nullable(), // rider-facing blocks
  earningsRouting: EarningsRouting.nullable(),

  aiHealthScore: z.number().min(0).max(100).nullable(),
  aiLastForecast: z.record(z.any()).nullable(),
  aiLastRecommendations: z.record(z.any()).nullable(),

  createdAt: z.string().datetime(),
  createdBy: z.string().uuid().nullable(),
  updatedAt: z.string().datetime(),
  updatedBy: z.string().uuid().nullable(),
});
export type PricingProfileDTO = z.infer<typeof PricingProfileDTO>;

export const CreatePricingProfileRequest = z.object({
  serviceKey: ServiceKey,
  name: z.string().min(1).max(128),
  baseFare: z.number().nonnegative().optional(),
  baseIncludedKm: z.number().nonnegative().optional(),
  perKm: z.number().nonnegative().optional(),
  perMinute: z.number().nonnegative().optional(),
  bookingFee: z.number().nonnegative().optional(),
  description: z.array(PublishableText).optional(),
  earningsRouting: EarningsRouting.optional(),
});
export type CreatePricingProfileRequest = z.infer<typeof CreatePricingProfileRequest>;

export const UpdatePricingProfileRequest = z.object({
  name: z.string().min(1).max(128).optional(),
  baseFare: z.number().nonnegative().nullable().optional(),
  baseIncludedKm: z.number().nonnegative().nullable().optional(),
  perKm: z.number().nonnegative().nullable().optional(),
  perMinute: z.number().nonnegative().nullable().optional(),
  bookingFee: z.number().nonnegative().nullable().optional(),
  description: z.array(PublishableText).nullable().optional(),
  earningsRouting: EarningsRouting.nullish(),
});
export type UpdatePricingProfileRequest = z.infer<typeof UpdatePricingProfileRequest>;

/* File (LTFRB/TWG) & Activate */

export const FileWithRegulatorRequest = z.object({
  regulatorRef: z.string().min(1).max(64),
  filedAt: z.string().datetime(),
});
export type FileWithRegulatorRequest = z.infer<typeof FileWithRegulatorRequest>;

export const ActivatePricingProfileRequest = z.object({
  effectiveAt: z.string().datetime(),
  comment: z.string().max(1000).optional(),
});
export type ActivatePricingProfileRequest = z.infer<typeof ActivatePricingProfileRequest>;

export const ActivatePricingProfileResponse = z.object({
  requestId: z.number().int(),
  status: z.enum(["pending", "approved", "rejected", "cancelled"]),
  needsApprovals: z.number().int().default(2),
  emergencyBlocked: z.boolean().default(false),
});
export type ActivatePricingProfileResponse = z.infer<typeof ActivatePricingProfileResponse>;

/* =========================
 * Proposals (Grab-style)
 * ========================= */

export const PricingProposalDTO = z.object({
  id: z.number().int(),
  profileId: z.number().int(),
  proposedBy: z.string().uuid(),
  proposedAt: z.string().datetime(),
  diff: z.record(z.any()),                  // exact payload changes
  complianceResult: z.record(z.any()).nullable(),
  status: z.enum(["pending", "approved", "rejected", "cancelled"]),
  regulatorRequired: z.boolean().default(false),
  regulatorFiled: z.boolean().default(false),
  approvedBy: z.string().uuid().nullable(),
  approvedAt: z.string().datetime().nullable(),
});
export type PricingProposalDTO = z.infer<typeof PricingProposalDTO>;

export const CreatePricingProposalRequest = z.object({
  diff: z.record(z.any()), // same shape as UpdatePricingProfileRequest but partials
  comment: z.string().max(1000).optional(),
});
export type CreatePricingProposalRequest = z.infer<typeof CreatePricingProposalRequest>;

export const ActionPricingProposalRequest = z.object({
  decision: z.enum(["approved", "rejected"]),
  comment: z.string().max(1000).optional(),
});
export type ActionPricingProposalRequest = z.infer<typeof ActionPricingProposalRequest>;

export const ActionPricingProposalResponse = z.object({
  proposalId: z.number().int(),
  newStatus: z.enum(["approved", "rejected"]),
  actedBy: z.string().uuid(),
  actedAt: z.string().datetime(),
});
export type ActionPricingProposalResponse = z.infer<typeof ActionPricingProposalResponse>;

/* =========================
 * AI Forecasts & Recommendations
 * ========================= */

export const PricingForecastDTO = z.object({
  id: z.number().int(),
  profileId: z.number().int(),
  horizonDays: z.number().int().positive(),   // 30, 60, 90
  metricKey: MetricKey,                        // trips, revenue, roi
  predictedValue: z.number(),
  confidence: z.number().min(0).max(1).nullable(),
  generatedAt: z.string().datetime(),
});
export type PricingForecastDTO = z.infer<typeof PricingForecastDTO>;

export const GeneratePricingForecastRequest = z.object({
  horizonDays: z.number().int().positive().default(30),
  metrics: z.array(MetricKey).default(["trips", "revenue", "roi"]),
});
export type GeneratePricingForecastRequest = z.infer<typeof GeneratePricingForecastRequest>;

export const PricingRecommendationDTO = z.object({
  id: z.number().int(),
  profileId: z.number().int(),
  recommendationType: z.enum(["base_fare", "per_km", "per_minute", "booking_fee", "surcharge"]),
  message: z.string(),
  details: z.record(z.any()).nullable(),      // structured payload for diffs/impacts
  confidence: z.number().min(0).max(1).nullable(),
  complianceFlag: z.boolean().default(false), // true if re-filing needed or near a cap
  status: RecommendationStatus,
  createdAt: z.string().datetime(),
  actionedBy: z.string().uuid().nullable(),
});
export type PricingRecommendationDTO = z.infer<typeof PricingRecommendationDTO>;

export const ActionPricingRecommendationRequest = z.object({
  decision: z.enum(["accepted", "rejected"]),
  justification: z.string().max(1000).optional(),
});
export type ActionPricingRecommendationRequest = z.infer<typeof ActionPricingRecommendationRequest>;

export const ActionPricingRecommendationResponse = z.object({
  recommendationId: z.number().int(),
  newStatus: RecommendationStatus,
  actionedBy: z.string().uuid(),
  actionedAt: z.string().datetime(),
});
export type ActionPricingRecommendationResponse = z.infer<typeof ActionPricingRecommendationResponse>;

/* =========================
 * Compliance / Validation / Reporting
 * ========================= */

export const ComplianceIssue = z.object({
  code: z.string(), // e.g., 'MAX_SURGE_EXCEEDED', 'BOOKING_FEE_OVER_CAP'
  message: z.string(),
  severity: z.enum(["warning", "error"]).default("error"),
  context: z.record(z.any()).optional(),
});
export type ComplianceIssue = z.infer<typeof ComplianceIssue>;

export const ComplianceValidationResponse = z.object({
  ok: z.boolean(),
  warnings: z.array(ComplianceIssue).default([]),
  errors: z.array(ComplianceIssue).default([]),
});
export type ComplianceValidationResponse = z.infer<typeof ComplianceValidationResponse>;

export const RegulatorPackDTO = z.object({
  profileId: z.number().int(),
  generatedAt: z.string().datetime(),
  regulatorStatus: RegulatorStatus,
  regulatorRef: z.string().nullable(),
  artifacts: z.array(
    z.object({
      filename: z.string(),
      url: z.string(), // internal file link / signed URL
      type: z.enum(["fare_table_csv", "fare_table_pdf", "audit_json", "approval_chain_pdf"]),
    })
  ),
});
export type RegulatorPackDTO = z.infer<typeof RegulatorPackDTO>;

/* =========================
 * Preview (Rider/Driver/ROI)
 * ========================= */

export const LatLon = z.object({ lat: z.number(), lon: z.number() });

export const PricingPreviewRequest = z.object({
  riderView: z.enum(["summary_only", "detailed_breakdown"]),
  perspective: z.enum(["rider", "driver"]),
  origin: LatLon,
  destination: LatLon,
  timestamp: z.string().datetime(),
  regionId: z.number().int(),
  serviceKey: ServiceKey,
});
export type PricingPreviewRequest = z.infer<typeof PricingPreviewRequest>;

export const FareLine = z.object({
  label: z.string(),
  amount: z.number(),
  meta: z.string().optional(),
  publish: z.boolean().default(true),
  ruleId: z.number().int().optional(), // surge/surcharge/poi rule id
});
export type FareLine = z.infer<typeof FareLine>;

export const PricingPreviewResponse = z.object({
  breakdown: z.array(FareLine),
  total: z.number(),
  driverEarnings: z.number(),
  companyTake: z.number(),
  notes: z.array(z.string()).default([]),
  // ROI deltas based on proposed diffs (if any)
  roiDeltaPct: z.number().optional(),
});
export type PricingPreviewResponse = z.infer<typeof PricingPreviewResponse>;

/* =========================
 * Audit
 * ========================= */

export const PricingAuditEntry = z.object({
  id: z.number().int(),
  profileId: z.number().int(),
  userId: z.string().uuid(),
  action: PricingAction,
  oldValue: z.record(z.any()).nullable(),
  newValue: z.record(z.any()).nullable(),
  createdAt: z.string().datetime(),
});
export type PricingAuditEntry = z.infer<typeof PricingAuditEntry>;

export const GetPricingAuditResponse = z.array(PricingAuditEntry);

/* =========================
 * Surge (reference only – unchanged)
 * =========================
 * NOTE: surge endpoints & schemas were defined earlier and remain intact.
 * Here we only provide minimal types to help cross-link preview outputs.
 */

export const SurgeLookupResponse = z.object({
  multiplier: z.number(),        // Taxi should always be 1.0 per prior spec
  additiveFee: z.number(),
  source: z.enum(["ml", "manual", "scheduled", "shadow"]),
  h3Res: z.number().int(),
  ruleId: z.number().int().optional(),
});
export type SurgeLookupResponse = z.infer<typeof SurgeLookupResponse>;