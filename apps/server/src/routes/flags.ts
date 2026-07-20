import { Router } from "express";
import type { Environment, FeatureFlag } from "@platform/shared";
import { can, validateRolloutPercentage } from "@platform/shared";
import { getDb } from "../db.js";
import { recordAudit } from "../audit.js";
import { requirePermission } from "../auth.js";

export const flagsRouter = Router();

flagsRouter.get("/", requirePermission("flag.read", () => "flag:list"), (req, res) => {
  const { environment, q } = req.query as Record<string, string | undefined>;
  let sql = "SELECT * FROM feature_flags WHERE 1=1";
  const params: unknown[] = [];
  if (environment) {
    sql += " AND environment = ?";
    params.push(environment);
  }
  if (q) {
    sql += " AND (key LIKE ? OR description LIKE ?)";
    params.push(`%${q}%`, `%${q}%`);
  }
  sql += " ORDER BY key ASC";
  const rows = getDb().prepare(sql).all(...params) as Array<Record<string, unknown>>;
  // sqlite stores booleans as integers; normalize for the client.
  res.json(rows.map((r) => ({ ...r, enabled: !!r.enabled })) as FeatureFlag[]);
});

flagsRouter.patch("/:environment/:key", (req, res) => {
  const db = getDb();
  const environment = req.params.environment as Environment;
  const key = req.params.key;
  const resource = `flag:${environment}/${key}`;
  const { enabled, rolloutPercentage } = req.body ?? {};

  // Production safeguard: writing to production requires the dedicated
  // `flag.write.production` permission (admin only).
  const requiredPermission = environment === "production" ? "flag.write.production" : "flag.write";
  if (!can(req.user.role, requiredPermission)) {
    recordAudit(db, {
      actorId: req.user.id,
      actorRole: req.user.role,
      action: requiredPermission,
      resource,
      outcome: "denied",
      detail: `Role '${req.user.role}' cannot modify ${environment} flags.`,
    });
    res.status(403).json({
      error:
        environment === "production"
          ? "Production flag changes require the Admin role."
          : "You do not have permission to modify feature flags.",
      code: "forbidden",
    });
    return;
  }

  type FlagRow = Omit<FeatureFlag, "enabled"> & { enabled: number };
  const flag = db
    .prepare("SELECT * FROM feature_flags WHERE key = ? AND environment = ?")
    .get(key, environment) as FlagRow | undefined;
  if (!flag) {
    res.status(404).json({ error: "Flag not found.", code: "not_found" });
    return;
  }

  const nextPct = rolloutPercentage ?? flag.rolloutPercentage;
  const v = validateRolloutPercentage(Number(nextPct));
  if (!v.ok) {
    recordAudit(db, {
      actorId: req.user.id,
      actorRole: req.user.role,
      action: requiredPermission,
      resource,
      outcome: "error",
      detail: `Validation failed: ${v.error}`,
    });
    res.status(400).json({ error: v.error, code: "validation" });
    return;
  }

  const nextEnabled = enabled === undefined ? !!flag.enabled : !!enabled;
  const now = new Date().toISOString();
  db.prepare(
    "UPDATE feature_flags SET enabled = ?, rolloutPercentage = ?, updatedBy = ?, updatedAt = ? WHERE key = ? AND environment = ?",
  ).run(nextEnabled ? 1 : 0, Number(nextPct), req.user.id, now, key, environment);

  recordAudit(db, {
    actorId: req.user.id,
    actorRole: req.user.role,
    action: requiredPermission,
    resource,
    outcome: "success",
    detail: `enabled ${!!flag.enabled}->${nextEnabled}, rollout ${flag.rolloutPercentage}%->${nextPct}%`,
  });

  const updated = db.prepare("SELECT * FROM feature_flags WHERE key = ? AND environment = ?").get(key, environment) as Record<string, unknown>;
  res.json({ ...updated, enabled: !!updated.enabled });
});
