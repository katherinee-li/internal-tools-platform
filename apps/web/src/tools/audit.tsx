import { type AuditEvent } from "@platform/shared";
import { buildQuery } from "../platform/api";
import type { ToolDefinition } from "../platform/toolDefinition";
import { Badge } from "../platform/badges";
import { dateTime } from "../platform/format";

const outcomeTone = (o: string) => (o === "success" ? "green" : o === "denied" ? "amber" : "red");

// Audit Log — itself just another ToolDefinition, demonstrating platform reuse.
export const auditTool: ToolDefinition<AuditEvent> = {
  key: "audit",
  title: "Audit Log",
  description: "Every mutating action across all tools — including denied and failed attempts.",
  icon: "❐",
  readPermission: "audit.read",
  getRowId: (e) => e.id,
  filters: [
    { type: "search", key: "action", placeholder: "Filter by action…" },
    {
      type: "select",
      key: "outcome",
      label: "Outcome",
      options: ["success", "denied", "error"].map((v) => ({ value: v, label: v })),
    },
  ],
  columns: [
    { key: "timestamp", header: "When", render: (e) => dateTime(e.timestamp), width: "16%" },
    { key: "actorRole", header: "Actor", render: (e) => `${e.actorId} (${e.actorRole})`, width: "16%" },
    { key: "action", header: "Action", render: (e) => <code>{e.action}</code>, width: "14%" },
    { key: "resource", header: "Resource", render: (e) => <code>{e.resource}</code> },
    { key: "outcome", header: "Outcome", render: (e) => <Badge tone={outcomeTone(e.outcome)}>{e.outcome}</Badge>, width: "9%" },
    { key: "detail", header: "Detail" },
  ],
  fetchList: (api, filters) => api.get<AuditEvent[]>(`/audit${buildQuery(filters)}`),
};
