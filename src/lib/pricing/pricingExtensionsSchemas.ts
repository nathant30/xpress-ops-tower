import { z } from "zod";

/* ---------- Shared Enums / Types ---------- */

export const Severity = z.enum(["warning", "error"]);
export type Severity = z.infer<typeof Severity>;

export const Decision = z.enum(["approved", "rejected"]);
export type Decision = z.infer<typeof Decision>;

export const ActivationStatus = z.enum(["pending", "approved", "rejected", "cancelled"]);
export type ActivationStatus = z.infer<typeof ActivationStatus>;

export const ServiceKey = z.enum(["tnvs", "taxi", "special", "pop"]);
export type ServiceKey = z.infer<typeof ServiceKey>;

export const FeatureFlagKey = z.enum(["micro_zones", "predictive_surge", "personalization", "experiments"]);
export type FeatureFlagKey = z.infer<typeof FeatureFlagKey>;

/* ---------- Compliance Validator ---------- */

export const ValidateProfileRequest = z.object({
  simulateAt: z.string().datetime().optional(),
});
export type ValidateProfileRequest = z.infer<typeof ValidateProfileRequest>;

export const ComplianceIssue = z.object({
  code: z.string(),            // e.g., 'MAX_SURGE_EXCEEDED'
  message: z.string(),
  severity: Severity.default("error"),
  context: z.record(z.any()).optional(), // { value: 2.5, cap: 2.0 }
});
export type ComplianceIssue = z.infer<typeof ComplianceIssue>;

export const ValidateProfileResponse = z.object({
  ok: z.boolean(),
  warnings: z.array(ComplianceIssue).default([]),
  errors: z.array(ComplianceIssue).default([]),
});
export type ValidateProfileResponse = z.infer<typeof ValidateProfileResponse>;

/* ---------- Activation Requests & Approvals ---------- */

export const ActivateProfileRequest = z.object({
  effectiveAt: z.string().datetime(),
  supersedeProfileId: z.number().int().optional(),
  comment: z.string().max(1000).optional(),
});
export type ActivateProfileRequest = z.infer<typeof ActivateProfileRequest>;

export const ActivateProfileResponse = z.object({
  requestId: z.number().int(),
  status: ActivationStatus,           // 'pending' on creation
  needsApprovals: z.number().int().default(2),
  emergencyBlocked: z.boolean().default(false),
});
export type ActivateProfileResponse = z.infer<typeof ActivateProfileResponse>;

export const ActivationRequestDTO = z.object({
  id: z.number().int(),
  profileId: z.number().int(),
  requestedBy: z.string(),            // user id (uuid)
  requestedAt: z.string().datetime(),
  diff: z.record(z.any()),            // old->new payload
  status: ActivationStatus,
  emergencyBlocked: z.boolean(),
});
export type ActivationRequestDTO = z.infer<typeof ActivationRequestDTO>;

export const ApproveActivationRequest = z.object({
  decision: Decision,                 // 'approved' | 'rejected'
  comment: z.string().max(1000).optional(),
});
export type ApproveActivationRequest = z.infer<typeof ApproveActivationRequest>;

export const ApprovalDTO = z.object({
  id: z.number().int(),
  requestId: z.number().int(),
  approverId: z.string(),             // uuid
  approvedAt: z.string().datetime(),
  decision: Decision,
});
export type ApprovalDTO = z.infer<typeof ApprovalDTO>;

/* ---------- Audit Log ---------- */

export const AuditAction = z.enum([
  "update_component",
  "update_description",
  "publish_toggle",
  "transparency_change",
  "earnings_change",
  "link_change",
  "profile_status_change",
]);
export type AuditAction = z.infer<typeof AuditAction>;

export const AuditLogEntry = z.object({
  id: z.number().int(),
  profileId: z.number().int(),
  userId: z.string(),                 // uuid
  action: AuditAction,
  oldValue: z.record(z.any()).nullable(),
  newValue: z.record(z.any()).nullable(),
  createdAt: z.string().datetime(),
});
export type AuditLogEntry = z.infer<typeof AuditLogEntry>;

export const GetAuditLogResponse = z.array(AuditLogEntry);

/* ---------- Emergency Brake ---------- */

export const SetEmergencyFlagRequest = z.object({
  active: z.boolean(),
  reason: z.string().max(2000).optional(),
});
export type SetEmergencyFlagRequest = z.infer<typeof SetEmergencyFlagRequest>;

export const EmergencyFlagDTO = z.object({
  id: z.number().int(),
  active: z.boolean(),
  reason: z.string().nullable(),
  setBy: z.string().nullable(),        // uuid
  setAt: z.string().datetime().nullable(),
});
export type EmergencyFlagDTO = z.infer<typeof EmergencyFlagDTO>;

/* ---------- Feature Flags (per region/service) ---------- */

export const FeatureFlagDTO = z.object({
  id: z.number().int(),
  regionId: z.number().int(),
  serviceKey: ServiceKey,
  flag: FeatureFlagKey,
  enabled: z.boolean(),
});
export type FeatureFlagDTO = z.infer<typeof FeatureFlagDTO>;

export const UpsertFeatureFlagsRequest = z.object({
  items: z.array(
    z.object({
      regionId: z.number().int(),
      serviceKey: ServiceKey,
      flag: FeatureFlagKey,
      enabled: z.boolean(),
    })
  ).min(1),
});
export type UpsertFeatureFlagsRequest = z.infer<typeof UpsertFeatureFlagsRequest>;

/* ---------- Preview (enhanced) ---------- */

export const LatLon = z.object({ lat: z.number(), lon: z.number() });
export type LatLon = z.infer<typeof LatLon>;

export const PreviewRequest = z.object({
  riderView: z.enum(["summary_only", "detailed_breakdown"]),
  perspective: z.enum(["rider", "driver"]),
  origin: LatLon,
  destination: LatLon,
  timestamp: z.string().datetime(),
});
export type PreviewRequest = z.infer<typeof PreviewRequest>;

export const FareLine = z.object({
  label: z.string(),
  amount: z.number(),
  meta: z.string().optional(),
  publish: z.boolean().default(true),
  ruleId: z.number().int().optional(), // zone-pair / poi override / rule id
});
export type FareLine = z.infer<typeof FareLine>;

export const PreviewResponse = z.object({
  breakdown: z.array(FareLine),
  total: z.number(),
  driverEarnings: z.number(),
  companyTake: z.number(),
  notes: z.array(z.string()).default([]),
});
export type PreviewResponse = z.infer<typeof PreviewResponse>;

/* ---------- Integrity Checks (nightly job report) ---------- */

export const IntegrityIssue = z.object({
  code: z.string(),                   // 'ORPHANED_LINK', 'MISSING_EARNINGS_POLICY', 'EXPIRED_PERMIT'
  message: z.string(),
  severity: Severity,
  entity: z.string(),                 // e.g., 'pricing_profile_links', 'pricing_components'
  entityId: z.union([z.string(), z.number()]).optional(),
  context: z.record(z.any()).optional(),
});
export type IntegrityIssue = z.infer<typeof IntegrityIssue>;

export const IntegrityReport = z.object({
  generatedAt: z.string().datetime(),
  issues: z.array(IntegrityIssue),
});
export type IntegrityReport = z.infer<typeof IntegrityReport>;