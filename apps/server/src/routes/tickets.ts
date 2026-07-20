import { Router } from "express";
import type { SupportTicket } from "@platform/shared";
import { getDb } from "../db.js";
import { recordAudit } from "../audit.js";
import { requirePermission } from "../auth.js";

// Support Ticket Queue — the "fourth tool" marginal-cost experiment.
// Mirrors the KYC pattern: list + a single decide/update action, fully audited.
export const ticketsRouter = Router();

ticketsRouter.get("/", requirePermission("ticket.read", () => "ticket:list"), (req, res) => {
  const { q, status, priority } = req.query as Record<string, string | undefined>;
  let sql = "SELECT * FROM support_tickets WHERE 1=1";
  const params: unknown[] = [];
  if (q) {
    sql += " AND (subject LIKE ? OR customerName LIKE ? OR id LIKE ?)";
    params.push(`%${q}%`, `%${q}%`, `%${q}%`);
  }
  if (status) {
    sql += " AND status = ?";
    params.push(status);
  }
  if (priority) {
    sql += " AND priority = ?";
    params.push(priority);
  }
  sql += " ORDER BY createdAt DESC";
  res.json(getDb().prepare(sql).all(...params) as SupportTicket[]);
});

ticketsRouter.patch(
  "/:id",
  requirePermission("ticket.write", (req) => `ticket:${req.params.id}`),
  (req, res) => {
    const db = getDb();
    const { id } = req.params;
    const { status, note } = req.body ?? {};
    const resource = `ticket:${id}`;

    const ticket = db.prepare("SELECT * FROM support_tickets WHERE id = ?").get(id) as SupportTicket | undefined;
    if (!ticket) {
      res.status(404).json({ error: "Ticket not found.", code: "not_found" });
      return;
    }
    if (!["open", "pending", "resolved"].includes(String(status))) {
      recordAudit(db, {
        actorId: req.user.id,
        actorRole: req.user.role,
        action: "ticket.write",
        resource,
        outcome: "error",
        detail: "Validation failed: invalid status.",
      });
      res.status(400).json({ error: "A valid status is required.", code: "validation" });
      return;
    }

    const now = new Date().toISOString();
    db.prepare("UPDATE support_tickets SET status = ?, note = ?, updatedBy = ?, updatedAt = ? WHERE id = ?").run(
      status,
      note ?? ticket.note ?? null,
      req.user.id,
      now,
      id,
    );
    recordAudit(db, {
      actorId: req.user.id,
      actorRole: req.user.role,
      action: "ticket.write",
      resource,
      outcome: "success",
      detail: `status ${ticket.status}->${status}`,
    });
    res.json(db.prepare("SELECT * FROM support_tickets WHERE id = ?").get(id));
  },
);
