import { z } from "zod";

/* Enums */
export const ServiceKey = z.enum(["tnvs","special","pop","taxi"]);
export type ServiceKey = z.infer<typeof ServiceKey>;

export const SurgeSource = z.enum(["ml","manual","scheduled","shadow"]);
export type SurgeSource = z.infer<typeof SurgeSource>;

export const ProfileStatus = z.enum(["draft","active","retired","shadow"]);
export type ProfileStatus = z.infer<typeof ProfileStatus>;

/* Profiles */
export const SurgeProfileDTO = z.object({
  id: z.number().int(),
  regionId: z.string(),
  serviceKey: ServiceKey,
  name: z.string(),
  status: ProfileStatus,
  modelVersion: z.string(),
  maxMultiplier: z.number().positive(),
  additiveEnabled: z.boolean(),
  smoothingHalfLifeSec: z.number().int().positive(),
  updateIntervalSec: z.number().int().positive(),
  notes: z.string().nullable(),
  createdAt: z.string().datetime(),
  createdBy: z.string().nullable(),
  updatedAt: z.string().datetime(),
  updatedBy: z.string().nullable(),
});
export type SurgeProfileDTO = z.infer<typeof SurgeProfileDTO>;

export const UpsertSurgeProfileRequest = z.object({
  regionId: z.string(),
  serviceKey: ServiceKey,
  name: z.string(),
  maxMultiplier: z.number().positive().default(2.0),
  additiveEnabled: z.boolean().default(false),
  smoothingHalfLifeSec: z.number().int().positive().default(600),
  updateIntervalSec: z.number().int().positive().default(300),
  notes: z.string().optional(),
});
export type UpsertSurgeProfileRequest = z.infer<typeof UpsertSurgeProfileRequest>;

/* Validation */
export const SurgeComplianceIssue = z.object({
  code: z.string(), 
  message: z.string(),
  severity: z.enum(["warning","error"]).default("error"),
  context: z.record(z.any()).optional()
});
export type SurgeComplianceIssue = z.infer<typeof SurgeComplianceIssue>;

export const ValidateSurgeResponse = z.object({
  ok: z.boolean(),
  warnings: z.array(SurgeComplianceIssue).default([]),
  errors: z.array(SurgeComplianceIssue).default([]),
});
export type ValidateSurgeResponse = z.infer<typeof ValidateSurgeResponse>;

/* Activation */
export const ActivateSurgeRequest = z.object({
  profileId: z.number().int(),
  effectiveAt: z.string().datetime(),
  comment: z.string().optional(),
});
export type ActivateSurgeRequest = z.infer<typeof ActivateSurgeRequest>;

export const ActivateSurgeResponse = z.object({
  requestId: z.number().int(),
  status: z.enum(["pending","approved","rejected","cancelled"]),
  needsApprovals: z.number().int().default(2),
  emergencyBlocked: z.boolean().default(false),
});
export type ActivateSurgeResponse = z.infer<typeof ActivateSurgeResponse>;

/* State / Heatmap */
export const SurgeHexStateDTO = z.object({
  serviceKey: ServiceKey,
  h3Index: z.string(),
  h3Res: z.number().int(),
  multiplier: z.number(),
  additiveFee: z.number().default(0),
  source: SurgeSource,
  profileId: z.number().int().nullable(),
  validFrom: z.string().datetime(),
  validUntil: z.string().datetime().nullable(),
  computedAt: z.string().datetime(),
});
export type SurgeHexStateDTO = z.infer<typeof SurgeHexStateDTO>;

/* Override & Schedule */
export const CreateOverrideRequest = z.object({
  regionId: z.string(),
  serviceKey: ServiceKey,
  reason: z.string(),
  multiplier: z.number().min(1.0),
  additiveFee: z.number().min(0).default(0),
  h3Set: z.array(z.string()).min(1),
  endsAt: z.string().datetime(),
});
export type CreateOverrideRequest = z.infer<typeof CreateOverrideRequest>;

export const CreateScheduleRequest = z.object({
  regionId: z.string(),
  serviceKey: ServiceKey,
  name: z.string(),
  multiplier: z.number().min(1.0),
  additiveFee: z.number().min(0).default(0),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  h3Set: z.array(z.string()).optional(), // null => region-wide (non-taxi)
});
export type CreateScheduleRequest = z.infer<typeof CreateScheduleRequest>;

/* Signals & Adaptive meta */
export const SurgeSignalDTO = z.object({
  regionId: z.string(),
  h3Index: z.string(),
  tsMinute: z.string().datetime(),
  reqCount: z.number().int(),
  searchers: z.number().int(),
  activeDrivers: z.number().int(),
  avgEtaSec: z.number().int().nullable(),
  cancels: z.number().int(),
  weatherScore: z.number().nullable(),
  trafficScore: z.number().nullable(),
  eventScore: z.number().nullable(),
});
export type SurgeSignalDTO = z.infer<typeof SurgeSignalDTO>;

export const SurgeHexMetaDTO = z.object({
  regionId: z.string(),
  h3Index: z.string(),
  trips30d: z.number().int(),
  recommendedRes: z.number().int(),
  updatedAt: z.string().datetime(),
});
export type SurgeHexMetaDTO = z.infer<typeof SurgeHexMetaDTO>;

/* Quote-time lookup */
export const SurgeLookupRequest = z.object({
  serviceKey: ServiceKey,
  originH3: z.string(),
  timestamp: z.string().datetime(),
});
export type SurgeLookupRequest = z.infer<typeof SurgeLookupRequest>;

export const SurgeLookupResponse = z.object({
  multiplier: z.number(),
  additiveFee: z.number(),
  source: SurgeSource,
  h3Res: z.number().int(),
  ruleId: z.number().int().optional(),
});
export type SurgeLookupResponse = z.infer<typeof SurgeLookupResponse>;