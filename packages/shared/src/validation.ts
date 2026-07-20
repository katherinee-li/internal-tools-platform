import type { KycDecision, RefundReason, Transaction } from "./types.js";
import { REFUND_REASONS } from "./types.js";

export interface ValidationResult {
  ok: boolean;
  error?: string;
}

const OK: ValidationResult = { ok: true };
const fail = (error: string): ValidationResult => ({ ok: false, error });

// Refund validation is shared so the client can pre-check and the server can
// enforce the exact same rules. The server result is authoritative.
export function validateRefund(
  txn: Transaction | undefined,
  amountCents: number,
  reason: string,
): ValidationResult {
  if (!txn) return fail("Transaction not found.");
  if (txn.status !== "settled")
    return fail("Only settled transactions can be refunded.");
  if (!Number.isInteger(amountCents) || amountCents <= 0)
    return fail("Refund amount must be a positive number.");
  if (!REFUND_REASONS.includes(reason as RefundReason))
    return fail("A valid refund reason is required.");
  const remaining = txn.amount - txn.refundedAmount;
  if (remaining <= 0) return fail("Transaction is already fully refunded.");
  if (amountCents > remaining)
    return fail(
      `Refund exceeds remaining refundable amount (${(remaining / 100).toFixed(2)} ${txn.currency}).`,
    );
  return OK;
}

export function validateKycDecision(
  decision: string,
  note: string | undefined,
): ValidationResult {
  if (!["approved", "rejected", "escalated"].includes(decision))
    return fail("Invalid decision.");
  // A reviewer note is mandatory for every KYC decision (auditability).
  if (!note || note.trim().length < 3)
    return fail("A reviewer note is required to submit a KYC decision.");
  return OK;
}

export function isKycDecision(v: string): v is KycDecision {
  return ["approved", "rejected", "escalated"].includes(v);
}

export function validateRolloutPercentage(pct: number): ValidationResult {
  if (!Number.isInteger(pct) || pct < 0 || pct > 100)
    return fail("Rollout percentage must be an integer between 0 and 100.");
  return OK;
}
