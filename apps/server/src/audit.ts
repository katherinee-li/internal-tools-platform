import { nanoid } from "nanoid";
import type { AuditEvent, Role } from "@platform/shared";
import type { DB } from "./db.js";

export interface AuditInput {
  actorId: string;
  actorRole: Role;
  action: string;
  resource: string;
  outcome: AuditEvent["outcome"];
  detail?: string;
}

// Central audit writer. Every mutating endpoint records exactly one event,
// including denials and errors. This is intentionally the ONLY way audit
// rows are created so coverage is uniform across all tools.
export function recordAudit(db: DB, input: AuditInput): AuditEvent {
  const event: AuditEvent = {
    id: `evt_${nanoid(10)}`,
    timestamp: new Date().toISOString(),
    ...input,
  };
  db.prepare(
    `INSERT INTO audit_events (id, timestamp, actorId, actorRole, action, resource, outcome, detail)
     VALUES (@id, @timestamp, @actorId, @actorRole, @action, @resource, @outcome, @detail)`,
  ).run({ ...event, detail: event.detail ?? null });
  return event;
}

export function listAudit(db: DB, limit = 200): AuditEvent[] {
  return db
    .prepare(
      `SELECT * FROM audit_events ORDER BY timestamp DESC, id DESC LIMIT ?`,
    )
    .all(limit) as AuditEvent[];
}
