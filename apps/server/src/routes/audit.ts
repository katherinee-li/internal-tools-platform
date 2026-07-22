import { Router } from "express";
import { listAudit } from "../audit.js";
import { getDb } from "../db.js";
import { requirePermission } from "../auth.js";

export const auditRouter = Router();

auditRouter.get("/", requirePermission("audit.read", () => "audit:list"), (req, res) => {
  const { action, outcome } = req.query as Record<string, string | undefined>;
  let events = listAudit(getDb(), 500);
  if (action) events = events.filter((e) => e.action.includes(action));
  if (outcome) events = events.filter((e) => e.outcome === outcome);
  res.json(events.slice(0, 200));
});
