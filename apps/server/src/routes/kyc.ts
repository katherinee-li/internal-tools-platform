import { Router } from "express";
import type { KycCase } from "@platform/shared";
import { validateKycDecision } from "@platform/shared";
import { getDb } from "../db.js";
import { recordAudit } from "../audit.js";
import { requirePermission } from "../auth.js";

export const kycRouter = Router();

kycRouter.get("/", requirePermission("kyc.read", () => "kyc:list"), (req, res) => {
  const { q, status, risk } = req.query as Record<string, string | undefined>;
  let sql = "SELECT * FROM kyc_cases WHERE 1=1";
  const params: unknown[] = [];
  if (q) {
    sql += " AND (customerName LIKE ? OR email LIKE ? OR id LIKE ?)";
    params.push(`%${q}%`, `%${q}%`, `%${q}%`);
  }
  if (status) {
    sql += " AND status = ?";
    params.push(status);
  }
  if (risk) {
    sql += " AND risk = ?";
    params.push(risk);
  }
  sql += " ORDER BY submittedAt DESC";
  const rows = getDb().prepare(sql).all(...params) as KycCase[];
  res.json(rows);
});

kycRouter.post(
  "/:id/decision",
  requirePermission("kyc.decide", (req) => `kyc:${req.params.id}`),
  (req, res) => {
    const db = getDb();
    const { id } = req.params;
    const { decision, note } = req.body ?? {};
    const resource = `kyc:${id}`;

    const kyc = db.prepare("SELECT * FROM kyc_cases WHERE id = ?").get(id) as KycCase | undefined;
    if (!kyc) {
      res.status(404).json({ error: "KYC case not found.", code: "not_found" });
      return;
    }

    const v = validateKycDecision(String(decision), note);
    if (!v.ok) {
      recordAudit(db, {
        actorId: req.user.id,
        actorRole: req.user.role,
        action: "kyc.decide",
        resource,
        outcome: "error",
        detail: `Validation failed: ${v.error}`,
      });
      res.status(400).json({ error: v.error, code: "validation" });
      return;
    }

    const now = new Date().toISOString();
    db.prepare(
      "UPDATE kyc_cases SET status = ?, reviewerNote = ?, decidedBy = ?, decidedAt = ? WHERE id = ?",
    ).run(decision, note, req.user.id, now, id);

    recordAudit(db, {
      actorId: req.user.id,
      actorRole: req.user.role,
      action: "kyc.decide",
      resource,
      outcome: "success",
      detail: `${kyc.status} -> ${decision}. Note: ${note}`,
    });

    const updated = db.prepare("SELECT * FROM kyc_cases WHERE id = ?").get(id);
    res.json(updated);
  },
);
