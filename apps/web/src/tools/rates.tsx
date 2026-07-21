import { type FxRate } from "@platform/shared";
import { buildQuery } from "../platform/api";
import type { ToolDefinition } from "../platform/toolDefinition";

const BASES = ["USD", "EUR", "GBP", "JPY", "CAD", "AUD"];

// FX Rates — read-only tool backed by a LIVE external REST API through the
// platform's connector abstraction. Same declarative shape as every other tool;
// the only difference is the data source behind `fetchList`.
export const ratesTool: ToolDefinition<FxRate> = {
  key: "rates",
  title: "FX Rates (live)",
  description: "Live foreign-exchange reference rates via a REST connector (frankfurter.app / ECB).",
  icon: "$",
  readPermission: "rates.read",
  getRowId: (r) => `${r.base}-${r.currency}`,
  filters: [
    { type: "search", key: "q", placeholder: "Filter currency (e.g. EUR)…" },
    { type: "select", key: "base", label: "Base", options: BASES.map((v) => ({ value: v, label: v })) },
  ],
  columns: [
    { key: "base", header: "Base", render: (r) => <code>{r.base}</code>, width: "12%" },
    { key: "currency", header: "Currency", render: (r) => <code>{r.currency}</code>, width: "12%" },
    { key: "rate", header: "Rate (per 1 base)", render: (r) => r.rate.toFixed(4) },
    { key: "inverse", header: "Inverse", render: (r) => r.inverse.toFixed(4) },
    { key: "asOf", header: "As of", width: "16%" },
  ],
  fetchList: (api, filters) => api.get<FxRate[]>(`/rates${buildQuery(filters)}`),
};
