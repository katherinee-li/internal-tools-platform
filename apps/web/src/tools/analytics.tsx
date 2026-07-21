import type { DashboardData } from "@platform/shared";
import type { DashboardDefinition } from "../platform/dashboardDefinition";

const usd = (cents: number): string =>
  `$${(cents / 100).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;

// Declarative analytics dashboard. All workflow-specific code lives here; the
// chart primitive + DashboardPage engine are shared. This is the "second type"
// of internal tool (not table-list-form) — see EVALUATION.md marginal-cost note.
export const analyticsDashboard: DashboardDefinition = {
  key: "analytics",
  title: "Operations Analytics",
  description:
    "Aggregated operational metrics (refund trend, KYC funnel, refund reasons) — a non-CRUD, charts-driven tool on the shared platform.",
  icon: "▤",
  readPermission: "metrics.read",
  fetch: (api) => api.get<DashboardData>("/metrics/dashboard"),
  kpis: (d) => d.kpis,
  widgets: [
    {
      key: "refundsByDay",
      title: "Refund volume by day",
      kind: "columns",
      select: (d) => d.refundsByDay,
      format: (p) => `${usd(p.value)} (${p.secondary})`,
    },
    {
      key: "kycFunnel",
      title: "KYC funnel (by status)",
      kind: "bars",
      select: (d) => d.kycFunnel,
    },
    {
      key: "refundReasons",
      title: "Refund reasons",
      kind: "bars",
      select: (d) => d.refundReasons.map((p) => ({ ...p, label: p.label.replace(/_/g, " ") })),
    },
  ],
};
