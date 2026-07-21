// Shared domain + platform types. This file is the contract consumed by BOTH
// the server (enforcement) and the web app (rendering + optimistic checks).

export type Role = "viewer" | "operator" | "admin";

export const ROLES: Role[] = ["viewer", "operator", "admin"];

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
}

// ---- Permissions ---------------------------------------------------------

export type Permission =
  | "kyc.read"
  | "kyc.decide"
  | "refund.read"
  | "refund.issue"
  | "flag.read"
  | "flag.write"
  | "flag.write.production"
  | "metrics.read"
  | "audit.read";

// ---- KYC -----------------------------------------------------------------

export type KycStatus = "pending" | "approved" | "rejected" | "escalated";
export type KycRisk = "low" | "medium" | "high";

export interface KycCase {
  id: string;
  customerName: string;
  email: string;
  country: string;
  documentType: string;
  submittedAt: string;
  status: KycStatus;
  risk: KycRisk;
  reviewerNote?: string;
  decidedBy?: string;
  decidedAt?: string;
}

export type KycDecision = "approved" | "rejected" | "escalated";

// ---- Refunds -------------------------------------------------------------

export type RefundReason =
  | "duplicate_charge"
  | "fraud"
  | "customer_request"
  | "product_issue"
  | "other";

export const REFUND_REASONS: RefundReason[] = [
  "duplicate_charge",
  "fraud",
  "customer_request",
  "product_issue",
  "other",
];

export interface Transaction {
  id: string;
  customerName: string;
  email: string;
  amount: number; // cents
  currency: string;
  createdAt: string;
  status: "settled" | "pending" | "failed";
  refundedAmount: number; // cents, cumulative
}

export interface Refund {
  id: string;
  transactionId: string;
  amount: number; // cents
  reason: RefundReason;
  note?: string;
  issuedBy: string;
  issuedAt: string;
}

// ---- Feature flags -------------------------------------------------------

export type Environment = "development" | "staging" | "production";

export const ENVIRONMENTS: Environment[] = [
  "development",
  "staging",
  "production",
];

export interface FeatureFlag {
  key: string;
  description: string;
  environment: Environment;
  enabled: boolean;
  rolloutPercentage: number; // 0-100
  updatedBy?: string;
  updatedAt?: string;
}

// ---- Analytics dashboard (non-CRUD tool: charts + aggregation) -----------
// This surface deliberately does NOT fit the table-list-form ToolDefinition
// engine; it exercises a separate chart/aggregation primitive.

export interface MetricPoint {
  label: string;
  value: number;
  secondary?: number;
}

export interface DashboardKpi {
  key: string;
  label: string;
  value: string;
}

export interface DashboardData {
  kpis: DashboardKpi[];
  refundsByDay: MetricPoint[]; // label=date, value=amount(cents), secondary=count
  kycFunnel: MetricPoint[]; // label=status, value=count
  refundReasons: MetricPoint[]; // label=reason, value=count
}

// ---- Audit ---------------------------------------------------------------

export interface AuditEvent {
  id: string;
  timestamp: string;
  actorId: string;
  actorRole: Role;
  action: string; // e.g. "refund.issue", "flag.write"
  resource: string; // e.g. "transaction:txn_123"
  outcome: "success" | "denied" | "error";
  detail?: string; // human-readable summary / before->after
}

// ---- API envelope --------------------------------------------------------

export interface ApiError {
  error: string;
  code:
    | "forbidden"
    | "validation"
    | "not_found"
    | "conflict"
    | "bad_request"
    | "internal";
}
