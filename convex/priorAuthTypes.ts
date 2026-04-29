import { v } from "convex/values";

export const authStateValidator = v.union(
  v.literal("not_required"),
  v.literal("needed"),
  v.literal("submitted"),
  v.literal("more_info_required"),
  v.literal("peer_to_peer_required"),
  v.literal("appealed"),
  v.literal("approved"),
  v.literal("denied"),
  v.literal("expired"),
  v.literal("withdrawn"),
  v.literal("cancelled"),
);

export const vendorSystemValidator = v.union(
  v.literal("heartflow"),
  v.literal("cleerly"),
);

export const payerTypeValidator = v.union(
  v.literal("commercial"),
  v.literal("medicare"),
  v.literal("medicaid"),
  v.literal("medicare_advantage"),
);

export const planTypeValidator = v.union(
  v.literal("HMO"),
  v.literal("PPO"),
  v.literal("EPO"),
  v.literal("POS"),
  v.literal("Medicare Advantage"),
  v.literal("Medicaid Managed Care"),
);

export const corpusSourceTypeValidator = v.union(
  v.literal("payer_policy"),
  v.literal("lcd"),
  v.literal("aua_guideline"),
  v.literal("acc_aha_guideline"),
  v.literal("plan_doc"),
);

export const orgRoleValidator = v.union(
  v.literal("coordinator"),
  v.literal("cardiologist"),
  v.literal("admin"),
);

export const cptCodeValidator = v.union(
  v.literal("75577"),
  v.literal("75580"),
);

export type AuthState =
  | "not_required"
  | "needed"
  | "submitted"
  | "more_info_required"
  | "peer_to_peer_required"
  | "appealed"
  | "approved"
  | "denied"
  | "expired"
  | "withdrawn"
  | "cancelled";

export type CptCode = "75577" | "75580";

export const ALL_AUTH_STATES: AuthState[] = [
  "not_required",
  "needed",
  "submitted",
  "more_info_required",
  "peer_to_peer_required",
  "appealed",
  "approved",
  "denied",
  "expired",
  "withdrawn",
  "cancelled",
];

export const HEARTFLOW_CPT_CODES: CptCode[] = ["75577", "75580"];

export const CPT_DESCRIPTIONS: Record<CptCode, string> = {
  "75577": "CT angiography heart with FFR-CT (HeartFlow FFR-CT)",
  "75580": "CT angiography heart with plaque analysis (HeartFlow Plaque)",
};
