import { Router } from "express";
import { nanoid } from "nanoid";
import type { Refund, Transaction } from "@platform/shared";
import { validateRefund } from "@platform/shared";
import { getDb } from "../db.js";
import { recordAudit } from "../audit.js";
import { requirePermission } from "../auth.js";

export const refundsRouter = Router();

refundsRouter.get("/transactions", requirePermission("refund.read", () => "txn:list"), (req, res) => {
  const { q, status } = req.query as Record<string, string | undefined>;
  let sql = "SELECT * FROM transactions WHERE 1=1";
  const params: unknown[] = [];
  if (q) {
    sql += " AND (customerName LIKE ? OR email LIKE ? OR id LIKE ?)";
    params.push(`%${q}%`, `%${q}%`, `%${q}%`);
  }
  if (status) {
    sql += " AND status = ?";
    params.push(status);
  }
  sql += " ORDER BY createdAt DESC";
  res.json(getDb().prepare(sql).all(...params) as Transaction[]);
});

refundsRouter.get("/", requirePermission("refund.read", () => "refund:list"), (_req, res) => {
  res.json(getDb().prepare("SELECT * FROM refunds ORDER BY issuedAt DESC").all() as Refund[]);
});

refundsRouter.post(
  "/",
  requirePermission("refund.issue", (req) => `txn:${req.body?.transactionId ?? "?"}`),
  (req, res) => {
    const db = getDb();
    const { transactionId, amount, reason, note } = req.body ?? {};
    const resource = `txn:${transactionId}`;

    // Read + validate + write inside one transaction to prevent double refunds
    // racing on refundedAmount.
    const run = db.transaction(() => {
      const txn = db
        .prepare("SELECT * FROM transactions WHERE id = ?")
        .get(transactionId) as Transaction | undefined;

      const v = validateRefund(txn, Number(amount), String(reason));
      if (!v.ok) {
        recordAudit(db, {
          actorId: req.user.id,
          actorRole: req.user.role,
          action: "refund.issue",
          resource,
          outcome: "error",
          detail: `Validation failed: ${v.error}`,
        });
        return { status: txn ? 400 : 404, body: { error: v.error, code: txn ? "validation" : "not_found" } };
      }

      const refund: Refund = {
        id: `re_${nanoid(10)}`,
        transactionId,
        amount: Number(amount),
        reason,
        note: note || undefined,
        issuedBy: req.user.id,
        issuedAt: new Date().toISOString(),
      };
      db.prepare(
        `INSERT INTO refunds (id, transactionId, amount, reason, note, issuedBy, issuedAt)
         VALUES (@id, @transactionId, @amount, @reason, @note, @issuedBy, @issuedAt)`,
      ).run({ ...refund, note: refund.note ?? null });
      db.prepare("UPDATE transactions SET refundedAmount = refundedAmount + ? WHERE id = ?").run(
        refund.amount,
        transactionId,
      );

      recordAudit(db, {
        actorId: req.user.id,
        actorRole: req.user.role,
        action: "refund.issue",
        resource,
        outcome: "success",
        detail: `Refunded ${(refund.amount / 100).toFixed(2)} (${reason}).`,
      });
      return { status: 201, body: refund };
    });

    const result = run();
    res.status(result.status).json(result.body);
  },
);
