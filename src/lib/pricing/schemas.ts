// pricingSchemas.ts
import { z } from "zod";

/** ===== Commons / Enums ===== */
export const TransparencyMode = z.enum(["summary_only", "detailed_breakdown"]);
export type TransparencyMode = z.infer<typeof TransparencyMode>;

export const PricingRole = z.enum([
  "pricing_viewer",
  "pricing_editor",
  "pricing_strategist",
  "pricing_admin",
]);
export type PricingRole = z.infer<typeof PricingRole>;

export const ServiceKey = z.enum(["tnvs", "taxi", "special", "pop"]);
export type ServiceKey = z.infer<typeof ServiceKey>;

export const VehicleType = z.enum(["4_seat", "6_seat"]);
export type VehicleType = z.infer<typeof VehicleType>;

export const LinkType = z.enum(["surge", "surcharge", "toll", "special", "pop"]);
export type LinkType = z.infer<typeof LinkType>;

export const ProfileStatus = z.enum(["draft", "active", "retired", "shadow"]);
export type ProfileStatus = z.infer<typeof ProfileStatus>;

/** ===== Pricing Profile DTO ===== */
export const PricingProfileDTO = z.object({
  id: z.number().int(),
  region_id: z.string(),
  service_key: ServiceKey,
  vehicle_type: VehicleType.nullish(), // null for Taxi/Special/POP if not applicable
  name: z.string(),
  status: ProfileStatus,
  transparency_mode: TransparencyMode,
  booking_fee: z.number().nonnegative().default(69),
  effective_at: z.string().nullish(),
  notes: z.string().nullish(),
});
export type PricingProfileDTO = z.infer<typeof PricingProfileDTO>;

/** ===== Components (presentation) ===== */
export const ComponentKey = z.enum([
  "base_fare",
  "included_km",
  "per_km",
  "per_min",
  "booking_fee",
  "flagdown",
  "flat_fare",
  "airport_surcharge",
  // extensible (e.g., "congestion_fee","min_fare")
]);
export type ComponentKey = z.infer<typeof ComponentKey>;

export const PricingComponentDTO = z.object({
  key: ComponentKey,
  value_numeric: z.number().nullable(), // some keys may be descriptive only
  unit: z.string().nullable(),  // 'PHP','KM','PHP_PER_KM','PHP_PER_MIN'
  description: z.string().nullable(), // markdown ok
  publish: z.boolean(),
  sort_order: z.number().int().default(0),
});
export type PricingComponentDTO = z.infer<typeof PricingComponentDTO>;

export const UpsertComponentsRequest = z.object({
  upserts: z.array(PricingComponentDTO).min(1),
  deletes: z.array(ComponentKey).optional(),
});
export type UpsertComponentsRequest = z.infer<typeof UpsertComponentsRequest>;

/** ===== Linked profiles ===== */
export const LinkedProfilesDTO = z.object({
  surge: z.array(z.number().int()).default([]),
  surcharges: z.array(z.number().int()).default([]),
  tolls: z.array(z.number().int()).default([]),
  special: z.array(z.number().int()).default([]),
  pop: z.array(z.number().int()).default([]),
});
export type LinkedProfilesDTO = z.infer<typeof LinkedProfilesDTO>;

/** ===== Earnings policy ===== */
export const DriverCompModel = z.enum(["commission","salaried","lease","hybrid"]);
export type DriverCompModel = z.infer<typeof DriverCompModel>;

export const FareRecipient = z.enum(["driver","xpress","partner_fleet"]);
export type FareRecipient = z.infer<typeof FareRecipient>;

export const EarningsPolicyDTO = z.object({
  driver_comp_model: DriverCompModel,
  fare_recipient: FareRecipient,
  revenue_split: z.record(z.any()).default({}),
});
export type EarningsPolicyDTO = z.infer<typeof EarningsPolicyDTO>;

/** ===== Access / Permissions ===== */
export const PricingAccessDTO = z.object({
  role: PricingRole,
  canSeeSecretSauce: z.boolean(),
});
export type PricingAccessDTO = z.infer<typeof PricingAccessDTO>;

/** ===== Profile GET payload ===== */
export const GetProfileResponse = z.object({
  profile: PricingProfileDTO,
  components: z.array(PricingComponentDTO),
  linkedProfiles: LinkedProfilesDTO,
  earningsPolicy: EarningsPolicyDTO.nullish(),
  permissions: PricingAccessDTO,
});
export type GetProfileResponse = z.infer<typeof GetProfileResponse>;

/** ===== Patch profile (transparency/status/notes) ===== */
export const PatchProfileRequest = z.object({
  transparency_mode: TransparencyMode.optional(),
  status: ProfileStatus.optional(),
  notes: z.string().optional(),
  effective_at: z.string().optional(),
});
export type PatchProfileRequest = z.infer<typeof PatchProfileRequest>;

/** ===== Set earnings policy ===== */
export const SetEarningsPolicyRequest = EarningsPolicyDTO;
export type SetEarningsPolicyRequest = z.infer<typeof SetEarningsPolicyRequest>;

/** ===== Preview ===== */
export const LatLon = z.object({ lat: z.number(), lon: z.number() });

export const PreviewRequest = z.object({
  riderView: TransparencyMode,       // summary_only | detailed_breakdown
  perspective: z.enum(["rider","driver"]),
  origin: LatLon,
  destination: LatLon,
  timestamp: z.string(),
});
export type PreviewRequest = z.infer<typeof PreviewRequest>;

export const FareLine = z.object({
  label: z.string(),
  amount: z.number(),
  meta: z.string().optional(),
  publish: z.boolean().default(true),
  ruleId: z.number().int().optional(),
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

/** ===== Compliance result (caps checks) ===== */
export const ComplianceIssue = z.object({
  code: z.string(),              // e.g., 'MAX_SURGE_EXCEEDED'
  message: z.string(),
  severity: z.enum(["warning","error"]).default("error"),
  context: z.record(z.any()).optional(),
});
export type ComplianceIssue = z.infer<typeof ComplianceIssue>;

export const ValidateProfileResponse = z.object({
  ok: z.boolean(),
  warnings: z.array(ComplianceIssue).default([]),
  errors: z.array(ComplianceIssue).default([]),
});
export type ValidateProfileResponse = z.infer<typeof ValidateProfileResponse>;

/** ===== Activation request (needs approvals) ===== */
export const ActivateProfileRequest = z.object({
  effective_at: z.string(),
  supersede_profile_id: z.number().int().optional(),
  comment: z.string().optional(),
});
export type ActivateProfileRequest = z.infer<typeof ActivateProfileRequest>;