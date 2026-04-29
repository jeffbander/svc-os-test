import { AuthState } from "@/convex/priorAuthTypes";

export type PillTone =
  | "neutral"
  | "ghost"
  | "pending"
  | "pending-italic"
  | "approved"
  | "denied"
  | "strikethrough";

export const STATE_PILL_TONE: Record<AuthState, PillTone> = {
  not_required: "neutral",
  needed: "ghost",
  submitted: "pending",
  more_info_required: "pending-italic",
  peer_to_peer_required: "pending-italic",
  appealed: "pending-italic",
  approved: "approved",
  denied: "denied",
  expired: "denied",
  withdrawn: "strikethrough",
  cancelled: "strikethrough",
};

export const STATE_LABEL: Record<AuthState, string> = {
  not_required: "not required",
  needed: "needed",
  submitted: "submitted",
  more_info_required: "more info required",
  peer_to_peer_required: "peer-to-peer required",
  appealed: "appealed",
  approved: "approved",
  denied: "denied",
  expired: "expired",
  withdrawn: "withdrawn",
  cancelled: "cancelled",
};

export const STATE_COLUMN_ORDER: AuthState[] = [
  "needed",
  "submitted",
  "more_info_required",
  "peer_to_peer_required",
  "appealed",
  "approved",
  "denied",
  "expired",
  "not_required",
  "withdrawn",
  "cancelled",
];
